var WebSocket = require('ws');
var WebSocketClient = require('websocket').client;
var Packet = require('./packet');
var EventEmitter = require('events').EventEmitter;


WebSocketClient.prototype.failHandshake = function(reason) {
  if(reason.indexOf('Sec-WebSocket-Accept header from server didn\'t match') >= 0) {
    // Ignore it and accept
    this.succeedHandshake()
  }
}
String.prototype.toBytes = function () {
    var bytes = [];
    for (var i = 0; i < String.length; ++i) {
        bytes.push(String.charCodeAt(i));
    }
    return bytes;
}
function Client(client_name) {
    //you can change this values
    this.client_name = client_name; //name used for log
    this.debug = 5;           //debug level, 0-5 (5 will output extremely lot of data)
    this.inactive_destroy = 5 * 60 * 1000;   //time in ms when to destroy inactive balls
    this.inactive_check = 10 * 1000;     //time in ms when to search inactive balls
    this.spawn_interval = 200;         //time in ms for respawn interval. 0 to disable (if your custom server don't have spawn problems)
    this.spawn_attempts = 25;          //how much attempts to spawn before give up (official servers do have unstable spawn problems)
    this.agent = null;        //agent for connection. Check additional info in readme
    this.local_address = null;        //local interface to bind to for network connections (IP address of interface)
    this.headers = {            //headers for WebSocket connection.
        'Origin': 'http://slither.io'
    };
    
    this.pong = true;
    //don't change things below if you don't understand what you're doing
    this.username = "s-bots com";
    this.tick_counter = 0;    //number of ticks (packet ID 16 counter)
    this.inactive_interval = 0;    //ID of setInterval()
    this.balls = {};   //all balls
    this.my_balls = [];   //IDs of my balls
    this.score = 0;    //my score
    this.leaders = [];   //IDs of leaders in FFA mode
    this.teams_scores = [];   //scores of teams in Teams mode
    this.auth_token = '';   //auth token. Check README.md how to get it
    this.auth_provider = 1;    //auth provider. 1 = facebook, 2 = google
    this.spawn_attempt = 0;    //attempt to spawn
    this.spawn_interval_id = 0;    //ID of setInterval()
    this.ping_interval = 250;
    this.ping = 0;
    this.x = 0;
    this.y = 0;
    this.snakeID = undefined;
    this.skin = 10;
}

Client.prototype = {
    connect: function (server) {
        var opt = {
            
        };
        if (this.agent) opt.agent = this.agent;
        if (this.local_address) opt.localAddress = this.local_address;

        this.ws = new WebSocketClient();
        this.ws.on('connect', this.onConnect.bind(this));
        this.ws.on('connectFailed', this.onError.bind(this));
        this.ws.connect(server, null, 'http://slither.io', null, opt);

        if (this.debug >= 1) {
            if (!key) this.log('[warning] You did not specified "key" for Client.connect(server, key)\n' +
                '          If server will not accept you, this may be the problem');
            this.log('connecting...');
        }

        this.emitEvent('connecting');
    },

    

    onConnect: function (conn) {
        
        this.connection = conn;
        conn.on('close', this.onDisconnect.bind(this))
        conn.on('message', this.onMessage.bind(this))
        
        if (this.debug >= 1)
            this.log('connected to server');

        
        var buf = new Buffer([115, 7, 10, 100, 45, 98, 111, 116, 115, 32, 99, 111, 109]);
        this.send(buf);
        this.send(new Buffer([251]));
        

        this.emitEvent('connected');
    },

    onError: function (e) {
        if (this.debug >= 1)
            this.log('connection error: ' + e);

        this.emitEvent('connectionError', e);

    },

    onDisconnect: function () {
        if (this.debug >= 1)
            this.log('disconnected');
        clearInterval(this.ping);
        this.ping = 0;
        this.emitEvent('disconnect');
        

    },
    
    onMessage: function (e) {
        //console.log('MESSAGE');
        var msg = new Packet(e.binaryData);
        msg.readInt16(); // first 2 bytes are crap (00 00) -> ignore
        var type = String.fromCharCode(msg.readUInt8(2));
        //console.log('type ', type);
        try {
        switch (type) {
            case 'p':
                this.pong = true;
            case 's':
                
                if (this.snakeID == undefined) { 
                    this.snakeID = msg.readInt16(); 
                    console.log('spawn ', this.snakeID);
                }
                break;
            case 'v':
                console.log('died !!');
                this.emitEvent('lostMyBalls');
                break;
            case 'g':
                var snakeID = msg.readInt16();
                var x = msg.readInt16();
                var y = msg.readInt16();
                //console.log('COOOORDS ', msg);
                if (snakeID == this.snakeID) { this.x = x; this.y = y; }
                break;
            case 'G':
                // Later see if it works so
                break;
        }
        } catch(e) {
            console.log(e);
        }
        
    },
    reset: function() {
        try {
            clearInterval(this.ping);
            this.disconnect();
        } catch(e) { }
    },
    StartBoostSnake: function () {
        var buf = new Buffer([253]);
        this.send(buf);
        return true;
    },
    StopBoostSnake: function () {
        var buf = new Buffer([254]);
        this.send(buf);
        return true;
    },
    disconnect: function() {
        clearInterval(this.ping);
        if (this.connection) {this.connection.close();}
    },
    appendStringBytes: function(string, buf) {
        for (var i = 0; i < string.length; i++){
            buf[3+i] = string.charCodeAt[i];
        }
        return buf;
    },
    // Had to do this because sometimes somehow packets get moving by 1 byte
    // https://github.com/pulviscriptor/agario-client/issues/46#issuecomment-169764771
    onPacketError: function (packet, err) {
        var crash = true;

        this.emitEvent('packetError', packet, err, function () {
            crash = false;
        });

        if (crash) {
            if (this.debug >= 1)
                this.log('Packet error detected! Check packetError event in README.md');
            throw err;
        }
    },

    log: function (msg) {
        console.log(this.client_name + ': ' + msg);
    },

    // Fix https://github.com/pulviscriptor/agario-client/issues/95
    emitEvent: function () {
        var args = [];
        for (var i = 0; i < arguments.length; i++) args.push(arguments[i]);
        try {
            this.emit.apply(this, args);
        } catch (e) {
            process.nextTick(function () {
                throw e;
            });
        }
    },

    //functions that you can call to control your balls

    //spawn ball
    spawn: function (name) {
        
        
        /*
        var buf = new Buffer(3 + this.username);
        buf.writeInt8(115, 0);
        buf.writeInt8(7, 1);
        buf.writeInt8(this.skin, 2);
        this.send(this.appendStringBytes(this.username, buf));
        */
        return true;
    },

    //activate spectate mode
    

    //switch spectate mode (toggle between free look view and leader view)
    send: function(buf) {
        if (this.connection){ this.connection.sendBytes(buf);}
    },
    getAngle: function(x, y) {
        var ankathete = x - this.x;
        var gegenkathete = y - this.y;
        var angle;
        /*
        if (ankathete > -100 && ankathete < 100) {
            if (ankathete > 0) {
                angle = Math.PI/2;
            }
            else { angle = Math.PI + Math.PI/2; }
        }
        else {*/ angle = Math.atan(gegenkathete / ankathete); 
        
        if (ankathete < 0) {
            angle += Math.PI;
        }
        
        
        
        return angle;
    },
    getValue: function(x, y) {
        var angle = this.getAngle(x, y);
        return Math.round( ( angle / (2* Math.PI) ) * 250);
    },
    moveTo: function (x, y) {
        

        var value = this.getValue(x, y);
        console.log(value);
        var buf = new Buffer([value]);
        this.send(buf);

        return true;
    },
    /*
    moveTo: function (x, y) {
        
        var angle = Math.atan2(y - this.y, x - this.x);
        console.log(angle);
        var value = Math.ceil(angle / (Math.PI / 125))
        var buf = new Buffer(1);
        console.log(value);
        //buf.writeUInt8(value);
        //console.log(this.y, ' ', y, ' ', this.x, ' ', x);
        //console.log(this.snakeID);
        //this.send(buf);

        return true;
    },
    */
    

};


// Inherit from EventEmitter
for (var key in EventEmitter.prototype) {
    if (!EventEmitter.prototype.hasOwnProperty(key)) continue;
    Client.prototype[key] = EventEmitter.prototype[key];
}



module.exports = Client;
