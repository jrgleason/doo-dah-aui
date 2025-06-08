import {useAuth0} from "@auth0/auth0-react";
import {useState} from "react";
import {RiRobot2Line} from 'react-icons/ri';
import {
    AppBar,
    Toolbar,
    Typography,
    Button,
    IconButton,
    Menu,
    MenuItem,
    Avatar
} from "@mui/material";
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
    };    return (
        <AppBar 
            position={isFixed ? "fixed" : "static"} 
            sx={{ 
                bgcolor: '#1e293b', // surface-800
                color: 'white',
                borderBottom: '1px solid #475569' // surface-600
            }}
        >
            <Toolbar>
                <RiRobot2Line size={24} style={{ marginRight: 8, color: '#14b8a6' }} /> {/* brand-500 */}
                <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 'bold', color: 'white' }}>
                    Artificial Unintelligence
                </Typography>
                
                {!isLoading && (
                    isAuthenticated ? (
                        <>
                            <IconButton
                                size="large"
                                edge="end"
                                onClick={handleMenuOpen}
                                sx={{ color: 'white' }}
                            >
                                <AccountCircle />
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
                                }}
                                PaperProps={{
                                    sx: {
                                        bgcolor: '#334155', // surface-700
                                        color: 'white',
                                        border: '1px solid #475569' // surface-600
                                    }
                                }}
                            >
                                <MenuItem 
                                    onClick={handleLogout}
                                    sx={{ 
                                        color: 'white',
                                        '&:hover': {
                                            bgcolor: '#475569' // surface-600
                                        }
                                    }}
                                >
                                    Logout
                                </MenuItem>
                                {isAdmin && (
                                    <MenuItem 
                                        onClick={() => console.log('Admin Panel')}
                                        sx={{ 
                                            color: 'white',
                                            '&:hover': {
                                                bgcolor: '#475569' // surface-600
                                            }
                                        }}
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
                            sx={{
                                bgcolor: '#14b8a6', // brand-500
                                color: 'white',
                                '&:hover': {
                                    bgcolor: '#0d9488' // brand-600
                                }
                            }}
                        >
                            Login
                        </Button>
                    )
                )}
            </Toolbar>
        </AppBar>
    );
}

export default NavBar;