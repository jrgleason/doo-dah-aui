import {useAuth0} from "@auth0/auth0-react";
import {useState} from "react";
import {FaUser} from 'react-icons/fa';
import {TokenContext} from "../../providers/token/TokenContext.jsx";

function NavBar({isFixed = true}) {
    const {loginWithRedirect, logout} = useAuth0();
    const isAuthenticated = TokenContext.useSelector(
        (state) => state.context.isAuthenticated
    );
    const isLoaded = TokenContext.useSelector(
        (state) => state.context.isLoaded
    );
    const isAdmin = TokenContext.useSelector(
        (state) => state.context.isAdmin
    );
    const [dropdownOpen, setDropdownOpen] = useState(false);

    const toggleDropdown = () => {
        setDropdownOpen(!dropdownOpen);
    };

    const navClasses = `bg-blue-800 text-white shadow-lg w-full ${isFixed ? 'fixed top-0 z-10' : ''}`;

    return (
        <nav className={navClasses}>
            <div className="w-full px-4 py-4 flex justify-between items-center">
                <div className="flex items-center space-x-2">
                    <div className="text-2xl font-bold">🤖</div>
                    <h1 className="text-xl font-bold">Artificial Unintelligence</h1>
                </div>
                {isLoaded ? (
                    isAuthenticated ? (
                        <div className="relative">
                            <button
                                onClick={toggleDropdown}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-full transition duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                            >
                                <FaUser/>
                            </button>
                            {dropdownOpen && (
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-20">
                                    <button
                                        onClick={() => logout({returnTo: window.location.origin})}
                                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                    >
                                        Logout
                                    </button>
                                    {isAdmin && (
                                        <button
                                            onClick={() => console.log('Admin Panel')}
                                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                        >
                                            Admin Panel
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
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
    );
}

export default NavBar;