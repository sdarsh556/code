import React, { useState, useEffect, useRef } from 'react';
import { X, Settings, CheckCircle2, XCircle, Upload, Zap } from 'lucide-react';
import '../../css/ecs/ServiceSelectionModal.css';

const ServiceSelectionModal = ({ 
    isOpen, 
    onClose, 
    clusterName, 
    services = [], 
    onSubmit 
}) => {
    const [selectedServices, setSelectedServices] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const fileInputRef = useRef(null);

    // Initialize selection state when services change or modal opens
    useEffect(() => {
        if (isOpen && services.length > 0) {
            const initial = {};
            services.forEach(svc => {
                // Default to true if not already set, or keep existing if toggling manually
                initial[svc.name] = true;
            });
            setSelectedServices(initial);
        }
    }, [isOpen, services]);

    if (!isOpen) return null;

    const handleToggle = (serviceName) => {
        setSelectedServices(prev => ({
            ...prev,
            [serviceName]: !prev[serviceName]
        }));
    };

    const handleEnableAll = () => {
        const updated = {};
        services.forEach(svc => { updated[svc.name] = true; });
        setSelectedServices(updated);
    };

    const handleDisableAll = () => {
        const updated = {};
        services.forEach(svc => { updated[svc.name] = false; });
        setSelectedServices(updated);
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target.result;
            const lines = content.split(/\r?\n/);
            const updated = { ...selectedServices };

            lines.forEach(line => {
                if (!line.trim()) return;
                const parts = line.split(',');
                if (parts.length >= 2) {
                    const name = parts[0].trim();
                    const value = parts[1].trim().toLowerCase() === 'true';
                    
                    // Only update if service exists in our list
                    if (services.some(s => s.name === name)) {
                        updated[name] = value;
                    }
                }
            });

            setSelectedServices(updated);
            // Reset input
            e.target.value = null;
        };
        reader.readAsText(file);
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            await onSubmit(selectedServices);
            onClose();
        } catch (err) {
            console.error('Failed to submit service selection:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="ss-modal-overlay" onClick={onClose}>
            <div className="ss-modal-content" onClick={e => e.stopPropagation()}>
                <div className="ss-modal-header">
                    <div className="ss-modal-title-group">
                        <Settings className="ss-modal-icon" size={24} />
                        <h2>Service Schedule Selection</h2>
                    </div>
                    <button className="ss-close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="ss-modal-body">
                    <div className="ss-body-header">
                        <span className="ss-section-label">
                            Target Cluster: <span style={{ color: '#3b82f6' }}>{clusterName}</span>
                        </span>
                        <span className="ss-section-label">Toggle Services for Scheduling</span>
                    </div>

                    <div className="ss-services-grid">
                        {services.map(svc => (
                            <div key={svc.name} className="ss-service-item">
                                <span className="ss-service-name" title={svc.name}>
                                    {svc.name}
                                </span>
                                <label className="ss-switch">
                                    <input 
                                        type="checkbox" 
                                        checked={selectedServices[svc.name] || false}
                                        onChange={() => handleToggle(svc.name)}
                                    />
                                    <span className="ss-slider"></span>
                                </label>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="ss-modal-footer">
                    <div className="ss-footer-left">
                        <button className="ss-btn-bulk ss-btn-enable" onClick={handleEnableAll}>
                            <CheckCircle2 size={16} />
                            <span>Enable All</span>
                        </button>
                        <button className="ss-btn-bulk ss-btn-disable" onClick={handleDisableAll}>
                            <XCircle size={16} />
                            <span>Disable All</span>
                        </button>
                        <button className="ss-btn-bulk ss-btn-upload" onClick={() => fileInputRef.current?.click()}>
                            <Upload size={16} />
                            <span>Upload</span>
                        </button>
                        <input 
                            ref={fileInputRef}
                            type="file" 
                            accept=".txt,.csv" 
                            style={{ display: 'none' }} 
                            onChange={handleFileUpload}
                        />
                    </div>

                    <button 
                        className="ss-btn-submit" 
                        disabled={isSubmitting}
                        onClick={handleSubmit}
                    >
                        {isSubmitting ? 'Processing...' : 'Submit Schedule'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ServiceSelectionModal;
