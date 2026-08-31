import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, BookOpen, Users, GraduationCap, FileText, ChevronRight, Settings, ListTodo, FileBarChart } from 'lucide-react';
import { ListGroup } from 'react-bootstrap';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

const Sidebar = ({ role }) => {
    const location = useLocation();
    const { logout } = useAuth();
    const isActive = (path) => location.pathname === path || (path !== '/faculty' && location.pathname.startsWith(path));

    const navItems = role === 'admin' ? [
        { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
        { name: 'Faculty', path: '/admin/faculty', icon: Users },
        { name: 'Courses', path: '/admin/courses', icon: BookOpen },
        { name: 'Students', path: '/admin/students', icon: Users },
        { name: 'PLOs', path: '/admin/plos', icon: GraduationCap },
    ] : [
        { name: 'Dashboards', path: '/faculty', icon: FileBarChart },
        { name: 'Operation', path: '/faculty/courses', icon: ListTodo },
        { name: 'Reports', path: '/faculty/reports', icon: FileText },
        { name: 'Settings', path: '/faculty/settings', icon: Settings },
    ];

    return (
        <motion.div
            initial={{ x: -250 }}
            animate={{ x: 0 }}
            className="bg-white border-end shadow-sm"
            style={{ width: '100px', minHeight: '100vh', display: 'flex', flexDirection: 'column', zIndex: 1000 }}
        >
            <div className="pt-3 pb-2 d-flex flex-column align-items-center justify-content-center">
                {/* Optional logo area */}
            </div>

            <ListGroup variant="flush" className="flex-grow-1 px-2 py-2 scrollbar-hide text-center" style={{ overflowY: 'auto' }}>
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.path);
                    return (
                        <motion.div
                            key={item.name}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="mb-3"
                        >
                            <Link
                                to={item.path}
                                className={`d-flex flex-column align-items-center py-2 px-1 text-decoration-none transition-all ${active ? '' : 'text-muted'}`}
                                style={{ borderRight: active ? '3px solid #4c1d95' : '3px solid transparent', color: active ? '#4c1d95' : undefined }}
                            >
                                <Icon className={`mb-1 ${active ? '' : 'text-muted'}`} size={24} style={{ color: active ? '#4c1d95' : undefined }} />
                                <span style={{ fontSize: '0.75rem', fontWeight: active ? '600' : '400' }}>{item.name}</span>
                            </Link>
                        </motion.div>
                    );
                })}
            </ListGroup>

        </motion.div>
    );
};

export default Sidebar;
