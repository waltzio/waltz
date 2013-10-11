/*******************
 * Delegate Class
 * 
 * The delegate is used for passing messages back and forth
 * between the client page and the extension background
 *
********************/

cydoemusHost = "https://cydoemus.vault.tk";
// cydoemusHost = "http://localhost:3333";

function Delegate() {
	var self = this;

	this.logout_map = {
		'www.facebook.com': 'c_user'
	}

	this.pubnub = PUBNUB.init({
        subscribe_key : 'sub-c-188dbfd8-32a0-11e3-a365-02ee2ddab7fe'
    });

	this.logged_in = false;
	this.backgrounded = false;

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
			case "login":
				return self.login(request.domain);
				break;
			case "getHost":
				sendResponse(cydoemusHost);
				break;
		}
	});

	storage.getOptions(function(options) {
		self.options = options;
	});

	this.focusChanged = this.focusChanged.bind(this);
	chrome.windows.onFocusChanged.addListener(this.focusChanged);
}

Delegate.prototype.login = function(domain) {
	if (!this.logged_in) {
		this.logged_in = true;
		this.pubnubSubscribe();
	}
	storage.addLogin(domain);
}

Delegate.prototype.pubnubSubscribe = function() {
	var _this = this;

	this.checkAuthentication(function(data) {
		_this.user = data.user;
		_this.pubnub.subscribe({
			channel: data.user,
			message: function(m) {
				if (m && m == "logout") {
					_this.logout();
				}
			}
		})
	});
}

Delegate.prototype.pubnubUnsubscribe = function(channel) {
	this.pubnub.unsubscribe({
		channel: channel
	});
}

Delegate.prototype.logout = function() {
	var _this = this;
	storage.getLogins(function(data) {
		var sitesCompleted = [],
			promise;
		for (domain in data) {
			var url = 'https://' + domain;

			if (_this.logout_map[domain]) {
				promise = RSVP.Promise(function(resolve, reject) {
					chrome.cookies.remove({
						url: url,
						name: _this.logout_map[domain]
					}, function() { resolve(); })
				});
				sitesCompleted.push(promise);
			} else {
				// if we haven't manually set a user cookie name,
				// REMOVE ALL THE COOKIES (wuh wuh)
				chrome.cookies.getAll({
					url: url
				}, function(cookies) {

					for (var i = 0; i < cookies.length; i++) {
						var cookie = cookies[i];
						var promise = RSVP.Promise(function(resolve, reject) {
							chrome.cookies.remove({
								url: url,
								name: cookie.name
							}, function() { resolve(); });
						});
						sitesCompleted.push(promise);
					}
				})
			}
		}

		RSVP.all(sitesCompleted).then(function() {
			for (domain in data) {
				chrome.tabs.query(
					{ url: '*://' + domain + '/*'}, 
					function(data) { 
						for (var i = 0; i < data.length; i++) {
							chrome.tabs.reload(data[i].id);
						}
					}
				);
			}
			storage.clearLogins();
			chrome.notifications.create(
				"", 
				{
					type: "basic",
					title: "You've been logged out of Bypass.",
					message: "You've been logged out of all of your Bypass sites",
					iconUrl: "img/clef48.png"
				},
				function() {});
			_this.pubnubUnsubscribe(_this.user);
			_this.user = false;
			_this.logged_in = false;
			_
		});
	});
}

Delegate.prototype.focusChanged = function(windowID) {
	if (windowID == chrome.windows.WINDOW_ID_NONE) {
		this.backgrounded = true;
	} else if (this.backgrounded) {
		if (this.logged_in) {
			var _this = this;
			this.checkAuthentication(function(data) {
				if (!data.user) {
					this.logged_in = false;
					_this.logout();
				}
			});
		}
		this.backgrounded = false;
	}
}

Delegate.prototype.saveCredentials = function(domain, username, password, cb) {
	clefCrypto.encrypt(password, domain, function(encrypted) {
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
	var _this = this;
	var xhr = new XMLHttpRequest();
	xhr.onreadystatechange = function() {
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

	xhr.open("GET", cydoemusHost+"/check", true);
	xhr.send();

	return true;
}

var delegate = new Delegate();