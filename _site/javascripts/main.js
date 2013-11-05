$(document).ready(function() {
	$(".circle").on('click', function() {
		var cls = $(this).attr('class').replace('circle ', '');

		var top = $(".feature-detail."+cls).offset().top;

		$("html, body").animate({
			scrollTop: top - 50
		}, 800);
	});
});