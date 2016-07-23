// IMPORTS
// =================================================================================================
import { ActionContext, validate } from 'nova-base';
import { HelloWorldNotice } from './notices';

// HELLO WORLD
// =================================================================================================
interface HelloWorldInputs {
    user    : string;
    author  : string;
}

export function helloWorldAction(this: ActionContext, inputs: HelloWorldInputs): Promise<string> {
    
    this.register(new HelloWorldNotice(inputs.user, inputs.author));
    return Promise.resolve(inputs.author + ': Hello World!');
}