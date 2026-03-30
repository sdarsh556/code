import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { X, TrendingUp, Activity, Cpu, Calendar, MemoryStick, ChevronLeft, Clock } from 'lucide-react';
import '../../../css/analytics/ecs/CPUGraphModal.css';

/* ─── metric config ────────────────────────────────────────────────────────── */
const METRIC_CONFIG = {
    cpu: { label: 'CPU Usage', unit: '%', icon: Cpu, color: '#8b5cf6', c2: '#a78bfa', key: 'cpu', gId: 'grad-cpu' },
    memory: { label: 'Mem Usage', unit: '%', icon: MemoryStick, color: '#ec4899', c2: '#f472b6', key: 'memory', gId: 'grad-mem' }
};

/* ─── SVG path builders ────────────────────────────────────────────────────── */
function buildPaths(points, W, H, padX = 30, padY = 25) {
    if (!points || points.length === 0) return { line: '', area: '', xs: [], ys: [] };
    const len = points.length;
    const xs = points.map((_, i) => padX + (i / Math.max(1, len - 1)) * (W - padX * 2));
    const ys = (() => {
        const vals = points.map(p => p.v);
        const mx = Math.max(...vals, 1);
        // Ensure line doesn't hit the very top/bottom
        return vals.map(v => padY + (1 - v / (mx * 1.15)) * (H - padY * 2));
    })();
    const line = xs.map((x, i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${ys[i].toFixed(1)}`).join(' ');
    const area = `${line} L ${xs[xs.length - 1].toFixed(1)} ${H} L ${xs[0].toFixed(1)} ${H} Z`;
    return { line, area, xs, ys };
}

function CPUGraphModal({ service, selectedDate, onClose }) {
    const [activeMetric, setActiveMetric] = useState('cpu');
    const [drillDay, setDrillDay] = useState(null); // null = 30-day, obj = hourly
    const [hovered, setHovered] = useState(null); // { idx, relX, relY, val, label }
    const [transitioning, setTransitioning] = useState(false);
    const [transDir, setTransDir] = useState('in'); // 'in' | 'out'
    const chartRef = useRef(null);
    const modalRef = useRef(null);

    // Reset drill on metric change
    useEffect(() => { setDrillDay(null); setHovered(null); }, [activeMetric]);

    const cfg = METRIC_CONFIG[activeMetric];

    /* ─── Mock Data Generation ────────────────────────────────────────────── */
    // Simulate sparse 30-day data (March 25, 13, 14, 8)
    const mock30Data = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Only provide data for these specific dates to demonstrate gap filling
        const sparkDays = [0, 5, 12, 13, 14, 24]; // Indices from 30 days ago
        const data = [];

        for (let i = 29; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const dStr = d.toISOString().split('T')[0];

            if (sparkDays.includes(29 - i)) {
                data.push({
                    date: dStr,
                    cpu: parseFloat((40 + Math.random() * 30).toFixed(1)),
                    memory: parseFloat((50 + Math.random() * 25).toFixed(1))
                });
            }
        }
        return data;
    }, []);

    // Simulate sparse hourly data for drill-down
    const getMockHourly = useCallback((dateStr) => {
        const hourly = [];
        const sparkHours = [2, 8, 9, 10, 15, 20, 21];
        for (let h = 0; h < 24; h++) {
            if (sparkHours.includes(h)) {
                hourly.push({
                    hour: h,
                    cpu: parseFloat((30 + Math.random() * 40).toFixed(1)),
                    memory: parseFloat((45 + Math.random() * 35).toFixed(1))
                });
            }
        }
        return hourly;
    }, []);

    const [hourlyData, setHourlyData] = useState([]);

    /* ─── Data Normalization (Padding with 0s) ─────────────────────────────── */
    const points = useMemo(() => {
        if (drillDay) {
            // Normalize to 24 hours
            const full = [];
            for (let h = 0; h < 24; h++) {
                const label = `${String(h).padStart(2, '0')}:00`;
                const match = hourlyData.find(d => d.hour === h);
                full.push({
                    v: match ? match[activeMetric] : 0,
                    label,
                    raw: match || { hour: h, [activeMetric]: 0 }
                });
            }
            return full;
        } else {
            // Normalize to 30 days trailing from today
            const full = [];
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayStr = today.toISOString().split('T')[0];

            for (let i = 29; i >= 0; i--) {
                const d = new Date(today);
                d.setDate(d.getDate() - i);
                const dStr = d.toISOString().split('T')[0];
                const displayDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

                const isTodayPt = dStr === todayStr;
                const isSelectedPt = selectedDate && dStr === selectedDate;

                const match = mock30Data.find(m => m.date === dStr);
                full.push({
                    v: match ? match[activeMetric] : 0,
                    label: displayDate,
                    raw: match || { date: dStr, [activeMetric]: 0 },
                    dateStr: dStr,
                    isToday: isTodayPt,
                    isSelected: isSelectedPt
                });
            }
            return full;
        }
    }, [drillDay, hourlyData, mock30Data, activeMetric, selectedDate]);

    /* stats computation */
    const vals = points.map(p => p.v);
    const peak = Math.max(...vals, 1);
    const avg = vals.reduce((a, b) => a + b, 0) / (vals.length || 1);
    const current = points.length > 0 ? points[points.length - 1].v : 0;

    /* SVG dimensions */
    const W = 800, H = 220;
    const { line, area, xs, ys } = useMemo(() => buildPaths(points, W, H), [points]);

    /* Interactions */
    const handleDrillIn = (pt) => {
        if (drillDay || transitioning) return;
        setTransitioning(true);
        setTransDir('in');
        setTimeout(() => {
            setHourlyData(getMockHourly(pt.dateStr));
            setDrillDay({ date: pt.dateStr, label: pt.label });
            setHovered(null);
            setTransitioning(false);
        }, 250);
    };

    const handleDrillOut = () => {
        if (!drillDay || transitioning) return;
        setTransitioning(true);
        setTransDir('out');
        setTimeout(() => {
            setDrillDay(null);
            setHovered(null);
            setTransitioning(false);
        }, 250);
    };

    const handleMouseMove = useCallback((e) => {
        if (!chartRef.current || !modalRef.current || points.length < 2) return;
        const svgRect = chartRef.current.getBoundingClientRect();
        const modalRect = modalRef.current.getBoundingClientRect();

        const mouseX = (e.clientX - svgRect.left) / svgRect.width * W;
        let closest = 0, minDist = Infinity;
        xs.forEach((x, i) => {
            const d = Math.abs(x - mouseX);
            if (d < minDist) { minDist = d; closest = i; }
        });

        const dotScreenX = svgRect.left + (xs[closest] / W) * svgRect.width;
        const dotScreenY = svgRect.top + (ys[closest] / H) * svgRect.height;

        setHovered({
            idx: closest,
            relX: dotScreenX - modalRect.left,
            relY: dotScreenY - modalRect.top,
            val: points[closest].v,
            label: points[closest].label
        });
    }, [xs, ys, points]);

    const txClass = transitioning ? (transDir === 'in' ? 'gm-chart-exit-left' : 'gm-chart-exit-right') : '';

    return (
        <div className="graph-modal-overlay" onClick={onClose}>
            <div ref={modalRef} className="graph-modal" onClick={e => e.stopPropagation()}>
                {/* ── Ambient Background Glow ── */}
                <div className="gm-ambient-glow" style={{ background: `radial-gradient(circle at 50% 0%, ${cfg.color}15 0%, transparent 70%)` }} />

                {/* header */}
                <div className="gm-header">
                    <div className="gm-header-left">
                        <div className="gm-icon" style={{ background: `linear-gradient(135deg, ${cfg.color}, ${cfg.c2})`, boxShadow: `0 8px 24px ${cfg.color}33` }}>
                            <cfg.icon size={22} />
                        </div>
                        <div>
                            <h2 className="gm-title">{service.serviceName}</h2>
                            <p className="gm-subtitle">
                                {drillDay
                                    ? <><Clock size={12} className="inline mr-1" /> 24-Hour Breakdown · {drillDay.label}</>
                                    : <><Calendar size={12} className="inline mr-1" /> 30-Day Usage Trend</>
                                }
                            </p>
                        </div>
                    </div>
                    <div className="gm-header-right">
                        <div className="gm-metric-toggle">
                            {Object.entries(METRIC_CONFIG).map(([key, c]) => (
                                <button
                                    key={key}
                                    className={`gm-toggle-btn ${activeMetric === key ? 'active' : ''}`}
                                    onClick={() => setActiveMetric(key)}
                                    style={activeMetric === key ? { background: `linear-gradient(135deg, ${c.color}, ${c.c2})`, boxShadow: `0 4px 12px ${c.color}44`, color: 'white' } : {}}
                                >
                                    <c.icon size={14} />
                                    {key.toUpperCase()}
                                </button>
                            ))}
                        </div>
                        <button className="gm-close-btn" onClick={onClose}><X size={20} /></button>
                    </div>
                </div>

                {/* stats row */}
                <div className="gm-stats-row">
                    {[
                        { label: 'Peak', val: peak, icon: TrendingUp, cls: 'peak' },
                        { label: 'Average', val: avg, icon: Activity, cls: 'avg' },
                        { label: 'Current', val: current, icon: cfg.icon, cls: 'cur' },
                        ...(!drillDay ? [{
                            label: 'Selected Day',
                            val: points.find(p => p.isSelected)?.v || 0,
                            icon: Calendar,
                            cls: 'selected',
                            dateLabel: selectedDate ? new Date(selectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A'
                        }] : [])
                    ].map(({ label, val, icon: Icon, cls, dateLabel }) => (
                        <div key={cls} className={`gm-stat ${cls}`}>
                            <div className="gm-stat-inner">
                                <div className="gm-stat-top">
                                    <div className="gm-stat-icon-wrap"
                                        style={cls === 'selected' ? { background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' } : { background: `${cfg.color}12`, color: cfg.color }}
                                    >
                                        <Icon size={16} />
                                    </div>
                                    {cls === 'selected' && <div className="gm-stat-date-tag">{dateLabel}</div>}
                                </div>
                                <div className="gm-stat-val" style={cls === 'selected' ? { color: '#f59e0b' } : {}}>{val.toFixed(1)}%</div>
                                <div className="gm-stat-lbl">{label}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Breadcrumb / Hint */}
                <div className="gm-chart-nav">
                    {drillDay ? (
                        <button className="gm-back-btn" onClick={handleDrillOut}>
                            <ChevronLeft size={16} />
                            <span>Return to 30-day overview</span>
                        </button>
                    ) : (
                        <div className="gm-hint">
                            <span className="gm-hint-dot" style={{ background: cfg.color }} />
                            Click any data point for hourly drill-down
                        </div>
                    )}
                </div>

                {/* Chart Area */}
                <div className={`gm-chart-container ${txClass}`}>
                    {/* Y Axis */}
                    <div className="gm-y-axis">
                        {[100, 75, 50, 25, 0].map(pct => (
                            <div key={pct} className="gm-y-line" style={{ bottom: `${pct}%` }}>
                                <span className="gm-y-lbl">{pct === 0 ? '' : `${Math.round(peak * pct / 100)}%`}</span>
                            </div>
                        ))}
                    </div>

                    <svg
                        ref={chartRef}
                        viewBox={`0 0 ${W} ${H}`}
                        className="gm-main-svg"
                        preserveAspectRatio="none"
                        onMouseMove={handleMouseMove}
                        onMouseLeave={() => setHovered(null)}
                    >
                        <defs>
                            <linearGradient id={`${cfg.gId}-area`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={cfg.color} stopOpacity="0.3" />
                                <stop offset="100%" stopColor={cfg.color} stopOpacity="0" />
                            </linearGradient>
                            <linearGradient id={`${cfg.gId}-line`} x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" stopColor={cfg.color} stopOpacity="0.7" />
                                <stop offset="50%" stopColor={cfg.c2} stopOpacity="1" />
                                <stop offset="100%" stopColor={cfg.color} stopOpacity="0.8" />
                            </linearGradient>
                            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                                <feGaussianBlur stdDeviation="4" result="blur" />
                                <feComposite in="SourceGraphic" in2="blur" operator="over" />
                            </filter>
                        </defs>

                        {/* area */}
                        <path d={area} fill={`url(#${cfg.gId}-area)`} />

                        {/* baseline */}
                        <line x1="0" y1={H} x2={W} y2={H} stroke="currentColor" strokeOpacity="0.1" strokeWidth="1" className="gm-baseline" />

                        {/* main line */}
                        <path d={line} fill="none" stroke={`url(#${cfg.gId}-line)`} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" filter="url(#glow)" />

                        {/* Special Marker Anchor (Selected Day) */}
                        {!drillDay && points.map((p, i) => p.isSelected && (
                            <line key={`anchor-${i}`} x1={xs[i]} y1="0" x2={xs[i]} y2={H} stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4 4" strokeOpacity="0.4" />
                        ))}

                        {/* points */}
                        {xs.map((x, i) => {
                            const p = points[i];
                            const isToday = !drillDay && p.isToday;
                            const isSelected = !drillDay && p.isSelected;
                            const isSpecial = isToday || isSelected;
                            const dotColor = isToday ? '#10b981' : (isSelected ? '#f59e0b' : cfg.color);

                            return (
                                <circle
                                    key={i}
                                    cx={x} cy={ys[i]}
                                    r={hovered?.idx === i ? 6 : (isSpecial ? 5.5 : 3.5)}
                                    fill={hovered?.idx === i ? 'white' : dotColor}
                                    stroke={hovered?.idx === i ? (isSpecial ? dotColor : cfg.c2) : 'currentColor'}
                                    strokeOpacity={hovered?.idx === i ? 1 : 0.2}
                                    strokeWidth={hovered?.idx === i ? 3 : (isSpecial ? 2 : 1.5)}
                                    className={`gm-dot ${isSpecial ? 'dot-pulse' : ''}`}
                                    style={{
                                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                        cursor: drillDay ? 'default' : 'pointer',
                                        filter: isSpecial ? `drop-shadow(0 0 8px ${dotColor}aa)` : 'none',
                                        color: isSpecial ? dotColor : cfg.color
                                    }}
                                    onClick={() => handleDrillIn(p)}
                                />
                            );
                        })}

                        {/* crosshair */}
                        {hovered && (
                            <line x1={xs[hovered.idx]} y1="0" x2={xs[hovered.idx]} y2={H} stroke={cfg.color} strokeWidth="1" strokeDasharray="4 4" strokeOpacity="0.5" />
                        )}
                    </svg>

                    {/* X Axis */}
                    <div className="gm-x-axis">
                        {points.filter((_, i) => i % (drillDay ? 4 : 5) === 0 || i === points.length - 1).map((p, i) => (
                            <span key={i} className="gm-x-lbl">{p.label}</span>
                        ))}
                    </div>
                </div>

                {/* Tooltip */}
                {hovered && (
                    <div
                        className="gm-floating-tooltip"
                        style={{
                            left: hovered.relX,
                            top: hovered.relY - 20, // Fixed gap from the point
                            borderColor: `${cfg.color}44`,
                            boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px ${cfg.color}22`
                        }}
                    >
                        <div className="gm-tt-header" style={{ color: cfg.color }}>
                            {drillDay ? <Clock size={11} /> : <Calendar size={11} />}
                            <span>{hovered.label}</span>
                        </div>
                        <div className="gm-tt-val">{hovered.val.toFixed(1)}%</div>
                        <div className="gm-tt-lbl">{cfg.label}</div>
                        {!drillDay && <div className="gm-tt-hint">Click to drill down</div>}
                    </div>
                )}

                {/* legend */}
                <div className="gm-legend">
                    <div className="gm-legend-item">
                        <div className="gm-legend-dot" style={{ background: cfg.color }} />
                        <span>{cfg.label}</span>
                    </div>
                    <div className="gm-legend-item">
                        <div className="gm-legend-dot dashed" style={{ borderColor: `${cfg.color}88` }} />
                        <span>Average ({avg.toFixed(1)}%)</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default CPUGraphModal;

