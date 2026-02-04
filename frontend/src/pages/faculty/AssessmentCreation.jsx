import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Plus, Trash } from 'lucide-react';
import { Container, Card, Form, Button, Row, Col, InputGroup, Alert } from 'react-bootstrap';

const AssessmentCreation = () => {
    const { courseId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [clos, setClos] = useState([]);

    // Form States
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
            const total = newQuestions.reduce((sum, q) => sum + Number(q.maxMarks), 0);
            setTotalMarks(total);
        }
    };

    const addQuestion = () => {
        setQuestions([...questions, { questionText: `Q${questions.length + 1}`, maxMarks: 0, clo: '' }]);
    };

    const removeQuestion = (index) => {
        const newQuestions = questions.filter((_, i) => i !== index);
        setQuestions(newQuestions);
        const total = newQuestions.reduce((sum, q) => sum + Number(q.maxMarks), 0);
        setTotalMarks(total);
    };

    const [success, setSuccess] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSuccess('');
        try {
            const payload = {
                title,
                type,
                courseId,
                totalMarks,
                questions: questions.map(q => ({
                    questionText: q.questionText,
                    maxMarks: Number(q.maxMarks),
                    clo: q.clo
                }))
            };

            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            await axios.post('/api/faculty/assessments', payload, config);
            setSuccess('Assessment created successfully! Redirecting...');
            setTimeout(() => {
                navigate(`/faculty/courses/${courseId}`);
            }, 1500);
        } catch (error) {
            alert('Error creating assessment');
            console.error(error);
        }
    };

    return (
        <Container fluid>
            <h2 className="mb-4">Create Assessment</h2>
            {success && <Alert variant="success">{success}</Alert>}

            <Form onSubmit={handleSubmit}>
                <Card className="shadow-sm mb-4">
                    <Card.Body>
                        <Row className="g-3">
                            <Col md={4}>
                                <Form.Group>
                                    <Form.Label>Title</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        required
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={4}>
                                <Form.Group>
                                    <Form.Label>Type</Form.Label>
                                    <Form.Select
                                        value={type}
                                        onChange={(e) => setType(e.target.value)}
                                    >
                                        <option>Quiz</option>
                                        <option>Assignment</option>
                                        <option>Midterm</option>
                                        <option>Final</option>
                                        <option>Project</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={4}>
                                <Form.Group>
                                    <Form.Label>Total Marks</Form.Label>
                                    <Form.Control
                                        type="number"
                                        value={totalMarks}
                                        readOnly
                                        className="bg-light"
                                    />
                                </Form.Group>
                            </Col>
                        </Row>
                    </Card.Body>
                </Card>

                <Card className="shadow-sm border-0">
                    <Card.Header className="bg-white d-flex justify-content-between align-items-center">
                        <h5 className="mb-0">Questions & CLO Mapping</h5>
                        <Button variant="link" onClick={addQuestion} className="text-decoration-none p-0 d-flex align-items-center">
                            <Plus size={16} className="me-1" /> Add Question
                        </Button>
                    </Card.Header>
                    <Card.Body>
                        <div className="d-flex flex-column gap-3">
                            {questions.map((q, index) => (
                                <Row key={index} className="align-items-center g-2 bg-light p-3 rounded border">
                                    <Col xs="auto" className="fw-bold text-muted" style={{ width: '30px' }}>{index + 1}.</Col>
                                    <Col>
                                        <Form.Control
                                            type="text"
                                            placeholder="Question Text"
                                            value={q.questionText}
                                            onChange={(e) => handleQuestionChange(index, 'questionText', e.target.value)}
                                        />
                                    </Col>
                                    <Col md={2}>
                                        <Form.Control
                                            type="number"
                                            placeholder="Marks"
                                            value={q.maxMarks}
                                            onChange={(e) => handleQuestionChange(index, 'maxMarks', e.target.value)}
                                            required
                                        />
                                    </Col>
                                    <Col md={3}>
                                        <Form.Select
                                            value={q.clo}
                                            onChange={(e) => handleQuestionChange(index, 'clo', e.target.value)}
                                            required
                                        >
                                            <option value="">Select CLO</option>
                                            {clos.map(clo => (
                                                <option key={clo._id} value={clo._id}>{clo.code}</option>
                                            ))}
                                        </Form.Select>
                                    </Col>
                                    <Col xs="auto">
                                        <Button variant="outline-danger" size="sm" onClick={() => removeQuestion(index)}>
                                            <Trash size={16} />
                                        </Button>
                                    </Col>
                                </Row>
                            ))}
                        </div>
                    </Card.Body>
                    <Card.Footer className="bg-white text-end">
                        <Button type="submit" variant="primary">Save Assessment</Button>
                    </Card.Footer>
                </Card>
            </Form>
        </Container>
    );
};

export default AssessmentCreation;
