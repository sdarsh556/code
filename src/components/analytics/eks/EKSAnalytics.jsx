import React from 'react';
import { Boxes, TrendingUp, Activity, Zap, Shield, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import '../../../css/analytics/ecs/ClusterDetails.css'; // Corrected casing

function EKSAnalytics() {
    const navigate = useNavigate();

    return (
        <div className="cluster-details-page">
            <div className="details-hero">
                <div className="hero-content">
                    <div className="breadcrumb" onClick={() => navigate('/analytics')}>
                        <TrendingUp size={14} />
                        ANALYTICS / EKS
                    </div>
                    <h1 className="hero-title">EKS Kubernetes <span className="gradient-text">Analytics</span></h1>
                    <p className="hero-subtitle">
                        Advanced workload observation, pod utilization trends, and architectural cost analysis for EKS clusters.
                    </p>
                </div>
            </div>

            <div className="stats-grid" style={{ marginTop: '2rem' }}>
                <div className="stat-card">
                    <div className="stat-header">
                        <Activity size={18} color="#ec4899" />
                        <span>WORKLOAD HEALTH</span>
                    </div>
                    <div className="stat-value">99.8%</div>
                    <div className="stat-meta">Across 4 Clusters</div>
                </div>
                <div className="stat-card">
                    <div className="stat-header">
                        <Zap size={18} color="#f59e0b" />
                        <span>POD UTILIZATION</span>
                    </div>
                    <div className="stat-value">64%</div>
                    <div className="stat-meta">CPU / Memory Mean</div>
                </div>
                <div className="stat-card">
                    <div className="stat-header">
                        <Shield size={18} color="#10b981" />
                        <span>NODE STABILITY</span>
                    </div>
                    <div className="stat-value">Active</div>
                    <div className="stat-meta">Zero Disruptions</div>
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
                <Boxes size={48} color="#ec4899" style={{ marginBottom: '1.5rem', opacity: 0.5 }} />
                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white' }}>In-Depth EKS Metrics Incoming</h3>
                <p style={{ color: 'rgba(255,255,255,0.5)', maxWidth: '500px', margin: '1rem auto' }}>
                    We are currently aggregating high-resolution pod metrics and cost allocation data for your Kubernetes environment.
                </p>
            </div>
        </div>
    );
}

export default EKSAnalytics;
