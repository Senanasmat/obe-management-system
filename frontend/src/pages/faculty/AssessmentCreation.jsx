import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Plus, Trash2, FileText, Hash, Link2, Save } from 'lucide-react';
import { Container, Card, Form, Button, Row, Col } from 'react-bootstrap';
import { toast, showError } from '../../utils/notifications';
import { motion, AnimatePresence } from 'framer-motion';

const containerVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
};

const AssessmentCreation = () => {
    const { courseId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [clos, setClos] = useState([]);
    const [loading, setLoading] = useState(false);

    const [title, setTitle] = useState('');
    const [type, setType] = useState('Quiz');
    const [totalMarks, setTotalMarks] = useState(0);
    const [questions, setQuestions] = useState([
        { questionText: 'Q1', maxMarks: 0, clo: '' }
    ]);

    useEffect(() => {
        const fetchCourse = async () => {
            try {
                const config = { headers: { Authorization: `Bearer ${user.token}` } };
                const { data } = await axios.get('/api/faculty/courses', config);
                const course = data.find(c => c._id === courseId);
                if (course) setClos(course.clos);
            } catch (error) {
                console.error(error);
            }
        };
        fetchCourse();
    }, [courseId, user.token]);

    const handleQuestionChange = (index, field, value) => {
        const newQuestions = [...questions];
        newQuestions[index][field] = value;
        setQuestions(newQuestions);
        if (field === 'maxMarks') {
            setTotalMarks(newQuestions.reduce((sum, q) => sum + Number(q.maxMarks), 0));
        }
    };

    const addQuestion = () => {
        setQuestions([...questions, { questionText: `Q${questions.length + 1}`, maxMarks: 0, clo: '' }]);
    };

    const removeQuestion = (index) => {
        const newQuestions = questions.filter((_, i) => i !== index);
        setQuestions(newQuestions);
        setTotalMarks(newQuestions.reduce((sum, q) => sum + Number(q.maxMarks), 0));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = { title, type, courseId, totalMarks, questions: questions.map(q => ({ ...q, maxMarks: Number(q.maxMarks) })) };
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            await axios.post('/api/faculty/assessments', payload, config);
            toast.fire({ icon: 'success', title: 'Assessment created!', text: 'Redirecting to course view...' });
            setTimeout(() => navigate(`/faculty/courses/${courseId}`), 1500);
        } catch (error) {
            showError('Error', error.response?.data?.message || 'Failed to create assessment');
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div initial="hidden" animate="visible" variants={containerVariants}>
            <Container fluid className="py-4 px-4">
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h2 className="mb-0 text-dark fw-bold display-6 fs-3">Create Assessment</h2>
                        <p className="text-muted small mb-0">Define questions and map them to CLOs for OBE tracking</p>
                    </div>
                    <div className="bg-primary-subtle text-primary rounded-3 p-2">
                        <FileText size={28} />
                    </div>
                </div>

                <Form onSubmit={handleSubmit}>
                    {/* Basic Info Card */}
                    <Card className="shadow-sm border-0 rounded-4 mb-4">
                        <Card.Body className="p-4">
                            <h6 className="fw-bold text-muted text-uppercase small mb-4">Assessment Details</h6>
                            <Row className="g-4">
                                <Col md={5}>
                                    <Form.Group>
                                        <Form.Label className="small fw-bold text-muted">Title</Form.Label>
                                        <div className="position-relative">
                                            <Form.Control
                                                type="text"
                                                placeholder="e.g. Quiz 1 - Chapter 3"
                                                value={title}
                                                onChange={e => setTitle(e.target.value)}
                                                required
                                                className="ps-5 py-2 border-light bg-light bg-opacity-50 shadow-none"
                                            />
                                            <FileText className="position-absolute text-muted" size={18} style={{ left: '15px', top: '50%', transform: 'translateY(-50%)' }} />
                                        </div>
                                    </Form.Group>
                                </Col>
                                <Col md={4}>
                                    <Form.Group>
                                        <Form.Label className="small fw-bold text-muted">Type</Form.Label>
                                        <div className="position-relative">
                                            <Form.Select
                                                value={type}
                                                onChange={e => setType(e.target.value)}
                                                className="ps-5 py-2 border-light bg-light bg-opacity-50 shadow-none"
                                            >
                                                <option>Quiz</option>
                                                <option>Assignment</option>
                                                <option>Midterm</option>
                                                <option>Final</option>
                                                <option>Project</option>
                                            </Form.Select>
                                            <Hash className="position-absolute text-muted" size={18} style={{ left: '15px', top: '50%', transform: 'translateY(-50%)' }} />
                                        </div>
                                    </Form.Group>
                                </Col>
                                <Col md={3}>
                                    <Form.Group>
                                        <Form.Label className="small fw-bold text-muted">Total Marks</Form.Label>
                                        <Form.Control
                                            type="number"
                                            value={totalMarks}
                                            readOnly
                                            className="py-2 bg-light text-muted border-light fw-bold shadow-none text-center"
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>
                        </Card.Body>
                    </Card>

                    {/* Questions Card */}
                    <Card className="shadow-sm border-0 rounded-4">
                        <Card.Body className="p-4">
                            <div className="d-flex justify-content-between align-items-center mb-4">
                                <div>
                                    <h6 className="fw-bold text-muted text-uppercase small mb-0">Questions & CLO Mapping</h6>
                                    <p className="text-muted smaller mb-0">{questions.length} question(s) defined</p>
                                </div>
                                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                    <Button variant="outline-primary" onClick={addQuestion} className="d-flex align-items-center gap-2 border-0 bg-primary-subtle text-primary fw-semibold small px-3 py-2 rounded-3">
                                        <Plus size={16} /> Add Question
                                    </Button>
                                </motion.div>
                            </div>

                            <div className="d-flex flex-column gap-3">
                                <AnimatePresence>
                                    {questions.map((q, index) => (
                                        <motion.div
                                            key={index}
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, height: 0 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            <Row className="align-items-center g-3 bg-light rounded-4 p-3 mx-0">
                                                <Col xs="auto">
                                                    <div className="bg-white border rounded-3 px-3 py-2 fw-bold text-muted small" style={{ minWidth: '40px', textAlign: 'center' }}>
                                                        {index + 1}
                                                    </div>
                                                </Col>
                                                <Col>
                                                    <Form.Control
                                                        type="text"
                                                        placeholder="Question text (e.g. Q1, Part A)"
                                                        value={q.questionText}
                                                        onChange={e => handleQuestionChange(index, 'questionText', e.target.value)}
                                                        className="border-0 bg-white shadow-none py-2"
                                                    />
                                                </Col>
                                                <Col md={2}>
                                                    <Form.Control
                                                        type="number"
                                                        placeholder="Marks"
                                                        value={q.maxMarks}
                                                        min={0}
                                                        onChange={e => handleQuestionChange(index, 'maxMarks', e.target.value)}
                                                        required
                                                        className="border-0 bg-white shadow-none py-2 text-center fw-bold"
                                                    />
                                                </Col>
                                                <Col md={3}>
                                                    <div className="position-relative">
                                                        <Form.Select
                                                            value={q.clo}
                                                            onChange={e => handleQuestionChange(index, 'clo', e.target.value)}
                                                            required
                                                            className="ps-5 border-0 bg-white shadow-none py-2"
                                                        >
                                                            <option value="">Map to CLO...</option>
                                                            {clos.map(clo => (
                                                                <option key={clo._id} value={clo._id}>{clo.code}</option>
                                                            ))}
                                                        </Form.Select>
                                                        <Link2 className="position-absolute text-muted" size={16} style={{ left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                                                    </div>
                                                </Col>
                                                <Col xs="auto">
                                                    <motion.div whileHover={{ scale: 1.1 }}>
                                                        <Button
                                                            variant="light"
                                                            size="sm"
                                                            onClick={() => removeQuestion(index)}
                                                            className="border-0 bg-danger-subtle text-danger p-2 rounded-3"
                                                            disabled={questions.length === 1}
                                                        >
                                                            <Trash2 size={16} />
                                                        </Button>
                                                    </motion.div>
                                                </Col>
                                            </Row>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        </Card.Body>
                        <Card.Footer className="bg-white border-0 p-4 pt-0 d-flex justify-content-between align-items-center">
                            <Button variant="light" onClick={() => navigate(`/faculty/courses/${courseId}`)} className="px-4 border-0">
                                Cancel
                            </Button>
                            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                                <Button type="submit" variant="primary" className="d-flex align-items-center gap-2 px-5 shadow-sm border-0 py-2 fw-semibold" disabled={loading}>
                                    <Save size={18} />
                                    {loading ? 'Saving...' : 'Save Assessment'}
                                </Button>
                            </motion.div>
                        </Card.Footer>
                    </Card>
                </Form>
            </Container>
        </motion.div>
    );
};

export default AssessmentCreation;
