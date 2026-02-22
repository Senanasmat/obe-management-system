import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Container, Table, Button, Form, Card, Badge } from 'react-bootstrap';
import { ArrowLeft, Save, CheckCircle2, User } from 'lucide-react';
import { toast, showError } from '../../utils/notifications';
import { motion } from 'framer-motion';

const containerVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
};

const MarksEntry = () => {
    const { courseId, assessmentId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [students, setStudents] = useState([]);
    const [assessment, setAssessment] = useState(null);
    const [marks, setMarks] = useState({});
    const [savedRows, setSavedRows] = useState({});

    useEffect(() => {
        const fetchData = async () => {
            try {
                const config = { headers: { Authorization: `Bearer ${user.token}` } };
                const assessRes = await axios.get(`/api/faculty/courses/${courseId}/assessments`, config);
                const current = assessRes.data.find(a => a._id === assessmentId);
                setAssessment(current);

                const courseRes = await axios.get('/api/faculty/courses', config);
                const course = courseRes.data.find(c => c._id === courseId);
                if (course) setStudents(course.students);
            } catch (error) {
                console.error(error);
            }
        };
        fetchData();
    }, [courseId, assessmentId, user.token]);

    const handleMarkChange = (studentId, qIndex, value) => {
        setMarks(prev => ({
            ...prev,
            [studentId]: { ...prev[studentId], [qIndex]: Number(value) }
        }));
    };

    const handleSave = async (studentId) => {
        const studentMarks = marks[studentId];
        if (!studentMarks) {
            showError('No Marks Entered', 'Please enter marks for at least one question before saving.');
            return;
        }
        const obtainedMarks = Object.keys(studentMarks).map(qIndex => ({
            questionIndex: Number(qIndex),
            marks: studentMarks[qIndex]
        }));

        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            await axios.post('/api/faculty/marks', { studentId, assessmentId, obtainedMarks }, config);
            toast.fire({ icon: 'success', title: 'Marks saved!' });
            setSavedRows(prev => ({ ...prev, [studentId]: true }));
        } catch (error) {
            showError('Error', error.response?.data?.message || 'Could not save marks');
        }
    };

    if (!assessment) return (
        <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
            <div className="text-center">
                <div className="spinner-border text-primary" role="status"></div>
                <p className="text-muted mt-3">Loading Assessment...</p>
            </div>
        </Container>
    );

    return (
        <motion.div initial="hidden" animate="visible" variants={containerVariants}>
            <Container fluid className="py-4 px-4">
                {/* Header */}
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <div className="d-flex align-items-center gap-2 mb-1">
                            <Badge bg="primary-subtle" text="primary" className="rounded-pill px-3 py-2 fw-medium">
                                {assessment.type}
                            </Badge>
                            <span className="text-muted small">{assessment.totalMarks} Total Marks</span>
                        </div>
                        <h2 className="mb-0 text-dark fw-bold display-6 fs-3">{assessment.title}</h2>
                        <p className="text-muted small mb-0">Marks Entry — {students.length} student(s) enrolled</p>
                    </div>
                    <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                        <Button
                            variant="light"
                            onClick={() => navigate(`/faculty/courses/${courseId}`)}
                            className="d-flex align-items-center gap-2 border-0 bg-light fw-semibold px-4"
                        >
                            <ArrowLeft size={16} /> Back to Course
                        </Button>
                    </motion.div>
                </div>

                {/* Question Legend */}
                <Card className="border-0 shadow-sm rounded-4 mb-4">
                    <Card.Body className="p-4">
                        <p className="fw-bold text-muted small text-uppercase mb-3">Question Summary</p>
                        <div className="d-flex flex-wrap gap-2">
                            {assessment.questions.map((q, i) => (
                                <div key={i} className="bg-light rounded-3 px-3 py-2 text-center">
                                    <div className="fw-bold text-dark small">Q{i + 1}</div>
                                    <div className="text-muted smaller">{q.maxMarks} pts</div>
                                </div>
                            ))}
                        </div>
                    </Card.Body>
                </Card>

                {/* Marks Table */}
                <Card className="shadow-sm border-0 rounded-4 overflow-hidden">
                    <Table hover responsive className="mb-0 align-middle">
                        <thead className="bg-white border-bottom">
                            <tr>
                                <th className="px-4 py-3 text-muted small text-uppercase">Student</th>
                                {assessment.questions.map((q, idx) => (
                                    <th key={idx} className="px-3 py-3 text-muted small text-uppercase text-center" style={{ minWidth: '90px' }}>
                                        Q{idx + 1} <span className="fw-normal opacity-75">/{q.maxMarks}</span>
                                    </th>
                                ))}
                                <th className="px-4 py-3 text-muted small text-uppercase text-end">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {students.map((student) => (
                                <motion.tr
                                    key={student._id}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className={savedRows[student._id] ? 'table-success bg-opacity-50' : ''}
                                >
                                    <td className="px-4 py-3">
                                        <div className="d-flex align-items-center gap-3">
                                            <div className="bg-primary-subtle text-primary rounded-circle d-flex align-items-center justify-content-center" style={{ width: '38px', height: '38px' }}>
                                                {savedRows[student._id] ? <CheckCircle2 size={18} className="text-success" /> : <User size={18} />}
                                            </div>
                                            <div>
                                                <div className="fw-semibold text-dark small">{student.name}</div>
                                                <div className="text-muted smaller">{student.regNo}</div>
                                            </div>
                                        </div>
                                    </td>
                                    {assessment.questions.map((q, idx) => (
                                        <td key={idx} className="px-3 py-3 text-center">
                                            <Form.Control
                                                type="number"
                                                size="sm"
                                                min={0}
                                                max={q.maxMarks}
                                                onChange={e => handleMarkChange(student._id, idx, e.target.value)}
                                                className="text-center border-light shadow-none bg-light fw-semibold mx-auto"
                                                style={{ width: '80px' }}
                                            />
                                        </td>
                                    ))}
                                    <td className="px-4 py-3 text-end">
                                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                            <Button
                                                size="sm"
                                                variant={savedRows[student._id] ? 'success' : 'primary'}
                                                onClick={() => handleSave(student._id)}
                                                className="d-flex align-items-center gap-1 border-0 ms-auto px-3 py-2"
                                            >
                                                {savedRows[student._id] ? <><CheckCircle2 size={14} /> Saved</> : <><Save size={14} /> Save</>}
                                            </Button>
                                        </motion.div>
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </Table>
                    {students.length === 0 && (
                        <div className="text-center py-5">
                            <p className="text-muted">No students are enrolled in this course yet.</p>
                        </div>
                    )}
                </Card>
            </Container>
        </motion.div>
    );
};

export default MarksEntry;
