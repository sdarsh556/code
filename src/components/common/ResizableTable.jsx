import React, { useState, useEffect, useRef } from "react";
import "../../css/common/ResizableTable.css";

const ResizableTable = ({
    columns,
    data,
    renderCell,
    tableClassName = "",
    wrapperClassName = ""
}) => {
    const wrapperRef = useRef(null);
    const tableRef = useRef(null);

    const [colWidths, setColWidths] = useState({});

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
        <div
            ref={wrapperRef}
            className={`resizable-table-wrapper ${wrapperClassName}`}
        >
            <table
                ref={tableRef}
                className={`resizable-table ${tableClassName}`}
            >
                <colgroup>
                    {columns.map(col => (
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
                        {columns.map((col, index) => (
                            <th key={col.key}>
                                <div className="th-content">
                                    {col.label}
                                </div>

                                {/* Resize Handle */}
                                <div
                                    className="resize-handle"
                                    onMouseDown={(e) =>
                                        handleMouseDown(
                                            e,
                                            col.key,
                                            col.minWidth
                                        )
                                    }
                                />
                            </th>
                        ))}
                    </tr>
                </thead>

                <tbody>
                    {data && data.length > 0 ? (
                        data.map((row, rowIndex) => (
                            <tr key={rowIndex}>
                                {columns.map(col => (
                                    <td key={col.key}>
                                        {renderCell
                                            ? renderCell(col.key, row)
                                            : row[col.key]}
                                    </td>
                                ))}
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td
                                colSpan={columns.length}
                                style={{ textAlign: "center" }}
                            >
                                No Data Found
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default ResizableTable;
