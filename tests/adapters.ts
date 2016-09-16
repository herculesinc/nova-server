// IMPORTS
// =================================================================================================
import { ActionContext, validate } from 'nova-base';
import { User } from './data/users';
import { Token } from './mocks/Authenticator';

// HELLO WORLD
// =================================================================================================
interface HelloWorldInputs {
    user    : User;
    author  : string;
}

export async function helloWorldAdapter(this: ActionContext, inputs: any, token: Token): Promise<HelloWorldInputs> {
    validate.inputs(inputs.author, 'Author must be provided');
    const user = await (this.dao as any).fetchUserById(token.userId);
    validate.authorized(user, 'Authorization required');
    return { 
        user    : user, 
        author  : inputs.author
    };
}