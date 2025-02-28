import React, {useState} from 'react';
import {Database, MessageSquare} from 'lucide-react';
import {TokenContext} from "../../providers/token/TokenContext.jsx";

const TabNavigation = ({children}) => {
    const isAdmin = TokenContext.useSelector(
        (state) => state.context.isAdmin
    );
    const [activeTab, setActiveTab] = useState(0);

    const tabs = React.Children.toArray(children);

    // If user is not admin, only show the first tab (Chat)
    if (!isAdmin) {
        return (
            <div className="flex flex-col h-full">
                {/* No tab navigation needed for non-admins */}
                <div className="flex-1 overflow-hidden">
                    {tabs[0]} {/* Only show the first tab (Chat) */}
                </div>
            </div>
        );
    }

    // For admin users, show the full tab navigation
    return (
        <div className="flex flex-col h-full">
            {/* Tab navigation - only shown to admins */}
            <div className="flex border-b border-gray-200 bg-white">
                <button
                    className={`flex items-center py-3 px-4 ${
                        activeTab === 0
                            ? 'text-blue-600 border-b-2 border-blue-600 font-medium'
                            : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                    onClick={() => setActiveTab(0)}
                >
                    <MessageSquare size={18} className="mr-2"/>
                    <span>Chat</span>
                </button>
                <button
                    className={`flex items-center py-3 px-4 ${
                        activeTab === 1
                            ? 'text-blue-600 border-b-2 border-blue-600 font-medium'
                            : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                    onClick={() => setActiveTab(1)}
                >
                    <Database size={18} className="mr-2"/>
                    <span>Add Knowledge</span>
                </button>
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-hidden">
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