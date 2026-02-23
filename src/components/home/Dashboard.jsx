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

function Dashboard() {
    const { setBgContext } = useOutletContext();
    const navigate = useNavigate();
    const [showHolidayModal, setShowHolidayModal] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    useEffect(() => {
        setBgContext('default');
    }, [setBgContext]);

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
                { label: 'Running Inst.', value: '12' },
                { label: 'Sched. Active', value: '4' },
                { label: 'Healthy (%)', value: '100' }
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
            isLive: true,
            stats: [
                { label: 'Clusters Act.', value: '5' },
                { label: 'Services Act.', value: '24' },
                { label: 'Sched. Count', value: '8' }
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
                { label: 'Clusters Act.', value: '4' },
                { label: 'Services Act.', value: '38' },
                { label: 'Sched. Count', value: '12' }
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
                { label: 'DBs Online', value: '8' },
                { label: 'Replicas', value: '3' },
                { label: 'Schedules', value: '4' }
            ],
            gradient: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)'
        }
    ];

    return (
        <div className="dashboard-page">
            <div className="dashboard-hero">
                <div className="hero-content">
                    <h1 className="hero-title">
                        Welcome to <span className="gradient-text">EDITH</span>
                    </h1>
                    <p className="hero-subtitle">
                        Your centralized AWS automation dashboard. Manage all your cloud resources in one place.
                    </p>
                </div>
                {/* <div className="hero-stats">
                    <button className="upload-holiday-btn" onClick={() => setShowHolidayModal(true)}>
                        <Calendar size={18} />
                        Holidays
                    </button>
                </div> */}
            </div>

            <div className="analytics-explorer-header">
                <TrendingUp size={16} className="trending-icon" />
                <span>SELECT A SERVICE TO EXPLORE ANALYTICS</span>
            </div>

            <div className="service-analytics-grid">
                {resourceCards.map((service) => (
                    <div key={service.id} className={`service-card card-${service.color}`}>
                        <div className="card-top-bar"></div>
                        {service.isLive && (
                            <div className="status-badge live">
                                <span className="dot"></span>
                                LIVE
                            </div>
                        )}

                        <button
                            className="action-graph-btn"
                            onClick={() => navigate(service.analyticsLink)}
                            title="Interactive Performance Analytics"
                        >
                            <TrendingUp size={18} />
                        </button>

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

                        <div className="card-divider"></div>

                        <div className="card-footer">
                            <button
                                className="manage-link"
                                onClick={() => navigate(service.manageLink)}
                            >
                                Manage Fleet
                                <ArrowRight size={14} />
                            </button>
                            <button
                                className="explore-link"
                                onClick={() => navigate(service.analyticsLink)}
                            >
                                Deep Analysis
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
