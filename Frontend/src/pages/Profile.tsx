import { useEffect, useState } from 'react';
import { authAPI } from '../api/client';
import { useAuthStore } from '../store/authStore';

interface ProfileData {
    firstName: string;
    lastName: string;
    email: string;
    monthlyIncome: number;
    createdAt: string;
}

const inputClass = "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white";

export default function Profile() {
    const { setAuth } = useAuthStore();
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [profileForm, setProfileForm] = useState({ firstName: '', lastName: '', email: '', monthlyIncome: 0 });
    const [profileSaving, setProfileSaving] = useState(false);
    const [profileSuccess, setProfileSuccess] = useState('');
    const [profileError, setProfileError] = useState('');

    const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [passwordSaving, setPasswordSaving] = useState(false);
    const [passwordSuccess, setPasswordSuccess] = useState('');
    const [passwordError, setPasswordError] = useState('');

    useEffect(() => {
        authAPI.getProfile()
            .then(res => {
                setProfile(res.data);
                setProfileForm({ firstName: res.data.firstName, lastName: res.data.lastName, email: res.data.email, monthlyIncome: res.data.monthlyIncome });
            })
            .catch(() => setError('Failed to load profile'))
            .finally(() => setLoading(false));
    }, []);

    const handleProfileSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setProfileSaving(true);
        setProfileError('');
        setProfileSuccess('');
        try {
            const res = await authAPI.updateProfile(profileForm);
            setProfileSuccess('Profile updated successfully');
            setAuth({ ...useAuthStore.getState(), firstName: res.data.firstName, email: res.data.email });
        } catch (err: any) {
            setProfileError(err.response?.data?.message || 'Failed to update profile');
        } finally { setProfileSaving(false); }
    };

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordError('');
        setPasswordSuccess('');
        if (passwordForm.newPassword !== passwordForm.confirmPassword) { setPasswordError('New passwords do not match'); return; }
        if (passwordForm.newPassword.length < 6) { setPasswordError('New password must be at least 6 characters'); return; }
        setPasswordSaving(true);
        try {
            await authAPI.updatePassword({ currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword });
            setPasswordSuccess('Password updated successfully');
            setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (err: any) {
            setPasswordError(err.response?.data?.message || 'Failed to update password');
        } finally { setPasswordSaving(false); }
    };

    if (loading) return <div className="flex items-center justify-center h-64"><div className="text-gray-400 text-lg">Loading profile...</div></div>;
    if (error) return <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-4 rounded-lg">{error}</div>;

    const card = "bg-white dark:bg-gray-800 rounded-xl shadow p-6";

    return (
        <div className="space-y-6 max-w-2xl">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Profile & Settings</h1>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Manage your account details and security</p>
            </div>

            <div className={card}>
                <div className="flex items-center gap-4 mb-6 pb-6 border-b dark:border-gray-700">
                    <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 dark:text-blue-400 font-bold text-2xl">{profileForm.firstName?.[0]?.toUpperCase() ?? '?'}</span>
                    </div>
                    <div>
                        <p className="text-xl font-semibold text-gray-900 dark:text-white">{profileForm.firstName} {profileForm.lastName}</p>
                        <p className="text-gray-500 dark:text-gray-400 text-sm">{profileForm.email}</p>
                        {profile?.createdAt && (
                            <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
                                Member since {new Date(profile.createdAt).toLocaleDateString('en-GB', { year: 'numeric', month: 'long' })}
                            </p>
                        )}
                    </div>
                </div>

                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Personal Information</h2>
                {profileSuccess && <div className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 p-3 rounded-lg text-sm mb-4">✅ {profileSuccess}</div>}
                {profileError && <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm mb-4">{profileError}</div>}

                <form onSubmit={handleProfileSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">First Name</label>
                            <input type="text" value={profileForm.firstName}
                                   onChange={e => setProfileForm({ ...profileForm, firstName: e.target.value })}
                                   className={inputClass} required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last Name</label>
                            <input type="text" value={profileForm.lastName}
                                   onChange={e => setProfileForm({ ...profileForm, lastName: e.target.value })}
                                   className={inputClass} required />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
                        <input type="email" value={profileForm.email}
                               onChange={e => setProfileForm({ ...profileForm, email: e.target.value })}
                               className={inputClass} required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Monthly Income (€)</label>
                        <input type="number" step="0.01" min="0" value={profileForm.monthlyIncome}
                               onChange={e => setProfileForm({ ...profileForm, monthlyIncome: parseFloat(e.target.value) || 0 })}
                               className={inputClass} />
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Used to calculate your savings rate in analytics</p>
                    </div>
                    <button type="submit" disabled={profileSaving}
                            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-50">
                        {profileSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                </form>
            </div>

            <div className={card}>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Change Password</h2>
                {passwordSuccess && <div className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 p-3 rounded-lg text-sm mb-4">✅ {passwordSuccess}</div>}
                {passwordError && <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm mb-4">{passwordError}</div>}

                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Current Password</label>
                        <input type="password" value={passwordForm.currentPassword}
                               onChange={e => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                               className={inputClass} placeholder="••••••••" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Password</label>
                        <input type="password" value={passwordForm.newPassword}
                               onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                               className={inputClass} placeholder="••••••••" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm New Password</label>
                        <input type="password" value={passwordForm.confirmPassword}
                               onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                               className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                                   passwordForm.confirmPassword && passwordForm.confirmPassword !== passwordForm.newPassword
                                       ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'
                               }`}
                               placeholder="••••••••" required />
                        {passwordForm.confirmPassword && passwordForm.confirmPassword !== passwordForm.newPassword && (
                            <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                        )}
                    </div>
                    <button type="submit" disabled={passwordSaving}
                            className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-50">
                        {passwordSaving ? 'Updating...' : 'Update Password'}
                    </button>
                </form>
            </div>
        </div>
    );
}