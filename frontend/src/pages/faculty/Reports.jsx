import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import { Container, Row, Col, Card, Form, Button, Table, Badge } from 'react-bootstrap';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { motion } from 'framer-motion';
import { Download, FileText, Printer } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import Papa from 'papaparse';

const containerVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, staggerChildren: 0.05 } }
};

const REPORT_TYPES = [
    { value: 'assessment', label: 'Assessment Report' },
    { value: 'clo', label: 'CLO Achievement Report' },
    { value: 'student', label: 'Student Performance Report' }
];

const COLORS = ['#4c1d95', '#7c3aed', '#198754', '#d97706', '#dc2626', '#0dcaf0'];

const FacultyReports = () => {
    const { user } = useAuth();
    const [assignments, setAssignments] = useState([]);
    const [assessments, setAssessments] = useState([]);
    const [reportType, setReportType] = useState('assessment');
    const [selectedCourse, setSelectedCourse] = useState('');
    const [selectedSemester, setSemester] = useState('');
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState(null);
    const [gradesData, setGradesData] = useState(null);

    useEffect(() => {
        fetchData();
    }, [user?.token]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const config = { headers: { Authorization: `Bearer ${user.token}` } };

            const [assignRes, assessRes] = await Promise.all([
                api.get('/api/assignments/my', config),
                api.get('/api/faculty/assessments-all', config).catch(() => ({ data: [] }))
            ]);

            setAssignments(assignRes.data);
            setAssessments(assessRes.data);

            // Set default course and semester
            if (assignRes.data.length > 0) {
                setSelectedCourse(assignRes.data[0].course._id);
                setSemester(assignRes.data[0].semester);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Get unique semesters
    const semesters = useMemo(() => {
        const uniqueSemesters = [...new Set(assignments.map(a => a.semester))];
        return uniqueSemesters.sort().reverse();
    }, [assignments]);

    // Get courses for selected semester
    const coursesInSemester = useMemo(() => {
        return assignments.filter(a => a.semester === selectedSemester);
    }, [assignments, selectedSemester]);

    // Get selected course data
    const selectedCourseData = useMemo(() => {
        return assignments.find(a => a.course._id === selectedCourse);
    }, [assignments, selectedCourse]);

    // Generate assessment report data
    const generateAssessmentReport = () => {
        if (!selectedCourseData) return null;

        const courseAssessments = assessments.filter(
            a => a.course === selectedCourse && a.semester === selectedSemester
        );

        const assessmentTypes = {};
        courseAssessments.forEach(a => {
            if (!assessmentTypes[a.type]) {
                assessmentTypes[a.type] = { type: a.type, count: 0, totalMarks: 0 };
            }
            assessmentTypes[a.type].count += 1;
            assessmentTypes[a.type].totalMarks += a.totalMarks || 0;
        });

        return {
            courseInfo: selectedCourseData,
            assessments: courseAssessments,
            typeDistribution: Object.values(assessmentTypes),
            totalAssessments: courseAssessments.length,
            totalMarks: courseAssessments.reduce((sum, a) => sum + (a.totalMarks || 0), 0)
        };
    };

    // Generate CLO achievement report
    const generateCLOReport = () => {
        if (!selectedCourseData) return null;

        const course = selectedCourseData.course;
        const clos = course.clos || [];

        return {
            courseInfo: selectedCourseData,
            clos: clos.map(clo => ({
                ...clo,
                achievement: Math.floor(Math.random() * 100) // Placeholder - replace with actual data
            })),
            studentCount: course.students?.length || 0
        };
    };

    // Generate student performance report
    const generateStudentReport = async () => {
        if (!selectedCourseData) return null;

        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            const { data } = await api.get(`/api/faculty/courses/${selectedCourse}/grades`, config);

            console.log('Grades API Response:', data);
            console.log('Student Grades:', data.studentGrades);

            if (!data.studentGrades || data.studentGrades.length === 0) {
                console.warn('No student grades returned');
                return {
                    courseInfo: selectedCourseData,
                    students: [],
                    avgPerformance: 0,
                    avgGPA: 0
                };
            }

            const studentData = data.studentGrades.map(sg => ({
                ...sg.student,
                percentage: sg.percentage.toFixed(2),
                gpa: sg.gpa.toFixed(2),
                grade: sg.grade,
                totalObtained: sg.totalObtained,
                totalMaxMarks: sg.totalMaxMarks,
                assessmentCount: sg.assessments.length,
                status: sg.percentage >= 50 ? 'Pass' : 'Fail'
            }));

            console.log('Processed Student Data:', studentData);

            const avgPercentage = studentData.length > 0
                ? (studentData.reduce((sum, s) => sum + parseFloat(s.percentage), 0) / studentData.length).toFixed(2)
                : 0;

            return {
                courseInfo: selectedCourseData,
                students: studentData,
                avgPerformance: avgPercentage,
                avgGPA: studentData.length > 0
                    ? (studentData.reduce((sum, s) => sum + parseFloat(s.gpa), 0) / studentData.length).toFixed(2)
                    : 0
            };
        } catch (error) {
            console.error('Error fetching grades:', error);
            console.error('Error details:', error.response?.data || error.message);
            return null;
        }
    };

    // Export to PDF
    const exportToPDF = () => {
        const doc = new jsPDF();
        const now = new Date().toLocaleDateString();

        doc.setFontSize(16);
        doc.text('Faculty Report', 14, 15);
        doc.setFontSize(10);
        doc.text(`Report Type: ${REPORT_TYPES.find(r => r.value === reportType)?.label}`, 14, 25);
        doc.text(`Course: ${selectedCourseData?.course.code} - ${selectedCourseData?.course.name}`, 14, 32);
        doc.text(`Semester: ${selectedSemester}`, 14, 39);
        doc.text(`Generated: ${now}`, 14, 46);

        if (reportType === 'assessment' && reportData) {
            const tableData = reportData.typeDistribution.map(item => [
                item.type,
                item.count,
                item.totalMarks
            ]);
            doc.autoTable({
                head: [['Type', 'Count', 'Total Marks']],
                body: tableData,
                startY: 55
            });
        }

        doc.save(`Report-${reportType}-${Date.now()}.pdf`);
    };

    // Export to CSV
    const exportToCSV = () => {
        if (!reportData) return;

        let csvData = [];
        csvData.push(['Report Type', REPORT_TYPES.find(r => r.value === reportType)?.label]);
        csvData.push(['Course', `${selectedCourseData?.course.code} - ${selectedCourseData?.course.name}`]);
        csvData.push(['Semester', selectedSemester]);
        csvData.push(['Generated', new Date().toLocaleDateString()]);
        csvData.push([]);

        if (reportType === 'assessment') {
            csvData.push(['Assessment Type', 'Count', 'Total Marks']);
            reportData.typeDistribution.forEach(item => {
                csvData.push([item.type, item.count, item.totalMarks]);
            });
        }

        const csv = Papa.unparse(csvData);
        const link = document.createElement('a');
        link.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
        link.download = `Report-${reportType}-${Date.now()}.csv`;
        link.click();
    };

    const handleGenerateReport = async () => {
        if (reportType === 'assessment') {
            setReportData(generateAssessmentReport());
        } else if (reportType === 'clo') {
            setReportData(generateCLOReport());
        } else if (reportType === 'student') {
            const data = await generateStudentReport();
            setReportData(data);
        }
    };

    useEffect(() => {
        if (selectedCourse && selectedSemester) {
            handleGenerateReport();
        }
    }, [selectedCourse, selectedSemester, reportType]);

    return (
        <motion.div initial="hidden" animate="visible" variants={containerVariants}>
            <Container fluid className="py-4 px-4">

                {/* Header */}
                <div className="mb-5">
                    <h2 className="fw-bold text-dark mb-1">Reports</h2>
                    <p className="text-muted small mb-0">View detailed analytics and export reports for your courses</p>
                </div>

                {/* Filters */}
                <Card className="shadow-sm border-0 rounded-3 mb-4">
                    <Card.Body className="p-4">
                        <Row className="g-3 align-items-end">
                            <Col md={3}>
                                <Form.Group>
                                    <Form.Label className="fw-semibold small">Report Type</Form.Label>
                                    <Form.Select
                                        value={reportType}
                                        onChange={e => setReportType(e.target.value)}
                                        className="py-2"
                                        style={{ borderColor: '#cbd5e1' }}
                                    >
                                        {REPORT_TYPES.map(type => (
                                            <option key={type.value} value={type.value}>
                                                {type.label}
                                            </option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </Col>

                            <Col md={3}>
                                <Form.Group>
                                    <Form.Label className="fw-semibold small">Semester</Form.Label>
                                    <Form.Select
                                        value={selectedSemester}
                                        onChange={e => setSemester(e.target.value)}
                                        className="py-2"
                                        style={{ borderColor: '#cbd5e1' }}
                                    >
                                        <option value="">Select Semester</option>
                                        {semesters.map(sem => (
                                            <option key={sem} value={sem}>{sem}</option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </Col>

                            <Col md={3}>
                                <Form.Group>
                                    <Form.Label className="fw-semibold small">Course</Form.Label>
                                    <Form.Select
                                        value={selectedCourse}
                                        onChange={e => setSelectedCourse(e.target.value)}
                                        className="py-2"
                                        style={{ borderColor: '#cbd5e1' }}
                                    >
                                        <option value="">Select Course</option>
                                        {coursesInSemester.map(course => (
                                            <option key={course.course._id} value={course.course._id}>
                                                {course.course.code}
                                            </option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </Col>

                            <Col md={3}>
                                <div className="d-flex gap-2">
                                    <Button
                                        size="sm"
                                        style={{ backgroundColor: '#4c1d95', border: 'none' }}
                                        onClick={exportToPDF}
                                        className="flex-grow-1"
                                    >
                                        <Download size={16} className="me-1" /> PDF
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline-secondary"
                                        onClick={exportToCSV}
                                        className="flex-grow-1"
                                    >
                                        <FileText size={16} className="me-1" /> CSV
                                    </Button>
                                </div>
                            </Col>
                        </Row>
                    </Card.Body>
                </Card>

                {/* Report Content */}
                {loading ? (
                    <div className="text-center py-5">
                        <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                    </div>
                ) : reportData ? (
                    <>
                        {/* Summary Cards */}
                        <Row className="g-3 mb-4">
                            {reportType === 'assessment' && (
                                <>
                                    <Col md={3}>
                                        <Card className="shadow-sm border-0 h-100">
                                            <Card.Body className="p-3 text-center">
                                                <h6 className="text-muted mb-2" style={{ fontSize: '0.85rem' }}>Total Assessments</h6>
                                                <h3 className="fw-bold text-dark mb-0" style={{ color: '#4c1d95' }}>
                                                    {reportData.totalAssessments}
                                                </h3>
                                            </Card.Body>
                                        </Card>
                                    </Col>
                                    <Col md={3}>
                                        <Card className="shadow-sm border-0 h-100">
                                            <Card.Body className="p-3 text-center">
                                                <h6 className="text-muted mb-2" style={{ fontSize: '0.85rem' }}>Total Marks</h6>
                                                <h3 className="fw-bold text-dark mb-0" style={{ color: '#7c3aed' }}>
                                                    {reportData.totalMarks}
                                                </h3>
                                            </Card.Body>
                                        </Card>
                                    </Col>
                                </>
                            )}
                            {reportType === 'clo' && (
                                <Col md={3}>
                                    <Card className="shadow-sm border-0 h-100">
                                        <Card.Body className="p-3 text-center">
                                            <h6 className="text-muted mb-2" style={{ fontSize: '0.85rem' }}>Total CLOs</h6>
                                            <h3 className="fw-bold text-dark mb-0" style={{ color: '#4c1d95' }}>
                                                {reportData.clos.length}
                                            </h3>
                                        </Card.Body>
                                    </Card>
                                </Col>
                            )}
                            {reportType === 'student' && (
                                <>
                                    <Col md={3}>
                                        <Card className="shadow-sm border-0 h-100">
                                            <Card.Body className="p-3 text-center">
                                                <h6 className="text-muted mb-2" style={{ fontSize: '0.85rem' }}>Total Students</h6>
                                                <h3 className="fw-bold text-dark mb-0" style={{ color: '#4c1d95' }}>
                                                    {reportData.students.length}
                                                </h3>
                                            </Card.Body>
                                        </Card>
                                    </Col>
                                    <Col md={3}>
                                        <Card className="shadow-sm border-0 h-100">
                                            <Card.Body className="p-3 text-center">
                                                <h6 className="text-muted mb-2" style={{ fontSize: '0.85rem' }}>Avg Percentage</h6>
                                                <h3 className="fw-bold text-dark mb-0" style={{ color: '#7c3aed' }}>
                                                    {reportData.avgPerformance}%
                                                </h3>
                                            </Card.Body>
                                        </Card>
                                    </Col>
                                    <Col md={3}>
                                        <Card className="shadow-sm border-0 h-100">
                                            <Card.Body className="p-3 text-center">
                                                <h6 className="text-muted mb-2" style={{ fontSize: '0.85rem' }}>Avg GPA</h6>
                                                <h3 className="fw-bold text-dark mb-0" style={{ color: '#10b981' }}>
                                                    {reportData.avgGPA}
                                                </h3>
                                            </Card.Body>
                                        </Card>
                                    </Col>
                                </>
                            )}
                        </Row>

                        {/* Charts and Tables */}
                        <Row className="g-4">
                            {reportType === 'assessment' && (
                                <>
                                    <Col lg={6}>
                                        <Card className="shadow-sm border-0 rounded-3">
                                            <Card.Body className="p-4">
                                                <h6 className="fw-bold mb-3">Assessment Type Distribution</h6>
                                                <div style={{ height: 300 }}>
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <BarChart data={reportData.typeDistribution}>
                                                            <CartesianGrid strokeDasharray="3 3" />
                                                            <XAxis dataKey="type" />
                                                            <YAxis />
                                                            <Tooltip />
                                                            <Bar dataKey="count" fill="#4c1d95" />
                                                        </BarChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </Card.Body>
                                        </Card>
                                    </Col>

                                    <Col lg={6}>
                                        <Card className="shadow-sm border-0 rounded-3">
                                            <Card.Body className="p-4">
                                                <h6 className="fw-bold mb-3">Marks Distribution</h6>
                                                <div style={{ height: 300 }}>
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <PieChart>
                                                            <Pie
                                                                data={reportData.typeDistribution}
                                                                dataKey="totalMarks"
                                                                nameKey="type"
                                                                cx="50%"
                                                                cy="50%"
                                                                outerRadius={80}
                                                                label
                                                            >
                                                                {reportData.typeDistribution.map((entry, index) => (
                                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                                ))}
                                                            </Pie>
                                                            <Tooltip />
                                                        </PieChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </Card.Body>
                                        </Card>
                                    </Col>

                                    <Col lg={12}>
                                        <Card className="shadow-sm border-0 rounded-3">
                                            <Card.Body className="p-4">
                                                <h6 className="fw-bold mb-3">Assessment Details</h6>
                                                <div style={{ overflowX: 'auto' }}>
                                                    <Table hover responsive className="mb-0" style={{ fontSize: '0.85rem' }}>
                                                        <thead style={{ backgroundColor: '#f8f7ff' }}>
                                                            <tr>
                                                                <th className="px-3 py-2">Assessment Name</th>
                                                                <th className="px-3 py-2">Type</th>
                                                                <th className="px-3 py-2">Total Marks</th>
                                                                <th className="px-3 py-2">Questions</th>
                                                                <th className="px-3 py-2">Date</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {reportData.assessments.map((assessment, idx) => (
                                                                <tr key={assessment._id}>
                                                                    <td className="px-3 py-2 fw-semibold">{assessment.title}</td>
                                                                    <td className="px-3 py-2">
                                                                        <Badge bg="light" text="dark">{assessment.type}</Badge>
                                                                    </td>
                                                                    <td className="px-3 py-2">{assessment.totalMarks}</td>
                                                                    <td className="px-3 py-2">{assessment.questions?.length || 0}</td>
                                                                    <td className="px-3 py-2 text-muted text-sm">
                                                                        {new Date(assessment.date || assessment.createdAt).toLocaleDateString()}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </Table>
                                                </div>
                                            </Card.Body>
                                        </Card>
                                    </Col>
                                </>
                            )}

                            {reportType === 'clo' && (
                                <>
                                    <Col lg={12}>
                                        <Card className="shadow-sm border-0 rounded-3">
                                            <Card.Body className="p-4">
                                                <h6 className="fw-bold mb-3">CLO Achievement</h6>
                                                <div style={{ height: 300 }}>
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <BarChart data={reportData.clos}>
                                                            <CartesianGrid strokeDasharray="3 3" />
                                                            <XAxis dataKey="code" />
                                                            <YAxis label={{ value: 'Achievement %', angle: -90, position: 'insideLeft' }} />
                                                            <Tooltip />
                                                            <Bar dataKey="achievement" fill="#198754" />
                                                        </BarChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </Card.Body>
                                        </Card>
                                    </Col>

                                    <Col lg={12}>
                                        <Card className="shadow-sm border-0 rounded-3">
                                            <Card.Body className="p-4">
                                                <h6 className="fw-bold mb-3">CLO Details</h6>
                                                <div style={{ overflowX: 'auto' }}>
                                                    <Table hover responsive className="mb-0" style={{ fontSize: '0.85rem' }}>
                                                        <thead style={{ backgroundColor: '#f8f7ff' }}>
                                                            <tr>
                                                                <th className="px-3 py-2">Code</th>
                                                                <th className="px-3 py-2">Description</th>
                                                                <th className="px-3 py-2 text-center">Achievement %</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {reportData.clos.map((clo, idx) => (
                                                                <tr key={clo._id}>
                                                                    <td className="px-3 py-2 fw-semibold">{clo.code}</td>
                                                                    <td className="px-3 py-2 text-muted">{clo.description}</td>
                                                                    <td className="px-3 py-2 text-center">
                                                                        <Badge
                                                                            bg={clo.achievement >= 80 ? 'success' : clo.achievement >= 60 ? 'warning' : 'danger'}
                                                                        >
                                                                            {clo.achievement}%
                                                                        </Badge>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </Table>
                                                </div>
                                            </Card.Body>
                                        </Card>
                                    </Col>
                                </>
                            )}

                            {reportType === 'student' && (
                                <>
                                    <Col lg={12}>
                                        <Card className="shadow-sm border-0 rounded-3">
                                            <Card.Body className="p-4">
                                                <h6 className="fw-bold mb-3">Student Performance Distribution</h6>
                                                <div style={{ height: 300 }}>
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <BarChart data={reportData.students.slice(0, 10)}>
                                                            <CartesianGrid strokeDasharray="3 3" />
                                                            <XAxis dataKey="name" />
                                                            <YAxis label={{ value: 'Percentage %', angle: -90, position: 'insideLeft' }} />
                                                            <Tooltip formatter={(value) => `${value}%`} />
                                                            <Bar dataKey="percentage" fill="#d97706" />
                                                        </BarChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </Card.Body>
                                        </Card>
                                    </Col>

                                    <Col lg={12}>
                                        <Card className="shadow-sm border-0 rounded-3">
                                            <Card.Body className="p-4">
                                                <h6 className="fw-bold mb-3">Student Performance Details</h6>
                                                <div style={{ overflowX: 'auto' }}>
                                                    <Table hover responsive className="mb-0" style={{ fontSize: '0.85rem' }}>
                                                        <thead style={{ backgroundColor: '#f8f7ff' }}>
                                                            <tr>
                                                                <th className="px-3 py-2">#</th>
                                                                <th className="px-3 py-2">Name</th>
                                                                <th className="px-3 py-2">Reg No</th>
                                                                <th className="px-3 py-2 text-center">Percentage %</th>
                                                                <th className="px-3 py-2 text-center">GPA</th>
                                                                <th className="px-3 py-2 text-center">Grade</th>
                                                                <th className="px-3 py-2 text-center">Status</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {reportData.students.map((student, idx) => (
                                                                <tr key={student._id}>
                                                                    <td className="px-3 py-2">{idx + 1}</td>
                                                                    <td className="px-3 py-2 fw-semibold">{student.name}</td>
                                                                    <td className="px-3 py-2 text-muted">{student.regNo}</td>
                                                                    <td className="px-3 py-2 text-center">
                                                                        <strong>{student.percentage}%</strong>
                                                                    </td>
                                                                    <td className="px-3 py-2 text-center">
                                                                        <Badge bg="info">{student.gpa}</Badge>
                                                                    </td>
                                                                    <td className="px-3 py-2 text-center">
                                                                        <Badge bg={student.grade === 'F' ? 'danger' : student.grade.startsWith('A') ? 'success' : student.grade.startsWith('B') ? 'primary' : 'warning'}>
                                                                            {student.grade}
                                                                        </Badge>
                                                                    </td>
                                                                    <td className="px-3 py-2 text-center">
                                                                        <Badge bg={student.status === 'Pass' ? 'success' : 'danger'}>
                                                                            {student.status}
                                                                        </Badge>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </Table>
                                                </div>
                                            </Card.Body>
                                        </Card>
                                    </Col>
                                </>
                            )}
                        </Row>
                    </>
                ) : (
                    <div className="text-center py-5 bg-white rounded-3 shadow-sm">
                        <p className="text-muted">Select a course and semester to generate a report</p>
                    </div>
                )}

            </Container>
        </motion.div>
    );
};

export default FacultyReports;
