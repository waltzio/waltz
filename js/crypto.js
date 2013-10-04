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
		console.log(xhr);
		if(xhr.readyState == 4) {
			if(xhr.status == 200) {
				var encrypted = CryptoJS.AES.encrypt(pre, identifier);
				if(typeof(cb) === "function") {
					cb({
						error: null,
						output: encrypted
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
		console.log(xhr);
		if(xhr.readyState == 4) {
			console.log(xhr.status);
			if(xhr.status == 200) {
				var decrypted = CryptoJS.AES.decrypt(pre, identifer);
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
