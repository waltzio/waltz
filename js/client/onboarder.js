
function Onboarder(waltz) {

    console.log(chrome.storage.local.get(null, function(data) { console.log(data); }));

    this.waltz = waltz;

}

Onboarder.prototype.tutorialStep = function(e) {
    var _this = this,
        $message = $('#' + this.TUTORIAL_MESSAGE_ID),
        $overlay = $('#' + this.TUTORIAL_OVERLAY_ID),
        OFFSET = 40;

    if ($message.length == 0) {
        $message = $("<div id='" + this.TUTORIAL_MESSAGE_ID + "'></div>");
        $('body').append($message);
    }

    if (this.options.tutorialStep === 0) {
        var $message = $message.text("Click this to set up Waltz for " + this.options.site.config.name),
            $mainButton = $('#' + this.MAIN_BUTTON_ID);

        $message.attr('class', '');
        $message.addClass('right-arrow');

        $overlay.append($message);
        $message.css({
            left: $mainButton.offset().left - ($message.width() + OFFSET),
            top: $mainButton.offset().top + $message.height() / 2
        });

    } else if (this.options.tutorialStep === 1) {
        var $credentialForm = $('#' + this.CREDENTIAL_FORM_ID);

        $message.text("Type your username and password to securely store them with Waltz.");
        $message.animate({
            left: $credentialForm.offset().left,
            top: $credentialForm.offset().top + $credentialForm.height() + OFFSET
        });

        $message.attr('class', '');
        $message.addClass('top-arrow');
    }

    this.options.tutorialStep++;
}

Onboarder.prototype.completeTutorial = function() {
    $('#'+this.TUTORIAL_OVERLAY_ID).remove();
    chrome.runtime.sendMessage({ 
        method: "completeTutorial"
    });
}