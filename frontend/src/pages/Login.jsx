import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Container, Form, Button, Card, Alert, Row, Col, ButtonGroup, ToggleButton } from 'react-bootstrap';
import { GraduationCap, Lock, Mail, ArrowRight } from 'lucide-react';

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
            padding: '20px'
        }}>
            <Container>
                <Row className="justify-content-center">
                    <Col md={8} lg={6} xl={5}>
                        <Card className="shadow-lg border-0 rounded-4 overflow-hidden">
                            <Card.Body className="p-5">
                                <div className="text-center mb-4">
                                    <div className="bg-primary-subtle text-primary rounded-circle p-3 d-inline-flex mb-3">
                                        <GraduationCap size={32} />
                                    </div>
                                    <h3 className="fw-bold text-dark mb-1">Welcome Back</h3>
                                    <p className="text-muted small">Sign in to OBE Management System</p>
                                </div>

                                {error && (
                                    <Alert variant="danger" className="border-0 bg-danger-subtle text-danger small py-2 d-flex align-items-center mb-4">
                                        <Lock size={16} className="me-2" /> {error}
                                    </Alert>
                                )}
                                {success && (
                                    <Alert variant="success" className="border-0 bg-success-subtle text-success small py-2 d-flex align-items-center mb-4">
                                        <GraduationCap size={16} className="me-2" /> {success}
                                    </Alert>
                                )}

                                <Form onSubmit={handleSubmit}>
                                    <div className="mb-4">
                                        <label className="small fw-bold text-muted mb-2 d-block text-uppercase" style={{ fontSize: '0.75rem', letterSpacing: '0.5px' }}>Select Role</label>
                                        <ButtonGroup className="w-100 shadow-sm rounded-pill p-1 bg-light border">
                                            {['faculty', 'admin'].map((radioValue) => (
                                                <ToggleButton
                                                    key={radioValue}
                                                    id={`radio-${radioValue}`}
                                                    type="radio"
                                                    variant={role === radioValue ? 'primary' : 'light'}
                                                    name="radio"
                                                    value={radioValue}
                                                    checked={role === radioValue}
                                                    onChange={(e) => setRole(e.currentTarget.value)}
                                                    className={`rounded-pill border-0 text-capitalize py-2 d-flex align-items-center justify-content-center ${role === radioValue ? 'fw-bold shadow-sm' : 'text-muted'}`}
                                                >
                                                    {radioValue === 'admin' ? 'Super Admin' : 'Faculty Member'}
                                                </ToggleButton>
                                            ))}
                                        </ButtonGroup>
                                    </div>

                                    <Form.Group className="mb-3 position-relative">
                                        <Form.Label className="small fw-bold text-muted">Email Address</Form.Label>
                                        <div className="position-relative">
                                            <Form.Control
                                                type="email"
                                                placeholder="name@example.com"
                                                required
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                className="py-2 ps-5 bg-light border-0"
                                            />
                                            <Mail className="position-absolute text-muted" size={18} style={{ top: '50%', left: '15px', transform: 'translateY(-50%)' }} />
                                        </div>
                                    </Form.Group>

                                    <Form.Group className="mb-4 position-relative">
                                        <Form.Label className="small fw-bold text-muted">Password</Form.Label>
                                        <div className="position-relative">
                                            <Form.Control
                                                type="password"
                                                placeholder="••••••••"
                                                required
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                className="py-2 ps-5 bg-light border-0"
                                            />
                                            <Lock className="position-absolute text-muted" size={18} style={{ top: '50%', left: '15px', transform: 'translateY(-50%)' }} />
                                        </div>
                                    </Form.Group>

                                    <div className="d-flex justify-content-between align-items-center mb-4">
                                        <Form.Check type="checkbox" label={<span className="small text-muted">Remember me</span>} id="remember" />
                                        <a href="#" className="small text-decoration-none fw-bold">Forgot Password?</a>
                                    </div>

                                    <Button
                                        variant="primary"
                                        type="submit"
                                        className="w-100 py-2 rounded-3 shadow-sm d-flex justify-content-center align-items-center"
                                        disabled={loading}
                                    >
                                        <span className="fw-bold me-2">{loading ? 'Signing In...' : 'Sign In'}</span>
                                        {!loading && <ArrowRight size={18} />}
                                    </Button>
                                </Form>
                            </Card.Body>
                            <div className="bg-light p-3 text-center border-top">
                                <p className="small text-muted mb-0">Don't have an account? <span className="text-dark fw-bold cursor-pointer">Contact Admin</span></p>
                            </div>
                        </Card>
                    </Col>
                </Row>
            </Container>
        </div>
    );
};

export default Login;
