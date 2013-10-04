/*******************
 * Storage Class
 * 
 * The storage class is used for managing local storage of data.  
 * In most cases this will mean usernames and passwords, but also may include
 * user preferences and settings.
 *
********************/

function Storage() {

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

var storage = new Storage();
