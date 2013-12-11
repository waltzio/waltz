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

	$.when(optionsReady, credentialsReady)
	 .then(this.init.bind(this));
}

Options.prototype.init = function(options, credentials) {
	this.options = _.defaults(options, this.defaults);
	this.credentials = credentials;

	this.render();
};

Options.prototype.render = function() {
	var _this = this,
		$credentials = $(this.credentialsSelector),
		$settings = $(this.settingsSelector),
		renderingComplete = [],
		promise;


	renderingComplete.push(this.templater.template(
		'credentials', 
		{ credentials: this.credentials },
		function(html) {
			$credentials.append(html);
		}
	));


	// only pick the settings, which we've explicitly declared we want to
	// show
	var displaySettings = _.clone(this.settingsMetaMap);
	_.map(this.settingsMetaMap, function(v, k) { displaySettings[k].value = _this.options[k] });

	renderingComplete.push(this.templater.template(
		'settings',
		{ settings: displaySettings },
		function(html) {
			$settings.prepend(html);
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
		});
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
	});

	$credentials.find(this.forgetButtonSelector).click(function() {
		var $credential = $(this).parents('.credential');

		_this.storage.deleteCredentialsForDomain(
			$credential.data('key'),
			function() {
				$credential.slideUp(300, function() { $(this).remove(); });
			}
		);

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


	addEventListener("message", function(e) {
		if(e.data.auth) {
			$iframe.fadeOut(200, function() { $(this).remove(); });
			if (typeof callback === "function") callback();
		}
	});
}

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