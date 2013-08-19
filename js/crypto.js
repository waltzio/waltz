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

ClefCrypto.prototype.decrypt = function(pre, cb) {
	setTimeout(function() {
		cb(pre);
	},0);
}

var clefCrypto = new ClefCrypto();
