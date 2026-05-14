import { useEffect, useState, useCallback } from 'react';
import { dashboardAPI } from '../api/client';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';

interface DashboardData {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  expensesByCategory: Record<string, number>;
  recentTransactions: any[];
  predictions: Record<string, number>;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

type ViewMode = 'month' | 'year';

export default function Dashboard() {
  const now = new Date();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  const isCurrentMonth = selectedYear === now.getFullYear() && selectedMonth === now.getMonth() + 1;

  useEffect(() => {
    dashboardAPI.getAvailableYears()
        .then(res => setAvailableYears(res.data.length > 0 ? res.data : [now.getFullYear()]))
        .catch(() => setAvailableYears([now.getFullYear()]));
  }, []);

  const loadData = useCallback(() => {
    setLoading(true);
    setError('');
    const month = viewMode === 'month' ? selectedMonth : undefined;
    dashboardAPI.get(selectedYear, month)
        .then(res => setData(res.data))
        .catch(() => setError('Failed to load dashboard'))
        .finally(() => setLoading(false));
  }, [viewMode, selectedYear, selectedMonth]);

  useEffect(() => { loadData(); }, [loadData]);

  const goToPrevMonth = () => {
    if (selectedMonth === 1) { setSelectedMonth(12); setSelectedYear(y => y - 1); }
    else setSelectedMonth(m => m - 1);
  };

  const goToNextMonth = () => {
    if (isCurrentMonth) return;
    if (selectedMonth === 12) { setSelectedMonth(1); setSelectedYear(y => y + 1); }
    else setSelectedMonth(m => m + 1);
  };

  const pieData = data ? Object.entries(data.expensesByCategory).map(([name, value]) => ({ name, value })) : [];
  const predictionData = (data && viewMode === 'month' && isCurrentMonth)
      ? Object.entries(data.predictions).map(([category, amount]) => ({ category, amount }))
      : [];
  const showPredictions = viewMode === 'month' && isCurrentMonth;

  const card = "bg-white dark:bg-gray-800 rounded-xl shadow p-6";

  return (
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <div className="flex items-center gap-3">
            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button onClick={() => setViewMode('month')}
                      className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${viewMode === 'month' ? 'bg-white dark:bg-gray-600 shadow text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
                Monthly
              </button>
              <button onClick={() => setViewMode('year')}
                      className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${viewMode === 'year' ? 'bg-white dark:bg-gray-600 shadow text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
                Yearly
              </button>
            </div>
            <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500">
              {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            {viewMode === 'month' && (
                <div className="flex items-center gap-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2">
                  <button onClick={goToPrevMonth} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 font-bold text-xl leading-none px-1">‹</button>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-24 text-center">{MONTH_NAMES[selectedMonth - 1]}</span>
                  <button onClick={goToNextMonth} disabled={isCurrentMonth}
                          className={`font-bold text-xl leading-none px-1 ${isCurrentMonth ? 'text-gray-200 dark:text-gray-600 cursor-not-allowed' : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>›</button>
                </div>
            )}
          </div>
        </div>

        <p className="text-sm text-gray-400 dark:text-gray-500 -mt-4">
          {viewMode === 'month' ? `Showing: ${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}` : `Showing: Full year ${selectedYear}`}
        </p>

        {error && <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-4 rounded-lg">{error}</div>}

        {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-400 text-lg">Loading...</div>
            </div>
        ) : !data ? null : (
            <>
              <div className="grid grid-cols-3 gap-6">
                <div className={card}>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Income</p>
                  <p className="text-3xl font-bold text-green-600">€{data.totalIncome.toFixed(2)}</p>
                </div>
                <div className={card}>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Expenses</p>
                  <p className="text-3xl font-bold text-red-500">€{data.totalExpenses.toFixed(2)}</p>
                </div>
                <div className={card}>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Net Balance</p>
                  <p className={`text-3xl font-bold ${data.netBalance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                    €{data.netBalance.toFixed(2)}
                  </p>
                </div>
              </div>

              <div className={`grid gap-6 ${showPredictions ? 'grid-cols-2' : 'grid-cols-1'}`}>
                <div className={card}>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Expenses by Category</h2>
                  {pieData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={260}>
                        <PieChart>
                          <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90}
                               label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                            {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip formatter={(value) => `€${Number(value).toFixed(2)}`} />
                        </PieChart>
                      </ResponsiveContainer>
                  ) : (
                      <p className="text-gray-400 text-center py-20">No expense data for this period</p>
                  )}
                </div>

                {showPredictions && (
                    <div className={card}>
                      <div className="flex items-start justify-between mb-1">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Next Month Forecast</h2>
                        <a href="/predictions" className="text-sm text-blue-500 hover:text-blue-600 font-medium">Full analysis →</a>
                      </div>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">Based on your 3-month spending average</p>
                      {predictionData.length > 0 ? (
                          <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={predictionData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                              <XAxis dataKey="category" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                              <YAxis tickFormatter={(v) => `€${v}`} tick={{ fill: '#9CA3AF' }} />
                              <Tooltip formatter={(value) => `€${Number(value).toFixed(2)}`} />
                              <Bar dataKey="amount" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                      ) : (
                          <div className="flex flex-col items-center justify-center py-16 text-center">
                            <p className="text-gray-400">Not enough data yet.</p>
                          </div>
                      )}
                    </div>
                )}
              </div>

              <div className={card}>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  {viewMode === 'month' ? `Transactions — ${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}` : `Transactions — ${selectedYear}`}
                </h2>
                {data.recentTransactions.length > 0 ? (
                    <table className="w-full">
                      <thead>
                      <tr className="text-left text-sm text-gray-500 dark:text-gray-400 border-b dark:border-gray-700">
                        <th className="pb-3">Description</th>
                        <th className="pb-3">Category</th>
                        <th className="pb-3">Date</th>
                        <th className="pb-3 text-right">Amount</th>
                      </tr>
                      </thead>
                      <tbody>
                      {data.recentTransactions.map((tx: any) => (
                          <tr key={tx.id} className="border-b dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <td className="py-3 font-medium text-gray-900 dark:text-white">{tx.description}</td>
                            <td className="py-3 text-gray-500 dark:text-gray-400">{tx.category}</td>
                            <td className="py-3 text-gray-500 dark:text-gray-400">{new Date(tx.transactionDate).toLocaleDateString()}</td>
                            <td className={`py-3 text-right font-semibold ${tx.type === 'Income' ? 'text-green-600' : 'text-red-500'}`}>
                              {tx.type === 'Income' ? '+' : '-'}€{Math.abs(tx.amount).toFixed(2)}
                            </td>
                          </tr>
                      ))}
                      </tbody>
                    </table>
                ) : (
                    <p className="text-gray-400 text-center py-8">No transactions for this period.</p>
                )}
              </div>
            </>
        )}
      </div>
  );
}