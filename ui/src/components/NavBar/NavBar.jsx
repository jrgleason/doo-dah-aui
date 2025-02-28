import { useAuth0 } from "@auth0/auth0-react";
import React, { useState } from "react";
import { TokenContext } from "../../providers/token/TokenContext.jsx";
import Box from '@mui/material/Box';
import Avatar from '@mui/material/Avatar';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import Button from '@mui/material/Button';
import AdminPanelSettings from '@mui/icons-material/AdminPanelSettings';
import Logout from '@mui/icons-material/Logout';

function NavBar({ isFixed = true }) {
    const { loginWithRedirect, logout, user } = useAuth0();
    const isAuthenticated = TokenContext.useSelector(
        (state) => state.context.isAuthenticated
    );
    const isLoaded = TokenContext.useSelector(
        (state) => state.context.isLoaded
    );
    const isAdmin = TokenContext.useSelector(
        (state) => state.context.isAdmin
    );

    // For Material UI Menu component
    const [anchorEl, setAnchorEl] = useState(null);
    const open = Boolean(anchorEl);

    const handleClick = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleLogout = () => {
        logout({ returnTo: window.location.origin });
        handleClose();
    };

    const handleAdminPanel = () => {
        console.log('Admin Panel');
        handleClose();
    };

    const navClasses = `bg-blue-800 text-white shadow-lg w-full ${isFixed ? 'fixed top-0 z-10' : ''}`;

    // Get user's initials for the avatar
    const getUserInitials = () => {
        if (user && user.name) {
            const names = user.name.split(' ');
            if (names.length >= 2) {
                return `${names[0][0]}${names[1][0]}`.toUpperCase();
            }
            return user.name[0].toUpperCase();
        }
        return 'U'; // Default fallback
    };

    return (
        <nav className={navClasses}>
            <div className="w-full px-4 py-4 flex justify-between items-center">
                <div className="flex items-center space-x-2">
                    <div className="text-2xl font-bold">🤖</div>
                    <Typography variant="h6" component="h1" sx={{ fontWeight: 'bold', color: 'white' }}>
                        Artificial Unintelligence
                    </Typography>
                </div>
                {isLoaded ? (
                    isAuthenticated ? (
                        <React.Fragment>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                {user && user.name && (
                                    <Typography sx={{ color: 'white', mr: 1 }}>
                                        {user.name}
                                    </Typography>
                                )}
                                <Tooltip title="Account settings">
                                    <IconButton
                                        onClick={handleClick}
                                        size="small"
                                        sx={{
                                            ml: 1,
                                            border: '2px solid white',
                                            backgroundColor: '#2563eb', // blue-600
                                            '&:hover': {
                                                backgroundColor: '#1d4ed8', // blue-700
                                            }
                                        }}
                                        aria-controls={open ? 'account-menu' : undefined}
                                        aria-haspopup="true"
                                        aria-expanded={open ? 'true' : undefined}
                                    >
                                        <Avatar sx={{ width: 32, height: 32, bgcolor: '#1e40af' }}>
                                            {getUserInitials()}
                                        </Avatar>
                                    </IconButton>
                                </Tooltip>
                            </Box>
                            <Menu
                                anchorEl={anchorEl}
                                id="account-menu"
                                open={open}
                                onClose={handleClose}
                                onClick={handleClose}
                                slotProps={{
                                    paper: {
                                        elevation: 0,
                                        sx: {
                                            overflow: 'visible',
                                            filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
                                            mt: 1.5,
                                            '& .MuiAvatar-root': {
                                                width: 32,
                                                height: 32,
                                                ml: -0.5,
                                                mr: 1,
                                            },
                                            '&::before': {
                                                content: '""',
                                                display: 'block',
                                                position: 'absolute',
                                                top: 0,
                                                right: 14,
                                                width: 10,
                                                height: 10,
                                                bgcolor: 'background.paper',
                                                transform: 'translateY(-50%) rotate(45deg)',
                                                zIndex: 0,
                                            },
                                        },
                                    },
                                }}
                                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                            >
                                {isAdmin && (
                                    <MenuItem onClick={handleAdminPanel}>
                                        <ListItemIcon>
                                            <AdminPanelSettings fontSize="small" />
                                        </ListItemIcon>
                                        Admin Panel
                                    </MenuItem>
                                )}

                                {isAdmin && <Divider />}

                                <MenuItem onClick={handleLogout}>
                                    <ListItemIcon>
                                        <Logout fontSize="small" />
                                    </ListItemIcon>
                                    Logout
                                </MenuItem>
                            </Menu>
                        </React.Fragment>
                    ) : (
                        <Button
                            onClick={() => loginWithRedirect()}
                            variant="contained"
                            color="error"
                            sx={{
                                borderRadius: '9999px',
                                padding: '8px 24px',
                                backgroundColor: '#dc2626', // red-600
                                '&:hover': {
                                    backgroundColor: '#b91c1c', // red-700
                                },
                                fontWeight: 'bold',
                            }}
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