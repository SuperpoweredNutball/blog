var express = require('express');
var router = express.Router();

// the default admin route. Checks if has been setup and redirects accordingly
router.get('/', function(req, res) {
	var db = req.db;
	var fs = require('fs');
	var app = req.app;

	app.locals.layout = "admin_login_layout.hbs";
	app.locals.settings.views = "views";

	fs.exists("config.txt", function(exists) {
		if (exists) {
			res.redirect('/admin/posts');
		} else {
			res.redirect('/admin/setup');
		}
	});
});

// shows the setup form to do the initial setup of the blog
router.get('/setup', function(req, res) {
	var app = req.app;
	var fs = require('fs');

	// don't allow the setup view if a config file already exists
	fs.exists("config.txt", function(exists) {
		if (exists) {
			res.redirect('/admin/posts');
		} else {
			app.locals.layout = "admin_login_layout.hbs";
			app.locals.settings.views = "views";

			res.render('admin_setup', {
				title: 'Antlers - setup'
			});
		}
	});
});

// calls the post render list
router.get('/posts', restrict, function(req, res) {
	render_postlist(req, res);
})

// render the list of posts
function render_postlist(req, res){
	var db = req.db;
	var app = req.app;
	var sess = req.session;
	var configurator = req.antlers_functions.get_config();
	var helpers = req.handlebars.helpers;
	var message = "";
	var message_type = "";

	// set the flash messages to local variables to be used on this
	// request, then clearing the session variables
	if(req.session.message){
		message = sess.message;
		req.session.message = null;
	}

	if(req.session.message_type){
		message_type = sess.message_type;
		req.session.message_type = null;
	}

	// override the default layout and view directory
	set_admin_view(app);

	db.posts.find({}).sort({post_date: -1}).exec(function (err, post_list) {
		res.render('admin_postlist', {
			"config": configurator,
			title: 'Admin - Posts',
			"posts": post_list,
			"post_count": post_list.length,
			helpers: helpers,
			"message": message,
			"message_type": message_type,
			"session": req.session
		});
	});
}

// previews the post before editing
router.get('/preview/:id', restrict, function(req, res) {
	var db = req.db;
	var sess = req.session;
	var message = "";
	var message_type = "";
	var configurator = req.antlers_functions.get_config();
	var app = req.app;
	var moment = req.moment;
	var marked = req.marked;
	var helpers = req.handlebars.helpers;

	// get local vars from session
	var sess_array = get_session_array(sess);

	db.posts.findOne({"post_id": Number(req.params.id)}, function (err, post) {
		if(post){
			post_title = post.post_title;
			post_body = marked(post.post_body)
			post_date = post.post_date;
			post_tags = post.post_tags;
			post_status = post.post_status;
			post_static_page = post.post_static_page;

			// override the default layout and view directory
			set_admin_view(app);

			res.render('admin_preview', {
				"config": configurator,
				"header": "Edit Post",
				"post_id": post.post_id,
				"message": sess_array["message"],
				"message_type": sess_array["message_type"],
				"post_title": post_title,
				"post_body": post_body,
				"post_date": moment(post_date).format("DD/MM/YYYY"),
				"post_tags": helpers.get_tag_array(post_tags),
				"post_status": post_status,
				title: 'Admin - Preview',
				"post_static_page": post_static_page,
				helpers: helpers
			});
		}else{
			req.session.message = "Post ID not found";
			req.session.message_type = "danger";
			res.redirect('/admin/posts');
		}
	});
});

// Shows the form to edit a specific user
router.get('/user/edit/:id', restrict, function(req, res) {
	var app = req.app;
	var db = req.db;
	var configurator = req.antlers_functions.get_config();

	// override the default layout
	set_admin_view(app);

    db.users.findOne({_id: req.params.id}, function (err, user) {
		res.render('admin_user_edit',{
			"config": configurator,
			title: 'Admin - Edit user',
			helpers: req.handlebars.helpers,
			"session": req.session,
			"user": user
		});
	});
});

// shows the list of current users
router.get('/users/current', restrict, function(req, res) {
	var app = req.app;
	var db = req.db;
	var configurator = req.antlers_functions.get_config();

	// override the default layout
	set_admin_view(app);

	db.users.find({}).exec(function (err, users) {
		res.render('admin_users_current',{
			"config": configurator,
			title: 'Admin - Current users',
			helpers: req.handlebars.helpers,
			"session": req.session,
			"users": users
		});
	});
});

// render the new user screen with all fields blank
router.get('/users/new', restrict, function(req, res) {
	var app = req.app;
	var configurator = req.antlers_functions.get_config();
	var db = req.db;
	var message = "";
	var message_type = "";

	// override the default layout
	set_admin_view(app);

	res.render('admin_users',{
		"config": configurator,
		"message": message,
		"message_type": message_type,
		title: 'Admin - Users',
		helpers: req.handlebars.helpers,
		'function': 'new',
		'panel_title': 'New user',
		'submit_text': 'Add user',
		"session": req.session
	});
});

router.get('/users', restrict, function(req, res) {
	var app = req.app;
	var configurator = req.antlers_functions.get_config();
	var db = req.db;
	var message = "";
	var message_type = "";

	// override the default layout
	set_admin_view(app);

	db.users.findOne({user_email: req.session.user}).exec(function (err, user) {
		res.render('admin_users',{
			"config": configurator,
			"message": message,
			"message_type": message_type,
			"user": user,
			title: 'Admin-Users',
			helpers: req.handlebars.helpers,
			'session': req.session,
			'function': 'edit',
			'panel_title': 'My account',
			'submit_text': 'Update user'
		});
	});
});

router.get('/login', function(req, res) {
	var app = req.app;
	var db = req.db;
	var message = "";
	var message_type = "";

	// override the default layout
	app.locals.layout = "admin_login_layout.hbs";
	app.locals.settings.views = "views";

	// check if a user exists. If not, go through the setup process
	db.users.count({}, function (err, count) {
		if(count == 0){
			res.redirect('/admin/setup');
		}else{
			res.render('admin_login', {title: 'Admin - Login' });
		}
	});
});

router.post('/user/action_edit', restrict, function(req, res){
	var db = req.db;
	var bcrypt = req.bcrypt;
	var users_name = req.body.frm_users_name;
	var email_add = req.body.frm_email1;
    var password = req.body.frm_password;
    var user_id = req.body.frm_users_id;
	var is_admin = req.body.frm_is_admin;

	if(is_admin != undefined){
		is_admin = true;
	}else{
		is_admin = false;
	}

	// create the update doc
	var update_doc = {
		user_name: users_name,
	    user_email: email_add,
	    is_admin: is_admin
    };

	// only update the password if it is present
	if(password != ""){
		update_doc["user_password"] = bcrypt.hashSync(password);
	}

	// update the db
	db.users.update({_id: user_id },{$set: update_doc
								    }, function (err, numReplaced) {
		db.users.persistence.compactDatafile();
		req.session.message = "User successfully updated";
		req.session.message_type = "success";
		res.redirect(req.body.frm_return_url);
	});
});

router.post('/user/action_new', restrict, function(req, res){
	var db = req.db;
	var bcrypt = req.bcrypt;
	var users_name = req.body.frm_users_name;
	var email_add = req.body.frm_email1;
    var password = req.body.frm_password;
	var is_admin = req.body.frm_is_admin;

	var doc = { user_name: users_name
			   , user_email: email_add
			   , user_password: bcrypt.hashSync(password)
			   , is_admin: is_admin
			   };

	db.users.insert(doc, function (err, newDoc) {
		if(err){
			console.log(err);
		}else{
			// sign-up is successful
			req.session.message = "Welcome aboard";
			req.session.message_type = "success";
			res.redirect('/admin/users/');
		}
	});
});

router.post('/action_setup', function(req, res){
	var db = req.db;
	var bcrypt = req.bcrypt;
	var configurator = req.antlers_functions;

	var user_doc = { user_name: req.body.full_name
			   , user_email: req.body.email_address
			   , user_password: bcrypt.hashSync(req.body.password)
			   , is_admin: true
			   };

	db.users.insert(user_doc, function (err, new_user) {
		if(err){
			console.log(err);
		}else{
			// user account was successful so we create the config file
			var config_string = "";

			// write the config file based on the input from the setup and some defaults
			config_string = config_string + "blog_title~~" + req.body.blog_title + "\n";
			config_string = config_string + "blog_email~~" + req.body.email_address + "\n";
			config_string = config_string + "blog_hostname~~" + req.protocol + "://"  + req.headers.host + "\n";
			config_string = config_string + "blog_posts_per_page~~3\n";
			config_string = config_string + "blog_pagination_links~~2\n";
			config_string = config_string + "blog_theme~~default\n";
			configurator.write_config(config_string);
			configurator.write_sitemap(db);

			req.session.user = req.body.email_address;
			req.session.user_isadmin = "true";

			req.session.message = "Welcome aboard";
			req.session.message_type = "success";
			res.redirect('/admin');
		}
	});

});

router.post('/action_login', function(req, res){
	var config = req.config;
	var db = req.db;
	var bcrypt = req.bcrypt;
	var email_add = req.body.email_address;
    var password = req.body.password;

	db.users.findOne({}).sort({user_email: email_add}).exec(function (err, users) {
		if(err){
			render_login_fail(config, req, res);
		}else{
			if(users){
				// we have found a user. Now we compare the hash
				var db_hash = users.user_password;

				// compare password with hash in db
				if(bcrypt.compareSync(password, db_hash) == true){
					req.session.regenerate(function(){
						req.session.user = email_add;
						req.session.user_is_admin = users.is_admin;
						req.session.message = null;
						req.session.message_type = null;
						res.redirect('/admin');
					});
				}else {
					render_login_fail(config, req, res);
				}
			}else{
				render_login_fail(config, req, res);
			}
		}
	});
});

router.get('/backup', restrict, function(req, res){
	var fs = require('fs');
	var archiver = require('archiver');
	var path = require('path');

	fs.unlink(__dirname + 'backup.zip', function (err) {
		var output = fs.createWriteStream('backup.zip');
		var archive = archiver('zip');

		output.on('close', function () {
			var zip_path = path.resolve(__dirname + '/../','backup.zip');
			res.sendfile(zip_path);
		});

		archive.on('error', function(err){
			throw err;
		});

		archive.pipe(output);

		archive.directory(__dirname + '/../data/', 'data');
		archive.directory(__dirname + '/../public/themes', 'public/themes');
		archive.directory(__dirname + '/../public/user_content', 'public/user_content');
		archive.file(__dirname + '/../config.txt', { name:'config.txt' });
		archive.finalize();
	});
});

router.get('/lab', restrict, function(req, res){
	var sess = req.session;
	var app = req.app;
	var helpers = req.handlebars.helpers;
	var moment = req.moment;
	var configurator = req.antlers_functions.get_config();

	// get local vars from session
	var sess_array = get_session_array(sess);

	// override the default layout and view directory
	set_admin_view(app);

	res.render('admin_lab',{
		"config": configurator,
		"post_id": "",
		"message": sess_array["message"],
		"message_type": sess_array["message_type"],
		"post_date": moment().format('DD/MM/YYYY HH:mm'),
		"post_title": sess_array["post_title"],
		"post_body": sess_array["post_body"],
		"post_tags": sess_array["post_tags"],
		"title": 'Admin - Lab',
		"helpers": helpers,
		"session": req.session
	});
});


// kill the session and log the user out
router.get('/logout', function(req, res){
    req.session.destroy(function(){
        res.redirect('/admin/login');
    });
});

// Catch hits to "editor" and no ID supplied. Alert and redirect to post list
router.get('/editor', restrict, function(req, res) {
	req.session.message = "Error: Post ID not found";
	req.session.message_type = "danger";
	res.redirect('/admin/posts/');
});

// New post editor
router.get('/editor/new', restrict, function(req, res) {
	var sess = req.session;
	var app = req.app;
	var helpers = req.handlebars.helpers;
	var moment = req.moment;
	var configurator = req.antlers_functions.get_config();

	// get local vars from session
	var sess_array = get_session_array(sess);

	// override the default layout and view directory
	set_admin_view(app);

	res.render('admin_editor',{
		"config": configurator,
		"header": "New Post",
		"post_id": "",
		"message": sess_array["message"],
		"message_type": sess_array["message_type"],
		"post_date": moment().format('DD/MM/YYYY HH:mm'),
		"post_title": sess_array["post_title"],
		"post_body": sess_array["post_body"],
		"post_tags": sess_array["post_tags"],
		"post_meta_title": sess_array["post_meta_title"],
		"post_meta_description": sess_array["post_meta_description"],
		"post_meta_image": sess_array["post_meta_image"],
		title: 'Admin - New page',
		helpers: helpers,
		'session': req.session,
		layout: 'admin_layout'
	});
});

// Editing an existing post
router.get('/editor/:id', function(req, res) {
	var db = req.db;
	var sess = req.session;
	var marked = req.marked;
	var app = req.app;
	var helpers = req.handlebars.helpers;
	var moment = req.moment;
	var configurator = req.antlers_functions.get_config();

	// get local vars from session
	var sess_array = get_session_array(sess);

	// override the default layout and view directory
	set_admin_view(app);

	db.posts.findOne({ "post_id": Number(req.params.id) }).sort({ post_date: -1 }).exec(function (err, post){
		if(post){
				var post_title = post.post_title;
				var post_title_clean = post.post_title_clean;
				var post_body = post.post_body;
				var post_date = post.post_date;
				var post_tags = post.post_tags;
				var post_status = post.post_status;
				var post_static_page = post.post_static_page;
				var post_meta_title = post.post_meta_title;
				var post_meta_description = post.post_meta_description;
				var post_meta_image = post.post_meta_image;
				var db_id = post._id;
				var post_static_page = "off";

				// check for session values. This would occur on the odd occassion there was an error saving
				// changes to a post. Eg: Missing/Null post_title, post_body, post_date.
				if(sess_array["post_title"] != null){
					post_title = sess_array["post_title"];
				}
				if(sess_array["post_body"] != null){
					post_body = sess_array["post_body"];
				}
				if(sess_array["post_tags"] != null){
					post_tags = sess_array["post_tags"];
				}
				if(sess_array["post_meta_title"] != null){
					post_meta_title = sess_array["post_meta_title"];
				}
				if(sess_array["post_meta_description"] != null){
					post_meta_description = sess_array["post_meta_description"];
				}
				if(sess_array["post_meta_image"] != null){
					post_meta_image = sess_array["post_meta_image"];
				}

				res.render('admin_editor', {
					"config": configurator,
					"header": "Edit Post",
					"post_id": post.post_id,
					"message": sess_array["message"],
					"message_type": sess_array["message_type"],
					"db_id": db_id,
					"post_title": post_title,
					"post_title_clean": post_title_clean,
					"post_body": post_body,
					"post_date": moment(post_date).format('DD/MM/YYYY HH:mm'),
					"post_tags": post_tags,
					"post_status": post_status,
					"post_static_page": post_static_page,
					"post_meta_title": post_meta_title,
					"post_meta_description": post_meta_description,
					"post_meta_image": post_meta_image,
					title: 'Admin - Posts',
					helpers: helpers
				});
		}else{
			// get all posts and show a message to advise the post ID does not exist
			req.session.message = "Error: Post ID not supplied";
			req.session.message_type = "danger";
			res.redirect('/admin/posts');
		}
	});
});

// delete post by ID
router.get('/deletepost/:id', restrict, function(req, res) {
	var db = req.db;

	// remove the record requested
	db.posts.remove({ "post_id": Number(req.params.id)}, {}, function (err, numRemoved) {
		if(err){
			req.session.message = "Error " + err;
			req.session.message_type = "danger";
			res.redirect('/admin/editor/' + req.body.frm_post_id);
		}else{
			db.posts.persistence.compactDatafile();
			req.session.message = "Post successfully deleted";
			req.session.message_type = "success";
			res.redirect('/admin/');
		}
	});
});

// base64 encode uploaded logo files
function base64_encode(file) {
    var fs = require('fs');
	var buffer = fs.readFileSync(file);
	return buffer.toString("base64");
}

// clears the base64 encoded image string from the settings file
router.get('/clearlogo', restrict, function(req, res) {
	var configurator = req.antlers_functions;
	var config_array = configurator.get_config();
	var config_string = "";

	// clear the array value
	config_array["blog_logo"] = "";

	// build the config string and remove the "blog_logo" element
	for (var i in config_array) {
		if(i != "" && i != "blog_logo"){
			config_string = config_string + i + "~~" + config_array[i] + "\n";
		}
	}
	// save the settings
	configurator.write_config(config_string);

	// show success message and redirect
	req.session.message = "Successfully saved settings";
	req.session.message_type = "success";
	res.redirect('/admin/settings');
});

// render the settings view
router.post('/savesettings', restrict, function(req, res) {
	var configurator = req.antlers_functions;
	var fs = require('fs');
	var sess = req.session;
	var sess_array = get_session_array(sess);
	var config_string = "";

	// get the themes array
	var themes = fs.readdirSync("public/themes");

	if(req.files.blog_logo){
		// upload file is present, now Base64 encode and save
		var imagePath = req.files.blog_logo.path;
		var encoded_image = base64_encode(imagePath);
		// delete the temp image file after we have the base64 has of it
		fs.unlinkSync(imagePath);
		req.body.blog_logo = encoded_image;
	}else{
		req.body.blog_logo = configurator.get_config().blog_logo;
	}

	for (var i in req.body) {
		// remove line breaks from analytics code before saving to config
		if(i == "blog_google_analytics"){
			if(req.body[i].length > 1){
				var line_breaks_removed = req.body[i].replace(/(\r\n|\n|\r)/gm,"");
				config_string = config_string + i + "~~" + line_breaks_removed + "\n";
			}
		}else{
			config_string = config_string + i + "~~" + req.body[i] + "\n";
		}
	}

	// if the google analytics textarea is blank we append the field anyway as the "req.body" does not include blank textareas
	if(req.body["blog_google_analytics"] == null){
		config_string = config_string + "blog_google_analytics~~\n";
	}

	// if the blog description textarea is blank we append the field anyway as the "req.body" does not include blank textareas
	if(req.body["blog_description"] == null){
		config_string = config_string + "blog_description~~\n";
	}

	// write the sessions to file
	var result = configurator.write_config(config_string);

	// show flash message
	if(result == false){
		req.session.message = "Failed to save settings";
		req.session.message_type = "danger";
		res.redirect('/admin/settings');
	}else{
		req.session.message = "Successfully saved settings";
		req.session.message_type = "success";
		res.redirect('/admin/settings');
	}
});

// render the settings view
router.get('/settings', restrict, function(req, res) {
	var app = req.app;
	var fs = require('fs');
	var configurator = req.antlers_functions.get_config();
	var sess = req.session;
	var helpers = req.handlebars.helpers;
	var sess_array = get_session_array(sess);

	// get the themes array
	var themes = fs.readdirSync("public/themes");

	// override the default layout and view directory
	set_admin_view(app);

	res.render('admin_settings', {
		"config": configurator,
		title: 'Admin - Settings',
		"message": sess_array["message"],
		"message_type": sess_array["message_type"],
		"themes": themes,
		helpers: helpers,
		'session': req.session
	});
});

// render the settings view
router.get('/navigation', restrict, function(req, res) {
	var app = req.app;
	var db = req.db;
	var configurator = req.antlers_functions.get_config();
	var sess = req.session;
	var helpers = req.handlebars.helpers;
	var sess_array = get_session_array(sess);

	// override the default layout and view directory
	set_admin_view(app);

	// get the navigation links from the db ordering by the "nav_order" field
	db.navigation.find({}).sort({ "nav_order": 1 }).exec(function (err, navigation){
		res.render('admin_navigation', {
				"config": configurator,
				title: 'Admin - Navigation',
				"message": sess_array["message"],
				"message_type": sess_array["message_type"],
				helpers: helpers,
				"session": req.session,
				navigation: navigation
		});
	});
});

// This adds a new navigation menu item
router.post('/navigation_add_new', restrict, function(req, res) {
	var db = req.db;

	db.navigation.count({}, function (err, count) {
		var new_nav = {
			 nav_menu: req.body.nav_menu,
			 nav_link: req.body.nav_link,
			 nav_order: count
		};

		db.navigation.insert(new_nav, function (err, new_rec) {
			res.redirect('/admin/navigation');
		});
	});
});

// This deletes and existing menu item
router.get('/navigation/delete/:id', restrict, function(req, res) {
	var db = req.db;
	db.navigation.remove({ _id: req.params.id }, {}, function (err, numRemoved) {
		res.redirect('/admin/navigation');
	});
});

// this saves the values of an existing navigation menu. Eg: Update the menu title or the URL location
router.post('/navigation_save_values', restrict, function(req, res) {
	var db = req.db;
	var nav_id = req.body.nav_id;
	var nav_menu = req.body.nav_menu;
	var nav_link = req.body.nav_link;

	db.navigation.update({_id: nav_id},{$set:{
			nav_menu: nav_menu,
			nav_link: nav_link
		}}, function (err, numReplaced) {
			res.redirect('/admin/navigation');
	});
});

// We call this via a Ajax call to save the order from the sortable list
router.post('/navigation_save_order', restrict, function(req, res) {
	var db = req.db;
	for (var i = 0; i < req.body.nav_id.length; i++) {
		db.navigation.update({_id: req.body.nav_id[i] },{$set:{
				nav_order: i
			}}, function (err, numReplaced) {
		});
	}
});

router.get('/media', restrict, function(req, res) {
	var app = req.app;
	var sess = req.session;
	var sess_array = get_session_array(sess);
	var configurator = req.antlers_functions.get_config();
	var db = req.db;
	var helpers = req.handlebars.helpers;
	var fs = require('fs');

	// get the media from DB
	db.media.find({}).sort({ "image_date": -1 }).exec(function (err, media){
		res.render('admin_media',
		{
			title: 'Admin - Media',
			"config": configurator,
			helpers: helpers,
			"media": media,
			"message": sess_array["message"],
			"message_type": sess_array["message_type"],
			"session": req.session
		});
	});
});

// removes any media from the db and the file on disk
router.get('/delete_media/:id', restrict, function(req, res) {
	var db = req.db;
	var fs = require('fs');

	db.media.findOne({_id: req.params.id}).exec(function (err, media){
		fs.unlink('public/user_content/' + media.media_name, function (err) {
			db.media.remove({ _id: req.params.id }, {}, function (err, numRemoved) {
				req.session.message = "Media successfully deleted";
				req.session.message_type = "success";
				res.redirect('/admin/media');
			});
		});
	});
});

// updates the title associated with the media object
router.post('/edit_media', restrict, function(req, res) {
	var db = req.db;
	db.media.update({_id: req.body.media_id },{$set:{
											media_title: req.body.frm_media_title
								    }}, function (err, numReplaced) {
		req.session.message = "Media updated";
		req.session.message_type = "success";
		res.redirect('/admin/media/');
	});
});

// upload the file(s)
router.post('/upload_media', restrict, function(req, res) {
	var db = req.db;
	var fs = require('fs');
	var url = require('url') ;
	var media_title = req.body.media_title;

	// if a file has been selected we upload it
	if(req.files.media_upload){
		var files = [].concat(req.files.media_upload);
		for(var x = 0; x < files.length; x++){
			file = files[x];
			var source = fs.createReadStream(file.path);
			var media_type = file.mimetype.split("/")[0];
			var dest = fs.createWriteStream("public/user_content/" + file.originalname);
			var media_size = Math.round(file.size / 1024) + " kb";

			var db_media = {
			   	 media_title: media_title
			   , media_name: file.originalname
			   , media_url: "/user_content/" + file.originalname
			   , media_date: new Date()
			   , media_size: media_size
			   , media_type: media_type
		  	};

			// insert into the DB
		  	db.media.insert(db_media, function (err, newMedia) {});

			// save the new file
			source.pipe(dest);
			source.on("end", function() {});

			// delete the temp file.
			fs.unlink(file.path, function (err) {});
		}

		req.session.message = "Media uploaded successfully";
		req.session.message_type = "success";
		return res.redirect('/admin/media');
	}
});

// save the post to the DB
router.post('/savepost', restrict, function(req, res) {
	var db = req.db;
	var moment = req.moment;
	var configurator = req.antlers_functions;

	// validate the post_title input data. It is required for all posts
	if(req.body.frm_post_title == ""){
		req.session.message = "Post title is required.";
		req.session.message_type = "danger";

		//Save the form values into the session to avoid loss
		req.session.post_title = req.body.frm_post_title;
		req.session.post_body = req.body.frm_post_body;
		req.session.post_tags = req.body.frm_post_tags;
		req.session.post_meta_title = req.body.frm_meta_title;
		req.session.post_meta_description = req.body.frm_meta_description;
		req.session.post_meta_image = req.body.frm_meta_image;

		if(req.body.frm_save_type == "Edit Post"){
			res.redirect('/admin/editor/' + req.body.frm_post_id);
		}else{
			res.redirect('/admin/editor/new');
		}
		return;
	}

	// validate the post publish date input data. It is required for all posts
	if(req.body.frm_datetimepicker == ""){
		req.session.message = "Post date is required.";
		req.session.message_type = "danger";

		//Save the form values into the session to avoid loss
		req.session.post_title = req.body.frm_post_title;
		req.session.post_body = req.body.frm_post_body;
		req.session.post_tags = req.body.frm_post_tags;
		req.session.post_meta_title = req.body.frm_meta_title;
		req.session.post_meta_description = req.body.frm_meta_description;
		req.session.post_meta_image = req.body.frm_meta_image;

		if(req.body.frm_save_type == "Edit Post"){
			res.redirect('/admin/editor/' + req.body.frm_post_id);
		}else{
			res.redirect('/admin/editor/new');
		}
		return;
	}

	// validate the post_body input data. It is required for all posts
	if(req.body.frm_post_body == ""){
		req.session.message = "Post body is required.";
		req.session.message_type = "danger";

		//Save the form values into the session to avoid loss
		req.session.post_title = req.body.frm_post_title;
		req.session.post_body = req.body.frm_post_body;
		req.session.post_tags = req.body.frm_post_tags;
		req.session.post_meta_title = req.body.frm_meta_title;
		req.session.post_meta_description = req.body.frm_meta_description;
		req.session.post_meta_image = req.body.frm_meta_image;

		if(req.body.frm_save_type == "Edit Post"){
			res.redirect('/admin/editor/' + req.body.frm_post_id);
		}else{
			res.redirect('/admin/editor/new');
		}
		return;
	}

	// check if the static page is checked or not
	if(req.body.frm_static_page != "on"){
		req.body.frm_static_page = "off";
	}

	// set the DB fields
	var db_values = {
		$post_title: req.body.frm_post_title,
		$post_title_clean: clean_post_title(req.body.frm_post_title),
		$post_body: req.body.frm_post_body,
		$post_owner: req.session.user,
		$post_tags: req.body.frm_post_tags,
		$post_date: moment(req.body.frm_datetimepicker, 'DD/MM-YYYY HH:mm'),
		$post_status: req.body.frm_post_status,
		$post_static_page: req.body.frm_static_page,
		$post_meta_title: req.body.frm_meta_title,
		$post_meta_description: req.body.frm_meta_description,
		$post_meta_image: req.body.frm_meta_image
	};

	if(req.body.frm_save_type == "Edit Post"){
		// This is an edit of a post so it we do an update command
		db.posts.update({_id: req.body.frm_db_id },{$set:{
													post_title: db_values["$post_title"],
													post_title_clean: db_values["$post_title_clean"],
													post_body: db_values["$post_body"],
													post_owner: db_values["$post_owner"],
													post_tags: db_values["$post_tags"],
													post_date: db_values["$post_date"]["_d"],
													post_status: db_values["$post_status"],
													post_static_page: db_values["$post_static_page"],
													post_meta_title: db_values["$post_meta_title"],
													post_meta_description: db_values["$post_meta_description"],
													post_meta_image: db_values["$post_meta_image"],
													post_id: Number(req.body.frm_post_id)
											  }}, function (err, numReplaced) {
			db.posts.persistence.compactDatafile();
			
			// write updated sitemap
			configurator.write_sitemap(db);
			
			if(err) {
				if(err.errno == '19')
				{
					req.session.message = "Duplicate post title. Please change post title";
					req.session.message_type = "danger";
					return res.redirect('/admin/editor/' + req.body.frm_post_id);
				}
			} else {
				req.session.message = "Post successfully updated";
				req.session.message_type = "success";
				req.session.post_title = req.body.frm_post_title;
				req.session.post_body = req.body.frm_post_body;
				req.session.post_tags = req.body.frm_post_tags;
				req.session.post_status = req.body.frm_post_status;
				return res.redirect('/admin/editor/' + req.body.frm_post_id);
			}
		});
	}else{
		// This is a new post and should be inserted
		var new_post_id = 0;
		db.posts.findOne({}).sort({ "post_id": -1 }).exec(function (err, doc){
			// get the next logical post_id
			if(doc == null){
				new_post_id = 1;
			}else{
				new_post_id = Number(doc.post_id) + 1;
			}
			var doc = { "post_id": Number(new_post_id)
				   , post_title: db_values["$post_title"]
				   , post_title_clean: db_values["$post_title_clean"]
				   , post_body: db_values["$post_body"]
				   , post_owner: db_values["$post_owner"]
				   , post_tags: db_values["$post_tags"]
				   , post_date: db_values["$post_date"]["_d"]
				   , post_status: db_values["$post_status"]
				   , post_static_page: db_values["$post_static_page"]
				   , post_meta_title: db_values["$post_meta_title"]
				   , post_meta_description: db_values["$post_meta_description"]
				   , post_meta_image: db_values["$post_meta_image"]
			};

			// check to see if post ID is existing
			db.posts.count({"post_title": db_values["$post_title"]}, function (err, post_count) {
				// if there is a post we don't want to discard so we set a duplicate message to the title and redirect
				// the user back the editor to change straight away
				if(post_count > 0){
					doc["post_title"] = doc["post_title"] + " - THIS IS A DUPLICATE POST TITLE AND NEEDS CHANGING";
					doc["post_title_clean"] = doc["post_title_clean"] + "-THIS-IS-A-DUPLICATE-POST-TITLE-AND-NEEDS-CHANGING";
				}
				// commit to the db
				db.posts.insert(doc, function (err, newDoc) {
					// write sitemap
					configurator.write_sitemap(db);
					
					if(post_count > 0){
						req.session.message = "Duplicate post title. Please change.";
						req.session.message_type = "danger";
						return res.redirect('/admin/editor/' + new_post_id);
					 }else{
						req.session.message = "Post successfully added";
						req.session.message_type = "success";
					}
					return res.redirect('/admin/preview/' + new_post_id);
				});
			});
		});
	}
});

// shows the login failed message
function render_login_fail(config, req, res){
	// overide the default layout
	var app = req.app;

	app.locals.settings.views = "views";
	app.locals.layout = "admin_login_layout.hbs";

	// set the message in the session
	req.session.message = "Login failed. Please check your email and password and try again.";
	req.session.message_type = "danger";

	// render our view
	res.render('admin_login', {"message": req.session.message, "message_type": req.session.message_type, title: 'Admin - Login' });
}

// gets the session messages, sets them to a local array and clears the session variables. This essentially
// allows for flash messaging on the pages
function get_session_array(sess){
	// Check if a value is in the session. If so, clear the session
	// value and assign to a local variable which is passed to our view
	var sess_array = {};
	if(sess.post_title){
		sess_array["post_title"] = sess.post_title;
		sess.post_title = null;
	}
	if(sess.post_body){
		sess_array["post_body"] = sess.post_body;
		sess.post_body = null;
	}
	if(sess.post_tags){
		sess_array["post_tags"] = sess.post_tags;
		sess.post_tags = null;
	}
	if(sess.post_status){
		sess_array["post_status"] = sess.post_status;
		sess.post_status = null;
	}
	if(sess.post_meta_title){
		sess_array["post_meta_title"] = sess.post_meta_title;
		sess.post_meta_title = null;
	}
	if(sess.post_meta_description){
		sess_array["post_meta_description"] = sess.post_meta_description;
		sess.post_meta_description = null;
	}
	if(sess.post_meta_image){
		sess_array["post_meta_image"] = sess.post_meta_image;
		sess.post_meta_image = null;
	}
	if(sess.message){
		sess_array["message"] = sess.message;
		sess.message = null;
	}
	if(sess.message_type){
		sess_array["message_type"] = sess.message_type;
		sess.message_type = null;
	}

	return sess_array;
}

// checks if session exists and displays "Access denied" message and redirects to login
function restrict(req, res, next) {
	if (req.session.user){
		next();
	}else{
		req.session.message = "Access denied";
		req.session.message_type = "danger";
		res.redirect('/admin/login');
	}
}

// gets the file extension of a given file name
function getExtension(filename) {
	var path = require('path');
    var ext = path.extname(filename||'').split('.');
    return ext[ext.length - 1];
}

function get_all_posts(req, res, message, message_type) {
	var db = req.db;
	var app = req.app;
	var config = req.antlers_functions.get_config();
	var marked = req.marked;
	var helpers = req.handlebars.helpers;

	db.posts.find({}).sort({post_date: 1}).exec(function (err, posts) {
		// overide the default layout
		set_admin_view(app);

		res.render('admin', { "config": config, "message": message, "message_type": message_type, "posts": posts, title: 'Admin - Posts', helpers: helpers, "session": req.session });
	});
}

function set_admin_view(app){
	var path = require('path');

	app.locals.layout = "admin_layout.hbs";
	var view_path = path.join(__dirname, '/../views/');
	app.set('views',  view_path);
}

// cleans the post title by removing any invalid characters
function clean_post_title(title)
{
	title = title.replace(/ /g,"-"); // replace spaces with dashes
	title = title.replace(/[$&+,/;:=?@"<\\>#%{}|^~\[\]']/g,""); // replace spaces with dashes
	return title;
}

module.exports = router;
