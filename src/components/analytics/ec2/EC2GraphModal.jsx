import { useState, useMemo, useEffect } from 'react';
import { X, TrendingUp, Activity, Cpu, Calendar, MemoryStick } from 'lucide-react';
import '../../../css/analytics/ecs/CPUGraphModal.css'; // Reusing the same beautiful styles
import axiosClient from '../../api/axiosClient';

function EC2GraphModal({ instance, selectedDate, onClose }) {
    const [tooltip, setTooltip] = useState(null);
    const [hoveredIdx, setHoveredIdx] = useState(null);
    const [cpuData, setCpuData] = useState([]);
    const [loading, setLoading] = useState(false);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const selectedDateObj = selectedDate ? new Date(selectedDate) : null;
    if (selectedDateObj) selectedDateObj.setHours(0, 0, 0, 0);

    useEffect(() => {
        if (!instance?.instanceId) return;

        // Generate mock history for last 30 days
        const generatedHistory = [];
        const baseCpu = instance.cpu || 40;

        for (let i = 29; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            d.setHours(0, 0, 0, 0);

            // Create some realistic-looking jitter
            const jitter = (Math.random() - 0.5) * 15;
            const value = Math.max(5, Math.min(95, baseCpu + jitter));

            generatedHistory.push({
                date: new Date(d),
                value: Number(value.toFixed(1))
            });
        }

        setCpuData(generatedHistory);
    }, [instance.instanceId, instance.cpu]);

    const data = cpuData.length ? cpuData : [];
    const currentVal = instance.cpu;

    const maxVal = data.length ? Math.max(...data.map(d => d.value)) : 0;
    const minVal = data.length ? Math.min(...data.map(d => d.value)) : 0;
    const avgVal = data.length
        ? (data.reduce((s, d) => s + d.value, 0) / data.length).toFixed(1)
        : 0;

    const isToday = (d) => d.getTime() === today.getTime();
    const isSelected = (d) => selectedDateObj && d.getTime() === selectedDateObj.getTime();
    const formatDate = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    // SVG line chart
    const chartW = 600;
    const chartH = 120;
    const padX = 10;
    const padY = 10;

    const getX = (i) => padX + (i / (data.length - 1)) * (chartW - padX * 2);
    const range = (maxVal - minVal) || 1;

    const getY = (v) =>
        padY + (1 - (v - minVal) / range) * (chartH - padY * 2);

    let linePath = "";
    let areaPath = "";

    if (data.length > 1) {
        linePath = data
            .map((d, i) => {
                const x = getX(i);
                const y = getY(d.value);
                return `${i === 0 ? "M" : "L"} ${x} ${y}`;
            })
            .join(" ");

        areaPath = `${linePath} L ${getX(data.length - 1)} ${chartH} L ${getX(0)} ${chartH} Z`;
    }

    // Colors per metric
    const metricColor = '#3b82f6'

    return (
        <div className="graph-modal-overlay" onClick={onClose}>
            <div className="graph-modal" onClick={e => e.stopPropagation()} style={{ '--accent-primary': '#3b82f6' }}>

                {/* Header */}
                <div className="gm-header">
                    <div className="gm-header-left">
                        <div className="gm-icon" style={{ background: 'var(--gradient-primary)' }}>
                            <Cpu size={22} />
                        </div>
                        <div>
                            <h2 className="gm-title" style={{ background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                {instance.instanceName}
                            </h2>
                            <p className="gm-subtitle">30-Day CPU Usage Trend</p>
                        </div>
                    </div>
                    <div className="gm-header-right">
                        {/* Metric Toggle */}
                        <button className="gm-close-btn" onClick={onClose}>
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Stats Row */}
                <div className="gm-stats-row">
                    <div className="gm-stat">
                        <div className="gm-stat-icon peak"><TrendingUp size={16} /></div>
                        <div className="gm-stat-val">{maxVal.toFixed(1)}%</div>
                        <div className="gm-stat-lbl">Peak</div>
                    </div>
                    <div className="gm-stat">
                        <div className="gm-stat-icon avg"><Activity size={16} /></div>
                        <div className="gm-stat-val">{avgVal}%</div>
                        <div className="gm-stat-lbl">Average</div>
                    </div>
                    <div className="gm-stat">
                        <div className={`gm-stat-icon current`}>
                            <Cpu size={16} />
                        </div>
                        <div className="gm-stat-val">{currentVal}%</div>
                        <div className="gm-stat-lbl">Current</div>
                    </div>
                    {selectedDateObj && (
                        <div className="gm-stat selected-stat">
                            <div className="gm-stat-icon selected"><Calendar size={16} /></div>
                            <div className="gm-stat-val">{formatDate(selectedDateObj)}</div>
                            <div className="gm-stat-lbl">Selected Day</div>
                        </div>
                    )}
                </div>

                {/* SVG Line Chart */}
                <div className="gm-line-chart-wrap">
                    <svg
                        viewBox={`0 0 ${chartW} ${chartH}`}
                        className="gm-line-svg"
                        preserveAspectRatio="none"
                    >
                        <defs>
                            <linearGradient id={`line-area-grad-cpu`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={metricColor} stopOpacity="0.3" />
                                <stop offset="100%" stopColor={metricColor} stopOpacity="0" />
                            </linearGradient>
                        </defs>
                        <path d={areaPath} fill={`url(#line-area-grad-cpu)`} />
                        <path d={linePath} fill="none" stroke={metricColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        {hoveredIdx !== null && (
                            <circle
                                cx={getX(hoveredIdx)}
                                cy={getY(data[hoveredIdx].value)}
                                r="5"
                                fill={metricColor}
                                stroke="white"
                                strokeWidth="2"
                            />
                        )}
                    </svg>
                </div>

                {/* Bar Chart Area */}
                <div className="gm-chart-area">
                    <div className="gm-bars-container">
                        {data.map((d, i) => {
                            const todayBar = isToday(d.date);
                            const selectedBar = isSelected(d.date);
                            const heightPct = ((d.value - minVal) / (maxVal - minVal + 1)) * 100 + 10;
                            const isHovered = hoveredIdx === i;

                            return (
                                <div
                                    key={i}
                                    className={`gm-bar-col ${todayBar ? 'today' : ''} ${selectedBar ? 'selected-day' : ''}`}
                                    onMouseEnter={(e) => {
                                        setHoveredIdx(i);
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        setTooltip({
                                            x: rect.left + rect.width / 2,
                                            y: rect.top,
                                            date: formatDate(d.date),
                                            value: d.value,
                                            isToday: todayBar,
                                            isSelected: selectedBar
                                        });
                                    }}
                                    onMouseLeave={() => { setHoveredIdx(null); setTooltip(null); }}
                                >
                                    <div
                                        className={`gm-bar ${todayBar ? 'today-bar' : ''} ${selectedBar ? 'selected-bar' : ''} ${isHovered ? 'hovered' : ''}`}
                                        style={{ height: `${heightPct}%`, background: isHovered ? '#3b82f6' : '' }}
                                    />
                                    {(todayBar || selectedBar) && (
                                        <div className={`gm-bar-label ${todayBar ? 'today-label' : 'selected-label'}`}>
                                            {todayBar ? 'Today' : 'Selected'}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <div className="gm-x-labels">
                        {data.filter((_, i) => i % 5 === 0 || i === data.length - 1).map((d, i) => (
                            <span key={i}>{formatDate(d.date)}</span>
                        ))}
                    </div>
                </div>

                {/* Legend */}
                <div className="gm-legend">
                    <div className="gm-legend-item">
                        <div className="gm-legend-dot today-dot" />
                        <span>Today</span>
                    </div>
                    {selectedDateObj && (
                        <div className="gm-legend-item">
                            <div className="gm-legend-dot selected-dot" />
                            <span>Selected Date ({formatDate(selectedDateObj)})</span>
                        </div>
                    )}
                    <div className="gm-legend-item">
                        <div className={`gm-legend-dot normal-dot`} style={{ background: '#3b82f6' }} />
                        <span>CPU Usage</span>
                    </div>
                </div>
            </div>

            {/* Floating Tooltip */}
            {tooltip && (
                <div
                    className="gm-tooltip"
                    style={{ left: tooltip.x, top: tooltip.y - 80 }}
                >
                    <div className="gm-tooltip-date">{tooltip.date}</div>
                    <div className="gm-tooltip-val" style={{ color: '#3b82f6' }}>{tooltip.value}%</div>
                    <div className="gm-tooltip-metric">CPU</div>
                    {tooltip.isToday && <div className="gm-tooltip-tag today-tag">Today</div>}
                    {tooltip.isSelected && <div className="gm-tooltip-tag selected-tag">Selected</div>}
                </div>
            )}
        </div>
    );
}

export default EC2GraphModal;