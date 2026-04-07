import React, { useState } from 'react';
import {
    Settings as SettingsIcon,
    Calendar,
    Clock,
    Save,
    User,
    Server,
    Boxes,
    Database,
    Cpu,
    CheckCircle2,
    ScrollText,
    TrendingUp,
    Activity,
    Layers
} from 'lucide-react';
import '../../css/home/Settings.css';
import Logs from './Logs';

const Settings = () => {
    const [activeTab, setActiveTab] = useState('schedulers');
    const [successMessage, setSuccessMessage] = useState('');

    const [serviceSchedules, setServiceSchedules] = useState({
        ec2: { enabled: true, startTime: '09:00', endTime: '18:00' },
        ecs: { enabled: false, startTime: '10:00', endTime: '20:00' },
        eks: { enabled: true, startTime: '08:30', endTime: '17:30' },
        rds: { enabled: false, startTime: '07:00', endTime: '22:00' },
        asg: { enabled: true, startTime: '09:00', endTime: '18:00' },
    });

    const DEFAULT_SCHEDULE = { enabled: false, startTime: '09:00', endTime: '18:00' };

    const handleToggle = (service) => {
        setServiceSchedules(prev => ({
            ...prev,
            [service]: { ...(prev[service] || DEFAULT_SCHEDULE), enabled: !(prev[service] || DEFAULT_SCHEDULE).enabled }
        }));
    };

    const handleTimeChange = (service, type, value) => {
        setServiceSchedules(prev => ({
            ...prev,
            [service]: { ...(prev[service] || DEFAULT_SCHEDULE), [type]: value }
        }));
    };

    const handleSubmit = (serviceId) => {
        console.log(`Saving schedule for ${serviceId}:`, serviceSchedules[serviceId]);
        setSuccessMessage(`${serviceId.toUpperCase()} settings saved successfully!`);
        setTimeout(() => setSuccessMessage(''), 3000);
    };

    const services = [
        { id: 'ec2', name: 'EC2 Instances', icon: Server, color: 'purple', desc: 'Virtual compute servers' },
        { id: 'ecs', name: 'ECS Clusters', icon: Cpu, color: 'cyan', desc: 'Container orchestration' },
        { id: 'eks', name: 'EKS Clusters', icon: Boxes, color: 'teal', desc: 'Kubernetes management' },
        { id: 'rds', name: 'RDS Databases', icon: Database, color: 'blue', desc: 'Relational DB service' },
        { id: 'asg', name: 'Auto Scaling Groups', icon: Layers, color: 'orange', desc: 'Dynamic scaling policies' },
    ];

    const tabs = [
        { id: 'schedulers', label: 'Schedulers', icon: Calendar },
        { id: 'logs', label: 'Logs', icon: ScrollText },
        { id: 'account', label: 'Account', icon: User, disabled: true },
    ];

    return (
        <div className="settings-container">
            {/* Page Header */}
            <div className="page-header-modern">
                <div className="header-content">
                    <div className="header-left-section">
                        <div className="header-icon-modern">
                            <SettingsIcon size={40} />
                        </div>
                        <div className="header-text-column">
                            <h1 className="page-title-modern">Settings</h1>
                            <p className="page-subtitle-modern">Configure your personal preferences and system schedulers</p>
                        </div>
                    </div>
                    <div className="header-status-pill">
                        <Activity size={14} />
                        <span>System Active</span>
                    </div>
                </div>

                {/* Top Tab Bar */}
                <div className="settings-top-tabs">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            className={`stab-btn ${activeTab === tab.id ? 'stab-active' : ''} ${tab.disabled ? 'stab-disabled' : ''}`}
                            onClick={() => !tab.disabled && setActiveTab(tab.id)}
                            disabled={tab.disabled}
                        >
                            <tab.icon size={16} />
                            <span>{tab.label}</span>
                            {tab.disabled && <span className="stab-soon">Soon</span>}
                        </button>
                    ))}
                    <div className="stab-ink" style={{
                        '--ink-offset': `${tabs.findIndex(t => t.id === activeTab) * 100}%`
                    }} />
                </div>
            </div>

            {/* Content Area */}
            <div className="settings-content-area">
                {/* SCHEDULERS TAB */}
                {activeTab === 'schedulers' && (
                    <div className="schedulers-view">
                        <div className="section-header">
                            <div className="section-header-left">
                                <h2>Resource Scheduling</h2>
                                <p>Automate your AWS resources start/stop cycles to optimize costs.</p>
                            </div>
                        </div>

                        <div className="schedulers-grid">
                            {services.map((service) => (
                                <div key={service.id} className={`scheduler-card card-${service.color}`}>
                                    <div className="card-accent-bar" />
                                    <div className="card-header">
                                        <div className="service-info">
                                            <div className={`service-icon icon-${service.color}`}>
                                                <service.icon size={20} />
                                            </div>
                                            <div className="service-text">
                                                <h3>{service.name}</h3>
                                                <span className="service-desc">{service.desc}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="card-body">
                                        <div className="question-row">
                                            <p className="description">Do you want to keep the cron jobs on?</p>
                                            <div className="toggle-wrapper">
                                                <label className="premium-switch">
                                                    <input
                                                        type="checkbox"
                                                        checked={(serviceSchedules[service.id] || DEFAULT_SCHEDULE).enabled}
                                                        onChange={() => handleToggle(service.id)}
                                                    />
                                                    <span className="premium-slider"></span>
                                                </label>
                                            </div>
                                        </div>
                                        <div className="time-inputs">
                                            <div className="time-field">
                                                <label>Starting Time</label>
                                                <div className={`time-input-wrapper-premium ${!(serviceSchedules[service.id] || DEFAULT_SCHEDULE).enabled ? 'disabled' : ''}`}>
                                                    <Clock className="time-icon-inner" size={16} />
                                                    <input
                                                        type="time"
                                                        className="premium-time-input"
                                                        value={(serviceSchedules[service.id] || DEFAULT_SCHEDULE).startTime}
                                                        onChange={(e) => handleTimeChange(service.id, 'startTime', e.target.value)}
                                                        onClick={(e) => (serviceSchedules[service.id] || DEFAULT_SCHEDULE).enabled && e.target.showPicker?.()}
                                                        disabled={!(serviceSchedules[service.id] || DEFAULT_SCHEDULE).enabled}
                                                    />
                                                </div>
                                            </div>
                                            <div className="time-field">
                                                <label>Closing Time</label>
                                                <div className={`time-input-wrapper-premium ${!(serviceSchedules[service.id] || DEFAULT_SCHEDULE).enabled ? 'disabled' : ''}`}>
                                                    <Clock className="time-icon-inner" size={16} />
                                                    <input
                                                        type="time"
                                                        className="premium-time-input"
                                                        value={(serviceSchedules[service.id] || DEFAULT_SCHEDULE).endTime}
                                                        onChange={(e) => handleTimeChange(service.id, 'endTime', e.target.value)}
                                                        onClick={(e) => (serviceSchedules[service.id] || DEFAULT_SCHEDULE).enabled && e.target.showPicker?.()}
                                                        disabled={!(serviceSchedules[service.id] || DEFAULT_SCHEDULE).enabled}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="card-footer-inner">
                                        <div className={`status-dot ${(serviceSchedules[service.id] || DEFAULT_SCHEDULE).enabled ? 'status-on' : 'status-off'}`}>
                                            <span>{(serviceSchedules[service.id] || DEFAULT_SCHEDULE).enabled ? 'Enabled' : 'Disabled'}</span>
                                        </div>
                                        <button
                                            className="card-submit-button"
                                            onClick={() => handleSubmit(service.id)}
                                        >
                                            <Save size={14} />
                                            <span>Save</span>
                                        </button>
                                    </div>
                                </div>
                            ))}

                            {/* 6th Slot — Coming Soon Placeholder
                            <div className="scheduler-card card-coming-soon">
                                <div className="coming-soon-inner">
                                    <div className="coming-soon-icon">
                                        <Boxes size={28} />
                                    </div>
                                    <h3>More Services</h3>
                                    <p>Additional scheduler integrations coming soon</p>
                                    <span className="coming-soon-badge">Coming Soon</span>
                                </div>
                            </div> */}
                        </div>
                    </div>
                )}

                {/* LOGS TAB */}
                {activeTab === 'logs' && (
                    <div className="logs-view">
                        <Logs />
                    </div>
                )}

                {/* ACCOUNT TAB (disabled, won't render normally) */}
                {activeTab === 'account' && (
                    <div className="placeholder-view">
                        <h2>Account Settings</h2>
                        <p>This module is currently in development.</p>
                    </div>
                )}
            </div>

            {successMessage && (
                <div className="success-toast">
                    <CheckCircle2 size={18} />
                    <span>{successMessage}</span>
                </div>
            )}
        </div>
    );
};

export default Settings;
