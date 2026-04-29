import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { BookOpen, Users, ArrowRight, BarChart2, Award } from 'lucide-react';
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

const FacultyDashboard = () => {
    const [assignments, setAssignments] = useState([]);
    const [semester, setSemester] = useState('');
    const { user } = useAuth();
    const navigate = useNavigate();

    // Fetch assignments
    useEffect(() => {
        const fetchAssignments = async () => {
            try {
                const config = {
                    headers: { Authorization: `Bearer ${user.token}` }
                };

                const { data } = await axios.get('/api/assignments/my', config);
                setAssignments(data);
            } catch (error) {
                console.error(error);
            }
        };

        if (user?.token) fetchAssignments();
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

    // Total students
    const totalStudents = assignments.reduce(
        (sum, a) => sum + (a.course?.students?.length || 0),
        0
    );

    return (
        <motion.div initial="hidden" animate="visible" variants={containerVariants}>
            <Container fluid className="py-4 px-4">

                {/* Header */}
                <motion.div variants={cardVariants} className="mb-5">
                    <div className="d-flex align-items-center gap-3">
                        <div className="bg-primary-subtle text-primary rounded-3 p-3">
                            <Award size={32} />
                        </div>
                        <div>
                            <h2 className="mb-0 fw-bold fs-3 text-dark">
                                Welcome back, {user.name}!
                            </h2>
                            <p className="text-muted mb-0 small">
                                Here's an overview of your teaching portfolio.
                            </p>
                        </div>
                    </div>
                </motion.div>

                {/* Stats */}
                <Row className="g-4 mb-5">
                    <Col md={4}>
                        <motion.div variants={cardVariants}>
                            <Card className="border-0 shadow-sm rounded-4 h-100">
                                <Card.Body className="d-flex align-items-center gap-3 p-4">
                                    <div className="bg-primary-subtle text-primary rounded-3 p-3">
                                        <BookOpen size={24} />
                                    </div>
                                    <div>
                                        <p className="text-muted small mb-0">Assigned Courses</p>
                                        <h3 className="fw-bold mb-0">{assignments.length}</h3>
                                    </div>
                                </Card.Body>
                            </Card>
                        </motion.div>
                    </Col>

                    <Col md={4}>
                        <motion.div variants={cardVariants}>
                            <Card className="border-0 shadow-sm rounded-4 h-100">
                                <Card.Body className="d-flex align-items-center gap-3 p-4">
                                    <div className="bg-success-subtle text-success rounded-3 p-3">
                                        <Users size={24} />
                                    </div>
                                    <div>
                                        <p className="text-muted small mb-0">Total Students</p>
                                        <h3 className="fw-bold mb-0">{totalStudents}</h3>
                                    </div>
                                </Card.Body>
                            </Card>
                        </motion.div>
                    </Col>

                    <Col md={4}>
                        <motion.div variants={cardVariants}>
                            <Card className="border-0 shadow-sm rounded-4 h-100">
                                <Card.Body className="d-flex align-items-center gap-3 p-4">
                                    <div className="bg-info-subtle text-info rounded-3 p-3">
                                        <BarChart2 size={24} />
                                    </div>
                                    <div>
                                        <p className="text-muted small mb-0">OBE Tracking</p>
                                        <h3 className="fw-bold mb-0">Active</h3>
                                    </div>
                                </Card.Body>
                            </Card>
                        </motion.div>
                    </Col>
                </Row>

                {/* Courses Header + Semester Filter */}
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="fw-bold text-dark mb-0">My Courses</h5>

                    <div className="d-flex align-items-center gap-2">
                        <span className="fw-semibold text-muted small">
                            Select Semester
                        </span>

                        <select
                            className="form-select w-auto"
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
                <Row xs={1} md={2} lg={3} className="g-4">
                    {filtered.map((a) => (
                        <Col key={a._id}>
                            <motion.div
                                variants={cardVariants}
                                whileHover={{ y: -6, transition: { duration: 0.2 } }}
                                className="h-100"
                            >
                                
                                <Card className="h-100 shadow-sm border-0 rounded-4 overflow-hidden">

                                    <div className="bg-primary text-white p-4 rounded-top-4">
                                        <Link
                                            to={`/faculty/courses/${a.course._id}`}
                                            className="text-decoration-none"
                                        >
                                            <div className="d-flex align-items-center gap-3">

                                                {/* Icon */}
                                                <div className="bg-white text-primary rounded-3 p-2">
                                                    <BookOpen size={20} />
                                                </div>

                                                {/* Course Title */}
                                                <h6 className="fw-bold mb-0 text-white">
                                                    {a.course.code} - {a.course.name}
                                                </h6>

                                            </div>
                                        </Link>
                                    </div>

                                    <Card.Body>

                                        {/* Students */}
                                        <p className="text-muted small mb-3">
                                            <Users size={14} /> {a.course.students?.length || 0} Students Enrolled
                                        </p>

                                        {/* ACTION BUTTONS */}
                                        <div className="d-flex justify-content-between align-items-center">

                                            {/* OPTIONS DROPDOWN */}
                                            <Dropdown onClick={(e) => e.stopPropagation()}>
                                                <Dropdown.Toggle
                                                    variant="primary"
                                                    size="sm"
                                                    className="rounded-3"
                                                >
                                                    Options
                                                </Dropdown.Toggle>

                                                <Dropdown.Menu>
                                                    <Dropdown.Item
                                                        onClick={() => console.log('Class Activities', a.course._id)}
                                                    >
                                                        Class Activities
                                                    </Dropdown.Item>

                                                    <Dropdown.Item
                                                        onClick={() => console.log('Activity Weights', a.course._id)}
                                                    >
                                                        Activity Weights
                                                    </Dropdown.Item>
                                                </Dropdown.Menu>
                                            </Dropdown>

                                            {/* REPORTS DROPDOWN */}
                                            <Dropdown onClick={(e) => e.stopPropagation()}>
                                                <Dropdown.Toggle
                                                    variant="warning"
                                                    size="sm"
                                                    className="rounded-3"
                                                >
                                                    Reports
                                                </Dropdown.Toggle>

                                                <Dropdown.Menu>
                                                    <Dropdown.Item
                                                        onClick={() => console.log('OBE Report', a.course._id)}
                                                    >
                                                        OBE Report
                                                    </Dropdown.Item>

                                                    <Dropdown.Item
                                                        onClick={() => console.log('Student Report', a.course._id)}
                                                    >
                                                        Student Report
                                                    </Dropdown.Item>
                                                </Dropdown.Menu>
                                            </Dropdown>

                                        </div>

                                        {/* VIEW BUTTON */}
                                        <div className="mt-3">
                                            <Link
                                                to={`/faculty/courses/${a.course._id}`}
                                                className="text-primary small fw-bold text-decoration-none"
                                            >
                                                View Course <ArrowRight size={14} />
                                            </Link>
                                        </div>

                                    </Card.Body>

                                </Card>
                            </motion.div>
                        </Col>
                    ))}
                </Row>

                {/* Empty State */}
                {assignments.length === 0 && (
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