// initialize mixpanel
mixpanel.init("774f6b0c47772e7c4d159eb5694455ad");

//And now our code..
Analytics.prototype.UUID_KEY = "keen-uuid";

function Analytics(opts) {
	this.options = opts || {};
	this.properties = this.options.properties || {};
	this.storage = new Storage();

	this.initialized = this.initialize();
	this.loadedDevCheck = Utils.isDevMode();
}

Analytics.prototype.trackEvent = function(evnt, data) {
	var _this = this;
	data = data || {};

	$.when(this.loadedDevCheck, this.initialized)
	.then(function(isDevMode) {
		data = $.extend(data, _this.getProperties());
		if (!isDevMode) {
			mixpanel.track(evnt, data);
		} else {
			_this.debug("DEBUG: analytics - event -", evnt, data);
		}
	});
};

Analytics.prototype.initialize = function(evnt, data) {
	var _this = this,
		promise = $.Deferred();

	this.storage.getPrivateSettings(function(options) {
		if (options[_this.UUID_KEY]) {
			_this.UUID = options[_this.UUID_KEY];
			_this.identify();
			promise.resolve();
		} else {
			_this.UUID = Math.floor(Math.random() * 1000000000);
			mixpanel.alias(_this.UUID);
			_this.storage.setPrivateSetting(
				_this.UUID_KEY,
				_this.UUID,
				function() {
					_this.identify();
					promise.resolve();
				}
			);
		}
	});
	return promise;
};

Analytics.prototype.identify = function() {
	mixpanel.identify(this.UUID);
};

Analytics.prototype.getProperties = function() {
	var properties = $.extend({}, this.properties, {
        id: this.UUID,
        has_network_connection: navigator.onLine,
        chrome_version: window.navigator.appVersion
    });

    if (this.options.captureURLData) {
		properties.protocol = window.location.protocol;
		properties.host = window.location.host;
		properties.path = window.location.pathname;
    }

    return properties;
};

Analytics.prototype.debug = function() {
	console.log.apply(console, arguments);
};

