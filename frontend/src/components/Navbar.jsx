import { User, Bell, Search, Settings, LogOut } from 'lucide-react';
import { Navbar as BsNavbar, Container, Form, Dropdown } from 'react-bootstrap';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = ({ user }) => {
    const { logout } = useAuth();
    const navigate = useNavigate();

    return (
        <BsNavbar bg="white" className="border-bottom py-2 shadow-sm sticky-top" style={{ zIndex: 900 }}>
            <Container fluid className="px-4">

                {/* SEARCH */}
                <div className="d-flex align-items-center flex-grow-1">
                    {user.role !== 'admin' && (
                        <div className="position-relative d-none d-md-block" style={{ width: '300px' }}>
                            <Form.Control
                                type="text"
                                placeholder="Quick search..."
                                className="ps-5 bg-light border-0 py-2 rounded-pill shadow-none"
                                style={{ fontSize: '0.9rem' }}
                            />
                            <Search
                                className="position-absolute text-muted"
                                size={18}
                                style={{ left: '15px', top: '50%', transform: 'translateY(-50%)' }}
                            />
                        </div>
                    )}
                </div>

                {/* RIGHT SIDE */}
                <div className="d-flex align-items-center gap-4">

                    {user.role !== 'admin' && (
                        <>
                            <motion.div whileHover={{ scale: 1.1 }} className="text-muted cursor-pointer position-relative">
                                <Bell size={20} />
                                <span className="position-absolute top-0 start-100 translate-middle p-1 bg-danger border border-light rounded-circle"></span>
                            </motion.div>

                            <motion.div whileHover={{ scale: 1.1 }} className="text-muted cursor-pointer">
                                <Settings size={20} />
                            </motion.div>
                        </>
                    )}

                    <div className="vr mx-2 text-muted opacity-25" style={{ height: '24px' }}></div>

                    {/* PROFILE DROPDOWN */}
                    <Dropdown align="end">

                        <Dropdown.Toggle
                            variant="light"
                            className="d-flex align-items-center gap-2 border-0 bg-transparent shadow-none"
                        >
                            <div className="text-end d-none d-sm-block">
                                <p className="mb-0 fw-bold small">{user.name}</p>
                                <p className="mb-0 text-muted smaller text-capitalize">{user.role}</p>
                            </div>

                            <motion.div
                                whileHover={{ scale: 1.05 }}
                                className="bg-primary bg-opacity-10 text-primary rounded-circle p-2 border border-primary border-opacity-25"
                            >
                                <User size={20} />
                            </motion.div>
                        </Dropdown.Toggle>

                        <Dropdown.Menu className="shadow-sm">

                            <Dropdown.Item onClick={() => navigate('/profile')}>
                                <User size={16} className="me-2" />
                                Profile
                            </Dropdown.Item>

                            <Dropdown.Divider />

                            <Dropdown.Item onClick={logout} className="text-danger">
                                <LogOut size={16} className="me-2" />
                                Sign Out
                            </Dropdown.Item>

                        </Dropdown.Menu>

                    </Dropdown>

                </div>
            </Container>

            <style>{`
                .cursor-pointer { cursor: pointer; }
                .smaller { font-size: 0.75rem; }
            `}</style>
        </BsNavbar>
    );
};

export default Navbar;