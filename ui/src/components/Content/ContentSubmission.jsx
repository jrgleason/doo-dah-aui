import React, {useState} from 'react';
import {Link as LinkIcon, Plus as PlusIcon, Trash as TrashIcon} from 'lucide-react';
import axios from 'axios';
import {useAuth0} from "@auth0/auth0-react";
import {useGlobalConfig} from "../../providers/config/GlobalConfigContext.jsx";

const ContentSubmission = () => {
    const {user} = useAuth0();


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
    const isAdmin = user?.["https://doodah.secondave.net/roles"]?.includes("Doo Dah Admin") ?? false;

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
    };    return (
        <div className="flex flex-col h-full bg-surface-800 rounded-lg shadow-md overflow-hidden">
            {/* Header */}
            <div className="bg-surface-700 border-b border-surface-600 px-4 py-3 shadow-sm">
                <h1 className="text-lg font-semibold text-center text-white">Add to Knowledge Base</h1>
            </div>

            {/* Content area */}
            <div className="flex-1 overflow-y-auto p-4"
                 style={{scrollbarWidth: 'thin'}}>                {/* Feedback message */}
                {feedbackMessage.message && (
                    <div className={`p-3 mb-4 rounded-lg ${
                        feedbackMessage.type === 'error'
                            ? 'bg-danger-900 text-danger-100 border border-danger-500'
                            : 'bg-brand-900 text-brand-100 border border-brand-500'
                    }`}>
                        {feedbackMessage.message}
                    </div>
                )} {/* Submission type toggle */}
                <div className="mb-4">
                    <div className="flex border border-surface-600 rounded-md overflow-hidden">
                        <button
                            className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${
                                submissionType === 'direct'
                                    ? 'bg-brand-500 text-white'
                                    : 'bg-surface-700 text-white hover:bg-surface-600'
                            }`}
                            onClick={() => setSubmissionType('direct')}
                        >
                            Direct Content
                        </button>
                        {isAdmin && (
                            <button
                                className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${
                                    submissionType === 'url'
                                        ? 'bg-brand-500 text-white'
                                        : 'bg-surface-700 text-white hover:bg-surface-600'
                                }`}
                                onClick={() => setSubmissionType('url')}
                            >
                                From URL
                            </button>
                        )}
                    </div>
                </div>                {/* Form */}
                <div className="space-y-4">                    {/* Title */}
                    <div>
                        <label className="block text-sm font-medium text-white mb-1">
                            Title
                        </label>
                        <input
                            type="text"
                            className="w-full px-3 py-2 border border-surface-600 bg-surface-700 text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                            placeholder="Give your submission a title..."
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>
                    {/* Content or URL based on submission type */}
                    {submissionType === 'direct' ? (
                        <div>
                            <label className="block text-sm font-medium text-white mb-1">
                                Content
                            </label>
                            <textarea
                                className="w-full px-3 py-2 border border-surface-600 bg-surface-700 text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                placeholder="Enter your story, information, or knowledge..."
                                rows={10}
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                            />
                        </div>
                    ) : (
                        <div>
                            <label className="block text-sm font-medium text-white mb-1">
                                URL
                            </label>
                            <div className="flex items-center">
                                <div
                                    className="flex-shrink-0 inline-flex items-center px-3 py-2 border border-r-0 border-surface-600 bg-surface-600 text-surface-300 rounded-l-md">
                                    <LinkIcon size={16}/>
                                </div>
                                <input
                                    type="url"
                                    className="flex-1 px-3 py-2 border border-surface-600 bg-surface-700 text-white rounded-r-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                    placeholder="https://example.com/article"
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                />
                            </div>                            {/* Crawl entire site option */}
                            <div className="mt-3">
                                <div className="flex items-center">
                                    <input
                                        id="crawl-entire-site"
                                        type="checkbox"
                                        className="h-4 w-4 text-brand-500 border-surface-600 rounded focus:ring-brand-500"
                                        checked={crawlEntireSite}
                                        onChange={(e) => setCrawlEntireSite(e.target.checked)}
                                    />
                                    <label htmlFor="crawl-entire-site"
                                           className="ml-2 text-sm font-medium text-white">
                                        Crawl entire site
                                    </label>
                                </div>
                                <p className="mt-1 text-sm text-surface-300">
                                    When enabled, we'll crawl and process all pages linked from this URL.
                                </p>
                            </div>
                            {/* Crawl depth slider (only shown when crawl entire site is enabled) */}
                            {crawlEntireSite && (
                                <div className="mt-3">
                                    <label className="block text-sm font-medium text-white mb-1">
                                        Crawl Depth: {crawlDepth}
                                    </label>
                                    <input
                                        type="range"
                                        min="1"
                                        max="5"
                                        step="1"
                                        value={crawlDepth}
                                        onChange={(e) => setCrawlDepth(parseInt(e.target.value))}
                                        className="w-full h-2 bg-surface-600 rounded-lg appearance-none cursor-pointer"
                                    />
                                    <div className="flex justify-between text-xs text-surface-300 mt-1">
                                        <span>Shallow (faster)</span>
                                        <span>Deep (thorough)</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )} {/* Tags */}
                    <div>
                        <label className="block text-sm font-medium text-white mb-1">
                            Tags
                        </label>
                        <div className="flex space-x-2 mb-2">
                            <input
                                type="text"
                                className="flex-1 px-3 py-2 border border-surface-600 bg-surface-700 text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                placeholder="Add tags..."
                                value={currentTag}
                                onChange={(e) => setCurrentTag(e.target.value)}
                                onKeyDown={handleKeyDown}
                            />
                            <button
                                onClick={handleAddTag}
                                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-brand-500 hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500"
                            >
                                <PlusIcon size={16}/>
                            </button>
                        </div>

                        {/* Tags display */}
                        <div className="flex flex-wrap gap-2">
                            {tags.map((tag, index) => (
                                <div
                                    key={index}
                                    className="inline-flex items-center px-2 py-1 rounded-full text-sm bg-brand-900 text-brand-100 tag-item"
                                >
                                    {tag}
                                    <button
                                        onClick={() => handleRemoveTag(tag)}
                                        className="ml-1 text-brand-300 hover:text-brand-100"
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
            <div className="bg-surface-700 border-t border-surface-600 p-4">
                <button
                    onClick={handleSubmit}
                    disabled={isSubmitting || !isFormValid()}
                    className={`w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white transition-colors ${
                        isSubmitting || !isFormValid()
                            ? 'bg-surface-600 cursor-not-allowed'
                            : 'bg-brand-500 hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500'
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