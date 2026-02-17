import { useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, TrendingUp, TrendingDown, Minus, DollarSign, Activity } from 'lucide-react';
import '../../../css/analytics/ecs/ClusterDetails.css';

function ClusterDetails() {
    const { clusterName } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const { cluster, selectedRange } = location.state || {};

    // Mock daily data
    const dailyData = [
        { date: '2026-02-16', day: 'Sunday', servicesActive: 18, avgCpu: 52.3, avgMemory: 68.4, approxCost: 187.50, trend: 'up' },
        { date: '2026-02-15', day: 'Saturday', servicesActive: 16, avgCpu: 48.1, avgMemory: 64.2, approxCost: 165.80, trend: 'down' },
        { date: '2026-02-14', day: 'Friday', servicesActive: 24, avgCpu: 61.7, avgMemory: 75.3, approxCost: 245.20, trend: 'up' },
        { date: '2026-02-13', day: 'Thursday', servicesActive: 22, avgCpu: 58.9, avgMemory: 71.8, approxCost: 228.40, trend: 'stable' },
        { date: '2026-02-12', day: 'Wednesday', servicesActive: 21, avgCpu: 55.4, avgMemory: 69.1, approxCost: 215.60, trend: 'up' },
        { date: '2026-02-11', day: 'Tuesday', servicesActive: 19, avgCpu: 51.2, avgMemory: 66.5, approxCost: 195.30, trend: 'down' },
        { date: '2026-02-10', day: 'Monday', servicesActive: 20, avgCpu: 54.8, avgMemory: 68.9, approxCost: 205.70, trend: 'up' }
    ];

    const handleDateClick = (dayData) => {
        navigate(`/analytics/ecs/cluster/${clusterName}/services`, {
            state: { dayData, clusterName, selectedRange }
        });
    };

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const getTrendIcon = (trend) => {
        if (trend === 'up') return <TrendingUp size={16} />;
        if (trend === 'down') return <TrendingDown size={16} />;
        return <Minus size={16} />;
    };

    return (
        <div className="cluster-details-spectacular">
            {/* Background Pattern */}
            <div className="cluster-bg-pattern"></div>

            {/* Header */}
            <div className="cluster-header-spectacular">
                <button className="back-btn-spectacular" onClick={() => navigate('/analytics/ecs')}>
                    <ArrowLeft size={20} />
                    <span>Back</span>
                </button>

                <div className="cluster-title-section">
                    <div className="title-icon">
                        <Activity size={32} />
                        <div className="icon-glow-small"></div>
                    </div>
                    <div>
                        <h1>{clusterName}</h1>
                        <p>Daily performance breakdown</p>
                    </div>
                </div>

                <div className="cluster-summary-cards">
                    <div className="summary-card">
                        <div className="summary-value">{cluster?.activeDays || 7}</div>
                        <div className="summary-label">Days Active</div>
                    </div>
                    <div className="summary-card">
                        <div className="summary-value">{cluster?.totalServices || 24}</div>
                        <div className="summary-label">Services</div>
                    </div>
                    <div className="summary-card cost">
                        <div className="summary-value">${cluster?.approxCost?.toFixed(2) || '1,247.50'}</div>
                        <div className="summary-label">Total Cost</div>
                    </div>
                </div>
            </div>

            {/* Timeline */}
            <div className="timeline-container">
                {dailyData.map((day, index) => (
                    <div
                        key={day.date}
                        className="timeline-item"
                        onClick={() => handleDateClick(day)}
                        style={{ animationDelay: `${index * 0.1}s` }}
                    >
                        <div className="timeline-marker">
                            <div className="marker-dot"></div>
                            <div className="marker-line"></div>
                        </div>

                        <div className="timeline-card">
                            <div className="timeline-header">
                                <div className="date-info">
                                    <Calendar size={18} />
                                    <div>
                                        <div className="date-text">{formatDate(day.date)}</div>
                                        <div className="day-text">{day.day}</div>
                                    </div>
                                </div>
                                <div className={`trend-badge trend-${day.trend}`}>
                                    {getTrendIcon(day.trend)}
                                </div>
                            </div>

                            <div className="timeline-metrics">
                                <div className="metric-item">
                                    <div className="metric-label">Services Active</div>
                                    <div className="metric-value-large">{day.servicesActive}</div>
                                </div>

                                <div className="metric-item">
                                    <div className="metric-label">CPU Usage</div>
                                    <div className="metric-with-bar">
                                        <span className="metric-value-small">{day.avgCpu}%</span>
                                        <div className="mini-bar-track">
                                            <div className="mini-bar-fill cpu" style={{ width: `${day.avgCpu}%` }}></div>
                                        </div>
                                    </div>
                                </div>

                                <div className="metric-item">
                                    <div className="metric-label">Memory Usage</div>
                                    <div className="metric-with-bar">
                                        <span className="metric-value-small">{day.avgMemory}%</span>
                                        <div className="mini-bar-track">
                                            <div className="mini-bar-fill memory" style={{ width: `${day.avgMemory}%` }}></div>
                                        </div>
                                    </div>
                                </div>

                                <div className="metric-item cost-item">
                                    <div className="metric-label">Cost</div>
                                    <div className="cost-value">
                                        <DollarSign size={16} />
                                        <span>${day.approxCost.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="timeline-footer">
                                <span>View Services →</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default ClusterDetails;
