import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, BookOpen, Users, GraduationCap, FileText } from 'lucide-react';
import { ListGroup } from 'react-bootstrap';

const Sidebar = ({ role }) => {
    const location = useLocation();
    const isActive = (path) => location.pathname === path;

    const navItems = role === 'admin' ? [
        { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
        { name: 'Courses', path: '/admin/courses', icon: BookOpen },
        { name: 'Students', path: '/admin/students', icon: Users },
        { name: 'PLOs', path: '/admin/plos', icon: GraduationCap },
        { name: 'CLOs', path: '/admin/clos', icon: FileText },
    ] : [
        { name: 'Dashboard', path: '/faculty', icon: LayoutDashboard },
        { name: 'My Courses', path: '/faculty/courses', icon: BookOpen },
    ];

    return (
        <div className="bg-light border-end" style={{ width: '250px', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <div className="p-3 border-bottom text-center">
                <span className="h4 text-primary font-weight-bold">OBE System</span>
            </div>
            <ListGroup variant="flush" className="flex-grow-1 p-2">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.name}
                            to={item.path}
                            className={`list-group-item list-group-item-action border-0 rounded mb-1 d-flex align-items-center ${isActive(item.path) ? 'active' : ''}`}
                            style={isActive(item.path) ? { backgroundColor: '#0d6efd', color: 'white' } : {}}
                        >
                            <Icon className="me-3" size={20} />
                            {item.name}
                        </Link>
                    );
                })}
            </ListGroup>
        </div>
    );
};

export default Sidebar;
