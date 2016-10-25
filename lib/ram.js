var fs = require('fs');
var util = require('./util');
var RAM = {}

module.exports.get = function(id){
    return RAM.hasOwnProperty(id) ? RAM[id] : null;
}

module.exports.create = function(id, data){
    var obj = Object.assign({
        id: id,
        link: "",
        path: "",
        length: 0,
        cacheLength: 0,
        mateDataSize: 0,
        createTime: 0,
    }, data);
    obj.setMateDataSize = function(size){
        this.mateDataSize = size
    }
    obj.getFilePath = function(){
        return this.path
    }
    obj.setCacheLength = function(size){ 
        this.cacheLength = size;
    }
    obj.destroy = function(){
        util.unlink(this.path)
    }
    return obj;
}

module.exports.add = function(obj){
    RAM[obj.id] = obj
}

module.exports.delete = function(id){
    if(RAM.hasOwnProperty(id)){
        RAM[id].destroy();
        delete RAM[id]
    }
}

module.exports.clear = function(overTime){
    for(id in RAM){
        var item = RAM[id]
        if(item.createTime + overTime < new Date().getTime()){
            module.exports.delete(id);
        }
    }
}

module.exports.runTimer = function(overTime, interval){
    setInterval(function(){
        module.exports.clear(overTime)
    }, interval);
}