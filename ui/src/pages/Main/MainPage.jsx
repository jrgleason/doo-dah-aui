import React from "react";
import TabNavigation from "../../components/Chat/TabNavigation.jsx";
import ChatComponent from "../../components/Chat/ChatComponent.jsx";
import ContentSubmission from "../../components/Content/ContentSubmission.jsx";
import {TokenContext} from "../../providers/token/TokenContext.jsx";

function MainPage() {
    const isAdmin = TokenContext.useSelector(
        (state) => state.context.isAdmin
    );
    return (
        <div className="container mx-auto px-4 py-8 max-w-5xl">
            <div className="bg-white rounded-lg shadow-lg overflow-hidden" style={{height: "calc(100vh - 180px)"}}>
                <TabNavigation>
                    <ChatComponent/>
                    {isAdmin ? (<ContentSubmission/>) : null}
                </TabNavigation>
            </div>
        </div>
    );
}

export default MainPage;