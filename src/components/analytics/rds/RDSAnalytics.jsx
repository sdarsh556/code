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
import axiosClient from '../../api/axiosClient';

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
    const [selectedInstanceForTrend, setSelectedInstanceForTrend] = useState(null);
    const [selectedClusterForTrend, setSelectedClusterForTrend] = useState(null);
    const [loadingSummary, setLoadingSummary] = useState(true);
    const [summaryData, setSummaryData] = useState({
        rds: null,
        aurora: null,
        docdb: null
    });
    const [rdsInstances, setRdsInstances] = useState([]);
    const [auroraClusters, setAuroraClusters] = useState([]);
    const [docdbClusters, setDocdbClusters] = useState([])
    const [loadingTrend, setLoadingTrend] = useState(false);
    const [isFlipped, setIsFlipped] = useState(false);
    const [selectedDateDetail, setSelectedDateDetail] = useState(null);

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

    const currentData = useMemo(() => {
        if (viewMode === "rds") return rdsInstances;
        if (viewMode === "aurora") return auroraClusters;
        if (viewMode === "docdb") return docdbClusters;
        return [];
    }, [viewMode, rdsInstances, auroraClusters, docdbClusters]);

    const formatDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        return `${year}-${month}-${day}`;
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

    const fetchSummary = async () => {
        try {
            setLoadingSummary(true);

            // Dummy data instead of API call
            setSummaryData({
                rds: {
                    total_instances: 5,
                    avg_cpu: 45.2,
                    avg_connections: 120,
                    avg_read_iops: 500,
                    avg_write_iops: 300,
                    total_approx_cost: 1540.50
                },
                aurora: {
                    total_clusters: 2,
                    total_instances: 6,
                    avg_cpu: 35.5,
                    avg_connections: 400,
                    avg_read_iops: 1200,
                    avg_write_iops: 800,
                    total_approx_cost: 3200.75
                },
                docdb: {
                    total_clusters: 1,
                    total_instances: 2,
                    avg_cpu: 25.0,
                    avg_connections: 50,
                    avg_read_iops: 100,
                    avg_write_iops: 50,
                    total_approx_cost: 450.00
                }
            });
            setLoadingSummary(false);
            return;
        } catch (error) {
            console.error("Failed to fetch RDS summary:", error);
            setLoadingSummary(false);
        }
    };

    const fetchInstances = async () => {
        try {
            // Dummy data instead of API call
            setRdsInstances([
                {
                    db_identifier: "prod-db-1",
                    instance_class: "db.t3.large",
                    engine: "mysql",
                    status: "available",
                    is_aws: true,
                    dates: ["2026-03-17", "2026-03-16"],
                    avg_cpu_utilization: 65,
                    avg_memory_usage: 42.5,
                    avg_read_iops: 600,
                    avg_write_iops: 400,
                    total_cpu: 8,
                    total_memory: 32,
                    total_read_iops: 2000,
                    total_write_iops: 1000,
                    total_connections: 5000,
                    avg_connections: 320,
                    active_days_count: 30,
                    approx_cost: 150.75
                },
                {
                    db_identifier: "staging-db-1",
                    instance_class: "db.t3.medium",
                    engine: "postgres",
                    status: "available",
                    is_aws: false,
                    dates: ["2026-03-17"],
                    avg_cpu_utilization: 25,
                    avg_memory_usage: 18.2,
                    avg_read_iops: 100,
                    avg_write_iops: 80,
                    total_cpu: 2,
                    total_memory: 4,
                    total_read_iops: 1000,
                    total_write_iops: 500,
                    total_connections: 1000,
                    avg_connections: 85,
                    active_days_count: 15,
                    approx_cost: 45.20
                }
            ]);
            return;
        } catch (error) {
            console.error("Failed to fetch RDS instances:", error);
        }
    };

    const fetchAuroraClusters = async () => {
        try {
            // Dummy data instead of API call
            setAuroraClusters([
                {
                    cluster_name: "prod-aurora-cluster",
                    instances_count: 3,
                    approx_cost: 1200.5,
                    active_days_count: 30,
                    avg_cpu_utilization: 45,
                    avg_memory_usage: 55.5,
                    avg_read_iops: 800,
                    avg_write_iops: 500,
                    avg_connections: 450,
                    total_cpu: 16,
                    total_memory: 64,
                    total_read_iops: 4000,
                    total_write_iops: 2000,
                    total_connections: 10000,
                    status: "available",
                    trend: "stable",
                    engine: "Aurora",
                    is_aws: true,
                    dates: ["2026-03-17", "2026-03-16", "2026-03-15"]
                }
            ]);
            return;
        } catch (error) {
            console.error("Failed to fetch Aurora clusters:", error);
        }
    };

    const fetchDocdbClusters = async () => {
        try {
            // Dummy data instead of API call
            setDocdbClusters([
                {
                    cluster_name: "prod-docdb-cluster",
                    instances_count: 2,
                    approx_cost: 450.0,
                    active_days_count: 30,
                    avg_cpu_utilization: 25,
                    avg_memory_usage: 32.8,
                    avg_read_iops: 100,
                    avg_write_iops: 50,
                    avg_connections: 80,
                    total_cpu: 4,
                    total_memory: 8,
                    total_read_iops: 1000,
                    total_write_iops: 500,
                    total_connections: 2000,
                    status: "available",
                    trend: "stable",
                    engine: "DocumentDB",
                    is_aws: true,
                    dates: ["2026-03-17", "2026-03-16", "2026-03-15"]
                }
            ]);
            return;
        } catch (error) {
            console.error("Failed to fetch DocDB clusters:", error);
        }
    };

    const fetchClusterActiveDates = async (clusterName, activeDays, capacity = {}) => {
        try {
            // Dummy data instead of API call
            setSelectedDaysInfo({
                identifier: clusterName,
                count: activeDays,
                capacity,
                rawDates: ["2026-03-17", "2026-03-16", "2026-03-15"],
                metricsByDate: {
                    "2026-03-17": { cpu: 45, memory: 58, connections: 120, readIops: 500, writeIops: 300, cost: 15.5, isAwsConsole: true },
                    "2026-03-16": { cpu: 40, memory: 55, connections: 110, readIops: 450, writeIops: 280, cost: 15.0, isAwsConsole: true },
                    "2026-03-15": { cpu: 42, memory: 56, connections: 115, readIops: 480, writeIops: 290, cost: 15.2, isAwsConsole: true }
                }
            });
            return;
        } catch (err) {
            console.error("Failed to fetch cluster active dates", err);
        }
    };



    const fetchInstanceMetrics = async (dbIdentifier, baseInstance) => {
        try {
            setLoadingTrend(true);
            
            // Dummy data instead of API call
            setSelectedInstanceForTrend({
                ...baseInstance,
                metrics: [
                    { date: "2026-03-15", cpu: 42, memory: 56, connections: 115, readIops: 480, writeIops: 290, cost: 15.2 },
                    { date: "2026-03-16", cpu: 40, memory: 55, connections: 110, readIops: 450, writeIops: 280, cost: 15.0 },
                    { date: "2026-03-17", cpu: 45, memory: 58, connections: 120, readIops: 500, writeIops: 300, cost: 15.5 }
                ]
            });
            setLoadingTrend(false);
            return;
        } catch (err) {
            console.error("Failed to fetch instance metrics", err);
            setLoadingTrend(false);
        }
    };

    const fetchDocdbClusterActiveDates = async (clusterName, activeDays, capacity = {}) => {
        try {
            // Dummy data instead of API call
            setSelectedDaysInfo({
                identifier: clusterName,
                count: activeDays,
                capacity,
                rawDates: ["2026-03-17", "2026-03-16", "2026-03-15"],
                metricsByDate: {
                    "2026-03-17": { cpu: 45, memory: 35, connections: 120, readIops: 500, writeIops: 300, cost: 15.5, isAwsConsole: true },
                    "2026-03-16": { cpu: 40, memory: 32, connections: 110, readIops: 450, writeIops: 280, cost: 15.0, isAwsConsole: true },
                    "2026-03-15": { cpu: 42, memory: 34, connections: 115, readIops: 480, writeIops: 290, cost: 15.2, isAwsConsole: true }
                }
            });
            return;
        } catch (err) {
            console.error("Failed to fetch DocumentDB cluster active dates", err);
        }
    };

    const fetchRdsInstanceActiveDates = async (dbIdentifier, activeDays, capacity = {}) => {
        try {
            // Dummy data instead of API call
            setSelectedDaysInfo({
                identifier: dbIdentifier,
                count: activeDays,
                capacity,
                rawDates: ["2026-03-17", "2026-03-16", "2026-03-15"],
                metricsByDate: {
                    "2026-03-17": { cpu: 45, memory: 42, connections: 120, readIops: 500, writeIops: 300, cost: 15.5, isAwsConsole: true },
                    "2026-03-16": { cpu: 40, memory: 40, connections: 110, readIops: 450, writeIops: 280, cost: 15.0, isAwsConsole: true },
                    "2026-03-15": { cpu: 42, memory: 41, connections: 115, readIops: 480, writeIops: 290, cost: 15.2, isAwsConsole: true }
                }
            });
            return;
        } catch (err) {
            console.error("Failed to fetch RDS instance active dates", err);
        }
    };



    useEffect(() => {
        if (selectedRange === "custom" && !customRange) return;

        fetchSummary();

        if (viewMode === "rds") {
            setAuroraClusters([]);
            setDocdbClusters([]);
            fetchInstances();
        }

        if (viewMode === "aurora") {
            setRdsInstances([]);
            setDocdbClusters([]);
            fetchAuroraClusters();
        }

        if (viewMode === "docdb") {
            setRdsInstances([]);
            setAuroraClusters([]);
            fetchDocdbClusters();
        }

    }, [selectedRange, customRange, viewMode]);

    const stats = useMemo(() => {
        if (!summaryData) {
            return {
                count: 0,
                avgCpu: 0,
                avgConn: 0,
                avgRead: 0,
                avgWrite: 0,
                totalCost: 0
            };
        }

        const data =
            viewMode === "rds"
                ? summaryData.rds
                : viewMode === "aurora"
                    ? summaryData.aurora
                    : summaryData.docdb;

        if (!data) {
            return {
                count: 0,
                avgCpu: 0,
                avgConn: 0,
                avgRead: 0,
                avgWrite: 0,
                totalCost: 0
            };
        }

        return {
            count:
                viewMode === "rds"
                    ? data.total_instances
                    : data.total_clusters,
            avgCpu: data.avg_cpu || 0,
            avgConn: data.avg_connections || 0,
            avgRead: data.avg_read_iops || 0,
            avgWrite: data.avg_write_iops || 0,
            totalCost: data.total_approx_cost || 0
        };

    }, [summaryData, viewMode]);


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
        { label: 'Approx Cost', value: `$${(stats.totalCost || 0).toFixed(2)}`, icon: TrendingUp, color: '#06b6d4', bg: 'rgba(6,182,212,0.1)', progress: 72 },
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
                                        </div>
                                        <div className="aurora-cluster-card-actions">
                                            {selectedRange === '24h' && cluster.is_aws && (
                                                <div className="rds-aws-tag">
                                                    <Server size={10} strokeWidth={3} />
                                                    AWS
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="aurora-cluster-subheader">
                                        <span className="aurora-engine-tag">{viewMode === 'docdb' ? 'DocumentDB' : 'Aurora'}</span>
                                        <span className="aurora-id-separator">•</span>
                                        <span className="aurora-instance-count">{cluster.instances_count} Nodes</span>
                                    </div>
                                            <div className="rds-summary-specs">
                                                <div className="rds-summary-tag">
                                                    <Cpu size={12} />
                                                    <span className="rds-spec-value">{cluster.total_cpu || 0}</span>
                                                    <span className="rds-spec-unit">vCPU</span>
                                                </div>
                                                <div className="rds-summary-tag">
                                                    <Zap size={12} />
                                                    <span className="rds-spec-value">{cluster.total_memory || 0}</span>
                                                    <span className="rds-spec-unit">GB RAM</span>
                                                </div>
                                                <div className="rds-summary-tag">
                                                    <Network size={12} />
                                                    <span className="rds-spec-value">{(cluster.total_connections || 0).toLocaleString()}</span>
                                                    <span className="rds-spec-unit">Max Conn</span>
                                                </div>
                                                <div className="rds-summary-tag">
                                                    <Activity size={12} />
                                                    <span className="rds-spec-value">{((cluster?.total_read_iops || 0) + (cluster?.total_write_iops || 0)).toLocaleString()}</span>
                                                    <span className="rds-spec-unit">Prov. IOPS</span>
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
                                                if (viewMode === "docdb") {
                                                    fetchDocdbClusterActiveDates(
                                                        cluster.cluster_name,
                                                        cluster.active_days_count,
                                                        { cpu: cluster.total_cpu, memory: cluster.total_memory, readIops: cluster.total_read_iops, writeIops: cluster.total_write_iops }
                                                    );
                                                } else {
                                                    fetchClusterActiveDates(
                                                        cluster.cluster_name,
                                                        cluster.active_days_count,
                                                        { cpu: cluster.total_cpu, memory: cluster.total_memory, readIops: cluster.total_read_iops, writeIops: cluster.total_write_iops }
                                                    );
                                                }

                                            }}

                                        >
                                            <div className="aurora-csi-icon"><Calendar size={14} /></div>
                                            <div className="aurora-csi-value">View</div>
                                            <div className="aurora-csi-label">Days Active</div>
                                        </div>
                                        <div className="aurora-cluster-stat-divider" />
                                        <div className="aurora-cluster-stat-item">
                                            <div className="aurora-csi-icon"><DollarSign size={14} /></div>
                                            <div className="aurora-csi-value">${(cluster.approx_cost || 0).toFixed(2)}</div>
                                            <div className="aurora-csi-label">Cost</div>
                                        </div>
                                    </div>

                                    <div className="aurora-cluster-resource-bars">
                                        <div className="aurora-rb-item">
                                            <div className="aurora-rb-header">
                                                <span className="aurora-rb-label"><Cpu size={12} /> CPU</span>
                                                <span className="aurora-rb-value">{cluster.avg_cpu_utilization}%</span>
                                            </div>
                                            <div className="aurora-rb-track"><div className="aurora-rb-fill cpu" style={{ width: `${Math.min(100, cluster.avg_cpu_utilization)}%` }} /></div>
                                        </div>
                                        <div className="aurora-rb-item">
                                            <div className="aurora-rb-header">
                                                <span className="aurora-rb-label"><Zap size={12} /> Memory</span>
                                                <span className="aurora-rb-value">{cluster.avg_memory_usage || 0}%</span>
                                            </div>
                                            <div className="aurora-rb-track"><div className="aurora-rb-fill mem" style={{ width: `${Math.min(100, cluster.avg_memory_usage || 0)}%` }} /></div>
                                        </div>
                                        <div className="aurora-rb-item">
                                            <div className="aurora-rb-header">
                                                <span className="aurora-rb-label"><ArrowRight size={12} /> Read IOPS</span>
                                                <span className="aurora-rb-value">{cluster.avg_read_iops}</span>
                                            </div>
                                            <div className="aurora-rb-track"><div className="aurora-rb-fill read" style={{ width: `${Math.min(100, (cluster.avg_read_iops / (cluster.total_read_iops || 1000)) * 100)}%` }} /></div>
                                        </div>
                                        <div className="aurora-rb-item">
                                            <div className="aurora-rb-header">
                                                <span className="aurora-rb-label"><Zap size={12} /> Write IOPS</span>
                                                <span className="aurora-rb-value">{cluster.avg_write_iops}</span>
                                            </div>
                                            <div className="aurora-rb-track"><div className="aurora-rb-fill write" style={{ width: `${Math.min(100, (cluster.avg_write_iops / (cluster.total_write_iops || 500)) * 100)}%` }} /></div>
                                        </div>
                                    </div>

                                    <div
                                        className="aurora-cluster-footer"
                                        onClick={() => navigate(`/analytics/rds/cluster/${cluster.cluster_name}`, {
                                            state: {
                                                cluster,
                                                selectedRange,
                                                customRange,
                                                engine: viewMode === 'aurora' ? 'Aurora' : 'DocumentDB'
                                            }
                                        })}
                                    >
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
                                                    fetchInstanceMetrics(db.db_identifier, db);
                                                }}
                                                title="View 30-Day Trend"
                                            >
                                                <BarChart3 size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="rds-instance-id-text">
                                        <span className="rds-engine-id-part">{db.engine}</span>
                                        <span className="rds-id-separator">•</span>
                                        <span className="rds-class-id-part">{db.instance_class}</span>
                                    </div>

                                        <div className="rds-summary-specs">
                                            <div className="rds-summary-tag">
                                                <Cpu size={12} />
                                                <span className="rds-spec-value">{db.total_cpu || 0}</span>
                                                <span className="rds-spec-unit">vCPU</span>
                                            </div>
                                            <div className="rds-summary-tag">
                                                <Zap size={12} />
                                                <span className="rds-spec-value">{db.total_memory || 0}</span>
                                                <span className="rds-spec-unit">GB RAM</span>
                                            </div>
                                            <div className="rds-summary-tag">
                                                <Network size={12} />
                                                <span className="rds-spec-value">{(db.total_connections || 0).toLocaleString()}</span>
                                                <span className="rds-spec-unit">Max Conn</span>
                                            </div>
                                            <div className="rds-summary-tag">
                                                <Activity size={12} />
                                                <span className="rds-spec-value">{((db.total_read_iops || 0) + (db.total_write_iops || 0)).toLocaleString()}</span>
                                                <span className="rds-spec-unit">Prov. IOPS</span>
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
                                            onClick={(e) => {
                                                e.stopPropagation();

                                                fetchRdsInstanceActiveDates(
                                                    db.db_identifier,
                                                    db.active_days_count,
                                                    { cpu: db.total_cpu, memory: db.total_memory, readIops: db.total_read_iops, writeIops: db.total_write_iops }
                                                );
                                            }}

                                        >
                                            <div className="rds-isi-icon"><Calendar size={14} /></div>
                                            <div className="rds-isi-value">View</div>
                                            <div className="rds-isi-label">Days Active</div>
                                        </div>
                                        <div className="rds-instance-stat-divider" />
                                        <div className="rds-instance-stat-item">
                                            <div className="rds-isi-icon"><DollarSign size={14} /></div>
                                            <div className="rds-isi-value">${(db.approx_cost || 0).toFixed(2)}</div>
                                            <div className="rds-isi-label">Instance Cost</div>
                                        </div>
                                    </div>
                                    <div className="rds-instance-resource-bars">
                                        <div className="rds-resource-bar-item">
                                            <div className="rds-rb-header">
                                                <span className="rds-rb-label"><Cpu size={12} /> CPU</span>
                                                <span className="rds-rb-value">{db.avg_cpu_utilization}%</span>
                                            </div>
                                            <div className="rds-rb-track"><div className="rds-rb-fill cpu" style={{ width: `${Math.min(100, db.avg_cpu_utilization)}%` }} /></div>
                                        </div>
                                        <div className="rds-resource-bar-item">
                                            <div className="rds-rb-header">
                                                <span className="rds-rb-label"><Zap size={12} /> Memory</span>
                                                <span className="rds-rb-value">{db.avg_memory_usage || 0}%</span>
                                            </div>
                                            <div className="rds-rb-track"><div className="rds-rb-fill mem" style={{ width: `${Math.min(100, db.avg_memory_usage || 0)}%` }} /></div>
                                        </div>
                                        <div className="rds-resource-bar-item">
                                            <div className="rds-rb-header">
                                                <span className="rds-rb-label"><ArrowRight size={12} /> Read IOPS</span>
                                                <span className="rds-rb-value">{db.avg_read_iops}</span>
                                            </div>
                                            <div className="rds-rb-track"><div className="rds-rb-fill read" style={{ width: `${Math.min(100, (db.avg_read_iops / (db.total_read_iops || 1000)) * 100)}%` }} /></div>
                                        </div>
                                        <div className="rds-resource-bar-item">
                                            <div className="rds-rb-header">
                                                <span className="rds-rb-label"><Zap size={12} /> Write IOPS</span>
                                                <span className="rds-rb-value">{db.avg_write_iops}</span>
                                            </div>
                                            <div className="rds-rb-track"><div className="rds-rb-fill write" style={{ width: `${Math.min(100, (db.avg_write_iops / (db.total_write_iops || 500)) * 100)}%` }} /></div>
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
                    gridTemplateColumns="52px 1.8fr 1.2fr 1fr 0.8fr 0.8fr 0.8fr 0.8fr 0.8fr 100px"
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
                            noThreshold: true,
                            sortable: true,
                            align: 'center'
                        },
                        {
                            key: 'avg_memory_usage',
                            label: 'MEMORY',
                            icon: Zap,
                            type: 'memory',
                            noThreshold: true,
                            sortable: true,
                            align: 'center'
                        },
                        {
                            key: 'avg_connections',
                            label: 'DB CONN',
                            icon: Network,
                            sortable: true,
                            align: 'center',
                            render: (val) => <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{val}</span>
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
                                    {selectedDaysInfo.rawDates?.map((dateStr, i) => {
                                        const date = new Date(dateStr);
                                        const formatted = date.toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric',
                                            year: 'numeric'
                                        });

                                        return (
                                            <div
                                                key={i}
                                                className="rds-dim-date-chip"
                                                onClick={() => {
                                                    const metrics = selectedDaysInfo.metricsByDate?.[dateStr] || {};

                                                    setSelectedDateDetail({
                                                        date: dateStr,
                                                        formattedDate: formatted,
                                                        cpu: metrics.cpu || 0,
                                                        memory: metrics.memory || 0,
                                                        connections: metrics.connections || 0,
                                                        readIops: metrics.readIops || 0,
                                                        writeIops: metrics.writeIops || 0,
                                                        cost: metrics.cost || 0,
                                                        isAwsConsole: metrics.isAwsConsole || false
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
                                                {selectedDaysInfo?.capacity?.cpu && (
                                                    <div className="rds-ddc-capacity">{selectedDaysInfo.capacity.cpu} vCPU Total</div>
                                                )}
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
                                                {selectedDaysInfo?.capacity?.readIops && (
                                                    <div className="rds-ddc-capacity">{selectedDaysInfo.capacity.readIops.toLocaleString()} Prov.</div>
                                                )}
                                                <div className="rds-ddc-val">{selectedDateDetail.readIops}</div>
                                                <div className="rds-ddc-lbl">Read throughput</div>
                                            </div>
                                            <div className="rds-dim-detail-card rds-write">
                                                <div className="rds-ddc-glass" />
                                                <div className="rds-ddc-icon"><Zap size={20} /></div>
                                                {selectedDaysInfo?.capacity?.writeIops && (
                                                    <div className="rds-ddc-capacity">{selectedDaysInfo.capacity.writeIops.toLocaleString()} Prov.</div>
                                                )}
                                                <div className="rds-ddc-val">{selectedDateDetail.writeIops}</div>
                                                <div className="rds-ddc-lbl">Write throughput</div>
                                            </div>
                                        </div>

                                        <div className="rds-dim-bottom-row">
                                            <div className="rds-dim-detail-card rds-memory">
                                                <div className="rds-ddc-glass" />
                                                <div className="rds-ddc-icon"><Zap size={20} /></div>
                                                {selectedDaysInfo?.capacity?.memory && (
                                                    <div className="rds-ddc-capacity">{selectedDaysInfo.capacity.memory} GB Total</div>
                                                )}
                                                <div className="rds-ddc-val">{selectedDateDetail.memory}%</div>
                                                <div className="rds-ddc-lbl">Resource Memory</div>
                                            </div>

                                            <div className="rds-dim-cost-banner-premium half-width">
                                                <div className="rds-dcb-inner">
                                                    <div className="rds-dcb-info">
                                                        <div className="rds-dcb-lbl">ESTIMATED COST</div>
                                                        <div className="rds-dcb-val">${selectedDateDetail.cost.toFixed(2)}</div>
                                                    </div>
                                                    <div className="rds-dcb-visual">
                                                        <DollarSign size={24} className="rds-dcb-icon" />
                                                        <div className="rds-dcb-glow" />
                                                    </div>
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
            )
            }
        </div >
    );
}

export default RDSAnalytics;