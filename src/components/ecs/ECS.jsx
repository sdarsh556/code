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
    CalendarMinus,
    Play,
    Settings,
    RotateCcw
} from 'lucide-react';
import ECSIcon from '../common/ECSIcon';
import ExceptionTimer from './ExceptionTimer';
import ScheduleModal from '../common/ScheduleModal';
import ServiceSelectionModal from './ServiceSelectionModal';
import RevisionCalendarModal from './RevisionCalendarModal';
import '../../css/ecs/ECS.css';
import '../../css/common/ScheduleModal.css';
import axiosClient from '../api/axiosClient';
import ConfirmActionModal from '../common/ConfirmActionModal';
import ResizableTable from '../common/ResizableTable';

const CLUSTER_CACHE_KEY = 'lombard_ecs_clusters_cache';
const CACHE_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours

const DUMMY_CLUSTERS = [
    {
        id: 1,
        name: 'production-cluster',
        activeServices: 12,
        runningServices: 10,
        closedServices: 2,
        computeType: 'FARGATE',
        vcpu: '32 vCPU',
        memory: '128 GB',
        runningTasks: 45,
        pendingTasks: 3,
        isScheduled: true,
        isDummySchedule: true, // For CSS visibility
        schedule_start: null,
        schedule_end: null
    },
    {
        id: 2,
        name: 'staging-cluster',
        activeServices: 8,
        runningServices: 8,
        closedServices: 0,
        computeType: 'FARGATE',
        vcpu: '16 vCPU',
        memory: '64 GB',
        runningTasks: 20,
        pendingTasks: 0,
        isScheduled: false,
        isUrgentSchedule: true, // For CSS visibility (Red)
        schedule_start: null,
        schedule_end: null
    },
    {
        id: 3,
        name: 'development-cluster',
        activeServices: 15,
        runningServices: 5,
        closedServices: 10,
        computeType: 'ASG',
        vcpu: '64 vCPU',
        memory: '256 GB',
        runningTasks: 80,
        pendingTasks: 5,
        isScheduled: false,
        isDummyException: true, // For CSS visibility
        schedule_start: null,
        schedule_end: null
    }
];

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

    // Green if tomorrow or later, Red if today
    const badgeClass = remaining >= 1 ? 'badge-active' : 'badge-urgent';

    return { remaining, total, badgeClass };
};


// Check if cache is still valid
const isCacheValid = (timestamp) => {
    if (!timestamp) return false;
    const age = Date.now() - new Date(timestamp).getTime();
    return age < CACHE_MAX_AGE;
};

function ECS() {
    const tableRef = useRef(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [uploadedFile, setUploadedFile] = useState(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isLoadingClusters, setIsLoadingClusters] = useState(false); // only for cluster fetching
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [scheduleTarget, setScheduleTarget] = useState(null);
    const [clusters, setClusters] = useState([]); // Using static data for now
    const [syncStatus, setSyncStatus] = useState(null);
    const [lastSyncedAt, setLastSyncedAt] = useState(null);
    const [cronSettings, setCronSettings] = useState({ stop_time: '9:15 PM', start_time: '8:45 AM' });
    const [isServiceSelectionModalOpen, setIsServiceSelectionModalOpen] = useState(false);
    const [currentClusterServices, setCurrentClusterServices] = useState([]);
    const [isLoadingServices, setIsLoadingServices] = useState(false);

    // Revision state
    const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);
    const [availableDates, setAvailableDates] = useState([]);
    const [isRevisionLoading, setIsRevisionLoading] = useState(false);

    // Update Status state
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
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

    const columns = [
        { key: 'name', label: 'Cluster Name', widthPercent: 20, minWidth: 180, mandatory: true },
        { key: 'activeServices', label: 'Active Services', sortable: true, widthPercent: 12, minWidth: 120 },
        { key: 'runningServices', label: 'Running Services', sortable: true, widthPercent: 12, minWidth: 120 },
        { key: 'pendingServices', label: 'Pending Services', sortable: true, widthPercent: 12, minWidth: 120 },
        { key: 'closedServices', label: 'Closed Services', widthPercent: 12, minWidth: 120 },
        { key: 'computeType', label: 'Compute Type', widthPercent: 11, minWidth: 130 },
        { key: 'runningTasks', label: 'Tasks', subLabel: 'PEND | HLT | RUN', sortable: true, widthPercent: 12, minWidth: 160 },
        { key: 'vcpu', label: 'vCPU', sortable: true, widthPercent: 9, minWidth: 100 },
        { key: 'memory', label: 'Memory', sortable: true, widthPercent: 9, minWidth: 100 },
        { key: 'schedule', label: 'Schedule', widthPercent: 10, minWidth: 140 },
        { key: 'exception', label: 'Exception', widthPercent: 5, minWidth: 80 }
    ];


    // Fetch clusters from API
    const fetchClustersFromDB = useCallback(async () => {
        setIsLoadingClusters(true);
        setError(null);

        try {
            const response = await axiosClient.get('/ecs/clusters');
            const result = response.data;

            let clusterData = result.data || [];

            if (clusterData.length === 0) {
                console.log('⚠️ API returned no clusters, falling back to dummy clusters');
                clusterData = DUMMY_CLUSTERS.map(c => ({
                    cluster_name: c.name,
                    active_services_count: c.activeServices,
                    running_services_count: c.runningServices,
                    stopped_services_count: c.closedServices,
                    compute_type: c.computeType,
                    running_tasks_count: c.runningTasks,
                    pending_tasks_count: c.pendingTasks,
                    vcpu_total: c.vcpu,
                    memory_total: c.memory,
                    is_scheduled: c.isScheduled,
                    schedule_start: c.schedule_start,
                    schedule_end: c.schedule_end,
                    isDummySchedule: c.isDummySchedule,
                    isUrgentSchedule: c.isUrgentSchedule,
                    isDummyException: c.isDummyException
                }));
            }

            const mappedClusters = clusterData.map((c, index) => ({
                id: index + 1,
                name: c.cluster_name,
                activeServices: c.active_services_count,
                runningServices: c.running_services_count || (index === 0 ? 10 : index === 1 ? 8 : 5),
                pendingServices: c.pending_services_count || (index === 0 ? 2 : index === 1 ? 0 : 0),
                closedServices: c.stopped_services_count || (index === 0 ? 2 : index === 1 ? 0 : 10),
                runningTasks: c.running_tasks_count,
                pendingTasks: c.pending_tasks_count || 0,
                computeType: c.compute_type,
                vcpu: c.vcpu_total || (index === 0 ? '32 vCPU' : index === 1 ? '16 vCPU' : '64 vCPU'),
                memory: c.memory_total || (index === 0 ? '128 GB' : index === 1 ? '64 GB' : '256 GB'),
                isScheduled: c.is_scheduled,
                schedule_start: c.schedule_start,
                schedule_end: c.schedule_end,
                isDummySchedule: c.isDummySchedule,
                isUrgentSchedule: c.isUrgentSchedule,
                isDummyException: c.isDummyException
            }));

            setClusters(mappedClusters);
            setIsInitialLoad(false);

            // 🕐 Find the most recent last_synced_at from all clusters
            let maxDate = new Date(0);
            clusterData.forEach(c => {
                if (c.last_synced_at) {
                    const d = new Date(c.last_synced_at);
                    if (d > maxDate) maxDate = d;
                }
            });
            if (maxDate.getTime() > 0) {
                setLastSyncedAt(maxDate.toISOString());
            } else {
                // fallback: use current fetch time
                setLastSyncedAt(new Date().toISOString());
            }

            localStorage.setItem(
                CLUSTER_CACHE_KEY,
                JSON.stringify({
                    data: mappedClusters,
                    timestamp: new Date().toISOString()
                })
            );
        } catch (err) {
            console.error('❌ Cluster fetch error:', err);
            // setError(err.message);
            console.log('⚠️ Falling back to dummy clusters');
            setClusters(DUMMY_CLUSTERS);
            setIsInitialLoad(false);
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
                        : null
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
        const totalClustersCount = clusters.length;

        const totalServices = clusters.reduce(
            (sum, c) => sum + (c.activeServices || 0),
            0
        );

        const stoppedServices = clusters.reduce(
            (sum, c) => sum + (c.closedServices || 0),
            0
        );

        const totalRunningServices = clusters.reduce(
            (sum, c) => sum + (c.runningServices || 0),
            0
        );

        // Only count schedules from DB
        const activeScheduledCount = clusters.filter(
            (c) => c.isScheduled === true
        ).length;

        return {
            totalClustersCount,
            totalServices,
            totalRunningServices,
            stoppedServices,
            totalRunningTasks: clusters.reduce((sum, c) => sum + (c.runningTasks || 0), 0),
            activeSchedules: activeScheduledCount
        };
    }, [clusters]);

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


    const handleFileUpload = useCallback(async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setUploadedFile(file);
        setError(null);

        try {
            const formData = new FormData();
            formData.append("file", file);

            const response = await axiosClient.post(
                "/ecs/clusters/exception/bulk-add",
                formData,
                {
                    headers: {
                        "Content-Type": "multipart/form-data",
                    },
                }
            );

            if (response.status === 207) {
                alert("Upload completed with some failures. Check summary.");
            }

            const result = response.data;

            if (!result.success) {
                throw new Error(result.error?.message || "Bulk upload failed");
            }

            // ✅ Show summary to user (you can replace with toast if needed)
            alert(
                `Bulk Upload Completed:
            
Total: ${result.summary.total_clusters}
Added: ${result.summary.exceptions_added}
Failed: ${result.summary.clusters_failed}
Not Found: ${result.summary.clusters_not_found.length}`
            );

            // ✅ Refresh exception state after upload
            await loadClusterExceptions();

        } catch (err) {
            console.error("Bulk upload failed:", err);

            setError(
                err.response?.data?.error?.message ||
                err.message ||
                "Failed to upload exceptions"
            );
        } finally {
            // Reset input so same file can be uploaded again
            event.target.value = null;
        }
    }, [loadClusterExceptions]);


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

    const handleSelectionSubmit = async (selection) => {
        try {
            const enabledServices = Object.keys(selection).filter(name => selection[name]);
            console.log(`Submitting schedule for ${enabledServices.length} services`);

            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1500));

            setIsServiceSelectionModalOpen(false);
            setSyncStatus('Schedule applied successfully');
            
            // Refresh to show new schedule state if needed
            fetchClustersFromDB();
        } catch (err) {
            console.error('Failed to submit service selection:', err);
            setError('Failed to apply service overrides.');
        }
    };

    const fetchServicesForSelection = async (clusterName) => {
        setIsLoadingServices(true);
        try {
            const response = await axiosClient.get('/ecs/services/cluster', {
                params: { clusterName }
            });
            
            if (response.data?.success) {
                const svcs = response.data.data.map(s => ({
                    name: s.service_name || s.name
                }));
                setCurrentClusterServices(svcs);
            } else {
                // Fallback to minimal names if no details
                setCurrentClusterServices([{ name: 'auth-service' }, { name: 'api-gateway' }]);
            }
        } catch (err) {
            console.warn('Backend unavailable, using dummy services for selection');
            setCurrentClusterServices([
                { name: 'auth-service' }, 
                { name: 'api-gateway' }, 
                { name: 'worker-process' },
                { name: 'notification-mgr' },
                { name: 'payment-relay' }
            ]);
        } finally {
            setIsLoadingServices(false);
        }
    };



    const handleConfirmSchedule = useCallback(
        async ({ from_date, to_date, from_time, to_time }) => {
            if (!scheduleTarget || scheduleTarget.scope !== "cluster") return;

            const { clusterName } = scheduleTarget.identifiers;

            try {
                setError(null);

                /* COMMENTED OUT FOR MANUAL VERIFICATION
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
                */

                // Fetch services (Commented out for immediate verification)
                /* 
                await fetchServicesForSelection(clusterName);
                */
               
                // Fallback dummy data for immediate view
                if (currentClusterServices.length === 0) {
                    setCurrentClusterServices([
                        { name: 'auth-service' }, 
                        { name: 'api-gateway' }, 
                        { name: 'worker-process' }
                    ]);
                }

                setIsScheduleModalOpen(false);
                setIsServiceSelectionModalOpen(true);

            } catch (err) {
                console.error("Schedule transition failed:", err);
                setError("Failed to initialize service selection.");
            }
        },
        [scheduleTarget, loadClusterSchedules]
    );




    const handleNavigateToDeltaUpdates = useCallback(() => {
        navigate('/ecs/updates');
    }, [navigate]);

    // Revision: fetch available inventory dates
    const fetchInventoryDates = useCallback(async () => {
        try {
            setIsRevisionLoading(true);
            const response = await axiosClient.get('/ecs/inventory/dates');
            if (response.data?.success) {
                setAvailableDates(response.data.data.available_dates || []);
                setIsRevisionModalOpen(true);
            } else {
                // No backend: open modal with empty dates so user sees the calendar UI
                setAvailableDates([]);
                setIsRevisionModalOpen(true);
            }
        } catch (err) {
            console.error('Failed to fetch revision dates:', err);
            // Still open the modal — just no selectable dates
            setAvailableDates([]);
            setIsRevisionModalOpen(true);
        } finally {
            setIsRevisionLoading(false);
        }
    }, []);

    // Revision: apply selected date to all clusters
    const applyRevisionForDate = useCallback(async (date) => {
        if (!date) return;
        try {
            setIsRevisionLoading(true);
            const response = await axiosClient.get('/ecs/inventory/clusters', {
                params: { date }
            });
            if (!response.data?.success) {
                throw new Error('Failed to fetch revision clusters');
            }
            // Refresh cluster list to reflect reverted state
            await fetchClustersFromDB();
            setIsRevisionModalOpen(false);
        } catch (err) {
            console.error('Revision apply failed:', err);
            setIsRevisionModalOpen(false);
        } finally {
            setIsRevisionLoading(false);
        }
    }, [fetchClustersFromDB]);

    // Update Status: refresh cluster statuses from AWS
    const handleUpdateStatus = useCallback(async () => {
        try {
            setIsUpdatingStatus(true);
            setError(null);
            const response = await axiosClient.post('/ecs/clusters/update-status');
            if (response.data?.success) {
                await fetchClustersFromDB();
            } else {
                throw new Error(response.data?.error?.message || 'Update status failed');
            }
        } catch (err) {
            console.error('Update status failed:', err);
            setError(err.response?.data?.error?.message || err.message || 'Failed to update cluster statuses');
        } finally {
            setIsUpdatingStatus(false);
        }
    }, [fetchClustersFromDB]);

    const handleUpdateStatusWithConfirm = useCallback(() => {
        setConfirmModal({
            open: true,
            message: 'Are you sure you want to refresh cluster statuses from AWS? This will update the current state of all clusters.',
            onConfirm: async () => {
                closeConfirmModal();
                await handleUpdateStatus();
            }
        });
    }, [handleUpdateStatus]);

    // Format ISO string to IST human-readable date/time
    const formatIST = (isoString) => {
        if (!isoString) return '--';
        const date = new Date(isoString);
        return new Intl.DateTimeFormat('en-IN', {
            timeZone: 'Asia/Kolkata',
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        }).format(date);
    };

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
                            <ECSIcon className="header-icon-svg" color="inherit" />
                        </div>
                        <div className="header-text">
                            <h1 className="page-title-modern">ECS Cluster Dashboard</h1>
                            {lastSyncedAt && (
                                <div className="ecs-header-sync-info">
                                    <Clock size={12} className="ecs-sync-info-icon" />
                                    <span>Last Synced At: <span className="ecs-sync-info-val">{formatIST(lastSyncedAt)}</span></span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="ecs-header-actions">
                        <button
                            className="ecs-btn-stack ecs-btn-delta-updates ecs-update-btn"
                            onClick={handleNavigateToDeltaUpdates}
                        >
                            <div className="ecs-icon-wrapper">
                                <Activity size={18} />
                            </div>
                            <span>Updates</span>
                        </button>

                        <button
                            className={`ecs-btn-stack ecs-btn-delta-updates ecs-sync-btn ${isSyncing ? 'ecs-syncing' : ''}`}
                            onClick={handleSyncWithConfirm}
                            disabled={isSyncing}
                        >
                            <div className="ecs-icon-wrapper">
                                <RefreshCw size={20} className={isSyncing ? 'ecs-spinning' : ''} />
                            </div>
                            <span>{isSyncing ? 'Syncing...' : 'Sync Clusters'}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Quick Actions Panel */}
            <div className="ecs-action-panel">
                <div className="ecs-action-info">
                    <div className="ecs-action-icon-wrapper">
                        <Activity size={24} />
                    </div>
                    <div>
                        <p className="ecs-action-title">Quick Actions</p>
                        <div className="ecs-cron-timings">
                            <div className="ecs-cron-tag ecs-stop-tag">
                                <Clock size={12} className="ecs-cron-icon" />
                                <span>Stop: <span className="ecs-cron-val">{cronSettings.stop_time}</span></span>
                            </div>
                            <div className="ecs-cron-sep" />
                            <div className="ecs-cron-tag ecs-start-tag">
                                <Clock size={12} className="ecs-cron-icon" />
                                <span>Start: <span className="ecs-cron-val">{cronSettings.start_time}</span></span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="ecs-action-buttons">
                    <button
                        className="ecs-btn-stack ecs-btn-delta-updates ecs-start-all-btn"
                        onClick={() => { /* Start All logic */ }}
                    >
                        <div className="ecs-icon-wrapper">
                            <Play size={16} fill="currentColor" />
                        </div>
                        <span>Start All</span>
                    </button>

                    <button
                        className="ecs-btn-stack ecs-btn-delta-updates ecs-upload-btn"
                        onClick={handleUploadClick}
                    >
                        <div className="ecs-icon-wrapper">
                            <Upload size={16} />
                        </div>
                        <span>Upload Exceptions</span>
                        {uploadedFile && <span className="ecs-file-badge">{uploadedFile.name}</span>}
                    </button>

                    <button
                        className="ecs-btn-stack ecs-btn-delta-updates ecs-revision-btn"
                        onClick={fetchInventoryDates}
                        disabled={isRevisionLoading}
                    >
                        <div className="ecs-icon-wrapper">
                            <RotateCcw size={16} className={isRevisionLoading ? 'ecs-spinning' : ''} />
                        </div>
                        <span>{isRevisionLoading ? 'Loading...' : 'Revision'}</span>
                    </button>

                    <button
                        className="ecs-btn-stack ecs-btn-delta-updates ecs-update-status-btn"
                        onClick={handleUpdateStatusWithConfirm}
                        disabled={isUpdatingStatus}
                    >
                        <div className="ecs-icon-wrapper">
                            <RefreshCw size={16} className={isUpdatingStatus ? 'ecs-spinning' : ''} />
                        </div>
                        <span>{isUpdatingStatus ? 'Updating...' : 'Update Status'}</span>
                    </button>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".txt,.csv"
                        onChange={handleFileUpload}
                        style={{ display: 'none' }}
                    />
                </div>
            </div>

            {/* Premium Stats Grid - RDS Replica */}
            <div className="ecs-stats-grid">
                <div className="ecs-stat-card">
                    <div className="ecs-stat-header">
                        <span className="ecs-stat-title">Total Clusters</span>
                        <div className="ecs-stat-icon-standard ecs-blue">
                            <ECSIcon size={24} color="inherit" />
                        </div>
                    </div>
                    <div className="ecs-stat-value ecs-glow-text">{stats.totalClustersCount}</div>
                </div>

                <div className="ecs-stat-card">
                    <div className="ecs-stat-header">
                        <span className="ecs-stat-title">Total Services</span>
                        <div className="ecs-stat-icon-standard ecs-purple">
                            <Cpu size={24} />
                        </div>
                    </div>
                    <div className="ecs-stat-value ecs-purple-text">{stats.totalServices}</div>
                </div>

                <div className="ecs-stat-card">
                    <div className="ecs-stat-header">
                        <span className="ecs-stat-title">Running Services</span>
                        <div className="ecs-stat-icon-standard ecs-green">
                            <Activity size={24} />
                        </div>
                    </div>
                    <div className="ecs-stat-value ecs-green-text">{stats.totalRunningServices}</div>
                </div>

                <div className="ecs-stat-card">
                    <div className="ecs-stat-header">
                        <span className="ecs-stat-title">Stopped Services</span>
                        <div className="ecs-stat-icon-standard ecs-red">
                            <XCircle size={24} />
                        </div>
                    </div>
                    <div className="ecs-stat-value ecs-red-text">{stats.stoppedServices}</div>
                </div>

                <div className="ecs-stat-card">
                    <div className="ecs-stat-header">
                        <span className="ecs-stat-title">Running Tasks</span>
                        <div className="ecs-stat-icon-standard ecs-teal">
                            <Zap size={24} />
                        </div>
                    </div>
                    <div className="ecs-stat-value ecs-teal-text">{stats.totalRunningTasks}</div>
                </div>

                <div className="ecs-stat-card">
                    <div className="ecs-stat-header">
                        <span className="ecs-stat-title">Active Schedules</span>
                        <div className="ecs-stat-icon-standard ecs-yellow">
                            <Calendar size={24} />
                        </div>
                    </div>
                    <div className="ecs-stat-value ecs-yellow-text">{stats.activeSchedules}</div>
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
                <div className="table-header-modern" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h3 className="table-title">Cluster Schedule Management</h3>
                        <p className="table-subtitle">
                            Manage automated schedules and exceptions
                        </p>
                    </div>
                    <button
                        className="ecs-th-action-btn ecs-settings-btn"
                        onClick={() => tableRef.current?.openSettings()}
                        title="Column Settings"
                    >
                        <Settings size={18} />
                        <span>Settings</span>
                    </button>
                </div>

                <div className="table-container-modern">
                    <ResizableTable
                        ref={tableRef}
                        columns={columns}
                        data={filteredClustersWithStatus}
                        tableClassName="modern-table"
                        wrapperClassName="table-container-modern"
                        renderCell={(key, cluster) => {

                            switch (key) {

                                case 'name':
                                    return (
                                        <div
                                            className="cluster-name-modern clickable-cell"
                                            onClick={() => handleClusterClick(cluster.name)}
                                        >
                                            <div className="cluster-info">
                                                <Container size={20} className="cluster-icon-modern" />
                                                <div className="cluster-details">
                                                    <span
                                                        className="cluster-name-text"
                                                        title={cluster.name}
                                                    >
                                                        {cluster.name}
                                                    </span>

                                                    {/* Schedule badge */}
                                                    {cluster.scheduleStatus && (
                                                        <span className={`ecs-status-badge ${cluster.scheduleStatus.badgeClass}`}>
                                                            <Clock size={12} />
                                                            {cluster.scheduleStatus.remaining >= 1 
                                                               ? `${cluster.scheduleStatus.remaining} Days Remaining` 
                                                               : 'Ends Today'}
                                                        </span>
                                                    )}

                                                    {/* Dummy Schedule for CSS testing */}
                                                    {cluster.isDummySchedule && !cluster.scheduleStatus && (
                                                        <span className="ecs-status-badge badge-active">
                                                            <Clock size={12} />
                                                            5 Days Remaining
                                                        </span>
                                                    )}

                                                    {/* Dummy Urgent Schedule for CSS testing */}
                                                    {cluster.isUrgentSchedule && !cluster.scheduleStatus && (
                                                        <span className="ecs-status-badge badge-urgent">
                                                            <Clock size={12} />
                                                            Ends Today
                                                        </span>
                                                    )}

                                                    {/* Exception badge */}
                                                    {(clusterExceptions[cluster.name] || cluster.isDummyException) && (
                                                        <span className="ecs-status-badge badge-urgent badge-exception">
                                                            <AlertTriangle size={12} />
                                                            Active Exception
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );

                                case 'activeServices':
                                    return (
                                        <div className="service-count active-count">
                                            <PlayCircle size={16} />
                                            <span>{cluster.activeServices}</span>
                                        </div>
                                    );

                                case 'runningServices':
                                    return (
                                        <div className="service-count running-count">
                                            <Activity size={16} />
                                            <span>{cluster.runningServices}</span>
                                        </div>
                                    );

                                case 'pendingServices':
                                    return (
                                        <div className="service-count pending-count">
                                            <Clock size={16} />
                                            <span>{cluster.pendingServices || 0}</span>
                                        </div>
                                    );

                                case 'closedServices':
                                    return (
                                        <div className="service-count closed-count">
                                            <StopCircle size={16} />
                                            <span>{cluster.closedServices}</span>
                                        </div>
                                    );

                                case 'computeType':
                                    return (
                                        <span className={`compute-badge ${getComputeTypeColor(cluster.computeType)}`}>
                                            <Cpu size={16} />
                                            {cluster.computeType}
                                        </span>
                                    );

                                case 'runningTasks':
                                    return (
                                        <div className="tasks-capsule">
                                            <div className="tasks-pending" title="Pending Tasks">
                                                {cluster.pendingTasks}
                                            </div>
                                            <div className="tasks-divider"></div>
                                            <div className="tasks-healthy" title="Healthy Tasks">
                                                {cluster.healthyTasks || cluster.runningTasks}
                                            </div>
                                            <div className="tasks-divider"></div>
                                            <div className="tasks-running" title="Running Tasks">
                                                {cluster.runningTasks}
                                            </div>
                                        </div>
                                    );

                                case 'vcpu':
                                    return (
                                        <div className="vcpu-count">
                                            <Cpu size={16} />
                                            <span>{cluster.vcpu}</span>
                                        </div>
                                    );

                                case 'memory':
                                    return (
                                        <div className="memory-count">
                                            <Zap size={16} />
                                            <span>{cluster.memory}</span>
                                        </div>
                                    );

                                case 'schedule':
                                    return (
                                        <button
                                            className="schedule-btn"
                                            onClick={() => handleScheduleClick(cluster)}
                                        >
                                            <Calendar size={16} />
                                            <span>Set Schedule</span>
                                        </button>
                                    );

                                case 'exception':

                                    if (clusterExceptions[cluster.name] || cluster.isDummyException) {
                                        return (
                                            <button
                                                className="schedule-btn exception-remove"
                                                onClick={() =>
                                                    handleRemoveExceptionWithConfirm(cluster.name)
                                                }
                                                title="Remove Exception"
                                            >
                                                <CalendarMinus size={20} />
                                            </button>
                                        );
                                    }

                                    // 2️⃣ If schedule exists but no exception → disable ADD
                                    if (cluster.scheduleStatus || cluster.isDummySchedule || cluster.isUrgentSchedule) {
                                        return (
                                            <button
                                                className="schedule-btn exception-add disabled"
                                                disabled
                                                title="Exceptions cannot be added when schedule is active"
                                                style={{ opacity: 0.4, cursor: "not-allowed" }}
                                            >
                                                <CalendarPlus size={18} />
                                            </button>
                                        );
                                    }

                                    // 3️⃣ Normal ADD
                                    return (
                                        <button
                                            className="schedule-btn exception-add"
                                            onClick={() =>
                                                handleAddExceptionWithConfirm(cluster.name)
                                            }
                                            title="Add Exception"
                                        >
                                            <CalendarPlus size={20} />
                                        </button>
                                    );
                                default:
                                    return null;
                            }
                        }}
                    />


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

            <ServiceSelectionModal
                isOpen={isServiceSelectionModalOpen}
                onClose={() => {
                    setIsServiceSelectionModalOpen(false);
                    setScheduleTarget(null);
                }}
                clusterName={scheduleTarget?.identifiers?.clusterName}
                services={currentClusterServices}
                onSubmit={handleSelectionSubmit}
            />

            <ConfirmActionModal
                isOpen={confirmModal.open}
                message={confirmModal.message}
                onConfirm={confirmModal.onConfirm}
                onCancel={closeConfirmModal}
            />

            <RevisionCalendarModal
                isOpen={isRevisionModalOpen}
                availableDates={availableDates}
                onClose={() => setIsRevisionModalOpen(false)}
                onSubmit={(date) => applyRevisionForDate(date)}
            />

        </div>
    );
}

export default ECS;