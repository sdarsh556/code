import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
    Clock, DollarSign, Activity, Cpu, TrendingUp, Zap,
    ChevronLeft, ChevronRight, Calendar, Server,
    SearchX, RefreshCw, BarChart3,
    ArrowLeft, X, HardDrive, Monitor
} from 'lucide-react';
import '../../../css/analytics/comparison-table.css';
import '../../../css/analytics/ec2/EC2Analytics.css';
import '../../../css/analytics/ec2/EC2Analytics.css';
import '../../../css/analytics/shared/GraphModal.css';
import ComparisonTable from '../ComparisonTable';
import RDSGraphModal from '../rds/RDSGraphModal';
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
            setStartDate(d); setEndDate(null);
        } else {
            if (d < startDate) { setEndDate(startDate); setStartDate(d); }
            else { setEndDate(d); }
        }
    };

    const handleApply = () => {
        if (startDate && endDate) { onRangeSelect({ start: startDate, end: endDate }); onClose(); }
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
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(viewYear, viewMonth, i));

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

    const formatDate = (date) => date.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

    const getDateRange = () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (selectedRange === 'custom' && customRange) {
            return { from: formatDate(new Date(customRange.start)), to: formatDate(new Date(customRange.end)) };
        }
        const preset = datePresets.find(p => p.id === selectedRange);
        const days = preset?.days || 7;
        const from = new Date(today);
        if (selectedRange === '24h') from.setDate(today.getDate() - 1);
        else from.setDate(today.getDate() - (days - 1));
        return { from: formatDate(from), to: formatDate(today) };
    };

    const getDisplayRangeLabel = () => {
        const today = new Date();
        if (selectedRange === 'custom' && customRange) {
            return `${customRange.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${customRange.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
        }
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

    // ── Mock Data ──────────────────────────────────────────────────────────────
    const MOCK_INSTANCES = [
        {
            instanceName: "edith-prod-api",
            instanceId: "i-0a1b2c3d4e5f6g7h8",
            instanceType: "t3.large",
            os: "Amazon Linux 2",
            vcpu: 2,
            memoryGb: 8,
            avgCpu: 45.2,
            approxCost: 124.50,
            activeDays: 30,
            isAwsConsole: true,
            metrics: Array.from({ length: 30 }, (_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - (29 - i));
                const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                return {
                    date: dStr,
                    dateStr: dStr,
                    displayDate: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                    cpu: +(40 + Math.random() * 20).toFixed(1),
                    cost: +(3 + Math.random() * 2).toFixed(2),
                    isAwsConsole: Math.random() > 0.3,
                    isToday: i === 29,
                };
            }),
            dailyMetrics: Array.from({ length: 30 }, (_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                return { date: dStr, cpu: +(40 + Math.random() * 20).toFixed(1), cost: +(3 + Math.random() * 2).toFixed(2), isAwsConsole: Math.random() > 0.3 };
            }),
            status: 'running'
        },
        {
            instanceName: "edith-worker-node-1",
            instanceId: "i-9i8h7g6f5e4d3c2b1",
            instanceType: "c5.xlarge",
            os: "Ubuntu 22.04",
            vcpu: 4,
            memoryGb: 8,
            avgCpu: 78.5,
            approxCost: 310.20,
            activeDays: 30,
            isAwsConsole: false,
            metrics: Array.from({ length: 30 }, (_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - (29 - i));
                const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                return {
                    date: dStr,
                    dateStr: dStr,
                    displayDate: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                    cpu: +(70 + Math.random() * 15).toFixed(1),
                    cost: +(9 + Math.random() * 3).toFixed(2),
                    isAwsConsole: Math.random() > 0.7,
                    isToday: i === 29,
                };
            }),
            dailyMetrics: Array.from({ length: 30 }, (_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                return { date: dStr, cpu: +(70 + Math.random() * 15).toFixed(1), cost: +(9 + Math.random() * 3).toFixed(2), isAwsConsole: Math.random() > 0.7 };
            }),
            status: 'running'
        },
        {
            instanceName: "edith-db-replica",
            instanceId: "i-11223344556677889",
            instanceType: "m5.large",
            os: "Amazon Linux 2",
            vcpu: 2,
            memoryGb: 8,
            avgCpu: 12.8,
            approxCost: 85.00,
            activeDays: 25,
            isAwsConsole: true,
            metrics: Array.from({ length: 25 }, (_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - (24 - i));
                const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                return {
                    date: dStr,
                    dateStr: dStr,
                    displayDate: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                    cpu: +(10 + Math.random() * 5).toFixed(1),
                    cost: +(2 + Math.random() * 1.5).toFixed(2),
                    isAwsConsole: true,
                    isToday: i === 24,
                };
            }),
            dailyMetrics: Array.from({ length: 25 }, (_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                return { date: dStr, cpu: +(10 + Math.random() * 5).toFixed(1), cost: +(2 + Math.random() * 1.5).toFixed(2), isAwsConsole: true };
            }),
            status: 'running'
        },
        {
            instanceName: "edith-staging-env",
            instanceId: "i-aabbccddeeff00112",
            instanceType: "t3.medium",
            os: "Windows Server 2022",
            vcpu: 2,
            memoryGb: 4,
            avgCpu: 5.4,
            approxCost: 42.15,
            activeDays: 12,
            isAwsConsole: false,
            metrics: Array.from({ length: 12 }, (_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - (11 - i));
                const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                return {
                    date: dStr,
                    dateStr: dStr,
                    displayDate: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                    cpu: +(4 + Math.random() * 3).toFixed(1),
                    cost: +(1 + Math.random() * 1).toFixed(2),
                    isAwsConsole: false,
                    isToday: i === 11,
                };
            }),
            dailyMetrics: Array.from({ length: 12 }, (_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                return { date: dStr, cpu: +(4 + Math.random() * 3).toFixed(1), cost: +(1 + Math.random() * 1).toFixed(2), isAwsConsole: false };
            }),
            status: 'stopped'
        }
    ];

    useEffect(() => { setAllInstanceData(MOCK_INSTANCES); }, []);

    const instanceData = useMemo(() => allInstanceData.filter(c => c.activeDays > 0), [allInstanceData]);

    const summaryStats = useMemo(() => ({
        totalInstances: instanceData.length,
        totalCost: instanceData.reduce((s, c) => s + c.approxCost, 0),
        avgCpu: instanceData.length ? (instanceData.reduce((s, c) => s + c.avgCpu, 0) / instanceData.length).toFixed(1) : 0,
    }), [instanceData]);

    const is24hRange = useMemo(() => {
        if (selectedRange === '24h') return true;
        if (selectedRange === 'custom' && customRange) {
            const diff = Math.abs(customRange.end - customRange.start);
            return diff <= (1000 * 60 * 60 * 24 + 1000);
        }
        return false;
    }, [selectedRange, customRange]);

    const handleCustomRange = (range) => { setCustomRange(range); setSelectedRange('custom'); };

    // ── Graph handler ── wires instance to RDSGraphModal with 30-day metrics
    const handleGraphClick = (instance) => {
        setSelectedInstanceForGraph(instance);
    };

    // ── Fetch hourly mock data (simulates an API call) ──
    const fetchHourlyMock = async (instanceId, date) => {
        // Simulate async, return 24-hour data
        await new Promise(r => setTimeout(r, 300));
        return Array.from({ length: 24 }, (_, h) => {
            const hStr = String(h).padStart(2, '0');
            return {
                timestamp: `${date} ${hStr}:00:00`,
                displayHour: `${hStr}:00`,
                cpu: +(20 + Math.random() * 60).toFixed(1),
                cost: +(0.05 + Math.random() * 0.2).toFixed(3),
            };
        });
    };

    const getActiveLabel = () => {
        if (selectedRange === 'custom' && customRange) {
            return `${customRange.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${customRange.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
        }
        return datePresets.find(p => p.id === selectedRange)?.label || '';
    };

    // Build os icon label
    const getOsIcon = (os = '') => {
        const lower = os.toLowerCase();
        if (lower.includes('windows')) return '🪟';
        if (lower.includes('ubuntu')) return '🐧';
        return '🐧';
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
                            <p className="ec2-page-sub">Instance fleet performance &amp; cost intelligence</p>
                        </div>
                    </div>

                    <div className="time-selector-wrap" style={{ gap: '1rem' }}>
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
                                <div className={`mc-value ${card.isDateCard ? 'mc-date-value' : ''}`}>{card.value}</div>
                                <div className="mc-label">{card.label}</div>
                                {card.bars && (
                                    <div className="mc-mini-bars">
                                        {card.bars.map((h, j) => (
                                            <div key={j} className="mc-bar" style={{ height: `${h}%` }} />
                                        ))}
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

                {loading && <div className="ec2-loading-state">Loading EC2 instance analytics...</div>}
                {error && <div className="ec2-error-state">Failed to load data: {error}</div>}

                {/* ── Instances Panel ── */}
                <div className="ec2-instances-panel">
                    <div className="panel-header-new">
                        <div className="panel-title-group">
                            <Zap size={20} className="panel-title-icon" />
                            <h2>Active Instances</h2>
                            <span className="panel-period-badge">{getActiveLabel()}</span>
                        </div>
                        <div className="panel-subtitle">Click trend icon to view detailed CPU &amp; cost graphs</div>
                    </div>

                    <div className="instances-grid">
                        {!loading && instanceData.length === 0 ? (
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
                                    style={{ animationDelay: `${0.3 + index * 0.1}s`, cursor: 'default' }}
                                >
                                    <div className={`instance-status-glow ${instance.status}`} />

                                    {/* ── Card Top: Name + Actions ── */}
                                    <div className="instance-card-top">
                                        <div className="instance-name-info">
                                            <div className="instance-status-row">
                                                <div className={`instance-status-dot ${instance.status}`} />
                                                <span className="instance-name-text">{instance.instanceName}</span>
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
                                                onClick={(e) => { e.stopPropagation(); handleGraphClick(instance); }}
                                                title="View 30-Day CPU & Cost Trend"
                                            >
                                                <BarChart3 size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* ── OS + Spec Chips (NEW) ── */}
                                    <div className="ec2-instance-specs-row">
                                        <div className="ec2-spec-chip os-chip">
                                            <Monitor size={11} />
                                            <span>{instance.os}</span>
                                        </div>
                                        <div className="ec2-spec-chip">
                                            <Cpu size={11} />
                                            <span className="ec2-spec-val">{instance.vcpu}</span>
                                            <span className="ec2-spec-unit">vCPU</span>
                                        </div>
                                        <div className="ec2-spec-chip">
                                            <HardDrive size={11} />
                                            <span className="ec2-spec-val">{instance.memoryGb}</span>
                                            <span className="ec2-spec-unit">GB RAM</span>
                                        </div>
                                    </div>

                                    {/* ── Stats Row ── */}
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
                                                const metricsByDate = {};
                                                (instance.dailyMetrics || []).forEach(m => {
                                                    metricsByDate[m.date] = { cpu: m.cpu, cost: m.cost, isAwsConsole: m.isAwsConsole };
                                                });
                                                const rawDates = Object.keys(metricsByDate).sort((a, b) => new Date(b) - new Date(a));
                                                setSelectedDaysInfo({
                                                    identifier: instance.instanceName,
                                                    instanceId: instance.instanceId,
                                                    count: instance.activeDays,
                                                    rawDates,
                                                    metricsByDate
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

                                    {/* ── Resource Bars (CPU visual only) ── */}
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
                        data={instanceData.map(c => ({ ...c, id: c.instanceId }))}
                        exportFilename="instance-comparison.csv"
                        gridTemplateColumns="3.25rem minmax(0, 2fr) minmax(0, 1.4fr) 8.5rem 8.5rem 8.5rem 7rem"
                        columns={[
                            { key: 'instanceName', label: 'Instance', type: 'status-name', sortable: true },
                            {
                                key: 'instanceId', label: 'Instance ID', sortable: true, align: 'center',
                                render: (val) => <span className="cmp-instance-id">{val}</span>
                            },
                            {
                                key: 'instanceType', label: 'Instance Type', icon: Server, sortable: true, align: 'center',
                                render: (val) => <span className="cmp-instance-type">{val}</span>
                            },
                            { key: 'avgCpu', label: 'CPU Usage', icon: Cpu, type: 'cpu', sortable: true, align: 'center' },
                            { key: 'approxCost', label: 'Cost', icon: DollarSign, type: 'cost', sortable: true, align: 'center' },
                            {
                                key: 'activeDays', label: 'Days Active', icon: Clock, sortable: true, align: 'center',
                                render: (val) => <span className="cmp-active-days-pill">{val}d</span>
                            }
                        ]}
                    />
                )}
            </div>

            {showCalendar && (
                <CalendarPicker onRangeSelect={handleCustomRange} onClose={() => setShowCalendar(false)} />
            )}

            {/* ── EC2-Style Date Days Info Modal ── */}
            {selectedDaysInfo && (
                <div className="ec2-graph-modal-overlay days-info-overlay" onClick={() => {
                    setSelectedDaysInfo(null); setIsFlipped(false); setSelectedDateDetail(null);
                }}>
                    <div
                        className={`ec2-days-info-modal-inner ${isFlipped ? 'is-flipped' : ''}`}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Front Side */}
                        <div className="ec2-days-info-modal-front">
                            <div className="ec2-dim-header">
                                <div className="ec2-dim-icon"><Calendar size={24} /></div>
                                <div>
                                    <div className="ec2-dim-header-title">Active Timeline</div>
                                    <div className="ec2-dim-header-subtitle">{selectedDaysInfo.identifier}</div>
                                    <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                                        {selectedDaysInfo.instanceId}
                                    </div>
                                </div>
                                <button className="ec2-dim-modal-close" onClick={() => setSelectedDaysInfo(null)}><X size={20} /></button>
                            </div>
                            <div className="ec2-dim-hero">
                                <div className="ec2-dim-count-badge">{selectedDaysInfo.count}</div>
                                <div className="ec2-dim-count-label">Days Active</div>
                            </div>
                            <div className="ec2-dim-dates-grid-container">
                                <div className="ec2-dim-dates-grid">
                                    {selectedDaysInfo.rawDates?.map((dateStr, i) => {
                                        const date = new Date(dateStr);
                                        const formatted = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                                        return (
                                            <div
                                                key={i}
                                                className="ec2-dim-date-chip"
                                                onClick={() => {
                                                    const metrics = selectedDaysInfo.metricsByDate?.[dateStr] || {};
                                                    setSelectedDateDetail({
                                                        date: dateStr,
                                                        formattedDate: formatted,
                                                        cpu: metrics.cpu || 0,
                                                        cost: metrics.cost || 0,
                                                        isAwsConsole: metrics.isAwsConsole || false
                                                    });
                                                    setIsFlipped(true);
                                                }}
                                            >
                                                {formatted}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            <button className="ec2-dim-close-btn" onClick={() => setSelectedDaysInfo(null)}>Got it</button>
                        </div>

                        {/* Back Side: Date Detail */}
                        <div className="ec2-days-info-modal-back">
                            {selectedDateDetail && (
                                <>
                                    <div className="ec2-dim-header details-header">
                                        <button className="ec2-dim-back-arrow" onClick={() => setIsFlipped(false)}>
                                            <ChevronLeft size={20} />
                                        </button>
                                        <div className="ec2-dim-header-identity">
                                            <div className="ec2-dim-header-title">{selectedDaysInfo.identifier}</div>
                                            <div className="ec2-dim-date-context">{selectedDateDetail.formattedDate}</div>
                                            <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>
                                                {selectedDaysInfo.instanceId}
                                            </div>
                                        </div>
                                        {selectedDateDetail.isAwsConsole && (
                                            <div className="ec2-aws-tag modal-tag">
                                                <Server size={10} strokeWidth={3} />
                                                <span>AWS</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="ec2-dim-detail-content">
                                        <div className="ec2-dim-detail-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                                            {/* CPU Card */}
                                            <div className="ec2-dim-detail-card ec2-cpu">
                                                <div className="ec2-ddc-glass" />
                                                <div className="ec2-ddc-icon"><Cpu size={20} /></div>
                                                <div className="ec2-ddc-val">{selectedDateDetail.cpu}%</div>
                                                <div className="ec2-ddc-lbl">Avg CPU</div>
                                            </div>
                                            {/* Cost Card */}
                                            <div className="ec2-dim-detail-card ec2-conn" style={{ '--card-accent': '#10b981' }}>
                                                <div className="ec2-ddc-glass" />
                                                <div className="ec2-ddc-icon" style={{ color: '#10b981' }}><DollarSign size={20} /></div>
                                                <div className="ec2-ddc-val" style={{ color: '#10b981' }}>${selectedDateDetail.cost}</div>
                                                <div className="ec2-ddc-lbl">Daily Cost</div>
                                            </div>
                                        </div>

                                        {/* Instance identity banner */}
                                        <div className="ec2-dim-bottom-row" style={{ marginTop: '1rem' }}>
                                            <div className="ec2-dim-cost-banner-premium half-width" style={{ flex: 1 }}>
                                                <div className="ec2-dcb-inner">
                                                    <div className="ec2-dcb-info">
                                                        <div className="ec2-dcb-lbl">INSTANCE</div>
                                                        <div className="ec2-dcb-val" style={{ fontSize: '1rem' }}>{selectedDaysInfo.identifier}</div>
                                                        <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                                                            {selectedDaysInfo.instanceId}
                                                        </div>
                                                    </div>
                                                    <div className="ec2-dcb-visual">
                                                        <Server size={24} className="ec2-dcb-icon" />
                                                        <div className="ec2-dcb-glow" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <button className="ec2-dim-close-btn premium" onClick={() => { setSelectedDaysInfo(null); setIsFlipped(false); }}>
                                        <span>Close Details</span>
                                        <X size={16} />
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── RDSGraphModal wired for EC2 (CPU + Cost) ── */}
            {selectedInstanceForGraph && (
                <RDSGraphModal
                    isOpen={!!selectedInstanceForGraph}
                    onClose={() => setSelectedInstanceForGraph(null)}
                    instance={{
                        ...selectedInstanceForGraph,
                        db_identifier: selectedInstanceForGraph.instanceName,
                        metrics: selectedInstanceForGraph.metrics || [],
                    }}
                    excludeMetrics={['memory', 'connections', 'read', 'write']}
                    onFetchHourly={(date) => fetchHourlyMock(selectedInstanceForGraph.instanceId, date)}
                />
            )}
        </div>
    );
}

export default EC2Analytics;