import React, {useState} from 'react';
import {Database, MessageSquare} from 'lucide-react';

const TabNavigation = ({children}) => {
    const [activeTab, setActiveTab] = useState(0);

    const tabs = React.Children.toArray(children);    return (
        <div className="flex flex-col h-full">
            {/* Tab navigation */}
            <div className="flex border-b border-surface bg-surface-bg px-4 py-2">
                <button
                    className={`flex items-center py-3 px-6 relative mr-2 transition-colors ${
                        activeTab === 0
                            ? 'text-brand-light font-medium bg-surface border-t border-l border-r border-surface rounded-t-lg border-b-2 border-b-brand'
                            : 'text-muted hover:text-primary hover:bg-surface-light'
                    }`}
                    onClick={() => setActiveTab(0)}
                >
                    <MessageSquare size={18} className="mr-2"/>
                    <span>Chat</span>
                </button>
                <button
                    className={`flex items-center py-3 px-6 relative transition-colors ${
                        activeTab === 1
                            ? 'text-brand-light font-medium bg-surface border-t border-l border-r border-surface rounded-t-lg border-b-2 border-b-brand'
                            : 'text-muted hover:text-primary hover:bg-surface-light'
                    }`}
                    onClick={() => setActiveTab(1)}
                >
                    <Database size={18} className="mr-2"/>
                    <span>Add Knowledge</span>
                </button>
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-hidden bg-surface-dark border border-surface rounded-b-lg">
                {tabs.map((tab, index) => (
                    <div
                        key={index}
                        className={`h-full ${activeTab === index ? 'block' : 'hidden'}`}
                    >
                        {tab}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TabNavigation;