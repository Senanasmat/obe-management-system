import { useEffect, useState } from 'react';

const Toast = ({ message, type = 'success', duration = 3000, onClose }) => {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(false);
            if (onClose) onClose();
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onClose]);

    if (!isVisible) return null;

    const bgColor = {
        success: '#10b981',
        error: '#ef4444',
        info: '#3b82f6',
        warning: '#f59e0b'
    }[type];

    const bgColorLight = {
        success: '#d1fae5',
        error: '#fee2e2',
        info: '#dbeafe',
        warning: '#fef3c7'
    }[type];

    const textColor = {
        success: '#065f46',
        error: '#7f1d1d',
        info: '#1e40af',
        warning: '#92400e'
    }[type];

    return (
        <div
            style={{
                position: 'fixed',
                top: '20px',
                right: '20px',
                backgroundColor: bgColorLight,
                color: textColor,
                padding: '16px 20px',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                border: `2px solid ${bgColor}`,
                fontSize: '14px',
                fontWeight: '500',
                minWidth: '300px',
                maxWidth: '400px',
                animation: 'slideIn 0.3s ease-out',
                zIndex: 9999
            }}
        >
            {message}
            <style>{`
                @keyframes slideIn {
                    from {
                        transform: translateX(400px);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
            `}</style>
        </div>
    );
};

export default Toast;
