
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, Form, Button, Spinner, Alert, Table } from 'react-bootstrap';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const getId = value => String(value?._id || value || '');

export default function PLOAttainmentGraph() {
    const { courseId } = useParams();
    const { user } = useAuth();

    const [weightMode, setWeightMode] = useState('normalized');
    const [graphMode, setGraphMode] = useState('attainment');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [groups, setGroups] = useState([]);
    const [visible, setVisible] = useState(false);

    const showGraph = async () => {
        setLoading(true);
        setError('');
        setVisible(false);

        try {
            const config = {
                headers: { Authorization: `Bearer ${user.token}` }
            };

            const [assignmentResponse, mappingResponse] =
                await Promise.all([
                    api.get('/api/assignments/my', config),
                    api.get(
                        `/api/faculty/courses/${courseId}/clo-mappings`,
                        config
                    )
                ]);

            const assignment = assignmentResponse.data.find(
                item => getId(item.course) === courseId
            );

            if (!assignment) {
                throw new Error('Assigned course not found.');
            }

            const students = assignment.course.students || [];
            const termId = getId(assignment.academicTerm);
            const courseCloIds = new Set(
                (assignment.course.clos || []).map(getId)
            );

            const mappings = (mappingResponse.data || []).filter(
                mapping =>
                    mapping.plo &&
                    courseCloIds.has(getId(mapping.clo)) &&
                    getId(mapping.academicTerm) === termId
            );

            const studentStats = new Map();

            for (let i = 0; i < students.length; i += 5) {
                const chunk = students.slice(i, i + 5);

                const responses = await Promise.allSettled(
                    chunk.map(student =>
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
                        studentStats.set(
                            getId(chunk[index]),
                            response.value.data.cloStats || []
                        );
                    }
                });
            }

            const batchNames = [
                ...new Set(students.map(s => s.batch || 'Unknown Batch'))
            ].sort();

            const output = batchNames.map(batch => {
                const batchStudents = students.filter(
                    s => (s.batch || 'Unknown Batch') === batch
                );

                const ploMap = new Map();

                mappings
                    .filter(mapping => mapping.batch === batch)
                    .forEach(mapping => {
                        const ploId = getId(mapping.plo);

                        if (!ploMap.has(ploId)) {
                            ploMap.set(ploId, {
                                ploId,
                                ploCode: mapping.plo.code,
                                cloIds: new Set()
                            });
                        }

                        ploMap.get(ploId).cloIds.add(
                            getId(mapping.clo)
                        );
                    });

                const chartData = [...ploMap.values()].map(plo => {
                    let achievedCount = 0;
                    let assessedCount = 0;
                    let scoreSum = 0;

                    batchStudents.forEach(student => {
                        const stats =
                            studentStats.get(getId(student)) || [];

                        const relevant = stats.filter(
                            stat => plo.cloIds.has(getId(stat.cloId)) &&
                                Number(stat.totalMarks) > 0
                        );

                        if (!relevant.length) return;

                        const obtained = relevant.reduce(
                            (sum, stat) =>
                                sum + Number(stat.actualWeight || 0),
                            0
                        );

                        const totalWeight = relevant.reduce(
                            (sum, stat) =>
                                sum + Number(stat.totalWeight || 0),
                            0
                        );

                        const totalMarks = relevant.reduce(
                            (sum, stat) =>
                                sum + Number(stat.totalMarks || 0),
                            0
                        );

                        const obtainedMarks = relevant.reduce(
                            (sum, stat) =>
                                sum + Number(stat.obtainedMarks || 0),
                            0
                        );

                        const score = totalWeight > 0
                            ? obtained / totalWeight * 100
                            : totalMarks > 0
                                ? obtainedMarks / totalMarks * 100
                                : 0;

                        assessedCount++;
                        scoreSum += score;

                        if (score >= 50) achievedCount++;
                    });

                    return {
                        plo: plo.ploCode,
                        attainment: batchStudents.length
                            ? achievedCount / batchStudents.length * 100
                            : 0,
                        average: assessedCount
                            ? scoreSum / assessedCount
                            : 0,
                        achievedCount,
                        totalStudents: batchStudents.length
                    };
                }).sort((a, b) =>
                    a.plo.localeCompare(b.plo, undefined, {
                        numeric: true
                    })
                );

                return { batch, chartData };
            });

            setGroups(output);
            setVisible(true);
        } catch (err) {
            setError(
                err.response?.data?.message ||
                err.message ||
                'Unable to load PLO graph.'
            );
        } finally {
            setLoading(false);
        }
    };

    const downloadPDF = () => {
        const doc = new jsPDF();

        groups.forEach((group, index) => {
            if (index > 0) doc.addPage();

            doc.setFontSize(15);
            doc.text(`PLO Attainment Graph - ${group.batch}`, 14, 18);

            autoTable(doc, {
                startY: 28,
                head: [[
                    'PLO', 'Attainment %', 'Average Score %',
                    'Students Achieved', 'Total Students'
                ]],
                body: group.chartData.map(item => [
                    item.plo,
                    item.attainment.toFixed(2),
                    item.average.toFixed(2),
                    item.achievedCount,
                    item.totalStudents
                ]),
                headStyles: { fillColor: [102, 51, 153] }
            });
        });

        doc.save(`PLO-Attainment-Graph-${courseId}.pdf`);
    };

    
    return (
        <Card className="border rounded-3 shadow-sm">
            <Card.Body className="p-4">
                <h4 className="fw-normal mb-4">
                    PLOs Attainment Graph
                </h4>

                {/* Reference-style options */}
                <div
                    className="mb-4"
                    style={{
                        display: 'grid',
                        gridTemplateColumns:
                            'repeat(auto-fit, minmax(340px, 1fr))',
                        columnGap: '55px',
                        rowGap: '18px'
                    }}
                >
                    <div className="d-flex flex-wrap gap-4">
                        <Form.Check
                            type="radio"
                            name="plo-graph-weight"
                            label="Actual Weights"
                            checked={weightMode === 'actual'}
                            onChange={() => setWeightMode('actual')}
                        />
                        <Form.Check
                            type="radio"
                            name="plo-graph-weight"
                            label="Normalized Weights"
                            checked={weightMode === 'normalized'}
                            onChange={() => setWeightMode('normalized')}
                        />
                    </div>

                    <div className="d-flex flex-wrap gap-4">
                        <Form.Check
                            type="radio"
                            name="plo-graph-mode"
                            label="Attainment Percentage"
                            checked={graphMode === 'attainment'}
                            onChange={() => setGraphMode('attainment')}
                        />
                        <Form.Check
                            type="radio"
                            name="plo-graph-mode"
                            label="Average Score"
                            checked={graphMode === 'average'}
                            onChange={() => setGraphMode('average')}
                        />
                    </div>

                    <div />

                    <div className="d-flex flex-wrap gap-4">
                        <Form.Check
                            type="checkbox"
                            label="Add CQI Activities"
                            checked={true}
                            onChange={() => {}}
                        />
                    </div>
                </div>

                <div className="d-flex gap-3 mb-5">
                    <Button
                        onClick={showGraph}
                        disabled={loading}
                        style={{
                            backgroundColor: '#663399',
                            borderColor: '#663399',
                            padding: '10px 20px'
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
                        ) : 'Show Graph'}
                    </Button>

                    <Button
                        variant="outline-success"
                        disabled={!visible || loading}
                        onClick={downloadPDF}
                    >
                        PDF
                    </Button>
                </div>

                {error && <Alert variant="danger">{error}</Alert>}

                {visible &&
                    groups.every(group => group.chartData.length === 0) && (
                        <Alert variant="info">
                            No mapped PLOs found for this course,
                            academic term, and enrolled batches.
                        </Alert>
                    )}

                {visible &&
                    groups
                        .filter(group => group.chartData.length > 0)
                        .map(group => (
                            <div
                                key={group.batch}
                                className="mb-5"
                            >
                                {/* Graph title */}
                                <h5
                                    className="text-center fw-normal mb-3"
                                    style={{ color: '#111' }}
                                >
                                    Program Learning Outcomes Attainment
                                    ({group.batch})
                                </h5>

                                {/* Graph */}
                                <div
                                    style={{
                                        width: '100%',
                                        height: 420,
                                        marginBottom: 35
                                    }}
                                >
                                    <ResponsiveContainer
                                        width="100%"
                                        height="100%"
                                    >
                                        <BarChart
                                            data={group.chartData}
                                            margin={{
                                                top: 10,
                                                right: 45,
                                                left: 15,
                                                bottom: 15
                                            }}
                                        >
                                            <CartesianGrid
                                                stroke="#aaa"
                                                strokeDasharray="4 5"
                                                vertical={false}
                                            />

                                            <XAxis
                                                dataKey="plo"
                                                tick={{
                                                    fontSize: 13,
                                                    fill: '#111'
                                                }}
                                                axisLine={{
                                                    stroke: '#111'
                                                }}
                                                tickLine={false}
                                            />

                                            <YAxis
                                                domain={[0, 100]}
                                                ticks={[
                                                    0, 10, 20, 30, 40,
                                                    50, 60, 70, 80, 90, 100
                                                ]}
                                                tick={{
                                                    fontSize: 12,
                                                    fill: '#111'
                                                }}
                                                axisLine={{
                                                    stroke: '#111'
                                                }}
                                                tickFormatter={value => value}
                                                label={{
                                                    value: '% Attainment',
                                                    angle: -90,
                                                    position: 'insideLeft',
                                                    style: {
                                                        fontSize: 12,
                                                        fill: '#111'
                                                    }
                                                }}
                                            />

                                            <Tooltip
                                                formatter={value =>
                                                    `${Number(value).toFixed(2)}%`
                                                }
                                            />

                                            <ReferenceLine
                                                y={50}
                                                stroke="#999"
                                                strokeWidth={2}
                                                label={{
                                                    value:
                                                        'Required Student Achievement Threshold',
                                                    position: 'insideTopRight',
                                                    fill: '#aaa',
                                                    fontSize: 11
                                                }}
                                            />

                                            <Bar
                                                dataKey={
                                                    graphMode === 'attainment'
                                                        ? 'attainment'
                                                        : 'average'
                                                }
                                                fill="#663399"
                                                maxBarSize={120}
                                            />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>

                                {/* Reference criteria heading */}
                                <h6
                                    className="fw-semibold mb-1"
                                    style={{
                                        fontSize: '0.95rem',
                                        color: '#343a40'
                                    }}
                                >
                                    PLO Attainment criteria in graph,
                                    50% of Students, 50% of Marks
                                    for this Course Section.
                                </h6>

                                {/* Reference summary table */}
                                <div className="table-responsive">
                                    <Table
                                        className="mb-0"
                                        style={{
                                            fontSize: '0.9rem'
                                        }}
                                    >
                                        <thead>
                                            <tr>
                                                <th className="py-3">
                                                    PLOs
                                                </th>
                                                <th className="py-3">
                                                    Total Students
                                                </th>
                                                <th className="py-3">
                                                    Number of Student Attained
                                                    <div>
                                                        PLO above 50%
                                                    </div>
                                                </th>
                                                <th className="py-3">
                                                    Attainment Percentage
                                                </th>
                                                <th className="py-3">
                                                    Average PLO Score
                                                </th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {group.chartData.map(item => (
                                                <tr key={item.plo}>
                                                    <td
                                                        className="py-3"
                                                        style={{
                                                            color: '#663399'
                                                        }}
                                                    >
                                                        {item.plo}
                                                    </td>
                                                    <td className="py-3">
                                                        {item.totalStudents}
                                                    </td>
                                                    <td className="py-3">
                                                        {item.achievedCount}
                                                    </td>
                                                    <td className="py-3">
                                                        {item.attainment.toFixed(2)}
                                                    </td>
                                                    <td className="py-3">
                                                        {item.average.toFixed(2)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                </div>
                            </div>
                        ))}
            </Card.Body>
        </Card>
    );

}
