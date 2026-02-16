import React from 'react';
import '../../css/ecs/BulkServiceActionModal.css'

const BulkServiceActionModal = ({
    open,
    action,
    mode,
    setMode,
    file,
    setFile,
    onConfirmAll,
    onConfirmSelective,
    onClose,
    loading
}) => {
    if (!open) return null;

    const actionLabel = action === 'START' ? 'Start' : 'Stop';
    const isStop = action === 'STOP';

    return (
        <div className="modal-overlay">
            <div className="modal bulk-modal">

                {/* HEADER */}
                <div className="modal-header">
                    <h3>{actionLabel} Services</h3>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>

                {/* BODY */}
                <div className="modal-body">

                    {/* STEP 1: MODE SELECTION */}
                    {mode === null && (
                        <>
                            <p className="modal-subtitle">
                                Choose how you want to {actionLabel.toLowerCase()} services.
                            </p>

                            <div className="choice-grid">
                                <button
                                    className="choice-card primary"
                                    onClick={onConfirmAll}
                                >
                                    <h4>{actionLabel} All</h4>
                                    <p>
                                        Apply this action to <strong>all services</strong> in the cluster
                                    </p>
                                </button>

                                <button
                                    className="choice-card secondary"
                                    onClick={() => setMode('SELECTIVE')}
                                >
                                    <h4>{actionLabel} Selected</h4>
                                    <p>
                                        Upload a file to {actionLabel.toLowerCase()} specific services
                                    </p>
                                </button>
                            </div>

                            {isStop && (
                                <p className="warning-text">
                                    ⚠️ Stopping services may impact live traffic.
                                </p>
                            )}
                        </>
                    )}


                    {/* STEP 2: FILE UPLOAD */}
                    {mode === 'SELECTIVE' && (
                        <>
                            <p className="modal-subtitle">
                                Upload a CSV or TXT file containing service names
                            </p>

                            <input
                                type="file"
                                accept=".csv,.txt"
                                onChange={(e) => setFile(e.target.files[0])}
                            />

                            {file && (
                                <p className="file-preview">
                                    Selected file: <strong>{file.name}</strong>
                                </p>
                            )}
                        </>
                    )}

                    {/* STEP 2 (ALT): ALL SERVICES INFO */}
                    {mode === 'ALL' && (
                        <>
                            <p className="modal-subtitle">
                                This will {actionLabel.toLowerCase()} <strong>all services</strong> in the cluster.
                            </p>

                            {isStop && (
                                <p className="warning-text">
                                    ⚠️ This action will stop every running service.
                                </p>
                            )}
                        </>
                    )}

                </div>

                {/* FOOTER */}
                <div className="modal-footer">

                    {mode !== null && (
                        <button
                            className="btn btn-link"
                            onClick={() => setMode(null)}
                            disabled={loading}
                        >
                            ← Back
                        </button>
                    )}

                    <div className="footer-actions">
                        {mode === 'ALL' && (
                            <button
                                className={`btn ${isStop ? 'btn-danger' : 'btn-primary'}`}
                                onClick={onConfirmAll}
                                disabled={loading}
                            >
                                {loading ? 'Processing...' : `Confirm ${actionLabel}`}
                            </button>
                        )}

                        {mode === 'SELECTIVE' && (
                            <button
                                className={`btn ${isStop ? 'btn-danger' : 'btn-primary'}`}
                                onClick={onConfirmSelective}
                                disabled={!file || loading}
                            >
                                {loading ? 'Processing...' : `${actionLabel} Services`}
                            </button>
                        )}

                        <button
                            className="btn btn-secondary"
                            onClick={onClose}
                            disabled={loading}
                        >
                            Cancel
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default BulkServiceActionModal;

