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
}

Storage.prototype.handleChange = function(changes, areaName) {
    var handlers;
    for (k in changes) {
        handlers = this.eventHandlers[k] || [];
        for (var i = 0; i < handlers.length; i++) {
            handlers[i](changes[k]);
        }
    }
}

Storage.prototype.set = function(items, cb) {
    chrome.storage.local.set(items, cb);
}

Storage.prototype.get = function(keys, cb) {
    chrome.storage.local.get(keys, cb);
}

Storage.prototype.remove = function(keys) {
    chrome.storage.local.remove(keys);
}

Storage.prototype.getCredentials = function(cb) {
    var _this = this,
        promise = $.Deferred();

    this.get(this.CREDENTIALS_KEY, function(data) {
        var ret = data[_this.CREDENTIALS_KEY];

        ret = ret || {};
        
        if (typeof(cb) === "function") cb(ret);
        promise.resolve(ret);
    });

    return promise;
}

Storage.prototype.setCredentials = function(credentials, cb) {
    var data = {};
    data[this.CREDENTIALS_KEY] = credentials;
    this.set(data, cb);
}

Storage.prototype.getCredentialsForDomain = function(domain, cb) {
    this.getCredentials(function(credentials) {
        cb(credentials[domain] || false);
    });
}

Storage.prototype.setCredentialsForDomain = function(domain, username, password, cb) {
    var _this = this;
    this.getCredentials(function(credentials) {
        credentials[domain] = {
            username: username,
            password: password
        }

        _this.setCredentials(credentials, cb);
    });
}

Storage.prototype.deleteCredentialsForDomain = function(domain, cb) {
    var _this = this;
    this.getCredentials(function(credentials) {
        delete(credentials[domain]);
        _this.setCredentials(credentials, cb);
    });
}

Storage.prototype.getLogins = function(cb) {
    var _this = this;
    this.get(this.LOGIN_KEY, function(data) {
        if (data && data[_this.LOGIN_KEY]) {
            data = data[_this.LOGIN_KEY];
        }
        cb(data);
    });
}

Storage.prototype.addLogin = function(domain) {
    var _this = this;
    this.getLogins(function(data) {
        if (data[_this.LOGIN_KEY]) data = data[_this.LOGIN_KEY];
        data[domain] = new Date().getTime();

        var save = {};
        save[_this.LOGIN_KEY] = data;
        
        _this.set(save, function() {});
    })
}

Storage.prototype.clearLogins = function() {
    this.remove(this.LOGIN_KEY);
}

Storage.prototype.getOptions = function(cb) {
    var _this = this,
        promise = $.Deferred();

    this.get(this.OPTIONS_KEY, function(options) {
        var ret;

        if(options[_this.OPTIONS_KEY]) {
            ret = options[_this.OPTIONS_KEY]
        } else {
            _this.setOptions(_this.optionsDefaults);
            ret = _this.optionsDefaults;
        }

        if (typeof cb === "function") cb(ret);
        promise.resolve(ret)
    });

    return promise;
}

Storage.prototype.setOptions = function(options, cb) {
    var data = {};
    data[this.OPTIONS_KEY] = options;
    this.set(data, cb);
}

Storage.prototype.getOptionsForDomain = function(domain, cb) {
    this.getOptions(function(options) {
        cb(options[domain] || false);
    });
}

Storage.prototype.setOptionsForDomain = function(domain, newOptions, cb) {
    var _this = this;
    this.setOption(domain, newOptions, cb);
}

Storage.prototype.setOption = function(key, value, cb) {
    this.getOptions(function(options) {
        options[key] = value;
        chrome.storage.local.set({options: options}, cb);
    });
}

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
}

Storage.prototype.setDismissals = function(options, cb) {
    var save = {};
    save[this.DISMISSALS_KEY] = options;
    this.set(save, cb);
}

Storage.prototype.getDismissalsForSite = function(domain, cb) {
    this.getDismissals(function(options) {
        cb(options[domain] || {});
    });
}

Storage.prototype.setDismissalsForSite = function(domain, siteDismissals, cb) {
    var _this = this;
    this.getDismissals(function(dismissals) {
        dismissals[domain] = siteDismissals;
        _this.setDismissals(dismissals, cb);
    });
}

Storage.prototype.setDismissalForSite = function(domain, key, cb) {
    var _this = this;
    this.getDismissalsForSite(domain, function(dismissals) {
        dismissals[key] = true;
        _this.setDismissalsForSite(domain, dismissals, cb);
    });
}


Storage.prototype.getPrivateSettings = function(cb) {
    var _this = this;
    this.get(this.PRIVATE_SETTINGS_KEY, function(options) {
        if(options[_this.PRIVATE_SETTINGS_KEY]) {
            cb(options[_this.PRIVATE_SETTINGS_KEY]);
        } else {
            _this.setPrivateSettings({});
            cb({});
        }
    });
}

Storage.prototype.setPrivateSettings = function(options, cb) {
    var data = {};
    data[this.PRIVATE_SETTINGS_KEY] = options;
    this.set(data, cb);
}

Storage.prototype.getPrivateSettingsForSite = function(domain, cb) {
    this.getPrivateSettings(function(options) {
        cb(options[domain] || false);
    });
}

Storage.prototype.setPrivateSettingsForSite = function(domain, newOptions, cb) {
    var _this = this;
    this.setPrivateSetting(domain, newOptions, cb);
}

Storage.prototype.setPrivateSetting = function(key, value, cb) {
    var _this = this;
    this.getPrivateSettings(function(options) {
        options[key] = value;
        var save = {};
        save[_this.PRIVATE_SETTINGS_KEY] = options;
        _this.set(save, cb);
    });
}

// Allows you to get the entire onboarding data blob
// This blog includes
// * global onboarding settings
// * site specific onboarding data
Storage.prototype.getOnboardingData = function(cb) {
    var _this = this;
    this.get(this.ONBOARDING_KEY, function(data) {
        var ret = data[_this.ONBOARDING_KEY] || {};
        cb(ret);
    })
}

// Allows you to set *all* the onboarding data
Storage.prototype.setOnboardingData = function(data, cb) {
    var save = {};
    save[this.ONBOARDING_KEY] = data;
    this.set(save, cb);
}

// Allows you to set a *key* in the onboarding data (not overwrite
// all the data).
Storage.prototype.setOnboardingKey = function(key, value, cb) {
    var _this = this;
    this.getOnboardingData(function(data) {
        data[key] = value;

        _this.setOnboardingData(data, cb);
    });
}

// Allows you to get the onboarding data for a specific site
Storage.prototype.getOnboardingSiteData = function(siteKey, cb) {
    var _this = this;

    this.getOnboardingData(function(data) {
        if (data[_this.ONBOARDING_SITES_KEY] && data[_this.ONBOARDING_SITES_KEY][siteKey]) {
            cb(data[_this.ONBOARDING_SITES_KEY][siteKey]);
        } else {
            cb(_this.siteOnboardingDefaults);
        }
    });
}

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
}

// Allows you to set a *key* in the onboarding in the onboarding data
// for a specific
Storage.prototype.setOnboardingSiteKey = function(siteKey, key, value, cb) {
    var _this = this;
    this.getOnboardingSiteData(siteKey, function(data) {
        data[key] = value;
        _this.setOnboardingSiteData(siteKey, data, cb);
    });
}
