$(document).ready(function() {
	$("form").submit(function(e) {

		alert("Page is submitting with\r\nusername: "+$(this).find("input[type='text']").val()+"\r\npassword: "+$(this).find("input[type='password']").val());
	});
});