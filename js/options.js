(function($) {
	

	$(document).ready(function() {
		chrome.storage.local.get(null, function(sites) {
			for(domain in sites) {
				var site = sites[domain];

				var html = "<li data-username='"+site.username+"' date-password='"+site.password+"' data-domain='"+domain+"'>"
						   +"	<h3>"+domain+"</h3>"
						   +"	<button class='decrypt'>Decrypt</button>"
						   +"	</li>"

				$(".sites-list").find("ul").append(html);
			}

			$(".sites-list").find(".decrypt").click(function() {
				var self = this;
				var parent = $(self).parent();

				$(self).remove();

				var domain = $(parent).data('domain');
				var username = $(parent).data('username');
				var password = $(parent).data('password');

				/*chrome.runtime.sendMessage({
					type: "decrypt",
					domain: domain,
					value: password

				}, function(response) {

					if(response.error) {
						alert(response.error);
						return false;
					} */

					var decryptedHTML =  "<label for='username'>Username:</label> "
										+"<input type='text' value='"+username+"' />"
										+"<label for='password'>Password:</label> "
										+"<input type='password' class='toggle' value='fakePassword' />"
										+"<button class='togglePass closed'></button>";

					$(parent).append(decryptedHTML);

				//});
			});

			$(document).on('click', '.togglePass', function() {
				var toggleInput = $(this).siblings(".toggle");
				var val = $(toggleInput).val();

				if($(toggleInput).attr('type') === "password") {
					$(toggleInput).replaceWith("<input class='toggle' type='text' value='"+val+"' />");
					$(this).removeClass("closed").addClass("open");
				} else {
					$(toggleInput).replaceWith("<input class='toggle' type='password' value='"+val+"' />");
					$(this).removeClass("open").addClass('closed');
				}

			});
		});
	});

})(jQuery);