// IMPORTS
// =================================================================================================
import { AuthInputs, Authenticator, ActionContext, validate } from 'nova-base';
import { MockDao } from './Database';
import { User } from './../data/users';

// MODULE VARIABLES
// =================================================================================================
const KEY = 'testkey';

// AUTHENTICATOR
// =================================================================================================
export const authenticator: Authenticator = function(this: ActionContext, inputs: AuthInputs, options: any): Promise<User> {

    try {
        validate.authorized(inputs, 'No auth data provided');
        if (inputs.scheme === 'token') {
            return (this.dao as MockDao).fetchUserByToken(inputs.credentials)
                .then((user) => {
                    validate.authorized(user, 'Invalid token');
                    return user;
                });
        }
        else if (inputs.scheme === 'key') {
            validate.authorized(inputs.credentials === KEY, 'Invalid Key');
            return Promise.resolve();
        }
        else {
            validate.authorized(false, `Scheme {${inputs.scheme}} is not supported`);
        }
    }
    catch (e) {
        return Promise.reject(e);
    }
}

authenticator.toOwner = function(authResult: User): string {
    if (!authResult) return undefined;
    return authResult.id;
};