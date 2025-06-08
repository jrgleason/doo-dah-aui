function LoadingLayer() {
    return (
        <div style={{backgroundColor: 'rgba(15, 23, 42, 0.75)'}}
             className="absolute inset-0 flex items-center justify-center z-50">
            <div
                className="w-[50px] h-[50px] border-4 border-surface-600 border-t-brand-500 rounded-full animate-spin"></div>
        </div>
    );
}

export default LoadingLayer;