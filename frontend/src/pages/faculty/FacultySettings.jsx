import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Form, Button, Card, Row, Col } from 'react-bootstrap';
import { User, Lock, LogOut, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { FACULTY_THEME } from '../../themes/facultyTheme';
import api from '../../utils/api';
import Swal from 'sweetalert2';

const FacultySettings = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [updating, setUpdating] = useState(false);
    const [passwordUpdating, setPasswordUpdating] = useState(false);

    // Profile form
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');

    // Password form
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordStrength, setPasswordStrength] = useState(0);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Password strength checker
    const checkPasswordStrength = (password) => {
        let strength = 0;

        if (password.length >= 8) strength += 1;
        if (password.length >= 12) strength += 1;
        if (/[a-z]/.test(password)) strength += 1;
        if (/[A-Z]/.test(password)) strength += 1;
        if (/\d/.test(password)) strength += 1;
        if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) strength += 1;

        return Math.min(strength, 5); // Max 5 levels
    };

    const getPasswordStrengthLabel = (strength) => {
        const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
        return labels[strength] || 'Very Weak';
    };

    const getPasswordStrengthColor = (strength) => {
        const colors = ['#dc3545', '#fd7e14', '#ffc107', '#17a2b8', '#28a745', '#20c997'];
        return colors[strength] || '#dc3545';
    };

    const handlePasswordChange = (e) => {
        const pwd = e.target.value;
        setNewPassword(pwd);
        setPasswordStrength(checkPasswordStrength(pwd));
    };

    useEffect(() => {
        if (user) {
            setFullName(user.name || '');
            setEmail(user.email || '');
        }
    }, [user]);

    const handleUpdateProfile = async (e) => {
        e.preventDefault();

        if (!fullName.trim() || !email.trim()) {
            await Swal.fire({
                icon: 'warning',
                title: 'Validation Error',
                text: 'Please fill in all fields',
                confirmButtonColor: FACULTY_THEME.colors.primary
            });
            return;
        }

        setUpdating(true);
        try {
            await api.put('/api/users/profile', {
                name: fullName,
                email
            });

            await Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: 'Profile updated successfully',
                confirmButtonColor: FACULTY_THEME.colors.primary,
                timer: 3000,
                timerProgressBar: true,
                didOpen: (modal) => {
                    modal.addEventListener('mouseenter', Swal.stopTimer);
                    modal.addEventListener('mouseleave', Swal.resumeTimer);
                }
            });
        } catch (err) {
            console.error('Profile update error:', err);
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: err.response?.data?.message || 'Failed to update profile',
                confirmButtonColor: FACULTY_THEME.colors.primary
            });
        } finally {
            setUpdating(false);
        }
    };

    const handleUpdatePassword = async (e) => {
        e.preventDefault();

        if (!newPassword || !confirmPassword) {
            await Swal.fire({
                icon: 'warning',
                title: 'Validation Error',
                text: 'Please fill in all password fields',
                confirmButtonColor: FACULTY_THEME.colors.primary
            });
            return;
        }

        if (newPassword.length < 8) {
            await Swal.fire({
                icon: 'warning',
                title: 'Validation Error',
                text: 'Password must be at least 8 characters',
                confirmButtonColor: FACULTY_THEME.colors.primary
            });
            return;
        }

        if (newPassword !== confirmPassword) {
            await Swal.fire({
                icon: 'warning',
                title: 'Validation Error',
                text: 'Passwords do not match',
                confirmButtonColor: FACULTY_THEME.colors.primary
            });
            return;
        }

        const strength = checkPasswordStrength(newPassword);
        if (strength < 3) {
            await Swal.fire({
                icon: 'warning',
                title: 'Weak Password',
                text: `Password strength is ${getPasswordStrengthLabel(strength)}. Please use a mix of uppercase, lowercase, numbers, and special characters.`,
                confirmButtonColor: FACULTY_THEME.colors.primary
            });
            return;
        }

        setPasswordUpdating(true);
        try {
            await api.put('/api/users/password', {
                newPassword
            });

            await Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: 'Password updated successfully',
                confirmButtonColor: FACULTY_THEME.colors.primary,
                timer: 3000,
                timerProgressBar: true,
                didOpen: (modal) => {
                    modal.addEventListener('mouseenter', Swal.stopTimer);
                    modal.addEventListener('mouseleave', Swal.resumeTimer);
                }
            });
            setNewPassword('');
            setConfirmPassword('');
        } catch (err) {
            console.error('Password update error:', err);
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: err.response?.data?.message || 'Failed to update password',
                confirmButtonColor: FACULTY_THEME.colors.primary
            });
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
            const logoutTime = Date.now();
            const cooldownDuration = 5000; // 5 seconds
            localStorage.setItem('logoutTime', logoutTime.toString());
            localStorage.setItem('logoutCooldown', cooldownDuration.toString());

            let remainingTime = 5;
            const countdownInterval = setInterval(() => {
                remainingTime--;
                Swal.update({
                    text: `You have been logged out successfully! You can login again in ${remainingTime} second${remainingTime !== 1 ? 's' : ''}.`
                });
                if (remainingTime <= 0) {
                    clearInterval(countdownInterval);
                }
            }, 1000);

            await Swal.fire({
                icon: 'success',
                title: 'Logged Out',
                text: 'You have been logged out successfully! You can login again in 5 seconds.',
                confirmButtonColor: FACULTY_THEME.colors.primary,
                timer: 5000,
                timerProgressBar: true,
                didOpen: (modal) => {
                    modal.addEventListener('mouseenter', Swal.stopTimer);
                    modal.addEventListener('mouseleave', Swal.resumeTimer);
                },
                willClose: () => {
                    clearInterval(countdownInterval);
                }
            });
            navigate('/login');
        }
    };

    return (
        <div
            style={{
                minHeight: '100vh',
                backgroundColor: '#f8fafc'
            }}
        >
            {/* Header Section with Gradient */}
            <div
                style={{
                    background: `linear-gradient(135deg, ${FACULTY_THEME.colors.primary}, ${FACULTY_THEME.colors.secondary})`,
                    padding: '1.5rem 2rem',
                    marginBottom: '2rem',
                    marginLeft: '-15px',
                    marginRight: '-15px'
                }}
            >
                <Container style={{ maxWidth: '1100px', paddingLeft: '1rem', paddingRight: '1rem' }}>
                    <div className="d-flex align-items-center justify-content-between">
                        <div>
                            <h2 className="fw-bold text-white mb-1" style={{ fontSize: '1.6rem', letterSpacing: '-0.5px' }}>
                                Settings
                            </h2>
                            <p className="text-white mb-0" style={{ opacity: 0.9, fontSize: '0.85rem' }}>
                                Profile & Security
                            </p>
                        </div>
                        <div className="d-flex align-items-center gap-2">
                            <Button
                                onClick={handleLogout}
                                className="border-0 fw-semibold d-flex align-items-center gap-2"
                                style={{
                                    backgroundColor: '#dc3545',
                                    borderRadius: '0.5rem',
                                    padding: '0.6rem 1rem',
                                    fontSize: '0.8rem',
                                    color: 'white',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease'
                                }}
                                onMouseEnter={(e) => e.target.style.backgroundColor = '#c82333'}
                                onMouseLeave={(e) => e.target.style.backgroundColor = '#dc3545'}
                            >
                                <LogOut size={14} />
                                Logout
                            </Button>
                            <Button
                                variant="link"
                                className="p-0 text-decoration-none d-flex align-items-center gap-2"
                                onClick={() => navigate('/faculty')}
                                style={{ color: 'rgba(255, 255, 255, 0.9)', transition: 'all 0.2s ease' }}
                                onMouseEnter={(e) => e.target.style.color = 'rgba(255, 255, 255, 1)'}
                                onMouseLeave={(e) => e.target.style.color = 'rgba(255, 255, 255, 0.9)'}
                            >
                                <ArrowLeft size={16} />
                                <span style={{ fontSize: '0.85rem' }}>Back</span>
                            </Button>
                        </div>
                    </div>
                </Container>
            </div>

            <Container style={{ maxWidth: '1100px', paddingBottom: '2rem' }}>

                {/* Profile & Security Sections - Side by Side */}
                <Row className="g-3 mb-3">
                    {/* Profile Section */}
                    <Col lg={6}>
                        <h6 className="fw-bold mb-2" style={{ color: FACULTY_THEME.colors.primary, fontSize: '0.95rem', letterSpacing: '0.3px' }}>
                            Profile Information
                        </h6>

                        <Card
                            className="border-0 h-100"
                            style={{
                                background: '#ffffff',
                                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
                                borderRadius: '0.6rem',
                                overflow: 'hidden'
                            }}
                        >
                        <Card.Body className="p-0">
                            {/* User Info Header */}
                            <div
                                style={{
                                    padding: '1rem',
                                    borderBottom: '1px solid #e9ecef',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem'
                                }}
                            >
                                <div
                                    className="d-flex align-items-center justify-content-center text-white fw-bold flex-shrink-0"
                                    style={{
                                        width: '56px',
                                        height: '56px',
                                        background: `linear-gradient(135deg, ${FACULTY_THEME.colors.primary}, ${FACULTY_THEME.colors.accent})`,
                                        borderRadius: '0.75rem',
                                        fontSize: '1.5rem'
                                    }}
                                >
                                    {user?.name?.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <p className="mb-0 fw-semibold text-dark" style={{ fontSize: '1.05rem' }}>{user?.name}</p>
                                    <p className="mb-0 text-muted" style={{ fontSize: '0.9rem' }}>{user?.email}</p>
                                </div>
                            </div>

                            {/* Form Section */}
                            <Form onSubmit={handleUpdateProfile} style={{ padding: '1rem' }}>
                                <Row>
                                    <Col md={6} className="mb-3">
                                        <Form.Group>
                                            <Form.Label className="fw-semibold text-dark" style={{ fontSize: '0.95rem', marginBottom: '0.6rem' }}>Full Name</Form.Label>
                                            <Form.Control
                                                type="text"
                                                value={fullName}
                                                onChange={(e) => setFullName(e.target.value)}
                                                style={{
                                                    borderColor: '#e9ecef',
                                                    borderRadius: '0.6rem',
                                                    padding: '0.75rem 1rem',
                                                    fontSize: '0.95rem',
                                                    transition: 'all 0.2s ease'
                                                }}
                                                onFocus={(e) => e.target.style.borderColor = FACULTY_THEME.colors.primary}
                                                onBlur={(e) => e.target.style.borderColor = '#e9ecef'}
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={6} className="mb-3">
                                        <Form.Group>
                                            <Form.Label className="fw-semibold text-dark" style={{ fontSize: '0.95rem', marginBottom: '0.6rem' }}>Email Address</Form.Label>
                                            <Form.Control
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                style={{
                                                    borderColor: '#e9ecef',
                                                    borderRadius: '0.6rem',
                                                    padding: '0.75rem 1rem',
                                                    fontSize: '0.95rem',
                                                    transition: 'all 0.2s ease'
                                                }}
                                                onFocus={(e) => e.target.style.borderColor = FACULTY_THEME.colors.primary}
                                                onBlur={(e) => e.target.style.borderColor = '#e9ecef'}
                                            />
                                        </Form.Group>
                                    </Col>
                                </Row>

                                <Button
                                    type="submit"
                                    disabled={updating}
                                    className="mt-3 fw-semibold border-0"
                                    style={{
                                        background: `linear-gradient(135deg, ${FACULTY_THEME.colors.primary}, ${FACULTY_THEME.colors.secondary})`,
                                        borderRadius: '0.6rem',
                                        padding: '0.75rem 2rem',
                                        fontSize: '0.95rem',
                                        color: 'white',
                                        cursor: updating ? 'not-allowed' : 'pointer',
                                        opacity: updating ? 0.7 : 1,
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    {updating ? '⏳ Saving Changes...' : '✓ Save Changes'}
                                </Button>
                            </Form>
                        </Card.Body>
                    </Card>
                    </Col>

                    {/* Security Section */}
                    <Col lg={6}>
                        <h6 className="fw-bold mb-2" style={{ color: FACULTY_THEME.colors.primary, fontSize: '0.95rem', letterSpacing: '0.3px' }}>
                            Security Settings
                        </h6>

                        <Card
                            className="border-0 h-100"
                            style={{
                                background: '#ffffff',
                                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                                borderRadius: '0.75rem',
                                overflow: 'hidden'
                            }}
                        >
                        <Card.Body className="p-0">
                            {/* Header */}
                            <div
                                style={{
                                    padding: '1.5rem',
                                    borderBottom: '1px solid #e9ecef',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem'
                                }}
                            >
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: '40px',
                                        height: '40px',
                                        backgroundColor: '#f0f4f8',
                                        borderRadius: '0.6rem'
                                    }}
                                >
                                    <Lock size={20} style={{ color: FACULTY_THEME.colors.primary }} />
                                </div>
                                <div>
                                    <p className="mb-0 fw-semibold text-dark" style={{ fontSize: '1.05rem' }}>Change Password</p>
                                    <p className="mb-0 text-muted" style={{ fontSize: '0.85rem' }}>Update your password to keep your account secure</p>
                                </div>
                            </div>

                            {/* Form Section */}
                            <Form onSubmit={handleUpdatePassword} style={{ padding: '1.5rem' }}>
                                <Form.Group className="mb-3">
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <Form.Label className="fw-semibold text-dark" style={{ fontSize: '0.95rem', marginBottom: 0 }}>New Password</Form.Label>
                                        {newPassword && (
                                            <small style={{ fontSize: '0.8rem', fontWeight: '600', color: getPasswordStrengthColor(passwordStrength) }}>
                                                {getPasswordStrengthLabel(passwordStrength)}
                                            </small>
                                        )}
                                    </div>
                                    <div style={{ position: 'relative' }}>
                                        <Form.Control
                                            type={showNewPassword ? 'text' : 'password'}
                                            placeholder="At least 8 characters"
                                            value={newPassword}
                                            onChange={handlePasswordChange}
                                            style={{
                                                borderColor: newPassword ? getPasswordStrengthColor(passwordStrength) : '#e9ecef',
                                                borderRadius: '0.6rem',
                                                padding: '0.75rem 1rem 0.75rem 1rem',
                                                paddingRight: '2.5rem',
                                                fontSize: '0.95rem',
                                                transition: 'all 0.2s ease'
                                            }}
                                            onFocus={(e) => e.target.style.borderColor = newPassword ? getPasswordStrengthColor(passwordStrength) : FACULTY_THEME.colors.primary}
                                            onBlur={(e) => e.target.style.borderColor = newPassword ? getPasswordStrengthColor(passwordStrength) : '#e9ecef'}
                                        />
                                        {newPassword && (
                                            <button
                                                type="button"
                                                onClick={() => setShowNewPassword(!showNewPassword)}
                                                style={{
                                                    position: 'absolute',
                                                    right: '12px',
                                                    top: '50%',
                                                    transform: 'translateY(-50%)',
                                                    background: 'none',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    color: FACULTY_THEME.colors.primary,
                                                    padding: '0',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}
                                            >
                                                {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        )}
                                    </div>
                                    {newPassword && (
                                        <div style={{ marginTop: '0.5rem', display: 'flex', gap: '2px' }}>
                                            {[...Array(5)].map((_, i) => (
                                                <div
                                                    key={i}
                                                    style={{
                                                        height: '4px',
                                                        flex: 1,
                                                        backgroundColor: i < passwordStrength ? getPasswordStrengthColor(passwordStrength) : '#e9ecef',
                                                        borderRadius: '2px',
                                                        transition: 'all 0.2s ease'
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    )}
                                    <small className="text-muted d-block mt-2" style={{ fontSize: '0.8rem' }}>
                                        Password should contain: uppercase, lowercase, numbers, special characters
                                    </small>
                                </Form.Group>

                                <Form.Group className="mb-3">
                                    <Form.Label className="fw-semibold text-dark" style={{ fontSize: '0.95rem', marginBottom: '0.6rem' }}>Confirm Password</Form.Label>
                                    <div style={{ position: 'relative' }}>
                                        <Form.Control
                                            type={showConfirmPassword ? 'text' : 'password'}
                                            placeholder="Re-enter your new password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            style={{
                                                borderColor: '#e9ecef',
                                                borderRadius: '0.6rem',
                                                padding: '0.75rem 1rem 0.75rem 1rem',
                                                paddingRight: '2.5rem',
                                                fontSize: '0.95rem',
                                                transition: 'all 0.2s ease'
                                            }}
                                            onFocus={(e) => e.target.style.borderColor = FACULTY_THEME.colors.primary}
                                            onBlur={(e) => e.target.style.borderColor = '#e9ecef'}
                                        />
                                        {confirmPassword && (
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                style={{
                                                    position: 'absolute',
                                                    right: '12px',
                                                    top: '50%',
                                                    transform: 'translateY(-50%)',
                                                    background: 'none',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    color: FACULTY_THEME.colors.primary,
                                                    padding: '0',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}
                                            >
                                                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        )}
                                    </div>
                                </Form.Group>

                                <Button
                                    type="submit"
                                    disabled={passwordUpdating}
                                    className="mt-2 fw-semibold border-0"
                                    style={{
                                        background: `linear-gradient(135deg, ${FACULTY_THEME.colors.primary}, ${FACULTY_THEME.colors.secondary})`,
                                        borderRadius: '0.6rem',
                                        padding: '0.75rem 2rem',
                                        fontSize: '0.95rem',
                                        color: 'white',
                                        cursor: passwordUpdating ? 'not-allowed' : 'pointer',
                                        opacity: passwordUpdating ? 0.7 : 1,
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    {passwordUpdating ? '⏳ Updating Password...' : '✓ Update Password'}
                                </Button>
                            </Form>
                        </Card.Body>
                    </Card>
                    </Col>
                </Row>
            </Container>
        </div>
    );
};

export default FacultySettings;
