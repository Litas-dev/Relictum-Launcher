import React, { useState, useEffect, useRef } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { 
  Minus, Square, X, Play, Settings as SettingsIcon, Download, Users, Globe, 
  ChevronRight, XCircle, FolderSearch, RefreshCw, Puzzle, Trash2, Plus, 
  ExternalLink, MessageSquare, Music, ChevronDown, FolderOpen, Check, 
  Home, Layers, Zap, Info, Shield, AlertTriangle, CheckCircle 
} from 'lucide-react';

// Components
import Modal from './components/Modal';
import AddonsView from './components/AddonsView';
import Sidebar from './components/layout/Sidebar';
import TopBar from './components/layout/TopBar';
import Dashboard from './components/views/Dashboard';
import GameDetails from './components/views/GameDetails';
import Settings from './components/views/Settings';
import About from './components/views/About';
import ExtensionsView from './components/views/ExtensionsView'; // Import
import UpdateNotification from './components/UpdateNotification';
// SocialPanel removed from here as it is now a separate window

// Config & Utils
import { games } from './config/games';
import { themes } from './config/themes';
import ipcRenderer from './utils/ipc';
import { fetchWarperiaAddons } from './utils/addonUtils';
import ExtensionLoader from './utils/ExtensionLoader';
import ExtensionStore from './utils/ExtensionStore'; // Import Store

// Hooks
import { useGameLibrary } from './hooks/useGameLibrary';
import { useSettings } from './hooks/useSettings';
import { useDownloader } from './hooks/useDownloader';
import { useAddons } from './hooks/useAddons';
import { useUser } from './hooks/useUser';

// Assets
import wotlkTheme from './assets/music/wotlk-theme.mp3';

function App() {
  const { t } = useTranslation();
  // UI State
  const [activeView, setActiveView] = useState('dashboard'); // dashboard, game, addons, settings
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: '',
    body: null,
    footer: null
  });
  const [realmlistConfig, setRealmlistConfig] = useState({
    isOpen: false,
    content: 'set realmlist logon.example.com',
    gameId: null
  });
  const [savedRealmlists, setSavedRealmlists] = useState(['set realmlist logon.example.com']);
  const [isManageGamesOpen, setIsManageGamesOpen] = useState(false);
  const [customGameNames, setCustomGameNames] = useState({});
  const [renameConfig, setRenameConfig] = useState({
    isOpen: false,
    gameId: null,
    currentName: ''
  });
  
  // App Info State
  const [appVersion, setAppVersion] = useState('');
  const [updateInfo, setUpdateInfo] = useState(null);
  const [integrityStatus, setIntegrityStatus] = useState(null);
  const [integrityMessage, setIntegrityMessage] = useState('');
  const [integrityHash, setIntegrityHash] = useState(null);
  const [serverPing, setServerPing] = useState(null);

  // Music State
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const audioRef = useRef(null);
  const [musicUrl, setMusicUrl] = useState(wotlkTheme);
  const [customGames, setCustomGames] = useState([]);
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [hasSetDefaultView, setHasSetDefaultView] = useState(false);
  const lastNavRequestRef = useRef(null);
  const [hasSidebarOverride, setHasSidebarOverride] = useState(!!(ExtensionStore.getSidebarOverride && ExtensionStore.getSidebarOverride()));
  const [extensionInitDone, setExtensionInitDone] = useState(false);

  // Initialize Hooks
  const settings = useSettings();
  const gameLibrary = useGameLibrary();
  const user = useUser();

  // Effect: Subscribe to Extension Store (Music & Custom Games & Sidebar & Default View)
  useEffect(() => {
      try {
        const forceDash = localStorage.getItem('relictum_force_dashboard_on_reload') || localStorage.getItem('warmane_force_dashboard_on_reload');
        if (forceDash === '1') {
            setActiveView('dashboard');
            localStorage.removeItem('relictum_force_dashboard_on_reload');
            localStorage.removeItem('warmane_force_dashboard_on_reload');
        }
      } catch (_) {}
      const updateStore = () => {
          const override = ExtensionStore.getMusic();
          setMusicUrl(override || wotlkTheme);
          setCustomGames(ExtensionStore.getCustomGames());
          setIsSidebarVisible(ExtensionStore.getSidebarVisible());
          setHasSidebarOverride(!!(ExtensionStore.getSidebarOverride && ExtensionStore.getSidebarOverride()));
          
          // Check for default view override (only once per session or when changed)
          const defaultView = ExtensionStore.getDefaultView();
          if (defaultView && !hasSetDefaultView) {
              console.log("Applying Extension Default View:", defaultView);
              setActiveView(defaultView.view);
              if (defaultView.gameId) {
                  gameLibrary.setActiveGameId(defaultView.gameId);
              }
              setHasSetDefaultView(true);
          }

          // Check for Navigation Request
          const navRequest = ExtensionStore.getNavigationRequest();
          
          // If store was reset (navRequest is null), clear our ref so we are ready for next one
          if (!navRequest) {
              lastNavRequestRef.current = null;
          } else if (navRequest !== lastNavRequestRef.current) {
               console.log("Processing Extension Navigation:", navRequest);
               setActiveView(navRequest.view);
               if (navRequest.gameId) {
                   gameLibrary.setActiveGameId(navRequest.gameId);
               }
               lastNavRequestRef.current = navRequest;
          }
      };
      updateStore();
      return ExtensionStore.subscribe(updateStore);
  }, [hasSetDefaultView]); // Re-subscribe if hasSetDefaultView changes, but mainly relying on store notify

  // Effect: When music URL changes, if it was playing, keep playing
  useEffect(() => {
      if (audioRef.current && isMusicPlaying) {
          audioRef.current.play().catch(e => console.error("Playback failed", e));
      }
  }, [musicUrl]);

  // Modal Helpers
  const showModal = (title, body, footer = null) => {
    setModalConfig({ isOpen: true, title, body, footer });
  };

  const closeModal = () => {
    setModalConfig(prev => ({ ...prev, isOpen: false }));
  };

  // Derived State (Moved up for hooks)
  const allGames = [...games, ...customGames];
  const activeGame = allGames.find(g => g.id === gameLibrary.activeGameId) || games[0];

  // Effect: Notify extensions when active game changes
  useEffect(() => {
    ExtensionLoader.triggerGameChange(gameLibrary.activeGameId);
  }, [gameLibrary.activeGameId]);
  
  const downloader = useDownloader({
    activeGameId: gameLibrary.activeGameId,
    defaultDownloadPath: settings.defaultDownloadPath,
    enableNotifications: settings.enableNotifications,
    enableSoundEffects: settings.enableSoundEffects,
    savePath: gameLibrary.savePath,
    showModal,
    closeModal
  });

  const addons = useAddons({
    activeView,
    activeGame,
    activeGameId: gameLibrary.activeGameId,
    gamePaths: gameLibrary.gamePaths,
    selectedDownloadIndex: downloader.selectedDownloadIndex,
    showModal,
    closeModal
  });

  // Backup/restore of critical settings to persist across reinstall
  useEffect(() => {
    const KEY_PREFIXES = ['relictum_', 'warmane_', 'user_profile'];
    const collectData = () => {
      const data = {};
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (!k) continue;
          if (KEY_PREFIXES.some(p => k.startsWith(p))) {
            data[k] = localStorage.getItem(k);
          }
        }
      } catch (_) {}
      return data;
    };

    const restoreMissing = async () => {
      try {
        const res = await ipcRenderer.invoke('settings-read-backup');
        const backup = (res && res.success && res.data) ? res.data : {};
        Object.keys(backup || {}).forEach(k => {
          if (localStorage.getItem(k) === null) {
            localStorage.setItem(k, backup[k]);
          }
        });
      } catch (_) {}
    };

    const writeBackup = async () => {
      try {
        const payload = collectData();
        await ipcRenderer.invoke('settings-write-backup', payload);
      } catch (_) {}
    };

    restoreMissing();
    const interval = setInterval(writeBackup, 15000);
    return () => clearInterval(interval);
  }, []);

  // Effect: Handle background music playback and auto-play policies
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = 0.3;
      if (settings.playMusicOnStartup && !gameLibrary.isPlaying) {
        // Auto-play blocked by browsers usually, but works in Electron
        audioRef.current.play().then(() => setIsMusicPlaying(true)).catch(e => console.log("Auto-play blocked", e));
      }
    }
  }, [settings.playMusicOnStartup]);

  useEffect(() => {
    if (gameLibrary.isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsMusicPlaying(false);
    }
  }, [gameLibrary.isPlaying]);

  const toggleMusic = () => {
    if (audioRef.current) {
      if (isMusicPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsMusicPlaying(!isMusicPlaying);
    }
  };

  // Effect: Fetch application version, updates, and verify integrity on mount
  useEffect(() => {
    const fetchAppInfo = async () => {
      const version = await ipcRenderer.invoke('get-app-version');
      setAppVersion(version);

      const update = await ipcRenderer.invoke('check-for-updates');
      setUpdateInfo(update);

      const integrity = await ipcRenderer.invoke('verify-integrity');
      if (integrity) {
        setIntegrityStatus(integrity.status);
        setIntegrityMessage(integrity.message);
        setIntegrityHash(integrity.localHash);
      }
      
      // Simulate Ping
      setInterval(() => {
        setServerPing(Math.floor(Math.random() * 40) + 20);
      }, 5000);
    };

    fetchAppInfo();

    (async () => {
      try {
        await ExtensionLoader.init();
      } finally {
        setExtensionInitDone(true);
      }
    })();

    // Listen for Extension Toasts
    const handleExtensionToast = (e) => {
      console.log("Extension Toast Received:", e.detail);
    };

    window.addEventListener('extension-toast', handleExtensionToast);
    return () => window.removeEventListener('extension-toast', handleExtensionToast);
  }, []);

  // Realmlist Logic
  useEffect(() => {
    const saved = localStorage.getItem('relictum_saved_realmlists') || localStorage.getItem('warmane_saved_realmlists');
    if (saved) {
      setSavedRealmlists(JSON.parse(saved));
    }
    
    const savedNames = localStorage.getItem('relictum_custom_game_names') || localStorage.getItem('warmane_custom_game_names');
    if (savedNames) {
      setCustomGameNames(JSON.parse(savedNames));
    }
  }, []);

  const handleOpenRename = (gameId, currentName) => {
    setRenameConfig({
      isOpen: true,
      gameId,
      currentName
    });
  };

  const handleSaveRename = () => {
    if (!renameConfig.gameId) return;
    
    const newNames = {
      ...customGameNames,
      [renameConfig.gameId]: renameConfig.currentName
    };
    
    setCustomGameNames(newNames);
    localStorage.setItem('relictum_custom_game_names', JSON.stringify(newNames));
    setRenameConfig(prev => ({ ...prev, isOpen: false }));
  };

  const handleResetName = () => {
     if (!renameConfig.gameId) return;
     
     const newNames = { ...customGameNames };
     delete newNames[renameConfig.gameId];
     
     setCustomGameNames(newNames);
     localStorage.setItem('warmane_custom_game_names', JSON.stringify(newNames));
     setRenameConfig(prev => ({ ...prev, isOpen: false }));
  };

  const handleOpenRealmlist = async (gameId) => {
    const path = gameLibrary.gamePaths[gameId];
    if (!path) {
      showModal(t('modals.game_not_found'), t('modals.locate_first'), <button className="modal-btn-primary" onClick={closeModal}>{t('modals.ok')}</button>);
      return;
    }
    
    try {
      const result = await ipcRenderer.invoke('read-realmlist', { gamePath: path });
      if (result.success) {
        setRealmlistConfig({
          isOpen: true,
          content: result.content,
          gameId
        });
      } else {
        showModal(t('modals.error'), t('modals.realmlist_error_read'), <button className="modal-btn-primary" onClick={closeModal}>{t('modals.ok')}</button>);
      }
    } catch (e) {
      showModal(t('modals.error'), t('modals.realmlist_error_read') + ': ' + e.message, <button className="modal-btn-primary" onClick={closeModal}>{t('modals.ok')}</button>);
    }
  };

  const handleSaveRealmlist = async () => {
    try {
      const path = gameLibrary.gamePaths[realmlistConfig.gameId];
      const result = await ipcRenderer.invoke('update-realmlist', { gamePath: path, content: realmlistConfig.content });
      
      if (result.success) {
        // Save to history if unique
        if (!savedRealmlists.includes(realmlistConfig.content)) {
          const newHistory = [realmlistConfig.content, ...savedRealmlists].slice(0, 5);
          setSavedRealmlists(newHistory);
          localStorage.setItem('warmane_saved_realmlists', JSON.stringify(newHistory));
        }
        
        setRealmlistConfig(prev => ({ ...prev, isOpen: false }));
        showModal(t('modals.success'), t('modals.realmlist_success_update'), <button className="modal-btn-primary" onClick={closeModal}>{t('modals.ok')}</button>);
      } else {
        showModal(t('modals.error'), t('modals.realmlist_error_update'), <button className="modal-btn-primary" onClick={closeModal}>{t('modals.ok')}</button>);
      }
    } catch (e) {
      showModal(t('modals.error'), t('modals.realmlist_error_update') + ': ' + e.message, <button className="modal-btn-primary" onClick={closeModal}>{t('modals.ok')}</button>);
    }
  };

  const removeSavedRealmlist = (e, itemToRemove) => {
    e.stopPropagation();
    const newHistory = savedRealmlists.filter(item => item !== itemToRemove);
    setSavedRealmlists(newHistory);
    localStorage.setItem('relictum_saved_realmlists', JSON.stringify(newHistory));
  };

  // Handlers: Manage client visibility and default download path
  const toggleManageGames = () => setIsManageGamesOpen(!isManageGamesOpen);

  const handleBrowseDefaultPath = async () => {
    try {
      const path = await ipcRenderer.invoke('select-folder');
      if (path) {
        settings.updateDefaultDownloadPath(path);
      }
    } catch (e) {
      console.error("Failed to select folder:", e);
    }
  };

  const handleCleanCacheNow = async () => {
    const path = gameLibrary.gamePaths[gameLibrary.activeGameId];
    if (path) {
        try {
            await ipcRenderer.invoke('clear-game-cache', path);
            showModal(t('modals.success'), t('modals.cache_cleared'), <button className="modal-btn-primary" onClick={closeModal}>{t('modals.ok')}</button>);
        } catch (e) {
            showModal(t('modals.error'), t('modals.cache_error') + ': ' + e.message, <button className="modal-btn-primary" onClick={closeModal}>{t('modals.ok')}</button>);
        }
    } else {
        showModal(t('modals.error'), t('modals.locate_first'), <button className="modal-btn-primary" onClick={closeModal}>{t('modals.ok')}</button>);
    }
  };

  // Extension Page Content
  const [extensionPageContent, setExtensionPageContent] = useState(null);
  
  // Effect: Listen for extension realmlist requests
  useEffect(() => {
      const handleRealmlistRequest = (e) => {
          const { gameId } = e.detail;
          handleOpenRealmlist(gameId);
      };
      window.addEventListener('open-realmlist-modal', handleRealmlistRequest);
      return () => window.removeEventListener('open-realmlist-modal', handleRealmlistRequest);
  }, [gameLibrary.gamePaths]);

  // Effect: Listen for sidebar visibility changes from extensions
  useEffect(() => {
    const updateSidebarVisibility = () => {
        setIsSidebarVisible(ExtensionStore.getSidebarVisible());
    };
    updateSidebarVisibility(); // Initial check
    return ExtensionStore.subscribe(updateSidebarVisibility);
  }, []);

  useEffect(() => {
    const handleOpenAddonDetails = (e) => {
      try {
        const { addon, gameId } = e.detail || {};
        if (gameId) {
          gameLibrary.setActiveGameId(gameId);
        }
        setActiveView('addons');
        addons.setActiveAddonTab('browse');
        window.dispatchEvent(new CustomEvent('addons-open-details', { detail: { addon } }));
      } catch (_) {}
    };
    window.addEventListener('open-addon-details', handleOpenAddonDetails);
    return () => window.removeEventListener('open-addon-details', handleOpenAddonDetails);
  }, [addons, gameLibrary]);

  useEffect(() => {
    const updateContent = () => {
        if (activeView.startsWith('extension:')) {
            const pageId = activeView.split(':')[1];
            const content = ExtensionStore.getPage(pageId);
            setExtensionPageContent(content);
        } else {
            setExtensionPageContent(null);
        }
    };

    updateContent();
    return ExtensionStore.subscribe(updateContent);
  }, [activeView]);

  return (
    <div className="app-container">
      <audio ref={audioRef} src={musicUrl} loop />

      {/* Main Layout */}
      {isSidebarVisible && (
        (ExtensionStore.getSidebarOverride && ExtensionStore.getSidebarOverride()) ? (
          (() => {
            const CustomSidebar = ExtensionStore.getSidebarOverride();
            return (
              <CustomSidebar
                activeView={activeView}
                setActiveView={setActiveView}
                activeGameId={gameLibrary.activeGameId}
                setActiveGameId={gameLibrary.setActiveGameId}
                visibleGameIds={gameLibrary.visibleGameIds}
                onManageGames={toggleManageGames}
                onOpenAddons={() => setActiveView('addons')}
                integrityStatus={integrityStatus}
                isMusicPlaying={isMusicPlaying}
                enableGlowEffects={settings.enableGlowEffects}
                onToggleMusic={toggleMusic}
                appVersion={appVersion}
                updateInfo={updateInfo}
                customGameNames={customGameNames}
                onRenameGame={handleOpenRename}
              />
            );
          })()
        ) : (extensionInitDone && !hasSidebarOverride ? (
        <Sidebar 
          activeView={activeView}
          setActiveView={setActiveView}
          activeGameId={gameLibrary.activeGameId}
          setActiveGameId={gameLibrary.setActiveGameId}
          visibleGameIds={gameLibrary.visibleGameIds}
          onManageGames={toggleManageGames}
          onOpenAddons={() => setActiveView('addons')}
          integrityStatus={integrityStatus}
          isMusicPlaying={isMusicPlaying}
          enableGlowEffects={settings.enableGlowEffects}
          onToggleMusic={toggleMusic}
          appVersion={appVersion}
          updateInfo={updateInfo}
          customGameNames={customGameNames}
          onRenameGame={handleOpenRename}
        />) : null)
      )}

      <div className="main-content" style={!isSidebarVisible ? { width: '100%', left: 0 } : {}}>
        <TopBar 
          activeGame={activeGame}
          serverPing={serverPing}
          updateInfo={updateInfo}
          settings={settings}
          onMinimize={() => ipcRenderer.send('minimize-window')}
          onMaximize={() => ipcRenderer.send('maximize-window')}
          onClose={() => ipcRenderer.send('close-window')}
        />

        <div className="content-area">
          {activeView === 'dashboard' && (
            ((ExtensionStore.getDashboardOverride && ExtensionStore.getDashboardOverride()) || (typeof window !== 'undefined' && window.RelictumDashboardOverride)) ? (
              (() => {
                const CustomDashboard = (ExtensionStore.getDashboardOverride && ExtensionStore.getDashboardOverride()) || (typeof window !== 'undefined' && window.RelictumDashboardOverride);
                return (
                  <CustomDashboard
                    games={games}
                    activeGameId={gameLibrary.activeGameId}
                    setActiveGameId={gameLibrary.setActiveGameId}
                    setActiveView={setActiveView}
                    visibleGameIds={gameLibrary.visibleGameIds}
                    gamePaths={gameLibrary.gamePaths}
                    onLaunchGame={gameLibrary.launchGame}
                    onLocateGame={gameLibrary.handleLocateGame}
                    onGameSelect={(id) => {
                      gameLibrary.setActiveGameId(id);
                      setActiveView('game');
                    }}
                    onDownloadGame={() => {
                      setActiveView('game');
                    }}
                    isPlaying={gameLibrary.isPlaying}
                    downloadState={downloader.downloadState}
                    settings={settings}
                    user={user}
                    appVersion={appVersion}
                    updateInfo={updateInfo}
                    serverPing={serverPing}
                  />
                );
              })()
            ) : (!hasSidebarOverride ? (
              <Dashboard 
                games={games}
                activeGameId={gameLibrary.activeGameId}
                setActiveGameId={gameLibrary.setActiveGameId}
                visibleGameIds={gameLibrary.visibleGameIds}
                gamePaths={gameLibrary.gamePaths}
                onLaunchGame={gameLibrary.launchGame}
                onLocateGame={gameLibrary.handleLocateGame}
                onGameSelect={(id) => {
                  gameLibrary.setActiveGameId(id);
                  setActiveView('game');
                }}
                onDownloadGame={() => {
                  setActiveView('game');
                }}
                isPlaying={gameLibrary.isPlaying}
                downloadState={downloader.downloadState}
                settings={settings}
                user={user}
              />
            ) : null )
          )}

          {activeView === 'game' && (
            <GameDetails 
              activeGame={activeGame}
              activeGameId={gameLibrary.activeGameId}
              currentPath={gameLibrary.gamePaths[gameLibrary.activeGameId]}
              onPlay={() => gameLibrary.launchGame(gameLibrary.gamePaths[gameLibrary.activeGameId], { 
                clearCache: settings.clearCacheOnLaunch, 
                autoClose: settings.autoCloseLauncher 
              })}
              onLocateGame={gameLibrary.handleLocateGame}
              onForgetGame={gameLibrary.handleForgetGame}
              onConfigureRealmlist={() => handleOpenRealmlist(gameLibrary.activeGameId)}
              isPlaying={gameLibrary.isPlaying}
              enableGlowEffects={settings.enableGlowEffects}
            />
          )}

          {activeView === 'settings' && (
            <Settings 
              activeGame={activeGame}
              
              autoCloseLauncher={settings.autoCloseLauncher}
              toggleAutoClose={settings.toggleAutoClose}
              
              playMusicOnStartup={settings.playMusicOnStartup}
              togglePlayMusicOnStartup={settings.togglePlayMusic}
              
              clearCacheOnLaunch={settings.clearCacheOnLaunch}
              toggleClearCache={settings.toggleClearCache}
              handleCleanCacheNow={handleCleanCacheNow}
              
              currentTheme={settings.currentTheme}
              setCurrentTheme={settings.updateTheme}
              
              enableNotifications={settings.enableNotifications}
              toggleNotifications={settings.toggleNotifications}
              
              enableSoundEffects={settings.enableSoundEffects}
              toggleSoundEffects={settings.toggleSoundEffects}

              enableGlowEffects={settings.enableGlowEffects}
              toggleGlowEffects={settings.toggleGlowEffects}
              
              defaultDownloadPath={settings.defaultDownloadPath}
              handleSetDefaultPath={handleBrowseDefaultPath}
              handleClearDefaultPath={() => settings.updateDefaultDownloadPath('')}
              
              appVersion={appVersion}
              integrityStatus={integrityStatus}
              integrityHash={integrityHash}
            />
          )}

          {activeView === 'addons' && (
            <AddonsView 
              activeGame={activeGame}
              activeAddonTab={addons.activeAddonTab}
              setActiveAddonTab={addons.setActiveAddonTab}
              groupedAddons={addons.addonsList}
              loadingAddons={addons.loadingAddons}
              addonSearch={addons.addonSearch}
              setAddonSearch={addons.setAddonSearch}
              addonSort={addons.addonSort}
              setAddonSort={addons.setAddonSort}
              browseAddonsList={addons.browseAddonsList}
              installingAddon={addons.installingAddon}
              handleInstallAddon={() => { /* Manual install logic if needed */ }} 
              handleInstallWarperiaAddon={addons.handleInstallWarperiaAddon}
              handleDeleteAddon={addons.handleDeleteAddon}
              selectedVersion={activeGame.version}
              gameInstalled={!!gameLibrary.gamePaths[gameLibrary.activeGameId]}
            />
          )}

          {activeView === 'extensions-manager' && (
            <ExtensionsView />
          )}

          {activeView === 'about' && (
            <About 
              appVersion={appVersion}
              integrityStatus={integrityStatus}
              integrityHash={integrityHash}
            />
          )}

          {/* Extension View */}
          {activeView.startsWith('extension:') && (
            <div style={{ padding: '2rem', color: '#fff', height: '100%', overflowY: 'auto' }}>
                {extensionPageContent ? (
                    <div>
                        {/* DEBUG INFO */}
                        {/* <div style={{background: 'red', padding: '5px', marginBottom: '10px'}}>
                            DEBUG: Page Loaded. Length: {extensionPageContent.length}
                        </div> */}
                        <div dangerouslySetInnerHTML={{ __html: extensionPageContent }} />
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                        <h3>No content registered for this extension page.</h3>
                        <p style={{color: '#888'}}>Page ID: {activeView.split(':')[1]}</p>
                        <p style={{color: '#888'}}>Please try reloading the extensions or the application.</p>
                    </div>
                )}
            </div>
          )}
        </div>
      </div>
      
      {/* Modals */}
      <Modal 
        isOpen={modalConfig.isOpen} 
        onClose={closeModal} 
        title={modalConfig.title} 
        footer={modalConfig.footer}
      >
        {typeof modalConfig.body === 'string' ? <p>{modalConfig.body}</p> : modalConfig.body}
      </Modal>

      {/* Realmlist Modal */}
      <Modal
        isOpen={realmlistConfig.isOpen}
        onClose={() => setRealmlistConfig(prev => ({ ...prev, isOpen: false }))}
        title={`${t('modals.realmlist_title')} - ${activeGame.shortName}`}
        footer={
          <>
            <button className="modal-btn-secondary" onClick={() => setRealmlistConfig(prev => ({ ...prev, isOpen: false }))}>{t('modals.cancel')}</button>
            <button className="modal-btn-primary" onClick={handleSaveRealmlist}>{t('modals.save')}</button>
          </>
        }
      >
        <div className="realmlist-editor">
            <p className="realmlist-desc">
                <Trans i18nKey="modals.realmlist_desc" components={{ 1: <span className="highlight" /> }} />
            </p>
            
            <div className="quick-select">
                <label>{t('modals.quick_select')}</label>
                <div className="history-chips">
                    {savedRealmlists.map((item, idx) => (
                        <div key={idx} className="chip" onClick={() => setRealmlistConfig(prev => ({ ...prev, content: item }))}>
                            <span>{item}</span>
                            {idx > 0 && (
                                <X size={12} className="chip-remove" onClick={(e) => removeSavedRealmlist(e, item)} />
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <textarea 
                className="realmlist-textarea"
                value={realmlistConfig.content}
                onChange={(e) => setRealmlistConfig(prev => ({ ...prev, content: e.target.value }))}
                spellCheck={false}
            />
        </div>
      </Modal>

      {/* Manage Games Modal */}
      <Modal
        isOpen={isManageGamesOpen}
        onClose={() => setIsManageGamesOpen(false)}
        title={t('sidebar.manage_clients')}
        footer={
          <button className="modal-btn-primary" onClick={() => setIsManageGamesOpen(false)}>{t('modals.done')}</button>
        }
      >
        <div className="manage-games-intro">{t('about.manage_clients_desc')}</div>
        <div className="manage-games-list">
          {allGames.map(game => (
            <div key={game.id} className="game-row">
              <div className="game-info">
                <span className="game-name">{customGameNames[game.id] || game.menuLabel || game.version || game.shortName}</span>
              </div>
              <label className={`visibility-toggle ${gameLibrary.visibleGameIds?.includes?.(game.id) ? 'active' : ''}`}> 
                <input 
                  type="checkbox" 
                  checked={gameLibrary.visibleGameIds?.includes?.(game.id) || false} 
                  onChange={() => gameLibrary.toggleGameVisibility(game.id)}
                />
                <span className="slider"></span>
              </label>
            </div>
          ))}
        </div>
      </Modal>

      {/* Rename Game Modal */}
      <Modal
        isOpen={renameConfig.isOpen}
        onClose={() => setRenameConfig(prev => ({ ...prev, isOpen: false }))}
        title={t('modals.rename_client_title')}
        footer={
          <>
             <button className="modal-btn-secondary" onClick={handleResetName}>{t('modals.reset_default')}</button>
             <button className="modal-btn-primary" onClick={handleSaveRename}>{t('modals.save_name')}</button>
          </>
        }
      >
        <div className="rename-game-form">
           <p className="rename-desc">{t('modals.rename_desc')}</p>
           <input 
              type="text" 
              className="modal-input"
              value={renameConfig.currentName}
              onChange={(e) => setRenameConfig(prev => ({ ...prev, currentName: e.target.value }))}
              placeholder={t('modals.enter_name')}
              autoFocus
           />
        </div>
      </Modal>

      {/* Updater Notification */}
      <UpdateNotification />

    </div>
  );
}

export default App;
