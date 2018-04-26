// renders the pages beyond the initial index page

var express = require('express');
var url = require('url');
var router = express.Router();

// if no page id is set we redirect to page 1
router.get('/', function(req, res) {
	res.redirect('/page/1');
});

/* GET home page. */
router.get('/:id', function(req, res) {
	var db = req.db;
	var marked = req.marked;
	var moment = req.moment;
	var app = req.app;
	var antlers_functions = req.antlers_functions;
	var helpers = req.handlebars.helpers;
	var configurator = req.antlers_functions.get_config();
	var current_page = 0;

	// get posts per page config value
	var posts_per_page = configurator.blog_posts_per_page;

	// get the limit of pagination links either side of the current page.
	// ensures lots of pages doesn't create excessive pagination numbered links
	var max_pagination_links = configurator.blog_pagination_links;

	// get the theme from the settings
	var theme = configurator.blog_theme;

	// if the posts per page is not an integer we use 5 as default
	if(isInt(posts_per_page) == false){
		posts_per_page = 5;
	}

	// set the current page if one exists
	if(req.params.id){
		current_page = parseInt(req.params.id);
	}

	// holds the pagination array which is displayed in the view
	var pagination_array = [];

	db.posts.find({post_date: {$lte: moment()},post_status: '1', post_static_page: 'off'}).exec(function(err, post_count) {
		var start_page = (current_page - 1) * posts_per_page;
		var total_pages = Math.ceil(post_count.length / posts_per_page);

		// check if the current_page is outside of the total pages and redirect to page 1.
		if(current_page < 1 || current_page > total_pages){
			res.redirect('/page/1');
		}

		db.posts.find({post_date: {$lte: moment()},post_status: '1', post_static_page: 'off'}).skip(parseInt(start_page)).limit(parseInt(posts_per_page)).sort({ post_date: -1 }).exec(function(err, posts) {
		//db.posts.find({}).skip(3).limit(parseInt(posts_per_page)).sort({}).exec(function(err, posts) {
			// fix the post array
			for (var post in posts){
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
			res.render('index', {
				"config": configurator,
				"posts": posts,
				helpers: helpers,
				"total_pages": total_pages,
				"pagination_array": pagination_array,
				"theme": theme,
				"is_logged_on": is_logged_on(req),
				full_url: req.protocol + '://' + req.get('host') + req.originalUrl
			});
		});
	});
});

// Returns true/false if the variable is an integer
function isInt(value) {
  return !isNaN(value) &&
          parseInt(Number(value)) == value &&
          (value + "").replace(/ /g,'') !== "";
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
