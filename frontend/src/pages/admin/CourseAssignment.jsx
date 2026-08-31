import { useEffect, useState } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { Container, Card, Button, Table, Modal, Form } from 'react-bootstrap';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus } from 'lucide-react';
import { showSuccess, showError, showConfirm } from '../../utils/notifications';

const CourseAssignment = () => {
    const { user } = useAuth();

    const [assignments, setAssignments] = useState([]);
    const [faculty, setFaculty] = useState([]);
    const [courses, setCourses] = useState([]);

    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentId, setCurrentId] = useState(null);

    const [formData, setFormData] = useState({
        facultyId: '',
        courseId: '',
        semester: ''
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const config = {
                headers: { Authorization: `Bearer ${user.token}` }
            };

            const [facRes, courseRes, assignRes] = await Promise.all([
                api.get('/api/admin/staff', config),
                api.get('/api/admin/courses', config),
                api.get('/api/assignments', config)
            ]);

            setFaculty(facRes.data);
            setCourses(courseRes.data);
            setAssignments(assignRes.data);

        } catch (error) {
            console.error(error);
        }
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    // 🔹 CREATE / UPDATE
    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const config = {
                headers: { Authorization: `Bearer ${user.token}` }
            };

            if (isEditing) {
                await api.put(`/api/assignments/${currentId}`, {
                    faculty: formData.facultyId,
                    course: formData.courseId,
                    semester: formData.semester
                }, config);
            } else {
                await api.post('/api/assignments', {
                    faculty: formData.facultyId,
                    course: formData.courseId,
                    semester: formData.semester
                }, config);
            }

            showSuccess('Success', isEditing ? "Updated successfully" : "Assigned successfully");

            setShowModal(false);
            setIsEditing(false);
            setCurrentId(null);

            setFormData({ facultyId: '', courseId: '', semester: '' });

            fetchData();

        } catch (error) {
            console.error(error.response?.data);
            showError('Error', error.response?.data?.message || "Error");
        }
    };

    // 🔹 DELETE (Frontend function)
    const handleDelete = async (id) => {
        const result = await showConfirm("Delete Assignment?", "Are you sure you want to delete this assignment?");
        if (result.isConfirmed) {
            try {
                const config = {
                    headers: { Authorization: `Bearer ${user.token}` }
                };

                await api.delete(`/api/assignments/${id}`, config);
                showSuccess('Deleted!', 'The assignment has been deleted.');
                fetchData();

            } catch (error) {
                console.error(error);
                showError("Error", error.response?.data?.message || "Failed to delete");
            }
        }
    };

    // 🔹 EDIT (Frontend function)
    const handleEdit = (assignment) => {
        setIsEditing(true);
        setCurrentId(assignment._id);

        setFormData({
            facultyId: assignment.faculty?._id,
            courseId: assignment.course?._id,
            semester: assignment.semester
        });

        setShowModal(true);
    };

    return (
        <Container fluid className="py-4 px-4">

            {/* HEADER */}
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="fw-bold">Course Assignment</h2>

                <Button onClick={() => {
                    setShowModal(true);
                    setIsEditing(false);
                    setFormData({ facultyId: '', courseId: '', semester: '' });
                }}>
                    <Plus size={18} /> Assign Course
                </Button>
            </div>

            {/* TABLE */}
            <Card className="shadow-sm border-0">
                <Card.Body className="p-0">

                    <Table hover responsive className="mb-0">
                        <thead className="bg-white border-bottom">
                            <tr>
                                <th className="px-4 py-3 text-muted small">Course</th>
                                <th className="px-4 py-3 text-muted small">Faculty</th>
                                <th className="px-4 py-3 text-muted small">Semester</th>
                                <th className="px-4 py-3 text-muted small text-end">Actions</th>
                            </tr>
                        </thead>

                        <tbody>
                            <AnimatePresence>
                                {assignments.map((a) => (
                                    <motion.tr
                                        key={a._id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                    >
                                        <td className="px-4 py-3 fw-semibold">
                                            {a.course?.name}
                                        </td>

                                        <td className="px-4 py-3 text-muted">
                                            {a.faculty?.name}
                                        </td>

                                        <td className="px-4 py-3">
                                            <span className="badge bg-light text-dark border px-3 py-2">
                                                {a.semester}
                                            </span>
                                        </td>

                                        <td className="px-4 py-3 text-end">
                                            <div className="d-flex justify-content-end gap-2">

                                                <Button
                                                    size="sm"
                                                    variant="light"
                                                    className="bg-primary-subtle text-primary"
                                                    onClick={() => handleEdit(a)}
                                                >
                                                    Edit
                                                </Button>

                                                <Button
                                                    size="sm"
                                                    variant="light"
                                                    className="bg-danger-subtle text-danger"
                                                    onClick={() => handleDelete(a._id)}
                                                >
                                                    Delete
                                                </Button>

                                            </div>
                                        </td>
                                    </motion.tr>
                                ))}
                            </AnimatePresence>
                        </tbody>
                    </Table>

                    {assignments.length === 0 && (
                        <div className="text-center py-5">
                            <p className="text-muted">No assignments found</p>
                        </div>
                    )}

                </Card.Body>
            </Card>

            {/* MODAL */}
            <Modal show={showModal} onHide={() => setShowModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>
                        {isEditing ? "Edit Assignment" : "Assign Course"}
                    </Modal.Title>
                </Modal.Header>

                <Form onSubmit={handleSubmit}>
                    <Modal.Body>

                        <Form.Group className="mb-3">
                            <Form.Label>Faculty</Form.Label>
                            <Form.Select
                                name="facultyId"
                                value={formData.facultyId}
                                onChange={handleChange}
                                required
                                className="py-2 shadow-sm border-2"
                                style={{
                                    backgroundColor: '#f8fafc',
                                    borderColor: '#cbd5e1',
                                    borderRadius: '10px',
                                    fontSize: '0.95rem'
                                }}
                            >
                                <option value="">Select Faculty</option>
                                {faculty.map(f => (
                                    <option key={f._id} value={f._id}>
                                        {f.name}
                                    </option>
                                ))}
                            </Form.Select>
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Course</Form.Label>
                            <Form.Select
                                name="courseId"
                                value={formData.courseId}
                                onChange={handleChange}
                                required
                                className="py-2 shadow-sm border-2"
                                style={{
                                    backgroundColor: '#f8fafc',
                                    borderColor: '#cbd5e1',
                                    borderRadius: '10px',
                                    fontSize: '0.95rem'
                                }}
                            >
                                <option value="">Select Course</option>
                                {courses.map(c => (
                                    <option key={c._id} value={c._id}>
                                        {c.name}
                                    </option>
                                ))}
                            </Form.Select>
                        </Form.Group>

                        <Form.Group>
                            <Form.Label>Semester</Form.Label>
                            <Form.Control
                                type="text"
                                name="semester"
                                value={formData.semester}
                                onChange={handleChange}
                                required
                                placeholder="e.g. Fall 2026"
                                className="py-2 shadow-sm border-2"
                                style={{
                                    backgroundColor: '#f8fafc',
                                    borderColor: '#cbd5e1',
                                    borderRadius: '10px',
                                    fontSize: '0.95rem'
                                }}
                            />
                        </Form.Group>

                    </Modal.Body>

                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowModal(false)}>
                            Cancel
                        </Button>
                        <Button type="submit">
                            {isEditing ? "Update" : "Assign"}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>

        </Container>
    );
};

export default CourseAssignment;