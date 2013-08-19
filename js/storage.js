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
	setTimeout(function() {
		cb({
			username: "fauxClef",
			password: "fauxPassword"
		});
	}, 0);
}

var storage = new Storage();
