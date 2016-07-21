// IMPORTS
// ================================================================================================
import { Cache } from 'nova-base';

// CACHE CLASS
// =================================================================================================
export class MockCache implements Cache {

    get(key: string): Promise<any>;
    get(keys: string[]): Promise<any[]>;
    get(keyOrKeys: string | string[]): Promise<any> {
        if (!keyOrKeys) return undefined;
        const keys = Array.isArray(keyOrKeys) ? keyOrKeys : [keyOrKeys];
        console.log(`Retrieving data from cache for: ${keys} keys`);
        return Promise.resolve();
    }

    set(key: string, value: any, expires?: number) {
        console.log(`Setting value in cache for {${key}} key`);
    }

    execute(script: string, keys: string[], parameters: any[]): Promise<any> {
        console.log(`Executing script affecting ${keys} keys`);
        return Promise.resolve();
    }

    clear(key: string);
    clear(keys: string[]);
    clear(keyOrKeys: string | string[]) {
        if (!keyOrKeys) return undefined;
        const keys = Array.isArray(keyOrKeys) ? keyOrKeys : [keyOrKeys];
        console.log(`Clearing data from cache for: ${keys} keys`);
    }
}