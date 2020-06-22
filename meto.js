/*jslint todo: true */

var fs = require('fs');
var serial = require('serialport');
var http = require('http');

function meto(data){
    if (data.naam) { this.naam = data.naam; }
    if (data.relay) { this.relay = data.relay; }
    if (data.comm) { 
        try {
            this.comm = data.comm; 
            this.port = new serial.SerialPort(data.comm);
            var dit = this;
            var buffer = "";
            this.port.on('open', function(){
                console.log(data.comm + ' open');
                dit.port.on('data', function(data){
                    buffer += data;
                    if (buffer.indexOf('}') > -1) {
                        dit.setStatus(buffer);
                        buffer = "";
                    }
                });
            });
        } catch (exception) {
            console.log('fout tijdens openen '+this.comm+ ": " + exception);
        }
    }
}
meto.prototype = {
    onTimeout: 1000,
    offTimeout: 20 * 1000,
    status: { power: 'off' },
    setStatus: function(status) {
        console.log(this.naam + " status: " + status);
        var dit = this;
        this.status = {
            power: 'on',
            details: status.substr(2,2),
            type: status.substr(4,1),
            remaining: parseInt(status.substr(5,3),10)
        };
        //reset off timer when remaining > 0
        if (dit.status.remaining > 0) {
            if (dit.offTimer) { clearTimeout(dit.offTimer); }
        }
        console.log(this.status);
    },
    setOffTimeout: function(data) {
        var ret = 10 * 1000;
        var len = data.length;
        if (len) {
            ret = (len / 200) * 1000; //length data / 500 bytes * 1000 milliseconds
        } 
        console.log("length: " + len + " Bytes, offtimeout: " + ret + " ms");
        this.offTimeout = ret;
        return ret;
    },
    naam: undefined,
    relay: undefined,
    comm: undefined,
    port: undefined,
    aan: function(callback){
        console.log(this.naam + " aan");
        var dit=this;
        fs.writeFile(this.relay + "/value", 1, function(err) {
            if(err) {
                console.log(err);
            } else {
                console.log(dit.naam + " aangezet");
                dit.status.power = 'on';
                setTimeout(function(){
                    if(callback) { callback(); }
                },dit.onTimeout);
            }
        }); 
    },
    uit: function(){
        console.log(this.naam + " uit");
        var dit=this;
        fs.writeFile(this.relay + "/value", 0, function(err) {
            if(err) {
                console.log(err);
            } else {
                dit.status.power = 'off';
                console.log(dit.naam + " uitgezet");
            }
        }); 
    },
    print: function(data) {
        console.log(this.naam + " print");
        var dit = this;
        this.setOffTimeout(data);
        try {
        this.port.write(data, function(err, results) {
            if (err) { console.log('err: ' + err); }
            if (results) { 
                console.log('results: ' + results); 
                dit.offTimer = setTimeout(function(){
                    dit.uit();
                },dit.offTimeout);
            }
        });
        } catch (exception) {
            console.log('fout tijdens afdrukken naar ' + this.port);
        }
    }
};

var meto1 = new meto({
    naam: "meto1",
    relay: "/home/jos/gpio/relay1",
    comm: "/dev/ttyUSB0"
});
var meto2 = new meto({
    naam: "meto2",
    relay: "/home/jos/gpio/relay2",
    comm: "/dev/ttyUSB1"
});

function getPostData(req, callback) {
    var post = "";
    var q = require('querystring');
    req.on('data', function(chunk) {
        //post += decodeURIComponent(chunk);
        post += chunk;
    });
    req.on('end', function(){
        post=q.parse(post);
        if (post.length > 0) {
            console.log('post data: ');
            console.log(post);
        }
        callback(post);
    });

}
function findPrinterByPort(port) {
    var ret;
    if (port === meto1.comm) {
        ret = meto1;
    } else if (port === meto2.comm) {
        ret = meto2;
    } else {
        console.log('poort: ' + port + ' onbekend.');
    }
    return ret;
}
function findPrinterByName(name) {
    var ret;
    if (name === 'meto1') {
        ret = meto1;
    } else if (name === 'meto2') {
        ret = meto2;
    }
    return ret;
}

http.createServer(function (req, res) {
    var printer;
    var html = "<!DOCTYPE html><head><title>Printserver</title></head><body>";
    res.writeHead(200, {
        'Content-Type': 'text/html', 
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Authorization'
    });
    getPostData(req, function(post){
        if (post.port && post.data) {
            html += '<br>finding printer...';
            printer = findPrinterByPort(post.port);
            html += " printer " + printer.naam + " found...";
            if (printer) {
                html += '<br>switch on ' + printer.naam + '...';
                printer.aan(function(){
                    printer.print(post.data);
                });
                html += '<br>printing ' + post.data.length + ' bytes...';
            } else {
                html += '<br>no printer on port: '+post.port;
            }
        } else {
            //no data, find command
            var cmd = req.url.split('/');
            printer = findPrinterByName(cmd[1]);
            if (printer) {
                if (cmd[2]==='on'){
                    printer.aan();
                    html += "<br>switching on " + printer.naam;
                } else if (cmd[2] === 'off') {
                    printer.uit();
                    html += "<br>switching off " + printer.naam;
                } else if (cmd[2] === 'status') {
                    html += "<br>" + printer.naam + " status: " + printer.status.power;
                    if (printer.status.details) { html += "<br>details: " + printer.status.details; }
                    if (printer.status.type) { html += "<br>type: " + printer.status.type; }
                    if (printer.status.remaining) { html += "<br>remaining: " + printer.status.remaining; }
                } else {
                    html += "<br>invalid command!";
                }
            } else {
                html += "<br>invallid printer!";
            }
        } 
        html += "<br>Ready...";
        html += "<br><button onclick='window.history.back()'>&lt; Terug</button>";
        html += "</body>";
        res.end(html);
    });
}).listen(8888);
console.log('webserver listening on port 8888');
