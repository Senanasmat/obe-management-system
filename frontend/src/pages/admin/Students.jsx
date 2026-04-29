import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Container, Card, Form, Button, Table, Modal, Badge, Row, Col } from 'react-bootstrap';
import { toast, showError, showConfirm, showAlert } from '../../utils/notifications';
import { UserPlus, User, Hash, GraduationCap, Edit, Trash2, Search, Upload, Download, FileSpreadsheet, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const containerVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, staggerChildren: 0.05 } }
};

const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: { opacity: 1, x: 0 }
};

const Students = () => {
    const [students, setStudents] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentId, setCurrentId] = useState(null);
    const [formData, setFormData] = useState({ name: '', regNo: '', batch: '' });
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [batchFilter, setBatchFilter] = useState('');
    const [csvFile, setCsvFile] = useState(null);
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        fetchStudents();
    }, []);

    const fetchStudents = async () => {
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            const { data } = await axios.get('/api/admin/students', config);
            setStudents(data);
        } catch (error) {
            console.error("Error fetching students:", error);
        }
    };

    const handleOpenModal = (student = null) => {
        if (student) {
            setIsEditing(true);
            setCurrentId(student._id);
            setFormData({ name: student.name, regNo: student.regNo, batch: student.batch });
        } else {
            setIsEditing(false);
            setCurrentId(null);
            setFormData({ name: '', regNo: '', batch: '' });
        }
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            if (isEditing) {
                await axios.put(`/api/admin/students/${currentId}`, formData, config);
                toast.fire({ icon: 'success', title: 'Student updated successfully!' });
            } else {
                await axios.post('/api/admin/students', formData, config);
                toast.fire({ icon: 'success', title: 'Student registered successfully!' });
            }
            fetchStudents();
            setShowModal(false);
        } catch (error) {
            showError('Error', error.response?.data?.message || 'Error processing student data');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        const result = await showConfirm('Are you sure?', 'You want to delete this student?');
        if (result.isConfirmed) {
            try {
                const config = { headers: { Authorization: `Bearer ${user.token}` } };
                await axios.delete(`/api/admin/students/${id}`, config);
                toast.fire({ icon: 'success', title: 'Student deleted successfully!' });
                fetchStudents();
            } catch (error) {
                showError('Error', 'Error deleting student');
            }
        }
    };

    // --- Bulk Import ---
    const downloadTemplate = () => {
        const header = 'name,regNo,batch\n';
        const sampleRows = [
            'Ali Hassan,2021-CS-001,2021-2025',
            'Sara Khan,2021-CS-002,2021-2025',
            'Ahmed Raza,2022-CS-001,2022-2026'
        ].join('\n');
        const blob = new Blob([header + sampleRows], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Students List.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleImportSubmit = async () => {
        if (!csvFile) {
            showError('No file selected', 'Please select a CSV file first.');
            return;
        }
        setImporting(true);
        setImportResult(null);
        try {
            const formPayload = new FormData();
            formPayload.append('file', csvFile);
            const config = {
                headers: {
                    Authorization: `Bearer ${user.token}`,
                    'Content-Type': 'multipart/form-data'
                }
            };
            const { data } = await axios.post('/api/admin/students/bulk-import', formPayload, config);
            setImportResult(data);
            fetchStudents();
        } catch (error) {
            showError('Import Failed', error.response?.data?.message || 'Could not process the CSV file.');
        } finally {
            setImporting(false);
        }
    };

    const handleCloseImportModal = () => {
        setShowImportModal(false);
        setCsvFile(null);
        setImportResult(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const uniqueBatches = [...new Set(students.map(s => s.batch))].sort();

    const filteredStudents = students.filter(s => {
        const matchesSearch =
            s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.regNo.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesBatch = batchFilter ? s.batch === batchFilter : true;
        return matchesSearch && matchesBatch;
    });

    return (
        <motion.div initial="hidden" animate="visible" variants={containerVariants}>
            <Container fluid className="py-4 px-4">
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h2 className="mb-0 text-dark fw-bold display-6 fs-3">Student Management</h2>
                        <p className="text-muted small mb-0">Manage and track student registrations</p>
                    </div>
                    <div className="d-flex gap-2">
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                            <Button
                                variant="light"
                                onClick={() => { setImportResult(null); setCsvFile(null); setShowImportModal(true); }}
                                className="d-flex align-items-center gap-2 border px-4 py-2 fw-semibold text-muted"
                            >
                                <Upload size={17} /> Bulk Import
                            </Button>
                        </motion.div>
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                            <Button
                                variant="primary"
                                onClick={() => handleOpenModal()}
                                className="d-flex align-items-center gap-2 shadow-sm px-4 py-2 border-0"
                            >
                                <UserPlus size={18} /> Add New Student
                            </Button>
                        </motion.div>
                    </div>
                </div>

                <Card className="shadow-sm border-0 mb-4 overflow-hidden">
                    <Card.Body className="p-0">
                        <div className="p-3 border-bottom bg-light bg-opacity-50 d-flex align-items-center">
                            <div className="position-relative flex-grow-1" style={{ maxWidth: '400px' }}>
                                <Form.Control
                                    type="text"
                                    placeholder="Search students..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="ps-5 py-2 bg-white rounded-3"
                                    style={{
                                        border: '1px solid #e2e8f0',
                                        boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
                                        transition: 'all 0.2s ease'
                                    }}
                                    onFocus={(e) => {
                                        e.target.style.boxShadow = '0 0 0 2px rgba(13,110,253,0.15)';
                                        e.target.style.border = '1px solid #0d6efd';
                                    }}
                                    onBlur={(e) => {
                                        e.target.style.boxShadow = '0 2px 6px rgba(0,0,0,0.05)';
                                        e.target.style.border = '1px solid #e2e8f0';
                                    }}
                                />
                                <Search className="position-absolute text-muted" size={18} style={{ left: '15px', top: '50%', transform: 'translateY(-50%)' }} />
                            </div>
                            <Form.Select
                                value={batchFilter}
                                onChange={e => setBatchFilter(e.target.value)}
                                className="ms-3 py-2 fw-medium text-muted rounded-3"
                                style={{
                                    maxWidth: '200px',
                                    border: '1px solid #e2e8f0',
                                    boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
                                    transition: 'all 0.2s ease'
                                }}
                                onFocus={(e) => {
                                    e.target.style.boxShadow = '0 0 0 2px rgba(13,110,253,0.15)';
                                    e.target.style.border = '1px solid #0d6efd';
                                }}
                                onBlur={(e) => {
                                    e.target.style.boxShadow = '0 2px 6px rgba(0,0,0,0.05)';
                                    e.target.style.border = '1px solid #e2e8f0';
                                }}
                            >
                                <option value="">All Batches</option>
                                {uniqueBatches.map(batch => (
                                    <option key={batch} value={batch}>{batch}</option>
                                ))}
                            </Form.Select>
                            <span className="ms-3 me-2 text-muted small fw-semibold">{filteredStudents.length} student(s)</span>
                        </div>
                        <Table hover responsive striped={false} className="mb-0">
                            <thead className="bg-white border-bottom">
                                <tr>
                                    <th className="px-4 py-3 text-muted small text-uppercase">Student Info</th>
                                    <th className="px-4 py-3 text-muted small text-uppercase">Registration No</th>
                                    <th className="px-4 py-3 text-muted small text-uppercase">Batch</th>
                                    <th className="px-4 py-3 text-muted small text-uppercase text-end">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                <AnimatePresence mode="popLayout">
                                    {filteredStudents.map((student, idx) => (
                                        <motion.tr
                                            key={student._id}
                                            variants={itemVariants}
                                            layout
                                            initial="hidden"
                                            animate="visible"
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            transition={{ delay: idx * 0.03 }}
                                        >
                                            <td className="px-4 py-3 align-middle">
                                                <div className="d-flex align-items-center gap-3">
                                                    <div className="bg-primary-subtle text-primary rounded-circle p-2 d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}>
                                                        <User size={20} />
                                                    </div>
                                                    <span className="fw-semibold text-dark">{student.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 align-middle text-muted">{student.regNo}</td>
                                            <td className="px-4 py-3 align-middle">
                                                <span className="badge bg-light text-dark border px-3 py-2 fw-medium rounded-pill">
                                                    {student.batch}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 align-middle text-end">
                                                <div className="d-flex justify-content-end gap-2">
                                                    <motion.div whileHover={{ scale: 1.1 }}>
                                                        <Button variant="light" size="sm" onClick={() => handleOpenModal(student)} className="border-0 bg-primary-subtle text-primary p-2 rounded-lg">
                                                            <Edit size={16} />
                                                        </Button>
                                                    </motion.div>
                                                    <motion.div whileHover={{ scale: 1.1 }}>
                                                        <Button variant="light" size="sm" onClick={() => handleDelete(student._id)} className="border-0 bg-danger-subtle text-danger p-2 rounded-lg">
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
                        {filteredStudents.length === 0 && (
                            <div className="text-center py-5">
                                <p className="text-muted mb-0">No students found.</p>
                            </div>
                        )}
                    </Card.Body>
                </Card>

                {/* Add / Edit Modal */}
                <Modal show={showModal} onHide={() => setShowModal(false)} centered size="md">
                    <Modal.Header closeButton className="border-0 pb-0">
                        <Modal.Title className="fw-bold">{isEditing ? 'Edit Student Details' : 'Register New Student'}</Modal.Title>
                    </Modal.Header>
                    <Form onSubmit={handleSubmit}>
                        <Modal.Body className="p-4">
                            <Form.Group className="mb-3">
                                <Form.Label className="small fw-bold text-muted">Full Name</Form.Label>
                                <div className="position-relative">
                                    <Form.Control type="text" placeholder="e.g. Alice Johnson" required value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="ps-5 py-2 border-light bg-light bg-opacity-50 shadow-none" />
                                    <User className="position-absolute text-muted" size={18} style={{ left: '15px', top: '50%', transform: 'translateY(-50%)' }} />
                                </div>
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label className="small fw-bold text-muted">Registration Number</Form.Label>
                                <div className="position-relative">
                                    <Form.Control type="text" placeholder="e.g. 2021-CS-123" required value={formData.regNo}
                                        onChange={e => setFormData({ ...formData, regNo: e.target.value })}
                                        className="ps-5 py-2 border-light bg-light bg-opacity-50 shadow-none" />
                                    <Hash className="position-absolute text-muted" size={18} style={{ left: '15px', top: '50%', transform: 'translateY(-50%)' }} />
                                </div>
                            </Form.Group>
                            <Form.Group>
                                <Form.Label className="small fw-bold text-muted">Batch / Intake</Form.Label>
                                <div className="position-relative">
                                    <Form.Control type="text" placeholder="e.g. 2021-2025" required value={formData.batch}
                                        onChange={e => setFormData({ ...formData, batch: e.target.value })}
                                        className="ps-5 py-2 border-light bg-light bg-opacity-50 shadow-none" />
                                    <GraduationCap className="position-absolute text-muted" size={18} style={{ left: '15px', top: '50%', transform: 'translateY(-50%)' }} />
                                </div>
                            </Form.Group>
                        </Modal.Body>
                        <Modal.Footer className="border-0 p-4 pt-0">
                            <Button variant="light" onClick={() => setShowModal(false)} className="px-4 border-0">Cancel</Button>
                            <Button variant="primary" type="submit" className="px-5 shadow-sm border-0 py-2 fw-semibold" disabled={loading}>
                                {loading ? 'Processing...' : (isEditing ? 'Save Changes' : 'Confirm Registration')}
                            </Button>
                        </Modal.Footer>
                    </Form>
                </Modal>

                {/* Bulk Import Modal */}
                <Modal show={showImportModal} onHide={handleCloseImportModal} centered size="lg">
                    <Modal.Header closeButton className="border-0 pb-0">
                        <Modal.Title className="fw-bold d-flex align-items-center gap-2">
                            <FileSpreadsheet size={22} className="text-primary" /> Bulk Import Students
                        </Modal.Title>
                    </Modal.Header>
                    <Modal.Body className="p-4">
                        {!importResult ? (
                            <>
                                {/* Step 1: Download Template */}
                                <div className="bg-light rounded-4 p-4 mb-4">
                                    <div className="d-flex align-items-start gap-3">
                                        <div className="bg-primary-subtle text-primary rounded-3 p-2 mt-1">
                                            <Download size={20} />
                                        </div>
                                        <div className="flex-grow-1">
                                            <h6 className="fw-bold mb-1">Step 1 — Download the CSV Template</h6>
                                            <p className="text-muted small mb-3">
                                                Use this template to fill in your student data. Required columns: <code>name</code>, <code>regNo</code>, <code>batch</code>. One student per row.
                                            </p>
                                            <Button variant="outline-primary" size="sm" onClick={downloadTemplate} className="d-flex align-items-center gap-2">
                                                <Download size={15} /> Download Template (.csv)
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                {/* Step 2: Upload File */}
                                <div className="bg-light rounded-4 p-4">
                                    <div className="d-flex align-items-start gap-3">
                                        <div className="bg-success-subtle text-success rounded-3 p-2 mt-1">
                                            <Upload size={20} />
                                        </div>
                                        <div className="flex-grow-1">
                                            <h6 className="fw-bold mb-1">Step 2 — Upload Your Completed CSV</h6>
                                            <p className="text-muted small mb-3">
                                                Duplicate registration numbers will be skipped automatically. Existing records are never overwritten.
                                            </p>
                                            <Form.Control
                                                type="file"
                                                accept=".csv"
                                                ref={fileInputRef}
                                                onChange={e => setCsvFile(e.target.files[0])}
                                                className="border-0 bg-white shadow-none"
                                            />
                                            {csvFile && (
                                                <p className="text-success small mt-2 mb-0 d-flex align-items-center gap-1">
                                                    <CheckCircle size={14} /> {csvFile.name} selected
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            /* Import Results */
                            <div className="text-center py-3">
                                <div className={`bg-${importResult.inserted > 0 ? 'success' : 'warning'}-subtle rounded-circle d-inline-flex p-4 mb-3`}>
                                    <CheckCircle size={40} className={`text-${importResult.inserted > 0 ? 'success' : 'warning'}`} />
                                </div>
                                <h5 className="fw-bold mb-2">Import Complete!</h5>
                                <p className="text-muted mb-4">{importResult.message}</p>
                                <Row className="g-3 justify-content-center">
                                    <Col xs={5}>
                                        <div className="bg-success-subtle rounded-4 p-3">
                                            <div className="fw-bold fs-2 text-success">{importResult.inserted}</div>
                                            <div className="text-muted small">Students Added</div>
                                        </div>
                                    </Col>
                                    <Col xs={5}>
                                        <div className="bg-warning-subtle rounded-4 p-3">
                                            <div className="fw-bold fs-2 text-warning">{importResult.skipped}</div>
                                            <div className="text-muted small">Skipped (Duplicates)</div>
                                        </div>
                                    </Col>
                                </Row>
                            </div>
                        )}
                    </Modal.Body>
                    <Modal.Footer className="border-0 p-4 pt-0">
                        <Button variant="light" onClick={handleCloseImportModal} className="px-4 border-0">
                            {importResult ? 'Close' : 'Cancel'}
                        </Button>
                        {!importResult && (
                            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                                <Button variant="success" onClick={handleImportSubmit} disabled={importing || !csvFile} className="d-flex align-items-center gap-2 px-5 border-0 shadow-sm fw-semibold py-2">
                                    <Upload size={17} />
                                    {importing ? 'Importing...' : 'Start Import'}
                                </Button>
                            </motion.div>
                        )}
                    </Modal.Footer>
                </Modal>
            </Container>
        </motion.div>
    );
};

export default Students;
