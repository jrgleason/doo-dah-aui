// TokenContext.jsx
import {createActorContext} from '@xstate/react';
import {tokenMachine} from '../../lib/token/index.mjs';
import {useAuth0} from '@auth0/auth0-react';

// Create the context
export const TokenContext = createActorContext(tokenMachine);

// Create the provider component
export function TokenProvider({children}) {
    const { getAccessTokenSilently} = useAuth0();
    return (
        <TokenContext.Provider
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