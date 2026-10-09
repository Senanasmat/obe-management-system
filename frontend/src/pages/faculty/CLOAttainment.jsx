import { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';

export default function CLOAttainment() {
    const { courseId } = useParams();
    const [stats, setStats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const load = async () => {
            try {
                const response = await axios.get(
                    `/api/faculty/analytics/${courseId}`
                );
                setStats(response.data.cloStats || []);
            } catch (err) {
                setError(
                    err.response?.data?.message ||
                    'Unable to load CLO attainment.'
                );
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [courseId]);

    if (loading) return <p>Loading CLO attainment...</p>;
    if (error) return <p role="alert">{error}</p>;

    return (
        <main className="p-6 space-y-5">
            <h1 className="text-2xl font-bold">CLO Attainment</h1>

            <div className="overflow-x-auto rounded-xl border">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b">
                            <th className="p-3">CLO Code</th>
                            <th className="p-3">Attainment</th>
                            <th className="p-3">Progress</th>
                        </tr>
                    </thead>
                    <tbody>
                        {stats.length === 0 ? (
                            <tr>
                                <td colSpan="3" className="p-4 text-gray-500">
                                    No CLO attainment data is available yet.
                                </td>
                            </tr>
                        ) : stats.map(item => (
                            <tr key={item.cloCode} className="border-b">
                                <td className="p-3">{item.cloCode}</td>
                                <td className="p-3">
                                    {Number(item.percentage).toFixed(2)}%
                                </td>
                                <td className="p-3">
                                    <div className="h-3 w-full rounded bg-gray-200">
                                        <div
                                            className="h-3 rounded bg-blue-600"
                                            style={{
                                                width: `${Math.min(
                                                    100,
                                                    Math.max(0, Number(item.percentage) || 0)
                                                )}%`
                                            }}
                                        />
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </main>
    );
}
