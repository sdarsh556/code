import { useEffect, useState, useRef } from "react";
import axiosClient from "../api/axiosClient";
import {
    X,
    ChevronLeft,
    ChevronRight,
    Upload,
    PlusCircle,
    Trash2,
    CalendarDays,
    UploadCloud,
    EyeClosed,
    Eye,
    List
} from "lucide-react";
import ConfirmActionModal from "./ConfirmActionModal";
import "../../css/common/HolidayModal.css";

const HolidayModal = ({ isOpen, onClose }) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [holidays, setHolidays] = useState([]);
    const [selectedDate, setSelectedDate] = useState(null);
    const [showList, setShowList] = useState(false);
    const [isAddPopupOpen, setIsAddPopupOpen] = useState(false);
    const [holidayName, setHolidayName] = useState("");
    const [uploadFile, setUploadFile] = useState(null);
    const [confirmModal, setConfirmModal] = useState({
        open: false,
        message: "",
        onConfirm: null
    });

    const closeConfirmModal = () => {
        setConfirmModal({
            open: false,
            message: "",
            onConfirm: null
        });
    };
    const fileInputRef = useRef(null);
    const [statusMessage, setStatusMessage] = useState("");

    useEffect(() => {
        if (isOpen) {
            fetchHolidays();
            setSelectedDate(null);
            setShowList(false);
            setIsAddPopupOpen(false);
            setHolidayName("");
            setUploadFile(null);
            closeConfirmModal();
        }
    }, [isOpen]);


    const showStatus = (msg) => {
        setStatusMessage(msg);
        setTimeout(() => {
            setStatusMessage("");
        }, 3000);
    };

    const fetchHolidays = async () => {
        try {
            const res = await axiosClient.get("/holidays");

            const formatted = res.data.data.map((h) => ({
                id: h.id,
                date: h.holiday_date.slice(0, 10),
                name: h.occasion,
            }));

            setHolidays(formatted);
        } catch (err) {
            console.error("Failed to fetch holidays", err);
            setHolidays([]);
        }
    };

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
        `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(
            2,
            "0"
        )}-${String(dateObj.getDate()).padStart(2, "0")}`;

    const selectedHoliday = holidays.find((h) => h.date === selectedDate);

    const handleAddHoliday = async () => {
        if (!selectedDate || !holidayName.trim()) return;

        try {
            const dateObj = new Date(selectedDate);

            await axiosClient.post("/holidays/single", {
                date: selectedDate,
                dayName: dateObj.toLocaleString("default", { weekday: "long" }),
                occasion: holidayName,
            });
            showStatus(`${selectedDate} added as holiday (${holidayName})`);

            setHolidayName("");
            setIsAddPopupOpen(false);
            fetchHolidays();
        } catch (err) {
            alert(err.response?.data?.error?.message || "Failed to add holiday");
        }
    };

    const handleAddHolidayWithConfirm = () => {
        if (!selectedDate || !holidayName.trim()) return;

        setConfirmModal({
            open: true,
            message: `Are you sure you want to add "${holidayName}" on ${selectedDate}?`,
            onConfirm: async () => {
                await handleAddHoliday();
                closeConfirmModal();
            }
        });
    };

    const handleDeleteHoliday = async () => {
        if (!selectedHoliday) return;

        try {
            await axiosClient.delete(`/holidays`, {
                params: { holidayDate: selectedHoliday.date },
            });
            showStatus(`${selectedHoliday.date} removed from holiday list`);

            setSelectedDate(null);
            fetchHolidays();
        } catch (err) {
            alert(err.response?.data?.error?.message || "Failed to delete holiday");
        }
    };


    const handleDeleteHolidayWithConfirm = () => {
        if (!selectedHoliday) return;

        setConfirmModal({
            open: true,
            message: `Are you sure you want to remove "${selectedHoliday.name}" on ${selectedHoliday.date}?`,
            onConfirm: async () => {
                await handleDeleteHoliday();
                closeConfirmModal();
            }
        });
    };

    const handleUploadClick = () => {
        fileInputRef.current.click();
    };

    const handleFileSelected = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Open confirm modal immediately
        setConfirmModal({
            open: true,
            message: `Are you sure you want to upload "${file.name}"?`,
            onConfirm: async () => {
                await handleBulkUpload(file);
                closeConfirmModal();
            }
        });
    };

    const handleBulkUpload = async (file) => {
        if (!file) return;

        const formData = new FormData();
        formData.append("file", file);

        try {
            await axiosClient.post("/holidays/upload", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            showStatus("Holiday file uploaded successfully!");
            fetchHolidays();
            fileInputRef.current.value = "";
        } catch (err) {
            alert(err.response?.data?.error?.message || "Upload failed");
        }
    };

    const monthHolidays = holidays.filter((h) => {
        const d = new Date(h.date);
        return (
            d.getMonth() === currentMonth.getMonth() &&
            d.getFullYear() === currentMonth.getFullYear()
        );
    });

    const isPastDate = (isoDate) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const givenDate = new Date(isoDate);
        return givenDate < today;
    };

    return (
        <div
            className="holiday-overlay"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) {
                    onClose();
                }
            }}
        >
            <div
                className={`holiday-modal ${showList ? "expanded" : ""}`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* HEADER */}
                <div className="holiday-header">
                    {/* Left empty spacer */}
                    <div className="header-left">
                        <button
                            className="toggle-list-btn"
                            onClick={() => setShowList(!showList)}
                        >
                            {showList ? (
                                <>
                                    <EyeClosed size={16} />
                                    Close
                                </>
                            ) : (
                                <>
                                    <Eye size={16} />
                                    View
                                </>
                            )}
                        </button>
                    </div>

                    {/* Center Title */}
                    <div className="holiday-title">
                        Holiday Calendar
                    </div>

                    {/* Right Controls */}
                    <div className="header-right">
                        <button className="close-btn" onClick={onClose}>
                            <X size={18} />
                        </button>
                    </div>
                </div>


                {/* BODY */}
                <div className="holiday-body">
                    {/* LEFT LIST */}
                    {showList && (
                        <div className="holiday-list-panel">
                            <h3>Holidays This Month</h3>

                            {monthHolidays.length === 0 ? (
                                <p className="empty-text">No holidays added.</p>
                            ) : (
                                monthHolidays.map((h) => (
                                    <div key={h.id} className="holiday-item">
                                        <span>{h.date}</span>
                                        <strong>{h.name}</strong>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {/* CALENDAR */}
                    <div className="holiday-calendar">
                        {statusMessage && (
                            <div className="holiday-status-banner">
                                {statusMessage}
                            </div>
                        )}

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

                        {/* GRID */}
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
                                const holidayObj = holidays.find((h) => h.date === iso);
                                const isHoliday = !!holidayObj;


                                const disabled = isPastDate(iso);

                                return (
                                    <div
                                        key={day}
                                        title={
                                            disabled
                                                ? "Past dates cannot be selected"
                                                : holidayObj
                                                    ? holidayObj.name
                                                    : ""
                                        }
                                        className={`day-box
                                            ${selectedDate === iso ? "selected" : ""}
                                            ${isHoliday ? "holiday" : ""}
                                            ${disabled ? "disabled-day" : ""}
                                        `}
                                        onClick={() => {
                                            if (!disabled) {
                                                setSelectedDate(iso);
                                            }
                                        }}
                                    >
                                        {day}

                                        {/* Holiday dot */}
                                        {isHoliday && <span className="holiday-dot"></span>}
                                    </div>
                                );

                            })}
                        </div>

                        {/* ACTIONS */}
                        <div className="holiday-actions">
                            <div className="action-card">
                                <h4>Selected Date</h4>

                                {!selectedDate ? (
                                    <p>Select a date first.</p>
                                ) : selectedHoliday ? (
                                    <>
                                        <p>
                                            <strong>{selectedHoliday.name}</strong>
                                        </p>
                                        <button
                                            className="danger-btn"
                                            onClick={handleDeleteHolidayWithConfirm}
                                        >
                                            <Trash2 size={16} />
                                            Remove Holiday
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        className="primary-btn"
                                        onClick={() => setIsAddPopupOpen(true)}
                                    >
                                        <PlusCircle size={16} />
                                        Add Holiday
                                    </button>
                                )}
                            </div>

                            {/* Upload */}
                            <div className="action-card">
                                <h4>Bulk Upload</h4>
                                <input
                                    type="file"
                                    accept=".csv,.txt"
                                    ref={fileInputRef}
                                    style={{ display: "none" }}
                                    onChange={handleFileSelected}
                                />
                                <button
                                    className="upload-btn"
                                    onClick={handleUploadClick}
                                >
                                    <UploadCloud size={16} />
                                    Upload Holidays
                                </button>
                            </div>

                        </div>
                    </div>
                </div>

                {/* ADD POPUP */}
                {isAddPopupOpen && (
                    <div className="popup-overlay">
                        <div className="popup-box">

                            {/* Header */}
                            <div className="popup-header">
                                <h3>Add Holiday</h3>
                                <p className="popup-date">{selectedDate}</p>
                            </div>

                            {/* Input */}
                            <div className="popup-field">
                                <label>Holiday Name</label>
                                <input
                                    placeholder="e.g. Independence Day"
                                    value={holidayName}
                                    onChange={(e) => setHolidayName(e.target.value)}
                                />
                            </div>

                            {/* Actions */}
                            <div className="popup-actions">
                                <button
                                    className="popup-cancel-btn"
                                    onClick={() => setIsAddPopupOpen(false)}
                                >
                                    Cancel
                                </button>

                                <button
                                    className="popup-add-btn"
                                    onClick={handleAddHolidayWithConfirm}
                                >
                                    Add Holiday
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <ConfirmActionModal
                isOpen={confirmModal.open}
                message={confirmModal.message}
                onConfirm={confirmModal.onConfirm}
                onCancel={closeConfirmModal}
            />

        </div>
    );
};

export default HolidayModal;

