(function($) {
	Waltz.prototype.router = $({});

	Waltz.prototype.MAIN_BUTTON_CONTAINER_ID = 'waltz-login-wrapper';
	Waltz.prototype.MAIN_BUTTON_ID = 'waltz-login-button';

	Waltz.prototype.CREDENTIAL_OVERLAY_ID = "waltz-credential-overlay",
	Waltz.prototype.CREDENTIAL_USERNAME_ID = "waltz-credential-username",
	Waltz.prototype.CREDENTIAL_PASSWORD_ID = "waltz-credential-password",
	Waltz.prototype.CREDENTIAL_SUBMIT_ID = "waltz-credential-submit",
	Waltz.prototype.CREDENTIAL_FORM_ID = "waltz-credential-form",
    Waltz.prototype.CREDENTIAL_ALERT_ID = "waltz-credential-alert",
	Waltz.prototype.CREDENTIAL_SLIDE_IN_CLASS = "slide-in";
	Waltz.prototype.CREDENTIAL_LOGOS_ID = "waltz-credential-logos";

	Waltz.prototype.DISMISSAL_THRESHOLD = 1;


	function Waltz(opts) {
        // If there are no opts, Waltz is not supported on this site
		if (!opts) return;

		this.storage = new Storage();
		this.analytics = new Analytics({ captureURLData: true });

		this.options = opts;
		this.onboarder = new Onboarder(this);
        this.sharer = new Sharer(this);
        this.thirdPartyCookiesChecked = $.Deferred();

		var _this = this,
			page = this.checkPage();
        // First, we need to figure out if the Waltz icon should be displayed.
		if (page == "logged_in") {
			// If the 'check' selector exists, then we're logged in, 
        	// so don't show Waltz
        	this.trigger('loggedIn');
    		this.acknowledgeLoginAttempt({ success: true });
            return;
        } else if (page == "unknown" && this.options.site.config.login.formOnly) {
            return;
        } else if (page == "two_factor") {
            return; 
        } else {
        	// the 'check' selector doesn't exist yet, but it may be loaded 
            // dynamically by the page.
        	var checks = 0,
        		MAX_CHECKS = 20,
        		CHECK_INTERVAL = 300,
        		loginCheckInterval;

        	if (!this.options.currentLogin) {
        		// If we're not inTransition, let's assume that we need to log
        		// in. So, kickOff then check to see if we need to hide.
        		kickOff();

                var checkFunction = function() {
        			if (checks > MAX_CHECKS) {
	        			clearInterval(loginCheckInterval);
	        			return;
	        		}

	        		page = _this.checkPage();
	        		if (page === "logged_in") {
			        	this.trigger('loggedIn');
        				$(".waltz-dismiss").click();
	        			clearInterval(loginCheckInterval);
	        			return;
	        		} else if (page == "login") {
	        			clearInterval(loginCheckInterval);
	        		} else if (page == "unknown" && _this.options.site.config.login.formOnly) {
        				$(".waltz-dismiss").click();
	        			clearInterval(loginCheckInterval);
                        return;
                    } else {
                        checks++; 
                    }
        		};

                checkFunction();
        		loginCheckInterval = setInterval(checkFunction, CHECK_INTERVAL);

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
				        	this.trigger('loggedIn');
				        	_this.acknowledgeLoginAttempt({ success: true });
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

        	_this.storage.getCredentialsForDomain(_this.options.site.config.key, function (creds) {

        		_this.loginCredentials = creds;

        		if (_this.options.currentLogin) {
                    if (!_this.iframe) {
                        _this.loadIFrame();
                    }
                    _this.checkAuthentication(function() {
                        var errorMessage = "Invalid username and password.";
                        _this.acknowledgeLoginAttempt({ success: false });
						_this.showWidget();	
                        _this.requestCredentials(errorMessage); 
                    }, function() {
                        _this.acknowledgeLoginAttempt({ success: true });
                        _this.showWidget();
                    });
                } else {
					_this.showWidget();	
                }
	

				window.addEventListener('message', _this.closeIFrame.bind(_this));
				window.addEventListener('message', _this.thirdPartyCookiesCheck.bind(_this));
        	});
        }

        this.on('widget.dismissed', this.widgetDismissed.bind(this));
	}

    Waltz.prototype.widgetDismissed = function(e, data) {
        var _this = this;
        if (data.dismissals > this.DISMISSAL_THRESHOLD) {
            var $message = Message.getMessage();
            var text = "Would you like to hide Waltz on " + this.options.site.config.name + " forever?";
            
            var $text = $message.find('p');
            var $widget = this.$widget;
            $text.html(text);

            var $forever = $("<a id='waltz-hide-for-site' href='#'>hide forever</a>");
            var $page = $("<a id='waltz-hide-for-page' href='#'>hide for this page</a>");
            var $cancel = $("<a id='waltz-hide-cancel' href='#'>no thanks</a>");
            $text.append($forever, $page, $cancel);

            $forever.click(function(e) {
                e.stopPropagation();
                _this.storage.getDismissalsForSite(
                    _this.options.site.config.key, 
                    function(dismissals) {
                        dismissals.dismissedForever = true;
                        dismissals.count = 0;
                        _this.storage.setDismissalsForSite(
                            _this.options.site.config.key,
                            dismissals
                        );
                        $message.find('#'+Message.DISMISS_ID).click();
                    }
                );
                _this.analytics.trackEvent("dismissal_saved", {duration: "forever"});
            });

            $page.click(function(e) {
                e.stopPropagation();

                _this.storage.getDismissalsForSite(
                    _this.options.site.config.key,
                    function(dismissals) {
                        dismissals.pages = dismissals.pages || {};
                        var pathSettings = dismissals.pages[window.location.pathname] || {};
                        pathSettings.dismissed = true;
                        dismissals.count = 0;
                        dismissals.pages[window.location.pathname] = pathSettings;
                        _this.storage.setDismissalsForSite(
                            _this.options.site.config.key,
                            dismissals
                        );
                        $message.find('#'+Message.DISMISS_ID).click();
                    }
                );
                _this.analytics.trackEvent("dismissal_saved", {duration: "page"});
            });

            $cancel.click(function(e) {
                e.stopPropagation();
                _this.storage.getDismissalsForSite(
                    _this.options.site.config.key,
                    function(dismissals) {
                        // Reset dismissals to re-trigger message after
                        // DISMISSAL_THRESHOLD more tries.
                        dismissals.count = 0;
                        _this.storage.setDismissalsForSite(
                            _this.options.site.config.key,
                            dismissals
                        );
                        $message.find('#'+Message.DISMISS_ID).click();
                    }
                );
                _this.analytics.trackEvent("dismissal_saved", {duration: "cancel"});
            });

            $message.attr('class', 'floating fixed');
            $message.attr('style', '');

            $message.css({
                right: this.onboarder.MESSAGE_OFFSET,
                top: parseInt($widget.css('top')) + $widget.height() / 2 - 40
            });

            $message.fadeIn();
        }
    }

	Waltz.prototype.acknowledgeLoginAttempt = function(opts) {
		if (this.options.currentLogin) {
			if (opts.success) {
				this.trigger('login.success');
			} else {
				this.trigger('login.failure');
			}
        	chrome.runtime.sendMessage({ 
        		method: "acknowledgeLoginAttempt", 
        		domain: this.options.site.domain,
        		successful: opts.success 
        	});
		}
	}

	Waltz.prototype.decryptCredentials = function(cb) {
		var _this = this;
		if(this.loginCredentials && typeof(this.loginCredentials.password === "string")) {
			chrome.runtime.sendMessage({
				method: "decrypt",
				key: this.options.site.config.key,
			}, function(response) {
				if(typeof(cb) === "function") {
					cb({
						username: _this.loginCredentials.username,
						password: response.password,
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

		var _this = this,
			$iframe = this.iframe = $("<iframe id='clef_iframe'>");

		$iframe.attr('src', this.options.cyHost + '/v1/login');

        $iframe.css({
            position: 'fixed',
            height: '100%',
            width: '100%',
            top: 0,
            left: 0,
            border: 'none',
            display: 'none',
            "z-index": 9999990
        });

		$("body").append($iframe);

	}
    
	Waltz.prototype.logInToClef = function(cb) {
		var _this = this;

        this.iframe.ready(function() {
            _this.iframe[0].contentWindow.postMessage({ method: "loadClef"}, _this.options.cyHost);

            _this.iframe.fadeIn();

            window.addEventListener("message", listener); 

            function listener(e) {
                if(e.data.auth) {
                    _this.iframe.remove();
                    if (typeof cb == "function") {
                        cb();
                    }
                }
            }

            _this.authListener = listener;
        });
	}

	Waltz.prototype.closeIFrame = function(e) {
		if (e.origin == this.options.cyHost) {
			if (e.data && e.data.method == "closeIFrame" && this.iframe) {
                if (this.authListener) {
                    window.removeEventListener("message", this.authListener);
                    this.authListener = null;
                }
				this.iframe.remove();
				this.trigger('hide.iframe');
				this.iframe = false;
				this.showWidget();
				this.loadIFrame();
			}
		}
	}

    Waltz.prototype.thirdPartyCookiesCheck = function(e) {
        if (e.origin == this.options.cyHost) {
			if (e.data && e.data.method == "thirdPartyCookies" && this.iframe) {
               this.thirdPartyCookiesChecked.resolve(e.data.enabled);
            }
        }
    }

	Waltz.prototype.decryptAndLogIn = function() {
		var _this = this;

		this.decryptCredentials(function(response) {
			if(response.error) {
				if(response.error === "authentication") {
					_this.logInToClef(_this.decryptAndLogIn.bind(this));
				} else {
					console.log(response);
				}
			} else {
				_this.submitLoginForm(response);
			}
		});
	}

	// Fills the login form and submits it
	Waltz.prototype.submitLoginForm = function(data) {

		var siteConfig = this.options.site.config,
			_this = this;

		function findInput(name) {
			return $('input[name="' + name + '"]');
		}

        var $login = findInput(siteConfig.login.usernameField),
            $password = findInput(siteConfig.login.passwordField);
            $form = $login.parents('form');

        if (siteConfig.login.submitButton) {
            $form = $form.filter(':has(' + siteConfig.login.submitButton + ')');
            // Re-select the login and password fields in case we're on
            // a different form.
            $login = $form.find('input[name="'+siteConfig.login.usernameField+'"]');
            $password = $form.find('input[name="'+siteConfig.login.passwordField+'"]');
        }

        // We are on the login page!
        if ($login.length > 0 && 
            $password.length > 0 && 
            _.any($login, function(v) { $(v).is(':visible')}) &&
            _.any($login, function(v) { $(v).is(':visible')})
        ) {
			var $newLogin = $login.clone(),
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

			if (siteConfig.login.hasHiddenInputs) {
				var appendInputs = function(data) {
					var $data = $(data);
                    var $login = $data.find('input[name="'+siteConfig.login.usernameField+'"]');
                    var $form = $login.parents('form');
                    if (siteConfig.login.submitButton) {
                        $form = $form.filter(':has(' + siteConfig.login.submitButton + ')');
                    }
                    var $inputs = $form.find('input');

					$inputs = $inputs.filter(function(input) { 
						return $(this).attr('name') != siteConfig.login.passwordField &&
							$(this).attr('name') != siteConfig.login.usernameField;
					});

					form.append($inputs);
					
					submitForm();
				}

                var onLoginPage = _.reduce(siteConfig.login.urls, function(memo, url) {
                    return memo || window.location.href.match(url);
                }, false);

				if (onLoginPage) {
					appendInputs(document);
				} else {
					chrome.runtime.sendMessage({
						method: "proxyRequest",
						url: siteConfig.login.urls[0]
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

	Waltz.prototype.checkAuthentication = function(continueCallback, noUserCallback) {
		var _this = this;

		chrome.runtime.sendMessage({
			method: "checkAuthentication"
		}, function(response) {
			if (!response.user) {
                // normally, we'd want to show the overlay if there's no
                // user, but sometimes we want to do something else
                if (typeof(noUserCallback) === "function") {
                    noUserCallback();
                } else {
                    _this.logInToClef(continueCallback);
                    _this.analytics.trackEvent("clef_auth_shown");
                }
			} else {
				if (typeof(continueCallback) == "function") {
					continueCallback();
				}
			}
		});
	}

	Waltz.prototype.requestCredentials = function(errorMessage) {
		var _this = this,
            templater = this.getTemplater()
            usernameValue = "",
            passwordValue = "";

        // check if username and password fields exist on the page and if 
        // they do, and they have values, set the credential fields
        // to those values (purely for convenience)
        var $potentialUsernameField = $("input[name='" + this.options.site.config.login.usernameField + "']");
        if ($potentialUsernameField.length > 0) {
            usernameValue = $potentialUsernameField.val();
        }
        var $potentialPasswordField = $("input[name='" + this.options.site.config.login.passwordField + "']");
        if ($potentialPasswordField.length > 0) {
            passwordValue = $potentialPasswordField.val();
        }

        var templated = templater.template({
            named: 'registration',
            context: {
                name: this.options.site.config.name.toLowerCase(),
                waltzLogo: chrome.extension.getURL('/static/img/waltz-full.png'),
                passwordValue: passwordValue,
                usernameValue: usernameValue,
                errorMessage: errorMessage
            }
        })

        $.when(templated)
        .done(function(html) {
            var $overlay = $(html),
                $form = $overlay.find('#' + _this.CREDENTIAL_FORM_ID),
                $usernameField = $overlay.find('#' + _this.CREDENTIAL_USERNAME_ID),
                $passwordField = $overlay.find('#' + _this.CREDENTIAL_PASSWORD_ID),
                $body = $('body');


            $body.append($overlay);

            var formShownTime = Date.now();

            //Put this on a timeout, because we need the class to be added after the initial draw
            setTimeout(function() {
                $.merge($overlay, $form).addClass(_this.CREDENTIAL_SLIDE_IN_CLASS);
                _this.trigger('show.credentialOverlay');
            }, 0);

            $usernameField.focus();

            $form.find('form').submit(submitForm);

            $overlay.click(function(e) {
                if ($(e.target).attr('id') === $overlay.attr('id')) {
                    $('#clef-waltz-login-wrapper').removeClass('waltz-remove');
                    $.merge($overlay, $form).removeClass(_this.CREDENTIAL_SLIDE_IN_CLASS);
                    _this.trigger('hide.credentialOverlay');
                    _this.showWidget();

                    setTimeout(function() {
                        $.merge($overlay, $form).remove();
                        _this.trigger('remove.credentialOverlay');
                    }, 500);

                    _this.analytics.trackEvent("credentials_form_dismissed", {
                        had_entered_credentials: !($usernameField.val() === "" && $passwordField.val() === ""),
                        shown_duration: Date.now() - formShownTime
                    });
                }
            });

            // capture the form submit, save our credentials, and then continue
            // the submit
            function submitForm(e) {
                e.preventDefault();

                var pass = true;

                $usernameField.removeClass("error");
                $passwordField.removeClass("error");

                if($passwordField.val() === "" || $passwordField.val() === $passwordField.attr('placeholder')) {
                	$passwordField.addClass("error");
                	pass = false;
                }

                if($usernameField.val() === "" || $usernameField.val() === $usernameField.attr('placeholder')) {
                	$usernameField.addClass("error");
                	pass = false;
                }

                if(!pass) return false;

                // remove handlers that bind this event, so we don't go
                // into an infinite loop
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
        });
	}

	//Draws the waltz widget and binds the interactions
	Waltz.prototype.showWidget = function(form) {
		var _this = this;

        var attemptLogin = function() {

        	_this.analytics.trackEvent("widget_clicked");

            if (!_this.iframe) {
                _this.loadIFrame();
            }
            $.when(_this.thirdPartyCookiesChecked).then(function(enabled) {
                if (enabled) {
                    _this.checkAuthentication(function() {
                        if (_this.loginCredentials) {
                            _this.decryptAndLogIn();
                        } else {
                            _this.requestCredentials();
                        }
                    });
                    setTimeout(_this.hideWidget.bind(_this), 0);
                }
                else {
                    _this.showThirdPartyCookieMessage();
                    $waltzCircle.one('click', attemptLogin);
                }
            });
        }

		if (this.$widget) {
            if (this.$widget.hasClass('waltz-remove')) {
                this.$widget.removeClass('waltz-remove');
                var $waltzCircle = $('#'+this.MAIN_BUTTON_ID);
                $waltzCircle.one('click', attemptLogin);
                this.trigger('show.widget');
            }
			return;
		} 


		//Grab image resource URLs from extensions API
		var wSource = chrome.extension.getURL("/static/img/waltz-128.png");
		var pSource = chrome.extension.getURL("/static/img/pencil.png");
		var xSource = chrome.extension.getURL("/static/img/x.png");

		//Build HTML for clef widget
		var $widget = $("<div id='" + this.MAIN_BUTTON_CONTAINER_ID + "'></div>");
		var $waltzCircle = $("<div id='" + this.MAIN_BUTTON_ID + "'></div>");
		var $waltzActions = $(
			"<button style='background-image:url("+xSource+");' class='waltz-button waltz-dismiss'></button>"
			);

		$widget.append($waltzCircle, $waltzActions);
		//Style the widget with the correct image resource
		$waltzCircle.css({
			"background-image": "url("+wSource+")"
		});

		$(document).ready(this.loadIFrame.bind(this));

        $waltzCircle.one('click', attemptLogin);

		$widget.find(".waltz-dismiss").click(function(e) {
			e.stopPropagation();
            _this.storage.getDismissalsForSite(_this.options.site.config.key, function(dismissals) {
                dismissals.count = (dismissals.count || 0) + 1;
                _this.storage.setDismissalsForSite(
                    _this.options.site.config.key, 
                    dismissals
                );

                _this.analytics.trackEvent("widget_dismissed");
                _this.trigger('widget.dismissed', { dismissals: dismissals.count });

            });

			_this.hideWidget({ remove: true });
		});

		$("body").append($widget);
		this.$widget = $widget;
		this.trigger('show.widget');

		_this.analytics.trackEvent("show_widget");
	}

	Waltz.prototype.hideWidget = function(opts) {
		this.$widget.addClass("waltz-remove");
		this.trigger('hide.widget');

		if (opts && opts.remove) {
			var _this = this;
			setTimeout(function() {
				_this.$widget.remove();
				_this.$widget = false;
				_this.trigger('remove.widget');
			}, 1000);
		}
	}

	Waltz.prototype.checkPage = function() {
        var siteConfig = this.options.site.config;
        var isTwoFactor = false;
        if (siteConfig.login.twoFactor) {
            $.map(siteConfig.login.twoFactor, function(twoFactor) {
                var twoFactorUrl = Utils.url(twoFactor.url),
                    twoFactorCheck = $(twoFactor.check); 

                isTwoFactor |= 
                    (window.location.hostname === twoFactorUrl.hostname &&
                     window.location.pathname === twoFactorUrl.pathname) && twoFactorCheck.length > 0;
            });
        }
        if (isTwoFactor) {
            return "two_factor"; 
        }

		if ($(this.options.site.config.login.check).length != 0) {
			return "logged_in";
		}

        var isLoginPage = ($("input[name='" + this.options.site.config.login.passwordField + "']").length > 0);

		if (isLoginPage) {
			return "login";
		}

		return "unknown";
	}

    Waltz.prototype.showThirdPartyCookieMessage = function() {
        var _this = this;
        var $message = Message.getMessage();

        var $widget = this.$widget;
        var text = "<p>Waltz needs to set a cookie to log you in.</p><p>To enable cookies for Waltz, follow <a target='_blank' href='https://support.google.com/chrome/answer/3123708?hl=en'>these instructions</a> and add exceptions for <code>[*.]waltz.io</code> and <code>[*.]clef.io</code>.</p>";

        $message.find('p').html(text);

        $message.attr('class', 'right-arrow floating fixed');
        $message.attr('style', '');

        $message.css({
            right: parseInt($widget.css('right')) + $widget.width() + _this.onboarder.MESSAGE_OFFSET,
            top: parseInt($widget.css('top')) + $widget.height() / 2 - 20
        });

        $message.fadeIn();
    }

    Waltz.prototype.getTemplater = function() {
        if (!this.tempalter) this.templater = new Templater();
        return this.templater;
    }

	Waltz.prototype.trigger = function(eventName, data) {
		this.router.trigger(eventName, data);
	}

	Waltz.prototype.on = function(eventName, cb) {
		this.router.on(eventName, cb);
	}

	chrome.runtime.sendMessage({
		method: "initialize",
		location: document.location
	}, function(options) {
		$(document).ready(function() {
            if (!options) return;
            new Storage().getDismissalsForSite(options.site.config.key, function(dismissals) {
                var pageSettings = dismissals.pages || {};
                var pathSettings = pageSettings[window.location.pathname];
                if (!dismissals.dismissedForever && !(pathSettings && pathSettings.dismissed)) {
                    var waltz = new Waltz(options);
                }
            });
		});
	});

}).call(this, jQuery);
