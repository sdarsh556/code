import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ChevronLeft,
    Search,
    Play,
    Square,
    Calendar,
    Edit2,
    CheckCircle2,
    XCircle,
    Server,
    X,
    Activity,
    Zap,
    AlertCircle,
    Minus,
    Plus,
    ArrowRight,
    Container,
    RefreshCw,
    Layers,
    StopCircle,
    RotateCcw
} from 'lucide-react';
import ScheduleModal from '../common/ScheduleModal';
import ExceptionTimer from './ExceptionTimer';
import '../../css/ecs/ECSServices.css';
import axiosClient from '../api/axiosClient';
import ConfirmActionModal from '../common/ConfirmActionModal';
import ECSIcon from '../common/ECSIcon';
import BulkServiceActionModal from './BulkServiceActionModal';
import 'react-resizable/css/styles.css'; // required CSS
import ResizableTable from '../common/ResizableTable';
// import RevisionCalendarModal from './RevisionCalendarModal';

const SCHEDULE_CACHE_KEY = 'lombard_ecs_schedules';

const DUMMY_SERVICES = [
    {
        service_arn: 'arn:aws:ecs:us-east-1:123456789012:service/auth-service',
        service_name: 'auth-service',
        cluster_arn: 'arn:aws:ecs:us-east-1:123456789012:cluster/production',
        cluster_name: 'production',
        min_value: 2,
        desired_value: 2,
        max_value: 4,
        current_status: 'running',
        is_scheduled: true,
        is_enabled: true
    },
    {
        service_arn: 'arn:aws:ecs:us-east-1:123456789012:service/api-gateway',
        service_name: 'api-gateway',
        cluster_arn: 'arn:aws:ecs:us-east-1:123456789012:cluster/production',
        cluster_name: 'production',
        min_value: 1,
        desired_value: 1,
        max_value: 2,
        current_status: 'running',
        is_scheduled: false,
        is_enabled: true
    },
    {
        service_arn: 'arn:aws:ecs:us-east-1:123456789012:service/worker-process',
        service_name: 'worker-process',
        cluster_arn: 'arn:aws:ecs:us-east-1:123456789012:cluster/production',
        cluster_name: 'production',
        min_value: 0,
        desired_value: 0,
        max_value: 5,
        current_status: 'stopped',
        is_scheduled: true,
        is_enabled: false
    }
];

// Debounce hook for search optimization
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

// Calculate schedule metadata, only if today is within the schedule
const calculateScheduleData = ({ from, to }) => {
    if (!from || !to || isNaN(from.getTime()) || isNaN(to.getTime())) return null;

    // Reset times to local midnight
    const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
    const end = new Date(to.getFullYear(), to.getMonth(), to.getDate());

    const today = new Date();
    today.setHours(0, 0, 0, 0); // local midnight

    if (today < start || today > end) return null;

    const totalDays = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1; // total days
    const remainingDays = Math.max(0, Math.floor((end - today) / (1000 * 60 * 60 * 24)));

    let badgeClass = 'bg-safe';
    if (remainingDays <= 1) badgeClass = 'bg-critical';
    else if (remainingDays / totalDays <= 0.5) badgeClass = 'bg-warning';

    return { remainingDays, totalDays, badgeClass };
};

// Validate edit form - ONLY CHECK min <= max
const validateEditForm = (form) => {
    if (form.min === "" || form.max === "") return false;

    const min = Number(form.min);
    const max = Number(form.max);

    return min <= max;
};

function ECSServices() {
    const { clusterName } = useParams();
    const navigate = useNavigate();

    const [searchQuery, setSearchQuery] = useState('');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedService, setSelectedService] = useState(null);
    const [editForm, setEditForm] = useState({
        min: "0",
        max: "0",
        desired: "0"
    });

    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [serviceSchedules, setServiceSchedules] = useState({});
    const [scheduledRange, setScheduledRange] = useState(null);
    const [services, setServices] = useState([]);
    const [clusterArn, setClusterArn] = useState(''); // Derived from first service
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isStartingAll, setIsStartingAll] = useState(false);
    const [isStoppingAll, setIsStoppingAll] = useState(false);
    const [operationResult, setOperationResult] = useState(null);
    const [serviceHistory, setServiceHistory] = useState([]);
    const [scheduleTarget, setScheduleTarget] = useState(null);
    const [confirmModal, setConfirmModal] = useState({
        open: false,
        message: '',
        onConfirm: null
    });
    const [clusterSchedules, setClusterSchedules] = useState({});

    const [successMessage, setSuccessMessage] = useState(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const [showSyncConfirm, setShowSyncConfirm] = useState(false);
    const [syncError, setSyncError] = useState(null);
    const [bulkAction, setBulkAction] = useState({
        open: false,
        action: null,
        mode: null
    });

    const [file, setFile] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [clusterComputeType, setClusterComputeType] = useState(null);

    // Revision State
    const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);
    const [availableDates, setAvailableDates] = useState([]);
    const [isRevisionLoading, setIsRevisionLoading] = useState(false);

    useEffect(() => {
        if (successMessage) {
            const timer = setTimeout(() => {
                setSuccessMessage(null);
            }, 3000);

            return () => clearTimeout(timer);
        }
    }, [successMessage]);


    // Debounced search query (300ms delay)
    const debouncedSearchQuery = useDebounce(searchQuery, 300);

    const closeConfirmModal = () => {
        setConfirmModal({
            open: false,
            message: '',
            onConfirm: null
        });
    };

    const closeBulkModal = () => {
        setBulkAction({ open: false, action: null, mode: null });
        setFile(null);
    };


    const parseLocalDate = (dateStr) => {
        if (!dateStr) return null;
        const d = new Date(dateStr); // JS parses ISO
        if (isNaN(d)) return null;
        return new Date(d.getFullYear(), d.getMonth(), d.getDate()); // local midnight
    };

    const fetchInventoryDates = async () => {
        try {
            setIsRevisionLoading(true);

            const response = await axiosClient.get("/ecs/inventory/dates", {
                params: { clusterName }
            });

            if (response.data?.success) {
                setAvailableDates(response.data.data.available_dates || []);
                setIsRevisionModalOpen(true);
            }

        } catch (err) {
            console.error("Failed to fetch inventory dates:", err);
            alert("Failed to fetch revision dates");
        } finally {
            setIsRevisionLoading(false);
        }
    };

    const applyRevisionForDate = async (date) => {
        if (!date) return;

        try {
            setIsRevisionLoading(true);

            const response = await axiosClient.get("/ecs/inventory/services", {
                params: {
                    clusterName,
                    date: date
                }
            });

            if (!response.data?.success) {
                throw new Error("Failed to fetch revision services");
            }

            const revisionServices = response.data.data.services || [];

            setServices(prevServices =>
                prevServices.map(service => {
                    const matched = revisionServices.find(
                        s => s.service_name === service.name
                    );

                    if (matched) {
                        return {
                            ...service,
                            is_enabled: matched.is_enabled
                        };
                    }

                    return service;
                })
            );

            setIsRevisionModalOpen(false);
            setSuccessMessage(`Revision applied for ${date}`);

        } catch (err) {
            console.error("Revision apply failed:", err);
            alert("Failed to apply revision");
        } finally {
            setIsRevisionLoading(false);
        }
    };


    const fetchScheduleForCluster = useCallback(async () => {
        if (!clusterName) return;

        try {
            const response = await axiosClient.get(
                '/ecs/schedules/cluster',
                { params: { clusterName } }
            );

            const result = response.data;

            if (!result?.success || !result.data) {
                setScheduledRange(null);
                return;
            }

            const fromDate = parseLocalDate(result.data.from_date);
            const toDate = parseLocalDate(result.data.to_date);

            setScheduledRange({
                from: fromDate,
                to: toDate,
                from_time: result.data.from_time,
                to_time: result.data.to_time,
                is_active: result.data.is_active
            });



        } catch (err) {
            console.error('Failed to fetch cluster schedule:', err);
            setScheduledRange(null);
        }
    }, [clusterName]);

    const fetchServicesForCluster = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        setServices([]);

        try {
            const response = await axiosClient.get(
                '/ecs/services/cluster',
                {
                    params: {
                        clusterName: clusterName
                    }
                }
            );

            const result = response.data;

            if (!result?.success) {
                throw new Error(result?.error?.message || 'Failed to fetch services');
            }

            let servicesData = result.data || [];

            if (servicesData.length === 0) {
                console.log('⚠️ API returned no services, falling back to dummy services');
                servicesData = DUMMY_SERVICES;
            }

            if (servicesData.length > 0) {
                setClusterArn(servicesData[0].cluster_arn || servicesData[0].clusterArn);
            }

            setServices(
                servicesData.map(service => ({
                    serviceArn: service.service_arn || service.serviceArn,
                    name: service.service_name || service.name,
                    clusterArn: service.cluster_arn || service.clusterArn,
                    clusterName: service.cluster_name || service.clusterName,
                    min: service.min_value !== undefined ? service.min_value : service.min,
                    desired: service.desired_value !== undefined ? service.desired_value : service.desired,
                    max: service.max_value !== undefined ? service.max_value : service.max,
                    status: service.current_status || service.status,
                    isActive: (service.desired_value !== undefined ? service.desired_value : service.desired) > 0,
                    isScheduled: service.is_scheduled || service.isScheduled,
                    is_enabled: service.is_enabled !== undefined ? service.is_enabled : service.isActive
                }))
            );


        } catch (err) {
            console.error('Fetch services error:', err);
            console.log('⚠️ Falling back to dummy services');

            const servicesData = DUMMY_SERVICES;
            setServices(
                servicesData.map(service => ({
                    serviceArn: service.service_arn || service.serviceArn,
                    name: service.service_name || service.name,
                    clusterArn: service.cluster_arn || service.clusterArn,
                    clusterName: service.cluster_name || service.clusterName,
                    min: service.min_value !== undefined ? service.min_value : service.min,
                    desired: service.desired_value !== undefined ? service.desired_value : service.desired,
                    max: service.max_value !== undefined ? service.max_value : service.max,
                    status: service.current_status || service.status,
                    isActive: (service.desired_value !== undefined ? service.desired_value : service.desired) > 0,
                    isScheduled: service.is_scheduled || service.isScheduled,
                    is_enabled: service.is_enabled !== undefined ? service.is_enabled : service.isActive
                }))
            );

            if (servicesData.length > 0) {
                setClusterArn(servicesData[0].cluster_arn || servicesData[0].clusterArn);
            }
        } finally {
            setIsLoading(false);
        }
    }, [clusterName]);

    const fetchClustersFromDB = useCallback(async () => {
        try {
            const response = await axiosClient.get("/ecs/clusters");
            const result = response.data;

            if (!result.success) {
                throw new Error("Failed to fetch clusters");
            }

            // Find current cluster
            const currentCluster = result.data.find(
                (c) => c.cluster_name === clusterName
            );

            if (currentCluster) {
                setClusterComputeType(currentCluster.compute_type);
            }
        } catch (err) {
            console.error("❌ Failed to fetch cluster compute type:", err);
            // Fallback: if we are in a known dummy cluster, set compute type accordingly
            if (clusterName.includes('production') || clusterName.includes('staging')) {
                setClusterComputeType('FARGATE');
            } else if (clusterName.includes('development')) {
                setClusterComputeType('ASG');
            }
        }
    }, [clusterName]);


    const getRemainingDays = (toDateStr) => {
        if (!toDateStr) return null;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const end = new Date(toDateStr);
        end.setHours(0, 0, 0, 0);

        const diffMs = end - today;
        const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24) + 1);

        return days >= 0 ? days : null;
    };


    const fetchServiceSchedules = useCallback(async () => {
        if (!clusterName) return;

        try {
            const response = await axiosClient.get(
                '/ecs/schedules/services',
                { params: { clusterName } }
            );

            if (!response.data?.success) {
                setServiceSchedules({});
                return;
            }

            const schedulesMap = {};

            response.data.data.forEach(service => {
                schedulesMap[service.service_name] = {
                    from: parseLocalDate(service.from_date),
                    to: parseLocalDate(service.to_date),
                    from_time: service.from_time,
                    to_time: service.to_time,
                    is_active: service.is_active
                };

            });

            setServiceSchedules(schedulesMap);
        } catch (err) {
            console.error('Failed to fetch service schedules', err);
            setServiceSchedules({});
        }
    }, [clusterName]);




    useEffect(() => {
        fetchServicesForCluster();
        fetchScheduleForCluster();
        fetchServiceSchedules();
        fetchClustersFromDB()
    }, [fetchServicesForCluster, fetchScheduleForCluster, fetchServiceSchedules, fetchClustersFromDB]);


    // Clear operation result after 5 seconds
    useEffect(() => {
        if (operationResult) {
            const timer = setTimeout(() => {
                setOperationResult(null);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [operationResult]);

    // Pre-calculate schedule data (memoized)
    const scheduleData = useMemo(() => {
        if (!scheduledRange) return null;

        return calculateScheduleData({
            from: scheduledRange.from,
            to: scheduledRange.to
        });
    }, [scheduledRange]);

    const clusterHasActiveSchedule = useMemo(
        () => Boolean(scheduledRange),
        [scheduledRange]
    );






    // Filtered services (memoized)
    const filteredServices = useMemo(() => {
        return services.filter(service =>
            service.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
        );
    }, [services, debouncedSearchQuery]);

    // Calculate stats (memoized)
    const stats = useMemo(() => {
        let running = 0;
        let stopped = 0;
        let schedules = 0;

        services.forEach(service => {
            if (service.status === 'running') running++;
            else if (service.status === 'stopped') stopped++;
            if (service.isScheduled || serviceSchedules[service.name]) schedules++;
        });

        return {
            running,
            stopped,
            total: services.length,
            schedules
        };
    }, [services]);


    // Validate form (memoized)
    const isFormValid = useMemo(() => {
        return validateEditForm(editForm);
    }, [editForm]);

    const handleBack = useCallback(() => {
        navigate('/ecs');
    }, [navigate]);

    // START ALL SERVICES
    const handleStartAll = useCallback(async () => {
        if (!clusterName) return;

        setIsStartingAll(true);
        setError(null);
        setOperationResult(null);

        try {
            const response = await axiosClient.post(
                '/ecs/clusters/start-enabled',
                {},
                {
                    params: { clusterName }
                }
            );

            const summary = response.data?.summary;

            setOperationResult({
                type: 'start',
                ...summary
            });

            // Always re-fetch from backend (single source of truth)
            await fetchServicesForCluster(clusterArn);
        } catch (err) {
            console.error('Start all failed:', err);

            setError(
                err.response?.data?.error?.message ||
                'Failed to start services'
            );
        } finally {
            setIsStartingAll(false);
        }
    }, [clusterName, clusterArn, fetchServicesForCluster]);


    // STOP ALL SERVICES
    const handleStopAll = useCallback(async () => {
        if (!clusterName) return;

        setIsStoppingAll(true);
        setError(null);
        setOperationResult(null);

        try {
            const response = await axiosClient.post(
                '/ecs/clusters/stop',
                {},
                {
                    params: { clusterName }
                }
            );

            const summary = response.data?.summary;

            setOperationResult({
                type: 'stop',
                ...summary
            });

            // Re-fetch services
            await fetchServicesForCluster(clusterArn);
        } catch (err) {
            console.error('Stop all failed:', err);

            setError(
                err.response?.data?.error?.message ||
                'Failed to stop services'
            );
        } finally {
            setIsStoppingAll(false);
        }
    }, [clusterName, clusterArn, fetchServicesForCluster]);

    const handleAllAction = async (action) => {
        setIsProcessing(true);

        try {
            const url =
                action === 'START'
                    ? '/ecs/clusters/start-enabled'
                    : '/ecs/clusters/stop';

            // send clusterName as query param
            await axiosClient.post(url, {}, {
                params: { clusterName }
            });

            await fetchServicesForCluster();
        } catch (err) {
            alert(err.response?.data?.error?.message || 'Operation failed');
        } finally {
            setIsProcessing(false);
            closeBulkModal();
            closeConfirmModal();
        }
    };



    const handleSelectiveAction = async (action) => {
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('clusterName', clusterName);

        setIsProcessing(true);

        try {
            const url =
                action === 'START'
                    ? '/ecs/services/bulk-start'
                    : '/ecs/services/bulk-stop';

            await axiosClient.post(url, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            await fetchServicesForCluster();
        } catch (err) {
            alert(err.response?.data?.error?.message || 'Bulk operation failed');
        } finally {
            setIsProcessing(false);
            closeBulkModal();
            closeConfirmModal();
        }
    };


    const confirmAll = () => {
        setConfirmModal({
            open: true,
            message: `Are you sure you want to ${bulkAction.action.toLowerCase()} all services in cluster ${clusterName}?`,
            onConfirm: () => handleAllAction(bulkAction.action),
        });

        closeBulkModal();
    };


    const confirmSelective = () => {
        const actionLabel =
            bulkAction.action === 'START' ? 'start' : 'stop';

        setConfirmModal({
            open: true,
            message: `Are you sure you want to ${actionLabel} the selected services from the uploaded file?`,
            onConfirm: () => handleSelectiveAction(bulkAction.action)
        });
    };



    const handleStartAllWithConfirm = () => {
        setConfirmModal({
            open: true,
            message: `Are you sure you want to start ALL services in cluster "${clusterName}"?`,
            onConfirm: async () => {
                await handleStartAll();
                closeConfirmModal();
            }
        });
    };

    const handleStopAllWithConfirm = () => {
        setConfirmModal({
            open: true,
            message: `Are you sure you want to stop ALL services in cluster "${clusterName}"? Running tasks will be terminated.`,
            onConfirm: async () => {
                await handleStopAll();
                closeConfirmModal();
            }
        });
    };

    const handleServiceScheduleClick = useCallback((service) => {
        fetchServiceSchedules().then(() => {
            setScheduleTarget({
                resourceType: 'ecs',
                scope: 'service',
                identifiers: {
                    clusterName,
                    serviceName: service.name
                },
                label: `${service.name} Schedule`
            });
            setIsScheduleModalOpen(true);
        });
    }, [fetchServiceSchedules, clusterName]);

    const handleSchedule = useCallback(() => {
        setIsScheduleModalOpen(true);
    }, []);

    const handleCloseScheduleModal = useCallback(() => {
        setIsScheduleModalOpen(false);
    }, []);

    const handleRemoveSchedule = useCallback(async () => {
        if (!scheduleTarget) return;

        const { clusterName, serviceName } = scheduleTarget.identifiers;

        try {
            // ✅ Remove cluster schedule
            if (scheduleTarget.scope === "cluster") {
                await axiosClient.delete("/ecs/schedules/cluster", {
                    params: { clusterName },
                });

                // ✅ Clear frontend state immediately
                setScheduledRange(null);

                // ✅ Refetch cluster + service schedules
                await fetchScheduleForCluster();
                await fetchServiceSchedules();
            }

            // ✅ Remove service schedule
            else if (scheduleTarget.scope === "service") {
                await axiosClient.delete("/ecs/schedules/service", {
                    params: { clusterName, serviceName },
                });

                // ✅ Remove service schedule locally instantly
                setServiceSchedules((prev) => {
                    const updated = { ...prev };
                    delete updated[serviceName];
                    return updated;
                });

                // ✅ Refetch backend truth
                await fetchServiceSchedules();
            }

            // Close modal
            setIsScheduleModalOpen(false);
            setScheduleTarget(null);

        } catch (err) {
            console.error("Remove schedule failed:", err);
        }
    }, [
        scheduleTarget,
        fetchScheduleForCluster,
        fetchServiceSchedules,
    ]);

    const handleRemoveScheduleWithConfirm = () => {
        setIsScheduleModalOpen(false);

        setConfirmModal({
            open: true,
            message: "Are you sure you want to remove this schedule?",
            onConfirm: async () => {
                await handleRemoveSchedule();
                closeConfirmModal();
            }
        });
    };

    const handleConfirmSchedule = useCallback(
        async ({ from_date, to_date, from_time, to_time }) => {
            if (!scheduleTarget) return;

            const { clusterName, serviceName } = scheduleTarget.identifiers;

            try {
                if (scheduleTarget.scope === "cluster") {
                    await axiosClient.post(
                        "/ecs/schedules/cluster",
                        { from_date, to_date, from_time, to_time },
                        { params: { clusterName } }
                    );

                    // ✅ Backend is truth
                    await fetchScheduleForCluster();
                    await fetchServiceSchedules();
                }

                // ✅ Service Schedule Save
                else if (scheduleTarget.scope === "service") {
                    await axiosClient.post(
                        "/ecs/schedules/service",
                        { from_date, to_date, from_time, to_time },
                        { params: { clusterName, serviceName } }
                    );

                    // ✅ Backend is truth
                    await fetchServiceSchedules();
                }

                // Close modal
                setIsScheduleModalOpen(false);
                setScheduleTarget(null);

            } catch (err) {
                console.error("❌ Schedule save failed:", err);
            }
        },
        [
            scheduleTarget,
            fetchScheduleForCluster,
            fetchServiceSchedules,
        ]
    );


    const handleToggleChange = (serviceName) => {
        setServices(prev =>
            prev.map(service =>
                service.name === serviceName
                    ? { ...service, is_enabled: !service.is_enabled }
                    : service
            )
        );
    };

    const handleUpdateStatus = async () => {
        try {
            setIsProcessing(true);

            const payload = {
                clusterName,
                services: services.map(s => ({
                    serviceName: s.name,
                    is_enabled: s.is_enabled
                }))
            };

            const res = await axiosClient.post(
                "/ecs/services/update-status",
                payload
            );

            if (res.data.success) {
                setSuccessMessage("Service status updated successfully!");

                // Refresh services from backend to get real AWS state
                await fetchServicesForCluster();
            }

        } catch (err) {
            console.error("Update status failed:", err);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleUpdateStatusWithConfirm = () => {
        setConfirmModal({
            open: true,
            message: "Are you sure you want to apply these service status changes?",
            onConfirm: async () => {
                await handleUpdateStatus();
                closeConfirmModal();
            }
        });
    };



    const handleSyncClusterServices = async () => {
        try {
            setIsSyncing(true);

            await axiosClient.post(
                '/ecs/services/sync/cluster',
                {},
                {
                    params: { clusterName }
                }
            );

            // Refresh services after sync
            await fetchServicesForCluster();
            await fetchServiceSchedules();


        } catch (error) {
            console.error('Failed to sync services for cluster', error);
            setError(
                error.response?.data?.error?.message ||
                'Failed to sync services for this cluster'
            );
        } finally {
            setIsSyncing(false);
        }
    };

    const handleSyncWithConfirm = () => {
        setConfirmModal({
            open: true,
            message: `Are you sure you want to sync ALL services in cluster "${clusterName}"?`,
            onConfirm: async () => {
                await handleSyncClusterServices();
                closeConfirmModal();
            }
        });
    };

    const handleEditClick = async (service) => {
        if (!service) return;

        setSelectedService(service);

        setEditForm({
            min: service.min,
            desired: service.desired,
            max: service.max
        });

        try {
            // ✅ Use service.name directly
            const response = await axiosClient.get('/ecs/services/config-history', {
                params: { serviceName: service.name, clusterName }
            });

            if (response.data?.success && response.data.data?.history) {
                const lastThree = response.data.data.history
                    .slice(-3)
                    .reverse();

                setServiceHistory(lastThree);
            } else {
                setServiceHistory([]);
            }
        } catch (err) {
            console.error("Failed to fetch service history:", err);
            setServiceHistory([]);
        }

        setIsEditModalOpen(true);
    };



    const handleCloseEditModal = useCallback(() => {
        setIsEditModalOpen(false);
    }, []);

    const handleStartService = async (service) => {
        try {
            await axiosClient.post('/ecs/services/start', {}, {
                params: {
                    serviceName: service.name,
                    clusterName
                }
            });

            setServices(prev =>
                prev.map(s =>
                    s.name === service.name
                        ? {
                            ...s,
                            status: 'running',
                            isActive: true,
                            desired: Math.max(s.desired, s.min),
                            is_enabled: true
                        }
                        : s
                )
            );
        } catch (error) {
            console.error('Start service failed', error);
            alert(
                error.response?.data?.error?.message ||
                'Failed to start service'
            );
        }
    };


    const handleStopService = async (service) => {

        try {
            await axiosClient.post('/ecs/services/stop', {}, {
                params: {
                    serviceName: service.name,
                    clusterName
                }
            });

            setServices(prev =>
                prev.map(s =>
                    s.name === service.name
                        ? {
                            ...s,
                            status: 'stopped',
                            isActive: false,
                            desired: 0,
                            is_enabled: false
                        }
                        : s
                )
            );
        } catch (error) {
            console.error('Stop service failed', error);
            alert(
                error.response?.data?.error?.message ||
                'Failed to stop service'
            );
        }
    };


    const handleRestartService = async (service) => {

        try {
            await axiosClient.post('/ecs/services/restart', {}, {
                params: {
                    serviceName: service.name,
                    clusterName
                }
            });

            // Optimistic UI update — keep running
            setServices(prev =>
                prev.map(s =>
                    s.name === service.name
                        ? {
                            ...s,
                            status: 'running',
                            isActive: true,
                            is_enabled: true
                        }
                        : s
                )
            );

        } catch (error) {
            console.error('Restart service failed', error);
            alert(
                error.response?.data?.error?.message ||
                'Failed to restart service'
            );
        }
    };

    const handleStartServiceWithConfirm = (service) => {
        setSelectedService(service);
        setConfirmModal({
            open: true,
            message: `Are you sure you want to start ${service.name}?`,
            onConfirm: async () => {
                await handleStartService(service);
                closeConfirmModal();
            }
        });
    };


    const handleStopServiceWithConfirm = (service) => {
        setSelectedService(service);
        setConfirmModal({
            open: true,
            message: `Are you sure you want to stop ${service.name}? Running tasks will be terminated.`,
            onConfirm: async () => {
                await handleStopService(service);
                closeConfirmModal();
            }
        });
    };


    const handleRestartServiceWithConfirm = (service) => {
        setSelectedService(service);
        setConfirmModal({
            open: true,
            message: `Are you sure you want to restart ${service.name}? This may cause temporary downtime.`,
            onConfirm: async () => {
                await handleRestartService(service);
                closeConfirmModal();
            }
        });
    };

    const handleMinMaxSave = useCallback(async () => {
        if (!selectedService || !isFormValid) return;

        setError(null);

        try {
            const response = await axiosClient.put(
                '/ecs/services/min-max',
                {
                    min_value: Number(editForm.min),
                    max_value: Number(editForm.max)
                },
                {
                    params: {
                        serviceName: selectedService.name,
                        clusterName
                    }
                }
            );

            if (!response.data?.success) {
                throw new Error(response.data?.error?.message);
            }

            const updated = response.data.data;

            // ✅ Update min, max, desired, and status
            setServices(prev =>
                prev.map(service =>
                    service.name === selectedService.name
                        ? {
                            ...service,
                            min: updated.min_value,
                            max: updated.max_value,
                            desired: updated.desired_value,
                            status: updated.current_status,
                            isActive: updated.desired_value > 0
                        }
                        : service
                )
            );

            // ✅ Update the edit form to match latest backend values
            setEditForm({
                min: updated.min_value,
                max: updated.max_value,
                desired: updated.desired_value
            });

            setSuccessMessage('Minimum and Maximum values updated successfully');

        } catch (err) {
            setError(
                err.response?.data?.error?.message ||
                err.message ||
                'Failed to update min and max values'
            );
        }
    }, [selectedService, editForm, isFormValid, clusterName]);


    const handleDesiredSave = useCallback(async () => {
        if (!selectedService) return;

        setError(null);

        try {
            const response = await axiosClient.put(
                '/ecs/services/desired',
                {
                    desired_value: Number(editForm.desired)
                },
                {
                    params: {
                        serviceName: selectedService.name,
                        clusterName
                    }
                }
            );

            if (!response.data?.success) {
                throw new Error(response.data?.error?.message);
            }

            const updated = response.data.data;

            // Update desired + status only
            setServices(prev =>
                prev.map(service =>
                    service.name === selectedService.name
                        ? {
                            ...service,
                            desired: updated.desired_value,
                            status: updated.current_status,
                            isActive: updated.desired_value > 0
                        }
                        : service
                )
            );

            setSuccessMessage('Minimum and Maximum values updated successfully');

        } catch (err) {
            setError(
                err.response?.data?.error?.message ||
                err.message ||
                'Failed to update desired count'
            );
        }
    }, [selectedService, editForm, clusterName]);

    const handleMinMaxClick = () => {
        const isStopped = Number(editForm.desired) === 0;

        setConfirmModal({
            open: true,
            message: isStopped
                ? 'Updating the minimum or maximum value while the service is stopped will automatically start the service. Are you sure you want to proceed?'
                : 'Are you sure you want to change the minimum or maximum value for the selected service?',
            onConfirm: async () => {
                await handleMinMaxSave();
                closeConfirmModal();
            }
        });
    };


    const handleDesiredSaveWithConfirm = () => {
        if (Number(editForm.desired) === selectedService?.desired) {
            return;
        }

        setConfirmModal({
            open: true,
            message: 'Are you sure you want to change the desired value?',
            onConfirm: async () => {
                await handleDesiredSave();
                closeConfirmModal();
            }
        });
    };

    // Form update handlers (memoized)
    const handleMinChange = useCallback((value) => {
        if (value === "" || /^[0-9]+$/.test(value)) {
            setEditForm(prev => ({ ...prev, min: value }));
        }
    }, []);


    const handleDesiredChange = useCallback((value) => {
        if (value === "" || /^[0-9]+$/.test(value)) {
            setEditForm(prev => ({ ...prev, desired: value }));
        }
    }, []);


    const handleMaxChange = useCallback((value) => {
        if (value === "" || /^[0-9]+$/.test(value)) {
            setEditForm(prev => ({ ...prev, max: value }));
        }
    }, []);


    const handleMinIncrement = useCallback(() => {
        setEditForm(prev => {
            const num = parseInt(prev.min, 10) || 0;
            return { ...prev, min: String(num + 1) };
        });
    }, []);

    const handleMinDecrement = useCallback(() => {
        setEditForm(prev => {
            const num = parseInt(prev.min, 10) || 0;
            return { ...prev, min: String(Math.max(0, num - 1)) };
        });
    }, []);


    const handleDesiredIncrement = useCallback(() => {
        setEditForm(prev => {
            const num = parseInt(prev.desired, 10) || 0;
            return { ...prev, desired: String(num + 1) };
        });
    }, []);

    const handleDesiredDecrement = useCallback(() => {
        setEditForm(prev => {
            const num = parseInt(prev.desired, 10) || 0;
            return { ...prev, desired: String(Math.max(0, num - 1)) };
        });
    }, []);


    const handleMaxIncrement = useCallback(() => {
        setEditForm(prev => {
            const num = parseInt(prev.max, 10) || 0;
            return { ...prev, max: String(num + 1) };
        });
    }, []);

    const handleMaxDecrement = useCallback(() => {
        setEditForm(prev => {
            const num = parseInt(prev.max, 10) || 0;
            return { ...prev, max: String(Math.max(0, num - 1)) };
        });
    }, []);

    const columns = [
        { key: 'serviceName', label: 'Service Name', widthPercent: 25, minWidth: 220 },
        { key: 'min', label: 'Min', widthPercent: 8, minWidth: 80 },
        { key: 'desired', label: 'Desired', widthPercent: 8, minWidth: 80 },
        { key: 'max', label: 'Max', widthPercent: 8, minWidth: 80 },
        { key: 'currentStatus', label: 'Current Status', widthPercent: 15, minWidth: 140 },
        { key: 'desiredStatus', label: 'Enabled', widthPercent: 10, minWidth: 120 },
        { key: 'actions', label: 'Actions', widthPercent: 15, minWidth: 220 },
        { key: 'edit', label: 'Edit', widthPercent: 11, minWidth: 100 }
    ];

    if (isLoading) {
        return (
            <div className="ecs-services-container">
                <div className="loading-state">
                    <RefreshCw size={48} className="spinning" />
                    <p>Loading services for {clusterName}...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="ecs-services-container">
                <div className="error-state">
                    <AlertCircle size={48} className="error-icon" />
                    <h2>Failed to Load Services</h2>
                    <p>{error}</p>
                    <button onClick={fetchServicesForCluster} className="retry-btn">
                        <RefreshCw size={20} />
                        Retry
                    </button>
                    <button onClick={handleBack} className="back-btn">
                        <ChevronLeft size={20} />
                        Back to Clusters
                    </button>
                </div>
            </div>
        );
    }

    if (services.length === 0) {
        return (
            <div className="ecs-services-container">
                <div className="empty-state">
                    <Server size={80} className="empty-icon" />
                    <h2>No Services Found</h2>
                    <p>Cluster "{clusterName}" has no services configured.</p>
                    <button onClick={handleBack} className="back-btn">
                        <ChevronLeft size={20} />
                        Back to Clusters
                    </button>
                </div>
            </div>
        );
    }


    return (
        <div className="ecs-services-container">
            {successMessage && (
                <div className="success-alert">
                    <CheckCircle2 size={18} />
                    <span>{successMessage}</span>
                </div>
            )}

            {/* Operation Result Banner */}
            {operationResult && (
                <div className={`operation-result-banner ${operationResult.type}`}>
                    <div className="operation-result-content">
                        <CheckCircle2 size={20} />
                        <div className="operation-result-text">
                            <strong>
                                {operationResult.type === 'start' ? 'Start' : 'Stop'} Operation Completed
                            </strong>
                            <span>
                                {operationResult.type === 'start'
                                    ? `${operationResult.services_started} of ${operationResult.services_to_start} services started`
                                    : `${operationResult.services_stopped} of ${operationResult.services_to_stop} services stopped`
                                }
                                {operationResult.services_failed > 0 && ` • ${operationResult.services_failed} failed`}
                            </span>
                        </div>
                        <button onClick={() => setOperationResult(null)} className="close-banner-btn">
                            <X size={16} />
                        </button>
                    </div>
                </div>
            )}

            {/* Page Header */}
            <div className="page-header-modern">
                <div className="header-content">
                    <div className="header-left-section">
                        <div className="header-icon-modern">
                            <ECSIcon className="header-icon-svg" color="inherit" />
                        </div>
                        <div className="header-text-column">
                            <button onClick={handleBack} className="tiny-back-btn">
                                <ChevronLeft size={14} />
                                <span>Back to Clusters</span>
                            </button>
                            <div className="title-row-modern">
                                <h1 className="page-title-modern">{clusterName}</h1>

                            </div>
                            <div className="page-subtitle-modern">
                                Service Control • {services.length} {services.length === 1 ? 'Service' : 'Services'}
                                {scheduleData && (
                                    <span className={`exception-badge ${scheduleData.badgeClass}`}>
                                        <ExceptionTimer
                                            remaining={scheduleData.remainingDays}
                                            total={scheduleData.totalDays}
                                        />
                                        Active {scheduleData.remainingDays} {scheduleData.remainingDays === 1 ? 'Day' : 'Days'}
                                    </span>
                                )}

                            </div>
                        </div>
                    </div>
                    <div className="header-right-section">
                        {clusterComputeType === "ASG" && (
                            <button
                                className="btn-delta-updates"
                                onClick={() => navigate(`/ecs/asg/${clusterName}`)}
                            >
                                <div className="icon-wrapper">
                                    <Layers size={20} />
                                </div>
                                <span>ASG</span>
                            </button>
                        )}

                        <button
                            className="action-btn-modern btn-sync"
                            onClick={handleSyncWithConfirm}
                            disabled={isSyncing}
                        >
                            <RefreshCw size={16} />
                            {isSyncing ? 'Syncing…' : 'Sync Cluster'}
                        </button>

                        <button
                            className="action-btn-modern btn-schedule-action"
                            onClick={() => {
                                setScheduleTarget({
                                    resourceType: 'ecs',
                                    scope: 'cluster',
                                    identifiers: { clusterName },
                                    label: `${clusterName} Schedule`
                                });
                                setIsScheduleModalOpen(true);
                            }}
                        >
                            <Calendar size={20} />
                            <span>Schedule</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Quick Actions Panel - Premium RDS Replica */}
            <div className="svcs-action-panel">
                <div className="svcs-action-bg-glow"></div>
                <div className="svcs-action-info">
                    <div className="svcs-action-icon-wrapper">
                        <Activity size={24} />
                        <div className="svcs-icon-pulse"></div>
                    </div>
                    <div>
                        <p className="svcs-action-title">Quick Actions</p>
                        <p className="svcs-action-subtitle">Manage service states and cluster sync with real-time controls</p>
                    </div>
                </div>
                <div className="svcs-action-buttons">
                    <button
                        className="svcs-btn-stack svcs-start-all-btn"
                        onClick={() => setBulkAction({ open: true, action: 'START', mode: null })}
                        disabled={isStartingAll || isProcessing}
                    >
                        <div className="svcs-icon-wrapper">
                            <Play size={18} fill="currentColor" />
                        </div>
                        <span>Start All</span>
                    </button>

                    <button
                        className="svcs-btn-stack svcs-stop-all-btn"
                        onClick={() => setBulkAction({ open: true, action: 'STOP', mode: null })}
                        disabled={isStoppingAll || isProcessing}
                    >
                        <div className="svcs-icon-wrapper">
                            <StopCircle size={18} fill="currentColor" />
                        </div>
                        <span>Stop All</span>
                    </button>

                    <button
                        className="svcs-btn-stack svcs-update-btn"
                        onClick={handleUpdateStatusWithConfirm}
                        disabled={isProcessing}
                    >
                        <div className="svcs-icon-wrapper">
                            <RefreshCw size={18} className={isProcessing ? 'svcs-spinning' : ''} />
                        </div>
                        <span>Update Status</span>
                    </button>

                    <button
                        className="svcs-btn-stack svcs-revision-btn"
                        onClick={fetchInventoryDates}
                        disabled={isRevisionLoading}
                    >
                        <div className="svcs-icon-wrapper">
                            <RotateCcw size={18} className={isRevisionLoading ? 'svcs-spinning' : ''} />
                        </div>
                        <span>Revision</span>
                    </button>
                </div>
            </div>

            {/* Stats Grid - 4 Columns Premium */}
            <div className="svcs-stats-grid">
                <div className="svcs-stat-card">
                    <div className="svcs-stat-header">
                        <span className="svcs-stat-title">Running Services</span>
                        <div className="svcs-stat-icon-wrapper svcs-emerald">
                            <Zap size={22} />
                        </div>
                    </div>
                    <h3 className="svcs-stat-value svcs-emerald-text">{stats.running}</h3>
                    <div className="svcs-stat-shimmer"></div>
                </div>

                <div className="svcs-stat-card">
                    <div className="svcs-stat-header">
                        <span className="svcs-stat-title">Stopped Services</span>
                        <div className="svcs-stat-icon-wrapper svcs-rose">
                            <AlertCircle size={22} />
                        </div>
                    </div>
                    <h3 className="svcs-stat-value svcs-rose-text">{stats.stopped}</h3>
                    <div className="svcs-stat-shimmer"></div>
                </div>

                <div className="svcs-stat-card">
                    <div className="svcs-stat-header">
                        <span className="svcs-stat-title">Total Services</span>
                        <div className="svcs-stat-icon-wrapper svcs-blue">
                            <Server size={22} />
                        </div>
                    </div>
                    <h3 className="svcs-stat-value svcs-blue-text">{stats.total}</h3>
                    <div className="svcs-stat-shimmer"></div>
                </div>

                <div className="svcs-stat-card">
                    <div className="svcs-stat-header">
                        <span className="svcs-stat-title">Total Schedules</span>
                        <div className="svcs-stat-icon-wrapper svcs-purple">
                            <Calendar size={22} />
                        </div>
                    </div>
                    <h3 className="svcs-stat-value svcs-purple-text">{stats.schedules}</h3>
                    <div className="svcs-stat-shimmer"></div>
                </div>
            </div>

            {/* Search Bar */}
            <div className="search-bar-modern">
                <Search size={20} className="search-icon-modern" />
                <input
                    type="text"
                    placeholder="Search services..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="search-input-modern"
                />
                <span className="search-results-count">
                    {filteredServices.length} results
                </span>
            </div>

            {/* Services Table */}
            <div className="services-table-container">
                <ResizableTable
                    columns={columns}
                    data={filteredServices}
                    tableClassName="services-table"
                    renderCell={(key, service) => {
                        const schedule = serviceSchedules[service.name];
                        const serviceScheduleData = schedule
                            ? calculateScheduleData({ from: schedule.from, to: schedule.to })
                            : null;

                        const remainingDays = serviceScheduleData?.remainingDays;

                        switch (key) {
                            case 'serviceName':
                                return (
                                    <div className="service-name-content">
                                        <span className="service-name-text">{service.name}</span>

                                        {schedule?.is_active && serviceScheduleData && (
                                            <span className={`exception-badge ${serviceScheduleData.badgeClass}`}>
                                                <ExceptionTimer
                                                    remaining={serviceScheduleData.remainingDays}
                                                    total={serviceScheduleData.totalDays}
                                                />
                                                Active {serviceScheduleData.remainingDays}{' '}
                                                {serviceScheduleData.remainingDays === 1 ? 'Day' : 'Days'}
                                            </span>
                                        )}
                                    </div>
                                );

                            case 'min':
                                return <span className="task-count">{service.min}</span>;

                            case 'desired':
                                return <span className="task-count active">{service.desired}</span>;

                            case 'max':
                                return <span className="task-count">{service.max}</span>;

                            case 'currentStatus':
                                return (
                                    <div className={`status-badge ${service.status}`}>
                                        {service.status === 'running' ? (
                                            <>
                                                <CheckCircle2 size={14} />
                                                Running
                                            </>
                                        ) : (
                                            <>
                                                <XCircle size={14} />
                                                Stopped
                                            </>
                                        )}
                                    </div>
                                );


                            case 'desiredStatus':
                                return (
                                    <label className="switch">
                                        <input
                                            type="checkbox"
                                            checked={service.is_enabled}
                                            onChange={() => handleToggleChange(service.name)}
                                        />
                                        <span className="slider round"></span>
                                    </label>
                                );

                            case 'actions':
                                return (
                                    <div className="service-actions-group">
                                        <button
                                            className="service-action-btn btn-action-start"
                                            title="Start Service"
                                            disabled={service.status === 'running'}
                                            onClick={() => handleStartServiceWithConfirm(service)}
                                        >
                                            <Play size={14} fill="currentColor" />
                                        </button>

                                        <button
                                            className="service-action-btn btn-action-stop"
                                            title="Stop Service"
                                            disabled={service.status === 'stopped'}
                                            onClick={() => handleStopServiceWithConfirm(service)}
                                        >
                                            <Square size={14} fill="currentColor" />
                                        </button>

                                        <button
                                            className="service-action-btn btn-action-restart"
                                            title="Restart Service"
                                            disabled={service.status === 'stopped'}
                                            onClick={() => handleRestartServiceWithConfirm(service)}
                                        >
                                            <RefreshCw size={14} />
                                        </button>

                                        <button
                                            className="service-action-btn btn-action-update-schedule"
                                            title={clusterHasActiveSchedule ? "Schedule Service" : "Cluster schedule required"}
                                            disabled={!clusterHasActiveSchedule}
                                            onClick={() => {
                                                if (!clusterHasActiveSchedule) return;
                                                setScheduleTarget({
                                                    resourceType: 'ecs',
                                                    scope: 'service',
                                                    identifiers: { clusterName, serviceName: service.name },
                                                    label: `${service.name} Schedule`
                                                });
                                                setIsScheduleModalOpen(true);
                                            }}
                                        >
                                            <Calendar size={14} />
                                        </button>
                                    </div>
                                );

                            case 'edit':
                                return (
                                    <button
                                        className="edit-btn"
                                        onClick={() => handleEditClick(service)}
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                );

                            default:
                                return null;
                        }
                    }}
                />
            </div>

            {/* Edit Modal */}
            {isEditModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-minimal-content">
                        <div className="modal-minimal-header">
                            <span className="modal-sublabel">Configuration</span>
                            <h2 className="service-minimal-title">{selectedService?.name}</h2>
                            <button onClick={handleCloseEditModal} className="close-minimal-btn">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="modal-scroll-content">

                            <div className="modal-stepper-body">
                                {/* Minimum */}
                                <div className="stepper-row highlight-row margin-min-max">
                                    <div className="edit-min-max-container">
                                        <div className="stepper-label-group">
                                            <span className="step-label">Minimum</span>
                                            <span className="step-desc">Lowest scaling limit</span>
                                        </div>
                                        <div className="stepper-control">
                                            <button className="step-btn" onClick={handleMinDecrement}>
                                                <Minus size={18} />
                                            </button>
                                            <input
                                                type="number"
                                                className="step-input"
                                                value={editForm.min}
                                                onChange={(e) => handleMinChange(e.target.value)}
                                                onFocus={(e) => e.target.select()}
                                            />

                                            <button className="step-btn" onClick={handleMinIncrement}>
                                                <Plus size={18} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="edit-min-max-container">
                                        <div className="stepper-label-group">
                                            <span className="step-label">Maximum</span>
                                            <span className="step-desc">Highest scaling limit</span>
                                        </div>
                                        <div className="stepper-control">
                                            <button className="step-btn" onClick={handleMaxDecrement}>
                                                <Minus size={18} />
                                            </button>
                                            <input
                                                type="number"
                                                className="step-input"
                                                value={editForm.max}
                                                onChange={(e) => handleMaxChange(e.target.value)}
                                                onFocus={(e) => e.target.select()}
                                            />
                                            <button className="step-btn" onClick={handleMaxIncrement}>
                                                <Plus size={18} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="modal-minimal-footer">
                                        <button
                                            onClick={handleMinMaxClick}
                                            className={`btn-save-minimal ${!isFormValid ? 'disabled' : ''}`}
                                            disabled={!isFormValid}
                                        >
                                            <span>Save Changes</span>
                                            <ArrowRight size={18} />
                                        </button>

                                    </div>
                                    {/* Show error ONLY if min > max */}
                                    {editForm.min !== "" &&
                                        editForm.max !== "" &&
                                        Number(editForm.min) > Number(editForm.max) && (
                                            <div className="stepper-error-message">
                                                <AlertCircle size={16} />
                                                <span>Minimum must be less than or equal to Maximum.</span>
                                            </div>
                                        )}

                                </div>
                            </div>

                            {/* Desired */}
                            <div className="stepper-row highlight-row">
                                <div className="edit-min-max-container">
                                    <div className="stepper-label-group">
                                        <span className="step-label">Desired</span>
                                        <span className="step-desc">Target task count</span>
                                    </div>
                                    <div className="stepper-control">
                                        <button className="step-btn" onClick={handleDesiredDecrement}>
                                            <Minus size={18} />
                                        </button>
                                        <input
                                            type="number"
                                            className="step-input"
                                            value={editForm.desired}
                                            onChange={(e) => handleDesiredChange(e.target.value)}
                                            onFocus={(e) => e.target.select()}
                                        />

                                        <button className="step-btn" onClick={handleDesiredIncrement}>
                                            <Plus size={18} />
                                        </button>
                                    </div>
                                </div>
                                <div className="modal-minimal-footer">
                                    <button
                                        onClick={handleDesiredSaveWithConfirm}
                                        className="btn-save-minimal"
                                    >
                                        <span>Save Changes</span>
                                        <ArrowRight size={18} />
                                    </button>

                                </div>
                            </div>

                            {/* History Div */}
                            <div className="history-card">
                                <div className="history-header">
                                    Previous Updates
                                </div>

                                <div className="history-table-wrapper">
                                    <table className="history-table">
                                        <thead>
                                            <tr>
                                                <th>Min</th>
                                                <th>Desired</th>
                                                <th>Max</th>
                                                <th>Modified At</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {serviceHistory.map(item => (
                                                <tr key={item.id}>
                                                    <td>{item.min_value}</td>
                                                    <td>{item.desired_value}</td>
                                                    <td>{item.max_value}</td>
                                                    <td>{new Date(item.changed_at).toLocaleString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )
            }

            {/* Schedule Modal */}


            <ScheduleModal
                isOpen={isScheduleModalOpen}
                onClose={() => {
                    setIsScheduleModalOpen(false);
                    setScheduleTarget(null);
                }}
                target={scheduleTarget}
                initialRange={
                    scheduleTarget
                        ? scheduleTarget.scope === 'cluster'
                            ? scheduledRange || null  // <-- use fetched backend state
                            : serviceSchedules[scheduleTarget.identifiers?.serviceName] || null
                        : null
                }
                onConfirm={handleConfirmSchedule}
                onRemove={handleRemoveScheduleWithConfirm}
            />


            <BulkServiceActionModal
                open={bulkAction.open}
                action={bulkAction.action}
                mode={bulkAction.mode}
                setMode={(mode) =>
                    setBulkAction(prev => ({ ...prev, mode }))
                }
                file={file}
                setFile={setFile}
                loading={isProcessing}
                onConfirmAll={confirmAll}
                onConfirmSelective={confirmSelective}
                onClose={closeBulkModal}
            />

            <ConfirmActionModal
                isOpen={confirmModal.open}
                message={confirmModal.message}
                onConfirm={confirmModal.onConfirm}
                onCancel={closeConfirmModal}
            />

            {/* <RevisionCalendarModal
                isOpen={isRevisionModalOpen}
                availableDates={availableDates}
                onClose={() => setIsRevisionModalOpen(false)}
                onSubmit={(date) => {
                    applyRevisionForDate(date);
                }}
            /> */}



        </div >
    );
}

export default ECSServices;