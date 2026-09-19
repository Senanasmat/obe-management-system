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
            padding: '10px'
        }}>
            <Container>
                <Row className="justify-content-center">
                    <Col md={8} lg={6} xl={5}>
                        <Card className="shadow-lg border-0 rounded-3 overflow-hidden">
                            <Card.Body className="p-3">
                                <div className="text-center mb-2">
                                    <div className="bg-primary-subtle text-primary rounded-circle p-2 d-inline-flex mb-2">
                                        <GraduationCap size={26} />
                                    </div>
                                    <h3 className="fw-bold text-dark mb-0" style={{ fontSize: '1.3rem' }}>Welcome Back</h3>
                                    <p className="text-muted mb-0" style={{ fontSize: '0.8rem' }}>Sign in to OBE Management</p>
                                </div>

                                {error && (
                                    <Alert variant="danger" className="border-0 bg-danger-subtle text-danger py-1 d-flex align-items-center mb-2" style={{ fontSize: '0.8rem' }}>
                                        <Lock size={14} className="me-2" /> {error}
                                    </Alert>
                                )}
                                {success && (
                                    <Alert variant="success" className="border-0 bg-success-subtle text-success py-1 d-flex align-items-center mb-2" style={{ fontSize: '0.8rem' }}>
                                        <GraduationCap size={14} className="me-2" /> {success}
                                    </Alert>
                                )}

                                <Form onSubmit={handleSubmit}>
                                    <div className="mb-3">
                                        <label className="fw-bold text-muted mb-1 d-block text-uppercase" style={{ fontSize: '0.65rem', letterSpacing: '0.3px' }}>Select Role</label>
                                        <ButtonGroup className="w-100 shadow-sm rounded-pill p-0 bg-light border">
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
                                                    className={`rounded-pill border-0 text-capitalize py-1 d-flex align-items-center justify-content-center ${role === radioValue ? 'fw-bold shadow-sm' : 'text-muted'}`}
                                                    style={{ fontSize: '0.8rem' }}
                                                >
                                                    {radioValue === 'admin' ? 'Admin' : 'Faculty'}
                                                </ToggleButton>
                                            ))}
                                        </ButtonGroup>
                                    </div>

                                    <Form.Group className="mb-2 position-relative">
                                        <Form.Label className="fw-bold text-muted mb-1" style={{ fontSize: '0.8rem' }}>Email</Form.Label>
                                        <div className="position-relative">
                                            <Form.Control
                                                type="email"
                                                placeholder="name@example.com"
                                                required
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                className="py-1 ps-4 bg-light border-0"
                                                style={{ fontSize: '0.9rem' }}
                                            />
                                            <Mail className="position-absolute text-muted" size={16} style={{ top: '50%', left: '12px', transform: 'translateY(-50%)' }} />
                                        </div>
                                    </Form.Group>

                                    <Form.Group className="mb-2 position-relative">
                                        <Form.Label className="fw-bold text-muted mb-1" style={{ fontSize: '0.8rem' }}>Password</Form.Label>
                                        <div className="position-relative">
                                            <Form.Control
                                                type="password"
                                                placeholder="••••••••"
                                                required
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                className="py-1 ps-4 bg-light border-0"
                                                style={{ fontSize: '0.9rem' }}
                                            />
                                            <Lock className="position-absolute text-muted" size={16} style={{ top: '50%', left: '12px', transform: 'translateY(-50%)' }} />
                                        </div>
                                    </Form.Group>

                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <Form.Check type="checkbox" label={<span className="text-muted" style={{ fontSize: '0.8rem' }}>Remember me</span>} id="remember" />
                                        <a href="#" className="text-decoration-none fw-bold" style={{ fontSize: '0.75rem' }}>Forgot?</a>
                                    </div>

                                    <Button
                                        variant="primary"
                                        type="submit"
                                        className="w-100 py-1 rounded-2 shadow-sm d-flex justify-content-center align-items-center"
                                        style={{ fontSize: '0.9rem' }}
                                        disabled={loading}
                                    >
                                        <span className="fw-bold me-2">{loading ? 'Signing In...' : 'Sign In'}</span>
                                        {!loading && <ArrowRight size={16} />}
                                    </Button>
                                </Form>
                            </Card.Body>
                            <div className="bg-light p-2 text-center border-top">
                                <p className="text-muted mb-0" style={{ fontSize: '0.75rem' }}>Need access? <span className="text-dark fw-bold cursor-pointer">Contact Admin</span></p>
                            </div>
                        </Card>
                    </Col>
                </Row>
            </Container>
        </div>
    );
};

export default Login;
