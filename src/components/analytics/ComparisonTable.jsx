import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
    ArrowUpDown, ChevronUp, ChevronDown, Download,
    Cpu, DollarSign, Server, Zap, GripVertical
} from 'lucide-react';
import '../../css/analytics/comparison-table.css';

/**
 * Reusable Comparison Table Component
 * 
 * @param {string} title - Panel Title
 * @param {string} subtitle - Panel Subtitle
 * @param {Array} data - Array of data objects to display
 * @param {Array} columns - Column definitions
 * @param {string} gridTemplateColumns - Standard grid definition (e.g. "52px 1fr 100px")
 * @param {Function} onRowClick - Optional row click handler
 * @param {string} exportFilename - Filename for CSV export
 */
function ComparisonTable({
    title,
    subtitle,
    data,
    columns,
    gridTemplateColumns,
    onRowClick,
    exportFilename = 'comparison.csv'
}) {
    const containerRef = useRef(null);
    const [sortBy, setSortBy] = useState(columns.find(c => c.sortable)?.key || null);
    const [sortDir, setSortDir] = useState('desc');
    const [colWidths, setColWidths] = useState([]);
    const [isResizing, setIsResizing] = useState(false);
    const [hasResized, setHasResized] = useState(false);

    const handleSort = (key) => {
        if (isResizing) return;
        if (sortBy === key) {
            setSortDir(d => d === 'desc' ? 'asc' : 'desc');
        } else {
            setSortBy(key);
            setSortDir('desc');
        }
    };

    const sortedData = useMemo(() => {
        if (!sortBy) return data;
        return [...data].sort((a, b) => {
            const av = a[sortBy];
            const bv = b[sortBy];
            if (typeof av === 'number' && typeof bv === 'number') {
                return sortDir === 'desc' ? bv - av : av - bv;
            }
            // Fallback for strings
            const strA = String(av).toLowerCase();
            const strB = String(bv).toLowerCase();
            if (strA < strB) return sortDir === 'desc' ? 1 : -1;
            if (strA > strB) return sortDir === 'desc' ? -1 : 1;
            return 0;
        });
    }, [data, sortBy, sortDir]);

    const handleResize = useCallback((index, e) => {
        e.preventDefault();
        e.stopPropagation();

        let currentWidths = colWidths;
        
        // If first resize, capture current widths from DOM
        if (!hasResized || colWidths.length === 0) {
            const header = containerRef.current.querySelector('.cmp-thead');
            if (header) {
                const children = Array.from(header.children).filter(c => 
                    c.classList.contains('cmp-th-rank') || c.classList.contains('cmp-th-wrapper')
                );
                currentWidths = children.map(c => c.offsetWidth);
                setColWidths(currentWidths);
                setHasResized(true);
            } else {
                return; // Header not found
            }
        }

        setIsResizing(true);
        const startX = e.clientX;
        const startWidth = currentWidths[index];

        const onMouseMove = (moveEvent) => {
            const delta = moveEvent.clientX - startX;
            const newWidths = [...currentWidths];
            newWidths[index] = Math.max(40, startWidth + delta);
            setColWidths(newWidths);
            currentWidths = newWidths; // Update for closure
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            setTimeout(() => setIsResizing(false), 100);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }, [colWidths]);

    const handleExport = () => {
        const headers = ['Rank', ...columns.map(c => c.label)];
        const csvRows = [headers.join(',')];

        sortedData.forEach((item, index) => {
            const row = [
                index + 1,
                ...columns.map(c => {
                    const val = item[c.key];
                    return typeof val === 'string' && val.includes(',') ? `"${val}"` : val;
                })
            ];
            csvRows.push(row.join(','));
        });

        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', exportFilename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const getRankIcon = (rank) => {
        return <span className="rank-num">{rank + 1}</span>;
    };

    // ── Built-in Renderers ──
    const renderCellContent = (val, item, col) => {
        if (col.render) return col.render(val, item);

        switch (col.type) {
            case 'status-name':
                return (
                    <div className="cmp-td-name">
                        <div className={`cmp-status-dot ${item.status || 'healthy'}`} />
                        <span className="cmp-name-text">{val}</span>
                    </div>
                );
            case 'cpu':
                return (
                    <span className={`cmp-chip cmp-chip-cpu ${!col.noThreshold && val > 55 ? 'cmp-chip-warn' : ''} ${!col.noThreshold && val > 80 ? 'cmp-chip-danger' : ''}`}>
                        {val}%
                    </span>
                );
            case 'memory':
                return (
                    <span className={`cmp-chip cmp-chip-mem ${!col.noThreshold && val > 65 ? 'cmp-chip-warn' : ''} ${!col.noThreshold && val > 85 ? 'cmp-chip-danger' : ''}`}>
                        {val}%
                    </span>
                );
            case 'cost':
                return <span className="cmp-cost-pill">${Number(val).toFixed(0)}</span>;
            case 'badge-svc':
                return (
                    <div className="cmp-svc-badge">
                        <Server size={11} />
                        <span>{val}</span>
                    </div>
                );
            case 'badge-task':
                return (
                    <div className="cmp-task-badge">
                        <Zap size={11} />
                        <span>{val}</span>
                    </div>
                );
            case 'date': {
                const dateObj = new Date(val);
                const formattedDate = dateObj.toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric'
                });
                return (
                    <span className="cmp-date-label">
                        {formattedDate}
                    </span>
                );
            }
            case 'day':
                return <span className="cmp-day-badge">{String(val).slice(0, 3)}</span>;
            default:
                return val;
        }
    };

    const gridStyle = useMemo(() => {
        if (!hasResized || colWidths.length === 0) {
            let template = gridTemplateColumns;
            
            // If gridTemplateColumns not provided, build one from column widths
            if (!template) {
                const parts = ['3.25rem']; // Rank
                columns.forEach((col, i) => {
                    if (col.width) parts.push(col.width);
                    else if (i === 0) parts.push('minmax(0, 1fr)'); // Fluid name by default
                    else parts.push('8rem');
                });
                template = parts.join(' ');
            }

            return {
                gridTemplateColumns: template,
                width: '100%'
            };
        }
        
        // Convert to rem (1rem = 16px)
        const remWidths = colWidths.map(w => `${(w / 16).toFixed(3)}rem`).join(' ');
        
        return {
            gridTemplateColumns: remWidths,
            width: 'max-content',
            minWidth: '100%'
        };
    }, [colWidths, gridTemplateColumns, columns, hasResized]);

    return (
        <div className="cmp-section-modern" ref={containerRef}>
            <div className="cmp-panel-header">
                <div className="cmp-panel-title">
                    <div className="cmp-panel-icon"><ArrowUpDown size={16} /></div>
                    <div className="cmp-title-text-group">
                        <div className="cmp-panel-label">{title}</div>
                        <div className="cmp-panel-sub">{subtitle} · {data.length} items</div>
                    </div>
                </div>
                <button className="cmp-download-btn" onClick={handleExport}>
                    <Download size={14} />
                    <span>Export Excel</span>
                </button>
            </div>

            <div className="cmp-table-wrap scrollable-table">
                {/* Table Head */}
                <div className="cmp-thead sticky-head" style={gridStyle}>
                    <div className="cmp-th cmp-th-rank">
                        <span>#</span>
                        <div className="ct-resizer" onMouseDown={(e) => handleResize(0, e)} />
                    </div>
                    {columns.map((col, idx) => {
                        const alignment = col.align === 'right' ? 'flex-end' : col.align === 'center' ? 'center' : 'flex-start';
                        const textAlign = col.align === 'right' ? 'right' : col.align === 'center' ? 'center' : 'left';

                        return col.sortable ? (
                            <div key={col.key} className="cmp-th-wrapper" style={{ justifyContent: alignment }}>
                                <button
                                    className={`cmp-th cmp-th-sortable ${sortBy === col.key ? 'cmp-th-active' : ''}`}
                                    onClick={() => handleSort(col.key)}
                                    style={{
                                        justifyContent: alignment,
                                        textAlign: textAlign
                                    }}
                                >
                                    {col.icon && <col.icon size={12} />}
                                    <span className="th-label-text">{col.label}</span>
                                    <span className="cmp-sort-icons">
                                        <ChevronUp size={11} className={sortBy === col.key && sortDir === 'asc' ? 'cmp-sort-on' : 'cmp-sort-off'} />
                                        <ChevronDown size={11} className={sortBy === col.key && sortDir === 'desc' ? 'cmp-sort-on' : 'cmp-sort-off'} />
                                    </span>
                                </button>
                                <div className="ct-resizer" onMouseDown={(e) => handleResize(idx + 1, e)} />
                            </div>
                        ) : (
                            <div key={col.key} className="cmp-th-wrapper"
                                style={{
                                    justifyContent: alignment,
                                    textAlign: textAlign
                                }}
                            >
                                <div className="cmp-th">
                                    {col.icon && <col.icon size={12} />}
                                    <span className="th-label-text">{col.label}</span>
                                </div>
                                <div className="ct-resizer" onMouseDown={(e) => handleResize(idx + 1, e)} />
                            </div>
                        );
                    })}
                </div>

                {/* Table Body */}
                <div className="cmp-tbody">
                    {sortedData.map((item, rank) => (
                        <div
                            key={item.id || rank}
                            className={`cmp-row ${rank === 0 ? 'cmp-row-top' : ''} ${rank % 2 === 1 ? 'cmp-row-alt' : ''}`}
                            style={{
                                ...gridStyle,
                                animationDelay: `${rank * 0.05}s`,
                                cursor: (onRowClick && !isResizing) ? 'pointer' : 'default'
                            }}
                            onClick={() => !isResizing && onRowClick && onRowClick(item)}
                        >
                            <div className="cmp-td cmp-td-rank">{getRankIcon(rank)}</div>
                            {columns.map((col) => (
                                <div
                                    key={col.key}
                                    className="cmp-td"
                                    style={{
                                        justifyContent: col.align === 'right' ? 'flex-end' : col.align === 'center' ? 'center' : 'flex-start'
                                    }}
                                >
                                    {renderCellContent(item[col.key], item, col)}
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default ComparisonTable;
