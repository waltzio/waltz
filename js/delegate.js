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
				return self.saveCredentials(request.domain, request.username, request.password, sendResponse);
				break;
			case "getCredentials":
				return self.getCredentials(request.domain, sendResponse);
				break;
			case "decrypt":
				return self.decrypt(request.value, request.domain, sendResponse);
				break;
			case "checkAuthentication":
				return self.checkAuthentication(sendResponse);
				break;
		}

	});

}

Delegate.prototype.saveCredentials = function(domain, username, password, cb) {
	clefCrypto.encrypt(password, domain, function(encrypted) {
		console.log(domain, username, password, encrypted);
		storage.storeCredentialsForDomain(domain, username, encrypted.output, function() {
			cb(true);
		});
	});

	return true;
}

Delegate.prototype.getCredentials = function(domain, cb) {
	storage.getCredentialsForDomain(domain, function(creds) {
		cb({
			error: false,
			creds: creds
		});
	});

	return true;
}

Delegate.prototype.decrypt = function(value, domain, cb) {
	clefCrypto.decrypt(value, domain, function(decrypted) {
		cb(decrypted);
	});

	return true;
}

Delegate.prototype.checkAuthentication = function(cb) {
	var xhr = new XMLHttpRequest();
	xhr.onreadystatechange = function() {
		chrome.extension.getBackgroundPage().console.log('foo');
		if(xhr.readyState == 4) {
			if(xhr.status == 200) {

				var data = JSON.parse(xhr.responseText);

				if(typeof(cb) === "function") {
					cb({
						error: null,
						user: data.user
					});
				}
			} else {
				cb({
					error: "unknown",
					status: xhr.status
				});
			}
		}
	}

	xhr.open("GET", "http://localhost:3333/check", true);
	xhr.send();

	return true;
}

var delegate = new Delegate();