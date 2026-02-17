import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Clock, DollarSign, Activity, Cpu, TrendingUp, Zap, ArrowRight } from 'lucide-react';
import '../../../css/analytics/ecs/ECSAnalytics.css';

function ECSAnalytics() {
    const navigate = useNavigate();
    const [selectedRange, setSelectedRange] = useState('7d');

    const datePresets = [
        { id: '24h', label: '24 Hours', days: 1 },
        { id: '7d', label: '7 Days', days: 7 },
        { id: '15d', label: '15 Days', days: 15 },
        { id: '30d', label: '30 Days', days: 30 }
    ];

    // Mock data
    const clusterData = [
        {
            clusterName: 'production-cluster',
            totalServices: 24,
            approxCost: 1247.50,
            activeDays: 7,
            avgCpu: 45.2,
            avgMemory: 62.8,
            status: 'healthy'
        },
        {
            clusterName: 'staging-cluster',
            totalServices: 12,
            approxCost: 423.20,
            activeDays: 5,
            avgCpu: 32.1,
            avgMemory: 48.3,
            status: 'healthy'
        },
        {
            clusterName: 'development-cluster',
            totalServices: 8,
            approxCost: 156.80,
            activeDays: 3,
            avgCpu: 28.5,
            avgMemory: 41.2,
            status: 'warning'
        },
        {
            clusterName: 'testing-cluster',
            totalServices: 6,
            approxCost: 89.40,
            activeDays: 2,
            avgCpu: 18.9,
            avgMemory: 35.6,
            status: 'healthy'
        }
    ];

    const summaryStats = useMemo(() => {
        return {
            totalClusters: clusterData.length,
            totalServices: clusterData.reduce((sum, c) => sum + c.totalServices, 0),
            totalCost: clusterData.reduce((sum, c) => sum + c.approxCost, 0),
            avgCpu: (clusterData.reduce((sum, c) => sum + c.avgCpu, 0) / clusterData.length).toFixed(1)
        };
    }, [clusterData]);

    const handleClusterClick = (cluster) => {
        navigate(`/analytics/ecs/cluster/${cluster.clusterName}`, {
            state: { cluster, selectedRange }
        });
    };

    return (
        <div className="ecs-analytics-spectacular">
            {/* Animated Background */}
            <div className="ecs-bg-pattern"></div>

            {/* Header */}
            <div className="ecs-header-spectacular">
                <div className="header-content">
                    <div className="header-icon-wrapper">
                        <Container size={32} />
                        <div className="icon-pulse"></div>
                    </div>
                    <div className="header-text">
                        <h1>ECS Analytics</h1>
                        <p>Container performance & cost insights</p>
                    </div>
                </div>
                <div className="time-selector">
                    {datePresets.map((preset) => (
                        <button
                            key={preset.id}
                            className={`time-btn ${selectedRange === preset.id ? 'active' : ''}`}
                            onClick={() => setSelectedRange(preset.id)}
                        >
                            <Clock size={16} />
                            <span>{preset.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Dashboard Grid */}
            <div className="dashboard-grid">
                {/* Metric Cards */}
                <div className="metric-card clusters-metric">
                    <div className="metric-icon">
                        <Container size={28} />
                    </div>
                    <div className="metric-content">
                        <div className="metric-value">{summaryStats.totalClusters}</div>
                        <div className="metric-label">Active Clusters</div>
                    </div>
                    <div className="metric-chart">
                        <div className="mini-bars">
                            {[65, 45, 78, 90].map((height, i) => (
                                <div key={i} className="mini-bar" style={{ height: `${height}%` }}></div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="metric-card services-metric">
                    <div className="metric-icon">
                        <Activity size={28} />
                    </div>
                    <div className="metric-content">
                        <div className="metric-value">{summaryStats.totalServices}</div>
                        <div className="metric-label">Total Services</div>
                    </div>
                    <div className="metric-trend">
                        <TrendingUp size={16} />
                        <span>+12%</span>
                    </div>
                </div>

                <div className="metric-card cost-metric">
                    <div className="metric-icon">
                        <DollarSign size={28} />
                    </div>
                    <div className="metric-content">
                        <div className="metric-value">${summaryStats.totalCost.toFixed(2)}</div>
                        <div className="metric-label">Total Cost</div>
                    </div>
                    <div className="metric-progress">
                        <div className="progress-bar" style={{ width: '68%' }}></div>
                    </div>
                </div>

                <div className="metric-card cpu-metric">
                    <div className="metric-icon">
                        <Cpu size={28} />
                    </div>
                    <div className="metric-content">
                        <div className="metric-value">{summaryStats.avgCpu}%</div>
                        <div className="metric-label">Avg CPU Usage</div>
                    </div>
                    <div className="metric-circle">
                        <svg viewBox="0 0 36 36">
                            <path
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke="rgba(59, 130, 246, 0.2)"
                                strokeWidth="3"
                            />
                            <path
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke="url(#gradient)"
                                strokeWidth="3"
                                strokeDasharray={`${summaryStats.avgCpu}, 100`}
                            />
                            <defs>
                                <linearGradient id="gradient">
                                    <stop offset="0%" stopColor="#3b82f6" />
                                    <stop offset="100%" stopColor="#8b5cf6" />
                                </linearGradient>
                            </defs>
                        </svg>
                    </div>
                </div>

                {/* Clusters List */}
                <div className="clusters-panel">
                    <div className="panel-header">
                        <h2>Cluster Performance</h2>
                        <Zap size={20} />
                    </div>
                    <div className="clusters-list">
                        {clusterData.map((cluster, index) => (
                            <div
                                key={cluster.clusterName}
                                className="cluster-item"
                                onClick={() => handleClusterClick(cluster)}
                                style={{ animationDelay: `${index * 0.1}s` }}
                            >
                                <div className="cluster-info">
                                    <div className="cluster-name">
                                        <Container size={18} />
                                        <span>{cluster.clusterName}</span>
                                    </div>
                                    <div className="cluster-meta">
                                        <span className="meta-item">
                                            <Activity size={14} />
                                            {cluster.totalServices} services
                                        </span>
                                        <span className="meta-item">
                                            <Clock size={14} />
                                            {cluster.activeDays}d active
                                        </span>
                                    </div>
                                </div>

                                <div className="cluster-metrics">
                                    <div className="metric-bar-group">
                                        <div className="metric-bar-label">
                                            <span>CPU</span>
                                            <span>{cluster.avgCpu}%</span>
                                        </div>
                                        <div className="metric-bar-track">
                                            <div className="metric-bar-fill cpu" style={{ width: `${cluster.avgCpu}%` }}></div>
                                        </div>
                                    </div>
                                    <div className="metric-bar-group">
                                        <div className="metric-bar-label">
                                            <span>Memory</span>
                                            <span>{cluster.avgMemory}%</span>
                                        </div>
                                        <div className="metric-bar-track">
                                            <div className="metric-bar-fill memory" style={{ width: `${cluster.avgMemory}%` }}></div>
                                        </div>
                                    </div>
                                </div>

                                <div className="cluster-cost">
                                    <DollarSign size={16} />
                                    <span>${cluster.approxCost.toFixed(2)}</span>
                                </div>

                                <div className="cluster-arrow">
                                    <ArrowRight size={20} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ECSAnalytics;
