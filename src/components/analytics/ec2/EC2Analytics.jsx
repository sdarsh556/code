import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
    Activity, Clock, DollarSign, Cpu, TrendingUp, Zap, Server,
    ChevronLeft, ChevronRight, Calendar, MemoryStick, SearchX, BarChart3
} from 'lucide-react';
import '../../../css/analytics/ec2/EC2Analytics.css';
import '../../../css/analytics/comparison-table.css';
import ComparisonTable from '../ComparisonTable';
import EC2GraphModal from './EC2GraphModal';

// ─── Custom Calendar Picker (Same as ECS) ─────────────────────────────────────
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
    const { setBgContext } = useOutletContext();
    const [selectedRange, setSelectedRange] = useState('7d');
    const [showCalendar, setShowCalendar] = useState(false);
    const [customRange, setCustomRange] = useState(null);
    const [selectedInstance, setSelectedInstance] = useState(null);
    const [showGraphModal, setShowGraphModal] = useState(false);
    const [activeDate, setActiveDate] = useState(null);

    useEffect(() => {
        setBgContext('analytics');
        return () => setBgContext('default');
    }, [setBgContext]);

    const datePresets = [
        { id: '24h', label: '24H', days: 1 },
        { id: '7d', label: '7D', days: 7 },
        { id: '15d', label: '15D', days: 15 },
        { id: '30d', label: '30D', days: 30 },
    ];

    // MOCK DATA: For each date, list Instances running on that day
    const allDailyInstanceData = {
        '2026-02-22': [
            { id: 1, instanceName: 'prod-api-i1', computeType: 't3.xlarge', cpu: 42.5, memory: 58.2, cost: 0.12, status: 'healthy' },
            { id: 2, instanceName: 'prod-api-i2', computeType: 't3.xlarge', cpu: 48.1, memory: 61.4, cost: 0.12, status: 'healthy' },
            { id: 3, instanceName: 'worker-node-01', computeType: 'c5.large', cpu: 75.2, memory: 42.9, cost: 0.08, status: 'warning' }
        ],
        '2026-02-21': [
            { id: 1, instanceName: 'prod-api-i1', computeType: 't3.xlarge', cpu: 40.2, memory: 55.4, cost: 0.12, status: 'healthy' },
            { id: 4, instanceName: 'db-replica-01', computeType: 'r5.large', cpu: 22.8, memory: 85.2, cost: 0.25, status: 'healthy' }
        ],
        '2026-02-20': [
            { id: 1, instanceName: 'prod-api-i1', computeType: 't3.xlarge', cpu: 44.8, memory: 61.2, cost: 0.12, status: 'healthy' }
        ],
        '2026-02-19': [
            { id: 1, instanceName: 'prod-api-i1', computeType: 't3.xlarge', cpu: 43.2, memory: 59.5, cost: 0.12, status: 'healthy' },
            { id: 5, instanceName: 'payment-svc-01', computeType: 't3.medium', cpu: 34.5, memory: 47.1, cost: 0.04, status: 'healthy' }
        ],
        '2026-02-18': [
            { id: 5, instanceName: 'payment-svc-01', computeType: 't3.medium', cpu: 36.7, memory: 50.1, cost: 0.04, status: 'healthy' }
        ],
        '2026-02-17': [
            { id: 1, instanceName: 'prod-api-i1', computeType: 't3.xlarge', cpu: 38.9, memory: 52.3, cost: 0.12, status: 'healthy' }
        ],
        '2026-02-16': [
            { id: 6, instanceName: 'legacy-app-i1', computeType: 'm4.large', cpu: 75.2, memory: 82.5, cost: 0.20, status: 'warning' }
        ],
        '2026-02-15': [
            { id: 1, instanceName: 'prod-api-i1', computeType: 't3.xlarge', cpu: 45.2, memory: 62.8, cost: 0.12, status: 'healthy' }
        ]
    };

    const getDatesInRange = (start, end) => {
        const dates = [];
        let current = new Date(start);
        while (current <= end) {
            dates.push(new Date(current).toISOString().split('T')[0]);
            current.setDate(current.getDate() + 1);
        }
        return dates.reverse();
    };

    const selectedDates = useMemo(() => {
        let start, end;
        if (selectedRange === 'custom' && customRange) {
            start = customRange.start;
            end = customRange.end;
        } else {
            const days = datePresets.find(p => p.id === selectedRange)?.days || 7;
            end = new Date();
            start = new Date();
            start.setDate(end.getDate() - (days - 1));
        }
        return getDatesInRange(start, end);
    }, [selectedRange, customRange]);

    const handleCustomRange = (range) => {
        setCustomRange(range);
        setSelectedRange('custom');
    };

    const handleViewGraph = (instance, date) => {
        setSelectedInstance(instance);
        setActiveDate(date);
        setShowGraphModal(true);
    };

    const getActiveLabel = () => {
        if (selectedRange === 'custom' && customRange) {
            return `${customRange.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${customRange.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
        }
        return datePresets.find(p => p.id === selectedRange)?.label || '';
    };

    const handleExportAll = () => {
        const headers = ['Date', 'Instance Name', 'Compute Type', 'Avg CPU (%)', 'Avg Memory (%)', 'Hourly Cost ($)'];
        const csvRows = [headers.join(',')];

        selectedDates.forEach(dateStr => {
            const dayData = allDailyInstanceData[dateStr] || [];
            dayData.forEach(item => {
                const row = [
                    dateStr,
                    `"${item.instanceName}"`,
                    item.computeType,
                    item.cpu,
                    item.memory,
                    item.cost
                ];
                csvRows.push(row.join(','));
            });
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
                            <p className="ec2-page-sub">Instance fleet performance & resource usage</p>
                        </div>
                    </div>

                    <div className="time-selector-wrap" style={{ gap: '1rem' }}>
                        <button className="ec2-export-all-btn" onClick={handleExportAll}>
                            <BarChart3 size={16} />
                            <span>Export Range Data</span>
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

                {/* ── Daily Breakdown Sections ── */}
                <div className="daily-sections-list">
                    {selectedDates.map((dateStr, idx) => {
                        const dayData = allDailyInstanceData[dateStr] || [];
                        const dateObj = new Date(dateStr);
                        const formattedDate = dateObj.toLocaleDateString('en-US', {
                            weekday: 'long',
                            month: 'long',
                            day: 'numeric'
                        });

                        return (
                            <div key={dateStr} className="daily-section-card" style={{ animationDelay: `${idx * 0.1}s` }}>
                                <div className="daily-section-header">
                                    <div className="date-badge">
                                        <Calendar size={16} />
                                        <span>{formattedDate}</span>
                                    </div>
                                    <div className="clusters-count">
                                        <Activity size={14} />
                                        <span>{dayData.length} Instances Active</span>
                                    </div>
                                </div>

                                {dayData.length > 0 ? (
                                    <ComparisonTable
                                        title={`Instance Performance — ${dateStr}`}
                                        subtitle="Resource utilization and hourly cost"
                                        data={dayData}
                                        exportFilename={`ec2-instances-${dateStr}.csv`}
                                        gridTemplateColumns="52px 1.5fr 120px 100px 100px 100px 120px"
                                        columns={[
                                            {
                                                key: 'instanceName',
                                                label: 'Instance Name',
                                                type: 'status-name',
                                                sortable: true
                                            },
                                            {
                                                key: 'computeType',
                                                label: 'Compute Type',
                                                sortable: true,
                                                render: (val) => <span style={{ fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{val}</span>
                                            },
                                            {
                                                key: 'cpu',
                                                label: 'Avg CPU',
                                                icon: Cpu,
                                                type: 'cpu',
                                                sortable: true,
                                                align: 'right',
                                                noThreshold: true
                                            },
                                            {
                                                key: 'memory',
                                                label: 'Avg Memory',
                                                icon: MemoryStick,
                                                type: 'memory',
                                                sortable: true,
                                                align: 'right',
                                                noThreshold: true
                                            },
                                            {
                                                key: 'cost',
                                                label: 'Approx Cost',
                                                icon: DollarSign,
                                                type: 'cost',
                                                sortable: true,
                                                align: 'right'
                                            },
                                            {
                                                key: 'actions',
                                                label: 'View Trend',
                                                align: 'center',
                                                render: (_, item) => (
                                                    <button
                                                        className="sd-graph-btn"
                                                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', borderRadius: '8px', gap: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(59, 130, 246, 0.3)', background: 'rgba(59, 130, 246, 0.08)', color: '#3b82f6', cursor: 'pointer' }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleViewGraph(item, dateStr);
                                                        }}
                                                    >
                                                        <BarChart3 size={14} />
                                                        <span style={{ fontWeight: 700 }}>Trend</span>
                                                    </button>
                                                )
                                            }
                                        ]}
                                    />
                                ) : (
                                    <div className="no-data-day">
                                        <SearchX size={32} />
                                        <p>No instance activity recorded for this date.</p>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {showCalendar && (
                <CalendarPicker
                    onRangeSelect={handleCustomRange}
                    onClose={() => setShowCalendar(false)}
                />
            )}

            {showGraphModal && selectedInstance && (
                <EC2GraphModal
                    instance={selectedInstance}
                    selectedDate={activeDate}
                    onClose={() => { setShowGraphModal(false); setSelectedInstance(null); }}
                />
            )}
        </div>
    );
}

export default EC2Analytics;
