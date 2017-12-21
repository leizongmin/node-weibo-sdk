# 新浪微博API V2

[![Greenkeeper badge](https://badges.greenkeeper.io/leizongmin/node-weibo-sdk.svg)](https://greenkeeper.io/)

仅支持新浪微博API V2版本，通过OAuth 2.0进行授权验证

 
### 1.配置应用

    var Weibo = require('weibo').Weibo;
    var User = require('weibo').User;
  
    // 初始化应用
    var app = new Weibo({
      // 以下4项需要根据实际情况进行修改
      app_key:    3740231829,                           // 应用的APP KEY  
      app_secret:  '2c05e5110335d337136949233569f669', // app_secret
      oauth_url:   '/oauth',                              // 本地获取授权url
      // 回调地址，即新浪微博应用“授权回调页”中的地址，
      // 如果设置不正确将导致无法正常获取授权
      callback_url: 'http://127.0.0.1/callback' 
      /*
      // 以下内容可省略
      api_base:        'https://api.weibo.com',         // 新浪微博API地址
      oauth2_authorize:    '/oauth2/authorize',         // 请求授权token
      oauth2_access_token:    '/oauth2/access_token'  // 请求授权access_token
      */
    });
    
    // 监听事件，一般只用于统计获取授权情况
    // 获取授权成功
    app.on('oauth', function (user) {
      // ...
    });
    // 获取授权失败
    app.on('fail', function (err) {
      // ...
    });
  
  
### 2.本地测试

    app.listen(80);
    
    // 授权成功，返回该用户的User实例
    app.on('oauth', function (user) {
      user.get('account/get_uid', {}, function (err, data) {
        console.log(arguments);
      });
    });
  
    // 在浏览器中访问 http://127.0.0.1/oauth 即可
  
  
### 3.connect中间件接口

使用本中间件接口可以在基于connect, express, quickweb等框架的web应用中处理获取微博
授权请求。

    // 调用 Weibo.middleWare()将返回一个中间件接口函数
    // 当成功获取一个授权时，会返回该用户的User实例，如果失败则返回Error实例，
    // 需要自己判断
    web.use(app.middleWare(function (user, req, res, next) {
      // 检查是否授权成功
      if (user instanceof Error) {
        res.end('获取授权失败！' + user.stack);
      }
      // 如果成功，则可直接通过返回的User实例来进行操作
      else {
        user.get('statuses/friends_timeline/ids', {}, function (err, data) {
          console.log(arguments);
          if (err)
            res.sendJSON(err);
          else
            res.sendJSON(data);
        });
      }
    }));
  
  
### 4.创建一个User实例

用于已知用户的access_token时快速创建一个User实例，并进行各种操作。

    var user = new User({
      access_token: '2.007oigkkrgfjkklgjkfjgkjkj11124.1fd'
      uid: '15123330'
    }, app);
  
    // 可以使用GET或POST来操作，直接根据 API 名称来调用
    user.get('statuses/public_timeline', {count: 50}, function (err, data) {
      // .....
    });
    user.post('statuses/repost', {id: 123456, status:'转发微博'}, function (err, data) {
      // .....
    });
  
    // 也可以创建一个调用某API的函数（仅针对当前用户），并可设置默认参数
    var friends_timeline = user.api('GET', 'statuses/friends timeline', {count: 100});
    // 以后直接用 friends_timeline()即可
    friends_timeline(function (err, data) {
      // ...
    });
    // 或者设置参数并调用
    friends_timeline({max_id: 1234445664}, function (err, data) {
      // ...
    });
  
