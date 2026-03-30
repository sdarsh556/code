import { useState, useMemo, useRef, useEffect } from 'react';
import { useParams, useLocation, useNavigate, useOutletContext } from 'react-router-dom';
import {
    Container, Clock, DollarSign, Activity, Cpu, TrendingUp, Zap,
    ArrowRight, ChevronLeft, ChevronRight, Calendar, MemoryStick, Server,
    SearchX, RefreshCw, ArrowUpDown, TrendingDown, Minus,
    ChevronUp, ChevronDown, Download, Search, X
} from 'lucide-react';
import '../../../css/analytics/ecs/ECSAnalytics.css';
import '../../../css/analytics/comparison-table.css';
import ComparisonTable from '../ComparisonTable';
import ECSIcon from '../../common/ECSIcon';

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
    const [searchQuery, setSearchQuery] = useState('');
    const [searchFocused, setSearchFocused] = useState(false);

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

    const { setBgContext } = useOutletContext();

    useEffect(() => {
        setBgContext('analytics');
        return () => setBgContext('default');
    }, [setBgContext]);

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

    const filteredClusters = useMemo(() => {
        if (!searchQuery.trim()) return sortedClusters;
        const q = searchQuery.toLowerCase().trim();
        return sortedClusters.filter(c =>
            c.clusterName.toLowerCase().includes(q)
        );
    }, [sortedClusters, searchQuery]);

    const getClusterBarClass = (val, max) => {
        const pct = (val / max) * 100;
        if (pct > 80) return 'bar-danger';
        if (pct > 55) return 'bar-warning';
        return 'bar-ok';
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

    const handleExportAll = () => {
        // We'll simulate the nested data structure for the export
        // In a real app, this would fetch from an API or use a more robust data store
        const headers = ['Cluster', 'Date', 'Day', 'Service Name', 'Tasks', 'CPU (%)', 'Memory (%)', 'Daily Cost ($)'];
        const csvRows = [headers.join(',')];

        const mockDates = sortedClusters.flatMap(c => {
            // Simulate 7 days of data for each cluster
            return [
                { date: '2026-02-22', day: 'Sunday' },
                { date: '2026-02-21', day: 'Saturday' },
                { date: '2026-02-20', day: 'Friday' },
                { date: '2026-02-19', day: 'Thursday' },
                { date: '2026-02-18', day: 'Wednesday' },
                { date: '2026-02-17', day: 'Tuesday' },
                { date: '2026-02-16', day: 'Monday' }
            ];
        });

        const mockServices = [
            { name: 'api-gateway', tasks: 8, cpu: 62.4, mem: 74.2 },
            { name: 'auth-service', tasks: 4, cpu: 45.8, mem: 58.6 },
            { name: 'payment-processor', tasks: 6, cpu: 71.3, mem: 82.1 },
            { name: 'notification-service', tasks: 3, cpu: 38.2, mem: 51.4 }
        ];

        sortedClusters.forEach(cluster => {
            // For each cluster, we iterate through the days in the range
            const daysInRange = [
                { date: '2026-02-22', day: 'Sunday', cost: cluster.approxCost / 7 },
                { date: '2026-02-21', day: 'Saturday', cost: cluster.approxCost / 7 },
                { date: '2026-02-20', day: 'Friday', cost: cluster.approxCost / 7 },
                { date: '2026-02-19', day: 'Thursday', cost: cluster.approxCost / 7 },
                { date: '2026-02-18', day: 'Wednesday', cost: cluster.approxCost / 7 },
                { date: '2026-02-17', day: 'Tuesday', cost: cluster.approxCost / 7 },
                { date: '2026-02-16', day: 'Monday', cost: cluster.approxCost / 7 }
            ];

            daysInRange.forEach(day => {
                mockServices.forEach(svc => {
                    const row = [
                        `"${cluster.clusterName}"`,
                        day.date,
                        day.day,
                        `"${svc.name}"`,
                        svc.tasks,
                        svc.cpu,
                        svc.mem,
                        day.cost.toFixed(2)
                    ];
                    csvRows.push(row.join(','));
                });
            });
        });

        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `ecs-comprehensive-export-${selectedRange}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const metricCards = [
        { label: 'Active Clusters', value: summaryStats.totalClusters, icon: Container, color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)', bars: [65, 45, 78, 90, 55] },
        { label: 'Total Services', value: summaryStats.totalServices, icon: Activity, color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', trend: '+12%' },
        { label: 'Total Cost', value: `$${summaryStats.totalCost.toFixed(0)}`, icon: DollarSign, color: '#10b981', bg: 'rgba(16,185,129,0.1)', progress: 68 },
        { label: 'Avg CPU', value: `${summaryStats.avgCpu}%`, icon: Cpu, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', circle: summaryStats.avgCpu },
    ];

    return (
        <div className="ecs-analytics-page">
            <div className="ecs-analytics-content">
                {/* ── Header ── */}
                <div className="ecs-page-header">
                    <div className="ecs-header-left">
                        <div className="ecs-header-icon">
                            <ECSIcon size={40} color="inherit" />
                            <div className="ecs-icon-ring" />
                        </div>
                        <div>
                            <h1 className="ecs-page-title">ECS Analytics</h1>
                            <p className="ecs-page-sub">Container performance & cost intelligence</p>
                        </div>
                    </div>

                    {/* Time Selector */}
                    <div className="time-selector-wrap" style={{ gap: '1rem' }}>
                        <button
                            className="ecs-export-all-btn"
                            onClick={handleExportAll}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.625rem',
                                padding: '0.75rem 1.25rem',
                                background: 'rgba(139, 92, 246, 0.1)',
                                border: '1px solid rgba(139, 92, 246, 0.25)',
                                borderRadius: '1rem',
                                color: '#8b5cf6',
                                fontSize: '0.85rem',
                                fontWeight: '800',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <Download size={16} />
                            <span>Export Comprehensive Insight</span>
                        </button>

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
                        <div className="panel-header-content">
                            <div className="panel-header-left">
                                <div className="panel-title-group">
                                    <Zap size={20} className="panel-title-icon" />
                                    <h2>Cluster Performance</h2>
                                    <span className="panel-period-badge">{getActiveLabel()}</span>
                                </div>
                                <div className="panel-subtitle">Performance breakdown for your active ECS clusters</div>
                            </div>

                            <div className={`panel-search-wrapper ${searchFocused ? 'focused' : ''} ${searchQuery ? 'has-query' : ''}`}>
                                <Search size={18} className="search-icon" />
                                <input
                                    type="text"
                                    placeholder="Search clusters..."
                                    value={searchQuery}
                                    onFocus={() => setSearchFocused(true)}
                                    onBlur={() => setSearchFocused(false)}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="panel-search-input"
                                />
                                {searchQuery && (
                                    <button
                                        className="search-clear-btn"
                                        onClick={() => setSearchQuery('')}
                                        title="Clear search"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="clusters-grid">
                        {filteredClusters.length === 0 ? (
                            /* ── Empty State ── */
                            <div className="clusters-empty-state">
                                <div className="empty-icon-wrap">
                                    {searchQuery ? <SearchX size={20} className="sd-service-icon" color="inherit" /> : <ECSIcon size={18} className="sd-service-icon" color="inherit" />}
                                    <div className="empty-icon-ring" />
                                </div>
                                <h3 className="empty-title">{searchQuery ? 'No search results' : 'No clusters found'}</h3>
                                <p className="empty-desc">
                                    {searchQuery
                                        ? `We couldn't find any clusters matching "${searchQuery}".`
                                        : 'No ECS clusters were active during the selected time range.'
                                    }
                                    <br />
                                    Try expanding the date range or {searchQuery ? 'clearing your search' : 'selecting a different period'}.
                                </p>
                                <button
                                    className="empty-reset-btn"
                                    onClick={() => {
                                        if (searchQuery) setSearchQuery('');
                                        else { setSelectedRange('7d'); setCustomRange(null); }
                                    }}
                                >
                                    <RefreshCw size={15} />
                                    {searchQuery ? 'Clear Search Filter' : 'Reset to Last 7 Days'}
                                </button>
                            </div>
                        ) : (
                            filteredClusters.map((cluster, index) => (
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
                    <ComparisonTable
                        title="Cluster Comparison"
                        subtitle="Click any column header to sort"
                        data={filteredClusters.map(c => ({
                            ...c,
                            id: c.clusterName
                        }))}
                        exportFilename="cluster-comparison.csv"
                        gridTemplateColumns="52px minmax(0, 1fr) 140px 140px 140px 140px"
                        onRowClick={handleClusterClick}
                        columns={[
                            {
                                key: 'clusterName',
                                label: 'Cluster',
                                type: 'status-name',
                                sortable: true
                            },
                            {
                                key: 'avgCpu',
                                label: 'CPU',
                                icon: Cpu,
                                type: 'cpu',
                                sortable: true,
                                align: 'right'
                            },
                            {
                                key: 'avgMemory',
                                label: 'Memory',
                                icon: MemoryStick,
                                type: 'memory',
                                sortable: true,
                                align: 'right'
                            },
                            {
                                key: 'approxCost',
                                label: 'Cost',
                                icon: DollarSign,
                                type: 'cost',
                                sortable: true,
                                align: 'right'
                            },
                            {
                                key: 'totalServices',
                                label: 'Services',
                                icon: Server,
                                type: 'badge-svc',
                                sortable: true,
                                align: 'right'
                            }
                        ]}
                    />
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
