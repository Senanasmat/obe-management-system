
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
    Card, Form, Button, Table, Alert, Spinner
} from 'react-bootstrap';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip,
    CartesianGrid, ResponsiveContainer
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx-js-style';

import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const getId = value => String(value?._id || value || '');
const num = value => Number(value || 0);
const fmt = value => num(value).toFixed(2);

const CATEGORY = [
    { key: 'assignment', label: 'Assignment', weight: 10 },
    { key: 'quiz', label: 'Quiz', weight: 10 },
    { key: 'midterm', label: 'Mid Term / Sessional Exam', weight: 30 },
    { key: 'final', label: 'Final Exam', weight: 50 }
];

function categoryOf(a) {
    const value = `${a.type || ''} ${a.title || ''}`.toLowerCase();

    if (value.includes('assignment')) return 'assignment';
    if (value.includes('quiz')) return 'quiz';
    if (value.includes('mid')) return 'midterm';
    if (value.includes('final')) return 'final';

    return null;
}

export default function MarksGPA() {
    const { courseId } = useParams();
    const { user } = useAuth();

    const [reportMode, setReportMode] = useState('detail');
    const [displayMode, setDisplayMode] = useState('marks');
    const [showGraph, setShowGraph] = useState(false);
    const [showActivityTotal, setShowActivityTotal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [visible, setVisible] = useState(false);
    const [error, setError] = useState('');
    const [course, setCourse] = useState(null);
    const [assignment, setAssignment] = useState(null);
    const [activities, setActivities] = useState([]);
    const [rows, setRows] = useState([]);

    const loadReport = async () => {
        setLoading(true);
        setError('');
        setVisible(false);

        const config = {
            headers: { Authorization: `Bearer ${user.token}` }
        };

        try {
            const [assignedRes, assessmentRes, gradesRes] =
                await Promise.all([
                    api.get('/api/assignments/my', config),
                    api.get(
                        `/api/faculty/courses/${courseId}/assessments`,
                        config
                    ),
                    api.get(
                        `/api/faculty/courses/${courseId}/grades`,
                        config
                    )
                ]);

            const assigned = assignedRes.data.find(
                item => getId(item.course) === courseId
            );

            if (!assigned) {
                throw new Error('Assigned course not found.');
            }

            const all = assessmentRes.data || [];

            const eligible = all
                .filter(a =>
                    categoryOf(a) &&
                    a.includeForGPA !== false
                )
                .sort((a, b) => {
                    const ca = CATEGORY.findIndex(
                        c => c.key === categoryOf(a)
                    );
                    const cb = CATEGORY.findIndex(
                        c => c.key === categoryOf(b)
                    );
                    return ca - cb;
                });

            const resultsResponses = await Promise.all(
                eligible.map(a =>
                    api.get(
                        `/api/faculty/assessments/${getId(a)}/results`,
                        config
                    )
                )
            );

            const resultMaps = {};

            eligible.forEach((a, i) => {
                const payload = resultsResponses[i].data;
                const list = Array.isArray(payload)
                    ? payload
                    : payload.results || [];

                resultMaps[getId(a)] = new Map(
                    list.map(r => [getId(r.student), r])
                );
            });

            const gradePayload = gradesRes.data;
            const gradeRows = Array.isArray(gradePayload)
                ? gradePayload
                : gradePayload.studentGrades ||
                gradePayload.grades ||
                gradePayload.students ||
                gradePayload.results ||
                [];

            const gradeMap = new Map(
                gradeRows.map(g => [
                    getId(g.student || g.studentId),
                    g
                ])
            );

            const students = assigned.course.students || [];

            const calculatedRows = students.map((student, index) => {
                const activityMarks = {};
                const categoryTotals = {};

                CATEGORY.forEach(c => {
                    categoryTotals[c.key] = 0;
                });

                eligible.forEach(a => {
                    const result = resultMaps[getId(a)]
                        ?.get(getId(student));

                    const obtained = (result?.obtainedMarks || [])
                        .reduce((sum, q) =>
                            sum + num(q.marks), 0
                        );

                    const category = categoryOf(a);
                    const categoryActivities = eligible.filter(
                        x => categoryOf(x) === category
                    );

                    const explicitWeight = num(a.gpaWeight);

                    const fallbackWeight =
                        CATEGORY.find(c => c.key === category).weight /
                        categoryActivities.length;

                    const weight = explicitWeight > 0
                        ? explicitWeight
                        : fallbackWeight;

                    const weighted = num(a.totalMarks) > 0
                        ? obtained / num(a.totalMarks) * weight
                        : 0;

                    activityMarks[getId(a)] = {
                        obtained,
                        weighted,
                        weight,
                        recorded: Boolean(result)
                    };

                    categoryTotals[category] += weighted;
                });

                const grade = gradeMap.get(getId(student)) || {};

                const total = Object.values(categoryTotals)
                    .reduce((sum, value) => sum + value, 0);

                return {
                    index: index + 1,
                    student,
                    activityMarks,
                    categoryTotals,
                    calculatedTotal: total,
                    total: grade.percentage == null
                        ? total
                        : Number(grade.percentage),
                    grade: grade.grade ||
                        grade.letterGrade ||
                        'N/A',
                    gpa: grade.gpa == null
                        ? null
                        : Number(grade.gpa)
                };
            });

            setAssignment(assigned);
            setCourse(assigned.course);
            setActivities(eligible);
            setRows(calculatedRows);
            setVisible(true);

        } catch (err) {
            setError(
                err.response?.data?.message ||
                err.message ||
                'Unable to generate GPA report.'
            );
        } finally {
            setLoading(false);
        }
    };

    const displayed = (row, activity) => {
        const mark = row.activityMarks[getId(activity)];
        if (!mark) return '—';

        if (displayMode === 'percentage') {
            return num(activity.totalMarks) > 0
                ? fmt(mark.obtained / num(activity.totalMarks) * 100)
                : '0.00';
        }

        return fmt(mark.weighted);
    };

    const exportMatrix = () => [
        [
            'Sr. No.', 'Registration No.', 'Name',
            ...(reportMode === 'detail'
                ? activities.map(a => a.title || a.type)
                : CATEGORY.map(c => c.label)),
            'Total Marks (100)', 'Total', 'Grade', 'Score/GPA'
        ],
        ...rows.map(row => [
            row.index,
            row.student.regNo,
            row.student.name,
            ...(reportMode === 'detail'
                ? activities.map(a => displayed(row, a))
                : CATEGORY.map(c => fmt(row.categoryTotals[c.key]))),
            fmt(row.total),
            fmt(row.total),
            row.grade,
            row.gpa === null ? 'N/A' : fmt(row.gpa)
        ])
    ];

    const downloadExcel = () => {
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.aoa_to_sheet(exportMatrix());

        worksheet['!cols'] = exportMatrix()[0].map(
            (_, i) => ({ wch: i === 2 ? 26 : 18 })
        );

        XLSX.utils.book_append_sheet(
            workbook, worksheet, 'Marks GPA'
        );

        XLSX.writeFile(
            workbook,
            `Marks-GPA-${course?.code || courseId}.xlsx`
        );
    };

    const downloadPDF = () => {
        const doc = new jsPDF('landscape', 'mm', 'a3');

        doc.setFontSize(16);
        doc.text('Class Room Combined Result (GPA)', 14, 16);

        doc.setFontSize(10);
        doc.text(
            `Course: ${course?.code || ''} - ${course?.name || ''}`,
            14, 24
        );

        const matrix = exportMatrix();

        autoTable(doc, {
            startY: 30,
            head: [matrix[0]],
            body: matrix.slice(1),
            theme: 'grid',
            styles: { fontSize: 7, cellPadding: 2 },
            headStyles: { fillColor: [102, 51, 153] },
            horizontalPageBreak: true,
            horizontalPageBreakRepeat: [0, 1, 2]
        });

        doc.save(`Marks-GPA-${courseId}.pdf`);
    };

    const graphData = rows.map(row => ({
        name: row.student.regNo,
        total: row.total
    }));

    const grouped = CATEGORY.map(category => ({
        ...category,
        activities: activities.filter(
            a => categoryOf(a) === category.key
        )
    })).filter(c => c.activities.length > 0);

    const averages = activities.map(a =>
        rows.length
            ? rows.reduce(
                (sum, row) =>
                    sum + num(displayed(row, a)), 0
            ) / rows.length
            : 0
    );

    return (
        <Card className="border rounded-3 shadow-sm">
            <Card.Body className="p-4">
                <h4 className="fw-normal mb-4">Marks (GPA)</h4>

                <div
                    className="mb-3"
                    style={{
                        display: 'grid',
                        gridTemplateColumns:
                            'repeat(auto-fit, minmax(330px, 1fr))',
                        gap: '15px 35px'
                    }}
                >
                    <div className="d-flex gap-4 flex-wrap">
                        <Form.Check
                            type="radio"
                            name="gpa-report-type"
                            label="Summary Report"
                            checked={reportMode === 'summary'}
                            onChange={() => setReportMode('summary')}
                        />
                        <Form.Check
                            type="radio"
                            name="gpa-report-type"
                            label="Detail Report"
                            checked={reportMode === 'detail'}
                            onChange={() => setReportMode('detail')}
                        />
                    </div>

                    <div className="d-flex gap-4 flex-wrap">
                        <Form.Check
                            label="Show Graph"
                            checked={showGraph}
                            onChange={e =>
                                setShowGraph(e.target.checked)
                            }
                        />
                        <Form.Check
                            label="Show Activity Total"
                            checked={showActivityTotal}
                            onChange={e =>
                                setShowActivityTotal(e.target.checked)
                            }
                        />
                    </div>

                    <div className="d-flex gap-4 flex-wrap">
                        <Form.Check
                            type="radio"
                            name="gpa-display-type"
                            label="Show Marks"
                            checked={displayMode === 'marks'}
                            onChange={() => setDisplayMode('marks')}
                        />
                        <Form.Check
                            type="radio"
                            name="gpa-display-type"
                            label="Show Percentage"
                            checked={displayMode === 'percentage'}
                            onChange={() => setDisplayMode('percentage')}
                        />
                    </div>
                </div>

                <div className="d-flex flex-wrap gap-1 mb-3">
                    <Button
                        variant="outline-success"
                        onClick={loadReport}
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <Spinner animation="border" size="sm" />
                                {' '}Loading...
                            </>
                        ) : 'Report'}
                    </Button>

                    <Button
                        variant="outline-success"
                        onClick={downloadPDF}
                        disabled={!visible}
                    >
                        PDF
                    </Button>

                    <Button
                        variant="outline-success"
                        onClick={downloadExcel}
                        disabled={!visible}
                    >
                        Excel
                    </Button>

                    <Button
                        variant="outline-primary"
                        onClick={() => {
                            window.alert(
                                'GPA results are calculated from saved marks. ' +
                                'A separate publish/save endpoint is not configured.'
                            );
                        }}
                    >
                        Save
                    </Button>
                </div>

                <Alert
                    variant="primary"
                    style={{
                        backgroundColor: '#d0dbea',
                        color: '#24334c'
                    }}
                >
                    <strong>GPA Result!</strong> Results are calculated
                    from recorded assessment marks.
                </Alert>

                {error && <Alert variant="danger">{error}</Alert>}

                {visible && (
                    <>
                        <h3 className="fw-normal mb-3">
                            Class Room Combined Result(GPA)
                        </h3>

                        <div className="mb-3" style={{ fontSize: 18 }}>
                            <div>
                                <strong>Course : </strong>
                                <span style={{ color: '#663399' }}>
                                    {course?.code} - {course?.name}
                                </span>
                            </div>
                            <div>
                                <strong>Course Section : </strong>
                                {course?.code}
                            </div>
                            <div>
                                <strong>Teacher : </strong>
                                {user?.name || ''}
                            </div>
                            <div>
                                <strong>Semester : </strong>
                                {assignment?.academicTerm?.name || ''}
                            </div>
                        </div>

                        {showGraph && (
                            <div style={{ height: 320 }} className="mb-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={graphData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" hide />
                                        <YAxis domain={[0, 100]} />
                                        <Tooltip />
                                        <Bar dataKey="total" fill="#663399" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}

                        <div style={{ overflowX: 'auto' }}>
                            <Table
                                bordered
                                className="align-middle"
                                style={{
                                    minWidth: reportMode === 'detail'
                                        ? Math.max(
                                            1100,
                                            activities.length * 125 + 620
                                        )
                                        : 1050,
                                    fontSize: '0.86rem'
                                }}
                            >
                                <thead>
                                    {reportMode === 'detail' && (
                                        <>
                                            <tr>
                                                <th colSpan={3}>
                                                    Activity
                                                </th>
                                                {grouped.map(c => (
                                                    <th
                                                        key={c.key}
                                                        colSpan={c.activities.length}
                                                        className="text-center"
                                                    >
                                                        {c.label}
                                                    </th>
                                                ))}
                                                <th colSpan={4}></th>
                                            </tr>
                                            <tr>
                                                <th colSpan={3}>
                                                    Total Weightage
                                                </th>
                                                {grouped.map(c => (
                                                    <th
                                                        key={c.key}
                                                        colSpan={c.activities.length}
                                                        className="text-center"
                                                    >
                                                        {fmt(c.weight)}%
                                                    </th>
                                                ))}
                                                <th colSpan={4}></th>
                                            </tr>
                                            <tr>
                                                <th colSpan={3}>Weightage</th>
                                                {activities.map(a => (
                                                    <th
                                                        key={getId(a)}
                                                        className="text-center"
                                                    >
                                                        {fmt(
                                                            num(a.gpaWeight) > 0
                                                                ? a.gpaWeight
                                                                : CATEGORY.find(
                                                                    c => c.key ===
                                                                        categoryOf(a)
                                                                ).weight /
                                                                activities.filter(
                                                                    x => categoryOf(x) ===
                                                                        categoryOf(a)
                                                                ).length
                                                        )}%
                                                    </th>
                                                ))}
                                                <th colSpan={4}></th>
                                            </tr>
                                        </>
                                    )}

                                    <tr>
                                        <th>Sr. No.</th>
                                        <th>Registration No.</th>
                                        <th>Name</th>

                                        {reportMode === 'detail'
                                            ? activities.map(a => (
                                                <th
                                                    key={getId(a)}
                                                    className="text-center"
                                                >
                                                    {a.title || a.type}
                                                </th>
                                            ))
                                            : CATEGORY.map(c => (
                                                <th
                                                    key={c.key}
                                                    className="text-center"
                                                >
                                                    {c.label}
                                                </th>
                                            ))}

                                        <th>Total Marks (100)</th>
                                        <th>Total</th>
                                        <th>Grade</th>
                                        <th>Score/GPA</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {rows.map(row => (
                                        <tr key={getId(row.student)}>
                                            <td>{row.index}.</td>
                                            <td style={{ color: '#663399' }}>
                                                {row.student.regNo}
                                            </td>
                                            <td>{row.student.name}</td>

                                            {reportMode === 'detail'
                                                ? activities.map(a => (
                                                    <td
                                                        key={getId(a)}
                                                        className="text-center"
                                                    >
                                                        {displayed(row, a)}
                                                    </td>
                                                ))
                                                : CATEGORY.map(c => (
                                                    <td
                                                        key={c.key}
                                                        className="text-center"
                                                    >
                                                        {fmt(
                                                            row.categoryTotals[c.key]
                                                        )}
                                                    </td>
                                                ))}

                                            <td>{fmt(row.total)}</td>
                                            <td>{fmt(row.total)}</td>
                                            <td>{row.grade}</td>
                                            <td>
                                                {row.gpa === null
                                                    ? 'N/A'
                                                    : fmt(row.gpa)}
                                            </td>
                                        </tr>
                                    ))}

                                    {rows.length > 0 && (
                                        <tr className="fw-semibold">
                                            <td>Average</td>
                                            <td></td>
                                            <td></td>

                                            {reportMode === 'detail'
                                                ? averages.map((avg, index) => (
                                                    <td
                                                        key={index}
                                                        className="text-center"
                                                    >
                                                        {fmt(avg)}
                                                    </td>
                                                ))
                                                : CATEGORY.map(c => (
                                                    <td
                                                        key={c.key}
                                                        className="text-center"
                                                    >
                                                        {fmt(
                                                            rows.reduce(
                                                                (sum, row) =>
                                                                    sum +
                                                                    row.categoryTotals[c.key],
                                                                0
                                                            ) / rows.length
                                                        )}
                                                    </td>
                                                ))}

                                            <td>
                                                {fmt(
                                                    rows.reduce(
                                                        (sum, row) =>
                                                            sum + row.total, 0
                                                    ) / rows.length
                                                )}
                                            </td>
                                            <td>
                                                {fmt(
                                                    rows.reduce(
                                                        (sum, row) =>
                                                            sum + row.total, 0
                                                    ) / rows.length
                                                )}
                                            </td>
                                            <td></td>
                                            <td></td>
                                        </tr>
                                    )}
                                </tbody>
                            </Table>
                        </div>

                        {showActivityTotal && (
                            <Alert variant="light">
                                Assignment: 10% | Quiz: 10% |
                                Midterm: 30% | Final: 50%
                            </Alert>
                        )}
                    </>
                )}
            </Card.Body>
        </Card>
    );
}
