import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { Container, Card, Row, Col, Button, Badge } from 'react-bootstrap';
import { PlusCircle, FileText, BarChart2, ArrowRight, ClipboardList } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const containerVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, staggerChildren: 0.07 } }
};
const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
};

const COLORS_CLO = ['#4F46E5', '#7C3AED', '#EC4899', '#F59E0B', '#10B981'];
const COLORS_PLO = ['#10B981', '#059669', '#047857', '#065F46', '#064E3B'];

const CourseView = () => {
    const { courseId } = useParams();
    const { user } = useAuth();
    const [analytics, setAnalytics] = useState(null);
    const [assessments, setAssessments] = useState([]);
    const [activeTab, setActiveTab] = useState('assessments');

    useEffect(() => {
        const config = { headers: { Authorization: `Bearer ${user.token}` } };
        axios.get(`/api/faculty/analytics/${courseId}`, config).then(r => setAnalytics(r.data)).catch(console.error);
        axios.get(`/api/faculty/courses/${courseId}/assessments`, config).then(r => setAssessments(r.data)).catch(console.error);
    }, [courseId, user.token]);

    const tabs = [
        { key: 'assessments', label: 'Assessments', icon: ClipboardList },
        { key: 'analytics', label: 'OBE Analytics', icon: BarChart2 },
        { key: 'activities', label: 'Class Activities', icon: FileText }
    ];

    return (
        <motion.div initial="hidden" animate="visible" variants={containerVariants}>
            <Container fluid className="py-4 px-4">
                {/* Header */}
                <motion.div variants={itemVariants} className="d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h2 className="mb-0 text-dark fw-bold display-6 fs-3">Course Overview</h2>
                        <p className="text-muted small mb-0">Manage assessments and track OBE outcomes</p>
                    </div>
                    <Link to={`/faculty/courses/${courseId}/create-assessment`}>
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                            <Button variant="primary" className="d-flex align-items-center gap-2 shadow-sm px-4 py-2 border-0">
                                <PlusCircle size={18} /> Create Assessment
                            </Button>
                        </motion.div>
                    </Link>
                </motion.div>

                {/* Custom Tabs */}
                <motion.div variants={itemVariants} className="d-flex gap-2 mb-4 border-bottom pb-3">
                    {tabs.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`btn d-flex align-items-center gap-2 px-4 py-2 rounded-pill fw-semibold small border-0 ${activeTab === tab.key ? 'btn-primary shadow-sm' : 'btn-light text-muted'}`}
                        >
                            <tab.icon size={16} /> {tab.label}
                        </button>
                    ))}
                </motion.div>

                <AnimatePresence mode="wait">
                    {activeTab === 'assessments' && (
                        <motion.div key="assessments" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                            <Row className="g-4">
                                {assessments.length > 0 ? assessments.map((a, idx) => (
                                    <Col key={a._id} md={6} lg={4}>
                                        <motion.div whileHover={{ y: -4 }} className="h-100">
                                            <Card className="h-100 border-0 shadow-sm rounded-4 overflow-hidden">
                                                <div className="p-4 pb-3">
                                                    <div className="d-flex justify-content-between align-items-start mb-3">
                                                        <div className="bg-primary-subtle text-primary rounded-3 p-2">
                                                            <FileText size={20} />
                                                        </div>
                                                        <Badge bg="secondary-subtle" text="secondary" className="rounded-pill px-3 py-2 fw-medium border-0">
                                                            {a.type}
                                                        </Badge>
                                                    </div>
                                                    <h5 className="fw-bold text-dark mb-1">{a.title}</h5>
                                                    <p className="text-muted small mb-0">{a.questions?.length || 0} Questions · {a.totalMarks} Total Marks</p>
                                                </div>
                                                <div className="bg-light px-4 py-3 border-top">
                                                    <Link to={`/faculty/courses/${courseId}/marks/${a._id}`} className="text-decoration-none">
                                                        <div className="d-flex align-items-center text-primary small fw-bold">
                                                            Enter Marks <ArrowRight size={15} className="ms-1" />
                                                        </div>
                                                    </Link>
                                                </div>
                                            </Card>
                                        </motion.div>
                                    </Col>
                                )) : (
                                    <Col xs={12}>
                                        <div className="text-center py-5 bg-white rounded-4 shadow-sm">
                                            <div className="bg-light d-inline-block p-4 rounded-circle mb-3">
                                                <ClipboardList size={40} className="text-muted" />
                                            </div>
                                            <h5 className="fw-bold">No Assessments Yet</h5>
                                            <p className="text-muted mb-4">Create your first assessment to start tracking OBE outcomes.</p>
                                            <Link to={`/faculty/courses/${courseId}/create-assessment`}>
                                                <Button variant="primary" className="px-5 border-0 shadow-sm">Create Assessment</Button>
                                            </Link>
                                        </div>
                                    </Col>
                                )}
                            </Row>
                        </motion.div>
                    )}

                    {activeTab === 'activities' && (
                        <motion.div
                            key="activities"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                        >
                            <Card className="border-0 shadow-sm rounded-4 p-4">
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <h5 className="fw-bold mb-0">Class Activities</h5>

                                    <Link to={`/faculty/courses/${courseId}/class-activities`}>
                                        <Button variant="primary" className="d-flex align-items-center gap-2">
                                            <PlusCircle size={16} />
                                            Manage Activities
                                        </Button>
                                    </Link>
                                </div>

                                <p className="text-muted mb-0">
                                    Create quizzes, assignments, attendance and track student performance.
                                </p>
                            </Card>
                        </motion.div>
                    )}

                    {activeTab === 'analytics' && (
                        <motion.div key="analytics" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                            <Row className="g-4">
                                <Col md={12}>
                                    <Card className="shadow-sm border-0 rounded-4">
                                        <Card.Body className="p-4">
                                            <h5 className="fw-bold mb-1">CLO Achievement</h5>
                                            <p className="text-muted small mb-4">Percentage of students achieving each Course Learning Outcome</p>
                                            {analytics?.cloStats?.length > 0 ? (
                                                <div style={{ height: '300px' }}>
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <BarChart data={analytics.cloStats} barSize={40}>
                                                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                                            <XAxis dataKey="cloCode" tick={{ fontSize: 13, fill: '#6b7280' }} />
                                                            <YAxis domain={[0, 100]} tick={{ fontSize: 13, fill: '#6b7280' }} tickFormatter={v => `${v}%`} />
                                                            <Tooltip formatter={v => [`${v.toFixed(1)}%`, 'Achievement']} />
                                                            <Bar dataKey="percentage" name="Achievement %" radius={[6, 6, 0, 0]}>
                                                                {analytics.cloStats.map((_, i) => <Cell key={i} fill={COLORS_CLO[i % COLORS_CLO.length]} />)}
                                                            </Bar>
                                                        </BarChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            ) : <p className="text-muted py-4 text-center">No CLO data available yet. Enter marks to see analytics.</p>}
                                        </Card.Body>
                                    </Card>
                                </Col>
                                <Col md={12}>
                                    <Card className="shadow-sm border-0 rounded-4">
                                        <Card.Body className="p-4">
                                            <h5 className="fw-bold mb-1">PLO Achievement</h5>
                                            <p className="text-muted small mb-4">How this course contributes to Program Learning Outcomes</p>
                                            {analytics?.ploStats?.length > 0 ? (
                                                <div style={{ height: '300px' }}>
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <BarChart data={analytics.ploStats} barSize={40}>
                                                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                                            <XAxis dataKey="ploId" tick={{ fontSize: 13, fill: '#6b7280' }} />
                                                            <YAxis domain={[0, 100]} tick={{ fontSize: 13, fill: '#6b7280' }} tickFormatter={v => `${v}%`} />
                                                            <Tooltip formatter={v => [`${v.toFixed(1)}%`, 'Achievement']} />
                                                            <Bar dataKey="percentage" name="Achievement %" radius={[6, 6, 0, 0]}>
                                                                {analytics.ploStats.map((_, i) => <Cell key={i} fill={COLORS_PLO[i % COLORS_PLO.length]} />)}
                                                            </Bar>
                                                        </BarChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            ) : <p className="text-muted py-4 text-center">No PLO data available yet.</p>}
                                        </Card.Body>
                                    </Card>
                                </Col>
                            </Row>
                        </motion.div>
                    )}
                </AnimatePresence>
            </Container>
        </motion.div>
    );
};

export default CourseView;
