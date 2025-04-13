import React, {useState} from 'react';
import {Link as LinkIcon, Plus as PlusIcon, Trash as TrashIcon} from 'lucide-react';
import axios from 'axios';
import {useAuth0} from "@auth0/auth0-react";
import {useGlobalConfig} from "../../providers/config/GlobalConfigContext.jsx";
import {TokenContext} from "../../providers/token/TokenProvider.jsx";
import './ContentSubmission.css';

const ContentSubmission = () => {
    const [submissionType, setSubmissionType] = useState('direct'); // 'direct' or 'url'
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [url, setUrl] = useState('');
    const [crawlEntireSite, setCrawlEntireSite] = useState(false);
    const [crawlDepth, setCrawlDepth] = useState(3);
    const [tags, setTags] = useState([]);
    const [currentTag, setCurrentTag] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [feedbackMessage, setFeedbackMessage] = useState({type: '', message: ''});
    const {getAccessTokenSilently} = useAuth0();
    const config = useGlobalConfig();
    const isAdmin = TokenContext.useSelector(state => state.context.isAdmin);

    const handleAddTag = () => {
        if (currentTag.trim() && !tags.includes(currentTag.trim())) {
            setTags([...tags, currentTag.trim()]);
            setCurrentTag('');
        }
    };

    const handleRemoveTag = (tagToRemove) => {
        setTags(tags.filter(tag => tag !== tagToRemove));
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddTag();
        }
    };

    const resetForm = () => {
        setTitle('');
        setContent('');
        setUrl('');
        setTags([]);
        setCurrentTag('');
        setCrawlEntireSite(false);
        setCrawlDepth(3);
    };

    const isFormValid = () => {
        if (submissionType === 'direct') {
            return title.trim() && content.trim();
        } else {
            return title.trim() && url.trim();
        }
    };

    const handleSubmit = async () => {
        if (!isFormValid()) {
            setFeedbackMessage({
                type: 'error',
                message: submissionType === 'direct'
                    ? 'Please provide both a title and content.'
                    : 'Please provide both a title and a valid URL.'
            });
            return;
        }

        setIsSubmitting(true);
        setFeedbackMessage({type: '', message: ''});

        try {
            const token = await getAccessTokenSilently({
                authorizationParams: {
                    audience: config.audience,
                    scope: config.scope,
                    redirect_uri: window.location.origin
                }
            });

            if (submissionType === 'direct') {
                // Direct content submission
                const payload = {
                    title: title,
                    content: content,
                    tags: tags,
                    dateSubmitted: new Date().toISOString()
                };

                await axios.post('/pinecone/add', payload, {
                    headers: {
                        'Content-Type': 'application/json',
                        "Authorization": `Bearer ${token}`
                    }
                });
            } else {
                // URL submission
                const payload = {
                    url: url,
                    title: title,
                    tags: tags,
                    crawlEntireSite: crawlEntireSite,
                    crawlDepth: crawlDepth
                };

                await axios.post('/pinecone/add-from-url', payload, {
                    headers: {
                        'Content-Type': 'application/json',
                        "Authorization": `Bearer ${token}`
                    }
                });
            }

            setFeedbackMessage({
                type: 'success',
                message: crawlEntireSite
                    ? 'Site crawl has been started! The content will be processed in the background.'
                    : 'Your content has been successfully added to the knowledge base!'
            });
            resetForm();
        } catch (error) {
            console.error('Error submitting content:', error);
            setFeedbackMessage({
                type: 'error',
                message: `Error: ${error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to submit content'}`
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-100 rounded-lg shadow-md overflow-hidden">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-4 py-3 shadow-sm">
                <h1 className="text-lg font-semibold text-center">Add to Knowledge Base</h1>
            </div>

            {/* Content area */}
            <div className="flex-1 overflow-y-auto p-4" style={{scrollbarWidth: 'thin'}}>
                {/* Feedback message */}
                {feedbackMessage.message && (
                    <div className={`p-3 mb-4 rounded-lg ${
                        feedbackMessage.type === 'error'
                            ? 'bg-red-100 text-red-800 border border-red-200'
                            : 'bg-green-100 text-green-800 border border-green-200'
                    }`}>
                        {feedbackMessage.message}
                    </div>
                )}

                {/* Submission type toggle */}
                <div className="mb-4">
                    <div className="flex border border-gray-300 rounded-md overflow-hidden">
                        <button
                            className={`flex-1 py-2 px-4 text-sm font-medium ${
                                submissionType === 'direct'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-white text-gray-700 hover:bg-gray-100'
                            }`}
                            onClick={() => setSubmissionType('direct')}
                        >
                            Direct Content
                        </button>
                        {isAdmin && (
                            <button
                                className={`flex-1 py-2 px-4 text-sm font-medium ${
                                    submissionType === 'url'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-white text-gray-700 hover:bg-gray-100'
                                }`}
                                onClick={() => setSubmissionType('url')}
                            >
                                From URL
                            </button>
                        )}
                    </div>
                </div>

                {/* Form */}
                <div className="space-y-4">
                    {/* Title */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Title
                        </label>
                        <input
                            type="text"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Give your submission a title..."
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>

                    {/* Content or URL based on submission type */}
                    {submissionType === 'direct' ? (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Content
                            </label>
                            <textarea
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Enter your story, information, or knowledge..."
                                rows={10}
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                            />
                        </div>
                    ) : (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                URL
                            </label>
                            <div className="flex items-center">
                                <div
                                    className="flex-shrink-0 inline-flex items-center px-3 py-2 border border-r-0 border-gray-300 bg-gray-50 text-gray-500 rounded-l-md">
                                    <LinkIcon size={16}/>
                                </div>
                                <input
                                    type="url"
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-r-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="https://example.com/article"
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                />
                            </div>

                            {/* Crawl entire site option */}
                            <div className="mt-3">
                                <div className="flex items-center">
                                    <input
                                        id="crawl-entire-site"
                                        type="checkbox"
                                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                        checked={crawlEntireSite}
                                        onChange={(e) => setCrawlEntireSite(e.target.checked)}
                                    />
                                    <label htmlFor="crawl-entire-site"
                                           className="ml-2 text-sm font-medium text-gray-700">
                                        Crawl entire site
                                    </label>
                                </div>
                                <p className="mt-1 text-sm text-gray-500">
                                    When enabled, we'll crawl and process all pages linked from this URL.
                                </p>
                            </div>

                            {/* Crawl depth slider (only shown when crawl entire site is enabled) */}
                            {crawlEntireSite && (
                                <div className="mt-3">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Crawl Depth: {crawlDepth}
                                    </label>
                                    <input
                                        type="range"
                                        min="1"
                                        max="5"
                                        step="1"
                                        value={crawlDepth}
                                        onChange={(e) => setCrawlDepth(parseInt(e.target.value))}
                                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                    />
                                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                                        <span>Shallow (faster)</span>
                                        <span>Deep (thorough)</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Tags */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Tags
                        </label>
                        <div className="flex space-x-2 mb-2">
                            <input
                                type="text"
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Add tags..."
                                value={currentTag}
                                onChange={(e) => setCurrentTag(e.target.value)}
                                onKeyDown={handleKeyDown}
                            />
                            <button
                                onClick={handleAddTag}
                                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                <PlusIcon size={16}/>
                            </button>
                        </div>

                        {/* Tags display */}
                        <div className="flex flex-wrap gap-2">
                            {tags.map((tag, index) => (
                                <div
                                    key={index}
                                    className="inline-flex items-center px-2 py-1 rounded-full text-sm bg-blue-100 text-blue-800 tag-item"
                                >
                                    {tag}
                                    <button
                                        onClick={() => handleRemoveTag(tag)}
                                        className="ml-1 text-blue-600 hover:text-blue-800"
                                    >
                                        <TrashIcon size={14}/>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Submit button */}
            <div className="bg-white border-t border-gray-200 p-4">
                <button
                    onClick={handleSubmit}
                    disabled={isSubmitting || !isFormValid()}
                    className={`w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                        isSubmitting || !isFormValid()
                            ? 'bg-gray-300 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                    }`}
                >
                    {isSubmitting ? (
                        <div className="flex items-center">
                            <div
                                className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                            {crawlEntireSite ? 'Starting Crawler...' : 'Submitting...'}
                        </div>
                    ) : (
                        <span>
                            {crawlEntireSite
                                ? 'Start Crawling Site'
                                : 'Submit to Knowledge Base'}
                        </span>
                    )}
                </button>
            </div>
        </div>
    );
};

export default ContentSubmission;