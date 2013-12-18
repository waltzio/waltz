/* Keen Snippet */
var Keen=Keen||{configure:function(e){this._cf=e},addEvent:function(e,t,n,i){this._eq=this._eq||[],this._eq.push([e,t,n,i])},setGlobalProperties:function(e){this._gp=e},onChartsReady:function(e){this._ocrq=this._ocrq||[],this._ocrq.push(e)}};

// Configure the Keen object with your Project ID and (optional) access keys.
Keen.configure({
    projectId: "52aa2fc873f4bb0891000000",
    writeKey: "8db1acc35090cdfb509873070281e2a840333cec2de43f73c2e0add591baecd34bd81eab2da13a4c9210f8d4f225d6ff398c6eba2efbf4b5cc164940522079bc79382f3ecb90dfdeaa709d517e838921f391cc1258df321411de86f6d08081e034219b475ac3e52ab817cdab48b4eb9d", // required for sending events
});

//And now our code..
Analytics.prototype.KEEN_UUID_KEY = "keen-uuid";

function Analytics(opts) {
	this.options = opts || {};
	this.storage = new Storage();

	this.initialized = this.initializeKeen();
	this.loadedDevCheck = this.checkDevMode();
}

Analytics.prototype.trackEvent = function(evnt, data) {
	var _this = this
		data = data || {};

	$.when(this.loadedDevCheck, this.initialized)
	 .then(function(isDevMode) {
	 	if (!isDevMode) {
		 	Keen.addEvent(evnt, data);
	 	} else {
	 		data = $.extend(data, _this.getProperties());
	 		_this.debug("Waltz analytics not tracked", evnt, data);
	 	}
	 });
}

Analytics.prototype.initializeKeen = function(evnt, data) {
	var _this = this
		promise = $.Deferred();

	this.storage.getPrivateSettings(function(options) {
		if (options[_this.KEEN_UUID_KEY]) {
			this.KEEN_UUID = options[_this.KEEN_UUID_KEY];
			Keen.setGlobalProperties(_this.getProperties.bind(_this));
			promise.resolve();
		} else {
			_this.KEEN_UUID = Math.floor(Math.random() * 1000000000);
			_this.storage.setPrivateSetting(
				_this.KEEN_UUID_KEY,
				_this.KEEN_UUID,
				function() {
					promise.resolve();
				}
			);
		}
		Keen.setGlobalProperties(_this.getProperties.bind(_this));
	});
	return promise;
};

Analytics.prototype.checkDevMode = function() {
	var _this = this,
		promise = $.Deferred();

	if (this.devMode) return promise.resolve(this.devMode);

	$.getJSON(
		chrome.runtime.getURL('manifest.json'),
		function(data) {
			_this.devMode = !('update_url' in data);
			promise.resolve(_this.devMode);
		}
	);

	return promise;
}

Analytics.prototype.getProperties = function() {
	var properties = {
        UUID: this.KEEN_UUID,
        has_network_connection: navigator.onLine,
        chrome_version: window.navigator.appVersion
    };

    if (this.options.captureURLData) {
    	properties.protocol = window.location.protocol;
    	properties.host = window.location.host;
    	properties.path = window.location.pathname;
    }

    return properties;
}

Analytics.prototype.debug = function() {
	console.log.apply(console, arguments);
}

