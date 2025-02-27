function LoadingLayer() {
    return (
        <div style={{backgroundColor: 'rgba(255, 255, 255, 0.75)'}}
             className="absolute inset-0 flex items-center justify-center z-50">
            <div className="spinner"></div>
        </div>
    );
}

export default LoadingLayer;