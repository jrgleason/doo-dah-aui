import React, {useEffect, useRef, useState} from 'react';
import {Send as SendIcon} from 'lucide-react';
import {useAuth0} from "@auth0/auth0-react";
import {useGlobalConfig} from "../../providers/config/GlobalConfigContext.jsx";
import ReactMarkdown from 'react-markdown';

const ChatComponent = () => {
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const {getAccessTokenSilently} = useAuth0();
    const config = useGlobalConfig();
    const messagesEndRef = useRef(null);
    const eventSourceRef = useRef(null);

    // Auto-scroll to bottom when messages update
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Clean up EventSource on component unmount
    useEffect(() => {
        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
        };
    }, []);

    // Ensure each chat component has its own isolated scroll area
    const scrollToBottom = () => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({behavior: 'smooth'});
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

            // Add initial AI message with empty content
            setMessages(prev => [...prev, {
                type: 'ai',
                content: '',
                timestamp: new Date()
            }]);

            const response = await fetch('/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain',
                    'Authorization': `Bearer ${token}`
                },
                body: userMessage.content
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let accumulatedContent = '';            while (true) {
                const {done, value} = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, {stream: true});
                let textContent = '';

                try {
                    // Try to parse the chunk as JSON
                    const jsonChunk = JSON.parse(chunk);
                    // Extract the text content from the JSON structure
                    textContent = jsonChunk.result?.output?.text || '';
                } catch (error) {
                    // If JSON parsing fails, treat the entire chunk as plain text
                    console.log('Received non-JSON chunk, treating as plain text');
                    textContent = chunk;
                }
                
                accumulatedContent += textContent;

                // Update the AI message with the accumulated content
                setMessages(prev => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1] = {
                        type: 'ai',
                        content: accumulatedContent,
                        timestamp: new Date()
                    };
                    return newMessages;
                });
            }

            setIsLoading(false);

        } catch (error) {
            console.error('Error fetching response:', error);
            // Add error message
            setMessages(prev => [...prev, {
                type: 'error',
                content: `Error: ${error.message || 'Failed to get response'}`,
                timestamp: new Date()
            }]);
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };    // Message bubble component
    const MessageBubble = ({message}) => {
        const isUser = message.type === 'user';
        const isError = message.type === 'error';
        const isEmpty = !message.content && message.type === 'ai';

        return (
            <div className={`flex mb-4 ${
                isUser ? 'justify-end' : 
                isError ? 'justify-center' : 'justify-start'
            }`}>
                <div
                    className={`max-w-3xl p-4 rounded-2xl shadow-lg ${
                        isUser
                            ? 'bg-brand text-white rounded-br-md'
                            : isError
                                ? 'bg-danger text-white rounded-md'
                                : 'bg-surface text-primary rounded-bl-md border-l-4 border-brand'
                    }`}
                >
                    {!isError && (
                        <div className={`text-xs mb-2 font-medium ${
                            isUser ? 'text-primary' : 'text-muted'
                        }`}>
                            {isUser ? 'You' : 'Assistant'}
                        </div>
                    )}
                    <div className="whitespace-pre-wrap break-words leading-relaxed">
                        {isEmpty ? (
                            <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-brand rounded-full animate-pulse"></div>
                                <div className="w-2 h-2 bg-brand rounded-full animate-pulse"
                                     style={{animationDelay: '0.2s'}}></div>
                                <div className="w-2 h-2 bg-brand rounded-full animate-pulse"
                                     style={{animationDelay: '0.4s'}}></div>
                                <span className="text-muted text-sm ml-2">Thinking...</span>
                            </div>
                        ) : (
                            <ReactMarkdown>
                                {message.content}
                            </ReactMarkdown>
                        )}
                    </div>
                    <div className="text-xs mt-1 opacity-70 text-right">
                        {message.timestamp.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                    </div>
                </div>
            </div>
        );
    };return (
        <div className="flex flex-col h-full bg-surface-dark text-primary overflow-hidden">
            {/* Chat header */}
            <div className="bg-surface-bg border-b border-surface px-4 py-3">
                <h1 className="text-lg font-semibold text-center text-brand-light">Chat with AI</h1>
            </div>

            {/* Messages container */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{scrollbarWidth: 'thin'}}>
                {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-center text-muted">
                        <div>
                            <p className="text-xl mb-2">Welcome to Chat</p>
                            <p>Start a conversation with your AI assistant</p>
                        </div>
                    </div>
                ) : (
                    messages.map((msg, index) => (
                        <MessageBubble key={index} message={msg}/>
                    ))
                )}
                <div ref={messagesEndRef}/>
            </div>

            {/* Input area */}
            <div className="bg-surface-bg border-t border-surface p-4">
                <div className="flex gap-3">
                    <textarea
                        className="flex-1 bg-surface text-primary rounded-lg px-4 py-2 border border-surface placeholder-muted focus:border-brand focus:outline-none resize-none"
                        placeholder="Type a message..."
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        rows={1}
                        style={{maxHeight: '120px', overflow: 'auto'}}
                    />
                    <button
                        onClick={handleSendMessage}
                        disabled={!inputMessage.trim() || isLoading}
                        className={`bg-brand hover:bg-brand-hover disabled:bg-surface rounded-lg px-6 py-2 text-primary font-medium transition-colors ${
                            !inputMessage.trim() || isLoading ? 'cursor-not-allowed opacity-50' : ''
                        }`}
                    >
                        <SendIcon size={20}/>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChatComponent;