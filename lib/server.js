var http = require('http');
var url = require('url');
var request = require('request');
var httpProxy = require('http-proxy');
var rangeParser = require('range-parser')
var pump = require('pump')
var util = require('./util');
var ram = require('./ram');
var proxyHandler = require('./proxy');
var config = require('../config');

var proxy = httpProxy.createProxyServer({});
proxy.on('proxyRes', proxyHandler.handler)
ram.runTimer(24 * 3 * 3600 * 1000, 60 * 1000); //过期时间三天

function onProxy(req, res){
    var host = req.headers.host, ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    proxy.web(req, res, { target: 'http://' + host });
    util.logger("From the remote data") 
}

function onHttp(req, res){
    var link = config.REMOTE_HOST + req.url
    pump(request({
        url: link,
        headers:{'Range': req.headers['range']}
    }).on("response", function(response){
        if(!response.headers["content-range"]) {
            var length = response.headers["content-length"];
            response.headers["content-range"] = "bytes 0-" + length + "/" + length
        }
        proxyHandler.process(req.url, response, res)
    }), res)
    util.logger("From the remote data") 
}

function handler(link, req, res, onRemote){
    if (req.headers.origin) res.setHeader('Access-Control-Allow-Origin', req.headers.origin)
    var id = util.md5(url.parse(link).path)
    var cacheFile = ram.get(id);
    if(!cacheFile) return onRemote(req, res)
    try{
        util.stat(cacheFile.getFilePath(), function(file){
            if(file == null){
                ram.delete(id)
                return onRemote(req, res)
            }else{
                var range = req.headers.range && rangeParser(cacheFile.length, req.headers.range)[0]
                if(range && (range.start > cacheFile.mateDataSize || range.start > file.length )){
                    return onRemote(req, res)
                }else{
                    if (!range) range = {start:0, end:cacheFile.cacheLength}
                    res.setHeader('Accept-Ranges', 'bytes')
                    res.setHeader('Content-Type', 'video/mp4')
                    res.statusCode = 206
                    res.setHeader('Content-Length', cacheFile.cacheLength - range.start + 1)
                    res.setHeader('Content-Range', 'bytes ' + range.start + '-' + cacheFile.cacheLength + '/' + cacheFile.length)

                    var size = 0;
                  
                    file.createReadStream(range).on("data", function(chunk){
                        size += chunk.length
                        res.write(chunk)
                        if(size >= cacheFile.cacheLength){
                            request({
                                url: link,
                                headers:{'Range': 'bytes='+(cacheFile.cacheLength+1)+'-'}
                            }).on("response", function(response){
                                response.on("data", function(nextChunk){
                                    res.write(nextChunk)
                                })
                                response.on("close", function(){
                                    res.end();
                                })
                            }).on("error", function(error){
                                res.end();
                            })
                        }
                    })
                    util.logger("From the local cache")
                }
            } 
        })
    }catch(e){
        res.end()
        util.error(e)
    }
}

module.exports.http = function(req, res){
    var link = config.REMOTE_HOST + req.url 
    handler(link, req, res, onHttp)
}

module.exports.proxy = function(req, res){
    handler(req.url, req, res, onHttp)
}

/*module.exports.http = function(req, res){
    var link = config.REMOTE_HOST + req.url
    if (req.headers.origin) res.setHeader('Access-Control-Allow-Origin', req.headers.origin)

    var id = util.md5(req.url)
    var cacheFile = ram.get(id);
    if(!cacheFile) return onHttp(req, res)
    try{
        util.stat(cacheFile.getFilePath(), function(file){
            if(file == null){
                ram.delete(id)
                return onHttp(req, res)
            }else{
                var range = req.headers.range && rangeParser(cacheFile.length, req.headers.range)[0]
                if(range && (range.start > cacheFile.mateDataSize || range.start > file.length )){
                    return onHttp(req, res)
                }else{
                    if (!range) range = {start:0, end:cacheFile.cacheLength}
                    res.setHeader('Accept-Ranges', 'bytes')
                    res.setHeader('Content-Type', 'video/mp4')
                    res.statusCode = 206
                    res.setHeader('Content-Length', cacheFile.cacheLength - range.start + 1)
                    res.setHeader('Content-Range', 'bytes ' + range.start + '-' + cacheFile.cacheLength + '/' + cacheFile.length)

                    var size = 0;
                  
                    file.createReadStream(range).on("data", function(chunk){
                        size += chunk.length
                        res.write(chunk)
                        if(size >= cacheFile.cacheLength){
                            request({
                                url: link,
                                headers:{'Range': 'bytes='+(cacheFile.cacheLength+1)+'-'}
                            }).on("response", function(response){
                                response.on("data", function(nextChunk){
                                    res.write(nextChunk)
                                })
                                response.on("close", function(){
                                    res.end();
                                })
                            }).on("error", function(error){
                                res.end();
                            })
                        }
                    })
                    util.logger("From the local cache")
                }
            } 
        })
    }catch(e){
        res.end()
        util.error(e)
    }
}

module.exports.proxy = function(req, res){
    if (req.headers.origin) res.setHeader('Access-Control-Allow-Origin', req.headers.origin)

    var id = util.md5(req.url)
    var cacheFile = ram.get(id);
    if(!cacheFile) return onProxy(req, res)
    try{
        util.stat(cacheFile.getFilePath(), function(file){
            if(file == null){
                ram.delete(id)
                return onProxy(req, res)
            }else{
                var range = req.headers.range && rangeParser(cacheFile.length, req.headers.range)[0]
                if(range && (range.start > cacheFile.mateDataSize || range.start > file.length )){
                    return onProxy(req, res)
                }else{
                    if (!range) range = {start:0, end:cacheFile.cacheLength}
                    res.setHeader('Accept-Ranges', 'bytes')
                    res.setHeader('Content-Type', 'video/mp4')
                    res.statusCode = 206
                    res.setHeader('Content-Length', cacheFile.cacheLength - range.start + 1)
                    res.setHeader('Content-Range', 'bytes ' + range.start + '-' + cacheFile.cacheLength + '/' + cacheFile.length)

                    var size = 0;
                  
                    file.createReadStream(range).on("data", function(chunk){
                        size += chunk.length
                        res.write(chunk)
                        if(size >= cacheFile.cacheLength){
                            request({
                                url: req.url,
                                headers:{'Range': 'bytes='+(cacheFile.cacheLength+1)+'-'}
                            }).on("response", function(response){
                                response.on("data", function(nextChunk){
                                    res.write(nextChunk)
                                })
                                response.on("close", function(){
                                    res.end();
                                })
                            }).on("error", function(error){
                                res.end();
                            })
                        }
                    })
                    util.logger("From the local cache")
                }
            } 
        })
    }catch(e){
        res.end()
        util.error(e)
    }
}*/

/*module.exports.http = function(req, res){
    return 
    if (req.headers.origin) res.setHeader('Access-Control-Allow-Origin', req.headers.origin)

    var id = util.md5(req.url)
    var cacheFile = ram.get(id);
    if(!cacheFile) return onHttp(req, res)
    util.stat(cacheFile.getFilePath(), function(file){
        if(file == null){
            ram.delete(id)
            return onHttp(req, res)
        }else{
            var range = req.headers.range && rangeParser(cacheFile.length, req.headers.range)[0]
            if(range && (range.start > cacheFile.mateDataSize || range.start > file.length )){
                return onHttp(req, res)
            }else{
                res.setHeader('Accept-Ranges', 'bytes')
                res.setHeader('Content-Type', 'video/mp4')
                if (!range) {
                    res.setHeader('Content-Length', cacheFile.length)
                    if (req.method === 'HEAD') return res.end()
                    pump(file.createReadStream(), res)
                }else{
                    res.statusCode = 206
                    res.setHeader('Content-Length', cacheFile.cacheLength - range.start + 1)
                    res.setHeader('Content-Range', 'bytes ' + range.start + '-' + cacheFile.cacheLength + '/' + cacheFile.length)
                    pump(file.createReadStream(range), res, function(error){
                        util.error(error)
                    })
                }
                util.logger("From the local cache")
            }
        } 
    })
}*/