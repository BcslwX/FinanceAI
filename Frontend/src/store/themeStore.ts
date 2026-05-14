import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ThemeState {
    isDark: boolean;
    toggle: () => void;
}

// Read saved preference synchronously before store is created
const getSavedDark = (): boolean => {
    try {
        const stored = localStorage.getItem('theme-storage');
        if (stored) {
            const parsed = JSON.parse(stored);
            return parsed?.state?.isDark ?? false;
        }
    } catch {}
    return false;
};

const initialDark = getSavedDark();

// Apply immediately so there's no flash of wrong theme
if (initialDark) {
    document.documentElement.classList.add('dark');
} else {
    document.documentElement.classList.remove('dark');
}

export const useThemeStore = create<ThemeState>()(
    persist(
        (set, get) => ({
            isDark: initialDark,
            toggle: () => {
                const next = !get().isDark;
                if (next) {
                    document.documentElement.classList.add('dark');
                } else {
                    document.documentElement.classList.remove('dark');
                }
                set({ isDark: next });
            },
        }),
        { name: 'theme-storage' }
    )
);