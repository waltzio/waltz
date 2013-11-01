(function($) {

	var Waltz = this.Waltz = function(opts) {
        // If there are no opts, Waltz is not supported on this site
		if (!opts) return;
        // If the 'check' selector exists, then we're logged in, 
        // so don't show Waltz
		if ($(opts.site.config.login.check).length != 0) {
            chrome.runtime.sendMessage({ method: "acknowledgeLogin" });
            return;
        } else {
        	var checks = 0;
        	var loginCheckInterval = setInterval(function() {
        		if(checks > 20) {
        			clearInterval(loginCheckInterval);
        			return;
        		}

        		if($(opts.site.config.login.check).length != 0) {
        			chrome.runtime.sendMessage({method: "acknowledgeLogin"});
        			clearInterval(loginCheckInterval);

        			$(".waltz-dismiss").click();
        			$("#waltz-credential-overlay").click();
        		}

        		checks++;
        	}, 500);
        }

		var _this = this;

		this.options = opts;

		this.loginCredentials = false;

		chrome.runtime.sendMessage({
			method: "getCredentials",
			domain: this.options.site.domain

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

                console.log("Loaded credentials");
                chrome.runtime.sendMessage({
                    method: "checkTransition"
                }, function(inTransition) {
                    if (inTransition) {
                        _this.checkAuthentication(function() {
                            var errorMessage = "Invalid username and password. Please try entering your credentials again.";
                            _this.requestCredentials(errorMessage); 
                        });
                    }
                    chrome.runtime.sendMessage({ method: "acknowledgeLogin" });
                });
			}
		});

		window.addEventListener('message', this.closeIFrame.bind(this));
	}

	Waltz.prototype.storeLogin = function(username, password) {
		chrome.runtime.sendMessage({
			domain: this.options.site.domain,
			username: username,
			password: password
		});
	}

	Waltz.prototype.decryptCredentials = function(cb) {
		var self = this;
		if(self.loginCredentials && typeof(self.loginCredentials.password === "string")) {
			chrome.runtime.sendMessage({
				method: "decrypt",
				domain: self.options.site.domain,
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
			domain: this.options.site.domain,
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
			"z-index": 999999999
		});

		$iframe.on('load', function() {
			$iframe[0].contentWindow.postMessage(null, self.options.cyHost);
		});
	}

	Waltz.prototype.logIn = function(cb) {
		var self = this;


		if (!this.iframe) {
			this.loadIframe();
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

		var form = $('<form />')
			.hide()
			.attr({ method : siteConfig.login.method })
			.attr({ action : siteConfig.login.url });


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

			chrome.runtime.sendMessage({
				method: "proxyRequest",
				url: siteConfig.login.other.url
			}, function(data) {
				var $data = $(data);

				for (var i = 0; i < siteConfig.login.other.fields.length; i++) {
					form.append($data.find('input[name="' + siteConfig.login.other.fields[i] + '"]').clone())
				}
				
				submitForm();
			});
		} else {
			submitForm();
		}

		function submitForm() {
			chrome.runtime.sendMessage({
	            method: "login",
	            domain: _this.options.site.domain
	        }, function() {});


            form.append('<input type="submit" />').appendTo($("body")).submit();
		}
	}

	Waltz.prototype.checkAuthentication = function(cb) {
		var self = this;

		chrome.runtime.sendMessage({
			method: "checkAuthentication",
			domain: self.options.site.domain
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
		var _this = this,
			OVERLAY_ID = "waltz-credential-overlay",
			USERNAME_ID = "waltz-credential-username",
			PASSWORD_ID = "waltz-credential-password",
			SUBMIT_ID = "waltz-credential-submit",
			FORM_ID = "waltz-credential-form",
            ALERT_ID = "waltz-credential-alert",
			SLIDE_IN_CLASS = "slide-in"

		// set up templates for tutorial
		var $overlay = $("<div id='" + OVERLAY_ID + "''></div>")
			$form = $("<div id='"+ FORM_ID + "'></div>")
			$usernameField = $("<input type='text' placeholder='Username' id='" + USERNAME_ID + "' />");
			$passwordField = $("<input type='password' placeholder='Password' id='" + PASSWORD_ID + "' />");
			$submitButton = $("<input type='submit' value='Submit' id='" + SUBMIT_ID + "' />");
			$body = $('body');

		// add tutorial templates
		$body.append($overlay);
		$form.append($usernameField).append($passwordField);
        if (errorMessage) {
            $form.append($("<p id='" + ALERT_ID + "'>" + errorMessage + "</p>"));
        }		

        $form.append($submitButton);
        $body.append($form)

		//Put this on a timeout, because we need the class to be added after the initial draw
		setTimeout(function() {
			$.merge($overlay, $form).addClass(SLIDE_IN_CLASS);
		}, 0);

		$usernameField.focus();

		$.merge($usernameField, $passwordField).keyup(function(e) {
			if(e.which === 13) {
				submitForm(e);
			}
		});

		$submitButton.click(submitForm);

		$overlay.click(function() {
			$.merge($overlay, $form).removeClass(SLIDE_IN_CLASS);
			setTimeout(function() {
				$.merge($overlay, $form).remove();
			}, 500);
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
		var clefCircle = $("<div id='clef-waltz-login-wrapper' class='spinning'></div>");
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

			self.checkAuthentication(function() {
				self.requestCredentials();
			});
		});


		$("body").append(clefCircle);

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
