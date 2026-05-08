import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Container, Card, Form, Button, Table, Modal } from 'react-bootstrap';
import { toast, showError, showConfirm } from '../../utils/notifications';
import { PlusCircle, Edit, Trash2, FileText, Hash, Target } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const containerVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, staggerChildren: 0.05 } }
};

const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: { opacity: 1, x: 0 }
};

const PLOs = () => {
    const [plos, setPlos] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentId, setCurrentId] = useState(null);
    const [formData, setFormData] = useState({ code: '', title: '', description: '' });
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchPLOs();
    }, []);

    const fetchPLOs = async () => {
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            const { data } = await axios.get('/api/admin/plos', config);
            setPlos(data);
        } catch (error) {
            console.error("Error fetching PLOs:", error);
        }
    };

    const handleOpenModal = (plo = null) => {
        if (plo) {
            setIsEditing(true);
            setCurrentId(plo._id);
            setFormData({ code: plo.code, title: plo.title, description: plo.description });
        } else {
            setIsEditing(false);
            setCurrentId(null);
            setFormData({ code: '', title: '', description: '' });
        }
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            if (isEditing) {
                await axios.put(`/api/admin/plos/${currentId}`, formData, config);
                toast.fire({ icon: 'success', title: 'PLO updated successfully!' });
            } else {
                await axios.post('/api/admin/plos', formData, config);
                toast.fire({ icon: 'success', title: 'PLO added successfully!' });
            }
            fetchPLOs();
            setShowModal(false);
        } catch (error) {
            showError('Error', error.response?.data?.message || 'Error processing request');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        const result = await showConfirm('Are you sure?', 'You want to delete this PLO?');
        if (result.isConfirmed) {
            try {
                const config = { headers: { Authorization: `Bearer ${user.token}` } };
                await axios.delete(`/api/admin/plos/${id}`, config);
                toast.fire({ icon: 'success', title: 'PLO removed successfully!' });
                fetchPLOs();
            } catch (error) {
                showError('Error', 'Error deleting PLO');
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
                        <h2 className="mb-0 text-dark fw-bold display-6 fs-3">Program Learning Outcomes</h2>
                    </div>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button style={{ backgroundColor: '#4c1d95', border: 'none' }} onClick={() => handleOpenModal()} className="d-flex align-items-center gap-2 shadow-sm px-4 py-2 border-0">
                            <PlusCircle size={18} /> Add New PLO
                        </Button>
                    </motion.div>
                </div>

                <Card className="shadow-sm border-0 mb-4 overflow-hidden">
                    <Table hover responsive striped={false} className="mb-0">
                        <thead className="bg-white border-bottom">
                            <tr>
                                <th className="px-4 py-3 text-muted small text-uppercase" style={{ width: '180px' }}>PLO Code</th>
                                <th className="px-4 py-3 text-muted small text-uppercase">Title</th>
                                <th className="px-4 py-3 text-muted small text-uppercase">Description</th>
                                <th className="px-4 py-3 text-muted small text-uppercase text-end">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <AnimatePresence mode="popLayout">
                                {plos.map((plo, idx) => (
                                    <motion.tr
                                        key={plo._id}
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
                                                    <Target size={16} />
                                                </div>
                                                <span className="fw-bold text-dark">{plo.code}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 align-middle">
                                            <div className="d-flex align-items-center gap-2">
                                                <span className="fw-bold text-dark">{plo.title}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 align-middle text-muted lead fs-6" style={{ fontWeight: '400' }}>{plo.description}</td>
                                        <td className="px-4 py-3 align-middle text-end">
                                            <div className="d-flex justify-content-end gap-2">
                                                <motion.div whileHover={{ scale: 1.1 }}>
                                                    <Button variant="light" size="sm" onClick={() => handleOpenModal(plo)} className="border-0 p-2 rounded-2" style={{ backgroundColor: '#ede9fe', color: '#6d28d9' }}>
                                                        <Edit size={16} />
                                                    </Button>
                                                </motion.div>
                                                <motion.div whileHover={{ scale: 1.1 }}>
                                                    <Button variant="light" size="sm" onClick={() => handleDelete(plo._id)} className="border-0 bg-danger-subtle text-danger p-2 rounded-lg">
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
                    {plos.length === 0 && (
                        <div className="text-center py-5">
                            <div className="bg-light d-inline-block p-4 rounded-circle mb-3">
                                <Target size={40} className="text-muted" />
                            </div>
                            <h5 className="fw-bold">No PLOs defined yet</h5>
                            <p className="text-muted">Start by adding your program's learning outcomes.</p>
                        </div>
                    )}
                </Card>

                <Modal show={showModal} onHide={() => setShowModal(false)} centered size="lg">
                    <Modal.Header closeButton className="border-0 pb-0">
                        <Modal.Title className="fw-bold fs-4">{isEditing ? 'Edit PLO Description' : 'Add Program Outcome'}</Modal.Title>
                    </Modal.Header>
                    <Form onSubmit={handleSubmit}>
                        <Modal.Body className="p-4">
                            <Form.Group className="mb-4">
                                <Form.Label className="small fw-bold text-muted">Outcome Code</Form.Label>
                                <div className="position-relative">
                                    <Form.Control
                                        type="text"
                                        placeholder="e.g. PLO-1"
                                        required
                                        value={formData.code}
                                        onChange={e => setFormData({ ...formData, code: e.target.value })}
                                        className="ps-5 py-2 border border-2 border-secondary-subtle rounded-3 shadow-sm"
                                    />
                                    <Hash className="position-absolute text-muted" size={18} style={{ left: '15px', top: '50%', transform: 'translateY(-50%)' }} />
                                </div>
                            </Form.Group>
                            <Form.Group className="mb-4">
                                <Form.Label className="small fw-bold text-muted">Outcome Title</Form.Label>
                                <div className="position-relative">
                                    <Form.Control
                                        type="text"
                                        placeholder="e.g. Engineering Knowledge"
                                        required
                                        value={formData.title}
                                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                                        className="ps-5 py-2 border border-2 border-secondary-subtle rounded-3 shadow-sm"
                                    />
                                    <Target
                                        className="position-absolute text-muted"
                                        size={18}
                                        style={{ left: '15px', top: '50%', transform: 'translateY(-50%)' }}
                                    />
                                </div>
                            </Form.Group>
                            <Form.Group>
                                <Form.Label className="small fw-bold text-muted">Full Description</Form.Label>
                                <div className="position-relative">
                                    <Form.Control
                                        as="textarea"
                                        rows={4}
                                        placeholder="e.g. Engineering Knowledge: An ability to apply knowledge of mathematics, science, engineering fundamentals and an engineering specialization..."
                                        required
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        className="ps-5 py-2 border border-2 border-secondary-subtle rounded-3 shadow-sm"
                                    />
                                    <FileText className="position-absolute text-muted" size={18} style={{ left: '15px', top: '12px' }} />
                                </div>
                            </Form.Group>
                        </Modal.Body>
                        <Modal.Footer className="border-0 p-4 pt-0">
                            <Button variant="light" onClick={() => setShowModal(false)} className="px-4 border-0">Cancel</Button>
                            <Button style={{ backgroundColor: '#4c1d95', border: 'none' }} type="submit" className="px-5 shadow-sm border-0 py-2 fw-semibold" disabled={loading}>
                                {loading ? 'Processing...' : (isEditing ? 'Save Changes' : 'Confirm Entry')}
                            </Button>
                        </Modal.Footer>
                    </Form>
                </Modal>
            </Container>
        </motion.div>
    );
};

export default PLOs;
