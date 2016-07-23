"use strict";
// IMPORTS
// =================================================================================================
const nova_base_1 = require('nova-base');
// AUTH
// =================================================================================================
function parseAuthHeader(header) {
    nova_base_1.validate.authorized(header, 'Authorization header was not provided');
    const authParts = header.split(' ');
    nova_base_1.validate.inputs(authParts.length === 2, 'Invalid authorization header');
    return {
        scheme: authParts[0],
        credentials: authParts[1]
    };
}
exports.parseAuthHeader = parseAuthHeader;
//# sourceMappingURL=util.js.map