import {fromPromise, setup} from "xstate";

const fetchGlobalConfig = fromPromise(async () => {
    const response = await fetch('/config/global');
    return response.json();
});

export const globalConfigMachine = setup({
    actors: {
        fetchGlobalConfig
    }
}).createMachine({
    id: 'globalConfigMachine',
    initial: 'loadingConfig',
    context: {
        config: null,
        error: null
    },
    states: {
        loadingConfig: {
            invoke: {
                src: 'fetchGlobalConfig',
                onDone: {
                    target: 'done',
                    actions: ({context, event}) => {
                        console.log('[MACHINE] Storing global config in context');
                        context.config = event.output;
                    }
                },
                onError: {
                    target: 'error',
                    actions: ({context, event}) => {
                        console.error('[MACHINE] Failed to fetch global config:', event.output);
                        context.error = event.output;
                    }
                }
            }
        },
        done: {
            type: 'final'
        },
        error: {
            entry: ({context}) => {
                console.error('Error fetching global config:', context.error);
            }
        }
    }
});