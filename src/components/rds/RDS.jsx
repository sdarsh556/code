import React, { useState, useMemo } from 'react';
import {
    Database, Server, HardDrive, Play, Square, RotateCw, RefreshCw, Upload, DownloadCloud,
    Search, Plus, Minus, Settings, Shield, Clock, Sun, Moon, Pencil, FileUp, Activity, X
} from 'lucide-react';
import '../../css/rds/rds.css';
// import axiosClient from '../api/axiosClient'; // Uncomment when ready
import ScheduleModal from '../common/ScheduleModal'; // Assuming ScheduleModal exists

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
        daily_exception: false
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
const formatStatus = (status, isAurora) => {
    const s = status?.toLowerCase();
    if (s === 'available' || s === 'running') {
        return isAurora ? 'Available' : 'Running';
    }
    if (s === 'stopped') return 'Stopped';
    return status;
};

export default function RDS() {
    const [databases, setDatabases] = useState(mockData);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('all'); // 'all', 'rds', 'aurora'
    const [selectedRows, setSelectedRows] = useState([]);
    const [expandedClusters, setExpandedClusters] = useState({});

    // Upload state
    const [showUploadModal, setShowUploadModal] = useState(false);

    // Edit Modal state
    const [editModal, setEditModal] = useState({ open: false, db: null });

    // Schedule Modal state
    const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
    const [scheduleTarget, setScheduleTarget] = useState(null);

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

        databases.forEach(db => {
            if (db.is_aurora) {
                auroraCount++;
                auroraUsed += (db.storage_used || 0);
                auroraAllocated += (db.storage_allocated || 2000); // Default to 2000 if null for mock
            } else {
                rdsCount++;
                rdsAllocated += (db.storage_allocated || 0);
                rdsUsed += (db.storage_used || 0);
            }

            if (['available', 'running'].includes(db.status.toLowerCase())) runningCount++;
            if (['stopped'].includes(db.status.toLowerCase())) stoppedCount++;

            if (db.is_24_7) is247Count++;
            if (db.never_start) neverStartCount++;
        });

        return {
            total: databases.length,
            rdsCount, auroraCount,
            rdsAllocated, rdsUsed, auroraUsed, auroraAllocated,
            runningCount, stoppedCount,
            customSchedules: 2, // Mocked
            is247Count, neverStartCount
        };
    }, [databases]);

    // Filtering
    const filteredDatabases = useMemo(() => {
        return databases.filter(db => {
            if (filterType === 'rds' && db.is_aurora) return false;
            if (filterType === 'aurora' && !db.is_aurora) return false;
            if (searchQuery && !db.db_identifier.toLowerCase().includes(searchQuery.toLowerCase())) return false;
            return true;
        });
    }, [databases, filterType, searchQuery]);

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
            className={`filter-toggle-btn ${active ? 'active' : ''}`}
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
                        className="btn-delta-updates sync-btn-rds"
                    >
                        <div className="icon-wrapper">
                            <RefreshCw size={20} />
                        </div>
                        <span>Sync Clusters</span>
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

                <div className="stat-card glass-card ec2-card">
                    <div className="stat-header-ec2">
                        <span className="stat-title-ec2">Running</span>
                        <Activity size={24} className="stat-icon-ec2 green" />
                    </div>
                    <div className="stat-value-ec2 green-text">{stats.runningCount}</div>
                </div>

                <div className="stat-card glass-card ec2-card">
                    <div className="stat-header-ec2">
                        <span className="stat-title-ec2">Stopped</span>
                        <Activity size={24} className="stat-icon-ec2 red" />
                    </div>
                    <div className="stat-value-ec2 red-text">{stats.stoppedCount}</div>
                </div>
            </div>

            {/* EC2 Style Stats & Actions Grid - Row 2 */}
            <div className="rds-stats-grid ec2-style">
                <div className="stat-card glass-card ec2-card">
                    <div className="stat-header-ec2">
                        <span className="stat-title-ec2">24/7 Protected</span>
                        <Shield size={24} className="stat-icon-ec2 blue" />
                    </div>
                    <div className="stat-value-ec2 blue-text">{stats.is247Count}</div>
                </div>

                <div className="stat-card glass-card ec2-card">
                    <div className="stat-header-ec2">
                        <span className="stat-title-ec2">Never-Start</span>
                        <X size={24} className="stat-icon-ec2 orange" />
                    </div>
                    <div className="stat-value-ec2 orange-text">{stats.neverStartCount}</div>
                </div>

                <div className="stat-card glass-card ec2-card">
                    <div className="stat-header-ec2">
                        <span className="stat-title-ec2">Daily Exceptions</span>
                        <FileUp size={24} className="stat-icon-ec2 yellow" />
                    </div>
                    <div className="stat-value-ec2 yellow-text">{stats.customSchedules}</div>
                </div>

                {/* Stack 1: Start/Stop */}
                <div className="button-stack-card">
                    <button className="btn-stack start-btn">
                        <Play size={16} /> Start Selected
                    </button>
                    <button className="btn-stack stop-btn">
                        <Square size={16} /> Stop Selected
                    </button>
                </div>

                {/* Stack 2: Updates/Upload */}
                <div className="button-stack-card">
                    <button className="btn-stack update-btn">
                        <Activity size={16} /> Updates
                    </button>
                    <button className="btn-stack upload-btn" onClick={() => setShowUploadModal(true)}>
                        <FileUp size={16} /> Upload Exceptions
                    </button>
                </div>
            </div>

            {/* Filter and Search */}
            <div className="table-controls glass-panel">
                <div className="toggle-filters">
                    <FilterButton type="rds" label="RDS Instances" active={filterType === 'rds'} />
                    <FilterButton type="aurora" label="Aurora Clusters" active={filterType === 'aurora'} />
                </div>
                <div className="search-bar-modern">
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Search databases..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Main Data Table */}
            <div className="rds-table-container glass-panel">
                <table className="rds-table-glass">
                    <thead>
                        <tr>
                            <th className="checkbox-col">
                                <input
                                    type="checkbox"
                                    checked={selectedRows.length === filteredDatabases.length && filteredDatabases.length > 0}
                                    onChange={handleSelectAll}
                                />
                            </th>
                            <th>Identifier</th>
                            <th>Role</th>
                            <th>Engine</th>
                            <th>Class</th>
                            <th className="storage-header-cell">
                                <div className="storage-header-main">Storage</div>
                                <div className="storage-header-labels-box">
                                    <span className="label-item">Used</span>
                                    <span className="label-sep"></span>
                                    <span className="label-item">Alloc</span>
                                </div>
                            </th>
                            <th>Status</th>
                            <th>Actions</th>
                            <th>Scheduling Policies</th>
                            <th>Schedule</th>
                            <th>Edit</th>
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
                                    <td className="identifier-col">
                                        <div className="expand-control-wrapper">
                                            {db.is_aurora ? (
                                                <button className="expand-btn" onClick={() => toggleCluster(db.id)}>
                                                    {expandedClusters[db.id] ? <Minus size={14} /> : <Plus size={14} />}
                                                </button>
                                            ) : (
                                                <div className="expand-spacer"></div>
                                            )}
                                        </div>
                                        <strong>{db.db_identifier}</strong>
                                    </td>
                                    <td>
                                        <span className={`db-type-badge ${db.is_aurora ? 'aurora' : 'rds'}`}>
                                            {db.is_aurora ? 'Cluster' : 'Instance'}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="engine-cell">
                                            <span className="engine-name">{db.engine}</span>
                                            <span className="engine-version">{db.engine_version}</span>
                                        </div>
                                    </td>
                                    <td>
                                        {!db.is_aurora ? <span className="instance-class-badge">{db.instance_class}</span> : '-'}
                                    </td>
                                    <td>
                                        <StorageDisplay allocated={db.storage_allocated} used={db.storage_used} isAurora={db.is_aurora} />
                                    </td>
                                    <td>
                                        <span className={`status-badge ${getStatusColor(db.status)}`}>
                                            {formatStatus(db.status, db.is_aurora)}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="row-actions">
                                            <button className="icon-btn play" title="Start"><Play size={16} /></button>
                                            <button className="icon-btn stop" title="Stop"><Square size={16} /></button>
                                            <button className="icon-btn reboot" title="Reboot"><RotateCw size={16} /></button>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="policy-buttons">
                                            <button
                                                className={`policy-btn ${db.is_24_7 ? 'active-247' : ''}`}
                                                title="24/7 Protected"
                                            >
                                                <Shield size={16} />
                                            </button>
                                            <button
                                                className={`policy-btn ${db.never_start ? 'active-never' : ''}`}
                                                title="Never Start"
                                            >
                                                <X size={16} />
                                            </button>
                                            <button
                                                className={`policy-btn ${db.daily_exception ? 'active-exc' : ''}`}
                                                title="Daily Exception"
                                            >
                                                <FileUp size={16} />
                                            </button>
                                        </div>
                                    </td>
                                    <td>
                                        <button className="btn-set-schedule" onClick={() => {
                                            setScheduleTarget({
                                                label: db.db_identifier,
                                                resourceType: 'RDS',
                                                scope: db.db_identifier,
                                                db: db
                                            });
                                            setScheduleModalOpen(true);
                                        }}>
                                            <Clock size={14} /> Schedule
                                        </button>
                                    </td>
                                    <td>
                                        <button
                                            className="icon-btn edit"
                                            title="Edit Instance"
                                            onClick={() => setEditModal({ open: true, db })}
                                        >
                                            <Pencil size={18} />
                                        </button>
                                    </td>
                                </tr>

                                {/* Expanded Aurora Instances */}
                                {db.is_aurora && expandedClusters[db.id] && db.instances?.map(inst => (
                                    <tr key={inst.id} className="sub-row">
                                        <td></td>
                                        <td className="identifier-col sub">
                                            <span className="tree-line"></span>
                                            {inst.db_identifier}
                                        </td>
                                        <td>
                                            <span className={`role-badge ${inst.role.toLowerCase()}`}>{inst.role}</span>
                                        </td>
                                        <td>-</td>
                                        <td><span className="instance-class-badge">{inst.instance_class}</span></td>
                                        <td>-</td>
                                        <td>
                                            <span className={`status-badge ${getStatusColor(inst.status)}`}>
                                                {formatStatus(inst.status, true)}
                                            </span>
                                        </td>
                                        <td colSpan="5" className="sub-actions-info">
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
            {/* Schedule Modal */}
            <ScheduleModal
                isOpen={scheduleModalOpen}
                onClose={() => setScheduleModalOpen(false)}
                target={scheduleTarget}
                onConfirm={handleScheduleConfirm}
                onRemove={handleScheduleRemove}
            />
        </div>
    );
}