// renders the pages beyond the initial index page

var express = require('express');
var router = express.Router();

// if no page id is set we redirect to page 1
router.get('/feed.xml', function(req, res) {
	var db = req.db;
	var app = req.app;
	var antlers_functions = req.antlers_functions;
	var helpers = req.handlebars.helpers;
	var path = require('path');

	db.posts.find({post_static_page: "off"}).sort({ post_date: -1 }).exec(function(err, posts) {
		// get the config
		var config = antlers_functions.get_config();

		// set the xml rss layout
		app.locals.layout = "rss.hbs";
		var view_path = path.join(__dirname, '/../views/');
		app.set('views',  view_path);

		res.header('Content-Type','text/xml');
		// render the page
		res.render('rss', {
			"posts": posts,
			"config": config,
			"helpers": helpers
		});
	});
});

module.exports = router;
