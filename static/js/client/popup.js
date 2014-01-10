Popup.prototype.shareContainerSelector = '.share-container';
Popup.prototype.shareMessageSelector = '.share-message';
Popup.prototype.inviteMessageSelector = '.invite-message';
Popup.prototype.inviteCountSelector = '.invite-count';

function Popup() {
    var _this = this;

    this.sharer = new Sharer();
    this.storage = new Storage();

    this.storage.getPrivateSettings(function(settings) {
        _this.settings = settings;
        _this.render();
    });

    $('a.request').click(function() {
        $('.request-container').slideDown();
    });

    chrome.browserAction.getBadgeText({}, function(details) {
        chrome.browserAction.setBadgeText({ text: "" });
    });
}

Popup.prototype.render = function() {
    var $shareContainer = $(this.shareContainerSelector),
        $sharers = $shareContainer.find(this.sharer.shareSelector);

    if (this.settings.waitingListActive && this.settings.inviteCount) {
        $(this.inviteCountSelector).text(this.settings.inviteCount);
        $(this.inviteMessageSelector).show();
        $sharers.data('share-type', 'invite');
    } else {
        $(this.shareMessageSelector).show();
        $sharers.data('share-type', 'share');
    }

    chrome.tabs.query({ active: true }, function(data) {
        var site;
        if (data && data[0].url) {
            site = Utils.url(data[0].url).hostname;
        } else {
            site = "FILL ME IN!";
        }
        $('.waltz-share').data('site', site);
    });

    $sharers
        .data('link', this.settings.inviteLink)
        .data('inviteCount', this.settings.inviteCount)
        .data('waitListLength', this.settings.waitListLength);

    $sharers.filter('.facebook').data('link', this.settings.longInviteLink);

    $('.share-link').text(this.settings.inviteLink);
};

var popup = new Popup();
