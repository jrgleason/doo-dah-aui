import {useAuth0} from "@auth0/auth0-react";
import {useState} from "react";
import {FaUser} from 'react-icons/fa';
import {RiRobot2Line} from 'react-icons/ri';

function NavBar({isFixed = true}) {

    const {loginWithRedirect, logout, isAuthenticated, useSelector, isLoading} = useAuth0();

    // const isAdmin = useSelector(
    //     (state) => state.context.isAdmin
    // );
    // TODO: For now everyone is an admin
    const isAdmin = true;

    const [dropdownOpen, setDropdownOpen] = useState(false);

    const toggleDropdown = () => {
        setDropdownOpen(!dropdownOpen);
    };

    const navClasses = `bg-gradient-to-r from-indigo-50 to-blue-50 text-gray-800 border-b border-gray-200 shadow-sm w-full ${isFixed ? 'fixed top-0 z-10' : ''}`;

    return (
        <nav className={navClasses}>
            <div className="w-full px-6 py-4 flex justify-between items-center max-w-7xl mx-auto">
                <div className="flex items-center space-x-3">
                    <div className="text-2xl font-bold flex items-center">
                        <RiRobot2Line className="mr-2 text-indigo-600" size={24} />
                        <h1 className="text-xl font-bold tracking-tight">Artificial Unintelligence</h1>
                    </div>
                </div>
                {!isLoading ? (
                    isAuthenticated ? (
                        <div className="relative">
                            <button
                                onClick={toggleDropdown}
                                className="bg-indigo-600 text-white hover:bg-indigo-700 font-medium py-2 px-4 rounded-full transition duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 flex items-center shadow-sm"
                            >
                                <FaUser className="mr-2" />
                                <span>Account</span>
                            </button>
                            {dropdownOpen && (
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl z-20 overflow-hidden border border-gray-100">
                                    <button
                                        onClick={() => logout({returnTo: window.location.origin})}
                                        className="block w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                    >
                                        Logout
                                    </button>
                                    {isAdmin && (
                                        <button
                                            onClick={() => console.log('Admin Panel')}
                                            className="block w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors border-t border-gray-100"
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
                            className="bg-indigo-600 text-white hover:bg-indigo-700 font-medium py-2 px-6 rounded-full transition duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 shadow-sm"
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