Setup.prototype.SETUP_KEY = "setup";
Setup.prototype.ACTIVATED_KEY = "activated";

Setup.prototype.waitlistCheckTimeout = 1000;

function Setup() {
    var _this = this;

    this.analytics = new Analytics();
    this.storage = new Storage();
    this.storage.subscribe(this.storage.PRIVATE_SETTINGS_KEY, function(changes) {
        if (changes.newInfo) {
            _this.settings = changes.newInfo;
        }
    });
    this.initialized = $.Deferred();

    var settingsLoaded = this.storage.getPrivateSettings();
    $.when(settingsLoaded).then(this.init.bind(this));

    chrome.runtime.onMessage.addListener(function(request, cb) {
        if (request.messageLocation === "setup") {
            _this[request.method].call(_this, request, cb);
        }
    })
}

Setup.prototype.init = function(settings) {
    this.settings = settings;
    this.initialized.resolve();
}

Setup.prototype.openWaitlist = function() {
    this.analytics.trackEvent('open_waitlist');
    chrome.tabs.create({
        url: chrome.extension.getURL("html/waiting.html")
    }, function() {});
}

Setup.prototype.openTutorial = function() {
    this.analytics.trackEvent('first_tutorial');
    this.delegate = new Delegate({ firstTime: true });

    if (this.browserActionClickListener) {
        chrome.browserAction.onClicked.removeListener(this.browserActionClickListener);
        this.browserActionClickListener = null;
    }

    chrome.browserAction.setPopup({ popup: "/html/popup.html" });

    this.storage.setPrivateSetting(
        this.SETUP_KEY, 
        true,
        function() {
            chrome.tabs.create({
                url: chrome.extension.getURL("html/tutorial.html")
            }, function() {});
        }
    );
}

Setup.prototype.launchFromActivated = function() {
    if (!this.settings.activated) return;

    $.post(Utils.settings.waitlistHost + Utils.settings.waitlistPaths.inviteClear, 
        {id: this.settings.waitlistID}
    );
    this.pulsingStartBadge = false;
    chrome.browserAction.setBadgeText({ text: "" });
    chrome.tabs.query(
        { url: chrome.extension.getURL('html/waiting.html') },
        function(data) {
            _.each(data, function(v) {
                chrome.tabs.remove(v.id);
            })
        }
    );
    this.openTutorial();
}

Setup.prototype.startBackgroundWaitlistCheck = function() {
    var _this = this;
    setTimeout(function interval() {
        _this.checkWaitlistStatus().then(function() {
            if (!_this.settings[_this.ACTIVATED_KEY]) {
                setTimeout(interval, _this.waitlistCheckTimeout);
            }
        });
    }, this.waitlistCheckTimeout);
}

Setup.prototype.checkStatusWithRetries = function() {
    var url = Utils.settings.waitlistHost + Utils.settings.waitlistPaths.check;
    checkWithRetriesPromise = $.Deferred();
    $.ajax({
        url: Utils.addURLParam(url, "id", this.settings.waitlistID),
        type: 'GET',
        timeout: 10000,
        tries: 0,
        maxRetries: 5,
        success: function(data, textStatus, xhr) {
            checkWithRetriesPromise.resolve(data, textStatus, xhr)
        },
        error: function(xhr, textStatus, errorThrown) {
            if (textStatus === "timeout" || errorThrown === "") {
                this.tries++;
                if (this.tries <= this.maxRetries) {
                    $.ajax(this);
                    return;
                }
            }

            checkWithRetriesPromise.reject(xhr, textStatus, errorThrown);
        }
    });

    return checkWithRetriesPromise;
}

Setup.prototype.checkWaitlistStatus = function() {
    if (!this.settings.waitlistID) {
        return this.registerOnWaitlist();
    } else {
        var _this = this,
            promise = $.Deferred();

        this.checkStatusWithRetries().done(function(data) {
            _this.settings.waiting = data.waiting;
            _this.settings.rank = data.rank + 1;

            if (data.projectedSharingRank) {
                _this.settings.projectedSharingRank = data.projectedSharingRank + 1;
            }

            if (data.waitListLength) {
                _this.settings.waitListLength = data.waitingListLength;
            }

            _this.storage.setPrivateSettings(_this.settings, function() {
                chrome.runtime.sendMessage({
                    messageLocation: 'waiting',
                    method: 'refresh'
                });

                if (!_this.settings.waiting) {
                    _this.showReadyNotification();
                    _this.analytics.trackEvent('leave_waitlist', { waitlistID: _this.settings.waitlistID });
                    return _this.activate();
                } 
                promise.resolve();
            });
        }).fail(function(data, textStatus, errorThrown) {
            // The waiting list server is not reachable, so let's... FAIL OPEN!
            if (textStatus === "timeout" || (textStatus === "error" && errorThrown === "")) {
                _this.settings.waiting = false;
                _this.storage.setPrivateSettings(_this.settings, function() {
                    chrome.runtime.sendMessage({
                        messageLocation: 'waiting',
                        method: 'refresh'
                    });

                    if (!_this.settings.waiting) {
                        _this.showReadyNotification();
                        _this.analytics.trackEvent('leave_waitlist', { waitlistID: _this.settings.waitlistID });
                        return _this.activate();
                    } 
                    promise.resolve();
                })
            }
            if (data.status === 404) {
                // If the user cannot be found, let's re-register the user
                _this.settings.waitlistID = false;
                _this.storage.setPrivateSettings(_this.settings, function() {
                    promise.resolve(_this.registerOnWaitlist());
                });
            }
        });

        return promise;
    }
}

Setup.prototype.reserveWithRetries = function() {
    reservePromise = $.Deferred();
    $.ajax({
        url: Utils.settings.waitlistHost + Utils.settings.waitlistPaths.reserve,
        type: 'POST',
        data: {},
        timeout: 10000, 
        tries: 0,
        maxRetries: 5,
        success: function(data, textStatus, xhr) {
            reservePromise.resolve(data, textStatus, xhr)
        },
        error: function(xhr, textStatus, errorThrown) {
            if (textStatus === "timeout" || errorThrown === "") {
                this.tries++;
                if (this.tries <= this.maxRetries) {
                    console.log("Retrying...", this.tries);
                    $.ajax(this);
                    return;
                }
            }

            reservePromise.reject(xhr, textStatus, errorThrown);
        }
    });
    return reservePromise;
}

Setup.prototype.registerOnWaitlist = function() {
    var _this = this,
        promise = $.Deferred();

    // if we already have an ID, let's get out of here
    if (_this.settings.waitlistID) {
        promise.resolve();
        return;
    }

    this.reserveWithRetries().done(function(data) {
        _this.settings.waitlistID = data.id;
        _this.settings.waiting = data.waiting;
        _this.settings.rank = data.rank + 1;
        _this.settings.referralLink = data.referralLink;
        _this.settings.inviteLink = data.inviteLink;
        _this.settings.projectedSharingRank = data.projectedSharingRank + 1;
        _this.settings.waitListLength = data.waitingListLength;

        _this.storage.setPrivateSettings(_this.settings, function() {
            if (!_this.settings.waiting) {
                return _this.activate();
            }
            _this.analytics.trackEvent('join_waitlist', { waitlistID: _this.settings.waitlistID });
            promise.resolve();
        });
    }).fail(function(data, textStatus, errorThrown) {
        // The waiting list server is not reachable, so let's... FAIL OPEN!
        if (textStatus === "timeout" || (textStatus === "error" && errorThrown === "")) {
            _this.settings.waiting = false;
            _this.storage.setPrivateSettings(_this.settings, function() {
                if (!_this.settings.waiting) {
                    return _this.activate();
                }
            });
        }
    });
        
    return promise;
}

Setup.prototype.attachClickToWaitlist = function() {
    chrome.browserAction.setPopup({ popup: "" });
    this.browserActionClickListener = this.openWaitlist.bind(this);
    chrome.browserAction.onClicked.addListener(this.browserActionClickListener);
}

Setup.prototype.attachClickToTutorial = function() {
    var _this = this;

    chrome.browserAction.setPopup({ popup: "" });
    if (this.browserActionClickListener) {
        chrome.browserAction.onClicked.removeListener(this.browserActionClickListener);
        this.browserActionClickListener = null;
    }

    this.browserActionClickListener = this.launchFromActivated.bind(this);
    chrome.browserAction.onClicked.addListener(this.browserActionClickListener);
}

Setup.prototype.highlightIcon = function() {
    var _this = this,
        toggle = true;

    this.pulsingStartBadge = true;

    this.analytics.trackEvent('highlight_icon');

    this.attachClickToTutorial();

    chrome.browserAction.setBadgeText({ text: "start" });
    (function interval() {
        if (!_this.pulsingStartBadge) return;

        if (toggle) {
            toggle = false;
            chrome.browserAction.setBadgeBackgroundColor({ color: "#83D589" });
        } else {
            toggle = true;
            chrome.browserAction.setBadgeBackgroundColor({ color: "#EEEEEE" });
        }

        setTimeout(interval, 500);
    })();
}

Setup.prototype.showReadyNotification = function() {
    chrome.notifications.create(
        "ready_notification", 
        {
            type: "basic",
            title: "We're ready for you.",
            message: "Click here to get started.",
            iconUrl: "/static/img/waltz-48.png"
        },
        function() {}
    );
    var listener = function(tabId) {
        if (tabId !== "ready_notification") return;
        chrome.not
        var url = chrome.extension.getURL('/html/waiting.html');
        chrome.tabs.query({url: url}, function(result) {
            result = result[0];
            if (result) {
                chrome.tabs.update(result.id, {active: true});
            } else {
                chrome.tabs.create({url: url, active: true})
            }
        });
    };
    chrome.notifications.onClicked.addListener(listener);
}

Setup.prototype.activate = function() {
    this.analytics.trackEvent('activated');
    var _this = this,
        activationDone = $.Deferred();

    _this.settings[_this.ACTIVATED_KEY] = true;
    _this.storage.setPrivateSettings(_this.settings, function() {
        _this.kickOff();
        activationDone.resolve();
    })

    return activationDone;
}

Setup.prototype.onInstall = function() {
    var _this = this;

    // if installing flag is true, we popup the tutorial
    // straight away if they are in
    this.installing = true;
    this.analytics.trackEvent('install');

    $.when(this.initialized)
     .then(this.onStartup.bind(this))
     .then(function() {

        _this.installing = false;
        // if on install we are put into the waitlist,
        // we pop up the waitlist page
        // otherwise, we just attach the waitlist to the button
        if (_this.settings.waiting) {
            _this.openWaitlist();
        }
     });
}

Setup.prototype.onStartup = function(settings) {
    var _this = this;

    // returns a promise, which is used in onInstall
    return $.when(this.initialized)
     .then(function() {
        if (_this.settings[_this.ACTIVATED_KEY]) {
            return _this.kickOff();
        } else {
            return _this.checkWaitlistStatus().then(function() {
                if (!_this.settings[_this.ACTIVATED_KEY]) {
                    _this.attachClickToWaitlist();
                    _this.startBackgroundWaitlistCheck();
                }
                return $.Deferred().resolve();
            });
        }
     });
}

Setup.prototype.kickOff = function() {
    var _this = this;

    this.storage.getPrivateSettings(function(settings) {
        if (settings[_this.ACTIVATED_KEY] && settings[_this.SETUP_KEY]) {
            _this.delegate = new Delegate();
        } else {
            if (!_this.installing) {
                _this.highlightIcon();
            } else {
                _this.openTutorial();
            }
        }
    });
}

var setup;
// These are the two entry points for the extension.
chrome.runtime.onInstalled.addListener(function() {
    setup = new Setup();
    setup.onInstall();
});

chrome.runtime.onStartup.addListener(function() {
    setup = new Setup();
    setup.onStartup();
});
