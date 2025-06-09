import robotImage from '../../assets/robot-prop.png';
import React from "react";
import {styled} from "@mui/material/styles";

function Marketing() {
    const Offset = styled('div')(({theme}) => ({
        ...theme.mixins.toolbar,
        position: 'static'
    }));
    return (
            <div className={"size-full bg-surface-900 overflow-auto"}>
                <Offset />
                <div className="w-full flex flex-col justify-center overflow-hidden bg-danger-600">
                    <img
                        src={robotImage}
                        alt="Make AI Dumb Again - Robot Propaganda"
                        className="w-auto h-auto max-h-[700px] object-contain px-4"
                    />
                    <div className="flex flex-col justify-center items-center py-4 pt-4 text-white">
                        <h2>At the top</h2>
                        <h2 className="pt-[300px]">Made it to the bottom</h2>
                    </div>
                </div>
            </div>
    );
}

export default Marketing;