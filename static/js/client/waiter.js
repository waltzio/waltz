Waiter.prototype.emailContainerSelector = ".email-container";
Waiter.prototype.emailSuccessContainerSelector = ".email-success-container";
Waiter.prototype.emailFormSelector = "form";
Waiter.prototype.rankSelector = ".rank";
Waiter.prototype.waitingContainerSelector = ".waiting-container";
Waiter.prototype.startContainerSelector = ".start-container";


function Waiter() {
    this.storage = new Storage();

    this.storage.getPrivateSettings(this.init.bind(this));

}

Waiter.prototype.init = function(opts) {
    var $rank = $(this.rankSelector);

    this.settings = opts;
    this.sharer = new Sharer();

    $rank.text(this.settings.rank);
    $rank.addClass('shown');

    if (!this.settings.hasEmail) {
        $(this.emailContainerSelector).show();
    }

    if (this.settings.activated) {
        $(this.waitingContainerSelector).hide();
        $(this.startContainerSelector).show();
    }

    this.attachHandlers();
};

Waiter.prototype.attachHandlers = function() {
    var _this = this;

    $(this.emailFormSelector).submit(function(e) {
        e.preventDefault();

        var $form = $(e.currentTarget),
            data = $form.serializeArray()[0],
            finishedLoading = Utils.triggerLoading($form.find('button'), { promise: true });

        data.id = _this.settings.waitlistID;

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
        }).error(function(data) {
            var errorMessage = JSON.parse(data.responseText).error;
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

        if (!_this.settings.waiting) {
            _this.start();
        }
    })
}

Waiter.prototype.start = function() {
    var _this = this;
    $(this.waitingContainerSelector).fadeOut(function() {
        $(_this.startContainerSelector).fadeIn();
    })
}

var waiter = new Waiter();
