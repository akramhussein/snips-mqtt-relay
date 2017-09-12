#!/usr/bin/env node
'use strict';

const exec = require('child_process').exec;
const _mqtt = require('mqtt');
const _ble = require('./ble.js');
const _rpc = require('./rpc.js');


const startRelay = (config) => {

    const mqtt = _mqtt.connect(config.mqtt);
    const ble = _ble.start(config.ble);

    const rpc = _rpc.makeRPC({
        postMQTT: (payload) => {
            const mqtt = new Promise((resolve, reject) => {
                mqtt.publish(payload.topic, new Buffer(payload.message, 'base64'), {}, (error, granted) => {
                    if (err) {
                        resolve({ error });
                    } else {
                        resolve({ success: 'success' });
                    }
                });
            })
        },
        print: (payload) => {
            return new Promise.resolve(console.log(payload))
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
    });
    

    ble.sendJSON = (response) => {
        const jsonText = JSON.stringify(response);
        console.log('sending ' + jsonText);
        const buff = new Buffer(jsonText);
        ble.sendMessage(buff);
    }
    
    ble.sendRPCResponse = (id, response) => {
        ble.sendJSON({ rpcResponse: { id, response } });
    }
    
    ble.sendMQTT = (topic, _message) => {
        const message = _message.toString('base64');
        ble.sendJSON({ mqtt: { topic, message } });
    }
    
    
    ble.onMessage = function(buffer) {
        var message = JSON.parse(buffer);
        console.log('received message' + JSON.stringify(message));
        rpc(message.function, message.payload)
            .then((response) => {
                console.log('rpc response: ' + response);
                ble.sendRPCResponse(message.id, response);
            });
    };
    
    ble.getReadData = function() { 
        return new Buffer('Read data'); 
    };
    
    
    mqtt.on('message', function (topic, message) {
        ble.sendMQTT(topic, message);
    });
    
    mqtt.on('connect', function () {
        mqtt.subscribe('#');
    });
};


module.exports = { startRelay };
