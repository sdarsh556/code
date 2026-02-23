import React from 'react';
import '../../css/BackgroundEffects.css';

const DynamicBackground = ({ context = 'default' }) => {
    return (
        <div className={`dynamic-bg-wrapper context-${context}`}>
            {/* Layer 1: Static 3D Grid */}
            <div className="bg-layer grid-layer">
                <div className="grid-perspective">
                    <div className="grid-surface"></div>
                </div>
            </div>
        </div>
    );
};

export default DynamicBackground;
