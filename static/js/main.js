$(document).ready(function() {

    

	$(".circle").on('click', function() {
		var cls = $(this).attr('class').replace('circle ', '');

		var top = $(".feature-detail."+cls).offset().top;

		$("html, body").animate({
			scrollTop: top - 50
		}, 800);
	});

    // ANIMATIONS!

    var $phone = $('.animation-container .phone'),
        $video = $('video');

    $('.refresh').click(function() {
        console.log($phone);
        $phone.clearQueue();
        $phone.finish();
        $phone.removeAttr('style');
        $phone.css('transform', '');
        $('.animation-container .barsy').attr('style', '');
        var video = $video[0];
        video.load();
        animationStart();
    });

    $video.on('timeupdate', function() {
        animationStart();
        $(this).off('timeupdate');
    })

    function animationStart() {
        setTimeout(function() {
            $('.refresh').hide();
            $phone
                .transition({x: '60%'}, 3000)
                .queue(function(n) {
                    $('.animation-container .barsy')
                        .animate({top: 300, opacity: 0}, 750)
                        .queue(function(n) {
                            $(this).hide();
                            $(this).dequeue();
                        })
                    $(this).dequeue();
                })
                .delay(1000)
                .transition({
                    y: 500, 
                    x:1000,
                    rotate: '20deg'
                }, 2000)
                .queue(function(n) {
                    $('.refresh').show();
                    $(this).dequeue();
                });
        }, 1200);
    }

    $('.animation-container .barsy').barsy({
        distance: 0.1,
        speed: 750,
        height: 60,
        mock: true
    });

    addClassToRows();
    $(window).on('scroll', function() {
        clearTimeout($.data(this, 'scrollTimer'));
        $.data(this, 'scrollTimer', setTimeout(addClassToRows, 20)); 
    });

    function addClassToRows() {
        $('.row').each(function() {
            if (isScrolledIntoView(this)) {
                $(this).addClass('loaded');
            }
        });
    }
});

function isScrolledIntoView(elem)
{
    var docViewTop = $(window).scrollTop();
    var docViewBottom = docViewTop + $(window).height();

    var elemTop = $(elem).offset().top;
    var elemBottom = elemTop + $(elem).height();

    return ((elemBottom <= docViewBottom) && (elemTop >= docViewTop));
}