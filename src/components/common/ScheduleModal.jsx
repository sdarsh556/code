import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import axiosClient from '../api/axiosClient';
import '../../css/common/ScheduleModal.css';

const ScheduleModal = ({ isOpen, onClose, target, initialRange, onConfirm, onRemove }) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [startTime, setStartTime] = useState('00:00');
    const [endTime, setEndTime] = useState('23:59');
    const [isSaving, setIsSaving] = useState(false);
    const [holidays, setHolidays] = useState([]);

    const hasExistingSchedule = !!initialRange?.from && !!initialRange?.to;

    /* ------------------ Fetch holidays on open ------------------ */
    useEffect(() => {
        if (isOpen) {
            setStartDate(null);
            setEndDate(null);
            setStartTime('00:00');
            setEndTime('23:59');
            setCurrentMonth(new Date());
            setIsSaving(false);
            fetchHolidays();
        }
    }, [isOpen]);

    const fetchHolidays = async () => {
        try {
            const res = await axiosClient.get('/holidays');

            const formatted = res.data.data.map(h => {
                const d = new Date(h.holiday_date);
                const localDate = d.getFullYear() + '-' +
                    String(d.getMonth() + 1).padStart(2, '0') + '-' +
                    String(d.getDate()).padStart(2, '0');

                return { date: localDate, name: h.occasion };
            });

            setHolidays(formatted);
            console.log(formatted);
        } catch (err) {
            console.error('Failed to fetch holidays', err);
            setHolidays([]);
        }
    };


    if (!isOpen) return null;

    /* ------------------ Calendar helpers ------------------ */
    const handleMonthNav = (direction) => {
        const next = new Date(currentMonth);
        next.setMonth(currentMonth.getMonth() + direction);
        setCurrentMonth(next);
    };

    const getDaysInMonth = (date) =>
        new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

    const getFirstDayOfMonth = (date) =>
        new Date(date.getFullYear(), date.getMonth(), 1).getDay();

    const isDateInPast = (day) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return new Date(
            currentMonth.getFullYear(),
            currentMonth.getMonth(),
            day
        ) < today;
    };

    const handleDateClick = (day) => {
        const clicked = new Date(
            currentMonth.getFullYear(),
            currentMonth.getMonth(),
            day
        );

        if (!startDate || (startDate && endDate)) {
            setStartDate(clicked);
            setEndDate(null);
        } else if (clicked < startDate) {
            setStartDate(clicked);
        } else {
            setEndDate(clicked);
        }
    };

    /* ------------------ Actions ------------------ */

    const handleConfirm = async () => {
        if (!startDate || !endDate) return;

        setIsSaving(true);
        try {
            await onConfirm({
                from_date: startDate,
                to_date: endDate,
                from_time: startTime,
                to_time: endTime
            });
        } finally {
            setIsSaving(false);
        }
    };

    const title =
        target?.label ||
        `${target?.resourceType?.toUpperCase() || ''} ${target?.scope || ''} Schedule`;

    /* ------------------ Render ------------------ */
    return (
        <div className="schedule-modal-overlay" onClick={onClose}>
            <div className="schedule-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="schedule-modal-header">
                    <h2 className="schedule-modal-title">{title}</h2>
                    <button onClick={onClose} className="close-modal-btn">
                        <X size={20} />
                    </button>
                </div>

                <div className="schedule-modal-body">
                    {/* ✅ CLOCK – UNTOUCHED */}
                    <div className="clock-container">
                        <div className="animated-clock">
                            <div className="radar-sweep"></div>
                            <div className="clock-center"></div>
                            <div className="clock-hand-hour"></div>
                            <div className="clock-hand-minute"></div>
                            {[...Array(12)].map((_, i) => (
                                <div
                                    key={i}
                                    className="clock-tick"
                                    style={{ transform: `rotate(${i * 30}deg) translateY(-52px)` }}
                                />
                            ))}
                            <div className="clock-marker-outer">
                                {[...Array(12)].map((_, i) => (
                                    <div
                                        key={i}
                                        className="clock-tick-outer"
                                        style={{ transform: `rotate(${i * 30}deg) translateY(-85px)` }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="date-time">
                        {/* Calendar */}
                        <div className="calendar-view">
                            <div className="calendar-header">
                                <button
                                    className="calendar-nav-btn"
                                    onClick={() => handleMonthNav(-1)}
                                    disabled={
                                        currentMonth.getMonth() === new Date().getMonth() &&
                                        currentMonth.getFullYear() === new Date().getFullYear()
                                    }
                                >
                                    <ChevronLeft size={18} />
                                </button>

                                <span className="calendar-month-title">
                                    {currentMonth.toLocaleString('default', {
                                        month: 'long',
                                        year: 'numeric'
                                    })}
                                </span>

                                <button
                                    className="calendar-nav-btn"
                                    onClick={() => handleMonthNav(1)}
                                >
                                    <ChevronRight size={18} />
                                </button>
                            </div>

                            <div className="calendar-grid">
                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                                    <div key={d} className="calendar-day-label">{d}</div>
                                ))}

                                {[...Array(getFirstDayOfMonth(currentMonth))].map((_, i) => (
                                    <div key={i} className="calendar-day disabled" />
                                ))}

                                {[...Array(getDaysInMonth(currentMonth))].map((_, i) => {
                                    const day = i + 1;
                                    const date = new Date(
                                        currentMonth.getFullYear(),
                                        currentMonth.getMonth(),
                                        day
                                    );

                                    const isoDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;



                                    const isHoliday = holidays.some(h => h.date === isoDate);

                                    const isStart = startDate && date.getTime() === startDate.getTime();
                                    const isEnd = endDate && date.getTime() === endDate.getTime();
                                    const inRange = startDate && endDate && date > startDate && date < endDate;

                                    const today = new Date();
                                    const isToday =
                                        date.getDate() === today.getDate() &&
                                        date.getMonth() === today.getMonth() &&
                                        date.getFullYear() === today.getFullYear();

                                    return (
                                        <div
                                            key={day}
                                            className={`calendar-day
                                                ${isDateInPast(day) ? 'disabled' : ''}
                                                ${isStart ? 'selected-start' : ''}
                                                ${isEnd ? 'selected-end' : ''}
                                                ${inRange ? 'in-range' : ''}
                                                ${isToday ? 'today' : ''}
                                                ${isHoliday ? 'holiday-day' : ''}
                                            `}
                                            onClick={() => !isDateInPast(day) && handleDateClick(day)}
                                            title={isHoliday ? holidays.find(h => h.date === isoDate)?.name : ''}
                                        >
                                            {day}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* TIME – UNTOUCHED */}
                        <div className="time-range-panel">
                            <div className="time-field">
                                <label>From Time</label>
                                <input
                                    type="time"
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                    disabled={!startDate}
                                />
                            </div>

                            <div className="time-field">
                                <label>To Time</label>
                                <input
                                    type="time"
                                    value={endTime}
                                    onChange={(e) => setEndTime(e.target.value)}
                                    disabled={!startDate}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="schedule-modal-footer">
                    {hasExistingSchedule && onRemove && (
                        <button className="btn-schedule-remove" onClick={onRemove}>
                            Remove Schedule
                        </button>
                    )}

                    <button
                        className={`btn-schedule-save ${isSaving ? 'saving' : ''}`}
                        onClick={handleConfirm}
                        disabled={!startDate || isSaving}
                    >
                        {isSaving ? 'Saving…' : 'Confirm Schedule'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ScheduleModal;
