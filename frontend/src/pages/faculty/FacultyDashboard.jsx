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
                                    className="text-center"
                                    onClick={() => navigate(`/faculty/courses/${a.course._id}`)}
                                    style={{
                                        width: '392px',
                                        border: '1px solid #dbe4f3',
                                        boxShadow: '0 6px 20px rgba(30,64,175,0.08)',
                                        backgroundColor: '#ffffff',
                                        cursor: 'pointer',
                                        transition: 'all 0.3s ease',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        borderRadius: '16px',
                                        padding: '28px 28px 20px 28px'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.boxShadow = '0 10px 30px rgba(30,64,175,0.15)';
                                        e.currentTarget.style.transform = 'translateY(-4px)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.boxShadow = '0 6px 20px rgba(30,64,175,0.08)';
                                        e.currentTarget.style.transform = 'translateY(0)';
                                    }}
                                >
                                    {/* Course Code */}
                                    <h5
                                        className="mb-0"
                                        style={{
                                            color: '#1e3a8a',
                                            fontSize: '22px',
                                            fontWeight: '700',
                                            fontFamily: 'Poppins, sans-serif',
                                            letterSpacing: '0.5px'
                                        }}>
                                        {a.course.code}
                                    </h5>

                                    {/* Course Name */}
                                    <p className="mb-0" style={{ color: '#374151', fontSize: '15px', fontWeight: '500', fontFamily: 'Inter, sans-serif', marginTop: '4px' }}>
                                        {a.course.name}
                                    </p>

                                    {/* Academic Term Pill */}
                                    <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'center' }}>
                                        <span style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', fontSize: '13px', fontWeight: '600', fontFamily: 'Inter, sans-serif', padding: '4px 14px', borderRadius: '999px' }}>
                                            {a.academicTerm?.name}
                                        </span>
                                    </div>

                                    {/* Faculty Name */}
                                    <p className="mb-0" style={{ color: '#111827', fontSize: '16px', fontWeight: '600', fontFamily: 'Inter, sans-serif', marginTop: '16px' }}>
                                        {user.name}
                                    </p>

                                    {/* Department */}
                                    <p className="mb-0" style={{ color: '#6b7280', fontSize: '14px', fontWeight: '400', fontFamily: 'Inter, sans-serif', marginTop: '2px' }}>
                                        {user.department || 'No Department'}
                                    </p>

                                    {/* Buttons */}
                                    <div className="d-flex" onClick={(e) => e.stopPropagation()} style={{ marginTop: '20px', gap: '12px' }}>
                                        <Button
                                            onClick={() => navigate(`/faculty/courses/${a.course._id}?tab=Activities`)}
                                            style={{ backgroundColor: '#1e40af', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '600', fontFamily: 'Inter, sans-serif', padding: '0', height: '44px', color: 'white', flex: 1 }}
                                        >
                                            Activities
                                        </Button>

                                        <Button
                                            onClick={() => navigate(`/faculty/courses/${a.course._id}?tab=Reports`)}
                                            style={{ backgroundColor: '#0891b2', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '600', fontFamily: 'Inter, sans-serif', padding: '0', height: '44px', color: 'white', flex: 1 }}
                                        >
                                            Reports
                                        </Button>
                                    </div>

                                    {/* Stats */}
                                    <div className="d-flex" style={{ marginTop: '18px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
                                        <div className="flex-grow-1 d-flex align-items-center justify-content-center gap-2">
                                            <Users size={20} style={{ color: '#0e7490' }} />
                                            <div style={{ textAlign: 'left' }}>
                                                <div style={{ fontWeight: '700', fontSize: '14px', color: '#0e7490', fontFamily: 'Inter, sans-serif' }}>{a.course.studentsCount ?? 0}</div>
                                                <div style={{ fontSize: '12px', color: '#4b5563', fontFamily: 'Inter, sans-serif' }}>Students</div>
                                            </div>
                                        </div>
                                        <div className="flex-grow-1 d-flex align-items-center justify-content-center gap-2">
                                            <FileText size={20} style={{ color: '#0e7490' }} />
                                            <div style={{ textAlign: 'left' }}>
                                                <div style={{ fontWeight: '700', fontSize: '14px', color: '#0e7490', fontFamily: 'Inter, sans-serif' }}>{a.course.closCount ?? 0}</div>
                                                <div style={{ fontSize: '12px', color: '#4b5563', fontFamily: 'Inter, sans-serif' }}>Reports</div>
                                            </div>
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
