import { useState, useEffect } from 'react';
import { themes } from '../config/themes';

export const useSettings = () => {
    const [currentTheme, setCurrentTheme] = useState('default');
    const [autoCloseLauncher, setAutoCloseLauncher] = useState(false);
    const [playMusicOnStartup, setPlayMusicOnStartup] = useState(false);
    const [clearCacheOnLaunch, setClearCacheOnLaunch] = useState(false);
    const [defaultDownloadPath, setDefaultDownloadPath] = useState('');
    const [enableNotifications, setEnableNotifications] = useState(true);
    const [enableSoundEffects, setEnableSoundEffects] = useState(true);
    const [enableGlowEffects, setEnableGlowEffects] = useState(false);

    // Load settings from local storage
    useEffect(() => {
        const savedTheme = localStorage.getItem('relictum_theme') || localStorage.getItem('warmane_theme');
        if (savedTheme && themes[savedTheme]) setCurrentTheme(savedTheme);

        const savedAutoClose = localStorage.getItem('relictum_auto_close') || localStorage.getItem('warmane_auto_close');
        if (savedAutoClose) setAutoCloseLauncher(JSON.parse(savedAutoClose));

        const savedPlayMusic = localStorage.getItem('relictum_play_music_on_startup') || localStorage.getItem('warmane_play_music_on_startup');
        if (savedPlayMusic) setPlayMusicOnStartup(JSON.parse(savedPlayMusic));

        const savedClearCache = localStorage.getItem('relictum_clear_cache') || localStorage.getItem('warmane_clear_cache');
        if (savedClearCache) setClearCacheOnLaunch(JSON.parse(savedClearCache));

        const savedDefaultPath = localStorage.getItem('relictum_default_download_path') || localStorage.getItem('warmane_default_download_path');
        if (savedDefaultPath) setDefaultDownloadPath(savedDefaultPath);

        const savedNotifications = localStorage.getItem('relictum_notifications') || localStorage.getItem('warmane_notifications');
        if (savedNotifications) setEnableNotifications(JSON.parse(savedNotifications));

        const savedSoundEffects = localStorage.getItem('relictum_sound_effects') || localStorage.getItem('warmane_sound_effects');
        if (savedSoundEffects) setEnableSoundEffects(JSON.parse(savedSoundEffects));

        const savedGlowEffects = localStorage.getItem('relictum_glow_effects') || localStorage.getItem('warmane_glow_effects');
        if (savedGlowEffects) setEnableGlowEffects(JSON.parse(savedGlowEffects));
    }, []);

    // Apply Theme
    useEffect(() => {
        const theme = themes[currentTheme];
        if (theme) {
            const root = document.documentElement;
            Object.entries(theme.colors).forEach(([key, value]) => {
                root.style.setProperty(key, value);
            });
            localStorage.setItem('relictum_theme', currentTheme);
        }
    }, [currentTheme]);

    // Handlers: Update state and persist to local storage
    const updateTheme = (themeId) => setCurrentTheme(themeId);
    
    const toggleAutoClose = () => {
        const newValue = !autoCloseLauncher;
        setAutoCloseLauncher(newValue);
        localStorage.setItem('relictum_auto_close', JSON.stringify(newValue));
    };

    const togglePlayMusic = () => {
        const newValue = !playMusicOnStartup;
        setPlayMusicOnStartup(newValue);
        localStorage.setItem('relictum_play_music_on_startup', JSON.stringify(newValue));
    };

    const toggleClearCache = () => {
        const newValue = !clearCacheOnLaunch;
        setClearCacheOnLaunch(newValue);
        localStorage.setItem('relictum_clear_cache', JSON.stringify(newValue));
    };

    const toggleNotifications = () => {
        const newValue = !enableNotifications;
        setEnableNotifications(newValue);
        localStorage.setItem('relictum_notifications', JSON.stringify(newValue));
    };

    const toggleSoundEffects = () => {
        const newValue = !enableSoundEffects;
        setEnableSoundEffects(newValue);
        localStorage.setItem('relictum_sound_effects', JSON.stringify(newValue));
    };

    const toggleGlowEffects = () => {
        const newValue = !enableGlowEffects;
        setEnableGlowEffects(newValue);
        localStorage.setItem('relictum_glow_effects', JSON.stringify(newValue));
    };

    const updateDefaultDownloadPath = (path) => {
        setDefaultDownloadPath(path);
        localStorage.setItem('relictum_default_download_path', path);
    };

    return {
        currentTheme,
        updateTheme,
        autoCloseLauncher,
        toggleAutoClose,
        playMusicOnStartup,
        togglePlayMusic,
        clearCacheOnLaunch,
        toggleClearCache,
        defaultDownloadPath,
        updateDefaultDownloadPath,
        enableNotifications,
        toggleNotifications,
        enableSoundEffects,
        toggleSoundEffects,
        enableGlowEffects,
        toggleGlowEffects
    };
};
