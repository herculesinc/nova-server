// IMPORTS
// =================================================================================================
import { ActionContext, validate } from 'nova-base';

// HELLO WORLD
// =================================================================================================
interface HelloWorldInputs {
    user    : string;
    author  : string;
}

export function helloWorldAdapter(this: ActionContext, inputs: any, authInfo: string): Promise<HelloWorldInputs> {
    validate.inputs(inputs.author, 'Author must be provided');

    return Promise.resolve({ user: authInfo, author: inputs.author});
}