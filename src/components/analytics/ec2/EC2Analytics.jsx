import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
    Clock, DollarSign, Activity, Cpu, TrendingUp, Zap,
    ArrowRight, ChevronLeft, ChevronRight, Calendar, Server,
    SearchX, RefreshCw, TrendingDown, Minus, Download, BarChart3,
    ArrowLeft
} from 'lucide-react';
import '../../../css/analytics/comparison-table.css';
import '../../../css/analytics/ec2/EC2Analytics.css';
import ComparisonTable from '../ComparisonTable';
import EC2GraphModal from './EC2GraphModal';
import axiosClient from '../../api/axiosClient';

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
    const [selectedRange, setSelectedRange] = useState('24h');
    const [showCalendar, setShowCalendar] = useState(false);
    const [customRange, setCustomRange] = useState(null);
    const [selectedDaysInfo, setSelectedDaysInfo] = useState(null);
    const [selectedDateDetail, setSelectedDateDetail] = useState(null);
    const [isFlipped, setIsFlipped] = useState(false);
    const [selectedInstanceForGraph, setSelectedInstanceForGraph] = useState(null);
    const [allInstanceData, setAllInstanceData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const datePresets = [
        { id: '24h', label: '24H', days: 1 },
        { id: '7d', label: '7D', days: 7 },
        { id: '15d', label: '15D', days: 15 },
        { id: '30d', label: '30D', days: 30 },
    ];

    const { setBgContext } = useOutletContext();

    const formatDate = (date) => {
        return date.toLocaleDateString('en-CA', {
            timeZone: 'Asia/Kolkata'
        });
    };
    const getDateRange = () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // CUSTOM RANGE
        if (selectedRange === 'custom' && customRange) {
            const from = new Date(customRange.start);
            const to = new Date(customRange.end);

            from.setHours(0, 0, 0, 0);
            to.setHours(0, 0, 0, 0);

            return {
                from: formatDate(from),
                to: formatDate(to)   // end exclusive handled by backend
            };
        }

        // PRESET RANGE
        // PRESET RANGE
        const preset = datePresets.find(p => p.id === selectedRange);
        const days = preset?.days || 7;

        let from = new Date(today);

        if (selectedRange === '24h') {
            from.setDate(today.getDate() - 1);
        } else {
            from.setDate(today.getDate() - (days - 1));
        }

        return {
            from: formatDate(from),
            to: formatDate(today)
        };
    };

    const getDisplayRangeLabel = () => {
        const today = new Date();

        // Custom range
        if (selectedRange === 'custom' && customRange) {
            return `${customRange.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${customRange.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
        }

        // Preset range
        const preset = datePresets.find(p => p.id === selectedRange);
        const days = preset?.days || 7;

        const from = new Date();
        from.setDate(today.getDate() - days);

        return `${from.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    };

    useEffect(() => {
        setBgContext('analytics');
        return () => setBgContext('default');
    }, [setBgContext]);


    const MOCK_INSTANCES = [
        {
            instanceName: "edith-prod-api",
            instanceId: "i-0a1b2c3d4e5f6g7h8",
            instanceType: "t3.large",
            avgCpu: 45.2,
            approxCost: 124.50,
            activeDays: 30,
            isAwsConsole: true,
            dates: Array.from({ length: 30 }, (_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - i);
                return {
                    date: d.toISOString(),
                    cpu: (40 + Math.random() * 20).toFixed(1),
                    cost: (3 + Math.random() * 2).toFixed(2),
                    isAwsConsole: Math.random() > 0.3
                };
            }),
            status: 'running'
        },
        {
            instanceName: "edith-worker-node-1",
            instanceId: "i-9i8h7g6f5e4d3c2b1",
            instanceType: "c5.xlarge",
            avgCpu: 78.5,
            approxCost: 310.20,
            activeDays: 30,
            isAwsConsole: false,
            dates: Array.from({ length: 30 }, (_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - i);
                return {
                    date: d.toISOString(),
                    cpu: (70 + Math.random() * 15).toFixed(1),
                    cost: (9 + Math.random() * 3).toFixed(2),
                    isAwsConsole: Math.random() > 0.7
                };
            }),
            status: 'running'
        },
        {
            instanceName: "edith-db-replica",
            instanceId: "i-11223344556677889",
            instanceType: "m5.large",
            avgCpu: 12.8,
            approxCost: 85.00,
            activeDays: 25,
            isAwsConsole: true,
            dates: Array.from({ length: 25 }, (_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - i);
                return {
                    date: d.toISOString(),
                    cpu: (10 + Math.random() * 5).toFixed(1),
                    cost: (2 + Math.random() * 1.5).toFixed(2),
                    isAwsConsole: true
                };
            }),
            status: 'running'
        },
        {
            instanceName: "edith-staging-env",
            instanceId: "i-aabbccddeeff00112",
            instanceType: "t3.medium",
            avgCpu: 5.4,
            approxCost: 42.15,
            activeDays: 12,
            isAwsConsole: false,
            dates: Array.from({ length: 12 }, (_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - i);
                return {
                    date: d.toISOString(),
                    cpu: (4 + Math.random() * 3).toFixed(1),
                    cost: (1 + Math.random() * 1).toFixed(2),
                    isAwsConsole: false
                };
            }),
            status: 'stopped'
        }
    ];

    useEffect(() => {
        setAllInstanceData(MOCK_INSTANCES);
    }, []);

    // Filter instances based on selected range
    const instanceData = useMemo(() => {
        const days = selectedRange === 'custom'
            ? (customRange ? Math.ceil((customRange.end - customRange.start) / (1000 * 60 * 60 * 24)) : 0)
            : (datePresets.find(p => p.id === selectedRange)?.days || 7);
        return allInstanceData.filter(c => c.activeDays > 0);
    }, [selectedRange, customRange, allInstanceData]);

    const summaryStats = useMemo(() => ({
        totalInstances: instanceData.length,
        totalCost: instanceData.reduce((s, c) => s + c.approxCost, 0),
        avgCpu: instanceData.length ? (instanceData.reduce((s, c) => s + c.avgCpu, 0) / instanceData.length).toFixed(1) : 0,
    }), [instanceData]);

    const is24hRange = useMemo(() => {
        if (selectedRange === '24h') return true;
        if (selectedRange === 'custom' && customRange) {
            const diff = Math.abs(customRange.end - customRange.start);
            return diff <= (1000 * 60 * 60 * 24 + 1000); // 24h with 1s buffer
        }
        return false;
    }, [selectedRange, customRange]);

    const handleCustomRange = (range) => {
        setCustomRange(range);
        setSelectedRange('custom');
    };

    const handleGraphClick = (instance) => {
        setSelectedInstanceForGraph({
            ...instance,
            cpu: instance.avgCpu,
            memory: 60
        });
    };
    const getActiveLabel = () => {
        if (selectedRange === 'custom' && customRange) {
            return `${customRange.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${customRange.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
        }
        return datePresets.find(p => p.id === selectedRange)?.label || '';
    };

    const handleExportAll = () => {
        const headers = ['Instance Name', 'Instance ID', 'Instance Type', 'Active Days', 'CPU (%)', 'Total Cost ($)'];
        const csvRows = [headers.join(',')];

        instanceData.forEach(inst => {
            const row = [
                `"${inst.instanceName}"`,
                `"${inst.instanceId}"`,
                `"${inst.instanceType}"`,
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
        { label: 'Showing Data For', value: getDisplayRangeLabel(), icon: Activity, color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', isDateCard: true },
        { label: 'Total Cost', value: `$${summaryStats.totalCost.toFixed(0)}`, icon: DollarSign, color: '#10b981', bg: 'rgba(16,185,129,0.1)', progress: 68 },
        { label: 'Avg CPU', value: `${summaryStats.avgCpu}%`, icon: Cpu, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', circle: summaryStats.avgCpu },
    ];

    return (
        <div className="ec2-analytics-page">
            <div className="ec2-analytics-content">
                <div className="ec2-breadcrumb">
                    <button className="ec2-back-btn" onClick={() => navigate('/analytics')}>
                        <ArrowLeft size={16} />
                        <span>Analytics</span>
                    </button>
                </div>

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
                        {/* <button
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
                        </button> */}

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
                                <div className={`mc-value ${card.isDateCard ? 'mc-date-value' : ''}`}>
                                    {card.value}
                                </div>
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

                {loading && (
                    <div className="ec2-loading-state">
                        Loading EC2 instance analytics...
                    </div>
                )}

                {error && (
                    <div className="ec2-error-state">
                        Failed to load data: {error}
                    </div>
                )}
                {/* ── Instances Panel ── */}
                <div className="ec2-instances-panel">
                    <div className="panel-header-new">
                        <div className="panel-title-group">
                            <Zap size={20} className="panel-title-icon" />
                            <h2>Active Instances</h2>
                            <span className="panel-period-badge">{getActiveLabel()}</span>
                        </div>
                        {/* <div className="panel-subtitle">Click an instance to view detailed metrics</div> */}
                    </div>

                    <div className="instances-grid">
                        {!loading && instanceData.length === 0 ?
                            (<div className="instances-empty-state">
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
                                        style={{ animationDelay: `${0.3 + index * 0.1}s`, cursor: 'default' }}
                                    >
                                        <div className={`instance-status-glow ${instance.status}`} />

                                        <div className="instance-card-top">
                                            <div className="instance-name-info">
                                                <div className="instance-status-row">
                                                    <div className={`instance-status-dot ${instance.status}`} />
                                                    <span className="instance-name-text">
                                                        {instance.instanceName}
                                                    </span>
                                                </div>
                                                <div className="instance-id-text">
                                                    {instance.instanceId}
                                                    <span className="instance-id-separator">•</span>
                                                    <span className="instance-type-text">{instance.instanceType}</span>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                {is24hRange && instance.isAwsConsole && (
                                                    <div className="ec2-aws-tag">
                                                        <Server size={10} strokeWidth={3} />
                                                        <span>AWS</span>
                                                    </div>
                                                )}
                                                <button
                                                    className="instance-graph-btn"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleGraphClick(instance);
                                                    }}
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
                                                className={`instance-stat-item ${instance.activeDays > 1 ? 'clickable-calendar' : 'non-clickable-stat'}`}
                                                onClick={(e) => {
                                                    if (instance.activeDays <= 1) return;
                                                    e.stopPropagation();
                                                    // Calculate dates for the display
                                                    setSelectedDaysInfo({
                                                        name: instance.instanceName,
                                                        id: instance.instanceId,
                                                        days: instance.activeDays,
                                                        rawDates: instance.dates
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
                        gridTemplateColumns="3.25rem 2fr 1.4fr 8.5rem 8.5rem 8.5rem"
                        columns={[
                            {
                                key: 'instanceName',
                                label: 'Instance',
                                type: 'status-name',
                                sortable: true
                            },
                            {
                                key: 'instanceId',
                                label: 'Instance ID',
                                sortable: true,
                                align: 'center',
                                render: (val) => (
                                    <span className="cmp-instance-id">{val}</span>
                                )
                            },
                            {
                                key: 'instanceType',
                                label: 'Instance Type',
                                icon: Server,
                                sortable: true,
                                align: 'center',
                                render: (val) => (
                                    <span className="cmp-instance-type">{val}</span>
                                )
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
                <div className="days-info-overlay" onClick={() => {
                    setSelectedDaysInfo(null);
                    setIsFlipped(false);
                    setSelectedDateDetail(null);
                }}>
                    <div className={`days-info-modal-wrap ${isFlipped ? 'flipped' : ''}`} onClick={e => e.stopPropagation()}>
                        {/* Front Side: List of Dates */}
                        <div className="days-info-modal-front">
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
                                    {(selectedDaysInfo.rawDates || []).map((dateObj, idx) => {
                                        const dt = new Date(dateObj.date);
                                        const dateStr = dt.toLocaleDateString('en-US', {
                                            month: 'short', day: 'numeric', year: 'numeric'
                                        });

                                        return (
                                            <div
                                                key={idx}
                                                className={`dim-date-chip ${is24hRange ? 'non-clickable' : 'clickable'}`}
                                                onClick={() => {
                                                    if (!is24hRange) {
                                                        setSelectedDateDetail({
                                                            ...dateObj,
                                                            formattedDate: dateStr
                                                        });
                                                        setIsFlipped(true);
                                                    }
                                                }}
                                            >
                                                {dateStr}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            <button className="dim-close-btn" onClick={() => setSelectedDaysInfo(null)}>Got it</button>
                        </div>

                        {/* Back Side: Date Details */}
                        <div className="days-info-modal-back">
                            {selectedDateDetail && (
                                <>
                                    <div className="dim-header details-header">
                                        <button className="dim-back-arrow" onClick={() => setIsFlipped(false)}>
                                            <ArrowLeft size={20} />
                                        </button>
                                        <div className="dim-header-identity">
                                            <div className="dim-title">{selectedDaysInfo.name}</div>
                                            <div className="dim-instance-id">{selectedDaysInfo.id}</div>
                                        </div>
                                        {selectedDateDetail.isAwsConsole && (
                                            <div className="ec2-aws-tag modal-tag">
                                                <Server size={10} strokeWidth={3} />
                                                <span>AWS</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="dim-detail-context">
                                        <div className="ddc-date-pill">
                                            <Calendar size={14} />
                                            <span>{selectedDateDetail.formattedDate} Insight</span>
                                        </div>
                                    </div>
                                    <div className="dim-detail-content">
                                        <div className="dim-detail-card-row">
                                            <div className="dim-detail-card cpu">
                                                <div className="ddc-icon"><Cpu size={18} /></div>
                                                <div className="ddc-val">{selectedDateDetail.cpu}%</div>
                                                <div className="ddc-lbl">CPU Usage</div>
                                            </div>
                                            <div className="dim-detail-card cost">
                                                <div className="ddc-icon"><DollarSign size={18} /></div>
                                                <div className="ddc-val">${selectedDateDetail.cost}</div>
                                                <div className="ddc-lbl">Daily Cost</div>
                                            </div>
                                        </div>
                                    </div>
                                    <button className="dim-close-btn" onClick={() => {
                                        setSelectedDaysInfo(null);
                                        setIsFlipped(false);
                                    }}>Close Details</button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {selectedInstanceForGraph && (
                <EC2GraphModal
                    instance={selectedInstanceForGraph}
                    selectedDate={null}
                    onClose={() => setSelectedInstanceForGraph(null)}
                />
            )}
        </div>
    );
}

export default EC2Analytics;