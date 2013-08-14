(function($) {

var cSource = chrome.extension.getURL("/img/clef128.png");
console.log(cSource);
var clefCircle = $("<div><img src='"+cSource+"' width='64' height='64' /></div>");

$(clefCircle).css({
	position: "fixed",
	bottom: 25,
	right: 25
});

$("body").append(clefCircle);

setInterval(function() {
	console.log("flip");
	$(clefCircle).css({
		'-webkit-transform': 'rotateZ(0deg)',
		"-webkit-transition": "none"
	});
	setTimeout(function() {
		$(clefCircle).css({
			"-webkit-transition": "-webkit-transform 1s",
			'-webkit-transform': 'rotateZ(360deg)'
		});
	}, 10);
}, 3000);

})(jQuery);