(function($) {

console.log("in");

var clefCircle = $("<div>");

$(clefCircle).css({
	position: "fixed",
	bottom: 0,
	right: 0,
	height: 0,
	width: 0,
	"background-color": "rgba(13, 72, 134, .9)",
	"border-radius": 0,
	"border-color": "rgba(13, 157, 219, .9)",
	"border-style": "solid",
	"border-width": 0,
	"-webkit-transition": "border-width 1.5s, height .5s, width .5s, bottom .5s, right .5s"
});

$("body").append(clefCircle);

setTimeout(function() {
	$(clefCircle).css({
		bottom: -200,
		right: -200,
		height: 350,
		width: 350,
		"border-width": 50,
		"border-radius": 400
	})
}, 500);


})(jQuery);