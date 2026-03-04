import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ChevronLeft,
    Plus,
    Minus,
    Database,
    Search,
    TrendingUp,
    TrendingDown,
    Activity,
    ClipboardList,
    AlertCircle,
    CheckCircle2,
    Edit3,
    ArrowRight,
    Layers,
    Server,
    Zap,
    History
} from 'lucide-react';
import '../../css/rds/rdsUpdates.css';

const RDSUpdates = () => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState(null); // 'Added', 'Modified', 'Deleted'

    // Mock data based on user provided JSON
    const syncData = {
        success: true,
        message: "RDS sync completed successfully",
        data: {
            instances_synced: 15,
            clusters_synced: 3
        },
        changes: {
            instances: {
                added: [
                    {
                        db_identifier: "prod-mysql-001",
                        db_type: "rds",
                        instance_class: "db.t3.medium",
                        status: "available",
                        timestamp: "2026-03-04T10:30:00.000Z"
                    },
                    {
                        db_identifier: "aurora-reader-03",
                        db_type: "aurora",
                        cluster_identifier: "prod-aurora-cluster",
                        instance_class: "db.r6g.large",
                        role: "reader",
                        status: "available",
                        timestamp: "2026-03-04T10:30:00.000Z"
                    }
                ],
                deleted: [
                    {
                        db_identifier: "dev-postgres-temp",
                        db_type: "rds",
                        last_known_status: "stopped",
                        timestamp: "2026-03-04T10:30:00.000Z"
                    }
                ],
                instance_class_changed: [
                    {
                        db_identifier: "staging-mysql-01",
                        db_type: "rds",
                        old_value: "db.t3.medium",
                        new_value: "db.t3.large",
                        timestamp: "2026-03-04T10:30:00.000Z"
                    },
                    {
                        db_identifier: "aurora-writer-01",
                        db_type: "aurora",
                        cluster_identifier: "prod-aurora-cluster",
                        old_value: "db.r6g.large",
                        new_value: "db.r6g.xlarge",
                        timestamp: "2026-03-04T10:30:00.000Z"
                    }
                ],
                allocated_storage_changed: [
                    {
                        db_identifier: "staging-mysql-01",
                        db_type: "rds",
                        old_value: 100,
                        new_value: 500,
                        timestamp: "2026-03-04T10:30:00.000Z"
                    },
                    {
                        db_identifier: "prod-mysql-002",
                        db_type: "rds",
                        old_value: 100,
                        new_value: 200,
                        timestamp: "2026-03-04T10:30:00.000Z"
                    }
                ],
                status_changed: [
                    {
                        db_identifier: "dev-postgres-01",
                        db_type: "rds",
                        old_value: "stopped",
                        new_value: "available",
                        timestamp: "2026-03-04T10:30:00.000Z"
                    },
                    {
                        db_identifier: "qa-mysql-cluster",
                        db_type: "aurora",
                        cluster_identifier: "qa-aurora-cluster",
                        old_value: "available",
                        new_value: "stopped",
                        timestamp: "2026-03-04T10:30:00.000Z"
                    }
                ],
                engine_version_changed: [
                    {
                        db_identifier: "prod-postgres-01",
                        db_type: "rds",
                        old_value: "14.7",
                        new_value: "14.10",
                        timestamp: "2026-03-04T10:30:00.000Z"
                    }
                ],
                storage_type_changed: [
                    {
                        db_identifier: "prod-mysql-003",
                        db_type: "rds",
                        old_value: "gp2",
                        new_value: "gp3",
                        timestamp: "2026-03-04T10:30:00.000Z"
                    }
                ],
                cluster_added: [
                    {
                        db_identifier: "standalone-instance-01",
                        db_type: "aurora",
                        cluster_identifier: "new-aurora-cluster",
                        role: "writer",
                        timestamp: "2026-03-04T10:30:00.000Z"
                    }
                ],
                cluster_removed: [
                    {
                        db_identifier: "old-aurora-instance",
                        db_type: "aurora",
                        old_cluster_identifier: "deprecated-cluster",
                        timestamp: "2026-03-04T10:30:00.000Z"
                    }
                ],
                role_changed: [
                    {
                        db_identifier: "aurora-instance-02",
                        db_type: "aurora",
                        cluster_identifier: "prod-aurora-cluster",
                        old_value: "reader",
                        new_value: "writer",
                        timestamp: "2026-03-04T10:30:00.000Z"
                    }
                ]
            },
            clusters: {
                added: [
                    {
                        cluster_identifier: "new-prod-cluster",
                        engine: "aurora-mysql",
                        status: "available",
                        timestamp: "2026-03-04T10:30:00.000Z"
                    }
                ],
                deleted: [
                    {
                        cluster_identifier: "old-dev-cluster",
                        last_known_status: "stopped",
                        timestamp: "2026-03-04T10:30:00.000Z"
                    }
                ],
                status_changed: [
                    {
                        cluster_identifier: "qa-aurora-cluster",
                        old_value: "available",
                        new_value: "stopped",
                        timestamp: "2026-03-04T10:30:00.000Z"
                    }
                ],
                engine_version_changed: [
                    {
                        cluster_identifier: "prod-aurora-cluster",
                        old_value: "8.0.mysql_aurora.3.02.0",
                        new_value: "8.0.mysql_aurora.3.04.0",
                        timestamp: "2026-03-04T10:30:00.000Z"
                    }
                ]
            }
        }
    };

    // Group all changes by dB identifier to avoid redundant rows
    const groupedChanges = useMemo(() => {
        const groups = {}; // Key: db_identifier
        const { instances, clusters } = syncData.changes;

        const getGroup = (id, category, type) => {
            if (!groups[id]) {
                groups[id] = {
                    db_identifier: id,
                    category,
                    type, // 'Added', 'Deleted', 'Modified'
                    modifications: [],
                    details: {}
                };
            }
            return groups[id];
        };

        // --- Instances ---
        instances.added.forEach(item => {
            const g = getGroup(item.db_identifier, 'Instance', 'Added');
            g.details = { ...item };
            g.color = 'green';
        });

        instances.deleted.forEach(item => {
            const g = getGroup(item.db_identifier, 'Instance', 'Deleted');
            g.details = { ...item };
            g.color = 'red';
        });

        const instanceChangeMappings = {
            instance_class_changed: { label: 'Instance Class', icon: <Layers size={16} /> },
            allocated_storage_changed: { label: 'Allocated Storage', icon: <Server size={16} /> },
            status_changed: { label: 'Status', icon: <Activity size={16} /> },
            engine_version_changed: { label: 'Engine Version', icon: <Zap size={16} /> },
            storage_type_changed: { label: 'Storage Type', icon: <Database size={16} /> },
            role_changed: { label: 'Instance Role', icon: <History size={16} /> },
            cluster_added: { label: 'Added to Cluster', icon: <Plus size={16} /> },
            cluster_removed: { label: 'Removed from Cluster', icon: <Minus size={16} /> }
        };

        Object.entries(instanceChangeMappings).forEach(([key, config]) => {
            instances[key]?.forEach(item => {
                const g = getGroup(item.db_identifier, 'Instance', 'Modified');
                if (g.type === 'Modified' || !g.type) {
                    g.type = 'Modified';
                    g.color = 'blue';
                }
                g.modifications.push({
                    ...item,
                    changeType: config.label,
                    icon: config.icon
                });
            });
        });

        // --- Clusters ---
        clusters.added.forEach(item => {
            const g = getGroup(item.cluster_identifier, 'Cluster', 'Added');
            g.details = { ...item };
            g.color = 'green';
        });

        clusters.deleted.forEach(item => {
            const g = getGroup(item.cluster_identifier, 'Cluster', 'Deleted');
            g.details = { ...item };
            g.color = 'red';
        });

        const clusterChangeMappings = {
            status_changed: { label: 'Status', icon: <Activity size={16} /> },
            engine_version_changed: { label: 'Engine Version', icon: <Zap size={16} /> }
        };

        Object.entries(clusterChangeMappings).forEach(([key, config]) => {
            clusters[key]?.forEach(item => {
                const g = getGroup(item.cluster_identifier, 'Cluster', 'Modified');
                if (g.type === 'Modified' || !g.type) {
                    g.type = 'Modified';
                    g.color = 'blue';
                }
                g.modifications.push({
                    ...item,
                    changeType: config.label,
                    icon: config.icon
                });
            });
        });

        return Object.values(groups);
    }, []);

    const filteredChanges = useMemo(() => {
        let results = groupedChanges;

        // Apply Stat Card Filter
        if (activeFilter) {
            results = results.filter(c => c.type === activeFilter);
        }

        // Apply Search Query Filter
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            results = results.filter(c =>
                c.db_identifier?.toLowerCase().includes(q) ||
                c.category?.toLowerCase().includes(q) ||
                c.modifications.some(m => m.changeType?.toLowerCase().includes(q))
            );
        }

        return results;
    }, [groupedChanges, searchQuery, activeFilter]);

    const toggleFilter = (filter) => {
        setActiveFilter(prev => prev === filter ? null : filter);
    };

    const stats = useMemo(() => {
        return {
            added: groupedChanges.filter(c => c.type === 'Added').length,
            deleted: groupedChanges.filter(c => c.type === 'Deleted').length,
            modified: groupedChanges.filter(c => c.type === 'Modified').length
        };
    }, [groupedChanges]);

    return (
        <div className="rds-updates-page">
            {/* Page Header */}
            <div className="updates-header-glass">
                <div className="header-left">
                    <button onClick={() => navigate('/rds')} className="back-btn-rds">
                        <ChevronLeft size={20} />
                    </button>
                    <div className="title-group">
                        <h1>RDS Sync Report</h1>
                        <p>Detailed infrastructure delta from last sync</p>
                    </div>
                </div>
                <div className="header-right">
                    <div className="sync-time-badge">
                        <History size={14} />
                        <span>March 4, 10:30 AM</span>
                    </div>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="updates-stats-grid">
                <div
                    className={`stat-card-glass total-added clickable-stat ${activeFilter === 'Added' ? 'active-filter-green' : ''}`}
                    onClick={() => toggleFilter('Added')}
                >
                    <div className="card-icon"><TrendingUp size={24} /></div>
                    <div className="card-info">
                        <span className="label">New Additions</span>
                        <h2 className="value">{stats.added}</h2>
                    </div>
                </div>
                <div
                    className={`stat-card-glass total-modified clickable-stat ${activeFilter === 'Modified' ? 'active-filter-blue' : ''}`}
                    onClick={() => toggleFilter('Modified')}
                >
                    <div className="card-icon"><Edit3 size={24} /></div>
                    <div className="card-info">
                        <span className="label">Modifications</span>
                        <h2 className="value">{stats.modified}</h2>
                    </div>
                </div>
                <div
                    className={`stat-card-glass total-deleted clickable-stat ${activeFilter === 'Deleted' ? 'active-filter-red' : ''}`}
                    onClick={() => toggleFilter('Deleted')}
                >
                    <div className="card-icon"><TrendingDown size={24} /></div>
                    <div className="card-info">
                        <span className="label">Deletions</span>
                        <h2 className="value">{stats.deleted}</h2>
                    </div>
                </div>
            </div>

            {/* Change Log View */}
            <div className="changelog-container-glass">
                <div className="changelog-toolbar">
                    <div className="search-box-rds">
                        <Search size={18} />
                        <input
                            type="text"
                            placeholder="Search changes by identifier or property..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="results-count">
                        Showing {filteredChanges.length} results
                    </div>
                </div>

                <div className="changelog-list">
                    {filteredChanges.length > 0 ? (
                        filteredChanges.map((change, idx) => (
                            <div key={`${change.db_identifier}-${idx}`} className={`change-item-glass ${change.color}`}>
                                <div className="item-header">
                                    <div className="item-main-info">
                                        <div className={`status-orb ${change.color}`}></div>
                                        <div className="identifier-stack">
                                            <span className="item-category">{change.category}</span>
                                            <h3 className="item-identifier">{change.db_identifier}</h3>
                                        </div>
                                    </div>
                                    <div className={`type-badge ${change.color}`}>
                                        {change.type === 'Modified' ? <Edit3 size={16} /> : (change.type === 'Added' ? <Plus size={16} /> : <Minus size={16} />)}
                                        <span>{change.type}</span>
                                    </div>
                                </div>

                                <div className="item-details">
                                    {change.type === 'Added' && (
                                        <div className="addition-details">
                                            <div className="detail-pill">
                                                <span className="l">Type</span>
                                                <span className="v">{change.details.db_type || 'N/A'}</span>
                                            </div>
                                            <div className="detail-pill">
                                                <span className="l">Status</span>
                                                <span className={`v status-t ${change.details.status}`}>{change.details.status}</span>
                                            </div>
                                            {change.details.instance_class && (
                                                <div className="detail-pill">
                                                    <span className="l">Class</span>
                                                    <span className="v">{change.details.instance_class}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {change.type === 'Deleted' && (
                                        <div className="deletion-details">
                                            <span className="deletion-msg">Resource removed from AWS. Last known status: <strong>{change.details.last_known_status || 'available'}</strong></span>
                                        </div>
                                    )}

                                    {change.modifications.length > 0 && (
                                        <div className="modifications-stack">
                                            {change.modifications.map((mod, mIdx) => (
                                                <div key={mIdx} className="modification-diff">
                                                    <div className="diff-type-group">
                                                        {mod.icon}
                                                        <div className="diff-label">{mod.changeType}</div>
                                                    </div>
                                                    <div className="diff-values">
                                                        <span className="old-val">{mod.old_value}</span>
                                                        <ArrowRight size={14} className="diff-arrow" />
                                                        <span className="new-val">{mod.new_value}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="empty-state-rds">
                            <CheckCircle2 size={48} />
                            <h3>No Changes Found</h3>
                            <p>Everything is currently in sync with AWS infrastructure.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RDSUpdates;
