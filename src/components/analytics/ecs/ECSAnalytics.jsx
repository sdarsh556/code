import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Container, Clock, DollarSign, Activity, Cpu, TrendingUp, Zap,
    ArrowRight, ChevronLeft, ChevronRight, Calendar, MemoryStick, Server,
    SearchX, RefreshCw, ArrowUpDown, Trophy, Medal, Award, TrendingDown, Minus
} from 'lucide-react';
import '../../../css/analytics/ecs/ECSAnalytics.css';

// ─── Custom Calendar Picker ───────────────────────────────────────────────────
function CalendarPicker({ onRangeSelect, onClose }) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const minDate = new Date(today);
    minDate.setDate(minDate.getDate() - 29);

    const [viewMonth, setViewMonth] = useState(today.getMonth());
    const [viewYear, setViewYear] = useState(today.getFullYear());
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [hoverDate, setHoverDate] = useState(null);

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

    const getDaysInMonth = (month, year) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (month, year) => new Date(year, month, 1).getDay();

    const isDisabled = (d) => d < minDate || d > today;
    const isInRange = (d) => {
        const end = endDate || hoverDate;
        if (!startDate || !end) return false;
        const lo = startDate < end ? startDate : end;
        const hi = startDate < end ? end : startDate;
        return d > lo && d < hi;
    };
    const isStart = (d) => startDate && d.getTime() === startDate.getTime();
    const isEnd = (d) => endDate && d.getTime() === endDate.getTime();
    const isHoverEnd = (d) => !endDate && hoverDate && startDate && d.getTime() === hoverDate.getTime();

    const handleDayClick = (d) => {
        if (isDisabled(d)) return;
        if (!startDate || (startDate && endDate)) {
            setStartDate(d);
            setEndDate(null);
        } else {
            if (d < startDate) { setEndDate(startDate); setStartDate(d); }
            else { setEndDate(d); }
        }
    };

    const handleApply = () => {
        if (startDate && endDate) {
            onRangeSelect({ start: startDate, end: endDate });
            onClose();
        }
    };

    const prevMonth = () => {
        if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
        else setViewMonth(m => m - 1);
    };
    const nextMonth = () => {
        const now = new Date();
        if (viewYear === now.getFullYear() && viewMonth === now.getMonth()) return;
        if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
        else setViewMonth(m => m + 1);
    };

    const days = [];
    const firstDay = getFirstDayOfMonth(viewMonth, viewYear);
    const daysInMonth = getDaysInMonth(viewMonth, viewYear);
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) {
        days.push(new Date(viewYear, viewMonth, i));
    }

    return (
        <div className="calendar-overlay" onClick={onClose}>
            <div className="calendar-popup" onClick={e => e.stopPropagation()}>
                <div className="calendar-header">
                    <button className="cal-nav-btn" onClick={prevMonth}><ChevronLeft size={18} /></button>
                    <span className="cal-month-label">{monthNames[viewMonth]} {viewYear}</span>
                    <button className="cal-nav-btn" onClick={nextMonth}><ChevronRight size={18} /></button>
                </div>
                <div className="calendar-hint">Select a date range (last 30 days)</div>
                <div className="calendar-grid">
                    {dayNames.map(d => <div key={d} className="cal-day-name">{d}</div>)}
                    {days.map((d, i) => {
                        if (!d) return <div key={`empty-${i}`} />;
                        const disabled = isDisabled(d);
                        const start = isStart(d);
                        const end = isEnd(d) || isHoverEnd(d);
                        const inRange = isInRange(d);
                        return (
                            <button
                                key={d.toISOString()}
                                className={`cal-day ${disabled ? 'disabled' : ''} ${start ? 'range-start' : ''} ${end ? 'range-end' : ''} ${inRange ? 'in-range' : ''}`}
                                onClick={() => handleDayClick(d)}
                                onMouseEnter={() => !disabled && startDate && !endDate && setHoverDate(d)}
                                onMouseLeave={() => setHoverDate(null)}
                                disabled={disabled}
                            >
                                {d.getDate()}
                            </button>
                        );
                    })}
                </div>
                <div className="calendar-footer">
                    <div className="cal-selection-info">
                        {startDate ? (
                            <span>{startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                {endDate ? ` → ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ' → ?'}
                            </span>
                        ) : <span>Click to select start date</span>}
                    </div>
                    <button
                        className={`cal-apply-btn ${startDate && endDate ? 'active' : ''}`}
                        onClick={handleApply}
                        disabled={!startDate || !endDate}
                    >
                        Apply Range
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
function ECSAnalytics() {
    const navigate = useNavigate();
    const [selectedRange, setSelectedRange] = useState('7d');
    const [showCalendar, setShowCalendar] = useState(false);
    const [customRange, setCustomRange] = useState(null);
    const [clusterSortBy, setClusterSortBy] = useState('cpu');
    const [clusterSortDir, setClusterSortDir] = useState('desc');

    const handleClusterSort = (col) => {
        if (clusterSortBy === col) setClusterSortDir(d => d === 'desc' ? 'asc' : 'desc');
        else { setClusterSortBy(col); setClusterSortDir('desc'); }
    };

    const ClusterSortIcon = ({ col }) => {
        const active = clusterSortBy === col;
        return <span className={`sort-arrow ${active ? 'active' : ''}`}>{active && clusterSortDir === 'asc' ? '↑' : '↓'}</span>;
    };

    const datePresets = [
        { id: '24h', label: '24H', days: 1 },
        { id: '7d', label: '7D', days: 7 },
        { id: '15d', label: '15D', days: 15 },
        { id: '30d', label: '30D', days: 30 },
    ];

    const allClusterData = [
        { clusterName: 'production-cluster', totalServices: 24, approxCost: 1247.50, activeDays: 7, avgCpu: 45.2, avgMemory: 62.8, status: 'healthy', trend: 'up', minDays: 1 },
        { clusterName: 'staging-cluster', totalServices: 12, approxCost: 423.20, activeDays: 5, avgCpu: 32.1, avgMemory: 48.3, status: 'healthy', trend: 'stable', minDays: 7 },
        { clusterName: 'development-cluster', totalServices: 8, approxCost: 156.80, activeDays: 3, avgCpu: 28.5, avgMemory: 41.2, status: 'warning', trend: 'down', minDays: 15 },
        { clusterName: 'testing-cluster', totalServices: 6, approxCost: 89.40, activeDays: 2, avgCpu: 18.9, avgMemory: 35.6, status: 'healthy', trend: 'up', minDays: 30 },
    ];

    // Filter clusters based on selected range (simulate empty state for '24h')
    const clusterData = useMemo(() => {
        const days = selectedRange === 'custom'
            ? (customRange ? Math.ceil((customRange.end - customRange.start) / (1000 * 60 * 60 * 24)) : 0)
            : (datePresets.find(p => p.id === selectedRange)?.days || 7);
        // For demo: '24h' shows no clusters to demonstrate empty state
        if (selectedRange === '24h') return [];
        return allClusterData.filter(c => c.minDays <= days);
    }, [selectedRange, customRange]);

    const summaryStats = useMemo(() => ({
        totalClusters: clusterData.length,
        totalServices: clusterData.reduce((s, c) => s + c.totalServices, 0),
        totalCost: clusterData.reduce((s, c) => s + c.approxCost, 0),
        avgCpu: (clusterData.reduce((s, c) => s + c.avgCpu, 0) / clusterData.length).toFixed(1),
    }), []);

    const sortedClusters = useMemo(() => {
        return [...clusterData].sort((a, b) => {
            let av, bv;
            if (clusterSortBy === 'cpu') { av = a.avgCpu; bv = b.avgCpu; }
            else if (clusterSortBy === 'memory') { av = a.avgMemory; bv = b.avgMemory; }
            else if (clusterSortBy === 'cost') { av = a.approxCost; bv = b.approxCost; }
            else { av = a.totalServices; bv = b.totalServices; }
            return clusterSortDir === 'desc' ? bv - av : av - bv;
        });
    }, [clusterData, clusterSortBy, clusterSortDir]);

    const maxClusterCpu = Math.max(...(clusterData.length ? clusterData.map(c => c.avgCpu) : [1]));
    const maxClusterMem = Math.max(...(clusterData.length ? clusterData.map(c => c.avgMemory) : [1]));
    const maxClusterCost = Math.max(...(clusterData.length ? clusterData.map(c => c.approxCost) : [1]));
    const maxClusterSvc = Math.max(...(clusterData.length ? clusterData.map(c => c.totalServices) : [1]));

    const getClusterBarClass = (val, max) => {
        const pct = (val / max) * 100;
        if (pct > 80) return 'bar-danger';
        if (pct > 55) return 'bar-warning';
        return 'bar-ok';
    };

    const getRankIcon = (rank) => {
        if (rank === 0) return <Trophy size={14} className="rank-icon gold" />;
        if (rank === 1) return <Medal size={14} className="rank-icon silver" />;
        if (rank === 2) return <Award size={14} className="rank-icon bronze" />;
        return <span className="rank-num">#{rank + 1}</span>;
    };

    const getTrendIcon = (trend) => {
        if (trend === 'up') return <TrendingUp size={13} />;
        if (trend === 'down') return <TrendingDown size={13} />;
        return <Minus size={13} />;
    };

    const handleClusterClick = (cluster) => {
        navigate(`/analytics/ecs/cluster/${cluster.clusterName}`, {
            state: { cluster, selectedRange }
        });
    };

    const handleCustomRange = (range) => {
        setCustomRange(range);
        setSelectedRange('custom');
    };

    const getActiveLabel = () => {
        if (selectedRange === 'custom' && customRange) {
            return `${customRange.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${customRange.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
        }
        return datePresets.find(p => p.id === selectedRange)?.label || '';
    };

    const metricCards = [
        { label: 'Active Clusters', value: summaryStats.totalClusters, icon: Container, color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)', bars: [65, 45, 78, 90, 55] },
        { label: 'Total Services', value: summaryStats.totalServices, icon: Activity, color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', trend: '+12%' },
        { label: 'Total Cost', value: `$${summaryStats.totalCost.toFixed(0)}`, icon: DollarSign, color: '#10b981', bg: 'rgba(16,185,129,0.1)', progress: 68 },
        { label: 'Avg CPU', value: `${summaryStats.avgCpu}%`, icon: Cpu, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', circle: summaryStats.avgCpu },
    ];

    return (
        <div className="ecs-analytics-page">
            {/* Background grid */}
            <div className="ecs-grid-bg" />

            {/* Ambient glow */}
            <div className="ecs-ambient-1" />
            <div className="ecs-ambient-2" />

            <div className="ecs-analytics-content">
                {/* ── Header ── */}
                <div className="ecs-page-header">
                    <div className="ecs-header-left">
                        <div className="ecs-header-icon">
                            <Container size={28} />
                            <div className="ecs-icon-ring" />
                        </div>
                        <div>
                            <h1 className="ecs-page-title">ECS Analytics</h1>
                            <p className="ecs-page-sub">Container performance & cost intelligence</p>
                        </div>
                    </div>

                    {/* Time Selector */}
                    <div className="time-selector-wrap">
                        <div className="time-selector">
                            {datePresets.map(p => (
                                <button
                                    key={p.id}
                                    className={`time-pill ${selectedRange === p.id ? 'active' : ''}`}
                                    onClick={() => { setSelectedRange(p.id); setCustomRange(null); }}
                                >
                                    {p.label}
                                </button>
                            ))}
                            <button
                                className={`time-pill custom-pill ${selectedRange === 'custom' ? 'active' : ''}`}
                                onClick={() => setShowCalendar(true)}
                            >
                                <Calendar size={14} />
                                {selectedRange === 'custom' && customRange ? getActiveLabel() : 'Custom'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* ── Metric Cards ── */}
                <div className="metric-cards-row">
                    {metricCards.map((card, i) => {
                        const Icon = card.icon;
                        return (
                            <div key={i} className="metric-card-new" style={{ '--mc': card.color, '--mc-bg': card.bg, animationDelay: `${i * 0.1}s` }}>
                                <div className="mc-top-accent" />
                                <div className="mc-icon"><Icon size={24} /></div>
                                <div className="mc-value">{card.value}</div>
                                <div className="mc-label">{card.label}</div>
                                {card.bars && (
                                    <div className="mc-mini-bars">
                                        {card.bars.map((h, j) => (
                                            <div key={j} className="mc-bar" style={{ height: `${h}%` }} />
                                        ))}
                                    </div>
                                )}
                                {card.trend && (
                                    <div className="mc-trend">
                                        <TrendingUp size={14} />
                                        {card.trend}
                                    </div>
                                )}
                                {card.progress !== undefined && (
                                    <div className="mc-progress-track">
                                        <div className="mc-progress-fill" style={{ width: `${card.progress}%` }} />
                                    </div>
                                )}
                                {card.circle !== undefined && (
                                    <svg className="mc-circle-svg" viewBox="0 0 36 36">
                                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                            fill="none" stroke="rgba(245,158,11,0.15)" strokeWidth="3" />
                                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                            fill="none" stroke="#f59e0b" strokeWidth="3"
                                            strokeDasharray={`${card.circle}, 100`}
                                            strokeLinecap="round" />
                                    </svg>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* ── Clusters Panel ── */}
                <div className="clusters-panel-new">
                    <div className="panel-header-new">
                        <div className="panel-title-group">
                            <Zap size={20} className="panel-title-icon" />
                            <h2>Cluster Performance</h2>
                            <span className="panel-period-badge">{getActiveLabel()}</span>
                        </div>
                        <div className="panel-subtitle">Click a cluster to view daily breakdown</div>
                    </div>

                    <div className="clusters-grid">
                        {clusterData.length === 0 ? (
                            /* ── Empty State ── */
                            <div className="clusters-empty-state">
                                <div className="empty-icon-wrap">
                                    <SearchX size={48} className="empty-icon" />
                                    <div className="empty-icon-ring" />
                                </div>
                                <h3 className="empty-title">No clusters found</h3>
                                <p className="empty-desc">
                                    No ECS clusters were active during the selected time range.<br />
                                    Try expanding the date range or selecting a different period.
                                </p>
                                <button
                                    className="empty-reset-btn"
                                    onClick={() => { setSelectedRange('7d'); setCustomRange(null); }}
                                >
                                    <RefreshCw size={15} />
                                    Reset to Last 7 Days
                                </button>
                            </div>
                        ) : (
                            clusterData.map((cluster, index) => (
                                <div
                                    key={cluster.clusterName}
                                    className={`cluster-card ${cluster.status}`}
                                    onClick={() => handleClusterClick(cluster)}
                                    style={{ animationDelay: `${0.3 + index * 0.1}s` }}
                                >
                                    {/* Status glow */}
                                    <div className={`cluster-status-glow ${cluster.status}`} />

                                    {/* Card Top */}
                                    <div className="cluster-card-top">
                                        <div className="cluster-name-row">
                                            <div className={`cluster-status-dot ${cluster.status}`} />
                                            <span className="cluster-name-text">{cluster.clusterName}</span>
                                        </div>
                                        <div className={`cluster-trend-badge trend-${cluster.trend}`}>
                                            {cluster.trend === 'up' ? '↑' : cluster.trend === 'down' ? '↓' : '→'}
                                        </div>
                                    </div>

                                    {/* Stats Row */}
                                    <div className="cluster-stats-row">
                                        <div className="cluster-stat-item">
                                            <div className="csi-icon"><Clock size={14} /></div>
                                            <div className="csi-value">{cluster.activeDays}d</div>
                                            <div className="csi-label">Active</div>
                                        </div>
                                        <div className="cluster-stat-divider" />
                                        <div className="cluster-stat-item">
                                            <div className="csi-icon"><Server size={14} /></div>
                                            <div className="csi-value">{cluster.totalServices}</div>
                                            <div className="csi-label">Services</div>
                                        </div>
                                        <div className="cluster-stat-divider" />
                                        <div className="cluster-stat-item">
                                            <div className="csi-icon"><DollarSign size={14} /></div>
                                            <div className="csi-value">${cluster.approxCost.toFixed(0)}</div>
                                            <div className="csi-label">Cost</div>
                                        </div>
                                    </div>

                                    {/* CPU & Memory Bars */}
                                    <div className="cluster-resource-bars">
                                        <div className="resource-bar-item">
                                            <div className="rb-header">
                                                <span className="rb-label"><Cpu size={12} /> CPU</span>
                                                <span className="rb-value">{cluster.avgCpu}%</span>
                                            </div>
                                            <div className="rb-track">
                                                <div className="rb-fill cpu-fill" style={{ width: `${cluster.avgCpu}%` }} />
                                            </div>
                                        </div>
                                        <div className="resource-bar-item">
                                            <div className="rb-header">
                                                <span className="rb-label"><MemoryStick size={12} /> Memory</span>
                                                <span className="rb-value">{cluster.avgMemory}%</span>
                                            </div>
                                            <div className="rb-track">
                                                <div className="rb-fill mem-fill" style={{ width: `${cluster.avgMemory}%` }} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Footer */}
                                    <div className="cluster-card-footer">
                                        <span>View Daily Breakdown</span>
                                        <ArrowRight size={16} />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* ── Cluster Comparison Table ── */}
                {clusterData.length > 0 && (
                    <div className="ecs-comparison-section">
                        <div className="ecs-comparison-header">
                            <div className="ecs-comp-label">
                                <ArrowUpDown size={15} />
                                <span>Cluster Comparison — click column headers to sort</span>
                            </div>
                        </div>

                        <div className="ecs-comparison-table">
                            {/* Head */}
                            <div className="ecs-table-head">
                                <div className="ecs-th rank-col">#</div>
                                <div className="ecs-th name-col">Cluster</div>
                                <div className={`ecs-th metric-col sortable ${clusterSortBy === 'cpu' ? 'active-col' : ''}`} onClick={() => handleClusterSort('cpu')}>
                                    CPU <ClusterSortIcon col="cpu" />
                                </div>
                                <div className={`ecs-th metric-col sortable ${clusterSortBy === 'memory' ? 'active-col' : ''}`} onClick={() => handleClusterSort('memory')}>
                                    Memory <ClusterSortIcon col="memory" />
                                </div>
                                <div className={`ecs-th cost-col sortable ${clusterSortBy === 'cost' ? 'active-col' : ''}`} onClick={() => handleClusterSort('cost')}>
                                    Cost <ClusterSortIcon col="cost" />
                                </div>
                                <div className={`ecs-th svc-col sortable ${clusterSortBy === 'services' ? 'active-col' : ''}`} onClick={() => handleClusterSort('services')}>
                                    Services <ClusterSortIcon col="services" />
                                </div>
                            </div>

                            {/* Rows */}
                            {sortedClusters.map((cluster, rank) => (
                                <div
                                    key={cluster.clusterName}
                                    className={`ecs-table-row ${rank === 0 ? 'top-rank' : ''} ${cluster.status}`}
                                    onClick={() => handleClusterClick(cluster)}
                                    style={{ animationDelay: `${rank * 0.05}s` }}
                                >
                                    <div className="ecs-td rank-col">{getRankIcon(rank)}</div>

                                    <div className="ecs-td name-col">
                                        <div className={`ecs-row-dot ${cluster.status}`} />
                                        <span className="ecs-row-name">{cluster.clusterName}</span>
                                    </div>

                                    <div className="ecs-td metric-col">
                                        <div className="ecs-tbl-bar-wrap">
                                            <div className={`ecs-tbl-bar ${getClusterBarClass(cluster.avgCpu, maxClusterCpu)}`}
                                                style={{ width: `${(cluster.avgCpu / maxClusterCpu) * 100}%` }} />
                                        </div>
                                        <span className="ecs-tbl-val">{cluster.avgCpu}%</span>
                                    </div>

                                    <div className="ecs-td metric-col">
                                        <div className="ecs-tbl-bar-wrap">
                                            <div className={`ecs-tbl-bar mem ${getClusterBarClass(cluster.avgMemory, maxClusterMem)}`}
                                                style={{ width: `${(cluster.avgMemory / maxClusterMem) * 100}%` }} />
                                        </div>
                                        <span className="ecs-tbl-val">{cluster.avgMemory}%</span>
                                    </div>

                                    <div className="ecs-td cost-col">
                                        <span className="ecs-cost-val">${cluster.approxCost.toFixed(0)}</span>
                                    </div>

                                    <div className="ecs-td svc-col">
                                        <div className="ecs-svc-badge">
                                            <Server size={11} />
                                            <span>{cluster.totalServices}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Calendar Popup */}
            {showCalendar && (
                <CalendarPicker
                    onRangeSelect={handleCustomRange}
                    onClose={() => setShowCalendar(false)}
                />
            )}
        </div>
    );
}

export default ECSAnalytics;
