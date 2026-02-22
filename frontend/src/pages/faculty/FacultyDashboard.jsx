import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { BookOpen, Users, ArrowRight, BarChart2, Award } from 'lucide-react';
import { Container, Row, Col, Card, Badge } from 'react-bootstrap';
import { motion } from 'framer-motion';

const containerVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, staggerChildren: 0.08 } }
};

const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
};

const FacultyDashboard = () => {
    const [courses, setCourses] = useState([]);
    const { user } = useAuth();

    useEffect(() => {
        const fetchCourses = async () => {
            try {
                const config = { headers: { Authorization: `Bearer ${user.token}` } };
                const { data } = await axios.get('/api/faculty/courses', config);
                setCourses(data);
            } catch (error) {
                console.error(error);
            }
        };
        fetchCourses();
    }, [user.token]);

    const totalStudents = courses.reduce((sum, c) => sum + (c.students?.length || 0), 0);

    return (
        <motion.div initial="hidden" animate="visible" variants={containerVariants}>
            <Container fluid className="py-4 px-4">
                {/* Welcome Header */}
                <motion.div variants={cardVariants} className="mb-5">
                    <div className="d-flex align-items-center gap-3">
                        <div className="bg-primary-subtle text-primary rounded-3 p-3">
                            <Award size={32} />
                        </div>
                        <div>
                            <h2 className="mb-0 fw-bold fs-3 text-dark">Welcome back, {user.name}!</h2>
                            <p className="text-muted mb-0 small">Here's an overview of your teaching portfolio.</p>
                        </div>
                    </div>
                </motion.div>

                {/* Stats Row */}
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
                                        <h3 className="fw-bold mb-0">{courses.length}</h3>
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

                {/* Course Cards */}
                <h5 className="fw-bold text-dark mb-3">My Courses</h5>
                <Row xs={1} md={2} lg={3} className="g-4">
                    {courses.map((course, idx) => (
                        <Col key={course._id}>
                            <motion.div
                                variants={cardVariants}
                                whileHover={{ y: -6, transition: { duration: 0.2 } }}
                                className="h-100"
                            >
                                <Link to={`/faculty/courses/${course._id}`} className="text-decoration-none">
                                    <Card className="h-100 shadow-sm border-0 rounded-4 overflow-hidden">
                                        <div className="bg-primary bg-opacity-10 p-4">
                                            <div className="d-flex justify-content-between align-items-start">
                                                <div className="bg-primary text-white rounded-3 p-2">
                                                    <BookOpen size={22} />
                                                </div>
                                                <Badge bg="light" text="dark" className="rounded-pill px-3 py-2 fw-medium border">
                                                    {course.code}
                                                </Badge>
                                            </div>
                                        </div>
                                        <Card.Body className="p-4">
                                            <h5 className="fw-bold text-dark mb-2">{course.name}</h5>
                                            <p className="text-muted small mb-3 d-flex align-items-center gap-1">
                                                <Users size={14} />
                                                {course.students?.length || 0} Students Enrolled
                                            </p>
                                            <div className="d-flex align-items-center text-primary small fw-bold">
                                                View Details <ArrowRight size={16} className="ms-1" />
                                            </div>
                                        </Card.Body>
                                    </Card>
                                </Link>
                            </motion.div>
                        </Col>
                    ))}
                </Row>

                {courses.length === 0 && (
                    <div className="text-center py-5 bg-white rounded-4 shadow-sm">
                        <div className="bg-light d-inline-block p-4 rounded-circle mb-3">
                            <BookOpen size={40} className="text-muted" />
                        </div>
                        <h5 className="fw-bold">No Courses Assigned</h5>
                        <p className="text-muted">Contact your administrator to get courses assigned to your profile.</p>
                    </div>
                )}
            </Container>
        </motion.div>
    );
};

export default FacultyDashboard;
