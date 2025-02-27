import './App.css';
import Marketing from "./pages/marketing/Marketing.jsx";
import {Auth0Provider} from '@auth0/auth0-react';
import {GlobalConfigProvider, useGlobalConfig} from "./providers/config/GlobalConfigContext.jsx";
import NavBar from "./components/NavBar/NavBar.jsx";
import MainPage from "./pages/Main/MainPage.jsx";
import LoadingLayer from "./pages/Loading/LoadingLayer.jsx";
import {TokenProvider} from "./providers/token/TokenContext.jsx";
import { TokenContext } from "./providers/token/TokenContext.jsx";
function AppContent() {
    const config = useGlobalConfig();

    if (!config) {
        return <div>Loading...</div>; // Handle loading state
    }

    return (
        <Auth0Provider
            domain={config.domain}
            clientId={config.clientId}
            authorizationParams={{
                redirect_uri: window.location.origin,
                audience: config.audience,
                scope: config.scope
            }}
        >
            <TokenProvider>
                <AppContentWithAuth/>
            </TokenProvider>
        </Auth0Provider>
    );
}

function AppContentWithAuth() {
    const actorRef = TokenContext.useActorRef();
    // Use a simpler selector first to test
    const isAuthenticated = TokenContext.useSelector(
        (state) => state.context.isAuthenticated
    );
    const isLoaded = TokenContext.useSelector(
        (state) => state.context.isLoaded
    );
    console.log('Is authenticated:', isAuthenticated);
    console.log('Is loaded:', isLoaded);

    return (
        <div className="root-wrapper">
            <NavBar isAuthenticated={isAuthenticated}/>
            <main className="root-main z-0">
                <NavBar isFixed={false}/>
                {!isLoaded ? <LoadingLayer/> : null}
                {isAuthenticated ? <MainPage/> : <Marketing/>}
            </main>
        </div>
    );
}

function App() {
    return (
        <GlobalConfigProvider>
            <AppContent/>
        </GlobalConfigProvider>
    );
}

export default App;