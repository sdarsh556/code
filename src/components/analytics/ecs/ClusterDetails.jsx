import { useState, useMemo } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Activity, DollarSign, Calendar, Cpu, TrendingUp, TrendingDown,
    Minus, ChevronRight, MemoryStick, Clock, Server, ArrowUpDown, Trophy, Medal, Award
} from 'lucide-react';
import '../../../css/analytics/ecs/ClusterDetails.css';

function ClusterDetails() {
    const { clusterName } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const { cluster, selectedRange } = location.state || {};

    const [sortBy, setSortBy] = useState('cpu');
    const [sortDir, setSortDir] = useState('desc');

    const handleSort = (col) => {
        if (sortBy === col) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
        else { setSortBy(col); setSortDir('desc'); }
    };

    const SortIcon = ({ col }) => {
        const active = sortBy === col;
        return <span className={`sort-arrow ${active ? 'active' : ''}`}>{active && sortDir === 'asc' ? '↑' : '↓'}</span>;
    };

    const dailyData = [
        { date: '2026-02-16', day: 'Sunday', servicesActive: 18, avgCpu: 52.3, avgMemory: 68.4, approxCost: 187.50, trend: 'up' },
        { date: '2026-02-15', day: 'Saturday', servicesActive: 16, avgCpu: 48.1, avgMemory: 64.2, approxCost: 165.80, trend: 'down' },
        { date: '2026-02-14', day: 'Friday', servicesActive: 24, avgCpu: 61.7, avgMemory: 75.3, approxCost: 245.20, trend: 'up' },
        { date: '2026-02-13', day: 'Thursday', servicesActive: 22, avgCpu: 58.9, avgMemory: 71.8, approxCost: 228.40, trend: 'stable' },
        { date: '2026-02-12', day: 'Wednesday', servicesActive: 21, avgCpu: 55.4, avgMemory: 69.1, approxCost: 215.60, trend: 'up' },
        { date: '2026-02-11', day: 'Tuesday', servicesActive: 19, avgCpu: 51.2, avgMemory: 66.5, approxCost: 195.30, trend: 'down' },
        { date: '2026-02-10', day: 'Monday', servicesActive: 20, avgCpu: 54.8, avgMemory: 68.9, approxCost: 205.70, trend: 'up' },
    ];

    const sortedDays = useMemo(() => {
        return [...dailyData].sort((a, b) => {
            let av, bv;
            if (sortBy === 'cpu') { av = a.avgCpu; bv = b.avgCpu; }
            else if (sortBy === 'memory') { av = a.avgMemory; bv = b.avgMemory; }
            else if (sortBy === 'services') { av = a.servicesActive; bv = b.servicesActive; }
            else { av = a.approxCost; bv = b.approxCost; }
            return sortDir === 'desc' ? bv - av : av - bv;
        });
    }, [sortBy, sortDir]);

    const maxCpu = Math.max(...dailyData.map(d => d.avgCpu));
    const maxMem = Math.max(...dailyData.map(d => d.avgMemory));
    const maxServices = Math.max(...dailyData.map(d => d.servicesActive));
    const maxCost = Math.max(...dailyData.map(d => d.approxCost));

    const handleDateClick = (dayData) => {
        navigate(`/analytics/ecs/cluster/${clusterName}/services`, {
            state: { dayData, clusterName, selectedRange }
        });
    };

    const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    const getTrendIcon = (trend) => {
        if (trend === 'up') return <TrendingUp size={14} />;
        if (trend === 'down') return <TrendingDown size={14} />;
        return <Minus size={14} />;
    };

    const getBarClass = (val, max) => {
        const pct = (val / max) * 100;
        if (pct > 80) return 'bar-danger';
        if (pct > 55) return 'bar-warning';
        return 'bar-ok';
    };

    const getRankIcon = (rank) => {
        if (rank === 0) return <Trophy size={14} className="rank-icon gold" />;
        if (rank === 1) return <Medal size={14} className="rank-icon silver" />;
        if (rank === 2) return <Award size={14} className="rank-icon bronze" />;
        return <span className="rank-num">#{rank + 1}</span>;
    };

    return (
        <div className="cluster-details-page">
            {/* Background */}
            <div className="cd-bg-grid" />
            <div className="cd-ambient-1" />
            <div className="cd-ambient-2" />

            <div className="cd-content">
                {/* Breadcrumb */}
                <div className="cd-breadcrumb">
                    <button className="cd-back-btn" onClick={() => navigate('/analytics/ecs')}>
                        <ArrowLeft size={16} />
                        <span>ECS Analytics</span>
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
                            <h1 className="cd-title">{clusterName}</h1>
                            <p className="cd-subtitle">Daily performance breakdown</p>
                        </div>
                    </div>

                    {/* Summary Pills */}
                    <div className="cd-summary-pills">
                        <div className="cd-pill">
                            <Clock size={16} />
                            <span className="cd-pill-value">{cluster?.activeDays || 7}</span>
                            <span className="cd-pill-label">Days Active</span>
                        </div>
                        <div className="cd-pill">
                            <Server size={16} />
                            <span className="cd-pill-value">{cluster?.totalServices || 24}</span>
                            <span className="cd-pill-label">Services</span>
                        </div>
                        <div className="cd-pill cost-pill">
                            <DollarSign size={16} />
                            <span className="cd-pill-value">${cluster?.approxCost?.toFixed(0) || '1,248'}</span>
                            <span className="cd-pill-label">Total Cost</span>
                        </div>
                    </div>
                </div>

                {/* Mini Sparkline Chart */}
                <div className="cd-sparkline-panel">
                    <div className="sparkline-header">
                        <span className="sparkline-title">CPU Trend — Last 7 Days</span>
                        <span className="sparkline-hint">Click any day card below for details</span>
                    </div>
                    <div className="sparkline-chart">
                        {dailyData.slice().reverse().map((day) => (
                            <div key={day.date} className="sparkline-col" onClick={() => handleDateClick(day)}>
                                <div className="sparkline-bar-wrap">
                                    <div
                                        className="sparkline-bar"
                                        style={{ height: `${(day.avgCpu / maxCpu) * 100}%` }}
                                        title={`${day.avgCpu}%`}
                                    />
                                </div>
                                <div className="sparkline-label">{formatDate(day.date)}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Day Cards */}
                <div className="cd-section-label">
                    <Calendar size={15} />
                    <span>Daily Breakdown — click any day to view services</span>
                </div>

                <div className="cd-days-grid">
                    {dailyData.map((day, index) => (
                        <div
                            key={day.date}
                            className={`cd-day-card trend-${day.trend}`}
                            onClick={() => handleDateClick(day)}
                            style={{ animationDelay: `${index * 0.08}s` }}
                        >
                            <div className={`cd-day-accent trend-${day.trend}`} />

                            <div className="cd-day-top">
                                <div className="cd-date-block">
                                    <div className="cd-date-num">{new Date(day.date).getDate()}</div>
                                    <div className="cd-date-info">
                                        <div className="cd-date-month">{new Date(day.date).toLocaleDateString('en-US', { month: 'short' })}</div>
                                        <div className="cd-date-day">{day.day}</div>
                                    </div>
                                </div>
                                <div className={`cd-trend-badge trend-${day.trend}`}>
                                    {getTrendIcon(day.trend)}
                                </div>
                            </div>

                            <div className="cd-metrics-row">
                                <div className="cd-metric">
                                    <div className="cd-metric-icon services-icon"><Server size={13} /></div>
                                    <div className="cd-metric-val">{day.servicesActive}</div>
                                    <div className="cd-metric-lbl">Services</div>
                                </div>
                                <div className="cd-metric-divider" />
                                <div className="cd-metric">
                                    <div className="cd-metric-icon cpu-icon"><Cpu size={13} /></div>
                                    <div className="cd-metric-val">{day.avgCpu}%</div>
                                    <div className="cd-metric-lbl">CPU</div>
                                </div>
                                <div className="cd-metric-divider" />
                                <div className="cd-metric">
                                    <div className="cd-metric-icon mem-icon"><MemoryStick size={13} /></div>
                                    <div className="cd-metric-val">{day.avgMemory}%</div>
                                    <div className="cd-metric-lbl">Memory</div>
                                </div>
                                <div className="cd-metric-divider" />
                                <div className="cd-metric">
                                    <div className="cd-metric-icon cost-icon"><DollarSign size={13} /></div>
                                    <div className="cd-metric-val">${day.approxCost.toFixed(0)}</div>
                                    <div className="cd-metric-lbl">Cost</div>
                                </div>
                            </div>

                            <div className="cd-inline-bars">
                                <div className="cd-inline-bar-row">
                                    <span>CPU</span>
                                    <div className="cd-bar-track">
                                        <div className="cd-bar-fill cpu" style={{ width: `${day.avgCpu}%` }} />
                                    </div>
                                    <span>{day.avgCpu}%</span>
                                </div>
                                <div className="cd-inline-bar-row">
                                    <span>MEM</span>
                                    <div className="cd-bar-track">
                                        <div className="cd-bar-fill mem" style={{ width: `${day.avgMemory}%` }} />
                                    </div>
                                    <span>{day.avgMemory}%</span>
                                </div>
                            </div>

                            <div className="cd-day-footer">
                                <span>View Services</span>
                                <ChevronRight size={15} />
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── Day Comparison Table ── */}
                <div className="cd-comparison-section">
                    <div className="cd-comparison-header">
                        <div className="cd-section-label" style={{ margin: 0 }}>
                            <ArrowUpDown size={15} />
                            <span>Day Comparison — click column headers to sort</span>
                        </div>
                    </div>

                    <div className="cd-comparison-table">
                        {/* Head */}
                        <div className="cd-table-head">
                            <div className="cd-th rank-col">#</div>
                            <div className="cd-th date-col">Date</div>
                            <div className={`cd-th metric-col sortable ${sortBy === 'cpu' ? 'active-col' : ''}`} onClick={() => handleSort('cpu')}>
                                CPU <SortIcon col="cpu" />
                            </div>
                            <div className={`cd-th metric-col sortable ${sortBy === 'memory' ? 'active-col' : ''}`} onClick={() => handleSort('memory')}>
                                Memory <SortIcon col="memory" />
                            </div>
                            <div className={`cd-th svc-col sortable ${sortBy === 'services' ? 'active-col' : ''}`} onClick={() => handleSort('services')}>
                                Services <SortIcon col="services" />
                            </div>
                            <div className={`cd-th cost-col sortable ${sortBy === 'cost' ? 'active-col' : ''}`} onClick={() => handleSort('cost')}>
                                Cost <SortIcon col="cost" />
                            </div>
                        </div>

                        {/* Rows */}
                        {sortedDays.map((day, rank) => (
                            <div
                                key={day.date}
                                className={`cd-table-row ${rank === 0 ? 'top-rank' : ''}`}
                                onClick={() => handleDateClick(day)}
                                style={{ animationDelay: `${rank * 0.05}s` }}
                            >
                                <div className="cd-td rank-col">{getRankIcon(rank)}</div>

                                <div className="cd-td date-col">
                                    <div className="cd-row-date-num">{new Date(day.date).getDate()}</div>
                                    <div className="cd-row-date-info">
                                        <span className="cd-row-month">{new Date(day.date).toLocaleDateString('en-US', { month: 'short' })}</span>
                                        <span className="cd-row-day">{day.day.slice(0, 3)}</span>
                                    </div>
                                </div>

                                <div className="cd-td metric-col">
                                    <div className="cd-tbl-bar-wrap">
                                        <div className={`cd-tbl-bar ${getBarClass(day.avgCpu, maxCpu)}`}
                                            style={{ width: `${(day.avgCpu / maxCpu) * 100}%` }} />
                                    </div>
                                    <span className="cd-tbl-val">{day.avgCpu}%</span>
                                </div>

                                <div className="cd-td metric-col">
                                    <div className="cd-tbl-bar-wrap">
                                        <div className={`cd-tbl-bar mem ${getBarClass(day.avgMemory, maxMem)}`}
                                            style={{ width: `${(day.avgMemory / maxMem) * 100}%` }} />
                                    </div>
                                    <span className="cd-tbl-val">{day.avgMemory}%</span>
                                </div>

                                <div className="cd-td svc-col">
                                    <div className="cd-svc-badge">
                                        <Server size={11} />
                                        <span>{day.servicesActive}</span>
                                    </div>
                                </div>

                                <div className="cd-td cost-col">
                                    <span className="cd-cost-val">${day.approxCost.toFixed(0)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ClusterDetails;
