import React, { useState, useEffect } from 'react';
import { Play, Square, X, ChevronLeft, CheckCircle, Database } from 'lucide-react';
import '../../css/rds/RDSBulkActionModal.css';

const RDSBulkActionModal = ({
    isOpen,
    onClose,
    action, // 'START' or 'STOP'
    selectedCount,
    totalCount,
    onConfirm
}) => {
    const [step, setStep] = useState(1);
    const [mode, setMode] = useState(null); // 'ALL' or 'SELECTED'
    const [isProcessing, setIsProcessing] = useState(false);

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setStep(1);
            setMode(null);
            setIsProcessing(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const isStop = action === 'STOP';
    const actionLabel = isStop ? 'Stop' : 'Start';
    const Icon = isStop ? Square : Play;

    const handleNextStep = (selectedMode) => {
        setMode(selectedMode);
        setStep(2);
    };

    const handleConfirm = async () => {
        setIsProcessing(true);
        await onConfirm(action, mode);
        setIsProcessing(false);
        onClose();
    };

    return (
        <div className="rds-bulk-overlay">
            <div className={`rds-bulk-modal ${isStop ? 'stop' : 'start'}`}>
                <div className="rds-bulk-content">
                    {/* Header */}
                    <header className={`rds-bulk-header ${isStop ? 'stop' : 'start'}`}>
                        <h2>
                            <Icon size={28} />
                            {actionLabel} Databases
                        </h2>
                        <button className="rds-bulk-close" onClick={onClose} disabled={isProcessing}>
                            <X size={20} />
                        </button>
                    </header>

                    {/* Body */}
                    <div className="rds-bulk-body">
                        {step === 1 ? (
                            <>
                                <p className="rds-bulk-subtitle">
                                    Choose the scope for this bulk operation.
                                </p>
                                <div className="rds-bulk-choices">
                                    <div
                                        className="rds-choice-card"
                                        onClick={() => handleNextStep('ALL')}
                                    >
                                        <div className="rds-choice-icon">
                                            <Database size={24} />
                                        </div>
                                        <h3>{actionLabel} All</h3>
                                        <p>Apply to all {totalCount} databases</p>
                                    </div>

                                    <div
                                        className={`rds-choice-card ${selectedCount === 0 ? 'disabled' : ''}`}
                                        onClick={() => selectedCount > 0 && handleNextStep('SELECTED')}
                                        style={selectedCount === 0 ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                                    >
                                        <div className="rds-choice-icon">
                                            <CheckCircle size={24} />
                                        </div>
                                        <h3>{actionLabel} Selected</h3>
                                        <p>{selectedCount} databases currently selected</p>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="rds-bulk-info">
                                <p className="rds-bulk-subtitle">
                                    Confirming bulk {actionLabel.toLowerCase()} action.
                                </p>
                                <div className="rds-info-summary">
                                    <div className="rds-info-count">
                                        {mode === 'ALL' ? totalCount : selectedCount}
                                    </div>
                                    <div className="rds-info-label">
                                        Databases to {actionLabel.toLowerCase()}
                                    </div>
                                </div>

                                {isStop && (
                                    <div className="rds-warning-box">
                                        <X size={18} />
                                        <div>
                                            <strong>Warning:</strong> This will stop the selected resources. Ensure no active traffic will be affected.
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <footer className="rds-bulk-footer">
                        {step === 2 && (
                            <button
                                className="btn-bulk back"
                                onClick={() => setStep(1)}
                                disabled={isProcessing}
                            >
                                <ChevronLeft size={16} /> Back
                            </button>
                        )}

                        <button className="btn-bulk secondary" onClick={onClose} disabled={isProcessing}>
                            Cancel
                        </button>

                        {step === 2 && (
                            <button
                                className="btn-bulk primary"
                                onClick={handleConfirm}
                                disabled={isProcessing}
                            >
                                {isProcessing ? 'Processing...' : `Confirm Bulk ${actionLabel}`}
                            </button>
                        )}
                    </footer>
                </div>
            </div>
        </div>
    );
};

export default RDSBulkActionModal;
