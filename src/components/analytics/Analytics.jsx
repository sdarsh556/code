import { useNavigate } from 'react-router-dom';
import { BarChart3, Server, Container, Boxes, Database, TrendingUp, Zap, Activity } from 'lucide-react';
import '../../css/analytics/Analytics.css';

function Analytics() {
    const navigate = useNavigate();

    const services = [
        {
            id: 'ec2',
            name: 'EC2 Analytics',
            description: 'Instance performance & optimization',
            icon: Server,
            available: false,
            color: '#3b82f6',
            gradient: 'from-blue-500 to-cyan-500'
        },
        {
            id: 'ecs',
            name: 'ECS Analytics',
            description: 'Container insights & metrics',
            icon: Container,
            available: true,
            color: '#8b5cf6',
            gradient: 'from-purple-500 to-pink-500'
        },
        {
            id: 'eks',
            name: 'EKS Analytics',
            description: 'Kubernetes cluster analytics',
            icon: Boxes,
            available: false,
            color: '#ec4899',
            gradient: 'from-pink-500 to-rose-500'
        },
        {
            id: 'rds',
            name: 'RDS Analytics',
            description: 'Database performance tracking',
            icon: Database,
            available: false,
            color: '#10b981',
            gradient: 'from-emerald-500 to-teal-500'
        }
    ];

    const stats = [
        { label: 'Total Services', value: '156', icon: Activity, trend: '+12%' },
        { label: 'Active Clusters', value: '24', icon: Zap, trend: '+5%' },
        { label: 'Cost Savings', value: '$12.4K', icon: TrendingUp, trend: '+18%' }
    ];

    const handleServiceClick = (service) => {
        if (service.available) {
            navigate(`/analytics/${service.id}`);
        }
    };

    return (
        <div className="analytics-spectacular">
            {/* Animated Background */}
            <div className="analytics-bg-pattern"></div>

            {/* Hero Section */}
            <div className="analytics-hero">
                <div className="hero-icon-wrapper">
                    <BarChart3 className="hero-icon" size={48} />
                    <div className="icon-glow"></div>
                </div>
                <h1 className="hero-title">
                    <span className="title-line">Analytics</span>
                    <span className="title-line">Dashboard</span>
                </h1>
                <p className="hero-subtitle">Real-time insights across your AWS infrastructure</p>
            </div>

            {/* Quick Stats */}
            <div className="quick-stats">
                {stats.map((stat, index) => {
                    const Icon = stat.icon;
                    return (
                        <div key={index} className="stat-card-spectacular" style={{ animationDelay: `${index * 0.1}s` }}>
                            <div className="stat-icon-wrapper">
                                <Icon size={24} />
                            </div>
                            <div className="stat-content">
                                <div className="stat-value">{stat.value}</div>
                                <div className="stat-label">{stat.label}</div>
                            </div>
                            <div className="stat-trend">{stat.trend}</div>
                        </div>
                    );
                })}
            </div>

            {/* Service Cards */}
            <div className="services-grid-spectacular">
                {services.map((service, index) => {
                    const Icon = service.icon;
                    return (
                        <div
                            key={service.id}
                            className={`service-card-spectacular ${service.available ? 'available' : 'disabled'}`}
                            onClick={() => handleServiceClick(service)}
                            style={{ animationDelay: `${index * 0.15}s` }}
                        >
                            <div className="card-glow" style={{ background: `radial-gradient(circle at 50% 50%, ${service.color}33 0%, transparent 70%)` }}></div>

                            <div className="card-header">
                                <div className="card-icon" style={{ background: `linear-gradient(135deg, ${service.color} 0%, ${service.color}dd 100%)` }}>
                                    <Icon size={32} />
                                </div>
                                {!service.available && <span className="soon-tag">SOON</span>}
                            </div>

                            <div className="card-content">
                                <h3 className="card-title">{service.name}</h3>
                                <p className="card-description">{service.description}</p>
                            </div>

                            {service.available && (
                                <div className="card-footer">
                                    <span className="explore-text">Explore →</span>
                                </div>
                            )}

                            <div className="card-shine"></div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default Analytics;
