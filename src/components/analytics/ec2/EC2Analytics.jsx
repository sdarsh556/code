import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
    Clock, DollarSign, Activity, Cpu, TrendingUp, Zap,
    ArrowRight, ChevronLeft, ChevronRight, Calendar, Server,
    SearchX, RefreshCw, TrendingDown, Minus, Download, BarChart3
} from 'lucide-react';
import '../../../css/analytics/ec2/EC2Analytics.css';
import '../../../css/analytics/comparison-table.css';
import ComparisonTable from '../ComparisonTable';

// ─── Custom Calendar Picker ───────────────────────────────────────────────────
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

// ─── Main Component ───────────────────────────────────────────────────────────
function EC2Analytics() {
    const navigate = useNavigate();
    const [selectedRange, setSelectedRange] = useState('7d');
    const [showCalendar, setShowCalendar] = useState(false);
    const [customRange, setCustomRange] = useState(null);
    const [selectedDaysInfo, setSelectedDaysInfo] = useState(null);

    const datePresets = [
        { id: '24h', label: '24H', days: 1 },
        { id: '7d', label: '7D', days: 7 },
        { id: '15d', label: '15D', days: 15 },
        { id: '30d', label: '30D', days: 30 },
    ];

    const allInstanceData = [
        { instanceName: 'prod-api-server', instanceId: 'i-0a2b3c4d5e6f7g8h9', approxCost: 1247.50, activeDays: 7, avgCpu: 45.2, status: 'healthy', trend: 'up', minDays: 1 },
        { instanceName: 'staging-worker-01', instanceId: 'i-1a2b3c4d5e6f7g8h9', approxCost: 423.20, activeDays: 5, avgCpu: 32.1, status: 'healthy', trend: 'stable', minDays: 7 },
        { instanceName: 'dev-db-replica', instanceId: 'i-2a2b3c4d5e6f7g8h9', approxCost: 156.80, activeDays: 3, avgCpu: 28.5, status: 'warning', trend: 'down', minDays: 15 },
        { instanceName: 'test-cache-node', instanceId: 'i-3a2b3c4d5e6f7g8h9', approxCost: 89.40, activeDays: 2, avgCpu: 18.9, status: 'healthy', trend: 'up', minDays: 30 },
    ];

    const { setBgContext } = useOutletContext();

    useEffect(() => {
        setBgContext('analytics');
        return () => setBgContext('default');
    }, [setBgContext]);

    // Filter instances based on selected range
    const instanceData = useMemo(() => {
        const days = selectedRange === 'custom'
            ? (customRange ? Math.ceil((customRange.end - customRange.start) / (1000 * 60 * 60 * 24)) : 0)
            : (datePresets.find(p => p.id === selectedRange)?.days || 7);
        if (selectedRange === '24h') return [];
        return allInstanceData.filter(c => c.minDays <= days);
    }, [selectedRange, customRange]);

    const summaryStats = useMemo(() => ({
        totalInstances: instanceData.length,
        totalCost: instanceData.reduce((s, c) => s + c.approxCost, 0),
        avgCpu: instanceData.length ? (instanceData.reduce((s, c) => s + c.avgCpu, 0) / instanceData.length).toFixed(1) : 0,
    }), [instanceData]);

    const handleInstanceClick = (instance) => {
        navigate(`/analytics/ec2/instance/${instance.instanceId}`, { state: { instance } });
    };

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

    const handleExportAll = () => {
        const headers = ['Instance Name', 'Instance ID', 'Active Days', 'CPU (%)', 'Total Cost ($)'];
        const csvRows = [headers.join(',')];

        instanceData.forEach(inst => {
            const row = [
                `"${inst.instanceName}"`,
                `"${inst.instanceId}"`,
                inst.activeDays,
                inst.avgCpu,
                inst.approxCost.toFixed(2)
            ];
            csvRows.push(row.join(','));
        });

        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `ec2-analytics-export-${selectedRange}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const metricCards = [
        { label: 'Active Instances', value: summaryStats.totalInstances, icon: Server, color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)', bars: [65, 45, 78, 90, 55] },
        { label: 'Total active days', value: instanceData.reduce((s, c) => s + c.activeDays, 0), icon: Activity, color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', trend: '+12%' },
        { label: 'Total Cost', value: `$${summaryStats.totalCost.toFixed(0)}`, icon: DollarSign, color: '#10b981', bg: 'rgba(16,185,129,0.1)', progress: 68 },
        { label: 'Avg CPU', value: `${summaryStats.avgCpu}%`, icon: Cpu, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', circle: summaryStats.avgCpu },
    ];

    return (
        <div className="ec2-analytics-page">
            <div className="ec2-analytics-content">
                {/* ── Header ── */}
                <div className="ec2-page-header">
                    <div className="ec2-header-left">
                        <div className="ec2-header-icon">
                            <Server size={28} />
                            <div className="ec2-icon-ring" />
                        </div>
                        <div>
                            <h1 className="ec2-page-title">EC2 Analytics</h1>
                            <p className="ec2-page-sub">Instance fleet performance & cost intelligence</p>
                        </div>
                    </div>

                    <div className="time-selector-wrap" style={{ gap: '1rem' }}>
                        <button
                            className="ec2-export-all-btn"
                            onClick={handleExportAll}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.625rem',
                                padding: '0.75rem 1.25rem',
                                background: 'rgba(139, 92, 246, 0.1)',
                                border: '1px solid rgba(139, 92, 246, 0.25)',
                                borderRadius: '1rem',
                                color: '#8b5cf6',
                                fontSize: '0.85rem',
                                fontWeight: '800',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <Download size={16} />
                            <span>Export Comprehensive Insight</span>
                        </button>

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

                {/* ── Metric Cards ── */}
                <div className="metric-cards-row">
                    {metricCards.map((card, i) => {
                        const Icon = card.icon;
                        return (
                            <div key={i} className="metric-card-new" style={{ '--mc': card.color, '--mc-bg': card.bg, animationDelay: `${i * 0.1}s` }}>
                                <div className="mc-top-accent" />
                                <div className="mc-icon"><Icon size={24} /></div>
                                <div className="mc-value">{card.value}</div>
                                <div className="mc-label">{card.label}</div>
                                {card.bars && (
                                    <div className="mc-mini-bars">
                                        {card.bars.map((h, j) => (
                                            <div key={j} className="mc-bar" style={{ height: `${h}%` }} />
                                        ))}
                                    </div>
                                )}
                                {card.trend && (
                                    <div className="mc-trend">
                                        <TrendingUp size={14} />
                                        {card.trend}
                                    </div>
                                )}
                                {card.progress !== undefined && (
                                    <div className="mc-progress-track">
                                        <div className="mc-progress-fill" style={{ width: `${card.progress}%` }} />
                                    </div>
                                )}
                                {card.circle !== undefined && (
                                    <svg className="mc-circle-svg" viewBox="0 0 36 36">
                                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                            fill="none" stroke="rgba(245,158,11,0.15)" strokeWidth="3" />
                                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                            fill="none" stroke="#f59e0b" strokeWidth="3"
                                            strokeDasharray={`${card.circle}, 100`}
                                            strokeLinecap="round" />
                                    </svg>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* ── Instances Panel ── */}
                <div className="ec2-instances-panel">
                    <div className="panel-header-new">
                        <div className="panel-title-group">
                            <Zap size={20} className="panel-title-icon" />
                            <h2>Active Instances</h2>
                            <span className="panel-period-badge">{getActiveLabel()}</span>
                        </div>
                        <div className="panel-subtitle">Click an instance to view detailed metrics</div>
                    </div>

                    <div className="instances-grid">
                        {instanceData.length === 0 ? (
                            <div className="instances-empty-state">
                                <div className="empty-icon-wrap">
                                    <SearchX size={48} className="empty-icon" />
                                    <div className="empty-icon-ring" />
                                </div>
                                <h3 className="empty-title">No instances found</h3>
                                <p className="empty-desc">
                                    No EC2 instances were active during the selected time range.<br />
                                    Try expanding the date range or selecting a different period.
                                </p>
                                <button
                                    className="empty-reset-btn"
                                    onClick={() => { setSelectedRange('7d'); setCustomRange(null); }}
                                >
                                    <RefreshCw size={15} />
                                    Reset to Last 7 Days
                                </button>
                            </div>
                        ) : (
                            instanceData.map((instance, index) => (
                                <div
                                    key={instance.instanceId}
                                    className={`instance-card ${instance.status}`}
                                    onClick={() => handleInstanceClick(instance)}
                                    style={{ animationDelay: `${0.3 + index * 0.1}s`, cursor: 'pointer' }}
                                >
                                    <div className={`instance-status-glow ${instance.status}`} />

                                    <div className="instance-card-top">
                                        <div className="instance-name-info">
                                            <div className="instance-status-row">
                                                <div className={`instance-status-dot ${instance.status}`} />
                                                <span
                                                    className="instance-name-text"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleInstanceClick(instance);
                                                    }}
                                                >
                                                    {instance.instanceName}
                                                </span>
                                            </div>
                                            <div className="instance-id-text">{instance.instanceId}</div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <button
                                                className="instance-graph-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleInstanceClick(instance);
                                                }}
                                                title="View 30-Day Trend"
                                            >
                                                <BarChart3 size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="instance-stats-row">
                                        <div className="instance-stat-item">
                                            <div className="isi-icon"><Clock size={14} /></div>
                                            <div className="isi-value">{instance.activeDays}d</div>
                                            <div className="isi-label">Active</div>
                                        </div>
                                        <div className="instance-stat-divider" />
                                        <div
                                            className="instance-stat-item clickable-calendar"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                // Calculate dates for the display
                                                const dates = [];
                                                for (let i = 0; i < instance.activeDays; i++) {
                                                    const d = new Date();
                                                    d.setDate(d.getDate() - i);
                                                    dates.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }));
                                                }
                                                setSelectedDaysInfo({
                                                    name: instance.instanceName,
                                                    id: instance.instanceId,
                                                    days: instance.activeDays,
                                                    dates: dates
                                                });
                                            }}
                                        >
                                            <div className="isi-icon"><Calendar size={14} /></div>
                                            <div className="isi-value">View</div>
                                            <div className="isi-label">Days Active</div>
                                        </div>
                                        <div className="instance-stat-divider" />
                                        <div className="instance-stat-item">
                                            <div className="isi-icon"><DollarSign size={14} /></div>
                                            <div className="isi-value">${instance.approxCost.toFixed(0)}</div>
                                            <div className="isi-label">Instance Cost</div>
                                        </div>
                                    </div>

                                    <div className="instance-resource-bars">
                                        <div className="resource-bar-item">
                                            <div className="rb-header">
                                                <span className="rb-label"><Cpu size={12} /> CPU Bar</span>
                                                <span className="rb-value">{instance.avgCpu}%</span>
                                            </div>
                                            <div className="rb-track">
                                                <div className="rb-fill cpu-fill" style={{ width: `${instance.avgCpu}%` }} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* ── Table ── */}
                {instanceData.length > 0 && (
                    <ComparisonTable
                        title="Instance Comparison"
                        subtitle="Click any column header to sort"
                        data={instanceData.map(c => ({
                            ...c,
                            id: c.instanceId
                        }))}
                        exportFilename="instance-comparison.csv"
                        gridTemplateColumns="52px 2fr 1fr 1fr 1.2fr"
                        columns={[
                            {
                                key: 'instanceName',
                                label: 'Instance',
                                type: 'status-name',
                                sortable: true
                            },
                            {
                                key: 'avgCpu',
                                label: 'CPU Usage',
                                icon: Cpu,
                                type: 'cpu',
                                sortable: true,
                                align: 'center'
                            },
                            {
                                key: 'approxCost',
                                label: 'Cost',
                                icon: DollarSign,
                                type: 'cost',
                                sortable: true,
                                align: 'center'
                            },
                            {
                                key: 'activeDays',
                                label: 'Days Active',
                                icon: Clock,
                                sortable: true,
                                align: 'center',
                                render: (val) => <span className="cmp-active-days-pill">{val}d</span>
                            }
                        ]}
                    />
                )}
            </div>

            {showCalendar && (
                <CalendarPicker
                    onRangeSelect={handleCustomRange}
                    onClose={() => setShowCalendar(false)}
                />
            )}

            {selectedDaysInfo && (
                <div className="days-info-overlay" onClick={() => setSelectedDaysInfo(null)}>
                    <div className="days-info-modal" onClick={e => e.stopPropagation()}>
                        <div className="dim-header">
                            <Calendar size={24} className="dim-icon" />
                            <div>
                                <div className="dim-title">Active Timeline</div>
                                <div className="dim-subtitle">{selectedDaysInfo.name}</div>
                            </div>
                        </div>
                        <div className="dim-content">
                            <div className="dim-value">{selectedDaysInfo.days}</div>
                            <div className="dim-label">Days Active</div>
                            <div className="dim-dates-list">
                                {selectedDaysInfo.dates.map((date, idx) => (
                                    <div key={idx} className="dim-date-chip">{date}</div>
                                ))}
                            </div>
                        </div>
                        <button className="dim-close-btn" onClick={() => setSelectedDaysInfo(null)}>Got it</button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default EC2Analytics;
