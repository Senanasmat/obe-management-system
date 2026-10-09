import { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip
} from 'recharts';

export default function CLOAttainmentGraph() {
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
                    'Unable to load the CLO attainment graph.'
                );
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [courseId]);

    if (loading) return <p>Loading CLO attainment graph...</p>;
    if (error) return <p role="alert">{error}</p>;

    return (
        <main className="p-6 space-y-5">
            <h1 className="text-2xl font-bold">
                CLO Attainment Graph
            </h1>

            {stats.length === 0 ? (
                <p className="text-gray-500">
                    No CLO attainment data is available yet.
                </p>
            ) : (
                <div className="h-96 w-full rounded-xl border p-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="cloCode" />
                            <YAxis
                                domain={[0, 100]}
                                tickFormatter={value => `${value}%`}
                            />
                            <Tooltip
                                formatter={value => [
                                    `${Number(value).toFixed(2)}%`,
                                    'Attainment'
                                ]}
                            />
                            <Bar dataKey="percentage" fill="#2563eb" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}
        </main>
    );
}
