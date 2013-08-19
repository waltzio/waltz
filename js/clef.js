(function($) {

var loginCredentials = false;

//Clef kickoff
function clef_extensionInitialize() {
	var loginForm = clef_detectLogin();
	chrome.runtime.sendMessage({
		type: "getCredentials",
		domain: "test.test.com"

	}, function(creds) {
		if(creds && loginForm) {
			loginCredentials = creds
			clef_drawClefWidget(loginForm);			
		}

	});
}

//Checks if a login form exists.  Returns the login form container or false if one doesnt exist
function clef_detectLogin() {
	var passwordInputs = $("input[type='password']");

	var mostLikelyContainer = false;
	//Password inputs are a required input for any login form, so let's start there
	//Loop through each of the password inputs on the page try to figure out if it's a login form

	var passwordContainer = false;
	var passwordContainerScore = -1000;
	passwordInputs.each(function() {
		//We need to work up the DOM and find the container for entire login form.
		//Usually this will be a <form>, but not always, so we need to manually look for it
		var foundParent = false;
		var curParent = this;

		while(!foundParent && $(curParent).parent().length) {
			curParent =  $(curParent).parent();

			//For now let's just say that anything that contains multiple inputs is the form container
			if($(curParent).find("input").length > 1) {
				foundParent = true;
			}
		}

		if(foundParent) {

			//Login forms should only have one password input
			if($(curParent).find("input[type='password']").length > 1) {
				return false;
			}

			//Login forms should have at max one email input.  We can't always say the same for text inputs, so be specific
			if($(curParent).find("input[type='email']").length > 1) {
				return false;
			}

			//But Login forms should have at least 1 text or email field
			if($(curParent).find("input[type='email'], input[type='text']").length === 0) {
				return false;
			}

			//It's possible that there is an actual <form> container above this.  If so, let's
			//look for that and make sure we didn't jump too far up the tree
			var closestForm = $(curParent).closest("form");
			if($(closestForm).find("input[type='password'], input[type='email'], input[type='text']").length === $(curParent).find("input[type='password'], input[type='email'], input[type='text']").length) {
				curParent = closestForm;
			}

			//OK..  This is probably a login form.  But there may be other similar ones, so let's score them and compare
			var score = 0;

			var hasButtons = !!$(curParent).find("input[type='submit'], button").length;
			var hasRememberMe = $(curParent).find("input[type='checkbox']").length === 1;
			var numWeirdInputs = $(curParent).find("input").not("[type='checkbox'], [type='text'], [type='email'], [type='password'], [type='submit'], [type='hidden']").length
			//We will decrease this by two because we expect two inputs on a login form
			//We also expect a rememberMe and a submit button, so add those back in as well.
			var numExtraNormalInputs = $(curParent).find("input").filter("[type='checkbox'], [type='text'], [type='email'], [type='password'], [type='submit']").length - 2 - hasRememberMe - hasButtons;


			score += hasButtons ? 1 : -1;
			score += hasRememberMe ? 1 : -1;
			score -= numWeirdInputs * 2;
			score -= numExtraNormalInputs;

			if(score > passwordContainerScore) {
				passwordContainer = curParent;
				passwordContainerScore = score;
			}
		}
	});
	if(!passwordContainer) {
		return false;
	}

	var passwordField = $(passwordContainer).find("input[type='password']");

	//As a note, these selectors will be ordered from least likely to most likely match

	//First of all, just grab the first text field, and choose that.  If nothing else matches, that's probably the one
	var usernameField = $(passwordContainer).find("input[type='text']").first();

	//Now let's try to find an email field.  Chances are that the email field is the username
	var emailField = $(passwordContainer).find("input[type='email']")
	if(emailField.length) {
		usernameField = emailField;
	}

	//There are a few common classes and IDs that usually indicate username fields.
	//This is a list of them, sorted by least likely to most likely. We will loop
	//through them looking for username fields
	var usernameClasses = [
		"login",
		"uid",
		"email",
		"user",
		"username"
	];

	for(var i=0,max=usernameClasses.length; i<max; i++) {
		var matches = $(passwordContainer).find("input."+usernameClasses[i]+", input#"+usernameClasses[i]);

		if(matches.length) {
			usernameField = $(matches).first();
		}
	}

	//OK, we probably have a username field now.  

	//We also have everything else, so let's build a useful reference object and return it

	return {
		container: passwordContainer,
		passwordField: passwordField,
		usernameField: usernameField
	};
}

function clef_decryptCredentials(cb) {
	if(loginCredentials && typeof(loginCredentials.password === "string")) {
		chrome.runtime.sendMessage({
			type: "decrypt",
			value: loginCredentials.password

		}, function(decrypted) {

			if(typeof(cb) === "function") {
				cb({
					username: loginCredentials.username,
					password: decrypted
				});
			}

		});
	}
}

//Fills the login form and submits it
function clef_fillAndSubmitLoginForm(form) {

	clef_decryptCredentials(function(creds) {
		$(form.usernameField).val(creds.username);
		$(form.passwordField).val(creds.password);

		//Now let's try and submit this freaking form...
		if($(form.container).is("form")) {  //If it's a <form>, then it's easy.
			$(form.container).submit();
		} else {
			//Now we just need to find the most likely button to click submit on..
			//Generally that's just going to be the last button on the form
			var button = $(form.container).find("input[type='submit'").last();

			if(!button.length) {
				button = $(form.container).find("button").last();
			}

			if(button.length) {
				$(button).click();
			} else {
				//I guess if we get this far I don't really know what to do.  Will need to do some research
			}
		}
	});


}

//Draws the clef widget and binds the interactions
function clef_drawClefWidget(form) {
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
	var curAction;

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
		curAction = "login";

		hitActionTimeout = setTimeout(function() {
			$(clefCircle).find("path#clef-login-hit-target").hover(function() {
				$(clefCircle).removeClass("clef-dismiss-action");
				$(clefCircle).addClass("clef-login-action");
				curAction = "login";
			});

			$(clefCircle).find("path#clef-dismiss-hit-target").hover(function() {
				$(clefCircle).removeClass("clef-login-action");
				$(clefCircle).addClass("clef-dismiss-action");
				curAction = "dismiss";
			});
		}, 500);
	}, function() {
		clearTimeout(hitActionTimeout);

		$(clefCircle).find('path').unbind('hover');
		$(clefCircle).removeClass("clef-login-action").removeClass("clef-dismiss-action");
	});

	$(clefCircle).click(function() {
		var self = this;

		$(this).addClass("remove");

		//If curAction is not 'login' or 'dismiss', then something weird happened.  But let's treat that like dismiss
		if(curAction === 'login') {
			clef_fillAndSubmitLoginForm(form);
		}

		setTimeout(function() {
			$(self).remove();
		}, 1000)
	})


	$("body").append(clefCircle);

}

clef_extensionInitialize();

})(jQuery);