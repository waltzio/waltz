function Tutorial() {

    this.start();
}

Tutorial.prototype.start = function() {
    console.log("starting tutorial");
}

var tutorial;
chrome.runtime.onInstalled.addListener(function() {
    var tutorial = new Tutorial();
});