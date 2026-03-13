import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useOutletContext, useSearchParams } from 'react-router-dom';
import {
    Database, Activity, Cpu, Zap, Cloud, Server, ChevronLeft, ChevronRight,
    Calendar, Download, TrendingUp, SearchX, RefreshCw, BarChart3,
    ArrowRight, HardDrive, Network, ShieldCheck, Gauge, Clock, DollarSign, X
} from 'lucide-react';
import '../../../css/analytics/rds/RDSAnalytics.css';
import '../../../css/analytics/comparison-table.css';
import ComparisonTable from '../ComparisonTable';
import RDSGraphModal from './RDSGraphModal';

// --- Date Picker Logic ---
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

function RDSAnalytics() {
    const navigate = useNavigate();
    const { setBgContext } = useOutletContext();
    const [searchParams, setSearchParams] = useSearchParams();
    const viewModeParam = searchParams.get('view');
    const viewMode = (viewModeParam === 'aurora' || viewModeParam === 'docdb') ? viewModeParam : 'rds';

    const setViewMode = (mode) => {
        setSearchParams({ view: mode }, { replace: true });
    };

    const [selectedRange, setSelectedRange] = useState('24h');
    const [showCalendar, setShowCalendar] = useState(false);
    const [customRange, setCustomRange] = useState(null);
    const [selectedDaysInfo, setSelectedDaysInfo] = useState(null);
    const [isFlipped, setIsFlipped] = useState(false);
    const [selectedDateDetail, setSelectedDateDetail] = useState(null);
    const [selectedInstanceForTrend, setSelectedInstanceForTrend] = useState(null);
    const [selectedClusterForTrend, setSelectedClusterForTrend] = useState(null);

    useEffect(() => {
        setBgContext('analytics');
        return () => setBgContext('default');
    }, [setBgContext]);

    const datePresets = [
        { id: '24h', label: '24H', days: 1 },
        { id: '7d', label: '7D', days: 7 },
        { id: '15d', label: '15D', days: 15 },
        { id: '30d', label: '30D', days: 30 },
    ];

    const allDbData = {
        rds: [
            {
                db_identifier: "db-prod-mysql-01",
                db_name: "prod-mysql",
                instance_class: "db.t3.large",
                engine: "mysql",
                avg_cpu_utilization: 35.5,
                avg_connections: 50,
                avg_read_iops: 200,
                avg_write_iops: 100,
                approx_cost: 17,
                active_days_count: 28,
                dates: [
                    { date: "2026-02-06", cpu: 42, connections: 65, readIops: 240, writeIops: 120, cost: 0.60, isAwsConsole: true },
                    { date: "2026-02-07", cpu: 38, connections: 48, readIops: 180, writeIops: 95, cost: 0.58, isAwsConsole: false },
                    { date: "2026-03-05", cpu: 45, connections: 72, readIops: 310, writeIops: 155, cost: 0.65, isAwsConsole: true }
                ],
                status: 'available',
                is_aws: true
            },
            {
                db_identifier: "db-staging-psql-01",
                db_name: "staging-psql",
                instance_class: "db.t3.medium",
                engine: "postgres",
                avg_cpu_utilization: 12.2,
                avg_connections: 12,
                avg_read_iops: 80,
                avg_write_iops: 45,
                approx_cost: 8.20,
                active_days_count: 7,
                dates: [
                    { date: "2026-03-01", cpu: 15, connections: 18, readIops: 95, writeIops: 50, cost: 0.28, isAwsConsole: false },
                    { date: "2026-03-02", cpu: 10, connections: 10, readIops: 70, writeIops: 40, cost: 0.27, isAwsConsole: false },
                    { date: "2026-03-03", cpu: 12, connections: 12, readIops: 80, writeIops: 45, cost: 0.28, isAwsConsole: true }
                ],
                status: 'available'
            },
            {
                db_identifier: "db-dev-mariadb",
                db_name: "dev-mariadb",
                instance_class: "db.t2.micro",
                engine: "mariadb",
                avg_cpu_utilization: 65.8,
                avg_connections: 5,
                avg_read_iops: 300,
                avg_write_iops: 150,
                approx_cost: 4.50,
                active_days_count: 30,
                dates: [
                    { date: "2026-02-01", cpu: 60, connections: 4, readIops: 280, writeIops: 140, cost: 0.15, isAwsConsole: false },
                    { date: "2026-02-15", cpu: 68, connections: 6, readIops: 320, writeIops: 160, cost: 0.16, isAwsConsole: true },
                    { date: "2026-03-05", cpu: 65, connections: 5, readIops: 300, writeIops: 150, cost: 0.15, isAwsConsole: false }
                ],
                status: 'modifying'
            },
            {
                db_identifier: "db-replica-01",
                db_name: "prod-replica",
                instance_class: "db.r6g.large",
                engine: "postgres",
                avg_cpu_utilization: 22.1,
                avg_connections: 210,
                avg_read_iops: 450,
                avg_write_iops: 220,
                approx_cost: 55.00,
                active_days_count: 28,
                dates: [
                    { date: "2026-02-06", cpu: 25, connections: 230, readIops: 480, writeIops: 240, cost: 1.95, isAwsConsole: true },
                    { date: "2026-03-05", cpu: 22, connections: 210, readIops: 450, writeIops: 220, cost: 1.92, isAwsConsole: false }
                ],
                status: 'backing-up'
            },
        ],
        aurora: [
            {
                cluster_name: "aurora-prod-cluster",
                db_name: "prod-global-db",
                instances_count: 3,
                avg_cpu_utilization: 42.5,
                avg_connections: 85,
                avg_read_iops: 450,
                avg_write_iops: 220,
                approx_cost: 84.50,
                active_days_count: 28,
                dates: [
                    { date: "2026-03-01", cpu: 45, connections: 95, readIops: 480, writeIops: 240, cost: 2.95, isAwsConsole: true },
                    { date: "2026-03-05", cpu: 42, connections: 85, readIops: 450, writeIops: 220, cost: 2.90, isAwsConsole: false }
                ],
                status: 'available',
                trend: 'up',
                is_aws: true
            },
            {
                cluster_name: "aurora-staging-cluster",
                db_name: "staging-db",
                instances_count: 2,
                avg_cpu_utilization: 22.8,
                avg_connections: 15,
                avg_read_iops: 120,
                avg_write_iops: 45,
                approx_cost: 32.20,
                active_days_count: 7,
                dates: [
                    { date: "2026-03-01", cpu: 25, connections: 18, readIops: 130, writeIops: 50, cost: 1.15, isAwsConsole: true },
                    { date: "2026-03-02", cpu: 22, connections: 15, readIops: 120, writeIops: 45, cost: 1.12, isAwsConsole: false }
                ],
                status: 'available',
                trend: 'stable'
            },
            {
                cluster_name: "aurora-dev-cluster",
                db_name: "dev-sandbox",
                instances_count: 1,
                avg_cpu_utilization: 15.2,
                avg_connections: 4,
                avg_read_iops: 45,
                avg_write_iops: 12,
                approx_cost: 15.30,
                active_days_count: 15,
                dates: [
                    { date: "2026-02-15", cpu: 18, connections: 6, readIops: 55, writeIops: 15, cost: 0.55, isAwsConsole: false },
                    { date: "2026-03-01", cpu: 15, connections: 4, readIops: 45, writeIops: 12, cost: 0.52, isAwsConsole: true }
                ],
                status: 'available',
                trend: 'down'
            }
        ],
        docdb: [
            {
                cluster_name: "docdb-prod-cluster",
                db_name: "prod-mobile-api",
                instances_count: 3,
                avg_cpu_utilization: 28.5,
                avg_connections: 120,
                avg_read_iops: 650,
                avg_write_iops: 80,
                approx_cost: 92.00,
                active_days_count: 30,
                dates: [
                    { date: "2026-03-01", cpu: 32, connections: 140, readIops: 700, writeIops: 95, cost: 3.10, isAwsConsole: true },
                    { date: "2026-03-30", cpu: 28, connections: 120, readIops: 650, writeIops: 80, cost: 3.05, isAwsConsole: false }
                ],
                status: 'available',
                trend: 'stable',
                is_aws: true
            },
            {
                cluster_name: "docdb-staging-cluster",
                db_name: "staging-app",
                instances_count: 2,
                avg_cpu_utilization: 12.4,
                avg_connections: 25,
                avg_read_iops: 150,
                avg_write_iops: 20,
                approx_cost: 45.50,
                active_days_count: 15,
                dates: [
                    { date: "2026-03-15", cpu: 15, connections: 30, readIops: 180, writeIops: 25, cost: 1.55, isAwsConsole: false },
                    { date: "2026-03-30", cpu: 12, connections: 25, readIops: 150, writeIops: 20, cost: 1.52, isAwsConsole: true }
                ],
                status: 'available',
                trend: 'stable'
            }
        ]
    };
    const currentData = allDbData[viewMode];

    const formatDate = (date) => {
        return date.toISOString().split('T')[0];
    };

    const getDateRange = () => {
        const today = new Date();

        if (selectedRange === "custom" && customRange) {
            return {
                from_date: formatDate(customRange.start),
                to_date: formatDate(customRange.end)
            };
        }

        const preset = datePresets.find(p => p.id === selectedRange);

        const from = new Date();
        from.setDate(today.getDate() - (preset?.days || 7));

        return {
            from_date: formatDate(from),
            to_date: formatDate(today)
        };
    };

    useEffect(() => {
        if (selectedRange === "custom" && !customRange) return;
    }, [selectedRange, customRange]);

    const stats = useMemo(() => {
        const count = currentData.length;
        if (viewMode === 'aurora' || viewMode === 'docdb') {
            const avgCpu = (currentData.reduce((acc, item) => acc + item.avg_cpu_utilization, 0) / (count || 1)).toFixed(1);
            const avgConn = Math.round(currentData.reduce((acc, item) => acc + item.avg_connections, 0) / (count || 1));
            const avgRead = Math.round(currentData.reduce((acc, item) => acc + item.avg_read_iops, 0) / (count || 1));
            const avgWrite = Math.round(currentData.reduce((acc, item) => acc + item.avg_write_iops, 0) / (count || 1));
            const totalCost = currentData.reduce((acc, item) => acc + item.approx_cost, 0);
            return { count, avgCpu, avgConn, avgRead, avgWrite, totalCost };
        }
        const avgCpu = (currentData.reduce((acc, item) => acc + item.avg_cpu_utilization, 0) / (count || 1)).toFixed(1);
        const avgConn = Math.round(currentData.reduce((acc, item) => acc + item.avg_connections, 0) / (count || 1));
        const avgRead = Math.round(currentData.reduce((acc, item) => acc + item.avg_read_iops, 0) / (count || 1));
        const avgWrite = Math.round(currentData.reduce((acc, item) => acc + item.avg_write_iops, 0) / (count || 1));
        const totalCost = currentData.reduce((acc, item) => acc + item.approx_cost, 0);
        return { count, avgCpu, avgConn, avgRead, avgWrite, totalCost };
    }, [currentData, viewMode]);

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
        { label: (viewMode === 'aurora' || viewMode === 'docdb') ? 'Total Clusters' : 'Active Instances', value: stats.count, icon: Database, color: '#10b981', bg: 'rgba(16,185,129,0.1)', bars: [65, 45, 78, 90, 55] },
        { label: 'Avg CPU Utilization', value: `${stats.avgCpu}%`, icon: Cpu, color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', bars: [32, 28, 45, 65, 55] },
        { label: 'Avg Connections', value: stats.avgConn, icon: Network, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', bars: [120, 95, 210, 450, 380] },
        { label: 'Avg Read IOPS', value: stats.avgRead, icon: ArrowRight, color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)', bars: [450, 380, 820, 1250, 980] },
        { label: 'Avg Write IOPS', value: stats.avgWrite, icon: Zap, color: '#ec4899', bg: 'rgba(236,72,153,0.1)', bars: [120, 90, 310, 580, 420] },
        { label: 'Approx Cost', value: `$${stats.totalCost.toFixed(0)}`, icon: TrendingUp, color: '#06b6d4', bg: 'rgba(6,182,212,0.1)', progress: 72 },
    ];

    return (
        <div className="rds-analytics-page">
            <div className="rds-analytics-content">
                {/* --- Header --- */}
                <div className="rds-page-header">
                    <div className="rds-header-left">
                        <div className={`rds-header-icon ${viewMode}`}>
                            {viewMode === 'docdb' ? <HardDrive size={28} /> : <Database size={28} />}
                            <div className="rds-icon-ring" />
                        </div>
                        <div>
                            <h1 className="rds-page-title">
                                {viewMode === 'rds' ? 'RDS Analytics' : 
                                 viewMode === 'aurora' ? 'Aurora Analytics' : 
                                 'DocumentDB Analytics'}
                            </h1>
                            <p className="rds-page-sub">Database fleet performance & connection intelligence</p>
                        </div>
                    </div>

                    <div className="time-selector-wrap">
                        <div className={`rds-mode-toggle-wrap ${viewMode}`}>
                            <div className="rds-toggle-slider" />
                            <button className={`rds-mode-toggle-btn ${viewMode === 'rds' ? 'active' : ''}`} onClick={() => setViewMode('rds')}>
                                <Server size={14} /> RDS
                            </button>
                            <button className={`rds-mode-toggle-btn ${viewMode === 'aurora' ? 'active' : ''}`} onClick={() => setViewMode('aurora')}>
                                <Cloud size={14} /> Aurora
                            </button>
                            <button className={`rds-mode-toggle-btn ${viewMode === 'docdb' ? 'active' : ''}`} onClick={() => setViewMode('docdb')}>
                                <HardDrive size={14} /> DocDB
                            </button>
                        </div>

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

                {/* --- Metric Cards (6 cards) --- */}
                <div className="rds-metric-cards-grid-6">
                    {metricCards.map((card, i) => (
                        <div key={i} className="rds-metric-card-new" style={{ '--mc': card.color, '--mc-bg': card.bg, animationDelay: `${i * 0.05}s` }}>
                            <div className="rds-mc-top-accent" />
                            <div className="rds-mc-icon"><card.icon size={24} /></div>
                            <div className="rds-mc-value">{card.value}</div>
                            <div className="rds-mc-label">{card.label}</div>
                            {card.bars && (
                                <div className="rds-mc-mini-bars">
                                    {card.bars.map((h, j) => (
                                        <div key={j} className="rds-mc-bar" style={{ height: `${(h / Math.max(...card.bars)) * 100}%` }} />
                                    ))}
                                </div>
                            )}
                            {card.progress !== undefined && (
                                <div className="mc-progress-track" style={{ background: 'rgba(6,182,212,0.1)', height: '6px', borderRadius: '10px', marginTop: '1rem', overflow: 'hidden' }}>
                                    <div className="mc-progress-fill" style={{ width: `${card.progress}%`, background: 'var(--mc)', height: '100%', borderRadius: '10px' }} />
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* --- Instances Panel (Mirroring EC2) --- */}
                <div className="rds-instances-panel">
                    <div className="rds-panel-header-new">
                        <div className="rds-panel-title-group">
                            <Zap size={20} className="rds-panel-title-icon" />
                            <h2>{(viewMode === 'aurora' || viewMode === 'docdb') ? 'Active Clusters' : 'Active Instances'}</h2>
                            <span className="rds-panel-period-badge">{getActiveLabel()}</span>
                        </div>
                        <div className="rds-panel-subtitle">Click trend icon to view detailed metrics</div>
                    </div>

                    <div className={(viewMode === 'aurora' || viewMode === 'docdb') ? "aurora-clusters-grid" : "rds-instances-grid"}>
                        {(viewMode === 'aurora' || viewMode === 'docdb') ? (
                            currentData.map((cluster, idx) => (
                                <div
                                    key={cluster.cluster_name}
                                    className="aurora-cluster-card"
                                    style={{ animationDelay: `${0.2 + idx * 0.1}s` }}
                                    onClick={() => navigate(`/analytics/rds/cluster/${cluster.cluster_name}`, {
                                        state: { cluster, selectedRange, customRange, engine: viewMode === 'docdb' ? 'DocumentDB' : 'Aurora' }
                                    })}
                                >
                                    <div className="aurora-cluster-status-glow" />

                                    <div className="aurora-cluster-card-top">
                                        <div className="aurora-cluster-name-group">
                                            <div className="aurora-cluster-status-row">
                                                <div className={`aurora-cluster-status-dot ${cluster.status}`} />
                                                <span className="aurora-cluster-name-text">{cluster.cluster_name}</span>
                                            </div>
                                            <div className="aurora-cluster-subheader">
                                                <span className="aurora-engine-tag">{viewMode === 'docdb' ? 'DocumentDB' : 'Aurora'}</span>
                                                <span className="aurora-id-separator">•</span>
                                                <span className="aurora-instance-count">{cluster.instances_count} Nodes</span>
                                            </div>
                                        </div>
                                        <div className="aurora-cluster-card-actions">
                                            {selectedRange === '24h' && cluster.is_aws && (
                                                <div className="rds-aws-tag">
                                                    <Server size={10} strokeWidth={3} />
                                                    AWS
                                                </div>
                                            )}
                                            <button
                                                className="aurora-cluster-trend-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedClusterForTrend({
                                                        db_identifier: cluster.cluster_name,
                                                        avg_cpu_utilization: cluster.avg_cpu_utilization,
                                                        avg_connections: cluster.avg_connections,
                                                        avg_read_iops: cluster.avg_read_iops,
                                                        avg_write_iops: cluster.avg_write_iops,
                                                        cost: cluster.approx_cost
                                                    });
                                                }}
                                            >
                                                <BarChart3 size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="aurora-cluster-stats-row">
                                        <div className="aurora-cluster-stat-item">
                                            <div className="aurora-csi-icon"><Clock size={14} /></div>
                                            <div className="aurora-csi-value">{cluster.active_days_count}d</div>
                                            <div className="aurora-csi-label">Active</div>
                                        </div>
                                        <div className="aurora-cluster-stat-divider" />
                                        <div
                                            className="aurora-cluster-stat-item aurora-clickable-calendar"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedDaysInfo({
                                                    identifier: cluster.cluster_name,
                                                    count: cluster.active_days_count,
                                                    rawDates: cluster.dates
                                                });
                                            }}
                                        >
                                            <div className="aurora-csi-icon"><Calendar size={14} /></div>
                                            <div className="aurora-csi-value">View</div>
                                            <div className="aurora-csi-label">Days Active</div>
                                        </div>
                                        <div className="aurora-cluster-stat-divider" />
                                        <div className="aurora-cluster-stat-item">
                                            <div className="aurora-csi-icon"><DollarSign size={14} /></div>
                                            <div className="aurora-csi-value">${cluster.approx_cost.toFixed(0)}</div>
                                            <div className="aurora-csi-label">Cost</div>
                                        </div>
                                    </div>

                                    <div className="aurora-cluster-resource-bars">
                                        <div className="aurora-rb-item">
                                            <div className="aurora-rb-header">
                                                <span className="aurora-rb-label"><Cpu size={12} /> CPU</span>
                                                <span className="aurora-rb-value">{cluster.avg_cpu_utilization}%</span>
                                            </div>
                                            <div className="aurora-rb-track"><div className="aurora-rb-fill cpu" style={{ width: `${cluster.avg_cpu_utilization}%` }} /></div>
                                        </div>
                                        <div className="aurora-rb-item">
                                            <div className="aurora-rb-header">
                                                <span className="aurora-rb-label"><Network size={12} /> Connections</span>
                                                <span className="aurora-rb-value">{cluster.avg_connections}</span>
                                            </div>
                                            <div className="aurora-rb-track"><div className="aurora-rb-fill conn" style={{ width: `${Math.min(100, (cluster.avg_connections / 200) * 100)}%` }} /></div>
                                        </div>
                                        <div className="aurora-rb-item">
                                            <div className="aurora-rb-header">
                                                <span className="aurora-rb-label"><ArrowRight size={12} /> Read IOPS</span>
                                                <span className="aurora-rb-value">{cluster.avg_read_iops}</span>
                                            </div>
                                            <div className="aurora-rb-track"><div className="aurora-rb-fill read" style={{ width: `${Math.min(100, (cluster.avg_read_iops / 1000) * 100)}%` }} /></div>
                                        </div>
                                        <div className="aurora-rb-item">
                                            <div className="aurora-rb-header">
                                                <span className="aurora-rb-label"><Zap size={12} /> Write IOPS</span>
                                                <span className="aurora-rb-value">{cluster.avg_write_iops}</span>
                                            </div>
                                            <div className="aurora-rb-track"><div className="aurora-rb-fill write" style={{ width: `${Math.min(100, (cluster.avg_write_iops / 500) * 100)}%` }} /></div>
                                        </div>
                                    </div>

                                    <div className="aurora-cluster-footer">
                                        <span>View Daily Breakdown</span>
                                        <ArrowRight size={16} />
                                    </div>
                                </div>
                            ))
                        ) : (
                            currentData.map((db, idx) => (
                                <div key={db.db_identifier} className="rds-instance-card" style={{ animationDelay: `${0.2 + idx * 0.1}s` }}>
                                    <div className="rds-instance-status-glow" />

                                    <div className="rds-instance-card-top">
                                        <div className="rds-instance-name-info">
                                            <div className="rds-instance-status-row">
                                                <div className={`rds-instance-status-dot ${db.status}`} />
                                                <span className="rds-instance-name-text">{db.db_identifier}</span>
                                            </div>
                                            <div className="rds-instance-id-text">
                                                <span className="rds-engine-id-part">{db.engine}</span>
                                                <span className="rds-id-separator">•</span>
                                                <span className="rds-class-id-part">{db.instance_class}</span>
                                            </div>
                                        </div>
                                        <div className="rds-instance-card-actions-row">
                                            {selectedRange === '24h' && db.is_aws && (
                                                <div className="rds-aws-tag">
                                                    <Server size={10} strokeWidth={3} />
                                                    AWS
                                                </div>
                                            )}
                                            <button
                                                className="rds-instance-graph-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedInstanceForTrend(db);
                                                }}
                                                title="View 30-Day Trend"
                                            >
                                                <BarChart3 size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="rds-instance-stats-row">
                                        <div className="rds-instance-stat-item">
                                            <div className="rds-isi-icon"><Clock size={14} /></div>
                                            <div className="rds-isi-value">{db.active_days_count}d</div>
                                            <div className="rds-isi-label">Active</div>
                                        </div>
                                        <div className="rds-instance-stat-divider" />
                                        <div
                                            className="rds-instance-stat-item rds-clickable-calendar"
                                            onClick={() => {
                                                setSelectedDaysInfo({
                                                    identifier: db.db_identifier,
                                                    count: db.active_days_count,
                                                    rawDates: db.dates
                                                });
                                            }}
                                        >
                                            <div className="rds-isi-icon"><Calendar size={14} /></div>
                                            <div className="rds-isi-value">View</div>
                                            <div className="rds-isi-label">Days Active</div>
                                        </div>
                                        <div className="rds-instance-stat-divider" />
                                        <div className="rds-instance-stat-item">
                                            <div className="rds-isi-icon"><DollarSign size={14} /></div>
                                            <div className="rds-isi-value">${db.approx_cost.toFixed(0)}</div>
                                            <div className="rds-isi-label">Instance Cost</div>
                                        </div>
                                    </div>

                                    <div className="rds-instance-resource-bars">
                                        <div className="rds-resource-bar-item">
                                            <div className="rds-rb-header">
                                                <span className="rds-rb-label"><Cpu size={12} /> CPU</span>
                                                <span className="rds-rb-value">{db.avg_cpu_utilization}%</span>
                                            </div>
                                            <div className="rds-rb-track"><div className="rds-rb-fill cpu" style={{ width: `${db.avg_cpu_utilization}%` }} /></div>
                                        </div>
                                        <div className="rds-resource-bar-item">
                                            <div className="rds-rb-header">
                                                <span className="rds-rb-label"><Network size={12} /> DB Conn.</span>
                                                <span className="rds-rb-value">{db.avg_connections}</span>
                                            </div>
                                            <div className="rds-rb-track"><div className="rds-rb-fill conn" style={{ width: `${Math.min(100, (db.avg_connections / 200) * 100)}%` }} /></div>
                                        </div>
                                        <div className="rds-resource-bar-item">
                                            <div className="rds-rb-header">
                                                <span className="rds-rb-label"><ArrowRight size={12} /> Read IOPS</span>
                                                <span className="rds-rb-value">{db.avg_read_iops}</span>
                                            </div>
                                            <div className="rds-rb-track"><div className="rds-rb-fill read" style={{ width: `${Math.min(100, (db.avg_read_iops / 1000) * 100)}%` }} /></div>
                                        </div>
                                        <div className="rds-resource-bar-item">
                                            <div className="rds-rb-header">
                                                <span className="rds-rb-label"><Zap size={12} /> Write IOPS</span>
                                                <span className="rds-rb-value">{db.avg_write_iops}</span>
                                            </div>
                                            <div className="rds-rb-track"><div className="rds-rb-fill write" style={{ width: `${Math.min(100, (db.avg_write_iops / 500) * 100)}%` }} /></div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* --- Comparison Table --- */}
                <ComparisonTable
                    title={viewMode === 'rds' ? "RDS Instance Comparison" : 
                           viewMode === 'aurora' ? "Aurora Cluster Comparison" : 
                           "DocumentDB Cluster Comparison"}
                    subtitle="Detailed technical breakdown with multi-sort capability"
                    data={currentData.map(db => ({
                        ...db,
                        id: db.cluster_name || db.db_identifier,
                        db_identifier: db.cluster_name || db.db_identifier
                    }))}
                    exportFilename={`${viewMode}-analytics.csv`}
                    gridTemplateColumns="52px 2.5fr 0.5fr 1.2fr 0.8fr 0.8fr 0.8fr 0.8fr 0.8fr"
                    columns={[
                        {
                            key: 'db_identifier',
                            label: 'IDENTIFIER',
                            type: 'status-name',
                            sortable: true
                        },
                        {
                            key: viewMode === 'rds' ? 'instance_class' : 'instances_count',
                            label: viewMode === 'rds' ? 'INSTANCE CLASS' : 'INSTANCES',
                            icon: Server,
                            sortable: true,
                            align: 'center',
                            render: (val) => <span className="cmp-instance-type">{val}</span>
                        },
                        {
                            key: 'engine',
                            label: 'ENGINE',
                            icon: Database,
                            sortable: true,
                            align: 'center',
                            render: (val) => <span className="cmp-instance-type">{val || 'Aurora'}</span>
                        },
                        {
                            key: 'avg_cpu_utilization',
                            label: 'CPU',
                            icon: Cpu,
                            type: 'cpu',
                            sortable: true,
                            align: 'center',
                            render: (val) => `${val}%`
                        },
                        {
                            key: 'avg_connections',
                            label: 'DB CONN',
                            icon: Network,
                            sortable: true,
                            align: 'center'
                        },
                        {
                            key: 'avg_read_iops',
                            label: 'READ',
                            icon: ArrowRight,
                            sortable: true,
                            align: 'center'
                        },
                        {
                            key: 'avg_write_iops',
                            label: 'WRITE',
                            icon: Zap,
                            sortable: true,
                            align: 'center'
                        },
                        {
                            key: 'approx_cost',
                            label: 'COST',
                            icon: DollarSign,
                            type: 'cost',
                            sortable: true,
                            align: 'center'
                        }
                    ]}
                />
            </div>

            {/* --- Modals --- */}
            <RDSGraphModal
                isOpen={!!selectedInstanceForTrend}
                onClose={() => setSelectedInstanceForTrend(null)}
                instance={selectedInstanceForTrend}
            />

            <RDSGraphModal
                isOpen={!!selectedClusterForTrend}
                onClose={() => setSelectedClusterForTrend(null)}
                instance={selectedClusterForTrend}
                excludeMetrics={['cpu', 'connections', 'read', 'write']}
            />

            {showCalendar && (
                <CalendarPicker onRangeSelect={handleCustomRange} onClose={() => setShowCalendar(false)} />
            )}

            {/* --- Timeline Flip-Modal --- */}
            {selectedDaysInfo && (
                <div className="rds-graph-modal-overlay days-info-overlay" onClick={() => {
                    setSelectedDaysInfo(null);
                    setIsFlipped(false);
                }}>
                    <div
                        className={`rds-days-info-modal-inner ${isFlipped ? 'is-flipped' : ''}`}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Front Side: General Timeline */}
                        <div className="rds-days-info-modal-front">
                            <div className="rds-dim-header">
                                <div className="rds-dim-icon"><Calendar size={24} /></div>
                                <div>
                                    <div className="rds-dim-header-title">Active Timeline</div>
                                    <div className="rds-dim-header-subtitle">{selectedDaysInfo.identifier}</div>
                                </div>
                                <button className="rds-dim-modal-close" onClick={() => setSelectedDaysInfo(null)}><X size={20} /></button>
                            </div>

                            <div className="rds-dim-hero">
                                <div className="rds-dim-count-badge">{selectedDaysInfo.count}</div>
                                <div className="rds-dim-count-label">Days Active</div>
                            </div>

                            <div className="rds-dim-dates-grid-container">
                                <div className="rds-dim-dates-grid">
                                    {selectedDaysInfo.rawDates?.map((dateObj, i) => {
                                        const date = new Date(dateObj.date);
                                        const formatted = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                                        return (
                                            <div
                                                key={i}
                                                className="rds-dim-date-chip"
                                                onClick={() => {
                                                    setSelectedDateDetail({
                                                        ...dateObj,
                                                        formattedDate: formatted
                                                    });
                                                    setIsFlipped(true);
                                                }}
                                            >
                                                {formatted}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            <button className="rds-dim-close-btn" onClick={() => setSelectedDaysInfo(null)}>Got it</button>
                        </div>

                        {/* Back Side: Date Details */}
                        <div className="rds-days-info-modal-back">
                            {selectedDateDetail && (
                                <>
                                    <div className="rds-dim-header details-header">
                                        <button className="rds-dim-back-arrow" onClick={() => setIsFlipped(false)}>
                                            <ChevronLeft size={20} />
                                        </button>
                                        <div className="rds-dim-header-identity">
                                            <div className="rds-dim-header-title">{selectedDaysInfo.identifier}</div>
                                            <div className="rds-dim-date-context">{selectedDateDetail.formattedDate}</div>
                                        </div>
                                        {selectedDateDetail.isAwsConsole && (
                                            <div className="rds-aws-tag modal-tag">
                                                <Server size={10} strokeWidth={3} />
                                                AWS
                                            </div>
                                        )}
                                    </div>

                                    <div className="rds-dim-detail-content">
                                        <div className="rds-dim-detail-grid">
                                            <div className="rds-dim-detail-card rds-cpu">
                                                <div className="rds-ddc-glass" />
                                                <div className="rds-ddc-icon"><Cpu size={20} /></div>
                                                <div className="rds-ddc-val">{selectedDateDetail.cpu}%</div>
                                                <div className="rds-ddc-lbl">Resource CPU</div>
                                            </div>
                                            <div className="rds-dim-detail-card rds-conn">
                                                <div className="rds-ddc-glass" />
                                                <div className="rds-ddc-icon"><Network size={20} /></div>
                                                <div className="rds-ddc-val">{selectedDateDetail.connections}</div>
                                                <div className="rds-ddc-lbl">DB Connections</div>
                                            </div>
                                            <div className="rds-dim-detail-card rds-read">
                                                <div className="rds-ddc-glass" />
                                                <div className="rds-ddc-icon"><ArrowRight size={20} /></div>
                                                <div className="rds-ddc-val">{selectedDateDetail.readIops}</div>
                                                <div className="rds-ddc-lbl">Read throughput</div>
                                            </div>
                                            <div className="rds-dim-detail-card rds-write">
                                                <div className="rds-ddc-glass" />
                                                <div className="rds-ddc-icon"><Zap size={20} /></div>
                                                <div className="rds-ddc-val">{selectedDateDetail.writeIops}</div>
                                                <div className="rds-ddc-lbl">Write throughput</div>
                                            </div>
                                        </div>
                                        
                                        <div className="rds-dim-cost-banner-premium">
                                            <div className="rds-dcb-inner">
                                                <div className="rds-dcb-info">
                                                    <div className="rds-dcb-lbl">ESTIMATED DAILY COST</div>
                                                    <div className="rds-dcb-val">${selectedDateDetail.cost.toFixed(2)}</div>
                                                </div>
                                                <div className="rds-dcb-visual">
                                                    <DollarSign size={28} className="rds-dcb-icon" />
                                                    <div className="rds-dcb-glow" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <button className="rds-dim-close-btn premium" onClick={() => {
                                        setSelectedDaysInfo(null);
                                        setIsFlipped(false);
                                    }}>
                                        <span>Close Details</span>
                                        <X size={16} />
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default RDSAnalytics;