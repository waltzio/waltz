(function($) {
	var cydoemusHost = "";

	chrome.runtime.sendMessage({
		type: "getHost"
	}, function(host) {
		cydoemusHost = host;
	});

	$(document).ready(function() {
		chrome.storage.local.get(null, function(sites) {
			for(domain in sites) {
				var site = sites[domain];

				var html = "<li data-username='"+site.username+"' data-password='"+site.password+"' data-domain='"+domain+"'>"
						   +"	<h3>"+domain+"</h3>"
						   +"	<button class='decrypt styled'>Decrypt</button>"
						   +"	</li>"

				$(".sites-list").find("ul").append(html);
			}

			$(".sites-list").find(".decrypt").click(function() {
				var self = this;
				var parent = $(self).parent();


				var domain = $(parent).data('domain');
				var username = $(parent).data('username');
				var password = $(parent).data('password');

				checkAuthentication(function(authed) {
					if(authed) {
						chrome.runtime.sendMessage({
							type: "decrypt",
							domain: domain,
							value: password

						}, function(response) {
							$(self).remove();

							if(response.error) {
								alert(response.error);
								return false;
							} 

							var decryptedHTML =  "<label for='username'>Username:</label> "
												+"<input type='text' class='username' value='"+username+"' />"
												+"<label for='password'>Password:</label> "
												+"<input type='password' class='toggle password' value='"+response.output+"' />"
												+"<button class='togglePass closed'></button>"
												+"<button class='savePass styled'>Save</button>"
												+"<button class='deleteAccount styled'>Forget</button>";

							$(parent).append(decryptedHTML);

						});
					} else{
						loginWithClef();
					}
				});
			});

			var options;

			//The default options *should* have been loaded in by now
			chrome.storage.local.get("options", function(data) {
				if(typeof(data.options) === "object") {
					options = data.options;

					$("#cydoemus-url").val(data.options.cydoemus_url);
				}
			});

			$(".all-settings").find("input").change(function() {
				options[$(this).attr('name')] = $(this).val();

				chrome.storage.local.set({options: options});
				chrome.runtime.sendMessage({type: "refreshSettings"});
			});

			$(document).on('click', '.togglePass', function() {
				var toggleInput = $(this).siblings(".toggle");
				var val = $(toggleInput).val();

				if($(toggleInput).attr('type') === "password") {
					$(toggleInput).replaceWith("<input class='toggle password' type='text' value='"+val+"' />");
					$(this).removeClass("closed").addClass("open");
				} else {
					$(toggleInput).replaceWith("<input class='toggle password' type='password' value='"+val+"' />");
					$(this).removeClass("open").addClass('closed');
				}

			});

			$(document).on('click', '.savePass', function() {
				var self = this;

				chrome.runtime.sendMessage({
					type: "saveCredentials",
					domain: $(self).parent().data('domain'),
					username: $(self).siblings(".username").val(),
					password: $(self).siblings(".password").val()
				});

				$(self).addClass('success');
				setTimeout(function() {
					$(self).removeClass('success')
				}, 1000);
			});

			$(document).on('click', '.deleteAccount', function() {
				var self = this;

				chrome.runtime.sendMessage({
					type: "deleteCredentials",
					domain: $(self).parent().data('domain')
				});
				$(self).parent().remove();
			});

			$("nav").find("li").click(function() {
				var target = $($(this).data('target'));
				$(".main-content").hide();
				$(target).show();
			});
		});
	});

	function checkAuthentication(cb) {
		chrome.runtime.sendMessage({
			type: "checkAuthentication",
			domain: document.location.host
		}, function(response) {
			if (!response.user) {
				if (typeof(cb) == "function") {
					cb(false);
				}
			} else {
				if (typeof(cb) == "function") {
					cb(true);
				}
			}
		});
	}

	function loginWithClef() {
		var iFrame = $("<iframe>");
		$(iFrame).css({
			position: 'absolute',
			height: '100%',
			width: '100%'
		});

		$(iFrame).attr('src', cydoemusHost+'/login');

		$(iFrame).on('load', function() {
			$(iFrame)[0].contentWindow.postMessage(null, cydoemusHost);
		});

		$("body").append(iFrame);

		$(iFrame).css({
			position: 'absolute',
			height: '100%',
			width: '100%',
			top: 0,
			left: 0,
			border: 'none'
		});

		addEventListener("message", function(e) {
			if(e.data.auth) {
				$(iFrame).fadeOut(200, function() { $(this).remove(); });
			}
		});
	}

})(jQuery);