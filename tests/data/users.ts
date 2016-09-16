// INTERFACES
// ================================================================================================
export interface User {
    id      : string;
    password: string;
    name    : string;
}

// DATA
// ================================================================================================
export const users = [
    {
        id      : '123',
        password: 'password1',
        name    : 'User1'
    },
    {
        id      : '456',
        password: 'password2',
        name    : 'User2'
    },
    {
        id      : '789',
        password: 'password3',
        name    : 'User3'
    },
];