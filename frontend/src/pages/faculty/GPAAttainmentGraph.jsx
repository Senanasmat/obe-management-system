import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, Button, Table, Alert, Spinner } from 'react-bootstrap';
import { useRef } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    LabelList
} from 'recharts';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const GRADES = [
    'A', 'A-', 'B+', 'B', 'B-',
    'C+', 'C', 'C-', 'D+', 'D', 'F', 'NA'
];

export default function GPAAttainmentGraph() {
    const { courseId } = useParams();
    const { user } = useAuth();

    const [data, setData] = useState([]);
    const [course, setCourse] = useState({});
    const [loading, setLoading] = useState(false);
    const [visible, setVisible] = useState(false);
    const [error, setError] = useState('');

    const generateGraph = async () => {
        setLoading(true);
        setError('');

        try {
            const response = await api.get(
                `/api/faculty/courses/${courseId}/award-list`,
                {
                    headers: {
                        Authorization: `Bearer ${user.token}`
                    }
                }
            );

            const students = response.data.awardList || [];
            setCourse(response.data.course || {});

            const distribution = GRADES.map(grade => ({
                grade,
                count: students.filter(student => {
                    const studentGrade =
                        student.isComplete === false
                            ? 'NA'
                            : (student.grade || 'NA');

                    return studentGrade === grade;
                }).length
            }));

            setData(distribution);
            setVisible(true);
        } catch (err) {
            setError(
                err.response?.data?.message ||
                'Unable to generate GPA Attainment Graph.'
            );
            setVisible(false);
        } finally {
            setLoading(false);
        }
    };

    const reportRef = useRef(null);
    
    const downloadPDF = async () => {
        if (!reportRef.current) return;

        try {
            setError('');

            const pdf = new jsPDF('landscape', 'mm', 'a4');

            const pageWidth = pdf.internal.pageSize.getWidth();
            const margin = 15;

            const courseName = `${course.code || ''} - ${course.name || ''}`;
            const teacherName = course.teacher || 'N/A';
            const semester =
                course.academicTerm?.name ||
                course.academicTerm ||
                course.semester ||
                'N/A';

            
            // PAGE 1: Left-aligned heading and course details
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(18);
            pdf.text('GPA Attainment Graph', margin, 18);

            pdf.setFontSize(11);
            pdf.setFont('helvetica', 'normal');

            pdf.text(`Course: ${courseName}`, margin, 29);
            pdf.text(`Semester: ${semester}`, margin, 36);
            pdf.text(`Teacher: ${teacherName}`, margin, 43);
            pdf.text(
                'Department: Department of Software Engineering',
                margin,
                50
            );

            // Capture ONLY the chart
            const canvas = await html2canvas(reportRef.current, {
                scale: 2,
                backgroundColor: '#ffffff',
                useCORS: true
            });

            const imgData = canvas.toDataURL('image/png');

            const imgWidth = pageWidth - margin * 2;
            const imgHeight = canvas.height * imgWidth / canvas.width;

            const maxChartHeight = 145;
            const finalHeight = Math.min(imgHeight, maxChartHeight);
            const finalWidth = imgWidth * (finalHeight / imgHeight);

            pdf.addImage(
                imgData,
                'PNG',
                (pageWidth - finalWidth) / 2,
                57,
                finalWidth,
                finalHeight
            );

            // PAGE 2: Grade distribution table
            pdf.addPage();

            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(16);
            pdf.text('Grade Distribution - Summary', pageWidth / 2, 20, {
                align: 'center'
            });

            autoTable(pdf, {
                startY: 30,
                head: [['Grade', 'Count']],
                body: data.map(item => [
                    item.grade,
                    String(item.count)
                ]),
                theme: 'grid',
                styles: {
                    fontSize: 10,
                    cellPadding: 3,
                    lineColor: [200, 200, 200],
                    lineWidth: 0.2
                },
                headStyles: {
                    fillColor: [102, 51, 153],
                    textColor: [255, 255, 255],
                    fontStyle: 'bold',
                    lineColor: [255, 255, 255],
                    lineWidth: 0.3
                },
                margin: {
                    left: 25,
                    right: 25
                }
            });

            pdf.save(`GPA-Attainment-Graph-${courseId}.pdf`);

        } catch (err) {
            console.error('PDF export failed:', err);
            setError('Unable to download PDF.');
        }
    };

    return (
        <Card className="border rounded-3 shadow-sm">
            <Card.Body className="p-4">
                <h4 className="fw-normal mb-3">
                    GPA Attainment Graph
                </h4>

                <div className="d-flex justify-content-between mb-4">
                    <Button
                        variant="outline-success"
                        onClick={generateGraph}
                        disabled={loading}
                    >
                        {loading ? (
                            <Spinner animation="border" size="sm" />
                        ) : (
                            'GPA Result'
                        )}
                    </Button>

                    <Button
                        variant="outline-success"
                        onClick={downloadPDF}
                        disabled={!visible}
                    >
                        PDF
                    </Button>
                </div>

                {error && (
                    <Alert variant="danger">{error}</Alert>
                )}

                {visible && (
                    <>
                        <div className="text-start mb-4">
                            <h4 className="fw-semibold mb-3">GPA Attainment Graph</h4>

                            <div>
                                <strong>Course: </strong>
                                {course.code} - {course.name}
                            </div>

                            <div>
                                <strong>Semester: </strong>
                                {course.academicTerm?.name ||
                                    course.academicTerm ||
                                    course.semester ||
                                    'N/A'}
                            </div>

                            <div>
                                <strong>Teacher: </strong>
                                {course.teacher || 'N/A'}
                            </div>

                            <div>
                                <strong>Department: </strong>
                                Department of Software Engineering
                            </div>
                        </div>

                        <div style={{ backgroundColor: '#ffffff', padding: 15 }}>
                            <div ref={reportRef}>
                                <h5 className="text-center mb-3">
                                    Grade Distribution
                                </h5>

                                <div style={{ width: '100%', height: 420 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart
                                            data={data}
                                            margin={{ top: 25, right: 20, left: 15, bottom: 10 }}
                                        >
                                            <CartesianGrid strokeDasharray="4 4" />
                                            <XAxis dataKey="grade" />
                                            <YAxis
                                                allowDecimals={false}
                                                label={{
                                                    value: 'Frequency',
                                                    angle: -90,
                                                    position: 'insideLeft'
                                                }}
                                            />
                                            <Tooltip
                                                formatter={value => [value, 'Number of Students']}
                                            />
                                            <Bar
                                                dataKey="count"
                                                name="Number of Students"
                                                fill="#2980b9"
                                                maxBarSize={75}
                                            >
                                                <LabelList
                                                    dataKey="count"
                                                    position="top"
                                                    fill="#2980b9"
                                                />
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <Table
                                className="mt-5"
                                responsive
                                hover
                            >
                                <thead>
                                    <tr>
                                        <th>Grade</th>
                                        <th>Count</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {data.map(item => (
                                        <tr key={item.grade}>
                                            <td>{item.grade}</td>
                                            <td>{item.count}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </div>
                    </>
                )}
            </Card.Body>
        </Card>
    );
}
