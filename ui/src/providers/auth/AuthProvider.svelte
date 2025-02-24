<script>
    import {getContext, setContext} from "svelte";
    import {useMachine} from "@xstate/svelte";
    import {createAuthMachine} from "$lib/auth/index.js";
    import {writable} from "svelte/store";
    import {createLogger} from "$lib/util/index.mjs";

    const log = createLogger('AuthProvider');

    const globalConfigSnapshot = getContext('globalConfigSnapshot');
    const authReady = writable(false);
    const authService = writable(null);

    setContext('authReady', authReady);
    setContext('authService', authService);  // Set the store itself

    // Separate reactive statement for the matches check
    $: if ($globalConfigSnapshot?.matches('done')) {
        log('Done state detected');
        const config = $globalConfigSnapshot.context.config;

        if (config == null) {
            throw new Error("Config cannot be null when creating Auth Machine");
        }

        const authMachine = createAuthMachine(config.fakeLogin);
        const machineService = useMachine(authMachine, {
            input: config
        });
        // Update the store value
        authService.set(machineService);
        authReady.set(true);
    }
</script>

<slot/>