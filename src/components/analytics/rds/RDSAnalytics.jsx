import React from 'react';
import { Database, TrendingUp, Activity, Zap, Shield, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import '../../../css/analytics/ecs/ClusterDetails.css'; // Corrected casing

function RDSAnalytics() {
    const navigate = useNavigate();

    return (
        <div className="cluster-details-page">
            <div className="details-hero">
                <div className="hero-content">
                    <div className="breadcrumb" onClick={() => navigate('/analytics')}>
                        <TrendingUp size={14} />
                        ANALYTICS / RDS
                    </div>
                    <h1 className="hero-title">RDS Database <span className="gradient-text">Insights</span></h1>
                    <p className="hero-subtitle">
                        Comprehensive query performance analysis, storage scaling trends, and connection reliability monitoring.
                    </p>
                </div>
            </div>

            <div className="stats-grid" style={{ marginTop: '2rem' }}>
                <div className="stat-card">
                    <div className="stat-header">
                        <Activity size={18} color="#10b981" />
                        <span>FLEET HEALTH</span>
                    </div>
                    <div className="stat-value">100%</div>
                    <div className="stat-meta">8 Active Instances</div>
                </div>
                <div className="stat-card">
                    <div className="stat-header">
                        <Search size={18} color="#3b82f6" />
                        <span>QUERY LATENCY</span>
                    </div>
                    <div className="stat-value">1.2ms</div>
                    <div className="stat-meta">Average p95</div>
                </div>
                <div className="stat-card">
                    <div className="stat-header">
                        <Zap size={18} color="#f59e0b" />
                        <span>STORAGE LEFT</span>
                    </div>
                    <div className="stat-value">4.2TB</div>
                    <div className="stat-meta">Auto-scaling Enabled</div>
                </div>
            </div>

            <div className="placeholder-section" style={{
                padding: '4rem',
                textAlign: 'center',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '2rem',
                marginTop: '3rem',
                border: '1px dashed rgba(255,255,255,0.1)'
            }}>
                <Database size={48} color="#10b981" style={{ marginBottom: '1.5rem', opacity: 0.5 }} />
                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white' }}>Deep RDS Analytics Pending</h3>
                <p style={{ color: 'rgba(255,255,255,0.5)', maxWidth: '500px', margin: '1rem auto' }}>
                    Engine-specific performance insights (MySQL/PostgreSQL) and I/O utilization reports are being generated.
                </p>
            </div>
        </div>
    );
}

export default RDSAnalytics;
