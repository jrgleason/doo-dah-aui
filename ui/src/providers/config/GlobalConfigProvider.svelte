<script>
    import {useMachine} from '@xstate/svelte';
    import {setContext} from 'svelte';
    import {globalConfigMachine} from "../../lib/config/index.mjs";

    const {snapshot, send} = useMachine(globalConfigMachine);

    $: {
        console.log('[GlobalConfigProvider] Snapshot changed:', $snapshot);
        console.log('[GlobalConfigProvider] Current state:', $snapshot.value);
        console.log('[GlobalConfigProvider] Context:', $snapshot.context);
    }

    $: if ($snapshot.matches('done')) {
        console.log('[GlobalConfigProvider] Setting globalConfig context');
        setContext('globalConfig', $snapshot.context.config);
    }

    console.log('[GlobalConfigProvider] Setting globalConfigSnapshot context');
    setContext('globalConfigSnapshot', snapshot);

    export let config = $snapshot.context.config;
</script>

<slot {config}></slot>