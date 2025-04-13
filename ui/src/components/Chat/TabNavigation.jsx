import React, {useState} from 'react';
import {Database, MessageSquare} from 'lucide-react';

const TabNavigation = ({children}) => {
    const [activeTab, setActiveTab] = useState(0);

    const tabs = React.Children.toArray(children);

    return (
        <div className="flex flex-col h-full">
            {/* Tab navigation */}
            <div className="flex border-b border-gray-200 bg-gray-50 px-4 py-2">
                <button
                    className={`flex items-center py-3 px-6 relative mr-2 ${
                        activeTab === 0
                            ? 'text-indigo-700 font-medium bg-white border-t border-l border-r border-gray-200 rounded-t-lg border-b-2 border-b-indigo-600'
                            : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                    }`}
                    onClick={() => setActiveTab(0)}
                >
                    <MessageSquare size={18} className="mr-2"/>
                    <span>Chat</span>
                </button>
                <button
                    className={`flex items-center py-3 px-6 relative ${
                        activeTab === 1
                            ? 'text-indigo-700 font-medium bg-white border-t border-l border-r border-gray-200 rounded-t-lg border-b-2 border-b-indigo-600'
                            : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                    }`}
                    onClick={() => setActiveTab(1)}
                >
                    <Database size={18} className="mr-2"/>
                    <span>Add Knowledge</span>
                </button>
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-hidden bg-white border border-gray-200 rounded-b-lg">
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