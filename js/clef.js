(function($) {

var cSource = chrome.extension.getURL("/img/clef128.png");
var fSource = chrome.extension.getURL("/img/clef-full.png");

var clefCircle = $("<div id='clef-vault-login-wrapper' class='spinning'></div>");
var clefActions = $(
	"<svg width='64' height='64'>"
		+"<g>"
			+"<path id='clef-login-hit-target' d='M22.5,51.5A16,16,0,1,1,42,14' stroke='#0d9ddb' fill='none' stroke-width='19.5'></path>"
			+"<path id='clef-dismiss-hit-target' d='M42,14A21.2,21.2,0,0,1,41.5,51.5' stroke='#b4181d' fill='none' stroke-width='19.5'></path>"
			+"<circle cx='32' cy='32' r='12' />"
		+"</g>"
	+"</svg>");

$(clefCircle).css({
	"background-image": "url("+cSource+")"
}).append(clefActions);


var hitActionTimeout;

$(clefCircle).hover(function() {
	$(clefCircle).addClass("clef-login-action");

	hitActionTimeout = setTimeout(function() {
		console.log("bind");
		$(clefCircle).find("path#clef-login-hit-target").hover(function() {
			$(clefCircle).removeClass("clef-dismiss-action");
			$(clefCircle).addClass("clef-login-action");
		});

		$(clefCircle).find("path#clef-dismiss-hit-target").hover(function() {
			$(clefCircle).removeClass("clef-login-action");
			$(clefCircle).addClass("clef-dismiss-action");
		});
	}, 500);
}, function() {
	console.log("clear timeout");
	clearTimeout(hitActionTimeout);

	$(clefCircle).find('path').unbind('hover');
	$(clefCircle).removeClass("clef-login-action").removeClass("clef-dismiss-action");
});

$(clefCircle).click(function() {
	$(this).addClass("remove");
})


$("body").append(clefCircle);



})(jQuery);