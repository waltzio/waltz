Onboarder.prototype.defaults = {};

Onboarder.prototype.MESSAGE_OFFSET = 15;
Onboarder.prototype.OVERLAY_ID = "waltz-onboarding-overlay";

function Onboarder(waltz) {
    this.waltz = waltz;
    this.router = this.waltz.router;
    this.options = $.extend(this.defaults, waltz.options);
    this.siteKey = this.options.site.config.key;
    this.storage = new Storage();

    this.initialized = $.Deferred();
    this.storage.getOnboardingData(this.init.bind(this));
    this.attachHandlers();
}

Onboarder.prototype.init = function(data) {
    var _this = this;

    this.data = data;
    this.siteSpecificOnboardingData = this.data[this.storage.ONBOARDING_SITES_KEY] || {};
    this.siteData = this.siteSpecificOnboardingData[this.siteKey];

    // if there's no siteData, that means we haven't 
    // had a kickoff of waltz on this site yet
    // let's initialize the data so we have it next time :)
    if (!this.siteData) {
        this.siteData = this.storage.siteOnboardingDefaults;
        this.siteData.createdAt = new Date().getTime();
        this.commitSiteData();
    }

    if (this.siteData.loginAttempts.success > 1 || this.data.dismissed) {
        this.dismissed = true;
    }

    if (this.siteData.forceTutorial) {
        this.dismissed = false;
        this.storage.setOnboardingKey("dismissed", false);
        this.forceTutorial = true;
        this.siteData = this.storage.siteOnboardingDefaults;
        this.commitSiteData();
    }

    this.initialized.resolve();
}

Onboarder.prototype.attachHandlers = function() {
    var _this = this;

    this.bind('loggedIn', this.loggedIn);
    this.bind('login.success', this.loginSuccess);
    this.bind('login.failure', this.loginFailure);
    this.bind('show.widget', this.showWidget);
    this.bind('show.credentialOverlay', this.showCredentialOverlay);
    this.bind('show.iframe', this.showIFrame);
    this.bind('hide.widget hide.credentialOverlay', this.hideToolTips);
}

Onboarder.prototype.bind = function(eventName, cb) {
    // this is a safe event attaching function that waits
    // to trigger events until the necessary data is loaded
    var _this = this;

    this.router.on(eventName, function(e) {
        $.when(_this.initialized)
         .then(function() {
            if (!_this.dismissed) {
                cb.bind(_this)(e);
            }
         });
    })
}

Onboarder.prototype.loggedIn = function() {
    if (this.forceTutorial) {
        var _this = this,
            $message = this.getMessage();

        $message.find('p').html("<b>Click me to logout and start setting up Clef!</b>");
        $message.attr('class', 'bottom click');

        $message.click(function() {
            $message.off('click');
            chrome.runtime.sendMessage({ 
                method: "logOutOfSite", 
                domain: _this.options.site.domain,
                refresh: true
            });
        })

        $message.slideDown();
    }
};

Onboarder.prototype.loginSuccess = function() {
    var promise = $.Deferred();
    this.siteData.loginAttempts.success++;
    this.commitSiteData(function () { promise.resolve(); });

    if (this.siteData.loginAttempts.success == 1 && this.totalSuccessfulLogins() < 2) {
        // case where the user is going through the tutorial for the first time
        // PRACTICE, yo!
        var $overlay = this.addOverlay();

        var $img = $("<img src='" + chrome.extension.getURL("/static/img/phone-logout.png") + "'/>");
        $img.click(function(e) {
            e.stopPropagation();
            alert("Not this phone, YOUR phone!");
        });

        $overlay.append($img);

        var $message = this.getMessage();

        $message.find('p').html("Nice job! Now <b>click the logout button on your phone</b> to log out and get some practice.");

        $message.attr('class', 'floating left-arrow');

        $message.css({
            top: parseInt($img.css('top')) + 350,
            left: parseInt($img.css('left')) + $img.width()
        })

        $message.fadeIn();
    } else {
        var _this = this;
        promise.then(function() {
            chrome.runtime.sendMessage({
                method: "openNewTab",
                url: chrome.extension.getURL("html/sites.html?success=" + _this.options.site.config.name)
            });
        });
    }

}

Onboarder.prototype.loginFailure = function() {
    this.failMode = true;
    this.siteData.loginAttempts.fail++;
    this.commitSiteData();
}

Onboarder.prototype.showWidget = function() {
    if (this.failMode) return;

    var _this = this,
        $widget = $('#' + this.waltz.MAIN_BUTTON_CONTAINER_ID),
        $message = this.getMessage(),
        text;

    if (this.forceTutorial) {
        this.addOverlay();
    }

    if (_this.siteData.loginAttempts.success === 0) {
        // first time setting up Waltz
        text = "Click this to set up Waltz for " + _this.options.site.config.name;
    } else if (_this.siteData.loginAttempts.success === 1) {
        // second time after they logged out with their phone in
        // the tutorial
        text = "Click this button to log in from now on!";
    } else {
        // every other time when they come from the tutorial
        text = "Click this button to log in!";
    }

    onFinishedTransitioning($widget, "right", function() {

        $message.find('p').text(text);

        $message.attr('class', 'right-arrow floating fixed');
        $message.attr('style', '');

        $message.css({
            right: parseInt($widget.css('right')) + $widget.width() + _this.MESSAGE_OFFSET,
            top: parseInt($widget.css('top')) + $widget.height() / 2 - 20
        });

        $message.fadeIn();
    })
}

Onboarder.prototype.showCredentialOverlay = function() {
    var _this = this,
        $credentialForm = $('#' + this.waltz.CREDENTIAL_FORM_ID),
        $message = this.getMessage(),
        text;

    if (this.failMode) {
        text = "Try again...?";
    } else {
        text = "Type your username and password to securely store them with Waltz."
    }

    onFinishedTransitioning($credentialForm, 'margin-top', function() {
        $message.find('p').text(text);

        $message.attr('class', 'top-arrow floating');
        $message.attr('style', '');

        $message.css({
            left: $credentialForm.offset().left,
            top: $credentialForm.offset().top + $credentialForm.height() + _this.MESSAGE_OFFSET
        });

        $message.fadeIn();
    });
}

Onboarder.prototype.showIFrame = function() {
    var $message = this.getMessage(),
        text;

    if (this.siteData.loginAttempts.success === 0) {
        // first time setting up Waltz
        text = "Sync with the wave to connect your Clef account!";
    } else {
        // second time after they logged out with their phone in
        // the tutorial
        text = "Just sync with the Clef wave to log in!";
    }

    $message.find('p').text(text);

    $message.attr('class', 'bottom-arrow floating');
    $message.attr('style', '');

    $message.css({
        left: $(window).width() / 2 - $message.width() / 2 - parseInt($message.css('padding-left')),
        top: '5px'
    });

    $message.fadeIn();
};

Onboarder.prototype.hideToolTips = function() {
    if (this.$message) {
        this.$message.fadeOut(100);
    }
    this.router.trigger('onboarding.hide');
};

Onboarder.prototype.dismiss = function() {
    this.router.trigger('onboarding.dismissed');
    this.storage.setOnboardingKey("dismissed", true);
    this.dismissed = true;
};

Onboarder.prototype.getMessage = function() {
    if (this.$message) return this.$message; 

    this.$message = Message.getMessage();
    this.$message.on('dismiss', this.dismiss.bind(this)); 

    return this.$message;
}

Onboarder.prototype.addOverlay = function() {
    var _this = this,
        $overlay = $('<div id="' + this.OVERLAY_ID + '"></div>');
    $('body').append($overlay);
    this.router.on('onboarding.dismissed', function() {
        $overlay.remove();
    });

    $overlay.click(function() {
        _this.hideToolTips();
        $overlay.remove();
    })

    return $overlay;
}

Onboarder.prototype.commitSiteData = function(cb) {
    this.siteData.updatedAt = new Date().getTime();
    this.storage.setOnboardingSiteData(this.siteKey, this.siteData, cb);
}

Onboarder.prototype.totalSuccessfulLogins = function() {
    var total = 0;
    for (var site in this.siteSpecificOnboardingData) {
        total += this.siteSpecificOnboardingData[site].loginAttempts.success;
    }
    return total;
}


// adds a 50 millisecond delay
function onFinishedTransitioning(el, style, cb) {
    var $el = el,
        initialValue = el.css(style);

    setTimeout(function() {
        if ($el.css(style) !== initialValue) {
            $el.on('transitionend', function() {
                $el.off('transitionend');
                cb();
            })
        } else {
            cb();
        }
    }, 50);
}
