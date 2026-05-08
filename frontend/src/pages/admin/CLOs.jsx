import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Container, Card, Form, Button, Table, Badge, Modal, Row, Col } from 'react-bootstrap';
import { toast, showError, showConfirm } from '../../utils/notifications';
import { PlusCircle, Edit, Trash2, FileText, Hash, Link2, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const containerVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, staggerChildren: 0.05 } }
};

const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: { opacity: 1, x: 0 }
};

const CLOs = () => {
    const [clos, setClos] = useState([]);
    const [plos, setPlos] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentId, setCurrentId] = useState(null);
    const [formData, setFormData] = useState({ code: '', description: '', plo: '' });
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchCLOs();
        fetchPLOs();
    }, []);

    const fetchCLOs = async () => {
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            const { data } = await axios.get('/api/admin/clos', config);
            setClos(data);
        } catch (error) {
            console.error("Error fetching CLOs:", error);
        }
    };

    const fetchPLOs = async () => {
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            const { data } = await axios.get('/api/admin/plos', config);
            setPlos(data);
        } catch (error) {
            console.error("Error fetching PLOs:", error);
        }
    };

    const handleOpenModal = (clo = null) => {
        if (clo) {
            setIsEditing(true);
            setCurrentId(clo._id);
            setFormData({ code: clo.code, description: clo.description, plo: clo.plo?._id || '' });
        } else {
            setIsEditing(false);
            setCurrentId(null);
            setFormData({ code: '', description: '', plo: '' });
        }
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            if (isEditing) {
                await axios.put(`/api/admin/clos/${currentId}`, formData, config);
                toast.fire({ icon: 'success', title: 'CLO updated successfully!' });
            } else {
                await axios.post('/api/admin/clos', formData, config);
                toast.fire({ icon: 'success', title: 'CLO added successfully!' });
            }
            fetchCLOs();
            setShowModal(false);
        } catch (error) {
            showError('Error', error.response?.data?.message || 'Error processing request');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        const result = await showConfirm('Are you sure?', 'You want to delete this CLO?');
        if (result.isConfirmed) {
            try {
                const config = { headers: { Authorization: `Bearer ${user.token}` } };
                await axios.delete(`/api/admin/clos/${id}`, config);
                toast.fire({ icon: 'success', title: 'CLO removed successfully!' });
                fetchCLOs();
            } catch (error) {
                showError('Error', 'Error deleting CLO');
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
                        <h2 className="mb-0 text-dark fw-bold display-6 fs-3">Course Learning Outcomes</h2>
                        <p className="text-muted small mb-0">Map specific course objectives to program-level outcomes</p>
                    </div>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button style={{ backgroundColor: '#4c1d95', border: 'none' }} onClick={() => handleOpenModal()} className="d-flex align-items-center gap-2 shadow-sm px-4 py-2 border-0 text-white">
                            <PlusCircle size={18} /> Add New CLO
                        </Button>
                    </motion.div>
                </div>

                <Card className="shadow-sm border-0 mb-4 overflow-hidden">
                    <Table hover responsive striped={false} className="mb-0">
                        <thead className="bg-white border-bottom">
                            <tr>
                                <th className="px-4 py-3 text-muted small text-uppercase" style={{ width: '150px' }}>CLO Code</th>
                                <th className="px-4 py-3 text-muted small text-uppercase">Description</th>
                                <th className="px-4 py-3 text-muted small text-uppercase">Mapped PLO</th>
                                <th className="px-4 py-3 text-muted small text-uppercase text-end">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <AnimatePresence mode="popLayout">
                                {clos.map((clo, idx) => (
                                    <motion.tr
                                        key={clo._id}
                                        variants={itemVariants}
                                        layout
                                        initial="hidden"
                                        animate="visible"
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        transition={{ delay: idx * 0.05 }}
                                    >
                                        <td className="px-4 py-3 align-middle">
                                            <div className="d-flex align-items-center gap-2">
                                                <div className="rounded-2 p-1" style={{ backgroundColor: '#ede9fe', color: '#6d28d9' }}>
                                                    <Layers size={16} />
                                                </div>
                                                <span className="fw-bold text-dark">{clo.code}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 align-middle text-muted small" style={{ maxWidth: '400px' }}>{clo.description}</td>
                                        <td className="px-4 py-3 align-middle">
                                            {clo.plo ? (
                                                <Badge bg="secondary-subtle" className="text-secondary border-0 px-3 py-2 fw-medium rounded-pill">
                                                    {clo.plo.code}
                                                </Badge>
                                            ) : (
                                                <span className="text-muted smaller">Unmapped</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 align-middle text-end">
                                            <div className="d-flex justify-content-end gap-2">
                                                <motion.div whileHover={{ scale: 1.1 }}>
                                                    <Button variant="light" size="sm" onClick={() => handleOpenModal(clo)} className="border-0 p-2 rounded-2" style={{ backgroundColor: '#ede9fe', color: '#6d28d9' }}>
                                                        <Edit size={16} />
                                                    </Button>
                                                </motion.div>
                                                <motion.div whileHover={{ scale: 1.1 }}>
                                                    <Button variant="light" size="sm" onClick={() => handleDelete(clo._id)} className="border-0 bg-danger-subtle text-danger p-2 rounded-lg">
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
                    {clos.length === 0 && (
                        <div className="text-center py-5">
                            <div className="bg-light d-inline-block p-4 rounded-circle mb-3">
                                <Layers size={40} className="text-muted" />
                            </div>
                            <h5 className="fw-bold">No CLOs defined yet</h5>
                        </div>
                    )}
                </Card>

                <Modal show={showModal} onHide={() => setShowModal(false)} centered size="lg">
                    <Modal.Header closeButton className="border-0 pb-0">
                        <Modal.Title className="fw-bold fs-4">{isEditing ? 'Edit CLO Details' : 'Add Course Outcome'}</Modal.Title>
                    </Modal.Header>
                    <Form onSubmit={handleSubmit}>
                        <Modal.Body className="p-4">
                            <Row className="g-4">
                                <Col md={4}>
                                    <Form.Group>
                                        <Form.Label className="small fw-bold text-muted">CLO Code</Form.Label>
                                        <div className="position-relative">
                                            <Form.Control
                                                type="text"
                                                placeholder="e.g. CLO-1"
                                                required
                                                value={formData.code}
                                                onChange={e => setFormData({ ...formData, code: e.target.value })}
                                                className="ps-5 py-2 border-light bg-light bg-opacity-50 shadow-none"
                                            />
                                            <Hash className="position-absolute text-muted" size={18} style={{ left: '15px', top: '50%', transform: 'translateY(-50%)' }} />
                                        </div>
                                    </Form.Group>
                                </Col>
                                <Col md={8}>
                                    <Form.Group>
                                        <Form.Label className="small fw-bold text-muted">Map to Program Outcome (PLO)</Form.Label>
                                        <div className="position-relative">
                                            <Form.Select
                                                value={formData.plo}
                                                onChange={e => setFormData({ ...formData, plo: e.target.value })}
                                                className="ps-5 py-2 border-light bg-light bg-opacity-50 shadow-none"
                                            >
                                                <option value="">Select PLO...</option>
                                                {plos.map(plo => (
                                                    <option key={plo._id} value={plo._id}>{plo.code} - {plo.description.substring(0, 60)}...</option>
                                                ))}
                                            </Form.Select>
                                            <Link2 className="position-absolute text-muted" size={18} style={{ left: '15px', top: '50%', transform: 'translateY(-50%)' }} />
                                        </div>
                                    </Form.Group>
                                </Col>
                                <Col md={12}>
                                    <Form.Group>
                                        <Form.Label className="small fw-bold text-muted">Description</Form.Label>
                                        <div className="position-relative">
                                            <Form.Control
                                                as="textarea"
                                                rows={4}
                                                placeholder="Enter the specific observable learning behavior..."
                                                required
                                                value={formData.description}
                                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                                className="ps-5 py-2 border-light bg-light bg-opacity-50 shadow-none"
                                            />
                                            <FileText className="position-absolute text-muted" size={18} style={{ left: '15px', top: '12px' }} />
                                        </div>
                                    </Form.Group>
                                </Col>
                            </Row>
                        </Modal.Body>
                        <Modal.Footer className="border-0 p-4 pt-0">
                            <Button variant="light" onClick={() => setShowModal(false)} className="px-4 border-0">Cancel</Button>
                            <Button style={{ backgroundColor: '#4c1d95', border: 'none' }} type="submit" className="px-5 shadow-sm border-0 py-2 fw-semibold text-white" disabled={loading}>
                                {loading ? 'Processing...' : (isEditing ? 'Save Changes' : 'Confirm Entry')}
                            </Button>
                        </Modal.Footer>
                    </Form>
                </Modal>
            </Container>
        </motion.div>
    );
};

export default CLOs;
