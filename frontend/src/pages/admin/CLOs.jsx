import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Container, Card, Form, Button, ListGroup, Badge, Alert } from 'react-bootstrap';

const CLOs = () => {
    const [clos, setClos] = useState([]);
    const [plos, setPlos] = useState([]);
    const [formData, setFormData] = useState({ code: '', description: '', plo: '' });
    const { user } = useAuth();
    const [success, setSuccess] = useState('');

    useEffect(() => {
        fetchCLOs();
        fetchPLOs();
    }, []);

    const fetchCLOs = async () => {
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            const { data } = await axios.get('/api/admin/clos', config);
            setClos(data);
        } catch (error) {
            console.error(error);
        }
    };

    const fetchPLOs = async () => {
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            const { data } = await axios.get('/api/admin/plos', config);
            setPlos(data);
        } catch (error) {
            console.error(error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSuccess('');
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            await axios.post('/api/admin/clos', formData, config);
            setFormData({ code: '', description: '', plo: '' });
            setSuccess('CLO added successfully!');
            fetchCLOs();
            setTimeout(() => setSuccess(''), 3000);
        } catch (error) {
            alert('Error adding CLO');
        }
    };

    return (
        <Container fluid>
            <h2 className="mb-4">Course Learning Outcomes</h2>

            <Card className="shadow-sm mb-4">
                <Card.Body>
                    {success && <Alert variant="success">{success}</Alert>}
                    <Form onSubmit={handleSubmit} className="row g-3 align-items-end">
                        <div className="col-md-2">
                            <Form.Control
                                type="text" placeholder="CLO Code"
                                value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })}
                                required
                            />
                        </div>
                        <div className="col-md-6">
                            <Form.Control
                                type="text" placeholder="Description"
                                value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })}
                                required
                            />
                        </div>
                        <div className="col-md-2">
                            <Form.Select
                                value={formData.plo} onChange={e => setFormData({ ...formData, plo: e.target.value })}
                            >
                                <option value="">Map PLO</option>
                                {plos.map(plo => (
                                    <option key={plo._id} value={plo._id}>{plo.code}</option>
                                ))}
                            </Form.Select>
                        </div>
                        <div className="col-md-2">
                            <Button type="submit" variant="info" className="w-100 text-white">Add CLO</Button>
                        </div>
                    </Form>
                </Card.Body>
            </Card>

            <ListGroup>
                {clos.map(clo => (
                    <ListGroup.Item key={clo._id} className="d-flex justify-content-between align-items-center">
                        <div className="d-flex align-items-center">
                            <span className="fw-bold text-info me-3" style={{ minWidth: '80px' }}>{clo.code}</span>
                            <span>{clo.description}</span>
                        </div>
                        {clo.plo && <Badge bg="secondary">Mapped: {clo.plo.code}</Badge>}
                    </ListGroup.Item>
                ))}
            </ListGroup>
        </Container>
    );
};

export default CLOs;
