import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, BookOpen, Users, GraduationCap, FileText, ChevronRight, LogOut } from 'lucide-react';
import { ListGroup } from 'react-bootstrap';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

const Sidebar = ({ role }) => {
    const location = useLocation();
    const { logout } = useAuth();
    const isActive = (path) => location.pathname === path;

    const navItems = role === 'admin' ? [
        { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
        { name: 'Faculty', path: '/admin/faculty', icon: Users },
        { name: 'Courses', path: '/admin/courses', icon: BookOpen },
        { name: 'Students', path: '/admin/students', icon: Users },
        { name: 'PLOs', path: '/admin/plos', icon: GraduationCap },
        { name: 'CLOs', path: '/admin/clos', icon: FileText },
    ] : [
        { name: 'Dashboard', path: '/faculty', icon: LayoutDashboard },
        { name: 'My Courses', path: '/faculty/courses', icon: BookOpen },
    ];

    return (
        <motion.div
            initial={{ x: -250 }}
            animate={{ x: 0 }}
            className="bg-white border-end shadow-sm"
            style={{ width: '280px', minHeight: '100vh', display: 'flex', flexDirection: 'column', zIndex: 1000 }}
        >
            <div className="p-4 mb-2 d-flex align-items-center justify-content-center border-bottom bg-primary bg-opacity-10">
                <div className="bg-primary rounded-circle p-2 me-3 shadow-sm d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}>
                    <GraduationCap className="text-white" size={24} />
                </div>
                <span className="h5 mb-0 text-primary fw-bold tracking-tight">OBE DASHBOARD</span>
            </div>

            <ListGroup variant="flush" className="flex-grow-1 px-3 py-2 scrollbar-hide" style={{ overflowY: 'auto' }}>
                <p className="text-muted small fw-bold text-uppercase px-3 mb-2 mt-3 opacity-50" style={{ fontSize: '0.7rem' }}>Navigation</p>
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.path);
                    return (
                        <motion.div
                            key={item.name}
                            whileHover={{ x: 5 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <Link
                                to={item.path}
                                className={`list-group-item list-group-item-action border-0 rounded-3 mb-2 d-flex align-items-center py-3 px-3 transition-all ${active ? 'bg-primary text-white shadow-sm' : 'text-muted'}`}
                                style={{ fontSize: '0.95rem', fontWeight: active ? '600' : '500' }}
                            >
                                <Icon className={`me-3 ${active ? 'text-white' : 'text-muted opacity-75'}`} size={20} />
                                <span className="flex-grow-1">{item.name}</span>
                                {active && <ChevronRight size={16} className="text-white opacity-75" />}
                            </Link>
                        </motion.div>
                    );
                })}
            </ListGroup>

            <div className="p-3 border-top mt-auto">
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <button
                        onClick={logout}
                        className="btn btn-light w-100 d-flex align-items-center justify-content-start gap-3 py-3 border-0 rounded-3 text-danger fw-600 bg-danger-subtle bg-opacity-25"
                    >
                        <LogOut size={20} />
                        <span>Sign Out</span>
                    </button>
                </motion.div>
            </div>
        </motion.div>
    );
};

export default Sidebar;
