import { useEffect, useState } from 'react';
import { transactionAPI } from '../api/client';

interface Transaction {
  id: string;
  amount: number;
  type: string;
  category: string;
  description: string;
  transactionDate: string;
  merchant?: string;
  isAnomaly?: boolean;
  anomalyScore?: number;
}

interface FormState {
  amount: string;
  type: string;
  category: string;
  description: string;
  merchant: string;
  transactionDate: string;
}

const CATEGORIES = [
  'Food', 'Transport', 'Housing', 'Entertainment',
  'Healthcare', 'Shopping', 'Education', 'Utilities', 'Income', 'Transfer', 'Other'
];

const emptyForm = (): FormState => ({
  amount: '',
  type: 'Expense',
  category: 'Food',
  description: '',
  merchant: '',
  transactionDate: new Date().toISOString().split('T')[0],
});

const inputClass = "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white";

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showAnomaliesOnly, setShowAnomaliesOnly] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [editForm, setEditForm] = useState<FormState>(emptyForm());
  const [editSubmitting, setEditSubmitting] = useState(false);

  const loadTransactions = () => {
    setLoading(true);
    transactionAPI.getAll()
        .then(res => setTransactions(res.data))
        .catch(() => setError('Failed to load transactions'))
        .finally(() => setLoading(false));
  };

  useEffect(() => { loadTransactions(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await transactionAPI.create({ ...form, amount: parseFloat(form.amount) });
      setForm(emptyForm());
      setShowForm(false);
      loadTransactions();
    } catch { setError('Failed to add transaction'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this transaction?')) return;
    try {
      await transactionAPI.delete(id);
      setTransactions(prev => prev.filter(t => t.id !== id));
    } catch { setError('Failed to delete transaction'); }
  };

  const openEdit = (tx: Transaction) => {
    setEditingTx(tx);
    setEditForm({
      amount: String(Math.abs(tx.amount)),
      type: tx.type,
      category: tx.category,
      description: tx.description,
      merchant: tx.merchant || '',
      transactionDate: tx.transactionDate.split('T')[0],
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTx) return;
    setEditSubmitting(true);
    setError('');
    try {
      await transactionAPI.update(editingTx.id, { ...editForm, amount: parseFloat(editForm.amount) });
      setEditingTx(null);
      loadTransactions();
    } catch { setError('Failed to update transaction'); }
    finally { setEditSubmitting(false); }
  };

  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setError('');
    setSuccessMsg('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5172/api/import/csv', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Import failed');
      setSuccessMsg(`✅ ${result.message}`);
      loadTransactions();
    } catch (err: any) {
      setError(err.message || 'Import failed');
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const renderFormFields = (values: FormState, onChange: (u: FormState) => void) => (
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
          <select value={values.type} onChange={e => onChange({ ...values, type: e.target.value })} className={inputClass}>
            <option value="Expense">Expense</option>
            <option value="Income">Income</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
          <select value={values.category} onChange={e => onChange({ ...values, category: e.target.value })} className={inputClass}>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount (€)</label>
          <input type="number" step="0.01" min="0" value={values.amount}
                 onChange={e => onChange({ ...values, amount: e.target.value })}
                 className={inputClass} placeholder="0.00" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
          <input type="date" value={values.transactionDate}
                 onChange={e => onChange({ ...values, transactionDate: e.target.value })}
                 className={inputClass} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
          <input type="text" value={values.description}
                 onChange={e => onChange({ ...values, description: e.target.value })}
                 className={inputClass} placeholder="e.g. Grocery shopping" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Merchant (optional)</label>
          <input type="text" value={values.merchant}
                 onChange={e => onChange({ ...values, merchant: e.target.value })}
                 className={inputClass} placeholder="e.g. Maxima" />
        </div>
      </div>
  );

  const anomalyCount = transactions.filter(t => t.isAnomaly).length;
  const displayed = showAnomaliesOnly ? transactions.filter(t => t.isAnomaly) : transactions;

  return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Transactions</h1>
          <div className="flex items-center gap-3">
            <label className={`cursor-pointer font-semibold px-5 py-2 rounded-lg transition text-white ${importing ? 'bg-green-300 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600'}`}>
              {importing ? (
                  <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Importing...
              </span>
              ) : '📂 Import CSV'}
              <input type="file" accept=".csv" className="hidden" onChange={handleCsvImport} disabled={importing} />
            </label>
            <button onClick={() => { setShowForm(!showForm); setError(''); setSuccessMsg(''); }}
                    className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-5 py-2 rounded-lg transition">
              {showForm ? 'Cancel' : '+ Add Transaction'}
            </button>
          </div>
        </div>

        {error && <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm">{error}</div>}
        {successMsg && <div className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 p-3 rounded-lg text-sm">{successMsg}</div>}
        {importing && <div className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 p-3 rounded-lg text-sm">🤖 AI is classifying your transactions...</div>}

        {showForm && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">New Transaction</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                {renderFormFields(form, setForm)}
                <button type="submit" disabled={submitting}
                        className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50 mt-2">
                  {submitting ? 'Saving...' : 'Save Transaction'}
                </button>
              </form>
            </div>
        )}

        {anomalyCount > 0 && (
            <div className="flex items-center justify-between bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-5 py-3">
              <div className="flex items-center gap-2">
                <span className="text-red-500 text-lg">🔍</span>
                <span className="text-sm text-red-700 dark:text-red-400 font-medium">{anomalyCount} anomalous transaction{anomalyCount > 1 ? 's' : ''} detected</span>
                <span className="text-xs text-red-400">(excluded from predictions)</span>
              </div>
              <button onClick={() => setShowAnomaliesOnly(v => !v)}
                      className="text-sm text-red-600 dark:text-red-400 hover:text-red-800 font-semibold">
                {showAnomaliesOnly ? 'Show all' : 'Show anomalies only'}
              </button>
            </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
          {loading ? (
              <p className="text-center text-gray-500 dark:text-gray-400 py-8">Loading...</p>
          ) : displayed.length === 0 ? (
              <p className="text-center text-gray-400 py-8">No transactions yet.</p>
          ) : (
              <>
                <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">{displayed.length} transaction{displayed.length !== 1 ? 's' : ''} total</p>
                <table className="w-full">
                  <thead>
                  <tr className="text-left text-sm text-gray-500 dark:text-gray-400 border-b dark:border-gray-700">
                    <th className="pb-3">Description</th>
                    <th className="pb-3">Category</th>
                    <th className="pb-3">Merchant</th>
                    <th className="pb-3">Date</th>
                    <th className="pb-3 text-right">Amount</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                  </thead>
                  <tbody>
                  {displayed.map(tx => (
                      <tr key={tx.id} className={`border-b dark:border-gray-700 last:border-0 ${tx.isAnomaly ? 'bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 dark:text-white">{tx.description}</span>
                            {tx.isAnomaly && (
                                <span title={`${tx.anomalyScore?.toFixed(1)}× category average`}
                                      className="text-xs bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400 font-semibold px-1.5 py-0.5 rounded cursor-help">
                            ⚠ {tx.anomalyScore?.toFixed(1)}×
                          </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3">
                          <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-medium px-2 py-1 rounded-full">{tx.category}</span>
                        </td>
                        <td className="py-3 text-gray-500 dark:text-gray-400">{tx.merchant || '—'}</td>
                        <td className="py-3 text-gray-500 dark:text-gray-400">{new Date(tx.transactionDate).toLocaleDateString()}</td>
                        <td className={`py-3 text-right font-semibold ${tx.type === 'Income' ? 'text-green-600' : 'text-red-500'}`}>
                          {tx.type === 'Income' ? '+' : '-'}€{Math.abs(tx.amount).toFixed(2)}
                        </td>
                        <td className="py-3 text-right">
                          <button onClick={() => openEdit(tx)} className="text-blue-400 hover:text-blue-600 text-sm font-medium mr-3">Edit</button>
                          <button onClick={() => handleDelete(tx.id)} className="text-red-400 hover:text-red-600 text-sm font-medium">Delete</button>
                        </td>
                      </tr>
                  ))}
                  </tbody>
                </table>
              </>
          )}
        </div>

        {editingTx && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg">
                <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b dark:border-gray-700">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Edit Transaction</h2>
                  <button onClick={() => setEditingTx(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
                </div>
                <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
                  {renderFormFields(editForm, setEditForm)}
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setEditingTx(null)}
                            className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                      Cancel
                    </button>
                    <button type="submit" disabled={editSubmitting}
                            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-50">
                      {editSubmitting ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
        )}
      </div>
  );
}