import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { useAuth } from '../context/AuthContext';

const Layout = () => {
    const { user } = useAuth();

    if (!user) {
        return <Outlet />;
    }

    return (
        <div className="d-flex" style={{ height: '100vh', overflow: 'hidden', backgroundColor: '#f8f9fa' }}>
            <Sidebar role={user.role} />
            <div className="d-flex flex-column flex-grow-1" style={{ overflow: 'hidden' }}>
                <Navbar user={user} />
                <main className="flex-grow-1" style={{ overflowY: 'auto', position: 'relative', scrollbarGutter: 'stable' }}>
                    <div className="p-4" style={{ height: '100%' }}>
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Layout;
