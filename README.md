 # 新浪微博API
 
### 1.配置应用

	var Weibo = require('weibo').Weibo;
	var User = require('weibo').User;
	
	// 初始化应用
	var app = new Weibo({
		oauth_url:				'/oauth',		// 本地获取授权url
		callback_url:		'http://127.0.0.1/callback',	// 回调地址
		
		api_base:				'https://api.weibo.com',	// 新浪微博API地址
		oauth2_authorize:		'/oauth2/authorize',		// 请求授权token
		oauth2_access_token:		'/oauth2/access_token'	// 请求授权access_token
	});
	
	
### 2.本地测试

	app.listen(80);
	
	// 授权成功
	app.on('oauth', function (user) {
		user.get('account/get_uid', {}, function (err, data) {
			console.log(arguments);
		});
	});
	
	// 在浏览器中访问 http://127.0.0.1/oauth 即可
	
	
### 3.中间件

	web.use(app.middleWare(function (user, req, res, next) {
		user.get('statuses/friends_timeline/ids', {}, function (err, data) {
			console.log(arguments);
			if (err)
				res.sendJSON(err);
			else
				res.sendJSON(data);
		});
	}));
	
	
### 4.创建一个User实例

	var user = new User({
		access_token: '2.007oigkkrgfjkklgjkfjgkjkj11124.1fd'
		expires_in: 86400,
		uid: '15123330' },
	}, app);
	
	// 可以使用GET或POST来操作
	user.get('statuses/public_timeline', {count: 50}, function (err, data) {
		// .....
	});
	
	