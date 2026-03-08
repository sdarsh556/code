import React, { useState } from 'react';
import {
    Settings as SettingsIcon,
    Calendar,
    Clock,
    Save,
    Shield,
    User,
    Server,
    Boxes,
    Database,
    Cpu,
    CheckCircle2
} from 'lucide-react';
import '../../css/home/Settings.css';

const Settings = () => {
    const [activeTab, setActiveTab] = useState('schedulers');
    const [successMessage, setSuccessMessage] = useState('');

    const [schedules, setSchedules] = useState({
        ec2: { enabled: true, startTime: '09:00', endTime: '18:00' },
        ecs: { enabled: false, startTime: '10:00', endTime: '20:00' },
        eks: { enabled: true, startTime: '08:30', endTime: '17:30' },
        rds: { enabled: false, startTime: '07:00', endTime: '22:00' }
    });

    const handleToggle = (service) => {
        setSchedules(prev => ({
            ...prev,
            [service]: { ...prev[service], enabled: !prev[service].enabled }
        }));
    };

    const handleTimeChange = (service, type, value) => {
        setSchedules(prev => ({
            ...prev,
            [service]: { ...prev[service], [type]: value }
        }));
    };

    const handleSubmit = (serviceId) => {
        console.log(`Saving schedule for ${serviceId}:`, schedules[serviceId]);
        setSuccessMessage(`${serviceId.toUpperCase()} settings saved successfully!`);
        setTimeout(() => setSuccessMessage(''), 3000);
    };

    const services = [
        { id: 'ec2', name: 'EC2 Instances', icon: Server, color: 'blue' },
        { id: 'ecs', name: 'ECS Clusters', icon: Cpu, color: 'teal' },
        { id: 'eks', name: 'EKS Clusters', icon: Boxes, color: 'purple' },
        { id: 'rds', name: 'RDS Databases', icon: Database, color: 'orange' }
    ];

    return (
        <div className="settings-container">
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
                </div>
            </div>

            <div className="settings-layout">
                <aside className="settings-sidebar">
                    <button
                        className={`settings-tab-btn ${activeTab === 'schedulers' ? 'active' : ''}`}
                        onClick={() => setActiveTab('schedulers')}
                    >
                        <Calendar size={18} />
                        <span>Schedulers</span>
                    </button>
                    <button
                        className={`settings-tab-btn ${activeTab === 'account' ? 'active' : 'disabled'}`}
                        disabled={true}
                    >
                        <User size={18} />
                        <span>Account Settings</span>
                        <span className="coming-soon">Soon</span>
                    </button>
                    <button
                        className={`settings-tab-btn ${activeTab === 'security' ? 'active' : 'disabled'}`}
                        disabled={true}
                    >
                        <Shield size={18} />
                        <span>Security</span>
                        <span className="coming-soon">Soon</span>
                    </button>
                </aside>

                <main className="settings-content">
                    {activeTab === 'schedulers' && (
                        <div className="schedulers-view">
                            <div className="section-header">
                                <h2>Resource Scheduling</h2>
                                <p>Automate your AWS resources start/stop cycles to optimize costs.</p>
                            </div>

                            <div className="schedulers-grid">
                                {services.map((service) => (
                                    <div key={service.id} className={`scheduler-card card-${service.color}`}>
                                        <div className="card-header">
                                            <div className="service-info">
                                                <div className="service-icon">
                                                    <service.icon size={20} />
                                                </div>
                                                <h3>{service.name}</h3>
                                            </div>
                                        </div>

                                        <div className="card-body">
                                            <div className="question-row">
                                                <p className="description">Do you want to keep the cron jobs on?</p>
                                                <div className="toggle-wrapper">
                                                    <label className="premium-switch">
                                                        <input
                                                            type="checkbox"
                                                            checked={schedules[service.id].enabled}
                                                            onChange={() => handleToggle(service.id)}
                                                        />
                                                        <span className="premium-slider"></span>
                                                    </label>
                                                </div>
                                            </div>

                                            <div className="time-inputs">
                                                <div className="time-field">
                                                    <label>Starting Time</label>
                                                    <div className="time-input-wrapper-premium">
                                                        <Clock className="time-icon-inner" size={16} />
                                                        <input
                                                            type="time"
                                                            className="premium-time-input"
                                                            value={schedules[service.id].startTime}
                                                            onChange={(e) => handleTimeChange(service.id, 'startTime', e.target.value)}
                                                            onClick={(e) => e.target.showPicker?.()}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="time-field">
                                                    <label>Closing Time</label>
                                                    <div className="time-input-wrapper-premium">
                                                        <Clock className="time-icon-inner" size={16} />
                                                        <input
                                                            type="time"
                                                            className="premium-time-input"
                                                            value={schedules[service.id].endTime}
                                                            onChange={(e) => handleTimeChange(service.id, 'endTime', e.target.value)}
                                                            onClick={(e) => e.target.showPicker?.()}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="card-footer-inner">
                                            <button
                                                className="card-submit-button"
                                                onClick={() => handleSubmit(service.id)}
                                            >
                                                <Save size={14} />
                                                <span>Save Changes</span>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'account' && (
                        <div className="placeholder-view">
                            <h2>Account Settings</h2>
                            <p>This module is currently in development.</p>
                        </div>
                    )}

                    {activeTab === 'security' && (
                        <div className="placeholder-view">
                            <h2>Security Settings</h2>
                            <p>This module is currently in development.</p>
                        </div>
                    )}
                </main>
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
