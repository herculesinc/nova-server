// IMPORTS
// =================================================================================================
import { Notice } from 'nova-server';

// HELLO WORLD
// =================================================================================================
export class HelloWorldNotice implements Notice {

    event = 'helloWorld'; 
    target  : string;
    payload : any;

    constructor(target: string, author: string) {
        this.target = target;
        this.payload = {
            message: "Hello World!",
            author  : author
        };
    }

    merge(): HelloWorldNotice {
        return undefined;
    }
}