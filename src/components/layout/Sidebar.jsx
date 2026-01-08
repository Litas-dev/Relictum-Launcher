import React from 'react';
import { useTranslation } from 'react-i18next';
import { Home, Layers, Plus, Puzzle, Settings, Info, AlertTriangle, Music, Download, Globe, Heart } from 'lucide-react';
import { games } from '../../config/games';
import azerothLogo from '../../assets/logo-new-white.png';
import styles from './Sidebar.module.css';

const DiscordIcon = ({ size = 16, className }) => (
    <svg 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="currentColor" 
        xmlns="http://www.w3.org/2000/svg"
        className={className}
    >
        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037 14.168 14.168 0 0 0-.64 1.321 18.293 18.293 0 0 0-7.426 0 14.218 14.218 0 0 0-.642-1.32.077.077 0 0 0-.079-.037 19.736 19.736 0 0 0-4.885 1.515.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.086 2.157 2.419 0 1.334-.956 2.419-2.157 2.419zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.086 2.157 2.419 0 1.334-.946 2.419-2.157 2.419z"/>
    </svg>
);

const Sidebar = ({
    activeView,
    setActiveView,
    activeGameId,
    setActiveGameId,
    visibleGameIds,
    onManageClients,
    onOpenAddons,
    integrityStatus,
    isMusicPlaying,
    onToggleMusic,
    appVersion,
    updateInfo,
    customGameNames = {},
    onRenameGame
}) => {
    const { t } = useTranslation();

    return (
        <div className={styles.sidebar}>
            <div className={styles.sidebarLogo}>
                <div className={styles.sidebarLogoGlow}>
                    <img src={azerothLogo} alt="WoW Launcher" />
                </div>
            </div>

            <div className={styles.navMenu}>
                <div className={styles.navLabel}>{t('sidebar.menu')}</div>
                <button 
                    className={`${styles.navItem} ${activeView === 'dashboard' ? styles.active : ''}`}
                    onClick={() => setActiveView('dashboard')}
                >
                    <Home size={18} /> {t('sidebar.dashboard')}
                </button>
                
                <div className={styles.navLabel}>{t('sidebar.clients')}</div>
                {games.filter(g => visibleGameIds.includes(g.id)).map(game => (
                    <div 
                        key={game.id}
                        className={`${styles.navItem} ${activeView === 'game' && activeGameId === game.id ? styles.active : ''}`}
                        onClick={() => {
                            setActiveGameId(game.id);
                            setActiveView('game');
                        }}
                        role="button"
                        tabIndex={0}
                    >
                        <Layers size={18} /> 
                        <span className={styles.gameName}>
                            {customGameNames[game.id] || game.menuLabel || game.version || game.shortName}
                        </span>
                        <button 
                            className={styles.renameBtn}
                            onClick={(e) => {
                                e.stopPropagation();
                                onRenameGame(game.id, customGameNames[game.id] || game.menuLabel || game.version || game.shortName);
                            }}
                            title={t('sidebar.rename')}
                        >
                            <Settings size={14} />
                        </button>
                    </div>
                ))}
                
                <button 
                    className={`${styles.navItem} ${styles.manageGamesBtn}`}
                    onClick={onManageClients}
                >
                    <Plus size={14} /> {t('sidebar.manage_clients')}
                </button>

                <div className={styles.navLabel}>{t('sidebar.tools')}</div>
                <button 
                    className={`${styles.navItem} ${activeView === 'addons' ? styles.active : ''}`}
                    onClick={onOpenAddons}
                >
                    <Puzzle size={18} /> {t('sidebar.addons')}
                </button>
                <button 
                    className={`${styles.navItem} ${activeView === 'settings' ? styles.active : ''}`}
                    onClick={() => setActiveView('settings')}
                >
                    <Settings size={18} /> {t('sidebar.settings')}
                </button>
                <button 
                    className={`${styles.navItem} ${activeView === 'about' ? styles.active : ''}`}
                    onClick={() => setActiveView('about')}
                >
                    <Info size={18} /> {t('sidebar.about')}
                    {integrityStatus === 'danger' && <AlertTriangle size={14} color="#ef4444" className={styles.dangerIcon} />}
                </button>
            </div>

            <div className={styles.sidebarFooter}>
                <button 
                    className={`${styles.musicToggle} ${isMusicPlaying ? styles.musicPlaying : ''}`} 
                    onClick={onToggleMusic} 
                    title={t('sidebar.toggle_music')}
                >
                    <Music size={16} />
                </button>

                <div className={styles.footerIconsMiddle}>
                    <button 
                        className={styles.discordBtn} 
                        onClick={() => {
                            const { shell } = window.require('electron');
                            shell.openExternal('https://discord.gg/relictum');
                        }}
                        title={t('sidebar.join_discord')}
                    >
                        <DiscordIcon size={16} />
                    </button>

                    <button 
                        className={styles.donationBtn} 
                        onClick={() => {
                            const { shell } = window.require('electron');
                            shell.openExternal('https://paypal.me/KostelioKlausimynas');
                        }}
                        title={t('topbar.support')}
                    >
                        <Heart size={16} fill="#ef4444" color="#ef4444" />
                    </button>

                    <a 
                        href="#" 
                        className={styles.websiteLink} 
                        onClick={(e) => {
                            e.preventDefault();
                            const { shell } = window.require('electron');
                            shell.openExternal('https://relictum.org/');
                        }}
                        title={t('sidebar.visit_website')}
                    >
                        <Globe size={16} />
                    </a>
                </div>

                <div className={styles.versionInfo}>
                    <span className={styles.versionText}>v{appVersion}</span>
                    {updateInfo && updateInfo.updateAvailable && (
                        <a href={updateInfo.url} target="_blank" rel="noreferrer" className={styles.updateBadge} title={t('sidebar.update_available')}>
                            <Download size={12} />
                        </a>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
