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
            setLoading(false);
            setClusterData({
                cluster_info: {
                    cluster_identifier: clusterName || "aurora-prod-cluster",
                    engine: engine || "aurora-mysql",
                    status: "available"
                },
                instances: [
                    {
                        instance_identifier: `${clusterName}-instance-1`,
                        instance_class: "db.r5.large",
                        role: "WRITER",
                        status: "available",
                        avg_cpu_utilization: 30.0,
                        avg_database_connections: 48.0,
                        avg_read_iops: 290.0,
                        avg_write_iops: 145.0,
                        days_active: 30,
                        active_dates: ["2026-03-17", "2026-03-16", "2026-03-15", "2026-03-14", "2026-03-13"]
                    },
                    {
                        instance_identifier: `${clusterName}-instance-2`,
                        instance_class: "db.r5.large",
                        role: "READER",
                        status: "available",
                        avg_cpu_utilization: 25.0,
                        avg_database_connections: 42.0,
                        avg_read_iops: 245.0,
                        avg_write_iops: 5.0,
                        days_active: 30,
                        active_dates: ["2026-03-17", "2026-03-16", "2026-03-15", "2026-03-14"]
                    },
                    {
                        instance_identifier: `${clusterName}-instance-3`,
                        instance_class: "db.r5.xlarge",
                        role: "READER",
                        status: "available",
                        avg_cpu_utilization: 15.0,
                        avg_database_connections: 12.0,
                        avg_read_iops: 120.0,
                        avg_write_iops: 2.0,
                        days_active: 15,
                        active_dates: ["2026-03-17", "2026-03-16", "2026-03-15"]
                    }
                ],
                metric_summary: {
                    date_range: {
                        start: "2026-02-15",
                        end: "2026-03-17"
                    },
                    total_days: 30,
                    total_cost: 1500.50,
                    total_instances: 3
                }
            });
            return;
        } catch (err) {
            console.error("Failed to fetch Aurora cluster metrics", err);
            setLoading(false);
        }
    };

    const fetchInstanceMetrics = async (instanceIdentifier) => {
        try {
            // Dummy data instead of API call
            return [
                { date: "2026-03-15", cpu: 42, connections: 115, readIops: 480, writeIops: 290, cost: 15.2 },
                { date: "2026-03-16", cpu: 40, connections: 110, readIops: 450, writeIops: 280, cost: 15.0 },
                { date: "2026-03-17", cpu: 45, connections: 120, readIops: 500, writeIops: 300, cost: 15.5 }
            ];
        } catch (err) {
            console.error("Failed to fetch Aurora instance metrics", err);
            return [];
        }
    };

    useEffect(() => {
        fetchClusterMetrics();
    }, [clusterName, selectedRange, customRange]);

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
        if (type === 'cpu') {
            if (val > 80) return ['#ef4444', '#f87171'];
            if (val > 50) return ['#f59e0b', '#fbbf24'];
            return ['#3b82f6', '#60a5fa'];
        }
        if (type === 'conn') return ['#f59e0b', '#fbbf24'];
        if (type === 'read') return ['#10b981', '#34d399'];
        if (type === 'write') return ['#ec4899', '#f472b6'];
        return ['#94a3b8', '#cbd5e1'];
    };

    const renderGauge = (val, max, label, Icon, type) => {
        const [c1, c2] = getGaugeColor(val, type);
        const radius = 42; // Increased radius for bigger look
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (Math.min(val, max) / max) * circumference;

        return (
            <div className="aurora-instance-gauge">
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
                        {type === 'cpu' ? `${val.toFixed(0)}%` : val.toFixed(0)}
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
                            <span className="aurora-tm-big-num">{timelineInstance.days_active}</span>
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
                    <button className="cd-back-btn" onClick={() => navigate(-1)}>
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
                            <span className="cd-pill-value">{clusterData.metric_summary?.total_days}</span>
                            <span className="cd-pill-label">Days Active</span>
                        </div>
                        <div className="cd-pill">
                            <Database size={16} />
                            <span className="cd-pill-value">{clusterData.instances.length}</span>
                            <span className="cd-pill-label">Instances</span>
                        </div>
                        <div className="cd-pill cost-pill">
                            <DollarSign size={16} />
                            <span className="cd-pill-value">${clusterData.metric_summary?.total_cost?.toFixed(0) || 0}</span>
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
                                        <span className="aurora-ic-id">{instance.instance_identifier}</span>
                                        <div className={`aurora-ic-status ${instance.status}`}>
                                            <div className="status-dot-pulse" />
                                            <span>{instance.status}</span>
                                        </div>
                                    </div>
                                    <div className="aurora-ic-meta">
                                        <span className="aurora-ic-class">{instance.instance_class}</span>
                                        <span className="aurora-ic-dot" />
                                        <span className={`aurora-ic-role ${instance.role.toLowerCase()}`}>{instance.role}</span>
                                    </div>
                                </div>

                                <div className="aurora-ic-actions-top">
                                    <button className="aurora-ic-btn secondary small" onClick={() => handleViewTimeline(instance)}>
                                        <Calendar size={14} />
                                        <span>{instance.days_active} Days Active</span>
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
                                    {renderGauge(instance.avg_cpu_utilization, 100, "CPU Usage", Cpu, 'cpu')}
                                    {renderGauge(instance.avg_database_connections, 200, "Connections", Network, 'conn')}
                                    {renderGauge(instance.avg_read_iops, 1000, "Read IOPS", ArrowRight, 'read')}
                                    {renderGauge(instance.avg_write_iops, 500, "Write IOPS", Zap, 'write')}
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
                    gridTemplateColumns="52px 1.5fr 1fr 100px 100px 100px 100px 100px 100px"
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
                            key: 'avg_database_connections',
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
                            key: 'days_active',
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