import React, {useState} from 'react';
import {Link as LinkIcon, Plus as PlusIcon, Trash as TrashIcon} from 'lucide-react';
import axios from 'axios';
import {useAuth0} from "@auth0/auth0-react";
import {useGlobalConfig} from "../../providers/config/GlobalConfigContext.jsx";

const INITIAL_STATE = {
    submissionType: 'direct',
    title: '',
    content: '',
    url: '',
    crawlEntireSite: false,
    crawlDepth: 3,
    tags: [],
    currentTag: '',
    isSubmitting: false,
    feedbackMessage: {type: '', message: ''}
};

const ContentSubmission = () => {
    const {user, getAccessTokenSilently} = useAuth0();
    const config = useGlobalConfig();
    const isAdmin = user?.["https://doodah.secondave.net/roles"]?.includes("Doo Dah Admin") ?? false;

    const [state, setState] = useState(INITIAL_STATE);

    const updateState = (updates) => setState(prev => ({...prev, ...updates}));
    const handleAddTag = () => {
        const trimmedTag = state.currentTag.trim();
        if (trimmedTag && !state.tags.includes(trimmedTag)) {
            updateState({
                tags: [...state.tags, trimmedTag],
                currentTag: ''
            });
        }
    };

    const handleRemoveTag = (tagToRemove) => {
        updateState({tags: state.tags.filter(tag => tag !== tagToRemove)});
    };

    const resetForm = () => updateState(INITIAL_STATE);

    const isFormValid = () => {
        const {submissionType, title, content, url} = state;
        return submissionType === 'direct'
            ? title.trim() && content.trim()
            : title.trim() && url.trim();
    };

    const showFeedback = (type, message) => {
        updateState({feedbackMessage: {type, message}});
    };
    const handleSubmit = async () => {
        if (!isFormValid()) {
            const message = state.submissionType === 'direct'
                ? 'Please provide both a title and content.'
                : 'Please provide both a title and a valid URL.';
            showFeedback('error', message);
            return;
        }

        updateState({isSubmitting: true, feedbackMessage: {type: '', message: ''}});

        try {
            const token = await getAccessTokenSilently({
                authorizationParams: {
                    audience: config.audience,
                    scope: config.scope,
                    redirect_uri: window.location.origin
                }
            });

            const payload = state.submissionType === 'direct'
                ? {
                    title: state.title,
                    content: state.content,
                    tags: state.tags,
                    dateSubmitted: new Date().toISOString()
                }
                : {
                    url: state.url,
                    title: state.title,
                    tags: state.tags,
                    crawlEntireSite: state.crawlEntireSite,
                    crawlDepth: state.crawlDepth
                };

            const endpoint = state.submissionType === 'direct' ? '/pinecone/add' : '/pinecone/add-from-url';

            await axios.post(endpoint, payload, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            const successMessage = state.crawlEntireSite
                ? 'Site crawl has been started! The content will be processed in the background.'
                : 'Your content has been successfully added to the knowledge base!';

            showFeedback('success', successMessage);
            resetForm();
        } catch (error) {
            console.error('Error submitting content:', error);
            const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to submit content';
            showFeedback('error', `Error: ${errorMessage}`);
        } finally {
            updateState({isSubmitting: false});
        }
    };

    // Helper components
    const FeedbackMessage = ({message}) => message.message && (
        <div className={`p-3 rounded-lg ${
            message.type === 'error'
                ? 'bg-danger-900 text-danger-100 border border-danger-500'
                : 'bg-brand-900 text-brand-100 border border-brand-500'
        }`}>
            {message.message}
        </div>
    );

    const InputField = ({label, type = 'text', placeholder, value, onChange, rows, icon}) => (
        <div>
            <label className="block text-sm font-medium text-white mb-2">{label}</label>
            {icon ? (
                <div className="flex items-center">
                    <div
                        className="flex-shrink-0 inline-flex items-center px-3 py-2 border border-r-0 border-surface-600 bg-surface-600 text-surface-300 rounded-l-md">
                        {icon}
                    </div>
                    <input
                        type={type}
                        className="flex-1 px-3 py-2 border border-surface-600 bg-surface-700 text-white rounded-r-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                        placeholder={placeholder}
                        value={value}
                        onChange={onChange}
                    />
                </div>
            ) : rows ? (
                <textarea
                    className="w-full px-3 py-2 border border-surface-600 bg-surface-700 text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 resize-none"
                    placeholder={placeholder}
                    rows={rows}
                    value={value}
                    onChange={onChange}
                />
            ) : (
                <input
                    type={type}
                    className="w-full px-3 py-2 border border-surface-600 bg-surface-700 text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                    placeholder={placeholder}
                    value={value}
                    onChange={onChange}
                />
            )}
        </div>
    );

    const TagDisplay = () => (
        <div className="flex flex-wrap gap-2">
            {state.tags.map((tag, index) => (
                <div key={index}
                     className="inline-flex items-center px-2 py-1 rounded-full text-sm bg-brand-900 text-brand-100">
                    {tag}
                    <button onClick={() => handleRemoveTag(tag)} className="ml-1 text-brand-300 hover:text-brand-100">
                        <TrashIcon size={14}/>
                    </button>
                </div>
            ))}
        </div>
    );

    return (
        <div className="h-full flex flex-col bg-surface-800 text-white">
            {/* Header */}
            <div className="bg-surface-700 border-b border-surface-600 px-4 py-3 flex-shrink-0">
                <h1 className="text-lg font-semibold text-center text-white">Add to Knowledge Base</h1>
            </div>
            {/* Scrollable Content area */}
            <div className="flex-1 min-h-0">
                <div className="p-4 overflow-y-auto space-y-4 w-full h-full">
                    <FeedbackMessage message={state.feedbackMessage}/>

                    {/* Submission type toggle */}
                    <div className="flex border border-surface-600 rounded-md overflow-hidden">
                        <button
                            className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${
                                state.submissionType === 'direct'
                                    ? 'bg-brand-500 text-white'
                                    : 'bg-surface-700 text-white hover:bg-surface-600'
                            }`}
                            onClick={() => updateState({submissionType: 'direct'})}
                        >
                            Direct Content
                        </button>
                        {isAdmin && (
                            <button
                                className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${
                                    state.submissionType === 'url'
                                        ? 'bg-brand-500 text-white'
                                        : 'bg-surface-700 text-white hover:bg-surface-600'
                                }`}
                                onClick={() => updateState({submissionType: 'url'})}
                            >
                                From URL
                            </button>
                        )}
                    </div>

                    <InputField
                        label="Title"
                        placeholder="Give your submission a title..."
                        value={state.title}
                        onChange={(e) => updateState({title: e.target.value})}
                    /> {state.submissionType === 'direct' ? (
                    <InputField
                        label="Content"
                        placeholder="Enter your story, information, or knowledge..."
                        rows={4}
                        value={state.content}
                        onChange={(e) => updateState({content: e.target.value})}
                    />
                ) : (
                    <div className="space-y-4">
                        <InputField
                            label="URL"
                            type="url"
                            placeholder="https://example.com/article"
                            value={state.url}
                            onChange={(e) => updateState({url: e.target.value})}
                            icon={<LinkIcon size={16}/>}
                        />

                        <div>
                            <div className="flex items-center">
                                <input
                                    id="crawl-entire-site"
                                    type="checkbox"
                                    className="h-4 w-4 text-brand-500 border-surface-600 rounded focus:ring-brand-500"
                                    checked={state.crawlEntireSite}
                                    onChange={(e) => updateState({crawlEntireSite: e.target.checked})}
                                />
                                <label htmlFor="crawl-entire-site" className="ml-2 text-sm font-medium text-white">
                                    Crawl entire site
                                </label>
                            </div>
                            <p className="mt-1 text-sm text-surface-300">
                                When enabled, we'll crawl and process all pages linked from this URL.
                            </p>
                        </div>

                        {state.crawlEntireSite && (
                            <div>
                                <label className="block text-sm font-medium text-white mb-2">
                                    Crawl Depth: {state.crawlDepth}
                                </label>
                                <input
                                    type="range"
                                    min="1"
                                    max="5"
                                    step="1"
                                    value={state.crawlDepth}
                                    onChange={(e) => updateState({crawlDepth: parseInt(e.target.value)})}
                                    className="w-full h-2 bg-surface-600 rounded-lg appearance-none cursor-pointer"
                                />
                                <div className="flex justify-between text-xs text-surface-300 mt-1">
                                    <span>Shallow (faster)</span>
                                    <span>Deep (thorough)</span>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                    {/* Tags */}
                    <div>
                        <label className="block text-sm font-medium text-white mb-2">Tags</label>
                        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 mb-3">
                            <input
                                type="text"
                                className="flex-1 px-3 py-2 border border-surface-600 bg-surface-700 text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                placeholder="Add tags..."
                                value={state.currentTag}
                                onChange={(e) => updateState({currentTag: e.target.value})}
                                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                            />
                            <button
                                onClick={handleAddTag}
                                className="inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-brand-500 hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 sm:w-auto w-full"
                            >
                                <PlusIcon size={16} className="sm:mr-0 mr-2"/>
                                <span className="sm:hidden">Add Tag</span>
                            </button>
                        </div>
                        <TagDisplay/>
                    </div>
                </div>
            </div>

            {/* Submit button */}
            <div className="bg-surface-700 border-t border-surface-600 p-4 flex-shrink-0">
                <button
                    onClick={handleSubmit}
                    disabled={state.isSubmitting || !isFormValid()}
                    className={`w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white transition-colors ${
                        state.isSubmitting || !isFormValid()
                            ? 'bg-surface-600 cursor-not-allowed'
                            : 'bg-brand-500 hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500'
                    }`}
                >
                    {state.isSubmitting ? (
                        <div className="flex items-center">
                            <div
                                className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                            {state.crawlEntireSite ? 'Starting Crawler...' : 'Submitting...'}
                        </div>
                    ) : (
                        <span>
                            {state.crawlEntireSite ? 'Start Crawling Site' : 'Submit to Knowledge Base'}
                        </span>
                    )}
                </button>
            </div>
        </div>
    );
};

export default ContentSubmission;