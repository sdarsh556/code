import { useState, useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
    ArrowLeft, Calendar, Cpu, Activity, BarChart3, Zap,
    CheckCircle, AlertCircle, ChevronRight, MemoryStick,
    ArrowUpDown, Trophy, Medal, Award
} from 'lucide-react';
import CPUGraphModal from './CPUGraphModal';
import '../../../css/analytics/ecs/ServiceDetails.css';

function ServiceDetails() {
    const { clusterName } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const { dayData, selectedRange } = location.state || {};

    const [selectedService, setSelectedService] = useState(null);
    const [showGraphModal, setShowGraphModal] = useState(false);
    const [sortBy, setSortBy] = useState('cpu');
    const [sortDir, setSortDir] = useState('desc'); // 'asc' | 'desc'

    const handleSort = (col) => {
        if (sortBy === col) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
        else { setSortBy(col); setSortDir('desc'); }
    };

    const SortIcon = ({ col }) => {
        const active = sortBy === col;
        return (
            <span className={`sort-arrow ${active ? 'active' : ''}`}>
                {active && sortDir === 'asc' ? '↑' : '↓'}
            </span>
        );
    }; // 'cpu' | 'memory' | 'tasks'

    const servicesData = [
        { serviceName: 'api-gateway-service', taskCount: 8, cpu: 62.4, memory: 74.2, status: 'healthy' },
        { serviceName: 'auth-service', taskCount: 4, cpu: 45.8, memory: 58.6, status: 'healthy' },
        { serviceName: 'payment-processor', taskCount: 6, cpu: 71.3, memory: 82.1, status: 'warning' },
        { serviceName: 'notification-service', taskCount: 3, cpu: 38.2, memory: 51.4, status: 'healthy' },
        { serviceName: 'data-sync-service', taskCount: 5, cpu: 55.9, memory: 67.8, status: 'healthy' },
        { serviceName: 'analytics-worker', taskCount: 2, cpu: 28.7, memory: 42.3, status: 'healthy' },
    ];

    // Sorted data for comparison table
    const sortedServices = useMemo(() => {
        return [...servicesData].sort((a, b) =>
            sortDir === 'desc' ? b[sortBy] - a[sortBy] : a[sortBy] - b[sortBy]
        );
    }, [sortBy, sortDir]);

    const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
    });

    const handleViewGraph = (service) => {
        setSelectedService(service);
        setShowGraphModal(true);
    };

    const getCpuColor = (val) => {
        if (val > 70) return ['#ef4444', '#f87171'];
        if (val > 50) return ['#f59e0b', '#fbbf24'];
        return ['#3b82f6', '#8b5cf6'];
    };

    const getMemColor = (val) => {
        if (val > 75) return ['#ef4444', '#f87171'];
        if (val > 60) return ['#f59e0b', '#fbbf24'];
        return ['#ec4899', '#f97316'];
    };

    const getBarColor = (val, type) => {
        if (type === 'cpu') {
            if (val > 70) return 'bar-danger';
            if (val > 50) return 'bar-warning';
            return 'bar-ok';
        } else {
            if (val > 75) return 'bar-danger';
            if (val > 60) return 'bar-warning';
            return 'bar-ok';
        }
    };

    const getRankIcon = (rank) => {
        if (rank === 0) return <Trophy size={14} className="rank-icon gold" />;
        if (rank === 1) return <Medal size={14} className="rank-icon silver" />;
        if (rank === 2) return <Award size={14} className="rank-icon bronze" />;
        return <span className="rank-num">#{rank + 1}</span>;
    };

    const maxCpu = Math.max(...servicesData.map(s => s.cpu));
    const maxMem = Math.max(...servicesData.map(s => s.memory));
    const maxTasks = Math.max(...servicesData.map(s => s.taskCount));

    return (
        <div className="service-details-page">
            {/* Background */}
            <div className="sd-bg-grid" />
            <div className="sd-ambient-1" />
            <div className="sd-ambient-2" />

            <div className="sd-content">
                {/* Breadcrumb */}
                <div className="sd-breadcrumb">
                    <button
                        className="sd-back-btn"
                        onClick={() => navigate(`/analytics/ecs/cluster/${clusterName}`, {
                            state: { cluster: { clusterName }, selectedRange }
                        })}
                    >
                        <ArrowLeft size={16} />
                        <span>{clusterName}</span>
                    </button>
                    <ChevronRight size={14} className="sd-breadcrumb-sep" />
                    <span className="sd-breadcrumb-current">
                        {dayData?.day || 'Services'}
                    </span>
                </div>

                {/* Header */}
                <div className="sd-header">
                    <div className="sd-header-left">
                        <div className="sd-header-icon">
                            <Calendar size={26} />
                        </div>
                        <div>
                            <h1 className="sd-title">{formatDate(dayData?.date)}</h1>
                            <p className="sd-subtitle">{clusterName} · {servicesData.length} services active</p>
                        </div>
                    </div>
                    <div className="sd-header-stats">
                        <div className="sd-hstat">
                            <Cpu size={16} />
                            <span className="sd-hstat-val">{dayData?.avgCpu || 52.3}%</span>
                            <span className="sd-hstat-lbl">Avg CPU</span>
                        </div>
                        <div className="sd-hstat">
                            <MemoryStick size={16} />
                            <span className="sd-hstat-val">{dayData?.avgMemory || 68.4}%</span>
                            <span className="sd-hstat-lbl">Avg Memory</span>
                        </div>
                    </div>
                </div>

                {/* Section Label */}
                <div className="sd-section-label">
                    <Activity size={15} />
                    <span>Active Services — click "View 30-Day Trend" for historical data</span>
                </div>

                {/* Services Grid */}
                <div className="sd-services-grid">
                    {servicesData.map((service, index) => {
                        const [cpuC1, cpuC2] = getCpuColor(service.cpu);
                        const [memC1, memC2] = getMemColor(service.memory);
                        const cpuDash = service.cpu * 2.827;
                        const memDash = service.memory * 2.827;

                        return (
                            <div
                                key={service.serviceName}
                                className={`sd-service-card ${service.status}`}
                                style={{ animationDelay: `${index * 0.08}s` }}
                            >
                                {/* Top accent */}
                                <div className={`sd-card-accent ${service.status}`} />

                                {/* Header */}
                                <div className="sd-card-header">
                                    <div className="sd-service-name-wrap">
                                        <Activity size={16} className="sd-service-icon" />
                                        <span className="sd-service-name">{service.serviceName}</span>
                                    </div>
                                    <div className={`sd-status-badge ${service.status}`}>
                                        {service.status === 'healthy'
                                            ? <CheckCircle size={14} />
                                            : <AlertCircle size={14} />
                                        }
                                        <span>{service.status}</span>
                                    </div>
                                </div>

                                {/* Task Count */}
                                <div className="sd-task-count">
                                    <Zap size={14} />
                                    <span>{service.taskCount} tasks running</span>
                                </div>

                                {/* Gauge Row */}
                                <div className="sd-gauges">
                                    {/* CPU Gauge */}
                                    <div className="sd-gauge-wrap">
                                        <svg className="sd-gauge-svg" viewBox="0 0 100 100">
                                            <defs>
                                                <linearGradient id={`cpu-g-${index}`} x1="0%" y1="0%" x2="100%" y2="100%">
                                                    <stop offset="0%" stopColor={cpuC1} />
                                                    <stop offset="100%" stopColor={cpuC2} />
                                                </linearGradient>
                                            </defs>
                                            <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(148,163,184,0.1)" strokeWidth="10" />
                                            <circle
                                                cx="50" cy="50" r="45"
                                                fill="none"
                                                stroke={`url(#cpu-g-${index})`}
                                                strokeWidth="10"
                                                strokeDasharray={`${cpuDash}, 282.7`}
                                                strokeLinecap="round"
                                                transform="rotate(-90 50 50)"
                                            />
                                        </svg>
                                        <div className="sd-gauge-text">
                                            <div className="sd-gauge-val" style={{ color: cpuC1 }}>{service.cpu}%</div>
                                            <div className="sd-gauge-lbl">CPU</div>
                                        </div>
                                    </div>

                                    {/* Memory Gauge */}
                                    <div className="sd-gauge-wrap">
                                        <svg className="sd-gauge-svg" viewBox="0 0 100 100">
                                            <defs>
                                                <linearGradient id={`mem-g-${index}`} x1="0%" y1="0%" x2="100%" y2="100%">
                                                    <stop offset="0%" stopColor={memC1} />
                                                    <stop offset="100%" stopColor={memC2} />
                                                </linearGradient>
                                            </defs>
                                            <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(148,163,184,0.1)" strokeWidth="10" />
                                            <circle
                                                cx="50" cy="50" r="45"
                                                fill="none"
                                                stroke={`url(#mem-g-${index})`}
                                                strokeWidth="10"
                                                strokeDasharray={`${memDash}, 282.7`}
                                                strokeLinecap="round"
                                                transform="rotate(-90 50 50)"
                                            />
                                        </svg>
                                        <div className="sd-gauge-text">
                                            <div className="sd-gauge-val" style={{ color: memC1 }}>{service.memory}%</div>
                                            <div className="sd-gauge-lbl">Memory</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Graph Button */}
                                <button
                                    className="sd-graph-btn"
                                    onClick={() => handleViewGraph(service)}
                                >
                                    <BarChart3 size={16} />
                                    <span>View 30-Day Trend</span>
                                    <ChevronRight size={14} />
                                </button>
                            </div>
                        );
                    })}
                </div>

                {/* ── Service Comparison Table ── */}
                <div className="sd-comparison-section">
                    <div className="sd-comparison-header">
                        <div className="sd-section-label" style={{ margin: 0 }}>
                            <ArrowUpDown size={15} />
                            <span>Service Comparison — click column headers to sort</span>
                        </div>
                    </div>

                    <div className="sd-comparison-table">
                        {/* Table Head */}
                        <div className="sd-table-head">
                            <div className="sd-th rank-col">#</div>
                            <div className="sd-th name-col">Service</div>
                            <div className={`sd-th metric-col sortable ${sortBy === 'cpu' ? 'active-col' : ''}`} onClick={() => handleSort('cpu')}>
                                CPU <SortIcon col="cpu" />
                            </div>
                            <div className={`sd-th metric-col sortable ${sortBy === 'memory' ? 'active-col' : ''}`} onClick={() => handleSort('memory')}>
                                Memory <SortIcon col="memory" />
                            </div>
                            <div className={`sd-th tasks-col sortable ${sortBy === 'taskCount' ? 'active-col' : ''}`} onClick={() => handleSort('taskCount')}>
                                Tasks <SortIcon col="taskCount" />
                            </div>
                        </div>

                        {/* Table Rows */}
                        {sortedServices.map((service, rank) => (
                            <div
                                key={service.serviceName}
                                className={`sd-table-row ${rank === 0 ? 'top-rank' : ''} ${service.status}`}
                                style={{ animationDelay: `${rank * 0.06}s` }}
                            >
                                {/* Rank */}
                                <div className="sd-td rank-col">
                                    {getRankIcon(rank)}
                                </div>

                                {/* Name */}
                                <div className="sd-td name-col">
                                    <div className={`sd-row-dot ${service.status}`} />
                                    <span className="sd-row-name">{service.serviceName}</span>
                                </div>

                                {/* CPU */}
                                <div className="sd-td metric-col">
                                    <div className="sd-inline-bar-wrap">
                                        <div
                                            className={`sd-inline-bar ${getBarColor(service.cpu, 'cpu')}`}
                                            style={{ width: `${(service.cpu / maxCpu) * 100}%` }}
                                        />
                                    </div>
                                    <span className="sd-metric-val">{service.cpu}%</span>
                                </div>

                                {/* Memory */}
                                <div className="sd-td metric-col">
                                    <div className="sd-inline-bar-wrap">
                                        <div
                                            className={`sd-inline-bar mem ${getBarColor(service.memory, 'memory')}`}
                                            style={{ width: `${(service.memory / maxMem) * 100}%` }}
                                        />
                                    </div>
                                    <span className="sd-metric-val">{service.memory}%</span>
                                </div>

                                {/* Tasks */}
                                <div className="sd-td tasks-col">
                                    <div className="sd-task-badge">
                                        <Zap size={12} />
                                        <span>{service.taskCount}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Modal */}
            {showGraphModal && selectedService && (
                <CPUGraphModal
                    service={selectedService}
                    selectedDate={dayData?.date}
                    onClose={() => { setShowGraphModal(false); setSelectedService(null); }}
                />
            )}
        </div>
    );
}

export default ServiceDetails;
