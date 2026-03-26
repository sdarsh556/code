import {
    Calendar,
    Server,
    Container,
    Boxes,
    Database,
    ArrowRight,
    TrendingUp,
    Activity,
    DollarSign,
    Zap,
    Shield,
    AlertCircle
} from 'lucide-react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useEffect, useState } from 'react';
import '../../css/home/Dashboard.css';
import axiosClient from '../api/axiosClient';
import HolidayModal from '../common/HolidayModal';
import ConfirmActionModal from '../common/ConfirmActionModal';
import logo from '../../assets/logo.svg';
import ArcReactor from './ArcReactor';

function Dashboard() {
    const { setBgContext } = useOutletContext();
    const navigate = useNavigate();
    const [showHolidayModal, setShowHolidayModal] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [ecsStats, setEcsStats] = useState({
        totalClusters: 0,
        totalActiveServices: 0,
        scheduledCount: 0
    });
    const [ec2Stats, setEc2Stats] = useState({
        totalInstances: 0,
        runningInstances: 0,
        activeSchedules: 0
    });
    const [rdsStats, setRdsStats] = useState({
        totalDatabases: 0,
        runningDatabases: 0,
        activeSchedules: 0
    });
    const [eksStats, setEksStats] = useState({
        totalClusters: 0,
        totalnamespaces: 0,
        activeSchedules: 0
    });
    const [systemMetrics, setSystemMetrics] = useState({
        cpu: 0,
        memory: 0,
        cores: 0,
        usedMemoryGB: '0.00',
        totalMemoryGB: '0.00'
    });

    useEffect(() => {
        setBgContext('default');
    }, [setBgContext]);

    const fetchEcsStats = async () => {
        try {
            const response = await axiosClient.get('/ecs/clusters');
            const result = response.data;

            if (!result.success) return;

            const clusters = result.data || [];
            const totalClusters = clusters.length;
            const totalActiveServices = clusters.reduce(
                (sum, c) => sum + (c.active_services_count || 0),
                0
            );

            const scheduledCount = clusters.filter(
                (c) => c.is_scheduled
            ).length;

            setEcsStats({
                totalClusters,
                totalActiveServices,
                scheduledCount
            });
        } catch (err) {
            console.error('Dashboard ECS stats error:', err);
        }
    };

    const fetchEc2Stats = async () => {
        try {
            const [instancesRes, schedulesRes] = await Promise.all([
                axiosClient.get('/ec2/instances'),
                axiosClient.get('/ec2/custom-schedules')
            ]);

            const instances = instancesRes.data || [];
            const schedules = schedulesRes.data || [];
            const totalInstances = instances.length;
            const runningInstances = instances.filter(
                (i) => i.state === 'running'
            ).length;

            const activeSchedules = schedules.length;

            setEc2Stats({
                totalInstances,
                runningInstances,
                activeSchedules
            });

        } catch (err) {
            console.error('Dashboard EC2 stats error:', err);
        }
    };

    const fetchRdsStats = async () => {
        try {
            const response = await axiosClient.get('/rds/dashboard/stats');
            const result = response.data;

            if (!result.success) return;

            const data = result.data;

            const totalDatabases = data.total_databases || 0;
            const runningDatabases = data.running_count || 0;

            const activeSchedules =
                (data.daily_exceptions_count || 0) +
                (data.custom_schedules_count || 0) +
                (data.always_running_count || 0);

            setRdsStats({
                totalDatabases,
                runningDatabases,
                activeSchedules
            });

        } catch (err) {
            console.error('Dashboard RDS stats error:', err);
        }
    };

    const fetchEksStats = async () => {
        try {
            const response = await axiosClient.get('/eks/dashboard');
            const result = response.data;

            const stats = result.stats || {};

            const totalClusters = Number(stats.total_clusters) || 0;

            const totalnamespaces = Number(stats.scaled_up) || 0;

            const activeSchedules =
                (Number(stats.whitelisted) || 0) +
                (Number(stats.daily_exceptions) || 0) +
                (Number(stats.custom_schedules) || 0);

            setEksStats({
                totalClusters,
                totalnamespaces,
                activeSchedules
            });

        } catch (err) {
            console.error('Dashboard EKS stats error:', err);
        }
    };

    const fetchSystemMetrics = async () => {
        try {
            const response = await axiosClient.get('/system/metrics');
            if (response.data && response.data.success) {
                const data = response.data.data;
                setSystemMetrics({
                    cpu: data.cpu.currentLoad,
                    memory: data.memory.usedPercent,
                    cores: data.cpu.cores,
                    usedMemoryGB: (data.memory.used / (1024 * 1024 * 1024)).toFixed(2),
                    totalMemoryGB: (data.memory.total / (1024 * 1024 * 1024)).toFixed(2)
                });
            }
        } catch (err) {
            console.error('System metrics fetch failed:', err);
        }
    };

    useEffect(() => {
        fetchEcsStats();
        fetchEc2Stats();
        fetchRdsStats();
        fetchEksStats();
        fetchSystemMetrics();

        const metricsInterval = setInterval(fetchSystemMetrics, 3000);
        return () => clearInterval(metricsInterval);
    }, []);

    const [file, setFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

    const handleUpload = async () => {
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        setIsUploading(true);
        try {
            const res = await axiosClient.post('/holidays/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            alert('Holidays uploaded successfully!');
            console.log(res.data);
        } catch (err) {
            console.error('Upload failed:', err.response?.data || err);
            alert('Failed to upload holidays.');
        } finally {
            setIsUploading(false);
            setFile(null);
        }
    };

    const resourceCards = [
        {
            id: 'ec2',
            title: 'EC2 Instances',
            category: 'COMPUTE ANALYTICS',
            description: 'Instance performance & cost analysis.',
            icon: Server,
            color: 'purple',
            manageLink: '/ec2',
            analyticsLink: '/analytics/ec2',
            stats: [
                { label: 'Total Instances', value: ec2Stats.totalInstances },
                { label: 'Running Instances', value: ec2Stats.runningInstances },
                { label: 'Active Schedules', value: ec2Stats.activeSchedules }
            ],
            gradient: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)'
        },
        {
            id: 'ecs',
            title: 'ECS Clusters',
            category: 'CONTAINER ANALYTICS',
            description: 'Cluster & service cost breakdown.',
            icon: Container,
            color: 'purple',
            manageLink: '/ecs',
            analyticsLink: '/analytics/ecs',
            isLive: false,
            stats: [
                { label: 'Total Clusters', value: ecsStats.totalClusters },
                { label: 'Active Services', value: ecsStats.totalActiveServices },
                { label: 'Active Schedules', value: ecsStats.scheduledCount }
            ],
            gradient: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)'
        },
        {
            id: 'eks',
            title: 'EKS Clusters',
            category: 'KUBERNETES ANALYTICS',
            description: 'Pod metrics & workload analytics.',
            icon: Boxes,
            color: 'pink',
            manageLink: '/eks',
            analyticsLink: '/analytics/eks',
            stats: [
                { label: 'Total Clusters', value: eksStats.totalClusters },
                { label: 'Total Namespaces', value: eksStats.totalnamespaces },
                { label: 'Active Schedules', value: eksStats.activeSchedules }
            ],
            gradient: 'linear-gradient(135deg, #ec4899 0%, #f472b6 100%)'
        },
        {
            id: 'rds',
            title: 'RDS Databases',
            category: 'DATABASE ANALYTICS',
            description: 'Query insights & storage tracking.',
            icon: Database,
            color: 'green',
            manageLink: '/rds',
            analyticsLink: '/analytics/rds',
            stats: [
                { label: 'Total Databases', value: rdsStats.totalDatabases },
                { label: 'Running Databases', value: rdsStats.runningDatabases },
                { label: 'Active Schedules', value: rdsStats.activeSchedules }
            ],
            gradient: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)'
        }
    ];

    return (
        <div className="dashboard-page">
            <div className="dashboard-hero-premium">
                <div className="hero-hud-metadata">
                    <div className="hud-line"></div>
                    <span className="hud-status"><span className="pulse-dot"></span> SYSTEM ONLINE</span>
                    <div className="hud-line"></div>
                </div>

                <div className="hero-main-unit">
                    <div className="hero-branding">
                        <img src={logo} className="portal-logo-modern" alt="EDITH Portal" />
                    </div>

                    <div className="hero-text-content">
                        <p className="hero-eyebrow">⬥ Welcome to</p>
                        <h1 className="hero-title-premium">
                            <span className="title-accent">EDITH</span>
                        </h1>
                        <div className="hero-tagline">
                            <span className="tagline-text">Even Dead, I'm The Hero</span>
                        </div>
                    </div>

                    <div className="hero-utilization-monitor">
                        <ArcReactor cores={systemMetrics.cores} usedMemoryGB={systemMetrics.usedMemoryGB} />
                    </div>
                </div>

                <div className="hero-footer-unit">
                    <div className="footer-decorator"></div>
                    <p className="hero-description">
                        Your centralized AWS automation dashboard. Manage all your cloud resources in one place.
                    </p>
                    <div className="footer-decorator"></div>
                </div>
            </div>

            <div className="service-analytics-grid">
                {resourceCards.map((service) => (
                    <div key={service.id} className={`service-card card-${service.color}`}>
                        <div className="card-top-bar"></div>

                        {/* <button
                            className="action-graph-btn"
                            onClick={() => navigate(service.analyticsLink)}
                            title="Interactive Performance Analytics"
                        >
                            <TrendingUp size={18} />
                        </button> */}

                        <div className="icon-box">
                            <service.icon size={24} strokeWidth={2.5} />
                        </div>

                        <div className="card-content">
                            <h3 className="service-title">{service.title}</h3>
                            <p className="service-category">{service.category}</p>

                            <div className="stats-readout-panel">
                                {service.stats.map((stat, idx) => (
                                    <div key={idx} className="stat-unit">
                                        <span className="stat-value">{stat.value}</span>
                                        <span className="stat-label">{stat.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* <div className="card-divider"></div> */}

                        <div className="dashboard-card-footer">
                            <button
                                className="manage-link"
                                onClick={() => navigate(service.manageLink)}
                            >
                                Manage
                                <ArrowRight size={14} />
                            </button>
                            <button
                                className="explore-link"
                                onClick={() => navigate(service.analyticsLink)}
                            >
                                Analyse
                                <ArrowRight size={14} />
                            </button>
                        </div>

                        {service.isComingSoon && (
                            <div className="coming-soon-overlay">
                                <span>Future Integration</span>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* <ConfirmActionModal
                isOpen={showConfirmModal}
                title="Upload Holiday Calendar"
                message="Are you sure you want to upload this holiday list? This will overwrite existing holidays."
                onCancel={() => setShowConfirmModal(false)}
                onConfirm={async () => {
                    await handleUpload();
                    setShowConfirmModal(false);
                }}
            /> */}

            {/* <HolidayModal
                isOpen={showHolidayModal}
                onClose={() => setShowHolidayModal(false)}
            /> */}
        </div>
    );
}

export default Dashboard;
