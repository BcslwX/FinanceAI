import { useEffect, useState, useCallback } from 'react';
import { analyticsAPI } from '../api/client';
import type { AnalyticsResponse } from '../api/client';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    LineChart, Line, ResponsiveContainer, ReferenceLine,
} from 'recharts';

const PERIOD_OPTIONS = [
    { label: '3 months', value: 3 },
    { label: '6 months', value: 6 },
    { label: '12 months', value: 12 },
];

const CATEGORY_COLORS: Record<string, string> = {
    Food: '#10B981', Transport: '#3B82F6', Housing: '#F59E0B',
    Entertainment: '#8B5CF6', Healthcare: '#EF4444', Shopping: '#EC4899',
    Education: '#14B8A6', Utilities: '#F97316', Other: '#6B7280', Transfer: '#94A3B8',
};

function getColor(cat: string) { return CATEGORY_COLORS[cat] ?? '#6B7280'; }

const tickStyle = { fontSize: 11, fill: '#9CA3AF' };

export default function Analytics() {
    const [data, setData] = useState<AnalyticsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [period, setPeriod] = useState(12);

    const loadData = useCallback(() => {
        setLoading(true);
        setError('');
        analyticsAPI.get(period)
            .then(res => setData(res.data))
            .catch(() => setError('Failed to load analytics'))
            .finally(() => setLoading(false));
    }, [period]);

    useEffect(() => { loadData(); }, [loadData]);

    const incomeExpenseData = data?.monthlyData.map(m => ({
        month: m.monthName, Income: m.income, Expenses: m.expenses, Net: m.netBalance,
    })) ?? [];

    const savingsRateData = data?.monthlyData
        .filter(m => m.income > 0)
        .map(m => ({ month: m.monthName, 'Savings Rate %': m.savingsRate })) ?? [];

    const topCategories = data?.categoryTrends.slice(0, 5) ?? [];
    const categoryTrendData = data?.monthLabels.map((label, i) => {
        const point: Record<string, any> = { month: label };
        topCategories.forEach(cat => { point[cat.category] = cat.monthlyAmounts[i] ?? 0; });
        return point;
    }) ?? [];

    const card = "bg-white dark:bg-gray-800 rounded-xl shadow p-6";

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h1>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Long-term trends and financial patterns</p>
                </div>
                <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                    {PERIOD_OPTIONS.map(opt => (
                        <button key={opt.value} onClick={() => setPeriod(opt.value)}
                                className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${period === opt.value ? 'bg-white dark:bg-gray-600 shadow text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            {error && <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-4 rounded-lg">{error}</div>}

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="text-gray-400 text-lg">Loading analytics...</div>
                </div>
            ) : !data ? null : (
                <>
                    <div className="grid grid-cols-4 gap-4">
                        <div className={card}>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Income</p>
                            <p className="text-2xl font-bold text-green-600">€{data.totalIncome.toFixed(2)}</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Last {period} months</p>
                        </div>
                        <div className={card}>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Expenses</p>
                            <p className="text-2xl font-bold text-red-500">€{data.totalExpenses.toFixed(2)}</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Anomalies excluded</p>
                        </div>
                        <div className={card}>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Saved</p>
                            <p className={`text-2xl font-bold ${data.totalSaved >= 0 ? 'text-blue-600' : 'text-red-600'}`}>€{data.totalSaved.toFixed(2)}</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Avg {data.averageSavingsRate}% savings rate</p>
                        </div>
                        <div className={card}>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Best / Worst Month</p>
                            <p className="text-sm font-semibold text-green-600">↑ {data.bestMonth}</p>
                            <p className="text-sm font-semibold text-red-500 mt-1">↓ {data.worstMonth}</p>
                        </div>
                    </div>

                    <div className={card}>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Income vs Expenses</h2>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">Monthly comparison</p>
                        <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={incomeExpenseData} barGap={2}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <XAxis dataKey="month" tick={tickStyle} />
                                <YAxis tickFormatter={v => `€${v}`} tick={tickStyle} />
                                <Tooltip formatter={(value) => `€${Number(value).toFixed(2)}`} />
                                <Legend />
                                <Bar dataKey="Income" fill="#10B981" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="Expenses" fill="#EF4444" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <div className={card}>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Monthly Net Balance</h2>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">Income minus expenses per month</p>
                        <ResponsiveContainer width="100%" height={220}>
                            <LineChart data={incomeExpenseData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <XAxis dataKey="month" tick={tickStyle} />
                                <YAxis tickFormatter={v => `€${v}`} tick={tickStyle} />
                                <Tooltip formatter={(value) => `€${Number(value).toFixed(2)}`} />
                                <ReferenceLine y={0} stroke="#9CA3AF" strokeDasharray="4 4" />
                                <Line type="monotone" dataKey="Net" stroke="#3B82F6" strokeWidth={2.5} dot={{ r: 4, fill: '#3B82F6' }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    {savingsRateData.length > 0 && (
                        <div className={card}>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Savings Rate</h2>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">Percentage of income saved each month</p>
                            <ResponsiveContainer width="100%" height={200}>
                                <LineChart data={savingsRateData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                    <XAxis dataKey="month" tick={tickStyle} />
                                    <YAxis tickFormatter={v => `${v}%`} tick={tickStyle} />
                                    <Tooltip formatter={(value) => `${Number(value).toFixed(1)}%`} />
                                    <ReferenceLine y={0} stroke="#9CA3AF" strokeDasharray="4 4" />
                                    <Line type="monotone" dataKey="Savings Rate %" stroke="#8B5CF6" strokeWidth={2.5} dot={{ r: 4, fill: '#8B5CF6' }} activeDot={{ r: 6 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {topCategories.length > 0 && (
                        <div className={card}>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Top Category Trends</h2>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">Monthly spending for top 5 categories</p>
                            <ResponsiveContainer width="100%" height={280}>
                                <LineChart data={categoryTrendData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                    <XAxis dataKey="month" tick={tickStyle} />
                                    <YAxis tickFormatter={v => `€${v}`} tick={tickStyle} />
                                    <Tooltip formatter={(value) => `€${Number(value).toFixed(2)}`} />
                                    <Legend />
                                    {topCategories.map(cat => (
                                        <Line key={cat.category} type="monotone" dataKey={cat.category}
                                              stroke={getColor(cat.category)} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                                    ))}
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    <div className={card}>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Category Summary</h2>
                        <table className="w-full">
                            <thead>
                            <tr className="text-left text-sm text-gray-500 dark:text-gray-400 border-b dark:border-gray-700">
                                <th className="pb-3">Category</th>
                                <th className="pb-3 text-right">Total Spent</th>
                                <th className="pb-3 text-right">Monthly Avg</th>
                                <th className="pb-3">Trend</th>
                            </tr>
                            </thead>
                            <tbody>
                            {data.categoryTrends.map(cat => {
                                const last = cat.monthlyAmounts[cat.monthlyAmounts.length - 1] ?? 0;
                                const prev = cat.monthlyAmounts[cat.monthlyAmounts.length - 2] ?? 0;
                                const trend = prev > 0 ? ((last - prev) / prev * 100).toFixed(0) : null;
                                return (
                                    <tr key={cat.category} className="border-b dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getColor(cat.category) }} />
                                                <span className="font-medium text-gray-900 dark:text-white">{cat.category}</span>
                                            </div>
                                        </td>
                                        <td className="py-3 text-right font-semibold text-gray-900 dark:text-white">€{cat.total.toFixed(2)}</td>
                                        <td className="py-3 text-right text-gray-500 dark:text-gray-400">€{cat.average.toFixed(2)}/mo</td>
                                        <td className="py-3">
                                            {trend !== null ? (
                                                <span className={`text-sm font-semibold ${Number(trend) > 10 ? 'text-red-500' : Number(trend) < -10 ? 'text-green-600' : 'text-gray-400'}`}>
                            {Number(trend) > 0 ? '↑' : '↓'} {Math.abs(Number(trend))}%
                          </span>
                                            ) : <span className="text-gray-300 text-sm">—</span>}
                                        </td>
                                    </tr>
                                );
                            })}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
}