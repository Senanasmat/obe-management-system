import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Container, Table, Button, Form, Alert } from 'react-bootstrap';

const MarksEntry = () => {
    const { courseId, assessmentId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [students, setStudents] = useState([]);
    const [assessment, setAssessment] = useState(null);
    const [marks, setMarks] = useState({});

    useEffect(() => {
        const fetchData = async () => {
            try {
                const config = { headers: { Authorization: `Bearer ${user.token}` } };

                const assessRes = await axios.get(`/api/faculty/courses/${courseId}/assessments`, config);
                const currentAssessment = assessRes.data.find(a => a._id === assessmentId);
                setAssessment(currentAssessment);

                const courseRes = await axios.get('/api/faculty/courses', config);
                const course = courseRes.data.find(c => c._id === courseId);
                if (course) {
                    setStudents(course.students);
                }
            } catch (error) {
                console.error(error);
            }
        };
        fetchData();
    }, [courseId, assessmentId, user.token]);

    const handleMarkChange = (studentId, qIndex, value) => {
        setMarks(prev => ({
            ...prev,
            [studentId]: {
                ...prev[studentId],
                [qIndex]: Number(value)
            }
        }));
    };

    const handleSave = async (studentId) => {
        const studentMarks = marks[studentId];
        if (!studentMarks) return;

        const obtainedMarks = Object.keys(studentMarks).map(qIndex => ({
            questionIndex: Number(qIndex),
            marks: studentMarks[qIndex]
        }));

        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            await axios.post('/api/faculty/marks', {
                studentId,
                assessmentId,
                obtainedMarks
            }, config);
            alert('Marks saved successfully!'); // Keeping alert for grid entry as specialized UI for individual row satisfaction is complex
        } catch (error) {
            console.error(error);
            alert('Error saving marks');
        }
    };

    if (!assessment) return <Container className="p-4">Loading Assessment...</Container>;

    return (
        <Container fluid>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="mb-0">Enter Marks: {assessment.title}</h2>
                <Button variant="outline-secondary" onClick={() => navigate(`/faculty/courses/${courseId}`)}>
                    Back to Course
                </Button>
            </div>

            <div className="bg-white shadow-sm rounded border overflow-hidden">
                <Table responsive hover className="mb-0 align-middle">
                    <thead className="bg-light">
                        <tr>
                            <th>Student</th>
                            {assessment.questions.map((q, idx) => (
                                <th key={idx}>Q{idx + 1} ({q.maxMarks})</th>
                            ))}
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {students.map(student => (
                            <tr key={student._id}>
                                <td>
                                    <div className="fw-bold">{student.name}</div>
                                    <small className="text-muted">{student.regNo}</small>
                                </td>
                                {assessment.questions.map((q, idx) => (
                                    <td key={idx}>
                                        <Form.Control
                                            type="number"
                                            size="sm"
                                            style={{ width: '80px' }}
                                            max={q.maxMarks}
                                            onChange={(e) => handleMarkChange(student._id, idx, e.target.value)}
                                        />
                                    </td>
                                ))}
                                <td>
                                    <Button size="sm" variant="primary" onClick={() => handleSave(student._id)}>
                                        Save
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            </div>
        </Container>
    );
};

export default MarksEntry;
