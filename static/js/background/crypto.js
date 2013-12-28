/*******************
 * WaltzCrypto
 * 
 * The Crypto class is used for encrypting and decrypting client information.
 * Additionally, the Crypto class will manage commincation with the augmenter server
 * for getting cipher keys
 *
********************/

Crypto.prototype.keyPath= "/api/v0/keys/";

function Crypto(options) {
	this.storage = new Storage();
}

Crypto.prototype.encryptPassword = function(password, key) {
	return CryptoJS.AES.encrypt(password, key).toString();
}

Crypto.prototype.decryptPassword = function(encryptedPassword, key) {
	return CryptoJS.AES.decrypt(encryptedPassword, key).toString(CryptoJS.enc.Utf8);
}

Crypto.prototype.encrypt = function(request, cb) {
	var _this = this,
		siteKey = request.key
		username = request.username,
		unencryptedPassword = request.password;

	this.storage.getOptions(function(options) {
		$.get(options.cy_url + _this.keyPath + siteKey)
		.done(function(data) {
			var encryptedPassword = _this.encryptPassword(unencryptedPassword, data.key.key);
			_this.storage.setCredentialsForDomain(
				siteKey,
				{
					username: username,
					password: encryptedPassword
				},
				cb
			);
		})
		.error(function(data) {
			var _ret;
			if (data.status === 403) {
				_ret = {
					error: "authentication",
					status: 403
				};
			} else {
				_ret = {
					error: data.statusText,
					status: data.status
				}
			}
			if (typeof cb === "function") cb(_ret);
		});
	});
}

Crypto.prototype.decrypt = function(request, cb) {
	var _this = this,
		siteKey = request.key;

	$.when(this.storage.getOptions(), this.storage.getCredentialsForDomain(siteKey))
	.then(function(options, credentials) {
		var encryptedPassword = credentials.password;
		$.get(options.cy_url + _this.keyPath + siteKey)
		.done(function(data) {
			var decryptedPassword = _this.decryptPassword(encryptedPassword, data.key.key);
			var _ret = {
				error: null,
				password: decryptedPassword
			};

			if (typeof cb === "function") cb(_ret);
		})
		.error(function(data) {
			var _ret;
			if (data.status === 403) {
				_ret = {
					error: "authentication",
					status: 403
				};
			} else {
				_ret = {
					error: data.statusText,
					status: data.status
				}
			}
			if (typeof cb === "function") cb(_ret);
		});
	});
}
