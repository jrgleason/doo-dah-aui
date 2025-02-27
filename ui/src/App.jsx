import {useEffect, useRef, useState} from 'react';
import './App.css';
import Marketing from "./pages/marketing/Marketing.jsx";
import {Auth0Provider, useAuth0} from '@auth0/auth0-react';
import {GlobalConfigProvider, useGlobalConfig} from "./providers/config/GlobalConfigContext.jsx";
import NavBar from "./components/NavBar/NavBar.jsx";
import MainPage from "./pages/Main/MainPage.jsx";
import LoadingLayer from "./pages/Loading/LoadingLayer.jsx";
import {TokenProvider} from "./providers/token/TokenContext.jsx";

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
    const { getAccessTokenSilently } = useAuth0();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);
    const isCheckingAuth = useRef(false);
    useEffect(() => {
        const checkAuth = async () => {
            console.log("Checking the auth");
            if (isCheckingAuth.current) return;
            isCheckingAuth.current = true;
            try {
                await getAccessTokenSilently();
                setIsAuthenticated(true);
            } catch (error) {
                console.error('Error checking authentication:', error);
                setIsAuthenticated(false);
            } finally {
                setIsLoaded(true);
            }
        };
        checkAuth().catch(console.error);
    }, []);

    return (
        <div className="root-wrapper">
            <NavBar isAuthenticated={isAuthenticated} isLoaded={isLoaded}/>
            <main className="root-main z-0">
                <NavBar isFixed={false} />
                {!isLoaded ? <LoadingLayer /> : null}
                {isAuthenticated ? <MainPage /> : <Marketing />}
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