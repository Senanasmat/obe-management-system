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
            background: 'linear-gradient(135deg, #e0eafc 0%, #cfdef3 100%)',
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
                {/* Left Side - Logo & Info */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    justifyContent: 'center',
                    color: 'white',
                    textAlign: 'left'
                }}>
                    <div style={{
                        width: '120px',
                        height: '120px',
                        marginBottom: '30px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(255,255,255,0.1)',
                        borderRadius: '20px',
                        backdropFilter: 'blur(10px)'
                    }}>
                        <img
                            src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'%3E%3Ccircle cx='100' cy='100' r='95' fill='%2388ccee' stroke='%23667eea' stroke-width='3'/%3E%3Ctext x='50%' y='50%' font-size='60' font-weight='bold' text-anchor='middle' dy='.3em' fill='%23667eea'%3EOB%3C/text%3E%3C/svg%3E"
                            alt="OBE Logo"
                            style={{ width: '100px', height: '100px' }}
                        />
                    </div>
                    <h2 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '10px' }}>OBE Management</h2>
                    <p style={{ fontSize: '16px', opacity: 0.9, marginBottom: '30px' }}>Outcome-Based Education System</p>
                </div>

                {/* Right Side - Login Form */}
                <div style={{
                    background: 'rgba(255, 255, 255, 0.75)',
                    borderRadius: '20px',
                    padding: '40px',
                    boxShadow: '0 8px 32px rgba(31, 38, 135, 0.15)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.5)'
                }}>
                    <h3 style={{
                        fontSize: '24px',
                        fontWeight: 'bold',
                        marginBottom: '10px',
                        color: '#333'
                    }}>Log In</h3>
                    <p style={{
                        fontSize: '13px',
                        color: '#999',
                        marginBottom: '24px'
                    }}>Enter your credentials to continue</p>

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
                                        paddingTop: '12px',
                                        paddingBottom: '12px',
                                        border: '1px solid #ddd',
                                        borderRadius: '10px',
                                        fontSize: '14px',
                                        background: '#f9f9f9',
                                        transition: 'all 0.3s'
                                    }}
                                    onFocus={(e) => {
                                        e.target.style.background = '#fff';
                                        e.target.style.borderColor = '#667eea';
                                    }}
                                    onBlur={(e) => {
                                        e.target.style.background = '#f9f9f9';
                                        e.target.style.borderColor = '#ddd';
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
                                        paddingTop: '12px',
                                        paddingBottom: '12px',
                                        border: '1px solid #ddd',
                                        borderRadius: '10px',
                                        fontSize: '14px',
                                        background: '#f9f9f9',
                                        transition: 'all 0.3s'
                                    }}
                                    onFocus={(e) => {
                                        e.target.style.background = '#fff';
                                        e.target.style.borderColor = '#667eea';
                                    }}
                                    onBlur={(e) => {
                                        e.target.style.background = '#f9f9f9';
                                        e.target.style.borderColor = '#ddd';
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
