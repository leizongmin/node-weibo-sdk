
var Weibo = require('../index').Weibo;
var connect  = require('connect');

w = new Weibo({
  app_key:  3740231829,
  app_secret:  '2c05e5110335d337136949233569f669'
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

var app = connect();
app.use(w.middleWare(function (user, req, res, next) {
  console.log(user);
  
  // 检查是否成功
  if (user instanceof Error) {
    res.end('出错了：' + user.stack);
    return;
  }
  
  // 测试调用API
  var timeline = user.api('GET', 'statuses/home_timeline'
                        , {count: 10, screen_name:'mybot'});
  console.log(timeline.toString());
  //user.get('statuses/friends_timeline/ids', {}, function (err, data) {
  timeline(function (err, data) {
    console.log(arguments);
    if (err)
      res.sendJSON(err);
    else
      res.sendJSON(data);
  });
}));

app.listen(80);

