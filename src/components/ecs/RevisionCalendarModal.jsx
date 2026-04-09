import { useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import "../../css/ecs/RevisionCalendarModal.css";

const RevisionCalendarModal = ({
    isOpen,
    onClose,
    availableDates = [],
    onSubmit
}) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(null);

    useEffect(() => {
        if (isOpen) {
            setSelectedDate(null);
            setCurrentMonth(new Date());
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleMonthNav = (dir) => {
        const next = new Date(currentMonth);
        next.setMonth(currentMonth.getMonth() + dir);
        setCurrentMonth(next);
    };

    const getDaysInMonth = (date) =>
        new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

    const getFirstDay = (date) =>
        new Date(date.getFullYear(), date.getMonth(), 1).getDay();

    const isoFormat = (dateObj) =>
        `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}-${String(dateObj.getDate()).padStart(2, "0")}`;

    const isSelectable = (isoDate) => availableDates.includes(isoDate);

    const isToday = (isoDate) => {
        const today = new Date();
        const todayIso =
            `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

        return isoDate === todayIso;
    };


    return (
        <div
            className="revision-overlay"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                className="revision-modal"
                onClick={(e) => e.stopPropagation()}
            >
                {/* HEADER */}
                <div className="revision-header">
                    <div className="revision-title">
                        Revision
                    </div>
                    <button className="close-btn" onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                {/* BODY */}
                <div className="revision-body">

                    {/* Month Navigation */}
                    <div className="month-bar">
                        <button onClick={() => handleMonthNav(-1)}>
                            <ChevronLeft size={18} />
                        </button>

                        <span>
                            {currentMonth.toLocaleString("default", {
                                month: "long",
                                year: "numeric",
                            })}
                        </span>

                        <button onClick={() => handleMonthNav(1)}>
                            <ChevronRight size={18} />
                        </button>
                    </div>

                    {/* Calendar Grid */}
                    <div className="calendar-grid">
                        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                            <div key={d} className="day-label">
                                {d}
                            </div>
                        ))}

                        {[...Array(getFirstDay(currentMonth))].map((_, i) => (
                            <div key={i} />
                        ))}

                        {[...Array(getDaysInMonth(currentMonth))].map((_, i) => {
                            const day = i + 1;
                            const dateObj = new Date(
                                currentMonth.getFullYear(),
                                currentMonth.getMonth(),
                                day
                            );

                            const iso = isoFormat(dateObj);
                            const selectable = isSelectable(iso);

                            return (
                                <div
                                    key={day}
                                    className={`day-box 
                                        ${selectedDate === iso ? "selected" : ""}
                                        ${!selectable ? "disabled-day" : ""}
                                        ${isToday(iso) ? "today-mark" : ""}
                                    `}
                                    onClick={() => {
                                        if (selectable) setSelectedDate(iso);
                                    }}
                                >
                                    {day}
                                </div>
                            );
                        })}
                    </div>

                    {/* ACTIONS */}
                    <div className="revision-actions">
                        <button
                            className="popup-cancel-btn"
                            onClick={onClose}
                        >
                            Cancel
                        </button>

                        <button
                            className="revision-apply-btn"
                            disabled={!selectedDate}
                            onClick={() => onSubmit(selectedDate)}
                        >
                            Apply Revision
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RevisionCalendarModal;
