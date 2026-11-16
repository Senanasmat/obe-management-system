import { useEffect, useState, useMemo } from 'react';
import { Users, BookOpen, GraduationCap, ArrowUpRight, Activity, Plus, Calendar, UserPlus, FileText, Settings, BarChart3, TrendingUp } from 'lucide-react';
import { Container, Row, Col, Card, Button, Badge, Navbar, Nav } from 'react-bootstrap';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, LineChart, Line } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/LoadingSpinner';

const ENTERPRISE_COLORS = {
    primary: '#0f172a',      // Deep navy
    secondary: '#1e293b',    // Slate
    accent: '#3b82f6',       // Indigo blue
    light: '#f8fafc',        // Light gray
    border: '#e2e8f0',       // Border gray
    success: '#10b981',      // Green
    warning: '#f59e0b',      // Amber
    info: '#06b6d4',         // Cyan
};

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.08
        }
    }
};

const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
};

const STAT_COLORS = {
    'users':     { bg: '#f0f4ff', icon: ENTERPRISE_COLORS.accent, label: 'Faculty Members', number: 1 },
    'courses':   { bg: '#f0fdf4', icon: ENTERPRISE_COLORS.success, label: 'Active Courses', number: 2 },
    'students':  { bg: '#f0f9ff', icon: ENTERPRISE_COLORS.info, label: 'Total Students', number: 3 },
    'plos':      { bg: '#fffbeb', icon: ENTERPRISE_COLORS.warning, label: 'Program Outcomes', number: 4 },
};

const StatCard = ({ title, count, icon: Icon, variant }) => {
    const color = STAT_COLORS[variant] || STAT_COLORS['users'];
    return (
        <motion.div variants={itemVariants} whileHover={{ y: -4, transition: { duration: 0.2 } }} className="h-100">
            <Card className="h-100 border-0" style={{
                backgroundColor: color.bg,
                borderLeft: `4px solid ${color.icon}`,
                boxShadow: '0 1px 3px rgba(15, 23, 42, 0.08)'
            }}>
                <Card.Body className="p-4">
                    <div className="d-flex align-items-flex-start justify-content-between">
                        <div>
                            <div className="text-uppercase fw-600 small mb-2" style={{ fontSize: '0.7rem', letterSpacing: '0.05em', color: ENTERPRISE_COLORS.secondary }}>{title}</div>
                            <div className="fw-bold" style={{ fontSize: '2.2rem', color: ENTERPRISE_COLORS.primary, lineHeight: '1' }}>{count}</div>
                        </div>
                        <div className="p-2 rounded-2" style={{ backgroundColor: 'rgba(255, 255, 255, 0.5)' }}>
                            <Icon size={24} style={{ color: color.icon }} strokeWidth={1.5} />
                        </div>
                    </div>
                </Card.Body>
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

    const [batches, setBatches] = useState([]);
    const [selectedBatch, setSelectedBatch] = useState('');

    const [batchPLOAchievements, setBatchPLOAchievements] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const config = { headers: { Authorization: `Bearer ${user.token}` } };
                const statsRes = await api.get('/api/admin/stats', config);
                setStats(statsRes.data);

                // Get students and extract unique batches
                const studentsRes = await api.get('/api/admin/students', config);

                const uniqueBatches = [
                    ...new Set(
                        studentsRes.data
                            .map(student => student.batch)
                            .filter(Boolean)
                    )
                ].sort();

                setBatches(uniqueBatches);

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

    useEffect(() => {
        const fetchBatchPLOAchievements = async () => {
            if (!selectedBatch || !user?.token) {
                setBatchPLOAchievements([]);
                return;
            }

            try {
                const config = {
                    headers: {
                        Authorization: `Bearer ${user.token}`
                    }
                };

                const res = await api.get(
                    `/api/admin/stats/plo-achievements?batch=${encodeURIComponent(selectedBatch)}`,
                    config
                );

                setBatchPLOAchievements(res.data.ploAchievements || []);
            } catch (error) {
                console.error("Error fetching batch PLO achievements:", error);
                setBatchPLOAchievements([]);
            }
        };

        fetchBatchPLOAchievements();
    }, [selectedBatch, user]);

    const COLORS = ['#4c1d95', '#7c3aed', '#198754', '#6c757d'];

    const distributionData = useMemo(() => [
        { name: 'Students', value: stats.totalStudents },
        { name: 'Faculty', value: stats.totalFaculty },
        { name: 'Courses', value: stats.totalCourses },
        { name: 'PLOs', value: stats.totalPLOs },
    ], [stats]);

    if (loading) return <LoadingSpinner />;

    return (
        <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="pb-5"
            style={{ backgroundColor: ENTERPRISE_COLORS.light, minHeight: '100vh' }}
        >
            {/* Header Section */}
            <div style={{ backgroundColor: ENTERPRISE_COLORS.primary, color: 'white', padding: '2rem 0' }}>
                <Container fluid className="px-3 px-md-4">
                    <div className="d-flex justify-content-between align-items-center">
                        <div>
                            <h1 className="fw-bold mb-1" style={{ fontSize: 'clamp(1.8rem, 5vw, 2.2rem)', letterSpacing: '-0.02em' }}>
                                SuperAdmin Dashboard
                            </h1>
                            <p className="mb-0" style={{ color: '#cbd5e1', fontSize: '0.95rem' }}>
                                System administration & oversight
                            </p>
                        </div>
                        <div className="d-flex align-items-center gap-2" style={{ color: '#cbd5e1' }}>
                            <Calendar size={18} />
                            <span>{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                    </div>
                </Container>
            </div>

            {/* Main Content */}
            <Container fluid className="px-3 px-md-4 mt-4">
                {/* Stats Grid */}
                <Row className="g-4 mb-5">
                    <Col xs={12} sm={6} lg={3}>
                        <StatCard
                            title="Total Students"
                            count={stats.totalStudents}
                            icon={Users}
                            variant="students"
                        />
                    </Col>
                    <Col xs={12} sm={6} lg={3}>
                        <StatCard
                            title="Active Faculty"
                            count={stats.totalFaculty}
                            icon={Users}
                            variant="users"
                        />
                    </Col>
                    <Col xs={12} sm={6} lg={3}>
                        <StatCard
                            title="Active Courses"
                            count={stats.totalCourses}
                            icon={BookOpen}
                            variant="courses"
                        />
                    </Col>
                    <Col xs={12} sm={6} lg={3}>
                        <StatCard
                            title="Total PLOs"
                            count={stats.totalPLOs}
                            icon={GraduationCap}
                            variant="plos"
                        />
                    </Col>
                </Row>

                {/* Quick Actions */}
                <Row className="g-4 mb-5">
                    <Col lg={12}>
                        <motion.div variants={itemVariants}>
                            <Card className="border-0" style={{
                                backgroundColor: 'white',
                                boxShadow: '0 1px 3px rgba(15, 23, 42, 0.1)'
                            }}>
                                <Card.Body className="p-4">
                                    <div className="d-flex align-items-center gap-2 mb-4">
                                        <Settings size={20} style={{ color: ENTERPRISE_COLORS.primary }} />
                                        <h5 className="fw-bold mb-0" style={{ color: ENTERPRISE_COLORS.primary, fontSize: '1.1rem' }}>Quick Actions</h5>
                                    </div>
                                    <div className="d-flex flex-wrap gap-3">
                                        <Button className="px-4 py-2 fw-600 border-0 rounded-2" style={{ backgroundColor: ENTERPRISE_COLORS.primary, color: 'white', fontSize: '0.95rem' }} onClick={() => window.location.href = '/admin/students'}>
                                            <UserPlus size={18} className="me-2" style={{ display: 'inline' }} /> Register Student
                                        </Button>
                                        <Button className="px-4 py-2 fw-600 border-0 rounded-2" style={{ backgroundColor: ENTERPRISE_COLORS.accent, color: 'white', fontSize: '0.95rem' }} onClick={() => window.location.href = '/admin/faculty'}>
                                            <Users size={18} className="me-2" style={{ display: 'inline' }} /> Register Faculty
                                        </Button>
                                        <Button className="px-4 py-2 fw-600 border-0 rounded-2" style={{ backgroundColor: ENTERPRISE_COLORS.success, color: 'white', fontSize: '0.95rem' }} onClick={() => window.location.href = '/admin/courses'}>
                                            <Plus size={18} className="me-2" style={{ display: 'inline' }} /> Add Course
                                        </Button>
                                        <Button className="px-4 py-2 fw-600 border-0 rounded-2" style={{ backgroundColor: ENTERPRISE_COLORS.warning, color: 'white', fontSize: '0.95rem' }} onClick={() => window.location.href = '/admin/plos'}>
                                            <GraduationCap size={18} className="me-2" style={{ display: 'inline' }} /> Manage PLOs
                                        </Button>
                                    </div>
                                </Card.Body>
                            </Card>
                        </motion.div>
                    </Col>
                </Row>

                {/* PLO Attainment Chart */}
                <Row className="g-4 mb-5">
                    <Col lg={12}>
                        <motion.div variants={itemVariants}>
                            <Card className="border-0" style={{
                                backgroundColor: 'white',
                                boxShadow: '0 1px 3px rgba(15, 23, 42, 0.1)'
                            }}>
                                <Card.Body className="p-4">
                                    <div className="d-flex justify-content-between align-items-start mb-4">
                                        <div>
                                            <div className="d-flex align-items-center gap-2 mb-2">
                                                <BarChart3 size={20} style={{ color: ENTERPRISE_COLORS.primary }} />
                                                <h5 className="fw-bold mb-0" style={{ color: ENTERPRISE_COLORS.primary, fontSize: '1.1rem' }}>
                                                    PLO Attainment Analysis
                                                </h5>
                                            </div>
                                            <p className="text-muted small mb-0">
                                                Select a batch to view program learning outcomes achievement
                                            </p>
                                        </div>
                                        <div className="d-flex align-items-center gap-2">
                                            <label className="fw-600 text-muted small mb-0" htmlFor="batchSelect" style={{ fontSize: '0.9rem' }}>
                                                Batch:
                                            </label>
                                            <select
                                                id="batchSelect"
                                                className="form-select form-select-sm"
                                                value={selectedBatch}
                                                onChange={(e) => setSelectedBatch(e.target.value)}
                                                style={{
                                                    minWidth: '160px',
                                                    borderRadius: '6px',
                                                    borderColor: ENTERPRISE_COLORS.border,
                                                    color: ENTERPRISE_COLORS.primary
                                                }}
                                            >
                                                <option value="">Select Batch</option>
                                                {batches.map((batch) => (
                                                    <option key={batch} value={batch}>{batch}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {!selectedBatch ? (
                                        <div
                                            className="d-flex flex-column justify-content-center align-items-center text-center"
                                            style={{
                                                height: 'clamp(280px, 60vw, 380px)',
                                                backgroundColor: ENTERPRISE_COLORS.light,
                                                borderRadius: '8px'
                                            }}
                                        >
                                            <GraduationCap size={48} strokeWidth={1.5} style={{ color: '#cbd5e1', marginBottom: '1rem' }} />
                                            <h6 className="fw-600 mb-1" style={{ color: ENTERPRISE_COLORS.secondary }}>
                                                Select a batch to view PLO attainment
                                            </h6>
                                            <p className="small mb-0" style={{ color: '#94a3b8' }}>
                                                Choose a batch from the dropdown above
                                            </p>
                                        </div>
                                    ) : (
                                        <div style={{ width: '100%', height: 'clamp(280px, 60vw, 380px)' }}>
                                            <ResponsiveContainer>
                                                <BarChart
                                                    data={batchPLOAchievements}
                                                    margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
                                                >
                                                    <CartesianGrid
                                                        strokeDasharray="3 3"
                                                        vertical={false}
                                                        stroke={ENTERPRISE_COLORS.border}
                                                    />
                                                    <XAxis
                                                        dataKey="code"
                                                        axisLine={false}
                                                        tickLine={false}
                                                        tick={{ fill: ENTERPRISE_COLORS.secondary, fontSize: 12 }}
                                                    />
                                                    <YAxis
                                                        domain={[0, 100]}
                                                        ticks={[0, 25, 50, 75, 100]}
                                                        tickFormatter={(value) => `${value}%`}
                                                        axisLine={false}
                                                        tickLine={false}
                                                        tick={{ fill: ENTERPRISE_COLORS.secondary, fontSize: 12 }}
                                                    />
                                                    <Tooltip
                                                        cursor={{ fill: 'rgba(15, 23, 42, 0.05)' }}
                                                        formatter={(value) => [`${Number(value).toFixed(2)}%`, 'PLO Attainment']}
                                                        contentStyle={{
                                                            borderRadius: '8px',
                                                            border: `1px solid ${ENTERPRISE_COLORS.border}`,
                                                            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.1)',
                                                            padding: '12px',
                                                            backgroundColor: 'white'
                                                        }}
                                                    />
                                                    <Bar
                                                        dataKey="achievement"
                                                        fill={ENTERPRISE_COLORS.accent}
                                                        radius={[6, 6, 0, 0]}
                                                        barSize={40}
                                                    />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    )}

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
                .fw-600 { font-weight: 600; }

                .form-select, .form-select-sm {
                    border-color: ${ENTERPRISE_COLORS.border} !important;
                    color: ${ENTERPRISE_COLORS.primary} !important;
                    background-color: white !important;
                }

                .form-select:focus, .form-select-sm:focus {
                    border-color: ${ENTERPRISE_COLORS.accent} !important;
                    box-shadow: 0 0 0 0.2rem rgba(59, 130, 246, 0.25) !important;
                }

                button {
                    transition: all 0.2s ease;
                }

                button:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15) !important;
                }
            `}</style>
        </motion.div>
    );
};

export default AdminDashboard;
