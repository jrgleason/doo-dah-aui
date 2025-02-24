import {fromPromise} from 'xstate';

// Just an example test token for fake login
/**
 * If we're using a fake login, fetch the user data from /fe/user
 * using a test token.
 */
const initClient = fromPromise(async ({input}) => {
    return {
        client: null,
        isAuthenticated: true,
        user: {name: "fake user"}
    };
});

const login = fromPromise(async ({input}) => {
    return null;
});

const actors = {
    initClient,
    login,
    type: "fake"
};
export {actors};
