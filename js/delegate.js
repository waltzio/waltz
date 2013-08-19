/*******************
 * Delegate Class
 * 
 * The delegate is used for passing messages back and forth
 * between the client page and the extension background
 *
********************/

function Delegate() {

	chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {

		if(typeof(request.type) === "undefined") {
			return false;
		}

		switch(request.type) {
			case "getCredentials":

				storage.getCredentialsForDomain(request.domain, function(creds) {
					sendResponse(creds);
				});

				return true;

				break;

			case "decrypt":

				clefCrypto.decrypt(request.value, function(decrypted) {
					sendResponse(decrypted);
				})

				return true;

				break;
		}

	});

}

var delegate = new Delegate();