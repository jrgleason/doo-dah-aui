import React from "react";
import TabNavigation from "../../components/Chat/TabNavigation.jsx";
import ChatComponent from "../../components/Chat/ChatComponent.jsx";
import ContentSubmission from "../../components/Content/ContentSubmission.jsx";

function MainPage() {
    return (<div className="w-full h-screen bg-surface-900 text-white flex flex-col">
            {/* Spacer to account for fixed navbar - matches MUI Toolbar heights exactly */}
            <div className="h-[56px] sm:h-[64px] flex-shrink-0"/>
            <div className="container mx-auto px-2 sm:px-4 max-w-5xl flex-1 flex flex-col overflow-hidden min-h-0">
                <div className="bg-surface-800 rounded-lg shadow-lg flex-1 flex flex-col overflow-hidden min-h-0">
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