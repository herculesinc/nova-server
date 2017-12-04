"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// IMPORTS
// =================================================================================================
const proxyaddr = require("proxy-addr");
const nova_base_1 = require("nova-base");
const IPV4_REGEX = /[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/;
// AUTH
// =================================================================================================
function parseAuthHeader(header) {
    nova_base_1.validate.authorized(header, 'Authorization header was not provided');
    const authParts = header.split(' ');
    nova_base_1.validate.input(authParts.length === 2, 'Invalid authorization header');
    return {
        scheme: authParts[0],
        credentials: authParts[1]
    };
}
exports.parseAuthHeader = parseAuthHeader;
// PROXY
// =================================================================================================
function compileTrust(val) {
    if (typeof val === 'function')
        return val;
    if (val === true) {
        // Support plain true/false
        return function () { return true; };
    }
    if (typeof val === 'number') {
        // Support trusting hop count
        return function (a, i) { return i < val; };
    }
    if (typeof val === 'string') {
        // Support comma-separated values
        val = val.split(/ *, */);
    }
    return proxyaddr.compile(val || []);
}
exports.compileTrust = compileTrust;
// IP PARSING
// =================================================================================================
function matchIpV4(value) {
    if (!value)
        return undefined;
    const result = value.match(IPV4_REGEX);
    if (result)
        return result[0];
}
exports.matchIpV4 = matchIpV4;
//# sourceMappingURL=util.js.map