import React, { useState, useRef, useEffect } from 'react';
import { Send as SendIcon } from 'lucide-react';
import axios from 'axios';
import { useAuth0 } from "@auth0/auth0-react";
import { useGlobalConfig } from "../../providers/config/GlobalConfigContext.jsx";
import './ChatComponent.css';

const ChatComponent = ({ chatId = 'default' }) => {
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { getAccessTokenSilently } = useAuth0();
    const config = useGlobalConfig();
    const messagesEndRef = useRef(null);

    // Auto-scroll to bottom when messages update
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Ensure each chat component has its own isolated scroll area
    const scrollToBottom = () => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    };

    const handleSendMessage = async () => {
        if (!inputMessage.trim()) return;

        // Add user message to chat
        const userMessage = {
            type: 'user',
            content: inputMessage,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInputMessage('');
        setIsLoading(true);

        try {
            const token = await getAccessTokenSilently({
                authorizationParams: {
                    audience: config.audience,
                    scope: config.scope,
                    redirect_uri: window.location.origin
                }
            });

            // Add loading message
            setMessages(prev => [...prev, {
                type: 'ai',
                content: '',
                timestamp: new Date()
            }]);

            const res = await axios.post('/chat', userMessage.content, {
                headers: {
                    'Content-Type': 'text/plain',
                    "Authorization": `Bearer ${token}`
                }
            });

            // Replace loading message with actual response
            setMessages(prev => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1] = {
                    type: 'ai',
                    content: res.data,
                    timestamp: new Date()
                };
                return newMessages;
            });

        } catch (error) {
            console.error('Error fetching response:', error);
            // Add error message
            setMessages(prev => [...prev, {
                type: 'error',
                content: `Error: ${error.message || 'Failed to get response'}`,
                timestamp: new Date()
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    // Message bubble component
    const MessageBubble = ({ message }) => {
        const isUser = message.type === 'user';
        const isError = message.type === 'error';
        const isEmpty = !message.content && message.type === 'ai';

        return (
            <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
                <div
                    className={`rounded-2xl px-4 py-3 max-w-[80%] ${
                        isUser
                            ? 'bg-blue-500 text-white rounded-tr-none'
                            : isError
                                ? 'bg-red-100 text-red-700 rounded-tl-none'
                                : 'bg-gray-200 text-gray-800 rounded-tl-none'
                    }`}
                >
                    <div className="whitespace-pre-wrap">
                        {isEmpty ? (
                            <div className="flex justify-center w-full py-2">
                                <div className="flex space-x-1">
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                </div>
                            </div>
                        ) : (
                            message.content
                        )}
                    </div>
                    <div className="text-xs mt-1 opacity-70 text-right">
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full bg-gray-100 rounded-lg shadow-md overflow-hidden">
            {/* Chat header */}
            <div className="bg-white border-b border-gray-200 px-4 py-3 shadow-sm">
                <h1 className="text-lg font-semibold text-center">Chat with AI</h1>
            </div>

            {/* Messages container - each chat window has its own scrollable area */}
            <div className="flex-1 overflow-y-auto p-4" style={{ scrollbarWidth: 'thin' }}>
                {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-500">
                        Send a message to start the conversation
                    </div>
                ) : (
                    messages.map((msg, index) => (
                        <MessageBubble key={index} message={msg} />
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div className="bg-white border-t border-gray-200 p-4">
                <div className="flex space-x-2 items-center">
                    <div className="flex-1 bg-gray-100 rounded-full border border-gray-300">
            <textarea
                className="w-full bg-transparent px-4 py-2 resize-none rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                placeholder="Type a message..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                style={{ maxHeight: '120px', overflow: 'auto' }}
            />
                    </div>
                    <button
                        onClick={handleSendMessage}
                        disabled={!inputMessage.trim() || isLoading}
                        className={`p-3 rounded-full ${
                            inputMessage.trim() && !isLoading
                                ? 'bg-blue-500 hover:bg-blue-600 text-white'
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        } transition-colors`}
                    >
                        <SendIcon size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChatComponent;