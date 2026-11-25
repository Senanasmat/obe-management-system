import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { BookOpen, Users, BarChart2, Award, FileText, Clock } from 'lucide-react';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../../components/LoadingSpinner';
import { FACULTY_THEME } from '../../themes/facultyTheme';

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

const CACHE_KEY = 'faculty_dashboard_assignments_v2';

const FacultyDashboard = () => {
    const [assignments, setAssignments] = useState(() => {
        try {
            const cached = localStorage.getItem(CACHE_KEY);
            return cached ? JSON.parse(cached) : [];
        } catch { return []; }
    });
    const [academicTerms, setAcademicTerms] = useState([]);
    const [selectedTerm, setSelectedTerm] = useState('');
    const [loading, setLoading] = useState(() => !localStorage.getItem(CACHE_KEY));
    const { user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!user?.token) return;

        const fetchData = async () => {
            try {
            const config = {
                headers: {
                Authorization: `Bearer ${user.token}`
                }
            };

            const [assignmentsRes, termsRes] = await Promise.all([
                api.get('/api/assignments/my/summary', config),
                api.get('/api/academic-terms', config)
            ]);

            setAssignments(assignmentsRes.data);
            setAcademicTerms(termsRes.data);

            localStorage.setItem(
                CACHE_KEY,
                JSON.stringify(assignmentsRes.data)
            );
            } catch (error) {
            console.error('Faculty Dashboard Error:', error);
            } finally {
            setLoading(false);
            }
        };

        fetchData();
    }, [user?.token]);

    // Sort academic terms with the latest term first
    const sortedAcademicTerms = [...academicTerms].sort((a, b) => {
    if (b.year !== a.year) {
        return b.year - a.year;
    }

    const seasonOrder = {
        Fall: 2,
        Spring: 1
    };

    return (seasonOrder[b.season] || 0) - (seasonOrder[a.season] || 0);
    });

    useEffect(() => {
    if (sortedAcademicTerms.length > 0 && !selectedTerm) {
        setSelectedTerm(sortedAcademicTerms[0]._id);
    }
    }, [sortedAcademicTerms, selectedTerm]);

    const filtered = assignments.filter(
    a => a.academicTerm?._id === selectedTerm
    );

    const totalStudents = filtered.reduce(
        (sum, a) => sum + (a.course?.studentsCount || 0),
        0
    );

    return (
        <motion.div initial="hidden" animate="visible" variants={containerVariants}>
            <Container fluid className="py-2 px-2 px-md-3">

                {/* Header */}
                <motion.div variants={cardVariants} className="mb-3">
                    <div className="d-flex align-items-center gap-2">
                        <div className="rounded-2 p-2" style={{ backgroundColor: '#dbeafe', color: FACULTY_THEME.colors.primary }}>
                            <Award size={24} />
                        </div>
                        <div>
                            <h2 className="mb-0 fw-bold" style={{ fontSize: 'clamp(1.2rem, 4vw, 1.5rem)', color: FACULTY_THEME.colors.primary }}>
                                Welcome back, {user.name}!
                            </h2>
                            <p className="mb-0 small" style={{ fontSize: '0.8rem', color: FACULTY_THEME.colors.muted }}>
                                Overview of your teaching portfolio.
                            </p>
                        </div>
                    </div>
                </motion.div>

                {/* Courses Header + Semester Filter */}
                <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
                    <h5 className="fw-bold text-dark mb-0" style={{ fontSize: '0.95rem' }}>My Courses</h5>

                    <div className="d-flex align-items-center gap-2">
                        <span className="fw-semibold text-muted small">
                            Select Semester
                        </span>

                        <select
                            className="form-select w-auto"
                            value={selectedTerm}
                            onChange={(e) => setSelectedTerm(e.target.value)}
                        >
                            {sortedAcademicTerms.map((term) => (
                            <option key={term._id} value={term._id}>
                                {term.name}
                            </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Courses List */}
                <Row xs={1} md={2} lg={2} className="g-3">
                    {loading ? (
                        <Col xs={12}><LoadingSpinner /></Col>
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
                                    className="h-100 text-center"
                                    onClick={() => navigate(`/faculty/courses/${a.course._id}`)}
                                    style={{
                                        border: 'none',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                        backgroundColor: '#fff',
                                        cursor: 'pointer',
                                        transition: 'all 0.3s ease',
                                        minHeight: '240px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        borderRadius: '12px',
                                        padding: '1.5rem 1.2rem'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                                    }}
                                >
                                    {/* Course Code - Main Title */}
                                    <h5
                                        className="fw-bold mb-1"
                                        style={{
                                            color: FACULTY_THEME.colors.primary,
                                            fontSize: '1.1rem'
                                        }}>
                                        {a.course.code}
                                    </h5>

                                    {/* Course Name */}
                                    <p className="mb-1" style={{ color: '#6b7280', fontSize: '0.8rem', fontWeight: '500' }}>
                                        {a.course.name}
                                    </p>

                                    {/* Academic Term */}
                                    <p className="mb-2" style={{ color: FACULTY_THEME.colors.primary, fontSize: '0.8rem', fontWeight: '600' }}>
                                        {a.academicTerm?.name}
                                    </p>

                                    {/* Faculty Name */}
                                    <p className="mb-0 fw-semibold text-dark" style={{ fontSize: '0.8rem' }}>
                                        {user.name}
                                    </p>

                                    {/* Department */}
                                    <p className="text-muted" style={{ fontSize: '0.75rem', marginBottom: '1rem' }}>
                                        {user.department || 'No Department'}
                                    </p>

                                    {/* Buttons */}
                                    <div className="d-flex gap-2" onClick={(e) => e.stopPropagation()} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                        <Button
                                            onClick={() => navigate(`/faculty/courses/${a.course._id}?tab=Activities`)}
                                            style={{ backgroundColor: FACULTY_THEME.colors.primary, border: 'none', borderRadius: '6px', fontSize: '0.8rem', padding: '0.5rem 0.75rem', color: 'white', flex: 1 }}
                                        >
                                            Activities
                                        </Button>

                                        <Button
                                            onClick={() => navigate(`/faculty/courses/${a.course._id}?tab=Reports`)}
                                            style={{ backgroundColor: FACULTY_THEME.colors.accent, border: 'none', borderRadius: '6px', fontSize: '0.8rem', padding: '0.5rem 0.75rem', color: 'white', flex: 1 }}
                                        >
                                            Reports
                                        </Button>
                                    </div>

                                    {/* Stats */}
                                    <div className="d-flex justify-content-around" style={{ color: FACULTY_THEME.colors.accent, fontSize: '0.75rem', paddingTop: '0.5rem', marginTop: '0.75rem', borderTop: '1px solid #e5e7eb' }}>
                                        <div className="d-flex align-items-center gap-1">
                                            <Users size={14} />
                                            <span>{a.course.studentsCount ?? 0}</span>
                                        </div>
                                        <div className="d-flex align-items-center gap-1">
                                            <FileText size={14} />
                                            <span>{a.course.closCount ?? 0}</span>
                                        </div>
                                    </div>

                                </Card>
                            </motion.div>
                        </Col>
                    ))}
                </Row>

                {/* Empty State */}
                {!loading && filtered.length === 0 && (
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
