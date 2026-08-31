import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { Container, Table, Button, Form, Breadcrumb } from 'react-bootstrap';
import { ArrowLeft, Save, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

const MarksEntry = () => {
    const { courseId, assessmentId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [students, setStudents] = useState([]);
    const [assessment, setAssessment] = useState(null);
    const [marks, setMarks] = useState({});   // { studentId: { qIdx: value } }
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [savedAt, setSavedAt] = useState(null);

    useEffect(() => {
        const load = async () => {
            try {
                const config = { headers: { Authorization: `Bearer ${user.token}` } };
                const [assessRes, assignRes, resultsRes] = await Promise.all([
                    api.get(`/api/faculty/assessments/${assessmentId}`, config),
                    api.get('/api/assignments/my', config),
                    api.get(`/api/faculty/assessments/${assessmentId}/results`, config),
                ]);

                const current = assessRes.data;
                setAssessment(current);

                const assignment = assignRes.data.find(a => a.course._id === courseId);
                const enrolledStudents = assignment?.course?.students || [];
                setStudents(enrolledStudents);

                // Initialise all marks to 0, then fill from saved results
                const init = {};
                enrolledStudents.forEach(s => {
                    init[s._id] = {};
                    current.questions.forEach((_, idx) => { init[s._id][idx] = ''; });
                });
                resultsRes.data.forEach(result => {
                    const sId = result.student?._id || result.student;
                    if (init[sId]) {
                        result.obtainedMarks.forEach(om => {
                            init[sId][om.questionIndex] = om.marks;
                        });
                    }
                });
                setMarks(init);
                if (resultsRes.data.length > 0) setSavedAt('Previously saved');
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [courseId, assessmentId, user.token]);

    const handleMarkChange = (studentId, qIndex, value) => {
        setSavedAt(null);
        setMarks(prev => ({
            ...prev,
            [studentId]: { ...prev[studentId], [qIndex]: value }
        }));
    };

    const handleSaveAll = async () => {
        setSaving(true);
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            await Promise.all(
                students.map(student => {
                    const studentMarks = marks[student._id] || {};
                    const obtainedMarks = Object.entries(studentMarks)
                        .map(([qIndex, m]) => ({
                            questionIndex: Number(qIndex),
                            marks: Number(m) || 0,
                        }));
                    return api.post('/api/faculty/marks', {
                        studentId: student._id,
                        assessmentId,
                        obtainedMarks,
                    }, config);
                })
            );
            setSavedAt(new Date().toLocaleTimeString());
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to save marks');
        } finally {
            setSaving(false);
        }
    };

    const totalFor = (studentId) =>
        Object.values(marks[studentId] || {}).reduce((s, v) => s + (Number(v) || 0), 0);

    if (loading) return (
        <div className="p-5 text-center text-muted">Loading marks entry...</div>
    );

    if (!assessment) return (
        <div className="p-5 text-center text-danger">Assessment not found.</div>
    );

    return (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
            className="bg-white min-vh-100">
            <Container fluid className="px-4 py-3">

                {/* Breadcrumb */}
                <h4 className="fw-normal text-dark mb-1">Marks Entry</h4>
                <Breadcrumb className="small mb-4" style={{ fontSize: '0.85rem' }}>
                    <Breadcrumb.Item linkAs={Link} linkProps={{ to: '/faculty' }} className="text-muted text-decoration-none">Home</Breadcrumb.Item>
                    <Breadcrumb.Item linkAs={Link} linkProps={{ to: '/faculty/courses' }} className="text-muted text-decoration-none">Course Sections</Breadcrumb.Item>
                    <Breadcrumb.Item linkAs={Link} linkProps={{ to: `/faculty/courses/${courseId}?tab=Activities` }} className="text-muted text-decoration-none">Activities</Breadcrumb.Item>
                    <Breadcrumb.Item active className="text-muted">{assessment.title}</Breadcrumb.Item>
                </Breadcrumb>

                {/* Header bar */}
                <div className="d-flex align-items-center justify-content-between mb-4">
                    <div>
                        <h5 className="fw-bold mb-0" style={{ color: '#4c1d95' }}>{assessment.title}</h5>
                        <p className="text-muted small mb-0">
                            {assessment.type} &nbsp;·&nbsp; Total Marks: <strong>{assessment.totalMarks}</strong>
                            &nbsp;·&nbsp; {students.length} student(s) enrolled
                        </p>
                    </div>
                    <div className="d-flex align-items-center gap-3">
                        {savedAt && (
                            <span className="d-flex align-items-center gap-1 text-success small fw-medium">
                                <CheckCircle2 size={15} /> {savedAt}
                            </span>
                        )}
                        <Button
                            size="sm"
                            className="px-4 py-2 border-0 fw-semibold d-flex align-items-center gap-2"
                            style={{ backgroundColor: '#4c1d95' }}
                            onClick={handleSaveAll}
                            disabled={saving}
                        >
                            <Save size={15} />
                            {saving ? 'Saving...' : 'Save All Marks'}
                        </Button>
                        <Button
                            variant="light"
                            size="sm"
                            className="px-3 border d-flex align-items-center gap-1"
                            onClick={() => navigate(`/faculty/courses/${courseId}?tab=Activities`)}
                        >
                            <ArrowLeft size={15} /> Back
                        </Button>
                    </div>
                </div>

                {/* Question summary strip */}
                <div className="d-flex flex-wrap gap-2 mb-4">
                    {assessment.questions.map((q, i) => (
                        <div key={i} className="px-3 py-2 rounded-2 text-center"
                            style={{ backgroundColor: '#f5f3ff', border: '1px solid #e0d8f0', minWidth: 64 }}>
                            <div className="fw-semibold small" style={{ color: '#6d28d9' }}>
                                {q.questionName || `Q${i + 1}`}
                            </div>
                            <div className="text-muted" style={{ fontSize: '0.75rem' }}>{q.maxMarks} pts</div>
                        </div>
                    ))}
                </div>

                {students.length === 0 ? (
                    <div className="text-center py-5 border rounded-3">
                        <p className="text-muted mb-0">No students enrolled in this course yet.</p>
                    </div>
                ) : (
                    <div className="border rounded-3 overflow-hidden">
                        <Table responsive className="mb-0 align-middle" style={{ fontSize: '0.85rem' }}>
                            <thead style={{ backgroundColor: '#f8f7ff' }}>
                                <tr>
                                    <th className="px-3 py-2 text-muted fw-semibold" style={{ width: 40 }}>#</th>
                                    <th className="px-3 py-2 fw-semibold" style={{ color: '#6d28d9', minWidth: 160 }}>Student</th>
                                    <th className="px-3 py-2 text-muted fw-semibold" style={{ minWidth: 100 }}>Reg No</th>
                                    {assessment.questions.map((q, i) => (
                                        <th key={i} className="px-3 py-2 text-muted fw-semibold text-center" style={{ minWidth: 90 }}>
                                            {q.questionName || `Q${i + 1}`}<br />
                                            <span className="fw-normal" style={{ fontSize: '0.72rem' }}>/ {q.maxMarks}</span>
                                        </th>
                                    ))}
                                    <th className="px-3 py-2 text-muted fw-semibold text-center" style={{ minWidth: 80 }}>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {students.map((student, idx) => (
                                    <tr key={student._id}>
                                        <td className="px-3 py-2 text-muted">{idx + 1}</td>
                                        <td className="px-3 py-2 fw-medium text-dark">{student.name}</td>
                                        <td className="px-3 py-2 text-muted">{student.regNo}</td>
                                        {assessment.questions.map((q, qIdx) => (
                                            <td key={qIdx} className="px-3 py-2 text-center">
                                                <Form.Control
                                                    type="number"
                                                    size="sm"
                                                    min={0}
                                                    max={q.maxMarks}
                                                    value={marks[student._id]?.[qIdx] ?? ''}
                                                    onChange={e => handleMarkChange(student._id, qIdx, e.target.value)}
                                                    className="text-center shadow-none mx-auto"
                                                    style={{ width: 72, borderColor: '#ccc' }}
                                                />
                                            </td>
                                        ))}
                                        <td className="px-3 py-2 text-center">
                                            <span className="fw-bold rounded-2 px-2 py-1"
                                                style={{ backgroundColor: '#f5f3ff', color: '#6d28d9', fontSize: '0.85rem' }}>
                                                {totalFor(student._id)}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </div>
                )}

                {/* Bottom save button */}
                {students.length > 0 && (
                    <div className="d-flex justify-content-end mt-3 gap-3 align-items-center">
                        {savedAt && (
                            <span className="d-flex align-items-center gap-1 text-success small fw-medium">
                                <CheckCircle2 size={15} /> Saved at {savedAt}
                            </span>
                        )}
                        <Button
                            size="sm"
                            className="px-4 py-2 border-0 fw-semibold d-flex align-items-center gap-2"
                            style={{ backgroundColor: '#4c1d95' }}
                            onClick={handleSaveAll}
                            disabled={saving}
                        >
                            <Save size={15} />
                            {saving ? 'Saving...' : 'Save All Marks'}
                        </Button>
                    </div>
                )}

            </Container>
        </motion.div>
    );
};

export default MarksEntry;
