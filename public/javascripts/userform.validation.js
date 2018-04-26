(function ( $ ) {
	$.fn.user_validation = function(options) {
		
		// Only require password on the new user form
		var required_password = false;
		if($('.panel-heading').text().trim() == "New user"){
			required_password = true;
		}
	
		$(options).validate({
			errorClass: "has-error",
			rules: {
				frm_users_name: {
					minlength: 4,
					required: true
				},
				frm_email1: {
					required: true,
					email: true
				},
				frm_email2: {
					required: true,
					email: true,
					equalTo: "#frm_email1"
				},
				frm_password: {
					required: required_password,
					minlength: 6
				},
				frm_password_confirm: {
					required: required_password,
					minlength: 6,
					equalTo: "#frm_password"
				},
				blog_posts_per_page: {
					required: true,
					number: true					
				},
				blog_pagination_links: {
					required: true,
					number: true	
				}
			},
			messages: {
				frm_users_name: {
					required: "Please enter your name",
					minlength: "Your must be at least 5 characters"
				},
				frm_email1: {
					required: "Please provide a valid email address",
					minlength: "Your email must be at least 5 characters long"
				},
				frm_email2: {
					required: "Please provide a valid email address",
					minlength: "Your email must be at least 5 characters long",
					equalTo: "Please enter the same email as above"
				},
				frm_password: {
					required: "Please provide an password",
					minlength: "Your password must be at least 6 characters long"
				},
				frm_password_confirm: {
					required: "Please provide an password",
					minlength: "Your password must be at least 6 characters long",
					equalTo: "Please enter the same password as above"
				},
				blog_posts_per_page: {
					required: "Please provide a number of posts per page"
				},
				blog_pagination_links: {
					required: "Please provide a number of pagination links either side of current"
				}
			}
		});
	};
}( jQuery ));