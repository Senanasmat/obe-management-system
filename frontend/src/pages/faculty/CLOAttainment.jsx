
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
    Card,
    Button,
    Form,
    Spinner,
    Table,
    Alert
} from 'react-bootstrap';
import { FileDown } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const PURPLE = '#663399';
const KPI = 50;

const getId = (value) =>
    typeof value === 'object' && value !== null
        ? String(value._id || '')
        : String(value || '');

const validPercentage = (value) => {
    if (value === null || value === undefined || value === '') {
        return null;
    }

    const number = Number(value);
    return Number.isFinite(number) ? number : null;
};

export default function CLOAttainment() {
    const { courseId } = useParams();
    const { user } = useAuth();

    const [course, setCourse] = useState(null);
    const [clos, setClos] = useState([]);
    const [students, setStudents] = useState([]);
    const [studentResults, setStudentResults] = useState({});
    const [loading, setLoading] = useState(true);
    const [calculating, setCalculating] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [error, setError] = useState('');

    // The existing backend provides recorded-mark percentages.
    // Other calculation modes will be enabled after backend support.
    const [marksMode, setMarksMode] = useState('without');
    const [weightMode, setWeightMode] = useState('actual');

    useEffect(() => {
        let cancelled = false;

        const loadCourse = async () => {
            setLoading(true);
            setShowResults(false);
            setStudentResults({});
            setError('');

            try {
                const config = {
                    headers: {
                        Authorization: `Bearer ${user.token}`
                    }
                };

                const response = await api.get(
                    '/api/assignments/my',
                    config
                );

                const assignment = (response.data || []).find(
                    (item) => getId(item.course) === courseId
                );

                if (!assignment) {
                    throw new Error(
                        'This course is not assigned to your faculty account.'
                    );
                }

                if (cancelled) return;

                setCourse(assignment.course);
                setClos(assignment.course.clos || []);
                setStudents(assignment.course.students || []);
            } catch (err) {
                if (!cancelled) {
                    setError(
                        err.response?.data?.message ||
                        err.message ||
                        'Unable to load CLO attainment.'
                    );
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        if (user?.token) loadCourse();

        return () => {
            cancelled = true;
        };
    }, [courseId, user?.token]);

    const calculateResults = async () => {
        setCalculating(true);
        setError('');

        try {
            const config = {
                headers: {
                    Authorization: `Bearer ${user.token}`
                }
            };

            const results = {};

            // Load students in small groups to avoid sending
            // too many requests to the backend simultaneously.
            const batchSize = 5;

            for (let start = 0; start < students.length; start += batchSize) {
                const group = students.slice(start, start + batchSize);

                const responses = await Promise.allSettled(
                    group.map((student) =>
                        api.get(
                            `/api/faculty/courses/${courseId}/students/${student._id}/clo-analytics`,
                            {
                                ...config,
                                params: { weightMode }
                            }
                        )
                    )
                );

                responses.forEach((response, index) => {
                    const student = group[index];

                    if (response.status !== 'fulfilled') {
                        results[student._id] = {
                            error: true,
                            values: {}
                        };
                        return;
                    }

                    const values = {};

                    (response.value.data.cloStats || []).forEach((stat) => {
                        const percentage = validPercentage(stat.percentage);

                        const cloId = getId(
                            stat.cloId || stat.clo?._id || stat.clo
                        );
                        
                        const cloResult = {
                            percentage,
                            obtainedMarks: Number(stat.obtainedMarks ?? 0),
                            totalMarks: Number(stat.totalMarks ?? 0),
                            achieved: Boolean(stat.achieved),
                            totalWeight: Number(stat.totalWeight ?? 0)
                        };

                        if (cloId) {
                            values[cloId] = cloResult;
                        }

                        if (stat.cloCode) {
                            values[`code:${stat.cloCode}`] = cloResult;
                        }

                    });

                    results[student._id] = {
                        error: false,
                        values
                    };
                });
            }

            setStudentResults(results);
            setShowResults(true);

            const failedCount = Object.values(results).filter(
                (result) => result.error
            ).length;

            if (failedCount > 0) {
                setError(
                    `Unable to load CLO results for ${failedCount} student(s). Their values are shown as unavailable.`
                );
            }
        } catch (err) {
            setError(
                err.response?.data?.message ||
                'Unable to calculate CLO attainment.'
            );
        } finally {
            setCalculating(false);
        }
    };

    
    const getCLOResult = (student, clo) => {
        const record = studentResults[student._id];

        if (!record || record.error) return null;

        const byId = record.values[getId(clo)];
        const byCode = record.values[`code:${clo.code}`];

        return byId !== undefined ? byId : byCode ?? null;
    };

    const getPercentage = (student, clo) => {
        return getCLOResult(student, clo)?.percentage ?? null;
    };


    const downloadPDF = () => {
        if (!showResults) return;

        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a3'
        });

        doc.setFontSize(17);
        doc.text('CLOs Attainment', 14, 18);

        doc.setFontSize(10);
        doc.text(
            `${course?.code || ''} - ${course?.name || ''}`,
            14,
            26
        );

        doc.text(`KPI: ${KPI}%`, 14, 32);

        const head = [
            [
                'Registration No.',
                'Name',
                ...clos.flatMap((clo) => [
                    `${clo.code} Weighted Total (%)`,
                    `${clo.code} Achieved`
                ])
            ]
        ];

        const body = students.map((student) => [
            student.regNo || '',
            student.name || '',
            ...clos.flatMap((clo) => {
                const result = getCLOResult(student, clo);
                const percentage = result?.percentage ?? null;

                return [
                    percentage === null
                        ? '—'
                        : percentage.toFixed(2),
                    percentage === null
                        ? '—'
                        : result.achieved
                            ? 'Y'
                            : 'N'
                ];
            })
        ]);

        autoTable(doc, {
            head,
            body,
            startY: 38,
            theme: 'grid',
            styles: {
                fontSize: 8,
                cellPadding: 2.5,
                overflow: 'linebreak'
            },
            headStyles: {
                fillColor: [102, 51, 153]
            },
            didParseCell: (data) => {
                if (
                    data.section === 'body' &&
                    data.column.index >= 2 &&
                    data.column.index % 2 === 0
                ) {
                    const value = Number(data.cell.raw);

                    if (
                        data.cell.raw !== '—' &&
                        Number.isFinite(value) &&
                        body[data.row.index][data.column.index + 1] === 'N'
                    ) {
                        data.cell.styles.textColor = [220, 0, 0];
                    }
                }
            }
        });

        doc.save(`CLO-Attainment-${course?.code || courseId}.pdf`);
    };

    if (loading) {
        return (
            <div className="text-center py-5">
                <Spinner animation="border" />
                <p className="text-muted mt-2">
                    Loading CLO attainment...
                </p>
            </div>
        );
    }

    return (
        <Card
            className="border rounded-3 shadow-sm"
            style={{ backgroundColor: '#fff' }}
        >
            <Card.Body className="p-4">
                <h4
                    className="fw-normal mb-4"
                    style={{ color: '#29243a' }}
                >
                    CLOs Attainment
                </h4>
                
                <div
                    className="d-flex flex-wrap align-items-center mb-4"
                    style={{
                        columnGap: '55px',
                        rowGap: '18px',
                        fontSize: '0.96rem'
                    }}
                >
                    {/* Marks options */}
                    <div
                        className="d-flex align-items-center"
                        style={{ gap: '24px' }}
                    >
                        <Form.Check
                            type="radio"
                            id="clo-without-marks"
                            name="clo-marks-mode"
                            label="Without Marks"
                            checked={marksMode === 'without'}
                            onChange={() => setMarksMode('without')}
                        />

                        <Form.Check
                            type="radio"
                            id="clo-with-marks"
                            name="clo-marks-mode"
                            label="With Marks"
                            checked={marksMode === 'with'}
                            onChange={() => setMarksMode('with')}
                        />
                    </div>

                    {/* Weight options */}
                    <div
                        className="d-flex align-items-center"
                        style={{ gap: '24px' }}
                    >
                        <Form.Check
                            type="radio"
                            id="clo-actual-weights"
                            name="clo-weight-mode"
                            label="Actual Weights"
                            checked={weightMode === 'actual'}
                            onChange={() => setWeightMode('actual')}
                        />

                        <Form.Check
                            type="radio"
                            id="clo-normalized-weights"
                            name="clo-weight-mode"
                            label="Normalized Weights"
                            checked={weightMode === 'normalized'}
                            onChange={() => setWeightMode('normalized')}
                        />
                    </div>

                    {/* CQI always included */}
                    <div className="d-flex align-items-center">
                    <Form.Check
                        type="checkbox"
                        id="clo-cqi-activities"
                        label="Add CQI Activities"
                        checked={true}
                        onChange={() => {}}
                        style={{
                            opacity: 1,
                            color: '#29243a',
                            fontWeight: 500
                        }}
                    />
                    </div>
                </div>

                <div className="d-flex gap-2 mb-3">
                    <Button
                        onClick={calculateResults}
                        disabled={calculating || clos.length === 0}
                        style={{
                            backgroundColor: PURPLE,
                            borderColor: PURPLE,
                            padding: '10px 20px'
                        }}
                    >
                        {calculating ? (
                            <>
                                <Spinner
                                    animation="border"
                                    size="sm"
                                    className="me-2"
                                />
                                Calculating...
                            </>
                        ) : (
                            'Show Result'
                        )}
                    </Button>

                    <Button
                        variant="outline-success"
                        onClick={downloadPDF}
                        disabled={!showResults || calculating}
                        className="d-flex align-items-center gap-2"
                    >
                        <FileDown size={16} />
                        PDF
                    </Button>
                </div>

                {error && (
                    <Alert variant="warning" className="mb-3">
                        {error}
                    </Alert>
                )}

                <div className="table-responsive">
                    <Table
                        bordered
                        className="align-middle mb-0"
                        style={{
                            minWidth: Math.max(850, 410 + clos.length * 230),
                            fontSize: '0.91rem'
                        }}
                    >
                        <thead>
                            <tr>
                                <th
                                    colSpan={2}
                                    className="text-center"
                                    style={{ width: 410 }}
                                >
                                    CLO
                                </th>

                                {clos.map((clo) => (
                                    <th
                                        key={clo._id}
                                        colSpan={2}
                                        className="text-center"
                                        style={{
                                            color: PURPLE,
                                            whiteSpace: 'nowrap'
                                        }}
                                    >
                                        {clo.code}
                                    </th>
                                ))}
                            </tr>

                            <tr>
                                <th colSpan={2} className="text-center">
                                    Activity
                                </th>

                                {clos.map((clo) => (
                                    <th
                                        key={clo._id}
                                        colSpan={2}
                                        rowSpan={2}
                                        className="text-center"
                                        style={{ minWidth: 210 }}
                                    >
                                        <div className="d-flex">
                                            <div
                                                className="w-50 px-2"
                                                style={{
                                                    borderRight:
                                                        '1px solid #dee2e6'
                                                }}
                                            >
                                                Weighted
                                                <br />
                                                Total
                                            </div>
                                            <div className="w-50 px-2">
                                                CLO
                                                <br />
                                                Achieved
                                            </div>
                                        </div>
                                    </th>
                                ))}
                            </tr>

                            <tr>
                                <th colSpan={2} className="text-center">
                                    % Weight
                                </th>
                            </tr>

                            <tr>
                                <th colSpan={2}></th>
                                {clos.map((clo) => (
                                    <th
                                        key={clo._id}
                                        colSpan={2}
                                        className="text-center"
                                    >
                                        KPI {KPI}%
                                    </th>
                                ))}
                            </tr>

                            <tr>
                                <th
                                    style={{
                                        minWidth: 190,
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    Registration No.
                                </th>

                                <th style={{ minWidth: 220 }}>
                                    Name
                                </th>

                                {clos.map((clo) => (
                                    <FragmentColumns key={clo._id} />
                                ))}
                            </tr>
                        </thead>

                        <tbody>
                            {students.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={2 + clos.length * 2}
                                        className="text-center text-muted py-4"
                                    >
                                        No students are enrolled in this course.
                                    </td>
                                </tr>
                            ) : (
                                students.map((student) => (
                                    <tr key={student._id}>
                                        <td
                                            style={{
                                                color: PURPLE,
                                                whiteSpace: 'nowrap'
                                            }}
                                        >
                                            {student.regNo}
                                        </td>

                                        <td>{student.name}</td>

                                        {clos.map((clo) => {
                                            const result = showResults
                                                ? getCLOResult(student, clo)
                                                : null;

                                            const percentage = result?.percentage ?? null;

                                            const achieved =
                                                percentage !== null &&
                                                result?.achieved === true;

                                            return (
                                                <StudentCLOCells
                                                    key={clo._id}
                                                    percentage={percentage}
                                                    achieved={achieved}
                                                    visible={showResults}
                                                    marksMode={marksMode}
                                                    obtainedMarks={result?.obtainedMarks}
                                                    totalMarks={result?.totalMarks}
                                                />
                                            );
                                        })}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </Table>
                </div>

                <div className="mt-4 small">
                    <p className="mb-2" style={{ color: '#1836d4' }}>
                        * Any blue color means activity is CQI based activity.
                    </p>

                    <p className="mb-2" style={{ color: '#dc2626' }}>
                        ** Any red color means some KPI is not achieved.
                    </p>

                    <p className="mb-0" style={{ color: '#b91c1c' }}>
                        *** CLOs without recorded assessment marks display
                        unavailable results.
                    </p>
                </div>
            </Card.Body>
        </Card>
    );
}

function FragmentColumns() {
    return (
        <>
            <th
                className="text-center"
                style={{ fontWeight: 400 }}
            ></th>
            <th
                className="text-center"
                style={{ fontWeight: 400 }}
            ></th>
        </>
    );
}


function StudentCLOCells({
    percentage,
    achieved,
    visible,
    marksMode,
    obtainedMarks,
    totalMarks
}) {
    if (!visible || percentage === null) {
        return (
            <>
                <td className="text-center text-muted">—</td>
                <td className="text-center text-muted">—</td>
            </>
        );
    }

    return (
        <>
            <td
                className="text-center"
                style={{
                    color: achieved ? '#374151' : '#ff0000'
                }}
            >
                {marksMode === 'with' ? (
                    <div>
                        <div className="fw-semibold">
                            {Number(obtainedMarks).toFixed(2)}
                            {' / '}
                            {Number(totalMarks).toFixed(2)}
                        </div>

                        <div className="small">
                            {percentage.toFixed(2)}%
                        </div>
                    </div>
                ) : (
                    percentage.toFixed(2)
                )}
            </td>

            <td
                className="text-center"
                style={{ color: '#30345a' }}
            >
                {achieved ? 'Y' : 'N'}
            </td>
        </>
    );
}

