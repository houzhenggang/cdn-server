var fs = require("fs")
var url = require("url")
var util = require('./util');
var ram = require('./ram');
var config = require('../config');

module.exports.handler = function(proxyRes, req, res, options){
    try{
        module.exports.process(req.url, proxyRes, res)
    }catch(e){
        util.error(e)
    }
}

module.exports.process = function(link, response, res, cb){
    var id = util.md5(url.parse(link).path)
    var size = 0;
    var fd = null;
    var first = false;
    if(!cb) cb = function(){}
    if(!util.isVideo(response.headers["content-type"])){
        return cb;
    }

    var mateDataSize = config.MATEDATA_DEFAULT_SIZE;
    var cacheFile = ram.create(id, {
        link: link,
        path: config.MATEDATA_SAVE_DIR + id,
        length: util.getLength(response.headers),
        cacheLength: 0,
        mateDataSize: mateDataSize,
        createTime: new Date().getTime(),
    })
    response.on('data',function(chunk){
        try{
            var start = util.getRangeStart(response.headers["content-range"])
            /*if(start == 0){
                if(first == false){
                    first = true
                    mateDataSize = util.getMateDataSize(chunk) // + config.MATEDATA_OVER_SIZE
                    cacheFile.setMateDataSize(mateDataSize)
                }
            }
            if(size <= mateDataSize && start <= mateDataSize){
                if(fd == null)  fd = fs.openSync(cacheFile.getFilePath(), "w+")
                fs.writeSync(fd, new Buffer(chunk), 0, chunk.length, size);
                size += chunk.length;
            }
            if(size >= mateDataSize){
                cacheFile.setCacheLength(size)
                ram.add(cacheFile)
                fd = closeFd(fd)
                cb()
            }*/
            if(start == 0){
                if(first == false){
                    first = true
                    mateDataSize = util.getMateDataSize(chunk) // + config.MATEDATA_OVER_SIZE
                    cacheFile.setMateDataSize(mateDataSize)
                }
                if(size <= mateDataSize){
                    if(fd == null)  fd = fs.openSync(cacheFile.getFilePath(), "w+")
                    fs.writeSync(fd, new Buffer(chunk), 0, chunk.length, size);
                    size += chunk.length;
                }else{
                    cacheFile.setCacheLength(size)
                    ram.add(cacheFile)
                    fd = closeFd(fd)
                    cb()
                }
            }
        }catch(e){
            cacheFile = null
            fd = closeFd(fd)
            ram.delete(id)
            util.error(e)
            cb()
        }

    });

    res.on("close", function(){
        fd = closeFd(fd)
        cb()
    });
}

function closeFd(fd){
    if(fd != null){
        fs.closeSync(fd);
    }
    return null
}