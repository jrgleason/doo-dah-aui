import robotImage from '../../assets/robot-prop.png';
import React from "react";

function Marketing() {
    return (
        <div className={"w-full h-full bg-surface-900"}>
            <div className="container mx-auto px-4 py-8 max-w-5xl overflow-auto">
                <div className="bg-surface-800">
                    <div className="w-full flex justify-center overflow-hidden bg-danger-600">
                        <img
                            src={robotImage}
                            alt="Make America Dumb Again - Robot Propaganda"
                            className="w-auto h-auto max-h-[700px] object-contain px-4"
                        />
                    </div>
                </div>
                <div className="flex flex-col justify-center items-center py-4 pt-4 text-white">
                    <h2>At the top</h2>
                    <h2 className="pt-[300px]">Made it to the bottom</h2>
                </div>
            </div>
        </div>
    );
}

export default Marketing;