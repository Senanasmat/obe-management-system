import { useEffect, useState } from 'react';
import { Button, Form, InputGroup, Spinner } from 'react-bootstrap';
import { Pencil, Check, X } from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { toast, showError } from '../utils/notifications';

export const DEFAULT_KPI = 50;

// Per-course KPI cache shared by every mounted attainment page, so editing the
// KPI in one place immediately updates all charts/tables using it.
const kpiCache = new Map();
const listeners = new Set();

const publish = (courseId, kpi) => {
    kpiCache.set(courseId, kpi);
    listeners.forEach(listener => listener(courseId, kpi));
};

/**
 * Returns the KPI (attainment threshold, %) for a course and a setter that
 * persists a new value to the backend.
 */
export const useCourseKPI = (courseId) => {
    const { user } = useAuth();
    const [kpi, setKpi] = useState(() => kpiCache.get(courseId) ?? DEFAULT_KPI);

    useEffect(() => {
        const listener = (id, value) => {
            if (id === courseId) setKpi(value);
        };
        listeners.add(listener);
        return () => listeners.delete(listener);
    }, [courseId]);

    useEffect(() => {
        if (!courseId || !user?.token) return;
        if (kpiCache.has(courseId)) {
            setKpi(kpiCache.get(courseId));
            return;
        }
        api.get(`/api/faculty/courses/${courseId}/kpi`, {
            headers: { Authorization: `Bearer ${user.token}` }
        })
            .then(({ data }) => publish(courseId, Number(data.kpi ?? DEFAULT_KPI)))
            .catch(() => { /* keep the default */ });
    }, [courseId, user?.token]);

    const saveKpi = async (value) => {
        const { data } = await api.put(
            `/api/faculty/courses/${courseId}/kpi`,
            { kpi: Number(value) },
            { headers: { Authorization: `Bearer ${user.token}` } }
        );
        publish(courseId, Number(data.kpi));
        return data.kpi;
    };

    return { kpi, saveKpi };
};

/**
 * Inline "KPI 50% ✎" badge that lets faculty change the course KPI.
 */
const KPIEditor = ({ courseId, color = '#663399' }) => {
    const { kpi, saveKpi } = useCourseKPI(courseId);
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(kpi);
    const [saving, setSaving] = useState(false);

    const startEdit = () => {
        setDraft(kpi);
        setEditing(true);
    };

    const handleSave = async (e) => {
        e?.preventDefault();
        const value = Number(draft);
        if (!Number.isFinite(value) || value < 0 || value > 100) {
            showError('Invalid KPI', 'KPI must be a number between 0 and 100.');
            return;
        }
        setSaving(true);
        try {
            await saveKpi(value);
            toast.fire({ icon: 'success', title: `KPI updated to ${value}%` });
            setEditing(false);
        } catch (err) {
            showError('Error', err.response?.data?.message || 'Could not update KPI.');
        } finally {
            setSaving(false);
        }
    };

    if (!editing) {
        return (
            <span
                className="d-inline-flex align-items-center gap-2 rounded-pill px-3 py-1 border"
                style={{ fontSize: '0.85rem', color }}
            >
                KPI <strong>{kpi}%</strong>
                <Button
                    variant="link"
                    size="sm"
                    className="p-0 d-flex"
                    style={{ color }}
                    onClick={startEdit}
                    title="Edit KPI"
                >
                    <Pencil size={13} />
                </Button>
            </span>
        );
    }

    return (
        <Form onSubmit={handleSave} className="d-inline-flex">
            <InputGroup size="sm" style={{ width: 190 }}>
                <InputGroup.Text>KPI</InputGroup.Text>
                <Form.Control
                    type="number"
                    min="0"
                    max="100"
                    step="any"
                    autoFocus
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                />
                <InputGroup.Text>%</InputGroup.Text>
                <Button type="submit" variant="success" disabled={saving} title="Save">
                    {saving ? <Spinner animation="border" size="sm" /> : <Check size={14} />}
                </Button>
                <Button variant="outline-secondary" onClick={() => setEditing(false)} disabled={saving} title="Cancel">
                    <X size={14} />
                </Button>
            </InputGroup>
        </Form>
    );
};

export default KPIEditor;
