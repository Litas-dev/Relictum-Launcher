import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, ChevronDown, FolderOpen, X, Globe } from 'lucide-react';
import styles from './Settings.module.css';
import { themes } from '../../config/themes';

/**
 * Settings Component
 * Manages application preferences including launcher behavior, 
 * theming, and installation paths.
 */
const Settings = ({
  activeGame,
  autoCloseLauncher,
  toggleAutoClose,
  playMusicOnStartup,
  togglePlayMusicOnStartup,
  clearCacheOnLaunch,
  toggleClearCache,
  handleCleanCacheNow,
  currentTheme,
  setCurrentTheme,
  enableNotifications,
  toggleNotifications,
  enableSoundEffects,
  toggleSoundEffects,
  enableGlowEffects,
  toggleGlowEffects,
  defaultDownloadPath,
  handleSetDefaultPath,
  handleClearDefaultPath
}) => {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState('general');
  const [isThemeDropdownOpen, setIsThemeDropdownOpen] = useState(false);
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);

  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'ru', name: 'Русский', flag: '🇷🇺' },
    { code: 'pt', name: 'Português', flag: '🇧🇷' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' }
  ];

  const currentLanguage = languages.find(l => l.code === i18n.language) || languages[0];

  const renderContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <>
            <div className={styles.settingsSection}>
              <h3>{t('settings.general')}</h3>
              <div className={styles.toggleRow}>
                <div className={styles.toggleLabel}>
                  <span className={styles.toggleTitle}>{t('settings.language')}</span>
                  <span className={styles.toggleDesc}>{t('settings.language_desc')}</span>
                </div>
                <div className={styles.themeSelectorContainer}>
                  <div 
                    className={styles.themeSelectorTrigger}
                    onClick={() => setIsLanguageDropdownOpen(!isLanguageDropdownOpen)}
                  >
                    <div className={styles.themeSelectorLabel}>
                      <span style={{marginRight: '8px', fontSize: '1.2em'}}>{currentLanguage.flag}</span>
                      {currentLanguage.name}
                    </div>
                    <ChevronDown size={16} style={{transform: isLanguageDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s'}} />
                  </div>
                  
                  {isLanguageDropdownOpen && (
                    <div className={styles.themeSelectorDropdown}>
                      {languages.map(lang => (
                        <div 
                          key={lang.code} 
                          className={`${styles.themeOption} ${i18n.language === lang.code ? styles.selected : ''}`}
                          onClick={() => {
                            i18n.changeLanguage(lang.code);
                            setIsLanguageDropdownOpen(false);
                          }}
                        >
                          <span style={{marginRight: '8px', fontSize: '1.2em'}}>{lang.flag}</span>
                          {lang.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className={styles.settingsSection}>
              <h3>{t('settings.launcher_behavior')}</h3>
              <div className={styles.toggleRow}>
                <div className={styles.toggleLabel}>
                  <span className={styles.toggleTitle}>{t('settings.auto_close')}</span>
                  <span className={styles.toggleDesc}>{t('settings.auto_close_desc')}</span>
                </div>
                <label className={styles.toggleSwitch}>
                  <input 
                    type="checkbox" 
                    checked={autoCloseLauncher}
                    onChange={toggleAutoClose}
                  />
                  <span className={styles.slider}></span>
                </label>
              </div>
              <div className={styles.toggleRow}>
                <div className={styles.toggleLabel}>
                  <span className={styles.toggleTitle}>{t('settings.play_music')}</span>
                  <span className={styles.toggleDesc}>{t('settings.play_music_desc')}</span>
                </div>
                <label className={styles.toggleSwitch}>
                  <input 
                    type="checkbox" 
                    checked={playMusicOnStartup}
                    onChange={togglePlayMusicOnStartup}
                  />
                  <span className={styles.slider}></span>
                </label>
              </div>
            </div>
          </>
        );
      
      case 'appearance':
        return (
          <div className={styles.settingsSection}>
            <h3>{t('settings.appearance_tab')}</h3>
            <div className={styles.toggleRow}>
              <div className={styles.toggleLabel}>
                <span className={styles.toggleTitle}>{t('settings.app_theme')}</span>
                <span className={styles.toggleDesc}>{t('settings.app_theme_desc')}</span>
              </div>
              <div className={styles.themeSelectorContainer}>
                <div 
                  className={styles.themeSelectorTrigger}
                  onClick={() => setIsThemeDropdownOpen(!isThemeDropdownOpen)}
                >
                  <div className={styles.themeSelectorLabel}>
                    <span className={styles.themeColorPreview} style={{background: themes[currentTheme]?.colors['--primary-gold']}}></span>
                    {themes[currentTheme]?.name}
                  </div>
                  <ChevronDown size={16} style={{transform: isThemeDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s'}} />
                </div>
                
                {isThemeDropdownOpen && (
                  <div className={styles.themeSelectorDropdown}>
                    {Object.values(themes).map(theme => (
                      <div 
                        key={theme.id} 
                        className={`${styles.themeOption} ${currentTheme === theme.id ? styles.selected : ''}`}
                        onClick={() => {
                          setCurrentTheme(theme.id);
                          setIsThemeDropdownOpen(false);
                        }}
                      >
                        <span className={styles.themeColorPreview} style={{background: theme.colors['--primary-gold']}}></span>
                        {theme.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className={styles.toggleRow}>
              <div className={styles.toggleLabel}>
                <span className={styles.toggleTitle}>{t('settings.glow_effects')}</span>
                <span className={styles.toggleDesc}>{t('settings.glow_effects_desc')}</span>
              </div>
              <label className={styles.toggleSwitch}>
                <input 
                  type="checkbox" 
                  checked={enableGlowEffects}
                  onChange={toggleGlowEffects}
                />
                <span className={styles.slider}></span>
              </label>
            </div>
          </div>
        );

      case 'system':
        return (
          <>
            <div className={styles.settingsSection}>
              <h3>{t('settings.installation_paths')}</h3>
              <div className={styles.toggleRow}>
                <div className={styles.toggleLabel}>
                  <span className={styles.toggleTitle}>{t('settings.default_download_path')}</span>
                  <span className={styles.toggleDesc}>{t('settings.default_download_path_desc')}</span>
                </div>
                <div className={styles.pathControl}>
                  <div className={styles.pathDisplay} title={defaultDownloadPath || "No default path set"}>
                    {defaultDownloadPath || "No default path set"}
                  </div>
                  <div className={styles.pathButtons}>
                    <button 
                      className={styles.iconBtn}
                      onClick={handleSetDefaultPath}
                      title="Change Download Path"
                    >
                      <FolderOpen size={16} />
                    </button>
                    {defaultDownloadPath && (
                      <button 
                        className={styles.iconBtn}
                        onClick={handleClearDefaultPath}
                        title="Clear Default Path"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.settingsSection}>
              <h3>{t('settings.notifications_sound')}</h3>
              <div className={styles.toggleRow}>
                <div className={styles.toggleLabel}>
                  <span className={styles.toggleTitle}>{t('settings.notifications')}</span>
                  <span className={styles.toggleDesc}>{t('settings.notifications_desc')}</span>
                </div>
                <label className={styles.toggleSwitch}>
                  <input 
                    type="checkbox" 
                    checked={enableNotifications}
                    onChange={toggleNotifications}
                  />
                  <span className={styles.slider}></span>
                </label>
              </div>
              <div className={styles.toggleRow}>
                <div className={styles.toggleLabel}>
                  <span className={styles.toggleTitle}>{t('settings.sound_effects')}</span>
                  <span className={styles.toggleDesc}>{t('settings.sound_effects_desc')}</span>
                </div>
                <label className={styles.toggleSwitch}>
                  <input 
                    type="checkbox" 
                    checked={enableSoundEffects}
                    onChange={toggleSoundEffects}
                  />
                  <span className={styles.slider}></span>
                </label>
              </div>
            </div>
          </>
        );

      case 'advanced':
        return (
          <div className={styles.settingsSection}>
            <h3>{t('settings.cache_management')}</h3>
            <div className={styles.toggleRow}>
               <div className={styles.toggleLabel}>
                   <span className={styles.toggleTitle}>{t('settings.clear_cache')}</span>
                   <span className={styles.toggleDesc}>{t('settings.clear_cache_desc')}</span>
               </div>
               <div className={styles.cacheControlRow}>
                   <button 
                       className={styles.cleanCacheBtn} 
                       onClick={handleCleanCacheNow}
                       title={`Clear cache for ${activeGame ? activeGame.shortName : 'Game'}`}
                       disabled={!activeGame}
                   >
                       <Trash2 size={14} /> Clean Now
                   </button>
                   <label className={styles.toggleSwitch}>
                       <input 
                           type="checkbox" 
                           checked={clearCacheOnLaunch}
                           onChange={toggleClearCache}
                       />
                       <span className={styles.slider}></span>
                   </label>
               </div>
             </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className={styles.settingsView}>
      <h2>Settings</h2>
      
      <div className={styles.tabsContainer}>
        <div 
          className={`${styles.tab} ${activeTab === 'general' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('general')}
        >
          {t('settings.general')}
        </div>
        <div 
          className={`${styles.tab} ${activeTab === 'appearance' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('appearance')}
        >
          {t('settings.appearance_tab')}
        </div>
        <div 
          className={`${styles.tab} ${activeTab === 'system' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('system')}
        >
          {t('settings.system')}
        </div>
        <div 
          className={`${styles.tab} ${activeTab === 'advanced' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('advanced')}
        >
          {t('settings.advanced')}
        </div>
      </div>

      {renderContent()}
    </div>
  );
};

export default Settings;
