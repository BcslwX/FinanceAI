import { useState, useEffect } from 'react';
import { insightsAPI } from '../api/client';
import type { InsightsResponse, InsightItem } from '../api/client';

const PERIOD_OPTIONS = [
    { label: 'This month', value: 1 },
    { label: 'Last 3 months', value: 3 },
    { label: 'Last 6 months', value: 6 },
    { label: 'Last 12 months', value: 12 },
];

const TYPE_CONFIG: Record<string, {
    bg: string; border: string; icon: string; label: string;
}> = {
    positive: { bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-800', icon: '✅', label: 'Good news' },
    warning:  { bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800', icon: '⚠️', label: 'Watch out' },
    info:     { bg: 'bg-blue-50 dark:bg-blue-900/20',   border: 'border-blue-200 dark:border-blue-800',   icon: '💡', label: 'Insight' },
    anomaly:  { bg: 'bg-red-50 dark:bg-red-900/20',     border: 'border-red-200 dark:border-red-800',     icon: '🔍', label: 'Anomaly detected' },
};

function InsightCard({ insight }: { insight: InsightItem }) {
    const config = TYPE_CONFIG[insight.type] ?? TYPE_CONFIG.info;
    return (
        <div className={`rounded-xl border p-5 ${config.bg} ${config.border}`}>
            <div className="flex items-start gap-3">
                <span className="text-2xl">{config.icon}</span>
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white">{insight.title}</h3>
                        <span className="text-xs text-gray-400 dark:text-gray-500">{config.label}</span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{insight.message}</p>
                </div>
            </div>
        </div>
    );
}

export default function Insights() {
    const [data, setData] = useState<InsightsResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [period, setPeriod] = useState(1);
    const [loadedPeriod, setLoadedPeriod] = useState<number | null>(null);

    const loadInsights = async (months: number) => {
        setLoading(true);
        setError('');
        try {
            const res = await insightsAPI.get(months);
            setData(res.data);
            setLoadedPeriod(months);
        } catch {
            setError('Failed to generate insights. Check your OpenAI API key.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadInsights(1); }, []);

    const handlePeriodChange = (months: number) => { setPeriod(months); };

    const periodLabel = PERIOD_OPTIONS.find(p => p.value === period)?.label ?? '';
    const loadedLabel = PERIOD_OPTIONS.find(p => p.value === loadedPeriod)?.label ?? '';

    const positives = data?.insights.filter(i => i.type === 'positive') ?? [];
    const warnings  = data?.insights.filter(i => i.type === 'warning')  ?? [];
    const infos     = data?.insights.filter(i => i.type === 'info')     ?? [];
    const anomalies = data?.insights.filter(i => i.type === 'anomaly')  ?? [];

    return (
        <div className="space-y-6">

            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Insights</h1>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Personalised analysis of your spending patterns</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                        {PERIOD_OPTIONS.map(opt => (
                            <button key={opt.value} onClick={() => handlePeriodChange(opt.value)}
                                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                                        period === opt.value
                                            ? 'bg-white dark:bg-gray-600 shadow text-purple-600 dark:text-purple-400'
                                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                    }`}>
                                {opt.label}
                            </button>
                        ))}
                    </div>
                    <button onClick={() => loadInsights(period)} disabled={loading}
                            className="flex items-center gap-2 bg-purple-500 hover:bg-purple-600 disabled:bg-purple-300 text-white font-semibold px-5 py-2 rounded-lg transition">
                        {loading ? (
                            <>
                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                </svg>
                                Analysing...
                            </>
                        ) : '🔄 Refresh'}
                    </button>
                </div>
            </div>

            {/* Period changed notice */}
            {data && loadedPeriod !== period && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-400 px-4 py-3 rounded-lg text-sm">
                    Period changed to <strong>{periodLabel}</strong> — click Refresh to regenerate.
                </div>
            )}

            {error && <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-4 rounded-lg">{error}</div>}

            {/* Loading state */}
            {loading && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-12 text-center">
                    <div className="text-5xl mb-4 animate-pulse">🤖</div>
                    <p className="text-gray-600 dark:text-gray-300 font-medium">Analysing {periodLabel.toLowerCase()}...</p>
                    <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">This takes about 5–10 seconds</p>
                </div>
            )}

            {data && !loading && (
                <>
                    {/* Summary card */}
                    <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl p-6 text-white">
                        <div className="flex items-start gap-3">
                            <span className="text-3xl">🤖</span>
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-1">
                                    <h2 className="font-semibold text-lg">Summary</h2>
                                    <span className="text-xs bg-white bg-opacity-20 px-2 py-0.5 rounded-full">{loadedLabel}</span>
                                </div>
                                <p className="text-purple-100 leading-relaxed">{data.summary}</p>
                            </div>
                        </div>
                        <p className="text-purple-300 text-xs mt-4">
                            Generated at {new Date(data.generatedAt).toLocaleString()} · Anomalous transactions excluded
                        </p>
                    </div>

                    {/* Stats bar */}
                    <div className="grid grid-cols-4 gap-4">
                        {[
                            { label: 'Positive',  count: positives.length, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
                            { label: 'Warnings',  count: warnings.length,  color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
                            { label: 'Insights',  count: infos.length,     color: 'text-blue-600',  bg: 'bg-blue-50 dark:bg-blue-900/20'  },
                            { label: 'Anomalies', count: anomalies.length, color: 'text-red-600',   bg: 'bg-red-50 dark:bg-red-900/20'   },
                        ].map(s => (
                            <div key={s.label} className={`rounded-xl p-4 text-center ${s.bg}`}>
                                <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{s.label}</p>
                            </div>
                        ))}
                    </div>

                    {/* Anomalies — no emoji in header, card has it */}
                    {anomalies.length > 0 && (
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Anomalies Detected</h2>
                            <div className="space-y-3">
                                {anomalies.map((insight, i) => <InsightCard key={i} insight={insight} />)}
                            </div>
                        </div>
                    )}

                    {/* Warnings */}
                    {warnings.length > 0 && (
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Things to Watch</h2>
                            <div className="space-y-3">
                                {warnings.map((insight, i) => <InsightCard key={i} insight={insight} />)}
                            </div>
                        </div>
                    )}

                    {/* Positives */}
                    {positives.length > 0 && (
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">What's Going Well</h2>
                            <div className="space-y-3">
                                {positives.map((insight, i) => <InsightCard key={i} insight={insight} />)}
                            </div>
                        </div>
                    )}

                    {/* Info */}
                    {infos.length > 0 && (
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Observations</h2>
                            <div className="space-y-3">
                                {infos.map((insight, i) => <InsightCard key={i} insight={insight} />)}
                            </div>
                        </div>
                    )}

                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-semibold">About anomaly detection: </span>
                        Transactions exceeding 2.5× the category average are excluded from both
                        predictions and AI analysis to prevent one-off purchases from distorting your insights.
                    </div>
                </>
            )}
        </div>
    );
}