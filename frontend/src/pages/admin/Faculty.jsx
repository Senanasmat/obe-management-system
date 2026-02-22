import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Container, Card, Form, Button, Table, Modal, Row, Col } from 'react-bootstrap';
import { toast, showError, showConfirm } from '../../utils/notifications';
import { UserPlus, User, Edit, Trash2, Shield, Lock, Mail } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const containerVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, staggerChildren: 0.05 } }
};

const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: { opacity: 1, x: 0 }
};

const DEPARTMENTS = [
    'Software Engineering',
    'Electrical Engineering',

];

const DESIGNATIONS = [
    'Professor',
    'Assistant Professor',
    'Lecturer',
    'Lab Engineer',
    'Visiting Lecturer',
];

const Faculty = () => {
    const [faculty, setFaculty] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentId, setCurrentId] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        department: DEPARTMENTS[0],
        designation: DESIGNATIONS[0]
    });
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchFaculty();
    }, []);

    const fetchFaculty = async () => {
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            const { data } = await axios.get('/api/admin/faculty', config);
            setFaculty(data);
        } catch (error) {
            console.error("Error fetching faculty:", error);
        }
    };

    const handleOpenModal = (member = null) => {
        if (member) {
            setIsEditing(true);
            setCurrentId(member._id);
            setFormData({
                name: member.name,
                department: member.department || DEPARTMENTS[0],
                designation: member.designation || DESIGNATIONS[0]
            });
        } else {
            setIsEditing(false);
            setCurrentId(null);
            setFormData({
                name: '',
                department: DEPARTMENTS[0],
                designation: DESIGNATIONS[0]
            });
        }
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            if (isEditing) {
                await axios.put(`/api/admin/faculty/${currentId}`, formData, config);
                toast.fire({ icon: 'success', title: 'Faculty member updated successfully!' });
            } else {
                // Registering via admin controller which handles auto-gen
                await axios.post('/api/admin/faculty', formData, config);
                toast.fire({ icon: 'success', title: 'Faculty registered successfully!' });
            }
            fetchFaculty();
            setShowModal(false);
        } catch (error) {
            showError('Error', error.response?.data?.message || 'Error processing request');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        const result = await showConfirm('Are you sure?', 'You want to delete this faculty member?');
        if (result.isConfirmed) {
            try {
                const config = { headers: { Authorization: `Bearer ${user.token}` } };
                await axios.delete(`/api/admin/faculty/${id}`, config);
                toast.fire({ icon: 'success', title: 'Faculty member removed successfully!' });
                fetchFaculty();
            } catch (error) {
                showError('Error', 'Error deleting faculty member');
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
                        <h2 className="mb-0 text-dark fw-bold display-6 fs-3">Faculty Management</h2>
                    </div>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button variant="primary" onClick={() => handleOpenModal()} className="d-flex align-items-center gap-2 shadow-sm px-4 py-2 border-0">
                            <UserPlus size={18} /> Register Faculty
                        </Button>
                    </motion.div>
                </div>

                <Card className="shadow-sm border-0 mb-4 overflow-hidden">
                    <Table hover responsive striped={false} className="mb-0">
                        <thead className="bg-light border-bottom">
                            <tr>
                                <th className="px-4 py-3 text-muted small text-uppercase">Name</th>
                                <th className="px-4 py-3 text-muted small text-uppercase">Dept & Designation</th>
                                <th className="px-4 py-3 text-muted small text-uppercase text-end">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <AnimatePresence mode="popLayout">
                                {faculty.map((member, idx) => (
                                    <motion.tr
                                        key={member._id}
                                        variants={itemVariants}
                                        layout
                                        initial="hidden"
                                        animate="visible"
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        transition={{ delay: idx * 0.05 }}
                                    >
                                        <td className="px-4 py-3 align-middle">
                                            <div className="d-flex align-items-center gap-3">
                                                <div className="bg-primary-subtle text-primary rounded-circle p-2 d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}>
                                                    <User icon={User} size={20} />
                                                </div>
                                                <span className="fw-semibold text-dark">{member.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 align-middle">
                                            <div className="small fw-medium text-dark">{member.designation}</div>
                                            <div className="smaller text-muted">{member.department}</div>
                                        </td>
                                        <td className="px-4 py-3 align-middle text-end">
                                            <div className="d-flex justify-content-end gap-2">
                                                <motion.div whileHover={{ scale: 1.1 }}>
                                                    <Button variant="light" size="sm" onClick={() => handleOpenModal(member)} className="border-0 bg-primary-subtle text-primary p-2 rounded-lg">
                                                        <Edit size={16} />
                                                    </Button>
                                                </motion.div>
                                                <motion.div whileHover={{ scale: 1.1 }}>
                                                    <Button variant="light" size="sm" onClick={() => handleDelete(member._id)} className="border-0 bg-danger-subtle text-danger p-2 rounded-lg">
                                                        <Trash2 size={16} />
                                                    </Button>
                                                </motion.div>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))}
                            </AnimatePresence>
                        </tbody>
                    </Table>
                </Card>

                <Modal show={showModal} onHide={() => setShowModal(false)} centered size="md">
                    <Modal.Header closeButton className="border-0 pb-0">
                        <Modal.Title className="fw-bold fs-4">{isEditing ? 'Edit Faculty Details' : 'Register New Faculty'}</Modal.Title>
                    </Modal.Header>
                    <Form onSubmit={handleSubmit}>
                        <Modal.Body className="p-4">
                            <Row className="g-4">
                                <Col md={12}>
                                    <Form.Group>
                                        <Form.Label className="small fw-bold text-muted">Full Name</Form.Label>
                                        <div className="position-relative">
                                            <Form.Control
                                                type="text"
                                                placeholder="e.g. John Doe"
                                                required
                                                value={formData.name}
                                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                                className="ps-5 py-2 border-light bg-light bg-opacity-50 shadow-none"
                                            />
                                            <User className="position-absolute text-muted" size={18} style={{ left: '15px', top: '50%', transform: 'translateY(-50%)' }} />
                                        </div>
                                    </Form.Group>
                                </Col>
                                <Col md={12}>
                                    <Form.Group>
                                        <Form.Label className="small fw-bold text-muted">Department</Form.Label>
                                        <Form.Select
                                            value={formData.department}
                                            onChange={e => setFormData({ ...formData, department: e.target.value })}
                                            className="py-2 border-light bg-light bg-opacity-50 shadow-none"
                                        >
                                            {DEPARTMENTS.map(dept => <option key={dept} value={dept}>{dept}</option>)}
                                        </Form.Select>
                                    </Form.Group>
                                </Col>
                                <Col md={12}>
                                    <Form.Group>
                                        <Form.Label className="small fw-bold text-muted">Designation</Form.Label>
                                        <Form.Select
                                            value={formData.designation}
                                            onChange={e => setFormData({ ...formData, designation: e.target.value })}
                                            className="py-2 border-light bg-light bg-opacity-50 shadow-none"
                                        >
                                            {DESIGNATIONS.map(desig => <option key={desig} value={desig}>{desig}</option>)}
                                        </Form.Select>
                                    </Form.Group>
                                </Col>
                            </Row>
                        </Modal.Body>
                        <Modal.Footer className="border-0 p-4 pt-0">
                            <Button variant="light" onClick={() => setShowModal(false)} className="px-4 border-0">Cancel</Button>
                            <Button variant="primary" type="submit" className="px-5 shadow-sm border-0 py-2 fw-semibold" disabled={loading}>
                                {loading ? 'Processing...' : (isEditing ? 'Save Changes' : 'Confirm Registration')}
                            </Button>
                        </Modal.Footer>
                    </Form>
                </Modal>
            </Container>

            <style>{`
                .smaller { font-size: 0.75rem; }
            `}</style>
        </motion.div>
    );
};

export default Faculty;
