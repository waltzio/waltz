Setup.prototype.SETUP_KEY = "setup";
Setup.prototype.ACTIVATED_KEY = "activated";

Setup.prototype.waitlistCheckTimeout = 1000;

function Setup() {
    var _this = this;

    this.storage = new Storage();
    this.storage.subscribe(this.storage.PRIVATE_SETTINGS_KEY, function(changes) {
        if (changes.newInfo) {
            _this.settings = changes.newInfo;
        }
    });
    this.initialized = $.Deferred();

    var settingsLoaded = this.storage.getPrivateSettings();
    $.when(settingsLoaded).then(this.init.bind(this));
}

Setup.prototype.init = function(settings) {
    this.settings = settings;
    this.initialized.resolve();
}

Setup.prototype.openWaitlist = function() {
    chrome.tabs.create({
        url: chrome.extension.getURL("html/waiting.html")
    }, function() {});
}

Setup.prototype.openTutorial = function() {
    this.delegate = new Delegate();

    chrome.browserAction.onClicked.removeListener(this.openWaitlist.bind(this));
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

Setup.prototype.checkWaitlistStatus = function() {
    if (!this.settings.waitlistID) {
        return this.registerOnWaitlist();
    } else {
        var _this = this,
            promise = $.Deferred(),
            url = Utils.settings.waitlistHost + Utils.settings.waitlistPaths.check;

        $.get(Utils.addURLParam(url, "id", this.settings.waitlistID))
        .success(function(data) {
            _this.settings.waiting = data.waiting;
            _this.settings.rank = data.rank + 1;

            chrome.runtime.sendMessage({
                messageLocation: 'waiting',
                method: 'refresh'
            });

            _this.storage.setPrivateSettings(_this.settings, function() {
                if (!_this.settings.waiting) {
                    return _this.activate();
                } 
                promise.resolve();
            })
        })
        .fail(function(data) {
            var error;

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

Setup.prototype.registerOnWaitlist = function() {
    var _this = this,
        promise = $.Deferred();

    // if we already have an ID, let's get out of here
    if (_this.settings.waitlistID) {
        promise.resolve();
        return;
    }

    $.post(
        Utils.settings.waitlistHost + Utils.settings.waitlistPaths.reserve,
        {}
    ).success(function(data) {
        _this.settings.waitlistID = data.id;
        _this.settings.waiting = data.waiting;
        _this.settings.rank = data.rank + 1;
        _this.settings.referralLink = data.referralLink;
        _this.settings.inviteLink = data.inviteLink;


        _this.storage.setPrivateSettings(
            _this.settings,
            function() {
                if (!_this.settings.waiting) {
                    return _this.activate();
                }
                promise.resolve();
            }
        );
    }).fail(function(data) {
        _this.settings.waiting = true;
        _this.storage.setPrivateSettings(
            _this.settings,
            function() {
                promise.resolve();
            }
        );
    });
        
    return promise;
}

Setup.prototype.attachClickToWaitlist = function() {
    chrome.browserAction.setPopup({ popup: "" });
    chrome.browserAction.onClicked.addListener(this.openWaitlist);
}

Setup.prototype.attachClickToTutorial = function() {
    var _this = this;

    chrome.browserAction.setPopup({ popup: "" });
    chrome.browserAction.onClicked.removeListener(this.openWaitlist);

    chrome.browserAction.onClicked.addListener(function() {
        on = false;
        chrome.browserAction.setBadgeText({ text: "" });
        _this.openTutorial();
    });
}

Setup.prototype.highlightIcon = function() {
    var _this = this,
        on = true,
        toggle = true;

    this.attachClickToTutorial();

    chrome.browserAction.setBadgeText({ text: "start" });
    (function interval() {
        if (!on) return;

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

Setup.prototype.activate = function() {
    var _this = this,
        activationDone = $.Deferred();

    $.post(
        Utils.settings.waitlistHost + Utils.settings.waitlistPaths.inviteCreate,
        { id: _this.settings.waitlistID },
        function (data) {
            _this.settings[_this.ACTIVATED_KEY] = true;
            _this.settings.inviteLink = data.inviteLink;
            _this.storage.setPrivateSettings(_this.settings, function() {
                _this.kickOff();
                activationDone.resolve();
            })
        }
    );

    return activationDone;
}

Setup.prototype.onInstall = function() {
    var _this = this;

    // if installing flag is true, we popup the tutorial
    // straight away if they are in
    this.installing = true;

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

// These are the two entry points for the extension.
chrome.runtime.onInstalled.addListener(function() {
    var setup = new Setup();
    setup.onInstall();
});

chrome.runtime.onStartup.addListener(function() {
    var setup = new Setup();
    setup.onStartup();
});