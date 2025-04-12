import './App.css';
import Marketing from "./pages/marketing/Marketing.jsx";
import {Auth0Provider, useAuth0} from '@auth0/auth0-react';
import {GlobalConfigProvider, useGlobalConfig} from "./providers/config/GlobalConfigContext.jsx";
import NavBar from "./components/NavBar/NavBar.jsx";
import MainPage from "./pages/Main/MainPage.jsx";
import LoadingLayer from "./pages/Loading/LoadingLayer.jsx";
import {TokenProvider} from "./providers/token/TokenProvider.jsx";
function AppContent() {
    const config = useGlobalConfig();

    if (!config) {
        return <div>Loading...</div>; // Handle loading state
    }

    return (
        <Auth0Provider
            domain={config.domain}
            clientId={config.clientId}
            useRefreshTokens={true}
            cacheLocation={"localstorage"}
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
    const {isAuthenticated, isLoading} = useAuth0();
    console.log('Is authenticated:', isAuthenticated);
    console.log('Is loaded:', !isLoading);

    return (
        <div className="root-wrapper">
            <NavBar isAuthenticated={isAuthenticated}/>
            <main className="root-main z-0">
                <NavBar isFixed={false}/>
                {isLoading ? <LoadingLayer/> : null}
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