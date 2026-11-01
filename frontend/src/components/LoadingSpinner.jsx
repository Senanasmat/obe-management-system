import { Spinner } from 'react-bootstrap';

const LoadingSpinner = ({
    label = 'Loading',
    fullScreen = false,
    size = 'md',
    className = ''
}) => {
    const dimension = size === 'sm' ? 24 : 42;

    return (
        <div
            className={`d-flex flex-column justify-content-center align-items-center text-muted ${className}`}
            role="status"
            aria-live="polite"
            style={{
                minHeight: fullScreen ? '100vh' : size === 'sm' ? '80px' : '180px',
                width: '100%',
                background: fullScreen ? 'rgba(224, 234, 252, 0.35)' : undefined
            }}
        >
            <Spinner
                animation="border"
                style={{
                    color: '#667eea',
                    width: dimension,
                    height: dimension,
                    borderWidth: size === 'sm' ? '3px' : '4px'
                }}
            >
                <span className="visually-hidden">{label}...</span>
            </Spinner>
            <span className="mt-2 small">{label}</span>
        </div>
    );
};

export default LoadingSpinner;
