/* global config */
var antlers_functions = require('./routes/antlers-functions');
var bcrypt = require('bcrypt-nodejs');
var bodyParser = require('body-parser');
var compression = require('compression');
var cookieParser = require('cookie-parser');
var ejs = require('ejs');
var engine = require('ejs-locals');
var express = require('express');
var favicon = require('serve-favicon');
var fs = require('fs');
var handlebars = require('express-handlebars');
var logger = require('morgan');
var marked = require('marked');
var moment = require('moment');
var multer = require('multer');
var nedb = require('nedb');
var path = require('path');
var session = require('express-session');
var string = require('string');
var nedb_store = require('nedb-session-store')(session);

// load the db
var db = new nedb();
db = {};
db.posts = new nedb({ filename: 'data/posts.db', autoload: true });
db.users = new nedb({ filename: 'data/users.db', autoload: true });
db.media = new nedb({ filename: 'data/media.db', autoload: true });
db.navigation = new nedb({ filename: 'data/navigation.db', autoload: true });

// markdown stuff
marked.setOptions({
	renderer: new marked.Renderer()
});

// require the routes
var routes = require('./routes/index');
var page = require('./routes/page');
var admin = require('./routes/admin');
var tag = require('./routes/tag');
var rss = require('./routes/rss');


var app = express();

// view engine setup
app.engine('hbs', handlebars({ extname: 'hbs', defaultLayout: 'layout.hbs' }));
app.set('view engine', 'hbs');

// helpers for the handlebar templating platform
handlebars = handlebars.create({
    helpers: {
		format_date: function (date) { return moment(date).format("DD/MM/YYYY"); },
		custom_date: function (date, format) { return moment(date).format(format); },
		current_year: function () { return moment().format("YYYY"); },
		trimstring: function (len, str) { return str.substring(0,len); },
		trim: function (str) { return str.trim(); },
		trim_and_strip: function (len, str) { return string(str.substring(0, len)).stripTags().s },
		post_status_text: function (status) { if (status === '0') { return "Draft"; } else { return "Published"; } },
		post_status_class: function (status) { if (status === '0') { return "danger"; } else { return "success"; } },
		get_tag_array: function (str_tags) { var tags = str_tags.split(','); var tags_array = []; for (var tag in tags) { if (tags[tag].trim() != "") { tags_array.push(tags[tag].trim()); } } return tags_array; },
		times: function (n, block) { var accum = ''; for (var i = 1; i < n; ++i)accum += block.fn(i); return accum; },
		url_encode: function (url) { url = url.replace(/ /g, "-"); url = url.replace(/#/g, ""); return url; },
		tag_encode: function (url) { url = url.replace(/ /g, "%20"); url = url.replace(/#/g, ""); return url; },
		ifCond: function (v1, operator, v2, options) {
			switch (operator) {
				case '==':
					return (v1 == v2) ? options.fn(this) : options.inverse(this);
				case '!=':
					return (v1 != v2) ? options.fn(this) : options.inverse(this);
				case '===':
					return (v1 === v2) ? options.fn(this) : options.inverse(this);
				case '<':
					return (v1 < v2) ? options.fn(this) : options.inverse(this);
				case '<=':
					return (v1 <= v2) ? options.fn(this) : options.inverse(this);
				case '>':
					return (v1 > v2) ? options.fn(this) : options.inverse(this);
				case '>=':
					return (v1 >= v2) ? options.fn(this) : options.inverse(this);
				case '&&':
					return (v1 && v2) ? options.fn(this) : options.inverse(this);
				case '||':
					return (v1 || v2) ? options.fn(this) : options.inverse(this);
				default:
					return options.inverse(this);
			}
		},
	}
});

// Control cache headers over content
app.use(function (req, res, next) {
	var cache_files = [".css", ".js", ".jpg", ".jpeg", ".png", ".ico", ".gif"];
	var no_cache_files = [".html", ".htm"];
	var file_ext = path.extname(req.url);
	if (cache_files.indexOf(file_ext) > -1) {
		res.set({
			'Cache-Control': 'public, max-age=3600',
			'Connection': 'keep-alive',
			'Last-Modified': new Date()
		});
    }
	if (no_cache_files.indexOf(file_ext) > -1) {
		res.set({
			'Cache-Control': 'public, max-age=0'
		});
	}
    next();
});

// environment setup
app.set('port', process.env.PORT || 3333);
app.use(compression());
app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(multer({ dest: './public/tmp/' }))
app.use(bodyParser.urlencoded())
app.use(cookieParser('5TOCyfH3HuszKGzFZntk'));
app.use(session({
    resave: false,
    saveUninitialized: true,
    secret: "pAgGxo8Hzg7PFlv1HpO8Eg0Y6xtP7zYx",
    cookie: {
      path: '/',
      httpOnly: true,
      maxAge: 60 * 10000
    },
    store: new nedb_store({
      filename: 'data/sessions.db'
    })
}));

// serving static content
app.use(express.static(path.join(__dirname, 'public')));

// Make stuff accessible to our router
app.use(function (req, res, next) {
	req.db = db;
	req.antlers_functions = antlers_functions;
	req.marked = marked;
	req.moment = moment;
	req.bcrypt = bcrypt;
	req.handlebars = handlebars;
	req.string = string;
	next();
});

// setup the routes
app.use('/page/', page);
app.use('/admin/', admin);
app.use('/tag/', tag);
app.use('/rss/', rss);
app.use('/', routes);

// write out sitemap
antlers_functions.write_sitemap(db, antlers_functions.get_config());

// catch 404 and forwarding to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function (err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

// Lift the app
app.listen(app.get('port'), function () {
	console.log('Express server listening on port ' + app.get('port'));
});

module.exports = app;
