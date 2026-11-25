import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Form, Button, ButtonGroup, ToggleButton, Modal } from 'react-bootstrap';
import { Lock, Mail, Eye, EyeOff, AlertCircle } from 'lucide-react';
import Swal from 'sweetalert2';
import api from '../utils/api';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('faculty');
    const [showPassword, setShowPassword] = useState(false);
    const { login, logout } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [showForgotModal, setShowForgotModal] = useState(false);
    const [forgotEmail, setForgotEmail] = useState('');
    const [forgotCurrentPassword, setForgotCurrentPassword] = useState('');
    const [forgotNewPassword, setForgotNewPassword] = useState('');
    const [forgotLoading, setForgotLoading] = useState(false);
    const [showForgotCurrentPassword, setShowForgotCurrentPassword] = useState(false);
    const [showForgotNewPassword, setShowForgotNewPassword] = useState(false);
    const [logoutCooldownActive, setLogoutCooldownActive] = useState(false);
    const [cooldownRemaining, setCooldownRemaining] = useState(0);

    // Check for logout cooldown
    useEffect(() => {
        const checkLogoutCooldown = () => {
            const logoutTime = localStorage.getItem('logoutTime');
            const cooldownDuration = localStorage.getItem('logoutCooldown');

            if (logoutTime && cooldownDuration) {
                const elapsed = Date.now() - parseInt(logoutTime);
                const remaining = Math.max(0, parseInt(cooldownDuration) - elapsed);

                if (remaining > 0) {
                    setLogoutCooldownActive(true);
                    setCooldownRemaining(Math.ceil(remaining / 1000));
                } else {
                    setLogoutCooldownActive(false);
                    localStorage.removeItem('logoutTime');
                    localStorage.removeItem('logoutCooldown');
                }
            }
        };

        checkLogoutCooldown();
        const interval = setInterval(checkLogoutCooldown, 1000);
        return () => clearInterval(interval);
    }, []);

    const handleForgotPassword = async (e) => {
        e.preventDefault();

        if (!forgotEmail || !forgotCurrentPassword || !forgotNewPassword) {
            await Swal.fire({
                icon: 'warning',
                title: 'Validation Error',
                text: 'Please fill in all fields',
                confirmButtonColor: '#667eea'
            });
            return;
        }

        if (forgotNewPassword.length < 8) {
            await Swal.fire({
                icon: 'warning',
                title: 'Validation Error',
                text: 'New password must be at least 8 characters',
                confirmButtonColor: '#667eea'
            });
            return;
        }

        setForgotLoading(true);

        try {
            const { data } = await api.post('/api/users/change-password', {
                email: forgotEmail,
                currentPassword: forgotCurrentPassword,
                newPassword: forgotNewPassword
            });
            await Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: data.message,
                confirmButtonColor: '#667eea',
                timer: 3000,
                timerProgressBar: true,
                didOpen: (modal) => {
                    modal.addEventListener('mouseenter', Swal.stopTimer);
                    modal.addEventListener('mouseleave', Swal.resumeTimer);
                }
            });
            setShowForgotModal(false);
            setForgotEmail('');
            setForgotCurrentPassword('');
            setForgotNewPassword('');
        } catch (err) {
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: err.response?.data?.message || 'Could not change password. Please try again.',
                confirmButtonColor: '#667eea'
            });
        } finally {
            setForgotLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Check if logout cooldown is still active
        if (logoutCooldownActive) {
            await Swal.fire({
                icon: 'warning',
                title: 'Cooldown Active',
                text: `Please wait ${cooldownRemaining} second${cooldownRemaining !== 1 ? 's' : ''} before logging in again.`,
                confirmButtonColor: '#667eea',
                allowOutsideClick: false
            });
            return;
        }

        setLoading(true);

        try {
            const res = await login(email, password);
            if (res.success) {
                if (res.data.role !== role) {
                    logout();
                    await Swal.fire({
                        icon: 'error',
                        title: 'Access Denied',
                        text: `Account role mismatch. Please login as ${res.data.role === 'admin' ? 'Super Admin' : 'Faculty'}.`,
                        confirmButtonColor: '#667eea'
                    });
                    setLoading(false);
                    return;
                }
                await Swal.fire({
                    icon: 'success',
                    title: 'Welcome!',
                    text: 'Login successful. Redirecting...',
                    confirmButtonColor: '#667eea',
                    allowOutsideClick: false,
                    timer: 3000,
                    timerProgressBar: true,
                    didOpen: () => {
                        setTimeout(() => {
                            navigate(role === 'admin' ? '/admin' : '/faculty');
                        }, 1200);
                    }
                });
            } else {
                await Swal.fire({
                    icon: 'error',
                    title: 'Login Failed',
                    text: res.message,
                    confirmButtonColor: '#667eea'
                });
                setLoading(false);
            }
        } catch (err) {
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'An unexpected error occurred.',
                confirmButtonColor: '#667eea'
            });
            setLoading(false);
        }
    };

    return (
        <>
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
                    {logoutCooldownActive && (
                        <div style={{
                            background: '#fff3cd',
                            border: '1px solid #ffc107',
                            borderRadius: '8px',
                            padding: '12px 16px',
                            marginBottom: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px'
                        }}>
                            <AlertCircle size={18} style={{ color: '#ff9800', flexShrink: 0 }} />
                            <div style={{ color: '#856404', fontSize: '13px', fontWeight: '500' }}>
                                Cooldown active: Please wait <strong>{cooldownRemaining}s</strong> before logging in again
                            </div>
                        </div>
                    )}
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
                                    setForgotCurrentPassword('');
                                    setForgotNewPassword('');
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
                            disabled={loading || logoutCooldownActive}
                            style={{
                                padding: '12px 20px',
                                fontSize: '14px',
                                fontWeight: '600',
                                borderRadius: '10px',
                                background: loading || logoutCooldownActive ? '#ccc' : '#667eea',
                                border: 'none',
                                marginBottom: '16px',
                                cursor: loading || logoutCooldownActive ? 'not-allowed' : 'pointer',
                                transition: 'all 0.3s'
                            }}
                            onMouseEnter={(e) => !loading && !logoutCooldownActive && (e.target.style.background = '#5568d3')}
                            onMouseLeave={(e) => !loading && !logoutCooldownActive && (e.target.style.background = '#667eea')}
                        >
                            {logoutCooldownActive ? `Wait ${cooldownRemaining}s...` : loading ? 'Signing In...' : 'Sign In'} {!loading && !logoutCooldownActive && '→'}
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
                        <Modal.Title>Change your password</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <p className="text-muted" style={{ fontSize: "0.9rem", marginBottom: "1.5rem" }}>
                            Enter your email, current password, and new password to change your account password.
                        </p>

                        {/* Email Field */}
                        <Form.Group controlId="forgotPasswordEmail" className="mb-3">
                            <Form.Label className="fw-semibold">Email Address</Form.Label>
                            <Form.Control
                                type="email"
                                placeholder="name@example.com"
                                value={forgotEmail}
                                onChange={(e) => setForgotEmail(e.target.value)}
                                disabled={forgotLoading}
                                style={{
                                    borderRadius: "0.6rem",
                                    padding: "0.75rem 1rem"
                                }}
                            />
                        </Form.Group>

                        {/* Current Password Field */}
                        <Form.Group controlId="forgotCurrentPassword" className="mb-3">
                            <Form.Label className="fw-semibold">Current Password</Form.Label>
                            <div style={{ position: "relative" }}>
                                <Form.Control
                                    type={showForgotCurrentPassword ? "text" : "password"}
                                    placeholder="Enter your current password"
                                    value={forgotCurrentPassword}
                                    onChange={(e) => setForgotCurrentPassword(e.target.value)}
                                    disabled={forgotLoading}
                                    style={{
                                        borderRadius: "0.6rem",
                                        padding: "0.75rem 1rem",
                                        paddingRight: "2.5rem"
                                    }}
                                />
                                {forgotCurrentPassword && (
                                    <button
                                        type="button"
                                        onClick={() => setShowForgotCurrentPassword(!showForgotCurrentPassword)}
                                        style={{
                                            position: "absolute",
                                            right: "12px",
                                            top: "50%",
                                            transform: "translateY(-50%)",
                                            background: "none",
                                            border: "none",
                                            cursor: "pointer",
                                            color: "#667eea",
                                            padding: "0",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center"
                                        }}
                                    >
                                        {showForgotCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                )}
                            </div>
                        </Form.Group>

                        {/* New Password Field */}
                        <Form.Group controlId="forgotNewPassword" className="mb-3">
                            <Form.Label className="fw-semibold">New Password</Form.Label>
                            <div style={{ position: "relative" }}>
                                <Form.Control
                                    type={showForgotNewPassword ? "text" : "password"}
                                    placeholder="Enter your new password (min. 8 characters)"
                                    value={forgotNewPassword}
                                    onChange={(e) => setForgotNewPassword(e.target.value)}
                                    disabled={forgotLoading}
                                    style={{
                                        borderRadius: "0.6rem",
                                        padding: "0.75rem 1rem",
                                        paddingRight: "2.5rem"
                                    }}
                                />
                                {forgotNewPassword && (
                                    <button
                                        type="button"
                                        onClick={() => setShowForgotNewPassword(!showForgotNewPassword)}
                                        style={{
                                            position: "absolute",
                                            right: "12px",
                                            top: "50%",
                                            transform: "translateY(-50%)",
                                            background: "none",
                                            border: "none",
                                            cursor: "pointer",
                                            color: "#667eea",
                                            padding: "0",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center"
                                        }}
                                    >
                                        {showForgotNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                )}
                            </div>
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button
                            variant="outline-secondary"
                            type="button"
                            onClick={() => setShowForgotModal(false)}
                            disabled={forgotLoading}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={forgotLoading}>
                            {forgotLoading ? "Changing..." : "Change Password"}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </>
    );
};

export default Login;
