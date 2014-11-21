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
    debug.enable('waltz:*');
}

function Delegate(opts) {
	var _this = this;

    this.options = $.extend(this.options, opts);

    this.storage = new Storage();
    this.analytics = new Analytics();
    this.crypto = new Crypto();
    this.log = debug('waltz:delegate.js');

    this.ongoingAJAXRequests = {};

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

    //Add the context menu
    chrome.contextMenus.create({
        id: 'waltz-main',
        title: 'Waltz',
        onclick: function(info, tab) {
            chrome.tabs.create({url: "/html/options.html"});
        }
    });

    chrome.webRequest.onBeforeRequest.addListener(
        this.onBeforeAJAXRequest.bind(this),
        {
            urls: ["*://*/*"],
            types: ["xmlhttprequest"]
        }
    );

    chrome.webRequest.onCompleted.addListener(
        this.onAJAXCompleted.bind(this),
        {
            urls: ["*://*/*"],
            types: ["xmlhttprequest"]
        }
    );

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
            urls: ["*://*/*"],
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

    // bind the router
    chrome.runtime.onMessage.addListener(this.router.bind(this));

    // when the configs are done loading, blast off, baby!
    $.when(this.configsLoaded).then(this.syncAuthenticationState.bind(this));
};

Delegate.prototype.syncAuthenticationState = function (cb) {
    var _this = this;

    function run(callback) {
        _this.checkAuthentication(function(data) {
            if (data.error == "noconn") {
                _this.log('no connection, will retry in 1 seconds.');
                setTimeout(run, 1 * 1000);
                return;
            }

            if (data.user) {
                _this.pubnubSubscribe(data);
                _this.loggedIn = true;
            } else {
                _this.loggedIn = false;
                _this.logout({ silent: true });
            }

            if (typeof(callback) == "function") callback();
        });
    }

    run(function() {
        // every time we come online, sync
        window.addEventListener('online', run);
    });
};

Delegate.prototype.router = function(request, sender, sendResponse) {
    var _this = this;

    if (request.messageLocation && request.messageLocation !== "delegate") return false;

    if (typeof(request.method) === "undefined") {
        return false;
    }

    $.when(this.configsLoaded).then(function() {
        Raven.context(function() {
            request.sender = sender;
            _this[request.method].bind(_this)(request, sendResponse);
        });
    });

    return true;
};

Delegate.prototype.onBeforeAJAXRequest = function(details) {
    this.ongoingAJAXRequests[details.tabId] = true;
};

Delegate.prototype.onAJAXCompleted = function(details) {
    delete(this.ongoingAJAXRequests[details.tabId]);
};

Delegate.prototype.hasOngoingAJAXRequest = function(request, callback) {
    callback(this.ongoingAJAXRequests[request.sender.tab]);
    return true;
};

Delegate.prototype.getSiteConfigs = function(request, cb) {
    var _this = this;

    $.when(this.configsLoaded)
     .then(function() {
        cb(_this.siteConfigs);
     });

     return true;
};

Delegate.prototype.acknowledgeLoginAttempt = function(request, cb) {

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
        this.analytics.trackEvent('Login success', { site: request.key });
    } else {
        this.analytics.trackEvent('Login failure', { site: request.key });
    }

    delete(this.currentLogins[request.domain]);

    if (typeof(cb) == "function") cb();
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
    this.analytics.trackEvent('Login attempt', { site: request.key });
    if (typeof cb === "function") cb(this.currentLogins[request.domain]);
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

    // extract the `key` from all of the configs and compose
    // them into a regex that can be used to check if Waltz needs
    // to be loaded on a page.
    var parsed = _.map(this.siteConfigs, function(config, key) {
        // `config` is the site config
        // `key` is the url match pattern used to identify the site

        // transform the `key` into a regular expression
        var pattern = Utils.parse_match_pattern(key);
        // if the config has an additional match pattern, add it to the
        // regular expression as an OR statement
        if (config.match) pattern += ("|" + config.match);

        return pattern;
    }).filter(function(pattern) { return pattern !== null; });

    // join all of the site-specific regular expressions into one big
    // regular expression with an OR
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
        _this.log("Subscribing to PubNub on channel: " + data.user);
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
    channel = channel || this.user;
    if (channel) {
        this.log("Unsubscribing from PubNub channel: " + channel);
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

		$.when.apply($, sitesCompleted).then(function() {
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
            _this.analytics.trackEvent('Logout', { sites_count: Object.keys(data).length });
		});
	});
};

Delegate.prototype.logOutOfSite = function(opts, cb) {
    var fullyDonePromise = $.Deferred(),
        domain = opts.domain,
        cookiesToDelete = [],
        siteConfig,
        logoutDomains,
        logoutCookes,
        logoutCookie,
        i;

    if (opts.key) {
        siteConfig = this.getConfigForKey(opts.key);
        domain = siteConfig.domain;
    } else {
        siteConfig = this.siteConfigs[domain];
    }
    if (!siteConfig) {
        siteConfig = this.buildAnonymousSiteConfig(domain);
        domain = Utils.getDomainName(domain);
    }

    logoutDomains = [domain];
    logoutCookies = siteConfig.logout.cookies;

    // Wildcard to delete all cookies
    var deleteAllCookies = logoutCookies.length == 1 && logoutCookies[0] == '*';

    if (!deleteAllCookies) {
        for (i = 0; i < logoutCookies.length; i++) {
            logoutCookie = logoutCookies[i];
            if (typeof(logoutCookie) === "object") {
                cookiesToDelete.push(logoutCookie.cookie);
                if (logoutDomains.indexOf(logoutCookie.domain) < 0) {
                    logoutDomains.push(logoutCookie.domain);
                }
            } else {
                cookiesToDelete.push(logoutCookie);
            }
        }
    }

    var promises = logoutDomains.map(function(domain) {
        var promise = $.Deferred();
        Utils.getCookiesForDomain(domain, function removeCookies(cookies) {
            if (cookies) {
                $.each(cookies, function(i, cookie) {
                    var shouldDelete = (deleteAllCookies ||
                        cookiesToDelete.indexOf(cookie.name) != -1);
                    if (shouldDelete) {
                        chrome.cookies.remove({
                            url: Utils.extrapolateUrlFromCookie(cookie),
                            name: cookie.name
                        });
                    }
                });
            }
           promise.resolve();
        });
        return promise;
    });

    $.when.apply($, promises).then(function() {
        if (opts.refresh) {
            var refresh = function(data) {
                for (var i = 0; i < data.length; i++) {
                    chrome.tabs.reload(data[i].id);
                }
            };

            for (var i = 0; i < logoutDomains.length; i++) {
                var domain = logoutDomains[i];
                // Make the domain a wildcard if it isn't already
                if (!domain.match(/\:\/\//)) domain = '*://*.' + domain + '/*';
                chrome.tabs.query(
                    { url: domain },
                    refresh
                );
            }
        }

        fullyDonePromise.resolve();
        if (typeof cb === "function") cb();
    });

    return fullyDonePromise;
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
    var safeDomains = [
        'https://*.googleapis.com',
        'https://*.googleusercontent.com',
        'https://clef.io',
        'https://*.waltz.io'
    ].join(' '),
        ruleRegex = new RegExp('(font-src|style-src|frame-src|default-src)', 'g');

    for (i = 0; i < details.responseHeaders.length; i++) {

        if (Utils.isCSPHeader(details.responseHeaders[i].name.toUpperCase())) {
            var csp = details.responseHeaders[i].value;

            csp = csp.replace(ruleRegex, '$1 ' + safeDomains);

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

Delegate.prototype.findSiteConfig = function(url) {
	if (this.includedDomainRegex.test(url)) {
		for (var site in this.siteConfigs) {
            var matched;
            if (typeof(this.siteConfigs[site].match) !== "undefined") {
                var regex = new RegExp(this.siteConfigs[site].match);
                matched = regex.test(url);
            } else {
                matched = url.match(Utils.parse_match_pattern(site));
            }

			if (matched) {
                return site;
			}
		}
	}
};

Delegate.prototype.buildAnonymousSiteConfig = function(domain) {
    return {
        name: domain,
        key: domain,
        login: {},
        logout: {
            cookies: ['*']
        },
        isAnonymous: true
    };
};

Delegate.prototype.buildAnonymousSiteOptionsForDomain = function(domain) {
    var options = {
        site: {
            domain: domain,
            config: this.buildAnonymousSiteConfig(domain)
        },
        currentLogin: this.currentLogins[domain]
    };
    return options;
};

Delegate.prototype.buildAnonymousSiteOptions = function(url) {
    var parsedURL = Utils.url(url);
    var domain = Utils.getDomainName(parsedURL.hostname);
    return this.buildAnonymousSiteOptionsForDomain(domain);
};

Delegate.prototype.buildSiteOptions = function(site) {
    var options = {
        site: {
            domain: site,
            config: this.siteConfigs[site]
        },
        currentLogin: this.currentLogins[site],
    };
    options.site.config.isAnonymous = false;
    return options;
};

Delegate.prototype.initialize = function(data, callback) {
	var url = data.location.href.split('#')[0],
        _this = this;

    var options;
    var site = this.findSiteConfig(url);
    if (!site) {
        options = this.buildAnonymousSiteOptions(url);
    } else {
        options = this.buildSiteOptions(site);
    }
    _this.refreshOptions({}, function() {
        options.cyHost = _this.options.cy_url;
        options.debug = Delegate.prototype.DEBUG;
        callback(options);
    });
    return true;
};
