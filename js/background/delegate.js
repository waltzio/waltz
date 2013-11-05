/*******************
 * Delegate Class
 * 
 * The delegate is used for passing messages back and forth
 * between the client page and the extension background
 *
********************/

Delegate.prototype.DEBUG = false;

Delegate.prototype.options = {};


Delegate.prototype.options.configURL = "https://raw.github.com/waltzio/waltz/master/deploy/site_configs.json";
Delegate.prototype.options.backupConfigURL = chrome.extension.getURL("build/site_configs.json");

if (Delegate.prototype.DEBUG) {
	Delegate.prototype.options.configURL = Delegate.prototype.options.backupConfigURL;
} 

function Delegate(options) {
	var _this = this;

	this.options = $.extend(this.options, options);
	_this.pubnub = PUBNUB.init({
        subscribe_key : 'sub-c-188dbfd8-32a0-11e3-a365-02ee2ddab7fe'
    });

	// bind the router
	chrome.runtime.onMessage.addListener(this.router.bind(this));
    window.addEventListener('online', function() {
        setTimeout(function() {
            _this.checkAuthentication(function(data) {
                if (!data.user) {
                    _this.logout();
                }
            })
        }, 2000);
    })

	//Add the context menu
	chrome.contextMenus.create({
		id: 'waltz-main',
		title: 'Waltz',
		onclick: function(info, tab) {
			chrome.tabs.create({url: "/html/options.html"});
		}
	});

	// load configs and fall back if cannot access Github
	this.configsLoaded = $.Deferred();

	$.ajax({
		url: this.options.configURL,
		dataType: 'json',
		success: this.updateSiteConfigs.bind(this),
		error:function() {
			$.ajax({
				url: _this.options.backupConfigURL,
				dataType: 'json',
				success: _this.updateSiteConfigs.bind(_this)
			});
		}
	});

	// check whether logged in, exponential backoff
	// BOOM!
	var n = 0;
	function kickOff() {
		_this.checkAuthentication(function(data) {
			if (data.error == "noconn") {
				console.log('no connection, will retry in ' + Math.pow(2,n) + ' seconds.');
				// exponential backoff, hooray!
				setTimeout(kickOff, Math.pow(2, n) * 1000);
				n = n + 1;
				return;
			}
			
			if (data.user) {
				_this.loggedIn = true;
				_this.pubnubSubscribe(data);
			} else {
				_this.loggedIn = false;
				_this.logout({ silent: true });
			}
		});
	}

	// when the configs are done loading, blast off, baby!
	$.when(this.configsLoaded).then(kickOff);
}

Delegate.prototype.router = function(request, sender, sendResponse) {
	if(typeof(request.method) === "undefined") {
		return false;
	}

	switch(request.method) {
		case "saveCredentials":
			return this.saveCredentials(request.key, request.username, request.password, sendResponse);
			break;
		case "deleteCredentials":
			return this.deleteCredentials(request.key, sendResponse);
			break;
		case "getCredentials":
			return this.getCredentials(request.key, sendResponse);
			break;
		case "decrypt":
			return this.decrypt(request.value, request.key, sendResponse);
			break;
		case "checkAuthentication":
			return this.checkAuthentication(sendResponse);
			break;
		case "login":
			return this.login(request.domain);
			break;
		case "getHost":
			return sendResponse(this.options.cy_url);
			break;
		case "refreshSettings":
			storage.getOptions(function(options) {
				console.log("new options");
				this.options = options;
			});
			break;
		default:
			return this[request.method](request, sendResponse);
			break;
	}
}

Delegate.prototype.acknowledgeLogin = function(request) {
    this.transitioningToLoggedIn = false;
}

Delegate.prototype.login = function(domain) {
	if (!this.loggedIn) {
		this.loggedIn = true;
		this.pubnubSubscribe();
	}

    this.transitioningToLoggedIn = true;
	storage.addLogin(domain);
}

Delegate.prototype.updateSiteConfigs = function(data) {
	this.siteConfigs = data;
	var domains = [];
	for (var key in data) {
		if(data.hasOwnProperty(key)) {
			domains.push(key);
		}
	}
	var parsed = domains.map(parse_match_pattern).filter(function(pattern) { return pattern !== null });
	this.includedDomainRegex = new RegExp(parsed.join('|'));
	this.configsLoaded.resolve();
}

Delegate.prototype.pubnubSubscribe = function(data) {
	var _this = this;

	if (!data) {
		this.checkAuthentication(handleData);
	} else {
		handleData(data);
	}

	function handleData(data) {
		_this.user = data.user;
		_this.pubnub.subscribe({
			channel: data.user,
			message: function(m) {
				if (m && m == "logout") {
					_this.logout();
				}
			}
		})
	}
}

Delegate.prototype.pubnubUnsubscribe = function(channel) {
	if (channel) {
		this.pubnub.unsubscribe({
			channel: channel
		});
	}
}

Delegate.prototype.logout = function(opts) {
	var _this = this,
		opts = opts || {};

	storage.getLogins(function(data) {
		var sitesCompleted = [],
			promise,
			siteConfig,
			i;

		for (domain in data) {
			(function() {
				var promise = $.Deferred(),
					siteConfig = _this.siteConfigs[domain];

                getCookiesForDomain(domain, function(cookies) {
                    var cookie;
                    for (i = 0; i < cookies.length; i++) {
                        cookie = cookies[i];
                        if (siteConfig.logout.cookies.indexOf(cookie.name) != -1) {
                            chrome.cookies.remove({
                                url: extrapolateUrlFromCookie(cookie),
                                name: cookie.name
                            }, function() {});
                        }
                    }
                    promise.resolve();
                });

				sitesCompleted.push(promise);
			})();
		}

		$.when(sitesCompleted).then(function() {
			for (domain in data) {
				chrome.tabs.query(
					{ url: domain }, 
					function(data) { 
						for (var i = 0; i < data.length; i++) {
							chrome.tabs.reload(data[i].id);
						}
					}
				);
			}
			storage.clearLogins();
			if (!opts.silent) {
				chrome.notifications.create(
					"", 
					{
						type: "basic",
						title: "You've been logged out of Waltz.",
						message: "You've been logged out of all of your Waltz sites",
						iconUrl: "img/waltz-48.png"
					},
					function() {}
				);
			}
			_this.pubnubUnsubscribe(_this.user);
			_this.user = false;
			_this.loggedIn = false;
		});
	});
}

Delegate.prototype.saveCredentials = function(domain_key, username, password, cb) {
	waltzCrypto.encrypt(password, domain_key, function(encrypted) {
		storage.storeCredentialsForDomain(domain_key, username, encrypted.output, function() {
			cb(true);
		});
	});

	return true;
}

Delegate.prototype.deleteCredentials = function(domain_key, cb) {
	storage.deleteCredentialsForDomain(domain_key, cb);
	return true;
}

Delegate.prototype.getCredentials = function(domain_key, cb) {
	storage.getCredentialsForDomain(domain_key, function(creds) {
		cb({
			error: false,
			creds: creds
		});
	});

	return true;
}

Delegate.prototype.decrypt = function(value, domain_key, cb) {
	waltzCrypto.decrypt(value, domain_key, function(decrypted) {
		cb(decrypted);
	});

	return true;
}

Delegate.prototype.proxyRequest = function(request, cb) {
    $.ajax({
        url: request.url, 
        data: request.data,
        type: request.type || 'GET'
    }).done(function(data) {
        cb(data); 
    });

	return true;
}

Delegate.prototype.checkAuthentication = function(cb) {
	var _this = this;

	$.ajax({
		dataType: "json",
		url: _this.options.cy_url + "/check",
		success: function (data) {
			if (typeof(cb) === "function") cb({ user: data.user });
		},
		error: function(xhr, textStatus) {
			if (xhr.status === 403) {
				if (typeof(cb) === "function") cb({ user: false });
			} // let's do nothing if we can't access the internet
			else if (xhr.status === 0) {
				cb({ error: "noconn" });
			}
			else {
				cb({ error: "noconn" });
			}
		}
	});

	return true;
}

Delegate.prototype.initialize = function(data, callback) {
	var url = data.location.href.split('#')[0];
	if (this.includedDomainRegex.test(url)) {
		var options;
		for (site in this.siteConfigs) {
			if (url.match(parse_match_pattern(site))) {
				options = {
					site: {
						domain: site,
						config: this.siteConfigs[site]
					},
					cyHost: this.options.cy_url,
                    inTransition: this.transitioningToLoggedIn
				};
				callback(options);
				return;
			}
		}
	} else {
		callback(false);
	}
}


var blastOff = function() {
    storage.getOptions(function(options) {
        delegate = new Delegate(options);
    });
}

if (navigator.onLine) {
    blastOff();
} else {
    window.addEventListener('online', function() {
        window.removeEventListener('online');
        blastOff();
    });
}



/**
  * @param String input  A match pattern
  * @returns  null if input is invalid
  * @returns  String to be passed to the RegExp constructor */
function parse_match_pattern(input) {
    if (typeof input !== 'string') return null;
    var match_pattern = '(?:^'
      , regEscape = function(s) {return s.replace(/[[^$.|?*+(){}\\]/g, '\\$&');}
      , result = /^(\*|https?|file|ftp|chrome-extension):\/\//.exec(input);

    // Parse scheme
    if (!result) return null;
    input = input.substr(result[0].length);
    match_pattern += result[1] === '*' ? 'https?://' : result[1] + '://';

    // Parse host if scheme is not `file`
    if (result[1] !== 'file') {
        if (!(result = /^(?:\*|(\*\.)?([^\/*]+))(?=\/)/.exec(input))) return null;
        input = input.substr(result[0].length);
        if (result[0] === '*') {    // host is '*'
            match_pattern += '[^/]+';
        } else {
            if (result[1]) {         // Subdomain wildcard exists
                match_pattern += '(?:[^/]+\\.)?';
            }
            // Append host (escape special regex characters)
            match_pattern += regEscape(result[2]);
        }
    }
    // Add remainder (path)
    match_pattern += input.split('*').map(regEscape).join('.*');
    match_pattern += '$)';
    return match_pattern;
}

function extrapolateUrlFromCookie(cookie) {
    var prefix = cookie.secure ? "https://" : "http://";
    if (cookie.domain.charAt(0) == ".")
        prefix += "www";

    return prefix + cookie.domain + cookie.path;
}

function extrapolateDomainFromMatchURL(matchURL) {
	var matches = matchURL.match(".*://(.*)/.*");
	var domain = matches[1];
	if (domain[0] === "*") domain = domain.slice(2);
	return domain;
}

function getCookiesForDomain(domain, cb) {
    chrome.cookies.getAll(
        { domain: extrapolateDomainFromMatchURL(domain) },
        function(cookies) {
            cb(cookies)
        }
    );
}
