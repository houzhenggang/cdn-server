var http = require('http');
var minimist = require('minimist')
var serverHandler = require('./lib/server');
var route = require('./lib/route');
var router = require('./lib/router');
var util = require('./lib/util');
var config = require('./config');

var argv = minimist(process.argv.slice(2), {
    alias: {port: 'p'},
    "default": {
        port: config.DEFAULT_PORT
    }
});

var server = http.createServer(function(req, res){
    var ip = this.address().address;
    if(ip == "::") ip = "localhost";
    var bind = "proxy-dot.dwstatic.com"; 
    var local = ip + ":" + this.address().port;
    var host = req.headers.host, ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    switch(host){
        case "localhost":
        case "127.0.0.1":
        case local:
            router.runAction(req, res);
            break;
        case bind:
            serverHandler.http(req, res)
            break;
        default:
            serverHandler.proxy(req, res)
    }
})

server.listen(argv.port, function () {
    var ip = server.address().address;
    if(ip == "::") ip = "localhost";
    util.logger('cdn server running on port ' + server.address().port)
    util.logger('http://' + ip + ':' + server.address().port)
})