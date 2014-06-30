(function($) {
    Waltz.prototype.router = $({});

    Waltz.prototype.MAIN_BUTTON_CONTAINER_ID = 'waltz-login-wrapper';
    Waltz.prototype.MAIN_BUTTON_ID = 'waltz-login-button';

    Waltz.prototype.CLONED_USERNAME_ID = "waltz-cloned-username";
    Waltz.prototype.CLONED_PASSWORD_ID = "waltz-cloned-password";
    Waltz.prototype.CREDENTIAL_OVERLAY_ID = "waltz-credential-overlay";
    Waltz.prototype.CREDENTIAL_USERNAME_ID = "waltz-credential-username";
    Waltz.prototype.CREDENTIAL_PASSWORD_ID = "waltz-credential-password";
    Waltz.prototype.CREDENTIAL_SUBMIT_ID = "waltz-credential-submit";
    Waltz.prototype.CREDENTIAL_FORM_ID = "waltz-credential-form";
    Waltz.prototype.CREDENTIAL_ALERT_ID = "waltz-credential-alert";
    Waltz.prototype.CREDENTIAL_SLIDE_IN_CLASS = "slide-in";
    Waltz.prototype.CREDENTIAL_LOGOS_ID = "waltz-credential-logos";

    Waltz.prototype.DISMISSAL_THRESHOLD = 1;


    function Waltz(opts) {
        // If there are no opts, Waltz is not supported on this site
        if (!opts) return;

        this.kickedOff = false;
        this.storage = new Storage();
        this.analytics = new Analytics({
            captureURLData: true,
            properties: { site: opts.site.config.key }
        });

        this.options = opts;
        this.onboarder = new Onboarder(this);
        this.sharer = new Sharer(this);
        this.thirdPartyCookiesChecked = $.Deferred();

        this.addDOMObservers();

        var page = this.checkPage();
        this.handlePage(page);
        this.on('widget.dismissed', this.widgetDismissed.bind(this));
    }

    Waltz.prototype.addDOMObservers = function() {
        var loginCheck = "input[type='password']";
        if (this.options.site.config.login.passwordField) {
            loginCheck = "input[name='" + this.options.site.config.login.passwordField + "']";
        }

        // Notifies us when the login selector is added to the page.
        var loginFieldObserver = new MutationSummary({
            callback: this.handleDOMChanges.bind(this),
            queries: [{ element: loginCheck }]
        });

        var _this = this;
        $(document).ready(function() {
            // Disconnect the loginFieldObserver. We do this b/c we add another
            // observer for any DOM change.
            loginFieldObserver.disconnect();

            // Though not ideal, this observer observes the whole DOM, since
            // filtering by the full-CSS login check selector isn't always supported.
            _this.DOMObserver = new MutationSummary({
                callback: _this.handleDOMChanges.bind(_this),
                queries: [{ all: true }]
            });

            // Check page type on document load
            var page = _this.checkPage();
            _this.handlePage(page);
        });
    }

    Waltz.prototype.handlePage = function(page) {
        // First, we need to figure out if the Waltz icon should be displayed.
        var shouldKickOff = (page == "login" || 
                (page == "unknown" && 
                 !this.options.site.config.login.formOnly &&
                 !this.options.site.config.isAnonymous));
        if (shouldKickOff && !this.kickedOff) {
            this.kickOff();
        } else if (page == "logged_in" && this.options.currentLogin) {
            this.trigger('loggedIn');
            this.acknowledgeLoginAttempt({ success: true });
        } 
    }

    Waltz.prototype.kickOff = function() {
        var _this = this;
        _this.kickedOff = true;
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
    };

    Waltz.prototype.handleDOMChanges = function(summary) {
        var _this = this;
        var page = _this.checkPage();
        this.handlePage(page);
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
                _this.analytics.trackEvent("Dismiss widget", {duration: "forever"});
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
                _this.analytics.trackEvent("Dismiss widget", {duration: "page"});
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
            });

            $message.attr('class', 'floating fixed');
            $message.attr('style', '');

            $message.css({
                right: this.onboarder.MESSAGE_OFFSET,
                top: parseInt($widget.css('top')) + $widget.height() / 2 - 40
            });

            $message.fadeIn();
        }
    };

    Waltz.prototype.acknowledgeLoginAttempt = function(opts) {
        if (this.options.currentLogin) {
            if (opts.success) {
                this.trigger('login.success');
                if (this.$widget) this.hideWidget();
            } else {
                this.trigger('login.failure');
            }
            chrome.runtime.sendMessage({
                method: "acknowledgeLoginAttempt",
                domain: this.options.site.domain,
                key: this.options.site.config.key,
                successful: opts.success
            });
            this.options.currentLogin = null;
        }
    };

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
    };

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
    };

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

    };

    Waltz.prototype.logInToClef = function(cb) {
        var _this = this;

        this.iframe.ready(function() {
            _this.iframe[0].contentWindow.postMessage({ method: "loadClef"}, _this.options.cyHost);

            _this.iframe.fadeIn();

            window.addEventListener("message", listener);

            function listener(e) {
                if(e.data.auth) {
                    _this.analytics.trackEvent('Sync');
                    _this.iframe.remove();
                    if (typeof cb == "function") {
                        cb();
                    }
                }
            }

            _this.authListener = listener;
        });
    };

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
    };

    Waltz.prototype.thirdPartyCookiesCheck = function(e) {
        if (e.origin == this.options.cyHost) {
            if (e.data && e.data.method == "thirdPartyCookies" && this.iframe) {
               this.thirdPartyCookiesChecked.resolve(e.data.enabled);
            }
        }
    };

    Waltz.prototype.decryptAndLogIn = function() {
        var _this = this;

        this.decryptCredentials(function(response) {
            if (response.error) {
                if(response.error === "authentication") {
                    _this.logInToClef(_this.decryptAndLogIn.bind(this));
                } else {
                    console.log(response);
                }
            } else {
                _this.submitLoginForm(response);
            }
        });
    };

    // Fills the login form and submits it
    Waltz.prototype.submitLoginForm = function(data) {

        var siteConfig = this.options.site.config,
            _this = this;

        function findInput(name) {
            return $('input[name="' + name + '"]');
        }

        var $login;
        var $password;
        var $form;
        var $submitButton;
        if (siteConfig.login.loginForm) {
            $form = siteConfig.login.loginForm.container;
            $login = siteConfig.login.loginForm.usernameField;
            $password = siteConfig.login.loginForm.passwordField;
            $submitButton = siteConfig.login.loginForm.submitButton;
        } else {
            $login = findInput(siteConfig.login.usernameField);
            $password = findInput(siteConfig.login.passwordField);
            $form = $login.parents('form');
        }

        if (siteConfig.login.submitButton) {
            $form = $form.filter(':has(' + siteConfig.login.submitButton + ')');
            // Re-select the login and password fields in case we're on
            // a different form.
            $login = $form.find('input[name="'+siteConfig.login.usernameField+'"]');
            $password = $form.find('input[name="'+siteConfig.login.passwordField+'"]');
        }

        // We are on the login page!
        if (($login.length > 0 &&
            $password.length > 0 &&
            _.some($password, function(v) { return $(v).is(':visible'); })
            ) || siteConfig.login.loginForm) {
            // We clone the login fields so it doesn't look like the username
            // and passwords are filled in. We want it to be magic!
            var $newLogin = $('#' + _this.CLONED_USERNAME_ID);
            var $newPassword = $('#' + _this.CLONED_PASSWORD_ID);
            var existing = $newLogin.length && $newPassword.length;
            if (!existing) {
                $newLogin = $login.clone();
                $newPassword = $password.clone();

                // Position the cloned login fields precisely over the actual ones
                var loginPosition = $login.position();
                $newLogin.css({
                    position: 'absolute',
                    top: loginPosition.top,
                    left: loginPosition.left,
                    width: $login.css('width'),
                    height: $login.css('height'),
                    'margin-left': $login.css('margin-left'),
                    'margin-top': $login.css('margin-top')
                });
                var passwordPosition = $password.position();
                $newPassword.css({
                    position: 'absolute',
                    top: passwordPosition.top,
                    left: passwordPosition.left,
                    width: $password.css('width'),
                    height: $password.css('height'),
                    'margin-left': $password.css('margin-left'),
                    'margin-top': $password.css('margin-top')
                });

                $newLogin.insertAfter($login);
                $newPassword.insertAfter($password);

                $newLogin.attr('id', _this.CLONED_USERNAME_ID);
                $newPassword.attr('id', _this.CLONED_PASSWORD_ID);

                $newPassword.attr('name', '');
                $newLogin.attr('name', '');

                if (!$form.attr('action')) {
                    $form.attr('action', siteConfig.login.formURL);
                }
            }

            // Trigger any event handlers (like validation)
            $login.focus().val(data.username).keydown().keypress().keyup().change().blur();
            $password.focus().val(data.password).keydown().keypress().keyup().change().blur();
            // Force the submitButton to be enabled
            if ($submitButton) {
                $submitButton.prop('disabled', false);
            }

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
            );

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
                };

                chrome.runtime.sendMessage({
                    method: "proxyRequest",
                    url: siteConfig.login.urls[0]
                }, appendInputs);
            } else {
                submitForm();
            }
        }

        function submitForm($form) {
            var formSubmitted = !!$form;
            $form = $form || $(form);

            chrome.runtime.sendMessage({
                method: "login",
                domain: _this.options.site.domain,
                key: _this.options.site.config.key,
                location: window.location.href
            }, function(currentLogin) {
                _this.options.currentLogin = currentLogin;

                var $overlay = $('#' + _this.CREDENTIAL_OVERLAY_ID);
                if (!$overlay.is(':hidden')) {
                    // We disconnect the DOMObserver, since we don't want the 
                    // overlay hiding to trigger the callback (and thus giving
                    // a false-positive error dialog for ajax logins)
                    if (_this.DOMObserver) _this.DOMObserver.disconnect();
                    $overlay.click();
                    if (_this.DOMObserver) _this.DOMObserver.reconnect();
                } 

                // hack to fix issues where submit button
                // has name="submit" -- WAY TOO HARD
                if (typeof($form[0].submit) !== "function") {
                    $form = $form.clone();
                    $form.find('input[name="submit"], #submit').remove();
                    $form.css('display', 'none');
                    formSubmitted = false;
                }

                if (siteConfig.login.loginForm && 
                    siteConfig.login.loginForm.submitButton.length) {
                    siteConfig.login.loginForm.submitButton.click();
                } else {
                    $form.submit();
                }

                setTimeout(_this.showLoginError.bind(_this), 2000);
            });
        }
    };

    Waltz.prototype.showLoginError = function() {
        var _this = this;
        chrome.runtime.sendMessage({
            method: "hasOngoingAJAXRequest"
        }, function(hasOngoingRequest) {
            if (!hasOngoingRequest) {
                _this.options.site.config.login.loginForm.container.find('input').val('');
                var $clonedFields = $('#' + _this.CLONED_USERNAME_ID)
                    .add($('#' + _this.CLONED_PASSWORD_ID));
                $clonedFields.remove();
                var page = _this.checkPage();
                if (page == "login") {
                    var errorMessage = "Invalid username and password.";
                    _this.acknowledgeLoginAttempt({ success: false });
                    _this.requestCredentials(errorMessage);
                }
            }
        });

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
                    _this.analytics.trackEvent("Show Clef overlay");
                }
            } else {
                if (typeof(continueCallback) == "function") {
                    continueCallback();
                }
            }
        });
    };

    Waltz.prototype.requestCredentials = function(errorMessage) {
        var _this = this,
            templater = this.getTemplater(),
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
        });

        $.when(templated)
        .done(function(html) {
            var $overlay = $(html),
                $form = $overlay.find('#' + _this.CREDENTIAL_FORM_ID),
                $usernameField = $overlay.find('#' + _this.CREDENTIAL_USERNAME_ID),
                $passwordField = $overlay.find('#' + _this.CREDENTIAL_PASSWORD_ID),
                $body = $('body');

            var $existingOverlay = $body.find('#' + _this.CREDENTIAL_OVERLAY_ID);
            if ($existingOverlay.length) {
                $existingOverlay.html(html);
                $overlay = $existingOverlay;
            } else {
                $body.append($overlay);
            }

            var formShownTime = Date.now();

            //Put this on a timeout, because we need the class to be added after the initial draw
            setTimeout(function() {
                $.merge($overlay, $form).addClass(_this.CREDENTIAL_SLIDE_IN_CLASS);
                _this.trigger('show.credentialOverlay');
                _this.analytics.trackEvent('Show credential overlay');
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

                    _this.analytics.trackEvent("Dismiss credentials form", {
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
                };

                // store the credentials in the DB
                _this.encryptCredentials(credentials, function() {
                    // BOOM!
                    _this.analytics.trackEvent('Save credentials');
                    _this.submitLoginForm(credentials);
                });
            }
        });
    };

    //Draws the waltz widget and binds the interactions
    Waltz.prototype.showWidget = function(form) {
        var _this = this,
            $waltzCircle;

        var attemptLogin = function() {

            _this.analytics.trackEvent("Click widget");

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
        };

        if (this.$widget) {
            if (this.$widget.hasClass('waltz-remove')) {
                this.$widget.removeClass('waltz-remove');
                $waltzCircle = $('#'+this.MAIN_BUTTON_ID);
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
        var $waltzActions = $(
            "<button style='background-image:url("+xSource+");' class='waltz-button waltz-dismiss'></button>"
            );

        $waltzCircle = $("<div id='" + this.MAIN_BUTTON_ID + "'></div>");

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

                _this.trigger('widget.dismissed', { dismissals: dismissals.count });

            });

            _this.hideWidget({ remove: true });
        });

        $("body").append($widget);
        this.$widget = $widget;
        this.trigger('show.widget');

        _this.analytics.trackEvent("Show widget");
    };

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
    };

    Waltz.prototype.checkPage = function() {
        var siteConfig = this.options.site.config;
        if (siteConfig.isAnonymous) {
            var loginForm = this.findLoginForm();
            if (loginForm) {
                siteConfig.login.loginForm = loginForm;
                return "login";
            } else {
                return "logged_in";
            }
        }

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

        if ($(this.options.site.config.login.check).length !== 0) {
            return "logged_in";
        }

        var isLoginPage = ($("input[name='" + this.options.site.config.login.passwordField + "']").length > 0);

        if (isLoginPage) {
            return "login";
        }

        return "unknown";
    };

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
    };

    Waltz.prototype.getTemplater = function() {
        if (!this.templater) this.templater = new Templater();
        return this.templater;
    };

    Waltz.prototype.trigger = function(eventName, data) {
        this.router.trigger(eventName, data);
    };

    Waltz.prototype.on = function(eventName, cb) {
        this.router.on(eventName, cb);
    };

    Waltz.prototype.findLoginForm = function() {
        var passwordInputs = $("input[type='password']:visible").filter(function() {
            return $(this).parents('#waltz-credential-form').length < 1;
        });
        var $loginForm;
        var maxScore = -Infinity;

        passwordInputs.each(function() {
            var $form = $(this).parents('form:visible');
            if ($form.length) {
                if ($form.find("input[type='password']").filter(":not(#waltz-cloned-password)").length > 1) {
                    return;
                }
                if ($form.find("input[type='email']").filter(":not(#waltz-cloned-username)").length > 1) {
                    return;
                }
                if (!$form.find("input[type='email'], input[type='text']").length) {
                    return;
                }

                var submitButtons = $form
                    .find("input[type='submit'], button");
                // Super specific work-around for forms which have a 'Change
                // email' button (but which are not login forms), i.e. Mixpanel
                if (submitButtons.text().match(/change email/i)) return;

                var hasButtons = submitButtons.length > 0;
                var hasRememberMe = $form
                    .find("input[type='checkbox']")
                    .length == 1;
                var otherInputsScore = $form
                    .find('input')
                    .not("[type='checkbox'] [type='text'], [type='email'], [type='password'], [type='submit'], [type='hidden']")
                    .length * 2;
                otherInputsScore += $form
                    .find('input')
                    .filter(':not(#waltz-cloned-username), :not(#waltz-cloned-password)')
                    .filter("[type='checkbox'], [type='text'], [type='email'], [type='password'], [type='submit']")
                    .length - hasRememberMe - hasButtons - 2;

                var score = 0;
                score += hasButtons + hasRememberMe - otherInputsScore;
                if (score > maxScore) {
                    maxScore = score;
                    $loginForm = $form;
                }
            }
        });

        if (!$loginForm) return null;
        var $usernameField = $loginForm.find("input[type='text']").first();
        var $passwordField = $loginForm.find("input[type='password']").first();
        var $submitButton = $loginForm.find("input[type='submit'], button").first();

        var $emailField = $loginForm.find("input[type='email']");
        if ($emailField.length) $usernameField = $emailField.first();

        var commonUsernameClasses = ['login', 'uid', 'email', 'user', 'username'];
        $.each(commonUsernameClasses, function(i, usernameClass) {
            var matches = $loginForm
                .find('input.' + usernameClass + ', input#' + usernameClass);
            if (matches.length) $usernameField = $(matches).first();
        });

        return {
            container: $loginForm,
            usernameField: $usernameField,
            passwordField: $passwordField,
            submitButton: $submitButton
        };
    }

    chrome.runtime.sendMessage({
        method: "initialize",
        location: document.location
    }, function(options) {
        new Storage().getDismissalsForSite(options.site.config.key, function(dismissals) {
            var pageSettings = dismissals.pages || {};
            var pathSettings = pageSettings[window.location.pathname];
            if (!dismissals.dismissedForever && 
                !(pathSettings && pathSettings.dismissed)) {
                var waltz = new Waltz(options);
            }
        });
    });

    var isInstalledNode = document.createElement('div');
    isInstalledNode.id = 'waltzIsInstalled';
    document.body.appendChild(isInstalledNode);

}).call(this, jQuery);
