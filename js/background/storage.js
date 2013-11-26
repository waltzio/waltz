/*******************
 * Storage Class
 * 
 * The storage class is used for managing local storage of data.  
 * In most cases this will mean usernames and passwords, but also may include
 * user preferences and settings.
 *
********************/

function Storage() {
	this.LOGIN_KEY = 'waltz_logins';
}

Storage.prototype.getCredentialsForDomain = function(domain, cb) {
	if(typeof(cb) !== "function") {
		return false;
	}

	chrome.storage.local.get(domain, function(data) {
		if(typeof(data[domain]) === "object") {
			cb(data[domain]);
		} else {
			cb(false);
		}
	});
}

Storage.prototype.storeCredentialsForDomain = function(domain, username, password, cb) {
	var creds = {}
	creds[domain] = {
		username: username,
		password: password
	};

	chrome.storage.local.set(creds, cb);
}

Storage.prototype.deleteCredentialsForDomain = function(domain, cb) {
	if(!domain){
		cb(false);
		return;
	}
	chrome.storage.local.remove(domain);
	cb(true);
}

Storage.prototype.getLogins = function(cb) {
	var _this = this;
	chrome.storage.local.get(this.LOGIN_KEY, function(data) {
		if (data && data[_this.LOGIN_KEY]) {
			data = data[_this.LOGIN_KEY];
		}
		cb(data);
	});
}

Storage.prototype.addLogin = function(domain) {
	this.getLogins(function(data) {
		if (data[this.LOGIN_KEY]) data = data[this.LOGIN_KEY];
		data[domain] = new Date().getTime();
		
		chrome.storage.local.set({ "waltz_logins": data }, function() {});
	})
}

Storage.prototype.clearLogins = function() {
	chrome.storage.local.remove(this.LOGIN_KEY);
}

Storage.prototype.completeTutorial = function(cb) {
	this.setOption("tutorialStep", -1);
	if (typeof cb === "function") cb();
}

Storage.prototype.getOptions = function(cb) {
	chrome.storage.local.get("options", function(options) {
		if(typeof(options.options) !== "object") {
			var defaultOptions = {
				cy_url: "https://api.waltz.io",
				tutorialStep: -1
			};

			//We don't need to wait for this to finish, because we already have the default options defined.
			chrome.storage.local.set({options: defaultOptions});

			cb(defaultOptions);
		} else {
			cb(options.options);
		}
	});
}

Storage.prototype.setOption = function(key, value) {
	this.getOptions(function(options) {
		options[key] = value;
		chrome.storage.local.set({options: options});
	});
}

var storage = new Storage();
