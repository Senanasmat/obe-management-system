import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, Button, Spinner, Alert, Table } from 'react-bootstrap';

import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import {
    ResponsiveContainer,
    BarChart,
    Bar,
    Cell,
    LabelList,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ReferenceLine
} from 'recharts';


const KPI = 50;
const PURPLE = '#663399';
const CLO_COLORS = [
    '#4CAF50',
    '#2196F3',
    '#FF9800',
    '#AA00CC',
    '#795548',
    '#00ACC1',
    '#607D8B'
];

const getId = value => String(value?._id || value || '');
const round = value => Number(Number(value).toFixed(2));

export default function CourseConsolidatedReport() {
    const { courseId } = useParams();
    const { user } = useAuth();

    const reportRef = useRef(null);
    const [pdfLoading, setPdfLoading] = useState(false);

    const [course, setCourse] = useState(null);
    const [assignment, setAssignment] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [ploGroups, setPloGroups] = useState([]);
    const [cloStudentStats, setCloStudentStats] = useState([]);
    const [ploLoading, setPloLoading] = useState(false);
    const [ploError, setPloError] = useState('');

    useEffect(() => {
        let cancelled = false;

        const loadCourse = async () => {
            setLoading(true);
            setError('');

            try {
                const response = await api.get(
                    '/api/assignments/my',
                    {
                        headers: {
                            Authorization: `Bearer ${user.token}`
                        }
                    }
                );

                const selected = (response.data || []).find(
                    item =>
                        String(item.course?._id || item.course) ===
                        String(courseId)
                );

                if (!selected) {
                    throw new Error(
                        'This course is not assigned to your faculty account.'
                    );
                }

                if (cancelled) return;

                setAssignment(selected);
                setCourse(selected.course);
            } catch (err) {
                if (!cancelled) {
                    setError(
                        err.response?.data?.message ||
                        err.message ||
                        'Unable to load course information.'
                    );
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        if (user?.token) {
            loadCourse();
        } else {
            setLoading(false);
        }

        return () => {
            cancelled = true;
        };
    }, [courseId, user?.token]);

    const loadPLOAttainment = async () => {
        if (!assignment || !course) return;

        setPloLoading(true);
        setPloError('');
        setPloGroups([]);

        try {
            const config = {
                headers: {
                    Authorization: `Bearer ${user.token}`
                }
            };

            const mappingResponse = await api.get(
                `/api/faculty/courses/${courseId}/clo-mappings`,
                config
            );

            const students = course.students || [];
            const termId = getId(assignment.academicTerm);

            const courseCloIds = new Set(
                (course.clos || []).map(getId)
            );

            const mappings = (mappingResponse.data || []).filter(
                mapping =>
                    mapping.plo &&
                    courseCloIds.has(getId(mapping.clo)) &&
                    getId(mapping.academicTerm) === termId
            );

            const studentStats = new Map();
            let failedCount = 0;

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
                    } else {
                        failedCount++;
                    }
                });
            }

            setCloStudentStats(
                students.map(student => ({
                    studentId: getId(student),
                    regNo: student.regNo || '',
                    name: student.name || '',
                    batch: student.batch || 'Unknown Batch',
                    cloStats: studentStats.get(getId(student)) || [],
                    loaded: studentStats.has(getId(student))
                }))
            );

            const batchNames = [
                ...new Set(
                    students.map(student =>
                        student.batch || 'Unknown Batch'
                    )
                )
            ].sort();

            const groups = batchNames.map(batch => {
                const batchStudents = students.filter(
                    student =>
                        (student.batch || 'Unknown Batch') === batch
                );

                const ploMap = new Map();

                mappings
                    .filter(mapping => mapping.batch === batch)
                    .forEach(mapping => {
                        const ploId = getId(mapping.plo);

                        if (!ploMap.has(ploId)) {
                            ploMap.set(ploId, {
                                ploId,
                                ploCode: mapping.plo.code || 'PLO',
                                cloIds: new Set()
                            });
                        }

                        ploMap.get(ploId).cloIds.add(
                            getId(mapping.clo)
                        );
                    });

                const plos = [...ploMap.values()].sort(
                    (a, b) =>
                        a.ploCode.localeCompare(
                            b.ploCode,
                            undefined,
                            { numeric: true }
                        )
                );

                const rows = batchStudents.map(student => {
                    const stats = studentStats.get(getId(student));
                    const ploResults = {};

                    plos.forEach(plo => {
                        if (!stats) {
                            ploResults[plo.ploId] = null;
                            return;
                        }

                        const relevant = stats.filter(
                            stat =>
                                plo.cloIds.has(getId(stat.cloId)) &&
                                Number(stat.totalMarks) > 0
                        );

                        if (!relevant.length) {
                            ploResults[plo.ploId] = null;
                            return;
                        }

                        const obtainedWeight = relevant.reduce(
                            (sum, stat) =>
                                sum + Number(stat.actualWeight || 0),
                            0
                        );

                        const totalWeight = relevant.reduce(
                            (sum, stat) =>
                                sum + Number(stat.totalWeight || 0),
                            0
                        );

                        const obtainedMarks = relevant.reduce(
                            (sum, stat) =>
                                sum + Number(stat.obtainedMarks || 0),
                            0
                        );

                        const totalMarks = relevant.reduce(
                            (sum, stat) =>
                                sum + Number(stat.totalMarks || 0),
                            0
                        );

                        const percentage =
                            totalWeight > 0
                                ? obtainedWeight / totalWeight * 100
                                : totalMarks > 0
                                    ? obtainedMarks / totalMarks * 100
                                    : null;

                        ploResults[plo.ploId] =
                            percentage === null
                                ? null
                                : {
                                    percentage: round(percentage),
                                    achieved: percentage >= KPI
                                };
                    });

                    return {
                        studentId: getId(student),
                        regNo: student.regNo || '',
                        name: student.name || '',
                        ploResults
                    };
                });

                return { batch, plos, rows };
            });

            setPloGroups(groups);

            if (failedCount > 0) {
                setPloError(
                    `Unable to load results for ${failedCount} student(s). Their attainment values are unavailable.`
                );
            }
        } catch (err) {
            setPloError(
                err.response?.data?.message ||
                err.message ||
                'Unable to load PLO attainment.'
            );
        } finally {
            setPloLoading(false);
        }
    };

    useEffect(() => {
        if (assignment && course && user?.token) {
            loadPLOAttainment();
        }
        // Runs when the selected course assignment changes.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [assignment, course, courseId, user?.token]);

    if (loading) {
        return (
            <div className="text-center py-5">
                <Spinner animation="border" size="sm" />
                <p className="small text-muted mt-2">
                    Loading consolidated report...
                </p>
            </div>
        );
    }

    if (error) {
        return <Alert variant="danger">{error}</Alert>;
    }

    const semester = assignment?.academicTerm;
    const semesterName =
        semester?.name ||
        semester?.title ||
        (typeof semester === 'string' ? semester : '') ||
        'Not available';

    const teacherName =
        assignment?.faculty?.name ||
        course?.faculty?.name ||
        user?.name ||
        'Not available';

    const courseCode = course?.code || '';
    const courseName = course?.name || '';
    
    const cloColumns = (course?.clos || [])
        .map(clo => ({
            cloId: getId(clo),
            cloCode: clo?.code || ''
        }))
        .filter(clo => clo.cloId)
        .sort((a, b) =>
            a.cloCode.localeCompare(b.cloCode, undefined, {
                numeric: true
            })
        );
        
    const cloChartData = cloColumns.map(clo => {
        const totalStudents = cloStudentStats.length;

        const validScores = cloStudentStats
            .filter(student => student.loaded)
            .map(student =>
                student.cloStats.find(
                    stat => getId(stat.cloId) === clo.cloId
                )
            )
            .filter(stat => stat && Number(stat.totalWeight) > 0);

        const achievedCount = validScores.filter(
            stat => Number(stat.normalizedWeight) >= KPI
        ).length;

        const attainment = totalStudents > 0
            ? (achievedCount / totalStudents) * 100
            : 0;

        const average = validScores.length > 0
            ? validScores.reduce(
                (sum, stat) =>
                    sum + Number(stat.normalizedWeight || 0),
                0
            ) / validScores.length
            : null;

        return {
            clo: clo.cloCode,
            totalStudents,
            achievedCount,
            attainment: round(attainment),
            average: average === null ? null : round(average),
            hasData: validScores.length > 0
        };
    });
            
    const handleDownloadPDF = async () => {
        if (pdfLoading || ploLoading || !reportRef.current) return;

        if (ploError || cloStudentStats.some(student => !student.loaded)) {
            alert('Some student attainment data could not be loaded. Please resolve this before exporting.');
            return;
        }

        setPdfLoading(true);

        try {
            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'a4',
                compress: true
            });

            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const margin = 10;
            const bottomLimit = pageHeight - 15;
            const contentWidth = pageWidth - margin * 2;

            let y = margin;

            const addPage = () => {
                pdf.addPage();
                y = margin;
            };

            const ensureSpace = height => {
                if (y + height > bottomLimit) addPage();
            };

            const addHeading = (text, size = 13) => {
                ensureSpace(13);
                pdf.setFont('helvetica', 'bold');
                pdf.setFontSize(size);
                pdf.setTextColor(41, 36, 58);
                pdf.text(text, margin, y);
                y += 9;
            };

            const addText = (text, bold = false) => {
                ensureSpace(6);
                pdf.setFont('helvetica', bold ? 'bold' : 'normal');
                pdf.setFontSize(9);
                pdf.setTextColor(45, 45, 45);
                pdf.text(String(text), margin, y);
                y += 5.5;
            };

            const addTable = (head, body, options = {}) => {
                ensureSpace(22);

                autoTable(pdf, {
                    startY: y,
                    margin: {
                        left: margin,
                        right: margin,
                        top: margin,
                        bottom: 15
                    },
                    head,
                    body,
                    theme: 'grid',
                    showHead: 'everyPage',
                    styles: {
                        font: 'helvetica',
                        fontSize: 7,
                        cellPadding: 2,
                        valign: 'middle',
                        overflow: 'linebreak',
                        textColor: [45, 45, 45],
                        lineColor: [210, 215, 225],
                        lineWidth: 0.15
                    },
                    headStyles: {
                        fillColor: [247, 247, 250],
                        textColor: [41, 36, 58],
                        fontStyle: 'bold',
                        halign: 'center'
                    },
                    columnStyles: {
                        0: { cellWidth: 37 },
                        1: { cellWidth: 43 }
                    },
                    didParseCell: data => {
                        if (
                            options.highlightScores !== false &&
                            data.section === 'body' &&
                            data.column.index >= 2 &&
                            (data.column.index - 2) % 2 === 0
                        ) {
                            const value = Number(data.cell.raw);

                            if (
                                data.cell.raw !== 'N/A' &&
                                data.cell.raw !== '-' &&
                                data.cell.raw !== '—' &&
                                Number.isFinite(value) &&
                                value < KPI
                            ) {
                                data.cell.styles.textColor = [220, 38, 38];
                            }
                        }
                    },
                    ...options
                });

                y = pdf.lastAutoTable.finalY + 9;
            };

            const addChart = async selector => {
                const chart = reportRef.current.querySelector(selector);
                if (!chart) return;

                const canvas = await html2canvas(chart, {
                    scale: 2,
                    useCORS: true,
                    backgroundColor: '#ffffff',
                    logging: false
                });

                if (!canvas.width || !canvas.height) return;

                const maxHeight = 95;
                const imageHeight = Math.min(
                    (canvas.height / canvas.width) * contentWidth,
                    maxHeight
                );

                const imageWidth =
                    (canvas.width / canvas.height) * imageHeight;

                ensureSpace(imageHeight + 7);

                pdf.addImage(
                    canvas.toDataURL('image/png'),
                    'PNG',
                    margin + (contentWidth - imageWidth) / 2,
                    y,
                    imageWidth,
                    imageHeight
                );

                y += imageHeight + 7;
            };

            // REPORT HEADER
            addHeading('Course Section Consolidated Report', 16);
            y += 2;

            addText(`Course: ${courseCode} - ${courseName}`);
            addText(
                `Course Section: ${
                    course?.section || `${courseCode} - ${semesterName}`
                }`
            );
            addText(`Teacher: ${teacherName}`);
            addText(`Semester: ${semesterName}`);

            y += 5;

            // PLO ATTAINMENT
            addHeading('PLO Attainment', 13);

            for (const group of ploGroups) {
                addHeading(`Program Batch: ${group.batch}`, 10);

                if (!group.plos.length) {
                    addText('No PLO mappings available for this batch.');
                    continue;
                }

                const ploHead = [
                    [
                        'Registration No.',
                        'Name',
                        ...group.plos.flatMap(plo => [
                            `${plo.ploCode}\nWeighted Total (%)`,
                            `${plo.ploCode}\nAchieved`
                        ])
                    ]
                ];

                const ploBody = group.rows.map(student => [
                    student.regNo,
                    student.name,
                    ...group.plos.flatMap(plo => {
                        const result = student.ploResults[plo.ploId];

                        return [
                            result ? result.percentage.toFixed(2) : 'N/A',
                            result ? (result.achieved ? 'Y' : 'N') : '—'
                        ];
                    })
                ]);

                addTable(ploHead, ploBody, {
                    styles: {
                        fontSize: group.plos.length > 5 ? 5.5 : 7,
                        cellPadding: 1.7,
                        overflow: 'linebreak'
                    }
                });

                const summary = group.plos.map(plo => {
                    const scores = group.rows
                        .map(student => student.ploResults[plo.ploId])
                        .filter(Boolean);

                    const attained = scores.filter(
                        result => result.achieved
                    ).length;

                    const total = group.rows.length;

                    const percentage = total
                        ? (attained / total) * 100
                        : 0;

                    const average = scores.length
                        ? scores.reduce(
                            (sum, result) => sum + result.percentage,
                            0
                        ) / scores.length
                        : null;

                    return {
                        code: plo.ploCode,
                        total,
                        attained,
                        percentage,
                        average
                    };
                });

                ensureSpace(110);

                addHeading(
                    `Program Learning Outcomes Attainment (${group.batch})`,
                    10
                );

                await addChart(
                    `[data-pdf-plo-chart="${CSS.escape(group.batch)}"]`
                );

                addText(
                    'PLO Attainment criteria: 50% of Students, 50% of Marks.'
                );

                addTable(
                    [[
                        'PLOs',
                        'Total Students',
                        'Students Attained',
                        'Attainment %',
                        'Average Score'
                    ]],
                    summary.map(item => [
                        item.code,
                        item.total,
                        item.attained,
                        item.percentage.toFixed(2),
                        item.average === null
                            ? 'N/A'
                            : item.average.toFixed(2)
                    ]),
                    {
                        theme: 'striped',
                        columnStyles: {},
                        highlightScores: false
                    }
                );
            }

            // CLO ATTAINMENT
            if (y > margin) {
                addPage();
            }

            addHeading('CLO Attainment', 13);

            if (cloColumns.length) {
                const cloHead = [
                    [
                        'Registration No.',
                        'Name',
                        ...cloColumns.flatMap(clo => [
                            `${clo.cloCode}\nWeighted Total (%)`,
                            `${clo.cloCode}\nAchieved`
                        ])
                    ]
                ];

                const cloBody = cloStudentStats.map(student => {
                    const statsById = new Map(
                        student.cloStats.map(stat => [
                            getId(stat.cloId),
                            stat
                        ])
                    );

                    return [
                        student.regNo,
                        student.name,
                        ...cloColumns.flatMap(clo => {
                            const stat = statsById.get(clo.cloId);

                            const score =
                                stat && Number(stat.totalWeight) > 0
                                    ? Number(stat.normalizedWeight)
                                    : null;

                            return [
                                score === null
                                    ? 'N/A'
                                    : score.toFixed(2),
                                score === null
                                    ? '—'
                                    : score >= KPI
                                        ? 'Y'
                                        : 'N'
                            ];
                        })
                    ];
                });

                addTable(cloHead, cloBody, {
                    styles: {
                        fontSize: cloColumns.length > 5 ? 5.5 : 7,
                        cellPadding: 1.7,
                        overflow: 'linebreak'
                    }
                });

                ensureSpace(110);

                addHeading('CLO Attainment Graph', 11);

                await addChart('[data-pdf-clo-chart]');

                addText(
                    'CLO Attainment criteria: 50% of Students, 50% of Marks.'
                );

                addTable(
                    [[
                        'CLOs',
                        'Total Students',
                        'Students Attained',
                        'Attainment %',
                        'Average Score'
                    ]],
                    cloChartData.map(item => [
                        item.clo,
                        item.totalStudents,
                        item.achievedCount,
                        item.hasData
                            ? item.attainment.toFixed(2)
                            : 'N/A',
                        item.average === null
                            ? 'N/A'
                            : item.average.toFixed(2)
                    ]),
                    {
                        theme: 'striped',
                        columnStyles: {},
                        highlightScores: false
                    }
                );
            }

            // PAGE NUMBERS
            const totalPages = pdf.internal.getNumberOfPages();

            for (let page = 1; page <= totalPages; page++) {
                pdf.setPage(page);
                pdf.setFont('helvetica', 'normal');
                pdf.setFontSize(8);
                pdf.setTextColor(120, 120, 120);

                pdf.text(
                    `Page ${page} of ${totalPages}`,
                    pageWidth - margin,
                    pageHeight - 6,
                    { align: 'right' }
                );
            }

            const fileName = (courseCode || 'Course')
                .replace(/[\\/:*?"<>|]/g, '-');

            pdf.save(`${fileName}-Consolidated-Report.pdf`);

        } catch (err) {
            console.error('PDF generation failed:', err);
            alert('Unable to generate PDF. Please try again.');
        } finally {
            setPdfLoading(false);
        }
    };


    return (
        <Card ref={reportRef} className="border rounded-3 shadow-sm consolidated-pdf-content">
            <Card.Body
                className="px-3 pt-2 pb-3"
                style={{ fontSize: '0.875rem' }}
            >                
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">                                       
                    <h2
                        className="fw-bold mb-0"
                        style={{
                            color: '#29243a',
                            fontSize: '1.5rem'
                        }}
                    >
                        Course Section Consolidated Report
                    </h2>

                    <div className="d-flex gap-2" data-html2canvas-ignore="true">
                        <Button
                            size="sm"
                            variant="outline-success"
                            onClick={handleDownloadPDF}
                            disabled={
                                pdfLoading ||
                                ploLoading ||
                                Boolean(ploError) ||
                                cloStudentStats.length === 0
                            }
                        >
                            {pdfLoading ? 'Generating PDF...' : 'PDF'}
                        </Button>
                    </div>
                </div>

                <div style={{ lineHeight: 1.55 }}>
                    <div>
                        <strong>Course: </strong>
                        {courseCode} - {courseName}
                    </div>

                    <div>
                        <strong>Course Section: </strong>
                        {course?.section ||
                            `${courseCode} - ${semesterName}`}
                    </div>

                    <div>
                        <strong>Teacher: </strong>
                        {teacherName}
                    </div>

                    <div>
                        <strong>Semester: </strong>
                        {semesterName}
                    </div>
                </div>

                <hr className="my-3" />

                <h5
                    className="fw-semibold"
                    style={{ color: '#29243a' }}
                >
                    PLO Attainment
                </h5>

                {ploLoading && (
                    <div className="text-center py-4">
                        <Spinner animation="border" size="sm" />
                        <span className="ms-2">Calculating PLO attainment...</span>
                    </div>
                )}

                {ploError && (
                    <Alert variant="warning" className="my-3">
                        {ploError}
                    </Alert>
                )}

                {!ploLoading && ploGroups.length === 0 && !ploError && (
                    <p className="text-muted small">
                        No PLO attainment data available.
                    </p>
                )}

                {!ploLoading && ploGroups.map(group => (
                    <div key={group.batch} className="mb-4">
                        <h6
                            className="mt-4 mb-2 fw-semibold"
                            style={{ fontSize: '0.9rem' }}
                        >
                            Program Batch: {group.batch}
                        </h6>

                        {group.plos.length === 0 ? (
                            <p className="text-muted small">
                                No PLO mappings available for this batch.
                            </p>
                        ) : (
                            <div className="table-responsive">
                                <Table
                                    bordered
                                    className="align-middle mb-2"
                                    style={{
                                        fontSize: '0.85rem',
                                        minWidth: 400 + group.plos.length * 200
                                    }}
                                >
                                    <thead>
                                        <tr>
                                            <th colSpan={2} className="text-center">
                                                PLO
                                            </th>

                                            {group.plos.map(plo => (
                                                <th
                                                    key={plo.ploId}
                                                    colSpan={2}
                                                    className="text-center"
                                                    style={{ color: PURPLE }}
                                                >
                                                    {plo.ploCode}
                                                </th>
                                            ))}
                                        </tr>

                                        <tr>
                                            <th colSpan={2} className="text-center">
                                                Activity
                                            </th>

                                            {group.plos.map(plo => (
                                                <th
                                                    key={plo.ploId}
                                                    colSpan={2}
                                                    className="text-center"
                                                >
                                                    Weighted Total (%) / PLO Achieved
                                                </th>
                                            ))}
                                        </tr>

                                        <tr>
                                            <th colSpan={2} className="text-center">
                                                Assigned CLO
                                            </th>

                                            {group.plos.map(plo => (
                                                <th
                                                    key={plo.ploId}
                                                    colSpan={2}
                                                    className="text-center"
                                                >
                                                    KPI {KPI}%
                                                </th>
                                            ))}
                                        </tr>

                                        <tr>
                                            <th>Registration No.</th>
                                            <th>Name</th>

                                            {group.plos.map(plo => (
                                                <React.Fragment key={plo.ploId}>
                                                    <th className="text-center">
                                                        Weighted Total
                                                    </th>
                                                    <th className="text-center">
                                                        PLO Achieved
                                                    </th>
                                                </React.Fragment>
                                            ))}
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {group.rows.map(student => (
                                            <tr key={student.studentId}>
                                                <td
                                                    style={{
                                                        color: PURPLE,
                                                        whiteSpace: 'nowrap'
                                                    }}
                                                >
                                                    {student.regNo}
                                                </td>

                                                <td>{student.name}</td>

                                                {group.plos.map(plo => {
                                                    const result =
                                                        student.ploResults[plo.ploId];

                                                    return (
                                                        <React.Fragment key={plo.ploId}>
                                                            <td
                                                                className="text-center"
                                                                style={{
                                                                    color:
                                                                        result &&
                                                                        !result.achieved
                                                                            ? '#dc2626'
                                                                            : '#374151'
                                                                }}
                                                            >
                                                                {result
                                                                    ? result.percentage.toFixed(2)
                                                                    : '—'}
                                                            </td>

                                                            <td className="text-center">
                                                                {result
                                                                    ? result.achieved
                                                                        ? 'Y'
                                                                        : 'N'
                                                                    : '—'}
                                                            </td>
                                                        </React.Fragment>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                
                                </Table>
                            </div>
                        )}

                        {group.plos.length > 0 && (() => {
                            const chartData = group.plos.map(plo => {
                                const scores = group.rows
                                    .map(student => student.ploResults[plo.ploId])
                                    .filter(result => result != null);

                                const totalStudents = group.rows.length;

                                const achievedCount = scores.filter(
                                    result => result.achieved
                                ).length;

                                const attainment = totalStudents > 0
                                    ? achievedCount / totalStudents * 100
                                    : 0;

                                const average = scores.length > 0
                                    ? scores.reduce(
                                        (sum, result) =>
                                            sum + result.percentage,
                                        0
                                    ) / scores.length
                                    : null;

                                return {
                                    plo: plo.ploCode,
                                    totalStudents,
                                    achievedCount,
                                    attainment: round(attainment),
                                    average: average === null
                                        ? null
                                        : round(average)
                                };
                            });

                            return (
                                <div className="mt-4 mb-5 pdf-chart-block">
                                    <h6
                                        className="text-center fw-normal mb-3"
                                        style={{ fontSize: '0.95rem' }}
                                    >
                                        PLO Attainment Graph ({group.batch})
                                    </h6>

                                    <div data-pdf-plo-chart={group.batch} style={{ width: '100%', height: 350 }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart
                                                data={chartData}
                                                margin={{
                                                    top: 25,
                                                    right: 35,
                                                    left: 20,
                                                    bottom: 15
                                                }}
                                            >
                                                <CartesianGrid
                                                    strokeDasharray="4 5"
                                                    vertical={false}
                                                />

                                                <XAxis
                                                    dataKey="plo"
                                                    tick={{ fontSize: 12 }}
                                                />

                                                <YAxis
                                                    domain={[0, 100]}
                                                    ticks={[0, 20, 40, 60, 80, 100]}
                                                    tick={{ fontSize: 11 }}
                                                    label={{
                                                        value: '% Attainment',
                                                        angle: -90,
                                                        position: 'insideLeft',
                                                        style: { fontSize: 11 }
                                                    }}
                                                />

                                                <Tooltip
                                                    formatter={value =>
                                                        `${Number(value).toFixed(2)}%`
                                                    }
                                                />

                                                <ReferenceLine
                                                    y={KPI}
                                                    stroke="#999"
                                                    strokeWidth={2}
                                                    label={{
                                                        value: 'Required Student Achievement Threshold',
                                                        position: 'insideTopRight',
                                                        fill: '#888',
                                                        fontSize: 10
                                                    }}
                                                />

                                                <Bar
                                                    dataKey="attainment"
                                                    fill={PURPLE}
                                                    maxBarSize={120}
                                                />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>

                                    <h6
                                        className="fw-semibold mt-3 mb-2"
                                        style={{ fontSize: '0.88rem' }}
                                    >
                                        PLO Attainment criteria in graph,
                                        50% of Students, 50% of Marks
                                        for this Course Section.
                                    </h6>

                                    <div className="table-responsive">
                                        <Table
                                            className="align-middle mb-0"
                                            style={{ fontSize: '0.85rem' }}
                                        >
                                            <thead>
                                                <tr>
                                                    <th>PLOs</th>
                                                    <th>Total Students</th>
                                                    <th>
                                                        Number of Student Attained
                                                        PLO above 50%
                                                    </th>
                                                    <th>Attainment Percentage</th>
                                                    <th>Average PLO Score</th>
                                                </tr>
                                            </thead>

                                            <tbody>
                                                {chartData.map(item => (
                                                    <tr key={item.plo}>
                                                        <td style={{ color: PURPLE }}>
                                                            {item.plo}
                                                        </td>
                                                        <td>{item.totalStudents}</td>
                                                        <td>{item.achievedCount}</td>
                                                        <td>
                                                            {item.attainment.toFixed(2)}
                                                        </td>
                                                        <td>
                                                            {item.average === null
                                                                ? 'N/A'
                                                                : item.average.toFixed(2)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </Table>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                ))}
                                
                <hr className="my-4" />

                <h5
                    className="fw-semibold mb-3 pdf-section-heading"
                    style={{ color: '#29243a' }}
                >
                    CLO Attainment
                </h5>

                {ploLoading ? (
                    <div className="text-center py-3">
                        <Spinner animation="border" size="sm" />
                        <span className="ms-2">
                            Loading CLO attainment...
                        </span>
                    </div>
                ) : cloColumns.length === 0 ? (
                    <Alert variant="info">
                        No CLOs are assigned to this course.
                    </Alert>
                ) : (
                    <div className="table-responsive">
                        <Table
                            bordered
                            className="align-middle mb-2"
                            style={{
                                fontSize: '0.85rem',
                                minWidth: 400 + cloColumns.length * 170
                            }}
                        >
                            <thead>
                                <tr>
                                    <th colSpan={2} className="text-center">
                                        CLO
                                    </th>

                                    {cloColumns.map(clo => (
                                        <th
                                            key={clo.cloId}
                                            colSpan={2}
                                            className="text-center"
                                            style={{ color: PURPLE }}
                                        >
                                            {clo.cloCode}
                                        </th>
                                    ))}
                                </tr>

                                <tr>
                                    <th colSpan={2} className="text-center">
                                        Activity
                                    </th>

                                    {cloColumns.map(clo => (
                                        <th
                                            key={clo.cloId}
                                            colSpan={2}
                                            className="text-center"
                                        >
                                            Weighted Total (%) / CLO Achieved
                                        </th>
                                    ))}
                                </tr>

                                <tr>
                                    <th colSpan={2} className="text-center">
                                        KPI
                                    </th>

                                    {cloColumns.map(clo => (
                                        <th
                                            key={clo.cloId}
                                            colSpan={2}
                                            className="text-center"
                                        >
                                            {KPI}%
                                        </th>
                                    ))}
                                </tr>

                                <tr>
                                    <th>Registration No.</th>
                                    <th>Name</th>

                                    {cloColumns.map(clo => (
                                        <React.Fragment key={clo.cloId}>
                                            <th className="text-center">
                                                Weighted Total (%)
                                            </th>
                                            <th className="text-center">
                                                CLO Achieved
                                            </th>
                                        </React.Fragment>
                                    ))}
                                </tr>
                            </thead>

                            <tbody>
                                {cloStudentStats.map(student => {
                                    const statsById = new Map(
                                        student.cloStats.map(stat => [
                                            getId(stat.cloId),
                                            stat
                                        ])
                                    );

                                    return (
                                        <tr key={student.studentId}>
                                            <td
                                                style={{
                                                    color: PURPLE,
                                                    whiteSpace: 'nowrap'
                                                }}
                                            >
                                                {student.regNo}
                                            </td>

                                            <td>{student.name}</td>

                                            {cloColumns.map(clo => {
                                                const stat = statsById.get(clo.cloId);

                                                const percentage =
                                                    stat && Number(stat.totalWeight) > 0
                                                        ? Number(stat.normalizedWeight)
                                                        : null;

                                                const achieved =
                                                    percentage !== null &&
                                                    percentage >= KPI;

                                                return (
                                                    <React.Fragment key={clo.cloId}>
                                                        <td
                                                            className="text-center"
                                                            style={{
                                                                color:
                                                                    percentage !== null &&
                                                                    !achieved
                                                                        ? '#dc2626'
                                                                        : '#374151'
                                                            }}
                                                        >
                                                            {!student.loaded
                                                                ? '—'
                                                                : percentage === null
                                                                    ? 'N/A'
                                                                    : percentage.toFixed(2)}
                                                        </td>

                                                        <td className="text-center">
                                                            {!student.loaded ||
                                                            percentage === null
                                                                ? '—'
                                                                : achieved
                                                                    ? 'Y'
                                                                    : 'N'}
                                                        </td>
                                                    </React.Fragment>
                                                );
                                            })}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </Table>
                    </div>
                )}
                
                {!ploLoading && cloColumns.length > 0 && (
                    <div className="mt-4 pdf-chart-block">
                        <h5
                            className="text-center fw-semibold mb-3"
                            style={{
                                color: '#29243a',
                                fontSize: '1.1rem'
                            }}
                        >
                            CLO Attainment Graph
                        </h5>
                        
                        <div data-pdf-clo-chart style={{ width: '100%', height: 360 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={cloChartData}
                                    margin={{
                                        top: 30,
                                        right: 35,
                                        left: 20,
                                        bottom: 20
                                    }}
                                    barCategoryGap="25%"
                                >
                                    <CartesianGrid
                                        stroke="#d6d6d6"
                                        strokeWidth={1}
                                    />

                                    <XAxis
                                        dataKey="clo"
                                        tick={{ fontSize: 12, fill: '#666' }}
                                        tickLine={false}
                                    />

                                    <YAxis
                                        domain={[0, 100]}
                                        ticks={[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]}
                                        tick={{ fontSize: 11, fill: '#666' }}
                                        label={{
                                            value: '% Attainment',
                                            angle: -90,
                                            position: 'insideLeft',
                                            style: {
                                                fontSize: 12,
                                                fill: '#666'
                                            }
                                        }}
                                    />

                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#333',
                                            border: 'none',
                                            borderRadius: 6,
                                            color: '#fff'
                                        }}
                                        itemStyle={{ color: '#fff' }}
                                        labelStyle={{
                                            color: '#fff',
                                            fontWeight: 600
                                        }}
                                        cursor={{ fill: 'rgba(0,0,0,0.06)' }}
                                        formatter={value => [
                                            `${Number(value).toFixed(2)}%`,
                                            '% Attainment'
                                        ]}
                                    />

                                    <ReferenceLine
                                        y={KPI}
                                        stroke="#ff0000"
                                        strokeDasharray="6 5"
                                        strokeWidth={1.5}
                                        label={{
                                            value: 'Required Student Achievement Threshold',
                                            position: 'insideTopRight',
                                            fill: '#888',
                                            fontSize: 11
                                        }}
                                    />

                                    <Bar
                                        dataKey="attainment"
                                        maxBarSize={110}
                                        isAnimationActive={false}
                                    >
                                        {cloChartData.map((item, index) => (
                                            <Cell
                                                key={item.clo}
                                                fill={CLO_COLORS[index % CLO_COLORS.length]}
                                            />
                                        ))}

                                        <LabelList
                                            dataKey="attainment"
                                            position="top"
                                            formatter={value =>
                                                Number(value) === 0
                                                    ? '0'
                                                    : Number(value).toFixed(2)
                                            }
                                            style={{
                                                fontSize: 11,
                                                fill: '#111'
                                            }}
                                        />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        <h6
                            className="fw-semibold mt-3 mb-2"
                            style={{ fontSize: '0.88rem' }}
                        >
                            CLO Attainment criteria in graph, 50% of Students,
                            50% of Marks for this Course Section.
                        </h6>

                        <div className="table-responsive">
                            <Table
                                className="align-middle mb-0"
                                style={{ fontSize: '0.85rem' }}
                            >
                                <thead>
                                    <tr>
                                        <th>CLOs</th>
                                        <th>Total Students</th>
                                        <th>
                                            Number of Student Attained CLO above 50%
                                        </th>
                                        <th>Attainment Percentage</th>
                                        <th>Average Score</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {cloChartData.map(item => (
                                        <tr key={item.clo}>
                                            <td style={{ color: PURPLE }}>
                                                {item.clo}
                                            </td>

                                            <td>{item.totalStudents}</td>

                                            <td>{item.achievedCount}</td>

                                            <td>
                                                {item.hasData
                                                    ? item.attainment.toFixed(2)
                                                    : 'N/A'}
                                            </td>

                                            <td>
                                                {item.average === null
                                                    ? 'N/A'
                                                    : item.average.toFixed(2)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </div>
                    </div>
                )}

            </Card.Body>
        </Card>
    );
}
