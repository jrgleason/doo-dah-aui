import React from "react";
import TabNavigation from "../../components/Chat/TabNavigation.jsx";
import ChatComponent from "../../components/Chat/ChatComponent.jsx";
import ContentSubmission from "../../components/Content/ContentSubmission.jsx";
import {styled} from "@mui/material/styles";

function MainPage() {
    const Offset = styled('div')(({theme}) => ({
        ...theme.mixins.toolbar,
        position: 'relative'
    }));
    return (
        <React.Fragment>
            <Offset />
            <Offset />
            <TabNavigation>
                <ChatComponent/>
                <ContentSubmission/>
            </TabNavigation>
        </React.Fragment>
    );
}

export default MainPage;