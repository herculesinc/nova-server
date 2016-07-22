import { ActionContext } from 'nova-base';

export function helloWorldAdapter(this: ActionContext, inputs: any, authInfo: any): Promise<{ author: string}> {
    return Promise.resolve({ author: inputs.author});
}