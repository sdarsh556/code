import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Container,
    Search,
    RefreshCw,
    Upload,
    Calendar,
    Server,
    PlayCircle,
    StopCircle,
    Cpu,
    Clock,
    GitCompare,
    XCircle,
    AlertTriangle,
    Activity,
    Zap,
    CalendarPlus,
    CalendarMinus

} from 'lucide-react';
import ECSIcon from '../common/ECSIcon';
import ExceptionTimer from './ExceptionTimer';
import ScheduleModal from '../common/ScheduleModal';
import '../../css/ecs/ECS.css';
import '../../css/common/ScheduleModal.css';
import axiosClient from '../api/axiosClient';
import ConfirmActionModal from '../common/ConfirmActionModal';

const CLUSTER_CACHE_KEY = 'lombard_ecs_clusters_cache';
const CACHE_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours

function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => clearTimeout(handler);
    }, [value, delay]);

    return debouncedValue;
}

// Pure function for compute type colors
const getComputeTypeColor = (type) => {
    switch (type) {
        case 'FARGATE':
            return 'compute-fargate';
        case 'ASG':
            return 'compute-asg';
        default:
            return 'compute-fargate';
    }
};

// Calculate schedule status (for badge color and remaining days)
const calculateScheduleStatus = (scheduleData) => {
    if (!scheduleData) return null;

    const start = new Date(
        scheduleData.from.getFullYear(),
        scheduleData.from.getMonth(),
        scheduleData.from.getDate()
    );

    const end = new Date(
        scheduleData.to.getFullYear(),
        scheduleData.to.getMonth(),
        scheduleData.to.getDate()
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Only return status if today is within range
    if (today < start || today > end) return null;

    const total = Math.round((end - start) / 86400000) + 1;
    const remaining = Math.max(0, Math.round((end - today) / 86400000));

    let badgeClass = 'bg-safe';
    if (remaining <= 1) {
        badgeClass = 'bg-critical';
    } else if ((remaining / total) <= 0.5) {
        badgeClass = 'bg-warning';
    }

    return { remaining, total, badgeClass };
};


// Check if cache is still valid
const isCacheValid = (timestamp) => {
    if (!timestamp) return false;
    const age = Date.now() - new Date(timestamp).getTime();
    return age < CACHE_MAX_AGE;
};

function ECS() {
    const [searchQuery, setSearchQuery] = useState('');
    const [uploadedFile, setUploadedFile] = useState(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isLoadingClusters, setIsLoadingClusters] = useState(false); // only for cluster fetching
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [scheduleTarget, setScheduleTarget] = useState(null);
    const [clusters, setClusters] = useState([]); // Using static data for now
    const [syncStatus, setSyncStatus] = useState(null);
    const syncPollRef = useRef(null);
    const [clusterSchedules, setClusterSchedules] = useState({});
    const [clusterExceptions, setClusterExceptions] = useState({});
    const [confirmModal, setConfirmModal] = useState({
        open: false,
        message: '',
        onConfirm: null
    });

    const closeConfirmModal = () => {
        setConfirmModal({ open: false, message: '', onConfirm: null });
    };


    // Error handling states
    const [error, setError] = useState(null);
    const [isInitialLoad, setIsInitialLoad] = useState(true);

    const fileInputRef = useRef(null);
    const navigate = useNavigate();

    // Debounced search query (300ms delay)
    const debouncedSearchQuery = useDebounce(searchQuery, 300);

    // Fetch clusters from API
    const fetchClustersFromDB = useCallback(async () => {
        setIsLoadingClusters(true);
        setError(null);

        try {
            const response = await axiosClient.get('/ecs/clusters');
            const result = response.data;

            if (!result.success) {
                throw new Error(result.error?.message || 'Failed to fetch clusters');
            }

            const mappedClusters = result.data.map((c, index) => ({
                id: index + 1,
                name: c.cluster_name,
                activeServices: c.active_services_count,
                runningServices: c.running_services_count,
                closedServices: c.stopped_services_count,
                computeType: c.compute_type,
                isScheduled: c.is_scheduled,
                schedule_start: c.schedule_start,
                schedule_end: c.schedule_end
            }));

            setClusters(mappedClusters);
            setIsInitialLoad(false);

            localStorage.setItem(
                CLUSTER_CACHE_KEY,
                JSON.stringify({
                    data: mappedClusters,
                    timestamp: new Date().toISOString()
                })
            );
        } catch (err) {
            console.error('❌ Cluster fetch error:', err);
            setError(err.message);
        } finally {
            setIsLoadingClusters(false);
        }
    }, []);

    const loadClusterExceptions = useCallback(async () => {
        if (clusters.length === 0) return;

        const exceptions = {};

        await Promise.all(
            clusters.map(async (cluster) => {
                try {
                    const res = await axiosClient.get(
                        "/ecs/clusters/exception/status",
                        {
                            params: {
                                clusterName: cluster.name.trim()
                            }
                        }
                    );

                    if (res.data?.success) {
                        exceptions[cluster.name] =
                            res.data.data.has_exception;
                    }
                } catch (err) {
                    console.warn(
                        "❌ Failed to fetch exception status for:",
                        cluster.name
                    );

                    exceptions[cluster.name] = false;
                }
            })
        );

        setClusterExceptions(exceptions);
    }, [clusters]);

    useEffect(() => {
        if (clusters.length > 0) {
            loadClusterExceptions();
        }
    }, [clusters.length]);

    const handleAddException = async (clusterName) => {
        try {
            setError(null);

            const res = await axiosClient.post(
                "/ecs/clusters/exception/add",
                {
                    clusterName
                }
            );

            if (!res.data?.success) {
                throw new Error(
                    res.data?.error?.message ||
                    "Failed to add exception"
                );
            }

            // ✅ Update UI instantly
            setClusterExceptions((prev) => ({
                ...prev,
                [clusterName]: true
            }));

        } catch (err) {
            console.error("❌ Add exception failed:", err);

            setError(
                err.response?.data?.error?.message ||
                err.message
            );
        }
    };

    const handleRemoveException = async (clusterName) => {
        try {
            setError(null);

            const res = await axiosClient.delete(
                "/ecs/clusters/exception/remove",
                {
                    data: {
                        clusterName
                    }
                }
            );

            if (!res.data?.success) {
                throw new Error(
                    res.data?.error?.message ||
                    "Failed to remove exception"
                );
            }

            // ✅ Update UI instantly
            setClusterExceptions((prev) => ({
                ...prev,
                [clusterName]: false
            }));

        } catch (err) {
            console.error("❌ Remove exception failed:", err);

            setError(
                err.response?.data?.error?.message ||
                err.message
            );
        }
    };

    const handleAddExceptionWithConfirm = (clusterName) => {
        setConfirmModal({
            open: true,
            message: `Are you sure you want to add an exception for cluster "${clusterName}"?`,
            onConfirm: () => {
                handleAddException(clusterName);
                closeConfirmModal();
            }
        });
    };

    const handleRemoveExceptionWithConfirm = (clusterName) => {
        setConfirmModal({
            open: true,
            message: `Are you sure you want to remove the exception for cluster "${clusterName}"?`,
            onConfirm: () => {
                handleRemoveException(clusterName);
                closeConfirmModal();
            }
        });
    };



    const parseDateOnly = (dateStr) => {
        // dateStr = "2026-01-17T18:30:00.000Z"
        const d = new Date(dateStr);
        return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    };

    // const loadClusterSchedules = useCallback(async () => {
    //     if (clusters.length === 0) return;

    //     const schedules = {};

    //     await Promise.all(
    //         clusters.map(async (cluster) => {
    //             try {
    //                 const res = await axiosClient.get('/ecs/schedules/cluster', {
    //                     params: { clusterName: cluster.name.trim() } // remove extra spaces
    //                 });

    //                 if (res.data?.success && res.data.data) {
    //                     const data = res.data.data;
    //                     schedules[cluster.name] = {
    //                         from: parseDateOnly(data.from_date),
    //                         to: parseDateOnly(data.to_date),
    //                         from_time: data.from_time,
    //                         to_time: data.to_time
    //                     };
    //                 }
    //             } catch (err) {
    //                 console.warn('Failed to fetch schedule for', cluster.name, err);
    //                 schedules[cluster.name] = null;
    //             }
    //         })
    //     );

    //     setClusters(prev =>
    //         prev.map(cluster => {
    //             const schedule = schedules[cluster.name];
    //             return {
    //                 ...cluster,
    //                 scheduleStatus: schedule ? calculateScheduleStatus(schedule) : null
    //             };
    //         })
    //     );


    // }, [clusters]);

    const loadClusterSchedules = useCallback(async () => {
        if (clusters.length === 0) return;

        const schedules = {};

        await Promise.all(
            clusters.map(async (cluster) => {
                try {
                    const res = await axiosClient.get("/ecs/schedules/cluster", {
                        params: { clusterName: cluster.name.trim() }
                    });

                    if (res.data?.success && res.data.data) {
                        const data = res.data.data;

                        schedules[cluster.name] = {
                            from: parseDateOnly(data.from_date),
                            to: parseDateOnly(data.to_date),
                            from_time: data.from_time,
                            to_time: data.to_time,
                            is_active: true
                        };
                    }
                } catch (err) {
                    schedules[cluster.name] = null;
                }
            })
        );

        // ✅ VERY IMPORTANT
        setClusterSchedules(schedules);

        // Badge update
        setClusters(prev =>
            prev.map(cluster => {
                const schedule = schedules[cluster.name];
                return {
                    ...cluster,
                    scheduleStatus: schedule
                        ? calculateScheduleStatus(schedule)
                        : null,
                    isScheduled: !!schedule
                };
            })
        );
    }, [clusters]);


    const fetchSyncStatus = useCallback(async () => {
        try {
            const response = await axiosClient.get('/ecs/sync/status');
            const result = response.data;

            if (!result.success) {
                throw new Error(result.error?.message || 'Failed to fetch sync status');
            }

            const status = result.data;

            setSyncStatus(status);

            if (status.status === 'running') {
                setIsSyncing(true);
            } else {
                setIsSyncing(false);

                // stop polling if sync is done
                if (syncPollRef.current) {
                    clearInterval(syncPollRef.current);
                    syncPollRef.current = null;
                }

                // refresh clusters once sync completes
                if (status.status === 'completed') {
                    fetchClustersFromDB();
                }
            }
        } catch (err) {
            console.error('Failed to fetch sync status:', err);
        }
    }, [fetchClustersFromDB]);

    useEffect(() => {
        fetchClustersFromDB();
    }, [fetchClustersFromDB]);

    useEffect(() => {
        if (clusters.length > 0) {
            loadClusterSchedules();
        }
    }, [clusters.length]);

    // const stats = useMemo(() => ({
    //     totalServices: clusters.reduce((sum, c) => sum + c.activeServices, 0),
    //     totalClustersCount: clusters.length,
    //     activeExceptions: clusters.filter(c => c.isScheduled).length
    // }), [clusters]);

    const stats = useMemo(() => {
        const scheduledCount =
            clusters.filter((c) => c.isScheduled).length;

        const exceptionCount =
            Object.values(clusterExceptions).filter(Boolean).length;

        return {
            totalServices: clusters.reduce(
                (sum, c) => sum + c.activeServices,
                0
            ),

            totalClustersCount: clusters.length,

            // ✅ Scheduled + Exceptions
            activeExceptions: scheduledCount + exceptionCount
        };
    }, [clusters, clusterExceptions]);


    const filteredClustersWithStatus = useMemo(() => {
        return clusters.filter(cluster =>
            cluster.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
        );
    }, [clusters, debouncedSearchQuery]);

    const handleClusterClick = useCallback((clusterName) => {
        navigate(`/ecs/${clusterName}`);
    }, [navigate]);

    const handleSync = useCallback(async () => {
        try {
            setError(null);
            setIsSyncing(true);

            const response = await axiosClient.post('/ecs/sync');
            const result = response.data;

            if (!result?.success) {
                throw new Error(result?.error?.message || 'Sync failed');
            }

            await fetchClustersFromDB();

        } catch (err) {
            console.error('ECS Sync error:', err);

            // Handle already-running sync properly
            if (err.response?.status === 409) {
                setError("Sync already running. Please wait...");
            } else {
                setError(
                    err.response?.data?.error?.message ||
                    err.message ||
                    'Failed to sync clusters'
                );
            }

        } finally {
            setIsSyncing(false);
        }
    }, [fetchClustersFromDB]);


    const handleSyncWithConfirm = () => {
        setConfirmModal({
            open: true,
            message:
                'Syncing clusters may take a few minutes and refresh all cluster data. Are you sure you want to proceed?',
            onConfirm: async () => {
                closeConfirmModal();
                await handleSync();
            }
        });
    };


    const handleFileUpload = useCallback((event) => {
        const file = event.target.files[0];
        if (file) {
            setUploadedFile(file);

            // ⏸️ TODO: Process and upload file to API
            // Uncomment when API is ready:
            /*
            const formData = new FormData();
            formData.append('file', file);
            
            fetch('/api/ecs/upload-exceptions', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                console.log('File uploaded successfully:', data);
                // Refresh schedules after upload
                loadSchedules();
            })
            .catch(error => {
                console.error('Error uploading file:', error);
            });
            */

            console.log('File uploaded:', file.name);
        }
    }, []);

    const handleUploadClick = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    const handleScheduleClick = useCallback((cluster) => {
        setScheduleTarget({
            resourceType: 'ecs',
            scope: 'cluster',
            identifiers: {
                clusterName: cluster.name
            }
        });
        setIsScheduleModalOpen(true);
    }, []);


    const handleCloseModal = useCallback(() => {
        setIsScheduleModalOpen(false);
    }, []);

    const handleRemoveSchedule = useCallback(async () => {
        if (!scheduleTarget || scheduleTarget.scope !== "cluster") return;

        const { clusterName } = scheduleTarget.identifiers;

        try {
            await axiosClient.delete("/ecs/schedules/cluster", {
                params: { clusterName }
            });

            // ✅ Refresh schedule state
            await loadClusterSchedules();

            setIsScheduleModalOpen(false);
            setScheduleTarget(null);

        } catch (err) {
            console.error("Remove schedule failed:", err);
        }
    }, [scheduleTarget, loadClusterSchedules]);



    const handleRemoveScheduleWithConfirm = () => {
        setIsScheduleModalOpen(false);
        setConfirmModal({
            open: true,
            message: 'Are you sure you want to remove the schedule?',
            onConfirm: async () => {
                await handleRemoveSchedule();
                closeConfirmModal();
            }
        });
    };



    const handleConfirmSchedule = useCallback(
        async ({ from_date, to_date, from_time, to_time }) => {
            if (!scheduleTarget || scheduleTarget.scope !== "cluster") return;

            const { clusterName } = scheduleTarget.identifiers;

            try {
                setError(null);

                const response = await axiosClient.post(
                    "/ecs/schedules/cluster",
                    { from_date, to_date, from_time, to_time },
                    { params: { clusterName } }
                );

                if (!response.data?.success) {
                    throw new Error("Failed to save schedule");
                }

                // ✅ Reload schedules so modal gets initialRange
                await loadClusterSchedules();

                setIsScheduleModalOpen(false);
                setScheduleTarget(null);

            } catch (err) {
                console.error("Schedule save failed:", err);
                setError(err.response?.data?.error?.message || err.message);
            }
        },
        [scheduleTarget, loadClusterSchedules]
    );




    const handleNavigateToDeltaUpdates = useCallback(() => {
        navigate('/ecs/updates');
    }, [navigate]);

    if (error && isInitialLoad && clusters.length === 0) {
        return (
            <div className="ecs-page">
                <div className="error-state-fullpage">
                    <div className="error-container-fullpage">
                        <XCircle size={64} className="error-icon" />
                        <h2>Failed to Load Clusters</h2>
                        <p className="error-message">{error}</p>
                        <button
                            onClick={fetchClustersFromDB}
                            className="retry-btn"
                        >
                            <RefreshCw size={20} className={isSyncing ? 'spinning' : ''} />
                            {isSyncing ? 'Retrying...' : 'Retry'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="ecs-page">
            {/* ERROR BANNER - Shows if sync failed but we have cached data */}


            {/* Page Header */}
            <div className="page-header-modern">
                <div className="header-content-cluster">
                    <div className="header-left-cluster">
                        <div className="header-icon-modern">
                            <ECSIcon className="header-icon-svg" />
                        </div>
                        <div className="header-text">
                            <h1 className="page-title-modern">ECS Cluster Dashboard</h1>
                        </div>
                    </div>

                    <button
                        className="btn-delta-updates"
                        onClick={handleNavigateToDeltaUpdates}
                    >
                        <div className="icon-wrapper">
                            <GitCompare size={20} />
                        </div>
                        <span>Updates</span>
                    </button>
                </div>
            </div>

            {/* Stats & Actions Bar */}
            <div className="stats-actions-container">
                {/* Stats Cards */}
                <div className="stats-cards-modern">
                    <div className="stat-card-modern stat-primary-modern">
                        <div className="stat-icon-modern">
                            <ECSIcon />
                        </div>
                        <div className="stat-content-modern">
                            <h3 className="stat-value-modern">{stats.totalClustersCount}</h3>
                            <p className="stat-label-modern">Total Clusters</p>
                        </div>
                    </div>

                    <div className="stat-card-modern stat-success-modern">
                        <div className="stat-icon-modern">
                            <Server size={28} />
                        </div>
                        <div className="stat-content-modern">
                            <h3 className="stat-value-modern">{stats.totalServices}</h3>
                            <p className="stat-label-modern">Total Services</p>
                        </div>
                    </div>

                    <div className="stat-card-modern stat-info-modern">
                        <div className="stat-icon-modern">
                            <Clock size={28} />
                        </div>
                        <div className="stat-content-modern">
                            <h3 className="stat-value-modern">{stats.activeExceptions}</h3>
                            <p className="stat-label-modern">Active Exceptions</p>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="action-buttons-modern">
                    <button
                        className={`action-btn-modern btn-sync ${isSyncing ? 'syncing' : ''}`}
                        onClick={handleSyncWithConfirm}
                        disabled={isSyncing}
                    >

                        <RefreshCw size={20} className={isSyncing ? 'spinning' : ''} />
                        <span>{isSyncing ? 'Syncing...' : 'Sync Clusters'}</span>
                    </button>

                    <button
                        className="action-btn-modern btn-upload"
                        onClick={handleUploadClick}
                    >
                        <Upload size={20} />
                        <span>Upload Exceptions</span>
                        {uploadedFile && <span className="file-badge">{uploadedFile.name}</span>}
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".txt,.csv,.json"
                        onChange={handleFileUpload}
                        className="hidden-file-input"
                    />
                </div>
            </div>

            {/* Search Bar */}
            <div className="search-bar-modern">
                <Search size={20} className="search-icon-modern" />
                <input
                    type="text"
                    placeholder="Search clusters by name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="search-input-modern"
                />
                {searchQuery && (
                    <span className="search-results-count">
                        {filteredClustersWithStatus.length} results
                    </span>
                )}
            </div>

            {/* Clusters Table */}
            <div className="clusters-table-modern">
                <div className="table-header-modern">
                    <h3 className="table-title">Cluster Schedule Management</h3>
                    <p className="table-subtitle">
                        Manage automated schedules and exceptions
                    </p>
                </div>

                <div className="table-container-modern">
                    <table className="modern-table">
                        <thead>
                            <tr>
                                <th className="th-cluster">Cluster Name</th>
                                <th className="th-center">Active Services</th>
                                <th className="th-center">Running Services</th>
                                <th className="th-center">Closed Services</th>
                                <th className="th-center">Compute Type</th>
                                <th className="th-center">Schedule</th>
                                <th className="th-center">Exception</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredClustersWithStatus.map((cluster) => (
                                <tr
                                    key={cluster.id}
                                    className={`table-row-modern ${cluster.id % 2 !== 0 ? 'striped-row' : ''}`}
                                >
                                    <td
                                        className="cluster-name-modern clickable-cell"
                                        onClick={() => handleClusterClick(cluster.name)}
                                    >
                                        <div className="cluster-info">
                                            <Container size={20} className="cluster-icon-modern" />
                                            <div className="cluster-details">
                                                <span className="cluster-name-text" title={cluster.name}>
                                                    {cluster.name}
                                                </span>

                                                {/* Cluster-level schedule badge */}
                                                {cluster.scheduleStatus && (
                                                    <span className={`exception-badge ${cluster.scheduleStatus.badgeClass}`}>
                                                        <ExceptionTimer
                                                            remaining={cluster.scheduleStatus.remaining}
                                                            total={cluster.scheduleStatus.total}
                                                        />
                                                        Active {cluster.scheduleStatus.remaining} {cluster.scheduleStatus.remaining === 1 ? 'Day' : 'Days'}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </td>

                                    <td className="td-center">
                                        <div className="service-count active-count">
                                            <PlayCircle size={16} />
                                            <span>{cluster.activeServices}</span>
                                        </div>
                                    </td>
                                    <td className="td-center">
                                        <div className="service-count running-count">
                                            <Activity size={16} />
                                            <span>{cluster.runningServices}</span>
                                        </div>
                                    </td>
                                    <td className="td-center">
                                        <div className="service-count closed-count">
                                            <StopCircle size={16} />
                                            <span>{cluster.closedServices}</span>
                                        </div>
                                    </td>
                                    <td className="td-center">
                                        <span className={`compute-badge ${getComputeTypeColor(cluster.computeType)}`}>
                                            <Cpu size={16} />
                                            {cluster.computeType}
                                        </span>
                                    </td>
                                    <td className="td-center">
                                        <button
                                            className="schedule-btn"
                                            onClick={() => handleScheduleClick(cluster)}
                                        >
                                            <Calendar size={16} />
                                            <span>Set Schedule</span>
                                        </button>
                                    </td>
                                    {/* <td className="td-center">
                                        <button
                                            className="schedule-btn"
                                            onClick={() => handleScheduleClick(cluster)}
                                        >
                                            <CalendarMinus />
                                            <CalendarPlus />
                                        </button>
                                    </td> */}
                                    <td className="td-center">
                                        {cluster.isScheduled ? (

                                            <button
                                                className="schedule-btn exception-add"
                                                disabled
                                                title="Exceptions cannot be added when schedule is active"
                                                style={{ opacity: 0.4, cursor: "not-allowed" }}
                                            >
                                                <CalendarPlus size={18} />
                                            </button>

                                        ) : clusterExceptions[cluster.name] ? (
                                            <button
                                                className="schedule-btn exception-remove"
                                                onClick={() =>
                                                    handleRemoveExceptionWithConfirm(cluster.name)
                                                }
                                                title="Remove Exception"
                                            >
                                                <CalendarMinus size={20} />
                                            </button>

                                        ) : (
                                            <button
                                                className="schedule-btn exception-add"
                                                onClick={() =>
                                                    handleAddExceptionWithConfirm(cluster.name)
                                                }
                                                title="Add Exception"
                                            >
                                                <CalendarPlus size={20} />
                                            </button>

                                        )}

                                    </td>

                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {filteredClustersWithStatus.length === 0 && (
                        <div className="empty-state-modern">
                            <Container size={80} className="empty-icon-modern" />
                            <h3>No clusters found</h3>
                            <p>Try adjusting your search query</p>
                        </div>
                    )}
                </div>
            </div>


            <ScheduleModal
                isOpen={isScheduleModalOpen}
                onClose={() => setIsScheduleModalOpen(false)}
                target={scheduleTarget}
                initialRange={
                    scheduleTarget
                        ? clusterSchedules[scheduleTarget.identifiers.clusterName]
                        : null
                }
                onConfirm={handleConfirmSchedule}
                onRemove={handleRemoveScheduleWithConfirm}
            />

            <ConfirmActionModal
                isOpen={confirmModal.open}
                message={confirmModal.message}
                onConfirm={confirmModal.onConfirm}
                onCancel={closeConfirmModal}
            />

        </div>
    );
}

export default ECS;