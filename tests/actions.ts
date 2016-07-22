import { ActionContext } from 'nova-base';

export function helloWorldAction(this: ActionContext, inputs: { author: string}): Promise<string> {
    return Promise.resolve(inputs.author + ': Hello World!');
}