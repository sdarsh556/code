import '../../css/common/ECSIcon.css';

const ECSIcon = ({ size = 80, className = '', color }) => {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 100 100"
            version="1.1"
            xmlns="http://www.w3.org/2000/svg"
            className={`ecs-icon-container ${className}`}
            style={{ color }}
        >
            <defs>
                {/* Glow Filter for deeper neon effect */}
                <filter id="neonGlow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="1.5" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
            </defs>
            
            <g className="ecs-icon-group" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                {/* Orbital Ring - Polished white stroke */}
                <ellipse
                    cx="50" cy="52" rx="42" ry="14"
                    strokeWidth="3"
                    fill="none"
                />

                {/* Main Large Cube (The Orchestrator) - Wireframe Style */}
                <g transform="translate(50, 32)">
                    {/* Top Face */}
                    <path d="M0 -30 L25 -18 L0 -6 L-25 -18 Z" />
                    {/* Perspective lines */}
                    <path d="M0 -30 L0 24" strokeWidth="1.5" opacity="0.4" />
                    {/* Front Outline */}
                    <path d="M0 -6 L25 -18 L25 12 L0 24 L-25 12 L-25 -18 Z" />
                </g>

                {/* Service Nodes (The Clustered Nodes) - Smaller Wireframes */}
                {/* Node 1: Left-Bottom */}
                <g transform="translate(26, 70) scale(0.72)">
                    <path d="M0 -15 L15 -7.5 L0 0 L-15 -7.5 Z" />
                    <path d="M0 0 L15 -7.5 L15 12.5 L0 20 L-15 12.5 L-15 -7.5 Z" />
                </g>

                {/* Node 2: Center-Bottom */}
                <g transform="translate(50, 84) scale(0.72)">
                    <path d="M0 -15 L15 -7.5 L0 0 L-15 -7.5 Z" />
                    <path d="M0 0 L15 -7.5 L15 12.5 L0 20 L-15 12.5 L-15 -7.5 Z" />
                </g>

                {/* Node 3: Right-Bottom */}
                <g transform="translate(74, 70) scale(0.72)">
                    <path d="M0 -15 L15 -7.5 L0 0 L-15 -7.5 Z" />
                    <path d="M0 0 L15 -7.5 L15 12.5 L0 20 L-15 12.5 L-15 -7.5 Z" />
                </g>
            </g>
        </svg>
    );
};

export default ECSIcon;
