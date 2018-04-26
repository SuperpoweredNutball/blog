var express = require('express');
var url = require('url');
var router = express.Router();
var db = router.db;

/* GET home page. */
router.get('*', function(req, res) {
	var db = req.db;
	var marked = req.marked;
	var helpers = req.handlebars.helpers;
	var post_title = url.parse(req.url).pathname.substring(1);
	var app = req.app;
	var antlers_functions = req.antlers_functions;
	var string = req.string;

	// get the config
	var config = antlers_functions.get_config();

	// get posts per page config value
	var posts_per_page = config.blog_posts_per_page;

	// get the theme from the settings
	var theme = config.blog_theme;
	if(theme == undefined){
		theme = "default";
	}

	// if the posts per page is not an integer we use 5 as default
	if(isInt(posts_per_page) == false)
	{
		posts_per_page = 5;
	}

	// override the default layout
	if(theme == ""){
		theme = "default";
	}

	// set theme for public facing pages
	app.locals.layout = "../../public/themes/" + theme + "/layouts/post_layout.hbs";
	app.locals.settings.views = __dirname + "/../public/themes/" + theme + "/views/";

	if(post_title.length > 1){
		// get the data from the DB
		db.posts.find({post_title_clean: post_title}, function (err, post) {
			if(post.length > 0){
				// we have a record so we set the values for the view
				var post_title = post[0].post_title;
				var post_body = marked(post[0].post_body);
				var post_date = post[0].post_date;
				var post_owner = post[0].post_owner;
				var post_id = post[0].post_id;
				var post_tags = post[0].post_tags;
				var post_meta_title = post[0].post_meta_title;
				var post_meta_description = post[0].post_meta_description;
				var post_meta_image = post[0].post_meta_image;
			
				var view_type = "post";
				if(post[0].post_static_page == "on"){
					// set layout and theme for static page
					view_type = "static";
					app.locals.layout = "../../public/themes/" + theme + "/layouts/layout.hbs";
				}

				db.navigation.find({}).sort({nav_order: 1}).exec(function (err, navigation) {
					res.render(view_type, {
						"post_body": post_body,
						"config": config,
						"post_title": post_title,
						"post_date": post_date,
						"post_owner": post_owner,
						"meta_description": string(post_body.substring(0, 150)).stripTags().s,
						"post_id": post_id,
						"post_tags": helpers.get_tag_array(post_tags),
						"post_tags_meta": post_tags,
						"post_meta_title": post_meta_title,
						"post_meta_description": post_meta_description,
						"post_meta_image": post_meta_image,
						helpers: helpers,
						"is_logged_on": is_logged_on(req),
						theme: theme,
						full_url: req.protocol + '://' + req.get('host') + req.originalUrl,
						navigation: navigation
					});
				});
			}else{
				// no record is found so we render a 404
				app.locals.layout = "error_layout.hbs";
				app.locals.settings.views = __dirname + "../../views/";
				res.status(404).render('404', { title: '404 Not found' });
			}
		});
	}
	else{
		// No post found so get all posts and render the index page
		get_all_posts(req, res, posts_per_page);
	}
});

// Returns true/false if the variable is an integer
function isInt(value) {
  return !isNaN(value) &&
          parseInt(Number(value)) == value &&
          (value + "").replace(/ /g,'') !== "";
}

function get_all_posts(req, res, posts_per_page) {
	var db = req.db;
	var marked = req.marked;
	var app = req.app;
	var moment = req.moment;
	var antlers_functions = req.antlers_functions;
	var helpers = req.handlebars.helpers;
	var current_page = 1;

	// get the configs
	var config = antlers_functions.get_config();

	// get posts per page config value
	var posts_per_page = config.blog_posts_per_page;

	// get the limit of pagination links either side of the current page.
	// ensures lots of pages doesn't create excessive pagination numbered links
	var max_pagination_links = config.blog_pagination_links;

	// get the theme from the settings
	var theme = config.blog_theme;
	if(theme == undefined){
		theme = "default";
	}

	// if the posts per page is not an integer we use 5 as default
	if(isInt(posts_per_page) == false){
		posts_per_page = 5;
	}

	// holds the pagination array which is displayed in the view
	var pagination_array = [];

	db.posts.find({post_date: {$lt: moment()["_d"]},post_status: '1', post_static_page: 'off'}).exec(function(err, post_count) {
		var start_page = (current_page - 1) * posts_per_page;
		var total_pages = Math.ceil(post_count.length / posts_per_page);

		db.posts.find({post_date: {$lt: moment()},post_status: '1', post_static_page: 'off'}).skip(parseInt(start_page)).limit(parseInt(posts_per_page)).sort({ post_date: -1 }).exec(function(err, posts) {

			var keywords = "";
			// fix the post array
			for (var post in posts){
				keywords = keywords + "," + posts[post].post_tags;
				posts[post].post_body = marked(posts[post].post_body);
				posts[post].post_tags = helpers.get_tag_array(posts[post].post_tags);
			}

			// get the pagination array
			pagination_array = antlers_functions.get_pagination_html(total_pages, current_page, max_pagination_links, posts_per_page);

			// override the default layout
			if(theme == ""){
				theme = "default";
			}

			// set theme for public facing pages
			app.locals.layout = "../../public/themes/" + theme + "/layouts/layout.hbs";
			app.locals.settings.views = __dirname + "/../public/themes/" + theme + "/views/";

			// render the page
			db.navigation.find({}).sort({nav_order: 1}).exec(function (err, navigation) {
				res.render('index', {
					"config": config,
					"posts": posts,
					helpers: helpers,
					"total_pages": total_pages,
					"pagination_array": pagination_array,
					"post_tags_meta": keywords.substring(1),
					"is_logged_on": is_logged_on(req),
					theme: theme,
					base_url: req.protocol + "://" + req.headers.host,
					full_url: req.protocol + '://' + req.get('host') + req.originalUrl,
					navigation: navigation
				});
			});
		});
	});
}

// checks if user session exists
function is_logged_on(req){
	if(req.session.user){
		return "true";
	}else{
		return "false";
	}
}

module.exports = router;
