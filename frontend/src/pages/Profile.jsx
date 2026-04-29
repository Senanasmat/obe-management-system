import { useAuth } from '../context/AuthContext';
import { Card, Container } from 'react-bootstrap';

const Profile = () => {
    const { user } = useAuth();

    return (
        <Container className="py-4">
            <h3 className="mb-4">My Profile</h3>

            <Card className="shadow-sm border-0">
                <Card.Body>

                    <div className="mb-3">
                        <p className="mb-1">
                            <span className="text-muted">Name: </span>
                            <span className="fw-bold">{user?.name}</span>
                        </p>
                    </div>

                    <div className="mb-3">
                        <p className="mb-1">
                            <span className="text-muted">Email: </span>
                            <span className="fw-bold">{user?.email}</span>
                        </p>
                    </div>

                    <div className="mb-3">
                        <p className="mb-1">
                            <span className="text-muted">Role: </span>
                            <span className="fw-bold text-capitalize">{user?.role}</span>
                        </p>
                    </div>

                </Card.Body>
            </Card>
        </Container>
    );
};

export default Profile;