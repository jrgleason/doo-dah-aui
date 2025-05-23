import robotImage from '../../assets/robot-prop.png';

function Marketing() {
    return (
        <div className="w-full h-full">
            <div className="w-full flex justify-center overflow-hidden bg-[#b92b27]">
                <img
                    src={robotImage}
                    alt="Make America Dumb Again - Robot Propaganda"
                    className="w-auto h-auto max-h-[700px] object-contain px-4"
                />
            </div>
            <div className="flex flex-col justify-center items-center py-4 pt-4">
                <h2>At the top</h2>
                <h2 className="pt-[300px]">Made it to the bottom</h2>
            </div>
        </div>
    );
}

export default Marketing;