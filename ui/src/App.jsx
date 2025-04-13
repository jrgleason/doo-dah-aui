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
        return <div className="flex items-center justify-center h-screen">
            <div className="spinner"></div>
        </div>; // Handle loading state
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
            <NavBar isFixed={true}/>
            <main className="root-main">
                {isLoading ? <LoadingLayer/> : null}
                <div className="container mx-auto px-4 py-6 max-w-7xl">
                    {isAuthenticated ? <MainPage/> : <Marketing/>}
                </div>
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