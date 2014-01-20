Popup.prototype.shareContainerSelector = '.share-container';
Popup.prototype.shareMessageSelector = '.share-message';

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

    $(this.shareMessageSelector).show();
    $sharers.data('share-type', 'share');

    chrome.tabs.query({ active: true }, function(data) {
        var site;
        if (data && data[0].url) {
            site = Utils.url(data[0].url).hostname;
        } else {
            site = "FILL ME IN!";
        }
        $('.waltz-share').data('site', site);
    });
};

var popup = new Popup();
