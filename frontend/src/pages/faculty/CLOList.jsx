import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
    Alert,
    Badge,
    Button,
    Card,
    Col,
    Form,
    Row,
    Spinner,
    Table
} from 'react-bootstrap';
import api from '../../utils/api';

const API = '/api/faculty';

const emptyMapping = {
    batch: '',
    academicTermId: '',
    ploId: '',
    learningType: 'Cognitive',
    level: '',
    emphasisLevel: ''
};

function CLOList() {
    const { courseId } = useParams();

    const [clos, setClos] = useState([]);
    const [plos, setPlos] = useState([]);
    const [terms, setTerms] = useState([]);
    const [mappings, setMappings] = useState([]);
    const [batches, setBatches] = useState([]);

    const [code, setCode] = useState('');
    const [description, setDescription] = useState('');

    const [expandedCloId, setExpandedCloId] = useState(null);
    const [mappingCloId, setMappingCloId] = useState(null);
    const [mappingForm, setMappingForm] = useState(emptyMapping);

    const [loading, setLoading] = useState(true);
    const [savingClo, setSavingClo] = useState(false);
    const [savingMapping, setSavingMapping] = useState(false);

    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const loadData = useCallback(async () => {
        if (!courseId) {
            setError('Course ID is missing from the URL.');
            setLoading(false);
            return;
        }

        setLoading(true);
        setError('');

        try {
            const [coursesRes, plosRes, termsRes, mappingsRes] =
                await Promise.all([
                    api.get(`${API}/courses`),
                    api.get(`${API}/plos`),
                    api.get(`${API}/academic-terms`),
                    api.get(`${API}/courses/${courseId}/clo-mappings`)
                ]);

            const assignments = coursesRes.data || [];

            // Supports either populated course assignments or direct courses.
            const assignment = assignments.find((item) => {
                const assignedCourse = item.course || item;
                return String(assignedCourse?._id) === String(courseId);
            });

            const course = assignment?.course || assignment;

            if (!course?._id) {
                throw new Error(
                    'This course was not found in your assigned courses.'
                );
            }

            const courseClos = course.clos || [];
            const courseStudents = course.students || [];

            setClos(courseClos);
            setPlos(plosRes.data || []);
            setTerms(termsRes.data || []);
            setMappings(mappingsRes.data || []);

            // Batches come from the students already enrolled in this course.
            const uniqueBatches = [
                ...new Set(
                    courseStudents
                        .map((student) =>
                            typeof student.batch === 'string'
                                ? student.batch.trim()
                                : ''
                        )
                        .filter(Boolean)
                )
            ].sort();

            setBatches(uniqueBatches);
        } catch (err) {
            setError(
                err.response?.data?.message ||
                err.message ||
                'Unable to load CLO data.'
            );
        } finally {
            setLoading(false);
        }
    }, [courseId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleCreateCLO = async (event) => {
        event.preventDefault();
        setError('');
        setSuccess('');

        if (!code.trim() || !description.trim()) {
            setError('Please enter both CLO code and description.');
            return;
        }

        setSavingClo(true);

        try {
            await api.post(`${API}/courses/${courseId}/clos`, {
                code: code.trim(),
                description: description.trim()
            });

            setCode('');
            setDescription('');
            setSuccess('CLO created successfully.');
            await loadData();
        } catch (err) {
            setError(
                err.response?.data?.message || 'Unable to create CLO.'
            );
        } finally {
            setSavingClo(false);
        }
    };

    const openMappingForm = (cloId) => {
        setError('');
        setSuccess('');
        setMappingCloId(cloId);
        setMappingForm({
            ...emptyMapping,
            batch: batches.length === 1 ? batches[0] : ''
        });
    };

    const handleMappingChange = (field, value) => {
        setMappingForm((previous) => ({
            ...previous,
            [field]: value
        }));
    };

    const handleCreateMapping = async (event) => {
        event.preventDefault();
        setError('');
        setSuccess('');

        if (
            !mappingCloId ||
            !mappingForm.batch ||
            !mappingForm.academicTermId ||
            !mappingForm.ploId
        ) {
            setError(
                'Please select a batch, academic term, and PLO.'
            );
            return;
        }

        setSavingMapping(true);

        try {
            await api.post(
                `${API}/courses/${courseId}/clo-mappings`,
                {
                    cloId: mappingCloId,
                    batch: mappingForm.batch,
                    academicTermId: mappingForm.academicTermId,
                    ploId: mappingForm.ploId,
                    learningType: mappingForm.learningType,
                    level: mappingForm.level,
                    emphasisLevel: mappingForm.emphasisLevel
                }
            );

            setMappingCloId(null);
            setMappingForm(emptyMapping);
            setSuccess('CLO mapping added successfully.');
            setExpandedCloId(mappingCloId);

            await loadData();
        } catch (err) {
            setError(
                err.response?.data?.message ||
                'Unable to save this mapping.'
            );
        } finally {
            setSavingMapping(false);
        }
    };

    const getCloId = (clo) => String(clo._id);

    const getCloMappings = (cloId) =>
        mappings.filter((mapping) => {
            const mappedCloId =
                mapping.clo?._id || mapping.clo;

            return String(mappedCloId) === String(cloId);
        });

    const getTermLabel = (term) => {
        if (!term) return 'Unknown term';

        return term.name ||
            `${term.season || ''} ${term.year || ''}`.trim();
    };

    if (loading) {
        return (
            <div className="d-flex justify-content-center p-5">
                <Spinner animation="border" role="status" />
                <span className="ms-2">Loading CLOs...</span>
            </div>
        );
    }

    return (
        <div className="container-fluid py-3">
            <div className="d-flex justify-content-between align-items-center mb-2">
                <div>
                    <h4 className="mb-1">Course Learning Outcomes</h4>
                    <p className="text-muted mb-0">
                        Showing {clos.length} CLO
                        {clos.length === 1 ? '' : 's'}.
                    </p>
                </div>
            </div>

            {error && (
                <Alert
                    variant="danger"
                    dismissible
                    onClose={() => setError('')}
                >
                    {error}
                </Alert>
            )}

            {success && (
                <Alert
                    variant="success"
                    dismissible
                    onClose={() => setSuccess('')}
                >
                    {success}
                </Alert>
            )}

            <Card className="mb-4">
                <Card.Header>
                    <strong>Add Course Learning Outcome</strong>
                </Card.Header>

                <Card.Body>
                    <Form onSubmit={handleCreateCLO}>
                        <Row className="g-3">
                            <Col md={3}>
                                <Form.Group>
                                    <Form.Label>CLO Code</Form.Label>
                                    <Form.Control
                                        value={code}
                                        onChange={(e) =>
                                            setCode(e.target.value)
                                        }
                                        placeholder="e.g. CLO1"
                                        required
                                    />
                                </Form.Group>
                            </Col>

                            <Col md={7}>
                                <Form.Group>
                                    <Form.Label>Description</Form.Label>
                                    <Form.Control
                                        value={description}
                                        onChange={(e) =>
                                            setDescription(e.target.value)
                                        }
                                        placeholder="Enter CLO description"
                                        required
                                    />
                                </Form.Group>
                            </Col>

                            <Col md={2} className="d-flex align-items-end">
                                <Button
                                    type="submit"
                                    variant="success"
                                    disabled={savingClo}
                                    className="w-100"
                                >
                                    {savingClo ? 'Saving...' : 'Add CLO'}
                                </Button>
                            </Col>
                        </Row>
                    </Form>
                </Card.Body>
            </Card>

            {clos.length === 0 ? (
                <Alert variant="info">
                    No CLOs have been added to this course yet.
                </Alert>
            ) : (
                <div className="table-responsive">
                    <Table bordered hover className="align-middle">
                        <thead>
                            <tr>
                                <th style={{ width: '55px' }}>#</th>
                                <th style={{ width: '170px' }}>Code</th>
                                <th>Description</th>
                                <th style={{ width: '110px' }}>Type</th>
                                <th style={{ width: '100px' }}>Active</th>
                                <th style={{ width: '75px' }}>Mappings</th>
                            </tr>
                        </thead>

                        <tbody>
                            {clos.map((clo, index) => {
                                const cloId = getCloId(clo);
                                const cloMappings = getCloMappings(cloId);
                                const isExpanded = expandedCloId === cloId;

                                return (
                                    <>
                                        <tr key={cloId}>
                                            <td>{index + 1}</td>

                                            <td>
                                                <strong>{clo.code}</strong>
                                                <div className="mt-1">
                                                    <Badge
                                                        bg={
                                                            cloMappings.length
                                                                ? 'success'
                                                                : 'warning'
                                                        }
                                                    >
                                                        {cloMappings.length
                                                            ? 'Mapped'
                                                            : 'Unmapped'}
                                                    </Badge>
                                                </div>
                                            </td>

                                            <td>{clo.description}</td>
                                            <td>Custom</td>
                                            <td>
                                                <Badge bg="success">
                                                    Yes
                                                </Badge>
                                            </td>

                                            <td className="text-center">
                                                <Button
                                                    size="sm"
                                                    variant="outline-secondary"
                                                    onClick={() =>
                                                        setExpandedCloId(
                                                            isExpanded
                                                                ? null
                                                                : cloId
                                                        )
                                                    }
                                                    aria-expanded={isExpanded}
                                                    aria-label={
                                                        isExpanded
                                                            ? 'Hide mappings'
                                                            : 'Show mappings'
                                                    }
                                                >
                                                    {isExpanded ? '−' : '⌄'}
                                                </Button>
                                            </td>
                                        </tr>

                                        {isExpanded && (
                                            <tr key={`${cloId}-mappings`}>
                                                <td colSpan={6}>
                                                    <div className="px-3 py-2">
                                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                                            <h5 className="mb-0">
                                                                {clo.code} Mapping
                                                            </h5>

                                                            <Button
                                                                variant="outline-success"
                                                                onClick={() =>
                                                                    openMappingForm(cloId)
                                                                }
                                                            >
                                                                Add Mapping
                                                            </Button>
                                                        </div>

                                                        <p className="text-muted mb-2">
                                                            Total {cloMappings.length}{' '}
                                                            {cloMappings.length === 1
                                                                ? 'item'
                                                                : 'items'}.
                                                        </p>

                                                        {cloMappings.length === 0 ? (
                                                            <Alert variant="light">
                                                                This CLO has no mappings yet.
                                                                Click Add Mapping to begin.
                                                            </Alert>
                                                        ) : (
                                                            <div className="table-responsive">
                                                                <Table
                                                                    bordered
                                                                    striped
                                                                    className="mb-0"
                                                                >
                                                                    <thead>
                                                                        <tr>
                                                                            <th>#</th>
                                                                            <th>Program Batch</th>
                                                                            <th>PLO</th>
                                                                            <th>Academic Term</th>
                                                                            <th>Learning Type</th>
                                                                            <th>Level</th>
                                                                            <th>Emphasis Level</th>
                                                                        </tr>
                                                                    </thead>

                                                                    <tbody>
                                                                        {cloMappings.map(
                                                                            (mapping, mappingIndex) => (
                                                                                <tr key={mapping._id}>
                                                                                    <td>
                                                                                        {mappingIndex + 1}
                                                                                    </td>
                                                                                    <td>
                                                                                        {mapping.batch}
                                                                                    </td>
                                                                                    <td>
                                                                                        {mapping.plo?.code}
                                                                                        {mapping.plo?.title
                                                                                            ? ` - ${mapping.plo.title}`
                                                                                            : ''}
                                                                                    </td>
                                                                                    <td>
                                                                                        {getTermLabel(
                                                                                            mapping.academicTerm
                                                                                        )}
                                                                                    </td>
                                                                                    <td>
                                                                                        {mapping.learningType || '—'}
                                                                                    </td>
                                                                                    <td>
                                                                                        {mapping.level || '—'}
                                                                                    </td>
                                                                                    <td>
                                                                                        {mapping.emphasisLevel || '—'}
                                                                                    </td>
                                                                                </tr>
                                                                            )
                                                                        )}
                                                                    </tbody>
                                                                </Table>
                                                            </div>
                                                        )}

                                                        {mappingCloId === cloId && (
                                                            <Card className="mt-3">
                                                                <Card.Header>
                                                                    <strong>
                                                                        Add PLO Mapping for {clo.code}
                                                                    </strong>
                                                                </Card.Header>

                                                                <Card.Body>
                                                                    <Form
                                                                        onSubmit={handleCreateMapping}
                                                                    >
                                                                        <Row className="g-3">
                                                                            <Col md={6}>
                                                                                <Form.Group>
                                                                                    <Form.Label>
                                                                                        Program Batch
                                                                                    </Form.Label>
                                                                                    <Form.Select
                                                                                        value={mappingForm.batch}
                                                                                        onChange={(e) =>
                                                                                            handleMappingChange(
                                                                                                'batch',
                                                                                                e.target.value
                                                                                            )
                                                                                        }
                                                                                        required
                                                                                    >
                                                                                        <option value="">
                                                                                            Select batch
                                                                                        </option>

                                                                                        {batches.map((batch) => (
                                                                                            <option
                                                                                                key={batch}
                                                                                                value={batch}
                                                                                            >
                                                                                                {batch}
                                                                                            </option>
                                                                                        ))}
                                                                                    </Form.Select>

                                                                                    {batches.length === 0 && (
                                                                                        <Form.Text className="text-danger">
                                                                                            No batches found among
                                                                                            students enrolled in this course.
                                                                                        </Form.Text>
                                                                                    )}
                                                                                </Form.Group>
                                                                            </Col>

                                                                            <Col md={6}>
                                                                                <Form.Group>
                                                                                    <Form.Label>
                                                                                        Academic Term
                                                                                    </Form.Label>
                                                                                    <Form.Select
                                                                                        value={mappingForm.academicTermId}
                                                                                        onChange={(e) =>
                                                                                            handleMappingChange(
                                                                                                'academicTermId',
                                                                                                e.target.value
                                                                                            )
                                                                                        }
                                                                                        required
                                                                                    >
                                                                                        <option value="">
                                                                                            Select academic term
                                                                                        </option>

                                                                                        {terms.map((term) => (
                                                                                            <option
                                                                                                key={term._id}
                                                                                                value={term._id}
                                                                                            >
                                                                                                {getTermLabel(term)}
                                                                                            </option>
                                                                                        ))}
                                                                                    </Form.Select>

                                                                                    {terms.length === 0 && (
                                                                                        <Form.Text className="text-danger">
                                                                                            No academic terms found.
                                                                                            Ask the admin to add one.
                                                                                        </Form.Text>
                                                                                    )}
                                                                                </Form.Group>
                                                                            </Col>

                                                                            <Col md={12}>
                                                                                <Form.Group>
                                                                                    <Form.Label>
                                                                                        PLO
                                                                                    </Form.Label>
                                                                                    <Form.Select
                                                                                        value={mappingForm.ploId}
                                                                                        onChange={(e) =>
                                                                                            handleMappingChange(
                                                                                                'ploId',
                                                                                                e.target.value
                                                                                            )
                                                                                        }
                                                                                        required
                                                                                    >
                                                                                        <option value="">
                                                                                            Select PLO
                                                                                        </option>

                                                                                        {plos.map((plo) => (
                                                                                            <option
                                                                                                key={plo._id}
                                                                                                value={plo._id}
                                                                                            >
                                                                                                {plo.code} - {plo.title}
                                                                                            </option>
                                                                                        ))}
                                                                                    </Form.Select>
                                                                                </Form.Group>
                                                                            </Col>

                                                                            <Col md={4}>
                                                                                <Form.Group>
                                                                                    <Form.Label>
                                                                                        Learning Type
                                                                                    </Form.Label>
                                                                                    <Form.Select
                                                                                        value={mappingForm.learningType}
                                                                                        onChange={(e) =>
                                                                                            handleMappingChange(
                                                                                                'learningType',
                                                                                                e.target.value
                                                                                            )
                                                                                        }
                                                                                    >
                                                                                        <option value="Cognitive">
                                                                                            Cognitive
                                                                                        </option>
                                                                                        <option value="Psychomotor">
                                                                                            Psychomotor
                                                                                        </option>
                                                                                        <option value="Affective">
                                                                                            Affective
                                                                                        </option>
                                                                                    </Form.Select>
                                                                                </Form.Group>
                                                                            </Col>

                                                                            <Col md={4}>
                                                                                <Form.Group>
                                                                                    <Form.Label>
                                                                                        Level
                                                                                    </Form.Label>
                                                                                    <Form.Select
                                                                                        value={mappingForm.level}
                                                                                        onChange={(e) =>
                                                                                            handleMappingChange(
                                                                                                'level',
                                                                                                e.target.value
                                                                                            )
                                                                                        }
                                                                                    >
                                                                                        <option value="">
                                                                                            Select level
                                                                                        </option>
                                                                                        <option value="1 - Remember">
                                                                                            1 - Remember
                                                                                        </option>
                                                                                        <option value="2 - Understand">
                                                                                            2 - Understand
                                                                                        </option>
                                                                                        <option value="3 - Apply">
                                                                                            3 - Apply
                                                                                        </option>
                                                                                        <option value="4 - Analyze">
                                                                                            4 - Analyze
                                                                                        </option>
                                                                                        <option value="5 - Evaluate">
                                                                                            5 - Evaluate
                                                                                        </option>
                                                                                        <option value="6 - Create">
                                                                                            6 - Create
                                                                                        </option>
                                                                                    </Form.Select>
                                                                                </Form.Group>
                                                                            </Col>

                                                                            <Col md={4}>
                                                                                <Form.Group>
                                                                                    <Form.Label>
                                                                                        Emphasis Level
                                                                                    </Form.Label>
                                                                                    <Form.Select
                                                                                        value={mappingForm.emphasisLevel}
                                                                                        onChange={(e) =>
                                                                                            handleMappingChange(
                                                                                                'emphasisLevel',
                                                                                                e.target.value
                                                                                            )
                                                                                        }
                                                                                    >
                                                                                        <option value="">
                                                                                            Select emphasis
                                                                                        </option>
                                                                                        <option value="1 - High">
                                                                                            1 - High
                                                                                        </option>
                                                                                        <option value="2 - Medium">
                                                                                            2 - Medium
                                                                                        </option>
                                                                                        <option value="3 - Low">
                                                                                            3 - Low
                                                                                        </option>
                                                                                    </Form.Select>
                                                                                </Form.Group>
                                                                            </Col>
                                                                        </Row>

                                                                        <div className="d-flex gap-2 mt-4">
                                                                            <Button
                                                                                type="submit"
                                                                                variant="success"
                                                                                disabled={
                                                                                    savingMapping ||
                                                                                    batches.length === 0 ||
                                                                                    terms.length === 0 ||
                                                                                    plos.length === 0
                                                                                }
                                                                            >
                                                                                {savingMapping
                                                                                    ? 'Saving...'
                                                                                    : 'Save Mapping'}
                                                                            </Button>

                                                                            <Button
                                                                                type="button"
                                                                                variant="danger"
                                                                                onClick={() => {
                                                                                    setMappingCloId(null);
                                                                                    setMappingForm(emptyMapping);
                                                                                }}
                                                                            >
                                                                                Close
                                                                            </Button>
                                                                        </div>
                                                                    </Form>
                                                                </Card.Body>
                                                            </Card>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </>
                                );
                            })}
                        </tbody>
                    </Table>
                </div>
            )}
        </div>
    );
}

export default CLOList;
