import {useAuth0} from "@auth0/auth0-react";
import {useState} from "react";
import {FaUser} from 'react-icons/fa';
import {RiRobot2Line} from 'react-icons/ri';
import {Button} from "@mui/material";

function NavBar({isFixed = true}) {
    const {loginWithRedirect, logout, isAuthenticated, user, isLoading, getIdTokenClaims } = useAuth0();
    const isAdmin = user?.["https://doodah.secondave.net/roles"]?.includes("Doo Dah Admin") ?? false;
    const [dropdownOpen, setDropdownOpen] = useState(false);

    const toggleDropdown = () => {
        setDropdownOpen(!dropdownOpen);
    };    const navClasses = `border-b border-surface-100 shadow-sm w-full bg-surface-50 ${isFixed ? 'fixed top-0 z-10' : ''}`;

    return (
        <nav className={navClasses}>
            <div className="w-full px-6 py-4 flex justify-between items-center max-w-7xl mx-auto">
                <div className="flex items-center space-x-3">
                    <div className="text-2xl font-bold flex items-center text-brand-300">
                        <RiRobot2Line className="mr-2" size={24}/>
                        <div className="truncate">Artificial Unintelligence</div>
                    </div>
                </div>
                {!isLoading ? (
                    isAuthenticated ? (                        <div className="relative">
                            <Button
                                onClick={toggleDropdown}
                                className="flex align-center items-center text-text-primary hover:text-brand-300"
                            >
                                <FaUser className="mr-2"/>
                                <span>{user.nickname || ""}</span>
                            </Button>
                            {dropdownOpen && (
                                <div 
                                    className="absolute right-0 mt-2 w-48 bg-surface-100 border border-surface-200 rounded-md shadow-lg z-20"
                                >
                                    <button
                                        onClick={() => logout({
                                            logoutParams:{
                                                returnTo: window.location.origin
                                            }
                                        })}
                                        className="w-full my-1 block text-left px-4 py-2 text-sm text-text-primary hover:text-brand-300 hover:bg-surface-200 transition-colors"
                                    >
                                        Logout
                                    </button>                                    {isAdmin && (
                                        <button
                                            onClick={() => console.log('Admin Panel')}
                                            className="w-full my-1 block text-left px-4 py-2 text-sm text-text-primary hover:text-brand-300 hover:bg-surface-200 transition-colors"
                                        >
                                            Admin Panel
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <Button
                            onClick={() => loginWithRedirect()}
                            className="bg-brand-500 hover:bg-brand-600 text-white font-bold py-2 px-6 rounded-full transition duration-300 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-opacity-50"
                        >
                            Login
                        </Button>
                    )
                ) : null}
            </div>
        </nav>
    );
}

export default NavBar;