(function($) {


Options.prototype.credentialsSelector = ".main-content.sites-list";
Options.prototype.settingsSelector = ".main-content.settings";

Options.prototype.passwordInputSelector = "input[name='password']";
Options.prototype.usernameInputSelector = "input[name='username']";
Options.prototype.decryptedContainerSelector = ".decrypted-container";
Options.prototype.informationContainerSelector = ".information-container";

Options.prototype.navBarSelector = ".nav-bar";

Options.prototype.decryptButtonSelector = "button.decrypt";
Options.prototype.forgetButtonSelector = "button.forget";
Options.prototype.saveButtonSelector = "button.save";
Options.prototype.showButtonSelector = "button.show";
Options.prototype.allowButtonSelector = "button.allow";

Options.prototype.defaults = {}

Options.prototype.settingsMetaMap = {
	cy_url: {
		name: "Waltz Server Base URL"
	}
}

function Options() {
	this.storage = new Storage();
	this.templater = new Templater();
	var _this = this;

	var optionsReady = this.storage.getOptions();
	var credentialsReady = this.storage.getCredentials();
	var dismissalsReady = this.storage.getDismissals();

	$.when(optionsReady, credentialsReady, dismissalsReady)
	 .then(this.init.bind(this));
}

Options.prototype.init = function(options, credentials, dismissals) {
	this.options = _.defaults(options, this.defaults);
	this.credentials = credentials;
	this.dismissals = dismissals;

	this.render();
};

Options.prototype.render = function() {
	var _this = this,
		$credentials = $(this.credentialsSelector),
		$settings = $(this.settingsSelector),
		renderingComplete = [],
		promise;


	renderingComplete.push(this.templater.template(
		{
			named: 'credentials',
			context: { credentials: this.credentials }
		},
		function(html) {
			$credentials.append(html);
		}
	));

	// only pick the settings, which we've explicitly declared we want to
	// show
	var displaySettings = _.clone(this.settingsMetaMap);
	_.map(this.settingsMetaMap, function(v, k) { displaySettings[k].value = _this.options[k] });

	renderingComplete.push(this.templater.template(
		{
			named: 'settings',
			context: { settings: displaySettings }
		},
		function(html) {
			$settings.prepend(html);
		}
	));

	renderingComplete.push(this.templater.template(
		{
			named: 'dismissals',
			context: { dismissals: this.dismissals }
		},
		function(html) {
			$settings.append(html);
		}
	));
	
	$.when.apply($, renderingComplete).then(this.attachHandlers.bind(this));
}

Options.prototype.attachHandlers = function() {
	$(this.navBarSelector).find("li").click(function() {
		$(this).siblings('.active').removeClass('active');
		$(this).addClass('active');

		var target = $($(this).data('target'));
		$(".main-content").hide();
		$(target).show();
	});

	this.attachCredentialsHandlers();
	this.attachSettingsHandlers();
};

Options.prototype.attachSettingsHandlers = function() {
	var _this = this,
		$settings = $(this.settingsSelector);

	$settings.find(this.saveButtonSelector).click(function() {
		triggerLoading(this);
		$settings.find('input').each(function() {
			_this.storage.setOption(this.name, $(this).val());

			if(this.name == "cy_url") {
				_this.trackKeenEvent("changed_cy_url", {
					is_https: $(this).val().toLowerCase().substr(0, 8) === "https://"
				});
			}
		});
	});

	$settings.find(this.allowButtonSelector).click(function() {
		var $item = $(this).parents('.dismissed-item'),
			loading = triggerLoading(this, { promise: true });

		_this.storage.getDismissalsForSite(
			$item.data('key'),
			function(dismissals) {
				if ($item.data('path')) {
					delete(dismissals.pages[$item.data('path')]);
					if (Object.keys(dismissals.pages).length === 0) {
						delete(dismissals['pages']);
					}
				} else {
					dismissals.dismissedForever = false;
				}
				_this.storage.setDismissalsForSite(
					$item.data('key'),
					dismissals
				);
				loading.resolve();
				$item.slideUp();
			}
		);
	});
}

Options.prototype.attachCredentialsHandlers = function() {
	var _this = this,
		$credentials = $(this.credentialsSelector);
	
	$credentials.find(this.decryptButtonSelector).click(function() {
		var $this = $(this),
			$credential = $this.parents('.credential'),
			username = $credential.data('username'),
			encryptedPassword = $credential.data('password'),
			key = $credential.data('key');


		_this.checkAuthentication(function(authed) {
			if(authed) {
				decryptAndDisplay();
			} else{
				_this.loginWithClef(decryptAndDisplay);
			}
		});

		function decryptAndDisplay() {
			var finishedLoading = triggerLoading($this, { promise: true });
			chrome.runtime.sendMessage({
				method: "decrypt",
				key: key,
				value: encryptedPassword

			}, function(response) {
				if(response.error) {
					alert(response.error);
					return false;
				} 

				$credential.find(_this.passwordInputSelector).val(response.output);
				$credential.find(_this.decryptedContainerSelector).slideDown();

				finishedLoading.resolve();
			});
		}

		_this.trackKeenEvent("credential_decrypted", {
			site: $credential.data('key')
		});
	});

	$credentials.find(this.forgetButtonSelector).click(function() {
		var $credential = $(this).parents('.credential');

		_this.storage.deleteCredentialsForDomain(
			$credential.data('key'),
			function() {
				$credential.slideUp(300, function() { $(this).remove(); });
			}
		);

		_this.trackKeenEvent("credential_forgotten", {
			site: $credential.data('key')
		});

	});

	$credentials.find(this.showButtonSelector).click(function() {
		var $this = $(this),
			$credential = $this.parents('.credential'),
			$inputs = $credential.find(_this.passwordInputSelector),
			$toShow = $inputs.filter(':not(.toggled)');

		$inputs.filter('.toggled').removeClass('toggled');
		$toShow.addClass('toggled');

		if ($this.text() === "show") {
			$this.text('hide');
		} else {
			$this.text('show');
		}
	});

	$credentials.find(this.saveButtonSelector).click(function() {
			var $this = $(this),
				$credential = $this.parents('.credential');

			var doneSaving = triggerLoading($this, { promise: true});

			chrome.runtime.sendMessage({
				method: "saveCredentials",
				key: $credential.data('key'),
				username: $credential.find(_this.usernameInputSelector).val(),
				password: $credential.find(_this.passwordInputSelector).filter('.toggled').val()
			}, function() { doneSaving.resolve(); });

			_this.trackKeenEvent("credential_edited", {
				site: $credential.data('key')
			});
	});
};


Options.prototype.checkAuthentication = function(cb) {
	chrome.runtime.sendMessage({
		method: "checkAuthentication"
	}, function(response) {
		if (!response.user) {
			if (typeof(cb) == "function") {
				cb(false);
			}
		} else {
			if (typeof(cb) == "function") {
				cb(true);
			}
		}
	});
}

Options.prototype.loginWithClef = function(callback) {
	var $iframe = $("<iframe>");

	$iframe.css({
		position: 'absolute',
		height: '100%',
		width: '100%',
		top: 0,
		left: 0,
		border: 'none'
	});

	$iframe.attr('src', this.options.cy_url +'/login');

	$("body").append($iframe);


	addEventListener("message", function handleMessage(e) {
		if(e.data.auth) {
			$iframe.fadeOut(200, function() { $(this).remove(); });
			if (typeof callback === "function") callback();
			removeEventListener("message", handleMessage);
		}

		if (e.data && e.data.method == "closeIFrame") {
			e.stopPropagation();
			$iframe.remove();
			removeEventListener("message", handleMessage);
		}
	});
}

Options.prototype.trackKeenEvent = function(evnt, data) {
	var _this = this;

	if(typeof(KEEN_UUID) !== "undefined") {
		Keen.addEvent(evnt, data);
	} else {
		this.initiateKeen(evnt, data);
	}
}

Options.prototype.initiateKeen = function(evnt, data) {
	var _this = this;

	_this.storage.getOptions(function(options) {
		KEEN_UUID = options[KEEN_UUID_KEY];
		Keen.setGlobalProperties(_this.getKeenGlobals);
		if(evnt) {
			_this.trackKeenEvent(evnt, data);
		}
	});
};

Options.prototype.getKeenGlobals = function(eventCollection) {
    // setup the global properties we'll use
    var globalProperties = {
        UUID: KEEN_UUID,
        has_network_connection: navigator.onLine,
        chrome_version: window.navigator.appVersion
    };

    return globalProperties;
};

function triggerLoading(el, opts) {
	var $el = $(el),
		saveText = $el.text(),
		promise;

	$el.addClass('loading');
	$el.text('loading..');

	if (opts && opts.promise) {
		promise = $.Deferred();
		$.when(promise)
		 .then(unload)
		return promise;
	} else {
		setTimeout(unload, 1000);
	}

	function unload() {
		$el.removeClass('loading');
		$el.text(saveText);
	}
}

$(document).ready(function() {
	var options = new Options();
});

})(jQuery);