import { useState, useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
    ArrowLeft, Calendar, Cpu, Activity, BarChart3, Zap,
    CheckCircle, AlertCircle, ChevronRight, MemoryStick,
    ArrowUpDown, Trophy, Medal, Award, ChevronUp, ChevronDown, Download
} from 'lucide-react';
import CPUGraphModal from './CPUGraphModal';
import '../../../css/analytics/ecs/ServiceDetails.css';
import '../../../css/analytics/ecs/comparison-table.css';

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
                    <div className="cmp-panel-header">
                        <div className="cmp-panel-title">
                            <div className="cmp-panel-icon"><ArrowUpDown size={16} /></div>
                            <div>
                                <div className="cmp-panel-label">Service Comparison</div>
                                <div className="cmp-panel-sub">Click any column header to sort · {sortedServices.length} services</div>
                            </div>
                        </div>
                        <button
                            className="cmp-download-btn"
                            onClick={() => {
                                const rows = [['Rank', 'Service', 'CPU (%)', 'Memory (%)', 'Tasks', 'Status']];
                                sortedServices.forEach((s, i) => rows.push([i + 1, s.serviceName, s.cpu, s.memory, s.taskCount, s.status]));
                                const csv = rows.map(r => r.join(',')).join('\n');
                                const a = document.createElement('a');
                                a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
                                a.download = 'service-comparison.csv';
                                a.click();
                            }}
                        >
                            <Download size={14} />
                            <span>Export Excel</span>
                        </button>
                    </div>

                    <div className="cmp-table-wrap">
                        {/* Table Head */}
                        <div className="cmp-thead cmp-service-grid">
                            <div className="cmp-th cmp-th-rank">#</div>
                            <div className="cmp-th cmp-th-name">Service</div>
                            <button className={`cmp-th cmp-th-sortable ${sortBy === 'cpu' ? 'cmp-th-active' : ''}`} onClick={() => handleSort('cpu')}>
                                <Cpu size={12} />
                                <span>CPU</span>
                                <span className="cmp-sort-icons">
                                    <ChevronUp size={11} className={sortBy === 'cpu' && sortDir === 'asc' ? 'cmp-sort-on' : 'cmp-sort-off'} />
                                    <ChevronDown size={11} className={sortBy === 'cpu' && sortDir === 'desc' ? 'cmp-sort-on' : 'cmp-sort-off'} />
                                </span>
                            </button>
                            <button className={`cmp-th cmp-th-sortable ${sortBy === 'memory' ? 'cmp-th-active' : ''}`} onClick={() => handleSort('memory')}>
                                <MemoryStick size={12} />
                                <span>Memory</span>
                                <span className="cmp-sort-icons">
                                    <ChevronUp size={11} className={sortBy === 'memory' && sortDir === 'asc' ? 'cmp-sort-on' : 'cmp-sort-off'} />
                                    <ChevronDown size={11} className={sortBy === 'memory' && sortDir === 'desc' ? 'cmp-sort-on' : 'cmp-sort-off'} />
                                </span>
                            </button>
                            <button className={`cmp-th cmp-th-sortable ${sortBy === 'taskCount' ? 'cmp-th-active' : ''}`} onClick={() => handleSort('taskCount')}>
                                <Zap size={12} />
                                <span>Tasks</span>
                                <span className="cmp-sort-icons">
                                    <ChevronUp size={11} className={sortBy === 'taskCount' && sortDir === 'asc' ? 'cmp-sort-on' : 'cmp-sort-off'} />
                                    <ChevronDown size={11} className={sortBy === 'taskCount' && sortDir === 'desc' ? 'cmp-sort-on' : 'cmp-sort-off'} />
                                </span>
                            </button>
                        </div>

                        {/* Table Rows */}
                        <div className="cmp-tbody">
                            {sortedServices.map((service, rank) => (
                                <div
                                    key={service.serviceName}
                                    className={`cmp-row cmp-service-grid ${rank === 0 ? 'cmp-row-top' : ''} ${rank % 2 === 1 ? 'cmp-row-alt' : ''}`}
                                    style={{ animationDelay: `${rank * 0.06}s` }}
                                >
                                    <div className="cmp-td cmp-td-rank">{getRankIcon(rank)}</div>

                                    <div className="cmp-td cmp-td-name">
                                        <div className={`cmp-status-dot ${service.status}`} />
                                        <span className="cmp-name-text">{service.serviceName}</span>
                                    </div>

                                    <div className="cmp-td">
                                        <span className={`cmp-chip cmp-chip-cpu ${service.cpu > 55 ? 'cmp-chip-warn' : ''} ${service.cpu > 70 ? 'cmp-chip-danger' : ''}`}>
                                            {service.cpu}%
                                        </span>
                                    </div>

                                    <div className="cmp-td">
                                        <span className={`cmp-chip cmp-chip-mem ${service.memory > 65 ? 'cmp-chip-warn' : ''} ${service.memory > 80 ? 'cmp-chip-danger' : ''}`}>
                                            {service.memory}%
                                        </span>
                                    </div>

                                    <div className="cmp-td">
                                        <div className="cmp-task-badge">
                                            <Zap size={11} />
                                            <span>{service.taskCount}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
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
