Onboarder.prototype.defaults = {};
Onboarder.prototype.siteOnboardingObject = {
    loginAttempts: {
        success: 0,
        fail: 0
    },
    updatedAt: null,
    createdAt: null
}

Onboarder.prototype.MESSAGE_ID = 'waltz-onboarding-message';
Onboarder.prototype.MESSAGE_CONTAINER_ID = 'waltz-onboarding-message-container';
Onboarder.prototype.DISMISS_ID = 'waltz-onboarding-dismiss';
Onboarder.prototype.MESSAGE_OFFSET = 40;

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
    this.siteData = this.data[this.siteKey];

    // if there's no siteData, that means we haven't 
    // had a kickoff of waltz on this site yet
    // let's initialize the data so we have it next time :)
    if (!this.siteData) {
        this.siteData = this.data[this.siteKey] = this.siteOnboardingObject;
        this.siteData.createdAt = new Date().getTime();
        this.commitSiteData();
    }

    this.initialized.resolve();
}

Onboarder.prototype.attachHandlers = function() {
    var _this = this;

    // this is a safe event attaching function that waits
    // to trigger events until the necessary data is loaded
    this.router.sOn = function(eventName, cb) {
        _this.router.on(eventName, function(e) {
            $.when(_this.initialized)
             .then(function() {
                if (!_this.dismissed) {
                    cb.bind(_this)(e);
                }
             });
        })
    }

    this.router.sOn('login.success', this.loginSuccess);
    this.router.sOn('login.failure', this.loginFailure);
    this.router.sOn('show.widget', this.showWidget);
    this.router.sOn('show.credentialOverlay', this.showCredentialOverlay);
    this.router.sOn('remove.credentialOverlay', this.hideToolTips);
}

Onboarder.prototype.loginSuccess = function() {
    this.siteData.loginAttempts.success++;
    this.commitSiteData();

    if (this.siteData.loginAttempts.success == 1) {
        var $message = this.getMessage();
        $message.find('p').text("Nice job! Now log out and try logging in again.");
        $message.attr('class', 'bottom');

        $message.slideDown();
    }
}

Onboarder.prototype.loginFailure = function() {
    this.failMode = true;
    this.siteData.loginAttempts.fail++;
    this.commitSiteData();
}

Onboarder.prototype.showWidget = function() {
    if (this.failMode) return;

    var $widget = $('#' + this.waltz.MAIN_BUTTON_ID),
        $message = this.getMessage();

    $message.find('p').text("Click this to set up Waltz for " + this.options.site.config.name);

    $message.attr('class', 'right-arrow floating');

    $message.css({
        left: $widget.offset().left - ($message.width() + this.MESSAGE_OFFSET),
        top: $widget.offset().top + $message.height() / 2
    });

    $message.fadeIn();
}

Onboarder.prototype.showCredentialOverlay = function() {
    var $credentialForm = $('#' + this.waltz.CREDENTIAL_FORM_ID),
        $message = this.getMessage(),
        text;

    if (this.failMode) {
        text = "Try again...?";
    } else {
        text = "Type your username and password to securely store them with Waltz."
    }

    $message.find('p').text(text);

    $message.attr('class', 'top-arrow floating');

    $message.css({
        left: $credentialForm.offset().left,
        top: $credentialForm.offset().top + $credentialForm.height() + this.MESSAGE_OFFSET
    });

    $message.fadeIn();
}

Onboarder.prototype.hideToolTips = function() {
    if (this.$message) {
        this.$message.fadeOut();
    }
};

Onboarder.prototype.dismiss = function() {
    this.hideToolTips();
    this.dismissed = true;
};

Onboarder.prototype.getMessage = function() {
    if (this.$message) return this.$message; 

    var $dismisser = $("<div id='" + this.DISMISS_ID + "'>&times;</div>");

    this.$message = $("<div id='" + this.MESSAGE_ID + "'></div>");
    this.$message.append("<p></p>", $dismisser);

    $('body').append(this.$message);

    $dismisser.click(this.dismiss.bind(this));

    return this.$message;
}

Onboarder.prototype.commitSiteData = function(cb) {
    this.siteData.updatedAt = new Date().getTime();
    this.storage.setOnboardingData(this.siteKey, this.siteData, cb);
}