import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Form, Button, Card, Row, Col, Alert } from 'react-bootstrap';
import { User, Lock, LogOut, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { FACULTY_THEME } from '../../themes/facultyTheme';
import api from '../../utils/api';
import Swal from 'sweetalert2';

const FacultySettings = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [loading, setLoading] = useState(false);
    const [updating, setUpdating] = useState(false);
    const [passwordUpdating, setPasswordUpdating] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Profile form
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');

    // Password form
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    useEffect(() => {
        if (user) {
            setFullName(user.name || '');
            setEmail(user.email || '');
        }
    }, [user]);

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!fullName.trim() || !email.trim()) {
            setError('Please fill in all fields');
            return;
        }

        setUpdating(true);
        try {
            const config = {
                headers: {
                    Authorization: `Bearer ${user.token}`
                }
            };

            await api.put(
                '/api/users/profile',
                { name: fullName, email },
                config
            );

            setSuccess('Profile updated successfully!');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update profile');
        } finally {
            setUpdating(false);
        }
    };

    const handleUpdatePassword = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!newPassword || !confirmPassword) {
            setError('Please fill in all password fields');
            return;
        }

        if (newPassword.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setPasswordUpdating(true);
        try {
            const config = {
                headers: {
                    Authorization: `Bearer ${user.token}`
                }
            };

            await api.put(
                '/api/users/password',
                { newPassword },
                config
            );

            setSuccess('Password updated successfully!');
            setNewPassword('');
            setConfirmPassword('');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update password');
        } finally {
            setPasswordUpdating(false);
        }
    };

    const handleLogout = async () => {
        const result = await Swal.fire({
            title: 'Logout',
            text: 'Are you sure you want to logout?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: FACULTY_THEME.colors.primary,
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Yes, logout'
        });

        if (result.isConfirmed) {
            logout();
            navigate('/login');
        }
    };

    return (
        <div
            style={{
                minHeight: '100vh',
                background: `linear-gradient(135deg, ${FACULTY_THEME.colors.primary} 0%, ${FACULTY_THEME.colors.secondary} 100%)`,
                padding: '2rem 0'
            }}
        >
            <Container maxWidth="lg" className="py-4">
                {/* Back Button */}
                <div className="mb-4">
                    <Button
                        variant="link"
                        className="p-0 text-decoration-none d-flex align-items-center gap-2"
                        onClick={() => navigate('/faculty')}
                        style={{ color: 'white' }}
                    >
                        <ArrowLeft size={20} />
                        <span>Back to Dashboard</span>
                    </Button>
                </div>

                {/* Header */}
                <div className="mb-5">
                    <h2 className="fw-bold text-white mb-2">Settings</h2>
                    <p className="text-white-50 mb-0">Manage your profile and account security.</p>
                </div>

                {/* Alerts */}
                {error && (
                    <Alert variant="danger" onClose={() => setError('')} dismissible>
                        {error}
                    </Alert>
                )}
                {success && (
                    <Alert variant="success" onClose={() => setSuccess('')} dismissible>
                        {success}
                    </Alert>
                )}

                <Row className="g-4">
                    {/* Profile Card */}
                    <Col lg={6}>
                        <Card
                            className="border-0 shadow-lg h-100"
                            style={{
                                background: 'rgba(255, 255, 255, 0.95)',
                                backdropFilter: 'blur(10px)',
                                borderRadius: '1rem'
                            }}
                        >
                            <Card.Body className="p-4">
                                <div className="d-flex align-items-center gap-3 mb-4">
                                    <div
                                        className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold"
                                        style={{
                                            width: '50px',
                                            height: '50px',
                                            background: `linear-gradient(135deg, ${FACULTY_THEME.colors.primary}, ${FACULTY_THEME.colors.secondary})`,
                                            fontSize: '1.5rem'
                                        }}
                                    >
                                        {user?.name?.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h6 className="mb-0 fw-bold text-dark">{user?.name}</h6>
                                        <p className="mb-0 small text-muted">{user?.email}</p>
                                    </div>
                                </div>

                                <Form onSubmit={handleUpdateProfile}>
                                    <Form.Group className="mb-3">
                                        <Form.Label className="fw-semibold text-dark">Full Name</Form.Label>
                                        <Form.Control
                                            type="text"
                                            placeholder="Enter your full name"
                                            value={fullName}
                                            onChange={(e) => setFullName(e.target.value)}
                                            className="form-control-lg"
                                            style={{
                                                borderColor: '#e9ecef',
                                                borderRadius: '0.5rem'
                                            }}
                                        />
                                    </Form.Group>

                                    <Form.Group className="mb-4">
                                        <Form.Label className="fw-semibold text-dark">Email</Form.Label>
                                        <Form.Control
                                            type="email"
                                            placeholder="Enter your email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="form-control-lg"
                                            style={{
                                                borderColor: '#e9ecef',
                                                borderRadius: '0.5rem'
                                            }}
                                        />
                                    </Form.Group>

                                    <Button
                                        type="submit"
                                        disabled={updating}
                                        className="w-100 py-2 fw-semibold border-0"
                                        style={{
                                            background: `linear-gradient(135deg, ${FACULTY_THEME.colors.primary}, ${FACULTY_THEME.colors.secondary})`,
                                            borderRadius: '0.5rem',
                                            fontSize: '0.95rem'
                                        }}
                                    >
                                        {updating ? 'Saving...' : 'Save Changes'}
                                    </Button>
                                </Form>
                            </Card.Body>
                        </Card>
                    </Col>

                    {/* Security Card */}
                    <Col lg={6}>
                        <Card
                            className="border-0 shadow-lg h-100"
                            style={{
                                background: 'rgba(255, 255, 255, 0.95)',
                                backdropFilter: 'blur(10px)',
                                borderRadius: '1rem'
                            }}
                        >
                            <Card.Body className="p-4">
                                <div className="d-flex align-items-center gap-2 mb-4">
                                    <Lock size={20} style={{ color: FACULTY_THEME.colors.primary }} />
                                    <h5 className="mb-0 fw-bold text-dark">Change Password</h5>
                                </div>

                                <Form onSubmit={handleUpdatePassword}>
                                    <Form.Group className="mb-3">
                                        <Form.Label className="fw-semibold text-dark">New Password</Form.Label>
                                        <Form.Control
                                            type="password"
                                            placeholder="At least 8 characters"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            className="form-control-lg"
                                            style={{
                                                borderColor: '#e9ecef',
                                                borderRadius: '0.5rem'
                                            }}
                                        />
                                    </Form.Group>

                                    <Form.Group className="mb-4">
                                        <Form.Label className="fw-semibold text-dark">Confirm Password</Form.Label>
                                        <Form.Control
                                            type="password"
                                            placeholder="Re-enter your new password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="form-control-lg"
                                            style={{
                                                borderColor: '#e9ecef',
                                                borderRadius: '0.5rem'
                                            }}
                                        />
                                    </Form.Group>

                                    <Button
                                        type="submit"
                                        disabled={passwordUpdating}
                                        className="w-100 py-2 fw-semibold border-0"
                                        style={{
                                            background: `linear-gradient(135deg, ${FACULTY_THEME.colors.primary}, ${FACULTY_THEME.colors.secondary})`,
                                            borderRadius: '0.5rem',
                                            fontSize: '0.95rem'
                                        }}
                                    >
                                        {passwordUpdating ? 'Updating...' : 'Update Password'}
                                    </Button>
                                </Form>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>

                {/* Logout Card */}
                <Row className="g-4 mt-2">
                    <Col lg={12}>
                        <Card
                            className="border-0 shadow-lg"
                            style={{
                                background: 'rgba(255, 255, 255, 0.95)',
                                backdropFilter: 'blur(10px)',
                                borderRadius: '1rem'
                            }}
                        >
                            <Card.Body className="p-4">
                                <div className="d-flex align-items-center justify-content-between">
                                    <div>
                                        <h5 className="mb-1 fw-bold text-dark">Logout</h5>
                                        <p className="mb-0 text-muted small">End your session on this device</p>
                                    </div>
                                    <Button
                                        onClick={handleLogout}
                                        className="border-0"
                                        style={{
                                            background: `linear-gradient(135deg, ${FACULTY_THEME.colors.primary}, ${FACULTY_THEME.colors.secondary})`,
                                            borderRadius: '0.5rem',
                                            padding: '0.5rem 1.5rem',
                                            fontSize: '0.95rem'
                                        }}
                                    >
                                        <LogOut size={16} className="me-2" />
                                        Logout
                                    </Button>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            </Container>
        </div>
    );
};

export default FacultySettings;
