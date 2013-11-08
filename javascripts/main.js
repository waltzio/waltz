$(document).ready(function() {

    $('.video').fitVids();
    $('.feature').click(function(e) {
        var $this = $(this),
            $selected = $('.feature.selected'),
            $shown = $('.description.show'),
            $toShow = $('.description.' + $this.data('feature'));

        $selected.removeClass('selected');
        $this.addClass('selected');

        $shown.removeClass('show');
        $toShow.addClass('show');
    });

});