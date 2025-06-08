import React from "react";
import TabNavigation from "../../components/Chat/TabNavigation.jsx";
import ChatComponent from "../../components/Chat/ChatComponent.jsx";
import ContentSubmission from "../../components/Content/ContentSubmission.jsx";

function MainPage() {
    return (<div className="w-full h-full bg-surface-900 text-white flex flex-col">
            {/* Spacer to account for fixed navbar - matches MUI Toolbar heights */}
            <div className="h-14 sm:h-16 flex-shrink-0"/>
            <div className="container mx-auto px-2 sm:px-4 max-w-5xl flex-1 flex flex-col overflow-hidden">
                <div className="bg-surface-800 rounded-lg shadow-lg flex-1 flex flex-col overflow-hidden">
                    <TabNavigation>
                        <ChatComponent/>
                        <ContentSubmission/>
                    </TabNavigation>
                </div>
            </div>
        </div>
    );
}

export default MainPage;