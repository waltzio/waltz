/*******************
 * Delegate Class
 * 
 * The delegate is used for passing messages back and forth
 * between the client page and the extension background
 *
********************/

function Delegate() {
	var self = this;

	chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {

		if(typeof(request.type) === "undefined") {
			return false;
		}

		switch(request.type) {
			case "saveCredentials":
				return self.saveCredentials(request.domain, request.username, request.password);
				break;
			case "getCredentials":
				return self.getCredentials(request.domain, sendResponse);
				break;

			case "decrypt":
				return self.decrypt(request.value, request.domain, sendResponse);
				break;
		}

	});

}

Delegate.prototype.saveCredentials = function(domain, username, password, cb) {
	clefCrypto.encrypt(password, domain, function(encrypted) {
		storage.storeCredentialsForDomain(domain, username, encrypted, function() {
			cb(true);
		});
	});

	return true;
}

Delegate.prototype.getCredentials = function(domain, cb) {
	storage.getCredentialsForDomain(domain, function(creds) {
		cb(creds);
	});

	return true;
}

Delegate.prototype.decrypt = function(value, domain, cb) {
	clefCrypto.decrypt(value, domain, function(decrypted) {
		cb(decrypted);
	});

	return true;
}

var delegate = new Delegate();