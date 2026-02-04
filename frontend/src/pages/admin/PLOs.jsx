import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Container, Card, Form, Button, ListGroup, Alert } from 'react-bootstrap';

const PLOs = () => {
    const [plos, setPlos] = useState([]);
    const [formData, setFormData] = useState({ code: '', description: '' });
    const { user } = useAuth();
    const [success, setSuccess] = useState('');

    useEffect(() => {
        fetchPLOs();
    }, []);

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
            await axios.post('/api/admin/plos', formData, config);
            setFormData({ code: '', description: '' });
            setSuccess('PLO added successfully!');
            fetchPLOs();
            setTimeout(() => setSuccess(''), 3000);
        } catch (error) {
            alert('Error adding PLO');
        }
    };

    return (
        <Container fluid>
            <h2 className="mb-4">Program Learning Outcomes</h2>

            <Card className="shadow-sm mb-4">
                <Card.Body>
                    {success && <Alert variant="success">{success}</Alert>}
                    <Form onSubmit={handleSubmit} className="d-flex gap-3">
                        <Form.Control
                            type="text" placeholder="PLO Code (e.g. PLO-1)" style={{ width: '150px' }}
                            value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })}
                            required
                        />
                        <Form.Control
                            type="text" placeholder="Description"
                            value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })}
                            required
                        />
                        <Button type="submit" variant="primary">Add PLO</Button>
                    </Form>
                </Card.Body>
            </Card>

            <ListGroup>
                {plos.map(plo => (
                    <ListGroup.Item key={plo._id} className="d-flex align-items-center">
                        <span className="fw-bold text-primary me-3" style={{ minWidth: '80px' }}>{plo.code}</span>
                        <span>{plo.description}</span>
                    </ListGroup.Item>
                ))}
            </ListGroup>
        </Container>
    );
};

export default PLOs;
