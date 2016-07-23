// IMPORTS
// =================================================================================================
import { Notice } from 'nova-server';
import { User } from './data/users';

// HELLO WORLD
// =================================================================================================
export class HelloWorldNotice implements Notice {

    event = 'helloWorld'; 
    target  : string;
    payload : any;

    constructor(user: User, author: string) {
        this.target = user.id;
        this.payload = {
            message: "Hello World!",
            author  : author
        };
    }

    merge(): HelloWorldNotice {
        return undefined;
    }
}