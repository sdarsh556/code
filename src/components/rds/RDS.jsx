import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Database, Server, HardDrive, Play, Square, RotateCw, RefreshCw, Upload, DownloadCloud,
    Search, Plus, Minus, Settings, Shield, Clock, Sun, Moon, Pencil, FileUp, Activity, X,
    ArrowUpDown
} from 'lucide-react';
import '../../css/rds/rds.css';
// import axiosClient from '../api/axiosClient'; // Uncomment when ready
import ScheduleModal from '../common/ScheduleModal'; // Assuming ScheduleModal exists
import RDSBulkActionModal from './RDSBulkActionModal';
import ConfirmActionModal from '../common/ConfirmActionModal';

const mockData = [
    {
        id: 'rds-1',
        db_identifier: 'prod-postgres-db',
        is_aurora: false,
        engine: 'postgres',
        engine_version: '14.7',
        instance_class: 'db.m5.large',
        storage_allocated: 500,
        storage_used: 350,
        status: 'available',
        vcpu: 2,
        memory: 8,
        is_24_7: true,
        never_start: false,
        daily_exception: false,
        schedule: {
            from_date: '2026-03-01',
            to_date: '2026-03-10'
        }
    },
    {
        id: 'aurora-1',
        db_identifier: 'prod-aurora-cluster',
        is_aurora: true,
        engine: 'aurora-postgresql',
        engine_version: '14.6',
        storage_allocated: null,
        storage_used: 1200,
        status: 'available',
        is_24_7: false,
        never_start: false,
        daily_exception: false,
        schedule: {
            from_date: '2026-03-04',
            to_date: '2026-03-04'
        },
        writer_instance: 'prod-aurora-instance-1',
        instances: [
            {
                id: 'aurora-1-inst-1',
                db_identifier: 'prod-aurora-instance-1',
                role: 'Writer',
                instance_class: 'db.r6g.large',
                status: 'available',
                vcpu: 2,
                memory: 16
            },
            {
                id: 'aurora-1-inst-2',
                db_identifier: 'prod-aurora-instance-2',
                role: 'Reader',
                instance_class: 'db.r6g.large',
                status: 'available',
                vcpu: 2,
                memory: 16
            }
        ]
    },
    {
        id: 'rds-2',
        db_identifier: 'dev-mysql-db',
        is_aurora: false,
        engine: 'mysql',
        engine_version: '8.0.32',
        instance_class: 'db.t3.medium',
        storage_allocated: 100,
        storage_used: 45,
        status: 'stopped',
        vcpu: 2,
        memory: 4,
        is_24_7: false,
        never_start: true,
        daily_exception: false
    },
    {
        id: 'rds-3',
        db_identifier: 'staging-aurora-cluster',
        is_aurora: true,
        engine: 'aurora-mysql',
        engine_version: '8.0.23',
        storage_allocated: null,
        storage_used: 150,
        status: 'available',
        vcpu: 2,
        memory: 8,
        is_24_7: false,
        never_start: false,
        daily_exception: true
    }
];

// Helper to determine status color
const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
        case 'available':
        case 'running':
            return 'status-available';
        case 'stopped':
        case 'stopping':
            return 'status-stopped';
        case 'starting':
        case 'rebooting':
            return 'status-starting';
        default:
            return 'status-unknown';
    }
};

// Helper to format status label based on resource type
const formatStatus = (status) => {
    const s = status?.toLowerCase();
    if (s === 'available' || s === 'running') {
        return 'Available';
    }
    if (s === 'stopped') return 'Stopped';
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

export default function RDS() {
    const navigate = useNavigate();
    const [databases, setDatabases] = useState(mockData);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('all'); // 'all', 'rds', 'aurora'
    const [activeStatFilter, setActiveStatFilter] = useState(null); // 'available', 'stopped', '247', 'never', 'exception'
    const [selectedRows, setSelectedRows] = useState([]);
    const [expandedClusters, setExpandedClusters] = useState({});
    const [showColumnSettings, setShowColumnSettings] = useState(false);
    const [pendingVisibleColumns, setPendingVisibleColumns] = useState({});

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
            console.log("RDS Sync started...");
            // Add actual API call here later
            await new Promise(resolve => setTimeout(resolve, 2000)); // Mock delay
            console.log("RDS Sync completed.");
        } catch (error) {
            console.error("RDS Sync failed:", error);
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
            console.log(`📤 Uploading file: ${file.name}...`);
            setUploadedFile(file);
            // Add actual API call here
            await new Promise(resolve => setTimeout(resolve, 2000));
            console.log("✅ File uploaded successfully.");
        } catch (error) {
            console.error("❌ File upload failed:", error);
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

    const handleRowActionWithConfirm = (db, action) => {
        const actionLower = action.toLowerCase();
        setConfirmModal({
            open: true,
            message: `Are you sure you want to ${actionLower} database "${db.db_identifier}"?`,
            onConfirm: async () => {
                closeConfirmModal();
                console.log(`Executing ${action} on ${db.db_identifier}`);
                // Mock status change
                setDatabases(prev => prev.map(item => {
                    if (item.id === db.id) {
                        let newStatus = item.status;
                        if (action === 'START') newStatus = 'available';
                        if (action === 'STOP') newStatus = 'stopped';
                        return { ...item, status: newStatus };
                    }
                    return item;
                }));
            }
        });
    };

    const handlePolicyWithConfirm = (db, field, label) => {
        const isActive = db[field];
        const message = isActive
            ? `Are you sure you want to remove ${label} from "${db.db_identifier}"?`
            : `Are you sure you want to mark "${db.db_identifier}" as ${label}?`;

        setConfirmModal({
            open: true,
            message: message,
            onConfirm: async () => {
                closeConfirmModal();
                setDatabases(prev => prev.map(item => {
                    if (item.id === db.id) {
                        if (isActive) {
                            return { ...item, [field]: false };
                        } else {
                            // Turn on this policy, turn off others
                            return {
                                ...item,
                                is_24_7: field === 'is_24_7',
                                never_start: field === 'never_start',
                                daily_exception: field === 'daily_exception'
                            };
                        }
                    }
                    return item;
                }));
            }
        });
    };

    const executeBulkAction = async (action, mode) => {
        try {
            console.log(`🚀 Executing Bulk ${action} for ${mode} databases...`);
            // Add actual API call here
            await new Promise(resolve => setTimeout(resolve, 1500)); // Mock delay
            console.log(`✅ Bulk ${action} completed.`);
        } catch (error) {
            console.error(`❌ Bulk ${action} failed:`, error);
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

    // Derived Stats
    const stats = useMemo(() => {
        let rdsCount = 0;
        let auroraCount = 0;
        let rdsAllocated = 0;
        let rdsUsed = 0;
        let auroraUsed = 0;
        let auroraAllocated = 0;
        let runningCount = 0;
        let stoppedCount = 0;
        let is247Count = 0;
        let neverStartCount = 0;
        let exceptionCount = 0;

        const countDb = (db) => {
            if (db.is_aurora) {
                auroraCount++;
                auroraUsed += (db.storage_used || 0);
                auroraAllocated += (db.storage_allocated || 2000);
            } else {
                rdsCount++;
                rdsAllocated += (db.storage_allocated || 0);
                rdsUsed += (db.storage_used || 0);
            }

            if (db.status.toLowerCase() === 'available') runningCount++;
            if (db.status.toLowerCase() === 'stopped') stoppedCount++;

            if (db.is_24_7) is247Count++;
            if (db.never_start) neverStartCount++;
            if (db.daily_exception) exceptionCount++;
        };

        databases.forEach(db => {
            countDb(db);
            // If it's a cluster, we don't necessarily count its instances for high-level policy stats
            // but the user logic usually acts on the DB identifier shown in the main rows.
        });

        return {
            total: databases.length,
            rdsCount, auroraCount,
            rdsAllocated, rdsUsed, auroraUsed, auroraAllocated,
            runningCount, stoppedCount,
            is247Count, neverStartCount, exceptionCount
        };
    }, [databases]);

    // Filtering
    const filteredDatabases = useMemo(() => {
        return databases.filter(db => {
            // Type Filter (RDS/Aurora)
            if (filterType === 'rds' && db.is_aurora) return false;
            if (filterType === 'aurora' && !db.is_aurora) return false;

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
        if (selectedRows.length === filteredDatabases.length) {
            setSelectedRows([]);
        } else {
            setSelectedRows(filteredDatabases.map(db => db.id));
        }
    };

    const FilterButton = ({ type, label, active }) => (
        <button
            className={`rds-filter-toggle-btn ${active ? 'active' : ''}`}
            onClick={() => {
                if (filterType === type) setFilterType('all');
                else setFilterType(type);
            }}
        >
            {label}
        </button>
    );

    // Storage Display Component
    const StorageDisplay = ({ allocated, used }) => {
        return (
            <div className="storage-compact-box">
                <span className="storage-val used">{used} GB</span>
                <span className="storage-val-sep"></span>
                <span className="storage-val allocated">{allocated ? `${allocated} GB` : '-'}</span>
            </div>
        );
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
                        className={`btn-delta-updates sync-btn-rds ${isSyncing ? 'syncing' : ''}`}
                        onClick={handleSyncWithConfirm}
                        disabled={isSyncing}
                    >
                        <div className="icon-wrapper">
                            <RefreshCw size={20} className={isSyncing ? 'spinning' : ''} />
                        </div>
                        <span>{isSyncing ? 'Syncing...' : 'Sync Clusters'}</span>
                    </button>
                </div>
            </div>

            {/* EC2 Style Stats & Actions Grid - Row 1 */}
            <div className="rds-stats-grid ec2-style">
                <div className="stat-card glass-card ec2-card">
                    <div className="stat-header-ec2">
                        <span className="stat-title-ec2">Total Databases</span>
                        <Database size={24} className="stat-icon-ec2 blue" />
                    </div>
                    <div className="stat-value-ec2 glow-text">{stats.total}</div>
                </div>

                <div className="stat-card glass-card rds-storage-card ec2-card">
                    <div className="stat-header-ec2">
                        <span className="stat-title-ec2">RDS Storage & Count</span>
                    </div>
                    <div className="capsule-display mt-2">
                        <div className="capsule-bar rds-bar">
                            <div className="used" style={{ flex: stats.rdsUsed }}></div>
                            <div className="free" style={{ flex: stats.rdsAllocated - stats.rdsUsed }}></div>
                        </div>
                        <div className="capsule-labels-ec2">
                            <span>Used: {stats.rdsUsed}GB</span>
                            <span>Allocated: {stats.rdsAllocated}GB</span>
                        </div>
                    </div>
                    <div className="stat-subtext-ec2 mt-auto">Active Instances: {stats.rdsCount}</div>
                </div>

                <div className="stat-card glass-card aurora-storage-card ec2-card">
                    <div className="stat-header-ec2">
                        <span className="stat-title-ec2">Aurora Usage</span>
                        <HardDrive size={18} className="stat-icon-ec2 purple" />
                    </div>
                    <div className="stat-value-ec2 glow-text">{stats.auroraUsed} GB</div>
                    <div className="stat-subtext-ec2 mt-auto">Active Clusters: {stats.auroraCount}</div>
                </div>

                <div
                    className={`stat-card glass-card ec2-card clickable-stat ${activeStatFilter === 'available' ? 'active-filter-green' : ''}`}
                    onClick={() => toggleStatFilter('available')}
                >
                    <div className="stat-header-ec2">
                        <span className="stat-title-ec2">Available</span>
                        <Activity size={24} className="stat-icon-ec2 green" />
                    </div>
                    <div className="stat-value-ec2 green-text">{stats.runningCount}</div>
                </div>

                <div
                    className={`stat-card glass-card ec2-card clickable-stat ${activeStatFilter === 'stopped' ? 'active-filter-red' : ''}`}
                    onClick={() => toggleStatFilter('stopped')}
                >
                    <div className="stat-header-ec2">
                        <span className="stat-title-ec2">Stopped</span>
                        <Activity size={24} className="stat-icon-ec2 red" />
                    </div>
                    <div className="stat-value-ec2 red-text">{stats.stoppedCount}</div>
                </div>
            </div>

            {/* EC2 Style Stats & Actions Grid - Row 2 */}
            <div className="rds-stats-grid ec2-style">
                <div
                    className={`stat-card glass-card ec2-card clickable-stat ${activeStatFilter === '247' ? 'active-filter-blue' : ''}`}
                    onClick={() => toggleStatFilter('247')}
                >
                    <div className="stat-header-ec2">
                        <span className="stat-title-ec2">24/7 Protected</span>
                        <Shield size={24} className="stat-icon-ec2 blue" />
                    </div>
                    <div className="stat-value-ec2 blue-text">{stats.is247Count}</div>
                </div>

                <div
                    className={`stat-card glass-card ec2-card clickable-stat ${activeStatFilter === 'never' ? 'active-filter-orange' : ''}`}
                    onClick={() => toggleStatFilter('never')}
                >
                    <div className="stat-header-ec2">
                        <span className="stat-title-ec2">Never-Start</span>
                        <X size={24} className="stat-icon-ec2 orange" />
                    </div>
                    <div className="stat-value-ec2 orange-text">{stats.neverStartCount}</div>
                </div>

                <div
                    className={`stat-card glass-card ec2-card clickable-stat ${activeStatFilter === 'exception' ? 'active-filter-yellow' : ''}`}
                    onClick={() => toggleStatFilter('exception')}
                >
                    <div className="stat-header-ec2">
                        <span className="stat-title-ec2">Daily Exceptions</span>
                        <FileUp size={24} className="stat-icon-ec2 yellow" />
                    </div>
                    <div className="stat-value-ec2 yellow-text">{stats.exceptionCount}</div>
                </div>

                {/* Stack 1: Start/Stop */}
                <div className="button-stack-card">
                    <button
                        className="btn-stack btn-delta-updates start-btn"
                        onClick={() => { setBulkAction('START'); setBulkModalOpen(true); }}
                    >
                        <div className="icon-wrapper">
                            <Play size={16} />
                        </div>
                        <span>Start</span>
                    </button>
                    <button
                        className="btn-stack btn-delta-updates stop-btn"
                        onClick={() => { setBulkAction('STOP'); setBulkModalOpen(true); }}
                    >
                        <div className="icon-wrapper">
                            <Square size={16} />
                        </div>
                        <span>Stop</span>
                    </button>
                </div>

                {/* Stack 2: Updates/Upload */}
                <div className="button-stack-card">
                    <button
                        className="btn-stack btn-delta-updates update-btn"
                        onClick={() => navigate('/rds/updates')}
                    >
                        <div className="icon-wrapper">
                            <Activity size={16} />
                        </div>
                        <span>Updates</span>
                    </button>
                    <button className="btn-stack btn-delta-updates upload-btn" onClick={handleUploadClick}>
                        <div className="icon-wrapper">
                            <FileUp size={16} />
                        </div>
                        <span>Upload Exceptions</span>
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

            {/* Filter and Search */}
            <div className="rds-controls-container glass-panel">
                <div className="rds-filter-group">
                    <FilterButton type="rds" label="RDS Instances" active={filterType === 'rds'} />
                    <FilterButton type="aurora" label="Aurora Clusters" active={filterType === 'aurora'} />
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

            {/* Main Data Table */}
            <div className="rds-table-container glass-panel">
                <table className="rds-table-glass" style={{ tableLayout: 'fixed', width: 'max-content', minWidth: '100%' }}>
                    <thead>
                        <tr>
                            <th className="checkbox-col" style={{ width: columnWidths.checkbox }}>
                                <input
                                    type="checkbox"
                                    checked={selectedRows.length === filteredDatabases.length && filteredDatabases.length > 0}
                                    onChange={handleSelectAll}
                                />
                            </th>
                            {visibleColumns.identifier && (
                                <th style={{ width: columnWidths.identifier }}>
                                    <div className="resizer-wrapper">
                                        Identifier
                                        <div className="resizer-handle" onMouseDown={(e) => handleResizeMouseDown(e, 'identifier')}></div>
                                    </div>
                                </th>
                            )}
                            {visibleColumns.role && (
                                <th style={{ width: columnWidths.role }}>
                                    <div className="resizer-wrapper">
                                        Role
                                        <div className="resizer-handle" onMouseDown={(e) => handleResizeMouseDown(e, 'role')}></div>
                                    </div>
                                </th>
                            )}
                            {visibleColumns.engine && (
                                <th style={{ width: columnWidths.engine }}>
                                    <div className="resizer-wrapper">
                                        Engine
                                        <div className="resizer-handle" onMouseDown={(e) => handleResizeMouseDown(e, 'engine')}></div>
                                    </div>
                                </th>
                            )}
                            {visibleColumns.class && (
                                <th style={{ width: columnWidths.class }}>
                                    <div className="resizer-wrapper">
                                        Class
                                        <div className="resizer-handle" onMouseDown={(e) => handleResizeMouseDown(e, 'class')}></div>
                                    </div>
                                </th>
                            )}
                            {visibleColumns.storage && (
                                <th style={{ width: columnWidths.storage }} className="storage-header-cell">
                                    <div className="resizer-wrapper">
                                        <div className="storage-header-main">Storage</div>
                                        <div className="storage-header-labels-box">
                                            <span className="label-item">Used</span>
                                            <span className="label-sep"></span>
                                            <span className="label-item">Alloc</span>
                                        </div>
                                        <div className="resizer-handle" onMouseDown={(e) => handleResizeMouseDown(e, 'storage')}></div>
                                    </div>
                                </th>
                            )}
                            {visibleColumns.status && (
                                <th style={{ width: columnWidths.status }}>
                                    <div className="resizer-wrapper">
                                        Status
                                        <div className="resizer-handle" onMouseDown={(e) => handleResizeMouseDown(e, 'status')}></div>
                                    </div>
                                </th>
                            )}
                            {visibleColumns.actions && (
                                <th style={{ width: columnWidths.actions }}>
                                    <div className="resizer-wrapper">
                                        Actions
                                        <div className="resizer-handle" onMouseDown={(e) => handleResizeMouseDown(e, 'actions')}></div>
                                    </div>
                                </th>
                            )}
                            {visibleColumns.policies && (
                                <th style={{ width: columnWidths.policies }}>
                                    <div className="resizer-wrapper">
                                        Scheduling Policies
                                        <div className="resizer-handle" onMouseDown={(e) => handleResizeMouseDown(e, 'policies')}></div>
                                    </div>
                                </th>
                            )}
                            {visibleColumns.schedule && (
                                <th style={{ width: columnWidths.schedule }}>
                                    <div className="resizer-wrapper">
                                        Schedule
                                        <div className="resizer-handle" onMouseDown={(e) => handleResizeMouseDown(e, 'schedule')}></div>
                                    </div>
                                </th>
                            )}
                            {visibleColumns.edit && (
                                <th style={{ width: columnWidths.edit }}>
                                    <div className="resizer-wrapper">
                                        Edit
                                        <div className="resizer-handle" onMouseDown={(e) => handleResizeMouseDown(e, 'edit')}></div>
                                    </div>
                                </th>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {filteredDatabases.map(db => (
                            <React.Fragment key={db.id}>
                                <tr className={`main-row ${selectedRows.includes(db.id) ? 'selected' : ''}`}>
                                    <td className="checkbox-col">
                                        <input
                                            type="checkbox"
                                            checked={selectedRows.includes(db.id)}
                                            onChange={() => handleSelectRow(db.id)}
                                        />
                                    </td>
                                    {visibleColumns.identifier && (
                                        <td className="identifier-col">
                                            <div className="identifier-wrapper">
                                                <div className="expand-control-wrapper">
                                                    {db.is_aurora ? (
                                                        <button className="expand-btn" onClick={() => toggleCluster(db.id)}>
                                                            {expandedClusters[db.id] ? <Minus size={14} /> : <Plus size={14} />}
                                                        </button>
                                                    ) : (
                                                        <div className="expand-spacer"></div>
                                                    )}
                                                </div>
                                                <div className="db-info-content">
                                                    <strong>{db.db_identifier}</strong>
                                                    {(() => {
                                                        const status = getScheduleStatus(db);
                                                        if (!status) return null;
                                                        return (
                                                            <div className={`active-schedule-tag ${status.isUrgent ? 'urgent' : ''}`}>
                                                                <span className="breathing-dot"></span>
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
                                            <span className="role-text-display">
                                                {db.is_aurora ? 'Cluster' : 'Instance'}
                                            </span>
                                        </td>
                                    )}
                                    {visibleColumns.engine && (
                                        <td>
                                            <div className="engine-cell">
                                                <span className="engine-name">{db.engine}</span>
                                                <span className="engine-version">{db.engine_version}</span>
                                            </div>
                                        </td>
                                    )}
                                    {visibleColumns.class && (
                                        <td>
                                            {!db.is_aurora ? <span className="instance-class-badge">{db.instance_class}</span> : '-'}
                                        </td>
                                    )}
                                    {visibleColumns.storage && (
                                        <td>
                                            <StorageDisplay allocated={db.storage_allocated} used={db.storage_used} isAurora={db.is_aurora} />
                                        </td>
                                    )}
                                    {visibleColumns.status && (
                                        <td>
                                            <span className={`status-badge ${getStatusColor(db.status)}`}>
                                                {formatStatus(db.status)}
                                            </span>
                                        </td>
                                    )}
                                    {visibleColumns.actions && (
                                        <td>
                                            <div className="row-actions">
                                                <button
                                                    className="icon-btn play"
                                                    title="Start"
                                                    disabled={db.status.toLowerCase() === 'available'}
                                                    onClick={() => handleRowActionWithConfirm(db, 'START')}
                                                >
                                                    <Play size={16} />
                                                </button>
                                                <button
                                                    className="icon-btn stop"
                                                    title="Stop"
                                                    disabled={db.status.toLowerCase() === 'stopped'}
                                                    onClick={() => handleRowActionWithConfirm(db, 'STOP')}
                                                >
                                                    <Square size={16} />
                                                </button>
                                                <button
                                                    className="icon-btn reboot"
                                                    title="Reboot"
                                                    disabled={db.status.toLowerCase() === 'stopped'}
                                                    onClick={() => handleRowActionWithConfirm(db, 'REBOOT')}
                                                >
                                                    <RotateCw size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    )}
                                    {visibleColumns.policies && (
                                        <td>
                                            <div className="policy-buttons">
                                                <button
                                                    className={`policy-btn ${db.is_24_7 ? 'active-247' : ''}`}
                                                    title="24/7 Protected"
                                                    disabled={!db.is_24_7 && (db.never_start || db.daily_exception)}
                                                    onClick={() => handlePolicyWithConfirm(db, 'is_24_7', '24/7 Protected')}
                                                >
                                                    <Shield size={16} />
                                                </button>
                                                <button
                                                    className={`policy-btn ${db.never_start ? 'active-never' : ''}`}
                                                    title="Never Start"
                                                    disabled={!db.never_start && (db.is_24_7 || db.daily_exception)}
                                                    onClick={() => handlePolicyWithConfirm(db, 'never_start', 'Never Start')}
                                                >
                                                    <X size={16} />
                                                </button>
                                                <button
                                                    className={`policy-btn ${db.daily_exception ? 'active-exc' : ''}`}
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
                                                className="btn-set-schedule"
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
                                            <button
                                                className="icon-btn edit"
                                                title="Edit Instance"
                                                onClick={() => setEditModal({ open: true, db })}
                                            >
                                                <Pencil size={18} />
                                            </button>
                                        </td>
                                    )}
                                </tr>

                                {/* Expanded Aurora Instances */}
                                {db.is_aurora && expandedClusters[db.id] && db.instances?.map(inst => (
                                    <tr key={inst.id} className="sub-row">
                                        <td></td>
                                        {visibleColumns.identifier && (
                                            <td className="identifier-col sub">
                                                <div className="identifier-wrapper">
                                                    <span className="tree-line"></span>
                                                    {inst.db_identifier}
                                                </div>
                                            </td>
                                        )}
                                        {visibleColumns.role && (
                                            <td>
                                                <span className="role-text-display">{inst.role}</span>
                                            </td>
                                        )}
                                        {visibleColumns.engine && <td>-</td>}
                                        {visibleColumns.class && <td><span className="instance-class-badge">{inst.instance_class}</span></td>}
                                        {visibleColumns.storage && <td>-</td>}
                                        {visibleColumns.status && (
                                            <td>
                                                <span className={`status-badge ${getStatusColor(inst.status)}`}>
                                                    {formatStatus(inst.status)}
                                                </span>
                                            </td>
                                        )}
                                        {/* Sub-actions info takes up remaining visible columns */}
                                        <td colSpan={Object.values(visibleColumns).filter(v => v).length - (visibleColumns.identifier ? 1 : 0) - (visibleColumns.role ? 1 : 0) - (visibleColumns.engine ? 1 : 0) - (visibleColumns.class ? 1 : 0) - (visibleColumns.storage ? 1 : 0) - (visibleColumns.status ? 1 : 0)} className="sub-actions-info">
                                            <span className="text-muted">Managed via cluster</span>
                                        </td>
                                    </tr>
                                ))}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Edit Modal (Glass) */}
            {editModal.open && (
                <div className="glass-modal-overlay">
                    <div className="glass-modal-content">
                        <div className="modal-header">
                            <h3>Modify Instance Class</h3>
                            <button onClick={() => setEditModal({ open: false, db: null })} className="close-btn"><X size={20} /></button>
                        </div>
                        <div className="modal-body">
                            <p className="mb-4">DB Identifier: <strong>{editModal.db?.db_identifier}</strong></p>

                            <div className="current-specs glass-panel">
                                <h4>Current Specs</h4>
                                <div className="specs-grid">
                                    <div className="spec-item">
                                        <label>Class</label>
                                        <div className="val">{editModal.db?.instance_class || 'N/A'}</div>
                                    </div>
                                    <div className="spec-item">
                                        <label>vCPU</label>
                                        <div className="val">{editModal.db?.vcpu || '-'}</div>
                                    </div>
                                    <div className="spec-item">
                                        <label>Memory</label>
                                        <div className="val">{editModal.db?.memory ? `${editModal.db.memory} GB` : '-'}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="form-group mt-4">
                                <label>New Instance Class</label>
                                <select className="glass-select">
                                    <option>Select new class...</option>
                                    <option value="db.r6g.xlarge">db.r6g.xlarge (4 vCPU, 32GB)</option>
                                    <option value="db.m5.xlarge">db.m5.xlarge (4 vCPU, 16GB)</option>
                                    <option value="db.t3.large">db.t3.large (2 vCPU, 8GB)</option>
                                </select>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-glass secondary" onClick={() => setEditModal({ open: false, db: null })}>Cancel</button>
                            <button className="btn-glass primary">Apply Changes</button>
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