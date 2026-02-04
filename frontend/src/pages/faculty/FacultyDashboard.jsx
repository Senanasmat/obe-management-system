import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { BookOpen, Users } from 'lucide-react';
import { Container, Row, Col, Card, Badge } from 'react-bootstrap';

const FacultyDashboard = () => {
    const [courses, setCourses] = useState([]);
    const { user } = useAuth();

    useEffect(() => {
        const fetchCourses = async () => {
            try {
                const config = { headers: { Authorization: `Bearer ${user.token}` } };
                const { data } = await axios.get('/api/faculty/courses', config);
                setCourses(data);
            } catch (error) {
                console.error(error);
            }
        };
        fetchCourses();
    }, [user.token]);

    return (
        <Container fluid>
            <h2 className="mb-4">Faculty Dashboard</h2>

            <Row xs={1} md={2} lg={3} className="g-4">
                {courses.map(course => (
                    <Col key={course._id}>
                        <Link to={`/faculty/courses/${course._id}`} className="text-decoration-none">
                            <Card className="h-100 shadow-sm border-0 hover-shadow transition">
                                <Card.Body>
                                    <div className="d-flex justify-content-between align-items-start mb-3">
                                        <div className="p-2 bg-light rounded text-primary">
                                            <BookOpen size={24} />
                                        </div>
                                        <Badge bg="secondary">{course.code}</Badge>
                                    </div>
                                    <Card.Title className="text-dark mb-3">{course.name}</Card.Title>

                                    <div className="d-flex align-items-center text-muted small">
                                        <Users size={16} className="me-2" />
                                        <span>{course.students ? course.students.length : 0} Students</span>
                                    </div>
                                </Card.Body>
                            </Card>
                        </Link>
                    </Col>
                ))}
            </Row>

            {courses.length === 0 && (
                <div className="text-center py-5">
                    <p className="text-muted">No courses assigned to you yet.</p>
                </div>
            )}
        </Container>
    );
};

export default FacultyDashboard;
