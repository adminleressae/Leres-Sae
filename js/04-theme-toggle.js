// Externalized from Untitled-1.html; original script order preserved.
(function () {
    'use strict';

    const STORAGE_KEY = 'leressae-theme-preference';
    const root = document.documentElement;
    const mediaQuery = window.matchMedia
        ? window.matchMedia('(prefers-color-scheme: dark)')
        : null;



    function getSavedPreference() {
        try {
            const value = localStorage.getItem(STORAGE_KEY);
            return value === 'dark' || value === 'light' ? value : 'system';
        } catch (error) {
            return 'system';
        }
    }



    function setSavedPreference(value) {
        try {
            if (value === 'system') {
                localStorage.removeItem(STORAGE_KEY);
            } else {
                localStorage.setItem(STORAGE_KEY, value);
            }
        } catch (error) {

        }
    }



    function systemTheme() {
        return mediaQuery && mediaQuery.matches ? 'dark' : 'light';
    }



    function currentPreference() {
        return getSavedPreference();
    }



    function applyTheme(preference) {
        const resolved = preference === 'system' ? systemTheme() : preference;
        root.setAttribute('data-leressae-theme', resolved);
        root.setAttribute('data-leressae-theme-preference', preference);
        root.style.colorScheme = resolved;
        updateToggle(resolved, preference);
    }



    function updateToggle(resolved, preference) {
        const button = document.getElementById('leressaeThemeToggle');
        if (!button) return;

        const icon = button.querySelector('.leressae-theme-icon');
        const text = button.querySelector('.leressae-theme-text');
        const isDark = resolved === 'dark';

        if (icon) icon.textContent = isDark ? '☀' : '☾';
        if (text) text.textContent = isDark ? 'Mode Terang' : 'Mode Gelap';

        button.setAttribute('aria-pressed', isDark ? 'true' : 'false');
        button.setAttribute(
            'title',
            preference === 'system'
                ? 'Mengikuti tema perangkat • Klik untuk mengubah • Double-click untuk tetap mengikuti sistem'
                : 'Mode manual aktif • Double-click untuk mengikuti tema perangkat'
        );
    }



    function ensureToggle() {
        if (document.getElementById('leressaeThemeToggle')) {
            updateToggle(root.getAttribute('data-leressae-theme') || systemTheme(), currentPreference());
            return;
        }

        const button = document.createElement('button');
        button.id = 'leressaeThemeToggle';
        button.type = 'button';
        button.setAttribute('aria-label', 'Ubah mode tampilan');
        button.setAttribute('aria-live', 'polite');
        button.innerHTML = '<span class="leressae-theme-icon" aria-hidden="true">☾</span><span class="leressae-theme-text">Mode Gelap</span>';

        button.addEventListener('click', function () {
            const resolved = root.getAttribute('data-leressae-theme') || systemTheme();
            const next = resolved === 'dark' ? 'light' : 'dark';
            setSavedPreference(next);
            applyTheme(next);
        });


        button.addEventListener('dblclick', function (event) {
            event.preventDefault();
            setSavedPreference('system');
            applyTheme('system');
        });

        document.body.appendChild(button);
        updateToggle(root.getAttribute('data-leressae-theme') || systemTheme(), currentPreference());
    }



    function boot() {
        applyTheme(currentPreference());
        ensureToggle();
    }

    if (mediaQuery) {
        const handleSystemChange = function () {
            if (currentPreference() === 'system') applyTheme('system');
        };
        if (typeof mediaQuery.addEventListener === 'function') {
            mediaQuery.addEventListener('change', handleSystemChange);
        } else if (typeof mediaQuery.addListener === 'function') {
            mediaQuery.addListener(handleSystemChange);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot, { once: true });
    } else {
        boot();
    }
})();
