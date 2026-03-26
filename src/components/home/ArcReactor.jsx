import React, { useState, useEffect, useRef } from 'react';
import '../../css/home/ArcReactor.css';

const ArcReactor = ({ cpu = 0, memory = 0 }) => {
    const [breath, setBreath] = useState(0);
    const [tilt, setTilt] = useState({ x: 0, y: 0 });
    const assemblyRef = useRef(null);

    useEffect(() => {
        let frame;
        const animate = (time) => {
            const t = (time % 1400) / 1400;
            const pulse = t < 0.15 ? Math.sin(t / 0.15 * Math.PI) :
                t < 0.35 ? Math.sin((t - 0.15) / 0.2 * Math.PI) * 0.5 : 0;
            setBreath(pulse);
            frame = requestAnimationFrame(animate);
        };
        frame = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(frame);
    }, []);

    const handleMouseMove = (e) => {
        const el = assemblyRef.current;
        if (!el) return;
        const { left, top, width, height } = el.getBoundingClientRect();
        const cx = left + width / 2;
        const cy = top + height / 2;
        const dx = (e.clientX - cx) / (width / 2);   // -1 … 1
        const dy = (e.clientY - cy) / (height / 2);   // -1 … 1
        setTilt({ x: dy * -15, y: dx * 15 });          // max ±10°
    };

    const handleMouseLeave = () => setTilt({ x: 0, y: 0 });

    const cpuVal = Math.min(Math.max(cpu, 0), 100);
    const memVal = Math.min(Math.max(memory, 0), 100);

    // SVG reactor constants
    const S = 210;
    const C = S / 2;   // 105
    const OR = 80;
    const IR = 42;
    const TR = 25;

    const pt = (r, deg) => ({
        x: C + r * Math.cos((deg - 90) * Math.PI / 180),
        y: C + r * Math.sin((deg - 90) * Math.PI / 180),
    });

    const panels = [...Array(6)].map((_, i) => {
        const s = i * 60 + 5, e = i * 60 + 55;
        const o1 = pt(OR - 4, s), o2 = pt(OR - 4, e);
        const i1 = pt(IR + 4, s + 6), i2 = pt(IR + 4, e - 6);
        return `M ${o1.x},${o1.y} A ${OR - 4} ${OR - 4} 0 0 1 ${o2.x},${o2.y}
                L ${i2.x},${i2.y} A ${IR + 4} ${IR + 4} 0 0 0 ${i1.x},${i1.y} Z`;
    });

    const triW = TR * Math.sqrt(3);
    const triPath = `M ${C - triW / 2},${C - TR * 0.5} L ${C + triW / 2},${C - TR * 0.5} L ${C},${C + TR} Z`;
    const iTR = TR * 0.42;
    const innerPath = `M ${C - iTR * Math.sqrt(3) / 2},${C - iTR * 0.5} L ${C + iTR * Math.sqrt(3) / 2},${C - iTR * 0.5} L ${C},${C + iTR} Z`;

    const glowI = 0.6 + breath * 0.4;
    const panelO = 0.55 + breath * 0.35;

    const EKG = ({ color }) => (
        <svg className="ekg-strip" viewBox="0 0 120 22" preserveAspectRatio="none">
            <polyline className="ekg-line" stroke={color}
                points="0,11 15,11 20,11 24,2 27,19 30,6 33,11 55,11 60,11 64,2 67,19 70,6 73,11 95,11 100,11 104,2 107,19 110,6 113,11 120,11" />
            <polyline className="ekg-glow" stroke={color}
                points="0,11 15,11 20,11 24,2 27,19 30,6 33,11 55,11 60,11 64,2 67,19 70,6 73,11 95,11 100,11 104,2 107,19 110,6 113,11 120,11" />
        </svg>
    );

    return (
        /* arc-assembly: reactor (left) + HUD column (right) — entirely to the right, no left bleed */
        <div
            className="arc-assembly"
            ref={assemblyRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{
                transform: `perspective(800px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
                transition: 'transform 0.25s cubic-bezier(0.23, 1, 0.32, 1)',
                willChange: 'transform',
            }}
        >

            {/* ── REACTOR STAGE ── */}
            <div className="arc-circuit-stage">
                <div className="arc-glow-backdrop" />
                <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} className="arc-v9-svg" style={{ overflow: 'visible' }}>
                    <defs>
                        <filter id="arcGlow" x="-30%" y="-30%" width="160%" height="160%">
                            <feGaussianBlur stdDeviation="2.5" result="blur" />
                            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                        </filter>
                        <filter id="triBloom" x="-60%" y="-60%" width="220%" height="220%">
                            <feGaussianBlur stdDeviation="5" result="blur" />
                            <feMerge><feMergeNode in="blur" /><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                        </filter>
                        <radialGradient id="panelGrad" cx="50%" cy="50%" r="50%">
                            <stop offset="0%"  stopColor="#90f8ff" stopOpacity="1"   />
                            <stop offset="50%" stopColor="#00d8ff" stopOpacity="0.95" />
                            <stop offset="100%" stopColor="#0088ee" stopOpacity="0.55" />
                        </radialGradient>
                        <radialGradient id="coreGrad">
                            <stop offset="0%"  stopColor="#ffffff" />
                            <stop offset="20%" stopColor="#b0f8ff" />
                            <stop offset="55%" stopColor="#00aaff" stopOpacity="0.85" />
                            <stop offset="80%" stopColor="#003888" stopOpacity="0.45" />
                            <stop offset="100%" stopColor="#001033" stopOpacity="0" />
                        </radialGradient>
                        {/* Brushed-metal gradient removed — bezel now matches inner ring */}
                    </defs>

                    {/* Bezel — CW. Dark body ring */}
                    <g className="arc-rotate-slow">
                        <circle cx={C} cy={C} r={OR + 4} fill="#1a3050" stroke="#2a4468" strokeWidth="7" />
                        {[0, 90, 180, 270].map(a => {
                            const p = pt(OR + 1, a);
                            return <rect key={a} x={p.x - 3} y={p.y - 7} width="6" height="14" fill="#1a3050"
                                transform={`rotate(${a} ${p.x} ${p.y})`} rx="1.5" />;
                        })}
                    </g>
                    {/* Outer glowing rim — same as triangle's white ring: bright stroke + arcGlow bloom */}
                    <circle cx={C} cy={C} r={OR + 4}
                        fill="none"
                        stroke="#b8f0ff"
                        strokeWidth="1.5"
                        opacity={0.85 + breath * 0.15}
                        filter="url(#arcGlow)" />
                    {/* Extra outer soft glow halo */}
                    <circle cx={C} cy={C} r={OR + 4}
                        fill="none"
                        stroke="rgba(0,220,255,0.3)"
                        strokeWidth="4"
                        filter="url(#arcGlow)" />

                    <circle cx={C} cy={C} r={OR - 1} fill="#152840" />
                    <circle cx={C} cy={C} r={IR + 14} fill="url(#coreGrad)" opacity={0.5 + glowI * 0.5} style={{ mixBlendMode: 'screen' }} />
                    <circle cx={C} cy={C} r={IR + 8}  fill="url(#coreGrad)" opacity={glowI} style={{ mixBlendMode: 'screen' }} />

                    {/* Blue panels — CCW */}
                    <g filter="url(#arcGlow)" opacity={panelO} className="arc-rotate-ccw">
                        {panels.map((d, i) => <path key={i} d={d} fill="url(#panelGrad)" stroke="#00e8ff" strokeWidth="0.5" />)}
                    </g>

                    {/* Separators — CCW */}
                    <g className="arc-rotate-ccw">
                        {[...Array(6)].map((_, i) => {
                            const a = i * 60, inner = pt(IR - 2, a), outer = pt(OR + 2, a);
                            return <line key={i} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke="#2e4a6e" strokeWidth="4" />;
                        })}
                    </g>

                    {/* Inner ring */}
                    <circle cx={C} cy={C} r={IR}     fill="#1a3050" stroke="#2a4468" strokeWidth="7" />
                    <circle cx={C} cy={C} r={IR - 2}  fill="none"    stroke="#3a6090" strokeWidth="1" />
                    <circle cx={C} cy={C} r={IR - 6}  fill="#0e2038" />
                    {/* inner blue ambient fill so the center isn't dead black */}
                    <circle cx={C} cy={C} r={IR - 7}  fill="rgba(0,100,200,0.2)" />

                    {/* Triangle */}
                    <path d={triPath} fill={`rgba(0,200,255,${0.28 + breath * 0.38})`} stroke="#00f2ff" strokeWidth="2.5" strokeLinejoin="round" filter="url(#triBloom)" />
                    <path d={triPath} fill={`rgba(100,230,255,${0.3 + breath * 0.25})`} stroke="#b0f8ff" strokeWidth="2" strokeLinejoin="round" filter="url(#arcGlow)" />
                    <path d={triPath} fill="none" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" opacity={0.9 + breath * 0.1} />
                    <path d={innerPath} fill={`rgba(5,10,20,${0.85 - breath * 0.25})`} stroke="#40d8ff" strokeWidth="1" strokeLinejoin="round" />

                    {/* Singularity */}
                    <circle cx={C} cy={C} r={5 + breath * 3} fill="#fff" filter="url(#triBloom)" />
                    <circle cx={C} cy={C} r={2.5} fill="#fff" />

                    {/* Sheen rings */}
                    <circle cx={C} cy={C} r={OR + 2} fill="none" stroke="#1e3050"             strokeWidth="1.5" />
                    <circle cx={C} cy={C} r={OR + 5} fill="none" stroke="rgba(0,200,255,0.06)" strokeWidth="1.5" />
                    <circle cx={C} cy={C} r={OR + 9} fill="none" stroke="rgba(0,160,255,0.03)" strokeWidth="2" />
                </svg>
            </div>

            {/*
              ── CIRCUIT ARM SVG ──
              Sits at arc-assembly level (position:absolute, full size) so it can
              span from the reactor edge all the way to the HUD box left edges.

              Assembly coords (px):
                padding: 6px all sides
                Reactor SVG 210×210, starts at (6,6) → center at (111,111), OR=80
                NE exit (MEM, -45°):  x=111+57=168, y=111-57=54
                SE exit (CPU, +45°):  x=168,        y=111+57=168
                hud-column margin-left: 20px → starts at x=6+210+20=236
                Box left edge = x=236
            */}
            <svg className="arc-connector-svg" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    {/* Animated shimmer filter for arcs */}
                    <filter id="arcShimmer" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="2.5" result="blur" />
                        <feMerge><feMergeNode in="blur" /><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                    {/* Wide bloom filter */}
                    <filter id="wideBloom" x="-40%" y="-40%" width="180%" height="180%">
                        <feGaussianBlur stdDeviation="5" result="blur" />
                        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                </defs>

                {/*
                  Drama-arc geometry (r=90, center 111,111):
                    Purple NE: -100° to -20°  → (95,22) to (196,80)
                    Cyan   SE: +20°  to +100° → (196,142) to (95,200)
                  Arm exit dots ride on arc midpoints:
                    Purple mid (-60°): (111+45, 111-78) = (156, 33)
                    Cyan   mid (+60°): (156, 189)
                  Terminal rings align with boxes:
                    MEM:  (236, 22)
                    CPU:  (236, 200)
                */}

                {/* ══════ PURPLE NE ARC (MEM) ══════ */}
                {/* Outer mega-bloom atmosphere */}
                <path d="M 137,22 A 94 94 0 0 1 177,45 A 94 94 0 0 1 202,89"
                    fill="none" stroke="#d946ef" strokeWidth="20" opacity="0.07"
                    filter="url(#wideBloom)" />
                {/* Wide soft glow */}
                <path d="M 137,22 A 94 94 0 0 1 177,45 A 94 94 0 0 1 202,89"
                    fill="none" stroke="#d946ef" strokeWidth="8" opacity="0.3" />
                {/* Mid glow */}
                <path d="M 137,22 A 94 94 0 0 1 177,45 A 94 94 0 0 1 202,89"
                    fill="none" stroke="#d946ef" strokeWidth="3.5" opacity="0.7" />
                {/* Bright hot core */}
                <path d="M 137,22 A 94 94 0 0 1 177,45 A 94 94 0 0 1 202,89"
                    fill="none" stroke="#f0a0ff" strokeWidth="1.5" opacity="1" />
                {/* Animated shimmer pulse traveling along arc */}
                <path d="M 137,22 A 94 94 0 0 1 177,45 A 94 94 0 0 1 202,89"
                    fill="none" stroke="#ffffff" strokeWidth="2.5" opacity="0.85"
                    strokeDasharray="8 100" className="arc-flow-mem" />
                {/* Arc endpoint glow dot (at -20°, right tip) */}
                <circle cx="202" cy="89" r="4" fill="#d946ef" opacity="0.95" className="arc-exit-mem" />
                <circle cx="202" cy="89" r="8" fill="none" stroke="#d946ef" strokeWidth="1.2" opacity="0.4" />
                <circle cx="202" cy="89" r="13" fill="none" stroke="#d946ef" strokeWidth="0.6" opacity="0.15" />

                {/* ── MEM horizontal arm: outer arc tip (137,22) → box (236,22) ── */}
                {/* Bloom */}
                <line x1="177" y1="45" x2="236" y2="45"
                    stroke="#d946ef" strokeWidth="8" strokeLinecap="round" opacity="0.1" />
                {/* Main line */}
                <line x1="177" y1="45" x2="236" y2="45"
                    stroke="#d946ef" strokeWidth="1.8" strokeLinecap="round" opacity="0.9" />
                {/* Bright core */}
                <line x1="177" y1="45" x2="236" y2="45"
                    stroke="#f9d8ff" strokeWidth="0.8" strokeLinecap="round" opacity="0.85" />
                {/* Animated pulse */}
                <line x1="177" y1="45" x2="236" y2="45"
                    stroke="#ffffff" strokeWidth="2" strokeLinecap="round"
                    strokeDasharray="4 95" className="arc-flow-mem" opacity="0.9" />
                {/* Outer tip dot */}
                <circle cx="177" cy="45" r="3" fill="#d946ef" opacity="0.9" className="arc-exit-mem" />
                <circle cx="177" cy="45" r="5.5" fill="none" stroke="#d946ef" strokeWidth="1" opacity="0.35" />
                {/* Terminal ring at box */}
                <circle cx="236" cy="45" r="5" fill="none" stroke="#d946ef" strokeWidth="1" opacity="0.4"
                    filter="url(#arcShimmer)" />
                <circle cx="236" cy="45" r="3.5" fill="none" stroke="#d946ef" strokeWidth="1.5" opacity="0.75" />
                <circle cx="236" cy="45" r="2" fill="#d946ef" opacity="1" />

                {/* ══════ CYAN SE ARC (CPU) ══════ */}
                {/* Outer mega-bloom atmosphere */}
                <path d="M 202,133 A 94 94 0 0 1 177,177 A 94 94 0 0 1 137,200"
                    fill="none" stroke="#00f2ff" strokeWidth="20" opacity="0.07"
                    filter="url(#wideBloom)" />
                {/* Wide soft glow */}
                <path d="M 202,133 A 94 94 0 0 1 177,177 A 94 94 0 0 1 137,200"
                    fill="none" stroke="#00f2ff" strokeWidth="8" opacity="0.3" />
                {/* Mid glow */}
                <path d="M 202,133 A 94 94 0 0 1 177,177 A 94 94 0 0 1 137,200"
                    fill="none" stroke="#00f2ff" strokeWidth="3.5" opacity="0.7" />
                {/* Bright hot core */}
                <path d="M 202,133 A 94 94 0 0 1 177,177 A 94 94 0 0 1 137,200"
                    fill="none" stroke="#80ffff" strokeWidth="1.5" opacity="1" />
                {/* Animated shimmer pulse traveling along arc */}
                <path d="M 202,133 A 94 94 0 0 1 177,177 A 94 94 0 0 1 137,200"
                    fill="none" stroke="#ffffff" strokeWidth="2.5" opacity="0.85"
                    strokeDasharray="8 100" className="arc-flow-cpu" />
                {/* Arc top-right tip dot */}
                <circle cx="202" cy="133" r="4" fill="#00f2ff" opacity="0.95" className="arc-exit-cpu" />
                <circle cx="202" cy="133" r="8" fill="none" stroke="#00f2ff" strokeWidth="1.2" opacity="0.4" />
                <circle cx="202" cy="133" r="13" fill="none" stroke="#00f2ff" strokeWidth="0.6" opacity="0.15" />

                {/* ── CPU horizontal arm: outer arc tip (137,200) → box (236,200) ── */}
                {/* Bloom */}
                <line x1="177" y1="177" x2="236" y2="177"
                    stroke="#00f2ff" strokeWidth="8" strokeLinecap="round" opacity="0.1" />
                {/* Main line */}
                <line x1="177" y1="177" x2="236" y2="177"
                    stroke="#00f2ff" strokeWidth="1.8" strokeLinecap="round" opacity="0.9" />
                {/* Bright core */}
                <line x1="177" y1="177" x2="236" y2="177"
                    stroke="#d0ffff" strokeWidth="0.8" strokeLinecap="round" opacity="0.85" />
                {/* Animated pulse */}
                <line x1="177" y1="177" x2="236" y2="177"
                    stroke="#ffffff" strokeWidth="2" strokeLinecap="round"
                    strokeDasharray="4 95" className="arc-flow-cpu" opacity="0.9" />
                {/* Outer tip dot */}
                <circle cx="177" cy="177" r="3" fill="#00f2ff" opacity="0.9" className="arc-exit-cpu" />
                <circle cx="177" cy="177" r="5.5" fill="none" stroke="#00f2ff" strokeWidth="1" opacity="0.35" />
                {/* Terminal ring at box */}
                <circle cx="236" cy="177" r="5" fill="none" stroke="#00f2ff" strokeWidth="1" opacity="0.4"
                    filter="url(#arcShimmer)" />
                <circle cx="236" cy="177" r="3.5" fill="none" stroke="#00f2ff" strokeWidth="1.5" opacity="0.75" />
                <circle cx="236" cy="177" r="2" fill="#00f2ff" opacity="1" />
            </svg>

            {/* ── HUD COLUMN ── */}
            <div className="arc-hud-column">
                <div className="arc-hud-box mem-box">
                    <span className="hud-tag">SYSTEM_MEM</span>
                    <span className="hud-val purple">{Math.round(memVal)}%</span>
                    <EKG color="#d946ef" />
                </div>
                <div className="arc-hud-box cpu-box">
                    <span className="hud-tag">SYSTEM_CPU</span>
                    <span className="hud-val cyan">{Math.round(cpuVal)}%</span>
                    <EKG color="#00f2ff" />
                </div>
            </div>
        </div>
    );
};

export default ArcReactor;
