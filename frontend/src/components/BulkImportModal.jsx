import { useRef, useState } from 'react';
import { Modal, Button, Form, Row, Col } from 'react-bootstrap';
import { motion } from 'framer-motion';
import { Upload, Download, FileSpreadsheet, CheckCircle } from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { showError } from '../utils/notifications';

/**
 * Generic CSV bulk-import modal.
 *
 * Props:
 *  - show / onHide
 *  - title          e.g. "Bulk Import Courses"
 *  - entityLabel    plural label shown in the results, e.g. "Courses"
 *  - endpoint       POST endpoint receiving the multipart `file`
 *  - columns        array of { name, required } describing the CSV header
 *  - sampleRows     array of CSV lines used for the downloadable template
 *  - templateName   file name of the downloaded template
 *  - note           optional extra hint shown under the upload step
 *  - onImported     callback fired after a successful import
 */
const BulkImportModal = ({
    show,
    onHide,
    title,
    entityLabel,
    endpoint,
    columns,
    sampleRows = [],
    templateName,
    note,
    onImported
}) => {
    const { user } = useAuth();
    const [csvFile, setCsvFile] = useState(null);
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState(null);
    const fileInputRef = useRef(null);

    const downloadTemplate = () => {
        const header = columns.map(c => c.name).join(',');
        const blob = new Blob([[header, ...sampleRows].join('\n')], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = templateName;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleImport = async () => {
        if (!csvFile) {
            showError('No file selected', 'Please select a CSV file first.');
            return;
        }
        setImporting(true);
        setImportResult(null);
        try {
            const payload = new FormData();
            payload.append('file', csvFile);
            const { data } = await api.post(endpoint, payload, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            setImportResult(data);
            onImported?.();
        } catch (error) {
            showError('Import Failed', error.response?.data?.message || 'Could not process the CSV file.');
        } finally {
            setImporting(false);
        }
    };

    const handleClose = () => {
        setCsvFile(null);
        setImportResult(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        onHide();
    };

    return (
        <Modal show={show} onHide={handleClose} centered size="lg">
            <Modal.Header closeButton className="border-0 pb-0">
                <Modal.Title className="fw-bold d-flex align-items-center gap-2">
                    <FileSpreadsheet size={22} style={{ color: '#6d28d9' }} /> {title}
                </Modal.Title>
            </Modal.Header>
            <Modal.Body className="p-4">
                {!importResult ? (
                    <>
                        <div className="border rounded-4 p-4 mb-4 bg-white shadow-sm">
                            <div className="d-flex align-items-start gap-3">
                                <div className="rounded-circle p-2 mt-1 border bg-light">
                                    <Download size={20} />
                                </div>
                                <div className="flex-grow-1">
                                    <h6 className="fw-bold mb-1">Step 1 — Download the CSV Template</h6>
                                    <p className="text-muted small mb-3">
                                        Columns:{' '}
                                        {columns.map((c, i) => (
                                            <span key={c.name}>
                                                <code>{c.name}</code>{!c.required && ' (optional)'}
                                                {i < columns.length - 1 && ', '}
                                            </span>
                                        ))}
                                        . One record per row.
                                    </p>
                                    <Button
                                        size="sm"
                                        onClick={downloadTemplate}
                                        className="d-flex align-items-center gap-2 border-0"
                                        style={{ backgroundColor: '#4c1d95' }}
                                    >
                                        <Download size={15} /> Download Template (.csv)
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <div className="border rounded-4 p-4 bg-white shadow-sm">
                            <div className="d-flex align-items-start gap-3">
                                <div className="rounded-circle p-2 mt-1 border bg-light text-success">
                                    <Upload size={20} />
                                </div>
                                <div className="flex-grow-1">
                                    <h6 className="fw-bold mb-1">Step 2 — Upload Your Completed CSV</h6>
                                    <p className="text-muted small mb-3">
                                        Duplicates are skipped automatically. Existing records are never overwritten.
                                        {note && <> {note}</>}
                                    </p>
                                    <Form.Control
                                        type="file"
                                        accept=".csv"
                                        ref={fileInputRef}
                                        onChange={e => setCsvFile(e.target.files[0])}
                                        className="border rounded-3 shadow-sm"
                                    />
                                    {csvFile && (
                                        <p className="text-success small mt-2 mb-0 d-flex align-items-center gap-1">
                                            <CheckCircle size={14} /> {csvFile.name} selected
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="text-center py-3">
                        <div className={`bg-${importResult.inserted > 0 ? 'success' : 'warning'}-subtle rounded-circle d-inline-flex p-4 mb-3`}>
                            <CheckCircle size={40} className={`text-${importResult.inserted > 0 ? 'success' : 'warning'}`} />
                        </div>
                        <h5 className="fw-bold mb-2">Import Complete!</h5>
                        <p className="text-muted mb-4">{importResult.message}</p>
                        <Row className="g-3 justify-content-center">
                            <Col xs={5}>
                                <div className="bg-success-subtle rounded-4 p-3">
                                    <div className="fw-bold fs-2 text-success">{importResult.inserted}</div>
                                    <div className="text-muted small">{entityLabel} Added</div>
                                </div>
                            </Col>
                            <Col xs={5}>
                                <div className="bg-warning-subtle rounded-4 p-3">
                                    <div className="fw-bold fs-2 text-warning">{importResult.skipped}</div>
                                    <div className="text-muted small">Skipped</div>
                                </div>
                            </Col>
                        </Row>
                        {importResult.errors?.length > 0 && (
                            <div
                                className="text-start small text-muted border rounded-3 p-3 mt-4"
                                style={{ maxHeight: 180, overflowY: 'auto' }}
                            >
                                {importResult.errors.map((err, i) => (
                                    <div key={i}>{err}</div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </Modal.Body>
            <Modal.Footer className="border-0 p-4 pt-0">
                <Button variant="light" onClick={handleClose} className="px-4 border-0">
                    {importResult ? 'Close' : 'Cancel'}
                </Button>
                {!importResult && (
                    <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                        <Button
                            variant="success"
                            onClick={handleImport}
                            disabled={importing || !csvFile}
                            className="d-flex align-items-center gap-2 px-5 border-0 shadow-sm fw-semibold py-2"
                        >
                            <Upload size={17} />
                            {importing ? 'Importing...' : 'Start Import'}
                        </Button>
                    </motion.div>
                )}
            </Modal.Footer>
        </Modal>
    );
};

export default BulkImportModal;
