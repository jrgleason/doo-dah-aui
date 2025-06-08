import React, {useState} from 'react';
import {Database, MessageSquare} from 'lucide-react';

const TabNavigation = ({children}) => {
    const [activeTab, setActiveTab] = useState(0);

    const tabs = React.Children.toArray(children);    return (        <div className="flex flex-col h-full min-h-0">
            {/* Tab navigation */}
            <div className="flex border-b border-surface-600 bg-surface-700 px-2 py-1 sm:px-4 sm:py-2 flex-shrink-0">
                <button
                    className={`flex items-center py-2 px-3 sm:py-3 sm:px-6 relative mr-2 transition-colors text-sm sm:text-base ${
                        activeTab === 0
                            ? 'text-white font-medium bg-surface-800 border-t border-l border-r border-surface-600 rounded-t-lg border-b-2 border-b-brand-500'
                            : 'text-surface-300 hover:text-white hover:bg-surface-600'
                    }`}
                    onClick={() => setActiveTab(0)}
                >
                    <MessageSquare size={16} className="mr-2 sm:w-[18px] sm:h-[18px]"/>
                    <span>Chat</span>
                </button>
                <button
                    className={`flex items-center py-2 px-3 sm:py-3 sm:px-6 relative transition-colors text-sm sm:text-base ${
                        activeTab === 1
                            ? 'text-white font-medium bg-surface-800 border-t border-l border-r border-surface-600 rounded-t-lg border-b-2 border-b-brand-500'
                            : 'text-surface-300 hover:text-white hover:bg-surface-600'
                    }`}
                    onClick={() => setActiveTab(1)}
                >
                    <Database size={16} className="mr-2 sm:w-[18px] sm:h-[18px]"/>
                    <span>Add Knowledge</span>
                </button>
            </div>
            {/* Tab content */}
            <div className="flex-1 bg-surface-800 border border-surface-600 rounded-b-lg min-h-0 overflow-hidden">
                {tabs.map((tab, index) => (
                    <div
                        key={index}
                        className={`h-full min-h-0 ${activeTab === index ? 'block' : 'hidden'}`}
                    >
                        {tab}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TabNavigation;