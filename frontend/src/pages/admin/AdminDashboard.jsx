import { useEffect, useState } from 'react';
import { Users, BookOpen, GraduationCap } from 'lucide-react';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

const StatCard = ({ title, count, icon: Icon, color }) => (
    <Card className="h-100 shadow-sm border-0">
        <Card.Body className="d-flex align-items-center justify-content-between">
            <div>
                <Card.Subtitle className="text-muted mb-2">{title}</Card.Subtitle>
                <Card.Title className="display-6 fw-bold mb-0">{count}</Card.Title>
            </div>
            <div className={`p-3 rounded-circle text-white ${color}`}>
                <Icon size={24} />
            </div>
        </Card.Body>
    </Card>
);

const AdminDashboard = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        totalStudents: 0,
        totalCourses: 0,
        totalPLOs: 0,
        cloAchievements: [],
        ploAchievements: []
    });

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const config = { headers: { Authorization: `Bearer ${user.token}` } };
                const { data } = await axios.get('/api/admin/stats', config);
                setStats(data);
            } catch (error) {
                console.error("Error fetching stats:", error);
            }
        };

        if (user && user.token) {
            fetchStats();
        }
    }, [user]);

    return (
        <Container fluid>
            <h2 className="mb-4">Admin Dashboard</h2>

            <Row className="g-4 mb-4">
                <Col md={4}>
                    <StatCard
                        title="Total Students"
                        count={stats.totalStudents}
                        icon={Users}
                        color="bg-primary"
                    />
                </Col>
                <Col md={4}>
                    <StatCard
                        title="Active Courses"
                        count={stats.totalCourses}
                        icon={BookOpen}
                        color="bg-success"
                    />
                </Col>
                <Col md={4}>
                    <StatCard
                        title="Program Outcomes"
                        count={stats.totalPLOs}
                        icon={GraduationCap}
                        color="bg-secondary"
                    />
                </Col>
            </Row>

            <Row className="g-4 mb-4">
                <Col lg={6}>
                    <Card className="shadow-sm border-0 h-100">
                        <Card.Body>
                            <Card.Title className="mb-4">CLOs Achievement Threshold</Card.Title>
                            <div style={{ width: '100%', height: 300 }}>
                                <ResponsiveContainer>
                                    <BarChart data={stats.cloAchievements}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="code" />
                                        <YAxis unit="%" />
                                        <Tooltip
                                            formatter={(value) => [`${value.toFixed(1)}%`, 'Achievement']}
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                                        />
                                        <Bar dataKey="achievement" fill="#0dcaf0" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col lg={6}>
                    <Card className="shadow-sm border-0 h-100">
                        <Card.Body>
                            <Card.Title className="mb-4">PLOs Achievement Threshold</Card.Title>
                            <div style={{ width: '100%', height: 300 }}>
                                <ResponsiveContainer>
                                    <BarChart data={stats.ploAchievements}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="code" />
                                        <YAxis unit="%" />
                                        <Tooltip
                                            formatter={(value) => [`${value.toFixed(1)}%`, 'Achievement']}
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                                        />
                                        <Bar dataKey="achievement" fill="#198754" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <Card className="shadow-sm border-0">
                <Card.Body>
                    <Card.Title>Quick Actions</Card.Title>
                    <div className="d-flex gap-3 mt-3">
                        <Button variant="outline-primary">Register Student</Button>
                        <Button variant="outline-success">Create Course</Button>
                        <Button variant="outline-secondary">Manage PLOs</Button>
                    </div>
                </Card.Body>
            </Card>
        </Container>
    );
};

export default AdminDashboard;
