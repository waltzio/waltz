Setup.prototype.TUTORIAL_KEY = "tutorialOpened";

Setup.prototype.waitlistHost = "http://localhost:4000";
Setup.prototype.waitlistPaths = {
    reserve: '/reserve',
    check: '/check'
}

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
    chrome.tabs.create({
        url: chrome.extension.getURL("html/tutorial.html")
    }, function() {});
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

Setup.prototype.activate = function() {
    var _this = this,
        activationDone = $.Deferred();
    this.settings.activated = true;
    this.storage.setPrivateSettings(this.settings, function() {
        _this.kickOff();
        activationDone.resolve();
    });

    return activationDone;
}

Setup.prototype.onInstall = function() {
    var _this = this;

    $.when(this.initialized)
     .then(this.onStartup.bind(this))
     .then(function() {
        console.log(_this.settings);
        if (_this.settings.waiting) {
            _this.openWaitlist();
        }
     });
}

Setup.prototype.onStartup = function(settings) {
    var _this = this;

    return $.when(this.initialized)
     .then(function() {
        if (_this.activated) {
            return _this.kickOff();
        } else {
            return _this.checkWaitlistStatus();
        }
     });
}

Setup.prototype.kickOff = function() {
    var _this = this;

    if (navigator.onLine) {
        kickOffForReal();
    } else {
        window.addEventListener('online', function() {
            window.removeEventListener('online');
            kickOffForReal();
        });
    }

    function kickOffForReal() {
        _this.delegate = new Delegate();
        _this.storage.getPrivateSettings(function(settings) {
            if (!settings[_this.TUTORIAL_KEY]) {
                settings[_this.TUTORIAL_KEY] = true;
                _this.storage.setPrivateSettings(
                    settings, 
                    function() { _this.openTutorial(); }
                );
            }
        });
    }
}

chrome.runtime.onInstalled.addListener(function() {
    var setup = new Setup();
    setup.onInstall();
});

chrome.runtime.onStartup.addListener(function() {
    var setup = new Setup();
    setup.onStartup();
});