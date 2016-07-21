// IMPORTS
// =================================================================================================
import { AuthInputs, Authenticator, ActionContext, validate } from 'nova-base';

// MODULE VARIABLES
// =================================================================================================
const KEY = 'testkey';
const TOKEN_USER_MAP = {
    testtoken1: 'user1',
    testtoken2: 'user2'
};

// AUTHENTICATOR
// =================================================================================================
export const authenticator: Authenticator = function(this: ActionContext, inputs: AuthInputs, options: any): Promise<string> {

    try {
        if (inputs.scheme === 'token') {
            const user = TOKEN_USER_MAP[inputs.credentials];
            validate.authorized(user, 'Invalid token');
            return Promise.resolve(user);
        }
        else if (inputs.scheme === 'key') {
            validate.authorized(inputs.credentials === KEY, 'Invalid Key');
            return Promise.resolve();
        }
    }
    catch (e) {
        return Promise.reject(e);
    }
}

authenticator.toOwner = function(authResult: any): string {
    if (!authResult) return undefined;
    return authResult;
};