(function($) {

	var Waltz = this.Waltz = function(opts) {
        // If there are no opts, Waltz is not supported on this site
		if (!opts) return;

		this.options = opts;
		var _this = this,
			page = this.checkPage();
        
		if (page == "logged_in") {
			// If the 'check' selector exists, then we're logged in, 
        	// so don't show Waltz
    		this.acknowledgeLogin();
            return;
        } else {
        	// the 'check' selector doesn't exit yet, but it may exist in the 
        	// near future. 
        	var checks = 0,
        		MAX_CHECKS = 20,
        		CHECK_INTERVAL = 300,
        		loginCheckInterval;

        	if (!this.options.currentLogin) {
        		// If we're not inTransition, let's assume that we need to log
        		// in. So, kickOff then check to see if we need to hide.
        		kickOff();
        		loginCheckInterval = setInterval(function() {
        			if (checks > MAX_CHECKS) {
	        			clearInterval(loginCheckInterval);
	        			return;
	        		}

	        		page = _this.checkPage();
	        		if (page === "logged_in") {
        				$(".waltz-dismiss").click();
			        	this.acknowledgeLogin();
	        			clearInterval(loginCheckInterval);
	        			return;
	        		} else if (page == "login") {
	        			clearInterval(loginCheckInterval);
	        		} else {
	        			checks++;
	        		}

        		}, CHECK_INTERVAL);

        	} else {
	        	// if we are inTransition, let's keep on looking for a login 
	        	// field. We can do this because the bad password page will
	        	// almost certainly contain the field to put in a new password.
	        	// ya feel me?
	        	if (page === "login") {
	        		kickOff();
	        	} else {
	        		loginCheckInterval = setInterval(function() {
	        			if (checks > MAX_CHECKS) {
	        				clearInterval(loginCheckInterval);
	        				return;
	        			}

	        			page = _this.checkPage();
	        			if (page === "logged_in") {
				        	this.acknowledgeLogin();
		        			clearInterval(loginCheckInterval);
		        			return;
	        			} else if (page === "login") {
	        				kickOff();
	        				clearInterval(loginCheckInterval);
	        				return;
	        			} else {
	        				checks++;
	        			}
	        		}, CHECK_INTERVAL);
	        	}
        	}
        }

        function kickOff() {
        	_this.loginCredentials = false;

			chrome.runtime.sendMessage({
				method: "getCredentials",
				key: _this.options.site.config.key

			}, function(creds) {
				if(creds.error) {
					if(creds.error === "authentication") {
						console.log("auth error");
					} else {
						console.log(creds.error, creds.status);
					}
				} else {
					_this.loginCredentials = creds.creds	
					_this.drawClefWidget();		

					if (_this.options.tutorialStep >= 0) {
						_this.startTutorial();
						_this.router.trigger('tutorial');
					} else {
	                    if (_this.options.inTransition) {
	                        _this.checkAuthentication(function() {
	                            var errorMessage = "Invalid username and password.";
	                            _this.requestCredentials(errorMessage); 
	                        });
	                    }
	                    _this.acknowledgeLogin();
					}
				}

				window.addEventListener('message', _this.closeIFrame.bind(_this));
			});
        }
	}

	Waltz.prototype.router = $({});

	Waltz.prototype.MAIN_BUTTON_ID = 'clef-waltz-login-wrapper';

	Waltz.prototype.CREDENTIAL_OVERLAY_ID = "waltz-credential-overlay",
	Waltz.prototype.CREDENTIAL_USERNAME_ID = "waltz-credential-username",
	Waltz.prototype.CREDENTIAL_PASSWORD_ID = "waltz-credential-password",
	Waltz.prototype.CREDENTIAL_SUBMIT_ID = "waltz-credential-submit",
	Waltz.prototype.CREDENTIAL_FORM_ID = "waltz-credential-form",
    Waltz.prototype.CREDENTIAL_ALERT_ID = "waltz-credential-alert",
	Waltz.prototype.CREDENTIAL_SLIDE_IN_CLASS = "slide-in";
	Waltz.prototype.CREDENTIAL_LOGOS_ID = "waltz-credential-logos";

	Waltz.prototype.TUTORIAL_OVERLAY_ID = 'waltz-tutorial-overlay';
	Waltz.prototype.TUTORIAL_MESSAGE_ID = 'waltz-tutorial-message';
	Waltz.prototype.TUTORIAL_CLOSE_ID = 'waltz-tutorial-close';

	Waltz.prototype.startTutorial = function() {
		var _this = this;
		this.activeTutorial = true;

		var $overlay = $("<div id='" + this.TUTORIAL_OVERLAY_ID + "'></div>");
		$overlay.click(function() {
			if(confirm("Are you sure you want to close the tutorial?")) {
				_this.completeTutorial();
			}
		})

		$('body').append($overlay);

		this.router.on('tutorial', this.tutorialStep.bind(this));
	}

	Waltz.prototype.tutorialStep = function(e) {
		var _this = this,
			$message = $('#' + this.TUTORIAL_MESSAGE_ID),
			$overlay = $('#' + this.TUTORIAL_OVERLAY_ID),
			OFFSET = 40;

		if ($message.length == 0) {
			$message = $("<div id='" + this.TUTORIAL_MESSAGE_ID + "'></div>");
			$('body').append($message);
		}

		if (this.options.tutorialStep === 0) {
			var $message = $message.text("Click this to set up Waltz for " + this.options.site.config.name),
				$mainButton = $('#' + this.MAIN_BUTTON_ID);

			$message.attr('class', '');
			$message.addClass('right-arrow');

			$overlay.append($message);
			$message.css({
				left: $mainButton.offset().left - ($message.width() + OFFSET),
				top: $mainButton.offset().top + $message.height() / 2
			});

		} else if (this.options.tutorialStep === 1) {
			var $credentialForm = $('#' + this.CREDENTIAL_FORM_ID);

			$message.text("Type your username and password to securely store them with Waltz.");
			$message.css({
				left: $credentialForm.offset().left,
				top: $credentialForm.offset().top + $credentialForm.height() + OFFSET
			});

			$message.attr('class', '');
			$message.addClass('top-arrow');
		}

		this.options.tutorialStep++;
	}

	Waltz.prototype.completeTutorial = function() {
		$('#'+this.TUTORIAL_OVERLAY_ID).remove();
		chrome.runtime.sendMessage({ 
    		method: "completeTutorial"
    	});
	}

	Waltz.prototype.acknowledgeLogin = function() {
		if (this.options.currentLogin) {
        	chrome.runtime.sendMessage({ method: "acknowledgeLogin", domain: this.options.site.domain });
		}
	}

	Waltz.prototype.decryptCredentials = function(cb) {
		var self = this;
		if(self.loginCredentials && typeof(self.loginCredentials.password === "string")) {
			chrome.runtime.sendMessage({
				method: "decrypt",
				key: self.options.site.config.key,
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

	Waltz.prototype.encryptCredentials = function(credentials, cb) {
		chrome.runtime.sendMessage({
			method: "saveCredentials",
			key: this.options.site.config.key,
			username: credentials.username,
			password: credentials.password
		}, function(response) {
			if(typeof(cb) === "function") {
				cb();
			}

		});
	}

	Waltz.prototype.loadIFrame = function() {
		if (this.iframe) return;

		var self = this;

		var $iframe = this.iframe = $("<iframe id='clef_iframe'>");

		$iframe.attr('src', self.options.cyHost+'/login');

		$("body").append($iframe);

		$iframe.css({
			position: 'fixed',
			height: '100%',
			width: '100%',
			top: 0,
			left: 0,
			border: 'none',
			display: 'none',
			"z-index": 9999
		});

		$iframe.on('load', function() {
			$iframe[0].contentWindow.postMessage(null, self.options.cyHost);
		});
	}

	Waltz.prototype.logIn = function(cb) {
		var self = this;


		if (!this.iframe) {
			this.loadIFrame();
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

	Waltz.prototype.closeIFrame = function(e) {
		if (e.origin == this.options.cyHost) {
			if (e.data && e.data.method == "closeIFrame" && this.iframe) {
				this.iframe.remove();
				this.iframe = false;
				this.loadIFrame();
			}
		}
	}


	Waltz.prototype.decryptAndLogIn = function() {
		var self = this;

		self.decryptCredentials(function(response) {
			if(response.error) {
				if(response.error === "authentication") {
					self.login(this);
				} else {
					console.log(response);
				}
			} else {
				self.submitLoginForm(response);
			}
		});
	}

	//Fills the login form and submits it
	Waltz.prototype.submitLoginForm = function(data) {

		var siteConfig = this.options.site.config,
			_this = this;

		function findInput(name) {
			return $('input[name="' + name + '"]');
		}

		if (findInput(siteConfig.login.passwordField).length > 0 && findInput(siteConfig.login.usernameField).length > 0) {
			// we are on the login page!

			var $login = findInput(siteConfig.login.usernameField),
				$password = findInput(siteConfig.login.passwordField),
				$form = $login.parent('form'),
				$newLogin = $login.clone(),
				$newPassword = $password.clone();

			$newLogin.attr('type', 'hidden');
			$newPassword.attr('type', 'hidden');
			$newLogin.attr('id', '');
			$newPassword.attr('id', '');
			$newLogin.val(data.username);
			$newPassword.val(data.password);

			$password.attr('name', '');
			$login.attr('name', '');

			$form.append($newLogin);
			$form.append($newPassword);

			submitForm($form);
		} else {
			var form = $('<form />')
				.hide()
				.attr({ method : siteConfig.login.method })
				.attr({ action : siteConfig.login.formURL });


		    form.append(
		     	$('<input />')
			        .attr( "type","hidden" )
			        .attr({ "name" : siteConfig.login.passwordField })
			        .val( data.password )
		    );

		    form.append(
		    	$('<input />')
			        .attr( "type","hidden" )
			        .attr({ "name" : siteConfig.login.usernameField })
			        .val( data.username )
			)

			if (siteConfig.login.redirectField) {
				form.append(
			    	$('<input />')
				        .attr( "type", "hidden" )
				        .attr({ "name" : siteConfig.login.redirectField })
				        .val( window.location.href )
				)
			}

			if (siteConfig.login.other) {
				var appendInputs = function(data) {
					var $data = $(data),
						inputs = $data.find('input');

					inputs = inputs.filter(function(input) { 
						return $(this).attr('name') != siteConfig.login.passwordField &&
							$(this).attr('name') != siteConfig.login.usernameField;
					});

					form.append(inputs);
					
					submitForm();
				}

				if (window.location.href.match(siteConfig.login.other.url)) {
					appendInputs(document);
				} else {
					chrome.runtime.sendMessage({
						method: "proxyRequest",
						url: siteConfig.login.other.url
					}, appendInputs);
				}
			} else {
				submitForm();
			}
		}	

		function submitForm($form) {
			chrome.runtime.sendMessage({
	            method: "login",
	            domain: _this.options.site.domain,
	            location: window.location.href
	        }, function() {});

			if (!$form) {
            	form.append('<input type="submit" />').appendTo($("body")).submit();
			} else {
				$form.submit();
			}
		}	
	}

	Waltz.prototype.checkAuthentication = function(cb) {
		var self = this;

		chrome.runtime.sendMessage({
			method: "checkAuthentication"
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

	Waltz.prototype.requestCredentials = function(errorMessage) {
		var _this = this;

		// set up templates for tutorial
		var $overlay = $("<div id='" + this.CREDENTIAL_OVERLAY_ID + "'></div>")
			$form = $("<div id='"+ this.CREDENTIAL_FORM_ID + "'></div>");
			$usernameField = $("<input type='text' placeholder='type your username' id='" + this.CREDENTIAL_USERNAME_ID + "' />");
			$passwordField = $("<input type='password' placeholder='type your password' id='" + this.CREDENTIAL_PASSWORD_ID + "' />");
			$submitButton = $("<input type='submit' value=' ' id='" + this.CREDENTIAL_SUBMIT_ID + "' style='background-image: url(" + chrome.extension.getURL("/img/next.png") + ")'/>");
			$body = $('body');

		var logos = ["<div id='" + this.CREDENTIAL_LOGOS_ID + "'>",
			"<div id='waltz-credential-site-logo' style='background-image: url(" + chrome.extension.getURL("/img/site_images/" + this.options.site.config.key + ".png" ) + ");'></div>",
			"<img id='waltz-credential-arrow' src='" + chrome.extension.getURL("/img/arrow.png") + "'/>",
			"<img src='" + chrome.extension.getURL("/img/waltz-transparent-128.png") + "'/>",
		"</div>"].join("");

		$form.append(logos);
		$form.append("<p id='waltz-credential-message'>Securely encrypt your " + this.options.site.config.name + " password.</p>");
		// add tutorial templates
		$form.append($usernameField).append($passwordField);
        if (errorMessage) {
            $form.prepend($("<p id='" + this.CREDENTIAL_ALERT_ID + "'>" + errorMessage + "</p>"));
        }		

        $form.append($submitButton);
		$overlay.append($form);
        $body.append($overlay);

				
		if (_this.activeTutorial) {
			$overlay.addClass('tutorial');
		}


		//Put this on a timeout, because we need the class to be added after the initial draw
		setTimeout(function() {
			$.merge($overlay, $form).addClass(_this.CREDENTIAL_SLIDE_IN_CLASS);
			setTimeout(function() {
				_this.router.trigger('tutorial');
			}, 200)
		}, 0);

		$usernameField.focus();

		$.merge($usernameField, $passwordField).keyup(function(e) {
			if(e.which === 13) {
				submitForm(e);
			}
		});

		$submitButton.click(submitForm);

		$overlay.click(function(e) {
			if ($(e.target).attr('id') === $overlay.attr('id')) {
				$('#clef-waltz-login-wrapper').removeClass('waltz-remove');
				$.merge($overlay, $form).removeClass(_this.CREDENTIAL_SLIDE_IN_CLASS);
				if (_this.activeTutorial) {
					_this.completeTutorial();
				}
				setTimeout(function() {
					$.merge($overlay, $form).remove();
				}, 500);
			}
		});



		// capture the form submit, save our credentials, and then continue
		// the submit
		function submitForm(e) {
			e.preventDefault();

			// remove handlers that bind this event, so we don't go
			// into an infinite loop
			$submitButton.off('click');
			$.merge($usernameField, $passwordField).off("keyup");

			// get those credentials
			var credentials = {
				password: $passwordField.val(),
				username: $usernameField.val()
			}

			// store the credentials in the DB
			_this.encryptCredentials(credentials, function() {
				// BOOM!
				_this.submitLoginForm(credentials);
			});
		}

	}

	//Draws the clef widget and binds the interactions
	Waltz.prototype.drawClefWidget = function(form) {
		var self = this;

		//Grab image resource URLs from extensions API
		var wSource = chrome.extension.getURL("/img/waltz-128.png");
		var fSource = chrome.extension.getURL("/img/waltz-full.png");
		var pSource = chrome.extension.getURL("/img/pencil.png");
		var xSource = chrome.extension.getURL("/img/x.png");


		//Build HTML for clef widget
		var clefCircle = $("<div id='" + this.MAIN_BUTTON_ID + "' class='spinning'></div>");
		var waltzActions = $(
			"<button style='background-image:url("+xSource+");' class='waltz-button waltz-dismiss'></button>"
			+"<button style='background-image:url("+pSource+");' class='waltz-button waltz-edit'></button>"
			);

		//Style the widget with the correct image resource
		$(clefCircle).css({
			"background-image": "url("+wSource+")"
		}).append(waltzActions);

		$(document).ready(this.loadIFrame.bind(this));

		$(clefCircle).click(function() {
			$(this).addClass("waltz-loading");

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

		$(clefCircle).find(".waltz-dismiss").click(function(e) {
			e.stopPropagation();

			$(this).parent().addClass("waltz-remove");

			setTimeout(function() {
				$(self).remove();
			});
		});

		$(clefCircle).find(".waltz-edit").click(function(e) {
			e.stopPropagation();

			$(this).parent().addClass("waltz-remove");
			self.checkAuthentication(function() {
				self.requestCredentials();
			});
		});

		$("body").append(clefCircle);

	}

	Waltz.prototype.checkPage = function() {
		if ($(this.options.site.config.login.check).length != 0) {
			return "logged_in";
		}

		if ($("input[name='" + this.options.site.config.login.passwordField + "']").length > 0) {
			return "login";
		}

		return "unknown";
	}

	chrome.runtime.sendMessage({
		method: "initialize",
		location: document.location
	}, function(options) {
		$(document).ready(function() {
			var waltz = new Waltz(options);
		});
	});

}).call(this, jQuery);
