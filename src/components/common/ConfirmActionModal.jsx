import { AlertTriangle, X } from 'lucide-react';
import { useState } from 'react';
import '../../css/common/ConfirmActionModal.css';;

function ConfirmActionModal({
    isOpen,
    title = 'Confirm Change',
    message,
    onConfirm,
    onCancel
}) {
    const [isConfirming, setIsConfirming] = useState(false);

    if (!isOpen) return null;

    const handleConfirm = async () => {
        if (!onConfirm) return;
        setIsConfirming(true);
        await onConfirm();
        setIsConfirming(false);
    };

    return (
        <div className="modal-overlay">
            <div className="confirm-modal-elevated">
                <button className="confirm-close" onClick={onCancel}>
                    <X size={18} />
                </button>

                {/* Icon */}
                <div className="confirm-header">
                    <div className="confirm-icon-wrapper">
                        <AlertTriangle size={26} />
                    </div>

                    {/* Content */}
                    <div className="confirm-title">{title}</div>
                </div>
                <div className="confirm-message">
                    {message}
                </div>

                {/* Footer */}
                <div className="confirm-actions">
                    <button
                        className="btn-secondary"
                        onClick={onCancel}
                        disabled={isConfirming}
                    >
                        Cancel
                    </button>

                    <button
                        className="btn-primary-danger"
                        onClick={handleConfirm}
                        disabled={isConfirming}
                    >
                        {isConfirming ? 'Applying changes…' : 'Yes, apply changes'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ConfirmActionModal;