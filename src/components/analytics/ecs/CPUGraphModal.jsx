import { useState, useMemo } from 'react';
import { X, TrendingUp, Activity, Cpu, Calendar, MemoryStick } from 'lucide-react';
import '../../../css/analytics/ecs/CPUGraphModal.css';

function CPUGraphModal({ service, selectedDate, onClose }) {
    const [tooltip, setTooltip] = useState(null);
    const [hoveredIdx, setHoveredIdx] = useState(null);
    const [activeMetric, setActiveMetric] = useState('cpu'); // 'cpu' | 'memory'

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const selectedDateObj = selectedDate ? new Date(selectedDate) : null;
    if (selectedDateObj) selectedDateObj.setHours(0, 0, 0, 0);

    // Generate 30-day data for both CPU and Memory (stable with useMemo)
    const { cpuData, memData } = useMemo(() => {
        const cpu = [];
        const mem = [];
        for (let i = 29; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);

            const cpuNoise = (Math.sin(i * 0.7) * 12) + (Math.cos(i * 0.3) * 5);
            const cpuVal = Math.max(5, Math.min(99, service.cpu + cpuNoise));

            const memNoise = (Math.sin(i * 0.5 + 1) * 10) + (Math.cos(i * 0.4) * 6);
            const memVal = Math.max(5, Math.min(99, service.memory + memNoise));

            cpu.push({ date: new Date(d), value: parseFloat(cpuVal.toFixed(1)) });
            mem.push({ date: new Date(d), value: parseFloat(memVal.toFixed(1)) });
        }
        return { cpuData: cpu, memData: mem };
    }, [service.cpu, service.memory]);

    const data = activeMetric === 'cpu' ? cpuData : memData;
    const currentVal = activeMetric === 'cpu' ? service.cpu : service.memory;

    const maxVal = Math.max(...data.map(d => d.value));
    const minVal = Math.min(...data.map(d => d.value));
    const avgVal = (data.reduce((s, d) => s + d.value, 0) / data.length).toFixed(1);

    const isToday = (d) => d.getTime() === today.getTime();
    const isSelected = (d) => selectedDateObj && d.getTime() === selectedDateObj.getTime();
    const formatDate = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    // SVG line chart
    const chartW = 600;
    const chartH = 120;
    const padX = 10;
    const padY = 10;

    const getX = (i) => padX + (i / (data.length - 1)) * (chartW - padX * 2);
    const getY = (v) => padY + (1 - (v - minVal) / (maxVal - minVal + 1)) * (chartH - padY * 2);

    const linePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.value)}`).join(' ');
    const areaPath = `${linePath} L ${getX(data.length - 1)} ${chartH} L ${getX(0)} ${chartH} Z`;

    // Colors per metric
    const metricColor = activeMetric === 'cpu' ? '#8b5cf6' : '#ec4899';
    const metricColorLight = activeMetric === 'cpu' ? 'rgba(139,92,246,0.3)' : 'rgba(236,72,153,0.3)';
    const metricColorFade = activeMetric === 'cpu' ? 'rgba(139,92,246,0)' : 'rgba(236,72,153,0)';

    return (
        <div className="graph-modal-overlay" onClick={onClose}>
            <div className="graph-modal" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="gm-header">
                    <div className="gm-header-left">
                        <div className="gm-icon">
                            {activeMetric === 'cpu' ? <Cpu size={22} /> : <MemoryStick size={22} />}
                        </div>
                        <div>
                            <h2 className="gm-title">{service.serviceName}</h2>
                            <p className="gm-subtitle">30-Day {activeMetric === 'cpu' ? 'CPU' : 'Memory'} Usage Trend</p>
                        </div>
                    </div>
                    <div className="gm-header-right">
                        {/* Metric Toggle */}
                        <div className="gm-metric-toggle">
                            <button
                                className={`gm-toggle-btn ${activeMetric === 'cpu' ? 'active cpu-active' : ''}`}
                                onClick={() => setActiveMetric('cpu')}
                            >
                                <Cpu size={14} />
                                CPU
                            </button>
                            <button
                                className={`gm-toggle-btn ${activeMetric === 'memory' ? 'active mem-active' : ''}`}
                                onClick={() => setActiveMetric('memory')}
                            >
                                <MemoryStick size={14} />
                                Memory
                            </button>
                        </div>
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
                        <div className={`gm-stat-icon ${activeMetric === 'cpu' ? 'current' : 'mem-current'}`}>
                            {activeMetric === 'cpu' ? <Cpu size={16} /> : <MemoryStick size={16} />}
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
                        key={activeMetric} // re-animate on toggle
                    >
                        <defs>
                            <linearGradient id={`line-area-grad-${activeMetric}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={metricColor} stopOpacity="0.3" />
                                <stop offset="100%" stopColor={metricColor} stopOpacity="0" />
                            </linearGradient>
                        </defs>
                        <path d={areaPath} fill={`url(#line-area-grad-${activeMetric})`} />
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

                {/* Bar Chart */}
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
                                        className={`gm-bar ${activeMetric === 'memory' ? 'mem-bar' : ''} ${todayBar ? 'today-bar' : ''} ${selectedBar ? 'selected-bar' : ''} ${isHovered ? 'hovered' : ''}`}
                                        style={{ height: `${heightPct}%` }}
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

                    {/* X-axis labels */}
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
                        <div className={`gm-legend-dot ${activeMetric === 'cpu' ? 'normal-dot' : 'mem-dot'}`} />
                        <span>{activeMetric === 'cpu' ? 'CPU Usage' : 'Memory Usage'}</span>
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
                    <div className="gm-tooltip-val" style={{ color: metricColor }}>{tooltip.value}%</div>
                    <div className="gm-tooltip-metric">{activeMetric === 'cpu' ? 'CPU' : 'Memory'}</div>
                    {tooltip.isToday && <div className="gm-tooltip-tag today-tag">Today</div>}
                    {tooltip.isSelected && <div className="gm-tooltip-tag selected-tag">Selected</div>}
                </div>
            )}
        </div>
    );
}

export default CPUGraphModal;
