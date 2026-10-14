import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Alert, Button, Card, Container, Form } from 'react-bootstrap';
import { Lock } from 'lucide-react';
import api from '../utils/api';

export default function ResetPassword() {
    const [searchParams] = useSearchParams();
    const email = searchParams.get('email') || '';
    const token = searchParams.get('token') || '';
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');
        setSuccess('');

        if (!token || !email) {
            setError('This reset link is incomplete. Request a new password reset.');
            return;
        }
        if (password.length < 8) {
            setError('Your new password must be at least 8 characters long.');
            return;
        }
        if (password !== confirmPassword) {
            setError('The passwords do not match.');
            return;
        }

        setLoading(true);
        try {
            const { data } = await api.post('/api/users/reset-password', {
                email,
                token,
                password
            });
            setSuccess(data.message);
            setPassword('');
            setConfirmPassword('');
        } catch (err) {
            setError(
                err.response?.data?.message ||
                'Could not reset your password. Request a new link and try again.'
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container
            className="d-flex align-items-center justify-content-center py-5"
            style={{ minHeight: '100vh', background: '#f4f6ff' }}
        >
            <Card className="border-0 shadow-sm" style={{ width: '100%', maxWidth: 440, borderRadius: 18 }}>
                <Card.Body className="p-4 p-md-5">
                    <div className="d-flex align-items-center gap-2 mb-3">
                        <Lock color="#667eea" />
                        <h1 className="h4 mb-0">Choose a new password</h1>
                    </div>
                    <p className="text-muted">Set a new password for {email || 'your account'}.</p>

                    {error && <Alert variant="danger">{error}</Alert>}
                    {success && <Alert variant="success">{success}</Alert>}

                    {!success && (
                        <Form onSubmit={handleSubmit}>
                            <Form.Group className="mb-3" controlId="newPassword">
                                <Form.Label>New password</Form.Label>
                                <Form.Control
                                    type="password"
                                    autoComplete="new-password"
                                    minLength={8}
                                    required
                                    value={password}
                                    onChange={(event) => setPassword(event.target.value)}
                                    disabled={loading}
                                />
                            </Form.Group>
                            <Form.Group className="mb-4" controlId="confirmNewPassword">
                                <Form.Label>Confirm new password</Form.Label>
                                <Form.Control
                                    type="password"
                                    autoComplete="new-password"
                                    minLength={8}
                                    required
                                    value={confirmPassword}
                                    onChange={(event) => setConfirmPassword(event.target.value)}
                                    disabled={loading}
                                />
                            </Form.Group>
                            <Button type="submit" className="w-100" disabled={loading}>
                                {loading ? 'Updating password…' : 'Update password'}
                            </Button>
                        </Form>
                    )}

                    {success && <Link className="btn btn-primary w-100" to="/login">Go to login</Link>}
                    {!success && (
                        <div className="text-center mt-3">
                            <Link to="/login">Return to login</Link>
                        </div>
                    )}
                </Card.Body>
            </Card>
        </Container>
    );
}
