#!/usr/bin/env node
'use strict';

const _mqtt = require('mqtt');
const _ble = require('ble-relay');
const options = require('node-options');
const exec = require('child_process').exec;

const opts = {
    serviceUUID : '025A7775-49AA-42BD-BBDB-E2AE77782966',
    characteristicUUID : 'F38A2C23-BC54-40FC-BED0-60EDDA139F47'
}


const result = options.parse(process.argv.slice(2), opts);


if (result.errors) {
    if (opts.verbose) console.log('Unknown argument(s): "' + result.errors.join('", "') + '"');
    console.log('USAGE: [--serviceUUID=$ID] [--characteristicUUID=$ID] [$MQTT_PORT] [$MQTT_HOST]');
    process.exit(-1);
}

let mqttHost = 'localhost'
let mqttPort = '9898'

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

const mqtt = _mqtt.connect(config.mqtt);

const methods = {
    postMQTT: (payload) => {
        const mqtt = new Promise((resolve, reject) => {
            mqtt.publish(payload.topic, new Buffer(payload.message, 'base64'), {}, (error, granted) => {
                if (err) {
                    resolve({ error });
                } else {
                    resolve({ success: "success" });
                }
            });
        })
    },
    print: (payload) => {
        return new Promis.resolve(console.log(payload))
    },
    shell: (payload) => {
        return new Promise((resolve, reject) => {
            console.log('execute shell');
            exec(payload, function(error, stdout, stderr) {
                console.log('finished executing shell');
                const result = { error, stdout, stderr }
                console.log('result: ' + result);
                resolve(result)
            });
        });
    }
}

let sendJSON = (json) => undefined;

const sendResponse = (id, response) => {
    sendJSON({response: {id: id, response: response}});
}

const sendMQTT = (topic, message) => {
    sendJSON({mqtt: {topic: topic, message: message.toString('base64')}});
}


config.ble.onMessage = function(buffer) {
    var message = JSON.parse(buffer);
    console.log("received message" + JSON.stringify(message));
    methods[message.function](message.payload)
        .then((response) => {
            console.log('rpc response: ' + response);
            sendResponse(message.id, response);
        });
};

config.ble.getReadData = function() { 
    return new Buffer('Read data'); 
};


const ble = _ble.start(config.ble);

sendJSON = (response) => {
    const jsonText = JSON.stringify(response);
    console.log('sending ' + jsonText);
    const buff = new Buffer(jsonText);
    ble.sendMessage(buff);
}


mqtt.on('message', function (topic, message) {
    ble.sendMQTT(topic, message);
});

mqtt.on('connect', function () {
    mqtt.subscribe('#');
});
