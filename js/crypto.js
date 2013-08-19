/*******************
 * ClefCrypto
 * 
 * The Crypto class is used for encrypting and decrypting client information.
 * Additionally, the Crypto class will manage cummincation with the augmenter server
 * for getting cipher keys
 *
********************/

function ClefCrypto() {

}

ClefCrypto.prototype.encrypt = function(pre, identifier, cb) {
	setTimeout(function() {
		//Eventually this will grab the encryption key from the augmenter.  For now, just use the identifer
		var encrypted = CryptoJS.AES.encrypt(pre, identifier);
		if(typeof(cb) === "function") {
			cb(encrypted.toString());
		}
	}, 0);
}

ClefCrypto.prototype.decrypt = function(pre, identifer, cb) {
	setTimeout(function() {
		//Eventually this will grab the encryption key from the augmenter.  For now, just use the identifer
		var decrypted = CryptoJS.AES.decrypt(pre, identifer);
		if(typeof(cb) === "function") {
			cb(decrypted.toString(CryptoJS.enc.Utf8));
		}
	}, 0);
}

var clefCrypto = new ClefCrypto();
