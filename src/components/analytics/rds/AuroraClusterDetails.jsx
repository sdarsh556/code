import { useState, useMemo, useEffect } from 'react';
import { useParams, useLocation, useNavigate, useOutletContext } from 'react-router-dom';
import {
    ArrowLeft, Activity, DollarSign, Calendar, Cpu, TrendingUp, TrendingDown,
    Minus, ChevronRight, Clock, Database, Network, ArrowRight, Zap,
    CheckCircle, AlertCircle, BarChart3, Server
} from 'lucide-react';
import ComparisonTable from '../ComparisonTable';
import RDSGraphModal from './RDSGraphModal'; // Reusing the RDS Graph Modal
import '../../../css/analytics/rds/AuroraClusterDetails.css';
import '../../../css/analytics/comparison-table.css';
import axiosClient from '../../api/axiosClient';

function AuroraClusterDetails() {
    const { clusterName } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const { cluster, selectedRange, customRange, engine = 'Aurora' } = location.state || {};
    const { setBgContext } = useOutletContext();

    const [selectedInstance, setSelectedInstance] = useState(null);
    const [showGraphModal, setShowGraphModal] = useState(false);
    const [showTimelineModal, setShowTimelineModal] = useState(false);
    const [timelineInstance, setTimelineInstance] = useState(null);
    const [clusterData, setClusterData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [instanceMetrics, setInstanceMetrics] = useState([]);

    useEffect(() => {
        setBgContext('analytics');
        return () => setBgContext('default');
    }, [setBgContext]);

    const getDateRange = () => {

        if (selectedRange === "custom" && customRange) {
            return {
                from_date: customRange.start,
                to_date: customRange.end
            };
        }

        const end = new Date();
        const start = new Date();

        const rangeMap = {
            "7d": 7,
            "15d": 15,
            "30d": 30,
            "90d": 90
        };

        const days = rangeMap[selectedRange] || 30;

        start.setDate(end.getDate() - days);

        const format = (d) => d.toISOString().split("T")[0];

        return {
            from_date: format(start),
            to_date: format(end)
        };
    };



    // Mock Data based on user request
    // const clusterData = useMemo(() => ({
    //     cluster_info: {
    //         cluster_identifier: clusterName || "aurora-prod-cluster",
    //         engine: "aurora-mysql",
    //         status: "available"
    //     },
    //     instances: [
    //         {
    //             instance_identifier: `${clusterName}-instance-1` || "aurora-prod-instance-1",
    //             instance_class: "db.r5.large",
    //             role: "WRITER",
    //             status: "available",
    //             avg_cpu_utilization: 30.0,
    //             avg_database_connections: 48.0,
    //             avg_read_iops: 290.0,
    //             avg_write_iops: 145.0,
    //             days_active: 30,
    //             active_dates: ["2026-03-30", "2026-03-29", "2026-03-28", "2026-03-15", "2026-03-01"]
    //         },
    //         {
    //             instance_identifier: `${clusterName}-instance-2` || "aurora-prod-instance-2",
    //             instance_class: "db.r5.large",
    //             role: "READER",
    //             status: "available",
    //             avg_cpu_utilization: 25.0,
    //             avg_database_connections: 42.0,
    //             avg_read_iops: 245.0,
    //             avg_write_iops: 5.0,
    //             days_active: 30,
    //             active_dates: ["2026-03-30", "2026-03-25", "2026-03-20", "2026-03-15"]
    //         },
    //         {
    //             instance_identifier: `${clusterName}-instance-3` || "aurora-prod-instance-3",
    //             instance_class: "db.r5.xlarge",
    //             role: "READER",
    //             status: "available",
    //             avg_cpu_utilization: 15.0,
    //             avg_database_connections: 12.0,
    //             avg_read_iops: 120.0,
    //             avg_write_iops: 2.0,
    //             days_active: 15,
    //             active_dates: ["2026-03-15", "2026-03-14", "2026-03-10"]
    //         }
    //     ],
    //     metric_summary: {
    //         date_range: {
    //             start: "2026-02-04",
    //             end: "2026-03-05"
    //         },
    //         total_days: 30,
    //         total_instances: 3
    //     }
    // }), [clusterName]);

    const fetchClusterMetrics = async () => {
        try {
            const { from_date, to_date } = getDateRange();
            const engineLower = engine.toLowerCase() === 'documentdb' ? 'docdb' : 'aurora';

            const res = await axiosClient.get(
                `/analytics/rds/${engineLower}/clusters/${clusterName}/metrics/${from_date}/${to_date}`
            );

            if (res.data.success) {
                const data = res.data.data;

                const formattedInstances = data.instances.map((inst, index) => {
                    const dailyMetrics = inst.daily_metrics || [];

                    // ✅ derive AWS console flag
                    const isAwsConsole = dailyMetrics.some(day =>
                        day.turned_on_by_aws_console === true ||
                        day.turned_off_by_aws_console === true
                    );

                    return {
                        instance_identifier:
                            inst.db_identifier || `${clusterName}-instance-${index + 1}`,

                        // identifiers
                        db_identifier: inst.db_identifier,
                        instance_class: inst.instance_class,

                        // status & role
                        role: inst.role?.toUpperCase(),
                        status: inst.status || "available",

                        // capacity
                        total_cpu: Number(inst.vcpu) || 0,
                        total_memory: Number(inst.memory_gb) || 0,

                        // totals
                        total_read_iops: Number(inst.read_iops) || 0,
                        total_write_iops: Number(inst.write_iops) || 0,
                        total_iops:
                            (Number(inst.read_iops) || 0) +
                            (Number(inst.write_iops) || 0),

                        // averages
                        avg_cpu_utilization: Number(inst.avg_cpu_utilization) || 0,
                        avg_connections: Number(inst.avg_database_connections) || 0,
                        avg_read_iops: Number(inst.avg_read_iops) || 0,
                        avg_write_iops: Number(inst.avg_write_iops) || 0,
                        avg_memory_usage: Number(inst.avg_memory_utilization) || 0,

                        // active days
                        active_days_count: Number(inst.days_active) || 0,

                        // ✅ derived flag
                        is_aws: isAwsConsole,

                        // dates (if needed)
                        active_dates: dailyMetrics.map(d =>
                            new Date(d.date).toISOString().split("T")[0]
                        ),

                        // raw metrics (keep if needed)
                        daily_metrics: dailyMetrics
                    };
                });

                // ✅ NEW: Normalize cluster avg metrics
                const avgMetrics = {
                    avg_cpu_utilization: Number(data.cluster_avg_metrics?.avg_cpu_utilization) || 0,
                    avg_connections: Number(data.cluster_avg_metrics?.avg_database_connections) || 0,
                    avg_read_iops: Number(data.cluster_avg_metrics?.avg_read_iops) || 0,
                    avg_write_iops: Number(data.cluster_avg_metrics?.avg_write_iops) || 0,
                    avg_memory_utilization: Number(data.cluster_avg_metrics?.avg_memory_utilization) || 0,
                    total_cost: Number(data.cluster_avg_metrics?.total_cost) || 0,

                    // ✅ Derived (very useful for UI)
                    avg_total_iops:
                        (Number(data.cluster_avg_metrics?.avg_read_iops) || 0) +
                        (Number(data.cluster_avg_metrics?.avg_write_iops) || 0)
                };

                setClusterData({
                    cluster_info: data.cluster_info,
                    instances: formattedInstances,
                    metric_summary: data.metric_summary,

                    avg_metrics: avgMetrics
                });
            }

        } catch (err) {
            console.error("Failed to fetch Aurora cluster metrics", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchInstanceMetrics = async (instanceIdentifier, date = null) => {
        try {
            const engineLower = engine.toLowerCase() === 'documentdb' ? 'docdb' : 'aurora';
            const url = date
                ? `/analytics/rds/${engineLower}/instances/${instanceIdentifier}/metrics/history/hourly/${date}`
                : `/analytics/rds/${engineLower}/instances/${instanceIdentifier}/metrics/history/daily`;

            const res = await axiosClient.get(url);

            if (res.data.success) {
                const metrics = (res.data.data.metrics || []).map(m => {
                    const ts = m.timestamp || m.date;
                    const datePart = ts ? (ts.includes(' ') ? ts.split(' ')[0] : ts.split('T')[0]) : '';
                    const timePart = ts?.includes(' ') ? ts.split(' ')[1] : (ts?.includes('T') ? ts.split('T')[1] : null);
                    
                    return {
                        date: datePart,
                        dateStr: datePart,
                        displayDate: datePart ? new Date(datePart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A',
                        displayHour: timePart ? timePart.substring(0, 5) : null,
                        cpu: Number(m.cpu) || 0,
                        connections: Number(m.connections) || 0,
                        readIops: Number(m.read_iops) || 0,
                        writeIops: Number(m.write_iops) || 0,
                        memory: Number(m.memory_utilization) || 0,
                        cost: Number(m.cost || m.approx_cost || 0) || 0
                    };
                });

                return metrics;
            }

            return [];

        } catch (err) {
            console.error(`Failed to fetch ${engine} instance metrics`, err);
            return [];
        }
    };

    useEffect(() => {
        fetchClusterMetrics();
    }, [clusterName, selectedRange, customRange]);

    const totalActiveDays = useMemo(() => {
        if (!clusterData?.instances) return 0;

        const uniqueActiveDays = new Set();

        clusterData.instances.forEach(inst => {
            inst.active_dates?.forEach(date => {
                uniqueActiveDays.add(date);
            });
        });

        return uniqueActiveDays.size;
    }, [clusterData]);

    if (loading || !clusterData) {
        return (
            <div className="aurora-details-page">
                <div className="ad-content">
                    <div style={{ padding: "40px", textAlign: "center" }}>
                        Loading {engine} Cluster Metrics...
                    </div>
                </div>
            </div>
        );
    }

    const handleViewTrend = async (instance) => {
        const identifier = instance.instance_identifier;
        const metrics = await fetchInstanceMetrics(identifier);
        setSelectedInstance({
            db_identifier: identifier,
            ...instance,
            metrics: metrics   // ✅ attach metrics here
        });
        setShowGraphModal(true);
    };

    const handleViewTimeline = (instance) => {
        setTimelineInstance(instance);
        setShowTimelineModal(true);
    };

    const getGaugeColor = (val, type) => {
        const normalizedType = String(type).toLowerCase().trim();
        const colors = {
            'cpu': ['#3b82f6', '#60a5fa'],
            'mem': ['#ec4899', '#f472b6'],
            'read': ['#10b981', '#34d399'],
            'write': ['#a855f7', '#c084fc']
        };
        return colors[normalizedType] || ['#94a3b8', '#cbd5e1'];
    };

    const renderGauge = (val, max, label, Icon, type) => {
        const [c1, c2] = getGaugeColor(val, type);
        const radius = 42; // Increased radius for bigger look
        const circumference = 2 * Math.PI * radius;
        const safeVal = Number(val) || 0;
        const safeMax = Number(max) || 0;
        const percent = safeMax > 0 ? Math.min(safeVal, safeMax) / safeMax : 0;
        const offset = circumference - percent * circumference;

        return (
            <div className={`aurora-instance-gauge ${type}`}>
                <svg viewBox="0 0 100 100" className="aurora-gauge-svg">
                    <defs>
                        <linearGradient id={`grad-${type}`} x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor={c1} />
                            <stop offset="100%" stopColor={c2} />
                        </linearGradient>
                        <filter id="glow">
                            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>
                    <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="6" />
                    <circle
                        cx="50" cy="50" r={radius}
                        fill="none"
                        stroke={`url(#grad-${type})`}
                        strokeWidth="8"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                        transform="rotate(-90 50 50)"
                        style={{ filter: 'url(#glow)' }}
                    />
                </svg>
                <div className="aurora-gauge-info">
                    <div className="aurora-gauge-val" style={{ color: c1 }}>
                        {safeVal.toFixed(0)}
                        {(type === 'cpu' || type === 'mem') && <span className="aurora-gauge-unit">%</span>}
                    </div>
                    <div className="aurora-gauge-label">
                        <Icon size={12} />
                        <span>{label}</span>
                    </div>
                </div>
            </div>
        );
    };

    const renderTimelineModal = () => {
        if (!showTimelineModal || !timelineInstance) return null;

        const formatDate = (dateStr) => {
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        };

        return (
            <div className="aurora-modal-overlay" onClick={() => setShowTimelineModal(false)}>
                <div className="aurora-timeline-modal" onClick={e => e.stopPropagation()}>
                    <div className="aurora-tm-header">
                        <div className="aurora-tm-icon-box">
                            <Calendar size={24} className="aurora-tm-icon" />
                        </div>
                        <div className="aurora-tm-title-group">
                            <h2 className="aurora-tm-title">Active Timeline</h2>
                            <p className="aurora-tm-subtitle">{timelineInstance.instance_identifier}</p>
                        </div>
                    </div>

                    <div className="aurora-tm-body">
                        <div className="aurora-tm-count-block">
                            <span className="aurora-tm-big-num">{timelineInstance.active_days_count}</span>
                            <span className="aurora-tm-label">Days Active</span>
                        </div>

                        <div className="aurora-tm-dates-grid">
                            {timelineInstance.active_dates.map((date, i) => (
                                <div key={i} className="aurora-tm-date-pill">
                                    {formatDate(date)}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="aurora-tm-footer">
                        <button className="aurora-tm-close-btn" onClick={() => setShowTimelineModal(false)}>
                            Got it
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="aurora-details-page">
            <div className="ad-content">
                {/* Breadcrumb */}
                <div className="cd-breadcrumb">
                    <button type="button" className="cd-back-btn" onClick={() => navigate('/analytics/rds')}>
                        <ArrowLeft size={16} />
                        <span>RDS Analytics</span>
                    </button>
                    <ChevronRight size={14} className="cd-breadcrumb-sep" />
                    <span className="cd-breadcrumb-current">{clusterName}</span>
                </div>

                {/* Header */}
                <div className="cd-header">
                    <div className="cd-header-left">
                        <div className="cd-header-icon">
                            <Activity size={28} />
                        </div>
                        <div>
                            <h1 className="cd-title">{clusterData.cluster_info.cluster_identifier}</h1>
                            <p className="cd-subtitle">{engine} · Daily performance breakdown</p>
                        </div>
                    </div>

                    {/* Summary Pills */}
                    <div className="cd-summary-pills">
                        <div className="cd-pill">
                            <Clock size={16} />
                            <span className="cd-pill-value">{totalActiveDays}</span>
                            <span className="cd-pill-label">Days Active</span>
                        </div>
                        <div className="cd-pill">
                            <Database size={16} />
                            <span className="cd-pill-value">{clusterData.instances.length}</span>
                            <span className="cd-pill-label">Instances</span>
                        </div>
                        <div className="cd-pill cost-pill">
                            <DollarSign size={16} />
                            <span className="cd-pill-value">{clusterData?.avg_metrics?.total_cost?.toFixed(2) || 0}</span>
                            <span className="cd-pill-label">Total Cost</span>
                        </div>
                    </div>
                </div>

                {/* Instances Section */}
                {/* <div className="cd-section-label">
                    <Activity size={15} />
                    <span>Cluster Instances — performance breakdown</span>
                </div> */}

                <div className="ad-instances-grid">
                    {clusterData.instances.map((instance, index) => (
                        <div
                            key={instance.instance_identifier}
                            className="aurora-instance-card"
                            style={{ animationDelay: `${index * 0.1}s` }}
                        >
                            <div className="aurora-ic-tech-grid" />
                            <div className="aurora-ic-top-bar">
                                <div className="aurora-ic-name-block">
                                    <div className="aurora-ic-id-row">
                                        <Database size={18} className="aurora-ic-icon" />

                                        <span className="aurora-ic-id">
                                            {instance?.instance_identifier || "N/A"}
                                        </span>

                                        <div className={`aurora-ic-status ${(instance?.status || "unknown").toLowerCase()}`}>
                                            <div className="status-dot-pulse" />
                                            <span>{instance?.status || "Unknown"}</span>
                                        </div>
                                    </div>
                                    <div className="aurora-ic-meta">
                                        <span className="aurora-ic-class">{instance?.instance_class}</span>
                                        <span className="aurora-ic-dot" />
                                        <span className={`aurora-ic-role ${instance.role.toLowerCase()}`}>{instance?.role}</span>
                                        <div className="aurora-ic-dot" />
                                        <div className="rds-instance-specs aurora-compact">
                                            <div className="rds-spec-tag cpu">
                                                <Cpu size={14} />
                                                <span className="rds-spec-value">{instance.total_cpu || 0}</span>
                                                <span className="rds-spec-unit">vCPU</span>
                                            </div>
                                            <div className="rds-spec-tag mem">
                                                <Zap size={14} />
                                                <span className="rds-spec-value">{instance.total_memory || 0}</span>
                                                <span className="rds-spec-unit">GB RAM</span>
                                            </div>
                                            <div className="rds-spec-tag conn">
                                                <Network size={14} />
                                                <span className="rds-spec-value">{(instance.avg_connections || 0).toLocaleString()}</span>
                                                <span className="rds-spec-unit">Max Conn</span>
                                            </div>
                                            <div className="rds-spec-tag iops">
                                                <Activity size={14} />
                                                <span className="rds-spec-value">{(instance.total_iops || 0).toLocaleString()}</span>
                                                <span className="rds-spec-unit">IOPS</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="aurora-ic-actions-top">
                                    <button className="aurora-ic-btn secondary small" onClick={() => handleViewTimeline(instance)}>
                                        <Calendar size={14} />
                                        <span>{instance.active_days_count} Days Active</span>
                                    </button>
                                    <button className="aurora-ic-btn primary small" onClick={(e) => {
                                        e.stopPropagation();
                                        handleViewTrend(instance);
                                    }}>
                                        <BarChart3 size={14} />
                                        <span>View Trend</span>
                                    </button>
                                </div>
                            </div>

                            <div className="aurora-ic-main-content">
                                <div className="aurora-ic-gauges-horizontal">
                                    {renderGauge(instance.avg_cpu_utilization || 0, 100, "CPU Usage", Cpu, 'cpu')}
                                    {renderGauge(instance.avg_memory_usage || 0, 100, "Memory Usage", Zap, 'mem')}
                                    {renderGauge(instance.avg_read_iops || 0, instance.total_read_iops || 0, "Read IOPS", ArrowRight, 'read')}
                                    {renderGauge(instance.avg_write_iops || 0, instance.total_write_iops || 0, "Write IOPS", Zap, 'write')}
                                </div>
                            </div>
                            <div className="aurora-ic-card-accent" />
                        </div>
                    ))}
                </div>

                {/* Instance Comparison Table */}
                <ComparisonTable
                    title="Instance Comparison"
                    subtitle="Technical metrics for all cluster nodes"
                    data={clusterData.instances.map(inst => ({
                        ...inst,
                        id: inst.instance_identifier
                    }))}
                    exportFilename={`${clusterName}-instances.csv`}
                    gridTemplateColumns="3.25rem minmax(0, 2fr) minmax(0, 1.2fr) 8.5rem 8.5rem 8.5rem 8.5rem 8.5rem 8.5rem"
                    columns={[
                        {
                            key: 'instance_identifier',
                            label: 'Instance ID',
                            type: 'status-name',
                            sortable: true
                        },
                        {
                            key: 'instance_class',
                            label: 'Class',
                            icon: Server,
                            sortable: true,
                            align: 'center'
                        },
                        {
                            key: 'role',
                            label: 'Role',
                            type: 'badge-role',
                            sortable: true,
                            align: 'center'
                        },
                        {
                            key: 'avg_cpu_utilization',
                            label: 'CPU',
                            icon: Cpu,
                            type: 'cpu',
                            sortable: true,
                            align: 'center'
                        },
                        {
                            key: 'avg_connections',
                            label: 'Conn',
                            icon: Network,
                            sortable: true,
                            align: 'center'
                        },
                        {
                            key: 'avg_read_iops',
                            label: 'Read',
                            icon: ArrowRight,
                            sortable: true,
                            align: 'center'
                        },
                        {
                            key: 'avg_write_iops',
                            label: 'Write',
                            icon: Zap,
                            sortable: true,
                            align: 'center'
                        },
                        {
                            key: 'active_days_count',
                            label: 'Active',
                            icon: Clock,
                            sortable: true,
                            align: 'center'
                        }
                    ]}
                />
            </div>

            {showGraphModal && selectedInstance && (
                <RDSGraphModal
                    isOpen={showGraphModal}
                    instance={selectedInstance}
                    excludeMetrics={['cost']}
                    onFetchHourly={(date) => fetchInstanceMetrics(selectedInstance.instance_identifier, date)}
                    onClose={() => {
                        setShowGraphModal(false);
                        setSelectedInstance(null);
                        setInstanceMetrics([]);
                    }}
                />
            )}

            {renderTimelineModal()}
        </div>
    );
}

export default AuroraClusterDetails;