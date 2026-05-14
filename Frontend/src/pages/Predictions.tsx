import { useEffect, useState } from 'react';
import { predictionsAPI } from '../api/client';
import type { CategoryPrediction, PredictionsResponse } from '../api/client';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Legend,
} from 'recharts';

const TREND_ICON: Record<string, string> = {
    up: '↑', down: '↓', stable: '→',
};

const TREND_COLOR: Record<string, string> = {
    up: 'text-red-500', down: 'text-green-500', stable: 'text-gray-400',
};

const TREND_BG: Record<string, string> = {
    up: 'bg-red-50 dark:bg-red-900/20',
    down: 'bg-green-50 dark:bg-green-900/20',
    stable: 'bg-gray-50 dark:bg-gray-700/50',
};

const CATEGORY_COLORS: Record<string, string> = {
    Food: '#10B981', Transport: '#3B82F6', Housing: '#F59E0B',
    Entertainment: '#8B5CF6', Healthcare: '#EF4444', Shopping: '#EC4899',
    Education: '#14B8A6', Utilities: '#F97316', Other: '#6B7280',
};

function getColor(category: string) {
    return CATEGORY_COLORS[category] ?? '#6B7280';
}

function ConfidenceBadge({ months }: { months: number }) {
    const label = months >= 3 ? 'High' : months === 2 ? 'Medium' : 'Low';
    const colors = {
        High: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
        Medium: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
        Low: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
    };
    return (
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors[label]}`}>
      {label} confidence
    </span>
    );
}

const tickStyle = { fontSize: 11, fill: '#9CA3AF' };

export default function Predictions() {
    const [data, setData] = useState<PredictionsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        predictionsAPI.get()
            .then(res => setData(res.data))
            .catch(() => setError('Failed to load predictions'))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="text-gray-400 text-lg">Calculating predictions...</div>
        </div>
    );

    if (error) return (
        <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-4 rounded-lg">{error}</div>
    );

    if (!data || data.categories.length === 0) return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Spending Predictions</h1>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-12 text-center">
                <p className="text-4xl mb-4">📊</p>
                <p className="text-gray-600 dark:text-gray-300 font-medium">Not enough data yet</p>
                <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
                    Predictions appear after at least one full month of transactions.
                </p>
            </div>
        </div>
    );

    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const nextMonthName = nextMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

    const changeVsLastMonth = data.totalLastMonthExpenses > 0
        ? ((data.totalPredictedExpenses - data.totalLastMonthExpenses) / data.totalLastMonthExpenses * 100).toFixed(1)
        : null;

    const chartData = data.categories.map(c => ({
        name: c.category,
        Predicted: c.predictedAmount,
        'Last Month': c.lastMonthAmount,
    }));

    const card = "bg-white dark:bg-gray-800 rounded-xl shadow p-6";

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Spending Predictions</h1>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                    Forecast for {nextMonthName} · Based on weighted 3-month average
                </p>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-6">
                <div className={card}>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Predicted Total</p>
                    <p className="text-3xl font-bold text-purple-600">€{data.totalPredictedExpenses.toFixed(2)}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Next month expenses</p>
                </div>
                <div className={card}>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Last Month Actual</p>
                    <p className="text-3xl font-bold text-gray-700 dark:text-gray-200">€{data.totalLastMonthExpenses.toFixed(2)}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Actual spending</p>
                </div>
                <div className={card}>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Expected Change</p>
                    {changeVsLastMonth !== null ? (
                        <p className={`text-3xl font-bold ${Number(changeVsLastMonth) > 0 ? 'text-red-500' : 'text-green-600'}`}>
                            {Number(changeVsLastMonth) > 0 ? '+' : ''}{changeVsLastMonth}%
                        </p>
                    ) : <p className="text-3xl font-bold text-gray-400">—</p>}
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">vs last month</p>
                </div>
            </div>

            {/* Comparison chart */}
            <div className={card}>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Predicted vs Last Month</h2>
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">By category</p>
                <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={chartData} barGap={4}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="name" tick={tickStyle} />
                        <YAxis tickFormatter={(v) => `€${v}`} tick={tickStyle} />
                        <Tooltip formatter={(value) => `€${Number(value).toFixed(2)}`} />
                        <Legend />
                        <Bar dataKey="Last Month" fill="#E5E7EB" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Predicted" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Category breakdown cards */}
            <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Category Breakdown</h2>
                <div className="grid grid-cols-2 gap-4">
                    {data.categories.map((c: CategoryPrediction) => (
                        <div key={c.category} className="bg-white dark:bg-gray-800 rounded-xl shadow p-5">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getColor(c.category) }} />
                                    <span className="font-semibold text-gray-900 dark:text-white">{c.category}</span>
                                </div>
                                <ConfidenceBadge months={c.dataPointsCount} />
                            </div>

                            <div className="flex items-end justify-between">
                                <div>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white">€{c.predictedAmount.toFixed(2)}</p>
                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">predicted</p>
                                </div>
                                <div className={`flex items-center gap-1 px-3 py-1.5 rounded-lg ${TREND_BG[c.trend]}`}>
                                    <span className={`font-bold text-lg ${TREND_COLOR[c.trend]}`}>{TREND_ICON[c.trend]}</span>
                                    <span className={`text-sm font-semibold ${TREND_COLOR[c.trend]}`}>{Math.abs(c.changePercent)}%</span>
                                </div>
                            </div>

                            {/* Mini history bar */}
                            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                                <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500 mb-1">
                                    <span>3 months ago</span>
                                    <span>predicted →</span>
                                </div>
                                <div className="flex items-end gap-1" style={{ height: '40px' }}>
                                    {[c.threeMonthsAgoAmount, c.twoMonthsAgoAmount, c.lastMonthAmount].map((amt, i) => {
                                        const max = Math.max(c.threeMonthsAgoAmount, c.twoMonthsAgoAmount, c.lastMonthAmount, c.predictedAmount, 1);
                                        const px = Math.max(Math.round((amt / max) * 40), amt > 0 ? 4 : 0);
                                        return (
                                            <div key={i} className="flex-1 flex items-end">
                                                <div className="w-full rounded-sm" style={{
                                                    height: `${px}px`,
                                                    backgroundColor: amt > 0 ? getColor(c.category) : '#374151',
                                                    opacity: 0.3 + i * 0.25,
                                                }} />
                                            </div>
                                        );
                                    })}
                                    {(() => {
                                        const max = Math.max(c.threeMonthsAgoAmount, c.twoMonthsAgoAmount, c.lastMonthAmount, c.predictedAmount, 1);
                                        const px = Math.max(Math.round((c.predictedAmount / max) * 40), 4);
                                        return (
                                            <div className="flex-1 flex items-end">
                                                <div className="w-full rounded-sm border-2 border-dashed" style={{
                                                    height: `${px}px`,
                                                    borderColor: getColor(c.category),
                                                    backgroundColor: 'transparent',
                                                }} />
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>

                            {c.lastMonthAmount > 0 && (
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                                    Last month: <span className="text-gray-600 dark:text-gray-300 font-medium">€{c.lastMonthAmount.toFixed(2)}</span>
                                </p>
                            )}
                        </div> 
                    ))}
                </div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 text-sm text-blue-700 dark:text-blue-400">
                <span className="font-semibold">How predictions work: </span>
                Each category is forecasted using a weighted average of your last 3 months —
                the most recent month carries 3× the weight, so recent changes reflect faster.
                Confidence is higher when more historical months are available.
            </div>
        </div>
    );
}