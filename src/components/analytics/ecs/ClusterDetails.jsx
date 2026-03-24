import { useState, useMemo, useEffect } from 'react';
import { useParams, useLocation, useNavigate, useOutletContext } from 'react-router-dom';
import {
    ArrowLeft, Activity, DollarSign, Calendar, Cpu, TrendingUp, TrendingDown,
    Minus, ChevronRight, MemoryStick, Clock, Server, ArrowUpDown,
    ChevronUp, ChevronDown, Download
} from 'lucide-react';
import CPUGraphModal from './CPUGraphModal';
import ComparisonTable from '../ComparisonTable';
import ECSIcon from '../../common/ECSIcon';
import '../../../css/analytics/ecs/ClusterDetails.css';
import '../../../css/analytics/comparison-table.css';

function ClusterDetails() {
    const { clusterName } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const { cluster, selectedRange } = location.state || {};
    const { setBgContext } = useOutletContext();

    useEffect(() => {
        setBgContext('analytics');
        return () => setBgContext('default');
    }, [setBgContext]);

    const dailyData = [
        { date: '2026-02-16', day: 'Sunday', servicesActive: 18, avgCpu: 52.3, avgMemory: 68.4, approxCost: 187.50, trend: 'up' },
        { date: '2026-02-15', day: 'Saturday', servicesActive: 16, avgCpu: 48.1, avgMemory: 64.2, approxCost: 165.80, trend: 'down' },
        { date: '2026-02-14', day: 'Friday', servicesActive: 24, avgCpu: 61.7, avgMemory: 75.3, approxCost: 245.20, trend: 'up' },
        { date: '2026-02-13', day: 'Thursday', servicesActive: 22, avgCpu: 58.9, avgMemory: 71.8, approxCost: 228.40, trend: 'stable' },
        { date: '2026-02-12', day: 'Wednesday', servicesActive: 21, avgCpu: 55.4, avgMemory: 69.1, approxCost: 215.60, trend: 'up' },
        { date: '2026-02-11', day: 'Tuesday', servicesActive: 19, avgCpu: 51.2, avgMemory: 66.5, approxCost: 195.30, trend: 'down' },
        { date: '2026-02-10', day: 'Monday', servicesActive: 20, avgCpu: 54.8, avgMemory: 68.9, approxCost: 205.70, trend: 'up' },
    ];

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


    return (
        <div className="cluster-details-page">
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
                            <ECSIcon size={40} color="inherit" />
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
                {/* <div className="cd-sparkline-panel">
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
                        ))} */}
                {/* </div>
                </div> */}

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

                <ComparisonTable
                    title="Day Comparison"
                    subtitle="Click any col header to sort"
                    data={dailyData}
                    exportFilename="day-comparison.csv"
                    gridTemplateColumns="52px minmax(0, 1fr) 100px 120px 120px 120px 120px"
                    onRowClick={handleDateClick}
                    columns={[
                        {
                            key: 'date',
                            label: 'Date',
                            sortable: true,
                            type: 'date'
                        },
                        {
                            key: 'day',
                            label: 'Day',
                            type: 'day',
                            align: 'right'
                        },
                        {
                            key: 'avgCpu',
                            label: 'CPU',
                            icon: Cpu,
                            sortable: true,
                            align: 'right',
                            type: 'cpu',
                            noThreshold: true
                        },
                        {
                            key: 'avgMemory',
                            label: 'Memory',
                            icon: MemoryStick,
                            sortable: true,
                            align: 'right',
                            type: 'memory',
                            noThreshold: true
                        },
                        {
                            key: 'servicesActive',
                            label: 'Services',
                            icon: Server,
                            sortable: true,
                            align: 'right',
                            type: 'badge-svc'
                        },
                        {
                            key: 'approxCost',
                            label: 'Cost',
                            icon: DollarSign,
                            sortable: true,
                            align: 'right',
                            type: 'cost'
                        }
                    ]}
                />

            </div>
        </div>
    );
}

export default ClusterDetails;
