
var Weibo = require('../index').Weibo;
var web  = require('quickweb');

w = new Weibo({
	app_key:	3740231829,
	app_secret:	'2c05e5110335d337136949233569f669'
});
//w.listen(80);
/*
w.on('oauth', function (d) {
	console.log(d);
	d.get('account/get_uid', {}, function (err, data) {
		console.log(arguments);
	});
});
*/

web.createHttp();
web.use(w.middleWare(function (user, req, res, next) {
	console.log(user);
	var friends_timeline_ids = user.api('GET', 'statuses/friends_timeline/ids');
	console.log(friends_timeline_ids.toString());
	//user.get('statuses/friends_timeline/ids', {}, function (err, data) {
	friends_timeline_ids(function (err, data) {
		console.log(arguments);
		if (err)
			res.sendJSON(err);
		else
			res.sendJSON(data);
	});
}));

