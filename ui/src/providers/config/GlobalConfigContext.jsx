import React from 'react';
import {createActorContext} from '@xstate/react';
import {globalConfigMachine} from "../../lib/config/index.mjs";

export const GlobalConfigContext = createActorContext(globalConfigMachine);

export function GlobalConfigProvider({children}) {
    return (
        <GlobalConfigContext.Provider>
            {children}
        </GlobalConfigContext.Provider>
    );
}

export function useGlobalConfig() {
    return GlobalConfigContext.useSelector((state) => state.context.config);
}
