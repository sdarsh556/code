import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, Cpu, Database, Activity, BarChart3, Zap, CheckCircle, AlertCircle } from 'lucide-react';
import CPUGraphModal from './CPUGraphModal';
import '../../../css/analytics/ecs/ServiceDetails.css';

function ServiceDetails() {
    const { clusterName } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const { dayData, selectedRange } = location.state || {};

    const [selectedService, setSelectedService] = useState(null);
    const [showGraphModal, setShowGraphModal] = useState(false);

    // Mock service data
    const servicesData = [
        { serviceName: 'api-gateway-service', taskCount: 8, cpu: 62.4, memory: 74.2, status: 'healthy' },
        { serviceName: 'auth-service', taskCount: 4, cpu: 45.8, memory: 58.6, status: 'healthy' },
        { serviceName: 'payment-processor', taskCount: 6, cpu: 71.3, memory: 82.1, status: 'warning' },
        { serviceName: 'notification-service', taskCount: 3, cpu: 38.2, memory: 51.4, status: 'healthy' },
        { serviceName: 'data-sync-service', taskCount: 5, cpu: 55.9, memory: 67.8, status: 'healthy' },
        { serviceName: 'analytics-worker', taskCount: 2, cpu: 28.7, memory: 42.3, status: 'healthy' }
    ];

    const handleViewGraph = (service) => {
        setSelectedService(service);
        setShowGraphModal(true);
    };

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });
    };

    return (
        <div className="service-details-spectacular">
            {/* Background Pattern */}
            <div className="service-bg-pattern"></div>

            {/* Header */}
            <div className="service-header-spectacular">
                <button
                    className="back-btn-spectacular"
                    onClick={() => navigate(`/analytics/ecs/cluster/${clusterName}`, {
                        state: { cluster: { clusterName }, selectedRange }
                    })}
                >
                    <ArrowLeft size={20} />
                    <span>Back</span>
                </button>

                <div className="service-title-section">
                    <div className="title-icon">
                        <Calendar size={32} />
                        <div className="icon-glow-small"></div>
                    </div>
                    <div>
                        <h1>{formatDate(dayData?.date)}</h1>
                        <p>{clusterName} • {servicesData.length} services running</p>
                    </div>
                </div>

                <div className="service-summary-cards">
                    <div className="summary-card">
                        <Cpu size={20} />
                        <div>
                            <div className="summary-value">{dayData?.avgCpu || 52.3}%</div>
                            <div className="summary-label">Avg CPU</div>
                        </div>
                    </div>
                    <div className="summary-card">
                        <Database size={20} />
                        <div>
                            <div className="summary-value">{dayData?.avgMemory || 68.4}%</div>
                            <div className="summary-label">Avg Memory</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Services Grid */}
            <div className="services-grid-spectacular">
                {servicesData.map((service, index) => (
                    <div
                        key={service.serviceName}
                        className="service-card-item"
                        style={{ animationDelay: `${index * 0.1}s` }}
                    >
                        <div className="service-card-header">
                            <div className="service-name-section">
                                <Activity size={20} />
                                <span className="service-name">{service.serviceName}</span>
                            </div>
                            <div className={`status-indicator status-${service.status}`}>
                                {service.status === 'healthy' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                                <span>{service.status}</span>
                            </div>
                        </div>

                        <div className="service-card-body">
                            <div className="task-count-badge">
                                <Zap size={16} />
                                <span>{service.taskCount} tasks</span>
                            </div>

                            <div className="metrics-display">
                                <div className="metric-circle-wrapper">
                                    <svg className="metric-circle" viewBox="0 0 100 100">
                                        <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(59, 130, 246, 0.1)" strokeWidth="10" />
                                        <circle
                                            cx="50"
                                            cy="50"
                                            r="45"
                                            fill="none"
                                            stroke="url(#cpu-gradient)"
                                            strokeWidth="10"
                                            strokeDasharray={`${service.cpu * 2.827}, 282.7`}
                                            strokeLinecap="round"
                                            transform="rotate(-90 50 50)"
                                        />
                                        <defs>
                                            <linearGradient id="cpu-gradient">
                                                <stop offset="0%" stopColor="#3b82f6" />
                                                <stop offset="100%" stopColor="#8b5cf6" />
                                            </linearGradient>
                                        </defs>
                                    </svg>
                                    <div className="metric-circle-text">
                                        <div className="metric-circle-value">{service.cpu}%</div>
                                        <div className="metric-circle-label">CPU</div>
                                    </div>
                                </div>

                                <div className="metric-circle-wrapper">
                                    <svg className="metric-circle" viewBox="0 0 100 100">
                                        <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(236, 72, 153, 0.1)" strokeWidth="10" />
                                        <circle
                                            cx="50"
                                            cy="50"
                                            r="45"
                                            fill="none"
                                            stroke="url(#memory-gradient)"
                                            strokeWidth="10"
                                            strokeDasharray={`${service.memory * 2.827}, 282.7`}
                                            strokeLinecap="round"
                                            transform="rotate(-90 50 50)"
                                        />
                                        <defs>
                                            <linearGradient id="memory-gradient">
                                                <stop offset="0%" stopColor="#ec4899" />
                                                <stop offset="100%" stopColor="#f97316" />
                                            </linearGradient>
                                        </defs>
                                    </svg>
                                    <div className="metric-circle-text">
                                        <div className="metric-circle-value">{service.memory}%</div>
                                        <div className="metric-circle-label">Memory</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button
                            className="view-graph-btn"
                            onClick={() => handleViewGraph(service)}
                        >
                            <BarChart3 size={18} />
                            <span>View 30-Day Trend</span>
                        </button>
                    </div>
                ))}
            </div>

            {/* CPU Graph Modal */}
            {showGraphModal && selectedService && (
                <CPUGraphModal
                    service={selectedService}
                    selectedDate={dayData?.date}
                    onClose={() => {
                        setShowGraphModal(false);
                        setSelectedService(null);
                    }}
                />
            )}
        </div>
    );
}

export default ServiceDetails;
