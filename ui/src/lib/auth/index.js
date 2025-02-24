import {setup} from "xstate";
import {actors as fakeActors} from "./actors/fakeAuth/index.mjs";
import {actors as realActors} from "./actors/realAuth/index.mjs";

const authPrefix = "[Auth Machine] ";

const actions = {
    setClient({context, event}) {
        context.client = event.output.client;
        context.isAuthenticated = event.output.isAuthenticated;
        context.user = event.output.user;
    },
    logError({_, event}) {
        console.log(`${authPrefix} **ERROR** Output:`, event.error);
    }
};

function logAuth(message) {
    console.log(`${authPrefix}${message}`);
}

function context({input}) {
    return {
        fakeLogin: !input.fakeLogin,
        fakeToken: input.fakeToken || null,
        domain: input.domain || null,
        clientId: input.clientId || null,
        audience: input.audience || null,
        scope: input.scope || null,
        client: null,
        isAuthenticated: false,
        user: null,
        error: null
    };
}

function prepInitClient({context}) {
    return {
        domain: context.domain,
        clientId: context.clientId
    }
}

export function createAuthMachine(fakeLogin) {
    const chosenActors =
        fakeLogin == true || fakeLogin === true ? fakeActors : realActors;

    return setup({
        actions,
        actors: chosenActors
    }).createMachine({
        id: "authMachine",
        context,
        initial: "initializeClient",
        states: {
            waiting: {
                entry: () => logAuth("Waiting..."),
                on: {
                    INIT: "initializeClient"
                }
            },
            idle: {
                entry: () => logAuth("Idle..."),
                on: {
                    RETRY: "initializeClient",
                }
            },
            initializeClient: {
                entry: () => logAuth("Initializing client..."),
                invoke: {
                    src: "initClient",
                    input: prepInitClient,
                    onDone: {target: "idle", actions: "setClient"},
                    onError: {target: "idle", actions: "logError"}
                }
            }
        }
    });
}