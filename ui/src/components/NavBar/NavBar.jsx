import {useAuth0} from "@auth0/auth0-react";
import React, {useState} from "react";
import {RiRobot2Line} from 'react-icons/ri';
import {AppBar, Button, IconButton, Menu, MenuItem, Toolbar, Typography} from "@mui/material";
import {AccountCircle} from "@mui/icons-material";

function NavBar({isFixed = true}) {
    const {loginWithRedirect, logout, isAuthenticated, user, isLoading} = useAuth0();
    const isAdmin = user?.["https://doodah.secondave.net/roles"]?.includes("Doo Dah Admin") ?? false;
    const [anchorEl, setAnchorEl] = useState(null);
    const handleMenuOpen = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    const handleLogout = () => {
        handleMenuClose();
        logout({
            logoutParams: {
                returnTo: window.location.origin
            }
        });
    };
    return (        <React.Fragment>
            <AppBar
                position={isFixed ? "fixed" : "static"}
                className="bg-surface-800 border-b border-surface-600"
            >   
                <Toolbar>
                    <RiRobot2Line size={24} className="mr-2 text-brand-500"/>
                    <Typography variant="h6" component="div" className="flex-grow font-bold text-white">
                        Artificial Unintelligence
                    </Typography>

                    {!isLoading && (
                        isAuthenticated ? (
                            <>
                                <IconButton
                                    size="large"
                                    edge="end"
                                    onClick={handleMenuOpen}
                                    sx={{color: 'white'}}
                                >
                                    <AccountCircle/>
                                </IconButton>
                                <Menu
                                    anchorEl={anchorEl}
                                    open={Boolean(anchorEl)}
                                    onClose={handleMenuClose}
                                    anchorOrigin={{
                                        vertical: 'bottom',
                                        horizontal: 'right',
                                    }}
                                    transformOrigin={{
                                        vertical: 'top',
                                        horizontal: 'right',
                                    }}                                > <MenuItem
                                    onClick={handleLogout}
                                    className="hover:bg-surface-600"
                                >
                                    Logout
                                </MenuItem>                                    {isAdmin && (
                                        <MenuItem
                                            onClick={() => console.log('Admin Panel')}
                                            className="hover:bg-surface-600"
                                        >
                                            Admin Panel
                                        </MenuItem>
                                    )}
                                </Menu>
                            </>
                        ) : (                            
                            <Button
                                variant="contained"
                                onClick={() => loginWithRedirect()}
                                className="hover:bg-brand-600 bg-brand-500 text-white"
                            >
                                Login
                            </Button>
                        )
                    )}
                </Toolbar>
            </AppBar>
        </React.Fragment>
    );
}

export default NavBar;