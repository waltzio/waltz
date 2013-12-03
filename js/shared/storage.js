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

Storage.prototype.defaults = {
    cy_url: "https://api.waltz.io",
    tutorialStep: -1
};

function Storage() {}

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
    var _this = this;
    this.get(this.CREDENTIALS_KEY, function(data) {
        var ret = data[_this.CREDENTIALS_KEY];

        ret = ret || {};
        
        if (cb && typeof(cb) === "function") cb(ret);
    });
}

Storage.prototype.setCredentials = function(credentials, cb) {
    var data = {};
    data[this.CREDENTIALS_KEY] = credentials;
    this.set(data, cb);
}

Storage.prototype.getCredentialsForDomain = function(domain, cb) {
    this.getCredentials(function(credentials) {
        if(credentials[domain]) {
            cb(credentials[domain]);
        } else {
            cb(false);
        }
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
    this.getCredentials(function(credentials) {
        delete(credentials[domain]);
        cb(true);
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
        
        _this.set({ "waltz_logins": data }, function() {});
    })
}

Storage.prototype.clearLogins = function() {
    this.remove(this.LOGIN_KEY);
}

Storage.prototype.getOptions = function(cb) {
    var _this = this;
    this.get(this.OPTIONS_KEY, function(options) {
        if(options[_this.OPTIONS_KEY]) {
            cb(options[_this.OPTIONS_KEY]);
        } else {
            _this.setOptions(_this.defaults);
            cb(_this.defaults);
        }
    });
}

Storage.prototype.setOptions = function(options, cb) {
    var data = {};
    data[this.OPTIONS_KEY] = options;
    this.set(data, cb);
}

Storage.prototype.setOption = function(key, value, cb) {
    this.getOptions(function(options) {
        options[key] = value;
        chrome.storage.local.set({options: options}, cb);
    });
}

Storage.prototype.getOnboardingData = function(cb) {
    var _this = this;
    this.get(this.ONBOARDING_KEY, function(data) {
        var ret = data[_this.ONBOARDING_KEY] || {};
        cb(ret);
    })
}

Storage.prototype.setOnboardingData = function(key, value, cb) {
    var _this = this;
    this.getOnboardingData(function(data) {
        data[key] = value;
        var save = {};
        save[_this.ONBOARDING_KEY] = data;
        _this.set(save, cb);
    });
}
 

Storage.prototype.completeTutorial = function(cb) {
    this.setOption("tutorialStep", -1);
    if (typeof cb === "function") cb();
}
