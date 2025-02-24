import React, { useState } from 'react';
import { TextField, Button, Container, Typography } from '@mui/material';
import axios from 'axios';
import {useAuth0} from "@auth0/auth0-react";
import {useGlobalConfig} from "../providers/config/GlobalConfigContext.jsx";

const ChatComponent = () => {
    const [message, setMessage] = useState('');
    const [response, setResponse] = useState('');
    const {getAccessTokenSilently} = useAuth0();
    const config = useGlobalConfig();

    console.log("Making the chat component")

    const handleSendMessage = async () => {
        try {
            const token = await getAccessTokenSilently({
                authorizationParams: {
                    audience: config.audience,
                    scope: config.scope,
                    redirect_uri: window.location.origin
                }
            });
            const res = await axios.post('/chat', message, {
                headers: {
                    'Content-Type': 'text/plain',
                    "Authorization": `Bearer ${token}`
                }
            });
            setResponse(res.data);
        } catch (error) {
            console.error('Error fetching response:', error);
        }
    };

    return (
        <Container className="flex flex-col items-center justify-center min-h-screen p-4">
            <Typography variant="h4" className="mb-4">
                Chat with AI
            </Typography>
            <TextField
                label="Message"
                variant="outlined"
                fullWidth
                className="mb-4"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
            />
            <Button variant="contained" color="primary" onClick={handleSendMessage}>
                Send
            </Button>
            {response && (
                <Typography variant="body1" className="mt-4">
                    Response: {response}
                </Typography>
            )}
        </Container>
    );
};

export default ChatComponent;