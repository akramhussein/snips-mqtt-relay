#!/usr/bin/env node
'use strict';

const options = require('node-options');
const startRelay = require('./lib/relay.js').startRelay;


const opts = {
    serviceUUID : '13EA4259-9D9E-42D1-A78B-638ED22CC768',
    characteristicUUID : '81D97A06-7A2D-4A98-A2E2-41688E3D8283'
}


const result = options.parse(process.argv.slice(2), opts);


if (result.errors) {
    if (opts.verbose) console.log('Unknown argument(s): "' + result.errors.join('", "') + '"');
    console.log('USAGE: [--serviceUUID=$ID] [--characteristicUUID=$ID] [$MQTT_PORT] [$MQTT_HOST]');
    process.exit(-1);
}


const ble = {
    serviceUUID: opts.serviceUUID,
    characteristicUUID: opts.characteristicUUID
}


const mqtt = {
    host: 'localhost',
    port: '9898'
}

if (result.args) {
    if (result.args.length !== 2) {
        console.log('Two non-option arguments are required: mqtt host and port');
        process.exit(-2);
    }

    mqtt.host = result.args[0];
    mqtt.port = result.args[1];
}


startRelay({ mqtt, ble });
