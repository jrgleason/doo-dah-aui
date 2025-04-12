import {fromPromise, setup} from 'xstate';
import {jwtDecode} from "jwt-decode";

const fetchTokenActor = fromPromise(async ({input}) => {
    try {
        const token = await input.getAccessTokenSilently();
        console.log('Fetched token:', token);
        return token;
    } catch (error) {
        console.error('Error fetching token:', error);
        throw error;
    }
});
export const tokenMachine =
    setup({
        actors: {
            fetchTokenActor
        }
    }).createMachine({
        id: 'tokenMachine',
        initial: 'checking',
        context: ({input}) => {
            console.log('Token machine input:', input);
            return ({
                accessToken: null,
                isLoaded: false,
                isAuthenticated: false,
                isAdmin: false,
                getAccessTokenSilently: input.getAccessTokenSilently || null
            })
        },
        states: {
            idle: {
                on: {
                    REFRESH: 'checking'
                }
            },
            checking: {
                invoke: {
                    src: 'fetchTokenActor',
                    input: ({context}) => ({getAccessTokenSilently: context.getAccessTokenSilently}),
                    onDone: {
                        target: 'idle',
                        actions: ({context, event}) => {
                            context.accessToken = event.output;
                            context.isAuthenticated = true;
                            context.isLoaded = true;
                            if (event.output != null) {
                                context.isAdmin = applyToken(event.output);
                                console.log('isAdmin:', context.isAdmin);
                            }
                        }
                    },
                    onError: {
                        target: 'idle',
                        actions: ({context, event}) => {
                            console.error('Error during token refresh:', event.data);
                            context.accessToken = null;
                            context.isAuthenticated = false;
                            context.isLoaded = true
                        }
                    }
                }
            }
        }
    });

function applyToken(token) {
    try {
        const decoded = jwtDecode(token);
        console.log('Decoded token:', decoded);
        if (decoded?.scope) {
            const scopes = decoded.scope.split(' ');
            return scopes.includes('site:admin');
        } else {
            return false;
        }
    } catch (err) {
        console.error('Error decoding JWT', err);
        return false;
    }
}