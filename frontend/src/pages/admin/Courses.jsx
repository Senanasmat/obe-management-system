import { useState, useEffect, useMemo } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { Container, Card, Form, Button, Row, Col, Modal, Badge, Table } from 'react-bootstrap';
import { toast, showError, showConfirm } from '../../utils/notifications';
import { BookPlus, Book, User, Users, Search, Check, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const containerVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, staggerChildren: 0.05 } }
};
const itemVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1 }
};

const SEMESTERS = ['Spring 2026', 'Fall 2026', 'Spring 2027', 'Fall 2027', 'Spring 2028', 'Fall 2028'];

const Courses = () => {
    const { user } = useAuth();
    const [courses, setCourses] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [faculty, setFaculty] = useState([]);
    const [allStudents, setAllStudents] = useState([]);
    const [loading, setLoading] = useState(false);

    // Course create/edit modal
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentId, setCurrentId] = useState(null);
    const [formData, setFormData] = useState({ name: '', code: '', creditHours: '' });

    // Course assignment modal
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [isEditingAssignment, setIsEditingAssignment] = useState(false);
    const [currentAssignmentId, setCurrentAssignmentId] = useState(null);
    const [assignmentFormData, setAssignmentFormData] = useState({ facultyId: '', courseId: '', semester: '' });
    const [assignmentLoading, setAssignmentLoading] = useState(false);

    // Enroll students modal
    const [showEnrollModal, setShowEnrollModal] = useState(false);
    const [enrollCourse, setEnrollCourse] = useState(null);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [search, setSearch] = useState('');
    const [enrollLoading, setEnrollLoading] = useState(false);
    const [batchFilter, setBatchFilter] = useState('');

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            const [courseRes, assignmentRes, studentRes, facultyRes] = await Promise.all([
                api.get('/api/admin/courses', config),
                api.get('/api/assignments', config),
                api.get('/api/admin/students', config),
                api.get('/api/admin/staff', config),
            ]);
            setCourses(courseRes.data);
            setAssignments(assignmentRes.data);
            setAllStudents(studentRes.data);
            setFaculty(facultyRes.data);
        } catch (err) {
            console.error(err);
        }
    };

    // ── Course create / edit ──
    const handleOpenModal = (course = null) => {
        if (course) {
            setIsEditing(true);
            setCurrentId(course._id);
            setFormData({ name: course.name, code: course.code, creditHours: course.creditHours });
        } else {
            setIsEditing(false);
            setCurrentId(null);
            setFormData({ name: '', code: '', creditHours: '' });
        }
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            if (isEditing) {
                await api.put(`/api/admin/courses/${currentId}`, formData, config);
                toast.fire({ icon: 'success', title: 'Course updated!' });
            } else {
                await api.post('/api/admin/courses', formData, config);
                toast.fire({ icon: 'success', title: 'Course created!' });
            }
            fetchData();
            setShowModal(false);
        } catch (err) {
            showError('Error', err.response?.data?.message || 'Error processing request');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        const result = await showConfirm('Are you sure?', 'This will delete the course.');
        if (result.isConfirmed) {
            try {
                const config = { headers: { Authorization: `Bearer ${user.token}` } };
                await api.delete(`/api/admin/courses/${id}`, config);
                toast.fire({ icon: 'success', title: 'Course deleted!' });
                fetchData();
            } catch {
                showError('Error', 'Could not delete course.');
            }
        }
    };

    // ── Enroll students ──
    const openEnrollModal = (course) => {
        setEnrollCourse(course);
        const enrolled = new Set((course.students || []).map(s => s._id || s));
        setSelectedIds(enrolled);
        setSearch('');
        setBatchFilter('');
        setShowEnrollModal(true);
    };

    const toggleStudent = (id) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const handleEnrollSave = async () => {
        setEnrollLoading(true);
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            await api.put(
                `/api/admin/courses/${enrollCourse._id}/enroll`,
                { studentIds: [...selectedIds] },
                config
            );
            toast.fire({ icon: 'success', title: 'Enrollment saved!' });
            setShowEnrollModal(false);
            fetchData();
        } catch (err) {
            showError('Error', err.response?.data?.message || 'Failed to save enrollment.');
        } finally {
            setEnrollLoading(false);
        }
    };

    // Get unique batches from all students
    const uniqueBatches = useMemo(() => {
        const batches = new Set(allStudents.map(s => s.batch).filter(Boolean));
        return Array.from(batches).sort();
    }, [allStudents]);

    const filteredStudents = allStudents.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
                            s.regNo.toLowerCase().includes(search.toLowerCase());
        const matchesBatch = !batchFilter || s.batch === batchFilter;
        return matchesSearch && matchesBatch;
    });

    // Get unique semesters/batches from students
    const availableSemesters = useMemo(() => {
        const batches = new Set(allStudents.map(s => s.batch).filter(Boolean));
        return Array.from(batches).sort();
    }, [allStudents]);

    // ── Course assignment handlers ──
    const handleOpenAssignModal = (assignment = null) => {
        if (assignment) {
            setIsEditingAssignment(true);
            setCurrentAssignmentId(assignment._id);
            setAssignmentFormData({
                facultyId: assignment.faculty?._id || '',
                courseId: assignment.course?._id || '',
                semester: assignment.semester || ''
            });
        } else {
            setIsEditingAssignment(false);
            setCurrentAssignmentId(null);
            setAssignmentFormData({ facultyId: '', courseId: '', semester: '' });
        }
        setShowAssignModal(true);
    };

    const handleAssignmentSubmit = async (e) => {
        e.preventDefault();
        setAssignmentLoading(true);
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            if (isEditingAssignment) {
                await api.put(`/api/assignments/${currentAssignmentId}`, {
                    faculty: assignmentFormData.facultyId,
                    course: assignmentFormData.courseId,
                    semester: assignmentFormData.semester
                }, config);
                toast.fire({ icon: 'success', title: 'Assignment updated!' });
            } else {
                await api.post('/api/assignments', {
                    faculty: assignmentFormData.facultyId,
                    course: assignmentFormData.courseId,
                    semester: assignmentFormData.semester
                }, config);
                toast.fire({ icon: 'success', title: 'Course assigned!' });
            }
            fetchData();
            setShowAssignModal(false);
        } catch (err) {
            showError('Error', err.response?.data?.message || 'Error processing request');
        } finally {
            setAssignmentLoading(false);
        }
    };

    const handleDeleteAssignment = async (id) => {
        const result = await showConfirm('Are you sure?', 'This will delete the course assignment.');
        if (result.isConfirmed) {
            try {
                const config = { headers: { Authorization: `Bearer ${user.token}` } };
                await api.delete(`/api/assignments/${id}`, config);
                toast.fire({ icon: 'success', title: 'Assignment deleted!' });
                fetchData();
            } catch {
                showError('Error', 'Could not delete assignment.');
            }
        }
    };

    return (
        <motion.div initial="hidden" animate="visible" variants={containerVariants}>
            <Container fluid className="py-4 px-4">

                {/* Header */}
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h4 className="fw-bold text-dark mb-0">Course Management</h4>
                        <p className="text-muted small mb-0">{courses.length} course{courses.length !== 1 ? 's' : ''} registered</p>
                    </div>
                    <Button
                        className="d-flex align-items-center gap-2 border-0 px-4"
                        style={{ backgroundColor: '#4c1d95' }}
                        onClick={() => handleOpenModal()}
                    >
                        <BookPlus size={16} /> Add New Course
                    </Button>
                </div>

                {/* Course grid */}
                <Row className="g-4">
                    <AnimatePresence>
                        {courses.length > 0 ? courses.map((course) => {
                            const assignment = assignments.find(a => a.course?._id === course._id);
                            const enrolledCount = course.students?.length || 0;
                            const initials = course.name
                            .split(' ')
                            .map(word => word[0])
                            .join('')
                            .slice(0, 3)
                            .toUpperCase();

                            return (
                                <Col key={course._id} lg={4} md={6}>
                                    <motion.div
                                        variants={itemVariants}
                                        layout
                                        initial="hidden"
                                        animate="visible"
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        whileHover={{ y: -4, transition: { duration: 0.18 } }}
                                        className="h-100"
                                    >
                                        <Card className="h-100 border-0 shadow-sm rounded-4 overflow-hidden">

                                            {/* Accent bar */}
                                            <div style={{ height: 5, background: 'linear-gradient(90deg,#4c1d95,#7c3aed)' }} />

                                            <Card.Body className="p-4">
                                                {/* Top row: avatar + credit badge */}
                                                <div className="d-flex align-items-start justify-content-between mb-3">
                                                    <div
                                                        className="rounded-3 d-flex align-items-center justify-content-center text-white fw-bold"
                                                        style={{ width: 52, height: 52, backgroundColor: '#4c1d95', fontSize: '0.82rem', letterSpacing: 1, flexShrink: 0 }}
                                                    >
                                                        {initials}
                                                    </div>
                                                    <span className="rounded-pill px-3 py-1 fw-semibold"
                                                        style={{ backgroundColor: '#ede9fe', color: '#6d28d9', fontSize: '0.75rem' }}>
                                                        {course.creditHours} Cr.Hrs
                                                    </span>
                                                </div>

                                                {/* Name + code */}
                                                <h6 className="fw-bold mb-0 text-dark">{course.code} - {course.name}</h6>
                                                <p className="mb-3" style={{ color: '#7c3aed', fontSize: '0.8rem', fontWeight: 500 }}>
                                                </p>

                                                {/* Info pills */}
                                                <div className="d-flex flex-column gap-2">
                                                    <div className="d-flex align-items-center gap-2 px-3 py-2 rounded-3"
                                                        style={{ backgroundColor: '#f5f3ff' }}>
                                                        <div className="rounded-2 p-1" style={{ backgroundColor: '#ede9fe' }}>
                                                            <User size={13} color="#6d28d9" />
                                                        </div>
                                                        <span className="text-muted" style={{ fontSize: '0.82rem' }}>
                                                            {assignment?.faculty?.name
                                                                ? <><span className="fw-medium text-dark">{assignment.faculty.name}</span></>
                                                                : <span className="fst-italic">Not assigned</span>}
                                                        </span>
                                                    </div>
                                                </div>
                                            </Card.Body>

                                            {/* Footer */}
                                            <div className="border-top px-4 py-3 d-flex justify-content-between align-items-center gap-2"
                                                style={{ backgroundColor: '#fafafa' }}>
                                                <span className="text-muted small" style={{ fontSize: '0.75rem' }}>Created once</span>
                                                <button
                                                    className="btn btn-sm rounded-2 px-3 py-1"
                                                    style={{ backgroundColor: '#4c1d95', color: '#fff', fontSize: '0.78rem', border: 'none' }}
                                                    onClick={() => openEnrollModal(course)}
                                                    title="Enroll Students"
                                                >
                                                    Enroll Students
                                                </button>
                                            </div>

                                        </Card>
                                    </motion.div>
                                </Col>
                            );
                        }) : (
                            <Col xs={12}>
                                <div className="text-center py-5 border rounded-4 bg-white">
                                    <div className="d-inline-flex p-4 rounded-circle mb-3" style={{ backgroundColor: '#ede9fe' }}>
                                        <Book size={36} color="#6d28d9" />
                                    </div>
                                    <h5 className="fw-bold">No courses yet</h5>
                                    <p className="text-muted small">Add your first course to get started.</p>
                                </div>
                            </Col>
                        )}
                    </AnimatePresence>
                </Row>

                {/* ── Course Assignment Section ── */}
                <div className="mt-5">
                    <div className="d-flex justify-content-between align-items-center mb-4">
                        <div>
                            <h5 className="fw-bold text-dark mb-0">Course Assignments</h5>
                            <p className="text-muted small mb-0">{assignments.length} assignment{assignments.length !== 1 ? 's' : ''}</p>
                        </div>
                        <Button
                            className="d-flex align-items-center gap-2 border-0 px-4"
                            style={{ backgroundColor: '#4c1d95' }}
                            onClick={() => handleOpenAssignModal()}
                        >
                            <Plus size={16} /> Assign Course
                        </Button>
                    </div>

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
                                        {assignments.length > 0 ? assignments.map((a) => (
                                            <motion.tr
                                                key={a._id}
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                            >
                                                <td className="px-4 py-3 fw-semibold">{a.course?.name}</td>
                                                <td className="px-4 py-3 text-muted">{a.faculty?.name}</td>
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
                                                            onClick={() => handleOpenAssignModal(a)}
                                                        >
                                                            Edit
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="light"
                                                            className="bg-danger-subtle text-danger"
                                                            onClick={() => handleDeleteAssignment(a._id)}
                                                        >
                                                            Delete
                                                        </Button>
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        )) : (
                                            <tr>
                                                <td colSpan="4" className="text-center py-5">
                                                    <p className="text-muted">No assignments found</p>
                                                </td>
                                            </tr>
                                        )}
                                    </AnimatePresence>
                                </tbody>
                            </Table>
                        </Card.Body>
                    </Card>
                </div>

                {/* ── Create / Edit Course Modal ── */}
                <Modal show={showModal} onHide={() => setShowModal(false)} centered>
                    <Modal.Header closeButton>
                        <Modal.Title>{isEditing ? 'Edit Course' : 'Create Course'}</Modal.Title>
                    </Modal.Header>
                    <Form onSubmit={handleSubmit}>
                        <Modal.Body className="d-flex flex-column gap-3">
                            <Form.Control
                                placeholder="Course Name"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                required
                                className="py-2 shadow-sm border-2"
                                style={{
                                    backgroundColor: '#f8fafc',
                                    borderColor: '#cbd5e1',
                                    borderRadius: '10px',
                                    fontSize: '0.95rem'
                                }}
                            />
                            <Form.Control
                                placeholder="Course Code (e.g. CS-101)"
                                value={formData.code}
                                onChange={e => setFormData({ ...formData, code: e.target.value })}
                                required
                                className="py-2 shadow-sm border-2"
                                style={{
                                    backgroundColor: '#f8fafc',
                                    borderColor: '#cbd5e1',
                                    borderRadius: '10px',
                                    fontSize: '0.95rem'
                                }}
                            />
                            <Form.Control
                                type="number"
                                placeholder="Credit Hours"
                                value={formData.creditHours}
                                onChange={e => setFormData({ ...formData, creditHours: e.target.value })}
                                required
                                className="py-2 shadow-sm border-2"
                                style={{
                                    backgroundColor: '#f8fafc',
                                    borderColor: '#cbd5e1',
                                    borderRadius: '10px',
                                    fontSize: '0.95rem'
                                }}
                            />
                        </Modal.Body>
                        <Modal.Footer>
                            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
                            <Button type="submit" disabled={loading}>
                                {loading ? 'Saving...' : isEditing ? 'Update' : 'Create'}
                            </Button>
                        </Modal.Footer>
                    </Form>
                </Modal>

                {/* ── Course Assignment Modal ── */}
                <Modal show={showAssignModal} onHide={() => setShowAssignModal(false)} centered>
                    <Modal.Header closeButton>
                        <Modal.Title>{isEditingAssignment ? 'Edit Assignment' : 'Assign Course'}</Modal.Title>
                    </Modal.Header>
                    <Form onSubmit={handleAssignmentSubmit}>
                        <Modal.Body className="d-flex flex-column gap-3">
                            <Form.Group>
                                <Form.Label>Faculty</Form.Label>
                                <Form.Select
                                    value={assignmentFormData.facultyId}
                                    onChange={e => setAssignmentFormData({ ...assignmentFormData, facultyId: e.target.value })}
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

                            <Form.Group>
                                <Form.Label>Course</Form.Label>
                                <Form.Select
                                    value={assignmentFormData.courseId}
                                    onChange={e => setAssignmentFormData({ ...assignmentFormData, courseId: e.target.value })}
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
                                            {c.code} - {c.name}
                                        </option>
                                    ))}
                                </Form.Select>
                            </Form.Group>

                            <Form.Group>
                                <Form.Label>Semester</Form.Label>
                                <Form.Select
                                    value={assignmentFormData.semester}
                                    onChange={e => setAssignmentFormData({ ...assignmentFormData, semester: e.target.value })}
                                    required
                                    className="py-2 shadow-sm border-2"
                                    style={{
                                        backgroundColor: '#f8fafc',
                                        borderColor: '#cbd5e1',
                                        borderRadius: '10px',
                                        fontSize: '0.95rem'
                                    }}
                                >
                                    <option value="">Select Semester</option>
                                    {availableSemesters.map(sem => (
                                        <option key={sem} value={sem}>
                                            {sem}
                                        </option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </Modal.Body>
                        <Modal.Footer>
                            <Button variant="secondary" onClick={() => setShowAssignModal(false)}>Cancel</Button>
                            <Button
                                type="submit"
                                disabled={assignmentLoading}
                                style={{ backgroundColor: '#4c1d95', border: 'none' }}
                            >
                                {assignmentLoading ? 'Saving...' : isEditingAssignment ? 'Update' : 'Assign'}
                            </Button>
                        </Modal.Footer>
                    </Form>
                </Modal>

                {/* ── Enroll Students Modal ── */}
                <Modal show={showEnrollModal} onHide={() => setShowEnrollModal(false)} centered size="lg">
                    <Modal.Header closeButton>
                        <div>
                            <Modal.Title className="fw-bold">Enroll Students</Modal.Title>
                            {enrollCourse && (
                                <p className="text-muted small mb-0 mt-1">
                                    {enrollCourse.code} — {enrollCourse.name} &nbsp;·&nbsp;
                                    <strong>{selectedIds.size}</strong> selected
                                </p>
                            )}
                        </div>
                    </Modal.Header>

                    <Modal.Body style={{ maxHeight: '65vh', overflowY: 'auto' }}>
                        {/* Search and Batch Filter */}
                        <div className="d-flex gap-2 mb-3">
                            <div className="position-relative flex-grow-1">
                                <Search size={16} className="position-absolute text-muted" style={{ left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                                <Form.Control
                                    placeholder="Search by name or reg no..."
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    className="ps-5"
                                />
                            </div>
                            <Form.Select
                                value={batchFilter}
                                onChange={e => setBatchFilter(e.target.value)}
                                className="py-2"
                                style={{ maxWidth: '180px' }}
                            >
                                <option value="">All Batches</option>
                                {uniqueBatches.map(batch => (
                                    <option key={batch} value={batch}>{batch}</option>
                                ))}
                            </Form.Select>
                        </div>

                        {/* Quick actions */}
                        <div className="d-flex gap-2 mb-3">
                            <Button
                                variant="outline-secondary"
                                size="sm"
                                onClick={() => setSelectedIds(new Set(allStudents.map(s => s._id)))}
                            >
                                Select All
                            </Button>
                            <Button
                                variant="outline-secondary"
                                size="sm"
                                onClick={() => setSelectedIds(new Set())}
                            >
                                Deselect All
                            </Button>
                        </div>

                        {/* Student list */}
                        {filteredStudents.length === 0 ? (
                            <p className="text-muted text-center py-4">No students found.</p>
                        ) : (
                            <div className="d-flex flex-column gap-2">
                                {filteredStudents.map(s => {
                                    const checked = selectedIds.has(s._id);
                                    return (
                                        <div
                                            key={s._id}
                                            onClick={() => toggleStudent(s._id)}
                                            className="d-flex align-items-center gap-3 p-3 rounded-3 border"
                                            style={{
                                                cursor: 'pointer',
                                                backgroundColor: checked ? '#f5f3ff' : '#fff',
                                                borderColor: checked ? '#6d28d9' : '#dee2e6',
                                                transition: 'all 0.15s'
                                            }}
                                        >
                                            {/* Custom checkbox */}
                                            <div
                                                className="d-flex align-items-center justify-content-center rounded-2 flex-shrink-0"
                                                style={{
                                                    width: 20, height: 20,
                                                    backgroundColor: checked ? '#6d28d9' : '#fff',
                                                    border: `2px solid ${checked ? '#6d28d9' : '#aaa'}`
                                                }}
                                            >
                                                {checked && <Check size={12} color="white" strokeWidth={3} />}
                                            </div>

                                            {/* Avatar */}
                                            <div
                                                className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold flex-shrink-0"
                                                style={{ width: 38, height: 38, backgroundColor: '#637a62', fontSize: '0.85rem' }}
                                            >
                                                {s.name.slice(0, 2).toUpperCase()}
                                            </div>

                                            <div className="flex-grow-1 min-width-0">
                                                <div className="fw-semibold text-dark" style={{ fontSize: '0.92rem' }}>{s.name}</div>
                                                <div className="text-muted" style={{ fontSize: '0.78rem' }}>{s.regNo} &nbsp;·&nbsp; Batch {s.batch}</div>
                                            </div>

                                            {checked && (
                                                <Badge bg="primary" className="rounded-pill px-2" style={{ backgroundColor: '#6d28d9', fontSize: '0.7rem' }}>
                                                    Enrolled
                                                </Badge>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </Modal.Body>

                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowEnrollModal(false)}>Cancel</Button>
                        <Button
                            style={{ backgroundColor: '#4c1d95', border: 'none' }}
                            onClick={handleEnrollSave}
                            disabled={enrollLoading}
                        >
                            {enrollLoading ? 'Saving...' : `Save Enrollment (${selectedIds.size} students)`}
                        </Button>
                    </Modal.Footer>
                </Modal>

            </Container>
        </motion.div>
    );
};

export default Courses;
