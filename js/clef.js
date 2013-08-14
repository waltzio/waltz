(function($) {

var clefSource = chrome.extension.getURL("/img/clef128.png");
var clefCircle = $("<div><img src='"+clefSource+"' height='64' width='64' /></div>");
var clefImage = $(clefCircle).children("img");

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
	"-webkit-transition": "border-width 1s, height .7s, width .7s, bottom .7s, right .7s"
});

$(clefImage).css({
	display: "none",
	position: "relative",
	top: 100,
	left: 100
});

$("body").append(clefCircle);
console.log(clefCircle);

setTimeout(function() {
	$(clefCircle).css({
		bottom: -200,
		right: -200,
		height: 350,
		width: 350,
		"border-width": 50,
		"border-radius": 400
	})

	setTimeout(function() {
		$(clefCircle).children("img").fadeIn(500);
	}, 1000);
}, 500);

setInterval(function() {
	$(clefImage).css({
		"-webkit-transition": "none",
		"-webkit-transform": "rotateX(0deg)"
	});
	setTimeout(function() {
		$(clefImage).css({
			"-webkit-transition": "-webkit-transform 1s",
			"-webkit-transform": "rotateX(360deg)"
		});
	}, 10)
}, 3000);


})(jQuery);