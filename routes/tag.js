var express = require('express');
var url = require('url');
var router = express.Router();

router.get('/', function(req, res) {
	res.redirect('/');
});

router.get('/:tag', function(req, res) {
	get_all_posts(req, res, req.params.tag);
});

function get_all_posts(req, res, tag) {
	var db = req.db;
	var config = req.antlers_functions.get_config();
	var marked = req.marked;
	var app = req.app;
	var helpers = req.handlebars.helpers;	
	
	// get the theme from the settings
	var theme = config.blog_theme;
	
		db.posts.find({post_tags: new RegExp(tag), post_status: '1'}).sort({post_date: -1}).exec(function (err, posts) {	
		// We store the post in markdown format and convert to HTML to render in the view and
		// also fix and trim the tags into an array
		for (var post in posts){
			posts[post].post_body = marked(posts[post].post_body); 
			posts[post].post_tags = helpers.get_tag_array(posts[post].post_tags);
		}
		
		// override the default layout
		if(theme == ""){
			theme = "default";
		}
		
		// set theme for public facing pages
		app.locals.layout = "../../public/themes/" + theme + "/layouts/layout.hbs";
		app.locals.settings.views = __dirname + "/../public/themes/" + theme + "/views/";
		
		res.render('index', { "config": config, "posts": posts, helpers: helpers, "theme": theme });
	});
}

module.exports = router;
