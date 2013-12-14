Waiter.prototype.emailContainerSelector = ".email-container";
Waiter.prototype.emailSuccessContainerSelector = ".email-success-container";
Waiter.prototype.emailFormSelector = "form";
Waiter.prototype.rankSelector = ".rank";

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
    })
}


var waiter = new Waiter();
