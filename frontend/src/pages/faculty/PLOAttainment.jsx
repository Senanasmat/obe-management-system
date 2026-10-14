
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
    Card, Form, Button, Spinner, Alert, Table
} from 'react-bootstrap';
import { FileDown } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const KPI = 50;
const PURPLE = '#663399';

const getId = value => String(value?._id || value || '');

const round = value => Number(Number(value).toFixed(2));

export default function PLOAttainment() {
    const { courseId } = useParams();
    const { user } = useAuth();

    const [marksMode, setMarksMode] = useState('without');
    const [weightMode, setWeightMode] = useState('actual');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [results, setResults] = useState([]);
    const [showResults, setShowResults] = useState(false);

    const calculateResults = async () => {
        setLoading(true);
        setError('');
        setShowResults(false);

        try {
            const config = {
                headers: {
                    Authorization: `Bearer ${user.token}`
                }
            };

            const [assignmentsResponse, mappingsResponse] =
                await Promise.all([
                    api.get('/api/assignments/my', config),
                    api.get(
                        `/api/faculty/courses/${courseId}/clo-mappings`,
                        config
                    )
                ]);

            const assignment = assignmentsResponse.data.find(
                item => getId(item.course) === courseId
            );

            if (!assignment) {
                throw new Error('Assigned course not found.');
            }

            const course = assignment.course;
            const termId = getId(assignment.academicTerm);

            const students = course.students || [];
            const courseCloIds = new Set(
                (course.clos || []).map(getId)
            );

            const mappings = (mappingsResponse.data || []).filter(
                mapping =>
                    courseCloIds.has(getId(mapping.clo)) &&
                    getId(mapping.academicTerm) === termId &&
                    mapping.plo
            );

            const batchMap = new Map();

            students.forEach(student => {
                const batch = student.batch || 'Unknown Batch';

                if (!batchMap.has(batch)) {
                    batchMap.set(batch, []);
                }

                batchMap.get(batch).push(student);
            });

            const analyticsByStudent = new Map();
            const batchSize = 5;

            for (let i = 0; i < students.length; i += batchSize) {
                const batch = students.slice(i, i + batchSize);

                const responses = await Promise.allSettled(
                    batch.map(student =>
                        api.get(
                            `/api/faculty/courses/${courseId}/students/${getId(student)}/clo-analytics`,
                            {
                                ...config,
                                params: { weightMode: 'normalized' }
                            }
                        )
                    )
                );

                responses.forEach((response, index) => {
                    if (response.status === 'fulfilled') {
                        analyticsByStudent.set(
                            getId(batch[index]),
                            response.value.data.cloStats || []
                        );
                    }
                });
            }

            const output = [];

            for (const [batchName, batchStudents] of batchMap) {
                const batchMappings = mappings.filter(
                    mapping => mapping.batch === batchName
                );

                const ploMap = new Map();

                batchMappings.forEach(mapping => {
                    const ploId = getId(mapping.plo);
                    const cloId = getId(mapping.clo);

                    if (!ploMap.has(ploId)) {
                        ploMap.set(ploId, {
                            ploId,
                            ploCode: mapping.plo.code || 'PLO',
                            cloIds: new Set()
                        });
                    }

                    ploMap.get(ploId).cloIds.add(cloId);
                });

                const plos = [...ploMap.values()].sort(
                    (a, b) => a.ploCode.localeCompare(
                        b.ploCode,
                        undefined,
                        { numeric: true }
                    )
                );

                const rows = batchStudents.map(student => {
                    const cloStats =
                        analyticsByStudent.get(getId(student)) || [];

                    const cloById = new Map(
                        cloStats.map(stat => [
                            getId(stat.cloId),
                            stat
                        ])
                    );

                    const ploResults = {};

                    plos.forEach(plo => {
                        let obtained = 0;
                        let maximum = 0;
                        const cloPercentages = [];

                        plo.cloIds.forEach(cloId => {
                            const stat = cloById.get(cloId);

                            if (!stat) return;

                            const got = Number(stat.obtainedMarks);
                            const max = Number(stat.totalMarks);
                            const actualWeight =
                                Number(stat.actualWeight);
                            const weight = Number(stat.totalWeight);

                            if (
                                !Number.isFinite(got) ||
                                !Number.isFinite(max) ||
                                max <= 0
                            ) return;

                            obtained += got;
                            maximum += max;

                            const cloPercentage =
                                weightMode === 'normalized' &&
                                Number.isFinite(actualWeight) &&
                                Number.isFinite(weight) &&
                                weight > 0
                                    ? actualWeight / weight * 100
                                    : got / max * 100;

                            cloPercentages.push(cloPercentage);
                        });

                        if (maximum <= 0) {
                            ploResults[plo.ploId] = null;
                            return;
                        }

                        // The admin dashboard averages CLO attainment per PLO.
                        // Keep the same per-CLO averaging here so a PLO is not
                        // skewed toward CLOs with more marks available.
                        const percentage = cloPercentages.reduce(
                            (sum, value) => sum + value,
                            0
                        ) / cloPercentages.length;

                        const achieved = percentage >= KPI;

                        ploResults[plo.ploId] = {
                            obtainedMarks: round(obtained),
                            totalMarks: round(maximum),
                            percentage: round(percentage),
                            achieved
                        };
                    });

                    return {
                        studentId: getId(student),
                        regNo: student.regNo || '',
                        name: student.name || '',
                        ploResults
                    };
                });

                output.push({
                    batch: batchName,
                    plos: plos.map(plo => ({
                        ploId: plo.ploId,
                        ploCode: plo.ploCode
                    })),
                    rows
                });
            }

            setResults(output);
            setShowResults(true);

        } catch (err) {
            setError(
                err.response?.data?.message ||
                err.message ||
                'Failed to calculate PLO attainment.'
            );
        } finally {
            setLoading(false);
        }
    };

    const downloadPDF = () => {
        if (!showResults) return;

        const doc = new jsPDF({
            orientation: 'landscape',
            format: 'a4'
        });

        let first = true;

        results.forEach(group => {
            if (!first) doc.addPage();
            first = false;

            doc.setFontSize(16);
            doc.text('PLOs Attainment', 14, 18);

            doc.setFontSize(10);
            doc.text(
                `Batch: ${group.batch} | Weight Mode: ${weightMode}`,
                14,
                26
            );

            const head = [
                'Reg No.',
                'Student Name',
                ...group.plos.flatMap(plo => [
                    `${plo.ploCode} Weighted Total`,
                    `${plo.ploCode} Achieved`
                ])
            ];

            const body = group.rows.map(row => [
                row.regNo,
                row.name,
                ...group.plos.flatMap(plo => {
                    const result = row.ploResults[plo.ploId];

                    if (!result) return ['—', '—'];

                    return [
                        result.percentage.toFixed(2),
                        result.achieved ? 'Y' : 'N'
                    ];
                })
            ]);

            autoTable(doc, {
                startY: 34,
                head: [head],
                body,
                styles: {
                    fontSize: 7,
                    cellPadding: 2
                },
                headStyles: {
                    fillColor: [102, 51, 153]
                }
            });
        });

        doc.save(`PLO-Attainment-${courseId}.pdf`);
    };

    return (
        <Card className="border rounded-3 shadow-sm">
            <Card.Body className="p-4">
                <h4 className="fw-normal mb-4">
                    PLOs Attainment
                </h4>

                <div
                    className="d-flex flex-wrap align-items-center mb-4"
                    style={{
                        columnGap: '55px',
                        rowGap: '18px'
                    }}
                >
                    <div
                        className="d-flex align-items-center"
                        style={{ gap: '24px' }}
                    >
                        <Form.Check
                            type="radio"
                            name="plo-marks-mode"
                            label="Without Marks"
                            checked={marksMode === 'without'}
                            onChange={() => setMarksMode('without')}
                        />

                        <Form.Check
                            type="radio"
                            name="plo-marks-mode"
                            label="With Marks"
                            checked={marksMode === 'with'}
                            onChange={() => setMarksMode('with')}
                        />
                    </div>

                    <div
                        className="d-flex align-items-center"
                        style={{ gap: '24px' }}
                    >
                        <Form.Check
                            type="radio"
                            name="plo-weight-mode"
                            label="Actual Weights"
                            checked={weightMode === 'actual'}
                            onChange={() => setWeightMode('actual')}
                        />

                        <Form.Check
                            type="radio"
                            name="plo-weight-mode"
                            label="Normalized Weights"
                            checked={weightMode === 'normalized'}
                            onChange={() => setWeightMode('normalized')}
                        />
                    </div>

                    <Form.Check
                        type="checkbox"
                        label="Add CQI Activities"
                        checked={true}
                        onChange={() => {}}
                        style={{
                            opacity: 1,
                            fontWeight: 500
                        }}
                    />
                </div>

                <div className="d-flex gap-3 mb-4">
                    <Button
                        onClick={calculateResults}
                        disabled={loading}
                        style={{
                            backgroundColor: PURPLE,
                            borderColor: PURPLE
                        }}
                    >
                        {loading ? (
                            <>
                                <Spinner
                                    size="sm"
                                    animation="border"
                                    className="me-2"
                                />
                                Loading...
                            </>
                        ) : (
                            'Show Result'
                        )}
                    </Button>

                    <Button
                        variant="outline-success"
                        onClick={downloadPDF}
                        disabled={!showResults || loading}
                    >
                        <FileDown size={16} className="me-2" />
                        PDF
                    </Button>
                </div>

                {error && (
                    <Alert variant="danger">{error}</Alert>
                )}

                {showResults && (
                    results.every(group => group.plos.length === 0)
                        ? (
                            <Alert variant="info">
                                No CLO-to-PLO mappings found for
                                this course's academic term and
                                enrolled student batches.
                            </Alert>
                        )
                        : results.map(group => (
                            <div
                                key={group.batch}
                                className="mb-5"
                            >
                                <h5 className="mb-3">
                                    Program Batch: {group.batch}
                                </h5>

                                {group.plos.length === 0 ? (
                                    <Alert variant="secondary">
                                        No mapped PLOs for this batch.
                                    </Alert>
                                ) : (
                                    
                                    <div className="table-responsive">
                                        <Table
                                            bordered
                                            className="align-middle mb-0"
                                            style={{
                                                fontSize: '0.9rem',
                                                borderColor: '#dedede',
                                                color: '#343a40'
                                            }}
                                        >
                                            <colgroup>
                                                <col style={{ width: '28%' }} />
                                                <col style={{ width: '22%' }} />

                                                {group.plos.flatMap(plo => [
                                                    <col
                                                        key={`${plo.ploId}-total`}
                                                        style={{
                                                            width: `${25 / group.plos.length}%`
                                                        }}
                                                    />,
                                                    <col
                                                        key={`${plo.ploId}-achieved`}
                                                        style={{
                                                            width: `${25 / group.plos.length}%`
                                                        }}
                                                    />
                                                ])}
                                            </colgroup>
                                            
                                            <thead style={{ color: '#343a40' }}>
                                                {/* Row 1: PLO headings */}
                                                <tr>
                                                    <th colSpan={2} className="text-center py-2">
                                                        PLO
                                                    </th>

                                                    {group.plos.map(plo => (
                                                        <th
                                                            key={plo.ploId}
                                                            colSpan={2}
                                                            className="text-center py-2"
                                                            style={{ color: '#663399' }}
                                                        >
                                                            {plo.ploCode}
                                                        </th>
                                                    ))}
                                                </tr>

                                                {/* Row 2: Activity and result headings */}
                                                <tr>
                                                    <th colSpan={2} className="text-center py-2">
                                                        Activity
                                                    </th>

                                                    {group.plos.flatMap(plo => [
                                                        <th
                                                            key={`${plo.ploId}-total`}
                                                            rowSpan={3}
                                                            className="text-center align-middle"
                                                        >
                                                            Weighted Total
                                                        </th>,
                                                        <th
                                                            key={`${plo.ploId}-achieved`}
                                                            rowSpan={3}
                                                            className="text-center align-middle"
                                                        >
                                                            PLO
                                                            <div>Achieved</div>
                                                        </th>
                                                    ])}
                                                </tr>

                                                {/* Row 3: Assigned CLO */}
                                                <tr>
                                                    <th colSpan={2} className="text-center py-2">
                                                        Assigned CLO
                                                    </th>
                                                </tr>

                                                {/* Row 4: Weight */}
                                                <tr>
                                                    <th colSpan={2} className="text-center py-2">
                                                        % Weight
                                                    </th>
                                                </tr>

                                                {/* Row 5: KPI */}
                                                <tr>
                                                    <th colSpan={2} className="py-2">
                                                        &nbsp;
                                                    </th>

                                                    {group.plos.map(plo => (
                                                        <th
                                                            key={`${plo.ploId}-kpi`}
                                                            colSpan={2}
                                                            className="text-center py-2"
                                                        >
                                                            KPI 50%
                                                        </th>
                                                    ))}
                                                </tr>

                                                {/* Row 6: Student columns */}
                                                <tr>
                                                    <th className="py-2">
                                                        Registration No.
                                                    </th>

                                                    <th className="py-2">
                                                        Name
                                                    </th>

                                                    {group.plos.flatMap(plo => [
                                                        <th key={`${plo.ploId}-empty-total`} />,
                                                        <th key={`${plo.ploId}-empty-achieved`} />
                                                    ])}
                                                </tr>
                                            </thead>

                                            <tbody>
                                                {group.rows.map(row => (
                                                    <tr key={row.studentId}>
                                                        <td className="py-2" style={{ color: '#663399' }}>
                                                            {row.regNo}
                                                        </td>

                                                        <td className="py-2">{row.name}</td>

                                                        {group.plos.flatMap(plo => {
                                                            const result = row.ploResults[plo.ploId];

                                                            return [
                                                                <td
                                                                    key={`${plo.ploId}-score`}
                                                                    className="text-center py-2"
                                                                    style={{
                                                                        color: result && !result.achieved
                                                                            ? '#ff0000'
                                                                            : '#343a40'
                                                                    }}
                                                                >
                                                                    {!result ? '—' : (
                                                                        <>
                                                                            {marksMode === 'with' && (
                                                                                <div className="small text-muted">
                                                                                    {result.obtainedMarks}/{result.totalMarks}
                                                                                </div>
                                                                            )}
                                                                            {result.percentage.toFixed(2)}
                                                                        </>
                                                                    )}
                                                                </td>,
                                                                <td
                                                                    key={`${plo.ploId}-status`}
                                                                    className="text-center py-2"
                                                                >
                                                                    {!result ? '—' : result.achieved ? 'Y' : 'N'}
                                                                </td>
                                                            ];
                                                        })}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </Table>
                                    </div>
                                )}

                                <div className="mt-5 mb-4" style={{ fontSize: '0.9rem' }}>
                                    <p className="mb-2" style={{ color: '#0000ff' }}>
                                        * any blue color means activity is CQI based activity
                                    </p>

                                    <p className="mb-0" style={{ color: '#ff0000' }}>
                                        ** any red color means some KPI is not achieved
                                    </p>
                                </div>
                            </div>
                        ))
                )}
            </Card.Body>
        </Card>
    );
}
