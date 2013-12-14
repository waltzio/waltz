Setup.prototype.SETUP_KEY = "setup";
Setup.prototype.ACTIVATED_KEY = "activated";

Setup.prototype.waitlistHost = "http://localhost:4000";
Setup.prototype.waitlistPaths = {
    reserve: '/u/reserve',
    check: '/u/check',
    setEmail: '/u/email/set'
}
Setup.prototype.waitlistCheckTimeout = 1000;

function Setup() {
    var _this = this;

    this.storage = new Storage();
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
            url = this.waitlistHost + this.waitlistPaths.check;

        $.get(
            Utils.addURLParam(url, "id", this.settings.waitlistID),
            function(data) {
                console.log(data);
                _this.settings.waiting = data.waiting;
                _this.settings.rank = data.rank;

                _this.storage.setPrivateSettings(_this.settings, function() {
                    if (!_this.settings.waiting) {
                        return _this.activate();
                    } 
                    promise.resolve();
                })
            }
        )

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
        this.waitlistHost + this.waitlistPaths.reserve,
        {},
        function(data) {
            _this.settings.waitlistID = data.id;
            _this.settings.waiting = data.waiting;
            _this.settings.rank = data.rank;

            _this.storage.setPrivateSettings(
                _this.settings,
                function() {
                    if (!_this.settings.waiting) {
                        return _this.activate();
                    }
                    promise.resolve();
                }
            );
        }
    );

    return promise;
}

Setup.prototype.attachClickToWaitlist = function() {
    chrome.browserAction.setPopup({ popup: "" });
    chrome.browserAction.onClicked.addListener(this.openWaitlist);
}

Setup.prototype.attachClickToTutorial = function() {
    var _this = this,
        on = true,
        toggle = true;

    chrome.browserAction.setPopup({ popup: "" });
    chrome.browserAction.onClicked.removeListener(this.openWaitlist);

    chrome.browserAction.setBadgeText({ text: "start" });
    (function interval() {
        if (!on) return;

        if (toggle) {
            toggle = false;
            chrome.browserAction.setBadgeBackgroundColor({ color: "#3399CC" });
        } else {
            toggle = true;
            chrome.browserAction.setBadgeBackgroundColor({ color: "#EEEEEE" });
        }

        setTimeout(interval, 100);
    })();

    chrome.browserAction.onClicked.addListener(function() {
        on = false;
        chrome.browserAction.setBadgeText({ text: "" });
        _this.openTutorial();
    });
}

Setup.prototype.highlightIcon = function() {
    this.attachClickToTutorial();

}

Setup.prototype.activate = function() {
    var _this = this,
        activationDone = $.Deferred();
    this.settings[this.ACTIVATED_KEY] = true;
    this.storage.setPrivateSetting(
        this.ACTIVATED_KEY,
        true, 
        function() {
            _this.kickOff();
            activationDone.resolve();
        }
    );

    return activationDone;
}

Setup.prototype.onInstall = function() {
    var _this = this;

    this.installing = true;

    $.when(this.initialized)
     .then(this.onStartup.bind(this))
     .then(function() {
        _this.installing = false;
        if (_this.settings.waiting) {
            _this.openWaitlist();
        }
     });
}

Setup.prototype.onStartup = function(settings) {
    var _this = this;

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

chrome.runtime.onInstalled.addListener(function() {
    var setup = new Setup();
    setup.onInstall();
});

chrome.runtime.onStartup.addListener(function() {
    var setup = new Setup();
    setup.onStartup();
});