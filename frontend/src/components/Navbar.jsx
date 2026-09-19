import { useState } from 'react';
import { User, LogOut, Menu, X } from 'lucide-react';
import obeLogo from '../assets/obe-logo.png';
import { Navbar as BsNavbar, Container, Form, Dropdown } from 'react-bootstrap';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = ({ user }) => {
    const { logout } = useAuth();
    const navigate = useNavigate();
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <BsNavbar bg="white" className="border-bottom py-2 shadow-sm sticky-top" style={{ zIndex: 900, minHeight: '70px' }}>
            <Container fluid className="px-3">
                <div className="d-flex justify-content-between align-items-center w-100">
                    {/* LEFT SIDE: LOGO */}
                    <div className="d-flex align-items-center gap-2">
                        <img
                            src={obeLogo}
                            alt="University Logo"
                            style={{ height: '50px', width: 'auto', objectFit: 'contain' }}
                        />
                        <div className="d-none d-md-block">
                            <div style={{ color: '#4c1d95', fontWeight: '800', fontSize: '1rem', lineHeight: 1.1 }}>OBE Management</div>
                            <div style={{ color: '#7c3aed', fontSize: '0.72rem', fontWeight: 500, letterSpacing: '0.03em' }}>Outcome-Based Education</div>
                        </div>
                    </div>

                    {/* RIGHT SIDE */}
                    <div className="d-flex align-items-center gap-3">
                        {/* PROFILE DROPDOWN */}
                        <Dropdown align="end">
                            <Dropdown.Toggle
                                variant="light"
                                className="d-flex align-items-center gap-2 border-0 bg-transparent shadow-none p-0"
                            >
                                <div className="bg-light text-muted rounded-circle p-2 d-flex align-items-center justify-content-center border" style={{ width: '38px', height: '38px' }}>
                                    <User size={20} />
                                </div>
                            </Dropdown.Toggle>

                            <Dropdown.Menu className="shadow-sm border-0 rounded-3 mt-2">
                                <div className="px-3 py-2 border-bottom mb-1">
                                    <p className="mb-0 fw-bold small">{user.name}</p>
                                    <p className="mb-0 text-muted smaller text-capitalize">{user.role}</p>
                                </div>
                                <Dropdown.Item onClick={() => navigate('/profile')} className="small">
                                    <User size={14} className="me-2" />
                                    Profile
                                </Dropdown.Item>
                                <Dropdown.Item onClick={logout} className="text-danger small">
                                    <LogOut size={14} className="me-2" />
                                    Sign Out
                                </Dropdown.Item>
                            </Dropdown.Menu>
                        </Dropdown>

                        {/* MOBILE MENU TOGGLE */}
                        <button
                            className="d-md-none border-0 bg-transparent p-0"
                            onClick={() => setMenuOpen(!menuOpen)}
                            style={{ cursor: 'pointer', color: '#4c1d95' }}
                        >
                            {menuOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                    </div>
                </div>

                {/* MOBILE MENU */}
                {menuOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="d-md-none mt-3 pb-3 border-top pt-3"
                    >
                        <div style={{ color: '#4c1d95', fontWeight: '800', fontSize: '1.1rem', marginBottom: '8px' }}>
                            OBE Management
                        </div>
                        <div style={{ color: '#7c3aed', fontSize: '0.85rem', fontWeight: 500, marginBottom: '16px' }}>
                            Outcome-Based Education Platform
                        </div>
                    </motion.div>
                )}
            </Container>

            <style>{`
                .cursor-pointer { cursor: pointer; }
                .smaller { font-size: 0.75rem; }
            `}</style>
        </BsNavbar>
    );
};

export default Navbar;