import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useOutletContext, useSearchParams } from 'react-router-dom';
import {
    Database, Activity, Cpu, Zap, Cloud, Server, ChevronLeft, ChevronRight,
    Calendar, Download, TrendingUp, SearchX, RefreshCw, BarChart3,
    ArrowRight, HardDrive, Network, ShieldCheck, Gauge, Clock, DollarSign, X, Search
} from 'lucide-react';
import '../../../css/analytics/rds/RDSAnalytics.css';
import '../../../css/analytics/shared/GraphModal.css';
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
    const [searchQuery, setSearchQuery] = useState('');

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

    const filteredData = useMemo(() => {
        if (!searchQuery.trim()) return currentData;
        const query = searchQuery.toLowerCase();
        return currentData.filter(item => {
            const identifier = viewMode === "rds" ? item.db_identifier : item.cluster_name;
            return identifier.toLowerCase().includes(query);
        });
    }, [currentData, searchQuery, viewMode]);

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

            const { from_date, to_date } = getDateRange();

            const res = await axiosClient.get(
                `/analytics/rds/summary/${from_date}/${to_date}`
            );

            if (res.data.success) {
                setSummaryData(res.data.data);
            }
        } catch (error) {
            console.error("Failed to fetch RDS summary:", error);
        } finally {
            setLoadingSummary(false);
        }
    };

    const fetchInstances = async () => {
        try {
            const { from_date, to_date } = getDateRange();

            const res = await axiosClient.get(
                `/analytics/rds/instances/${from_date}/${to_date}`
            );

            if (res.data.success) {
                const instances = res.data.data.instances || [];

                const formatted = instances.map(inst => ({
                    ...inst,
                    status: inst.actual_status || "available",
                    is_aws: inst.turned_on_by_aws_console === true,
                    dates: inst.active_dates || [],

                    avg_memory_usage: inst.avg_memory_utilization || 0,
                    avg_cpu_utilization: inst.avg_cpu_utilization || 0,
                    avg_connections: inst.avg_connections || 0,
                    avg_read_iops: inst.avg_read_iops || 0,
                    avg_write_iops: inst.avg_write_iops || 0,

                    total_cpu: inst.vcpu,
                    total_memory: inst.memory_gb,
                    total_read_iops: inst.read_iops,
                    total_write_iops: inst.write_iops,
                    total_prov_iops: inst.provisioned_iops || 0,
                    approx_cost: inst.approx_cost || 0
                }));


                setRdsInstances(formatted);
            }
        } catch (error) {
            console.error("Failed to fetch RDS instances:", error);
        }
    };

    const fetchAuroraClusters = async () => {
        try {
            const { from_date, to_date } = getDateRange();

            const res = await axiosClient.get(
                `/analytics/rds/aurora/clusters/${from_date}/${to_date}`
            );

            if (res.data.success) {
                const clusters = res.data.data.clusters || [];

                const formatted = clusters.map(cluster => ({
                    cluster_name: cluster.cluster_identifier,
                    instances_count: cluster.max_total_instances,
                    approx_cost: cluster.total_approx_cost,
                    active_days_count: Number(cluster.active_days),

                    avg_cpu_utilization: cluster.avg_cpu_utilization,
                    avg_connections: cluster.avg_database_connections,
                    avg_read_iops: cluster.avg_read_iops,
                    avg_write_iops: cluster.avg_write_iops,
                    avg_memory_usage: cluster.avg_memory_utilization || 0,

                    total_cpu: cluster.total_vcpu,
                    total_memory: cluster.total_memory_gb,

                    // ✅ FIX HERE
                    total_read_iops: Number(cluster.read_iops) || 0,
                    total_write_iops: Number(cluster.write_iops) || 0,

                    // ✅ ADD DERIVED FIELD (cleaner UI)
                    total_iops:
                        (Number(cluster.read_iops) || 0) +
                        (Number(cluster.write_iops) || 0),

                    status: "available",
                    trend: "stable",
                    engine: "Aurora",
                    is_aws: cluster.turned_on_by_aws_console === true,
                }));

                setAuroraClusters(formatted);
            }

        } catch (error) {
            console.error("Failed to fetch Aurora clusters:", error);
        }
    };

    const fetchDocdbClusters = async () => {
        try {
            const { from_date, to_date } = getDateRange();

            const res = await axiosClient.get(
                `/analytics/rds/docdb/clusters/${from_date}/${to_date}`
            );

            if (res.data.success) {
                const clusters = res.data.data.clusters || [];

                const formatted = clusters.map(cluster => ({
                    cluster_name: cluster.cluster_identifier,
                    instances_count: cluster.max_total_instances,
                    approx_cost: cluster.total_approx_cost,
                    active_days_count: Number(cluster.active_days),

                    avg_cpu_utilization: cluster.avg_cpu_utilization,
                    avg_connections: cluster.avg_database_connections,
                    avg_read_iops: cluster.avg_read_iops,
                    avg_write_iops: cluster.avg_write_iops,
                    avg_memory_usage: cluster.avg_memory_utilization || 0,

                    total_cpu: cluster.total_vcpu,
                    total_memory: cluster.total_memory_gb,

                    // ✅ FIX HERE
                    total_read_iops: Number(cluster.read_iops) || 0,
                    total_write_iops: Number(cluster.write_iops) || 0,

                    // ✅ ADD DERIVED FIELD (cleaner UI)
                    total_iops:
                        (Number(cluster.read_iops) || 0) +
                        (Number(cluster.write_iops) || 0),

                    status: "available",
                    trend: "stable",
                    engine: "Aurora",
                    is_aws: cluster.turned_on_by_aws_console === true,
                }));

                setDocdbClusters(formatted);
            }

        } catch (error) {
            console.error("Failed to fetch DocDB clusters:", error);
        }
    };

    const fetchRdsInstanceActiveDates = (db) => {
        try {
            const dateMap = {};

            (db.daily_metrics || []).forEach(day => {
                const date = day.date;

                dateMap[date] = {
                    cpu: Number(day.cpu) || 0,
                    connections: Number(day.connections) || 0,
                    readIops: Number(day.read_iops) || 0,
                    writeIops: Number(day.write_iops) || 0,
                    memory: Number(day.memory_utilization) || 0,
                    cost: Number(day.approx_cost) || 0,
                    isAwsConsole: !!day.turned_on_by_aws_console
                };
            });

            const dates = Object.keys(dateMap).sort(
                (a, b) => new Date(b) - new Date(a)
            );

            setSelectedDaysInfo({
                identifier: db.db_identifier,
                count: db.active_days_count,
                capacity: {
                    cpu: db.total_cpu,
                    memory: db.avg_memory_usage,
                    readIops: db.total_read_iops,
                    writeIops: db.total_write_iops
                },
                rawDates: dates,
                metricsByDate: dateMap
            });

        } catch (err) {
            console.error("Failed to process RDS active dates", err);
        }
    };

    const fetchClusterActiveDates = async (clusterName, activeDays, capacity = {}) => {
        try {
            const { from_date, to_date } = getDateRange();
            const type = viewMode === 'aurora' ? 'aurora' : 'docdb';

            const res = await axiosClient.get(
                `/analytics/rds/${type}/clusters/${clusterName}/metrics/${from_date}/${to_date}`
            );

            if (!res.data.success) return;

            const instances = res.data.data.instances || [];
            const dateMap = {};

            instances.forEach(instance => {
                (instance.daily_metrics || []).forEach(day => {
                    const date = day.date;
                    if (!dateMap[date]) {
                        dateMap[date] = {
                            cpu: 0, connections: 0, readIops: 0, writeIops: 0, memory: 0, cost: 0, count: 0, awsConsoleCount: 0
                        };
                    }
                    dateMap[date].cpu += Number(day.cpu || day.avg_cpu_utilization) || 0;
                    dateMap[date].connections += Number(day.connections || day.avg_connections || day.avg_database_connections) || 0;
                    dateMap[date].readIops += Number(day.read_iops || day.avg_read_iops) || 0;
                    dateMap[date].writeIops += Number(day.write_iops || day.avg_write_iops) || 0;
                    dateMap[date].memory += Number(day.memory_utilization || day.avg_memory_utilization) || 0;
                    dateMap[date].cost += Number(day.approx_cost || 0);

                    if (day.turned_on_by_aws_console) dateMap[date].awsConsoleCount += 1;
                    dateMap[date].count += 1;
                });
            });

            const aggregatedByDate = {};
            Object.entries(dateMap).forEach(([date, val]) => {
                aggregatedByDate[date] = {
                    cpu: +(val.cpu / val.count).toFixed(2),
                    connections: +(val.connections / val.count).toFixed(2),
                    readIops: +(val.readIops / val.count).toFixed(2),
                    writeIops: +(val.writeIops / val.count).toFixed(2),
                    memory: +(val.memory / val.count).toFixed(2),
                    cost: +val.cost.toFixed(2),
                    isAwsConsole: val.awsConsoleCount > 0
                };
            });

            const dates = Object.keys(aggregatedByDate).sort((a, b) => new Date(b) - new Date(a));

            setSelectedDaysInfo({
                identifier: clusterName,
                count: activeDays,
                capacity,
                rawDates: dates,
                metricsByDate: aggregatedByDate
            });

        } catch (err) {
            console.error("Failed to fetch cluster active dates", err);
        }
    };



    const fetchHistory = async (type, identifier, date = null) => {
        try {
            const url = date
                ? `/analytics/rds/${type}/${identifier}/metrics/history/hourly/${date}`
                : `/analytics/rds/${type}/${identifier}/metrics/history/daily`;

            const res = await axiosClient.get(url);
            if (!res.data.success) return [];

            const metrics = (res.data.data.metrics || []).map(m => ({
                date: m.date || m.timestamp.split(' ')[0],
                dateStr: m.date || m.timestamp.split(' ')[0],
                displayDate: m.date ? new Date(m.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : new Date(m.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                displayHour: m.timestamp ? m.timestamp.split(' ')[1].substring(0, 5) : null,
                timestamp: m.timestamp,
                cpu: Number(m.cpu) || 0,
                connections: Number(m.connections) || 0,
                readIops: Number(m.read_iops) || 0,
                writeIops: Number(m.write_iops) || 0,
                memory: Number(m.memory_utilization) || 0,
                cost: Number(m.cost || m.approx_cost || 0) || 0,
                isAwsConsole: m.turned_on_by_aws_console || false
            }));

            return metrics;
        } catch (err) {
            console.error(`Failed to fetch history for ${identifier}`, err);
            return [];
        }
    };

    const handleViewTrend = async (instance) => {
        setLoadingTrend(true);
        const type = viewMode === 'rds' ? 'instances' : viewMode === 'aurora' ? 'aurora/instances' : 'docdb/instances';
        const identifier = instance.db_identifier;

        const metrics = await fetchHistory(type, identifier);
        setSelectedInstanceForTrend({
            ...instance,
            metrics
        });
        setLoadingTrend(false);
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
        const data =
            viewMode === "rds"
                ? summaryData?.rds
                : viewMode === "aurora"
                    ? summaryData?.aurora
                    : summaryData?.docdb;

        if (!data) {
            return {
                count: 0,
                avgCpu: 0,
                avgConn: 0,
                avgRead: 0,
                avgWrite: 0,
                avgMemory: 0,
                totalCost: 0
            };
        }

        return {
            count: Number(
                viewMode === "rds"
                    ? (data.total_instances || data.instance_count)
                    : (data.total_clusters || data.cluster_count)
            ) || 0,

            avgCpu: Number(data.avg_cpu_utilization || data.avg_cpu) || 0,
            avgConn: Number(data.avg_connections || data.avg_database_connections) || 0,
            avgRead: Number(data.avg_read_iops) || 0,
            avgWrite: Number(data.avg_write_iops) || 0,
            avgMemory: Number(data.avg_memory_utilization || data.avg_memory) || 0,

            // ✅ NEW FIELD
            avgTotalIops:
                (Number(data.avg_read_iops) || 0) +
                (Number(data.avg_write_iops) || 0),

            totalCost: Number(data.total_approx_cost || data.approx_cost) || 0
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

    const metricCards = useMemo(() => [
        {
            label: viewMode === 'rds' ? 'Active Instances' : 'Total Clusters',
            value: stats.count,
            icon: Database,
            color: 'var(--rds-emerald)',
            bg: 'var(--rds-emerald-bg)'
        },
        {
            label: 'Avg CPU Utilization',
            value: `${stats.avgCpu.toFixed(2)}%`,
            icon: Cpu,
            color: 'var(--rds-emerald)',
            bg: 'var(--rds-emerald-bg)'
        },
        {
            label: 'Avg Connections',
            value: stats.avgConn.toFixed(0),
            icon: Network,
            color: 'var(--rds-aurora-cyan)',
            bg: 'var(--rds-aurora-cyan-bg)'
        },
        {
            label: 'Avg Total IOPS',
            value: stats.avgTotalIops,
            icon: Activity, // or Zap if you prefer consistency
            color: 'var(--rds-aurora-cyan)',
            bg: 'var(--rds-aurora-cyan-bg)'
        },
        // {
        //     label: 'Avg Read IOPS',
        //     value: stats.avgRead.toFixed(0),
        //     icon: ArrowRight,
        //     color: 'var(--rds-aurora-cyan)',
        //     bg: 'var(--rds-aurora-cyan-bg)'
        // },
        // {
        //     label: 'Avg Write IOPS',
        //     value: stats.avgWrite.toFixed(0),
        //     icon: Zap,
        //     color: 'var(--rds-docdb-indigo)',
        //     bg: 'var(--rds-docdb-indigo-bg)'
        // },
        {
            label: 'Avg Memory Utilization',
            value: `${stats.avgMemory.toFixed(2)}%`,
            icon: HardDrive,
            color: 'var(--rds-docdb-indigo)',
            bg: 'var(--rds-docdb-indigo-bg)'
        },
        {
            label: 'Total Cost',
            value: `$${stats.totalCost.toFixed(2)}`,
            icon: DollarSign,
            color: 'var(--rds-emerald)',
            bg: 'var(--rds-emerald-bg)'
        }
    ], [stats, viewMode]);

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

                {/* --- Search Bar Section --- */}
                <div className="rds-search-section" style={{ animationDelay: '0.35s' }}>
                    <div className="rds-search-container">
                        <div className="rds-search-box">
                            <Search className="rds-search-icon" size={20} />
                            <input
                                type="text"
                                className="rds-search-input"
                                placeholder={`Search ${viewMode === 'rds' ? 'RDS Instances' : viewMode === 'aurora' ? 'Aurora Clusters' : 'DocDB Clusters'}...`}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            {searchQuery && (
                                <button className="rds-search-clear" onClick={() => setSearchQuery('')}>
                                    <X size={16} />
                                </button>
                            )}
                        </div>
                        <div className="rds-search-count-badge">
                            {filteredData.length} {filteredData.length === 1 ? 'result' : 'results'}
                        </div>
                    </div>
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
                            filteredData.length === 0 ? (
                                <div className="rds-no-results">
                                    <SearchX size={48} />
                                    <h3>No Clusters Found</h3>
                                    <p>Try adjusting your search or switching modes</p>
                                </div>
                            ) : (
                                filteredData.map((cluster, idx) => (
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
                                            <span className="aurora-instance-count">{cluster.instances_count} Instances</span>
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
                                                <span className="rds-spec-value">{(cluster.avg_connections || 0).toLocaleString()}</span>
                                                <span className="rds-spec-unit">Avg Conn</span>
                                            </div>
                                            <div className="rds-summary-tag">
                                                <Activity size={12} />
                                                <span className="rds-spec-value">{cluster.total_iops.toLocaleString()}</span>
                                                <span className="rds-spec-unit"> IOPS</span>
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

                                                    fetchClusterActiveDates(
                                                        cluster.cluster_name,
                                                        cluster.active_days_count,
                                                        {
                                                            cpu: cluster.total_cpu,
                                                            memory: cluster.avg_memory_usage,
                                                            readIops: cluster.total_read_iops,
                                                            writeIops: cluster.total_write_iops
                                                        }
                                                    );
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
                                            <span>View {viewMode === 'docdb' ? 'DocumentDB' : 'Aurora'} Instances</span>
                                            <ArrowRight size={16} />
                                        </div>
                                    </div>
                                )))
                        ) : (
                            filteredData.length === 0 ? (
                                <div className="rds-no-results">
                                    <SearchX size={48} />
                                    <h3>No Instances Found</h3>
                                    <p>Try adjusting your search or switching modes</p>
                                </div>
                            ) : (
                                filteredData.map((db, idx) => (
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
                                                        handleViewTrend(db);
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
                                                <span className="rds-spec-value">{(db.avg_connections || 0).toLocaleString()}</span>
                                                <span className="rds-spec-unit">Avg Conn</span>
                                            </div>
                                            <div className="rds-summary-tag">
                                                <Activity size={12} />
                                                <span className="rds-spec-value">{db.total_prov_iops || 0}</span>
                                                <span className="rds-spec-unit"> IOPS</span>
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

                                                    fetchRdsInstanceActiveDates(db);
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
                                )))
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
                    gridTemplateColumns="52px minmax(0, 2.5fr) minmax(0, 0.5fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 0.5fr) minmax(0, 0.75fr) minmax(0, 0.75fr) minmax(0, 1fr)"
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
                onFetchHourly={(date) => {
                    const type = viewMode === 'rds' ? 'instances' : viewMode === 'aurora' ? 'aurora/instances' : 'docdb/instances';
                    return fetchHistory(type, selectedInstanceForTrend?.db_identifier, date);
                }}
            />

            <RDSGraphModal
                isOpen={!!selectedClusterForTrend}
                onClose={() => setSelectedClusterForTrend(null)}
                instance={selectedClusterForTrend}
                excludeMetrics={['cpu', 'connections', 'read', 'write']}
                onFetchHourly={(date) => {
                    const type = viewMode === 'aurora' ? 'aurora/clusters' : 'docdb/clusters';
                    return fetchHistory(type, selectedClusterForTrend?.cluster_name, date);
                }}
            />

            {
                showCalendar && (
                    <CalendarPicker onRangeSelect={handleCustomRange} onClose={() => setShowCalendar(false)} />
                )
            }

            {
                selectedDaysInfo && (
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
                                                    {selectedDaysInfo?.capacity?.memory !== undefined && (
                                                        <div className="rds-ddc-capacity">
                                                            Avg Utilization: {selectedDaysInfo.capacity.memory}%
                                                        </div>
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