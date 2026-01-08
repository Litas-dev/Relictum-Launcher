import React, { useState, useEffect, useRef } from 'react';
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
import UpdateNotification from './components/UpdateNotification';
// SocialPanel removed from here as it is now a separate window

// Config & Utils
import { games } from './config/games';
import { themes } from './config/themes';
import ipcRenderer from './utils/ipc';
import { fetchWarperiaAddons } from './utils/addonUtils';

// Hooks
import { useGameLibrary } from './hooks/useGameLibrary';
import { useSettings } from './hooks/useSettings';
import { useDownloader } from './hooks/useDownloader';
import { useAddons } from './hooks/useAddons';
import { useUser } from './hooks/useUser';

// Assets
import wotlkTheme from './assets/music/wotlk-theme.mp3';

function App() {
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
    content: 'set realmlist logon.warmane.com',
    gameId: null
  });
  const [savedRealmlists, setSavedRealmlists] = useState(['set realmlist logon.warmane.com']);
  const [isManageClientsOpen, setIsManageClientsOpen] = useState(false);
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
  const WOTLK_THEME_URL = wotlkTheme;

  // Modal Helpers
  const showModal = (title, body, footer = null) => {
    setModalConfig({ isOpen: true, title, body, footer });
  };

  const closeModal = () => {
    setModalConfig(prev => ({ ...prev, isOpen: false }));
  };

  // Initialize Hooks
  const settings = useSettings();
  const gameLibrary = useGameLibrary();
  const user = useUser();
  
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
    activeGameId: gameLibrary.activeGameId,
    gamePaths: gameLibrary.gamePaths,
    selectedDownloadIndex: downloader.selectedDownloadIndex,
    showModal,
    closeModal
  });

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
  }, []);

  // Realmlist Logic
  useEffect(() => {
    const saved = localStorage.getItem('warmane_saved_realmlists');
    if (saved) {
      setSavedRealmlists(JSON.parse(saved));
    }
    
    const savedNames = localStorage.getItem('warmane_custom_game_names');
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
    localStorage.setItem('warmane_custom_game_names', JSON.stringify(newNames));
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
      showModal('Game Not Found', 'Please locate the game client first.', <button className="modal-btn-primary" onClick={closeModal}>OK</button>);
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
        showModal('Error', 'Could not read realmlist file.', <button className="modal-btn-primary" onClick={closeModal}>OK</button>);
      }
    } catch (e) {
      showModal('Error', 'Failed to read realmlist: ' + e.message, <button className="modal-btn-primary" onClick={closeModal}>OK</button>);
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
        showModal('Success', 'Realmlist updated successfully!', <button className="modal-btn-primary" onClick={closeModal}>OK</button>);
      } else {
        showModal('Error', 'Failed to update realmlist.', <button className="modal-btn-primary" onClick={closeModal}>OK</button>);
      }
    } catch (e) {
      showModal('Error', 'Failed to update realmlist: ' + e.message, <button className="modal-btn-primary" onClick={closeModal}>OK</button>);
    }
  };

  const removeSavedRealmlist = (e, itemToRemove) => {
    e.stopPropagation();
    const newHistory = savedRealmlists.filter(item => item !== itemToRemove);
    setSavedRealmlists(newHistory);
    localStorage.setItem('warmane_saved_realmlists', JSON.stringify(newHistory));
  };

  // Handlers: Manage client visibility and default download path
  const toggleManageClients = () => setIsManageClientsOpen(!isManageClientsOpen);

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
            showModal('Success', 'Cache cleared successfully!', <button className="modal-btn-primary" onClick={closeModal}>OK</button>);
        } catch (e) {
            showModal('Error', 'Failed to clear cache: ' + e.message, <button className="modal-btn-primary" onClick={closeModal}>OK</button>);
        }
    } else {
        showModal('Error', 'Game path not found. Please locate the game first.', <button className="modal-btn-primary" onClick={closeModal}>OK</button>);
    }
  };

  // Derived State
  const activeGame = games.find(g => g.id === gameLibrary.activeGameId);

  return (
    <div className="app-container">
      <audio ref={audioRef} src={WOTLK_THEME_URL} loop />

      {/* Main Layout */}
      <Sidebar 
        activeView={activeView}
        setActiveView={setActiveView}
        activeGameId={gameLibrary.activeGameId}
        setActiveGameId={gameLibrary.setActiveGameId}
        visibleGameIds={gameLibrary.visibleGameIds}
        onManageClients={toggleManageClients}
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

      <div className="main-content">
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
              
              // Settings Props Mapping
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

          {activeView === 'about' && (
            <About 
              appVersion={appVersion}
              integrityStatus={integrityStatus}
              integrityHash={integrityHash}
            />
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
        title={`Edit Realmlist - ${activeGame.shortName}`}
        footer={
          <>
            <button className="modal-btn-secondary" onClick={() => setRealmlistConfig(prev => ({ ...prev, isOpen: false }))}>Cancel</button>
            <button className="modal-btn-primary" onClick={handleSaveRealmlist}>Save Changes</button>
          </>
        }
      >
        <div className="realmlist-editor">
            <p className="realmlist-desc">
                The realmlist file tells the game which server to connect to. 
                For Warmane, it should be: <span className="highlight">set realmlist logon.warmane.com</span>
            </p>
            
            <div className="quick-select">
                <label>Quick Select / History:</label>
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

      {/* Manage Clients Modal */}
      <Modal
        isOpen={isManageClientsOpen}
        onClose={() => setIsManageClientsOpen(false)}
        title="Manage Clients"
        footer={
          <button className="modal-btn-primary" onClick={() => setIsManageClientsOpen(false)}>Done</button>
        }
      >
        <div className="manage-clients-intro">Select which expansions you want to see in the sidebar.</div>
        <div className="manage-clients-list">
          {games.map(game => (
            <div key={game.id} className="client-row">
              <div className="client-info">
                <span className="client-name">{customGameNames[game.id] || game.menuLabel || game.version || game.shortName}</span>
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
        title="Rename Client"
        footer={
          <>
             <button className="modal-btn-secondary" onClick={handleResetName}>Reset to Default</button>
             <button className="modal-btn-primary" onClick={handleSaveRename}>Save Name</button>
          </>
        }
      >
        <div className="rename-game-form">
           <p className="rename-desc">Enter a custom name for this client in the sidebar:</p>
           <input 
              type="text" 
              className="modal-input"
              value={renameConfig.currentName}
              onChange={(e) => setRenameConfig(prev => ({ ...prev, currentName: e.target.value }))}
              placeholder="Enter name..."
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
