import { useEffect, useState, useMemo } from 'react';
import { Users, BookOpen, GraduationCap, ArrowUpRight, Activity, Plus, Calendar, UserPlus, FileText } from 'lucide-react';
import { Container, Row, Col, Card, Button, Badge } from 'react-bootstrap';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
};

const STAT_COLORS = {
    'bg-purple':    { bg: '#ede9fe', icon: '#6d28d9', bar: '#4c1d95' },
    'bg-success':   { bg: '#dcfce7', icon: '#16a34a', bar: '#16a34a' },
    'bg-secondary': { bg: '#f1f5f9', icon: '#64748b', bar: '#64748b' },
    'bg-warning':   { bg: '#fef9c3', icon: '#ca8a04', bar: '#ca8a04' },
};

const StatCard = ({ title, count, icon: Icon, color }) => {
    const c = STAT_COLORS[color] || STAT_COLORS['bg-purple'];
    return (
        <motion.div variants={itemVariants} whileHover={{ y: -5, transition: { duration: 0.2 } }} className="h-100" style={{ overflow: 'visible' }}>
            <Card className="h-100 shadow-sm border-0 position-relative" style={{ minHeight: '120px', overflow: 'visible' }}>
                <Card.Body className="d-flex flex-column p-3 h-100 justify-content-center">
                    <div className="d-flex align-items-center justify-content-between">
                        <div className="text-truncate me-2" style={{ minWidth: 0 }}>
                            <div className="text-muted mb-1 small text-uppercase fw-bold" style={{ fontSize: '0.7rem', letterSpacing: '0.05em' }}>{title}</div>
                            <div className="fw-bold mb-0 text-dark" style={{ fontSize: 'clamp(1.5rem, 5vw, 2rem)', lineHeight: '1.2' }}>{count}</div>
                        </div>
                        <div className="p-2 rounded-3 flex-shrink-0" style={{ backgroundColor: c.bg }}>
                            <Icon size={24} style={{ color: c.icon }} />
                        </div>
                    </div>
                </Card.Body>
                <div className="position-absolute bottom-0 start-0 w-100 rounded-bottom" style={{ height: '4px', backgroundColor: c.bar, opacity: 0.7 }} />
            </Card>
        </motion.div>
    );
};

const AdminDashboard = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        totalStudents: 0,
        totalCourses: 0,
        totalPLOs: 0,
        totalFaculty: 0,
        totalCLOs: 0,
        totalAssessments: 0,
        cloAchievements: [],
        ploAchievements: []
    });
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const config = { headers: { Authorization: `Bearer ${user.token}` } };
                const statsRes = await api.get('/api/admin/stats', config);
                setStats(statsRes.data);
                setLoading(false);
            } catch (error) {
                console.error("Error fetching dashboard data:", error);
                setLoading(false);
            }
        };

        if (user && user.token) {
            fetchData();
            // Poll every 10 seconds so counts stay up-to-date
            const interval = setInterval(fetchData, 10000);
            return () => clearInterval(interval);
        }
    }, [user]);

    const COLORS = ['#4c1d95', '#7c3aed', '#198754', '#6c757d'];

    const distributionData = useMemo(() => [
        { name: 'Students', value: stats.totalStudents },
        { name: 'Faculty', value: stats.totalFaculty },
        { name: 'Courses', value: stats.totalCourses },
        { name: 'PLOs', value: stats.totalPLOs },
    ], [stats]);

    // if (loading) return (
    //     <div className="d-flex justify-content-center align-items-center min-vh-100">
    //         <div className="spinner-border text-primary" role="status">
    //             <span className="visually-hidden">Loading...</span>
    //         </div>
    //     </div>
    // );

    return (
        <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="pb-5"
        >
            <Container fluid className="px-3 px-md-4">
                <div className="d-flex justify-content-between align-items-center mb-4 mt-3 pt-1 flex-wrap gap-2">
                    <div>
                        <h2 className="fw-bold text-dark mb-0" style={{ fontSize: 'clamp(1.5rem, 5vw, 2rem)' }}>SuperAdmin Dashboard</h2>

                    </div>
                    <div className="d-flex gap-2">
                        <Button variant="light" className="shadow-sm border-0 bg-white" style={{ fontSize: '0.85rem' }}>
                            <Calendar size={16} className="me-2" /> {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </Button>
                    </div>
                </div>

                <Row className="g-3 mb-4 pt-1">
                    <Col xs={12} sm={6} md={4} lg>
                        <StatCard
                            title="Total Students"
                            count={stats.totalStudents}
                            icon={Users}
                            color="bg-purple"
                        />
                    </Col>
                    <Col xs={12} sm={6} md={4} lg>
                        <StatCard
                            title="Active Faculty"
                            count={stats.totalFaculty}
                            icon={Users}
                            color="bg-purple"
                        />
                    </Col>
                    <Col xs={12} sm={6} md={4} lg>
                        <StatCard
                            title="Active Courses"
                            count={stats.totalCourses}
                            icon={BookOpen}
                            color="bg-purple"
                        />
                    </Col>
                    <Col xs={12} sm={6} md={4} lg>
                        <StatCard
                            title="Total PLOs"
                            count={stats.totalPLOs}
                            icon={GraduationCap}
                            color="bg-secondary"
                        />
                    </Col>
                </Row>

                <Row className="g-3 mb-4">
                    <Col lg={12}>
                        <motion.div variants={itemVariants}>
                            <Card className="shadow-sm border-0 overflow-hidden">
                                <Card.Header className="bg-white border-0 pt-3 px-3 pb-0 d-flex justify-content-between align-items-center">
                                    <h5 className="fw-bold mb-0" style={{ fontSize: '1rem' }}>Quick Actions</h5>
                                    <Activity size={20} className="text-primary" />
                                </Card.Header>
                                <Card.Body className="p-3">
                                    <div className="d-flex flex-wrap gap-2">
                                        <Button className="rounded-pill px-3 py-2 fw-bold shadow-sm border-0 flex-grow-1" style={{ backgroundColor: '#4c1d95', fontSize: '0.9rem', minWidth: '150px' }} onClick={() => window.location.href = '/admin/students'}>
                                            <UserPlus size={16} className="me-2" /> Register Student
                                        </Button>
                                        <Button className="rounded-pill px-3 py-2 fw-bold shadow-sm border-0 flex-grow-1" style={{ backgroundColor: '#6d28d9', fontSize: '0.9rem', minWidth: '150px' }} onClick={() => window.location.href = '/admin/faculty'}>
                                            <UserPlus size={16} className="me-2" /> Register Faculty
                                        </Button>
                                        <Button variant="success" className="rounded-pill px-3 py-2 fw-bold shadow-sm flex-grow-1" style={{ fontSize: '0.9rem', minWidth: '150px' }} onClick={() => window.location.href = '/admin/courses'}>
                                            <Plus size={16} className="me-2" /> Add New Course
                                        </Button>
                                        <Button variant="secondary" className="rounded-pill px-3 py-2 fw-bold shadow-sm flex-grow-1" style={{ fontSize: '0.9rem', minWidth: '150px' }} onClick={() => window.location.href = '/admin/plos'}>
                                            <GraduationCap size={16} className="me-2" /> Manage PLOs
                                        </Button>
                                    </div>
                                </Card.Body>
                            </Card>
                        </motion.div>
                    </Col>
                </Row>

                <Row className="g-3 mb-4">
                    <Col lg={12}>
                        <motion.div variants={itemVariants}>
                            <Card className="shadow-sm border-0 h-100 overflow-hidden">
                                <Card.Header className="bg-white border-0 pt-3 px-3 pb-0 d-flex justify-content-between align-items-center flex-wrap gap-2">
                                    <h5 className="fw-bold mb-0" style={{ fontSize: '1rem' }}>PLO Achievement Performance</h5>
                                    <Badge bg="success-subtle" className="text-success px-3 py-2 rounded-pill fw-medium" style={{ fontSize: '0.8rem' }}>PLOs</Badge>
                                </Card.Header>
                                <Card.Body className="p-3">
                                    <div style={{ width: '100%', height: 'clamp(250px, 60vw, 350px)' }}>
                                        <ResponsiveContainer>
                                            <BarChart data={stats.ploAchievements || []} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                                <XAxis
                                                    dataKey="code"
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={{ fill: '#999', fontSize: 12 }}
                                                />
                                                <YAxis
                                                    unit="%"
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={{ fill: '#999', fontSize: 12 }}
                                                />
                                                <Tooltip
                                                    cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                                                    contentStyle={{
                                                        borderRadius: '12px',
                                                        border: 'none',
                                                        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                                                        padding: '12px'
                                                    }}
                                                />
                                                <Bar
                                                    dataKey="achievement"
                                                    fill="#198754"
                                                    radius={[6, 6, 0, 0]}
                                                    barSize={40}
                                                />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </Card.Body>
                            </Card>
                        </motion.div>
                    </Col>
                </Row>
            </Container>

            <style>{`
                .rounded-xl { border-radius: 1rem; }
                .ls-wide { letter-spacing: 0.05em; }
                .smaller { font-size: 0.8rem; }
                .transition-all { transition: all 0.3s ease; }
                .btn-light:hover { background-color: #f8f9fa !important; box-shadow: 0 4px 12px rgba(0,0,0,0.05) !important; }
            `}</style>
        </motion.div>
    );
};

export default AdminDashboard;
