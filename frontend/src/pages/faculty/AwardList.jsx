
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, Form, Button, Table, Alert, Spinner } from 'react-bootstrap';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx-js-style';

import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const fmt = value =>
    value == null || value === ''
        ? ''
        : Number(value).toFixed(2);

const GRADES = [
    ['85-100', '4.00', 'A', ''],
    ['80-84', '3.66', 'A-', ''],
    ['75-79', '3.33', 'B+', ''],
    ['71-74', '3.00', 'B', ''],
    ['68-70', '2.66', 'B-', ''],
    ['64-67', '2.33', 'C+', ''],
    ['61-63', '2.00', 'C', ''],
    ['58-60', '1.66', 'C-', ''],
    ['54-57', '1.30', 'D+', ''],
    ['50-53', '1.00', 'D', ''],
    ['0-49', '0.00', 'F', ''],
    ['-', '-', 'I', 'Incomplete'],
    ['-', '-', 'W', 'Withdrawal'],
    ['-', '-', 'X', 'Exempted'],
    ['-', '-', 'IP', 'In Progress'],
    ['-', '-', 'WU', 'Short of Attend.']
];

const GRADE_CODES = GRADES.map(row => row[2]);

const initialOptions = {
    abbreviation: true,
    totalMarks: true,
    marks: false,
    sortPercentage: false,
    batch: true,
    gpa: false,
    signature: false
};

function getId(value) {
    return String(value?._id || value || '');
}

function getStudent(record) {
    return record.student || record.studentId || {};
}

function getCategoryValue(record, key) {
    const categories = record.categoryTotals || record.categories || {};

    const aliases = {
        assignment: ['assignment', 'assignments', 'Assignment'],
        quiz: ['quiz', 'quizzes', 'Quiz'],
        midterm: ['midterm', 'midTerm', 'mid', 'Midterm'],
        final: ['final', 'finalExam', 'Final']
    };

    for (const alias of aliases[key]) {
        const value = categories[alias] ?? record[alias];

        if (value != null) {
            if (typeof value === 'number') return value;

            if (typeof value === 'object') {
                return value.weighted ??
                    value.obtained ??
                    value.marks ??
                    value.total ??
                    null;
            }

            return value;
        }
    }

    return null;
}

export default function AwardList() {
    const { courseId } = useParams();
    const { user } = useAuth();

    const [options, setOptions] = useState(initialOptions);
    const [loading, setLoading] = useState(false);
    const [visible, setVisible] = useState(false);
    const [error, setError] = useState('');
    const [course, setCourse] = useState({});
    const [records, setRecords] = useState([]);

    const toggle = key =>
        setOptions(previous => ({
            ...previous,
            [key]: !previous[key]
        }));

    const generateReport = async () => {
        setLoading(true);
        setError('');

        try {
            const { data } = await api.get(
                `/api/faculty/courses/${courseId}/award-list`,
                {
                    headers: {
                        Authorization: `Bearer ${user.token}`
                    }
                }
            );

            console.log('AWARD LIST API RESPONSE:', data);
console.log(
    'FIRST AWARD STUDENT FULL DATA:',
    JSON.stringify(data.awardList?.[0], null, 2)
);
console.log('AWARD WEIGHTS:', data.weights);

            const list = Array.isArray(data)
                ? data
                : data.studentGrades ||
                  data.students ||
                  data.awardList ||
                  data.results ||
                  [];

            setRecords(list);
            setCourse(data.course || {});
            setVisible(true);
        } catch (err) {
            setError(
                err.response?.data?.message ||
                err.message ||
                'Unable to load Award List.'
            );
            setVisible(false);
        } finally {
            setLoading(false);
        }
    };

    const sortedRecords = [...records];

    if (options.sortPercentage) {
        sortedRecords.sort(
            (a, b) =>
                Number(b.percentage ?? -1) -
                Number(a.percentage ?? -1)
        );
    }

    const categoryColumns = [
        { key: 'assignment', short: 'A', full: 'Assignment', weight: 10 },
        { key: 'quiz', short: 'Q', full: 'Quiz', weight: 10 },
        { key: 'midterm', short: 'M', full: 'Midterm', weight: 30 },
        { key: 'final', short: 'F', full: 'Final', weight: 50 }
    ];

    const headings = [
        'Sr. No.',
        'Registration No.',
        'Student',
        ...(options.batch ? ['Batch'] : []),
        ...(options.marks
            ? categoryColumns.map(c =>
                options.abbreviation
                    ? `${c.short} ${c.weight}%`
                    : `${c.full} ${c.weight}%`
            )
            : []),
        ...(options.totalMarks ? ['Obtained Marks'] : []),
        'Total Marks',
        'Grade',
        ...(options.gpa ? ['GPA'] : [])
    ];

    const rowValues = (record, index) => {
        const student = getStudent(record);

        return [
            index + 1,
            student.regNo || record.regNo || '',
            student.name || record.name || '',
            ...(options.batch
                ? [student.batch || record.batch || '']
                : []),
            ...(options.marks
                ? categoryColumns.map(c =>
                    fmt(getCategoryValue(record, c.key))
                )
                : []),
            ...(options.totalMarks
                ? [fmt(record.total ?? record.totalObtained ?? record.percentage)]
                : []),

            fmt(100),
            record.grade || record.letterGrade || 'N/A',
            ...(options.gpa ? [fmt(record.gpa)] : [])
        ];
    };

    const matrix = () => [
        headings,
        ...sortedRecords.map(rowValues)
    ];
    
    const downloadExcel = () => {
        const wb = XLSX.utils.book_new();

        const courseName = `${course.code || ''} - ${course.name || ''}`;
        const teacherName = course.teacher || 'N/A';
        const semester =
            course.academicTerm?.name ||
            course.academicTerm ||
            course.semester ||
            'N/A';

        const details = [
            ['AWARD LIST'],
            ['Class Room Combined Result (GPA)'],
            [],
            [`Course: ${courseName}`],
            [`Teacher: ${teacherName}`],
            [`Semester: ${semester}`],
            ['Department: Department of Software Engineering'],
            []
        ];

        const data = [...details, ...matrix()];
        const ws = XLSX.utils.aoa_to_sheet(data);

        // Merge each heading/detail across all report columns.
        const lastColumn = Math.max(headings.length - 1, 0);

        ws['!merges'] = [0, 1, 3, 4, 5, 6].map(row => ({
            s: { r: row, c: 0 },
            e: { r: row, c: lastColumn }
        }));

        // Bold and style headings/details.
        [0, 1, 3, 4, 5, 6].forEach(row => {
            const cell = ws[XLSX.utils.encode_cell({
                r: row,
                c: 0
            })];

            if (!cell) return;

            cell.s = {
                font: {
                    bold: true,
                    sz: row === 0 ? 18 : row === 1 ? 14 : 12,
                    color: { rgb: '222222' }
                },
                alignment: {
                    horizontal: 'center',
                    vertical: 'center'
                }
            };
        });

        // Style the student table header (row 9).
        headings.forEach((_, index) => {
            const address = XLSX.utils.encode_cell({
                r: 8,
                c: index
            });

            if (ws[address]) {
                ws[address].s = {
                    font: {
                        bold: true,
                        color: { rgb: 'FFFFFF' }
                    },
                    fill: {
                        patternType: 'solid',
                        fgColor: { rgb: '663399' }
                    },
                    alignment: {
                        horizontal: 'center',
                        vertical: 'center',
                        wrapText: true
                    },
                    border: {
                        top: {
                            style: 'thin',
                            color: { rgb: 'FFFFFF' }
                        },
                        bottom: {
                            style: 'thin',
                            color: { rgb: 'FFFFFF' }
                        },
                        left: {
                            style: 'thin',
                            color: { rgb: 'FFFFFF' }
                        },
                        right: {
                            style: 'thin',
                            color: { rgb: 'FFFFFF' }
                        }
                    }
                };
            }
        });

        // Column widths.
        ws['!cols'] = headings.map((_, index) => ({
            wch: index === 2 ? 28 : index === 1 ? 23 : 17
        }));

        // Row heights.
        ws['!rows'] = [
            { hpt: 30 },
            { hpt: 25 },
            { hpt: 10 },
            { hpt: 22 },
            { hpt: 22 },
            { hpt: 22 },
            { hpt: 22 },
            { hpt: 12 },
            { hpt: 32 }
        ];

        XLSX.utils.book_append_sheet(wb, ws, 'Award List');

        XLSX.writeFile(wb, `Award-List-${courseId}.xlsx`);
    };

    const downloadPDF = () => {
        const doc = new jsPDF('landscape', 'mm', 'a3');

        const courseName = `${course.code || ''} - ${course.name || ''}`;
        const teacherName = course.teacher || 'N/A';
        const semester = course.academicTerm?.name || course.academicTerm || course.semester || 'N/A';

        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('AWARD LIST', 14, 17);

        doc.setFontSize(15);
        doc.text('Class Room Combined Result (GPA)', 14, 27);

        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');

        doc.text(`Course: ${courseName}`, 14, 37);
        doc.text(`Teacher: ${teacherName}`, 14, 44);
        doc.text(`Semester: ${semester}`, 14, 51);
        doc.text('Department: Department of Software Engineering', 14, 58);

        autoTable(doc, {
            startY: 67,
            head: [headings],
            body: sortedRecords.map(rowValues),
            theme: 'grid',

            styles: {
                fontSize: 8,
                cellPadding: 2,
                lineWidth: 0.2,
                lineColor: [170, 170, 170]
            },

            headStyles: {
                fillColor: [102, 51, 153],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                lineWidth: 0.4,
                lineColor: [255, 255, 255],
                halign: 'center'
            }
        });

        if (options.signature) {
            const y = doc.lastAutoTable.finalY + 20;

            if (y < doc.internal.pageSize.height - 20) {
                doc.text('____________________', 15, y);
                doc.text('____________________', 100, y);
                doc.text('____________________', 195, y);

                doc.text('Name of Examiner', 15, y + 6);
                doc.text("Examiner's Signature", 100, y + 6);
                doc.text("Chairperson's Signature", 195, y + 6);
            }
        }

        doc.save(`Award-List-${courseId}.pdf`);
    };

    const gradeCounts = Object.fromEntries(
        GRADE_CODES.map(code => [
            code,
            records.filter(
                r => (r.grade || r.letterGrade) === code
            ).length
        ])
    );

    return (
        <Card className="border rounded-3 shadow-sm">
            <Card.Body className="p-4">
                <h3 className="fw-normal mb-3">Award List</h3>

                <Alert variant="warning" className="mb-4">
                    If you do not see proper result please go to GPA
                    menu option and correct the result.
                </Alert>

                <div
                    className="mb-4"
                    style={{
                        display: 'grid',
                        gridTemplateColumns:
                            'repeat(auto-fit, minmax(220px, 1fr))',
                        gap: 22
                    }}
                >
                    {[
                        ['abbreviation', 'Use Activity Abbreviation'],
                        ['totalMarks', 'Show Total Marks'],
                        ['marks', 'Show Marks'],
                        ['sortPercentage', 'Sort By Percentage'],
                        ['batch', 'Show Program Batch'],
                        ['gpa', 'Show GPA'],
                        ['signature', 'Show Signature in PDF Footer']
                    ].map(([key, label]) => (
                        <Form.Check
                            key={key}
                            type="checkbox"
                            label={label}
                            checked={options[key]}
                            onChange={() => toggle(key)}
                        />
                    ))}
                </div>

                <div className="d-flex gap-1 mb-4">
                    <Button
                        variant="outline-primary"
                        onClick={generateReport}
                        disabled={loading}
                    >
                        {loading ? (
                            <Spinner animation="border" size="sm" />
                        ) : 'Report'}
                    </Button>

                    <Button
                        variant="outline-primary"
                        disabled={!visible}
                        onClick={downloadPDF}
                    >
                        PDF
                    </Button>

                    <Button
                        variant="outline-primary"
                        disabled={!visible}
                        onClick={downloadExcel}
                    >
                        Excel
                    </Button>
                </div>

                {error && <Alert variant="danger">{error}</Alert>}

                {visible && (
                    <>
                        <h4 className="fw-normal mb-3">
                            Class Room Combined Result(GPA)
                        </h4>
                        
                        <div className="mb-3" style={{ fontSize: 18 }}>
                            <div>
                                <strong>Course : </strong>
                                {course.code} - {course.name}
                            </div>
                            <div>
                                <strong>Semester : </strong>
                                {course.academicTerm?.name ||
                                    course.academicTerm ||
                                    course.semester ||
                                    'N/A'}
                            </div>
                            <div>
                                <strong>Teacher : </strong>
                                {course.teacher || user?.name || 'N/A'}
                            </div>
                        </div>

                        <div style={{ overflowX: 'auto' }}>
                            <Table
                                bordered
                                className="align-middle"
                                style={{
                                    minWidth: 950,
                                    fontSize: '0.9rem'
                                }}
                            >
                                <thead>
                                    <tr>
                                        {headings.map((heading, index) => (
                                            <th key={index}>
                                                {heading}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedRecords.map((record, index) => (
                                        <tr key={
                                            getId(getStudent(record)) || index
                                        }>
                                            {rowValues(record, index).map(
                                                (value, i) => (
                                                    <td key={i}>
                                                        {value}
                                                    </td>
                                                )
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </div>

                        <hr className="my-4" />

                        <h5>Grade Statistics</h5>
                        <div style={{ overflowX: 'auto' }}>
                            <Table bordered size="sm">
                                <thead>
                                    <tr>
                                        <th>Course</th>
                                        {GRADE_CODES.map(code => (
                                            <th key={code}>{code}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>
                                            {course.code} - {course.name}
                                        </td>
                                        {GRADE_CODES.map(code => (
                                            <td key={code}>
                                                {gradeCounts[code] || ''}
                                            </td>
                                        ))}
                                    </tr>
                                </tbody>
                            </Table>
                        </div>

                        <h5 className="mt-5">Grading System</h5>
                        <Table bordered size="sm">
                            <thead>
                                <tr>
                                    <th>Numerical Grade</th>
                                    <th>Grade Point</th>
                                    <th>Letter Grade</th>
                                    <th>Value Remarks</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td colSpan={4} className="fw-semibold">
                                        New Policy
                                    </td>
                                </tr>
                                {GRADES.map((row, index) => (
                                    <tr key={index}>
                                        {row.map((value, i) => (
                                            <td key={i}>{value}</td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </Table>

                        <div
                            className="d-flex justify-content-between mt-5"
                            style={{ maxWidth: 850 }}
                        >
                            {[
                                'Name of Examiner',
                                "Examiner's Signature",
                                "Chairperson's Signature"
                            ].map(label => (
                                <div key={label} style={{ width: '30%' }}>
                                    <div
                                        style={{
                                            borderTop: '2px solid black',
                                            paddingTop: 5
                                        }}
                                    >
                                        {label}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </Card.Body>
        </Card>
    );
}
