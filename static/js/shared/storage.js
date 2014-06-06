/*******************
 * Storage Class
 * 
 * The storage class is used for managing local storage of data.  
 * In most cases this will mean usernames and passwords, but also may include
 * user preferences and settings.
 *
********************/

Storage.prototype.LOGIN_KEY = "logins";
Storage.prototype.CREDENTIALS_KEY = "credentials";
Storage.prototype.OPTIONS_KEY = "options";
Storage.prototype.ONBOARDING_KEY = "onboarding";
Storage.prototype.ONBOARDING_SITES_KEY = "sites";
Storage.prototype.PRIVATE_SETTINGS_KEY = "private";
Storage.prototype.DISMISSALS_KEY = "dismissals";

Storage.prototype.dismissForeverKey = "forever";

StorageBase.prototype.STORAGE_TYPE = 'sync';

Storage.prototype.optionsDefaults = {
    cy_url: "https://api.waltz.io"
};

Storage.prototype.siteOnboardingDefaults = {
    loginAttempts: {
        success: 0,
        fail: 0
    },
    forceTutorial: false,
    updatedAt: null,
    createdAt: null
};

Storage.prototype.eventHandlers = {};

function Storage() {
    this.listening = false;
}

Storage.prototype.subscribe = function(e, cb) {
    if (!this.listening) {
        chrome.storage.onChanged.addListener(this.handleChange.bind(this));
        this.listening = true;
    }

    if (this.eventHandlers[e]) {
        this.eventHandlers[e].push(cb);
    } else {
        this.eventHandlers[e] = [cb];
    }
};

Storage.prototype.handleChange = function(changes, areaName) {
    var handlers;
    for (var k in changes) {
        handlers = this.eventHandlers[k] || [];
        for (var i = 0; i < handlers.length; i++) {
            handlers[i](changes[k]);
        }
    }
};

Storage.prototype.set = function(items, cb) {
    this.base.set(items, cb);
};

Storage.prototype.get = function(keys, cb) {
    this.base.get(keys, cb);
};

Storage.prototype.remove = function(keys, cb) {
    this.base.remove(keys, cb);
};

Storage.prototype.getCredentials = function(cb) {
    var _this = this,
        promise = $.Deferred();

    this.get(this.CREDENTIALS_KEY, function(data) {
        var ret = data[_this.CREDENTIALS_KEY];
        
        if (typeof(cb) === "function") cb(ret);
        promise.resolve(ret);
    });

    return promise;
};

Storage.prototype.setCredentials = function(credentials, cb) {
    var data = {};
    data[this.CREDENTIALS_KEY] = credentials;
    this.set(data, cb);
};

Storage.prototype.getCredentialsForDomain = function(domain, cb) {
    var promise = $.Deferred();
    this.getCredentials(function(credentials) {
        var _ret = credentials[domain] || false;
        if (typeof(cb) === "function") cb(_ret);
        promise.resolve(_ret);
    });
    return promise;
};

Storage.prototype.setCredentialsForDomain = function(domain, creds, cb) {
    var _this = this;
    this.getCredentials(function(credentials) {
        credentials[domain] = creds;

        _this.setCredentials(credentials, cb);
    });
};

Storage.prototype.deleteCredentialsForDomain = function(domain, cb) {
    var _this = this;
    this.getCredentials(function(credentials) {
        credentials[domain] = null;
        _this.setCredentials(credentials, cb);
    });
};

Storage.prototype.getLogins = function(cb) {
    var _this = this;
    this.get(this.LOGIN_KEY, function(data) {
        if (data && data[_this.LOGIN_KEY]) {
            data = data[_this.LOGIN_KEY];
        }
        cb(data);
    });
};

Storage.prototype.addLogin = function(domain) {
    var _this = this;
    this.getLogins(function(data) {
        if (data[_this.LOGIN_KEY]) data = data[_this.LOGIN_KEY];
        data[domain] = new Date().getTime();

        var save = {};
        save[_this.LOGIN_KEY] = data;
        
        _this.set(save, function() {});
    });
};

Storage.prototype.clearLogins = function(cb) {
    this.remove(this.LOGIN_KEY, cb);
};

Storage.prototype.getOptions = function(cb) {
    var _this = this,
        promise = $.Deferred();

    this.get(this.OPTIONS_KEY, function(options) {
        var ret;

        _.defaults(options[_this.OPTIONS_KEY], _this.optionsDefaults);
        ret = options[_this.OPTIONS_KEY];
        _this.setOptions(ret);

        if (typeof cb === "function") cb(ret);
        promise.resolve(ret);
    });

    return promise;
};

Storage.prototype.setOptions = function(options, cb) {
    var data = {};
    data[this.OPTIONS_KEY] = options;
    this.set(data, cb);
};

Storage.prototype.getOptionsForDomain = function(domain, cb) {
    this.getOptions(function(options) {
        cb(options[domain] || false);
    });
};

Storage.prototype.setOptionsForDomain = function(domain, newOptions, cb) {
    var _this = this;
    this.setOption(domain, newOptions, cb);
};

Storage.prototype.setOption = function(key, value, cb) {
    var _this = this;
    this.getOptions(function(options) {
        options[key] = value;
        _this.setOptions(options, cb);
    });
};

Storage.prototype.getDismissals = function(cb) {
    var _this = this,
        promise = $.Deferred();
    this.get(this.DISMISSALS_KEY, function(options) {
        var ret;
        if(options[_this.DISMISSALS_KEY]) {
            ret = options[_this.DISMISSALS_KEY];
        } else {
            ret = {};
            _this.setDismissals(ret);
        }
        if (typeof cb === "function") cb(ret);
        promise.resolve(ret);
    });

    return promise;
};

Storage.prototype.setDismissals = function(options, cb) {
    var save = {};
    save[this.DISMISSALS_KEY] = options;
    this.set(save, cb);
};

Storage.prototype.getDismissalsForSite = function(domain, cb) {
    this.getDismissals(function(options) {
        cb(options[domain] || {});
    });
};

Storage.prototype.setDismissalsForSite = function(domain, siteDismissals, cb) {
    var _this = this;
    this.getDismissals(function(dismissals) {
        dismissals[domain] = siteDismissals;
        _this.setDismissals(dismissals, cb);
    });
};

Storage.prototype.setDismissalForSite = function(domain, key, cb) {
    var _this = this;
    this.getDismissalsForSite(domain, function(dismissals) {
        dismissals[key] = true;
        _this.setDismissalsForSite(domain, dismissals, cb);
    });
};


Storage.prototype.getPrivateSettings = function(cb) {
    var _this = this,
        promise = $.Deferred();
    this.get(this.PRIVATE_SETTINGS_KEY, function(options) {
        if (typeof cb === "function") cb(options[_this.PRIVATE_SETTINGS_KEY]);
        promise.resolve(options[_this.PRIVATE_SETTINGS_KEY]);
    });

    return promise;
};

Storage.prototype.setPrivateSettings = function(options, cb) {
    var data = {};
    data[this.PRIVATE_SETTINGS_KEY] = options;
    this.set(data, cb);
};

Storage.prototype.getPrivateSettingsForSite = function(domain, cb) {
    this.getPrivateSettings(function(options) {
        cb(options[domain] || false);
    });
};

Storage.prototype.setPrivateSettingsForSite = function(domain, newOptions, cb) {
    var _this = this;
    this.setPrivateSetting(domain, newOptions, cb);
};

Storage.prototype.setPrivateSetting = function(key, value, cb) {
    var _this = this;
    this.getPrivateSettings(function(options) {
        options[key] = value;
        _this.setPrivateSettings(options, cb);
    });
};

// Allows you to get the entire onboarding data blob
// This blob includes
// * global onboarding settings
// * site specific onboarding data
Storage.prototype.getOnboardingData = function(cb) {
    var _this = this;
    this.get(this.ONBOARDING_KEY, function(data) {
        var ret = data[_this.ONBOARDING_KEY];
        cb(ret);
    });
};

// Allows you to set *all* the onboarding data
Storage.prototype.setOnboardingData = function(data, cb) {
    var save = {};
    save[this.ONBOARDING_KEY] = data;
    this.set(save, cb);
};

// Allows you to set a *key* in the onboarding data (not overwrite
// all the data).
Storage.prototype.setOnboardingKey = function(key, value, cb) {
    var _this = this;
    this.getOnboardingData(function(data) {
        data[key] = value;

        _this.setOnboardingData(data, cb);
    });
};

// Allows you to get the onboarding data for a specific site
Storage.prototype.getOnboardingSiteData = function(siteKey, cb) {
    var _this = this,
        promise = $.Deferred();

    this.getOnboardingData(function(data) {
        if (!data[_this.ONBOARDING_SITES_KEY]) {
            data[_this.ONBOARDING_SITES_KEY] = {};
        }
        if (!data[_this.ONBOARDING_SITES_KEY][siteKey]) {
            data[_this.ONBOARDING_SITES_KEY][siteKey] = {};
        }
        _.defaults(data[_this.ONBOARDING_SITES_KEY][siteKey], _this.siteOnboardingDefaults);
        _this.setOnboardingData(data);

        var value = data[_this.ONBOARDING_SITES_KEY][siteKey];
        if (typeof cb === "function") cb(value);
        promise.resolve(value);
    });

    return promise;
};

// Allows you to set *all* the onboarding data for a specific site
Storage.prototype.setOnboardingSiteData = function(siteKey, data, cb) {
    var _this = this;

    this.getOnboardingData(function(onboardingData) {
        if (!onboardingData[_this.ONBOARDING_SITES_KEY]) {
            onboardingData[_this.ONBOARDING_SITES_KEY] = {};
        }

        var siteSpecificOnboardingData = onboardingData[_this.ONBOARDING_SITES_KEY];

        if (!siteSpecificOnboardingData[siteKey]) {
            siteSpecificOnboardingData[siteKey] = _this.siteOnboardingDefaults;
        }

        siteSpecificOnboardingData[siteKey] = data;

        _this.setOnboardingKey(_this.ONBOARDING_SITES_KEY, siteSpecificOnboardingData, cb);
    });
};

// Allows you to set a *key* in the onboarding in the onboarding data
// for a specific
Storage.prototype.setOnboardingSiteKey = function(siteKey, key, value, cb) {
    var _this = this;
    this.getOnboardingSiteData(siteKey, function(data) {
        data[key] = value;
        _this.setOnboardingSiteData(siteKey, data, cb);
    });
};

function StorageBase() {
    _this = this;

    this.isBackgroundPage = location.protocol === "chrome-extension:" && chrome.extension.getBackgroundPage() === window;

    this.ready = $.Deferred();

    chrome.storage[_this.STORAGE_TYPE].get(null, function(data) {
        _this.data = data;
        _this.ready.resolve();
    });

    chrome.runtime.onMessage.addListener(this.proxyClient.bind(this));
}

StorageBase.prototype.proxyClient = function(request, sender, sendResponse) {
    if (request.messageLocation && request.messageLocation !== "storage") return false;
	if (typeof(request.method) === "undefined") {
		return false;
	}


    if (this.isBackgroundPage) {
        if (request.method === 'get') {
            return this.get(request.key, sendResponse);
        } else if (request.method === 'set') {
            return this.set(request.items, sendResponse);
        } else if (request.method === 'remove') {
            return this.remove(request.keys, sendResponse);
        }
    }
};

StorageBase.prototype.set = function(items, cb) {
    var _this = this;
    $.when(this.ready).then(function() {
        _.merge(_this.data, items);
        if (_this.isBackgroundPage) {
            chrome.storage[_this.STORAGE_TYPE].set(_this.data, cb);
        } else {
            if (!cb) cb = function() {};
            chrome.runtime.sendMessage({
                method: "set",
                items: items,
                messageLocation: "storage"
            }, cb);
        }
    });

    return true;
};

StorageBase.prototype.get = function(key, cb) {
    var _this = this;
    $.when(this.ready).then(function() {
        if (_this.isBackgroundPage) {
            if (!_this.data[key]) {
                _this.data[key] = {};
            }
            if (typeof cb === "function") cb(_this.data);
        } else {
            chrome.runtime.sendMessage({
                method: "get",
                key: key,
                messageLocation: "storage"
            }, cb);
        }
    });

    return true;
};

StorageBase.prototype.remove = function(keys, cb) {
    var _this = this;
    if (!(keys instanceof Array)) keys = [keys];
    $.when(this.ready).then(function() {
        if (_this.isBackgroundPage) {
            for (var i = 0; i < keys.length; i++) {
                delete(_this.data[keys[i]]);
            }
            chrome.storage[_this.STORAGE_TYPE].remove(keys, cb);
        } else {
            if (!cb) cb = function() {};
            chrome.runtime.sendMessage({
                method: "remove",
                keys: keys,
                messageLocation: "storage"
            }, cb);
        }
    });

    return true;
};

Storage.prototype.base = new StorageBase();

if(typeof(module) === "object" && typeof(module.exports) === "object") {
    module.exports = Storage;
}

