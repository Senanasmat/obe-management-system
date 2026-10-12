
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, Form, Button, Spinner, Alert, Table } from 'react-bootstrap';
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ReferenceLine
} from 'recharts';
import { FileDown } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const PURPLE = '#663399';
const KPI = 50;

const getId = value =>
    String(value?._id || value || '');

export default function CLOAttainmentGraph() {
    const { courseId } = useParams();
    const { user } = useAuth();

    const [weightMode, setWeightMode] = useState('actual');
    const [graphMode, setGraphMode] = useState('attainment');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [graphData, setGraphData] = useState([]);
    const [hasResults, setHasResults] = useState(false);

    const showGraph = async () => {
        setLoading(true);
        setError('');
        setHasResults(false);

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
                item => getId(item.course) === courseId
            );

            if (!assignment) {
                throw new Error('Assigned course not found.');
            }

            const course = assignment.course;
            const students = course.students || [];
            const clos = course.clos || [];

            const statsByCLO = new Map(
                clos.map(clo => [
                    getId(clo),
                    {
                        clo: clo.code,
                        totalStudents: students.length,
                        attained: 0,
                        scoredStudents: 0,
                        totalNormalizedScore: 0
                    }
                ])
            );

            const batchSize = 5;

            for (
                let start = 0;
                start < students.length;
                start += batchSize
            ) {
                const batch = students.slice(
                    start,
                    start + batchSize
                );

                const responses = await Promise.allSettled(
                    batch.map(student =>
                        api.get(
                            `/api/faculty/courses/${courseId}/students/${getId(student)}/clo-analytics`,
                            {
                                ...config,
                                params: { weightMode }
                            }
                        )
                    )
                );

                responses.forEach(result => {
                    if (result.status !== 'fulfilled') return;

                    const stats = result.value.data.cloStats || [];

                    stats.forEach(stat => {
                        const item = statsByCLO.get(
                            getId(stat.cloId)
                        );

                        if (!item) return;

                        const normalizedScore =
                            Number(stat.normalizedWeight);

                        if (!Number.isFinite(normalizedScore)) {
                            return;
                        }

                        item.scoredStudents += 1;
                        item.totalNormalizedScore += normalizedScore;

                        if (stat.achieved === true) {
                            item.attained += 1;
                        }
                    });
                });
            }

            const data = [...statsByCLO.values()].map(item => ({
                ...item,
                attainmentPercentage:
                    item.totalStudents > 0
                        ? Number((
                            item.attained / item.totalStudents * 100
                        ).toFixed(2))
                        : 0,
                averageScore:
                    item.scoredStudents > 0
                        ? Number((
                            item.totalNormalizedScore /
                            item.scoredStudents
                        ).toFixed(2))
                        : 0
            }));

            setGraphData(data);
            setHasResults(true);

        } catch (err) {
            setError(
                err.response?.data?.message ||
                err.message ||
                'Unable to load CLO graph.'
            );
        } finally {
            setLoading(false);
        }
    };

    const downloadPDF = () => {
        if (!hasResults) return;

        const doc = new jsPDF({
            orientation: 'landscape',
            format: 'a4'
        });

        doc.setFontSize(17);
        doc.text('CLO Attainment Graph Report', 14, 18);

        doc.setFontSize(10);
        doc.text(
            `Weight Mode: ${weightMode} | KPI: ${KPI}%`,
            14,
            26
        );

        doc.text(
            `Graph: ${
                graphMode === 'attainment'
                    ? 'Attainment Percentage'
                    : 'Average Score'
            }`,
            14,
            32
        );

        autoTable(doc, {
            startY: 40,
            head: [[
                'CLO',
                'Total Students',
                'Students Attained',
                'Attainment %',
                'Average Score %'
            ]],
            body: graphData.map(row => [
                row.clo,
                row.totalStudents,
                row.attained,
                row.attainmentPercentage.toFixed(2),
                row.averageScore.toFixed(2)
            ]),
            headStyles: {
                fillColor: [102, 51, 153]
            }
        });

        doc.save(`CLO-Attainment-Graph-${courseId}.pdf`);
    };

    const chartKey =
        graphMode === 'attainment'
            ? 'attainmentPercentage'
            : 'averageScore';

    return (
        <Card className="border rounded-3 shadow-sm">
            <Card.Body className="p-4">
                <h4 className="fw-normal mb-4">
                    CLOs Attainment Graph
                </h4>

                <div
                    className="d-flex flex-wrap align-items-center mb-4"
                    style={{
                        columnGap: '60px',
                        rowGap: '18px'
                    }}
                >
                    <div
                        className="d-flex flex-wrap"
                        style={{ gap: '24px' }}
                    >
                        <Form.Check
                            type="radio"
                            name="graph-weight-mode"
                            label="Actual Weights"
                            checked={weightMode === 'actual'}
                            onChange={() => setWeightMode('actual')}
                        />

                        <Form.Check
                            type="radio"
                            name="graph-weight-mode"
                            label="Normalized Weights"
                            checked={weightMode === 'normalized'}
                            onChange={() => setWeightMode('normalized')}
                        />
                    </div>

                    <div
                        className="d-flex flex-wrap"
                        style={{ gap: '24px' }}
                    >
                        <Form.Check
                            type="radio"
                            name="graph-display-mode"
                            label="Attainment Percentage"
                            checked={graphMode === 'attainment'}
                            onChange={() => setGraphMode('attainment')}
                        />

                        <Form.Check
                            type="radio"
                            name="graph-display-mode"
                            label="Average Score"
                            checked={graphMode === 'average'}
                            onChange={() => setGraphMode('average')}
                        />
                    </div>

                    <Form.Check
                        type="checkbox"
                        label="Add CQI Activities"
                        checked={true}
                        onChange={() => {}}
                        style={{ opacity: 1, fontWeight: 500 }}
                    />
                </div>

                <div className="d-flex gap-3 mb-4">
                    <Button
                        onClick={showGraph}
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
                            'Show Graph'
                        )}
                    </Button>

                    <Button
                        variant="outline-success"
                        onClick={downloadPDF}
                        disabled={!hasResults || loading}
                    >
                        <FileDown size={16} className="me-2" />
                        PDF
                    </Button>
                </div>

                {error && (
                    <Alert variant="danger">{error}</Alert>
                )}

                {hasResults && (
                    <>
                        <h5 className="text-center mb-3">
                            CLO Attainment
                        </h5>

                        <div style={{ width: '100%', height: 420 }}>
                            <ResponsiveContainer>
                                <BarChart
                                    data={graphData}
                                    margin={{
                                        top: 20,
                                        right: 35,
                                        left: 15,
                                        bottom: 25
                                    }}
                                >
                                    <CartesianGrid
                                        strokeDasharray="4 4"
                                    />

                                    <XAxis dataKey="clo" />

                                    <YAxis
                                        domain={[0, 100]}
                                        tickFormatter={value => `${value}%`}
                                    />

                                    <Tooltip
                                        formatter={value => [
                                            `${Number(value).toFixed(2)}%`,
                                            graphMode === 'attainment'
                                                ? 'Students Achieved'
                                                : 'Average Score'
                                        ]}
                                    />

                                    <ReferenceLine
                                        y={KPI}
                                        stroke="#999999"
                                        strokeWidth={2}
                                        label={{
                                            value:
                                                'Required Student Achievement Threshold',
                                            position: 'insideTopRight',
                                            fill: '#999999',
                                            fontSize: 12
                                        }}
                                    />

                                    <Bar
                                        dataKey={chartKey}
                                        fill={PURPLE}
                                        maxBarSize={165}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        <p className="fw-semibold mt-3 mb-4">
                            CLO Attainment criteria in graph:
                            50% of Students, 50% of Marks
                            for this Course Section.
                        </p>

                        <div className="table-responsive">
                            <Table hover className="align-middle">
                                <thead>
                                    <tr>
                                        <th>CLOs</th>
                                        <th>Total Students</th>
                                        <th>
                                            Number of Students Attained
                                            CLO above 50%
                                        </th>
                                        <th>Attainment Percentage</th>
                                        <th>Average Score</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {graphData.map(row => (
                                        <tr key={row.clo}>
                                            <td style={{ color: PURPLE }}>
                                                {row.clo}
                                            </td>
                                            <td>{row.totalStudents}</td>
                                            <td>{row.attained}</td>
                                            <td>
                                                {row.attainmentPercentage.toFixed(2)}
                                            </td>
                                            <td>
                                                {row.averageScore.toFixed(2)}
                                            </td>
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
