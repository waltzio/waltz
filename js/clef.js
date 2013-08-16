(function($) {

var cSource = chrome.extension.getURL("/img/clef128.png");
var fSource = chrome.extension.getURL("/img/clef-full.png");

var clefCircle = $("<div id='clef-vault-login-wrapper' class='spinning'></div>");
var clefActions = $(
	"<svg width='64' height='64'>"
		+"<g>"
			+"<path d='M22.5,51.5A16,16,0,1,1,42,14' stroke='#0d9ddb' fill='none' stroke-width='19.5'></path>"
			+"<path d='M42,14A21.2,21.2,0,0,1,41.5,51.5' stroke='#0d569c' fill='none' stroke-width='19.5'></path>"
		+"</g>"
	+"</svg>");

$(clefCircle).css({
	"background-image": "url("+cSource+")"
}).append(clefActions);

$("body").append(clefCircle);



})(jQuery);