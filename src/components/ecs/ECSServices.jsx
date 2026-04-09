import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
    RotateCcw,
    Settings,
    StopCircle,
    Cpu,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    Target,
    Clock
} from 'lucide-react';
import ScheduleModal from '../common/ScheduleModal';
import ServiceSelectionModal from './ServiceSelectionModal';
// import ConfirmationModal from '../common/ConfirmationModal';
import ExceptionTimer from './ExceptionTimer';
import '../../css/ecs/ECSServices.css';
import axiosClient from '../api/axiosClient';
import ConfirmActionModal from '../common/ConfirmActionModal';
import ECSIcon from '../common/ECSIcon';
import BulkServiceActionModal from './BulkServiceActionModal';
import 'react-resizable/css/styles.css'; // required CSS
import ResizableTable from '../common/ResizableTable';
import RevisionCalendarModal from './RevisionCalendarModal';

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
        vcpu: '4 vCPU',
        memory: '16 GB',
        running_tasks_count: 12,
        pending_tasks_count: 2,
        is_scheduled: true,
        is_enabled: true,
        current_status: 'running'
    },
    {
        service_arn: 'arn:aws:ecs:us-east-1:123456789012:service/api-gateway',
        service_name: 'api-gateway',
        cluster_arn: 'arn:aws:ecs:us-east-1:123456789012:cluster/production',
        cluster_name: 'production',
        min_value: 1,
        desired_value: 1,
        max_value: 2,
        vcpu: '2 vCPU',
        memory: '8 GB',
        running_tasks_count: 5,
        pending_tasks_count: 0,
        is_scheduled: false,
        is_enabled: true,
        current_status: 'running'
    },
    {
        service_arn: 'arn:aws:ecs:us-east-1:123456789012:service/worker-process',
        service_name: 'worker-process',
        cluster_arn: 'arn:aws:ecs:us-east-1:123456789012:cluster/production',
        cluster_name: 'production',
        min_value: 0,
        desired_value: 0,
        max_value: 5,
        vcpu: '8 vCPU',
        memory: '32 GB',
        running_tasks_count: 0,
        pending_tasks_count: 0,
        is_scheduled: true,
        is_enabled: false,
        current_status: 'stopped'
    },
    {
        service_arn: 'arn:aws:ecs:us-east-1:123456789012:service/payment-processor',
        service_name: 'payment-processor',
        cluster_arn: 'arn:aws:ecs:us-east-1:123456789012:cluster/production',
        cluster_name: 'production',
        min_value: 2,
        desired_value: 2,
        max_value: 4,
        vcpu: '2 vCPU',
        memory: '8 GB',
        running_tasks_count: 3,
        pending_tasks_count: 0,
        is_scheduled: true,
        is_enabled: true,
        current_status: 'running'
    },
    {
        service_name: 'notification-svc',
        cluster_name: 'production',
        min_value: 1,
        max_value: 3,
        vcpu: '1 vCPU',
        memory: '4 GB',
        running_tasks_count: 2,
        current_status: 'running'
    },
    {
        service_name: 'log-aggregator',
        cluster_name: 'production',
        min_value: 1,
        max_value: 5,
        vcpu: '2 vCPU',
        memory: '8 GB',
        running_tasks_count: 1,
        current_status: 'running'
    },
    {
        service_name: 'search-index-sync',
        cluster_name: 'production',
        min_value: 0,
        max_value: 2,
        vcpu: '4 vCPU',
        memory: '16 GB',
        running_tasks_count: 0,
        current_status: 'stopped'
    },
    {
        service_name: 'image-optimizer',
        cluster_name: 'production',
        min_value: 2,
        max_value: 10,
        vcpu: '4 vCPU',
        memory: '16 GB',
        running_tasks_count: 4,
        current_status: 'running'
    },
    {
        service_name: 'report-generator',
        cluster_name: 'production',
        min_value: 0,
        max_value: 1,
        vcpu: '2 vCPU',
        memory: '4 GB',
        running_tasks_count: 0,
        current_status: 'stopped'
    },
    {
        service_name: 'cache-warmer',
        cluster_name: 'production',
        min_value: 1,
        max_value: 1,
        vcpu: '1 vCPU',
        memory: '2 GB',
        running_tasks_count: 1,
        current_status: 'running'
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
    const [modalTab, setModalTab] = useState('configure');
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
    const [serviceRevisions, setServiceRevisions] = useState([]);
    const [fetchingRevisionId, setFetchingRevisionId] = useState(null);
    const [revisionDetails, setRevisionDetails] = useState({}); // Stores fetched archival dates
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
    const servicesTableRef = useRef(null);

    // Revision State
    const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);
    const [isServiceSelectionModalOpen, setIsServiceSelectionModalOpen] = useState(false);
    const [lastSyncedAt, setLastSyncedAt] = useState(null);
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

    const handleSelectionSubmit = async (selection) => {
        try {
            // selection is mapping of serviceName -> boolean
            const enabledServices = Object.keys(selection).filter(name => selection[name]);

            console.log(`Submitting schedule for ${enabledServices.length} services in cluster ${clusterName}`);

            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Finally close everything and reset
            setIsScheduleModalOpen(false);
            setIsServiceSelectionModalOpen(false);
            setScheduleTarget(null);

            // Reload EVERYTHING to reflect the new state
            await Promise.all([
                fetchServicesForCluster(),
                fetchServiceSchedules(),
                fetchScheduleForCluster()
            ]);

            setSuccessMessage(`Schedule applied successfully to ${enabledServices.length} services.`);

        } catch (err) {
            console.error('Bulk service schedule update failed:', err);
            setError('Failed to apply bulk selection. Please try again.');
        }
    };

    const fetchInventoryDates = async () => {
        try {
            setIsRevisionLoading(true);

            // Dummy dates for testing purposes
            const today = new Date();
            const formatDate = (d) => d.toISOString().split('T')[0];
            const dummyDates = [
                formatDate(today),
                formatDate(new Date(today.getTime() - 86400000)), // yesterday
                formatDate(new Date(today.getTime() - 172800000)), // 2 days ago
            ];

            try {
                const response = await axiosClient.get("/ecs/inventory/dates", {
                    params: { clusterName }
                });

                if (response.data?.success) {
                    setAvailableDates(response.data.data.available_dates || dummyDates);
                } else {
                    setAvailableDates(dummyDates);
                }
            } catch (err) {
                console.warn("Backend unavailable, using dummy dates.");
                setAvailableDates(dummyDates);
            }

            setIsRevisionModalOpen(true);

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
                servicesData.map((service, index) => ({
                    serviceArn: service.service_arn || service.serviceArn,
                    name: service.service_name || service.name,
                    clusterArn: service.cluster_arn || service.clusterArn,
                    clusterName: service.cluster_name || service.clusterName,
                    min: service.min_value !== undefined ? service.min_value : service.min,
                    desired: service.desired_value !== undefined ? service.desired_value : service.desired,
                    max: service.max_value !== undefined ? service.max_value : service.max,
                    vcpu: service.vcpu || (index === 0 ? '4 vCPU' : index === 1 ? '2 vCPU' : '8 vCPU'),
                    memory: service.memory || (index === 0 ? '16 GB' : index === 1 ? '8 GB' : '32 GB'),
                    runningTasks: service.running_tasks_count || (index === 0 ? 12 : index === 1 ? 5 : 0),
                    pendingTasks: service.pending_tasks_count || (index === 0 ? 2 : 0),
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
                servicesData.map((service, index) => ({
                    serviceArn: service.service_arn || service.serviceArn,
                    name: service.service_name || service.name,
                    clusterArn: service.cluster_arn || service.clusterArn,
                    clusterName: service.cluster_name || service.clusterName,
                    min: service.min_value !== undefined ? service.min_value : service.min,
                    desired: service.desired_value !== undefined ? service.desired_value : service.desired,
                    max: service.max_value !== undefined ? service.max_value : service.max,
                    vcpu: service.vcpu || (index === 0 ? '4 vCPU' : index === 1 ? '2 vCPU' : '8 vCPU'),
                    memory: service.memory || (index === 0 ? '16 GB' : index === 1 ? '8 GB' : '32 GB'),
                    runningTasks: service.running_tasks_count || (index === 0 ? 12 : index === 1 ? 5 : 0),
                    pendingTasks: service.pending_tasks_count || (index === 0 ? 2 : 0),
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
            totalRunningTasks: services.reduce((sum, s) => sum + (s.runningTasks || 0), 0),
            totalPendingTasks: services.reduce((sum, s) => sum + (s.pendingTasks || 0), 0),
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
                    /* COMMENTED OUT FOR MANUAL VERIFICATION OF SELECTION MODAL
                    await axiosClient.post(
                        "/ecs/schedules/cluster",
                        { from_date, to_date, from_time, to_time },
                        { params: { clusterName } }
                    );

                    // ✅ Backend is truth
                    await fetchScheduleForCluster();
                    await fetchServiceSchedules();
                    */
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

                // Close ScheduleModal and open selection modal for cluster scope
                if (scheduleTarget.scope === 'cluster') {
                    setIsScheduleModalOpen(false);
                    setIsServiceSelectionModalOpen(true);
                } else {
                    setIsScheduleModalOpen(false);
                    setScheduleTarget(null);
                }

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

        // Setup Mock Revisions
        const mockRevisions = Array.from({ length: 25 }, (_, i) => {
            const revNum = 45 - i;
            return {
                revision: revNum,
                family: service.name,
                image: `123456789012.dkr.ecr.us-east-1.amazonaws.com/${service.name}:v1.2.${revNum}`,
                registered_at: new Date(Date.now() - (i * 86400000 * 2)).toISOString(),
                is_current: i === 0
            };
        });
        setServiceRevisions(mockRevisions);

        setIsEditModalOpen(true);
    };



    const handleCloseEditModal = useCallback(() => {
        setIsEditModalOpen(false);
        setModalTab('configure');
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
        { key: 'serviceName', label: 'Service Name', widthPercent: 20, minWidth: 220 },
        { key: 'min', label: 'Min', widthPercent: 6, minWidth: 60 },
        { key: 'desired', label: 'Desired', widthPercent: 6, minWidth: 60 },
        { key: 'max', label: 'Max', widthPercent: 6, minWidth: 60 },
        { key: 'vcpu', label: 'vCPU', sortable: true, widthPercent: 8, minWidth: 100 },
        { key: 'memory', label: 'Memory', sortable: true, widthPercent: 8, minWidth: 100 },
        { key: 'runningTasks', label: 'Tasks', subLabel: 'PEND | HLT | RUN', sortable: true, widthPercent: 12, minWidth: 160 },
        { key: 'currentStatus', label: 'Current Status', widthPercent: 12, minWidth: 140 },
        { key: 'desiredStatus', label: 'Enabled', widthPercent: 8, minWidth: 120 },
        { key: 'actions', label: 'Actions', widthPercent: 12, minWidth: 200 },
        { key: 'edit', label: 'Edit', widthPercent: 8, minWidth: 80 }
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
                        <span className="svcs-stat-title">Running Tasks</span>
                        <div className="svcs-stat-icon-wrapper svcs-teal">
                            <Zap size={22} />
                        </div>
                    </div>
                    <h3 className="svcs-stat-value svcs-teal-text">{stats.totalRunningTasks}</h3>
                    <div className="svcs-stat-shimmer"></div>
                </div>

                <div className="svcs-stat-card">
                    <div className="svcs-stat-header">
                        <span className="svcs-stat-title">Pending Tasks</span>
                        <div className="svcs-stat-icon-wrapper svcs-cyan">
                            <Clock size={22} />
                        </div>
                    </div>
                    <h3 className="svcs-stat-value svcs-cyan-text">{stats.totalPendingTasks}</h3>
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
            <div className="svcs-table-container-premium">
                <div className="svcs-table-header-premium">
                    <div className="svcs-header-left">
                        <h3 className="svcs-header-title">Service Management</h3>
                        <p className="svcs-header-subtitle">
                            Manage automated schedules and service configurations
                        </p>
                    </div>
                    <button
                        className="svcs-table-settings-btn"
                        onClick={() => servicesTableRef.current?.openSettings()}
                        title="Column Settings"
                    >
                        <Settings size={18} />
                        <span>Settings</span>
                    </button>
                </div>

                <ResizableTable
                    ref={servicesTableRef}
                    columns={columns}
                    data={filteredServices}
                    tableClassName="services-table"
                    wrapperClassName="svcs-table-wrapper-premium"
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

                            case 'vcpu':
                                return (
                                    <div className="svcs-vcpu-count">
                                        <Cpu size={14} />
                                        <span>{service.vcpu}</span>
                                    </div>
                                );

                            case 'memory':
                                return (
                                    <div className="svcs-memory-count">
                                        <Zap size={14} />
                                        <span>{service.memory}</span>
                                    </div>
                                );

                            case 'runningTasks':
                                return (
                                    <div className="tasks-capsule">
                                        <div className="tasks-pending" title="Pending Tasks">
                                            {service.pendingTasks || 0}
                                        </div>
                                        <div className="tasks-divider"></div>
                                        <div className="tasks-healthy" title="Healthy Tasks">
                                            {service.healthyTasks || service.runningTasks}
                                        </div>
                                        <div className="tasks-divider"></div>
                                        <div className="tasks-running" title="Running Tasks">
                                            {service.runningTasks}
                                        </div>
                                    </div>
                                );

                            case 'currentStatus':
                                return (
                                    <div className={`status-badge ${service.status === 'running' ? 'running' : 'stopped'}`}>
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

                {filteredServices.length === 0 && (
                    <div className="empty-state-modern">
                        <Container size={80} className="empty-icon-modern" />
                        <h3>No services found</h3>
                        <p>Try adjusting your search query</p>
                    </div>
                )}
            </div>

            {/* Edit Modal - Compact Tabbed Design */}
            {isEditModalOpen && (
                <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && handleCloseEditModal()}>
                    <div className="em-shell">

                        {/* Ambient glow */}
                        <div className="em-glow" />

                        {/* Header */}
                        <div className="em-header">
                            <div className="em-service-info">
                                <div className="em-service-icon">
                                    <Server size={16} />
                                </div>
                                <div>
                                    <p className="em-service-label">Service Configuration</p>
                                    <p className="em-service-name">{selectedService?.name}</p>
                                </div>
                            </div>
                            <button onClick={handleCloseEditModal} className="em-close-btn">
                                <X size={18} />
                            </button>
                        </div>

                        {/* Tab Bar */}
                        <div className="em-tab-bar">
                            <button
                                className={`em-tab ${modalTab === 'configure' ? 'em-tab-active' : ''}`}
                                onClick={() => setModalTab('configure')}
                            >
                                <Settings size={13} />
                                Configure
                            </button>
                            <button
                                className={`em-tab ${modalTab === 'history' ? 'em-tab-active' : ''}`}
                                onClick={() => setModalTab('history')}
                            >
                                <RotateCcw size={13} />
                                History
                                {serviceHistory.length > 0 && (
                                    <span className="em-tab-badge">{serviceHistory.length}</span>
                                )}
                            </button>
                            <button
                                className={`em-tab ${modalTab === 'taskDef' ? 'em-tab-active' : ''}`}
                                onClick={() => setModalTab('taskDef')}
                            >
                                <Layers size={13} />
                                Task Definition
                            </button>
                            <div className={`em-tab-indicator em-tab-pos-${modalTab === 'configure' ? '1' : modalTab === 'history' ? '2' : '3'}`} />
                        </div>

                        {/* Tab Content */}
                        <div className="em-content">
                            {modalTab === 'configure' && (
                                <div className="em-configure-pane em-split">

                                    {/* ══ LEFT PANEL: Scaling Limits ══ */}
                                    <div className="em-panel em-panel-scaling">
                                        <div className="em-panel-header">
                                            <div className="em-section-dot em-dot-scaling" />
                                            <div>
                                                <span className="em-section-title">Scaling Limits</span>
                                                <span className="em-section-desc">Floor &amp; ceiling</span>
                                            </div>
                                        </div>

                                        <div className="em-panel-body">
                                            {/* Min */}
                                            <div className="em-vfield em-vfield-min">
                                                <span className="em-fb-label">Minimum</span>
                                                <div className="em-stepper em-stepper-scaling">
                                                    <button className="em-step-btn em-step-scaling" onClick={handleMinDecrement}><Minus size={12} /></button>
                                                    <input
                                                        type="number"
                                                        className="em-step-val em-panel-val"
                                                        value={editForm.min}
                                                        onChange={(e) => handleMinChange(e.target.value)}
                                                        onFocus={(e) => e.target.select()}
                                                    />
                                                    <button className="em-step-btn em-step-scaling" onClick={handleMinIncrement}><Plus size={12} /></button>
                                                </div>
                                                <span className="em-fb-hint">Floor</span>
                                            </div>

                                            {/* Range connector */}
                                            <div className="em-range-conn">
                                                <div className="em-rc-line" />
                                                <div className="em-rc-badge">
                                                    <ArrowUpDown size={11} strokeWidth={3} />
                                                </div>
                                                <div className="em-rc-line" />
                                            </div>

                                            {/* Max */}
                                            <div className="em-vfield em-vfield-max">
                                                <span className="em-fb-label">Maximum</span>
                                                <div className="em-stepper em-stepper-scaling">
                                                    <button className="em-step-btn em-step-scaling" onClick={handleMaxDecrement}><Minus size={12} /></button>
                                                    <input
                                                        type="number"
                                                        className="em-step-val em-panel-val"
                                                        value={editForm.max}
                                                        onChange={(e) => handleMaxChange(e.target.value)}
                                                        onFocus={(e) => e.target.select()}
                                                    />
                                                    <button className="em-step-btn em-step-scaling" onClick={handleMaxIncrement}><Plus size={12} /></button>
                                                </div>
                                                <span className="em-fb-hint">Ceiling</span>
                                            </div>
                                        </div>

                                        {/* Validation error */}
                                        {editForm.min !== "" && editForm.max !== "" && Number(editForm.min) > Number(editForm.max) && (
                                            <div className="em-error em-error-sm">
                                                <AlertCircle size={12} />
                                                <span>Min cannot exceed Max</span>
                                            </div>
                                        )}

                                        <button
                                            onClick={handleMinMaxClick}
                                            className={`em-panel-save em-panel-save-scaling ${!isFormValid ? 'em-disabled' : ''}`}
                                            disabled={!isFormValid}
                                        >
                                            Apply <ArrowRight size={13} />
                                        </button>
                                    </div>

                                    {/* ══ VERTICAL DIVIDER ══ */}
                                    <div className="em-vert-div">
                                        <div className="em-vd-rail" />
                                        <div className="em-vd-chip">or</div>
                                        <div className="em-vd-rail" />
                                    </div>

                                    {/* ══ RIGHT PANEL: Desired Count ══ */}
                                    <div className="em-panel em-panel-desired">
                                        <div className="em-panel-header">
                                            <div className="em-section-dot em-dot-desired" />
                                            <div>
                                                <span className="em-section-title">Desired Count</span>
                                                <span className="em-section-desc">Target tasks</span>
                                            </div>
                                        </div>

                                        <div className="em-panel-body">
                                            <div className="em-vfield em-vfield-desired">
                                                <span className="em-fb-label">Target Count</span>
                                                <div className="em-stepper em-stepper-desired">
                                                    <button className="em-step-btn em-step-tab-desired" onClick={handleDesiredDecrement}><Minus size={12} /></button>
                                                    <input
                                                        type="number"
                                                        className="em-step-val em-panel-val"
                                                        value={editForm.desired}
                                                        onChange={(e) => handleDesiredChange(e.target.value)}
                                                        onFocus={(e) => e.target.select()}
                                                    />
                                                    <button className="em-step-btn em-step-tab-desired" onClick={handleDesiredIncrement}><Plus size={12} /></button>
                                                </div>
                                                <span className="em-fb-hint">Tasks</span>
                                            </div>
                                        </div>

                                        <button
                                            onClick={handleDesiredSaveWithConfirm}
                                            className="em-panel-save em-panel-save-desired"
                                        >
                                            Apply <ArrowRight size={13} />
                                        </button>
                                    </div>

                                </div>
                            )}

                            {modalTab === 'history' && (
                                <div className="em-history-pane">
                                    {(serviceHistory.length === 0 ? [
                                        {
                                            id: 'mock-1',
                                            changed_at: new Date(Date.now() - 3600000).toISOString(),
                                            min_value: 2,
                                            desired_value: 4,
                                            max_value: 8
                                        },
                                        {
                                            id: 'mock-2',
                                            changed_at: new Date(Date.now() - 86400000).toISOString(),
                                            min_value: 1,
                                            desired_value: 2,
                                            max_value: 5
                                        },
                                        {
                                            id: 'mock-3',
                                            changed_at: new Date(Date.now() - 172800000).toISOString(),
                                            min_value: 1,
                                            desired_value: 1,
                                            max_value: 4
                                        }
                                    ] : serviceHistory).length === 0 ? (
                                        <div className="em-history-empty-wrap">
                                            <div className="em-history-empty">
                                                <RotateCcw size={36} className="em-empty-icon" />
                                                <p>No configuration history yet</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="em-timeline">
                                            {(serviceHistory.length === 0 ? [
                                                {
                                                    id: 'mock-1',
                                                    changed_at: new Date(Date.now() - 3600000).toISOString(),
                                                    min_value: 2,
                                                    desired_value: 4,
                                                    max_value: 8
                                                },
                                                {
                                                    id: 'mock-2',
                                                    changed_at: new Date(Date.now() - 86400000).toISOString(),
                                                    min_value: 1,
                                                    desired_value: 2,
                                                    max_value: 5
                                                },
                                                {
                                                    id: 'mock-3',
                                                    changed_at: new Date(Date.now() - 172800000).toISOString(),
                                                    min_value: 1,
                                                    desired_value: 1,
                                                    max_value: 4
                                                }
                                            ] : serviceHistory).map((item, idx, arr) => (
                                                <div key={item.id} className="em-timeline-item">
                                                    <div className="em-timeline-dot" />
                                                    {idx < arr.length - 1 && <div className="em-timeline-line" />}
                                                    <div className="em-timeline-card">
                                                        <div className="em-timeline-meta">
                                                            <span className="em-timeline-time">
                                                                {new Date(item.changed_at).toLocaleString('en-GB', {
                                                                    day: '2-digit', month: 'short', year: 'numeric',
                                                                    hour: '2-digit', minute: '2-digit'
                                                                })}
                                                            </span>
                                                            {idx === 0 && item.id !== 'mock-1' && (
                                                                <span className="em-timeline-latest">Latest</span>
                                                            )}
                                                            {item.id.toString().startsWith('mock') && (
                                                                <span className="em-timeline-preview">Preview</span>
                                                            )}
                                                        </div>
                                                        <div className="em-timeline-values">
                                                            <div className="em-tv-chip em-tv-min">
                                                                <div className="em-tv-head">
                                                                    <ArrowDown size={10} />
                                                                    <span className="em-tv-key">Min</span>
                                                                </div>
                                                                <span className="em-tv-val">{item.min_value}</span>
                                                            </div>
                                                            <div className="em-tv-chip em-tv-desired">
                                                                <div className="em-tv-head">
                                                                    <Target size={10} />
                                                                    <span className="em-tv-key">Desired</span>
                                                                </div>
                                                                <span className="em-tv-val">{item.desired_value}</span>
                                                            </div>
                                                            <div className="em-tv-chip em-tv-max">
                                                                <div className="em-tv-head">
                                                                    <ArrowUp size={10} />
                                                                    <span className="em-tv-key">Max</span>
                                                                </div>
                                                                <span className="em-tv-val">{item.max_value}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {modalTab === 'taskDef' && (
                                <div className="em-revision-pane">
                                    {/* CURRENT ACTIVE REVISION HERO */}
                                    <div className="em-rev-section">
                                        <div className="em-rev-section-label">Current Revision</div>
                                        {serviceRevisions.slice(0, 1).map(rev => (
                                            <div key={rev.revision} className="em-rev-hero">
                                                <div className="em-rev-hero-header">
                                                    <div className="em-rev-hero-title">
                                                        <span className="em-family">{rev.family}</span>
                                                        <span className="em-revision-num"> : {rev.revision}</span>
                                                    </div>
                                                    <span className="em-status-pill em-pill-active">Active</span>
                                                </div>
                                                <div className="em-rev-hero-body">
                                                    <div className="em-rev-stat">
                                                        <span className="em-rev-stat-label">Image</span>
                                                        <span className="em-rev-stat-value em-code">{rev.image}</span>
                                                    </div>
                                                    <div className="em-rev-stat">
                                                        <span className="em-rev-stat-label">Registered At</span>
                                                        <span className="em-rev-stat-value">
                                                            {new Date(rev.registered_at).toLocaleString()}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* RECENT REVISIONS (Next 5) */}
                                    <div className="em-rev-section">
                                        <div className="em-rev-section-label">Recent Revisions</div>
                                        <div className="em-rev-list">
                                            {serviceRevisions.slice(1, 6).map(rev => (
                                                <div key={rev.revision} className="em-rev-card">
                                                    <div className="em-rev-card-left">
                                                        <span className="em-rev-card-num">{rev.revision}</span>
                                                        <div className="em-rev-card-info">
                                                            <span className="em-rev-card-image">{rev.image.split(':').pop()}</span>
                                                            <span className="em-rev-card-date">
                                                                {new Date(rev.registered_at).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <button
                                                        className="em-rev-card-action"
                                                        onClick={() => {
                                                            setConfirmModal({
                                                                open: true,
                                                                message: `Deploy revision ${rev.revision} to ${rev.family}?`,
                                                                onConfirm: () => {
                                                                    setSuccessMessage(`Deployment initiated: ${rev.family}:${rev.revision}`);
                                                                    setIsEditModalOpen(false);
                                                                    closeConfirmModal();
                                                                }
                                                            });
                                                        }}
                                                    >
                                                        Deploy <ArrowRight size={12} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* ARCHIVE GRID (Older) */}
                                    <div className="em-rev-section">
                                        <div className="em-rev-section-label">Archived Revisions</div>
                                        <div className="em-rev-grid">
                                            {serviceRevisions.slice(6).map(rev => (
                                                <div key={rev.revision} className="em-rev-archive-item">
                                                    <span className="em-rev-archive-num">{rev.revision}</span>
                                                    {revisionDetails[rev.revision] ? (
                                                        <span className="em-rev-archive-date">{revisionDetails[rev.revision]}</span>
                                                    ) : (
                                                        <button
                                                            className="em-rev-archive-btn"
                                                            onClick={async () => {
                                                                // Simulated API fetch
                                                                setFetchingRevisionId(rev.revision);
                                                                await new Promise(r => setTimeout(r, 800));
                                                                setRevisionDetails(prev => ({
                                                                    ...prev,
                                                                    [rev.revision]: new Date(rev.registered_at).toLocaleDateString()
                                                                }));
                                                                setFetchingRevisionId(null);
                                                            }}
                                                        >
                                                            {fetchingRevisionId === rev.revision ? <RefreshCw size={10} className="spinning" /> : 'Check Date'}
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Schedule Modal */}


            <ScheduleModal
                isOpen={isScheduleModalOpen}
                onClose={() => setIsScheduleModalOpen(false)}
                target={scheduleTarget}
                initialRange={
                    scheduleTarget
                        ? clusterSchedules[clusterName]
                        : null
                }
                onConfirm={handleConfirmSchedule}
                onRemove={handleRemoveScheduleWithConfirm}
            />

            <ServiceSelectionModal
                isOpen={isServiceSelectionModalOpen}
                onClose={() => setIsServiceSelectionModalOpen(false)}
                clusterName={clusterName}
                services={services}
                onSubmit={handleSelectionSubmit}
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

            <RevisionCalendarModal
                isOpen={isRevisionModalOpen}
                availableDates={availableDates}
                onClose={() => setIsRevisionModalOpen(false)}
                onSubmit={(date) => {
                    applyRevisionForDate(date);
                }}
            />



        </div >
    );
}

export default ECSServices;