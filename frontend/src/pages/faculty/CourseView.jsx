import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Container, Tabs, Tab, Button, Card, Row, Col, ListGroup } from 'react-bootstrap';

const CourseView = () => {
    const { courseId } = useParams();
    const { user } = useAuth();
    const [analytics, setAnalytics] = useState(null);
    const [key, setKey] = useState('assessments');

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const config = { headers: { Authorization: `Bearer ${user.token}` } };
                const { data } = await axios.get(`/api/faculty/analytics/${courseId}`, config);
                setAnalytics(data);
            } catch (error) {
                console.error(error);
            }
        };
        fetchAnalytics();
    }, [courseId, user.token]);

    return (
        <Container fluid>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2>Course Details</h2>
                <Link to={`/faculty/courses/${courseId}/create-assessment`}>
                    <Button variant="primary">Create Assessment</Button>
                </Link>
            </div>

            <Tabs
                id="course-tabs"
                activeKey={key}
                onSelect={(k) => setKey(k)}
                className="mb-4"
            >
                <Tab eventKey="assessments" title="Assessments">
                    <Card className="shadow-sm border-0">
                        <Card.Body>
                            <Card.Title className="mb-4">Assessments</Card.Title>
                            {analytics?.cloStats ? <p>Loading...</p> : <AssessmentList courseId={courseId} />}
                        </Card.Body>
                    </Card>
                </Tab>
                <Tab eventKey="analytics" title="OBE Analytics">
                    <Row className="g-4">
                        <Col md={12}>
                            <Card className="shadow-sm border-0">
                                <Card.Body>
                                    <Card.Title className="mb-4">CLO Achievement</Card.Title>
                                    {analytics?.cloStats ? (
                                        <div style={{ height: '300px', width: '100%' }}>
                                            <ResponsiveContainer>
                                                <BarChart data={analytics.cloStats}>
                                                    <CartesianGrid strokeDasharray="3 3" />
                                                    <XAxis dataKey="cloCode" />
                                                    <YAxis domain={[0, 100]} />
                                                    <Tooltip />
                                                    <Legend />
                                                    <Bar dataKey="percentage" fill="#4F46E5" name="Achievement %" />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    ) : <p className="text-muted">No data available</p>}
                                </Card.Body>
                            </Card>
                        </Col>

                        <Col md={12}>
                            <Card className="shadow-sm border-0">
                                <Card.Body>
                                    <Card.Title className="mb-4">PLO Achievement</Card.Title>
                                    {analytics?.ploStats ? (
                                        <div style={{ height: '300px', width: '100%' }}>
                                            <ResponsiveContainer>
                                                <BarChart data={analytics.ploStats}>
                                                    <CartesianGrid strokeDasharray="3 3" />
                                                    <XAxis dataKey="ploId" />
                                                    <YAxis domain={[0, 100]} />
                                                    <Tooltip />
                                                    <Legend />
                                                    <Bar dataKey="percentage" fill="#10B981" name="Achievement %" />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    ) : <p className="text-muted">No data available</p>}
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>
                </Tab>
            </Tabs>
        </Container>
    );
};

const AssessmentList = ({ courseId }) => {
    const [assessments, setAssessments] = useState([]);
    const { user } = useAuth();

    useEffect(() => {
        const fetchAssessments = async () => {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            const { data } = await axios.get(`/api/faculty/courses/${courseId}/assessments`, config);
            setAssessments(data);
        };
        fetchAssessments();
    }, [courseId, user.token]);

    return (
        <ListGroup variant="flush">
            {assessments.map(a => (
                <ListGroup.Item key={a._id} className="d-flex justify-content-between align-items-center">
                    <div>
                        <h5 className="mb-1">{a.title}</h5>
                        <small className="text-muted">{a.type} - {a.totalMarks} Marks</small>
                    </div>
                    <Link to={`/faculty/courses/${courseId}/marks/${a._id}`}>
                        <Button variant="outline-primary" size="sm">Enter Marks</Button>
                    </Link>
                </ListGroup.Item>
            ))}
            {assessments.length === 0 && <div className="text-muted py-3">No assessments created yet.</div>}
        </ListGroup>
    );
};

export default CourseView;
