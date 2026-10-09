import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';

const API = '/api/faculty';

export default function CLOList() {
    const { courseId } = useParams();

    const [clos, setClos] = useState([]);
    const [plos, setPlos] = useState([]);
    const [terms, setTerms] = useState([]);
    const [mappings, setMappings] = useState([]);

    const [code, setCode] = useState('');
    const [description, setDescription] = useState('');

    const [selectedCLO, setSelectedCLO] = useState(null);
    const [academicTermId, setAcademicTermId] = useState('');
    const [ploId, setPloId] = useState('');

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const loadData = useCallback(async () => {
        if (!courseId) return;

        setLoading(true);
        setError('');

        try {
            const [coursesRes, plosRes, termsRes, mappingsRes] =
                await Promise.all([
                    axios.get(`${API}/courses`),
                    axios.get(`${API}/plos`),
                    axios.get(`${API}/academic-terms`),
                    axios.get(`${API}/courses/${courseId}/clo-mappings`)
                ]);

            const assignment = coursesRes.data.find(
                item => String(item.course?._id || item.course) === String(courseId)
            );

            if (!assignment) {
                throw new Error('Course assignment was not found.');
            }

            const course = assignment.course;
            const courseClos = typeof course === 'object'
                ? course.clos || []
                : [];

            setClos(courseClos);
            setPlos(plosRes.data);
            setTerms(termsRes.data);
            setMappings(mappingsRes.data);
        } catch (err) {
            setError(
                err.response?.data?.message ||
                err.message ||
                'Unable to load CLO data.'
            );
        } finally {
            setLoading(false);
        }
    }, [courseId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleCreateCLO = async event => {
        event.preventDefault();
        setError('');
        setSuccess('');
        setSaving(true);

        try {
            await axios.post(`${API}/courses/${courseId}/clos`, {
                code,
                description
            });

            setCode('');
            setDescription('');
            setSuccess('CLO created successfully.');
            await loadData();
        } catch (err) {
            setError(
                err.response?.data?.message || 'Unable to create CLO.'
            );
        } finally {
            setSaving(false);
        }
    };

    const openMappingForm = clo => {
        setSelectedCLO(clo);
        setAcademicTermId('');
        setPloId('');
        setError('');
        setSuccess('');
    };

    const handleCreateMapping = async event => {
        event.preventDefault();

        if (!selectedCLO || !academicTermId || !ploId) {
            setError('Select a semester and PLO.');
            return;
        }

        setSaving(true);
        setError('');
        setSuccess('');

        try {
            await axios.post(
                `${API}/courses/${courseId}/clo-mappings`,
                {
                    cloId: selectedCLO._id,
                    academicTermId,
                    ploId
                }
            );

            setSelectedCLO(null);
            setAcademicTermId('');
            setPloId('');
            setSuccess('CLO–PLO mapping saved successfully.');
            await loadData();
        } catch (err) {
            setError(
                err.response?.data?.message ||
                'Unable to save mapping.'
            );
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <p>Loading CLO information...</p>;

    return (
        <main className="p-6 space-y-8">
            <header>
                <h1 className="text-2xl font-bold">CLO List</h1>
                <p className="text-gray-500">
                    Create course learning outcomes and map them to PLOs
                    by academic semester.
                </p>
            </header>

            {error && (
                <p role="alert" className="text-red-600">{error}</p>
            )}
            {success && (
                <p role="status" className="text-green-700">{success}</p>
            )}

            <section className="rounded-xl border p-5 space-y-4">
                <h2 className="text-lg font-semibold">CLO Creation</h2>

                <form onSubmit={handleCreateCLO} className="space-y-4">
                    <div>
                        <label className="block mb-1">CLO Code</label>
                        <input
                            className="w-full rounded border p-2"
                            value={code}
                            onChange={e => setCode(e.target.value)}
                            placeholder="e.g. CLO-1"
                            required
                        />
                    </div>

                    <div>
                        <label className="block mb-1">Description</label>
                        <textarea
                            className="w-full rounded border p-2"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Enter CLO description"
                            rows={3}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={saving}
                        className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
                    >
                        {saving ? 'Saving...' : 'Add CLO'}
                    </button>
                </form>
            </section>

            <section className="rounded-xl border p-5 space-y-4">
                <h2 className="text-lg font-semibold">Created CLOs</h2>

                {clos.length === 0 ? (
                    <p className="text-gray-500">No CLOs created yet.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-left">
                            <thead>
                                <tr className="border-b">
                                    <th className="p-3">CLO Code</th>
                                    <th className="p-3">Description</th>
                                    <th className="p-3">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {clos.map(clo => (
                                    <tr key={clo._id} className="border-b">
                                        <td className="p-3">{clo.code}</td>
                                        <td className="p-3">{clo.description}</td>
                                        <td className="p-3">
                                            <button
                                                type="button"
                                                onClick={() => openMappingForm(clo)}
                                                className="rounded border px-3 py-1"
                                            >
                                                Add Map
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {selectedCLO && (
                <section className="rounded-xl border p-5 space-y-4">
                    <div className="flex items-center justify-between gap-4">
                        <h2 className="text-lg font-semibold">
                            Map {selectedCLO.code} to a PLO
                        </h2>
                        <button
                            type="button"
                            onClick={() => setSelectedCLO(null)}
                            className="rounded border px-3 py-1"
                        >
                            Cancel
                        </button>
                    </div>

                    <form onSubmit={handleCreateMapping} className="space-y-4">
                        <div>
                            <label className="block mb-1">Semester</label>
                            <select
                                className="w-full rounded border p-2"
                                value={academicTermId}
                                onChange={e => setAcademicTermId(e.target.value)}
                                required
                            >
                                <option value="">Select semester</option>
                                {terms.map(term => (
                                    <option key={term._id} value={term._id}>
                                        {term.name || `${term.season} ${term.year}`}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block mb-1">PLO</label>
                            <select
                                className="w-full rounded border p-2"
                                value={ploId}
                                onChange={e => setPloId(e.target.value)}
                                required
                            >
                                <option value="">Select PLO</option>
                                {plos.map(plo => (
                                    <option key={plo._id} value={plo._id}>
                                        {plo.code} — {plo.title}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <button
                            type="submit"
                            disabled={saving}
                            className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
                        >
                            {saving ? 'Saving...' : 'Save Mapping'}
                        </button>
                    </form>
                </section>
            )}

            <section className="rounded-xl border p-5 space-y-4">
                <h2 className="text-lg font-semibold">
                    CLO–PLO Mapping
                </h2>

                {mappings.length === 0 ? (
                    <p className="text-gray-500">No mappings saved yet.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-left">
                            <thead>
                                <tr className="border-b">
                                    <th className="p-3">CLO</th>
                                    <th className="p-3">Semester</th>
                                    <th className="p-3">PLO</th>
                                </tr>
                            </thead>
                            <tbody>
                                {mappings.map(mapping => (
                                    <tr key={mapping._id} className="border-b">
                                        <td className="p-3">
                                            {mapping.clo?.code || '—'}
                                        </td>
                                        <td className="p-3">
                                            {mapping.academicTerm?.name ||
                                                `${mapping.academicTerm?.season || ''} ${mapping.academicTerm?.year || ''}`.trim() ||
                                                '—'}
                                        </td>
                                        <td className="p-3">
                                            {mapping.plo?.code || '—'} — {mapping.plo?.title || ''}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </main>
    );
}
