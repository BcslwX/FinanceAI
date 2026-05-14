import { useEffect, useState } from 'react';
import { budgetsAPI } from '../api/client';
import type { Budget } from '../api/client';

const CATEGORIES = [
    'Food', 'Transport', 'Housing', 'Entertainment',
    'Healthcare', 'Shopping', 'Education', 'Utilities', 'Other'
];

const CATEGORY_COLORS: Record<string, string> = {
    Food: '#10B981', Transport: '#3B82F6', Housing: '#F59E0B',
    Entertainment: '#8B5CF6', Healthcare: '#EF4444', Shopping: '#EC4899',
    Education: '#14B8A6', Utilities: '#F97316', Other: '#6B7280',
};

function getColor(category: string) { return CATEGORY_COLORS[category] ?? '#6B7280'; }

function ProgressBar({ percent, status }: { percent: number; status: string }) {
    const capped = Math.min(percent, 100);
    const barColor = status === 'exceeded' ? 'bg-red-500' : status === 'warning' ? 'bg-amber-400' : 'bg-green-500';
    return (
        <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2.5">
            <div className={`h-2.5 rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${capped}%` }} />
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    if (status === 'exceeded') return <span className="text-xs font-semibold text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400 px-2 py-0.5 rounded-full">Exceeded</span>;
    if (status === 'warning') return <span className="text-xs font-semibold text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded-full">Near limit</span>;
    return <span className="text-xs font-semibold text-green-600 bg-green-50 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-full">On track</span>;
}

const now = new Date();
const MONTH_NAME = now.toLocaleString('default', { month: 'long', year: 'numeric' });

export default function Budgets() {
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
    const [form, setForm] = useState({ category: 'Food', allocatedAmount: '', alertThreshold: '80', alertEnabled: true });
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState('');

    const loadBudgets = () => {
        setLoading(true);
        budgetsAPI.getAll()
            .then(res => setBudgets(res.data))
            .catch(() => setError('Failed to load budgets'))
            .finally(() => setLoading(false));
    };

    useEffect(() => { loadBudgets(); }, []);

    const openAdd = () => {
        setEditingBudget(null);
        setForm({ category: 'Food', allocatedAmount: '', alertThreshold: '80', alertEnabled: true });
        setFormError('');
        setShowModal(true);
    };

    const openEdit = (b: Budget) => {
        setEditingBudget(b);
        setForm({ category: b.category, allocatedAmount: String(b.allocatedAmount), alertThreshold: String(Math.round(b.alertThreshold * 100)), alertEnabled: b.alertEnabled });
        setFormError('');
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setFormError('');
        try {
            const payload = { category: form.category, allocatedAmount: parseFloat(form.allocatedAmount), alertThreshold: parseFloat(form.alertThreshold) / 100, alertEnabled: form.alertEnabled };
            if (editingBudget) await budgetsAPI.update(editingBudget.id, payload);
            else await budgetsAPI.create(payload);
            setShowModal(false);
            loadBudgets();
        } catch (err: any) {
            setFormError(err.response?.data?.message || 'Failed to save budget');
        } finally { setSaving(false); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this budget?')) return;
        try {
            await budgetsAPI.delete(id);
            setBudgets(prev => prev.filter(b => b.id !== id));
        } catch { setError('Failed to delete budget'); }
    };

    const totalAllocated = budgets.reduce((s, b) => s + b.allocatedAmount, 0);
    const totalSpent = budgets.reduce((s, b) => s + b.spentAmount, 0);
    const exceededCount = budgets.filter(b => b.status === 'exceeded').length;
    const warningCount = budgets.filter(b => b.status === 'warning').length;
    const usedCategories = budgets.map(b => b.category);
    const availableCategories = CATEGORIES.filter(c => !usedCategories.includes(c));

    const inputClass = "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white";

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Budgets</h1>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">{MONTH_NAME} · Monthly spending limits</p>
                </div>
                <button onClick={openAdd} disabled={availableCategories.length === 0}
                        className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white font-semibold px-5 py-2 rounded-lg transition">
                    + Add Budget
                </button>
            </div>

            {error && <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm">{error}</div>}

            {budgets.length > 0 && (
                <div className="grid grid-cols-4 gap-4">
                    {[
                        { label: 'Total Budget', value: `€${totalAllocated.toFixed(2)}`, color: 'text-gray-900 dark:text-white' },
                        { label: 'Total Spent', value: `€${totalSpent.toFixed(2)}`, color: totalSpent > totalAllocated ? 'text-red-500' : 'text-gray-900 dark:text-white' },
                        { label: 'Remaining', value: `€${(totalAllocated - totalSpent).toFixed(2)}`, color: totalAllocated - totalSpent < 0 ? 'text-red-500' : 'text-green-600' },
                    ].map(s => (
                        <div key={s.label} className="bg-white dark:bg-gray-800 rounded-xl shadow p-5">
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{s.label}</p>
                            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                        </div>
                    ))}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-5">
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Alerts</p>
                        <div className="flex flex-col gap-1 mt-1">
                            {exceededCount > 0 && <span className="text-sm font-bold text-red-500">{exceededCount} exceeded</span>}
                            {warningCount > 0 && <span className="text-sm font-bold text-amber-500">{warningCount} near limit</span>}
                            {exceededCount === 0 && warningCount === 0 && <span className="text-sm font-bold text-green-600">All on track ✓</span>}
                        </div>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center h-40">
                    <p className="text-gray-400">Loading budgets...</p>
                </div>
            ) : budgets.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-12 text-center">
                    <p className="text-4xl mb-4">💰</p>
                    <p className="text-gray-600 dark:text-gray-300 font-medium text-lg">No budgets set yet</p>
                    <p className="text-gray-400 text-sm mt-2 mb-6">Set monthly spending limits per category</p>
                    <button onClick={openAdd} className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-2.5 rounded-lg transition">
                        Create your first budget
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-4">
                    {budgets.map(b => (
                        <div key={b.id} className={`bg-white dark:bg-gray-800 rounded-xl shadow p-5 border-l-4 ${b.status === 'exceeded' ? 'border-red-500' : b.status === 'warning' ? 'border-amber-400' : 'border-green-500'}`}>
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getColor(b.category) }} />
                                    <span className="font-semibold text-gray-900 dark:text-white">{b.category}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <StatusBadge status={b.status} />
                                    <button onClick={() => openEdit(b)} className="text-xs text-blue-400 hover:text-blue-600 font-medium">Edit</button>
                                    <button onClick={() => handleDelete(b.id)} className="text-xs text-red-400 hover:text-red-600 font-medium">Delete</button>
                                </div>
                            </div>
                            <ProgressBar percent={b.percentUsed} status={b.status} />
                            <div className="flex items-center justify-between mt-2">
                                <span className="text-sm text-gray-500 dark:text-gray-400">€{b.spentAmount.toFixed(2)} spent</span>
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">of €{b.allocatedAmount.toFixed(2)}</span>
                            </div>
                            <div className="flex items-center justify-between mt-1">
                <span className={`text-xs font-semibold ${b.status === 'exceeded' ? 'text-red-500' : b.status === 'warning' ? 'text-amber-500' : 'text-green-600'}`}>
                  {b.percentUsed}% used
                </span>
                                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {b.allocatedAmount - b.spentAmount >= 0 ? `€${(b.allocatedAmount - b.spentAmount).toFixed(2)} left` : `€${(b.spentAmount - b.allocatedAmount).toFixed(2)} over`}
                </span>
                            </div>
                            {b.alertEnabled && b.status !== 'exceeded' && (
                                <div className="mt-2 text-xs text-gray-400 dark:text-gray-500">Alert at {Math.round(b.alertThreshold * 100)}% · €{(b.allocatedAmount * b.alertThreshold).toFixed(2)}</div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md">
                        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b dark:border-gray-700">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                {editingBudget ? `Edit ${editingBudget.category} Budget` : 'New Budget'}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {formError && <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm">{formError}</div>}
                            {!editingBudget && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                                    <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className={inputClass}>
                                        {availableCategories.map(c => <option key={c}>{c}</option>)}
                                    </select>
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Monthly Limit (€)</label>
                                <input type="number" step="0.01" min="1" value={form.allocatedAmount}
                                       onChange={e => setForm({ ...form, allocatedAmount: e.target.value })}
                                       className={inputClass} placeholder="e.g. 300" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Alert Threshold: {form.alertThreshold}%</label>
                                <input type="range" min="50" max="95" step="5" value={form.alertThreshold}
                                       onChange={e => setForm({ ...form, alertThreshold: e.target.value })}
                                       className="w-full accent-blue-500" />
                                <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mt-1">
                                    <span>50%</span><span>Alert threshold</span><span>95%</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <input type="checkbox" id="alertEnabled" checked={form.alertEnabled}
                                       onChange={e => setForm({ ...form, alertEnabled: e.target.checked })}
                                       className="w-4 h-4 accent-blue-500" />
                                <label htmlFor="alertEnabled" className="text-sm text-gray-700 dark:text-gray-300">Enable alerts</label>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowModal(false)}
                                        className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                                    Cancel
                                </button>
                                <button type="submit" disabled={saving}
                                        className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-50">
                                    {saving ? 'Saving...' : editingBudget ? 'Save Changes' : 'Create Budget'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}