import { Form } from 'react-bootstrap';
import { Check, Users } from 'lucide-react';

export const SHARED_FACULTY = '__shared__';

const selectStyle = {
    backgroundColor: '#f8fafc',
    borderColor: '#cbd5e1',
    borderRadius: '10px',
    fontSize: '0.95rem'
};

/**
 * Faculty dropdown with a "Shared Faculty" option.
 *
 * `value` is a single faculty id (string), or an array of ids when the
 * course is shared between several faculty members. `onChange` receives
 * the same shape. Set `allowShared={false}` where only one faculty member
 * may be chosen (e.g. when editing a single existing assignment).
 */
const FacultySelect = ({ faculty, value, onChange, allowShared = true, required = true }) => {
    const isShared = Array.isArray(value);
    const selected = isShared ? new Set(value) : new Set();

    const handleSelect = (e) => {
        onChange(e.target.value === SHARED_FACULTY ? [] : e.target.value);
    };

    const toggle = (id) => {
        const next = new Set(selected);
        next.has(id) ? next.delete(id) : next.add(id);
        onChange([...next]);
    };

    return (
        <>
            <Form.Select
                value={isShared ? SHARED_FACULTY : value}
                onChange={handleSelect}
                required={required}
                className="py-2 shadow-sm border-2"
                style={selectStyle}
            >
                <option value="">Select Faculty</option>
                {allowShared && (
                    <option value={SHARED_FACULTY}>Shared Faculty (multiple)</option>
                )}
                {faculty.map(f => (
                    <option key={f._id} value={f._id}>
                        {f.name}
                    </option>
                ))}
            </Form.Select>

            {isShared && (
                <div className="mt-2 border rounded-3 p-2" style={{ maxHeight: 220, overflowY: 'auto' }}>
                    <div className="d-flex align-items-center gap-2 small text-muted px-1 mb-2">
                        <Users size={14} /> Select every faculty member who shares this course
                        <span className="ms-auto fw-semibold">{selected.size} selected</span>
                    </div>
                    {faculty.map(f => {
                        const checked = selected.has(f._id);
                        return (
                            <div
                                key={f._id}
                                onClick={() => toggle(f._id)}
                                className="d-flex align-items-center gap-2 px-2 py-2 rounded-2"
                                style={{
                                    cursor: 'pointer',
                                    backgroundColor: checked ? '#f5f3ff' : 'transparent'
                                }}
                            >
                                <div
                                    className="d-flex align-items-center justify-content-center rounded-2 flex-shrink-0"
                                    style={{
                                        width: 18, height: 18,
                                        backgroundColor: checked ? '#6d28d9' : '#fff',
                                        border: `2px solid ${checked ? '#6d28d9' : '#aaa'}`
                                    }}
                                >
                                    {checked && <Check size={11} color="white" strokeWidth={3} />}
                                </div>
                                <span style={{ fontSize: '0.9rem' }}>{f.name}</span>
                                {f.department && (
                                    <span className="text-muted ms-auto" style={{ fontSize: '0.75rem' }}>
                                        {f.department}
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </>
    );
};

export default FacultySelect;
