Message =  {
    DISMISS_ID: 'waltz-message-dismiss',
    MESSAGE_ID: 'waltz-message',
    getMessage: function() {
        var $el = $('#'+this.MESSAGE_ID);
        var $dismisser = $('#'+this.DISMISS_ID);

        if (!$el.length) {
            $dismisser = $("<div id='" + this.DISMISS_ID + "'>&times;</div>");
            $el = $("<div id='" + this.MESSAGE_ID + "'></div>");
            $el.append("<p></p>", $dismisser);
            $('body').append($el);
            $dismisser.click(function() {
                $el.fadeOut(100); 
                $el.trigger('dismiss');
            });
        }

        $el.unbind('dismiss');

        return $el;
    }
};
