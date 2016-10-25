var request = require('request')
var ram = require("./ram");
var util = require("./util");
var route = require("./router");
var proxyHandler = require('./proxy');

route.get("/clear", function(req, res){
    var overtime = req.params.get("overtime", 24 * 3600)
    ram.clear(overtime * 1000)
    res.jsonOutput({
        "message": "clear success!",
        "overtime": overtime + "s",
    });
});

route.get("/preload", function(req, res){ 
    var ret = {"message": "preload fail!"}
    var link = req.params.get("link")
    if(link){
        request(link).on("response", function(response){
            var stream = this;
            var code = response.statusCode;
            if(code == 200 || code == 206){
                try{
                    var length = response.headers["content-length"];
                    response.headers["content-range"] = "bytes 0-" + length + "/" + length
                    proxyHandler.process(link, response, res, function(){
                        stream.abort()
                        ret.message = "Success";
                        ret.link = link;
                        res.jsonOutput(ret);
                    })
                }catch(e){
                    ret.message = "Error: " + error;
                    res.jsonOutput(ret);
                }
            }else{
                ret.message = "Error: " + code + " " + response.statusMessage;
                res.jsonOutput(ret);
            }
        }).on("error", function(error){
            ret.message = "Error: " + error;
            res.jsonOutput(ret);
        })
    }else{
        res.jsonOutput(ret);
    }
});

route.get("/test", function(req, res){ 
    //res.setHeader('Accept-Ranges', 'bytes')
    //res.setHeader('Content-Type', 'video/mp4')
    var link = req.params.get("link")
    if(link){
        //require("pump")(request(link), res)
        request(link).pipe(res)  //不能设置 http://dot.dwstatic.com/c52856e8/276-1477370293155-0.mp4 和 res.setHeader('Content-Type', 'video/mp4')
    }
});


