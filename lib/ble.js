#!/usr/bin/env node
'use strict';

const bleno = require('bleno');
const sdp = require('simple-datagram-protocol');


let key = 255;
const nextKey = () => { key = (key + 1) % 255; return key }


const sendMessage = function(message, datagramSize, sendDatagram) {
    const datagramView = new sdp.DatagramView(message, nextKey(), datagramSize);
    for (let i = 0; i < datagramView.numberOfDatagrams; i++) {
        sendDatagram(datagramView.getDatagram(i));
    }
};


const _defaultSendMessage = (message) => {
    //jshint unused:false 
    console.log('Can\'t send message');
};


const start = (config) => {
    const ble = { config };

    ble.sendMessage = _defaultSendMessage;

    const onMessage = (message) => { ble.onMessage(message) };

    ble.messageManager = new sdp.MessageManager(onMessage);


    const characteristic = new bleno.Characteristic({
        value : null,
        uuid : config.characteristicUUID,
        properties : ['notify', 'read', 'write'],
    
        onSubscribe : function(maxValueSize, updateValueCallback) {
            console.log('Device subscribed');
            console.log('Datagram max size: ' + maxValueSize);
            ble.sendMessage = (message) => { 
                sendMessage(message, maxValueSize, updateValueCallback);
            };
        },
    
        onUnsubscribe : function() {
            console.log('Device unsubscribed');
            ble.sendMessage = _defaultSendMessage;
        },
    
        // Send a message back to the client with the characteristic's value
        onReadRequest : function(offset, callback) {
            console.log('Read request received');
            callback(this.RESULT_SUCCESS, ble.onReadData())
            bleno.stopAdvertising();
        },
    
        // Accept a new value for the characterstic's value
        onWriteRequest : function(data, offset, withoutResponse, callback) {
            this.value = data;
            if (null !== data) {
                ble.messageManager.processDatagram(data);
            }
            console.log('Write request: value = ' + this.value.toString('utf-8'));
            callback(this.RESULT_SUCCESS);
        }
    })
    
    const service = new bleno.PrimaryService({
        uuid : config.serviceUUID,
        characteristics : [characteristic]
    })
    
    // Once bleno starts, begin advertising our BLE address
    bleno.on('stateChange', function(state) {
        console.log('State change: ' + state);
        if (state === 'poweredOn') {
            bleno.startAdvertising(bleno.name, [config.serviceUUID]);
        } else {
            bleno.stopAdvertising();
        }
    });
    
    // Notify the console that we've accepted a connection
    bleno.on('accept', function(clientAddress) {
        console.log('Accepted connection from address: ' + clientAddress);
    });
    
    // Notify the console that we have disconnected from a client
    bleno.on('disconnect', function(clientAddress) {
        console.log('Disconnected from address: ' + clientAddress);
    });
    
    // When we begin advertising, create a new service and characteristic
    bleno.on('advertisingStart', function(error) {
        if (error) {
            console.log('Advertising start error:' + error);
            return;
        }
        console.log('Advertising start success');
        bleno.setServices([service]);
    });

    return ble;
}


module.exports = { start };
