import { useEffect, useState } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Container, Card, Row, Col } from 'react-bootstrap';
import { BookOpen, Users, FileText, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { Dropdown } from 'react-bootstrap';

const getInitials = (name) => {
    if (!name) return '??';
    const words = name.trim().split(/\s+/);
    if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
};

const CoursesList = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [assignments, setAssignments] = useState([]);
    const [academicTerms, setAcademicTerms] = useState([]);
    const [selectedTerm, setSelectedTerm] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const config = {
                    headers: {
                        Authorization: `Bearer ${user.token}`
                    }
                };

                const [assignmentsRes, termsRes] = await Promise.all([
                    api.get('/api/assignments/my', config),
                    api.get('/api/academic-terms', config)
                ]);

                setAssignments(assignmentsRes.data);
                setAcademicTerms(termsRes.data);
            } catch (err) {
                console.error('Courses List Error:', err);
            } finally {
                setLoading(false);
            }
        };

        if (user?.token) {
            fetchData();
        }
    }, [user?.token]);

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

    return (
        <Container fluid className="py-4 px-4">

            {/* Header */}
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h3 className="fw-bold mb-0">My Courses</h3>
                <div className="d-flex align-items-center gap-2">
                    <span className="fw-semibold text-muted small">
                        Select Academic Term
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

            {/* Courses Grid */}
            <Row xs={1} md={2} lg={3} className="g-4">
                {filtered.map(a => (
                    <Col key={a._id}>
                        <motion.div whileHover={{ y: -6, transition: { duration: 0.2 } }} className="h-100">
                            <Card
                                className="h-100 rounded-4 text-center p-4"
                                style={{
                                    border: '1px solid #e5e7eb',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                                    backgroundColor: '#fff'
                                }}
                            >

                                {/* Avatar */}
                                <div className="d-flex justify-content-center mb-3">
                                    <div
                                        className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold"
                                        style={{ width: 68, height: 68, backgroundColor: '#637a62', fontSize: '1.3rem', letterSpacing: 1 }}
                                    >
                                        {getInitials(user.name)}
                                    </div>
                                </div>

                                {/* Course Title */}
                                <h6
                                    className="fw-bold mb-1"
                                    style={{
                                        color: '#6d28d9',
                                        cursor: 'pointer',
                                    }}
                                    onClick={() => navigate(`/faculty/courses/${a.course._id}`)}>
                                    {a.course.code} - {a.course.name}
                                </h6>

                                {/* Code + Semester */}
                                <p className="mb-1" style={{ color: '#7c3aed', fontSize: '0.82rem' }}>
                                    {a.course.code} - {a.academicTerm?.name}
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
                                        <span>{a.course.students?.length || 0} Students</span>
                                    </div>
                                    <div className="d-flex align-items-center gap-1" style={{ fontSize: '0.8rem' }}>
                                        <FileText size={15} />
                                        <span>{a.course.clos?.length || 0} CLOs</span>
                                    </div>
                                </div>

                            </Card>
                        </motion.div>
                    </Col>
                ))}
            </Row>

            {/* Empty State */}
            {!loading && filtered.length === 0 && (
                <div className="text-center py-5 bg-white rounded-4 shadow-sm mt-3">
                    <div className="d-inline-block p-4 rounded-circle mb-3 bg-light">
                        <BookOpen size={36} className="text-muted" />
                    </div>
                    <h5 className="fw-bold">No Courses Assigned</h5>
                    <p className="text-muted">Contact your administrator to get courses assigned.</p>
                </div>
            )}
        </Container>
    );
};

export default CoursesList;
