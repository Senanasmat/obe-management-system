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
    const [assignments, setAssignments] = useState([]); 
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentId, setCurrentId] = useState(null);
    const [formData, setFormData] = useState({ name: '', code: '', creditHours: 3 });

    const { user } = useAuth();
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    // FETCH BOTH COURSES + ASSIGNMENTS
    const fetchData = async () => {
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };

            const [courseRes, assignmentRes] = await Promise.all([
                axios.get('/api/admin/courses', config),
                axios.get('/api/assignments', config)
            ]);

            setCourses(courseRes.data);
            setAssignments(assignmentRes.data);

        } catch (error) {
            console.error("Error fetching data:", error);
        }
    };

    const handleOpenModal = (course = null) => {
        if (course) {
            setIsEditing(true);
            setCurrentId(course._id);
            setFormData({
                name: course.name,
                code: course.code,
                creditHours: course.creditHours
            });
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

            fetchData();
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
                fetchData();

            } catch (error) {
                showError('Error', 'Error deleting course');
            }
        }
    };

    return (
        <motion.div initial="hidden" animate="visible" variants={containerVariants}>
            <Container fluid className="py-4 px-4">

                {/* HEADER */}
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h2 className="fw-bold">Course Management</h2>

                    <Button onClick={() => handleOpenModal()}>
                        <BookPlus size={18} /> Add New Course
                    </Button>
                </div>

                {/* COURSE LIST */}
                <Row className="g-4">
                    <AnimatePresence>
                        {courses.length > 0 ? (
                            courses.map((course) => {

                                // FIND ASSIGNMENT FOR THIS COURSE
                                const assignment = assignments.find(
                                    (a) => a.course?._id === course._id
                                );

                                return (
                                    <Col key={course._id} lg={4} md={6}>
                                        <motion.div
                                            variants={itemVariants}
                                            layout
                                            initial="hidden"
                                            animate="visible"
                                            exit={{ opacity: 0, scale: 0.9 }}
                                            whileHover={{ y: -5 }}
                                            className="h-100"
                                        >
                                            <Card className="h-100 shadow-sm border-0 rounded-4">

                                                <Card.Body className="p-4">

                                                    <div className="d-flex justify-content-between align-items-start mb-3">
                                                        <Book size={24} className="text-primary" />

                                                        <Badge bg="success" className="px-3 py-2">
                                                            {course.creditHours} Credits
                                                        </Badge>
                                                    </div>

                                                    <h5 className="fw-bold">{course.name}</h5>

                                                    <p className="text-muted small d-flex align-items-center gap-1">
                                                        <Hash size={14} /> {course.code}
                                                    </p>

                                                    {/* 🔥 FIXED FACULTY DISPLAY */}
                                                    <div className="bg-light rounded-3 p-3 mt-3">
                                                        <div className="d-flex align-items-center gap-2">
                                                            <User size={16} className="text-primary" />

                                                            <span className="small">
                                                                Faculty:&nbsp;
                                                                <strong>
                                                                    {assignment
                                                                        ? assignment.faculty?.name
                                                                        : 'Not Assigned'}
                                                                </strong>
                                                            </span>
                                                        </div>
                                                    </div>

                                                </Card.Body>

                                                {/* ACTIONS */}
                                                <div className="border-top px-4 py-3 d-flex justify-content-end gap-3">
                                                    <Button
                                                        variant="link"
                                                        onClick={() => handleOpenModal(course)}
                                                    >
                                                        <Edit size={14} /> Edit
                                                    </Button>

                                                    <Button
                                                        variant="link"
                                                        className="text-danger"
                                                        onClick={() => handleDelete(course._id)}
                                                    >
                                                        <Trash2 size={14} /> Delete
                                                    </Button>
                                                </div>

                                            </Card>
                                        </motion.div>
                                    </Col>
                                );
                            })
                        ) : (
                            <Col xs={12}>
                                <div className="text-center py-5">
                                    <Book size={40} className="text-muted mb-3" />
                                    <h5>No courses found</h5>
                                </div>
                            </Col>
                        )}
                    </AnimatePresence>
                </Row>

                {/* MODAL */}
                <Modal show={showModal} onHide={() => setShowModal(false)} centered>
                    <Modal.Header closeButton>
                        <Modal.Title>
                            {isEditing ? 'Edit Course' : 'Create Course'}
                        </Modal.Title>
                    </Modal.Header>

                    <Form onSubmit={handleSubmit}>
                        <Modal.Body>

                            <Form.Control
                                placeholder="Course Name"
                                value={formData.name}
                                onChange={(e) =>
                                    setFormData({ ...formData, name: e.target.value })
                                }
                                className="mb-3"
                                required
                            />

                            <Form.Control
                                placeholder="Course Code"
                                value={formData.code}
                                onChange={(e) =>
                                    setFormData({ ...formData, code: e.target.value })
                                }
                                className="mb-3"
                                required
                            />

                            <Form.Control
                                type="number"
                                placeholder="Credit Hours"
                                value={formData.creditHours}
                                onChange={(e) =>
                                    setFormData({ ...formData, creditHours: e.target.value })
                                }
                                required
                            />

                        </Modal.Body>

                        <Modal.Footer>
                            <Button variant="secondary" onClick={() => setShowModal(false)}>
                                Cancel
                            </Button>

                            <Button type="submit" disabled={loading}>
                                {loading ? 'Saving...' : isEditing ? 'Update' : 'Create'}
                            </Button>
                        </Modal.Footer>
                    </Form>
                </Modal>

            </Container>
        </motion.div>
    );
};

export default Courses;