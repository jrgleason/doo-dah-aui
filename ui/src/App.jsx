import {useEffect, useState} from 'react';
import './App.css';
import Marketing from "./pages/marketing/Marketing.jsx";
import { Auth0Provider, useAuth0 } from '@auth0/auth0-react';
import {GlobalConfigProvider, useGlobalConfig} from "./providers/config/GlobalConfigContext.jsx";
import ChatComponent from "./components/ChatComponent.jsx";

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
            <AppContentWithAuth />
        </Auth0Provider>
    );
}

function AppContentWithAuth() {
    const {loginWithRedirect, logout, getAccessTokenSilently} = useAuth0();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);
    useEffect(() => {
        const checkAuth = async () => {
            try {
                console.log("Checking auth");
                await getAccessTokenSilently();
                setIsAuthenticated(true);
                setIsLoaded(true);
            } catch (error) {
                console.error('Error checking authentication:', error);
                setIsAuthenticated(false);
                setIsLoaded(true);
            }
        };
        console.log("Calling Check Auth");
        checkAuth().catch(console.error);
    }, [getAccessTokenSilently]);

    return (
        <div className="root-wrapper">
            <nav className="bg-blue-800 text-white shadow-lg fixed w-full top-0 z-10">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                        <div className="text-2xl font-bold">🤖</div>
                        <h1 className="text-xl font-bold">Artificial Unintelligence</h1>
                    </div>
                    {isLoaded ? (
                        isAuthenticated ? (
                            <button
                                onClick={() => logout({returnTo: window.location.origin})}
                                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-full transition duration-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
                            >
                                Logout
                            </button>
                        ) : (
                            <button
                                onClick={() => loginWithRedirect()}
                                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-full transition duration-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
                            >
                                Login
                            </button>
                        )
                    ) : null}
                </div>
            </nav>
            <main className="root-main z-0">
                {/*For styling to line up adding fake header*/}
                <nav className="bg-blue-800 text-white shadow-lg">
                    <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                            <h1 className="text-xl font-bold">Artificial Unintelligence</h1>
                        </div>
                    </div>
                </nav>
                {!isLoaded ? (
                    <div style={{backgroundColor: 'rgba(255, 255, 255, 0.75)'}}
                         className="absolute inset-0 flex items-center justify-center z-50">
                        <div className="spinner"></div>
                    </div>
                ) : (
                    isAuthenticated ? <ChatComponent /> : <Marketing />
                )}
            </main>
        </div>
    );
}

function App() {
    return (
        <GlobalConfigProvider>
            <AppContent />
        </GlobalConfigProvider>
    );
}

export default App;