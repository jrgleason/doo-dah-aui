import { setup, fromPromise } from 'xstate';
import { jwtDecode } from "jwt-decode";
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
        context: ({input}) => ({
            accessToken: null,
            isAuthenticated: false,
            isAdmin: false,
            tokenExpiresAt: null,
            getAccessTokenSilently: input.getAccessTokenSilently || null
        }),
        states: {
            checking: {
                invoke: {
                    src: 'fetchTokenActor',
                    input: ({context}) => ({ getAccessTokenSilently: context.getAccessTokenSilently }),
                    onDone: {
                        target: 'authenticated',
                        actions: ({ context, event }) => {
                            console.log('Token fetched successfully:', event.output);
                            applyToken(context, event.output);
                        }
                    },
                    onError: {
                        target: 'unauthenticated',
                        actions: ({ context, event }) => {
                            console.error('Error during token fetch:', event.data);
                            clearAuthData(context);
                        }
                    }
                }
            },
            authenticated: {
                on: {
                    TOKEN_EXPIRING: 'refreshing'
                }
            },
            refreshing: {
                invoke: {
                    src: 'fetchTokenActor',
                    onDone: {
                        target: 'authenticated',
                        actions: ({ context, event }) => {
                            console.log('Token refreshed successfully:', event.output);
                            applyToken(context, event.output);
                        }
                    },
                    onError: {
                        target: 'unauthenticated',
                        actions: ({ context, event }) => {
                            console.error('Error during token refresh:', event.data);
                            clearAuthData(context);
                        }
                    }
                }
            },
            unauthenticated: {
                on: {
                    RETRY: 'checking'
                }
            }
        }
    });

function applyToken(ctx, token) {
    ctx.accessToken = token;
    ctx.isAuthenticated = true;

    try {
        const decoded = jwtDecode(token);
        console.log('Decoded token:', decoded);
        if (decoded?.scope) {
            const scopes = decoded.scope.split(' ');
            ctx.isAdmin = scopes.includes('site:admin');
        } else {
            ctx.isAdmin = false;
        }
        if (decoded?.exp) {
            ctx.tokenExpiresAt = decoded.exp * 1000;
        }
    } catch (err) {
        console.error('Error decoding JWT', err);
        ctx.isAdmin = false;
        ctx.tokenExpiresAt = null;
    }
}

function clearAuthData(ctx) {
    console.log('Clearing auth data');
    ctx.accessToken = null;
    ctx.isAuthenticated = false;
    ctx.isAdmin = false;
    ctx.tokenExpiresAt = null;
}