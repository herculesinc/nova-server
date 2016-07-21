// IMPORTS
// ================================================================================================
import { Dispatcher, Task } from 'nova-base';

// DISPATCHER CLASS
// =================================================================================================
export class MockDispatcher implements Dispatcher {
    dispatch(taskOrTasks: Task | Task[]): Promise<any> {
        if (!taskOrTasks) return Promise.resolve();
        const tasks = Array.isArray(taskOrTasks) ? taskOrTasks : [taskOrTasks];
        for (let task of tasks) {
            console.log(`Dispatching a task to {${task.queue}} queue`);
        }
        return Promise.resolve();
    }
}