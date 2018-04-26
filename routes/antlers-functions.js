/*!
 * Antlers-functions
 * Copyright(c) 2014 mrvautin.com
 * MIT Licensed
 */

var fs = require('fs');
var moment = require('moment');

var config_array = {};

exports.get_config = function () {
	fs.exists("config.txt", function(exists) {
		if (exists) {
			var data = 	fs.readFileSync('config.txt').toString();
			var lines = data.split("\n");
			for (var i in lines) {
				if(lines[i].length > 1){
					var field = lines[i].split("~~");
					if(field[1] != undefined){
						config_array[field[0]] = field[1].replace("\n","");
					}
				}
			}
		}
	});

	return config_array;
};

exports.write_sitemap = function write_sitemap(db){
	// get the posts from the DB
	db.posts.find({}).sort({post_date: -1}).exec(function (err, posts) {
		var config = exports.get_config();
	
		// the root of your website - the protocol and the domain name with a trailing slash
		var root_path = config.blog_hostname;

		// XML sitemap generation starts here
		var priority = 0.5;
		var freq = 'monthly';
		var xml = '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';

		for (var post in posts) {
			// only published posts
			if(posts[post].post_status == "1"){
				xml += '<url>';
				xml += '<loc>'+ root_path + "/" + posts[post].post_title_clean + '</loc>';
				xml += '<lastmod>'+ moment(posts[post].post_date).format('YYYY-MM-YY') + '</lastmod>';
				xml += '<changefreq>'+ freq +'</changefreq>';
				xml += '<priority>'+ priority +'</priority>';
				xml += '</url>';
			}
		}

		xml += '</urlset>';
		// write out xml
		fs.writeFileSync("public/sitemap.xml", xml);
	});
};

exports.write_config = function (config_string) {
	fs.writeFileSync("config.txt", config_string);
};

exports.get_pagination_html = function (total_pages, current_page, page_range, posts_per_page) {

	var pagination_array = [];

	// push the previous page link
	if(current_page <= 1){
		pagination_array.push("<li class='disabled'><a href='#'>&laquo;</a></li>");
	}
	else{
		var prev_page = parseInt(current_page) - 1;
		pagination_array.push("<li><a href='/page/" + prev_page + "'>&laquo;</a></li>");
	}

	// calc the max pages to show by getting the current page and
	// calculating how many to show either side.
	var min_page = parseInt(current_page) - page_range;
	var max_page = parseInt(current_page) + page_range;

	for(var i = 1; i <= total_pages; i++)
	{
		// ensure the min page is 1 if its zero or negative
		if(min_page <= 1){
			min_page = 1;
		}
		// ensure the max page does not exceed the total pages to display
		if(max_page >= total_pages){
			max_page = total_pages;
		}

		// if the page falls within the page to display range then we display it
		if(i >= min_page && i <= max_page){
			if(i == current_page){
				pagination_array.push("<li class='active'><a href='#'>" + i + " <span class='sr-only'>(current)</span></a></li>");
			}else{
				pagination_array.push("<li><a href='/page/" + i + "'>" + i + "</a></li>");
			}
		}
	}

	// push the next page link
	if(current_page == total_pages){
		pagination_array.push("<li class='disabled'><a href='#'>&raquo;</a></li>");
	}
	else{
		var next_page = parseInt(current_page) + 1;
		pagination_array.push("<li><a href='/page/" + next_page + "'>&raquo;</a></li>");
	}

	return pagination_array;
};
