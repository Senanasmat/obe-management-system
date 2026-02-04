import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Container, Card, Form, Button, Table, Alert } from 'react-bootstrap';

const Students = () => {
    const [students, setStudents] = useState([]);
    const [formData, setFormData] = useState({ name: '', regNo: '', batch: '' });
    const { user } = useAuth();
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        fetchStudents();
    }, []);

    const fetchStudents = async () => {
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            const { data } = await axios.get('/api/admin/students', config);
            setStudents(data);
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
            await axios.post('/api/admin/students', formData, config);
            setFormData({ name: '', regNo: '', batch: '' });
            setSuccess('Student registered successfully!');
            fetchStudents();
            setTimeout(() => setSuccess(''), 3000);
        } catch (error) {
            setError('Error adding student');
        }
    };

    return (
        <Container fluid>
            <h2 className="mb-4">Manage Students</h2>

            <Card className="shadow-sm mb-4">
                <Card.Body>
                    <Card.Title className="mb-3">Add New Student</Card.Title>
                    {error && <Alert variant="danger">{error}</Alert>}
                    {success && <Alert variant="success">{success}</Alert>}
                    <Form onSubmit={handleSubmit} className="row g-3">
                        <div className="col-md-4">
                            <Form.Control
                                type="text"
                                placeholder="Student Name"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>
                        <div className="col-md-4">
                            <Form.Control
                                type="text"
                                placeholder="Registration No"
                                value={formData.regNo}
                                onChange={e => setFormData({ ...formData, regNo: e.target.value })}
                                required
                            />
                        </div>
                        <div className="col-md-3">
                            <Form.Control
                                type="text"
                                placeholder="Batch"
                                value={formData.batch}
                                onChange={e => setFormData({ ...formData, batch: e.target.value })}
                                required
                            />
                        </div>
                        <div className="col-md-1">
                            <Button type="submit" variant="primary" className="w-100">Add</Button>
                        </div>
                    </Form>
                </Card.Body>
            </Card>

            <Card className="shadow-sm border-0">
                <Table hover responsive striped className="mb-0">
                    <thead className="bg-light">
                        <tr>
                            <th>Name</th>
                            <th>Reg No</th>
                            <th>Batch</th>
                        </tr>
                    </thead>
                    <tbody>
                        {students.map((student) => (
                            <tr key={student._id}>
                                <td>{student.name}</td>
                                <td>{student.regNo}</td>
                                <td>{student.batch}</td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            </Card>
        </Container>
    );
};

export default Students;
