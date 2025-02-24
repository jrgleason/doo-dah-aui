<!-- WebSocketProvider.svelte -->
<script>
    import {getContext, setContext} from 'svelte';
    import {createLogger} from "$lib/util/index.mjs";
    import {webSocketMachine} from "$lib/websocket/index.mjs";
    import {useMachine} from "@xstate/svelte";
    import {writable} from "svelte/store";

    const log = createLogger('WebSocketProvider');
    const authService = getContext('authService');
    const store = writable(null);
    setContext(`socketStore`, store);

    authService.subscribe(service => {
        if (service) {
            service.snapshot.subscribe(snapshot => {
                if (snapshot?.value === 'idle' && snapshot?.context?.client) {
                    log("Machine is in idle state so we can try to status")
                    const newStore = useMachine(webSocketMachine, {
                        input: {
                            client: snapshot?.context?.client,
                            scope: snapshot?.context?.scope,
                            audience: snapshot?.context?.audience
                        }
                    });
                    store.set(newStore)
                }
            });
        }
    });
</script>

<slot/>
