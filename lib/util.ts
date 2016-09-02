// IMPORTS
// =================================================================================================
import * as proxyaddr from 'proxy-addr';
import { AuthInputs, validate } from 'nova-base';

// AUTH
// =================================================================================================
export function parseAuthHeader(header: string): AuthInputs {
    validate.authorized(header, 'Authorization header was not provided');
    const authParts = header.split(' ');
    validate.inputs(authParts.length === 2, 'Invalid authorization header');
    return {
        scheme      : authParts[0],
        credentials : authParts[1]
    };
}

// PROXY
// =================================================================================================
export function compileTrust (val: any) {
  if (typeof val === 'function') return val;

  if (val === true) {
    // Support plain true/false
    return function(){ return true };
  }

  if (typeof val === 'number') {
    // Support trusting hop count
    return function(a, i){ return i < val };
  }

  if (typeof val === 'string') {
    // Support comma-separated values
    val = val.split(/ *, */);
  }

  return proxyaddr.compile(val || []);
}