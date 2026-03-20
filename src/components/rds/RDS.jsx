import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Database, Server, HardDrive, Play, Square, RotateCw, RefreshCw, Upload, DownloadCloud,
    Search, Plus, Minus, Settings, Shield, Clock, Sun, Moon, Pencil, FileUp, Activity, X, ArrowUpDown,
    ChevronUp, ChevronDown
} from 'lucide-react';
import '../../css/rds/rds.css';
import axiosClient from '../api/axiosClient'; // Uncomment when ready
import ScheduleModal from '../common/ScheduleModal'; // Assuming ScheduleModal exists
import RDSBulkActionModal from './RDSBulkActionModal';
import ConfirmActionModal from '../common/ConfirmActionModal';

const DUMMY_DATABASES = [
    {
        id: 'db-123',
        db_identifier: 'prod-mysql-instance',
        is_aurora: false,
        engine: 'mysql',
        engine_version: '8.0.28',
        instance_class: 'db.t3.medium',
        storage_allocated: 100,
        storage_used: 45.5,
        status: 'available',
        vcpu: 2,
        memory: 4,
        is_24_7: true,
        never_start: false,
        daily_exception: false,
        schedule: null
    },
    {
        id: 'db-124',
        db_identifier: 'staging-pg-main',
        is_aurora: false,
        engine: 'postgres',
        engine_version: '14.5',
        instance_class: 'db.m5.large',
        storage_allocated: 500,
        storage_used: 312.4,
        status: 'available',
        vcpu: 4,
        memory: 16,
        is_24_7: true,
        never_start: false,
        daily_exception: false,
        schedule: null
    },
    {
        id: 'db-125',
        db_identifier: 'dev-mysql-backup',
        is_aurora: false,
        engine: 'mysql',
        engine_version: '8.0.28',
        instance_class: 'db.t3.micro',
        storage_allocated: 50,
        storage_used: 12.1,
        status: 'stopped',
        vcpu: 2,
        memory: 1,
        is_24_7: false,
        never_start: true,
        daily_exception: false,
        schedule: null
    },
    {
        id: 'db-126',
        db_identifier: 'analytics-replica',
        is_aurora: false,
        engine: 'postgres',
        engine_version: '13.4',
        instance_class: 'db.r6g.xlarge',
        storage_allocated: 1000,
        storage_used: 840.2,
        status: 'available',
        vcpu: 4,
        memory: 32,
        is_24_7: false,
        never_start: false,
        daily_exception: true,
        schedule: null
    },
    {
        id: 'cluster-456',
        db_identifier: 'prod-aurora-cluster',
        is_aurora: true,
        engine: 'aurora-postgresql',
        engine_version: '14.7',
        storage_allocated: null,
        storage_used: 540.8,
        status: 'available',
        vcpu: null,
        memory: null,
        is_24_7: true,
        never_start: false,
        daily_exception: false,
        schedule: null,
        instances: []
    },
    {
        id: 'cluster-457',
        db_identifier: 'staging-aurora-cluster',
        is_aurora: true,
        engine: 'aurora-mysql',
        engine_version: '3.02.2',
        storage_allocated: null,
        storage_used: 120.4,
        status: 'available',
        vcpu: null,
        memory: null,
        is_24_7: false,
        never_start: false,
        daily_exception: true,
        schedule: null,
        instances: []
    },
    {
        id: 'cluster-458',
        db_identifier: 'dev-aurora-serverless',
        is_aurora: true,
        engine: 'aurora-postgresql',
        engine_version: '13.7',
        storage_allocated: null,
        storage_used: 45.2,
        status: 'stopped',
        vcpu: null,
        memory: null,
        is_24_7: false,
        never_start: true,
        daily_exception: false,
        schedule: null,
        instances: []
    },
    {
        id: 'cluster-459',
        db_identifier: 'qa-aurora-test',
        is_aurora: true,
        engine: 'aurora-mysql',
        engine_version: '2.11.1',
        storage_allocated: null,
        storage_used: 28.9,
        status: 'available',
        vcpu: null,
        memory: null,
        is_24_7: false,
        never_start: false,
        daily_exception: false,
        schedule: null,
        instances: []
    },
    {
        id: 'docdb-701',
        db_identifier: 'prod-docdb-cluster',
        is_docdb: true,
        engine: 'docdb',
        engine_version: '4.0.0',
        storage_allocated: null,
        storage_used: 850.4,
        status: 'available',
        vcpu: null,
        memory: null,
        is_24_7: true,
        never_start: false,
        daily_exception: false,
        schedule: null,
        instances: []
    },
    {
        id: 'docdb-702',
        db_identifier: 'staging-docdb-main',
        is_docdb: true,
        engine: 'docdb',
        engine_version: '3.6.0',
        storage_allocated: null,
        storage_used: 120.5,
        status: 'available',
        vcpu: null,
        memory: null,
        is_24_7: false,
        never_start: false,
        daily_exception: true,
        schedule: null,
        instances: []
    },
    {
        id: 'docdb-703',
        db_identifier: 'dev-docdb-sandbox',
        is_docdb: true,
        engine: 'docdb',
        engine_version: '4.0.0',
        storage_allocated: null,
        storage_used: 45.2,
        status: 'stopped',
        vcpu: null,
        memory: null,
        is_24_7: false,
        never_start: true,
        daily_exception: false,
        schedule: null,
        instances: []
    }
];

const DUMMY_RDS_STATS = {
    total_instances: 3,
    running_instances: 3,
    stopped_instances: 0,
    total_storage_gb: 220.8,
    avg_cpu_utilization: 12.5,
    active_schedules: 1
};

const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
        case 'available':
        case 'running':
            return 'rds-status-available';
        case 'stopped':
        case 'stopping':
            return 'rds-status-stopped';
        case 'starting':
        case 'rebooting':
            return 'rds-status-starting';
        case 'modifying':
            return 'rds-status-modifying';
        default:
            return 'rds-status-unknown';
    }
};

// Helper to format status label based on resource type
const formatStatus = (status) => {
    const s = status?.toLowerCase();

    if (s === "modifying") return "Modifying";

    if (s === "available" || s === "running") return "Available";
    if (s === "stopped") return "Stopped";

    return status;
};

const getScheduleStatus = (db) => {
    if (!db.schedule?.from_date || !db.schedule?.to_date) return null;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const from = new Date(db.schedule.from_date);
    const to = new Date(db.schedule.to_date);

    if (today >= from && today <= to) {
        const diffTime = to - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // Include today
        return {
            isActive: true,
            days: diffDays,
            isUrgent: diffDays === 1,
            label: `${diffDays} ${diffDays === 1 ? 'Day' : 'Days'}`
        };
    }
    return null;
};

// --- Custom SVG Storage Charts ---

// Utilities for Charts
const generateColors = (count) => {
    const gradients = [];
    const goldenRatioConjugate = 0.618033988749895;
    // Expanded cool spectrum: 160 (Turquoise) to 300 (Magenta)
    const HUE_START = 160;
    const HUE_RANGE = 140; 
    
    let h = Math.random();

    for (let i = 0; i < count; i++) {
        h += goldenRatioConjugate;
        h %= 1;

        const hue = HUE_START + (h * HUE_RANGE);
        
        // Dynamic saturation/lightness oscillation for maximum distinction
        const sat = 55 + (Math.sin(i * 1.5) * 15);
        const light = 50 + (Math.cos(i * 0.8) * 10);

        gradients.push({
            id: `chart-grad-${i}-${Math.floor(hue)}`,
            start: `hsl(${hue}, ${sat + 10}%, ${light + 10}%)`,
            stop: `hsl(${hue + 20}, ${sat}%, ${light - 10}%)`,
            solid: `hsl(${hue}, ${sat}%, ${light}%)`
        });
    }
    return gradients;
};

// Common SVG Filter Definitions
const ChartFilters = () => (
    <defs>
        <filter id="bloom-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="4" result="blur" />
            <feOffset in="blur" dx="0" dy="0" result="offsetBlur" />
            <feFlood floodColor="var(--rds-chart-glow)" floodOpacity="var(--rds-chart-glow-opacity)" result="flood" />
            <feComposite in="flood" in2="offsetBlur" operator="in" result="glow" />
            <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
            </feMerge>
        </filter>
    </defs>
);

const RDSStoragePieChart = ({ databases }) => {
    const [hoveredData, setHoveredData] = useState(null);
    const size = 260;
    const padding = 1.25;
    const boxSize = padding * 2;
    const radius = 1;

    const rdsInstances = databases.filter(db => !db.is_aurora && !db.is_docdb && db.storage_used > 0)
        .sort((a, b) => b.storage_used - a.storage_used);

    const gradients = useMemo(() => generateColors(Math.max(rdsInstances.length, 1)), [rdsInstances.length]);
    const totalUsed = rdsInstances.reduce((sum, db) => sum + (db.storage_used || 0), 0);
    const calcedAllocated = rdsInstances.reduce((sum, db) => sum + (db.storage_allocated || db.storage_used || 0), 0);
    const effectiveAllocated = Math.max(calcedAllocated || 0, totalUsed);

    let cumulativePercent = 0;

    return (
        <div className="rds-custom-chart-container">
            <svg width={size} height={size} viewBox={`-${padding} -${padding} ${boxSize} ${boxSize}`} style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}>
                <ChartFilters />
                <defs>
                    {gradients.map(g => (
                        <linearGradient key={g.id} id={g.id} x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor={g.start} />
                            <stop offset="100%" stopColor={g.stop} />
                        </linearGradient>
                    ))}
                </defs>

                {effectiveAllocated === 0 ? (
                    <circle cx="0" cy="0" r={radius} fill="var(--rds-chart-track)" />
                ) : (
                    <>
                        {rdsInstances.map((db, index) => {
                            const slicePercent = db.storage_used / effectiveAllocated;
                            if (slicePercent <= 0) return null;

                            const [startX, startY] = getCoordinatesForPercent(cumulativePercent);
                            cumulativePercent += slicePercent;
                            const [endX, endY] = getCoordinatesForPercent(cumulativePercent);
                            const largeArcFlag = slicePercent > 0.5 ? 1 : 0;

                            const isHovered = hoveredData?.name === db.db_identifier;
                            const currentRadius = isHovered ? radius * 1.05 : radius;
                            const gradId = gradients[index].id;

                            if (slicePercent === 1) {
                                return (
                                    <circle
                                        key={db.id}
                                        cx="0" cy="0" r={currentRadius}
                                        fill={`url(#${gradId})`}
                                        className="rds-chart-segment"
                                        style={{ filter: isHovered ? 'url(#bloom-glow)' : 'none' }}
                                        onMouseEnter={() => setHoveredData({ name: db.db_identifier, value: db.storage_used, color: gradients[index].solid })}
                                        onMouseLeave={() => setHoveredData(null)}
                                    />
                                );
                            }

                            const pathData = [
                                `M ${startX * currentRadius} ${startY * currentRadius}`,
                                `A ${currentRadius} ${currentRadius} 0 ${largeArcFlag} 1 ${endX * currentRadius} ${endY * currentRadius}`,
                                `L 0 0`,
                                `Z`
                            ].join(' ');

                            return (
                                <path
                                    key={db.id}
                                    d={pathData}
                                    fill={`url(#${gradId})`}
                                    className="rds-chart-segment"
                                    style={{ filter: isHovered ? 'url(#bloom-glow)' : 'none' }}
                                    onMouseEnter={() => setHoveredData({ name: db.db_identifier, value: db.storage_used, color: gradients[index].solid })}
                                    onMouseLeave={() => setHoveredData(null)}
                                />
                            );
                        })}

                        {/* Unused Storage Segment */}
                        {effectiveAllocated > totalUsed && (() => {
                            const slicePercent = (effectiveAllocated - totalUsed) / effectiveAllocated;
                            const [startX, startY] = getCoordinatesForPercent(cumulativePercent);
                            cumulativePercent += slicePercent;
                            const [endX, endY] = getCoordinatesForPercent(cumulativePercent);
                            const largeArcFlag = slicePercent > 0.5 ? 1 : 0;
                            const isHovered = hoveredData?.name === 'Unused Storage';
                            const currentRadius = isHovered ? radius * 1.05 : radius;

                            const pathData = [
                                `M ${startX * currentRadius} ${startY * currentRadius}`,
                                `A ${currentRadius} ${currentRadius} 0 ${largeArcFlag} 1 ${endX * currentRadius} ${endY * currentRadius}`,
                                `L 0 0`,
                                `Z`
                            ].join(' ');

                            return (
                                <path
                                    d={pathData}
                                    fill="rgba(255, 255, 255, 0.08)"
                                    className="rds-chart-segment unused-segment"
                                    onMouseEnter={() => setHoveredData({ name: 'Unused Storage', value: effectiveAllocated - totalUsed, color: '#64748b' })}
                                    onMouseLeave={() => setHoveredData(null)}
                                />
                            );
                        })()}
                    </>
                )}
            </svg>

            <div className="rds-pie-center-info">
                <div className="rds-chart-center-used">{totalUsed.toFixed(1)}GB</div>
                <div className="rds-chart-center-sub">of {effectiveAllocated.toFixed(1)}GB ALC</div>
                <div className="rds-chart-center-count">{rdsInstances.length} Instances</div>
            </div>

            {hoveredData && (
                <div className="rds-chart-tooltip">
                    <div className="rds-tooltip-dot" style={{ background: hoveredData.color, boxShadow: `0 0 12px ${hoveredData.color}` }}></div>
                    <div className="rds-tooltip-content">
                        <div className="rds-tooltip-name">{hoveredData.name}</div>
                        <div className="rds-tooltip-value" style={{ color: hoveredData.color }}>{hoveredData.value.toFixed(2)} GB Used</div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Math helper for precise Pie slices
const getCoordinatesForPercent = (percent) => {
    const x = Math.cos(2 * Math.PI * percent);
    const y = Math.sin(2 * Math.PI * percent);
    return [x, y];
};

const AuroraStoragePieChart = ({ databases }) => {
    const [hoveredData, setHoveredData] = useState(null);
    const size = 260;
    const padding = 1.25;
    const boxSize = padding * 2;
    const radius = 1;

    const auroraClusters = databases.filter(db => db.is_aurora && db.storage_used > 0)
        .sort((a, b) => b.storage_used - a.storage_used);

    const gradients = useMemo(() => generateColors(Math.max(auroraClusters.length, 1)), [auroraClusters.length]);
    const totalUsed = auroraClusters.reduce((sum, db) => sum + (db.storage_used || 0), 0);

    let cumulativePercent = 0;

    return (
        <div className="rds-custom-chart-container">
            <svg width={size} height={size} viewBox={`-${padding} -${padding} ${boxSize} ${boxSize}`} style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}>
                <ChartFilters />
                <defs>
                    {gradients.map(g => (
                        <linearGradient key={g.id} id={g.id} x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor={g.start} />
                            <stop offset="100%" stopColor={g.stop} />
                        </linearGradient>
                    ))}
                </defs>

                {totalUsed === 0 ? (
                    <circle cx="0" cy="0" r={radius} fill="var(--rds-chart-track)" />
                ) : (
                    auroraClusters.map((db, index) => {
                        const slicePercent = db.storage_used / totalUsed;
                        if (slicePercent <= 0) return null;

                        const [startX, startY] = getCoordinatesForPercent(cumulativePercent);
                        cumulativePercent += slicePercent;
                        const [endX, endY] = getCoordinatesForPercent(cumulativePercent);
                        const largeArcFlag = slicePercent > 0.5 ? 1 : 0;

                        const isHovered = hoveredData?.name === db.db_identifier;
                        const currentRadius = isHovered ? radius * 1.05 : radius;
                        const gradId = gradients[index].id;

                        if (slicePercent === 1) {
                            return (
                                <circle
                                    key={db.id}
                                    cx="0" cy="0" r={currentRadius}
                                    fill={`url(#${gradId})`}
                                    className="rds-chart-segment"
                                    style={{ filter: isHovered ? 'url(#bloom-glow)' : 'none' }}
                                    onMouseEnter={() => setHoveredData({ name: db.db_identifier, value: db.storage_used, color: gradients[index].solid })}
                                    onMouseLeave={() => setHoveredData(null)}
                                />
                            );
                        }

                        const pathData = [
                            `M ${startX * currentRadius} ${startY * currentRadius}`,
                            `A ${currentRadius} ${currentRadius} 0 ${largeArcFlag} 1 ${endX * currentRadius} ${endY * currentRadius}`,
                            `L 0 0`,
                            `Z`
                        ].join(' ');

                        return (
                            <path
                                key={db.id}
                                d={pathData}
                                fill={`url(#${gradId})`}
                                className="rds-chart-segment"
                                style={{ filter: isHovered ? 'url(#bloom-glow)' : 'none' }}
                                onMouseEnter={() => setHoveredData({ name: db.db_identifier, value: db.storage_used, color: gradients[index].solid })}
                                onMouseLeave={() => setHoveredData(null)}
                            />
                        );
                    })
                )}
            </svg>

            <div className="rds-pie-center-info">
                <div className="rds-chart-center-total">{totalUsed.toFixed(1)}GB</div>
                <div className="rds-chart-center-sub">Storage</div>
                <div className="rds-chart-center-count">{auroraClusters.length} Clusters</div>
            </div>

            {hoveredData && (
                <div className="rds-chart-tooltip">
                    <div className="rds-tooltip-dot" style={{ background: hoveredData.color, boxShadow: `0 0 12px ${hoveredData.color}` }}></div>
                    <div className="rds-tooltip-content">
                        <div className="rds-tooltip-name">{hoveredData.name}</div>
                        <div className="rds-tooltip-value" style={{ color: hoveredData.color }}>{hoveredData.value.toFixed(2)} GB Used</div>
                    </div>
                </div>
            )}
        </div>
    );
};

const DocumentDBStoragePieChart = ({ databases }) => {
    const [hoveredData, setHoveredData] = useState(null);
    const size = 260;
    const padding = 1.25;
    const boxSize = padding * 2;
    const radius = 1;

    const docDbClusters = databases.filter(db => db.is_docdb && db.storage_used > 0)
        .sort((a, b) => b.storage_used - a.storage_used);

    const gradients = useMemo(() => generateColors(Math.max(docDbClusters.length, 1)), [docDbClusters.length]);
    const totalUsed = docDbClusters.reduce((sum, db) => sum + (db.storage_used || 0), 0);

    let cumulativePercent = 0;

    return (
        <div className="rds-custom-chart-container">
            <svg width={size} height={size} viewBox={`-${padding} -${padding} ${boxSize} ${boxSize}`} style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}>
                <ChartFilters />
                <defs>
                    {gradients.map(g => (
                        <linearGradient key={g.id} id={g.id} x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor={g.start} />
                            <stop offset="100%" stopColor={g.stop} />
                        </linearGradient>
                    ))}
                </defs>

                {totalUsed === 0 ? (
                    <circle cx="0" cy="0" r={radius} fill="var(--rds-chart-track)" />
                ) : (
                    docDbClusters.map((db, index) => {
                        const slicePercent = db.storage_used / totalUsed;
                        if (slicePercent <= 0) return null;

                        const [startX, startY] = getCoordinatesForPercent(cumulativePercent);
                        cumulativePercent += slicePercent;
                        const [endX, endY] = getCoordinatesForPercent(cumulativePercent);
                        const largeArcFlag = slicePercent > 0.5 ? 1 : 0;

                        const isHovered = hoveredData?.name === db.db_identifier;
                        const currentRadius = isHovered ? radius * 1.05 : radius;
                        const gradId = gradients[index].id;

                        if (slicePercent === 1) {
                            return (
                                <circle
                                    key={db.id}
                                    cx="0" cy="0" r={currentRadius}
                                    fill={`url(#${gradId})`}
                                    className="rds-chart-segment"
                                    style={{ filter: isHovered ? 'url(#bloom-glow)' : 'none' }}
                                    onMouseEnter={() => setHoveredData({ name: db.db_identifier, value: db.storage_used, color: gradients[index].solid })}
                                    onMouseLeave={() => setHoveredData(null)}
                                />
                            );
                        }

                        const pathData = [
                            `M ${startX * currentRadius} ${startY * currentRadius}`,
                            `A ${currentRadius} ${currentRadius} 0 ${largeArcFlag} 1 ${endX * currentRadius} ${endY * currentRadius}`,
                            `L 0 0`,
                            `Z`
                        ].join(' ');

                        return (
                            <path
                                key={db.id}
                                d={pathData}
                                fill={`url(#${gradId})`}
                                className="rds-chart-segment"
                                style={{ filter: isHovered ? 'url(#bloom-glow)' : 'none' }}
                                onMouseEnter={() => setHoveredData({ name: db.db_identifier, value: db.storage_used, color: gradients[index].solid })}
                                onMouseLeave={() => setHoveredData(null)}
                            />
                        );
                    })
                )}
            </svg>

            <div className="rds-pie-center-info">
                <div className="rds-chart-center-total">{totalUsed.toFixed(1)}GB</div>
                <div className="rds-chart-center-sub">Storage</div>
                <div className="rds-chart-center-count">{docDbClusters.length} Clusters</div>
            </div>

            {hoveredData && (
                <div className="rds-chart-tooltip">
                    <div className="rds-tooltip-dot" style={{ background: hoveredData.color, boxShadow: `0 0 12px ${hoveredData.color}` }}></div>
                    <div className="rds-tooltip-content">
                        <div className="rds-tooltip-name">{hoveredData.name}</div>
                        <div className="rds-tooltip-value" style={{ color: hoveredData.color }}>{hoveredData.value.toFixed(2)} GB Used</div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default function RDS() {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('all'); // 'all', 'rds', 'aurora', 'docdb'
    const [activeStatFilter, setActiveStatFilter] = useState(null); // 'available', 'stopped', '247', 'never', 'exception'
    const [selectedRows, setSelectedRows] = useState([]);
    const [expandedClusters, setExpandedClusters] = useState({});
    const [databases, setDatabases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [dashboardStats, setDashboardStats] = useState(null);
    const [statsLoading, setStatsLoading] = useState(true);
    const [statsError, setStatsError] = useState(null);
    const [rowActionLoading, setRowActionLoading] = useState({});
    const operationPollers = useRef({});
    const [isUploading, setIsUploading] = useState(false);
    const [sortBy, setSortBy] = useState(null);
    const [sortDir, setSortDir] = useState('asc');
    const [showColumnSettings, setShowColumnSettings] = useState(false);
    const [pendingVisibleColumns, setPendingVisibleColumns] = useState({});
    const [availableInstanceTypes, setAvailableInstanceTypes] = useState([]);
    const [instanceTypesLoading, setInstanceTypesLoading] = useState(false);
    const [selectedInstanceClass, setSelectedInstanceClass] = useState("");
    const modificationPollers = useRef({});
    const [modificationLoading, setModificationLoading] = useState({});

    // --- Column Visibility State ---
    const columnDefinitions = [
        { key: 'identifier', label: 'Identifier', mandatory: true },
        { key: 'role', label: 'Role' },
        { key: 'engine', label: 'Engine' },
        { key: 'class', label: 'Class' },
        { key: 'storage', label: 'Storage' },
        { key: 'status', label: 'Status' },
        { key: 'actions', label: 'Actions', mandatory: true },
        { key: 'policies', label: 'Scheduling Policies', mandatory: true },
        { key: 'schedule', label: 'Schedule', mandatory: true },
        { key: 'edit', label: 'Edit', mandatory: true }
    ];

    const [visibleColumns, setVisibleColumns] = useState({
        identifier: true,
        role: true,
        engine: true,
        class: true,
        storage: true,
        status: true,
        actions: true,
        policies: true,
        schedule: true,
        edit: true
    });

    const smartPresets = {
        full: { label: 'Full View', cols: ['identifier', 'role', 'engine', 'class', 'storage', 'status', 'actions', 'policies', 'schedule', 'edit'] },
        operational: { label: 'Operational', cols: ['identifier', 'role', 'status', 'actions', 'policies'] },
        sizing: { label: 'Sizing', cols: ['identifier', 'engine', 'class', 'storage'] },
        minimal: { label: 'Minimal', cols: ['identifier', 'status', 'actions'] }
    };

    const applyPreset = (presetKey) => {
        const preset = smartPresets[presetKey];
        const newVisible = { identifier: true };
        columnDefinitions.forEach(col => {
            if (col.key !== 'identifier') {
                newVisible[col.key] = preset.cols.includes(col.key);
            }
        });
        setVisibleColumns(newVisible);
    };


    // --- Resizable Table Logic ---
    const initialWidths = {
        checkbox: 40,
        identifier: 280,
        role: 120,
        engine: 150,
        class: 150,
        storage: 200,
        status: 130,
        actions: 140,
        policies: 180,
        schedule: 120,
        edit: 60
    };

    const [columnWidths, setColumnWidths] = useState(initialWidths);
    const resizingColumn = useRef(null);
    const fileInputRef = useRef(null);
    const startX = useRef(0);
    const startWidth = useRef(0);

    const handleResizeMouseDown = (e, column) => {
        e.preventDefault();
        resizingColumn.current = column;
        startX.current = e.pageX;
        startWidth.current = columnWidths[column];

        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';

        const onMouseMove = (moveEvent) => {
            if (!resizingColumn.current) return;
            const diff = moveEvent.pageX - startX.current;
            const newWidth = Math.max(initialWidths[resizingColumn.current], startWidth.current + diff);
            setColumnWidths(prev => ({
                ...prev,
                [resizingColumn.current]: newWidth
            }));
        };

        const onMouseUp = () => {
            resizingColumn.current = null;
            document.body.style.cursor = 'default';
            document.body.style.userSelect = 'auto';
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    };

    // Upload state
    const [uploadedFile, setUploadedFile] = useState(null);

    // Edit Modal state
    const [editModal, setEditModal] = useState({ open: false, db: null });

    // Schedule Modal state
    const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
    const [scheduleTarget, setScheduleTarget] = useState(null);

    // Bulk Action Modal state
    const [bulkModalOpen, setBulkModalOpen] = useState(false);
    const [bulkAction, setBulkAction] = useState(null); // 'START' or 'STOP'

    // Sync state
    const [isSyncing, setIsSyncing] = useState(false);
    const [confirmModal, setConfirmModal] = useState({ open: false, message: '', onConfirm: null });

    const closeConfirmModal = () => setConfirmModal({ open: false, message: '', onConfirm: null });

    const handleSync = async () => {
        try {
            setIsSyncing(true);

            const response = await axiosClient.post("/rds/sync");

            if (!response.data.success) {
                throw new Error("Sync failed");
            }

            // Refresh data after sync completes
            await fetchInstances();
            await fetchDashboardStats();

        } catch (error) {
            console.error("RDS Sync failed:", error);
            setError("RDS Sync failed. Please try again.");
        } finally {
            setIsSyncing(false);
        }
    };

    const handleSyncWithConfirm = () => {
        setConfirmModal({
            open: true,
            message: 'Syncing clusters may take a few minutes and refresh all database data. Are you sure you want to proceed?',
            onConfirm: async () => {
                closeConfirmModal();
                await handleSync();
            }
        });
    };

    const transformBackendData = (apiData) => {
        return apiData.map(item => {

            // ==========================
            // AURORA CLUSTER
            // ==========================
            if (item.instances) {
                return {
                    id: item.cluster_identifier,
                    db_identifier: item.cluster_identifier,
                    is_aurora: true,
                    engine: item.engine,
                    engine_version: item.engine_version,
                    storage_allocated: null,
                    storage_used: parseFloat(item.used_storage_gb) || 0,
                    status: item.status,
                    vcpu: null,
                    memory: null,

                    // Protection Mapping
                    is_24_7: item.protection_type === "always_running",
                    never_start: item.protection_type === "never_start",
                    daily_exception: item.protection_type === "daily_exception",

                    schedule: item.protection_type === "custom_schedule"
                        ? {
                            from_date: new Date().toISOString().split("T")[0],
                            to_date: new Date().toISOString().split("T")[0]
                        }
                        : null,

                    instances: item.instances.map(inst => ({
                        id: inst.id,
                        db_identifier: inst.db_identifier,
                        role: inst.role,
                        instance_class: inst.instance_class,
                        status: inst.status,
                        vcpu: inst.vcpu,
                        memory: parseFloat(inst.memory_gb)
                    }))
                };
            }

            // ==========================
            // RDS INSTANCE
            // ==========================
            return {
                id: item.id,
                db_identifier: item.db_identifier,
                is_aurora: false,
                engine: item.engine,
                engine_version: item.engine_version,
                instance_class: item.instance_class,
                storage_allocated: item.allocated_storage_gb,
                storage_used: parseFloat(item.used_storage_gb) || 0,
                status: item.status,
                vcpu: item.vcpu,
                memory: parseFloat(item.memory_gb),

                is_24_7: item.protection_type === "always_running",
                never_start: item.protection_type === "never_start",
                daily_exception: item.protection_type === "daily_exception",

                schedule: item.protection_type === "custom_schedule"
                    ? {
                        from_date: new Date().toISOString().split("T")[0],
                        to_date: new Date().toISOString().split("T")[0]
                    }
                    : null
            };
        });
    };

    const fetchInstances = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await axiosClient.get("/rds/instances");
            const apiData = response.data.data || [];

            if (apiData.length === 0) {
                console.log('⚠️ API returned no RDS instances, falling back to dummy databases');
                setDatabases(DUMMY_DATABASES);
            } else {
                const transformed = transformBackendData(apiData);
                setDatabases(transformed);
            }

        } catch (err) {
            console.error("Error fetching RDS instances:", err);
            // setError("Failed to load database instances.");
            console.log('⚠️ Falling back to dummy databases');
            setDatabases(DUMMY_DATABASES);
            setError(null);
        } finally {
            setLoading(false);
        }
    };

    const fetchDashboardStats = async () => {
        try {
            setStatsLoading(true);
            setStatsError(null);

            const response = await axiosClient.get("/rds/dashboard/stats");
            const apiStats = response.data.data;

            if (!apiStats || Object.keys(apiStats).length === 0) {
                setDashboardStats(DUMMY_RDS_STATS);
            } else {
                setDashboardStats(apiStats);
            }

        } catch (err) {
            console.error("Error fetching dashboard stats:", err);
            // setStatsError("Failed to load dashboard statistics.");
            setDashboardStats(DUMMY_RDS_STATS);
        } finally {
            setStatsLoading(false);
        }
    };

    useEffect(() => {
        fetchInstances();
        fetchDashboardStats();

        const modifying = JSON.parse(localStorage.getItem("rds_modifying") || "[]");

        modifying.forEach(dbIdentifier => {
            pollModificationStatus(dbIdentifier);
        });

    }, []);

    const executeRowAction = async (db, action) => {
        try {
            setRowActionLoading(prev => ({
                ...prev,
                [db.id]: action
            }));

            const endpointMap = {
                START: "/rds/instances/start",
                STOP: "/rds/instances/stop",
                REBOOT: "/rds/instances/reboot"
            };

            // 🔵 Optimistic status
            setDatabases(prev =>
                prev.map(item => {
                    if (item.id === db.id) {
                        if (action === "START") return { ...item, status: "starting" };
                        if (action === "STOP") return { ...item, status: "stopping" };
                        if (action === "REBOOT") return { ...item, status: "rebooting" };
                    }
                    return item;
                })
            );

            const response = await axiosClient.post(
                endpointMap[action],
                {},
                { params: { db_identifier: db.db_identifier } }
            );

            if (!response.data.success) {
                throw new Error("Operation initiation failed");
            }

            const operationId = response.data.data.operation_id;

            // 🔁 Start polling
            pollOperationStatus(operationId, db.db_identifier, action);

        } catch (error) {
            console.error(`${action} failed for ${db.db_identifier}`, error);
            fetchInstances();
        } finally {
            setRowActionLoading(prev => {
                const updated = { ...prev };
                delete updated[db.id];
                return updated;
            });
        }
    };

    useEffect(() => {
        return () => {
            Object.values(operationPollers.current).forEach(clearInterval);
        };
    }, []);

    const handleRowActionWithConfirm = (db, action) => {
        const actionLower = action.toLowerCase();

        setConfirmModal({
            open: true,
            message: `Are you sure you want to ${actionLower} database "${db.db_identifier}"?`,
            onConfirm: async () => {
                closeConfirmModal();
                await executeRowAction(db, action);
            }
        });
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setConfirmModal({
            open: true,
            message: `Are you sure you want to upload "${file.name}"?`,
            onConfirm: async () => {
                closeConfirmModal();
                await executeFileUpload(file);
                // Reset input
                event.target.value = '';
            }
        });
    };

    const executeFileUpload = async (file) => {
        try {
            setIsUploading(true);
            setError(null);

            const formData = new FormData();
            formData.append("file", file);

            const response = await axiosClient.post(
                "/rds/daily-exceptions/upload",
                formData,
                {
                    headers: {
                        "Content-Type": "multipart/form-data"
                    }
                }
            );

            if (!response.data.success) {
                throw new Error(response.data.error || "Upload failed");
            }

            const {
                added,
                skipped,
                valid,
                invalid,
                total,
                expires_at
            } = response.data;

            setConfirmModal({
                open: true,
                message: `
                    Upload Summary:

                    Total Rows: ${total}
                    Valid: ${valid}
                    Invalid: ${invalid}
                    Added: ${added}
                    Skipped: ${skipped}

                    Expires At: ${new Date(expires_at).toLocaleString()}
                `,
                onConfirm: () => closeConfirmModal()
            });

            await fetchInstances();
            await fetchDashboardStats();

        } catch (error) {
            const backendMessage =
                error.response?.data?.error ||
                "Failed to process daily exceptions.";

            setConfirmModal({
                open: true,
                message: backendMessage,
                onConfirm: () => closeConfirmModal()
            });
        } finally {
            setIsUploading(false);
        }
    };

    const handleBulkConfirm = (action, mode) => {
        const actionLower = action.toLowerCase();
        const message = `This will ${actionLower} ${mode === 'ALL' ? 'all the' : 'selected'} databases.`;

        setConfirmModal({
            open: true,
            message: message,
            onConfirm: async () => {
                closeConfirmModal();
                await executeBulkAction(action, mode);
            }
        });
    };

    const pollOperationStatus = (operationId, dbIdentifier, action) => {
        const interval = setInterval(async () => {
            try {
                const response = await axiosClient.get("/rds/instances/operation-status", {
                    params: { operation_id: operationId }
                });

                if (!response.data.success) return;

                const { status } = response.data.data;

                if (status === "completed") {
                    clearInterval(operationPollers.current[operationId]);
                    delete operationPollers.current[operationId];

                    setDatabases(prev =>
                        prev.map(db => {
                            if (db.db_identifier === dbIdentifier) {
                                if (action === "START") return { ...db, status: "available" };
                                if (action === "STOP") return { ...db, status: "stopped" };
                                if (action === "REBOOT") return { ...db, status: "available" };
                            }
                            return db;
                        })
                    );

                    fetchDashboardStats();
                }

                if (status === "failed") {
                    clearInterval(operationPollers.current[operationId]);
                    delete operationPollers.current[operationId];
                    fetchInstances();
                }

            } catch (error) {
                console.error("Polling failed:", error);
            }
        }, 15000);

        operationPollers.current[operationId] = interval;
    };

    // const handleRowActionWithConfirm = (db, action) => {
    //     const actionLower = action.toLowerCase();
    //     setConfirmModal({
    //         open: true,
    //         message: `Are you sure you want to ${actionLower} database "${db.db_identifier}"?`,
    //         onConfirm: async () => {
    //             closeConfirmModal();
    //             console.log(`Executing ${action} on ${db.db_identifier}`);
    //             // Mock status change
    //             setDatabases(prev => prev.map(item => {
    //                 if (item.id === db.id) {
    //                     let newStatus = item.status;
    //                     if (action === 'START') newStatus = 'available';
    //                     if (action === 'STOP') newStatus = 'stopped';
    //                     return { ...item, status: newStatus };
    //                 }
    //                 return item;
    //             }));
    //         }
    //     });
    // };

    const executePolicyAction = async (db, field) => {
        try {
            const isActive = db[field];

            const endpointMap = {
                is_24_7: {
                    add: "/rds/whitelist",
                    remove: `/rds/whitelist/${db.db_identifier}`
                },
                never_start: {
                    add: "/rds/never-start",
                    remove: `/rds/never-start/${db.db_identifier}`
                },
                daily_exception: {
                    add: "/rds/daily-exceptions",
                    remove: `/rds/daily-exceptions/${db.db_identifier}` // dummy route for now
                }
            };

            const endpoints = endpointMap[field];

            if (!endpoints) return;

            // 🔵 Optimistic UI Update
            setDatabases(prev =>
                prev.map(item => {
                    if (item.id === db.id) {

                        if (isActive) {
                            // Turning OFF
                            return { ...item, [field]: false };
                        } else {
                            // Turning ON (mutually exclusive)
                            return {
                                ...item,
                                is_24_7: field === "is_24_7",
                                never_start: field === "never_start",
                                daily_exception: field === "daily_exception"
                            };
                        }
                    }
                    return item;
                })
            );

            if (isActive) {
                // DELETE
                await axiosClient.delete(endpoints.remove);
            } else {
                // POST
                await axiosClient.post(endpoints.add, {
                    db_identifier: db.db_identifier
                });
            }

            // Optional: refresh stats only
            fetchDashboardStats();

        } catch (error) {
            console.error("Policy update failed:", error);

            // 🔴 Rollback UI on failure
            fetchInstances();
        }
    };

    const handlePolicyWithConfirm = (db, field, label) => {
        const isActive = db[field];

        const actionText = isActive ? 'remove' : 'enable';

        setConfirmModal({
            open: true,
            message: `Are you sure you want to ${actionText} "${label}" for database "${db.db_identifier}"?`,
            onConfirm: async () => {
                closeConfirmModal();
                await executePolicyAction(db, field);
            }
        });
    };

    const executeBulkAction = async (action, mode) => {
        try {
            let response;

            // =====================================================
            // MODE: ALL  →  Use new backend APIs
            // =====================================================
            if (mode === "ALL") {

                const endpoint =
                    action === "START"
                        ? "/rds/instances/start-all"
                        : "/rds/instances/stop-all";

                response = await axiosClient.post(endpoint);

                if (!response.data.success) {
                    throw new Error("Bulk ALL operation failed");
                }

                const { summary, operations } = response.data;

                // Nothing eligible
                if (summary.total === 0) {
                    console.warn(`No eligible databases for ${action}`);
                    return;
                }

                // 🔵 Optimistic UI update
                setDatabases(prev =>
                    prev.map(db => {
                        if (action === "START" && db.status.toLowerCase() === "stopped") {
                            return { ...db, status: "starting" };
                        }
                        if (action === "STOP" && db.status.toLowerCase() === "available") {
                            return { ...db, status: "stopping" };
                        }
                        return db;
                    })
                );

                // 🔁 Start polling for each operation
                operations.forEach(op => {
                    pollOperationStatus(op.operation_id, op.db_identifier, action);
                });

            }

            // =====================================================
            // MODE: SELECTED  →  Use your existing bulk endpoints
            // =====================================================
            if (mode === "SELECTED") {

                const endpoint =
                    action === "START"
                        ? "/rds/instances/bulk-start"
                        : "/rds/instances/bulk-stop";

                const targetDatabases =
                    databases.filter(db => selectedRows.includes(db.id));

                if (!targetDatabases.length) return;

                const dbIdentifiers = targetDatabases.map(db => db.db_identifier);

                // 🔵 Optimistic UI update
                setDatabases(prev =>
                    prev.map(db => {
                        if (dbIdentifiers.includes(db.db_identifier)) {
                            if (action === "START") return { ...db, status: "starting" };
                            if (action === "STOP") return { ...db, status: "stopping" };
                        }
                        return db;
                    })
                );

                response = await axiosClient.post(endpoint, {
                    db_identifiers: dbIdentifiers
                });

                if (!response.data.success) {
                    throw new Error("Bulk SELECTED operation failed");
                }

                const { operations } = response.data;

                operations.forEach(op => {
                    pollOperationStatus(op.operation_id, op.db_identifier, action);
                });
            }

            // 🟢 Clear selection
            setSelectedRows([]);

            // 🟢 Refresh stats after small delay
            setTimeout(() => {
                fetchDashboardStats();
            }, 3000);

        } catch (error) {
            console.error(`Bulk ${action} failed`, error);

            // Rollback on failure
            fetchInstances();
        }
    };

    const handleScheduleConfirm = async (range) => {
        console.log('Confirmed schedule for:', scheduleTarget, range);
        // Add actual API call logic here if needed
        setScheduleModalOpen(false);
    };

    const handleScheduleRemove = async () => {
        console.log('Removed schedule for:', scheduleTarget);
        // Add actual API call logic here if needed
        setScheduleModalOpen(false);
    };

    // Filtering
    const filteredDatabases = useMemo(() => {
        return databases.filter(db => {
            // Type Filter (RDS/Aurora/DocDB)
            if (filterType === 'rds' && (db.is_aurora || db.is_docdb)) return false;
            if (filterType === 'aurora' && !db.is_aurora) return false;
            if (filterType === 'docdb' && !db.is_docdb) return false;

            // Search Filter
            if (searchQuery && !db.db_identifier.toLowerCase().includes(searchQuery.toLowerCase())) return false;

            // Stat Card Filter
            if (activeStatFilter) {
                switch (activeStatFilter) {
                    case 'available': if (db.status.toLowerCase() !== 'available') return false; break;
                    case 'stopped': if (db.status.toLowerCase() !== 'stopped') return false; break;
                    case '247': if (!db.is_24_7) return false; break;
                    case 'never': if (!db.never_start) return false; break;
                    case 'exception': if (!db.daily_exception) return false; break;
                    default: break;
                }
            }

            return true;
        });
    }, [databases, filterType, searchQuery, activeStatFilter]);

    const handleSort = (key) => {
        if (sortBy === key) {
            setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(key);
            setSortDir('asc');
        }
    };

    const sortedDatabases = useMemo(() => {
        if (!sortBy) return filteredDatabases;
        return [...filteredDatabases].sort((a, b) => {
            let valA = a[sortBy];
            let valB = b[sortBy];

            // Special handling for Storage (sort by Used)
            if (sortBy === 'storage') {
                valA = a.storage_used || 0;
                valB = b.storage_used || 0;
            }

            // Numeric Sort
            if (typeof valA === 'number' && typeof valB === 'number') {
                return sortDir === 'asc' ? valA - valB : valB - valA;
            }

            // String Sort fallback
            const strA = String(valA || '').toLowerCase();
            const strB = String(valB || '').toLowerCase();
            if (strA < strB) return sortDir === 'asc' ? -1 : 1;
            if (strA > strB) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });
    }, [filteredDatabases, sortBy, sortDir]);

    const toggleStatFilter = (filter) => {
        setActiveStatFilter(prev => prev === filter ? null : filter);
    };

    const toggleCluster = (id) => {
        setExpandedClusters(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const handleSelectRow = (id) => {
        setSelectedRows(prev =>
            prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
        );
    };

    const handleSelectAll = () => {
        if (selectedRows.length === sortedDatabases.length) {
            setSelectedRows([]);
        } else {
            setSelectedRows(sortedDatabases.map(db => db.id));
        }
    };

    const FilterButton = ({ type, label, active }) => (
        <button
            className={`rds-filter-toggle-btn ${active ? 'rds-active' : ''}`}
            onClick={() => {
                if (filterType === type) setFilterType('all');
                else setFilterType(type);
            }}
        >
            {label}
        </button>
    );

    const fetchInstanceTypes = async (engine) => {
        try {
            setInstanceTypesLoading(true);

            const response = await axiosClient.get("/rds/instance-types", {
                params: { engine }
            });

            if (response.data.success) {
                setAvailableInstanceTypes(response.data.data);
            }

        } catch (error) {
            console.error("Failed to fetch instance types", error);
        } finally {
            setInstanceTypesLoading(false);
        }
    };

    const modifyInstanceClass = async () => {
        const db = editModal.db;

        try {

            const response = await axiosClient.post(
                "/rds/instances/modify",
                {},
                {
                    params: {
                        db_identifier: db.db_identifier,
                        new_instance_class: selectedInstanceClass
                    }
                }
            );

            if (!response.data.success) {
                throw new Error("Modification failed");
            }

            // Optimistic UI update
            setDatabases(prev =>
                prev.map(item =>
                    item.db_identifier === db.db_identifier
                        ? { ...item, status: "modifying" }
                        : item
                )
            );

            // Persist modifying state
            const modifying = JSON.parse(localStorage.getItem("rds_modifying") || "[]");
            if (!modifying.includes(db.db_identifier)) {
                modifying.push(db.db_identifier);
                localStorage.setItem("rds_modifying", JSON.stringify(modifying));
            }

            setModificationLoading(prev => ({
                ...prev,
                [db.db_identifier]: true
            }));

            pollModificationStatus(db.db_identifier);

            setEditModal({ open: false, db: null });

        } catch (error) {
            console.error("Instance modification failed", error);
        }
    };

    const pollModificationStatus = (dbIdentifier) => {

        const interval = setInterval(async () => {

            try {

                const response = await axiosClient.get(
                    "/rds/instances/modification-status",
                    { params: { db_identifier: dbIdentifier } }
                );

                if (!response.data.success) return;

                const { status } = response.data.data;

                if (status === "completed") {

                    clearInterval(modificationPollers.current[dbIdentifier]);
                    delete modificationPollers.current[dbIdentifier];

                    const modifying = JSON.parse(localStorage.getItem("rds_modifying") || "[]");
                    const updated = modifying.filter(id => id !== dbIdentifier);
                    localStorage.setItem("rds_modifying", JSON.stringify(updated));

                    setModificationLoading(prev => {
                        const copy = { ...prev };
                        delete copy[dbIdentifier];
                        return copy;
                    });

                    fetchInstances();
                }

            } catch (error) {
                console.error("Modification polling failed", error);
            }

        }, 15000);

        modificationPollers.current[dbIdentifier] = interval;
    };

    useEffect(() => {
        return () => {
            Object.values(operationPollers.current).forEach(clearInterval);
            Object.values(modificationPollers.current).forEach(clearInterval);
        };
    }, []);

    // Storage Display Component
    const StorageDisplay = ({ allocated, used }) => {
        return (
            <div className="rds-storage-compact-box">
                <span className="rds-storage-val rds-used">{used} GB</span>
                <span className="rds-storage-val-sep"></span>
                <span className="rds-storage-val rds-allocated">{allocated ? `${allocated} GB` : '-'}</span>
            </div>
        );
    };

    const isOperationInProgress = (status) => {
        const s = status?.toLowerCase();
        return ['starting', 'stopping', 'rebooting', 'modifying'].includes(s);
    };

    return (
        <div className="rds-page">
            {/* Page Header */}
            <div className="page-header-modern">
                <div className="header-content-cluster">
                    <div className="header-left-cluster">
                        <div className="header-icon-modern">
                            <Database className="header-icon-svg" />
                        </div>
                        <div className="header-text">
                            <h1 className="page-title-modern">RDS Cluster Dashboard</h1>
                        </div>
                    </div>

                    <button
                        className={`rds-btn-delta-updates rds-sync-btn ${isSyncing ? 'rds-syncing' : ''}`}
                        onClick={handleSyncWithConfirm}
                        disabled={isSyncing}
                    >
                        <div className="rds-icon-wrapper">
                            <RefreshCw size={20} className={isSyncing ? 'rds-spinning' : ''} />
                        </div>
                        <span>{isSyncing ? 'Syncing...' : 'Sync Databases'}</span>
                    </button>
                </div>
            </div>

            {/* Quick Operations Banner */}
            <div className="rds-action-panel">
                <div className="rds-action-info">
                    <div className="rds-action-icon-wrapper">
                        <Activity size={24} />
                    </div>
                    <div>
                        <p className="rds-action-title">Quick Operations</p>
                        <p className="rds-action-subtitle">Manage cluster state and exception policies</p>
                    </div>
                </div>
                <div className="rds-action-buttons">
                    <button
                        className="rds-btn-stack rds-btn-delta-updates rds-start-btn"
                        onClick={() => { setBulkAction('START'); setBulkModalOpen(true); }}
                    >
                        <div className="rds-icon-wrapper">
                            <Play size={16} />
                        </div>
                        <span>Start</span>
                    </button>
                    <button
                        className="rds-btn-stack rds-btn-delta-updates rds-stop-btn"
                        onClick={() => { setBulkAction('STOP'); setBulkModalOpen(true); }}
                    >
                        <div className="rds-icon-wrapper">
                            <Square size={16} />
                        </div>
                        <span>Stop</span>
                    </button>
                    <button
                        className="rds-btn-stack rds-btn-delta-updates rds-update-btn"
                        onClick={() => navigate('/rds/updates')}
                    >
                        <div className="rds-icon-wrapper">
                            <Activity size={16} />
                        </div>
                        <span>Updates</span>
                    </button>
                    <button
                        className={`rds-btn-stack rds-upload-btn ${isUploading ? "rds-loading" : ""}`}
                        onClick={handleUploadClick}
                        disabled={isUploading}
                    >
                        {isUploading ? (
                            <>
                                <span className="rds-btn-spinner"></span>
                                Processing...
                            </>
                        ) : (
                            <>
                                <Upload size={14} />
                                Upload Exceptions
                            </>
                        )}
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        onChange={handleFileChange}
                        accept=".csv,.xlsx,.json"
                    />
                </div>
            </div>

            {/* EC2 Style Stats & Actions Grid - Row 1 */}
            <div className="rds-stats-grid rds-ec2-style">
                <div className="rds-stat-card rds-glass-card rds-ec2-card">
                    <div className="rds-stat-header-ec2">
                        <span className="rds-stat-title-ec2">Total Databases</span>
                        <Database size={24} className="rds-stat-icon-ec2 rds-blue" />
                    </div>
                    <div className="rds-stat-value-ec2 rds-glow-text">{statsLoading ? '—' : dashboardStats?.total_databases ?? 0}</div>
                </div>

                <div
                    className={`rds-stat-card rds-glass-card rds-ec2-card rds-clickable-stat ${activeStatFilter === 'available' ? 'rds-active-filter-green' : ''}`}
                    onClick={() => toggleStatFilter('available')}
                >
                    <div className="rds-stat-header-ec2">
                        <span className="rds-stat-title-ec2">Available</span>
                        <Activity size={24} className="rds-stat-icon-ec2 rds-green" />
                    </div>
                    <div className="rds-stat-value-ec2 rds-green-text">{dashboardStats?.running_count ?? 0}</div>
                </div>

                <div
                    className={`rds-stat-card rds-glass-card rds-ec2-card rds-clickable-stat ${activeStatFilter === 'stopped' ? 'rds-active-filter-red' : ''}`}
                    onClick={() => toggleStatFilter('stopped')}
                >
                    <div className="rds-stat-header-ec2">
                        <span className="rds-stat-title-ec2">Stopped</span>
                        <Activity size={24} className="rds-stat-icon-ec2 rds-red" />
                    </div>
                    <div className="rds-stat-value-ec2 rds-red-text">{dashboardStats?.stopped_count ?? 0}</div>
                </div>

                <div
                    className={`rds-stat-card rds-glass-card rds-ec2-card rds-clickable-stat ${activeStatFilter === '247' ? 'rds-active-filter-blue' : ''}`}
                    onClick={() => toggleStatFilter('247')}
                >
                    <div className="rds-stat-header-ec2">
                        <span className="rds-stat-title-ec2">24/7 Protected</span>
                        <Shield size={24} className="rds-stat-icon-ec2 rds-blue" />
                    </div>
                    <div className="rds-stat-value-ec2 rds-blue-text">{dashboardStats?.always_running_count ?? 0}</div>
                </div>

                <div
                    className={`rds-stat-card rds-glass-card rds-ec2-card rds-clickable-stat ${activeStatFilter === 'never' ? 'rds-active-filter-orange' : ''}`}
                    onClick={() => toggleStatFilter('never')}
                >
                    <div className="rds-stat-header-ec2">
                        <span className="rds-stat-title-ec2">Never-Start</span>
                        <X size={24} className="rds-stat-icon-ec2 rds-orange" />
                    </div>
                    <div className="rds-stat-value-ec2 rds-orange-text">{dashboardStats?.never_start_count ?? 0}</div>
                </div>

                <div
                    className={`rds-stat-card rds-glass-card rds-ec2-card rds-clickable-stat ${activeStatFilter === 'exception' ? 'rds-active-filter-yellow' : ''}`}
                    onClick={() => toggleStatFilter('exception')}
                >
                    <div className="rds-stat-header-ec2">
                        <span className="rds-stat-title-ec2">Daily Exceptions</span>
                        <FileUp size={24} className="rds-stat-icon-ec2 rds-yellow" />
                    </div>
                    <div className="rds-stat-value-ec2 rds-yellow-text">{dashboardStats?.daily_exceptions_count ?? 0}</div>
                </div>
            </div>

            {/* EC2 Style Stats & Actions Grid - Row 2 */}
            <div className="rds-stats-grid rds-ec2-style rds-row-2">
                <div className="rds-stat-card rds-glass-card rds-storage-card-advanced rds-ec2-card">
                    <div className="rds-stat-header-ec2">
                        <span className="rds-stat-title-ec2">RDS Storage</span>
                        <Database size={18} className="rds-stat-icon-ec2 rds-blue" />
                    </div>
                    <RDSStoragePieChart
                        databases={databases}
                    />
                </div>

                <div className="rds-stat-card rds-glass-card rds-storage-card-advanced rds-ec2-card">
                    <div className="rds-stat-header-ec2">
                        <span className="rds-stat-title-ec2">Aurora Usage</span>
                        <HardDrive size={18} className="rds-stat-icon-ec2 rds-purple" />
                    </div>
                    <AuroraStoragePieChart
                        databases={databases}
                    />
                </div>

                <div className="rds-stat-card rds-glass-card rds-storage-card-advanced rds-ec2-card">
                    <div className="rds-stat-header-ec2">
                        <span className="rds-stat-title-ec2">DocumentDB</span>
                        <Server size={18} className="rds-stat-icon-ec2 rds-cyan" />
                    </div>
                    <DocumentDBStoragePieChart
                        databases={databases}
                    />
                </div>
            </div>

            {/* Filter and Search */}
            <div className="rds-controls-container rds-glass-panel">
                <div className="rds-filter-group">
                    <FilterButton type="rds" label="RDS Instances" active={filterType === 'rds'} />
                    <FilterButton type="aurora" label="Aurora Clusters" active={filterType === 'aurora'} />
                    <FilterButton type="docdb" label="DocumentDB" active={filterType === 'docdb'} />
                </div>
                <div className="rds-search-bar-new">
                    <Search className="rds-search-icon" size={18} />
                    <input
                        type="text"
                        placeholder="Search databases..."
                        className="rds-search-input-new"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {loading && (
                <div className="loading-state">
                    <RefreshCw className="spinning" size={24} />
                    <span>Loading RDS data...</span>
                </div>
            )}

            {error && (
                <div className="error-state">
                    <span>{error}</span>
                </div>
            )}

            {/* Main Data Table */}
            {/* Table Header Section (Now Attached) */}
            <div className="rds-table-header-modern attached">
                <div className="rds-th-left">
                    <div className="rds-th-icon">
                        <ArrowUpDown size={20} />
                    </div>
                    <div className="rds-th-text">
                        <div className="rds-th-title">RDS Database Fleet</div>
                        <div className="rds-th-subtitle">Manage clusters and instances · {filteredDatabases.length} items</div>
                    </div>
                </div>
                <div className="rds-th-right">
                    <button
                        className="rds-th-action-btn settings-btn"
                        onClick={() => {
                            setPendingVisibleColumns(visibleColumns);
                            setShowColumnSettings(true);
                        }}
                        title="Column Settings"
                    >
                        <Settings size={18} />
                        <span>Settings</span>
                    </button>
                </div>
            </div>
            {!loading && !error && (
                <div className="rds-table-container rds-glass-panel">
                    <table className="rds-table-glass" style={{ tableLayout: 'fixed', width: 'max-content', minWidth: '100%' }}>
                        <thead>
                            <tr>
                                <th className="rds-checkbox-col" style={{ width: columnWidths.checkbox }}>
                                    <input
                                        type="checkbox"
                                        checked={selectedRows.length === sortedDatabases.length && sortedDatabases.length > 0}
                                        onChange={handleSelectAll}
                                    />
                                </th>
                                {visibleColumns.identifier && (
                                    <th style={{ width: columnWidths.identifier }}>
                                        <div className="rds-resizer-wrapper">
                                            <div style={{ padding: '16px 20px' }}>Identifier</div>
                                            <div className="rds-resizer-handle" onMouseDown={(e) => handleResizeMouseDown(e, 'identifier')}></div>
                                        </div>
                                    </th>
                                )}
                                {visibleColumns.role && (
                                    <th style={{ width: columnWidths.role }}>
                                        <div className="rds-resizer-wrapper">
                                            <div style={{ padding: '16px 20px' }}>Role</div>
                                            <div className="rds-resizer-handle" onMouseDown={(e) => handleResizeMouseDown(e, 'role')}></div>
                                        </div>
                                    </th>
                                )}
                                {visibleColumns.engine && (
                                    <th style={{ width: columnWidths.engine }}>
                                        <div className="rds-resizer-wrapper">
                                            <div style={{ padding: '16px 20px' }}>Engine</div>
                                            <div className="rds-resizer-handle" onMouseDown={(e) => handleResizeMouseDown(e, 'engine')}></div>
                                        </div>
                                    </th>
                                )}
                                {visibleColumns.class && (
                                    <th style={{ width: columnWidths.class }}>
                                        <div className="rds-resizer-wrapper">
                                            <div style={{ padding: '16px 20px' }}>Class</div>
                                            <div className="rds-resizer-handle" onMouseDown={(e) => handleResizeMouseDown(e, 'class')}></div>
                                        </div>
                                    </th>
                                )}
                                {visibleColumns.storage && (
                                    <th style={{ width: columnWidths.storage }} className={`rds-storage-header-cell rds-th-sortable ${sortBy === 'storage' ? 'rds-th-active' : ''}`}>
                                        <div className="rds-resizer-wrapper">
                                            <button className="rds-th-sort-btn" onClick={() => handleSort('storage')}>
                                                <div className="rds-storage-header-main">
                                                    Storage
                                                    <div className="rds-sort-indicator-stacked">
                                                        <ChevronUp size={11} className={`rds-sort-icon-up ${sortBy === 'storage' && sortDir === 'asc' ? 'rds-sort-icon-active' : ''}`} />
                                                        <ChevronDown size={11} className={`rds-sort-icon-down ${sortBy === 'storage' && sortDir === 'desc' ? 'rds-sort-icon-active' : ''}`} />
                                                    </div>
                                                </div>
                                                <div className="rds-storage-header-labels-box">
                                                    <span className="rds-label-item">Used</span>
                                                    <span className="rds-label-sep"></span>
                                                    <span className="rds-label-item">Alloc</span>
                                                </div>
                                            </button>
                                            <div className="rds-resizer-handle" onMouseDown={(e) => handleResizeMouseDown(e, 'storage')}></div>
                                        </div>
                                    </th>
                                )}
                                {visibleColumns.status && (
                                    <th style={{ width: columnWidths.status }} className={`rds-th-sortable ${sortBy === 'status' ? 'rds-th-active' : ''}`}>
                                        <div className="rds-resizer-wrapper">
                                            <button className="rds-th-sort-btn" onClick={() => handleSort('status')}>
                                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                                    Status
                                                    <div className="rds-sort-indicator-stacked">
                                                        <ChevronUp size={11} className={`rds-sort-icon-up ${sortBy === 'status' && sortDir === 'asc' ? 'rds-sort-icon-active' : ''}`} />
                                                        <ChevronDown size={11} className={`rds-sort-icon-down ${sortBy === 'status' && sortDir === 'desc' ? 'rds-sort-icon-active' : ''}`} />
                                                    </div>
                                                </div>
                                            </button>
                                            <div className="rds-resizer-handle" onMouseDown={(e) => handleResizeMouseDown(e, 'status')}></div>
                                        </div>
                                    </th>
                                )}
                                {visibleColumns.actions && (
                                    <th style={{ width: columnWidths.actions }}>
                                        <div className="rds-resizer-wrapper">
                                            Actions
                                            <div className="rds-resizer-handle" onMouseDown={(e) => handleResizeMouseDown(e, 'actions')}></div>
                                        </div>
                                    </th>
                                )}
                                {visibleColumns.policies && (
                                    <th style={{ width: columnWidths.policies }}>
                                        <div className="rds-resizer-wrapper">
                                            Scheduling Policies
                                            <div className="rds-resizer-handle" onMouseDown={(e) => handleResizeMouseDown(e, 'policies')}></div>
                                        </div>
                                    </th>
                                )}
                                {visibleColumns.schedule && (
                                    <th style={{ width: columnWidths.schedule }}>
                                        <div className="rds-resizer-wrapper">
                                            Schedule
                                            <div className="rds-resizer-handle" onMouseDown={(e) => handleResizeMouseDown(e, 'schedule')}></div>
                                        </div>
                                    </th>
                                )}
                                {visibleColumns.edit && (
                                    <th style={{ width: columnWidths.edit }}>
                                        <div className="rds-resizer-wrapper">
                                            Edit
                                            <div className="rds-resizer-handle" onMouseDown={(e) => handleResizeMouseDown(e, 'edit')}></div>
                                        </div>
                                    </th>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {sortedDatabases.map(db => (
                                <React.Fragment key={db.id}>
                                    <tr className={`rds-main-row ${selectedRows.includes(db.id) ? 'rds-selected' : ''}`}>
                                        <td className="rds-checkbox-col">
                                            <input
                                                type="checkbox"
                                                checked={selectedRows.includes(db.id)}
                                                onChange={() => handleSelectRow(db.id)}
                                            />
                                        </td>
                                        {visibleColumns.identifier && (
                                            <td className="rds-identifier-col">
                                                <div className="rds-identifier-wrapper">
                                                    <div className="rds-expand-control-wrapper">
                                                        {(db.is_aurora || db.is_docdb) ? (
                                                            <button className="rds-expand-btn" onClick={() => toggleCluster(db.id)}>
                                                                {expandedClusters[db.id] ? <Minus size={14} /> : <Plus size={14} />}
                                                            </button>
                                                        ) : (
                                                            <div className="rds-expand-spacer"></div>
                                                        )}
                                                    </div>
                                                    <div className="rds-db-info-content">
                                                        <strong>{db.db_identifier}</strong>
                                                        {(() => {
                                                            const status = getScheduleStatus(db);
                                                            if (!status) return null;
                                                            return (
                                                                <div className={`rds-active-schedule-tag ${status.isUrgent ? 'rds-urgent' : ''}`}>
                                                                    <span className="rds-breathing-dot"></span>
                                                                    <Clock size={10} />
                                                                    <span>Active {status.label}</span>
                                                                </div>
                                                            );
                                                        })()}
                                                    </div>
                                                </div>
                                            </td>
                                        )}
                                        {visibleColumns.role && (
                                            <td>
                                                <span className="rds-role-text-display">
                                                    {db.is_aurora || db.is_docdb ? 'Cluster' : 'Instance'}
                                                </span>
                                            </td>
                                        )}
                                        {visibleColumns.engine && (
                                            <td>
                                                <div className="rds-engine-cell">
                                                    <span className="rds-engine-name">{db.engine}</span>
                                                    <span className="rds-engine-version">{db.engine_version}</span>
                                                </div>
                                            </td>
                                        )}
                                        {visibleColumns.class && (
                                            <td>
                                                {(!db.is_aurora && !db.is_docdb) ? <span className="rds-instance-class-badge">{db.instance_class}</span> : '-'}
                                            </td>
                                        )}
                                        {visibleColumns.storage && (
                                            <td>
                                                <StorageDisplay allocated={db.storage_allocated} used={db.storage_used} isAurora={db.is_aurora} />
                                            </td>
                                        )}
                                        {visibleColumns.status && (
                                            <td>
                                                <span className={`rds-status-badge ${getStatusColor(db.status)}`}>
                                                    {formatStatus(db.status)}
                                                </span>
                                            </td>
                                        )}
                                        {visibleColumns.actions && (
                                            <td>
                                                <div className="rds-row-actions">
                                                    <button
                                                        className="rds-icon-btn rds-play"
                                                        title="Start"
                                                        disabled={
                                                            isOperationInProgress(db.status) ||
                                                            ['available', 'running'].includes(db.status.toLowerCase()) ||
                                                            rowActionLoading[db.id]
                                                        }
                                                        onClick={() => handleRowActionWithConfirm(db, 'START')}
                                                    >
                                                        {rowActionLoading[db.id] === 'START'
                                                            ? <RefreshCw size={16} className="rds-spinning" />
                                                            : <Play size={16} />
                                                        }
                                                    </button>
                                                    <button
                                                        className="rds-icon-btn rds-stop"
                                                        title="Stop"
                                                        disabled={
                                                            isOperationInProgress(db.status) ||
                                                            ['stopped'].includes(db.status.toLowerCase()) ||
                                                            rowActionLoading[db.id]
                                                        }
                                                        onClick={() => handleRowActionWithConfirm(db, 'STOP')}
                                                    >
                                                        {rowActionLoading[db.id] === 'STOP'
                                                            ? <RefreshCw size={16} className="rds-spinning" />
                                                            : <Square size={16} />
                                                        }
                                                    </button>
                                                    <button
                                                        className="rds-icon-btn rds-reboot"
                                                        title="Reboot"
                                                        disabled={
                                                            isOperationInProgress(db.status) ||
                                                            ['stopped'].includes(db.status.toLowerCase()) ||
                                                            rowActionLoading[db.id]
                                                        }
                                                        onClick={() => handleRowActionWithConfirm(db, 'REBOOT')}
                                                    >
                                                        {rowActionLoading[db.id] === 'REBOOT'
                                                            ? <RefreshCw size={16} className="rds-spinning" />
                                                            : <RotateCw size={16} />
                                                        }
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                        {visibleColumns.policies && (
                                            <td>
                                                <div className="rds-policy-buttons">
                                                    <button
                                                        className={`rds-policy-btn ${db.is_24_7 ? 'rds-active-247' : ''}`}
                                                        title="24/7 Protected"
                                                        disabled={!db.is_24_7 && (db.never_start || db.daily_exception)}
                                                        onClick={() => handlePolicyWithConfirm(db, 'is_24_7', '24/7 Protected')}
                                                    >
                                                        <Shield size={16} />
                                                    </button>
                                                    <button
                                                        className={`rds-policy-btn ${db.never_start ? 'rds-active-never' : ''}`}
                                                        title="Never Start"
                                                        disabled={!db.never_start && (db.is_24_7 || db.daily_exception)}
                                                        onClick={() => handlePolicyWithConfirm(db, 'never_start', 'Never Start')}
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                    <button
                                                        className={`rds-policy-btn ${db.daily_exception ? 'rds-active-exc' : ''}`}
                                                        title="Daily Exception"
                                                        disabled={!db.daily_exception && (db.is_24_7 || db.never_start)}
                                                        onClick={() => handlePolicyWithConfirm(db, 'daily_exception', 'Daily Exception')}
                                                    >
                                                        <FileUp size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                        {visibleColumns.schedule && (
                                            <td>
                                                <button
                                                    className="rds-btn-set-schedule"
                                                    disabled={db.is_24_7 || db.never_start}
                                                    onClick={() => {
                                                        setScheduleTarget({
                                                            label: db.db_identifier,
                                                            resourceType: 'RDS',
                                                            scope: db.db_identifier,
                                                            db: db
                                                        });
                                                        setScheduleModalOpen(true);
                                                    }}
                                                >
                                                    <Clock size={14} /> Schedule
                                                </button>
                                            </td>
                                        )}
                                        {visibleColumns.edit && (
                                            <td>
                                                {(!db.is_aurora && !db.is_docdb) ? (
                                                    <button
                                                        className="rds-icon-btn rds-edit"
                                                        title="Edit Instance"
                                                        onClick={() => {
                                                            setEditModal({ open: true, db });
                                                            setSelectedInstanceClass("");
                                                            fetchInstanceTypes(db.engine);
                                                        }}
                                                    >
                                                        <Pencil size={18} />
                                                    </button>
                                                ) : (
                                                    <span className="rds-text-muted">-</span>
                                                )}
                                            </td>
                                        )}
                                    </tr>

                                    {/* Expanded Aurora/DocDB Instances */}
                                    {(db.is_aurora || db.is_docdb) && expandedClusters[db.id] && db.instances?.map(inst => (
                                        <tr key={inst.id} className="rds-sub-row">
                                            <td></td>
                                            {visibleColumns.identifier && (
                                                <td className="rds-identifier-col rds-sub">
                                                    <div className="rds-identifier-wrapper">
                                                        <span className="rds-tree-line"></span>
                                                        {inst.db_identifier}
                                                    </div>
                                                </td>
                                            )}
                                            {visibleColumns.role && (
                                                <td>
                                                    <span className="rds-role-text-display">{inst.role}</span>
                                                </td>
                                            )}
                                            {visibleColumns.engine && <td>-</td>}
                                            {visibleColumns.class &&
                                                <td><span className="rds-instance-class-badge">{inst.instance_class}</span></td>
                                            }
                                            {visibleColumns.storage && <td>-</td>}
                                            {visibleColumns.status && (
                                                <td>
                                                    <span className={`rds-status-badge ${getStatusColor(inst.status)}`}>
                                                        {formatStatus(inst.status)}
                                                    </span>
                                                </td>
                                            )}
                                            <td colSpan={Object.values(visibleColumns).filter(v => v).length - (visibleColumns.identifier ? 1 : 0) - (visibleColumns.role ? 1 : 0) - (visibleColumns.engine ? 1 : 0) - (visibleColumns.class ? 1 : 0) - (visibleColumns.storage ? 1 : 0) - (visibleColumns.status ? 1 : 0)} className="rds-sub-actions-info">
                                                <span className="rds-text-muted">Managed via cluster</span>
                                            </td>

                                            <td>
                                                <button
                                                    className="rds-icon-btn rds-edit"
                                                    title="Edit Instance"
                                                    onClick={() => {
                                                        setEditModal({
                                                            open: true,
                                                            db: {
                                                                ...inst,
                                                                db_identifier: inst.db_identifier,
                                                                instance_class: inst.instance_class
                                                            }
                                                        });

                                                        setSelectedInstanceClass("");
                                                        fetchInstanceTypes(inst.engine);
                                                    }}
                                                >
                                                    <Pencil size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Edit Modal (Glass) */}
            {editModal.open && (
                <div className="rds-glass-modal-overlay">
                    <div className="rds-glass-modal-content">
                        <div className="rds-modal-header">
                            <h3>Modify Instance Class</h3>
                            <button onClick={() => setEditModal({ open: false, db: null })} className="rds-close-btn"><X size={20} /></button>
                        </div>
                        <div className="rds-modal-body">
                            <p className="rds-mb-4">DB Identifier: <strong>{editModal.db?.db_identifier}</strong></p>

                            <div className="rds-current-specs rds-glass-panel">
                                <h4>Current Specs</h4>
                                <div className="rds-specs-grid">
                                    <div className="rds-spec-item">
                                        <label>Class</label>
                                        <div className="rds-val">{editModal.db?.instance_class || 'N/A'}</div>
                                    </div>
                                    <div className="rds-spec-item">
                                        <label>vCPU</label>
                                        <div className="rds-val">{editModal.db?.vcpu || '-'}</div>
                                    </div>
                                    <div className="rds-spec-item">
                                        <label>Memory</label>
                                        <div className="rds-val">{editModal.db?.memory ? `${editModal.db.memory} GB` : '-'}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="rds-form-group rds-mt-4">
                                <label>New Instance Class</label>
                                <select
                                    className="rds-glass-select"
                                    value={selectedInstanceClass}
                                    onChange={(e) => setSelectedInstanceClass(e.target.value)}
                                >
                                    <option value="">Select new class...</option>

                                    {availableInstanceTypes.map(type => (
                                        <option key={type.instance_class} value={type.instance_class}>
                                            {type.instance_class} ({type.vcpu} vCPU, {type.memory_gb}GB)
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="rds-modal-footer">
                            <button className="rds-btn-glass rds-secondary" onClick={() => setEditModal({ open: false, db: null })}>Cancel</button>
                            <button
                                className="rds-btn-glass rds-primary"
                                onClick={modifyInstanceClass}
                                disabled={!selectedInstanceClass}
                            >
                                Apply Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Action Modal */}
            <RDSBulkActionModal
                isOpen={bulkModalOpen}
                onClose={() => setBulkModalOpen(false)}
                action={bulkAction}
                selectedCount={selectedRows.length}
                totalCount={databases.length}
                onConfirm={handleBulkConfirm}
            />

            {/* Schedule Modal */}
            <ScheduleModal
                isOpen={scheduleModalOpen}
                onClose={() => setScheduleModalOpen(false)}
                target={scheduleTarget}
                onConfirm={handleScheduleConfirm}
                onRemove={handleScheduleRemove}
            />

            <ConfirmActionModal
                isOpen={confirmModal.open}
                message={confirmModal.message}
                onConfirm={confirmModal.onConfirm}
                onCancel={closeConfirmModal}
            />

            {/* Column Settings Modal */}
            {showColumnSettings && (
                <div className="rds-column-settings-overlay" onClick={() => setShowColumnSettings(false)}>
                    <div className="rds-column-settings-modal" onClick={e => e.stopPropagation()}>
                        <div className="rds-csm-header">
                            <div className="rds-csm-title-group">
                                <Settings size={20} className="rds-csm-icon" />
                                <h3>Column Settings</h3>
                            </div>
                            <button className="rds-csm-close" onClick={() => setShowColumnSettings(false)}><X size={20} /></button>
                        </div>

                        <div className="rds-csm-body">
                            <label className="rds-csm-label">Toggle Columns</label>
                            <div className="rds-column-toggles-grid">
                                {columnDefinitions.map(col => (
                                    <div key={col.key} className={`rds-column-toggle-item ${col.mandatory ? 'mandatory' : ''}`}>
                                        <span className="rds-ct-label">{col.label}</span>
                                        <label className="rds-switch">
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
                                            <span className="rds-slider rds-round"></span>
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="rds-csm-footer">
                            <button className="btn-rds-cancel" onClick={() => setShowColumnSettings(false)}>Cancel</button>
                            <button
                                className="btn-rds-submit"
                                onClick={() => {
                                    setVisibleColumns(pendingVisibleColumns);
                                    setShowColumnSettings(false);
                                }}
                            >
                                Submit Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}