// IMPORTS
// ================================================================================================
import { Dispatcher, QueueMessage, QueueMessageOptions } from 'nova-base';

// DISPATCHER CLASS
// =================================================================================================
export class MockDispatcher implements Dispatcher {
    
    sendMessage(queue: string, payload: any, options?: QueueMessageOptions, callback?: (error?: Error) => void) {
        console.log(`Sending a message to '${queue}' queue`);
        callback();
    }

    receiveMessage(queue: string, callback: (error: Error, message: QueueMessage) => void) {
        console.log(`Receiving a message from '${queue}' queue`);
        callback(undefined, undefined);
    }
    
    deleteMessage(message: QueueMessage, callback?: (error?: Error) => void) {
        console.log(`Deleting a message from '${message.queue}' queue`);
        callback();
    }
}