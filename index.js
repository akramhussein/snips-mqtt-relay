'use strict';

var _mqtt = require('mqtt');
var _ble = require('ble-relay');
var options = require('node-options');


var opts = {
    serviceUUID : '025A7775-49AA-42BD-BBDB-E2AE77782966',
    characteristicUUID : 'F38A2C23-BC54-40FC-BED0-60EDDA139F47'
}


var result = options.parse(process.argv.slice(2), opts);


if (result.errors) {
    if (opts.verbose) console.log('Unknown argument(s): "' + result.errors.join('", "') + '"');
    console.log('USAGE: [--serviceUUID=$ID] [--characteristicUUID=$ID] [$MQTT_PORT] [$MQTT_HOST]');
    process.exit(-1);
}

var mqttHost = 'localhost'
var mqttPort = '9898'

if (result.args) {
    if (result.args.length !== 2) {
        console.log('Two non-option arguments are required: mqtt host and port');
        process.exit(-2);
    }

    mqttHost = result.args[0];
    mqttPort = result.args[1];
}


var config = {
    mqtt: {
        host: mqttHost,
        port: mqttPort
    },
    ble: {
        displayName : 'Snips',
        serviceUUID : opts.serviceUUID,
        characteristicUUID : opts.characteristicUUID
    }
}

var mqtt = _mqtt.connect(config.mqtt);


config.ble.onMessage = function(buffer) {
    var json = JSON.parse(buffer);
    var message = new Buffer(json.message, 'base64');
    mqtt.publish(json.topic, message);
};

config.ble.getReadData = function() { 
    return new Buffer('Read data'); 
};


var ble = _ble.start(config.ble);


mqtt.on('message', function (topic, message) {
    // message is Buffer
    var json = {
        'topic': topic,
        'message': message.toString('base64')
    }
    var text = JSON.stringify(json);
    var buff = new Buffer(text);
    ble.sendMessage(buff);
});

mqtt.on('connect', function () {
    mqtt.subscribe('#');
});
