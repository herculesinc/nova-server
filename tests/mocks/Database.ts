// IMPORTS
// ================================================================================================
import { Database, Dao, DaoOptions } from 'nova-base';
import { User, users } from './../data/users';

// DATABASE CLASS
// =================================================================================================
export class MockDatabase {
    connect(options?: DaoOptions): Promise<Dao> {
        // console.log('Connecting to the database');
        return Promise.resolve(new MockDao(options));
    }
}

// DAO CLASS
// =================================================================================================
export class MockDao implements Dao {
    isActive        : boolean;
    inTransaction   : boolean;

    constructor(options?: DaoOptions) {
        this.inTransaction = options ? options.startTransaction : false;
        this.isActive = true;
    }

    fetchUserById(id: string): Promise<User> {
        const user = users.find((user) => user.id === id);
        return Promise.resolve(user);
    }

    fetchUserByToken(token: string): Promise<User> {
        const user = users.find((user) => user.token === token);
        return Promise.resolve(user);
    }

    close(action?: 'commit' | 'rollback'): Promise<any> {
        this.inTransaction = false;
        this.isActive = false;
        return Promise.resolve();
    }
}
