import React, { useState, useEffect } from 'react';
import { RefreshCw, Server, Activity, Database, Search, X, PlusCircle, MinusCircle, Clock, Trash2, Shield, Play, Square, Moon, Sun, Upload, Calendar, Ban, FileUp, RotateCw } from 'lucide-react';
import '../../css/ec2/ec2.css';
import axiosClient from '../api/axiosClient';

const DUMMY_INSTANCES = [
    {
        instance_id: 'i-0123456789abcdef0',
        instance_name: 'prod-web-server-01',
        instance_type: 't3.medium',
        state: 'running',
        availability_zone: 'us-east-1a',
        public_ip: '54.123.45.67',
        private_ip: '10.0.1.45',
        launch_time: new Date().toISOString()
    },
    {
        instance_id: 'i-0abcdef1234567890',
        instance_name: 'staging-api-server',
        instance_type: 't3.small',
        state: 'stopped',
        availability_zone: 'us-east-1b',
        public_ip: null,
        private_ip: '10.0.2.12',
        launch_time: new Date().toISOString()
    },
    {
        instance_id: 'i-0987654321fedcba0',
        instance_name: 'dev-db-instance',
        instance_type: 'r5.large',
        state: 'running',
        availability_zone: 'us-east-1c',
        public_ip: null,
        private_ip: '10.0.3.89',
        launch_time: new Date().toISOString()
    }
];

const DUMMY_STATS = [
    { state: 'running', count: 2 },
    { state: 'stopped', count: 1 },
    { state: 'pending', count: 0 },
    { state: 'stopping', count: 0 }
];

function EC2() {
    const [instances, setInstances] = useState([]);
    const [filteredInstances, setFilteredInstances] = useState([]);
    const [stats, setStats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [error, setError] = useState(null);
    const [lastUpdate, setLastUpdate] = useState(null);

    // Filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [stateFilter, setStateFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');

    // Change tracking states
    const [showChangesModal, setShowChangesModal] = useState(false);
    const [changesType, setChangesType] = useState('all');
    const [changes, setChanges] = useState([]);
    const [changeStats, setChangeStats] = useState({ added: 0, deleted: 0 });

    // Whitelist states
    const [showWhitelistModal, setShowWhitelistModal] = useState(false);
    const [whitelist, setWhitelist] = useState([]);
    const [scheduleLogs, setScheduleLogs] = useState([]);
    const [showScheduleLogsModal, setShowScheduleLogsModal] = useState(false);

    // Excel upload states
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploadedFile, setUploadedFile] = useState(null);
    const [parsedInstances, setParsedInstances] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [showOptionsModal, setShowOptionsModal] = useState(false);
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [scheduleDate, setScheduleDate] = useState('');
    const [scheduleTime, setScheduleTime] = useState('');
    const [customSchedules, setCustomSchedules] = useState([]);
    const [showCustomSchedulesModal, setShowCustomSchedulesModal] = useState(false);
    const [selectedInstanceForSchedule, setSelectedInstanceForSchedule] = useState(null);

    // Never-start states
    const [neverStartList, setNeverStartList] = useState([]);
    const [showNeverStartModal, setShowNeverStartModal] = useState(false);

    // Daily exception states
    const [dailyExceptions, setDailyExceptions] = useState([]);
    const [showDailyExceptionsModal, setShowDailyExceptionsModal] = useState(false);
    const [exceptionFile, setExceptionFile] = useState(null);
    const [uploadingException, setUploadingException] = useState(false);

    // Action menu state
    const [openActionMenu, setOpenActionMenu] = useState(null);

    const [actionLoading, setActionLoading] = useState({});

    const [selectedInstances, setSelectedInstances] = useState([]);


    // const [darkMode, setDarkMode] = useState(() => {
    //     const saved = localStorage.getItem('darkMode');
    //     return saved ? JSON.parse(saved) : false;
    // });

    const fetchInstances = async () => {
        try {
            setLoading(true);

            const response = await axiosClient.get('/ec2/instances');
            // axios automatically parses JSON
            const data = response.data;

            if (!data || data.length === 0) {
                console.log('⚠️ API returned no instances, falling back to dummy data');
                setInstances(DUMMY_INSTANCES);
            } else {
                setInstances(data);
            }

            setLastUpdate(new Date());
            setError(null);

        } catch (err) {
            console.error('Error fetching instances:', err);

            // Better error message handling
            // if (err.response?.status === 401) {
            //     setError('Unauthorized. Please log in again.');
            // } else {
            //     setError(err.response?.data?.message || 'Failed to fetch instances');
            // }
            console.log('⚠️ Falling back to dummy instances');
            setInstances(DUMMY_INSTANCES);
            setError(null);

        } finally {
            setLoading(false);
        }
    };


    const fetchStats = async () => {
        try {
            const response = await axiosClient.get('/ec2/stats');
            const data = response.data;
            if (!Array.isArray(data) || data.length === 0) {
                setStats(DUMMY_STATS);
            } else {
                setStats(data);
            }
        } catch (err) {
            console.error('Error fetching stats:', err);
            setStats(DUMMY_STATS);
        }
    };


    const fetchChangeStats = async () => {
        try {
            const response = await axiosClient.get('/ec2/stats/changes');
            const data = Array.isArray(response.data) ? response.data : [];

            const added = data.find(s => s.change_type === 'added')?.count || 0;
            const deleted = data.find(s => s.change_type === 'deleted')?.count || 0;

            setChangeStats({
                added: parseInt(added, 10),
                deleted: parseInt(deleted, 10)
            });
        } catch (err) {
            console.error('Error fetching change stats:', err);
        }
    };


    const fetchChanges = async (type = 'all') => {
        try {
            const params = { limit: 50 };
            if (type !== 'all') {
                params.type = type;
            }

            const response = await axiosClient.get('/ec2/changes', { params });
            const data = response.data;
            setChanges(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error fetching changes:', err);
            setChanges([]);
        }
    };


    const fetchWhitelist = async () => {
        try {
            const response = await axiosClient.get('/ec2/whitelist');
            const data = response.data;
            setWhitelist(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error fetching whitelist:', err);
            setWhitelist([]);
        }
    };


    const fetchScheduleLogs = async () => {
        try {
            const response = await axiosClient.get('/ec2/schedule/logs', {
                params: { limit: 50 }
            });
            const data = response.data;
            setScheduleLogs(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error fetching schedule logs:', err);
            setScheduleLogs([]);
        }
    };


    const fetchNeverStartList = async () => {
        try {
            const response = await axiosClient.get('/ec2/never-start');
            const data = response.data;
            setNeverStartList(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error fetching never-start list:', err);
            setNeverStartList([]);
        }
    };


    const fetchDailyExceptions = async () => {
        try {
            const response = await axiosClient.get('/ec2/daily-exceptions');
            const data = response.data;
            setDailyExceptions(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error fetching daily exceptions:', err);
            setDailyExceptions([]);
        }
    };

    const handleSync = async () => {
        try {
            setSyncing(true);
            setError(null);

            await axiosClient.post('/ec2/sync');

            await fetchInstances();
            await fetchStats();
        } catch (err) {
            setError(err?.response?.data?.message || 'Sync failed');
            console.error('Sync error:', err);
        } finally {
            setSyncing(false);
        }
    };


    const handleShowChanges = async (type) => {
        setChangesType(type);
        await fetchChanges(type);
        setShowChangesModal(true);
    };

    const handleClearHistory = async () => {
        if (!window.confirm(
            'Are you sure you want to clear all change history? This action cannot be undone.'
        )) {
            return;
        }

        try {
            await axiosClient.delete('/ec2/changes');

            setChanges([]);
            setChangeStats({ added: 0, deleted: 0 });
            alert('Change history cleared successfully');
            setShowChangesModal(false);
        } catch (err) {
            console.error('Error clearing history:', err);
            alert('Failed to clear history');
        }
    };


    const handleAddToWhitelist = async (instance) => {
        try {
            const response = await axiosClient.post('/ec2/whitelist', {
                instance_id: instance.instance_id,
                instance_name: instance.instance_name || 'Unnamed'
            });

            alert(response.data?.message || 'Instance added to whitelist');
            await fetchWhitelist();
        } catch (err) {
            console.error('Error adding to whitelist:', err);
            alert('Failed to add to whitelist');
        }
    };


    const handleRemoveFromWhitelist = async (instanceId) => {
        if (!window.confirm(
            'Remove this instance from 24/7 whitelist? It will be included in scheduled stop/start.'
        )) {
            return;
        }

        try {
            await axiosClient.delete(`/ec2/whitelist/${instanceId}`);

            alert('Instance removed from whitelist');
            await fetchWhitelist();
        } catch (err) {
            console.error('Error removing from whitelist:', err);
            alert('Failed to remove from whitelist');
        }
    };


    const handleManualStop = async () => {
        if (!window.confirm('Manually stop all non-whitelisted running instances?')) {
            return;
        }

        try {
            const response = await axiosClient.post('/ec2/schedule/stop');

            const result = response.data;
            alert(`Stopped ${result.stopped} instances. Failed: ${result.failed}`);

            await fetchInstances();
            await fetchScheduleLogs();
        } catch (err) {
            console.error('Error stopping instances:', err);
            alert('Failed to stop instances');
        }
    };


    const handleManualStart = async () => {
        if (!window.confirm('Manually start all stopped non-whitelisted instances?')) {
            return;
        }

        try {
            const response = await axiosClient.post('/ec2/schedule/start');

            const result = response.data;
            alert(`Started ${result.started} instances. Failed: ${result.failed}`);

            await fetchInstances();
            await fetchScheduleLogs();
        } catch (err) {
            console.error('Error starting instances:', err);
            alert('Failed to start instances');
        }
    };


    // Excel upload handlers
    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setUploadedFile(file);
        setUploading(true);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await axiosClient.post(
                '/ec2/upload-excel',
                formData,
                {
                    headers: {
                        // Let axios set the correct multipart/form-data headers
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );

            const result = response.data;

            if (!result.success) {
                alert(result.error || 'Failed to parse Excel file');
                setUploading(false);
                return;
            }

            setParsedInstances(result.instances);
            setUploading(false);
            setShowUploadModal(false);
            setShowOptionsModal(true);
        } catch (err) {
            console.error('Error uploading file:', err);
            alert(
                err.response?.data?.error ||
                'Failed to upload Excel file'
            );
            setUploading(false);
        }
    };



    const handleBulkWhitelist = async () => {
        const validInstances = parsedInstances.filter(i => i.exists);

        if (validInstances.length === 0) {
            alert('No valid instances to add');
            return;
        }

        try {
            const response = await axiosClient.post(
                '/ec2/whitelist/bulk',
                {
                    instance_ids: validInstances.map(i => i.instance_id)
                }
            );

            alert(response.data?.message || 'Instances added to whitelist');

            setShowOptionsModal(false);
            setParsedInstances([]);
            setUploadedFile(null);

            await fetchWhitelist();
        } catch (err) {
            console.error('Error adding to whitelist:', err);
            alert('Failed to add instances to whitelist');
        }
    };

    const handleBulkNeverStart = async () => {
        const validInstances = parsedInstances.filter(i => i.exists);

        if (validInstances.length === 0) {
            alert('No valid instances to add');
            return;
        }

        try {
            const response = await axiosClient.post(
                '/ec2/never-start/bulk',
                {
                    instance_ids: validInstances.map(i => i.instance_id)
                }
            );

            alert(response.data?.message || 'Instances added to never-start');

            setShowOptionsModal(false);
            setParsedInstances([]);
            setUploadedFile(null);

            await fetchNeverStartList();
        } catch (err) {
            console.error('Error adding to never-start:', err);
            alert('Failed to add instances to never-start');
        }
    };


    const handleCustomSchedule = () => {
        setShowOptionsModal(false);
        setShowScheduleModal(true);
    };

    const handleBulkDailyException = async () => {
        const validInstances = parsedInstances.filter(i => i.exists);

        if (validInstances.length === 0) {
            alert('No valid instances to add');
            return;
        }

        try {
            // Calculate expiry: 7 AM next day
            const now = new Date();
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(7, 0, 0, 0);

            let added = 0;
            let skipped = 0;

            for (const instance of validInstances) {
                try {
                    const response = await axiosClient.post(
                        '/ec2/daily-exceptions',
                        {
                            instance_id: instance.instance_id,
                            instance_name: instance.instance_name || 'Unnamed'
                        }
                    );

                    if (response.data?.success) {
                        added++;
                    } else {
                        skipped++;
                    }
                } catch (err) {
                    console.error(`Error adding ${instance.instance_id}:`, err);
                    skipped++;
                }
            }

            alert(
                `Added ${added} instance(s) to daily exceptions. ` +
                `${skipped > 0 ? `${skipped} were already in the list. ` : ''}` +
                `Expires at ${tomorrow.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST`
            );

            setShowOptionsModal(false);
            setParsedInstances([]);
            setUploadedFile(null);

            await fetchDailyExceptions();
        } catch (err) {
            console.error('Error adding to daily exceptions:', err);
            alert('Failed to add instances to daily exceptions');
        }
    };



    const handleCreateSchedule = async () => {
        if (!scheduleDate || !scheduleTime) {
            alert('Please select both date and time');
            return;
        }

        let instancesToSchedule;

        if (selectedInstanceForSchedule) {
            instancesToSchedule = [selectedInstanceForSchedule.instance_id];
        } else {
            const validInstances = parsedInstances.filter(i => i.exists);
            if (validInstances.length === 0) {
                alert('No valid instances to schedule');
                return;
            }
            instancesToSchedule = validInstances.map(i => i.instance_id);
        }

        const stopAt = `${scheduleDate}T${scheduleTime}:00`;

        try {
            const response = await axiosClient.post('/ec2/custom-schedules', {
                instance_ids: instancesToSchedule,
                stop_at: stopAt
            });

            alert(response.data.message);

            setShowScheduleModal(false);
            setParsedInstances([]);
            setUploadedFile(null);
            setSelectedInstanceForSchedule(null);
            setScheduleDate('');
            setScheduleTime('');

            await fetchCustomSchedules();
        } catch (err) {
            console.error('Error creating schedule:', err);
            alert(
                err.response?.data?.error ||
                err.message ||
                'Failed to create custom schedule'
            );
        }
    };


    const fetchCustomSchedules = async () => {
        try {
            const response = await axiosClient.get('/ec2/custom-schedules');
            const data = response.data;
            setCustomSchedules(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error fetching custom schedules:', err);
            setCustomSchedules([]);
        }
    };


    const handleCancelSchedule = async (scheduleId) => {
        if (!window.confirm('Cancel this custom schedule?')) return;

        try {
            await axiosClient.delete(`/ec2/custom-schedules/${scheduleId}`);
            alert('Schedule cancelled successfully');
            await fetchCustomSchedules();
        } catch (err) {
            console.error('Error cancelling schedule:', err);
            alert(
                err.response?.data?.error ||
                'Failed to cancel schedule'
            );
        }
    };


    const handleScheduleInstance = (instance) => {
        setSelectedInstanceForSchedule(instance);
        setShowScheduleModal(true);
    };

    const handleAddToNeverStart = async (instance) => {
        try {
            const response = await axiosClient.post('/ec2/never-start', {
                instance_id: instance.instance_id,
                instance_name: instance.instance_name || 'Unnamed'
            });

            alert(response.data.message);
            await fetchNeverStartList();
        } catch (err) {
            console.error('Error adding to never-start list:', err);
            alert(
                err.response?.data?.error ||
                'Failed to add to never-start list'
            );
        }
    };


    const handleRemoveFromNeverStart = async (instanceId) => {
        if (!window.confirm('Remove this instance from never-start list? It will be included in scheduled starts.')) {
            return;
        }

        try {
            await axiosClient.delete(`/ec2/never-start/${instanceId}`);
            alert('Instance removed from never-start list');
            await fetchNeverStartList();
        } catch (err) {
            console.error('Error removing from never-start list:', err);
            alert(
                err.response?.data?.error ||
                'Failed to remove from never-start list'
            );
        }
    };


    const handleExceptionFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setExceptionFile(file);
        setUploadingException(true);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await axiosClient.post(
                '/ec2/daily-exceptions/upload',
                formData
            );

            const result = response.data;

            if (!result.success) {
                alert(result.error || 'Failed to process Excel file');
                setUploadingException(false);
                return;
            }

            alert(result.message);
            setExceptionFile(null);
            setShowDailyExceptionsModal(false);
            await fetchDailyExceptions();
        } catch (err) {
            console.error('Error uploading exception file:', err);
            alert(
                err.response?.data?.error ||
                'Failed to upload Excel file'
            );
        } finally {
            setUploadingException(false);
        }
    };


    const handleAddToDailyException = async (instance) => {
        try {
            const response = await axiosClient.post('/ec2/daily-exceptions', {
                instance_id: instance.instance_id,
                instance_name: instance.instance_name || 'Unnamed'
            });

            alert(response.data.message);
            await fetchDailyExceptions();
        } catch (err) {
            console.error('Error adding to daily exceptions:', err);
            alert(
                err.response?.data?.error ||
                'Failed to add to daily exceptions'
            );
        }
    };


    const handleRemoveDailyException = async (exceptionId) => {
        if (!window.confirm('Remove this instance from daily exceptions?')) {
            return;
        }

        try {
            await axiosClient.delete(`/ec2/daily-exceptions/${exceptionId}`);
            alert('Exception removed successfully');
            await fetchDailyExceptions();
        } catch (err) {
            console.error('Error removing exception:', err);
            alert(
                err.response?.data?.error ||
                'Failed to remove exception'
            );
        }
    };

    // Instance action handlers

    const handleStartInstance = async (instanceId) => {
        if (!window.confirm(`Start instance ${instanceId}?`)) {
            return;
        }

        try {
            setActionLoading((prev) => ({
                ...prev,
                [instanceId]: "starting",
            }));

            // const response = await fetch(
            //     `ec2/instances/${instanceId}/start`,
            //     {
            //         method: "POST",
            //         headers: { "Content-Type": "application/json" },
            //     }
            // );

            const response = await axiosClient.post(`ec2/instances/${instanceId}/start`);
            const result = await response.data;

            if (!response.ok) {
                throw new Error(result.message || "Failed to start instance");
            }

            alert(result.message || "Instance is starting");

            await fetchInstances();
            await fetchStats();
        } catch (err) {
            console.error("Error starting instance:", err);
            alert(err.message || "Failed to start instance");
        } finally {
            setActionLoading((prev) => {
                const newState = { ...prev };
                delete newState[instanceId];
                return newState;
            });
        }
    };

    const handleStopInstance = async (instanceId) => {
        if (
            !window.confirm(
                `Stop instance ${instanceId}? This will shut down the instance.`
            )
        ) {
            return;
        }

        try {
            setActionLoading((prev) => ({
                ...prev,
                [instanceId]: "stopping",
            }));

            // const response = await fetch(
            //     `ec2/instances/${instanceId}/stop`,
            //     {
            //         method: "POST",
            //         headers: { "Content-Type": "application/json" },
            //     }
            // );
            const response = await axiosClient.post(`ec2/instances/${instanceId}/stop`);
            const result = await response.data;


            if (!response.ok) {
                throw new Error(result.message || "Failed to stop instance");
            }

            alert(result.message || "Instance is stopping");

            await fetchInstances();
            await fetchStats();
        } catch (err) {
            console.error("Error stopping instance:", err);
            alert(err.message || "Failed to stop instance");
        } finally {
            setActionLoading((prev) => {
                const newState = { ...prev };
                delete newState[instanceId];
                return newState;
            });
        }
    };

    const handleRebootInstance = async (instanceId) => {
        if (
            !window.confirm(
                `Reboot instance ${instanceId}? This will restart the instance.`
            )
        ) {
            return;
        }

        try {
            setActionLoading((prev) => ({
                ...prev,
                [instanceId]: "rebooting",
            }));

            // const response = await fetch(
            //     `ec2/instances/${instanceId}/reboot`,
            //     {
            //         method: "POST",
            //         headers: { "Content-Type": "application/json" },
            //     }
            // );

            const response = await axiosClient.post(`ec2/instances/${instanceId}/reboot`);
            const result = await response.data;

            if (!response.ok) {
                throw new Error(result.message || "Failed to reboot instance");
            }

            alert(result.message || "Instance is rebooting");

            await fetchInstances();
            await fetchStats();
        } catch (err) {
            console.error("Error rebooting instance:", err);
            alert(err.message || "Failed to reboot instance");
        } finally {
            setActionLoading((prev) => {
                const newState = { ...prev };
                delete newState[instanceId];
                return newState;
            });
        }
    };
    // Bulk selection handlers
    const handleSelectInstance = (instanceId) => {
        setSelectedInstances(prev => {
            if (prev.includes(instanceId)) {
                return prev.filter(id => id !== instanceId);
            } else {
                return [...prev, instanceId];
            }
        });
    };
    const handleSelectAll = () => {
        if (selectedInstances.length === filteredInstances.length) {
            setSelectedInstances([]);
        } else {
            setSelectedInstances(filteredInstances.map(inst => inst.instance_id));
        }
    };
    const handleBulkStart = async () => {
        if (selectedInstances.length === 0) return;
        if (!window.confirm(`Start ${selectedInstances.length} selected instance(s)?`)) {
            return;
        }
        try {
            // const response = await fetch(`${API_BASE_URL}/instances/bulk/start`, {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify({ instance_ids: selectedInstances })
            // });
            // const result = await response.json();
            // if (!response.ok) {
            //     throw new Error(result.message || 'Failed to start instances');
            // }
            //const response = await axiosClient.post(`ec2/instances/bulk/start`);
            //const result = await response.data;
            const response = await axiosClient.post(
                'ec2/instances/bulk/start',
                {
                    instance_ids: selectedInstances
                }
            );
            const result = await response.data;
            alert(result.message || `Started ${selectedInstances.length} instance(s)`);
            setSelectedInstances([]);
            await fetchInstances();
            await fetchStats();
        } catch (err) {
            console.error('Error bulk starting instances:', err);
            alert(err.message || 'Failed to start instances');
        }
    };
    const handleBulkStop = async () => {
        if (selectedInstances.length === 0) return;
        if (!window.confirm(`Stop ${selectedInstances.length} selected instance(s)? This will shut down the instances.`)) {
            return;
        }
        try {
            // const response = await fetch(`${API_BASE_URL}/instances/bulk/stop`, {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify({ instance_ids: selectedInstances })
            // });
            // const result = await response.json();
            // if (!response.ok) {
            //     throw new Error(result.message || 'Failed to stop instances');
            // }
            const response = await axiosClient.post(
                'ec2/instances/bulk/stop',
                {
                    instance_ids: selectedInstances
                }
            );
            const result = await response.data;
            alert(result.message || `Stopped ${selectedInstances.length} instance(s)`);
            setSelectedInstances([]);
            await fetchInstances();
            await fetchStats();
        } catch (err) {
            console.error('Error bulk stopping instances:', err);
            alert(err.message || 'Failed to stop instances');
        }
    };

    // Filter and search logic
    useEffect(() => {
        let filtered = [...instances];

        if (stateFilter !== 'all') {
            filtered = filtered.filter(instance => instance.state === stateFilter);
        }

        // Type filter
        if (typeFilter !== 'all') {
            filtered = filtered.filter(instance => {
                if (typeFilter === '247') return isWhitelisted(instance.instance_id);
                if (typeFilter === 'never-start') return isNeverStart(instance.instance_id);
                if (typeFilter === 'exception') return isDailyException(instance.instance_id);
                if (typeFilter === 'custom') return hasCustomSchedule(instance.instance_id);
                if (typeFilter === 'scheduled') return !isWhitelisted(instance.instance_id) && !isNeverStart(instance.instance_id) && !isDailyException(instance.instance_id) && !hasCustomSchedule(instance.instance_id);
                return true;
            });
        }

        if (searchTerm.trim() !== '') {
            const search = searchTerm.toLowerCase();
            filtered = filtered.filter(instance =>
                (instance.instance_name && instance.instance_name.toLowerCase().includes(search)) ||
                instance.instance_id.toLowerCase().includes(search) ||
                (instance.private_ip && instance.private_ip.toLowerCase().includes(search))
            );
        }

        setFilteredInstances(filtered);
    }, [instances, searchTerm, stateFilter, typeFilter, whitelist, neverStartList, dailyExceptions, customSchedules]);

    // Apply dark mode to body
    // useEffect(() => {
    //     if (darkMode) {
    //         document.body.classList.add('dark-mode');
    //     } else {
    //         document.body.classList.remove('dark-mode');
    //     }
    //     localStorage.setItem('darkMode', JSON.stringify(darkMode));
    // }, [darkMode]);

    // Close action menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (openActionMenu && !event.target.closest('.type-badge-menu-wrapper')) {
                setOpenActionMenu(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [openActionMenu]);

    useEffect(() => {
        fetchInstances();
        fetchStats();
        fetchChangeStats();
        fetchWhitelist();
        fetchCustomSchedules();
        fetchNeverStartList();
        fetchDailyExceptions();
        const interval = setInterval(() => {
            fetchInstances();
            fetchStats();
            fetchChangeStats();
            fetchWhitelist();
            fetchCustomSchedules();
            fetchNeverStartList();
            fetchDailyExceptions();
        }, 60000); // Auto-sync every 1 minute
        return () => clearInterval(interval);
    }, []);

    // Helper functions for custom schedules
    const hasCustomSchedule = (instanceId) => {
        return Array.isArray(customSchedules) && customSchedules.some(
            schedule => schedule.instance_id === instanceId && !schedule.executed && schedule.status === 'pending'
        );
    };

    const getInstanceSchedule = (instanceId) => {
        return Array.isArray(customSchedules) ? customSchedules.find(
            schedule => schedule.instance_id === instanceId && !schedule.executed && schedule.status === 'pending'
        ) : null;
    };

    const getStateColor = (state) => {
        const colors = {
            running: 'state-running',
            stopped: 'state-stopped',
            pending: 'state-pending',
            stopping: 'state-stopping',
            terminated: 'state-terminated'
        };
        return colors[state] || 'state-default';
    };

    const getStatCount = (state) => {
        if (!Array.isArray(stats)) return 0;
        const stat = stats.find(s => s.state === state);
        return stat ? parseInt(stat.count) : 0;
    };

    const clearFilters = () => {
        setSearchTerm('');
        setStateFilter('all');
        setTypeFilter('all');
    };

    const hasActiveFilters = searchTerm !== '' || stateFilter !== 'all' || typeFilter !== 'all';
    const isWhitelisted = (instanceId) => Array.isArray(whitelist) && whitelist.some(w => w.instance_id === instanceId);
    const isNeverStart = (instanceId) => Array.isArray(neverStartList) && neverStartList.some(n => n.instance_id === instanceId);
    const isDailyException = (instanceId) => Array.isArray(dailyExceptions) && dailyExceptions.some(d => d.instance_id === instanceId);

    if (loading && instances.length === 0) {
        return (
            <div className="loading-container">
                <div className="loading-content">
                    <div className="spinner"></div>
                    <p>Loading EC2 instances...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="app-container">
            <div className="content-wrapper">
                {/* Header */}
                <div className="header-card">
                    <div className="header-content">
                        <div className="header-left">
                            <Server className="header-icon" size={32} />
                            <div>
                                <h1 className="header-title">EC2 Instance Dashboard</h1>
                                {lastUpdate && (
                                    <p className="header-subtitle">
                                        Last updated: {lastUpdate.toLocaleTimeString()}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="header-actions">
                            {/* <button
                                onClick={() => setDarkMode(!darkMode)}
                                className="theme-toggle-btn"
                                title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                            >
                                {darkMode ? <Sun size={20} /> : <Moon size={20} />}
                            </button> */}


                            <button
                                onClick={() => handleShowChanges('added')}
                                className="changes-button new-instances"
                                title="View new instances"
                            >
                                <PlusCircle size={18} />
                                New
                                {changeStats.added > 0 && (
                                    <span className="badge badge-new">{changeStats.added}</span>
                                )}
                            </button>

                            <button
                                onClick={() => handleShowChanges('deleted')}
                                className="changes-button deleted-instances"
                                title="View deleted instances"
                            >
                                <MinusCircle size={18} />
                                Deleted
                                {changeStats.deleted > 0 && (
                                    <span className="badge badge-deleted">{changeStats.deleted}</span>
                                )}
                            </button>

                            <button
                                onClick={() => setShowUploadModal(true)}
                                className="ec2-upload-excel-btn"
                                title="Upload Excel File"
                            >
                                <Upload size={18} />
                                Upload Excel
                            </button>

                            <button
                                onClick={() => {
                                    fetchCustomSchedules();
                                    setShowCustomSchedulesModal(true);
                                }}
                                className="view-schedules-btn"
                                title="View Custom Schedules"
                            >
                                <Calendar size={18} />
                                Schedules ({customSchedules.length})

                            </button>



                            <button
                                onClick={handleSync}
                                disabled={syncing}
                                className={`sync-button ${syncing ? 'syncing' : ''}`}
                            >
                                <RefreshCw className={syncing ? 'spin' : ''} size={20} />
                                {syncing ? 'Syncing...' : 'Sync'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Schedule Control Panel */}
                <div className="schedule-panel">
                    <div className="schedule-info">
                        <div className="schedule-icon-wrapper">
                            <Clock size={24} />
                        </div>
                        <div>
                            <p className="schedule-title">Automated Schedule (IST)</p>
                            <p className="schedule-subtitle">Start: 7:00 AM • Stop: 9:30 PM • Excludes 24/7 instances</p>
                        </div>
                    </div>
                    <div className="schedule-actions">
                        <button onClick={handleManualStart} className="ec2-btn-premium ec2-manualstart-btn">
                            <div className="icon-wrapper">
                                <Play size={16} />
                            </div>
                            <span>Manual Start</span>
                        </button>
                        <button onClick={handleManualStop} className="ec2-btn-premium ec2stop-btn">
                            <div className="icon-wrapper">
                                <Square size={16} />
                            </div>
                            <span>Manual Stop</span>
                        </button>
                        <button onClick={() => { fetchScheduleLogs(); setShowScheduleLogsModal(true); }} className="ec2-btn-premium ec2logs-btn">
                            <div className="icon-wrapper">
                                <Clock size={16} />
                            </div>
                            <span>View Logs</span>
                        </button>
                    </div>
                </div>

                {/* Statistics Cards */}
                <div className="ec2-stats-grid">
                    <div className="ec2-stat-card">
                        <div className="ec2-stat-content">
                            <div>
                                <p className="ec2-stat-label">Total Instances</p>
                                <p className="ec2-stat-value">{instances.length}</p>
                            </div>
                            <Database className="ec2-stat-icon" size={48} />
                        </div>
                    </div>

                    <div className={`ec2-stat-card ec2-clickable-card ${stateFilter === 'running' ? 'active-filter' : ''}`} onClick={() => setStateFilter(stateFilter === 'running' ? 'all' : 'running')}>
                        <div className="ec2-stat-content">
                            <div>
                                <p className="ec2-stat-label">Running</p>
                                <p className="ec2-stat-value ec2-stat-running">{getStatCount('running')}</p>
                            </div>
                            <Activity className="ec2-stat-icon ec2-stat-icon-running" size={48} />
                        </div>
                    </div>

                    <div className={`ec2-stat-card ec2-clickable-card ${stateFilter === 'stopped' ? 'active-filter' : ''}`} onClick={() => setStateFilter(stateFilter === 'stopped' ? 'all' : 'stopped')}>
                        <div className="ec2-stat-content">
                            <div>
                                <p className="ec2-stat-label">Stopped</p>
                                <p className="ec2-stat-value ec2-stat-stopped">{getStatCount('stopped')}</p>
                            </div>
                            <Activity className="ec2-stat-icon ec2-stat-icon-stopped" size={48} />
                        </div>
                    </div>

                    <div className={`ec2-stat-card ec2-stat-247 ec2-clickable-card ${typeFilter === '247' ? 'active-filter' : ''}`} onClick={() => setTypeFilter(typeFilter === '247' ? 'all' : '247')}>
                        <div className="ec2-stat-content">
                            <div>
                                <p className="ec2-stat-label">24/7 Protected</p>
                                <p className="ec2-stat-value" style={{ color: '#8b5cf6' }}>{whitelist.length}</p>
                            </div>
                            <Shield className="ec2-stat-icon" size={48} style={{ color: '#8b5cf6' }} />
                        </div>
                    </div>

                    <div className={`ec2-stat-card ec2-stat-never-start ec2-clickable-card ${typeFilter === 'never-start' ? 'active-filter' : ''}`} onClick={() => setTypeFilter(typeFilter === 'never-start' ? 'all' : 'never-start')}>
                        <div className="ec2-stat-content">
                            <div>
                                <p className="ec2-stat-label">Never-Start</p>
                                <p className="ec2-stat-value" style={{ color: '#ef4444' }}>{neverStartList.length}</p>
                            </div>
                            <Ban className="ec2-stat-icon" size={48} style={{ color: '#ef4444' }} />
                        </div>
                    </div>

                    <div className={`ec2-stat-card ec2-stat-exception ec2-clickable-card ${typeFilter === 'exception' ? 'active-filter' : ''}`} onClick={() => setTypeFilter(typeFilter === 'exception' ? 'all' : 'exception')}>
                        <div className="ec2-stat-content">
                            <div>
                                <p className="ec2-stat-label">Daily Exceptions</p>
                                <p className="ec2-stat-value" style={{ color: '#f59e0b' }}>{dailyExceptions.length}</p>
                            </div>
                            <FileUp className="ec2-stat-icon" size={48} style={{ color: '#f59e0b' }} />
                        </div>
                    </div>
                </div>

                {/* Search and Filter Section */}
                <div className="filter-section">
                    <div className="search-container">
                        <Search className="search-icon" size={20} />
                        <input
                            type="text"
                            placeholder="Search by name, instance ID, or IP address..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="search-input"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="clear-search"
                                title="Clear search"
                            >
                                <X size={18} />
                            </button>
                        )}
                    </div>

                    <div className="filter-container">
                        <label className="filter-label">Filter by State:</label>
                        <select
                            value={stateFilter}
                            onChange={(e) => setStateFilter(e.target.value)}
                            className="filter-select"
                        >
                            <option value="all">All States</option>
                            <option value="running">Running</option>
                            <option value="stopped">Stopped</option>
                            <option value="pending">Pending</option>
                            <option value="stopping">Stopping</option>
                        </select>
                    </div>

                    {hasActiveFilters && (
                        <button onClick={clearFilters} className="clear-filters-btn">
                            <X size={16} />
                            Clear Filters
                        </button>
                    )}
                </div>

                {/* Active Filters Display */}
                {hasActiveFilters && (
                    <div className="active-filters">
                        <span className="filter-label-text">Active filters:</span>
                        {searchTerm && (
                            <span className="filter-badge">
                                Search: "{searchTerm}"
                                <button onClick={() => setSearchTerm('')} className="filter-badge-close">
                                    <X size={14} />
                                </button>
                            </span>
                        )}
                        {stateFilter !== 'all' && (
                            <span className="filter-badge">
                                State: {stateFilter}
                                <button onClick={() => setStateFilter('all')} className="filter-badge-close">
                                    <X size={14} />
                                </button>
                            </span>
                        )}
                        {typeFilter !== 'all' && (
                            <span className="filter-badge">
                                Type: {typeFilter === '247' ? '24/7 Protected' :
                                    typeFilter === 'never-start' ? 'Never-Start' :
                                        typeFilter === 'exception' ? 'Daily Exception' :
                                            typeFilter === 'custom' ? 'Custom Schedule' :
                                                'Scheduled'}
                                <button onClick={() => setTypeFilter('all')} className="filter-badge-close">
                                    <X size={14} />
                                </button>
                            </span>
                        )}
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <div className="error-card">
                        <p className="error-title">⚠️ Error: {error}</p>
                        <p className="error-text">Please check your backend server and try again.</p>
                    </div>
                )}

                {/* Bulk Actions */}
                {selectedInstances.length > 0 && (
                    <div className="bulk-actions-bar">
                        <div className="bulk-selection-info">
                            <span className="selection-count">
                                {selectedInstances.length} instance{selectedInstances.length !== 1 ? 's' : ''} selected
                            </span>
                            <button
                                onClick={() => setSelectedInstances([])}
                                className="clear-selection-btn"
                                title="Clear selection"
                            >
                                <X size={16} />
                                Clear Selection
                            </button>
                        </div>
                        <div className="bulk-action-buttons">
                            <button
                                onClick={handleBulkStart}
                                className="bulk-action-btn bulk-start-btn"
                                title="Start selected instances"
                            >
                                <Play size={16} />
                                Start Selected
                            </button>
                            <button
                                onClick={handleBulkStop}
                                className="bulk-action-btn bulk-stop-btn"
                                title="Stop selected instances"
                            >
                                <Square size={16} />
                                Stop Selected
                            </button>
                        </div>
                    </div>
                )}
                {/* Instances Table */}
                <div className="table-card">
                    <div className="table-wrapper">
                        <table className="instances-table">
                            <thead>
                                <tr>
                                    <th className="checkbox-column">
                                        <input
                                            type="checkbox"
                                            checked={selectedInstances.length === filteredInstances.length && filteredInstances.length > 0}
                                            onChange={handleSelectAll}
                                            className="instance-checkbox"
                                            title="Select all"
                                        />
                                    </th>
                                    <th>Name</th>
                                    <th>Instance ID</th>
                                    <th>State</th>
                                    <th>Availability Zone</th>
                                    <th>Private IP</th>
                                    <th>Type</th>
                                    <th>Schedule</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredInstances.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="empty-state">
                                            <Server className="empty-icon" size={64} />
                                            {hasActiveFilters ? (
                                                <>
                                                    <p className="empty-title">No instances match your filters</p>
                                                    <p className="empty-text">Try adjusting your search or filter criteria</p>
                                                    <button onClick={clearFilters} className="clear-filters-inline-btn">
                                                        Clear All Filters
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <p className="empty-title">No instances found</p>
                                                    <p className="empty-text">Click "Sync" to fetch instances from AWS</p>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ) : (
                                    filteredInstances.map((instance) => (
                                        <tr key={instance.instance_id}>
                                            <td className="checkbox-column">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedInstances.includes(instance.instance_id)}
                                                    onChange={() => handleSelectInstance(instance.instance_id)}
                                                    className="instance-checkbox"
                                                    title="Select instance"
                                                />
                                            </td>
                                            <td className="instance-name">
                                                {instance.instance_name || <span className="no-data">Unnamed</span>}
                                            </td>
                                            <td className="instance-id">{instance.instance_id}</td>
                                            <td>
                                                <span className={`state-badge ${getStateColor(instance.state)}`}>
                                                    {(instance.state || 'unknown').toUpperCase()}
                                                </span>
                                            </td>
                                            <td>{instance.availability_zone}</td>
                                            <td className="ip-address">
                                                {instance.private_ip || <span className="no-data">—</span>}
                                            </td>
                                            <td>
                                                <div className="type-badge-wrapper">
                                                    {isWhitelisted(instance.instance_id) ? (
                                                        <span
                                                            className="type-badge type-247 clickable"
                                                            title="Click to remove from 24/7"
                                                            onClick={() => handleRemoveFromWhitelist(instance.instance_id)}
                                                        >
                                                            <Shield size={14} /> 24/7
                                                        </span>
                                                    ) : isNeverStart(instance.instance_id) ? (
                                                        <span
                                                            className="type-badge type-never-start clickable"
                                                            title="Click to remove from Never-Start"
                                                            onClick={() => handleRemoveFromNeverStart(instance.instance_id)}
                                                        >
                                                            <Ban size={14} /> Never-Start
                                                        </span>
                                                    ) : isDailyException(instance.instance_id) ? (
                                                        <span
                                                            className="type-badge type-exception clickable"
                                                            title="Click to remove from Daily Exceptions"
                                                            onClick={() => {
                                                                const exception = dailyExceptions.find(e => e.instance_id === instance.instance_id);
                                                                if (exception) handleRemoveDailyException(exception.id);
                                                            }}
                                                        >
                                                            <FileUp size={14} /> Exception
                                                        </span>
                                                    ) : hasCustomSchedule(instance.instance_id) ? (
                                                        <span className="type-badge type-custom" title="Custom Schedule">
                                                            <Clock size={14} /> Custom
                                                        </span>
                                                    ) : (
                                                        <div className="type-badge-menu-wrapper">
                                                            {openActionMenu === instance.instance_id ? (
                                                                <div className="in-place-actions">
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleAddToWhitelist(instance);
                                                                            setOpenActionMenu(null);
                                                                        }}
                                                                        className="icon-action-btn icon-247"
                                                                        title="Add to 24/7 Protected"
                                                                        style={{ width: '28px', height: '28px' }}
                                                                    >
                                                                        <Shield size={14} />
                                                                    </button>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleAddToNeverStart(instance);
                                                                            setOpenActionMenu(null);
                                                                        }}
                                                                        className="icon-action-btn icon-never-start"
                                                                        title="Add to Never-Start"
                                                                        style={{ width: '28px', height: '28px' }}
                                                                    >
                                                                        <Ban size={14} />
                                                                    </button>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleAddToDailyException(instance);
                                                                            setOpenActionMenu(null);
                                                                        }}
                                                                        className="icon-action-btn icon-exception"
                                                                        title="Add to Daily Exceptions"
                                                                        style={{ width: '28px', height: '28px' }}
                                                                    >
                                                                        <FileUp size={14} />
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <span
                                                                    className="type-badge type-scheduled clickable"
                                                                    title="Click to set type"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setOpenActionMenu(instance.instance_id);
                                                                    }}
                                                                >
                                                                    Scheduled
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                <button
                                                    onClick={() => handleScheduleInstance(instance)}
                                                    disabled={hasCustomSchedule(instance.instance_id)}
                                                    className={`action-btn schedule-instance-btn ${hasCustomSchedule(instance.instance_id) ? 'disabled' : ''}`}
                                                    title={
                                                        hasCustomSchedule(instance.instance_id)
                                                            ? `Scheduled: ${new Date(getInstanceSchedule(instance.instance_id)?.stop_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST`
                                                            : 'Schedule Stop'
                                                    }
                                                >
                                                    <Calendar size={16} />
                                                    {hasCustomSchedule(instance.instance_id) ? 'Scheduled' : 'Schedule'}
                                                </button>
                                            </td>
                                            <td>
                                                {actionLoading[instance.instance_id] ? (
                                                    <div className="action-loading">
                                                        <RefreshCw size={16} className="spinner" />
                                                    </div>
                                                ) : (
                                                    <div className="instance-actions">
                                                        {instance.state === "stopped" ? (
                                                            <>
                                                                <button
                                                                    onClick={() =>
                                                                        handleStartInstance(instance.instance_id)
                                                                    }
                                                                    className="icon-action-btn icon-action-start"
                                                                    title="Start"
                                                                >
                                                                    <Play size={16} />
                                                                </button>

                                                                <button
                                                                    disabled
                                                                    className="icon-action-btn icon-action-disabled"
                                                                    title="Stop (instance is stopped)"
                                                                >
                                                                    <Square size={16} />
                                                                </button>
                                                            </>
                                                        ) : instance.state === "running" ? (
                                                            <>
                                                                <button
                                                                    onClick={() =>
                                                                        handleStopInstance(instance.instance_id)
                                                                    }
                                                                    className="icon-action-btn icon-action-stop"
                                                                    title="Stop"
                                                                >
                                                                    <Square size={16} />
                                                                </button>

                                                                <button
                                                                    onClick={() =>
                                                                        handleRebootInstance(instance.instance_id)
                                                                    }
                                                                    className="icon-action-btn icon-action-reboot"
                                                                    title="Reboot"
                                                                >
                                                                    <RotateCw size={16} />
                                                                </button>
                                                            </>
                                                        ) : instance.state === "pending" ? (
                                                            <>
                                                                <button
                                                                    disabled
                                                                    className="icon-action-btn icon-action-pending"
                                                                    title="Starting..."
                                                                >
                                                                    <RefreshCw size={16} />
                                                                </button>

                                                                <button
                                                                    disabled
                                                                    className="icon-action-btn icon-action-disabled"
                                                                    title="Stop (instance is starting)"
                                                                >
                                                                    <Square size={16} />
                                                                </button>
                                                            </>
                                                        ) : instance.state === "stopping" ? (
                                                            <>
                                                                <button
                                                                    disabled
                                                                    className="icon-action-btn icon-action-stopping"
                                                                    title="Stopping..."
                                                                >
                                                                    <RefreshCw size={16} />
                                                                </button>

                                                                <button
                                                                    disabled
                                                                    className="icon-action-btn icon-action-disabled"
                                                                    title="Reboot (instance is stopping)"
                                                                >
                                                                    <RotateCw size={16} />
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <button
                                                                    disabled
                                                                    className="icon-action-btn icon-action-disabled"
                                                                    title={`Instance is ${instance.state}`}
                                                                >
                                                                    <Activity size={16} />
                                                                </button>

                                                                <button
                                                                    disabled
                                                                    className="icon-action-btn icon-action-disabled"
                                                                    title={`Instance is ${instance.state}`}
                                                                >
                                                                    <Activity size={16} />
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </td>

                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Footer */}
                <div className="footer">
                    <p>
                        Showing {filteredInstances.length} of {instances.length} instance{instances.length !== 1 ? 's' : ''}
                        {hasActiveFilters && ' (filtered)'}
                    </p>
                    <p>Auto-refresh every 1 minute • Automated schedule: 7AM-9:30PM IST</p>
                </div>

                {/* Whitelist Modal */}
                {showWhitelistModal && (
                    <div className="modal-overlay" onClick={() => setShowWhitelistModal(false)}>
                        <div className="modal-content whitelist-modal" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <div className="modal-title-section">
                                    <Shield className="modal-icon" style={{ color: '#8b5cf6' }} size={24} />
                                    <h2 className="modal-title">24/7 Protected Instances</h2>
                                </div>
                                <button onClick={() => setShowWhitelistModal(false)} className="ec2-modal-close">
                                    <X size={24} />
                                </button>
                            </div>
                            <div className="modal-body">
                                {whitelist.length === 0 ? (
                                    <div className="empty-changes">
                                        <Shield size={48} className="empty-changes-icon" />
                                        <p className="empty-changes-title">No instances in 24/7 whitelist</p>
                                        <p className="empty-changes-text">Add instances from the main table to exclude them from scheduled stop/start</p>
                                    </div>
                                ) : (
                                    <div className="whitelist-list">
                                        {whitelist.map((item) => (
                                            <div key={item.instance_id} className="whitelist-item">
                                                <div className="whitelist-info">
                                                    <Shield size={20} className="whitelist-shield" />
                                                    <div>
                                                        <p className="whitelist-name">{item.instance_name || 'Unnamed'}</p>
                                                        <p className="whitelist-id">{item.instance_id}</p>
                                                        {item.instance_type && (
                                                            <p className="whitelist-type">Type: {item.instance_type}</p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="whitelist-actions">
                                                    {item.state && (
                                                        <span className={`state-badge ${getStateColor(item.state)}`}>
                                                            {(item.state || 'unknown').toUpperCase()}
                                                        </span>
                                                    )}
                                                    <button
                                                        onClick={() => handleRemoveFromWhitelist(item.instance_id)}
                                                        className="remove-whitelist-btn"
                                                    >
                                                        <X size={16} />
                                                        Remove
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
                {/* Never-Start Modal */}
                {showNeverStartModal && (
                    <div className="modal-overlay" onClick={() => setShowNeverStartModal(false)}>
                        <div className="modal-content whitelist-modal" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <div className="modal-title-section">
                                    <Ban className="modal-icon" style={{ color: '#ef4444' }} size={24} />
                                    <h2 className="modal-title">Never-Start Instances</h2>
                                </div>
                                <button onClick={() => setShowNeverStartModal(false)} className="ec2-modal-close">
                                    <X size={24} />
                                </button>
                            </div>
                            <div className="modal-body">
                                <p style={{ marginBottom: '16px', color: '#6b7280' }}>
                                    These instances will never be started by the 7 AM automated schedule.
                                </p>
                                {neverStartList.length === 0 ? (
                                    <div className="empty-changes">
                                        <Ban size={48} className="empty-changes-icon" />
                                        <p className="empty-changes-title">No instances in never-start list</p>
                                        <p className="empty-changes-text">Add instances from the main table to exclude them from automated starts</p>
                                    </div>
                                ) : (
                                    <div className="whitelist-list">
                                        {neverStartList.map((item) => (
                                            <div key={item.instance_id} className="whitelist-item">
                                                <div className="whitelist-info">
                                                    <Ban size={20} style={{ color: '#ef4444' }} />
                                                    <div>
                                                        <p className="whitelist-name">{item.instance_name || 'Unnamed'}</p>
                                                        <p className="whitelist-id">{item.instance_id}</p>
                                                        {item.instance_type && (
                                                            <p className="whitelist-type">Type: {item.instance_type}</p>
                                                        )}
                                                        {item.reason && (
                                                            <p className="whitelist-type">Reason: {item.reason}</p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="whitelist-actions">
                                                    {item.state && (
                                                        <span className={`state-badge ${getStateColor(item.state)}`}>
                                                            {(item.state || 'unknown').toUpperCase()}
                                                        </span>
                                                    )}
                                                    <button
                                                        onClick={() => handleRemoveFromNeverStart(item.instance_id)}
                                                        className="remove-whitelist-btn"
                                                    >
                                                        <X size={16} />
                                                        Remove
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Daily Exceptions Modal */}
                {showDailyExceptionsModal && (
                    <div className="modal-overlay" onClick={() => setShowDailyExceptionsModal(false)}>
                        <div className="modal-content whitelist-modal" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <div className="modal-title-section">
                                    <FileUp className="modal-icon" style={{ color: '#f59e0b' }} size={24} />
                                    <h2 className="modal-title">Daily Exception List</h2>
                                </div>
                                <button onClick={() => setShowDailyExceptionsModal(false)} className="ec2-modal-close">
                                    <X size={24} />
                                </button>
                            </div>
                            <div className="modal-body">
                                <p style={{ marginBottom: '16px', color: '#6b7280' }}>
                                    Upload an Excel file with instance IDs to bypass tonight's 9:30 PM stop. Exceptions expire at 7 AM tomorrow.
                                </p>

                                {/* Upload Section */}
                                <div style={{ marginBottom: '24px', padding: '16px', background: '#f9fafb', borderRadius: '8px' }}>
                                    <label className="upload-label">
                                        <Upload size={20} />
                                        <span>Upload Excel/CSV File</span>
                                        <input
                                            type="file"
                                            accept=".xlsx,.xls,.csv"
                                            onChange={handleExceptionFileUpload}
                                            style={{ display: 'none' }}
                                            disabled={uploadingException}
                                        />
                                    </label>
                                    {uploadingException && <p style={{ marginTop: '8px', color: '#6b7280' }}>Uploading...</p>}
                                    <p style={{ marginTop: '8px', fontSize: '12px', color: '#6b7280' }}>
                                        Excel/CSV format: Column header "instance_id", "ID", "private_ip", or "ip_address"
                                    </p>
                                </div>

                                {/* Current Exceptions List */}
                                {dailyExceptions.length === 0 ? (
                                    <div className="empty-changes">
                                        <FileUp size={48} className="empty-changes-icon" />
                                        <p className="empty-changes-title">No active daily exceptions</p>
                                        <p className="empty-changes-text">Upload an Excel file to add exceptions for tonight</p>
                                    </div>
                                ) : (
                                    <div className="whitelist-list">
                                        {dailyExceptions.map((item) => (
                                            <div key={item.id} className="whitelist-item">
                                                <div className="whitelist-info">
                                                    <FileUp size={20} style={{ color: '#f59e0b' }} />
                                                    <div>
                                                        <p className="whitelist-name">{item.instance_name || 'Unnamed'}</p>
                                                        <p className="whitelist-id">{item.instance_id}</p>
                                                        {item.instance_type && (
                                                            <p className="whitelist-type">Type: {item.instance_type}</p>
                                                        )}
                                                        <p className="whitelist-type">
                                                            Expires: {new Date(item.expires_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="whitelist-actions">
                                                    {item.state && (
                                                        <span className={`state-badge ${getStateColor(item.state)}`}>
                                                            {(item.state || 'unknown').toUpperCase()}
                                                        </span>
                                                    )}
                                                    <button
                                                        onClick={() => handleRemoveDailyException(item.id)}
                                                        className="remove-whitelist-btn"
                                                    >
                                                        <X size={16} />
                                                        Remove
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}


                {/* Schedule Logs Modal */}
                {showScheduleLogsModal && (
                    <div className="modal-overlay" onClick={() => setShowScheduleLogsModal(false)}>
                        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <div className="modal-title-section">
                                    <Clock className="modal-icon" size={24} />
                                    <h2 className="modal-title">Schedule Execution Logs</h2>
                                </div>
                                <button onClick={() => setShowScheduleLogsModal(false)} className="ec2-modal-close">
                                    <X size={24} />
                                </button>
                            </div>
                            <div className="modal-body">
                                {scheduleLogs.length === 0 ? (
                                    <div className="empty-changes">
                                        <Clock size={48} className="empty-changes-icon" />
                                        <p className="empty-changes-title">No schedule logs yet</p>
                                        <p className="empty-changes-text">Logs will appear after scheduled or manual start/stop actions</p>
                                    </div>
                                ) : (
                                    <div className="logs-list">
                                        {scheduleLogs.map((log) => (
                                            <div key={log.id} className={`log-item ${log.status}`}>
                                                <div className="log-header">
                                                    <span className={`log-action ${log.action}`}>
                                                        {log.action === 'start' ? <Play size={14} /> : <Square size={14} />}
                                                        {(log.action || 'unknown').toUpperCase()}
                                                    </span>
                                                    <span className="log-time">{new Date(log.executed_at).toLocaleString()}</span>
                                                </div>
                                                <div className="log-details">
                                                    <p className="log-instance">{log.instance_name || 'Unnamed'} ({log.instance_id})</p>
                                                    <p className={`log-status status-${log.status}`}>
                                                        Status: {(log.status || 'unknown').toUpperCase()}
                                                    </p>
                                                    {log.message && <p className="log-message">{log.message}</p>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Changes Modal */}
                {showChangesModal && (
                    <div className="modal-overlay" onClick={() => setShowChangesModal(false)}>
                        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <div className="modal-title-section">
                                    {changesType === 'added' ? (
                                        <PlusCircle className="modal-icon modal-icon-added" size={24} />
                                    ) : changesType === 'deleted' ? (
                                        <MinusCircle className="modal-icon modal-icon-deleted" size={24} />
                                    ) : (
                                        <Clock className="modal-icon" size={24} />
                                    )}
                                    <h2 className="modal-title">
                                        {changesType === 'added' ? 'New Instances Added' :
                                            changesType === 'deleted' ? 'Instances Deleted' :
                                                'All Instance Changes'}
                                    </h2>
                                </div>
                                <div className="modal-actions">
                                    <button onClick={handleClearHistory} className="clear-history-btn" title="Clear all history">
                                        <Trash2 size={18} />
                                        Clear History
                                    </button>
                                    <button onClick={() => setShowChangesModal(false)} className="ec2-modal-close">
                                        <X size={24} />
                                    </button>
                                </div>
                            </div>

                            <div className="modal-body">
                                {changes.length === 0 ? (
                                    <div className="empty-changes">
                                        <Clock size={48} className="empty-changes-icon" />
                                        <p className="empty-changes-title">No changes recorded</p>
                                        <p className="empty-changes-text">
                                            {changesType === 'added' ? 'No new instances have been added yet' :
                                                changesType === 'deleted' ? 'No instances have been deleted yet' :
                                                    'No instance changes have been tracked yet'}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="changes-list">
                                        {changes.map((change) => (
                                            <div key={change.id} className={`change-item ${change.change_type}`}>
                                                <div className="change-header">
                                                    <div className="change-type-badge">
                                                        {change.change_type === 'added' ? (
                                                            <>
                                                                <PlusCircle size={16} />
                                                                <span>Added</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <MinusCircle size={16} />
                                                                <span>Deleted</span>
                                                            </>
                                                        )}
                                                    </div>
                                                    <span className="change-time">
                                                        {new Date(change.changed_at).toLocaleString()}
                                                    </span>
                                                </div>
                                                <div className="change-details">
                                                    <div className="change-detail-row">
                                                        <span className="change-label">Name:</span>
                                                        <span className="change-value">{change.instance_name || 'Unnamed'}</span>
                                                    </div>
                                                    <div className="change-detail-row">
                                                        <span className="change-label">Instance ID:</span>
                                                        <span className="change-value instance-id">{change.instance_id}</span>
                                                    </div>
                                                    {change.availability_zone && (
                                                        <div className="change-detail-row">
                                                            <span className="change-label">AZ:</span>
                                                            <span className="change-value">{change.availability_zone}</span>
                                                        </div>
                                                    )}
                                                    {change.private_ip && (
                                                        <div className="change-detail-row">
                                                            <span className="change-label">Private IP:</span>
                                                            <span className="change-value">{change.private_ip}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Upload Modal */}
                {showUploadModal && (
                    <div className="modal-overlay" onClick={() => setShowUploadModal(false)}>
                        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <div className="modal-title-section">
                                    <Upload className="modal-icon" size={24} />
                                    <h2 className="modal-title">Upload Excel/CSV File</h2>
                                </div>
                                <button onClick={() => setShowUploadModal(false)} className="ec2-modal-close">
                                    <X size={24} />
                                </button>
                            </div>
                            <div className="modal-body">
                                <p className="upload-instructions">
                                    Upload an Excel file (.xlsx or .xls) or CSV with columns: <strong>instance_id</strong>/<strong>ID</strong> or <strong>private_ip</strong>/<strong>ip_address</strong>
                                </p>
                                <input
                                    type="file"
                                    accept=".xlsx,.xls,.csv"
                                    onChange={handleFileUpload}
                                    className="ec2file-input"
                                    disabled={uploading}
                                />
                                {uploading && <p className="uploading-text">Uploading and parsing...</p>}
                            </div>
                        </div>
                    </div>
                )}

                {/* Options Modal */}
                {showOptionsModal && (
                    <div className="modal-overlay" onClick={() => setShowOptionsModal(false)}>
                        <div className="modal-content options-modal" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <h2 className="modal-title">Choose Action</h2>
                                <button onClick={() => setShowOptionsModal(false)} className="ec2-modal-close">
                                    <X size={24} />
                                </button>
                            </div>
                            <div className="modal-body">
                                <div className="instances-preview">
                                    <p><strong>{parsedInstances.filter(i => i.exists).length}</strong> valid instances found</p>
                                    <div className="preview-table">
                                        {parsedInstances.slice(0, 5).map((inst, idx) => (
                                            <div key={idx} className={`preview-row ${!inst.exists ? 'invalid' : ''}`}>
                                                <span>{inst.instance_id}</span>
                                                <span>{inst.instance_name || 'Unnamed'}</span>
                                                {!inst.exists && <span className="error-badge">Not Found</span>}
                                            </div>
                                        ))}
                                        {parsedInstances.length > 5 && <p>...and {parsedInstances.length - 5} more</p>}
                                    </div>
                                </div>
                                <div className="options-buttons">
                                    <button onClick={handleBulkWhitelist} className="ec2-option-btn whitelist-btn">
                                        <Shield size={20} />
                                        Add to 24/7 Protection
                                    </button>
                                    <button onClick={handleBulkNeverStart} className="ec2-option-btn neverstart-btn">
                                        <Ban size={20} />
                                        Add to Never-Start
                                    </button>
                                    <button onClick={handleCustomSchedule} className="ec2-option-btn ec2-schedule-btn">
                                        <Calendar size={20} />
                                        Set Custom Schedule
                                    </button>
                                    <button onClick={handleBulkDailyException} className="ec2-option-btn exception-btn">
                                        <FileUp size={20} />
                                        Add to Daily Exceptions
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Schedule Modal */}
                {showScheduleModal && (
                    <div className="modal-overlay" onClick={() => setShowScheduleModal(false)}>
                        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <div className="modal-title-section">
                                    <Calendar className="modal-icon" size={24} />
                                    <h2 className="modal-title">Set Custom Schedule</h2>
                                </div>
                                <button onClick={() => setShowScheduleModal(false)} className="ec2-modal-close">
                                    <X size={24} />
                                </button>
                            </div>
                            <div className="modal-body">
                                <p className="schedule-instructions">
                                    Select when these instances should be stopped:
                                </p>
                                <div className="datetime-inputs">
                                    <div className="input-group">
                                        <label>Date</label>
                                        <input
                                            type="date"
                                            value={scheduleDate}
                                            onChange={(e) => setScheduleDate(e.target.value)}
                                            min={new Date().toISOString().split('T')[0]}
                                            className="date-input"
                                        />
                                    </div>
                                    <div className="input-group">
                                        <label>Time (IST)</label>
                                        <input
                                            type="time"
                                            value={scheduleTime}
                                            onChange={(e) => setScheduleTime(e.target.value)}
                                            className="time-input"
                                        />
                                    </div>
                                </div>
                                <button onClick={handleCreateSchedule} className="create-schedule-btn">
                                    Create Schedule
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Custom Schedules View Modal */}
                {showCustomSchedulesModal && (
                    <div className="modal-overlay" onClick={() => setShowCustomSchedulesModal(false)}>
                        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <div className="modal-title-section">
                                    <Calendar className="modal-icon" size={24} />
                                    <h2 className="modal-title">Custom Schedules</h2>
                                </div>
                                <button onClick={() => setShowCustomSchedulesModal(false)} className="ec2-modal-close">
                                    <X size={24} />
                                </button>
                            </div>
                            <div className="modal-body">
                                {customSchedules.length === 0 ? (
                                    <div className="empty-changes">
                                        <Calendar size={48} className="empty-changes-icon" />
                                        <p className="empty-changes-title">No custom schedules</p>
                                    </div>
                                ) : (
                                    <div className="schedules-list">
                                        {customSchedules.map((schedule) => (
                                            <div key={schedule.id} className="schedule-item">
                                                <div className="schedule-info">
                                                    <p className="schedule-instance">{schedule.instance_name || 'Unnamed'}</p>
                                                    <p className="schedule-id">{schedule.instance_id}</p>
                                                    <p className="schedule-time">
                                                        Stops at: {new Date(schedule.stop_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => handleCancelSchedule(schedule.id)}
                                                    className="cancel-schedule-btn"
                                                >
                                                    <X size={16} />
                                                    Cancel
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
}

export default EC2;