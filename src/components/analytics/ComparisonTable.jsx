import { useState, useMemo } from 'react';
import {
    ArrowUpDown, ChevronUp, ChevronDown, Download,
    Cpu, MemoryStick, DollarSign, Server, Zap
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
    const [sortBy, setSortBy] = useState(columns.find(c => c.sortable)?.key || null);
    const [sortDir, setSortDir] = useState('desc');

    const handleSort = (key) => {
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

    const gridStyle = {
        gridTemplateColumns: gridTemplateColumns,
    };

    return (
        <div className="cmp-section-modern">
            <div className="cmp-panel-header">
                <div className="cmp-panel-title">
                    <div className="cmp-panel-icon"><ArrowUpDown size={16} /></div>
                    <div>
                        <div className="cmp-panel-label">{title}</div>
                        <div className="cmp-panel-sub">{subtitle} · {data.length} items</div>
                    </div>
                </div>
                <button className="cmp-download-btn" onClick={handleExport}>
                    <Download size={14} />
                    <span>Export Excel</span>
                </button>
            </div>

            <div className="cmp-table-wrap">
                {/* Table Head */}
                <div className="cmp-thead" style={gridStyle}>
                    <div className="cmp-th cmp-th-rank">#</div>
                    {columns.map((col) => {
                        const alignment = col.align === 'right' ? 'flex-end' : col.align === 'center' ? 'center' : 'flex-start';
                        const textAlign = col.align === 'right' ? 'right' : col.align === 'center' ? 'center' : 'left';

                        return col.sortable ? (
                            <button
                                key={col.key}
                                className={`cmp-th cmp-th-sortable ${sortBy === col.key ? 'cmp-th-active' : ''}`}
                                onClick={() => handleSort(col.key)}
                                style={{
                                    justifyContent: alignment,
                                    textAlign: textAlign
                                }}
                            >
                                {col.icon && <col.icon size={12} />}
                                <span>{col.label}</span>
                                <span className="cmp-sort-icons">
                                    <ChevronUp size={11} className={sortBy === col.key && sortDir === 'asc' ? 'cmp-sort-on' : 'cmp-sort-off'} />
                                    <ChevronDown size={11} className={sortBy === col.key && sortDir === 'desc' ? 'cmp-sort-on' : 'cmp-sort-off'} />
                                </span>
                            </button>
                        ) : (
                            <div
                                key={col.key}
                                className="cmp-th"
                                style={{
                                    justifyContent: alignment,
                                    textAlign: textAlign
                                }}
                            >
                                {col.icon && <col.icon size={12} />}
                                <span>{col.label}</span>
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
                                cursor: onRowClick ? 'pointer' : 'default'
                            }}
                            onClick={() => onRowClick && onRowClick(item)}
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
