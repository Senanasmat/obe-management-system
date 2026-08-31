import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { Container, Form, Row, Col, Button, Breadcrumb } from 'react-bootstrap';
import { Calendar, X, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const today = () => new Date().toISOString().slice(0, 10);

const formatDisplayDate = (iso) => {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    return `${d}-${m}-${y}`;
};

const emptyQuestion = (index) => ({
    questionName: `Q${index + 1}`,
    maxMarks: '',
    obeWeight: '0.00',
    complexity: '',
    clo: '',
    notForOBE: false,
    questionText: '',
});

const AssessmentCreation = () => {
    const { courseId, assessmentId } = useParams();
    const isEditMode = Boolean(assessmentId);
    const navigate = useNavigate();
    const { user } = useAuth();

    const [clos, setClos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);

    // Top-level fields
    const [method, setMethod] = useState('');
    const [name, setName] = useState('');
    const [date, setDate] = useState(today());
    const [gpaWeight, setGpaWeight] = useState('0.00');
    const [activityNature, setActivityNature] = useState('None');
    const [includeForGPA, setIncludeForGPA] = useState(true);

    // Sub-activities / questions
    const [questions, setQuestions] = useState([emptyQuestion(0)]);
    const [existingAssessments, setExistingAssessments] = useState([]);

    const totalMarks = questions.reduce((sum, q) => sum + (Number(q.maxMarks) || 0), 0);

    // Auto-sync GPA Weight with Total Marks
    useEffect(() => {
        setGpaWeight(totalMarks.toFixed(2));
    }, [totalMarks]);

    // Fetch CLOs for this course
    useEffect(() => {
        const config = { headers: { Authorization: `Bearer ${user.token}` } };
        api.get('/api/assignments/my', config)
            .then(({ data }) => {
                const found = data.find(a => a.course._id === courseId);
                if (found?.course?.clos) setClos(found.course.clos);
            })
            .catch(console.error);
    }, [courseId, user.token]);

    // Fetch existing assessments for auto numbering
    useEffect(() => {
        if (!courseId || !user?.token) return;

        const config = {
            headers: {
                Authorization: `Bearer ${user.token}`
            }
        };

        api
            .get(`/api/faculty/courses/${courseId}/assessments`, config)
            .then(({ data }) => {
                console.log('Assessments:', data);
                setExistingAssessments(data || []);
            })
            .catch(console.error);

    }, [courseId, user?.token]);

    // In edit mode — load existing assessment data
    useEffect(() => {
        if (!isEditMode) return;
        const config = { headers: { Authorization: `Bearer ${user.token}` } };
        api.get(`/api/faculty/assessments/${assessmentId}`, config)
            .then(({ data }) => {
                setMethod(data.type || '');
                setName(data.title || '');
                setDate(data.date ? new Date(data.date).toISOString().slice(0, 10) : today());
                setActivityNature(data.activityNature || 'None');
                setIncludeForGPA(data.includeForGPA !== undefined ? data.includeForGPA : true);
                if (data.questions?.length) {
                    setQuestions(data.questions.map(q => ({
                        questionName: q.questionName || '',
                        maxMarks: q.maxMarks ?? '',
                        obeWeight: q.obeWeight ?? '0.00',
                        complexity: q.complexity || '',
                        clo: q.clo || '',
                        notForOBE: q.notForOBE || false,
                        questionText: q.questionText || '',
                    })));
                }
            })
            .catch(console.error);
    }, [assessmentId, isEditMode, user.token]);

    const handleQuestionChange = (index, field, value) => {
        setQuestions(prev => prev.map((q, i) => {
            if (i !== index) return q;
            const updated = { ...q, [field]: value };
            // Auto-sync OBE Weight with Max Marks
            if (field === 'maxMarks') updated.obeWeight = value;
            return updated;
        }));
    };

    const addLine = () => setQuestions(prev => [...prev, emptyQuestion(prev.length)]);

    const generateAssessmentName = (type) => {
        if (!type) return '';

        const normalizedType = type.trim().toLowerCase();

        const sameTypeAssessments = existingAssessments.filter(a =>
            a.type &&
            a.type.trim().toLowerCase() === normalizedType
        );

        return `${type} ${sameTypeAssessments.length + 1}`;
    };

    const removeLine = (index) => {
        setQuestions(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!method) return alert('Please select an Activity/Assessment Method.');
        setLoading(true);
        const payload = {
            title: name,
            type: method,
            courseId,
            totalMarks,
            gpaWeight: parseFloat(gpaWeight) || 0,
            activityNature,
            includeForGPA,
            date,
            questions: questions.map(q => ({
                questionName: q.questionName,
                questionText: q.questionText,
                maxMarks: Number(q.maxMarks) || 0,
                obeWeight: parseFloat(q.obeWeight) || 0,
                complexity: q.complexity,
                clo: q.clo || undefined,
                notForOBE: q.notForOBE,
            }))
        };
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            if (isEditMode) {
                await api.put(`/api/faculty/assessments/${assessmentId}`, payload, config);
            } else {
                await api.post('/api/faculty/assessments', payload, config);
            }
            navigate(`/faculty/courses/${courseId}?tab=Activities`);
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to save assessment.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <Container fluid className="py-4 px-4 bg-white min-vh-100">

                {/* Page title + breadcrumb */}
                <h4 className="fw-normal text-dark mb-1">Course Section</h4>
                <Breadcrumb className="small mb-4" style={{ fontSize: '0.85rem' }}>
                    <Breadcrumb.Item linkAs={Link} linkProps={{ to: '/faculty' }} className="text-decoration-none text-muted">Home</Breadcrumb.Item>
                    <Breadcrumb.Item linkAs={Link} linkProps={{ to: '/faculty/courses' }} className="text-decoration-none text-muted">Course Sections</Breadcrumb.Item>
                    <Breadcrumb.Item linkAs={Link} linkProps={{ to: `/faculty/courses/${courseId}?tab=Activities` }} className="text-decoration-none text-muted">Activities</Breadcrumb.Item>
                    <Breadcrumb.Item active className="text-muted">{isEditMode ? 'Edit Activity' : 'Add Class Activity'}</Breadcrumb.Item>
                </Breadcrumb>

                <Form onSubmit={handleSubmit}>

                    {/* ── Top fields ── */}
                    <Row className="g-3 mb-3">
                        {/* Activity / Assessment Method */}
                        <Col md={4}>
                            <Form.Label className="small text-dark mb-1">Activity/Assesment Method</Form.Label>
                            <Form.Select
                                value={method}
                                onChange={(e) => {
                                    const selectedMethod = e.target.value;

                                    setMethod(selectedMethod);

                                    // Auto generate name only while creating
                                    if (!isEditMode) {
                                        setName(generateAssessmentName(selectedMethod));
                                    }
                                }}
                                style={{ borderColor: '#a0b4d6' }}
                            >
                                <option value="">- Select -</option>
                                <option value="Quiz">Quiz</option>
                                <option value="Assignment">Assignment</option>
                                <option value="Midterm">Midterm</option>
                                <option value="Final">Final</option>
                                <option value="Project">Project</option>
                            </Form.Select>
                        </Col>

                        {/* Name */}
                        <Col md={4}>
                            <Form.Label className="small text-dark mb-1">Name</Form.Label>
                            <Form.Control
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                style={{ borderColor: '#a0b4d6' }}
                            />
                        </Col>

                        {/* Date */}
                        <Col md={4}>
                            <Form.Label className="small text-dark mb-1">Date</Form.Label>
                            <div className="d-flex align-items-center border rounded-2 overflow-hidden" style={{ borderColor: '#a0b4d6' }}>
                                <button
                                    type="button"
                                    className="btn btn-light px-2 py-2 border-end rounded-0"
                                    onClick={() => setShowDatePicker(v => !v)}
                                    style={{ borderColor: '#a0b4d6' }}
                                >
                                    <Calendar size={16} className="text-secondary" />
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-light px-2 py-2 border-end rounded-0"
                                    onClick={() => setDate(today())}
                                    style={{ borderColor: '#a0b4d6' }}
                                >
                                    <X size={16} className="text-secondary" />
                                </button>
                                <input
                                    type="date"
                                    value={date}
                                    onChange={e => setDate(e.target.value)}
                                    className="form-control border-0 shadow-none rounded-0"
                                    style={{ minWidth: 0 }}
                                />
                            </div>
                        </Col>
                    </Row>

                    {/* Second row */}
                    <Row className="g-3 mb-3">
                        {/* Total Marks (read-only) */}
                        <Col md={4}>
                            <Form.Label className="small text-dark mb-1">Total Marks</Form.Label>
                            <Form.Control
                                type="text"
                                value={totalMarks.toFixed(2)}
                                readOnly
                                className="bg-light text-muted"
                                style={{ borderColor: '#dde' }}
                            />
                        </Col>

                        {/* GPA Weight — auto-synced with Total Marks */}
                        <Col md={4}>
                            <Form.Label className="small text-dark mb-1">
                                GPA Weight <span className="text-muted fw-normal" style={{ fontSize: '0.75rem' }}>(auto)</span>
                            </Form.Label>
                            <Form.Control
                                type="text"
                                value={gpaWeight}
                                readOnly
                                className="bg-light text-muted"
                                style={{ borderColor: '#dde' }}
                            />
                        </Col>

                        {/* Activity Nature */}
                        <Col md={4}>
                            <Form.Label className="small text-dark mb-1">Activity Nature</Form.Label>
                            <Form.Control
                                type="text"
                                value={activityNature}
                                onChange={e => setActivityNature(e.target.value)}
                                style={{ borderColor: '#a0b4d6' }}
                            />
                        </Col>
                    </Row>

                    {/* Include for GPA checkbox */}
                    <div className="d-flex align-items-center gap-2 mb-4">
                        <div
                            onClick={() => setIncludeForGPA(v => !v)}
                            className="d-flex align-items-center justify-content-center rounded-2 cursor-pointer"
                            style={{
                                width: 22, height: 22, backgroundColor: includeForGPA ? '#6d28d9' : '#fff',
                                border: `2px solid ${includeForGPA ? '#6d28d9' : '#aaa'}`,
                                cursor: 'pointer', flexShrink: 0
                            }}
                        >
                            {includeForGPA && (
                                <svg width="13" height="10" viewBox="0 0 13 10" fill="none">
                                    <path d="M1 5L5 9L12 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            )}
                        </div>
                        <span className="small text-dark fw-medium" style={{ cursor: 'pointer' }} onClick={() => setIncludeForGPA(v => !v)}>
                            Include for GPA Calculation
                        </span>
                    </div>

                    {/* ── Sub Activities / Questions ── */}
                    <div className="border rounded-3 p-3" style={{ borderColor: '#ccc' }}>
                        <h6 className="fw-semibold text-dark mb-3">Sub Activities/ Questions</h6>

                        <AnimatePresence>
                            {questions.map((q, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, y: -8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                                    transition={{ duration: 0.2 }}
                                    className="border rounded-3 mb-3 overflow-hidden"
                                    style={{ borderColor: '#ddd', backgroundColor: '#f9f9f9' }}
                                >
                                    {/* Line header */}
                                    <div className="d-flex justify-content-between align-items-center px-3 py-2" style={{ backgroundColor: '#f0f0f0', borderBottom: '1px solid #ddd' }}>
                                        <span className="fw-semibold text-dark" style={{ fontSize: '0.95rem' }}>
                                            Line # {index + 1}
                                        </span>
                                        <button
                                            type="button"
                                            className="btn btn-sm"
                                            style={{ border: '1.5px solid #dc3545', color: '#dc3545', borderRadius: '6px', padding: '2px 8px', lineHeight: 1 }}
                                            onClick={() => removeLine(index)}
                                            disabled={questions.length === 1}
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>

                                    <div className="p-3">
                                        {/* Row 1: Name | Max Marks | %OBE Weight | Complexity */}
                                        <Row className="g-3 mb-3">
                                            <Col md={3}>
                                                <Form.Label className="small text-dark mb-1">Name</Form.Label>
                                                <Form.Control
                                                    type="text"
                                                    placeholder={`Q${index + 1}`}
                                                    value={q.questionName}
                                                    onChange={e => handleQuestionChange(index, 'questionName', e.target.value)}
                                                    className="bg-white"
                                                    style={{ borderColor: '#ccc' }}
                                                />
                                            </Col>
                                            <Col md={3}>
                                                <Form.Label className="small text-dark mb-1">Max Marks</Form.Label>
                                                <Form.Control
                                                    type="number"
                                                    min="0"
                                                    step="0.5"
                                                    value={q.maxMarks}
                                                    onChange={e => handleQuestionChange(index, 'maxMarks', e.target.value)}
                                                    className="bg-white"
                                                    style={{ borderColor: '#ccc' }}
                                                />
                                            </Col>
                                            <Col md={3}>
                                                <Form.Label className="small text-dark mb-1">
                                                    %OBE Weight <span className="text-muted fw-normal" style={{ fontSize: '0.72rem' }}>(auto)</span>
                                                </Form.Label>
                                                <Form.Control
                                                    type="text"
                                                    value={q.obeWeight}
                                                    readOnly
                                                    className="bg-light text-muted"
                                                    style={{ borderColor: '#dde' }}
                                                />
                                            </Col>
                                            <Col md={3}>
                                                <Form.Label className="small text-dark mb-1">Complexity</Form.Label>
                                                <Form.Select
                                                    value={q.complexity}
                                                    onChange={e => handleQuestionChange(index, 'complexity', e.target.value)}
                                                    className="bg-white"
                                                    style={{ borderColor: '#ccc' }}
                                                >
                                                    <option value="">- Select -</option>
                                                    <option value="Low">Low</option>
                                                    <option value="Medium">Medium</option>
                                                    <option value="High">High</option>
                                                </Form.Select>
                                            </Col>
                                        </Row>

                                        {/* Row 2: CLOs | Not for OBE */}
                                        <Row className="g-3 mb-3 align-items-end">
                                            <Col md={8}>
                                                <Form.Label className="small text-dark mb-1">CLOs</Form.Label>
                                                <Form.Select
                                                    value={q.clo}
                                                    onChange={e => handleQuestionChange(index, 'clo', e.target.value)}
                                                    className="bg-white"
                                                    style={{ borderColor: '#ccc' }}
                                                >
                                                    <option value="">- Select CLO -</option>
                                                    {clos.map(clo => (
                                                        <option key={clo._id} value={clo._id}>
                                                            {clo.code} — {clo.description?.slice(0, 60)}
                                                        </option>
                                                    ))}
                                                </Form.Select>
                                            </Col>
                                            <Col md={4}>
                                                <div className="d-flex align-items-center gap-2 pb-1">
                                                    <div
                                                        onClick={() => handleQuestionChange(index, 'notForOBE', !q.notForOBE)}
                                                        className="d-flex align-items-center justify-content-center rounded-2"
                                                        style={{
                                                            width: 20, height: 20, flexShrink: 0, cursor: 'pointer',
                                                            backgroundColor: q.notForOBE ? '#6d28d9' : '#fff',
                                                            border: `2px solid ${q.notForOBE ? '#6d28d9' : '#aaa'}`
                                                        }}
                                                    >
                                                        {q.notForOBE && (
                                                            <svg width="11" height="9" viewBox="0 0 13 10" fill="none">
                                                                <path d="M1 5L5 9L12 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                            </svg>
                                                        )}
                                                    </div>
                                                    <span
                                                        className="small text-dark"
                                                        style={{ cursor: 'pointer' }}
                                                        onClick={() => handleQuestionChange(index, 'notForOBE', !q.notForOBE)}
                                                    >
                                                        Not for OBE
                                                    </span>
                                                </div>
                                            </Col>
                                        </Row>

                                        {/* Row 3: Question guideline textarea */}
                                        <Form.Group className="mb-3">
                                            <Form.Label className="small mb-1" style={{ color: '#6d28d9', fontWeight: 500 }}>
                                                Question<span className="text-muted fw-normal">(Guideline for Question)</span>
                                            </Form.Label>
                                            <Form.Control
                                                as="textarea"
                                                rows={3}
                                                value={q.questionText}
                                                onChange={e => handleQuestionChange(index, 'questionText', e.target.value)}
                                                className="bg-white"
                                                style={{ borderColor: '#ccc', resize: 'vertical' }}
                                            />
                                        </Form.Group>

                                        {/* Row 4: File upload */}
                                        <Form.Group>
                                            <Form.Control
                                                type="file"
                                                className="bg-white"
                                                style={{ borderColor: '#ccc' }}
                                            />
                                        </Form.Group>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>

                        {/* Add Line button */}
                        <Button
                            type="button"
                            variant="success"
                            size="sm"
                            className="d-flex align-items-center gap-1 mt-1"
                            onClick={addLine}
                        >
                            <Plus size={15} /> Add Line
                        </Button>
                    </div>

                    {/* ── Footer actions ── */}
                    <div className="d-flex justify-content-between align-items-center mt-4">
                        <Button
                            type="button"
                            variant="light"
                            className="px-4 border"
                            onClick={() => navigate(`/faculty/courses/${courseId}?tab=Activities`)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            size="sm"
                            className="px-5 py-2 border-0 fw-semibold"
                            style={{ backgroundColor: '#4c1d95' }}
                            disabled={loading}
                        >
                            {loading ? 'Saving...' : isEditMode ? 'Update Assessment' : 'Save Assessment'}
                        </Button>
                    </div>

                </Form>
            </Container>
        </motion.div>
    );
};

export default AssessmentCreation;
