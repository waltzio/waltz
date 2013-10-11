(function($) {

	var Vault = function() {
		var self = this;

		self.loginCredentials = false;
		self.cydoemusHost = "";

		self.loginForm = self.detectLogin();

		if (self.loginForm) {
			chrome.runtime.sendMessage({
				type: "getHost"
			}, function(host) {
				self.cydoemusHost = host;

				
				chrome.runtime.sendMessage({
					type: "getCredentials",
					domain: document.location.host

				}, function(creds) {
					if(creds.error) {
						if(creds.error === "authentication") {
							console.log("auth error");
						} else {
							console.log(creds.error, creds.status);
						}
					} else {
						if(creds.creds && self.loginForm) {
							self.loginCredentials = creds.creds	
						}
						self.drawClefWidget();		
					}
				});
			});
		}

		window.addEventListener('message', this.closeIFrame.bind(this));
	}


	//Checks if a login form exists.  Returns the login form container or false if one doesnt exist
	Vault.prototype.detectLogin = function() {
		var passwordInputs = $("input[type='password']");

		var mostLikelyContainer = false;
		//Password inputs are a required input for any login form, so let's start there
		//Loop through each of the password inputs on the page try to figure out if it's a login form

		var passwordContainer = false;
		var passwordContainerScore = -1000;
		passwordInputs.each(function() {
			//We need to work up the DOM and find the container for entire login form.
			//Usually this will be a <form>, but not always, so we need to manually look for it
			var foundParent = false;
			var curParent = this;

			while(!foundParent && $(curParent).parent().length) {
				curParent =  $(curParent).parent();

				//For now let's just say that anything that contains multiple inputs is the form container
				if($(curParent).find("input").length > 1) {
					foundParent = true;
				}
			}

			if(foundParent) {

				//Login forms should only have one password input
				if($(curParent).find("input[type='password']").length > 1) {
					return false;
				}

				//Login forms should have at max one email input.  We can't always say the same for text inputs, so be specific
				if($(curParent).find("input[type='email']").length > 1) {
					return false;
				}

				//But Login forms should have at least 1 text or email field
				if($(curParent).find("input[type='email'], input[type='text']").length === 0) {
					return false;
				}

				//It's possible that there is an actual <form> container above this.  If so, let's
				//look for that and make sure we didn't jump too far up the tree
				var closestForm = $(curParent).closest("form");
				if($(closestForm).find("input[type='password'], input[type='email'], input[type='text']").length === $(curParent).find("input[type='password'], input[type='email'], input[type='text']").length) {
					curParent = closestForm;
				}

				//OK..  This is probably a login form.  But there may be other similar ones, so let's score them and compare
				var score = 0;

				var hasButtons = !!$(curParent).find("input[type='submit'], button, input[type='image']").length;
				var hasRememberMe = $(curParent).find("input[type='checkbox']").length === 1;
				var numWeirdInputs = $(curParent).find("input").not("[type='checkbox'], [type='text'], [type='email'], [type='password'], [type='submit'], [type='hidden']").length
				//We will decrease this by two because we expect two inputs on a login form
				//We also expect a rememberMe and a submit button, so add those back in as well.
				var numExtraNormalInputs = $(curParent).find("input").filter("[type='checkbox'], [type='text'], [type='email'], [type='password'], [type='submit']").length - 2 - hasRememberMe - hasButtons;


				score += hasButtons ? 1 : -1;
				score += hasRememberMe ? 1 : -1;
				score -= numWeirdInputs * 2;
				score -= numExtraNormalInputs;

				if(score > passwordContainerScore) {
					passwordContainer = curParent;
					passwordContainerScore = score;
				}
			}
		});
		if(!passwordContainer) {
			return false;
		}

		var passwordField = $(passwordContainer).find("input[type='password']");

		//As a note, these selectors will be ordered from least likely to most likely match

		//First of all, just grab the first text field, and choose that.  If nothing else matches, that's probably the one
		var usernameField = $(passwordContainer).find("input[type='text']").first();

		//Now let's try to find an email field.  Chances are that the email field is the username
		var emailField = $(passwordContainer).find("input[type='email']")
		if(emailField.length) {
			usernameField = emailField;
		}

		//There are a few common classes and IDs that usually indicate username fields.
		//This is a list of them, sorted by least likely to most likely. We will loop
		//through them looking for username fields
		var usernameClasses = [
			"login",
			"uid",
			"email",
			"user",
			"username"
		];

		for(var i=0,max=usernameClasses.length; i<max; i++) {
			var matches = $(passwordContainer).find("input."+usernameClasses[i]+", input#"+usernameClasses[i]);

			if(matches.length) {
				usernameField = $(matches).first();
			}
		}

		//OK, we probably have a username field now.  

		//We also have everything else, so let's build a useful reference object and return it

		return {
			container: passwordContainer,
			passwordField: passwordField,
			usernameField: usernameField
		};
	}

	Vault.prototype.storeLogin = function(username, password) {
		chrome.runtime.sendMessage({
			domain: document.location.host,
			username: username,
			password: password
		});
	}

	Vault.prototype.decryptCredentials = function(cb) {
		var self = this;
		if(self.loginCredentials && typeof(self.loginCredentials.password === "string")) {
			chrome.runtime.sendMessage({
				type: "decrypt",
				domain: document.location.host,
				value: self.loginCredentials.password

			}, function(response) {

				if(typeof(cb) === "function") {
					cb({
						username: self.loginCredentials.username,
						password: response.output,
						error: response.error
					});
				}

			});
		}
	}

	Vault.prototype.encryptCredentials = function(credentials, cb) {
		chrome.runtime.sendMessage({
			type: "saveCredentials",
			domain: document.location.host,
			username: credentials.username,
			password: credentials.password
		}, function(response) {
			if(typeof(cb) === "function") {
				cb();
			}

		});
	}

	Vault.prototype.loadIFrame = function() {
		if (this.iframe) return;

		var self = this;

		var $iframe = this.iframe = $("<iframe id='clef_iframe'>");

		$iframe.css({
			position: 'absolute',
			height: '100%',
			width: '100%'
		});

		$iframe.attr('src', self.cydoemusHost+'/login');

		$("body").append($iframe);

		$iframe.css({
			position: 'absolute',
			height: '100%',
			width: '100%',
			top: 0,
			left: 0,
			border: 'none',
			display: 'none',
			"z-index": 999999999
		});

		$iframe.on('load', function() {
			$iframe[0].contentWindow.postMessage(null, self.cydoemusHost);
		});
	}

	Vault.prototype.logIn = function(cb) {
		var self = this;


		if (!this.iframe) {
			this.loadIframe
		}

		this.iframe.fadeIn();

		addEventListener("message", function(e) {
			if(e.data.auth) {
				self.iframe.remove();
				if (typeof cb == "function") {
					cb();
				}
			}
		});
	}

	Vault.prototype.closeIFrame = function(e) {
		if (e.origin == this.cydoemusHost) {
			if (e.data && e.data.method == "closeIFrame" && this.iframe) {
				this.iframe.remove();
				this.iframe = false;
				this.loadIFrame();
			}
		}
	}


	Vault.prototype.decryptAndLogIn = function() {
		var self = this;

		self.decryptCredentials(function(response) {
			if(response.error) {
				if(response.error === "authentication") {
					self.login(this);
				} else {
					console.log(response);
				}
			} else {
				self.fillAndSubmitLoginForm(response);
			}
		});
	}

	//Fills the login form and submits it
	Vault.prototype.fillAndSubmitLoginForm = function(data) {
		var self = this;

		$(self.loginForm.usernameField).val(data.username);
		$(self.loginForm.passwordField).val(data.password);

		//Now let's try and submit this freaking form...
		if($(self.loginForm.container).is("form")) {  //If it's a <form>, then it's easy.
			chrome.runtime.sendMessage({
				type: "login",
				domain: document.location.host
			}, function() {});
			$(self.loginForm.container).submit();
		} else {
			//Now we just need to find the most likely button to click submit on..
			//Generally that's just going to be the last button on the form
			var button = $(self.loginForm.container).find("input[type='submit']").last();

			if(!button.length) {
				button = $(self.loginForm.container).find("button").last();
			}

			if(!button.length) {
				button = $(self.loginForm.container).find("input[type='image']").last();
			}

			if(button.length) {
				chrome.runtime.sendMessage({
					type: "login",
					domain: document.location.host
				}, function() {});
				$(button).click();
			} else {
				console.log('OH NOES!');
				//I guess if we get this far I don't really know what to do.  Will need to do some research
			}
		}
	}

	Vault.prototype.checkAuthentication = function(cb) {
		var self = this;

		chrome.runtime.sendMessage({
			type: "checkAuthentication",
			domain: document.location.host
		}, function(response) {
			if (!response.user) {
				self.logIn(cb);
			} else {
				if (typeof(cb) == "function") {
					cb();
				}
			}
		});
	}

	Vault.prototype.requestCredentials = function(form) {
		var self = this;

		// TODO: use same labels as actual login form
		var $html = $([
			"<div class='clef-request-credentials-overlay'>",
				"<form class='clef-request-credentials-form'>",
					"<input type='text' name='username'/>",
					"<input type='password' name='password'/>",
					"<input type='submit' id='clef-request-credentials-submit' value='submit'/>",
				"</form>",
			"</div>"
		].join(""));

		$('body').append($html);

		$html.find('form').submit(function(e) {
			e.preventDefault();

			var credentials = {
				password: $html.find('input[type="password"]').val(),
				username: $html.find('input[type="text"]').val()
			}

			self.encryptCredentials(credentials, function() {
				self.fillAndSubmitLoginForm(credentials)
			})
		});
	}

	//Draws the clef widget and binds the interactions
	Vault.prototype.drawClefWidget = function(form) {
		var self = this;

		//Grab image resource URLs from extensions API
		var cSource = chrome.extension.getURL("/img/clef128.png");
		var fSource = chrome.extension.getURL("/img/clef-full.png");
		var pSource = chrome.extension.getURL("/img/pencil.png");
		var xSource = chrome.extension.getURL("/img/x.png");


		//Build HTML for clef widget
		var clefCircle = $("<div id='clef-vault-login-wrapper' class='spinning'></div>");
		var clefActions = $(
			"<button style='background-image:url("+xSource+");' class='clef-button clef-dismiss'></button>"
			+"<button style='background-image:url("+pSource+");' class='clef-button clef-edit'></button>"
			);

		//Style the widget with the correct image resource
		$(clefCircle).css({
			"background-image": "url("+cSource+")"
		}).append(clefActions);

		$(document).ready(this.loadIFrame.bind(this));


		$(clefCircle).click(function() {
			$(this).addClass("loading");

			self.checkAuthentication(function() {
				if (self.loginCredentials) {
					self.decryptAndLogIn();
				} else {
					self.requestCredentials();
				}
			});

			setTimeout(function() {
				$(self).remove();
			}, 1000)
		});

		$(clefCircle).find(".clef-dismiss").click(function(e) {
			e.stopPropagation();

			$(this).parent().addClass("remove");

			setTimeout(function() {
				$(self).remove();
			});
		});

		$(clefCircle).find(".clef-edit").click(function(e) {
			e.stopPropagation();

			self.checkAuthentication(function() {
				self.requestCredentials();
			});
		});


		$("body").append(clefCircle);

	}

	new Vault();

})(jQuery);