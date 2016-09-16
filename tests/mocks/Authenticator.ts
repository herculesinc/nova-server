// IMPORTS
// =================================================================================================
import { AuthInputs, Authenticator, ActionContext, validate } from 'nova-base';
import { MockDao } from './Database';
import { User, users } from './../data/users';

// MODULE VARIABLES
// =================================================================================================
const USER_MAP = {
    [users[0].id]: users[0],
    [users[1].id]: users[1],
    [users[2].id]: users[2],
};

// INTERFACES
// =================================================================================================
export interface Token {
    userId  : string;
    password: string;
}

// AUTHENTICATOR
// =================================================================================================
export const authenticator: Authenticator<Token, Token> = {

    decode(inputs: AuthInputs): Token {
        validate.authorized(inputs.scheme === 'token', 'Authentication schema not supported');
        const parts = inputs.credentials.split('%');
        validate.authorized(parts.length === 2, 'Invalid token');
        return {
            userId  : parts[0],
            password: parts[1]
        }
    },

    authenticate(this: ActionContext, token: Token, options: any): Promise<Token> {
        try {
            validate.authorized(token, 'Token is undefined');
            const user = USER_MAP[token.userId];
            validate.authorized(user, 'Invalid user');
            validate.authorized(token.password === user.password, 'Invalid password');
            this.logger.debug(`Authenticated ${user.name}`);
            return Promise.resolve(token);
        }
        catch (e) {
            return Promise.reject(e);
        }
    },

    toOwner(token: Token): string {
        return token.userId;
    }
}