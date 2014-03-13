/*******************
 * Delegate Class
 * 
 * The delegate is used for passing messages back and forth
 * between the client page and the extension background
 *
********************/

Delegate.prototype.DEBUG = false;

Delegate.prototype.options = {};
Delegate.prototype.currentLogins = {};

Delegate.prototype.options.configURL = "https://raw.github.com/waltzio/waltz/master/deploy/site_configs.json";
Delegate.prototype.options.backupConfigURL = chrome.extension.getURL("build/site_configs.json");

if (Delegate.prototype.DEBUG) {
	Delegate.prototype.options.configURL = Delegate.prototype.options.backupConfigURL;
} 

function Delegate(opts) {
	var _this = this;

    this.options = $.extend(this.options, opts);

    this.storage = new Storage();
    this.analytics = new Analytics();    
    this.crypto = new Crypto();

    if (navigator.onLine) {
        start();
    } else {
        window.addEventListener('online', function() {
            window.removeEventListener('online');
            start();
        });
    }

    function start() {
        _this.storage.getOptions(function(options) {
            _this.init(options);
        });
    }
}

Delegate.prototype.init = function(options) {
    var _this = this;

    this.options = $.extend(this.options, options);
    this.storage.subscribe(this.storage.OPTIONS_KEY, function(changes) {
        _this.options = changes.newValue;
    });

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

            _this.analytics.trackEvent("context_menu", {
                tabIndex: tab.index,
                url: tab.url
            });
        }
    });

    // Listens to requests, so we can redirect to the original page 
    // after a successful login.
    chrome.webRequest.onCompleted.addListener(
        this.handleSuccessfulLogin.bind(this),
        {
            urls: Object.keys(this.currentLogins), 
            types: ["main_frame"]
        }
    );

    chrome.webRequest.onCompleted.addListener(
        this.handleLinkCaptures.bind(this),
        {
            urls: ['https://*.getclef.com/*'],
            types: ["main_frame"]
        }
    );

    chrome.webRequest.onHeadersReceived.addListener(
        this.handleCSPHeader.bind(this), 
        {
            urls: ["https://lastpass.com/*"],
            types: ["main_frame"]
        }, 
        ["blocking", "responseHeaders"]
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
};

Delegate.prototype.router = function(request, sender, sendResponse) {
    if (request.messageLocation && request.messageLocation !== "delegate") return false;
    
	if (typeof(request.method) === "undefined") {
		return false;
	}

	switch(request.method) {
		case "deleteCredentials":
			return this.deleteCredentials(request.key, sendResponse);
		case "getHost":
			return sendResponse(this.options.cy_url);
		default:
			return this[request.method].bind(this)(request, sendResponse);
	}
};

Delegate.prototype.getSiteConfigs = function(request, cb) {
    var _this = this;

    $.when(this.configsLoaded)
     .then(function() {
        cb(_this.siteConfigs);
     });

     return true;
};

Delegate.prototype.acknowledgeLoginAttempt = function(request) {
    
    if (request.successful) {
        // If the login is successful, let's refresh other potential tabs
        // to help them log in!
        chrome.tabs.query({ url: request.domain }, function(tabs) {
            _.each(tabs, function(tab) {
                if (!tab.active) {
                    chrome.tabs.reload(tab.id);
                }
            });
        });
    }

    delete(this.currentLogins[request.domain]);
};

Delegate.prototype.login = function(request, cb) {
	if (!this.loggedIn) {
		this.loggedIn = true;
		this.pubnubSubscribe();
	}

    this.currentLogins[request.domain] = {
        redirectUrl: request.location,
        state: 'attempted',
        modified: new Date()
    };
	this.storage.addLogin(request.domain);

    if (typeof cb === "function") cb();
};

Delegate.prototype.refreshOptions = function(request, cb) {
    var _this = this;
    this.storage.getOptions(function(options) {
        _this.options = options;
        if (typeof cb === "function") cb();
    });

    return true;
};

Delegate.prototype.updateSiteConfigs = function(data) {
	this.siteConfigs = data;
	var domains = [];
	for (var key in data) {
		if(data.hasOwnProperty(key)) {
			domains.push(key);
		}
	}
	var parsed = domains.map(Utils.parse_match_pattern).filter(function(pattern) { return pattern !== null; });
	this.includedDomainRegex = new RegExp(parsed.join('|'));
	this.configsLoaded.resolve();
};

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
		});
	}
};

Delegate.prototype.pubnubUnsubscribe = function(channel) {
	if (channel) {
		this.pubnub.unsubscribe({
			channel: channel
		});
	}
};

Delegate.prototype.logout = function(opts) {
	var _this = this;
	opts = opts || {};

	this.storage.getLogins(function(data) {
        if (_.isEmpty(data)) return;
        
		var sitesCompleted = [],
			promise,
			siteConfig,
			i;


		for (var domain in data) {
            sitesCompleted.push(_this.logOutOfSite({ domain: domain, refresh: true }));
            delete(_this.currentLogins[domain]);
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
						iconUrl: "/static/img/waltz-48.png"
					},
					function() {}
				);
			}
			_this.pubnubUnsubscribe(_this.user);
			_this.user = false;
			_this.loggedIn = false;
		});

        _this.analytics.trackEvent("logout_request", {
            sites_count: Object.keys(data).length
        });
	});
};

Delegate.prototype.logOutOfSite = function(opts, cb) {
    var promise = $.Deferred(),
        domain = opts.domain,
        siteConfig;

    if (opts.key) {
        siteConfig = this.getConfigForKey(opts.key);
        domain = siteConfig.domain;
    } else {
        siteConfig = this.siteConfigs[domain];
    }

    Utils.getCookiesForDomain(domain, function(cookies) {
        var cookie;
        for (i = 0; i < cookies.length; i++) {
            cookie = cookies[i];
            if (siteConfig.logout.cookies.indexOf(cookie.name) != -1) {
                chrome.cookies.remove({
                    url: Utils.extrapolateUrlFromCookie(cookie),
                    name: cookie.name
                });
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
        _this.storage.setOnboardingSiteKey(siteKey, 'forceTutorial', Date.now());
        if (typeof cb === "function") cb(true);
    });

    return true;
};

Delegate.prototype.saveCredentials = function(request, cb) {
	this.crypto.encrypt(request, cb);
	return true;
};

Delegate.prototype.decrypt = function(request, cb) {
	this.crypto.decrypt(request, cb);
	return true;
};

Delegate.prototype.proxyRequest = function(request, cb) {
    $.ajax({
        url: request.url, 
        data: request.data,
        type: request.type || 'GET'
    }).done(function(data) {
        cb(data); 
    });

	return true;
};

Delegate.prototype.checkAuthentication = function(request, cb) {
    if (typeof request === "function" && !cb) cb = request;
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
};

Delegate.prototype.handleCSPHeader = function(details) {
    var safeDomains = 'https://*.googleapis.com https://*.googleusercontent.com';
    for (i = 0; i < details.responseHeaders.length; i++) {

        if (Utils.isCSPHeader(details.responseHeaders[i].name.toUpperCase())) {
            var csp = details.responseHeaders[i].value;

            csp = csp.replace('font-src', 'font-src ' + safeDomains);
            csp = csp.replace('style-src', 'style-src ' + safeDomains);

            details.responseHeaders[i].value = csp;
        }
    }

    return { // Return the new HTTP header
        responseHeaders: details.responseHeaders
    };
};

Delegate.prototype.handleLinkCaptures = function(details) {
    if (details.url.match('(\/tutorial)|(\/user\/verify)')) {
        var _this = this,
            tutorialURL = chrome.extension.getURL('/html/tutorial.html');
        chrome.tabs.query({
            url: tutorialURL
        }, function(data) {
            _this.storage.getPrivateSettings(function(settings) {
                if (!settings.hasRedirectedFromClefTutorial) {
                    if (data.length) {
                        chrome.tabs.remove(details.tabId);
                        chrome.tabs.update(data[0].id, { selected: true });
                    } else {
                        chrome.tabs.update(details.tabID, { url: tutorialURL + '?id=site-setup'} );
                    }
                    _this.storage.setPrivateSetting("hasRedirectedFromClefTutorial", true);
                }
            });
        });
    } 
};

Delegate.prototype.handleSuccessfulLogin = function(details) {
    var domain,
        _this = this;
    for (var site in _this.currentLogins) {
        if (details.url.match(Utils.parse_match_pattern(site))) {
            domain = site;
            break;
        }
    }
    if (domain && _this.currentLogins[domain].state !== 'redirected') {
        var siteConfig = _this.siteConfigs[domain],
            others;

        var nextUrl = details.url;
        var forcedRedirectUrl = _this.currentLogins[domain].redirectUrl;
        var shouldNotRedirect = false;

        // If the URL which we are trying to force a redirect to 
        // is the login URL, let the  site handle directing the 
        // user to the right place
        var excludedForcedRedirectUrls = $.merge([], siteConfig.login.urls);
        // Also include the explicitly defined ones in the site config
        if (siteConfig.login.exclude) {
            others = siteConfig.login.exclude.forcedRedirectURLs || [];
            $.merge(excludedForcedRedirectUrls, others);
        }

        // If the next URL is the login URL, there's probably an error
        var excludedNextUrls = $.merge([], siteConfig.login.urls);
        // Also include the explicitly defined ones in the site config
        if (siteConfig.login.exclude) {
            others = siteConfig.login.exclude.nextURLs || [];
            $.merge(excludedNextUrls, others);
        }
        $.merge(excludedNextUrls, _.pluck(siteConfig.login.twoFactor, 'url'));

        var orEqual = function(aUrl) {
            return function(acc, currentUrl) {
                return acc || Utils.urlsAreEqual(currentUrl, aUrl);
            };
        };

        // Don't redirect if the forced redirect url is one of the
        // excluded ones, as defined above.
        shouldNotRedirect = excludedForcedRedirectUrls.reduce(orEqual(forcedRedirectUrl), false);
        // Don't redirect if the default next url is one of the
        // excluded ones, as defined above.
        shouldNotRedirect |= excludedNextUrls.reduce(orEqual(nextUrl), shouldNotRedirect);
        // If the next URL is the redirect URL, then we do not want to
        // redirect, to prevent a redirect loop.
        shouldNotRedirect |= Utils.urlsAreEqual(nextUrl, forcedRedirectUrl);

        if (!shouldNotRedirect) {
            chrome.tabs.update(details.tabId, {url: forcedRedirectUrl});
            // We set the state so it doesn't keep redirecting.
            _this.currentLogins[domain].state = 'redirected';
            _this.currentLogins[domain].modified = new Date();
        }
    }
};

Delegate.prototype.openNewTab = function(request, cb) {
    chrome.tabs.create({url: request.url});
    if (typeof cb === "function") cb();
};

Delegate.prototype.getConfigForKey = function(key) {
    for (var domain in this.siteConfigs) {
        if (this.siteConfigs[domain].key === key) {
            var config = this.siteConfigs[domain];
            config.domain = domain;
            return config;
        }
    }

    return false;
};

Delegate.prototype.initialize = function(data, callback) {
	var url = data.location.href.split('#')[0],
        _this = this;
	if (this.includedDomainRegex.test(url)) {
		var options;
		for (var site in this.siteConfigs) {
            var matched;
            if(typeof(this.siteConfigs[site].match) !== "undefined") {
                var regex = new RegExp(this.siteConfigs[site].match);
                matched = regex.test(url);
            } else {
                matched = url.match(Utils.parse_match_pattern(site));
            }

			if (matched) {
				options = {
					site: {
						domain: site,
						config: this.siteConfigs[site]
					},
                    currentLogin: this.currentLogins[site],
				};
                sendMatchCallback();
				return true;
			}
		}
	} else {
		callback(false);
	}

    function sendMatchCallback() {
        _this.refreshOptions({}, function() {
            options.cyHost = _this.options.cy_url;
            callback(options);
        });
    }

    return true;
};
