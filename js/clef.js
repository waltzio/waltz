(function($) {

//Clef kickoff
function clef_extensionInitialize() {
	clef_drawClefWidget();
}

//Checks if a login form exists.  Returns true or false accordingly
function clef_detectLogin() {

}

//Requests login credentials for a certain domain from the extension background
function clef_requestCredentials() {

}

//Fills the login form and submits it
function clef_fillAndSubmitLoginForm() {

}

//Draws the clef widget and binds the interactions
function clef_drawClefWidget() {
	//Grab image resource URLs from extensions API
	var cSource = chrome.extension.getURL("/img/clef128.png");
	var fSource = chrome.extension.getURL("/img/clef-full.png");


	//Build HTML for clef widget
	var clefCircle = $("<div id='clef-vault-login-wrapper' class='spinning'></div>");
	var clefActions = $(
		"<svg width='64' height='64'>"
			+"<g>"
				+"<path id='clef-login-hit-target' d='M22.5,51.5A16,16,0,1,1,42,14' stroke='#0d9ddb' fill='none' stroke-width='19.5'></path>"
				+"<path id='clef-dismiss-hit-target' d='M42,14A21.2,21.2,0,0,1,41.5,51.5' stroke='#b4181d' fill='none' stroke-width='19.5'></path>"
				+"<circle cx='32' cy='32' r='12' />"
			+"</g>"
		+"</svg>");

	//Style the widget with the correct image resource
	$(clefCircle).css({
		"background-image": "url("+cSource+")"
	}).append(clefActions);


	var hitActionTimeout;

	//Hover and click interactions:
	//On hover, the widget should spin to 359 deg (359, so it picks up at 0deg on hover-out)
	//  It should also fade in the SVG hit targets for logging in and dismissing
	//  The widget is defaulted to the login target, and doesn't bind the hit targets until the
	//  spinning animation has finished.  This seems to pretty reliably put the user in login mode at the 
	//  time of hover
	//
	//On click the widget should fade out and do a spinning animation.
	//  When finished it should be removed from the DOM
	$(clefCircle).hover(function() {
		$(clefCircle).addClass("clef-login-action");

		hitActionTimeout = setTimeout(function() {
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
		clearTimeout(hitActionTimeout);

		$(clefCircle).find('path').unbind('hover');
		$(clefCircle).removeClass("clef-login-action").removeClass("clef-dismiss-action");
	});

	$(clefCircle).click(function() {
		$(this).addClass("remove");
	})


	$("body").append(clefCircle);

}

clef_extensionInitialize();

})(jQuery);