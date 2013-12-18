Waiter.prototype.emailContainerSelector = ".email-container";
Waiter.prototype.emailSuccessContainerSelector = ".email-success-container";
Waiter.prototype.emailFormSelector = "form";
Waiter.prototype.rankSelector = ".rank";
Waiter.prototype.futureRankSelector = ".share-once-rank";
Waiter.prototype.referralLinkSelector =  ".referral-link";
Waiter.prototype.dataReferralLinkSelector = ".waltz-share";
Waiter.prototype.waitingContainerSelector = ".waiting-container";
Waiter.prototype.startContainerSelector = ".start-container";


function Waiter() {
    this.storage = new Storage();

    this.storage.getPrivateSettings(this.init.bind(this));
}

Waiter.prototype.init = function(opts) {
    this.settings = opts;
    this.settings.rank = this.settings.rank || 1;

    this.sharer = new Sharer();

    this.render();

    this.attachHandlers();
};

Waiter.prototype.render = function() {
    $(this.rankSelector).text(this.settings.rank).addClass('shown');
    $(this.referralLinkSelector).text(this.settings.referralLink).addClass('shown');
    $(this.dataReferralLinkSelector).attr('data-link', this.settings.referralLink);
    $(this.futureRankSelector).text(this.calculateMovement());

    if (!this.settings.hasEmail) {
        $(this.emailContainerSelector).show();
    }

    if (this.settings.activated) {
        $(this.waitingContainerSelector).hide();
        $(this.startContainerSelector).show();
    }
}

Waiter.prototype.attachHandlers = function() {
    var _this = this;

    $(this.emailFormSelector).submit(function(e) {
        e.preventDefault();

        var $form = $(e.currentTarget),
            data = $form.serializeArray(),
            finishedLoading = Utils.triggerLoading($form.find('button'), { promise: true });

        data.push({name: 'id', value: _this.settings.waitlistID});

        $.post(
            Utils.settings.waitlistHost + Utils.settings.waitlistPaths.setEmail,
            data
        ).success(function(data) {
            $(_this.emailContainerSelector).fadeOut(function() {
                $(_this.emailSuccessContainerSelector).fadeIn();
            });
            _this.storage.setPrivateSetting(
                "hasEmail",
                true,
                function() {
                    finishedLoading.resolve();
                }
            );
        }).fail(function(data) {
            var errorMessage;
            if (data.responseText) {
                errorMessage = JSON.parse(data.responseText).error;
            } else {
                errorMessage = "Something went wrong with your internet connection. Refresh and try again.";
            }
            $(_this.emailContainerSelector).find('.error').text(errorMessage).fadeIn();
            finishedLoading.resolve();
        });
    });

    chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));
}

Waiter.prototype.handleMessage = function(request, cb) {
    if (request.messageLocation === "waiting") {
        this[request.method].call(this, request, cb);
    }
}

Waiter.prototype.refresh = function(data, cb) {
    var _this = this;
    this.storage.getPrivateSettings(function(settings) {
        _this.settings = settings;
        var rank = settings.rank;
        if (rank === null) rank = 0;
        $(_this.rankSelector).text(rank);
        $(_this.futureRankSelector).text(_this.calculateMovement());

        if (!_this.settings.waiting) {
            _this.start();
        }
    });
}

Waiter.prototype.start = function() {
    var _this = this;
    $(this.waitingContainerSelector).fadeOut(function() {
        $(_this.startContainerSelector).fadeIn();
    });
}

Waiter.prototype.calculateMovement = function() {
    var rank = this.settings.rank || 1;
    var projectedSharingRank = this.settings.projectedSharingRank || 1;

    
    return rank - projectedSharingRank;
}

var waiter = new Waiter();
