import { useNavigate } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { BarChart3, Server, Container, Boxes, Database, TrendingUp, Zap, Activity, ArrowRight, Sparkles } from 'lucide-react';
import '../../css/analytics/Analytics.css';

function Analytics() {
    const navigate = useNavigate();
    const canvasRef = useRef(null);

    const services = [
        {
            id: 'ec2',
            name: 'EC2',
            subtitle: 'Compute Analytics',
            description: 'Instance performance, utilization trends & cost optimization insights',
            icon: Server,
            available: false,
            accentColor: '#3b82f6',
            glowColor: 'rgba(59, 130, 246, 0.4)',
            gradient: 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 50%, #06b6d4 100%)',
            bgGradient: 'linear-gradient(135deg, rgba(59,130,246,0.08) 0%, rgba(6,182,212,0.05) 100%)',
            stat: '—',
            statLabel: 'Coming Soon'
        },
        {
            id: 'ecs',
            name: 'ECS',
            subtitle: 'Container Analytics',
            description: 'Container insights, cluster performance & service cost breakdown',
            icon: Container,
            available: true,
            accentColor: '#8b5cf6',
            glowColor: 'rgba(139, 92, 246, 0.5)',
            gradient: 'linear-gradient(135deg, #6d28d9 0%, #8b5cf6 50%, #ec4899 100%)',
            bgGradient: 'linear-gradient(135deg, rgba(139,92,246,0.1) 0%, rgba(236,72,153,0.06) 100%)',
            stat: 'LIVE',
            statLabel: 'Active'
        },
        {
            id: 'eks',
            name: 'EKS',
            subtitle: 'Kubernetes Analytics',
            description: 'Kubernetes cluster health, pod metrics & workload analytics',
            icon: Boxes,
            available: false,
            accentColor: '#ec4899',
            glowColor: 'rgba(236, 72, 153, 0.4)',
            gradient: 'linear-gradient(135deg, #be185d 0%, #ec4899 50%, #f97316 100%)',
            bgGradient: 'linear-gradient(135deg, rgba(236,72,153,0.08) 0%, rgba(249,115,22,0.05) 100%)',
            stat: '—',
            statLabel: 'Coming Soon'
        },
        {
            id: 'rds',
            name: 'RDS',
            subtitle: 'Database Analytics',
            description: 'Database performance, query insights & storage cost tracking',
            icon: Database,
            available: false,
            accentColor: '#10b981',
            glowColor: 'rgba(16, 185, 129, 0.4)',
            gradient: 'linear-gradient(135deg, #065f46 0%, #10b981 50%, #34d399 100%)',
            bgGradient: 'linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(52,211,153,0.05) 100%)',
            stat: '—',
            statLabel: 'Coming Soon'
        }
    ];

    const overviewStats = [
        { label: 'Total Services Tracked', value: '156', icon: Activity, color: '#8b5cf6', change: '+12%' },
        { label: 'Active Clusters', value: '24', icon: Zap, color: '#3b82f6', change: '+5%' },
        { label: 'Monthly Cost Savings', value: '$12.4K', icon: TrendingUp, color: '#10b981', change: '+18%' },
    ];

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let animationId;
        let particles = [];

        const resize = () => {
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        for (let i = 0; i < 60; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                r: Math.random() * 2 + 0.5,
                dx: (Math.random() - 0.5) * 0.4,
                dy: (Math.random() - 0.5) * 0.4,
                opacity: Math.random() * 0.5 + 0.1,
                color: ['#8b5cf6', '#3b82f6', '#ec4899', '#10b981'][Math.floor(Math.random() * 4)]
            });
        }

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => {
                p.x += p.dx;
                p.y += p.dy;
                if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
                if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = p.color;
                ctx.globalAlpha = p.opacity;
                ctx.fill();
            });
            // Draw connections
            ctx.globalAlpha = 1;
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dist = Math.hypot(particles[i].x - particles[j].x, particles[i].y - particles[j].y);
                    if (dist < 100) {
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.strokeStyle = `rgba(139, 92, 246, ${0.08 * (1 - dist / 100)})`;
                        ctx.lineWidth = 0.5;
                        ctx.stroke();
                    }
                }
            }
            animationId = requestAnimationFrame(animate);
        };
        animate();

        return () => {
            cancelAnimationFrame(animationId);
            window.removeEventListener('resize', resize);
        };
    }, []);

    return (
        <div className="analytics-page">
            {/* Particle Canvas */}
            <canvas ref={canvasRef} className="analytics-canvas" />

            {/* Ambient Orbs */}
            <div className="orb orb-1" />
            <div className="orb orb-2" />
            <div className="orb orb-3" />

            <div className="analytics-content">
                {/* Hero */}
                <div className="analytics-hero">
                    <div className="hero-badge">
                        <Sparkles size={14} />
                        <span>AWS Infrastructure Intelligence</span>
                    </div>
                    <h1 className="hero-title">
                        <span className="title-word">Analytics</span>
                        <span className="title-word accent">Hub</span>
                    </h1>
                    <p className="hero-subtitle">
                        Real-time insights, cost intelligence & performance analytics across your entire AWS infrastructure
                    </p>
                </div>

                {/* Overview Stats Strip */}
                <div className="overview-strip">
                    {overviewStats.map((stat, i) => {
                        const Icon = stat.icon;
                        return (
                            <div key={i} className="strip-stat" style={{ '--stat-color': stat.color }}>
                                <div className="strip-icon">
                                    <Icon size={20} />
                                </div>
                                <div className="strip-info">
                                    <div className="strip-value">{stat.value}</div>
                                    <div className="strip-label">{stat.label}</div>
                                </div>
                                <div className="strip-change">{stat.change}</div>
                            </div>
                        );
                    })}
                </div>

                {/* Service Cards */}
                <div className="services-section">
                    <div className="section-label">
                        <BarChart3 size={16} />
                        <span>Select a service to explore analytics</span>
                    </div>
                    <div className="services-grid">
                        {services.map((service, index) => {
                            const Icon = service.icon;
                            return (
                                <div
                                    key={service.id}
                                    className={`service-card ${service.available ? 'available' : 'unavailable'}`}
                                    onClick={() => service.available && navigate(`/analytics/${service.id}`)}
                                    style={{
                                        '--accent': service.accentColor,
                                        '--glow': service.glowColor,
                                        '--card-gradient': service.bgGradient,
                                        animationDelay: `${index * 0.12}s`
                                    }}
                                >
                                    {/* Glow Layer */}
                                    <div className="card-glow-layer" />

                                    {/* Top Bar */}
                                    <div className="card-top-bar" style={{ background: service.gradient }} />

                                    {/* Header */}
                                    <div className="card-header">
                                        <div className="card-icon-wrap" style={{ background: service.gradient }}>
                                            <Icon size={28} />
                                        </div>
                                        <div className="card-badge" style={{
                                            background: service.available
                                                ? 'rgba(16,185,129,0.15)'
                                                : 'rgba(148,163,184,0.1)',
                                            color: service.available ? '#10b981' : '#94a3b8',
                                            borderColor: service.available
                                                ? 'rgba(16,185,129,0.3)'
                                                : 'rgba(148,163,184,0.2)'
                                        }}>
                                            {service.available && <span className="live-dot" />}
                                            {service.stat}
                                        </div>
                                    </div>

                                    {/* Body */}
                                    <div className="card-body">
                                        <div className="card-name">{service.name}</div>
                                        <div className="card-subtitle">{service.subtitle}</div>
                                        <p className="card-desc">{service.description}</p>
                                    </div>

                                    {/* Footer */}
                                    {service.available ? (
                                        <div className="card-footer available-footer">
                                            <span>Explore Analytics</span>
                                            <ArrowRight size={18} />
                                        </div>
                                    ) : (
                                        <div className="card-footer soon-footer">
                                            <span>Coming Soon</span>
                                        </div>
                                    )}

                                    {/* Shine */}
                                    <div className="card-shine" />
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Analytics;
