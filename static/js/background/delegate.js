/*******************
 * Delegate Class
 * 
 * The delegate is used for passing messages back and forth
 * between the client page and the extension background
 *
********************/

Delegate.prototype.DEBUG = true;

Delegate.prototype.options = {};
Delegate.prototype.currentLogins = {};

Delegate.prototype.options.configURL = "https://raw.github.com/waltzio/waltz/master/deploy/site_configs.json";
Delegate.prototype.options.backupConfigURL = chrome.extension.getURL("build/site_configs.json");

if (Delegate.prototype.DEBUG) {
	Delegate.prototype.options.configURL = Delegate.prototype.options.backupConfigURL;
} 

function Delegate() {
	var _this = this;

    this.storage = new Storage();
    this.storage.getOptions(function(options) {
        _this.init(options);
    });
}

Delegate.prototype.init = function(options) {
    var _this = this;

    this.options = $.extend(this.options, options);

    this.pubnub = PUBNUB.init({
        subscribe_key : 'sub-c-188dbfd8-32a0-11e3-a365-02ee2ddab7fe'
    });

    // bind the router
    chrome.runtime.onMessage.addListener(this.router.bind(this));
    window.addEventListener('online', function() {
        setTimeout(function() {
            _this.checkAuthentication(function(data) {
                if (!data.user) {
                    _this.logout({ silent: true });
                }
            });
        }, 2000);
    });

    //Add the context menu
    chrome.contextMenus.create({
        id: 'waltz-main',
        title: 'Waltz',
        onclick: function(info, tab) {
            chrome.tabs.create({url: "/html/options.html"});
        }
    });

    // Listens to requests, so we can redirect to the original page 
    // after a successful login.
    chrome.webRequest.onCompleted.addListener(
        function(details) {
            var domain;
            for (site in _this.currentLogins) {
                if (details.url.match(parse_match_pattern(site))) {
                    domain = site;
                    break;
                }
            }
            if (domain && _this.currentLogins[domain]['state'] !== 'redirected') {
                var siteConfig = _this.siteConfigs[domain];

                var nextUrl = details.url;
                var forcedRedirectUrl = _this.currentLogins[domain]['redirectUrl'];
                var shouldNotRedirect = false;

                // If the URL which we are trying to force a redirect to 
                // is the login URL, let the  site handle directing the 
                // user to the right place
                var excludedForcedRedirectUrls = $.merge([], siteConfig.login.urls);
                // Also include the explicitly defined ones in the site config
                if (siteConfig.login.exclude) {
                    var others = siteConfig.login.exclude.forcedRedirectURLs || [];
                    $.merge(excludedForcedRedirectUrls, others);
                }

                // If the next URL is the login URL, there's probably an error
                var excludedNextUrls = $.merge([], siteConfig.login.urls);
                // Also include the explicitly defined ones in the site config
                if (siteConfig.login.exclude) {
                    var others = siteConfig.login.exclude.nextURLs || [];
                    $.merge(excludedNextUrls, others);
                }
                $.merge(excludedNextUrls, _.pluck(siteConfig.login.twoFactor, 'url'));

                var orEqual = function(aUrl) {
                    return function(acc, currentUrl) {
                        return acc || urlsAreEqual(currentUrl, aUrl);
                    };
                } 

                // Don't redirect if the forced redirect url is one of the
                // excluded ones, as defined above.
                var shouldNotRedirect = excludedForcedRedirectUrls.reduce(orEqual(forcedRedirectUrl), false);
                // Don't redirect if the default next url is one of the
                // excluded ones, as defined above.
                shouldNotRedirect |= excludedNextUrls.reduce(orEqual(nextUrl), shouldNotRedirect);
                // If the next URL is the redirect URL, then we do not want to
                // redirect, to prevent a redirect loop.
                shouldNotRedirect |= urlsAreEqual(nextUrl, forcedRedirectUrl);

                if (!shouldNotRedirect) {
                    chrome.tabs.update(details.tabId, {url: forcedRedirectUrl});
                    // We set the state so it doesn't keep redirecting.
                    _this.currentLogins[domain]['state'] = 'redirected';
                    _this.currentLogins[domain]['modified'] = new Date();
                }
            }
        },
        {
            urls: Object.keys(this.currentLogins), 
            types: ["main_frame"]
        }
    );

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
		case "getHost":
			return sendResponse(this.options.cy_url);
			break;
		default:
			return this[request.method].bind(this)(request, sendResponse);
			break;
	}
}

Delegate.prototype.acknowledgeLoginAttempt = function(request) {
    delete(this.currentLogins[request.domain]);
}

Delegate.prototype.login = function(request) {
	if (!this.loggedIn) {
		this.loggedIn = true;
		this.pubnubSubscribe();
	}

    this.currentLogins[request.domain] = {
        redirectUrl: request.location,
        state: 'attempted',
        modified: new Date()
    }
	this.storage.addLogin(request.domain);

    if (this.options.tutorialStep != -1) {
        this.completeTutorial();
    } 
}

Delegate.prototype.completeTutorial =  function(request) {
    this.storage.completeTutorial(this.refreshOptions);
}

Delegate.prototype.refreshOptions = function(request) {
    var _this = this;
    this.storage.getOptions(function(options) {
        _this.options = options;
    });
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

	this.storage.getLogins(function(data) {
        if (isEmpty(data)) return;
        
		var sitesCompleted = [],
			promise,
			siteConfig,
			i;


		for (domain in data) {
            sitesCompleted.push(_this.logOutOfSite({ domain: domain, refresh: true }));
		}

		$.when(sitesCompleted).then(function() {
			_this.storage.clearLogins();
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

Delegate.prototype.logOutOfSite = function(opts, cb) {
    var promise = $.Deferred(),
        domain = opts.domain;

    if (opts.key) {
        siteConfig = this.getConfigForKey(opts.key);
        domain = siteConfig.domain;
    } else {
        siteConfig = this.siteConfigs[domain];
    }

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

        if (opts.refresh) {
            chrome.tabs.query(
                { url: domain }, 
                function(data) { 
                    for (var i = 0; i < data.length; i++) {
                        chrome.tabs.reload(data[i].id);
                    }
                }
            );
        }

        promise.resolve();
        if (typeof cb === "function") cb();
    });

    return promise;
};

Delegate.prototype.forceTutorial = function(opts, cb) {
    var _this = this,
        siteKey = opts.key;

    this.logOutOfSite({
        key: siteKey
    }, function() {
        _this.storage.setOnboardingSiteKey(siteKey, 'forceTutorial', true);
        if (typeof cb === "function") cb(true);
    });

    return true;
};

Delegate.prototype.saveCredentials = function(domain_key, username, password, cb) {
    var _this = this;
	waltzCrypto.encrypt(password, domain_key, function(encrypted) {
		_this.storage.setCredentialsForDomain(domain_key, username, encrypted.output, function() {
			cb(true);
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

Delegate.prototype.openNewTab = function(request, cb) {
    chrome.tabs.create({url: request.url});
    if (typeof cb === "function") cb();
};

Delegate.prototype.getConfigForKey = function(key) {
    for (domain in this.siteConfigs) {
        if (this.siteConfigs[domain].key === key) {
            var config = this.siteConfigs[domain];
            config['domain'] = domain;
            return config;
        }
    }

    return false;
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
                    currentLogin: this.currentLogins[site],
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
    delegate = new Delegate();
}

if (navigator.onLine) {
    blastOff();
} else {
    window.addEventListener('online', function() {
        window.removeEventListener('online');
        blastOff();
    });
}
