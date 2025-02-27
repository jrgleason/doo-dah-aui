import { createActorContext } from '@xstate/react';
import { tokenMachine } from '../../lib/token/index.mjs';
import { useAuth0 } from '@auth0/auth0-react';
import { useContext } from "react";

const TokenContext = createActorContext(tokenMachine);

export function TokenProvider({ children }) {
    const { getAccessTokenSilently } = useAuth0();
    return (
        <TokenContext.Provider
            logic={tokenMachine}
            options={{
                input: {
                    getAccessTokenSilently
                }
            }}
        >
            {children}
        </TokenContext.Provider>
    );
}

export function useTokenContext() {
    return TokenContext.useSelector((state) => state.context);
}