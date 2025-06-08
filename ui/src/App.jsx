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
        return <div className="flex items-center justify-center h-screen bg-surface-900">
            <div
                className="w-[50px] h-[50px] border-4 border-surface-600 border-t-brand-500 rounded-full animate-spin"></div>
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
    console.log('Is loaded:', !isLoading);
    return (<div className="h-screen w-full flex flex-col bg-surface-900">
            <NavBar isFixed={true}/>
            <main className="flex-1 w-full bg-surface-900 overflow-hidden">
                {isLoading ? <LoadingLayer/> : null}
                <div className={`h-full w-full ${isAuthenticated ? '' : 'overflow-auto'}`}>
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