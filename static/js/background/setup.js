Setup.prototype.SETUP_KEY = "setup";
Setup.prototype.ACTIVATED_KEY = "activated";
Setup.prototype.VERSION_KEY = "version";

function Setup(opts) {
    var _this = this;

    this.analytics = new Analytics();
    this.storage = new Storage();

    this.storage.getPrivateSettings(function(settings) {
        _this.settings = settings;
        if (opts.install) {
            _this.onInstall();
        } else {
            _this.onStartup();
        }
    });
}

Setup.prototype.openTutorial = function() {
    this.analytics.trackEvent('first_setup');
    this.analytics.trackEvent('first_tutorial');

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

Setup.prototype.onInstall = function() {
    var _this = this,
        details = chrome.app.getDetails(),
        savedVersion = this.settings[this.VERSION_KEY],
        version = details.version;

    if (savedVersion !== version) {
        if (savedVersion) {
            this.analytics.trackEvent(
                'update', 
                { 
                    oldVersion: savedVersion, 
                    newVersion: details.version
                }
            );
        } else {
            this.analytics.trackEvent('install', { version: version });
        }
        this.storage.setPrivateSetting(this.VERSION_KEY, version);
    }

    this.onStartup();
}

Setup.prototype.onStartup = function(settings) {
    var _this = this;

    _this.delegate = new Delegate();

    if (!_this.settings[_this.SETUP_KEY]) {
        _this.openTutorial();
    }
}

var setup;
// These are the two entry points for the extension.
chrome.runtime.onInstalled.addListener(function() {
    setup = new Setup({ install: true });
});

chrome.runtime.onStartup.addListener(function() {
    setup = new Setup();
});
