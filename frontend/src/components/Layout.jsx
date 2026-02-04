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
        <div className="d-flex" style={{ height: '100vh', overflow: 'hidden' }}>
            <Sidebar role={user.role} />
            <div className="d-flex flex-column flex-grow-1" style={{ overflow: 'hidden' }}>
                <Navbar user={user} />
                <main className="flex-grow-1 p-4 bg-light" style={{ overflowY: 'auto' }}>
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default Layout;
