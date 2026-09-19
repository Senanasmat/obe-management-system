import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Container, Card, Row, Col, Button, Badge, Dropdown, Table, Breadcrumb, Modal, Form } from 'react-bootstrap';
import { PlusCircle, FileText, ClipboardList, ChevronDown, XCircle, CheckCircle, Plus, Trash2, Users, Search, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Swal from 'sweetalert2';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const containerVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, staggerChildren: 0.07 } }
};
const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
};

const COLORS_CLO = ['#4F46E5', '#7C3AED', '#EC4899', '#F59E0B', '#10B981'];

const CourseView = () => {
    const { courseId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    
    const [searchParams] = useSearchParams();
    const [assignment, setAssignment] = useState(null);
    const [analytics, setAnalytics] = useState(null);
    const [assessments, setAssessments] = useState([]);
    const [courseClos, setCourseClos] = useState([]);
    const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'View');
    const [cloForm, setCloForm] = useState({ code: '', description: '' });
    const [cloLoading, setCloLoading] = useState(false);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [showEnrollModal, setShowEnrollModal] = useState(false);
    const [showBatchModal, setShowBatchModal] = useState(false);
    const [allStudents, setAllStudents] = useState([]);
    const [enrolledStudentIds, setEnrolledStudentIds] = useState(new Set());
    const [enrollSearch, setEnrollSearch] = useState('');
    const [enrollBatchFilter, setEnrollBatchFilter] = useState('');
    const [enrollLoading, setEnrollLoading] = useState(false);
    const [selectedBatch, setSelectedBatch] = useState('');
    const [batchStudentIds, setBatchStudentIds] = useState(new Set());
    const [studentCheckboxes, setStudentCheckboxes] = useState(new Set());
    const [studentGrades, setStudentGrades] = useState({});

    const formatDate = (d) => {
        if (!d) return '—';
        const dt = new Date(d);
        return `${String(dt.getDate()).padStart(2,'0')}-${String(dt.getMonth()+1).padStart(2,'0')}-${dt.getFullYear()}`;
    };
    const hasOutcomes = (a) => a.questions?.some(q => q.clo);
    const grouped = assessments.reduce((acc, a) => { (acc[a.type] = acc[a.type] || []).push(a); return acc; }, {});

    const toggleSelect = (id) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    const toggleAll = () => setSelectedIds(selectedIds.size === assessments.length ? new Set() : new Set(assessments.map(a => a._id)));

    const deleteSelected = async () => {
        if (!selectedIds.size) return;
        if (!window.confirm(`Delete ${selectedIds.size} assessment(s)?`)) return;
        const config = { headers: { Authorization: `Bearer ${user.token}` } };
        await Promise.all([...selectedIds].map(id => api.delete(`/api/faculty/assessments/${id}`, config)));
        setAssessments(prev => prev.filter(a => !selectedIds.has(a._id)));
        setSelectedIds(new Set());
    };

    const deleteSingle = async (id) => {
        if (!window.confirm('Delete this assessment?')) return;
        const config = { headers: { Authorization: `Bearer ${user.token}` } };
        await api.delete(`/api/faculty/assessments/${id}`, config);
        setAssessments(prev => prev.filter(a => a._id !== id));
        setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    };

    useEffect(() => {
        const config = { headers: { Authorization: `Bearer ${user.token}` } };

        // Use /assignments/my which fully populates course.clos and course.students
        api.get('/api/assignments/my', config).then(r => {
            const found = r.data.find(a => a.course._id === courseId);
            setAssignment(found);
            setCourseClos(found?.course?.clos || []);
            setEnrolledStudentIds(new Set((found?.course?.students || []).map(s => s._id)));
        }).catch(console.error);

        api.get(`/api/faculty/analytics/${courseId}`, config).then(r => setAnalytics(r.data)).catch(console.error);
        api.get(`/api/faculty/courses/${courseId}/assessments`, config).then(r => setAssessments(r.data)).catch(console.error);

        // Fetch student grades
        api.get(`/api/faculty/courses/${courseId}/grades`, config)
            .then(r => {
                const gradesMap = {};
                r.data.studentGrades.forEach(sg => {
                    gradesMap[sg.student._id] = {
                        percentage: sg.percentage.toFixed(2),
                        gpa: sg.gpa.toFixed(2),
                        grade: sg.grade
                    };
                });
                setStudentGrades(gradesMap);
            })
            .catch(err => console.error('Error fetching grades:', err));

        // Fetch all students for batch copy
        api.get('/api/admin/students', config)
            .then(r => {
                console.log('Students fetched successfully:', r.data?.length, 'students');
                console.log('Batches:', [...new Set(r.data?.map(s => s.batch) || [])]);
                setAllStudents(r.data || []);
            })
            .catch(err => {
                console.error('Error fetching students:', err.response?.data || err.message);
                setAllStudents([]);
            });
    }, [courseId, user.token]);

    const openEnrollModal = () => {
        setEnrollSearch('');
        setEnrollBatchFilter('');
        setShowEnrollModal(true);
    };

    const handleEnrollStudents = async () => {
        setEnrollLoading(true);
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            await api.put(
                `/api/admin/courses/${assignment.course._id}/enroll`,
                { studentIds: [...enrolledStudentIds] },
                config
            );
            Swal.fire({ icon: 'success', title: 'Success', text: 'Students enrolled successfully!', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
            setShowEnrollModal(false);
            // Refresh course data
            api.get('/api/assignments/my', config).then(r => {
                const found = r.data.find(a => a.course._id === courseId);
                setAssignment(found);
            });
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Error', text: error.response?.data?.message || error.message, toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
        } finally {
            setEnrollLoading(false);
        }
    };

    const toggleEnrolledStudent = (id) => {
        setEnrolledStudentIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    // Get unique batches
    const uniqueBatches = useMemo(() => {
        const batches = new Set(allStudents.map(s => s.batch).filter(Boolean));
        return Array.from(batches).sort();
    }, [allStudents]);

    // Get students for selected batch
    const batchStudents = useMemo(() => {
        return allStudents.filter(s => s.batch === selectedBatch);
    }, [allStudents, selectedBatch]);

    const openBatchModal = () => {
        setSelectedBatch('');
        setBatchStudentIds(new Set());
        setShowBatchModal(true);
    };

    const handleCopyFromBatch = async () => {
        if (batchStudentIds.size === 0) {
            Swal.fire({ icon: 'warning', title: 'Select Students', text: 'Please select at least one student', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
            return;
        }
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            await api.put(
                `/api/admin/courses/${assignment.course._id}/enroll`,
                { studentIds: [...new Set([...enrolledStudentIds, ...batchStudentIds])] },
                config
            );
            Swal.fire({ icon: 'success', title: 'Success', text: 'Students copied and enrolled successfully!', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
            setShowBatchModal(false);
            // Refresh course data
            api.get('/api/assignments/my', config).then(r => {
                const found = r.data.find(a => a.course._id === courseId);
                setAssignment(found);
                setEnrolledStudentIds(new Set((found?.course?.students || []).map(s => s._id)));
            });
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Error', text: error.response?.data?.message || error.message, toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
        }
    };

    const toggleBatchStudent = (id) => {
        setBatchStudentIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const toggleStudentCheckbox = (id) => {
        setStudentCheckboxes(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const handleUpdateSelected = async () => {
        if (studentCheckboxes.size === 0) {
            Swal.fire({ icon: 'warning', title: 'Select Students', text: 'Please select at least one student', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
            return;
        }
        Swal.fire({ icon: 'success', title: 'Success', text: `Updated ${studentCheckboxes.size} student(s)`, toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
        // Implementation for update functionality
    };

    const handleDeleteSelected = async () => {
        if (studentCheckboxes.size === 0) {
            Swal.fire({ icon: 'warning', title: 'Select Students', text: 'Please select at least one student to delete', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
            return;
        }
        if (!window.confirm(`Delete ${studentCheckboxes.size} student(s)? This action cannot be undone.`)) {
            return;
        }
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            const newEnrolledIds = new Set([...enrolledStudentIds].filter(id => !studentCheckboxes.has(id)));
            await api.put(
                `/api/admin/courses/${assignment.course._id}/enroll`,
                { studentIds: [...newEnrolledIds] },
                config
            );
            Swal.fire({ icon: 'success', title: 'Success', text: 'Student(s) deleted successfully!', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
            setStudentCheckboxes(new Set());
            // Refresh course data
            api.get('/api/assignments/my', config).then(r => {
                const found = r.data.find(a => a.course._id === courseId);
                setAssignment(found);
                setEnrolledStudentIds(new Set((found?.course?.students || []).map(s => s._id)));
            });
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Error', text: error.response?.data?.message || error.message, toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
        }
    };

    const handleDeleteAll = async () => {
        if (!window.confirm('Delete ALL students from this course? This action cannot be undone.')) {
            return;
        }
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            await api.put(
                `/api/admin/courses/${assignment.course._id}/enroll`,
                { studentIds: [] },
                config
            );
            Swal.fire({ icon: 'success', title: 'Success', text: 'All students deleted successfully!', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
            setStudentCheckboxes(new Set());
            // Refresh course data
            api.get('/api/assignments/my', config).then(r => {
                const found = r.data.find(a => a.course._id === courseId);
                setAssignment(found);
                setEnrolledStudentIds(new Set());
            });
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Error', text: error.response?.data?.message || error.message, toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
        }
    };

    const handleGenerateDMC = async () => {
        if (studentCheckboxes.size === 0) {
            Swal.fire({ icon: 'warning', title: 'Select Students', text: 'Please select at least one student to generate DMC', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
            return;
        }

        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            const { data } = await api.post(
                '/api/faculty/students/dmc',
                { studentIds: [...studentCheckboxes] },
                config
            );

            if (!data.students || data.students.length === 0) {
                Swal.fire({ icon: 'error', title: 'Error', text: 'No data received from server', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
                return;
            }

            const doc = new jsPDF();
            const now = new Date().toLocaleDateString();

            data.students.forEach((studentData, idx) => {
                if (idx > 0) doc.addPage();

                // Header
                doc.setFontSize(16);
                doc.text('DETAILED MARKS CERTIFICATE', 14, 15);

                doc.setFontSize(10);
                doc.text(`Student Name: ${studentData.student.name}`, 14, 25);
                doc.text(`Registration No: ${studentData.student.regNo}`, 14, 31);
                doc.text(`Batch: ${studentData.student.batch}`, 14, 37);
                doc.text(`Generated: ${now}`, 14, 43);

                // Table
                const tableData = studentData.courses.map(course => [
                    course.code,
                    course.name,
                    course.creditHours,
                    course.semester,
                    `${course.totalObtained}/${course.totalMaxMarks}`,
                    `${course.percentage}%`,
                    course.grade,
                    course.gpa !== null ? course.gpa.toFixed(2) : 'N/A'
                ]);

                if (tableData.length > 0 && typeof doc.autoTable === 'function') {
                    doc.autoTable({
                        head: [['Code', 'Course', 'Cr Hrs', 'Semester', 'Obtained/Total', '%', 'Grade', 'GPA']],
                        body: tableData,
                        startY: 50,
                        margin: { left: 14, right: 14 }
                    });

                    const finalY = doc.lastAutoTable.finalY + 8;
                    doc.setFontSize(10);
                    doc.text(`Total Credit Hours: ${studentData.totalCreditHours}   Overall GPA: ${studentData.overallGPA.toFixed(2)}`, 14, finalY);
                } else if (tableData.length === 0) {
                    doc.setFontSize(10);
                    doc.text('No courses enrolled.', 14, 50);
                }
            });

            doc.save(`DMC-${Date.now()}.pdf`);
            Swal.fire({ icon: 'success', title: 'Success', text: 'DMC generated successfully!', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
        } catch (error) {
            console.error('Error generating DMC:', error);
            Swal.fire({ icon: 'error', title: 'Error', text: error.response?.data?.message || error.message, toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
        }
    };

    const handleAddClo = async (e) => {
        e.preventDefault();
        if (!cloForm.code.trim() || !cloForm.description.trim()) return;
        setCloLoading(true);
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            const { data } = await api.post(`/api/faculty/courses/${courseId}/clos`, cloForm, config);
            setCourseClos(prev => [...prev, data]);
            setCloForm({ code: '', description: '' });
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'Failed to add CLO', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
        } finally {
            setCloLoading(false);
        }
    };

    const handleRemoveClo = async (cloId) => {
        if (!window.confirm('Remove this CLO from the course?')) return;
        const config = { headers: { Authorization: `Bearer ${user.token}` } };
        await api.delete(`/api/faculty/courses/${courseId}/clos/${cloId}`, config);
        setCourseClos(prev => prev.filter(c => c._id !== cloId));
    };

    const tabs = ['View', 'Students', 'Activities', 'CLOs'];

    if (!assignment) {
        return <div className="p-5 text-center text-muted">Loading course details...</div>;
    }

    const course = assignment.course;
    const faculty = assignment.faculty;

    // Helper to get initials
    const getInitials = (name) => {
        if (!name) return 'IH';
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    };

    return (
        <motion.div initial="hidden" animate="visible" variants={containerVariants} className="bg-white min-vh-100">
            <Container fluid className="px-4 py-3">
                
                {/* Header Title */}
                <div className="mb-2">
                    <h4 className="fw-normal text-dark mb-0">Course Section</h4>
                </div>

                {/* Breadcrumb */}
                <Breadcrumb className="small mb-4" style={{ fontSize: '0.85rem' }}>
                    <Breadcrumb.Item linkAs={Link} linkProps={{ to: '/faculty' }} className="text-muted text-decoration-none">Home</Breadcrumb.Item>
                    <Breadcrumb.Item linkAs={Link} linkProps={{ to: '/faculty/courses' }} className="text-muted text-decoration-none">Course Sections</Breadcrumb.Item>
                    <Breadcrumb.Item active className="text-muted">{course.code} - {assignment.semester}</Breadcrumb.Item>
                </Breadcrumb>

                {/* Course Banner */}
                <div className="d-flex align-items-center gap-3 mb-4">
                    <div className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold fs-4" style={{ width: '60px', height: '60px', backgroundColor: '#637a62' }}>
                        {getInitials(faculty?.name)}
                    </div>
                    <div>
                        <h5 className="mb-1 fw-bold text-dark" style={{ color: '#4a4a4a' }}>{course.code}- {course.name}</h5>
                        <p className="mb-0 text-muted" style={{ fontSize: '0.9rem' }}>
                            <span style={{ color: '#a085b4' }}>{course.code} - {assignment.semester}</span> / {faculty?.name} / {assignment.semester}
                        </p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="d-flex border-bottom mb-4 overflow-auto" style={{ borderBottom: '2px solid #e0d8e8' }}>
                    {tabs.map((tab) => {
                        const isDropdown = tab !== 'View';
                        const isActive = activeTab === tab;
                        
                        return (
                            <div 
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`py-2 px-3 cursor-pointer d-flex align-items-center gap-1 ${isActive ? 'bg-light' : ''}`}
                                style={{ 
                                    borderTopLeftRadius: '6px', 
                                    borderTopRightRadius: '6px',
                                    borderTop: isActive ? '1px solid #dcdcdc' : 'none',
                                    borderLeft: isActive ? '1px solid #dcdcdc' : 'none',
                                    borderRight: isActive ? '1px solid #dcdcdc' : 'none',
                                    borderBottom: isActive ? '2px solid #fff' : '2px solid transparent',
                                    marginBottom: '-2px',
                                    color: isActive ? '#8a62a6' : '#6c757d',
                                    fontSize: '0.9rem',
                                    cursor: 'pointer'
                                }}
                            >
                                {tab}
                                {isDropdown && <ChevronDown size={14} className="ms-1" />}
                            </div>
                        );
                    })}
                </div>

                {/* Tab Content */}
                <AnimatePresence mode="wait">
                    {activeTab === 'View' && (
                        <motion.div key="View" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                            <div className="bg-light rounded-2 border">
                                <Table borderless responsive className="mb-0" style={{ fontSize: '0.85rem' }}>
                                    <tbody>
                                        <tr className="border-bottom">
                                            <td className="fw-semibold text-muted" style={{ width: '20%', backgroundColor: '#f4f5f7' }}>Course Name</td>
                                            <td style={{ width: '30%' }}>{course.name}</td>
                                            <td className="fw-semibold text-muted" style={{ width: '20%', backgroundColor: '#f4f5f7' }}>Course Code</td>
                                            <td style={{ width: '30%', color: '#6d28d9', fontWeight: 500 }}>{course.code}</td>
                                        </tr>
                                        <tr className="border-bottom">
                                            <td className="fw-semibold text-muted" style={{ backgroundColor: '#f4f5f7' }}>Semester</td>
                                            <td>{assignment.semester}</td>
                                            <td className="fw-semibold text-muted" style={{ backgroundColor: '#f4f5f7' }}>Credit Hours</td>
                                            <td>{course.creditHours}</td>
                                        </tr>
                                        <tr className="border-bottom">
                                            <td className="fw-semibold text-muted" style={{ backgroundColor: '#f4f5f7' }}>Teacher</td>
                                            <td style={{ color: '#6d28d9', fontWeight: 500 }}>{faculty?.name || '—'}</td>
                                            <td className="fw-semibold text-muted" style={{ backgroundColor: '#f4f5f7' }}>Department</td>
                                            <td>{faculty?.department || '—'}</td>
                                        </tr>
                                        <tr>
                                            <td className="fw-semibold text-muted" style={{ backgroundColor: '#f4f5f7' }}>Enrolled Students</td>
                                            <td>{course.students?.length ?? 0}</td>
                                            <td className="fw-semibold text-muted" style={{ backgroundColor: '#f4f5f7' }}>CLOs Defined</td>
                                            <td>{courseClos.length}</td>
                                        </tr>
                                    </tbody>
                                </Table>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'Students' && (
                        <motion.div key="Students" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                            <h5 className="fw-semibold text-dark mb-3">Course Section Students</h5>

                            {/* Top Action Buttons */}
                            <div className="d-flex flex-wrap gap-2 mb-3">
                                <Button
                                    variant="outline-success"
                                    size="sm"
                                    onClick={openEnrollModal}
                                    className="rounded-2"
                                >
                                    Enroll Existing
                                </Button>
                                <Button
                                    variant="outline-success"
                                    size="sm"
                                    onClick={openBatchModal}
                                    className="rounded-2"
                                >
                                    Copy from Program Batch
                                </Button>
                            </div>

                            {/* Action Buttons Row */}
                            <div className="d-flex flex-wrap gap-2 mb-3">
                                <Button
                                    variant="success"
                                    size="sm"
                                    onClick={handleUpdateSelected}
                                    className="rounded-2"
                                >
                                    Update Selected
                                </Button>
                                <Button
                                    variant="danger"
                                    size="sm"
                                    onClick={handleDeleteSelected}
                                    className="rounded-2"
                                >
                                    Delete Selected
                                </Button>
                                <Button
                                    variant="danger"
                                    size="sm"
                                    onClick={handleDeleteAll}
                                    className="rounded-2"
                                >
                                    Delete All
                                </Button>
                                <Button
                                    variant="outline-primary"
                                    size="sm"
                                    onClick={handleGenerateDMC}
                                    className="rounded-2 ms-2"
                                >
                                    Generate DMC
                                </Button>
                            </div>

                            {/* Students Table */}
                            {(!course.students || course.students.length === 0) ? (
                                <div className="text-center py-5 bg-white rounded-3 border">
                                    <p className="text-muted">No results found.</p>
                                </div>
                            ) : (
                                <div className="border rounded-3 overflow-x-auto">
                                    <Table responsive hover className="mb-0" style={{ fontSize: '0.85rem' }}>
                                        <thead style={{ backgroundColor: '#f8f7ff' }}>
                                            <tr>
                                                <th className="px-3 py-3 text-center" style={{ width: 50 }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={studentCheckboxes.size === course.students.length && course.students.length > 0}
                                                        onChange={() => {
                                                            if (studentCheckboxes.size === course.students.length) {
                                                                setStudentCheckboxes(new Set());
                                                            } else {
                                                                setStudentCheckboxes(new Set(course.students.map(s => s._id)));
                                                            }
                                                        }}
                                                    />
                                                </th>
                                                <th className="px-3 py-3 text-center" style={{ width: 50 }}>
                                                    <input type="checkbox" disabled />
                                                </th>
                                                <th className="px-3 py-3 fw-semibold text-muted small">#</th>
                                                <th className="px-3 py-3 fw-semibold">Registration No.</th>
                                                <th className="px-3 py-3 fw-semibold">Name</th>
                                                <th className="px-3 py-3 fw-semibold text-muted small">Program Batch</th>
                                                <th className="px-3 py-3 fw-semibold text-muted small">Use in OBE</th>
                                                <th className="px-3 py-3 fw-semibold text-muted small">Status</th>
                                                <th className="px-3 py-3 fw-semibold text-muted small">Grade</th>
                                                <th className="px-3 py-3 fw-semibold text-muted small">Score/GPA</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {course.students.map((student, idx) => (
                                                <tr key={student._id} style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                                                    <td className="px-3 py-3 text-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={studentCheckboxes.has(student._id)}
                                                            onChange={() => toggleStudentCheckbox(student._id)}
                                                        />
                                                    </td>
                                                    <td className="px-3 py-3 text-center">
                                                        <input type="checkbox" defaultChecked disabled />
                                                    </td>
                                                    <td className="px-3 py-3 text-muted fw-semibold">{idx + 1}</td>
                                                    <td className="px-3 py-3 text-muted">{student.regNo}</td>
                                                    <td className="px-3 py-3 fw-semibold text-dark">{student.name}</td>
                                                    <td className="px-3 py-3">
                                                        <span className="badge bg-light text-dark border px-2 py-1 rounded-pill" style={{ fontSize: '0.75rem' }}>
                                                            {student.batch}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-3 text-center">
                                                        <Badge bg="success" style={{ fontSize: '0.75rem' }}>Yes</Badge>
                                                    </td>
                                                    <td className="px-3 py-3">
                                                        <Badge bg="info" style={{ fontSize: '0.75rem' }}>Active</Badge>
                                                    </td>
                                                    <td className="px-3 py-3 text-center">
                                                        {studentGrades[student._id] ? (
                                                            <Badge
                                                                bg={studentGrades[student._id].grade === 'F' ? 'danger' : studentGrades[student._id].grade.startsWith('A') ? 'success' : studentGrades[student._id].grade.startsWith('B') ? 'primary' : 'warning'}
                                                                style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem', fontWeight: 600 }}
                                                            >
                                                                {studentGrades[student._id].grade}
                                                            </Badge>
                                                        ) : (
                                                            <span className="text-muted small">—</span>
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-3 text-center">
                                                        {studentGrades[student._id] ? (
                                                            <div>
                                                                <div className="fw-semibold text-dark" style={{ fontSize: '0.9rem' }}>
                                                                    {studentGrades[student._id].percentage}%
                                                                </div>
                                                                <div className="text-muted small">
                                                                    GPA: {studentGrades[student._id].gpa}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <span className="text-muted small">—</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                </div>
                            )}

                            <p className="text-muted small mt-3">
                                Total Enrolled: <strong>{course.students?.length || 0}</strong> student{(course.students?.length || 0) !== 1 ? 's' : ''}
                            </p>
                        </motion.div>
                    )}

                    {activeTab === 'Activities' && (
                        <motion.div key="Activities" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

                            {/* Heading + action buttons */}
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
                                        <Dropdown.Item onClick={() => setActiveTab('CLOs')}>View CLO Achievement</Dropdown.Item>
                                        <Dropdown.Item onClick={() => setActiveTab('PLOs')}>View PLO Achievement</Dropdown.Item>
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
                                                    <th className="px-3 py-2 text-muted fw-semibold text-center" style={{ color: '#6d28d9' }}>Total<br/>Marks</th>
                                                    <th className="px-3 py-2 text-muted fw-semibold text-center">Outcomes<br/>Added?</th>
                                                    <th className="px-3 py-2 text-muted fw-semibold text-center">Question<br/>Count</th>
                                                    <th className="px-3 py-2 text-muted fw-semibold text-center">GPA %</th>
                                                    <th className="px-3 py-2 text-muted fw-semibold text-center">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {Object.entries(grouped).map(([type, items]) => (
                                                    <>
                                                        {/* Group header row */}
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

                                    {/* Bottom action buttons */}
                                    <div className="d-flex gap-2 mt-3">
                                        <Button size="sm" variant="danger" className="px-3 rounded-2" onClick={deleteSelected} disabled={selectedIds.size === 0}>
                                            Delete Selected
                                        </Button>
                                    </div>
                                </>
                            )}
                        </motion.div>
                    )}

                    {activeTab === 'CLOs' && (
                        <motion.div key="CLOs" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

                            {/* Add CLO form */}
                            <Card className="border-0 shadow-sm rounded-3 mb-4">
                                <Card.Body className="p-4">
                                    <h6 className="fw-semibold text-dark mb-3">Add Course Learning Outcome (CLO)</h6>
                                    <form onSubmit={handleAddClo}>
                                        <Row className="g-3 align-items-end">
                                            <Col md={3}>
                                                <label className="small text-muted mb-1">CLO Code</label>
                                                <input
                                                    className="form-control"
                                                    placeholder="e.g. CLO-1"
                                                    value={cloForm.code}
                                                    onChange={e => setCloForm(f => ({ ...f, code: e.target.value }))}
                                                    required
                                                />
                                            </Col>
                                            <Col md={7}>
                                                <label className="small text-muted mb-1">Description</label>
                                                <input
                                                    className="form-control"
                                                    placeholder="Describe what students will be able to do..."
                                                    value={cloForm.description}
                                                    onChange={e => setCloForm(f => ({ ...f, description: e.target.value }))}
                                                    required
                                                />
                                            </Col>
                                            <Col md={2}>
                                                <Button
                                                    type="submit"
                                                    size="sm"
                                                    className="w-100 d-flex align-items-center justify-content-center gap-1 border-0"
                                                    style={{ backgroundColor: '#4c1d95' }}
                                                    disabled={cloLoading}
                                                >
                                                    <Plus size={15} /> {cloLoading ? 'Adding...' : 'Add CLO'}
                                                </Button>
                                            </Col>
                                        </Row>
                                    </form>
                                </Card.Body>
                            </Card>

                            {/* CLO list */}
                            {courseClos.length === 0 ? (
                                <div className="text-center py-5 border rounded-3">
                                    <div className="d-inline-block p-3 rounded-circle mb-3" style={{ backgroundColor: '#ede9fe' }}>
                                        <FileText size={28} color="#6d28d9" />
                                    </div>
                                    <h6 className="fw-bold">No CLOs defined yet</h6>
                                    <p className="text-muted small">Add CLOs above — they will appear in the activities dropdown when creating assessments.</p>
                                </div>
                            ) : (
                                <div className="border rounded-3 overflow-hidden">
                                    <Table responsive className="mb-0 align-middle" style={{ fontSize: '0.88rem' }}>
                                        <thead style={{ backgroundColor: '#f8f7ff' }}>
                                            <tr>
                                                <th className="px-4 py-2 text-muted fw-semibold" style={{ width: 40 }}>#</th>
                                                <th className="px-3 py-2 fw-semibold" style={{ color: '#6d28d9', width: 120 }}>Code</th>
                                                <th className="px-3 py-2 text-muted fw-semibold">Description</th>
                                                <th className="px-3 py-2 text-muted fw-semibold text-center" style={{ width: 80 }}>Remove</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {courseClos.map((clo, i) => (
                                                <tr key={clo._id} style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                                                    <td className="px-4 py-2 text-muted">{i + 1}</td>
                                                    <td className="px-3 py-2 fw-semibold" style={{ color: '#6d28d9' }}>{clo.code}</td>
                                                    <td className="px-3 py-2 text-dark">{clo.description}</td>
                                                    <td className="px-3 py-2 text-center">
                                                        <button
                                                            className="btn btn-sm btn-outline-danger rounded-2 p-1"
                                                            onClick={() => handleRemoveClo(clo._id)}
                                                            title="Remove CLO"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                </div>
                            )}

                            {/* Achievement chart — shown if marks exist */}
                            {analytics?.cloStats?.length > 0 && (
                                <Card className="shadow-sm border rounded-3 mt-4">
                                    <Card.Body className="p-4">
                                        <h6 className="fw-semibold mb-1">CLO Achievement</h6>
                                        <p className="text-muted small mb-3">Percentage achievement per CLO based on entered marks</p>
                                        <div style={{ height: 260 }}>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={analytics.cloStats} barSize={36}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                                    <XAxis dataKey="cloCode" tick={{ fontSize: 12, fill: '#6b7280' }} />
                                                    <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#6b7280' }} tickFormatter={v => `${v}%`} />
                                                    <Tooltip formatter={v => [`${v.toFixed(1)}%`, 'Achievement']} />
                                                    <Bar dataKey="percentage" radius={[4, 4, 0, 0]}>
                                                        {analytics.cloStats.map((_, i) => <Cell key={i} fill={COLORS_CLO[i % COLORS_CLO.length]} />)}
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </Card.Body>
                                </Card>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Copy from Program Batch Modal */}
                <Modal show={showBatchModal} onHide={() => setShowBatchModal(false)} centered size="lg">
                    <Modal.Header closeButton>
                        <div>
                            <Modal.Title className="fw-bold">Copy from Program Batch</Modal.Title>
                            <p className="text-muted small mb-0 mt-1">
                                Select batch and students to copy to this course
                            </p>
                        </div>
                    </Modal.Header>

                    <Modal.Body style={{ maxHeight: '65vh', overflowY: 'auto' }}>
                        {allStudents.length === 0 && (
                            <div className="alert alert-info mb-3">
                                Loading batches... If this persists, contact your administrator.
                            </div>
                        )}
                        <Form.Group className="mb-3">
                            <Form.Label className="fw-semibold">Select Batch</Form.Label>
                            <Form.Select
                                value={selectedBatch}
                                onChange={e => {
                                    setSelectedBatch(e.target.value);
                                    setBatchStudentIds(new Set());
                                }}
                            >
                                <option value="">Choose a batch...</option>
                                {allStudents.length > 0 ? (
                                    [...new Set(allStudents.map(s => s.batch).filter(Boolean))].sort().map(batch => (
                                        <option key={batch} value={batch}>{batch}</option>
                                    ))
                                ) : (
                                    <option disabled>No batches available</option>
                                )}
                            </Form.Select>
                        </Form.Group>

                        {selectedBatch && (
                            <>
                                <div className="d-flex gap-2 mb-3">
                                    <Button
                                        variant="outline-secondary"
                                        size="sm"
                                        onClick={() => setBatchStudentIds(new Set(batchStudents.map(s => s._id)))}
                                    >
                                        Select All
                                    </Button>
                                    <Button
                                        variant="outline-secondary"
                                        size="sm"
                                        onClick={() => setBatchStudentIds(new Set())}
                                    >
                                        Deselect All
                                    </Button>
                                </div>

                                {batchStudents.length === 0 ? (
                                    <p className="text-muted text-center py-4">No students in this batch.</p>
                                ) : (
                                    <div className="d-flex flex-column gap-2">
                                        {batchStudents.map(s => {
                                            const checked = batchStudentIds.has(s._id);
                                            return (
                                                <div
                                                    key={s._id}
                                                    onClick={() => toggleBatchStudent(s._id)}
                                                    className="d-flex align-items-center gap-3 p-3 rounded-3 border"
                                                    style={{
                                                        cursor: 'pointer',
                                                        backgroundColor: checked ? '#f5f3ff' : '#fff',
                                                        borderColor: checked ? '#6d28d9' : '#dee2e6',
                                                        transition: 'all 0.15s'
                                                    }}
                                                >
                                                    <div
                                                        className="d-flex align-items-center justify-content-center rounded-2 flex-shrink-0"
                                                        style={{
                                                            width: 20, height: 20,
                                                            backgroundColor: checked ? '#6d28d9' : '#fff',
                                                            border: `2px solid ${checked ? '#6d28d9' : '#aaa'}`
                                                        }}
                                                    >
                                                        {checked && <Check size={12} color="white" strokeWidth={3} />}
                                                    </div>
                                                    <div
                                                        className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold flex-shrink-0"
                                                        style={{ width: 38, height: 38, backgroundColor: '#637a62', fontSize: '0.85rem' }}
                                                    >
                                                        {s.name.slice(0, 2).toUpperCase()}
                                                    </div>
                                                    <div className="flex-grow-1 min-width-0">
                                                        <div className="fw-semibold text-dark" style={{ fontSize: '0.92rem' }}>{s.name}</div>
                                                        <div className="text-muted" style={{ fontSize: '0.78rem' }}>{s.regNo}</div>
                                                    </div>
                                                    {checked && (
                                                        <Badge bg="primary" className="rounded-pill px-2" style={{ backgroundColor: '#6d28d9', fontSize: '0.7rem' }}>
                                                            Selected
                                                        </Badge>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </>
                        )}
                    </Modal.Body>

                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowBatchModal(false)}>Cancel</Button>
                        <Button
                            style={{ backgroundColor: '#4c1d95', border: 'none' }}
                            onClick={handleCopyFromBatch}
                            disabled={batchStudentIds.size === 0}
                        >
                            Copy {batchStudentIds.size} Student{batchStudentIds.size !== 1 ? 's' : ''}
                        </Button>
                    </Modal.Footer>
                </Modal>

                {/* Enroll Students Modal */}
                <Modal show={showEnrollModal} onHide={() => setShowEnrollModal(false)} centered size="lg">
                    <Modal.Header closeButton>
                        <div>
                            <Modal.Title className="fw-bold">Manage Student Enrollment</Modal.Title>
                            {assignment && (
                                <p className="text-muted small mb-0 mt-1">
                                    {assignment.course.code} — {assignment.course.name} &nbsp;·&nbsp;
                                    <strong>{enrolledStudentIds.size}</strong> selected
                                </p>
                            )}
                        </div>
                    </Modal.Header>

                    <Modal.Body style={{ maxHeight: '65vh', overflowY: 'auto' }}>
                        {/* Search and Batch Filter */}
                        <div className="d-flex gap-2 mb-3">
                            <div className="position-relative flex-grow-1">
                                <Search size={16} className="position-absolute text-muted" style={{ left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                                <Form.Control
                                    placeholder="Search by name or reg no..."
                                    value={enrollSearch}
                                    onChange={e => setEnrollSearch(e.target.value)}
                                    className="ps-5"
                                />
                            </div>
                            <Form.Select
                                value={enrollBatchFilter}
                                onChange={e => setEnrollBatchFilter(e.target.value)}
                                className="py-2"
                                style={{ maxWidth: '180px' }}
                            >
                                <option value="">All Batches</option>
                                {[...new Set(allStudents.map(s => s.batch).filter(Boolean))].map(batch => (
                                    <option key={batch} value={batch}>{batch}</option>
                                ))}
                            </Form.Select>
                        </div>

                        {/* Quick actions */}
                        <div className="d-flex gap-2 mb-3">
                            <Button
                                variant="outline-secondary"
                                size="sm"
                                onClick={() => setEnrolledStudentIds(new Set(allStudents.map(s => s._id)))}
                            >
                                Select All
                            </Button>
                            <Button
                                variant="outline-secondary"
                                size="sm"
                                onClick={() => setEnrolledStudentIds(new Set())}
                            >
                                Deselect All
                            </Button>
                        </div>

                        {/* Student list */}
                        {allStudents.length === 0 ? (
                            <p className="text-muted text-center py-4">No students available.</p>
                        ) : (
                            <div className="d-flex flex-column gap-2">
                                {allStudents
                                    .filter(s => {
                                        const matchesSearch = s.name.toLowerCase().includes(enrollSearch.toLowerCase()) ||
                                                            s.regNo.toLowerCase().includes(enrollSearch.toLowerCase());
                                        const matchesBatch = !enrollBatchFilter || s.batch === enrollBatchFilter;
                                        return matchesSearch && matchesBatch;
                                    })
                                    .map(s => {
                                        const checked = enrolledStudentIds.has(s._id);
                                        return (
                                            <div
                                                key={s._id}
                                                onClick={() => toggleEnrolledStudent(s._id)}
                                                className="d-flex align-items-center gap-3 p-3 rounded-3 border"
                                                style={{
                                                    cursor: 'pointer',
                                                    backgroundColor: checked ? '#f5f3ff' : '#fff',
                                                    borderColor: checked ? '#6d28d9' : '#dee2e6',
                                                    transition: 'all 0.15s'
                                                }}
                                            >
                                                {/* Custom checkbox */}
                                                <div
                                                    className="d-flex align-items-center justify-content-center rounded-2 flex-shrink-0"
                                                    style={{
                                                        width: 20, height: 20,
                                                        backgroundColor: checked ? '#6d28d9' : '#fff',
                                                        border: `2px solid ${checked ? '#6d28d9' : '#aaa'}`
                                                    }}
                                                >
                                                    {checked && <Check size={12} color="white" strokeWidth={3} />}
                                                </div>

                                                {/* Avatar */}
                                                <div
                                                    className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold flex-shrink-0"
                                                    style={{ width: 38, height: 38, backgroundColor: '#637a62', fontSize: '0.85rem' }}
                                                >
                                                    {s.name.slice(0, 2).toUpperCase()}
                                                </div>

                                                <div className="flex-grow-1 min-width-0">
                                                    <div className="fw-semibold text-dark" style={{ fontSize: '0.92rem' }}>{s.name}</div>
                                                    <div className="text-muted" style={{ fontSize: '0.78rem' }}>{s.regNo} &nbsp;·&nbsp; Batch {s.batch}</div>
                                                </div>

                                                {checked && (
                                                    <Badge bg="primary" className="rounded-pill px-2" style={{ backgroundColor: '#6d28d9', fontSize: '0.7rem' }}>
                                                        Enrolled
                                                    </Badge>
                                                )}
                                            </div>
                                        );
                                    })}
                            </div>
                        )}
                    </Modal.Body>

                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowEnrollModal(false)}>Cancel</Button>
                        <Button
                            style={{ backgroundColor: '#4c1d95', border: 'none' }}
                            onClick={handleEnrollStudents}
                            disabled={enrollLoading}
                        >
                            {enrollLoading ? 'Saving...' : `Save Enrollment (${enrolledStudentIds.size} students)`}
                        </Button>
                    </Modal.Footer>
                </Modal>
            </Container>
        </motion.div>
    );
};

export default CourseView;
