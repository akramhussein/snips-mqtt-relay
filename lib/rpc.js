#!/usr/bin/env node
'use strict';

const makeRPC = (methods) => {
	return (functionName, argument) => {
		return methods[functionName](argument)
	}
}

module.exports = { makeRPC };
