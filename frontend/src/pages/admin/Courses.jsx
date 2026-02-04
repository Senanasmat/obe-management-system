import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Container, Card, Form, Button, Row, Col, Alert } from 'react-bootstrap';

const Courses = () => {
    const [courses, setCourses] = useState([]);
    const [formData, setFormData] = useState({ name: '', code: '', creditHours: 3 });
    const { user } = useAuth();
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        fetchCourses();
    }, []);

    const fetchCourses = async () => {
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            const { data } = await axios.get('/api/admin/courses', config);
            setCourses(data);
        } catch (error) {
            console.error(error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            await axios.post('/api/admin/courses', formData, config);
            setFormData({ name: '', code: '', creditHours: 3 });
            setSuccess('Course created successfully!');
            fetchCourses();
            setTimeout(() => setSuccess(''), 3000);
        } catch (error) {
            setError('Error adding course');
        }
    };

    return (
        <Container fluid>
            <h2 className="mb-4">Manage Courses</h2>

            <Card className="shadow-sm mb-4">
                <Card.Body>
                    <Form onSubmit={handleSubmit} className="row g-3">
                        {error && <Alert variant="danger" className="w-100">{error}</Alert>}
                        {success && <Alert variant="success" className="w-100">{success}</Alert>}
                        <Col md={4}>
                            <Form.Control
                                type="text" placeholder="Course Name"
                                value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </Col>
                        <Col md={3}>
                            <Form.Control
                                type="text" placeholder="Course Code"
                                value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })}
                                required
                            />
                        </Col>
                        <Col md={2}>
                            <Form.Control
                                type="number" placeholder="Credits"
                                value={formData.creditHours} onChange={e => setFormData({ ...formData, creditHours: e.target.value })}
                                required
                            />
                        </Col>
                        <Col md={3}>
                            <Button type="submit" variant="success" className="w-100">Create Course</Button>
                        </Col>
                    </Form>
                </Card.Body>
            </Card>

            <Row xs={1} md={2} lg={3} className="g-4">
                {courses.map(course => (
                    <Col key={course._id}>
                        <Card className="h-100 shadow-sm">
                            <Card.Body>
                                <div className="d-flex justify-content-between align-items-start mb-2">
                                    <div>
                                        <Card.Title>{course.name}</Card.Title>
                                        <Card.Subtitle className="text-muted">{course.code}</Card.Subtitle>
                                    </div>
                                    <span className="badge bg-primary rounded-pill">{course.creditHours} CH</span>
                                </div>
                                <hr />
                                <Card.Text className="text-muted small">
                                    Faculty: <strong>{course.faculty ? course.faculty.name : 'Unassigned'}</strong>
                                </Card.Text>
                            </Card.Body>
                        </Card>
                    </Col>
                ))}
            </Row>
        </Container>
    );
};

export default Courses;
