// IMPORTS
// =================================================================================================
import { ActionContext, validate } from 'nova-base';
import { User } from './data/users';

// HELLO WORLD
// =================================================================================================
interface HelloWorldInputs {
    user    : User;
    author  : string;
}

export function helloWorldAdapter(this: ActionContext, inputs: any, authInfo: User): Promise<HelloWorldInputs> {
    validate.inputs(inputs.author, 'Author must be provided');

    return Promise.resolve({ user: authInfo, author: inputs.author});
}