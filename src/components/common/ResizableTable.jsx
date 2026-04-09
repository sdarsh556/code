import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle, useMemo } from "react";
import { createPortal } from "react-dom";
import { Settings, X, ArrowUpDown, ChevronUp, ChevronDown } from "lucide-react";
import "../../css/common/ResizableTable.css";

const ResizableTable = forwardRef(({
    columns,
    data,
    renderCell,
    tableClassName = "",
    wrapperClassName = ""
}, ref) => {
    const wrapperRef = useRef(null);
    const tableRef = useRef(null);

    const [colWidths, setColWidths] = useState({});
    const [sortConfig, setSortConfig] = useState(null); // { key, direction: 'asc' | 'desc' }

    // Column Visibility State
    const [visibleColumns, setVisibleColumns] = useState(() => {
        const initial = {};
        columns.forEach(col => {
            initial[col.key] = true;
        });
        return initial;
    });

    const [showSettings, setShowSettings] = useState(false);
    const [pendingVisibleColumns, setPendingVisibleColumns] = useState({});

    useImperativeHandle(ref, () => ({
        openSettings: () => {
            setPendingVisibleColumns(visibleColumns);
            setShowSettings(true);
        }
    }));

    // =========================================
    // SORTING LOGIC
    // =========================================
    const parseValue = (val) => {
        if (typeof val === 'number') return val;
        if (typeof val === 'string') {
            // "32 vCPU", "128 GB", "500 MB" -> extract number
            const matched = val.match(/^(\d+(\.\d+)?)/);
            if (matched) return parseFloat(matched[1]);
            return val.toLowerCase();
        }
        return val;
    };

    const sortedData = useMemo(() => {
        if (!sortConfig) return data;

        const sortableItems = [...data];
        sortableItems.sort((a, b) => {
            const aVal = parseValue(a[sortConfig.key]);
            const bVal = parseValue(b[sortConfig.key]);

            if (aVal < bVal) {
                return sortConfig.direction === 'asc' ? -1 : 1;
            }
            if (aVal > bVal) {
                return sortConfig.direction === 'asc' ? 1 : -1;
            }
            return 0;
        });
        return sortableItems;
    }, [data, sortConfig]);

    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        } else if (sortConfig && sortConfig.key === key && sortConfig.direction === 'desc') {
            setSortConfig(null);
            return;
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (col) => {
        if (!col.sortable) return null;
        const isActive = sortConfig?.key === col.key;
        const isAsc = isActive && sortConfig.direction === 'asc';
        const isDesc = isActive && sortConfig.direction === 'desc';

        return (
            <div className="th-sort-arrows">
                <ChevronUp 
                    size={11} 
                    className={`th-sort-arrow ${isAsc ? 'active' : 'idle'}`}
                    style={{ marginBottom: '-4px' }}
                />
                <ChevronDown 
                    size={11} 
                    className={`th-sort-arrow ${isDesc ? 'active' : 'idle'}`}
                />
            </div>
        );
    };

    // Filter visible columns
    const activeColumns = columns.filter(col => visibleColumns[col.key]);

    // =========================================
    // INITIAL WIDTH SETUP
    // =========================================
    useEffect(() => {
        if (!wrapperRef.current) return;

        const containerWidth = wrapperRef.current.offsetWidth;
        const initialWidths = {};

        columns.forEach(col => {
            if (col.widthPercent) {
                initialWidths[col.key] = Math.max(
                    col.minWidth || 80,
                    (col.widthPercent / 100) * containerWidth
                );
            } else {
                initialWidths[col.key] =
                    col.defaultWidth || col.minWidth || 120;
            }
        });

        setColWidths(initialWidths);
    }, [columns]);

    // =========================================
    // DRAG RESIZE
    // =========================================
    const handleMouseDown = (e, columnKey, minWidth = 80) => {
        const th = e.currentTarget;
        const startX = e.clientX;
        const startWidth = colWidths[columnKey];

        const onMouseMove = (event) => {
            const newWidth = Math.max(
                minWidth,
                startWidth + (event.clientX - startX)
            );
            setColWidths(prev => ({
                ...prev,
                [columnKey]: newWidth
            }));
        };

        const onMouseUp = () => {
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
            document.body.style.cursor = "default";
        };

        document.body.style.cursor = "col-resize";
        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
    };


    return (
        <>
        <div
            ref={wrapperRef}
            className={`table-responsive ${wrapperClassName}`}
            style={{ overflowX: 'auto', width: '100%' }}
        >
            <table
                ref={tableRef}
                className={`resizable-table ${tableClassName}`}
                style={{ tableLayout: 'fixed', width: 'max-content', minWidth: '100%' }}
            >
                <colgroup>
                    {activeColumns.map(col => (
                        <col
                            key={col.key}
                            style={{
                                width: colWidths[col.key]
                                    ? `${colWidths[col.key]}px`
                                    : undefined
                            }}
                        />
                    ))}
                </colgroup>

                <thead>
                    <tr>
                        {activeColumns.map((col, index) => (
                            <th 
                                key={col.key}
                                onClick={() => col.sortable && requestSort(col.key)}
                                className={col.sortable ? 'sortable-header' : ''}
                            >
                                <div className="th-content">
                                    <div className="th-label-group">
                                        <span className="th-main-label">{col.label}</span>
                                        {getSortIcon(col)}
                                    </div>
                                    {col.subLabel && <span className="th-sub-label">{col.subLabel}</span>}
                                </div>

                                {/* Resize Handle */}
                                <div
                                    className="resize-handle"
                                    onMouseDown={(e) => {
                                        e.stopPropagation(); // Prevent sort click when resizing
                                        handleMouseDown(e, col.key, col.minWidth);
                                    }}
                                />
                            </th>
                        ))}
                    </tr>
                </thead>

                <tbody>
                    {sortedData && sortedData.length > 0 && (
                        sortedData.map((row, rowIndex) => (
                            <tr key={rowIndex}>
                                {activeColumns.map(col => (
                                    <td key={col.key}>
                                        {renderCell
                                            ? renderCell(col.key, row)
                                            : row[col.key]}
                                    </td>
                                ))}
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
        
        {/* Column Settings Modal via Portal */}
        {showSettings && createPortal(
            <div className="rt-column-settings-overlay" onClick={() => setShowSettings(false)}>
                <div className="rt-csm-modal" onClick={e => e.stopPropagation()}>
                    <div className="rt-csm-header">
                        <div className="rt-csm-title-group">
                            <Settings size={20} className="rt-csm-icon" />
                            <h3>Column Settings</h3>
                        </div>
                        <button className="rt-csm-close" onClick={() => setShowSettings(false)}>
                            <X size={20} />
                        </button>
                    </div>
                    <div className="rt-csm-body">
                        <label className="rt-csm-label">Toggle Columns</label>
                        <div className="rt-column-toggles-grid">
                            {columns.map(col => (
                                <div key={col.key} className={`rt-column-toggle-item ${col.mandatory ? 'mandatory' : ''}`}>
                                    <span className="rt-ct-label">{col.label}</span>
                                    <label className="rt-switch">
                                        <input
                                            type="checkbox"
                                            checked={pendingVisibleColumns[col.key] || false}
                                            disabled={col.mandatory}
                                            onChange={() => {
                                                if (!col.mandatory) {
                                                    setPendingVisibleColumns(prev => ({
                                                        ...prev,
                                                        [col.key]: !prev[col.key]
                                                    }));
                                                }
                                            }}
                                        />
                                        <span className="rt-slider rt-round"></span>
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="rt-csm-footer">
                        <button className="rt-csm-cancel" onClick={() => setShowSettings(false)}>Cancel</button>
                        <button
                            className="rt-csm-submit"
                            onClick={() => {
                                setVisibleColumns(pendingVisibleColumns);
                                setShowSettings(false);
                            }}
                        >
                            Submit Changes
                        </button>
                    </div>
                </div>
            </div>,
            document.body
        )}
        </>
    );
});

export default ResizableTable;
