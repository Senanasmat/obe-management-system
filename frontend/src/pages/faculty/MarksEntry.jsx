import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import {
    Container,
    Table,
    Button,
    Form,
    Breadcrumb,
    Modal,
    Row,
    Col
} from 'react-bootstrap';
import {
    ArrowLeft,
    Save,
    CheckCircle2,
    Download,
    Upload,
    FileSpreadsheet,
    CheckCircle
} from 'lucide-react';
import * as XLSX from 'xlsx-js-style';
import { motion } from 'framer-motion';
import Swal from 'sweetalert2';


const MarksEntry = () => {
    const { courseId, assessmentId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [students, setStudents] = useState([]);
    const [assessment, setAssessment] = useState(null);
    const [marks, setMarks] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [savedAt, setSavedAt] = useState(null);

    // Bulk Import
    const [showImportModal, setShowImportModal] = useState(false);
    const [excelFile, setExcelFile] = useState(null);
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        const load = async () => {
            try {
                const config = {
                    headers: {
                        Authorization: `Bearer ${user.token}`
                    }
                };

                const [assessRes, assignRes, resultsRes] =
                    await Promise.all([
                        api.get(
                            `/api/faculty/assessments/${assessmentId}`,
                            config
                        ),
                        api.get('/api/assignments/my', config),
                        api.get(
                            `/api/faculty/assessments/${assessmentId}/results`,
                            config
                        )
                    ]);

                const current = assessRes.data;
                setAssessment(current);

                const assignment = assignRes.data.find(
                    a => a.course._id === courseId
                );

                const enrolledStudents =
                    assignment?.course?.students || [];

                setStudents(enrolledStudents);

                const init = {};

                enrolledStudents.forEach(student => {
                    init[student._id] = {};

                    current.questions.forEach((_, idx) => {
                        init[student._id][idx] = '';
                    });
                });

                resultsRes.data.forEach(result => {
                    const studentId =
                        result.student?._id || result.student;

                    if (init[studentId]) {
                        result.obtainedMarks.forEach(mark => {
                            init[studentId][mark.questionIndex] =
                                mark.marks;
                        });
                    }
                });

                setMarks(init);

                if (resultsRes.data.length > 0) {
                    setSavedAt('Previously saved');
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [courseId, assessmentId, user.token]);

    // =========================================================
    // MANUAL MARK ENTRY
    // =========================================================

    const handleMarkChange = (studentId, qIndex, value) => {
        const maxMarks =
            assessment.questions[qIndex].maxMarks;

        const numValue = Number(value);

        if (value !== '' && numValue > maxMarks) {
            Swal.fire({
                icon: 'warning',
                title: 'Marks Exceed Maximum',
                text: `Question ${
                    assessment.questions[qIndex].questionName ||
                    `Q${qIndex + 1}`
                } has a maximum of ${maxMarks} marks. Value cannot exceed this.`,
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000
            });

            return;
        }

        if (value !== '' && numValue < 0) {
            return;
        }

        setSavedAt(null);

        setMarks(prev => ({
            ...prev,
            [studentId]: {
                ...prev[studentId],
                [qIndex]: value
            }
        }));
    };

    // =========================================================
    // SAVE MARKS
    // =========================================================

    const handleSaveAll = async () => {
        setSaving(true);

        try {
            const config = {
                headers: {
                    Authorization: `Bearer ${user.token}`
                }
            };

            await Promise.all(
                students.map(student => {
                    const studentMarks =
                        marks[student._id] || {};

                    const obtainedMarks =
                        Object.entries(studentMarks).map(
                            ([qIndex, mark]) => ({
                                questionIndex: Number(qIndex),
                                marks: Number(mark) || 0
                            })
                        );

                    return api.post(
                        '/api/faculty/marks',
                        {
                            studentId: student._id,
                            assessmentId,
                            obtainedMarks
                        },
                        config
                    );
                })
            );

            setSavedAt(new Date().toLocaleTimeString());

            Swal.fire({
                icon: 'success',
                title: 'Marks Saved',
                text: `Successfully saved marks for ${students.length} student(s)`,
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 2500
            });
        } catch (err) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text:
                    err.response?.data?.message ||
                    'Failed to save marks',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000
            });
        } finally {
            setSaving(false);
        }
    };

    
        // =========================================================
        // EXCEL TEMPLATE DOWNLOAD
        // =========================================================

        const downloadTemplate = () => {
            if (!students.length || !assessment?.questions?.length) {
                Swal.fire({
                    icon: 'warning',
                    title: 'No Data Available',
                    text: 'There are no students or questions available for this assessment.',
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 3000
                });
                return;
            }

            try {
                const headers = [
                    'Student Reg No',
                    'Student Name',
                    ...assessment.questions.map((q, i) =>
                        `${q.questionName || `Q${i + 1}`} (Max: ${q.maxMarks})`
                    )
                ];

                const data = students.map(student => [
                    student.regNo,
                    student.name,
                    ...assessment.questions.map((_, qIdx) =>
                        marks[student._id]?.[qIdx] ?? ''
                    )
                ]);

                const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
                ws['!cols'] = [
                    { wch: 18 },
                    { wch: 25 },
                    ...assessment.questions.map(() => ({ wch: 18 }))
                ];

                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, 'Marks');

                const infoData = [
                    ['Assessment Details'],
                    ['Title', assessment.title],
                    ['Type', assessment.type],
                    ['Total Marks', assessment.totalMarks],
                    ['Questions', assessment.questions.length],
                    ['Students', students.length]
                ];

                const wsInfo = XLSX.utils.aoa_to_sheet(infoData);
                wsInfo['!cols'] = [{ wch: 20 }, { wch: 30 }];
                XLSX.utils.book_append_sheet(wb, wsInfo, 'Assessment Info');

                XLSX.writeFile(
                    wb,
                    `${assessment.title}-marks-${Date.now()}.xlsx`
                );

                Swal.fire({
                    icon: 'success',
                    title: 'Downloaded',
                    text: 'Excel template downloaded successfully.',
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 2000
                });
            } catch (error) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Failed to download: ' + error.message,
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 2000
                });
            }
        };

        const handleDownloadExcel = downloadTemplate;

        const handleImportExcel = async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;

            try {
                const buffer = await file.arrayBuffer();
                const workbook = XLSX.read(buffer);
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                const rows = XLSX.utils.sheet_to_json(worksheet, {
                    header: 1,
                    defval: ''
                });

                if (rows.length < 2) {
                    throw new Error('The Excel file contains no student marks.');
                }

                const headers = rows[0].map(value =>
                    String(value).trim().toLowerCase()
                );
                const regNoIdx = headers.findIndex(header =>
                    header.includes('reg')
                );

                if (regNoIdx === -1) {
                    throw new Error('Could not find a registration number column.');
                }

                const newMarks = { ...marks };
                const errors = [];
                let updatedCount = 0;

                for (let i = 1; i < rows.length; i++) {
                    const row = rows[i];
                    const regNo = String(row[regNoIdx] ?? '').trim();

                    if (!regNo) continue;

                    const student = students.find(
                        s => String(s.regNo).trim().toLowerCase() === regNo.toLowerCase()
                    );

                    if (!student) {
                        errors.push(`Row ${i + 1}: Student ${regNo} not found.`);
                        continue;
                    }

                    newMarks[student._id] = {
                        ...(newMarks[student._id] || {})
                    };

                    for (let qIdx = 0; qIdx < assessment.questions.length; qIdx++) {
                        const value = row[qIdx + 2];

                        if (value === '' || value === null || value === undefined) {
                            continue;
                        }

                        const score = Number(value);
                        const maxMarks = Number(assessment.questions[qIdx].maxMarks);

                        if (!Number.isFinite(score) || score < 0 || score > maxMarks) {
                            errors.push(
                                `Row ${i + 1}, Q${qIdx + 1}: Enter a number from 0 to ${maxMarks}.`
                            );
                            continue;
                        }

                        newMarks[student._id][qIdx] = score;
                        updatedCount++;
                    }
                }

                if (updatedCount > 0) {
                    setMarks(newMarks);
                    setSavedAt(null);
                }

                await Swal.fire({
                    icon: errors.length ? 'warning' : updatedCount ? 'success' : 'info',
                    title: errors.length
                        ? 'Import Completed with Errors'
                        : updatedCount
                            ? 'Import Successful'
                            : 'No Marks Imported',
                    text: `${updatedCount} mark(s) imported. ${errors.length} error(s).`,
                    ...(errors.length
                        ? { html: `<p>${updatedCount} mark(s) imported.</p><p>${errors.slice(0, 10).join('<br/>')}</p>` }
                        : {}),
                    toast: !errors.length,
                    position: errors.length ? 'center' : 'top-end',
                    showConfirmButton: Boolean(errors.length),
                    timer: errors.length ? undefined : 2500
                });
            } catch (error) {
                Swal.fire({
                    icon: 'error',
                    title: 'Import Failed',
                    text: error.message,
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 3000
                });
            } finally {
                e.target.value = '';
            }
        };

        if (loading) {
            return (
                <div className="p-5 text-center text-muted">
                    Loading marks entry...
                </div>
            );
        }

        

    // =========================================================
    // EXCEL IMPORT
    // =========================================================

    const handleImportSubmit = async () => {
        if (!excelFile) {
            Swal.fire({
                icon: 'warning',
                title: 'No file selected',
                text: 'Please select an Excel file first.',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000
            });

            return;
        }

        setImporting(true);
        setImportResult(null);

        try {
            const arrayBuffer =
                await excelFile.arrayBuffer();

            const workbook =
                XLSX.read(arrayBuffer, {
                    type: 'array'
                });

            const sheetName =
                workbook.SheetNames[0];

            const worksheet =
                workbook.Sheets[sheetName];

            const rows =
                XLSX.utils.sheet_to_json(
                    worksheet,
                    {
                        header: 1,
                        defval: ''
                    }
                );

            if (!rows.length) {
                throw new Error(
                    'The Excel file is empty.'
                );
            }

            // -------------------------------------------------
            // Expected headers
            // -------------------------------------------------

            const expectedHeaders = [
                'S.No',
                'Student Name',
                'Reg No',
                ...assessment.questions.map(
                    (q, index) =>
                        q.questionName ||
                        `Q${index + 1}`
                ),
                'Total'
            ];

            const uploadedHeaders =
                rows[0].map(value =>
                    String(value).trim()
                );

            // Exact header validation
            if (
                uploadedHeaders.length !==
                expectedHeaders.length
            ) {
                throw new Error(
                    'Invalid Excel template. Please use the template downloaded from this page.'
                );
            }

            const headersMatch =
                expectedHeaders.every(
                    (header, index) =>
                        uploadedHeaders[index] ===
                        header
                );

            if (!headersMatch) {
                throw new Error(
                    'Excel column names or order have been changed. Please use the original downloaded template.'
                );
            }

            // -------------------------------------------------
            // Create student lookup
            // -------------------------------------------------

            const studentByRegNo =
                new Map();

            students.forEach(student => {
                studentByRegNo.set(
                    String(student.regNo)
                        .trim()
                        .toLowerCase(),
                    student
                );
            });

            const updatedMarks = {
                ...marks
            };

            let imported = 0;
            let skipped = 0;
            const errors = [];

            // -------------------------------------------------
            // Process every Excel row
            // -------------------------------------------------

            rows.slice(1).forEach(
                (row, rowIndex) => {
                    const excelRow =
                        rowIndex + 2;

                    const studentName =
                        String(
                            row[1] ?? ''
                        ).trim();

                    const regNo =
                        String(
                            row[2] ?? ''
                        ).trim();

                    if (!studentName && !regNo) {
                        return;
                    }

                    if (!regNo) {
                        errors.push(
                            `Row ${excelRow}: Registration number is missing.`
                        );
                        skipped++;
                        return;
                    }

                    const student =
                        studentByRegNo.get(
                            regNo.toLowerCase()
                        );

                    if (!student) {
                        errors.push(
                            `Row ${excelRow}: Student with Reg No "${regNo}" is not enrolled in this course.`
                        );
                        skipped++;
                        return;
                    }

                    // Make sure name was not changed
                    if (
                        studentName.toLowerCase() !==
                        String(student.name)
                            .trim()
                            .toLowerCase()
                    ) {
                        errors.push(
                            `Row ${excelRow}: Student name does not match Reg No "${regNo}".`
                        );
                        skipped++;
                        return;
                    }

                    if (
                        !updatedMarks[student._id]
                    ) {
                        updatedMarks[
                            student._id
                        ] = {};
                    }

                    let rowValid = true;

                    assessment.questions.forEach(
                        (question, qIndex) => {
                            const rawValue =
                                row[qIndex + 3];

                            if (
                                rawValue === '' ||
                                rawValue === null ||
                                rawValue === undefined
                            ) {
                                updatedMarks[
                                    student._id
                                ][qIndex] = '';

                                return;
                            }

                            const numericValue =
                                Number(rawValue);

                            if (
                                Number.isNaN(
                                    numericValue
                                )
                            ) {
                                errors.push(
                                    `Row ${excelRow}: ${question.questionName || `Q${qIndex + 1}`} must contain a number.`
                                );

                                rowValid = false;
                                return;
                            }

                            if (
                                numericValue < 0 ||
                                numericValue >
                                    question.maxMarks
                            ) {
                                errors.push(
                                    `Row ${excelRow}: ${
                                        question.questionName ||
                                        `Q${qIndex + 1}`
                                    } must be between 0 and ${question.maxMarks}.`
                                );

                                rowValid = false;
                                return;
                            }

                            updatedMarks[
                                student._id
                            ][qIndex] =
                                numericValue;
                        }
                    );

                    if (rowValid) {
                        imported++;
                    } else {
                        skipped++;
                    }
                }
            );

            // -------------------------------------------------
            // Put imported marks into manual table
            // -------------------------------------------------

            setMarks(updatedMarks);
            setSavedAt(null);

            setImportResult({
                imported,
                skipped,
                errors
            });

            setExcelFile(null);

            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        } catch (error) {
            console.error(
                'Excel import error:',
                error
            );

            Swal.fire({
                icon: 'error',
                title: 'Import Failed',
                text:
                    error.message ||
                    'Could not process the Excel file.',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 4000
            });
        } finally {
            setImporting(false);
        }
    };

    // =========================================================
    // CLOSE IMPORT MODAL
    // =========================================================

    const handleCloseImportModal = () => {
        setShowImportModal(false);
        setExcelFile(null);
        setImportResult(null);

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // =========================================================
    // TOTAL
    // =========================================================

    const totalFor = studentId =>
        Object.values(
            marks[studentId] || {}
        ).reduce(
            (sum, value) =>
                sum + (Number(value) || 0),
            0
        );

    // =========================================================
    // LOADING
    // =========================================================

    if (loading) {
        return (
            <div className="p-5 text-center text-muted">
                Loading marks entry...
            </div>
        );
    }

    if (!assessment) {
        return (
            <div className="p-5 text-center text-danger">
                Assessment not found.
            </div>
        );
    }

    // =========================================================
    // UI
    // =========================================================

    return (
        <motion.div
            initial={{
                opacity: 0,
                y: 8
            }}
            animate={{
                opacity: 1,
                y: 0
            }}
            transition={{
                duration: 0.3
            }}
            className="bg-white min-vh-100"
        >
            <Container
                fluid
                className="px-4 py-3"
            >
                {/* Breadcrumb */}

                <h4 className="fw-normal text-dark mb-1">
                    Marks Entry
                </h4>

                <Breadcrumb
                    className="small mb-4"
                    style={{
                        fontSize: '0.85rem'
                    }}
                >
                    <Breadcrumb.Item
                        linkAs={Link}
                        linkProps={{
                            to: '/faculty'
                        }}
                        className="text-muted text-decoration-none"
                    >
                        Home
                    </Breadcrumb.Item>

                    <Breadcrumb.Item
                        linkAs={Link}
                        linkProps={{
                            to: '/faculty/courses'
                        }}
                        className="text-muted text-decoration-none"
                    >
                        Course Sections
                    </Breadcrumb.Item>

                    <Breadcrumb.Item
                        linkAs={Link}
                        linkProps={{
                            to: `/faculty/courses/${courseId}?tab=Activities`
                        }}
                        className="text-muted text-decoration-none"
                    >
                        Activities
                    </Breadcrumb.Item>

                    <Breadcrumb.Item
                        active
                        className="text-muted"
                    >
                        {assessment.title}
                    </Breadcrumb.Item>
                </Breadcrumb>

                {/* Header */}

                <div className="d-flex align-items-center justify-content-between mb-4">
                    <div>
                        <h5
                            className="fw-bold mb-0"
                            style={{
                                color: '#4c1d95'
                            }}
                        >
                            {assessment.title}
                        </h5>

                        <p className="text-muted small mb-0">
                            {assessment.type}
                            &nbsp;·&nbsp; Total Marks:{' '}
                            <strong>
                                {assessment.totalMarks}
                            </strong>
                            &nbsp;·&nbsp;{' '}
                            {students.length} student(s)
                            enrolled
                        </p>
                    </div>
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                        {savedAt && (
                            <span className="d-flex align-items-center gap-1 text-success small fw-medium me-2">
                                <CheckCircle2
                                    size={15}
                                />
                                {savedAt}
                            </span>
                        )}

                        {/* BULK IMPORT */}

                        <Button
                            variant="light"
                            size="sm"
                            className="px-3 py-2 border fw-semibold d-flex align-items-center gap-2"
                            onClick={() => {
                                setImportResult(
                                    null
                                );
                                setExcelFile(null);

                                if (
                                    fileInputRef.current
                                ) {
                                    fileInputRef.current.value =
                                        '';
                                }

                                setShowImportModal(
                                    true
                                );
                            }}
                        >
                            <Upload size={15} />
                            Bulk Import
                        </Button>

                        {/* SAVE */}

                        <Button
                            size="sm"
                            className="px-4 py-2 border-0 fw-semibold d-flex align-items-center gap-2"
                            style={{
                                backgroundColor:
                                    '#4c1d95'
                            }}
                            onClick={
                                handleSaveAll
                            }
                            disabled={saving}
                        >
                            <Save size={15} />

                            {saving
                                ? 'Saving...'
                                : 'Save All Marks'}
                        </Button>

                        {/* BACK */}

                        <Button
                            size="sm"
                            variant="outline-primary"
                            className="px-3 d-flex align-items-center gap-1 rounded-2"
                            onClick={handleDownloadExcel}
                        >
                            <Download size={14} /> Download Excel
                        </Button>
                        <div className="position-relative">
                            <input
                                type="file"
                                accept=".xlsx,.xls"
                                onChange={handleImportExcel}
                                style={{ display: 'none' }}
                                id="marksImportInput"
                            />
                            <Button
                                size="sm"
                                variant="outline-primary"
                                className="px-3 d-flex align-items-center gap-1 rounded-2"
                                onClick={() => document.getElementById('marksImportInput').click()}
                            >
                                <Upload size={14} /> Upload Excel
                            </Button>
                        </div>
                        <Button
                            variant="light"
                            size="sm"
                            className="px-3 border d-flex align-items-center gap-1"
                            onClick={() =>
                                navigate(
                                    `/faculty/courses/${courseId}?tab=Activities`
                                )
                            }
                        >
                            <ArrowLeft
                                size={15}
                            />
                            Back
                        </Button>
                    </div>
                </div>

                {/* Question Summary */}

                <div className="d-flex flex-wrap gap-2 mb-4">
                    {assessment.questions.map(
                        (q, i) => (
                            <div
                                key={i}
                                className="px-3 py-2 rounded-2 text-center"
                                style={{
                                    backgroundColor:
                                        '#f5f3ff',
                                    border:
                                        '1px solid #e0d8f0',
                                    minWidth: 64
                                }}
                            >
                                <div
                                    className="fw-semibold small"
                                    style={{
                                        color: '#6d28d9'
                                    }}
                                >
                                    {q.questionName ||
                                        `Q${i + 1}`}
                                </div>

                                <div
                                    className="text-muted"
                                    style={{
                                        fontSize:
                                            '0.75rem'
                                    }}
                                >
                                    {q.maxMarks} pts
                                </div>
                            </div>
                        )
                    )}
                </div>

                {/* Marks Table */}

                {students.length === 0 ? (
                    <div className="text-center py-5 border rounded-3">
                        <p className="text-muted mb-0">
                            No students enrolled in
                            this course yet.
                        </p>
                    </div>
                ) : (
                    <div className="border rounded-3 overflow-hidden">
                        <Table
                            responsive
                            className="mb-0 align-middle"
                            style={{
                                fontSize: '0.85rem'
                            }}
                        >
                            <thead
                                style={{
                                    backgroundColor:
                                        '#f8f7ff'
                                }}
                            >
                                <tr>
                                    <th
                                        className="px-3 py-2 text-muted fw-semibold"
                                        style={{
                                            width: 40
                                        }}
                                    >
                                        #
                                    </th>

                                    <th
                                        className="px-3 py-2 fw-semibold"
                                        style={{
                                            color: '#6d28d9',
                                            minWidth: 160
                                        }}
                                    >
                                        Student
                                    </th>

                                    <th
                                        className="px-3 py-2 text-muted fw-semibold"
                                        style={{
                                            minWidth: 100
                                        }}
                                    >
                                        Reg No
                                    </th>

                                    {assessment.questions.map(
                                        (q, i) => (
                                            <th
                                                key={i}
                                                className="px-3 py-2 text-muted fw-semibold text-center"
                                                style={{
                                                    minWidth: 90
                                                }}
                                            >
                                                {q.questionName ||
                                                    `Q${i + 1}`}
                                                <br />

                                                <span
                                                    className="fw-normal"
                                                    style={{
                                                        fontSize:
                                                            '0.72rem'
                                                    }}
                                                >
                                                    /{' '}
                                                    {
                                                        q.maxMarks
                                                    }
                                                </span>
                                            </th>
                                        )
                                    )}

                                    <th
                                        className="px-3 py-2 text-muted fw-semibold text-center"
                                        style={{
                                            minWidth: 80
                                        }}
                                    >
                                        Total
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {students.map(
                                    (
                                        student,
                                        idx
                                    ) => (
                                        <tr
                                            key={
                                                student._id
                                            }
                                        >
                                            <td className="px-3 py-2 text-muted">
                                                {idx + 1}
                                            </td>

                                            <td className="px-3 py-2 fw-medium text-dark">
                                                {
                                                    student.name
                                                }
                                            </td>

                                            <td className="px-3 py-2 text-muted">
                                                {
                                                    student.regNo
                                                }
                                            </td>

                                            {assessment.questions.map(
                                                (
                                                    q,
                                                    qIdx
                                                ) => (
                                                    <td
                                                        key={
                                                            qIdx
                                                        }
                                                        className="px-3 py-2 text-center"
                                                    >
                                                        <Form.Control
                                                            type="number"
                                                            size="sm"
                                                            min={
                                                                0
                                                            }
                                                            max={
                                                                q.maxMarks
                                                            }
                                                            value={
                                                                marks[
                                                                    student
                                                                        ._id
                                                                ]?.[
                                                                    qIdx
                                                                ] ??
                                                                ''
                                                            }
                                                            onChange={e =>
                                                                handleMarkChange(
                                                                    student._id,
                                                                    qIdx,
                                                                    e
                                                                        .target
                                                                        .value
                                                                )
                                                            }
                                                            className="text-center shadow-none mx-auto"
                                                            style={{
                                                                width: 72,
                                                                borderColor:
                                                                    '#ccc'
                                                            }}
                                                        />
                                                    </td>
                                                )
                                            )}

                                            <td className="px-3 py-2 text-center">
                                                <span
                                                    className="fw-bold rounded-2 px-2 py-1"
                                                    style={{
                                                        backgroundColor:
                                                            '#f5f3ff',
                                                        color: '#6d28d9',
                                                        fontSize:
                                                            '0.85rem'
                                                    }}
                                                >
                                                    {totalFor(
                                                        student._id
                                                    )}
                                                </span>
                                            </td>
                                        </tr>
                                    )
                                )}
                            </tbody>
                        </Table>
                    </div>
                )}

                {/* Bottom Save */}

                {students.length > 0 && (
                    <div className="d-flex justify-content-end mt-3 gap-3 align-items-center">
                        {savedAt && (
                            <span className="d-flex align-items-center gap-1 text-success small fw-medium">
                                <CheckCircle2
                                    size={15}
                                />
                                Saved at {savedAt}
                            </span>
                        )}

                        <Button
                            size="sm"
                            className="px-4 py-2 border-0 fw-semibold d-flex align-items-center gap-2"
                            style={{
                                backgroundColor:
                                    '#4c1d95'
                            }}
                            onClick={
                                handleSaveAll
                            }
                            disabled={saving}
                        >
                            <Save size={15} />

                            {saving
                                ? 'Saving...'
                                : 'Save All Marks'}
                        </Button>
                    </div>
                )}

                {/* =================================================
                    BULK IMPORT MODAL
                ================================================= */}

                <Modal
                    show={showImportModal}
                    onHide={
                        handleCloseImportModal
                    }
                    centered
                    size="lg"
                >
                    <Modal.Header
                        closeButton
                        className="border-0 pb-0"
                    >
                        <Modal.Title className="fw-bold d-flex align-items-center gap-2">
                            <FileSpreadsheet
                                size={22}
                                style={{
                                    color: '#6d28d9'
                                }}
                            />

                            Bulk Import Marks
                        </Modal.Title>
                    </Modal.Header>

                    <Modal.Body className="p-4">
                        {!importResult ? (
                            <>
                                {/* STEP 1 */}

                                <div className="border rounded-4 p-4 mb-4 bg-white shadow-sm">
                                    <div className="d-flex align-items-start gap-3">
                                        <div className="rounded-circle p-2 mt-1 border bg-light">
                                            <Download
                                                size={20}
                                            />
                                        </div>

                                        <div className="flex-grow-1">
                                            <h6 className="fw-bold mb-1">
                                                Step 1 —
                                                Download
                                                the Excel
                                                Template
                                            </h6>

                                            <p className="text-muted small mb-3">
                                                Download the
                                                template for
                                                this
                                                assessment.
                                                Student names,
                                                registration
                                                numbers and
                                                question
                                                columns are
                                                already
                                                prepared.
                                                Only enter
                                                marks in the
                                                question
                                                columns.
                                            </p>

                                            <Button
                                                size="sm"
                                                onClick={
                                                    downloadTemplate
                                                }
                                                className="d-flex align-items-center gap-2 border-0"
                                                style={{
                                                    backgroundColor:
                                                        '#4c1d95'
                                                }}
                                            >
                                                <Download
                                                    size={
                                                        15
                                                    }
                                                />

                                                Download
                                                Template
                                                (.xlsx)
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                {/* STEP 2 */}

                                <div className="border rounded-4 p-4 bg-white shadow-sm">
                                    <div className="d-flex align-items-start gap-3">
                                        <div className="rounded-circle p-2 mt-1 border bg-light text-success">
                                            <Upload
                                                size={20}
                                            />
                                        </div>

                                        <div className="flex-grow-1">
                                            <h6 className="fw-bold mb-1">
                                                Step 2 —
                                                Import
                                                Completed
                                                Excel
                                            </h6>

                                            <p className="text-muted small mb-3">
                                                Complete the
                                                downloaded
                                                template
                                                without
                                                changing
                                                column names,
                                                student names
                                                or registration
                                                numbers.
                                            </p>

                                            <Form.Control
                                                type="file"
                                                accept=".xlsx,.xls"
                                                ref={
                                                    fileInputRef
                                                }
                                                onChange={e =>
                                                    setExcelFile(
                                                        e
                                                            .target
                                                            .files[0]
                                                    )
                                                }
                                                className="border rounded-3 shadow-sm"
                                            />

                                            {excelFile && (
                                                <p className="text-success small mt-2 mb-0 d-flex align-items-center gap-1">
                                                    <CheckCircle
                                                        size={
                                                            14
                                                        }
                                                    />

                                                    {
                                                        excelFile.name
                                                    }{' '}
                                                    selected
                                                </p>
                                            )}

                                            <div className="mt-3 p-3 rounded-3 bg-light">
                                                <div className="small fw-semibold text-dark mb-1">
                                                    Important
                                                </div>

                                                <div className="text-muted small">
                                                    The system
                                                    will reject
                                                    files if
                                                    column names
                                                    or their
                                                    order are
                                                    changed.
                                                    Student
                                                    information
                                                    is also
                                                    verified
                                                    against the
                                                    enrolled
                                                    students.
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            /* IMPORT RESULT */

                            <div className="text-center py-3">
                                <div
                                    className={`${
                                        importResult.errors
                                            .length >
                                        0
                                            ? 'bg-warning-subtle'
                                            : 'bg-success-subtle'
                                    } rounded-circle d-inline-flex p-4 mb-3`}
                                >
                                    <CheckCircle
                                        size={40}
                                        className={
                                            importResult
                                                .errors
                                                .length >
                                            0
                                                ? 'text-warning'
                                                : 'text-success'
                                        }
                                    />
                                </div>

                                <h5 className="fw-bold mb-2">
                                    Import Complete
                                </h5>

                                <p className="text-muted mb-4">
                                    The imported marks
                                    have been loaded
                                    into the marks table.
                                </p>

                                <Row className="g-3 justify-content-center">
                                    <Col xs={5}>
                                        <div className="bg-success-subtle rounded-4 p-3">
                                            <div className="fw-bold fs-2 text-success">
                                                {
                                                    importResult.imported
                                                }
                                            </div>

                                            <div className="text-muted small">
                                                Students
                                                Imported
                                            </div>
                                        </div>
                                    </Col>

                                    <Col xs={5}>
                                        <div className="bg-warning-subtle rounded-4 p-3">
                                            <div className="fw-bold fs-2 text-warning">
                                                {
                                                    importResult.skipped
                                                }
                                            </div>

                                            <div className="text-muted small">
                                                Rows Skipped
                                            </div>
                                        </div>
                                    </Col>
                                </Row>

                                {importResult.errors
                                    .length >
                                    0 && (
                                    <div className="text-start mt-4 p-3 rounded-3 bg-warning-subtle">
                                        <div className="fw-semibold mb-2">
                                            Issues found:
                                        </div>

                                        <ul className="small mb-0">
                                            {importResult.errors
                                                .slice(
                                                    0,
                                                    8
                                                )
                                                .map(
                                                    (
                                                        error,
                                                        index
                                                    ) => (
                                                        <li
                                                            key={
                                                                index
                                                            }
                                                        >
                                                            {
                                                                error
                                                            }
                                                        </li>
                                                    )
                                                )}
                                        </ul>

                                        {importResult
                                            .errors
                                            .length >
                                            8 && (
                                            <div className="small text-muted mt-2">
                                                And{' '}
                                                {importResult
                                                    .errors
                                                    .length -
                                                    8}{' '}
                                                more issue(s).
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="mt-4 p-3 rounded-3 bg-light text-start">
                                    <div className="fw-semibold small mb-1">
                                        Next step
                                    </div>

                                    <div className="text-muted small">
                                        Close this window,
                                        review the imported
                                        marks in the table,
                                        make any necessary
                                        manual changes, then
                                        click{' '}
                                        <strong>
                                            Save All Marks
                                        </strong>
                                        .
                                    </div>
                                </div>
                            </div>
                        )}
                    </Modal.Body>

                    <Modal.Footer className="border-0 p-4 pt-0">
                        <Button
                            variant="light"
                            onClick={
                                handleCloseImportModal
                            }
                            className="px-4 border-0"
                        >
                            {importResult
                                ? 'Close & Review Marks'
                                : 'Cancel'}
                        </Button>

                        {!importResult && (
                            <motion.div
                                whileHover={{
                                    scale: 1.03
                                }}
                                whileTap={{
                                    scale: 0.97
                                }}
                            >
                                <Button
                                    variant="success"
                                    onClick={
                                        handleImportSubmit
                                    }
                                    disabled={
                                        importing ||
                                        !excelFile
                                    }
                                    className="d-flex align-items-center gap-2 px-5 border-0 shadow-sm fw-semibold py-2"
                                >
                                    <Upload
                                        size={17}
                                    />

                                    {importing
                                        ? 'Importing...'
                                        : 'Import Marks'}
                                </Button>
                            </motion.div>
                        )}
                    </Modal.Footer>
                </Modal>
            </Container>
        </motion.div>
    );
};

export default MarksEntry;