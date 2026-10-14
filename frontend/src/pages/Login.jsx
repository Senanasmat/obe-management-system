import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Form, Button, Alert, ButtonGroup, ToggleButton, Modal } from 'react-bootstrap';
import { Lock, Mail, Eye, EyeOff } from 'lucide-react';
import Toast from '../components/Toast';
import api from '../utils/api';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('faculty');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const { login, logout } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [showForgotModal, setShowForgotModal] = useState(false);
    const [forgotEmail, setForgotEmail] = useState('');
    const [forgotLoading, setForgotLoading] = useState(false);
    const [forgotMessage, setForgotMessage] = useState('');
    const [forgotError, setForgotError] = useState('');

    const handleForgotPassword = async (e) => {
        e.preventDefault();
        setForgotLoading(true);
        setForgotMessage('');
        setForgotError('');

        try {
            const { data } = await api.post('/api/users/forgot-password', {
                email: forgotEmail
            });
            setForgotMessage(data.message);
        } catch (err) {
            setForgotError(
                err.response?.data?.message ||
                'Could not send a reset link. Please try again.'
            );
        } finally {
            setForgotLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            const res = await login(email, password);
            if (res.success) {
                if (res.data.role !== role) {
                    logout();
                    setError(`Access Denied: Account role mismatch. Please login as ${res.data.role === 'admin' ? 'Super Admin' : 'Faculty'}.`);
                    setLoading(false);
                    return;
                }
                setSuccess('Login Successful! Redirecting...');
                setTimeout(() => {
                    navigate(role === 'admin' ? '/admin' : '/faculty');
                }, 1500);
            } else {
                setError(res.message);
                setLoading(false);
            }
        } catch (err) {
            setError('An unexpected error occurred.');
            setLoading(false);
        }
    };

    return (
        <>
            {success && <Toast message={success} type="success" duration={3000} />}
            <div style={{
                minHeight: '100vh',
                background: 'rgba(224, 234, 252, 0.5)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px'
            }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    maxWidth: '400px',
                    width: '100%'
                }}>
                    {/* Login Form */}
                    <div style={{
                        background: 'rgba(255, 255, 255, 0.95)',
                        borderRadius: '20px',
                        padding: '35px 30px',
                        boxShadow: '0 20px 60px rgba(102, 126, 234, 0.15)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255, 255, 255, 1)',
                        WebkitBackdropFilter: 'blur(10px)',
                        width: '100%'
                    }}>
                    <h3 style={{
                        fontSize: '24px',
                        fontWeight: '700',
                        marginBottom: '8px',
                        color: '#2d1b4e',
                        letterSpacing: '-0.5px'
                    }}>Log In</h3>
                    <p style={{
                        fontSize: '13px',
                        color: '#6b7280',
                        marginBottom: '24px',
                        fontWeight: '500'
                    }}>Access your OBE Management System</p>

                    {error && (
                        <Alert variant="danger" className="border-0 bg-danger-subtle text-danger py-2 d-flex align-items-center mb-3" style={{ fontSize: '0.85rem' }}>
                            <Lock size={16} className="me-2" /> {error}
                        </Alert>
                    )}

                    <Form onSubmit={handleSubmit}>
                        {/* Role Selection */}
                        <div style={{ marginBottom: '24px' }}>
                            <label style={{
                                fontSize: '12px',
                                fontWeight: '600',
                                color: '#666',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                display: 'block',
                                marginBottom: '10px'
                            }}>Select Role</label>
                            <ButtonGroup className="w-100" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                {['faculty', 'admin'].map((radioValue) => (
                                    <ToggleButton
                                        key={radioValue}
                                        id={`radio-${radioValue}`}
                                        type="radio"
                                        variant={role === radioValue ? 'primary' : 'outline-secondary'}
                                        name="radio"
                                        value={radioValue}
                                        checked={role === radioValue}
                                        onChange={(e) => setRole(e.currentTarget.value)}
                                        className="border-0 py-2"
                                        style={{
                                            borderRadius: '10px',
                                            fontSize: '13px',
                                            fontWeight: '600',
                                            background: role === radioValue ? '#667eea' : '#f5f5f5',
                                            color: role === radioValue ? 'white' : '#666',
                                            border: 'none',
                                            cursor: 'pointer',
                                            transition: 'all 0.3s'
                                        }}
                                    >
                                        {radioValue === 'admin' ? 'Admin' : 'Faculty'}
                                    </ToggleButton>
                                ))}
                            </ButtonGroup>
                        </div>

                        {/* Email Field */}
                        <Form.Group className="mb-3">
                            <Form.Label style={{ fontSize: '12px', fontWeight: '600', color: '#666', marginBottom: '8px' }}>Your Email</Form.Label>
                            <div style={{ position: 'relative' }}>
                                <Form.Control
                                    type="email"
                                    placeholder="name@example.com"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    style={{
                                        paddingLeft: '40px',
                                        paddingRight: '16px',
                                        paddingTop: '14px',
                                        paddingBottom: '14px',
                                        border: '1.5px solid rgba(102, 126, 234, 0.5)',
                                        borderRadius: '12px',
                                        fontSize: '15px',
                                        background: 'rgba(255, 255, 255, 0.95)',
                                        color: '#333',
                                        backdropFilter: 'blur(5px)',
                                        WebkitBackdropFilter: 'blur(5px)',
                                        transition: 'all 0.3s ease',
                                        boxShadow: '0 4px 15px rgba(102, 126, 234, 0.15)'
                                    }}
                                    onFocus={(e) => {
                                        e.target.style.background = 'rgba(255, 255, 255, 1)';
                                        e.target.style.borderColor = 'rgba(102, 126, 234, 0.8)';
                                        e.target.style.boxShadow = '0 4px 20px rgba(102, 126, 234, 0.3)';
                                    }}
                                    onBlur={(e) => {
                                        e.target.style.background = 'rgba(255, 255, 255, 0.95)';
                                        e.target.style.borderColor = 'rgba(102, 126, 234, 0.5)';
                                        e.target.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.15)';
                                    }}
                                />
                                <Mail size={18} style={{
                                    position: 'absolute',
                                    left: '12px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: '#999'
                                }} />
                            </div>
                        </Form.Group>

                        {/* Password Field */}
                        <Form.Group className="mb-3">
                            <Form.Label style={{ fontSize: '12px', fontWeight: '600', color: '#666', marginBottom: '8px' }}>Your Password</Form.Label>
                            <div style={{ position: 'relative' }}>
                                <Form.Control
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    style={{
                                        paddingLeft: '40px',
                                        paddingRight: '45px',
                                        paddingTop: '14px',
                                        paddingBottom: '14px',
                                        border: '1.5px solid rgba(102, 126, 234, 0.5)',
                                        borderRadius: '12px',
                                        fontSize: '15px',
                                        background: 'rgba(255, 255, 255, 0.95)',
                                        color: '#333',
                                        backdropFilter: 'blur(5px)',
                                        WebkitBackdropFilter: 'blur(5px)',
                                        transition: 'all 0.3s ease',
                                        boxShadow: '0 4px 15px rgba(102, 126, 234, 0.15)'
                                    }}
                                    onFocus={(e) => {
                                        e.target.style.background = 'rgba(255, 255, 255, 1)';
                                        e.target.style.borderColor = 'rgba(102, 126, 234, 0.8)';
                                        e.target.style.boxShadow = '0 4px 20px rgba(102, 126, 234, 0.3)';
                                    }}
                                    onBlur={(e) => {
                                        e.target.style.background = 'rgba(255, 255, 255, 0.95)';
                                        e.target.style.borderColor = 'rgba(102, 126, 234, 0.5)';
                                        e.target.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.15)';
                                    }}
                                />
                                <Lock size={18} style={{
                                    position: 'absolute',
                                    left: '12px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: '#999'
                                }} />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{
                                        position: 'absolute',
                                        right: '12px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: '#999',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: '0'
                                    }}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </Form.Group>

                        {/* Remember & Forgot */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '24px',
                            fontSize: '13px'
                        }}>
                            <Form.Check
                                type="checkbox"
                                label="Remember me"
                                id="remember"
                                style={{ marginBottom: 0 }}
                            />
                            <button
                                type="button"
                                onClick={() => {
                                    setForgotEmail(email);
                                    setForgotMessage('');
                                    setForgotError('');
                                    setShowForgotModal(true);
                                }}
                                style={{
                                    color: '#667eea',
                                    textDecoration: 'none',
                                    fontWeight: '600',
                                    background: 'none',
                                    border: 0,
                                    padding: 0,
                                    cursor: 'pointer'
                                }}
                            >Forgot?</button>
                        </div>

                        {/* Sign In Button */}
                        <Button
                            variant="primary"
                            type="submit"
                            className="w-100"
                            disabled={loading}
                            style={{
                                padding: '12px 20px',
                                fontSize: '14px',
                                fontWeight: '600',
                                borderRadius: '10px',
                                background: '#667eea',
                                border: 'none',
                                marginBottom: '16px',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                transition: 'all 0.3s'
                            }}
                            onMouseEnter={(e) => !loading && (e.target.style.background = '#5568d3')}
                            onMouseLeave={(e) => !loading && (e.target.style.background = '#667eea')}
                        >
                            {loading ? 'Signing In...' : 'Sign In'} {!loading && '→'}
                        </Button>

                        {/* Sign Up Link */}
                        <p style={{
                            textAlign: 'center',
                            fontSize: '13px',
                            color: '#999',
                            marginBottom: 0
                        }}>
                            Need access? <span style={{ color: '#667eea', fontWeight: '600', cursor: 'pointer' }}>Contact Admin</span>
                        </p>
                    </Form>
                    </div>
                </div>
            </div>
            <Modal
                show={showForgotModal}
                onHide={() => !forgotLoading && setShowForgotModal(false)}
                centered
            >
                <Form onSubmit={handleForgotPassword}>
                    <Modal.Header closeButton={!forgotLoading}>
                        <Modal.Title>Reset your password</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <p className="text-muted">
                            Enter the email address registered to your account. We’ll email you a secure link to choose a new password.
                        </p>
                        {forgotMessage && <Alert variant="success">{forgotMessage}</Alert>}
                        {forgotError && <Alert variant="danger">{forgotError}</Alert>}
                        <Form.Group controlId="forgotPasswordEmail">
                            <Form.Label>Registered email</Form.Label>
                            <Form.Control
                                type="email"
                                autoComplete="email"
                                required
                                value={forgotEmail}
                                onChange={(e) => setForgotEmail(e.target.value)}
                                placeholder="name@example.com"
                                disabled={forgotLoading}
                            />
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button
                            variant="outline-secondary"
                            type="button"
                            onClick={() => setShowForgotModal(false)}
                            disabled={forgotLoading}
                        >
                            Close
                        </Button>
                        <Button type="submit" disabled={forgotLoading}>
                            {forgotLoading ? 'Sending…' : 'Send reset link'}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </>
    );
};

export default Login;
