/**
 *  新浪微博V2 API SDK
 * @author 老雷<leizongmin@gmail.com>
 */
 
var http = require('http')
  , https = require('https')
  , url = require('url')
  , querystring = require('querystring')
  , path = require('path')
  , util = require('util')
  , events = require('events');
  

/**
 * 创建应用
 *
 * @param {object} options 选项
 */
var Weibo = function (options) {
  this.init_options();
  if (options)
    for (var i in options)
      this.options[i] = options[i];
  var u = url.parse(this.options.api_base);
  this.options.api_host = u.host;
  this.options.api_pathname = u.pathname || '';
  this.options.api_port = u.port;
  this.options.callback_url_path = 
    url.parse(this.options.callback_url).pathname;
}
util.inherits(Weibo, events.EventEmitter);

/** 默认配置 */
Weibo.prototype.init_options = function () {
  // 应用配置
  this.options = 
      { oauth_url:           '/oauth'                    // 本地获取授权url
      , callback_url:        'http://127.0.0.1/callback' // 回调地址
    
      , api_base:            'https://api.weibo.com'     // 新浪微博API地址
      , oauth2_authorize:    '/oauth2/authorize'         // 请求授权页面
      , oauth2_access_token: '/oauth2/access_token'      // 请求授权token
      }
}

/**
 * 监听（一般用于测试）
 *
 * @param {int|http.Server} port 端口或http实例
 */
Weibo.prototype.listen = function (port) {
  if (isNaN(port))
    return this.listen_http(port);
  else
    return this.listen_port(port);
}
Weibo.prototype.listen_http = function (server) {
  var listener = this.httpListener.bind(this);
  server.on('request', listener);
  return server;
}
Weibo.prototype.listen_port = function (port) {
  this.httpListener.refuse = true;
  var listener = this.httpListener.bind(this);
  var server = http.createServer(listener);
  server.listen(port);
  return server;
}

/**
 * 处理客户端请求
 *
 * @param {ServerRequest} request实例
 * @param {ServerResponse} response实例
 * @param {function} 回调函数  授权成功时第一个参数为User实例，授权失败或无法
 *                             失败请求时为null
 */
Weibo.prototype.httpListener = function (request, response, callback) {
  var rurl = request.url
    , rulen = request.url.length
    , ourl = this.options.oauth_url
    , oulen = this.options.oauth_url.length
    , cburl = this.options.callback_url_path
    , cbulen = this.options.callback_url_path.length
    , options = this.options
    , self = this;
  
  // 转到申请授权页面
  if ((rurl == ourl)
   || (rulen > oulen && rurl.substr(0, oulen + 1) == ourl + '?')) {
     var request_url = options.api_base + options.oauth2_authorize + '?'
                     + 'client_id=' + options.app_key + '&response_type=code'
                     + '&redirect_uri=' + escape(options.callback_url);
     response.writeHead(302, {location: request_url});
     response.end();
  }
  
  // 授权成功后的回调
  else if (rurl.substr(0, cbulen + 1) == cburl + '?') {
    var cbdata = querystring.parse(rurl.substr(cbulen + 1));
    var params = { code:           cbdata.code
                 , client_secret:  options.app_secret
                 , grant_type:     'authorization_code'
                 , redirect_uri:   options.callback_url
                 , client_id:      options.app_key
    }
    this.request('POST', options.oauth2_access_token, params
               , function (err, data) {
      // 授权失败
      if (err) {
        // 返回一个Error实例
        var reterr = new Error(err.error_code + ' ' + err.error);
        for (var i in err)
          reterr[i] = err[i];        
        // 触发fail事件，并传递当前err信息
        self.emit('fail', reterr);  
        // 回调
        if (callback)
          callback(reterr);
        else {
          var out = '获取授权失败！\n\n';
          for (var i in err)
            out += i + ': ' + err[i] + '\n';
          response.end(out);
        }
      }
      // 授权成功
      else {
        // 返回一个User实例
        var user = new User(data, self);
        // 触发aouth事件，并传递当前User实例
        self.emit('oauth', user);
        // 回调
        if (callback)
          callback(user);
        else {
          var out = '获取授权成功：\n\n';
          for (var i in data)
            out += i + ': ' + data[i] + '\n';
          response.end(out);
        }
      }
    });
  }
  
  // 未识别的请求，如果设置了refuse标记，则直接返回404
  else if (this.httpListener.refuse === true) {
    response.writeHead(404);
    response.end();
  }
  else {
    callback(null);
  }
}

/**
 * 获取connect接口的中间件
 *
 * @param {function} callback 授权成功回调函数function
 *                            参数格式： (用户信息, req, res, next)
 */
Weibo.prototype.middleWare = function (callback) {
  var listener = this.httpListener.bind(this);
  return function (req, res, next) {
    listener(req, res, function (user) {
      // 如果返回null，则表示无法处理该请求，调用next()来传递下去
      if (user ===null)
        next();  
      // 如果成功返回一个User实例或者Error信息时，则回调，需要自己判断是否出错
      else
        callback(user, req, res, next);
    });
  }
}

/**
 * 请求API
 *
 * @param {string} method 请求方法GET|POST
 * @param {string} apiname API名称，如 user_timeline/ids
 * @param {object} params 参数
 * @param {function} callback 回调函数
 */
Weibo.prototype.request = function (method, apiname, params, callback) {
  var options = this.options;
  
  // 组装http.request()需要的参数
  method = method.toUpperCase();
  var opt= { host:    options.api_host || '127.0.0.1'
           , port:    options.api_port || 443
           , method:  method || 'GET'
           , path:    path.join(options.api_pathname, apiname)
           , headers: {}
  }
  
  // 发送请求，如果为POST或PUT，则需要设置相应的headers
  if (method == 'POST' || method == 'PUT') {
    var data = querystring.stringify(params);
    opt.headers['content-length'] = data.length;
    opt.headers['content-type'] = 'application/x-www-form-urlencoded';
    this.sendRequest(opt, data, callback);
  }
  else {
    opt.path += '?' + querystring.stringify(params);
    this.sendRequest(opt, null, callback);
  }
}

/**
 * 发送请求
 *
 * @param {object} options 选项
 * @param {Buffer|string} data 需要发送的额外数据
 * @param {function} callback 回调函数
 */
Weibo.prototype.sendRequest = function (options, data, callback) {
  var req = https.request(options, function (res) {
    var length = parseInt(res.headers['content-length']);
    var resdata = new Buffer(length);
    var datacur = 0;
    res.on('data', function (chunk) {
      if (chunk.length + datacur > resdata.length) {
        var newbuff = new Buffer(chunk.length + datacur);
        resdata.copy(newbuff, 0, 0);
        resdata = newbuff;
      }
      chunk.copy(resdata, datacur, 0);
      datacur += chunk.length;
    });
    res.on('end', function () {
      var data = JSON.parse(resdata);
      if (data.error)
        callback(data);
      else
        callback(null, data);
    });
  });
  req.on('error', function (err) {
    console.log(err.stack);
    callback({error: err.stack});
  });
  
  req.end(data);
}


/**
 * 微博用户操作
 *
 * @param {object} oauth 授权信息
 * @param {weibo} server 微博实例
 */
var User = function (oauth, server) {
  this.oauth = oauth;
  this.server = server;
}

/**
 * GET调用API
 *
 * @param {string} apiname API名称
 * @param {object} params 参数
 * @param {function} callback 回调函数
 */
User.prototype.get = function (apiname, params, callback) {
  params.source = this.server.options.app_key;
  params.access_token = this.oauth.access_token;
  this.server.request('GET', apiname + '.json', params, callback);
}

/**
 * POST调用API
 *
 * @param {string} apiname API名称
 * @param {object} params 参数
 * @param {function} callback 回调函数
 */
User.prototype.post = function (apiname, params, callback) {
  params.source = this.server.options.app_key;
  params.access_token = this.oauth.access_token;
  this.server.request('POST', apiname + '.json', params, callback);
}

/**
 * 生成调用API接口
 *
 * @param {string} method 请求方法GET|POST
 * @param {string} apiname API名称
 * @param {object} params 预加的参数
 * @return {function}
 */
User.prototype.api = function (method, apiname, params) {
  var self = this;
  params = params || {}
  // 调用时传递两个参数
  // 如：   friends_timeline_ids({count: 50}, function (err, data) { ...});
  return function (_params, callback) {
    // 如果仅有一个参数时
    if (typeof _params == 'function') {
      callback = _params;
      _params = {}
      for (var i in params)
        _params[i] = params[i];
    }
    // 有两个参数
    else {
      var nparams = {}
      for (var i in params)
        nparams[i] = params[i];
      for (var i in _params)
        nparams[i] = _params[i];
      _params = nparams;
    }
    // console.log(_params);
    self[method.toLowerCase()](apiname, _params, callback);
  }
}


// 模块输出
exports.Weibo = Weibo;
exports.User = User;