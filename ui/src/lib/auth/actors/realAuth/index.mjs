import {fromPromise} from 'xstate';
import {createAuth0Client} from '@auth0/auth0-spa-js';

const initClient = fromPromise(async ({input}) => {
    const client = await createAuth0Client({
        domain: input.domain,
        clientId: input.clientId,
        cacheLocation: input.cacheLocation || 'memory',
        useRefreshTokens: input.useRefreshTokens || false,

    });
    const isAuthenticated = await client.isAuthenticated();
    if (isAuthenticated) {
        const user = await client.getUser();
        return {
            client,
            isAuthenticated,
            user
        }
    }
    return {
        client,
        isAuthenticated
    }
});

const login = fromPromise(async ({input}) => {
    if (!input.client) {
        throw new Error("Auth0 client not initialized");
    }
    await input.client.loginWithRedirect({
        authorizationParams: {
            audience: input.audience,
            scope: input.scope,
            redirect_uri: window.location.href
        }
    });
});

const logout = fromPromise(async ({input}) => {
    if (!input.client) {
        throw new Error("Auth0 client not initialized");
    }
    return input.client.logout({
        logoutParams: {
            returnTo: window.location.origin
        }
    });
});

const actors = {
    initClient,
    login,
    logout,
    type: 'real'
};

// Define actions to keep the machine configuration clea

export {actors};
