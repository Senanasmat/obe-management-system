import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { BookOpen, Users, BarChart2, Award, FileText, Clock } from 'lucide-react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import { motion } from 'framer-motion';
import { Dropdown } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

const containerVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.2, staggerChildren: 0.03 } }
};

const cardVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.2 } }
};

const getInitials = (name) => {
    if (!name) return '??';
    const words = name.trim().split(/\s+/);
    if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
};

const SkeletonCard = () => (
    <Col>
        <Card className="h-100 shadow-sm border-0 rounded-4 text-center p-4">
            <div className="d-flex justify-content-center mb-3">
                <div className="rounded-circle" style={{ width: 68, height: 68, backgroundColor: '#e5e7eb' }} />
            </div>
            <div className="mx-auto mb-2 rounded-2" style={{ height: 16, width: '70%', backgroundColor: '#e5e7eb' }} />
            <div className="mx-auto mb-2 rounded-2" style={{ height: 12, width: '50%', backgroundColor: '#f3f4f6' }} />
            <div className="mx-auto mb-4 rounded-2" style={{ height: 12, width: '40%', backgroundColor: '#f3f4f6' }} />
            <div className="d-flex justify-content-between mb-3">
                <div className="rounded-2" style={{ height: 30, width: '44%', backgroundColor: '#e5e7eb' }} />
                <div className="rounded-2" style={{ height: 30, width: '44%', backgroundColor: '#e5e7eb' }} />
            </div>
            <div className="border-top pt-3 d-flex justify-content-around">
                <div className="rounded-2" style={{ height: 12, width: '28%', backgroundColor: '#f3f4f6' }} />
                <div className="rounded-2" style={{ height: 12, width: '28%', backgroundColor: '#f3f4f6' }} />
                <div className="rounded-2" style={{ height: 12, width: '28%', backgroundColor: '#f3f4f6' }} />
            </div>
        </Card>
    </Col>
);

const CACHE_KEY = 'faculty_dashboard_assignments';

const FacultyDashboard = () => {
    const [assignments, setAssignments] = useState(() => {
        try {
            const cached = localStorage.getItem(CACHE_KEY);
            return cached ? JSON.parse(cached) : [];
        } catch { return []; }
    });
    const [semester, setSemester] = useState('');
    const [loading, setLoading] = useState(() => !localStorage.getItem(CACHE_KEY));
    const { user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!user?.token) return;
        const config = { headers: { Authorization: `Bearer ${user.token}` } };
        api.get('/api/assignments/my/summary', config)
            .then(({ data }) => {
                setAssignments(data);
                localStorage.setItem(CACHE_KEY, JSON.stringify(data));
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [user?.token]);

    // Generate sorted unique semesters (latest first)
    const semesters = [...new Set(assignments.map(a => a.semester))]
        .sort()
        .reverse();

    // Set default semester (latest one)
    useEffect(() => {
        if (semesters.length > 0) {
            setSemester(semesters[0]);
        }
    }, [assignments]);

    // Filter only selected semester
    const filtered = assignments.filter(a => a.semester === semester);

    const totalStudents = assignments.reduce(
        (sum, a) => sum + (a.course?.studentsCount || 0),
        0
    );

    return (
        <motion.div initial="hidden" animate="visible" variants={containerVariants}>
            <Container fluid className="py-2 px-2 px-md-3">

                {/* Header */}
                <motion.div variants={cardVariants} className="mb-3">
                    <div className="d-flex align-items-center gap-2">
                        <div className="rounded-2 p-2" style={{ backgroundColor: '#ede9fe', color: '#6d28d9' }}>
                            <Award size={24} />
                        </div>
                        <div>
                            <h2 className="mb-0 fw-bold text-dark" style={{ fontSize: 'clamp(1.2rem, 4vw, 1.5rem)' }}>
                                Welcome back, {user.name}!
                            </h2>
                            <p className="text-muted mb-0 small" style={{ fontSize: '0.8rem' }}>
                                Overview of your teaching portfolio.
                            </p>
                        </div>
                    </div>
                </motion.div>

                {/* Courses Header + Semester Filter */}
                <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
                    <h5 className="fw-bold text-dark mb-0" style={{ fontSize: '0.95rem' }}>My Courses</h5>

                    <div className="d-flex align-items-center gap-1">
                        <span className="fw-semibold text-muted small" style={{ fontSize: '0.8rem' }}>
                            Semester:
                        </span>

                        <select
                            className="form-select w-auto"
                            style={{ fontSize: '0.85rem', padding: '0.3rem 0.5rem' }}
                            value={semester}
                            onChange={(e) => setSemester(e.target.value)}
                        >
                            {semesters.map((s, i) => (
                                <option key={i} value={s}>{s}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Courses List */}
                <Row xs={1} md={2} lg={3} className="g-2">
                    {loading ? (
                        [0, 1, 2].map(i => <SkeletonCard key={i} />)
                    ) : filtered.map((a) => (
                        <Col key={a._id}>
                            <motion.div
                                initial="hidden"
                                animate="visible"
                                variants={cardVariants}
                                whileHover={{ y: -6, transition: { duration: 0.2 } }}
                                className="h-100"
                            >
                                
                                <Card
                                    className="h-100 rounded-4 text-center p-4"
                                    onClick={() => navigate(`/faculty/courses/${a.course._id}?tab=Activities`)}
                                    style={{
                                        border: '1px solid #e5e7eb',
                                        boxShadow: '0 6px 18px rgba(0,0,0,0.06)',
                                        backgroundColor: '#fff',
                                        cursor: 'pointer',
                                        transition: 'all 0.3s ease'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.boxShadow = '0 10px 28px rgba(0,0,0,0.12)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.boxShadow = '0 6px 18px rgba(0,0,0,0.06)';
                                    }}
                                >
                                    {/* Avatar */}
                                    <div className="d-flex justify-content-center mb-3">
                                        <div
                                            className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold"
                                            style={{ width: 68, height: 68, backgroundColor: '#637a62', fontSize: '1.3rem', letterSpacing: 1 }}
                                        >
                                            {a.course.code.split('-')[0] || '??'}
                                        </div>
                                    </div>

                                    {/* Course Title */}
                                    <h6
                                        className="fw-bold mb-1"
                                        style={{
                                            color: '#6d28d9'
                                        }}>
                                        {a.course.code} - {a.course.name}
                                    </h6>

                                    {/* Code + Semester */}
                                    <p className="mb-1" style={{ color: '#7c3aed', fontSize: '0.82rem' }}>
                                        {a.course.code} - {a.semester}
                                    </p>

                                    {/* Faculty Name */}
                                    <p className="mb-0 fw-medium text-dark" style={{ fontSize: '0.88rem' }}>
                                        {user.name}
                                    </p>

                                    {/* Department */}
                                    <p className="text-muted mb-3" style={{ fontSize: '0.82rem' }}>
                                        {user.department || 'No Department'}
                                    </p>

                                    {/* Buttons */}
                                    <div className="d-flex justify-content-between mb-3">
                                        <Dropdown onClick={(e) => e.stopPropagation()}>
                                            <Dropdown.Toggle
                                                size="sm"
                                                style={{ backgroundColor: '#4c1d95', border: 'none', borderRadius: '6px' }}
                                            >
                                                Options
                                            </Dropdown.Toggle>
                                            <Dropdown.Menu>
                                                <Dropdown.Item onClick={() => navigate(`/faculty/courses/${a.course._id}?tab=Activities`)}>
                                                    Class Activities
                                                </Dropdown.Item>
                                            </Dropdown.Menu>
                                        </Dropdown>

                                        <Dropdown onClick={(e) => e.stopPropagation()}>
                                            <Dropdown.Toggle
                                                size="sm"
                                                style={{ backgroundColor: '#d97706', border: 'none', borderRadius: '6px' }}
                                            >
                                                Reports
                                            </Dropdown.Toggle>
                                            <Dropdown.Menu align="end">
                                                <Dropdown.Item>OBE Report</Dropdown.Item>
                                                <Dropdown.Item>Student Report</Dropdown.Item>
                                            </Dropdown.Menu>
                                        </Dropdown>
                                    </div>

                                    {/* Stats */}
                                    <div className="d-flex justify-content-around border-top pt-3" style={{ color: '#d97706' }}>
                                        <div className="d-flex align-items-center gap-1" style={{ fontSize: '0.8rem' }}>
                                            <Users size={15} />
                                            <span>{a.course.studentsCount ?? 0} Students</span>
                                        </div>
                                        <div className="d-flex align-items-center gap-1" style={{ fontSize: '0.8rem' }}>
                                            <FileText size={15} />
                                            <span>{a.course.closCount ?? 0} CLOs</span>
                                        </div>
                                    </div>

                                </Card>
                            </motion.div>
                        </Col>
                    ))}
                </Row>

                {/* Empty State */}
                {!loading && assignments.length === 0 && (
                    <div className="text-center py-5 bg-white rounded-4 shadow-sm">
                        <div className="bg-light d-inline-block p-4 rounded-circle mb-3">
                            <BookOpen size={40} className="text-muted" />
                        </div>
                        <h5 className="fw-bold">No Courses Assigned</h5>
                        <p className="text-muted">
                            Contact your administrator to get courses assigned to your profile.
                        </p>
                    </div>
                )}
            </Container>
        </motion.div>
    );
};

export default FacultyDashboard;