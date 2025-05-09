import {useAuth0} from "@auth0/auth0-react";
import {useState} from "react";
import {FaUser} from 'react-icons/fa';
import {RiRobot2Line} from 'react-icons/ri';

function NavBar({isFixed = true}) {
    const {loginWithRedirect, logout, isAuthenticated, user, isLoading, getIdTokenClaims} = useAuth0();
    const isAdmin = user?.["https://doodah.secondave.net/roles"]?.includes("Doo Dah Admin") ?? false;
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
                        <RiRobot2Line className="mr-2 text-indigo-600" size={24}/>
                        <div className="text-sm md:text-2xl font-bold tracking-tight">Artificial Unintelligence</div>
                    </div>
                </div>
                {!isLoading ? (
                    isAuthenticated ? (
                        <div className="relative">
                            <button
                                onClick={toggleDropdown}
                                className="hover:bg-indigo-700 hover:text-white font-medium py-2 px-4 rounded-none transition duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 flex items-center shadow-sm"
                            >
                                <FaUser className="mr-2"/>
                                <span>{user.nickname || ""}</span>
                            </button>
                            {dropdownOpen && (
                                <div className="absolute right-0 mt-2 w-48 bg-white shadow-lg z-20">
                                    <button
                                        onClick={() => logout({
                                            logoutParams: {
                                                returnTo: window.location.origin
                                            }
                                        })}
                                        className="block w-full text-left px-4 py-2 text-sm  hover:text-indigo-600 bg-transparent hover:bg-transparent focus:bg-transparent rounded-none transition-colors"
                                    >
                                        Logout
                                    </button>
                                    {isAdmin && (
                                        <button
                                            onClick={() => console.log('Admin Panel')}
                                            className="block w-full text-left px-4 py-2 text-sm hover:text-indigo-600 bg-transparent hover:bg-transparent focus:bg-transparent rounded-none transition-colors"
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
                            className="font-bold py-2 px-6 rounded-none transition duration-300 focus:outline-none"
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