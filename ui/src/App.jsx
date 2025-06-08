import './App.css';
import Marketing from "./pages/Marketing/Marketing.jsx";
import {Auth0Provider, useAuth0} from '@auth0/auth0-react';
import {GlobalConfigProvider, useGlobalConfig} from "./providers/config/GlobalConfigContext.jsx";
import NavBar from "./components/NavBar/NavBar.jsx";
import MainPage from "./pages/Main/MainPage.jsx";
import LoadingLayer from "./pages/Loading/LoadingLayer.jsx";

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
            <AppContentWithAuth/>
        </Auth0Provider>
    );
}

function AppContentWithAuth() {
    const {isAuthenticated, isLoading} = useAuth0();
    console.log('Is authenticated:', isAuthenticated);
    console.log('Is loaded:', !isLoading);    return (
        <div className="root-wrapper bg-surface-50">
            <NavBar isFixed={true}/>
            <main className="root-main overflow-auto bg-surface-50">
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