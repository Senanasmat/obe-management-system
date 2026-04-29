import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import { Container, Card, Row, Col } from 'react-bootstrap';
import { BookOpen, Users, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { Dropdown } from 'react-bootstrap';

const CoursesList = () => {
    const { user } = useAuth();
    const [assignments, setAssignments] = useState([]);
    const [semester, setSemester] = useState('');

    // Fetch data
    useEffect(() => {
        const fetchData = async () => {
            try {
                const config = {
                    headers: { Authorization: `Bearer ${user.token}` }
                };

                const { data } = await axios.get('/api/assignments/my', config);
                setAssignments(data);
            } catch (err) {
                console.error(err);
            }
        };

        if (user?.token) fetchData();
    }, [user?.token]);

    // ✅ Unique + sorted semesters (latest first)
    const semesters = [...new Set(assignments.map(a => a.semester))]
        .sort()
        .reverse();

    // ✅ Set default latest semester
    useEffect(() => {
        if (semesters.length > 0) {
            setSemester(semesters[0]);
        }
    }, [assignments]);

    // ✅ Filter only selected semester
    const filtered = assignments.filter(a => a.semester === semester);

    return (
        <Container fluid className="py-4 px-4">

            {/* HEADER */}
            <div className="d-flex justify-content-between align-items-center mb-4">

                <h3 className="fw-bold mb-0">My Courses</h3>

                {/* Semester Select */}
                <div className="d-flex align-items-center gap-2">
                    <span className="fw-semibold text-muted small">
                        Select Semester
                    </span>

                    <select
                        className="form-select w-auto"
                        value={semester}
                        onChange={(e) => setSemester(e.target.value)}
                    >
                        {semesters.map((s, i) => (
                            <option key={i} value={s}>{s}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* COURSES GRID */}
            <Row xs={1} md={2} lg={3} className="g-4">
                {filtered.map(a => (
                    <Col key={a._id}>
                        <motion.div whileHover={{ y: -5 }}>
                                <Card className="shadow-sm border-0 rounded-4 h-100">

                                    <div className="bg-primary text-white p-4">

                                        <Link
                                            to={`/faculty/courses/${a.course._id}`}
                                            className="text-decoration-none"
                                        >
                                            <div className="d-flex align-items-center gap-3">
                                                
                                                {/* Icon */}
                                                <div className="bg-white text-primary rounded-3 p-2">
                                                    <BookOpen size={20} />
                                                </div>

                                                {/* Course Name */}
                                                <div>
                                                    <h6 className="fw-bold mb-0 text-white">
                                                        {a.course.code} - {a.course.name}
                                                    </h6>
                                                </div>

                                            </div>
                                        </Link>
                                    </div>

                                    <Card.Body>

                                        {/* Students */}
                                        <p className="text-muted small mb-3">
                                            <Users size={14} /> {a.course.students?.length || 0} Students Enrolled
                                        </p>

                                        {/* ACTION BUTTONS */}
                                        <div className="d-flex justify-content-between align-items-center">

                                            {/* OPTIONS DROPDOWN */}
                                            <Dropdown onClick={(e) => e.stopPropagation()}>
                                                <Dropdown.Toggle
                                                    variant="primary"
                                                    size="sm"
                                                    className="rounded-3"
                                                >
                                                    Options
                                                </Dropdown.Toggle>

                                                <Dropdown.Menu>
                                                    <Dropdown.Item
                                                        onClick={() => console.log('Class Activities', a.course._id)}
                                                    >
                                                        Class Activities
                                                    </Dropdown.Item>

                                                    <Dropdown.Item
                                                        onClick={() => console.log('Activity Weights', a.course._id)}
                                                    >
                                                        Activity Weights
                                                    </Dropdown.Item>
                                                </Dropdown.Menu>
                                            </Dropdown>

                                            {/* REPORTS DROPDOWN */}
                                            <Dropdown onClick={(e) => e.stopPropagation()}>
                                                <Dropdown.Toggle
                                                    variant="warning"
                                                    size="sm"
                                                    className="rounded-3"
                                                >
                                                    Reports
                                                </Dropdown.Toggle>

                                                <Dropdown.Menu>
                                                    <Dropdown.Item
                                                        onClick={() => console.log('OBE Report', a.course._id)}
                                                    >
                                                        OBE Report
                                                    </Dropdown.Item>

                                                    <Dropdown.Item
                                                        onClick={() => console.log('Student Report', a.course._id)}
                                                    >
                                                        Student Report
                                                    </Dropdown.Item>
                                                </Dropdown.Menu>
                                            </Dropdown>

                                        </div>

                                        {/* VIEW BUTTON */}
                                        <div className="mt-3">
                                            <Link
                                                to={`/faculty/courses/${a.course._id}`}
                                                className="text-primary small fw-bold text-decoration-none"
                                            >
                                                View Course <ArrowRight size={14} />
                                            </Link>
                                        </div>

                                    </Card.Body>

                                </Card>
                        </motion.div>
                    </Col>
                ))}
            </Row>

            {/* EMPTY STATE */}
            {assignments.length === 0 && (
                <p className="text-muted mt-4">No courses assigned yet.</p>
            )}
        </Container>
    );
};

export default CoursesList;