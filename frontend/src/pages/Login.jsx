import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Form, Button, Alert, ButtonGroup, ToggleButton } from 'react-bootstrap';
import { Lock, Mail, ArrowRight } from 'lucide-react';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('faculty');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const { login, logout } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

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
        <div style={{
            minHeight: '100vh',
            background: 'rgba(224, 234, 252, 0.5)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
        }}>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '40px',
                maxWidth: '1000px',
                width: '100%',
                alignItems: 'center'
            }}>
                {/* Left Side - Text Only */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    justifyContent: 'center',
                    color: '#4c1d95',
                    textAlign: 'left'
                }}>
                    <h1 style={{
                        fontSize: '48px',
                        fontWeight: 'bold',
                        marginBottom: '20px',
                        lineHeight: '1.2'
                    }}>
                        OBE<br />Management<br />System
                    </h1>
                    <p style={{
                        fontSize: '18px',
                        opacity: 0.8,
                        marginBottom: '30px',
                        lineHeight: '1.6'
                    }}>
                        Outcome-Based Education<br />
                        Platform for Academic<br />
                        Excellence
                    </p>
                    <div style={{
                        display: 'flex',
                        gap: '20px',
                        marginTop: '20px'
                    }}>
                        <div>
                            <p style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '5px' }}>✓</p>
                            <p style={{ fontSize: '13px', color: '#666' }}>Easy Management</p>
                        </div>
                        <div>
                            <p style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '5px' }}>✓</p>
                            <p style={{ fontSize: '13px', color: '#666' }}>Real-time Analytics</p>
                        </div>
                        <div>
                            <p style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '5px' }}>✓</p>
                            <p style={{ fontSize: '13px', color: '#666' }}>Secure & Fast</p>
                        </div>
                    </div>
                </div>

                {/* Right Side - Login Form */}
                <div style={{
                    background: 'rgba(255, 255, 255, 0.20)',
                    borderRadius: '25px',
                    padding: '50px 45px',
                    boxShadow: '0 20px 60px rgba(102, 126, 234, 0.15)',
                    backdropFilter: 'blur(40px)',
                    border: '2px solid rgba(255, 255, 255, 0.5)',
                    WebkitBackdropFilter: 'blur(40px)'
                }}>
                    <h3 style={{
                        fontSize: '28px',
                        fontWeight: '700',
                        marginBottom: '12px',
                        color: '#2d1b4e',
                        letterSpacing: '-0.5px'
                    }}>Log In</h3>
                    <p style={{
                        fontSize: '14px',
                        color: '#6b7280',
                        marginBottom: '32px',
                        fontWeight: '500'
                    }}>Access your OBE Management System</p>

                    {error && (
                        <Alert variant="danger" className="border-0 bg-danger-subtle text-danger py-2 d-flex align-items-center mb-3" style={{ fontSize: '0.85rem' }}>
                            <Lock size={16} className="me-2" /> {error}
                        </Alert>
                    )}
                    {success && (
                        <Alert variant="success" className="border-0 bg-success-subtle text-success py-2 d-flex align-items-center mb-3" style={{ fontSize: '0.85rem' }}>
                            ✓ {success}
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
                                        border: '1.5px solid rgba(255, 255, 255, 0.4)',
                                        borderRadius: '12px',
                                        fontSize: '15px',
                                        background: 'rgba(255, 255, 255, 0.25)',
                                        color: '#333',
                                        backdropFilter: 'blur(10px)',
                                        WebkitBackdropFilter: 'blur(10px)',
                                        transition: 'all 0.3s ease',
                                        boxShadow: '0 4px 15px rgba(102, 126, 234, 0.05)'
                                    }}
                                    onFocus={(e) => {
                                        e.target.style.background = 'rgba(255, 255, 255, 0.35)';
                                        e.target.style.borderColor = 'rgba(102, 126, 234, 0.6)';
                                        e.target.style.boxShadow = '0 4px 20px rgba(102, 126, 234, 0.2)';
                                    }}
                                    onBlur={(e) => {
                                        e.target.style.background = 'rgba(255, 255, 255, 0.25)';
                                        e.target.style.borderColor = 'rgba(255, 255, 255, 0.4)';
                                        e.target.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.05)';
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
                                    type="password"
                                    placeholder="••••••••"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    style={{
                                        paddingLeft: '40px',
                                        paddingRight: '16px',
                                        paddingTop: '14px',
                                        paddingBottom: '14px',
                                        border: '1.5px solid rgba(255, 255, 255, 0.4)',
                                        borderRadius: '12px',
                                        fontSize: '15px',
                                        background: 'rgba(255, 255, 255, 0.25)',
                                        color: '#333',
                                        backdropFilter: 'blur(10px)',
                                        WebkitBackdropFilter: 'blur(10px)',
                                        transition: 'all 0.3s ease',
                                        boxShadow: '0 4px 15px rgba(102, 126, 234, 0.05)'
                                    }}
                                    onFocus={(e) => {
                                        e.target.style.background = 'rgba(255, 255, 255, 0.35)';
                                        e.target.style.borderColor = 'rgba(102, 126, 234, 0.6)';
                                        e.target.style.boxShadow = '0 4px 20px rgba(102, 126, 234, 0.2)';
                                    }}
                                    onBlur={(e) => {
                                        e.target.style.background = 'rgba(255, 255, 255, 0.25)';
                                        e.target.style.borderColor = 'rgba(255, 255, 255, 0.4)';
                                        e.target.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.05)';
                                    }}
                                />
                                <Lock size={18} style={{
                                    position: 'absolute',
                                    left: '12px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: '#999'
                                }} />
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
                            <a href="#" style={{ color: '#667eea', textDecoration: 'none', fontWeight: '600' }}>Forgot?</a>
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
    );
};

export default Login;
