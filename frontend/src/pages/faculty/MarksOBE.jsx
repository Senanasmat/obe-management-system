
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, Button, Table, Spinner, Alert } from 'react-bootstrap';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx-js-style';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const getId = v => String(v?._id || v || '');
const number = v => Number(v || 0);
const fmt = v => number(v).toFixed(2);

export default function MarksOBE() {
    const { courseId } = useParams();
    const { user } = useAuth();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [course, setCourse] = useState(null);
    const [assessments, setAssessments] = useState([]);
    const [results, setResults] = useState({});

    useEffect(() => {
        let cancelled = false;

        async function load() {
            setLoading(true);
            setError('');

            const config = {
                headers: {
                    Authorization: `Bearer ${user.token}`
                }
            };

            try {
                const [assignmentsRes, assessmentsRes] =
                    await Promise.all([
                        api.get('/api/assignments/my', config),
                        api.get(
                            `/api/faculty/courses/${courseId}/assessments`,
                            config
                        )
                    ]);

                const assignment = assignmentsRes.data.find(
                    a => getId(a.course) === courseId
                );

                if (!assignment) {
                    throw new Error('Assigned course not found.');
                }

                const activities = assessmentsRes.data || [];

                const settled = await Promise.allSettled(
                    activities.map(a =>
                        api.get(
                            `/api/faculty/assessments/${a._id}/results`,
                            config
                        )
                    )
                );

                const resultMap = {};

                settled.forEach((response, index) => {
                    const assessmentId = getId(activities[index]);

                    if (response.status !== 'fulfilled') {
                        return;
                    }

                    const payload = response.value.data;
                    const rows = Array.isArray(payload)
                        ? payload
                        : payload.results || [];

                    resultMap[assessmentId] = rows;
                });

                const failures = settled.filter(
                    r => r.status === 'rejected'
                );

                if (failures.length) {
                    throw new Error(
                        `Could not load results for ${failures.length} assessment(s).`
                    );
                }

                if (!cancelled) {
                    setCourse(assignment.course);
                    setAssessments(activities);
                    setResults(resultMap);
                }
            } catch (err) {
                if (!cancelled) {
                    setError(
                        err.response?.data?.message ||
                        err.message ||
                        'Unable to load Marks OBE.'
                    );
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        load();
        return () => { cancelled = true; };
    }, [courseId, user.token]);

    const columns = useMemo(() => {
        const list = [];

        assessments.forEach(assessment => {
            (assessment.questions || []).forEach((q, index) => {
                if (q.notForOBE || !(q.clos || []).length) return;

                const maxMarks = number(q.maxMarks);
                const weight = number(q.obeWeight) > 0
                    ? number(q.obeWeight)
                    : number(assessment.totalMarks) > 0
                        ? maxMarks / number(assessment.totalMarks) * 100
                        : 0;

                (q.clos || []).forEach(clo => {
                    list.push({
                        key: `${assessment._id}-${index}-${getId(clo)}`,
                        assessmentId: getId(assessment),
                        questionIndex: index,
                        cloId: getId(clo),
                        cloCode:
                            clo?.code ||
                            course?.clos?.find(
                                item => getId(item) === getId(clo)
                            )?.code ||
                            'CLO',
                        activity: assessment.title || assessment.type || '',
                        question: q.questionName ||
                            q.questionText ||
                            `Q${index + 1}`,
                        weight,
                        maxMarks
                    });
                });
            });
        });

        const courseClos = course?.clos || [];

        return list.sort((a, b) => {
            const ai = courseClos.findIndex(
                c => getId(c) === a.cloId
            );
            const bi = courseClos.findIndex(
                c => getId(c) === b.cloId
            );

            return ai - bi;
        });
    }, [assessments, course]);

    const cloGroups = useMemo(() => {
        const groups = [];

        columns.forEach(col => {
            const last = groups[groups.length - 1];

            if (last && last.cloId === col.cloId) {
                last.count++;
            } else {
                groups.push({
                    cloId: col.cloId,
                    code: col.cloCode,
                    count: 1
                });
            }
        });

        return groups;
    }, [columns]);

    const students = course?.students || [];

    const findResult = (student, col) => {
        const rows = results[col.assessmentId] || [];

        const row = rows.find(r =>
            getId(r.student) === getId(student)
        );

        if (!row) return null;

        const mark = (row.obtainedMarks || []).find(
            m => Number(m.questionIndex) === col.questionIndex
        );

        return mark?.marks == null ? null : number(mark.marks);
    };

    const weightedMark = (student, col) => {
        const mark = findResult(student, col);
        if (mark === null || col.maxMarks <= 0) return null;
        return mark / col.maxMarks * col.weight;
    };

    const exportData = () => {
        return [
            [
                'Registration No.',
                'Name',
                ...columns.map(c =>
                    `${c.cloCode} | ${c.activity} | ${c.question}`
                )
            ],
            [
                '',
                '% Weight',
                ...columns.map(c => fmt(c.weight))
            ],
            ...students.map(student => [
                student.regNo,
                student.name,
                ...columns.map(c => {
                    const mark = weightedMark(student, c);
                    return mark === null ? '' : fmt(mark);
                })
            ])
        ];
    };

    const downloadExcel = () => {
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(exportData());
        ws['!cols'] = [
            { wch: 24 },
            { wch: 28 },
            ...columns.map(() => ({ wch: 18 }))
        ];
        XLSX.utils.book_append_sheet(wb, ws, 'Marks OBE');
        XLSX.writeFile(wb, `Marks-OBE-${course?.code || courseId}.xlsx`);
    };

    const downloadPDF = () => {
        const doc = new jsPDF('landscape', 'mm', 'a3');
        doc.setFontSize(15);
        doc.text('Marks (OBE)', 14, 15);

        autoTable(doc, {
            startY: 23,
            head: [exportData()[0], exportData()[1]],
            body: exportData().slice(2),
            theme: 'grid',
            styles: {
                fontSize: 6,
                cellPadding: 2,
                overflow: 'linebreak'
            },
            headStyles: { fillColor: [102, 51, 153] },
            horizontalPageBreak: true,
            horizontalPageBreakRepeat: [0, 1]
        });

        doc.save(`Marks-OBE-${course?.code || courseId}.pdf`);
    };

    if (loading) {
        return (
            <div className="text-center p-5">
                <Spinner animation="border" />
                <p className="mt-2">Loading Marks OBE...</p>
            </div>
        );
    }

    if (error) return <Alert variant="danger">{error}</Alert>;

    return (
        <Card className="border rounded-3 shadow-sm">
            <Card.Body className="p-4">
                <h4 className="fw-normal mb-3">Marks (OBE)</h4>

                <div className="d-flex justify-content-end gap-2 mb-4">
                    <Button variant="outline-success" onClick={downloadPDF}>
                        PDF
                    </Button>
                    <Button variant="outline-success" onClick={downloadExcel}>
                        Excel
                    </Button>
                </div>

                {columns.length === 0 ? (
                    <Alert variant="info">
                        No OBE-mapped assessment questions found.
                    </Alert>
                ) : (
                    <div
                        style={{
                            overflowX: 'auto',
                            width: '100%',
                            border: '1px solid #ddd'
                        }}
                    >
                        <Table
                            bordered
                            className="mb-0"
                            style={{
                                minWidth: Math.max(
                                    950,
                                    330 + columns.length * 100
                                ),
                                fontSize: '0.88rem',
                                borderColor: '#aaa'
                            }}
                        >
                            <thead>
                                <tr>
                                    <th colSpan={2} className="text-center">
                                        CLO
                                    </th>
                                    {cloGroups.map(group => (
                                        <th
                                            key={group.cloId}
                                            colSpan={group.count}
                                            className="text-center"
                                            style={{ color: '#663399' }}
                                        >
                                            {group.code}
                                        </th>
                                    ))}
                                </tr>

                                <tr>
                                    <th colSpan={2} className="text-center">
                                        Activity
                                    </th>
                                    {columns.map(c => (
                                        <th
                                            key={c.key}
                                            className="text-center align-bottom"
                                            style={{
                                                color: '#663399',
                                                minWidth: 100,
                                                height: 155
                                            }}
                                        >
                                            {c.activity}
                                        </th>
                                    ))}
                                </tr>

                                <tr>
                                    <th colSpan={2}></th>
                                    {columns.map(c => (
                                        <th
                                            key={c.key}
                                            className="text-center"
                                        >
                                            {c.question}
                                        </th>
                                    ))}
                                </tr>

                                <tr>
                                    <th colSpan={2} className="text-center">
                                        % Weight
                                    </th>
                                    {columns.map(c => (
                                        <th key={c.key} className="text-center">
                                            {fmt(c.weight)}
                                        </th>
                                    ))}
                                </tr>

                                <tr>
                                    <th colSpan={2}>&nbsp;</th>
                                    {columns.map(c => (
                                        <th key={c.key}>&nbsp;</th>
                                    ))}
                                </tr>

                                <tr>
                                    <th>Registration No.</th>
                                    <th>Name</th>
                                    {columns.map(c => (
                                        <th key={c.key} className="text-center">
                                            {fmt(c.weight)}
                                        </th>
                                    ))}
                                </tr>
                            </thead>

                            <tbody>
                                {students.map(student => (
                                    <tr key={getId(student)}>
                                        <td
                                            style={{
                                                color: '#663399',
                                                minWidth: 170
                                            }}
                                        >
                                            {student.regNo}
                                        </td>
                                        <td style={{ minWidth: 160 }}>
                                            {student.name}
                                        </td>
                                        {columns.map(c => {
                                            const mark = weightedMark(student, c);
                                            return (
                                                <td
                                                    key={c.key}
                                                    className="text-center"
                                                >
                                                    {mark === null
                                                        ? '—'
                                                        : fmt(mark)}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </div>
                )}

                <div className="mt-4" style={{ fontSize: '0.9rem' }}>
                    <p className="mb-2" style={{ color: 'blue' }}>
                        * any blue color means activity is CQI based activity
                    </p>
                    <p className="mb-0" style={{ color: 'red' }}>
                        ** any red color means some KPI is not achieved
                    </p>
                </div>
            </Card.Body>
        </Card>
    );
}
