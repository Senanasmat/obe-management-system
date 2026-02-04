import { useAuth } from '../context/AuthContext';
import { LogOut, User } from 'lucide-react';
import { Navbar as BsNavbar, Container, Button } from 'react-bootstrap';

const Navbar = ({ user }) => {
    const { logout } = useAuth();

    return (
        <BsNavbar bg="white" variant="light" className="border-bottom shadow-sm px-4">
            <Container fluid>
                <BsNavbar.Brand className="text-dark">Welcome, {user.name}</BsNavbar.Brand>
                <div className="d-flex align-items-center gap-3">
                    <div className="d-flex align-items-center text-secondary">
                        <User size={20} className="me-1" />
                        <span className="text-capitalize">{user.role}</span>
                    </div>
                    <Button variant="outline-danger" size="sm" onClick={logout} className="d-flex align-items-center">
                        <LogOut size={16} className="me-2" />
                        Logout
                    </Button>
                </div>
            </Container>
        </BsNavbar>
    );
};

export default Navbar;
