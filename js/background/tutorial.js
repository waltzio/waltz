Tutorial.prototype.TUTORIAL_KEY = "tutorial_completed";
function Tutorial() {
    var _this = this;
    chrome.storage.local.get(this.TUTORIAL_KEY, function(opt) {
        if (!opt[_this.TUTORIAL_KEY]) {
            _this.start();

            var opt = {};
            opt[_this.TUTORIAL_KEY] = true;

            console.log(opt);
            chrome.storage.local.set(opt, function() {});
        }
    })
}

Tutorial.prototype.start = function() {
    chrome.tabs.create({
        url: chrome.extension.getURL("html/tutorial.html")
    }, function() {});
}

chrome.runtime.onInstalled.addListener(function() {
    var tutorial = new Tutorial();
});