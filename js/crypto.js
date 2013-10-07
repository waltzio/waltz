/*******************
 * ClefCrypto
 * 
 * The Crypto class is used for encrypting and decrypting client information.
 * Additionally, the Crypto class will manage commincation with the augmenter server
 * for getting cipher keys
 *
********************/

function ClefCrypto() {

}

ClefCrypto.prototype.encrypt = function(pre, identifier, cb) {
	var xhr = new XMLHttpRequest();
	xhr.onreadystatechange = function() {
		if(xhr.readyState == 4) {
			if(xhr.status == 200) {
				var keyInfo = JSON.parse(xhr.responseText);

				var encrypted = CryptoJS.AES.encrypt(pre, keyInfo.key.key);
				if(typeof(cb) === "function") {
					cb({
						error: null,
						output: encrypted.toString()
					});
				}
			} else if(xhr.status == 403) {
				cb({
					error: "authentication",
					status: 403
				});
			} else {
				cb({
					error: "unknown",
					status: xhr.status
				});
			}
		}
	}

	xhr.open("GET", "http://localhost:3333/api/v0/keys/"+identifier, true);
	xhr.send();
}

ClefCrypto.prototype.decrypt = function(pre, identifier, cb) {

	var xhr = new XMLHttpRequest();
	xhr.onreadystatechange = function() {
		if(xhr.readyState == 4) {
			if(xhr.status == 200) {

				var keyInfo = JSON.parse(xhr.responseText);

				var decrypted = CryptoJS.AES.decrypt(pre, keyInfo.key.key);
				if(typeof(cb) === "function") {
					cb({
						error: null,
						output: decrypted.toString(CryptoJS.enc.Utf8)
					});
				}
			} else if(xhr.status == 403) {
				cb({
					error: "authentication",
					status: 403
				});
			} else {
				cb({
					error: "unknown",
					status: xhr.status
				});
			}
		}
	}

	xhr.open("GET", "http://localhost:3333/api/v0/keys/"+identifier, true);
	xhr.send();
}

var clefCrypto = new ClefCrypto();
