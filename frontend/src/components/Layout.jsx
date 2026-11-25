import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

const Layout = () => {
    const { user } = useAuth();
    const location = useLocation();

    if (!user) {
        return <Outlet />;
    }

    return (
        <div className="d-flex" style={{ height: '100vh', overflow: 'hidden', backgroundColor: '#f8f9fa' }}>
            <Sidebar role={user.role} />
            <div className="d-flex flex-column flex-grow-1" style={{ overflow: 'hidden' }}>
                <Navbar user={user} />
                <main className="flex-grow-1" style={{ overflowY: 'auto', position: 'relative', scrollbarGutter: 'stable' }}>
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={location.pathname}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            className="p-4"
                        >
                            <Outlet />
                        </motion.div>
                    </AnimatePresence>
                </main>
            </div>
        </div>
    );
};

export default Layout;
