import { useState, useMemo } from 'react';
import { X, TrendingUp, Activity, Cpu, Network, Zap, Database, Calendar, DollarSign } from 'lucide-react';

function RDSGraphModal({ isOpen, onClose, instance, excludeMetrics = [] }) {
    const [tooltip, setTooltip] = useState(null);
    const [hoveredIdx, setHoveredIdx] = useState(null);
    const [activeMetric, setActiveMetric] = useState('cpu');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Mock data generation (30 days) with zero-value periods
    const chartData = useMemo(() => {
        const data = [];
        for (let i = 29; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);

            const cpuBase = instance?.avg_cpu_utilization || 30;
            const connBase = instance?.avg_connections || 50;
            const readBase = instance?.avg_read_iops || 200;
            const writeBase = instance?.avg_write_iops || 100;

            // Inactive periods simulation
            const isActive = i < 18;

            data.push({
                date: d,
                displayDate: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                cpu: isActive ? Math.max(5, Math.min(99, cpuBase + (Math.sin(i * 0.7) * 15) + (Math.random() * 8))) : 0,
                connections: isActive ? Math.max(1, Math.min(1000, connBase + (Math.cos(i * 0.5) * 20) + (Math.random() * 5))) : 0,
                readIops: isActive ? Math.max(10, readBase + (Math.sin(i * 0.9) * 50) + (Math.random() * 30)) : 0,
                writeIops: isActive ? Math.max(5, writeBase + (Math.cos(i * 0.7) * 30) + (Math.random() * 20)) : 0,
                cost: isActive ? Math.max(0.1, (cpuBase / 10) + (Math.sin(i * 0.3) * 2) + Math.random()) : 0,
                isToday: i === 0
            });
        }
        return data;
    }, [instance]);

    if (!isOpen) return null;

    const metricConfig = useMemo(() => {
        const config = {
            cpu: { label: 'CPU Usage', unit: '%', icon: Cpu, color: '#3b82f6', key: 'cpu', gradient: 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)' },
            connections: { label: 'DB CONN', unit: '', icon: Network, color: '#f59e0b', key: 'connections', gradient: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)' },
            read: { label: 'Read IOPS', unit: '', icon: Zap, color: '#10b981', key: 'readIops', gradient: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)' },
            write: { label: 'Write IOPS', unit: '', icon: Zap, color: '#ec4899', key: 'writeIops', gradient: 'linear-gradient(135deg, #ec4899 0%, #f472b6 100%)' },
            cost: { label: 'Daily Cost', unit: '$', icon: DollarSign, color: '#8b5cf6', key: 'cost', gradient: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)' }
        };

        return Object.fromEntries(
            Object.entries(config).filter(([key]) => !excludeMetrics.includes(key))
        );
    }, [excludeMetrics]);

    const config = metricConfig[activeMetric] || metricConfig.cpu;
    const data = chartData;

    if (!config || !data) return null;

    const vals = data.map(d => d[config.key]).filter(v => v > 0);

    const maxVal = vals.length ? Math.max(...vals) : 0;
    const minVal = vals.length ? Math.min(...vals) : 0;
    const avgVal = vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
    const latestVal = data[data.length - 1][config.key];

    // SVG line chart logic
    const chartW = 800;
    const chartH = 120;
    const padX = 10;
    const padY = 10;

    const getX = (i) => padX + (i / (data.length - 1)) * (chartW - padX * 2);
    const getY = (v) => {
        if (maxVal === 0) return chartH - padY;
        return padY + (1 - (v / (maxVal * 1.1 + 1))) * (chartH - padY * 2);
    };

    const linePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d[config.key])}`).join(' ');
    const areaPath = `${linePath} L ${getX(data.length - 1)} ${chartH} L ${getX(0)} ${chartH} Z`;

    const metricColor = config.color;

    return (
        <div className="rds-graph-modal-overlay" onClick={onClose}>
            <div className="rds-graph-modal-container" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="rds-gm-header">
                    <div className="rds-gm-header-left">
                        <div className="rds-gm-icon" style={{ background: config.gradient, boxShadow: `0 8px 24px ${metricColor}44` }}>
                            <Database size={24} />
                        </div>
                        <div>
                            <h2 className="rds-gm-title">{instance?.db_identifier}</h2>
                            <p className="rds-gm-subtitle">30-Day performance trend analysis</p>
                        </div>
                    </div>

                    <div className="rds-gm-header-right">
                        <div className="rds-gm-metric-toggle">
                            {Object.entries(metricConfig).map(([key, cfg]) => (
                                <button
                                    key={key}
                                    className={`rds-gm-toggle-btn ${activeMetric === key ? 'active' : ''}`}
                                    onClick={() => setActiveMetric(key)}
                                    style={{
                                        background: activeMetric === key ? cfg.gradient : '',
                                        color: activeMetric === key ? 'white' : ''
                                    }}
                                >
                                    <cfg.icon size={14} />
                                    {key.toUpperCase()}
                                </button>
                            ))}
                        </div>
                        <button className="rds-gm-close-btn" onClick={onClose}><X size={20} /></button>
                    </div>
                </div>

                {/* Stats Row (ECS 4-Card Style) */}
                <div className="rds-gm-stats-row">
                    <div className="rds-gm-stat">
                        <div className="rds-gm-stat-icon peak"><TrendingUp size={16} /></div>
                        <div className="rds-gm-stat-val">
                            {config.unit === '$' ? `$${maxVal.toFixed(2)}` : `${maxVal.toFixed(1)}${config.unit}`}
                        </div>
                        <div className="rds-gm-stat-lbl">Peak</div>
                    </div>
                    <div className="rds-gm-stat">
                        <div className="rds-gm-stat-icon avg"><Activity size={16} /></div>
                        <div className="rds-gm-stat-val">
                            {config.unit === '$' ? `$${avgVal.toFixed(2)}` : `${avgVal.toFixed(1)}${config.unit}`}
                        </div>
                        <div className="rds-gm-stat-lbl">Average</div>
                    </div>
                    <div className="rds-gm-stat">
                        <div className="rds-gm-stat-icon current" style={{ color: metricColor, background: `${metricColor}15` }}>
                            <config.icon size={16} />
                        </div>
                        <div className="rds-gm-stat-val">
                            {config.unit === '$' ? `$${latestVal.toFixed(2)}` : `${latestVal.toFixed(1)}${config.unit}`}
                        </div>
                        <div className="rds-gm-stat-lbl">Current</div>
                    </div>
                </div>

                {/* Custom Chart Area (SVG + Bars) */}
                <div className="rds-gm-chart-area">

                    {/* SVG Area/Line Backdrop */}
                    <div className="rds-gm-line-chart-wrap">
                        <svg viewBox={`0 0 ${chartW} ${chartH}`} className="rds-gm-line-svg" preserveAspectRatio="none" key={activeMetric}>
                            <defs>
                                <linearGradient id="rds-line-area-grad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={metricColor} stopOpacity="0.4" />
                                    <stop offset="100%" stopColor={metricColor} stopOpacity="0" />
                                </linearGradient>
                            </defs>
                            <path d={areaPath} fill="url(#rds-line-area-grad)" />
                            <path d={linePath} fill="none" stroke={metricColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                            {hoveredIdx !== null && (
                                <circle
                                    cx={getX(hoveredIdx)}
                                    cy={getY(data[hoveredIdx][config.key])}
                                    r="6"
                                    fill={metricColor}
                                    stroke="white"
                                    strokeWidth="3"
                                />
                            )}
                        </svg>
                    </div>

                    {/* Interactive Bars Container */}
                    <div className="rds-gm-bars-container">
                        {data.map((d, i) => {
                            const isHovered = hoveredIdx === i;
                            const heightPct = maxVal > 0 ? (d[config.key] / (maxVal * 1.1 + 1)) * 100 : 0;

                            return (
                                <div
                                    key={i}
                                    className="rds-gm-bar-col"
                                    onMouseEnter={(e) => {
                                        setHoveredIdx(i);
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        setTooltip({
                                            x: rect.left + rect.width / 2,
                                            y: rect.top,
                                            date: d.displayDate,
                                            value: d[config.key],
                                            isToday: d.isToday,
                                            isSelected: false
                                        });
                                    }}
                                    onMouseLeave={() => { setHoveredIdx(null); setTooltip(null); }}
                                >
                                    <div
                                        className={`rds-gm-bar ${d.isToday ? 'today-bar' : ''} ${isHovered ? 'hovered' : ''}`}
                                        style={{
                                            height: `${Math.max(4, heightPct)}%`,
                                            background: !d.isToday ? `linear-gradient(to top, ${metricColor}66 0%, ${metricColor}22 100%)` : ''
                                        }}
                                    />
                                    {d.isToday && (
                                        <div className={`rds-gm-bar-label rds-gm-today-label`}>
                                            ● Today
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* X-Axis labels */}
                    <div className="rds-gm-x-labels">
                        {data.filter((_, i) => i % 5 === 0).map((d, i) => (
                            <span key={i}>{d.displayDate}</span>
                        ))}
                    </div>
                </div>

                {/* Legend */}
                <div className="rds-gm-legend">
                    <div className="rds-gm-legend-item">
                        <div className="rds-gm-legend-dot today" />
                        Today
                    </div>
                    <div className="rds-gm-legend-item">
                        <div className="rds-gm-legend-dot" style={{ background: metricColor }} />
                        {config.label}
                    </div>
                </div>
            </div>

            {/* Floating High-Fidelity Tooltip */}
            {tooltip && (
                <div className="rds-gm-floating-tooltip" style={{ left: tooltip.x, top: tooltip.y - 100 }}>
                    <div className="rds-gm-tt-date">{tooltip.date}</div>
                    <div className="rds-gm-tt-val">
                        {config.unit === '$' ? `$${Number(tooltip.value).toFixed(2)}` : `${Number(tooltip.value).toFixed(2)}${config.unit}`}
                    </div>
                    <div className="rds-gm-tt-metric">{config.label}</div>
                    {tooltip.isToday && <div className="rds-gm-tt-tag today">Today</div>}
                    {tooltip.isSelected && <div className="rds-gm-tt-tag selected">Selected</div>}
                </div>
            )}
        </div>
    );
}

export default RDSGraphModal;
