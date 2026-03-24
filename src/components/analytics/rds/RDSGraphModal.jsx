import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { X, TrendingUp, Activity, Cpu, Network, Zap, Database, DollarSign, ChevronLeft, Clock, Calendar } from 'lucide-react';

/* ─── metric config ────────────────────────────────────────────────────────── */
const METRIC_CONFIG = {
    cpu: { label: 'CPU Usage', unit: '%', icon: Cpu, color: '#3b82f6', c2: '#60a5fa', key: 'cpu', gId: 'grad-cpu' },
    memory: { label: 'Mem Usage', unit: '%', icon: Zap, color: '#8b5cf6', c2: '#a78bfa', key: 'memory', gId: 'grad-mem' },
    connections: { label: 'DB Conn', unit: '', icon: Network, color: '#f59e0b', c2: '#fbbf24', key: 'connections', gId: 'grad-conn' },
    read: { label: 'Read IOPS', unit: '', icon: Zap, color: '#10b981', c2: '#34d399', key: 'readIops', gId: 'grad-read' },
    write: { label: 'Write IOPS', unit: '', icon: Zap, color: '#a855f7', c2: '#c084fc', key: 'writeIops', gId: 'grad-write' },
    cost: { label: 'Daily Cost', unit: '$', icon: DollarSign, color: '#ec4899', c2: '#f472b6', key: 'cost', gId: 'grad-cost' }
};

/* ─── SVG path builders ────────────────────────────────────────────────────── */
function buildPaths(points, W, H, padX = 18, padY = 20) {
    if (!points || points.length === 0) return { line: '', area: '', xs: [], ys: [] };
    const len = points.length;
    const xs = points.map((_, i) => padX + (i / Math.max(1, len - 1)) * (W - padX * 2));
    const ys = (() => {
        const vals = points.map(p => p.v);
        const mx = Math.max(...vals, 1);
        return vals.map(v => padY + (1 - v / (mx * 1.12)) * (H - padY * 2));
    })();
    const line = xs.map((x, i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${ys[i].toFixed(1)}`).join(' ');
    const area = `${line} L ${xs[xs.length - 1].toFixed(1)} ${H} L ${xs[0].toFixed(1)} ${H} Z`;
    return { line, area, xs, ys };
}

/* ─── Sparkline (mini stats card decoration) ──────────────────────────────────*/
function Sparkline({ points, color }) {
    const W = 80, H = 28;
    if (!points || points.length < 2) return null;
    const vals = points.map(p => p.v);
    const mx = Math.max(...vals, 1);
    const len = vals.length;
    const xs = vals.map((_, i) => (i / Math.max(1, len - 1)) * W);
    const ys = vals.map(v => H - (v / mx) * H * 0.9 - 2);
    const d = xs.map((x, i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${ys[i].toFixed(1)}`).join(' ');
    return (
        <svg width={W} height={H} style={{ opacity: 0.7 }}>
            <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

/* ══════════════════════════════════════════════════════════════════════════════
   Main Modal
══════════════════════════════════════════════════════════════════════════════ */
function RDSGraphModal({ isOpen, onClose, instance, excludeMetrics = [], onFetchHourly }) {
    const [activeMetric, setActiveMetric] = useState('cpu');
    const [drillDay, setDrillDay] = useState(null);   // null = 30-day, obj = hourly
    const [hourlyData, setHourlyData] = useState([]);
    const [loadingHourly, setLoadingHourly] = useState(false);
    const [hovered, setHovered] = useState(null);   // { idx, x, y, val, label }
    const [transitioning, setTransitioning] = useState(false);
    const [transDir, setTransDir] = useState('in');   // 'in' | 'out'
    const chartRef = useRef(null);
    const modalRef = useRef(null);

    // Reset drill on metric change
    useEffect(() => { setDrillDay(null); setHovered(null); setHourlyData([]); }, [activeMetric]);

    const availableMetrics = useMemo(() =>
        Object.fromEntries(Object.entries(METRIC_CONFIG).filter(([k]) => !excludeMetrics.includes(k))),
        [excludeMetrics]);

    const cfg = useMemo(() =>
        availableMetrics[activeMetric] ?? Object.values(availableMetrics)[0],
        [availableMetrics, activeMetric]);

    const data30 = useMemo(() => instance?.metrics || [], [instance]);

    /* Padding / Zero-filling logic to ensure 24h or 30d grid is always full */
    const points = useMemo(() => {
        const displayKey = cfg.key;

        if (drillDay) {
            // PADDING TO 24 HOURS
            const full = [];
            for (let h = 0; h < 24; h++) {
                const hStr = String(h).padStart(2, '0');
                const label = `${hStr}:00`;

                // Find match in hourlyData
                const match = (hourlyData || []).find(d => {
                    if (d.displayHour === label) return true;
                    if (d.timestamp) {
                        const hour = new Date(d.timestamp.replace(' ', 'T')).getHours();
                        return hour === h;
                    }
                    return false;
                });

                if (match) {
                    full.push({ v: Number(match[displayKey] || 0), raw: match });
                } else {
                    full.push({
                        v: 0,
                        raw: {
                            displayHour: label,
                            [displayKey]: 0,
                            timestamp: `${drillDay.date} ${hStr}:00:00`
                        }
                    });
                }
            }
            return full;
        } else {
            // PADDING TO 30 DAYS
            if (data30.length === 0) return [];

            // Determine the range (30 days trailing from the latest date in the set)
            const sorted = [...data30].sort((a, b) => new Date(a.date) - new Date(b.date));
            const latest = new Date(sorted[sorted.length - 1].date);

            const full = [];
            for (let i = 29; i >= 0; i--) {
                const d = new Date(latest);
                d.setDate(d.getDate() - i);
                const dStr = d.toISOString().split('T')[0];

                const match = data30.find(m => m.date === dStr);
                if (match) {
                    full.push({ v: Number(match[displayKey] || 0), raw: match });
                } else {
                    const displayDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    full.push({
                        v: 0,
                        raw: {
                            date: dStr,
                            displayDate,
                            [displayKey]: 0
                        }
                    });
                }
            }
            return full;
        }
    }, [drillDay, hourlyData, data30, cfg, activeMetric]);

    /* stats */
    const vals = points.map(p => p.v);
    const peak = vals.length ? Math.max(...vals) : 0;
    const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    const current = points.length ? points[points.length - 1].v : 0;
    const fmtVal = (v) => cfg.unit === '$' ? `$${v.toFixed(2)}` : `${v.toFixed(1)}${cfg.unit}`;

    /* SVG dimensions */
    const W = 860, H = 200;

    const { line, area, xs, ys } = useMemo(() => {
        if (!points.length) return { line: '', area: '', xs: [], ys: [] };
        return buildPaths(points, W, H);
    }, [points]);

    /* drill-down handler */
    const handleDrillIn = useCallback(async (dayPt) => {
        if (drillDay || transitioning || !onFetchHourly) return;

        setLoadingHourly(true);
        const data = await onFetchHourly(dayPt.raw.dateStr);
        setLoadingHourly(false);

        if (!data || data.length === 0) return;

        setTransitioning(true);
        setTransDir('in');
        setTimeout(() => {
            setHourlyData(data);
            setDrillDay(dayPt.raw);
            setHovered(null);
            setTransitioning(false);
        }, 260);
    }, [drillDay, transitioning, onFetchHourly]);

    const handleDrillOut = useCallback(() => {
        if (!drillDay || transitioning) return;
        setTransitioning(true);
        setTransDir('out');
        setTimeout(() => {
            setDrillDay(null);
            setHovered(null);
            setTransitioning(false);
        }, 260);
    }, [drillDay, transitioning]);

    /* mouse tracking on svg */
    const handleSvgMouseMove = useCallback((e) => {
        if (!chartRef.current || !modalRef.current || !points.length) return;
        const svgRect = chartRef.current.getBoundingClientRect();
        const modalRect = modalRef.current.getBoundingClientRect();
        const mouseX = (e.clientX - svgRect.left) / svgRect.width * W;
        let closest = 0, minDist = Infinity;
        xs.forEach((x, i) => { const d = Math.abs(x - mouseX); if (d < minDist) { minDist = d; closest = i; } });
        const pt = points[closest];

        // Dot position in screen space, then offset relative to modal
        const dotScreenX = svgRect.left + (xs[closest] / W) * svgRect.width;
        const dotScreenY = svgRect.top + (ys[closest] / H) * svgRect.height;
        const relX = dotScreenX - modalRect.left;
        const relY = dotScreenY - modalRect.top;

        setHovered({
            idx: closest,
            relX,
            relY,
            val: pt.v,
            label: drillDay ? pt.raw.displayHour : pt.raw.displayDate,
            isToday: !drillDay && pt.raw.isToday,
        });
    }, [xs, ys, points, drillDay]);

    if (!isOpen || !cfg) return null;

    const isDrillView = !!drillDay;
    const txClass = transitioning ? (transDir === 'in' ? 'rds-chart-exit-left' : 'rds-chart-exit-right') : '';

    return (
        <div className="rds-graph-modal-overlay" onClick={onClose}>
            <div ref={modalRef} className="rds-graph-modal-container rds-gmc-v2" onClick={e => e.stopPropagation()}>

                {/* ── Ambient glow ── */}
                <div className="rds-gm-ambient" style={{ background: `radial-gradient(ellipse at 20% 0%, ${cfg.color}22 0%, transparent 60%), radial-gradient(ellipse at 80% 100%, ${cfg.color}18 0%, transparent 60%)` }} />

                {/* ── Header ── */}
                <div className="rds-gm-header rds-gm-header-v2">
                    <div className="rds-gm-header-left">
                        <div className="rds-gm-icon-v2" style={{ background: `linear-gradient(135deg, ${cfg.color}, ${cfg.c2})`, boxShadow: `0 8px 24px ${cfg.color}55` }}>
                            <Database size={22} />
                        </div>
                        <div>
                            <h2 className="rds-gm-title">{instance?.db_identifier || instance?.cluster_identifier || 'Instance'}</h2>
                            <p className="rds-gm-subtitle">
                                {isDrillView
                                    ? <><Clock size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />24-hour breakdown · {drillDay.displayDate}</>
                                    : <><Calendar size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />30-day performance trend</>
                                }
                            </p>
                        </div>
                    </div>
                    <div className="rds-gm-header-right">
                        {/* Metric tabs */}
                        <div className="rds-gm-metric-toggle">
                            {Object.entries(availableMetrics).map(([key, c]) => (
                                <button
                                    key={key}
                                    className={`rds-gm-toggle-btn ${activeMetric === key ? 'active' : ''}`}
                                    onClick={() => setActiveMetric(key)}
                                    style={activeMetric === key ? {
                                        background: `linear-gradient(135deg, ${c.color}, ${c.c2})`,
                                        boxShadow: `0 4px 12px ${c.color}55`,
                                        color: 'white', borderColor: 'transparent'
                                    } : {}}
                                >
                                    <c.icon size={13} />
                                    {key === 'connections' ? 'CONN' : key.toUpperCase()}
                                </button>
                            ))}
                        </div>
                        <button className="rds-gm-close-btn" onClick={onClose}><X size={18} /></button>
                    </div>
                </div>

                {/* ── Stats Row ── */}
                <div className="rds-gm-stats-row rds-gm-stats-v2">
                    {[
                        { label: 'Peak', val: peak, icon: TrendingUp, cls: 'peak' },
                        { label: 'Average', val: avg, icon: Activity, cls: 'avg' },
                        { label: 'Current', val: current, icon: cfg.icon, cls: 'cur' },
                    ].map(({ label, val, icon: Icon, cls }) => (
                        <div key={cls} className={`rds-gm-stat rds-gm-stat-v2 ${cls}`}
                            style={cls === 'cur' ? { borderColor: `${cfg.color}33`, '--accent': cfg.color } : {}}>
                            <div className="rds-gm-stat-top">
                                <div className={`rds-gm-stat-icon ${cls}`} style={cls === 'cur' ? { color: cfg.color, background: `${cfg.color}18` } : {}}>
                                    <Icon size={15} />
                                </div>
                                <Sparkline points={points.slice(-10)} color={cfg.color} />
                            </div>
                            <div className="rds-gm-stat-val" style={cls === 'cur' ? { color: cfg.color } : {}}>{fmtVal(val)}</div>
                            <div className="rds-gm-stat-lbl">{label}</div>
                        </div>
                    ))}
                </div>

                {/* ── Breadcrumb (drill-down only) ── */}
                {isDrillView && (
                    <button className="rds-gm-breadcrumb" onClick={handleDrillOut}>
                        <ChevronLeft size={14} />
                        <span>30-day overview</span>
                        <span className="rds-gm-bc-sep">·</span>
                        <span className="rds-gm-bc-current">{drillDay.displayDate}</span>
                    </button>
                )}
                {!isDrillView && (
                    <div className="rds-gm-hint">
                        <span className="rds-gm-hint-dot" style={{ background: cfg.color }} />
                        Click any point to drill into hourly data
                    </div>
                )}

                {/* ── Chart ── */}
                <div className={`rds-gm-chart-v2 ${txClass}`}>
                    {/* Y-axis grid */}
                    <div className="rds-gm-y-grid">
                        {[0, 25, 50, 75, 100].map(pct => (
                            <div key={pct} className="rds-gm-y-line" style={{ bottom: `${pct}%` }}>
                                <span className="rds-gm-y-label">
                                    {pct === 0 ? '' : `${Math.round(peak * pct / 100)}${cfg.unit}`}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* SVG line chart */}
                    <svg
                        ref={chartRef}
                        viewBox={`0 0 ${W} ${H}`}
                        className="rds-gm-svg-v2"
                        preserveAspectRatio="none"
                        onMouseMove={handleSvgMouseMove}
                        onMouseLeave={() => setHovered(null)}
                    >
                        <defs>
                            <linearGradient id={`${cfg.gId}-area`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={cfg.color} stopOpacity="0.35" />
                                <stop offset="70%" stopColor={cfg.color} stopOpacity="0.05" />
                                <stop offset="100%" stopColor={cfg.color} stopOpacity="0" />
                            </linearGradient>
                            <filter id="glow-dot">
                                <feGaussianBlur stdDeviation="3" result="blur" />
                                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                            </filter>
                            <linearGradient id={`${cfg.gId}-line`} x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" stopColor={cfg.color} stopOpacity="0.6" />
                                <stop offset="50%" stopColor={cfg.c2} stopOpacity="1" />
                                <stop offset="100%" stopColor={cfg.color} stopOpacity="0.8" />
                            </linearGradient>
                            {/* Glow filter for line */}
                            <filter id="line-glow" x="-5%" y="-50%" width="110%" height="200%">
                                <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
                                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                            </filter>
                        </defs>

                        {/* Area fill */}
                        <path d={area} fill={`url(#${cfg.gId}-area)`} />

                        {/* Average line */}
                        {(() => {
                            if (!points.length) return null;
                            const mx = Math.max(...points.map(p => p.v)) || 1;
                            const avgY = H / 2 + (1 - avg / (mx * 1.12)) * H * 0.8 - H * 0.3;
                            return <line x1="0" y1={avgY.toFixed(1)} x2={W} y2={avgY.toFixed(1)}
                                stroke={cfg.color} strokeWidth="1" strokeDasharray="6 4" strokeOpacity="0.3" />;
                        })()}

                        {/* Line */}
                        <path d={line} fill="none"
                            stroke={`url(#${cfg.gId}-line)`}
                            strokeWidth="2.5"
                            strokeLinecap="round" strokeLinejoin="round"
                            filter="url(#line-glow)"
                        />

                        {/* All data dots (small) */}
                        {xs.map((x, i) => (
                            <circle
                                key={i}
                                cx={x.toFixed(1)} cy={ys[i].toFixed(1)}
                                r={hovered?.idx === i ? 6 : 3}
                                fill={hovered?.idx === i ? cfg.c2 : cfg.color}
                                stroke={hovered?.idx === i ? 'white' : `${cfg.color}66`}
                                strokeWidth={hovered?.idx === i ? 2 : 1}
                                style={{
                                    cursor: isDrillView ? 'default' : 'pointer',
                                    transition: 'r 0.15s ease',
                                    filter: hovered?.idx === i ? `drop-shadow(0 0 6px ${cfg.color})` : 'none',
                                }}
                                onClick={() => !isDrillView && handleDrillIn(points[i])}
                            />
                        ))}

                        {/* Today marker (30-day view) */}
                        {!isDrillView && (() => {
                            const todayIdx = points.findIndex(p => p.raw.isToday);
                            if (todayIdx < 0 || !xs[todayIdx]) return null;
                            return (
                                <g>
                                    <line x1={xs[todayIdx]} y1="0" x2={xs[todayIdx]} y2={H}
                                        stroke="#10b981" strokeWidth="1.5" strokeDasharray="4 3" strokeOpacity="0.6" />
                                    <rect x={xs[todayIdx] - 20} y={H - 20} width="40" height="16" rx="4"
                                        fill="#10b981" fillOpacity="0.15" />
                                    <text x={xs[todayIdx]} y={H - 9} textAnchor="middle"
                                        fill="#10b981" fontSize="8" fontWeight="700" letterSpacing="0.5">TODAY</text>
                                </g>
                            );
                        })()}

                        {/* Hover crosshair */}
                        {hovered && (
                            <line
                                x1={xs[hovered.idx]} y1="0"
                                x2={xs[hovered.idx]} y2={H}
                                stroke={cfg.color} strokeWidth="1" strokeDasharray="4 3" strokeOpacity="0.5"
                            />
                        )}
                    </svg>

                    {/* X-axis labels */}
                    <div className="rds-gm-x-axis-v2">
                        {points
                            .filter((_, i) => {
                                const step = isDrillView ? 4 : 5;
                                return i % step === 0 || i === points.length - 1;
                            })
                            .map((p, i) => (
                                <span key={i} className="rds-gm-x-lbl">
                                    {isDrillView ? p.raw.displayHour : p.raw.displayDate}
                                </span>
                            ))
                        }
                    </div>
                </div>

                {/* ── Floating Tooltip ── */}
                {hovered && (
                    <div
                        className="rds-gm-tooltip-v2"
                        style={{
                            position: 'absolute',
                            left: hovered.relX,
                            top: hovered.relY - 148,
                            transform: 'translateX(-50%)',
                            '--accent': cfg.color,
                            borderColor: `${cfg.color}44`,
                            boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px ${cfg.color}22`,
                        }}
                    >
                        <div className="rds-gm-tt-header" style={{ color: cfg.color }}>
                            {isDrillView ? <Clock size={11} /> : <Calendar size={11} />}
                            <span>{hovered.label}</span>
                            {hovered.isToday && <span className="rds-gm-tt-today">TODAY</span>}
                        </div>
                        <div className="rds-gm-tt-value" style={{ color: cfg.c2 }}>
                            {fmtVal(hovered.val)}
                        </div>
                        <div className="rds-gm-tt-metric">{cfg.label}</div>
                        {!isDrillView && (
                            <div className="rds-gm-tt-cta">
                                <span>↓</span> Click for hourly view
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default RDSGraphModal;