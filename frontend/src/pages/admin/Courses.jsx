import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Container, Card, Form, Button, Row, Col, Modal, Badge } from 'react-bootstrap';
import { toast, showError, showConfirm } from '../../utils/notifications';
import { BookPlus, Book, Hash, Clock, User, Edit, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const containerVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, staggerChildren: 0.05 } }
};

const itemVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1 }
};

const Courses = () => {
    const [courses, setCourses] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentId, setCurrentId] = useState(null);
    const [formData, setFormData] = useState({ name: '', code: '', creditHours: 3 });
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchCourses();
    }, []);

    const fetchCourses = async () => {
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            const { data } = await axios.get('/api/admin/courses', config);
            setCourses(data);
        } catch (error) {
            console.error("Error fetching courses:", error);
        }
    };

    const handleOpenModal = (course = null) => {
        if (course) {
            setIsEditing(true);
            setCurrentId(course._id);
            setFormData({ name: course.name, code: course.code, creditHours: course.creditHours });
        } else {
            setIsEditing(false);
            setCurrentId(null);
            setFormData({ name: '', code: '', creditHours: 3 });
        }
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            if (isEditing) {
                await axios.put(`/api/admin/courses/${currentId}`, formData, config);
                toast.fire({ icon: 'success', title: 'Course updated successfully!' });
            } else {
                await axios.post('/api/admin/courses', formData, config);
                toast.fire({ icon: 'success', title: 'Course created successfully!' });
            }
            fetchCourses();
            setShowModal(false);
        } catch (error) {
            showError('Error', error.response?.data?.message || 'Error processing request');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        const result = await showConfirm('Are you sure?', 'You want to delete this course?');
        if (result.isConfirmed) {
            try {
                const config = { headers: { Authorization: `Bearer ${user.token}` } };
                await axios.delete(`/api/admin/courses/${id}`, config);
                toast.fire({ icon: 'success', title: 'Course removed successfully!' });
                fetchCourses();
            } catch (error) {
                showError('Error', 'Error deleting course');
            }
        }
    };

    return (
        <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
        >
            <Container fluid className="py-4 px-4">
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h2 className="mb-0 text-dark fw-bold display-6 fs-3">Course Management</h2>
                    </div>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button variant="primary" onClick={() => handleOpenModal()} className="d-flex align-items-center gap-2 shadow-sm px-4 py-2 border-0">
                            <BookPlus size={18} /> Add New Course
                        </Button>
                    </motion.div>
                </div>

                <Row className="g-4">
                    <AnimatePresence mode="popLayout">
                        {courses.length > 0 ? (
                            courses.map((course, idx) => (
                                <Col key={course._id} lg={4} md={6}>
                                    <motion.div
                                        variants={itemVariants}
                                        layout
                                        initial="hidden"
                                        animate="visible"
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        whileHover={{ y: -5 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="h-100"
                                    >
                                        <Card className="h-100 shadow-sm border-0 rounded-4 overflow-hidden position-relative group">
                                            <Card.Body className="p-4">
                                                <div className="d-flex justify-content-between align-items-start mb-3">
                                                    <div className="bg-primary-subtle text-primary rounded-3 p-2">
                                                        <Book size={24} />
                                                    </div>
                                                    <Badge bg="success-subtle" className="text-success rounded-pill px-3 py-2 fw-medium">
                                                        {course.creditHours} Credits
                                                    </Badge>
                                                </div>
                                                <h5 className="fw-bold text-dark mb-1">{course.name}</h5>
                                                <p className="text-muted small mb-4 d-flex align-items-center gap-1">
                                                    <Hash size={14} /> {course.code}
                                                </p>

                                                <div className="bg-light bg-opacity-50 rounded-3 p-3 mt-auto">
                                                    <div className="d-flex align-items-center gap-2 text-muted">
                                                        <User size={16} className="text-primary" />
                                                        <span className="small fw-medium">
                                                            Faculty: <strong className="text-dark">{course.faculty ? course.faculty.name : 'Not Assigned'}</strong>
                                                        </span>
                                                    </div>
                                                </div>
                                            </Card.Body>
                                            <div className="bg-white px-4 py-3 border-top d-flex justify-content-end gap-3 translate-x-2 transition-all">
                                                <Button variant="link" className="p-0 text-decoration-none small fw-bold d-flex align-items-center gap-1 hover-primary" onClick={() => handleOpenModal(course)}>
                                                    <Edit size={14} /> Edit
                                                </Button>
                                                <Button variant="link" className="p-0 text-decoration-none small fw-bold text-danger d-flex align-items-center gap-1" onClick={() => handleDelete(course._id)}>
                                                    <Trash2 size={14} /> Delete
                                                </Button>
                                            </div>
                                            <div className="position-absolute bottom-0 start-0 w-100 bg-primary" style={{ height: '3px', opacity: 0.4 }}></div>
                                        </Card>
                                    </motion.div>
                                </Col>
                            ))
                        ) : (
                            <Col xs={12}>
                                <div className="text-center py-5 bg-white rounded-4 shadow-sm border-0">
                                    <div className="bg-light d-inline-block p-4 rounded-circle mb-4">
                                        <Book className="text-muted" size={48} />
                                    </div>
                                    <h4 className="fw-bold">No courses found</h4>
                                    <p className="text-muted mb-4 px-5">Get started by defining your academic courses here.</p>
                                    <Button variant="primary" className="px-5 border-0 shadow-sm" onClick={() => handleOpenModal()}>Add Your First Course</Button>
                                </div>
                            </Col>
                        )}
                    </AnimatePresence>
                </Row>

                <Modal show={showModal} onHide={() => setShowModal(false)} centered size="lg">
                    <Modal.Header closeButton className="border-0 pb-0">
                        <Modal.Title className="fw-bold fs-4">{isEditing ? 'Edit Course Details' : 'Create New Course'}</Modal.Title>
                    </Modal.Header>
                    <Form onSubmit={handleSubmit}>
                        <Modal.Body className="p-4">
                            <Row className="g-4">
                                <Col md={12}>
                                    <Form.Group>
                                        <Form.Label className="small fw-bold text-muted">Course Name</Form.Label>
                                        <div className="position-relative">
                                            <Form.Control
                                                type="text"
                                                placeholder="e.g. Advanced Software Engineering"
                                                required
                                                value={formData.name}
                                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                                className="ps-5 py-2 border-light bg-light bg-opacity-50 shadow-none"
                                            />
                                            <Book className="position-absolute text-muted" size={18} style={{ left: '15px', top: '50%', transform: 'translateY(-50%)' }} />
                                        </div>
                                    </Form.Group>
                                </Col>
                                <Col md={8}>
                                    <Form.Group>
                                        <Form.Label className="small fw-bold text-muted">Course Code</Form.Label>
                                        <div className="position-relative">
                                            <Form.Control
                                                type="text"
                                                placeholder="e.g. CS-402"
                                                required
                                                value={formData.code}
                                                onChange={e => setFormData({ ...formData, code: e.target.value })}
                                                className="ps-5 py-2 border-light bg-light bg-opacity-50 shadow-none"
                                            />
                                            <Hash className="position-absolute text-muted" size={18} style={{ left: '15px', top: '50%', transform: 'translateY(-50%)' }} />
                                        </div>
                                    </Form.Group>
                                </Col>
                                <Col md={4}>
                                    <Form.Group>
                                        <Form.Label className="small fw-bold text-muted">Credit Hours</Form.Label>
                                        <div className="position-relative">
                                            <Form.Control
                                                type="number"
                                                min="1"
                                                max="6"
                                                required
                                                value={formData.creditHours}
                                                onChange={e => setFormData({ ...formData, creditHours: e.target.value })}
                                                className="ps-5 py-2 border-light bg-light bg-opacity-50 shadow-none"
                                            />
                                            <Clock className="position-absolute text-muted" size={18} style={{ left: '15px', top: '50%', transform: 'translateY(-50%)' }} />
                                        </div>
                                    </Form.Group>
                                </Col>
                            </Row>
                        </Modal.Body>
                        <Modal.Footer className="border-0 p-4 pt-0">
                            <Button variant="light" onClick={() => setShowModal(false)} className="px-4 border-0">Cancel</Button>
                            <Button variant="primary" type="submit" className="px-5 shadow-sm border-0 py-2 fw-semibold" disabled={loading}>
                                {loading ? 'Processing...' : (isEditing ? 'Save Changes' : 'Create Course')}
                            </Button>
                        </Modal.Footer>
                    </Form>
                </Modal>
            </Container>

            <style>{`
                .hover-shadow:hover { box-shadow: 0 10px 25px rgba(0,0,0,0.1) !important; }
                .hover-primary:hover { color: #0d6efd !important; }
            `}</style>
        </motion.div>
    );
};

export default Courses;
