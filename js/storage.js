/*******************
 * Storage Class
 * 
 * The storage class is used for managing local storage of data.  
 * In most cases this will mean usernames and passwords, but also may include
 * user preferences and settings.
 *
********************/

function Storage() {
	this.LOGIN_KEY = 'clef_logins';
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
		
		chrome.storage.local.set({ "clef_logins": data }, function() {});
	})
}

Storage.prototype.clearLogins = function() {
	chrome.storage.local.remove(this.LOGIN_KEY);
}

var storage = new Storage();
