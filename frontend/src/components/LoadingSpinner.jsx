import { Spinner, Container } from 'react-bootstrap';

const LoadingSpinner = () => {
    return (
        <div
            style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '100vh',
                background: 'rgba(224, 234, 252, 0.5)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)'
            }}
        >
            <div style={{ textAlign: 'center' }}>
                <Spinner
                    animation="border"
                    role="status"
                    style={{
                        color: '#667eea',
                        width: '60px',
                        height: '60px',
                        borderWidth: '4px',
                        marginBottom: '20px'
                    }}
                >
                    <span className="visually-hidden">Loading...</span>
                </Spinner>
                <div
                    style={{
                        marginTop: '16px',
                        color: '#667eea',
                        fontSize: '16px',
                        fontWeight: '600',
                        letterSpacing: '0.5px'
                    }}
                >
                    Loading
                </div>
            </div>
        </div>
    );
};

export default LoadingSpinner;
