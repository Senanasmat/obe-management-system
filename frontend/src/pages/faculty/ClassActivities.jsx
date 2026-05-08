import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Container, Button, Breadcrumb, Table, Dropdown } from 'react-bootstrap';
import { PlusCircle, FileText, ClipboardList, XCircle, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const ClassActivities = () => {
    const { courseId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [assignment, setAssignment] = useState(null);
    const [assessments, setAssessments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedIds, setSelectedIds] = useState(new Set());

    const formatDate = (d) => {
        if (!d) return '—';
        const dt = new Date(d);
        return `${String(dt.getDate()).padStart(2,'0')}-${String(dt.getMonth()+1).padStart(2,'0')}-${dt.getFullYear()}`;
    };
    const hasOutcomes = (a) => a.questions?.some(q => q.clo);
    const grouped = assessments.reduce((acc, a) => { (acc[a.type] = acc[a.type] || []).push(a); return acc; }, {});

    const toggleSelect = (id) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    const toggleAll = () => setSelectedIds(selectedIds.size === assessments.length ? new Set() : new Set(assessments.map(a => a._id)));

    useEffect(() => {
        const config = { headers: { Authorization: `Bearer ${user.token}` } };
        Promise.all([
            axios.get('/api/assignments/my', config),
            axios.get(`/api/faculty/courses/${courseId}/assessments`, config)
        ]).then(([assignRes, assessRes]) => {
            const found = assignRes.data.find(a => a.course._id === courseId);
            setAssignment(found || null);
            setAssessments(assessRes.data);
        }).catch(console.error).finally(() => setLoading(false));
    }, [courseId, user.token]);

    const deleteSingle = async (id) => {
        if (!window.confirm('Delete this assessment?')) return;
        const config = { headers: { Authorization: `Bearer ${user.token}` } };
        await axios.delete(`/api/faculty/assessments/${id}`, config);
        setAssessments(prev => prev.filter(a => a._id !== id));
    };

    const deleteSelected = async () => {
        if (!selectedIds.size) return;
        if (!window.confirm(`Delete ${selectedIds.size} assessment(s)?`)) return;
        const config = { headers: { Authorization: `Bearer ${user.token}` } };
        await Promise.all([...selectedIds].map(id => axios.delete(`/api/faculty/assessments/${id}`, config)));
        setAssessments(prev => prev.filter(a => !selectedIds.has(a._id)));
        setSelectedIds(new Set());
    };

    if (loading) return <div className="p-5 text-center text-muted">Loading activities...</div>;

    const course = assignment?.course;

    return (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
            className="bg-white min-vh-100">
            <Container fluid className="px-4 py-3">

                <h4 className="fw-normal text-dark mb-1">Course Section</h4>
                <Breadcrumb className="small mb-4" style={{ fontSize: '0.85rem' }}>
                    <Breadcrumb.Item linkAs={Link} linkProps={{ to: '/faculty' }} className="text-decoration-none text-muted">Home</Breadcrumb.Item>
                    <Breadcrumb.Item linkAs={Link} linkProps={{ to: '/faculty/courses' }} className="text-decoration-none text-muted">Course Sections</Breadcrumb.Item>
                    {course && (
                        <Breadcrumb.Item linkAs={Link} linkProps={{ to: `/faculty/courses/${courseId}?tab=Activities` }} className="text-decoration-none text-muted">
                            {course.code} — {assignment.semester}
                        </Breadcrumb.Item>
                    )}
                    <Breadcrumb.Item active className="text-muted">Class Activities</Breadcrumb.Item>
                </Breadcrumb>

                {/* Course banner */}
                {course && (
                    <div className="d-flex align-items-center gap-3 mb-4">
                        <div className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold"
                            style={{ width: 52, height: 52, backgroundColor: '#637a62', fontSize: '1.1rem', flexShrink: 0 }}>
                            {user.name?.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                            <h6 className="fw-bold mb-0" style={{ color: '#6d28d9' }}>{course.code} - {course.name}</h6>
                            <p className="mb-0 text-muted" style={{ fontSize: '0.85rem' }}>
                                {course.code} - {assignment.semester} &nbsp;·&nbsp; {user.name}
                            </p>
                        </div>
                    </div>
                )}

                {/* Heading + buttons */}
                <h5 className="fw-semibold text-dark mb-3">Class Activities</h5>
                <div className="d-flex gap-3 mb-3">
                    <Dropdown>
                        <Dropdown.Toggle variant="outline-success" size="sm" className="rounded-2 px-3">
                            Add Class Activities
                        </Dropdown.Toggle>
                        <Dropdown.Menu>
                            <Dropdown.Item onClick={() => navigate(`/faculty/courses/${courseId}/create-assessment`)}>
                                <PlusCircle size={14} className="me-2" /> Create Assessment
                            </Dropdown.Item>
                        </Dropdown.Menu>
                    </Dropdown>
                    <Dropdown>
                        <Dropdown.Toggle variant="outline-success" size="sm" className="rounded-2 px-3">
                            Activity Outcome
                        </Dropdown.Toggle>
                        <Dropdown.Menu>
                            <Dropdown.Item onClick={() => navigate(`/faculty/courses/${courseId}?tab=CLOs`)}>View CLO Achievement</Dropdown.Item>
                            <Dropdown.Item onClick={() => navigate(`/faculty/courses/${courseId}?tab=PLOs`)}>View PLO Achievement</Dropdown.Item>
                        </Dropdown.Menu>
                    </Dropdown>
                </div>

                {assessments.length === 0 ? (
                    <div className="text-center py-5 bg-white rounded-3 border">
                        <div className="d-inline-block p-3 rounded-circle mb-3" style={{ backgroundColor: '#ede9fe' }}>
                            <ClipboardList size={30} color="#6d28d9" />
                        </div>
                        <h6 className="fw-bold">No Activities Yet</h6>
                        <p className="text-muted small mb-3">Create your first activity to start tracking OBE outcomes.</p>
                        <Button size="sm" className="px-4 border-0 rounded-2" style={{ backgroundColor: '#4c1d95' }}
                            onClick={() => navigate(`/faculty/courses/${courseId}/create-assessment`)}>
                            Create Activity
                        </Button>
                    </div>
                ) : (
                    <>
                        <p className="text-muted small mb-2">
                            Showing <strong>1–{assessments.length}</strong> of <strong>{assessments.length}</strong> item{assessments.length !== 1 ? 's' : ''}.
                        </p>

                        <div className="border rounded-3 overflow-hidden">
                            <Table responsive className="mb-0 align-middle" style={{ fontSize: '0.85rem' }}>
                                <thead style={{ backgroundColor: '#f8f7ff' }}>
                                    <tr>
                                        <th className="px-3 py-2 text-muted fw-semibold" style={{ width: 40 }}>#</th>
                                        <th className="px-2 py-2" style={{ width: 36 }}>
                                            <input type="checkbox"
                                                checked={selectedIds.size === assessments.length && assessments.length > 0}
                                                onChange={toggleAll} />
                                        </th>
                                        <th className="px-3 py-2 fw-semibold" style={{ color: '#6d28d9' }}>Name</th>
                                        <th className="px-3 py-2 text-muted fw-semibold">Date</th>
                                        <th className="px-3 py-2 text-muted fw-semibold text-center" style={{ color: '#6d28d9' }}>Total<br />Marks</th>
                                        <th className="px-3 py-2 text-muted fw-semibold text-center">Outcomes<br />Added?</th>
                                        <th className="px-3 py-2 text-muted fw-semibold text-center">Question<br />Count</th>
                                        <th className="px-3 py-2 text-muted fw-semibold text-center">GPA %</th>
                                        <th className="px-3 py-2 text-muted fw-semibold text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.entries(grouped).map(([type, items]) => (
                                        <>
                                            <tr key={`g-${type}`} style={{ backgroundColor: '#eeecf8' }}>
                                                <td colSpan={9} className="px-3 py-2 fw-semibold text-dark" style={{ fontSize: '0.88rem' }}>
                                                    {type} &nbsp;
                                                    <span className="text-muted fw-normal">
                                                        [GPA : {items.reduce((s, i) => s + (i.gpaWeight || 0), 0).toFixed(2)}%]
                                                    </span>
                                                </td>
                                            </tr>
                                            {items.map((a, idx) => (
                                                <tr key={a._id} style={{ backgroundColor: selectedIds.has(a._id) ? '#f5f3ff' : '#fff' }}>
                                                    <td className="px-3 py-2 text-muted">{idx + 1}</td>
                                                    <td className="px-2 py-2">
                                                        <input type="checkbox"
                                                            checked={selectedIds.has(a._id)}
                                                            onChange={() => toggleSelect(a._id)} />
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        <span style={{ color: '#6d28d9', fontWeight: 500, cursor: 'pointer' }}
                                                            onClick={() => navigate(`/faculty/courses/${courseId}/marks/${a._id}`)}>
                                                            {a.title}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-2 text-muted">{formatDate(a.date || a.createdAt)}</td>
                                                    <td className="px-3 py-2 text-center fw-semibold">{a.totalMarks}</td>
                                                    <td className="px-3 py-2 text-center">
                                                        {hasOutcomes(a)
                                                            ? <CheckCircle size={20} color="#16a34a" fill="#dcfce7" />
                                                            : <XCircle size={20} color="#dc2626" fill="#fee2e2" />}
                                                    </td>
                                                    <td className="px-3 py-2 text-center">
                                                        <span className="rounded-circle d-inline-flex align-items-center justify-content-center fw-bold text-white"
                                                            style={{ width: 28, height: 28, backgroundColor: '#d97706', fontSize: '0.78rem' }}>
                                                            {a.questions?.length || 0}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-2 text-center text-muted">{(a.gpaWeight || 0).toFixed(2)}%</td>
                                                    <td className="px-3 py-2 text-center">
                                                        <Dropdown>
                                                            <Dropdown.Toggle variant="outline-secondary" size="sm" className="rounded-2 px-2 py-1" style={{ fontSize: '0.78rem' }}>
                                                                Actions
                                                            </Dropdown.Toggle>
                                                            <Dropdown.Menu align="end" popperConfig={{ strategy: 'fixed' }}>
                                                                <Dropdown.Item onClick={() => navigate(`/faculty/courses/${courseId}/marks/${a._id}`)}>
                                                                    Enter Marks
                                                                </Dropdown.Item>
                                                                <Dropdown.Item onClick={() => navigate(`/faculty/courses/${courseId}/edit-assessment/${a._id}`)}>
                                                                    Edit
                                                                </Dropdown.Item>
                                                                <Dropdown.Divider />
                                                                <Dropdown.Item className="text-danger" onClick={() => deleteSingle(a._id)}>
                                                                    Delete
                                                                </Dropdown.Item>
                                                            </Dropdown.Menu>
                                                        </Dropdown>
                                                    </td>
                                                </tr>
                                            ))}
                                        </>
                                    ))}
                                </tbody>
                            </Table>
                        </div>

                        <div className="d-flex gap-2 mt-3">
                            <Button size="sm" variant="danger" className="px-3 rounded-2" onClick={deleteSelected} disabled={selectedIds.size === 0}>
                                Delete Selected
                            </Button>
                        </div>
                    </>
                )}
            </Container>
        </motion.div>
    );
};

export default ClassActivities;
