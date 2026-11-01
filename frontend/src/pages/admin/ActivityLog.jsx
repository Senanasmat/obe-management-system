import { useState, useEffect, useCallback } from 'react';
import { Container, Card, Table, Badge, Form, InputGroup } from 'react-bootstrap';
import { motion } from 'framer-motion';
import { Activity, Search, RefreshCw } from 'lucide-react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/LoadingSpinner';

const ACTION_COLORS = {
    'Created Faculty': 'success',
    'Updated Faculty': 'warning',
    'Deleted Faculty': 'danger',
    'Added Student': 'success',
    'Deleted Student': 'danger',
    'Created Course': 'success',
    'Deleted Course': 'danger',
    'Created PLO': 'success',
    'Deleted PLO': 'danger',
    'Created Assessment': 'success',
    'Updated Assessment': 'warning',
    'Deleted Assessment': 'danger',
    'Entered Marks': 'primary',
    'Created CLO': 'info',
    'Updated CLO': 'warning',
    'Removed CLO': 'danger',
};

const TARGET_COLORS = {
    assessment: '#6d28d9',
    marks: '#0891b2',
    CLO: '#16a34a',
    PLO: '#ca8a04',
    course: '#2563eb',
    student: '#db2777',
    faculty: '#7c3aed',
};

function timeAgo(date) {
    const seconds = Math.floor((Date.now() - new Date(date)) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(date).toLocaleDateString();
}

const ActivityLog = () => {
    const { user } = useAuth();
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState('');

    const fetchLogs = useCallback(async () => {
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            const { data } = await api.get('/api/admin/activity-logs?limit=200', config);
            setActivities(data);
        } catch (err) {
            console.error('Failed to fetch activity logs', err);
        } finally {
            setLoading(false);
        }
    }, [user.token]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const filtered = activities.filter(a => {
        const matchesSearch = !search ||
            a.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
            a.action?.toLowerCase().includes(search.toLowerCase()) ||
            a.details?.toLowerCase().includes(search.toLowerCase());
        const matchesType = !filterType || a.targetType === filterType;
        return matchesSearch && matchesType;
    });

    if (loading) return <LoadingSpinner />;

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <Container fluid className="py-4 px-4">
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <div className="d-flex align-items-center gap-2">
                        <div className="rounded-circle p-2" style={{ backgroundColor: '#ede9fe' }}>
                            <Activity size={22} style={{ color: '#6d28d9' }} />
                        </div>
                        <div>
                            <h2 className="mb-0 fw-bold fs-3 text-dark">Activity Log</h2>
                            <p className="text-muted small mb-0">{filtered.length} actions recorded</p>
                        </div>
                    </div>
                    <button
                        className="btn btn-light border px-3 py-2 d-flex align-items-center gap-2 fw-semibold text-muted"
                        onClick={() => { setLoading(true); fetchLogs(); }}
                    >
                        <RefreshCw size={16} /> Refresh
                    </button>
                </div>

                <Card className="shadow-sm border-0 mb-3">
                    <Card.Body className="py-2 px-3">
                        <div className="d-flex gap-3 flex-wrap">
                            <InputGroup style={{ maxWidth: '320px' }}>
                                <InputGroup.Text className="bg-white border-end-0">
                                    <Search size={15} className="text-muted" />
                                </InputGroup.Text>
                                <Form.Control
                                    placeholder="Search faculty, action, details…"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    className="border-start-0 ps-0"
                                />
                            </InputGroup>
                            <Form.Select
                                style={{ maxWidth: '180px' }}
                                value={filterType}
                                onChange={e => setFilterType(e.target.value)}
                            >
                                <option value="">All types</option>
                                <option value="assessment">Assessment</option>
                                <option value="marks">Marks</option>
                                <option value="CLO">CLO</option>
                                <option value="PLO">PLO</option>
                                <option value="course">Course</option>
                                <option value="student">Student</option>
                                <option value="faculty">Faculty</option>
                            </Form.Select>
                        </div>
                    </Card.Body>
                </Card>

                <Card className="shadow-sm border-0 overflow-hidden">
                    <Table hover responsive className="mb-0">
                        <thead className="bg-light border-bottom">
                            <tr>
                                <th className="px-4 py-3 text-muted small text-uppercase">Faculty</th>
                                <th className="px-4 py-3 text-muted small text-uppercase">Action</th>
                                <th className="px-4 py-3 text-muted small text-uppercase">Details</th>
                                <th className="px-4 py-3 text-muted small text-uppercase">Type</th>
                                <th className="px-4 py-3 text-muted small text-uppercase">Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="text-center py-5 text-muted">
                                        <Activity size={36} className="mb-2 opacity-30" />
                                        <div>No activity records found</div>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((a, idx) => (
                                    <motion.tr
                                        key={a._id}
                                        initial={{ opacity: 0, x: -8 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.015 }}
                                    >
                                        <td className="px-4 py-3 align-middle">
                                            <div className="fw-semibold text-dark small">{a.user?.name || '—'}</div>
                                            <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                                                {a.user?.department || a.user?.email || ''}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 align-middle">
                                            <Badge
                                                bg={ACTION_COLORS[a.action] || 'secondary'}
                                                className="fw-semibold"
                                                style={{ fontSize: '0.75rem' }}
                                            >
                                                {a.action}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3 align-middle" style={{ maxWidth: '320px' }}>
                                            <span className="text-dark small">{a.details}</span>
                                        </td>
                                        <td className="px-4 py-3 align-middle">
                                            <span
                                                className="badge rounded-pill px-2 py-1"
                                                style={{
                                                    backgroundColor: TARGET_COLORS[a.targetType] + '22',
                                                    color: TARGET_COLORS[a.targetType] || '#555',
                                                    fontSize: '0.72rem',
                                                    fontWeight: 600
                                                }}
                                            >
                                                {a.targetType}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 align-middle">
                                            <div className="text-muted small">{timeAgo(a.createdAt)}</div>
                                            <div className="text-muted" style={{ fontSize: '0.7rem' }}>
                                                {new Date(a.createdAt).toLocaleString()}
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))
                            )}
                        </tbody>
                    </Table>
                </Card>
            </Container>
        </motion.div>
    );
};

export default ActivityLog;
