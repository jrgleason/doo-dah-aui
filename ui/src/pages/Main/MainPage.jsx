import React from "react";
import TabNavigation from "../../components/Chat/TabNavigation.jsx";
import ChatComponent from "../../components/Chat/ChatComponent.jsx";
import ContentSubmission from "../../components/Content/ContentSubmission.jsx";
import {styled} from "@mui/material/styles";

function MainPage() {
    const Offset = styled('div')(({theme}) => ({
        ...theme.mixins.toolbar,
        position: 'static'
    }));
    return (
        <div className={"size-full flex flex-col"}>
            <Offset />
            <TabNavigation>
                <ChatComponent/>
                <ContentSubmission/>
            </TabNavigation>
        </div>
    );
}

export default MainPage;