import React, { useState, useEffect, useRef } from 'react';
import { Minus, Square, X, Play, Settings, Download, Users, Globe, ChevronRight, XCircle, FolderSearch, RefreshCw, Puzzle, Trash2, Plus, ExternalLink, MessageSquare, Music, ChevronDown, FolderOpen, Check, Home, Layers, Zap, Info, Shield, AlertTriangle, CheckCircle } from 'lucide-react';
import Modal from './components/Modal';
import AddonsView from './components/AddonsView';
import azerothLogo from './assets/azeroth_legacy_logo.png';
// import classicLogo from './assets/wow-classic-logo.png';
// import tbcLogo from './assets/wow-tbc-logo.png';
// import wotlkLogo from './assets/wow-wotlk-logo.png';
import classicArt from './assets/1.12.png';
import tbcArt from './assets/2.4.3.png';
import wotlkArt from './assets/3.3.5.png';
import wotlkTheme from './assets/music/wotlk-theme.mp3';
import tbcBg from './assets/tbc_bg_final.png';
import localAddons from './assets/addons.json';
import classicIco from './assets/wow-classic.ico';
import tbcIco from './assets/wow-tbc.ico';
import wotlkIco from './assets/wow-wotlk.ico';

// Remote logos to fix broken local files
const classicLogo = 'https://logos-world.net/wp-content/uploads/2021/02/World-of-Warcraft-Classic-Logo.png';
const tbcLogo = 'https://upload.wikimedia.org/wikipedia/en/8/82/WoW_Burning_Crusade_Logo.png';
const wotlkLogo = 'https://logos-world.net/wp-content/uploads/2021/02/World-of-Warcraft-Wrath-of-the-Lich-King-Logo.png';


// Safe IPC import for browser compatibility
let ipcRenderer = {
  on: () => {},
  send: () => {},
  invoke: async (channel) => {
    // Return mock data for browser preview


    if (channel === 'get-app-version') return '3.0.0-dev';
    if (channel === 'check-for-updates') return { updateAvailable: true, latestVersion: '1.0.1', url: '#' };
    if (channel === 'verify-integrity') return { status: 'secure', message: 'Protected by Developer (Preview)', localHash: 'BROWSER-PREVIEW-HASH' };
    if (channel === 'update-realmlist') return { success: true };
    if (channel === 'read-realmlist') return { success: true, content: 'set realmlist logon.warmane.com' };
    return null;
  },
  removeAllListeners: () => {}
};

try {
  if (window.require) {
    const electron = window.require('electron');
    ipcRenderer = electron.ipcRenderer;
  }
} catch (e) {
  console.log('Running in browser mode');
}

const games = [
  { 
    id: 'classic', 
    name: 'World of Warcraft Classic', 
    shortName: 'Classic',
    version: '1.12.1', 
    icon: classicLogo,
    clientIcon: classicIco,
    cardArt: classicArt,
    bg: 'https://images.alphacoders.com/109/1097880.jpg', // Classic BG
    magnet: 'http://cdn.twinstar-wow.com/WoW_Vanilla.zip'
  },
  { 
    id: 'tbc', 
    name: 'The Burning Crusade', 
    shortName: 'TBC',
    version: '2.5.2', 
    icon: tbcLogo,
    clientIcon: tbcIco,
    cardArt: tbcArt,
    bg: 'https://images.alphacoders.com/603/603505.jpg', // TBC BG (Illidan Clean)
    magnet: 'https://cdn.wowlibrary.com/clients/WoWClassicTBC_2.5.2_408920-multi-win.zip',
    downloads: [
            { label: '2.5.2', type: 'http', url: 'https://cdn.wowlibrary.com/clients/WoWClassicTBC_2.5.2_408920-multi-win.zip', version: '2.5.2' },
            { label: '2.4.3', type: 'http', url: 'https://cdn.wowlibrary.com/clients/TBC-2.4.3.8606-enGB-Repack.zip', version: '2.4.3' }
        ]
  },
  { 
    id: 'wotlk', 
    name: 'Wrath of the Lich King', 
    shortName: 'WotLK',
    version: '3.3.5a', 
    icon: wotlkLogo,
    clientIcon: wotlkIco,
    cardArt: wotlkArt,
    bg: 'https://images.alphacoders.com/694/69466.jpg', // WotLK BG
    magnet: 'magnet:?xt=urn:btih:5B65D1928A3025A820B45E6DB2451AAAABC5347C&dn=World%20of%20Warcraft%203.3.5a&tr=udp%3a%2f%2ftracker.openbittorrent.com%3a80%2fannounce&tr=udp%3a%2f%2ftracker.opentrackr.org%3a1337%2fannounce'
  }
];

const themes = {
    default: {
        id: 'default',
        name: 'Warmane Gold',
        colors: {
            '--primary-gold': '#cda558',
            '--primary-rgb': '205, 165, 88',
            '--text-gold': '#cda558'
        }
    },
    deathknight: {
        id: 'deathknight',
        name: 'Death Knight Blue',
        colors: {
            '--primary-gold': '#509ee3',
            '--primary-rgb': '80, 158, 227',
            '--text-gold': '#509ee3'
        }
    },
    felgreen: {
        id: 'felgreen',
        name: 'Fel Green',
        colors: {
            '--primary-gold': '#bef202',
            '--primary-rgb': '190, 242, 2',
            '--text-gold': '#bef202'
        }
    }
};

function App() {
  const [activeView, setActiveView] = useState('dashboard'); // dashboard, game, addons, settings
  const [activeGameId, setActiveGameId] = useState('wotlk'); // Default to WotLK
  const [currentTheme, setCurrentTheme] = useState('default');
  const [isThemeDropdownOpen, setIsThemeDropdownOpen] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('warmane_theme');
    if (savedTheme && themes[savedTheme]) {
        setCurrentTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    const theme = themes[currentTheme];
    if (theme) {
        const root = document.documentElement;
        Object.entries(theme.colors).forEach(([key, value]) => {
            root.style.setProperty(key, value);
        });
        localStorage.setItem('warmane_theme', currentTheme);
    }
  }, [currentTheme]);

  const [isPlaying, setIsPlaying] = useState(false);
  const [gamePaths, setGamePaths] = useState({});
  const [downloadState, setDownloadState] = useState({
      isDownloading: false,
      gameId: null, // Track which game is downloading
      progress: 0,
      speed: 0,
      downloaded: 0,
      total: 0,
      peers: 0,
      statusMessage: ''
  });

  const [addonsList, setAddonsList] = useState([]);
  const [allWarperiaAddons, setAllWarperiaAddons] = useState([]);
  const [browseAddonsList, setBrowseAddonsList] = useState(localAddons.slice(0, 50));
  const [activeAddonTab, setActiveAddonTab] = useState('installed');
  const [installingAddon, setInstallingAddon] = useState(null);
  const [loadingAddons, setLoadingAddons] = useState(false);
  const [appVersion, setAppVersion] = useState('');
  const [updateInfo, setUpdateInfo] = useState(null);
  const [integrityStatus, setIntegrityStatus] = useState(null);
  const [integrityMessage, setIntegrityMessage] = useState('');
  const [integrityHash, setIntegrityHash] = useState(null);
  const [serverPing, setServerPing] = useState(null);
  const [autoCloseLauncher, setAutoCloseLauncher] = useState(false);
  const [playMusicOnStartup, setPlayMusicOnStartup] = useState(false);
  const [clearCacheOnLaunch, setClearCacheOnLaunch] = useState(false);
  const [defaultDownloadPath, setDefaultDownloadPath] = useState('');
  const [enableNotifications, setEnableNotifications] = useState(true);
  const [enableSoundEffects, setEnableSoundEffects] = useState(true);
  const [selectedDownloadIndex, setSelectedDownloadIndex] = useState(0);

  // Visible Games State (Favorites)
  const [visibleGameIds, setVisibleGameIds] = useState(games.map(g => g.id));

  // Load visible games from local storage
  useEffect(() => {
      const savedVisibleGames = localStorage.getItem('warmane_visible_games');
      if (savedVisibleGames) {
          setVisibleGameIds(JSON.parse(savedVisibleGames));
      }
  }, []);

  // Save visible games to local storage
  useEffect(() => {
      localStorage.setItem('warmane_visible_games', JSON.stringify(visibleGameIds));
  }, [visibleGameIds]);

  const toggleGameVisibility = (gameId) => {
      setVisibleGameIds(prev => {
          if (prev.includes(gameId)) {
              if (prev.length <= 1) return prev;
              if (gameId === activeGameId) {
                  const nextGame = prev.find(id => id !== gameId);
                  if (nextGame) setActiveGameId(nextGame);
              }
              return prev.filter(id => id !== gameId);
          } else {
              return [...prev, gameId];
          }
      });
  };

  // Reset selected download when game changes
  useEffect(() => {
      setSelectedDownloadIndex(0);
  }, [activeGameId]);
  
  // Music Player State
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const audioRef = React.useRef(null);
  const WOTLK_THEME_URL = wotlkTheme;
  
  // Track which game is downloading independent of active view
  const downloadingGameIdRef = useRef(null);

  // Addon Browser State
  const [addonSearch, setAddonSearch] = useState('');
  const [addonSort, setAddonSort] = useState('popular');
  const [addonPage, setAddonPage] = useState(1);
  const [filteredAddonCount, setFilteredAddonCount] = useState(localAddons.length);
  const itemsPerPage = 10;

  // Realmlist Configuration State
  const [realmlistConfig, setRealmlistConfig] = useState({
      isOpen: false,
      content: 'set realmlist logon.warmane.com',
      gameId: null
  });

  // Saved Realmlists History
  const [savedRealmlists, setSavedRealmlists] = useState(['set realmlist logon.warmane.com']);

  // Load saved realmlists from local storage
  useEffect(() => {
      const saved = localStorage.getItem('warmane_saved_realmlists');
      if (saved) {
          setSavedRealmlists(JSON.parse(saved));
      }
  }, []);

  const removeSavedRealmlist = (e, itemToRemove) => {
      e.stopPropagation();
      const newHistory = savedRealmlists.filter(item => item !== itemToRemove);
      setSavedRealmlists(newHistory);
      localStorage.setItem('warmane_saved_realmlists', JSON.stringify(newHistory));
  };

  const [isManageClientsOpen, setIsManageClientsOpen] = useState(false);

  const [modalConfig, setModalConfig] = useState({
      isOpen: false,
      title: '',
      body: null,
      footer: null
  });

  const showModal = (title, body, footer = null) => {
      setModalConfig({ isOpen: true, title, body, footer });
  };

  const closeModal = () => {
      setModalConfig(prev => ({ ...prev, isOpen: false }));
  };

  const playNotificationSound = () => {
      try {
          const ctx = new (window.AudioContext || window.webkitAudioContext)();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.type = 'sine';
          osc.frequency.setValueAtTime(500, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(1000, ctx.currentTime + 0.1);
          
          gain.gain.setValueAtTime(0.1, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.5);
      } catch (e) {
          console.error("AudioContext error:", e);
      }
  };

  const activeGame = games.find(g => g.id === activeGameId) || games[2];

  // Stop music when game launches
  useEffect(() => {
      if (isPlaying && audioRef.current) {
          audioRef.current.pause();
          setIsMusicPlaying(false);
      }
  }, [isPlaying]);

  // Listen for game events
  useEffect(() => {
      const handleGameClosed = () => {
          setIsPlaying(false);
      };

      const handleGameLaunchError = (event, message) => {
          setIsPlaying(false);
          showModal('Launch Error', message, <button className="modal-btn-primary" onClick={closeModal}>OK</button>);
      };

      const handleDownloadProgress = (event, data) => {
          setDownloadState(prev => ({
              ...prev,
              isDownloading: true,
              ...data
          }));
      };

      const handleDownloadStatus = (event, message) => {
          setDownloadState(prev => ({
              ...prev,
              statusMessage: message
          }));
      };

      const handleDownloadComplete = (event, { path }) => {
          setDownloadState(prev => ({ ...prev, isDownloading: false, progress: 1, statusMessage: '' }));
          
          // Use the ref to get the correct game ID that started the download
          const targetGameId = downloadingGameIdRef.current || activeGameId;
          savePath(targetGameId, path);
          downloadingGameIdRef.current = null;
          
          if (enableSoundEffects) {
              playNotificationSound();
          }

          if (enableNotifications) {
              // Check permission first
              if (Notification.permission === "granted") {
                  new Notification('Download Complete', {
                      body: 'World of Warcraft is ready to play!',
                      icon: azerothLogo
                  });
              } else if (Notification.permission !== "denied") {
                  Notification.requestPermission().then(permission => {
                      if (permission === "granted") {
                          new Notification('Download Complete', {
                              body: 'World of Warcraft is ready to play!',
                              icon: azerothLogo
                          });
                      }
                  });
              }
          }

          showModal('Download Complete', "Download Complete! You can now play.", <button className="modal-btn-primary" onClick={closeModal}>OK</button>);
      };

      const handleDownloadCancelled = () => {
          downloadingGameIdRef.current = null;
          setDownloadState({
              isDownloading: false,
              progress: 0,
              speed: 0,
              downloaded: 0,
              total: 0,
              peers: 0,
              statusMessage: ''
          });
      };

      ipcRenderer.on('game-closed', handleGameClosed);
      ipcRenderer.on('game-launch-error', handleGameLaunchError);
      ipcRenderer.on('download-progress', handleDownloadProgress);
      ipcRenderer.on('download-status', handleDownloadStatus);
      ipcRenderer.on('download-complete', handleDownloadComplete);
      ipcRenderer.on('download-cancelled', handleDownloadCancelled);

      return () => {
          if (ipcRenderer.removeListener) {
              ipcRenderer.removeListener('game-closed', handleGameClosed);
              ipcRenderer.removeListener('game-launch-error', handleGameLaunchError);
              ipcRenderer.removeListener('download-progress', handleDownloadProgress);
              ipcRenderer.removeListener('download-status', handleDownloadStatus);
              ipcRenderer.removeListener('download-complete', handleDownloadComplete);
              ipcRenderer.removeListener('download-cancelled', handleDownloadCancelled);
          }
      };
  }, [activeGameId, enableNotifications, enableSoundEffects]);

  // Initial Data Fetch
  useEffect(() => {
    // Load saved paths
    const savedPaths = localStorage.getItem('warmane_game_paths');
    if (savedPaths) {
        setGamePaths(JSON.parse(savedPaths));
    }

    const savedAutoClose = localStorage.getItem('warmane_auto_close');
    if (savedAutoClose) {
        setAutoCloseLauncher(JSON.parse(savedAutoClose));
    }

    const savedNotifications = localStorage.getItem('warmane_notifications');
    if (savedNotifications) {
        setEnableNotifications(JSON.parse(savedNotifications));
    }

    const savedSoundEffects = localStorage.getItem('warmane_sound_effects');
    if (savedSoundEffects) {
        setEnableSoundEffects(JSON.parse(savedSoundEffects));
    }

    const savedPlayMusicOnStartup = localStorage.getItem('warmane_play_music_on_startup');
    if (savedPlayMusicOnStartup) {
        const shouldPlay = JSON.parse(savedPlayMusicOnStartup);
        setPlayMusicOnStartup(shouldPlay);
        if (shouldPlay) {
            // We need to wait for user interaction usually, but in Electron we might be able to autoplay.
            // However, browsers block autoplay. Let's try.
            // Since this is useEffect [], audioRef might be ready.
            setTimeout(() => {
                if (audioRef.current) {
                    audioRef.current.volume = 0.3;
                    const playPromise = audioRef.current.play();
                    if (playPromise !== undefined) {
                        playPromise.then(() => {
                            setIsMusicPlaying(true);
                        }).catch(error => {
                            console.log("Autoplay prevented:", error);
                        });
                    }
                }
            }, 1000);
        }
    }

    const savedClearCache = localStorage.getItem('warmane_clear_cache');
    if (savedClearCache) {
        setClearCacheOnLaunch(JSON.parse(savedClearCache));
    }

    const savedDefaultPath = localStorage.getItem('warmane_default_download_path');
    if (savedDefaultPath) {
        setDefaultDownloadPath(savedDefaultPath);
    }

    const fetchData = async () => {
        try {


            const ping = await ipcRenderer.invoke('measure-latency');
            setServerPing(ping);



            // Fetch Version and Check for Updates
            const ver = await ipcRenderer.invoke('get-app-version');
            setAppVersion(ver);
            
            const update = await ipcRenderer.invoke('check-for-updates');
            if (update && update.updateAvailable) {
                setUpdateInfo(update);
            }

            // Integrity Check
            try {
                const integrityPromise = ipcRenderer.invoke('verify-integrity');
                const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve({ status: 'warning', message: 'Verification timed out' }), 5000));
                
                const integrity = await Promise.race([integrityPromise, timeoutPromise]);
                
                if (integrity) {
                    setIntegrityStatus(integrity.status);
                    setIntegrityMessage(integrity.message);
                    setIntegrityHash(integrity.localHash);
                } else {
                     setIntegrityStatus('warning');
                     setIntegrityMessage('Verification returned no data');
                }
            } catch (err) {
                console.error("Integrity check error:", err);
                setIntegrityStatus('warning');
                setIntegrityMessage('Verification failed (Connection Error)');
            }
        } catch (error) {
            console.error("Error fetching initial data:", error);
        }
    };

    fetchData();
    const interval = setInterval(fetchData, 1800000); // Refresh every 30 minutes
    return () => clearInterval(interval);
  }, []);

  // Fetch Warperia Addons dynamically
  useEffect(() => {
      if (activeView === 'addons') {
          // If TBC (2.5.2), do not fetch addons as requested
          const selectedVersion = activeGame.downloads && activeGame.downloads[selectedDownloadIndex] 
              ? activeGame.downloads[selectedDownloadIndex].version 
              : activeGame.version;

          if (activeGameId === 'tbc' && selectedVersion === '2.5.2') {
              setAllWarperiaAddons([]);
              setLoadingAddons(false);
              return;
          }

          const fetchWarperia = async () => {
              setLoadingAddons(true);
              const wotlkLocal = localAddons.map(a => ({ ...a, gameVersion: '3.3.5' }));
              
              try {
                  // If WotLK, use local cache first for immediate display
                  if (activeGameId === 'wotlk' && allWarperiaAddons.length === 0) {
                      setAllWarperiaAddons(wotlkLocal);
                  }
                  
                  const addons = await ipcRenderer.invoke('fetch-warperia-addons', activeGameId);
                  if (addons && addons.length > 0) {
                      setAllWarperiaAddons(addons);
                  } else if (activeGameId === 'wotlk') {
                      // Fallback to local if fetch fails/empty for WotLK
                      setAllWarperiaAddons(wotlkLocal);
                  } else {
                      setAllWarperiaAddons([]);
                  }
              } catch (error) {
                  console.error("Error fetching Warperia addons:", error);
                  if (activeGameId === 'wotlk') {
                      setAllWarperiaAddons(wotlkLocal);
                  } else {
                      setAllWarperiaAddons([]);
                  }
              } finally {
                  setLoadingAddons(false);
              }
          };
          
          fetchWarperia();
      }
  }, [activeView, activeGameId, selectedDownloadIndex]);

  // Filter addons for browse tab
  useEffect(() => {
    if (activeView === 'addons' && activeAddonTab === 'browse') {
        const wotlkLocal = localAddons.map(a => ({ ...a, gameVersion: '3.3.5' }));
        const source = allWarperiaAddons.length > 0 ? allWarperiaAddons : (activeGameId === 'wotlk' ? wotlkLocal : []);
        
        let filtered = source.filter(addon => 
            addon.title.toLowerCase().includes(addonSearch.toLowerCase()) || 
            addon.description.toLowerCase().includes(addonSearch.toLowerCase())
        );
        
        // Sorting Logic
        if (addonSort === 'a-z') {
            filtered.sort((a, b) => a.title.localeCompare(b.title));
        } else if (addonSort === 'z-a') {
            filtered.sort((a, b) => b.title.localeCompare(a.title));
        } else if (addonSort === 'newest') {
            const getDateVal = (url) => {
                if (!url) return 0;
                const match = url.match(/\/(\d{4})\/(\d{2})\//);
            return match ? parseInt(match[1]) * 100 + parseInt(match[2]) : 0;
        };
        filtered.sort((a, b) => getDateVal(b.image) - getDateVal(a.image));
    }
    // 'popular' keeps original order (default from JSON)
        
        setFilteredAddonCount(filtered.length);
        
        const start = (addonPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        setBrowseAddonsList(filtered.slice(start, end));
    }
  }, [activeView, activeAddonTab, addonSearch, addonSort, addonPage, allWarperiaAddons, activeGameId]);

  const handleInstallWarperiaAddon = async (addon) => {
      if (installingAddon) return;
      
      const path = gamePaths[activeGameId];
      if (!path) {
          showModal('Missing Game Path', "Please locate your World of Warcraft game folder first using the 'Locate Installed Game' button.", <button className="modal-btn-primary" onClick={closeModal}>OK</button>);
          return;
      }

      setInstallingAddon(addon.title);
      
      try {
          const promise = ipcRenderer.invoke('install-warperia-addon', { 
              gamePath: path, 
              detailUrl: addon.detailUrl,
              expansion: activeGameId
          });
          
          const timeout = new Promise((_, reject) => 
              setTimeout(() => reject(new Error("Installation timed out. Please check your internet connection.")), 60000)
          );

          const result = await Promise.race([promise, timeout]);
          
          if (result.success) {
              showModal('Success', `Successfully installed ${addon.title}!`, <button className="modal-btn-primary" onClick={closeModal}>OK</button>);
              const addons = await ipcRenderer.invoke('get-addons', path);
              setAddonsList(addons);
          } else {
              showModal('Installation Failed', `Failed to install ${addon.title}: ${result.message}`, <button className="modal-btn-primary" onClick={closeModal}>OK</button>);
          }
      } catch (error) {
          showModal('Error', `Error installing ${addon.title}: ${error.message}`, <button className="modal-btn-primary" onClick={closeModal}>OK</button>);
      } finally {
          setInstallingAddon(null);
      }
  };

  const savePath = (gameId, path) => {
      const newPaths = { ...gamePaths, [gameId]: path };
      setGamePaths(newPaths);
      localStorage.setItem('warmane_game_paths', JSON.stringify(newPaths));
  };

  const toggleAutoClose = () => {
      const newValue = !autoCloseLauncher;
      setAutoCloseLauncher(newValue);
      localStorage.setItem('warmane_auto_close', JSON.stringify(newValue));
  };

  const handleMinimize = () => ipcRenderer.send('minimize-window');
  const handleMaximize = () => ipcRenderer.send('maximize-window');
  const handleClose = () => ipcRenderer.send('close-window');

  const handleLocateGame = async () => {
    const path = await ipcRenderer.invoke('select-game-path');
    if (path) {
        savePath(activeGameId, path);
    }
  };

  const handleForgetGame = () => {
      const newPaths = { ...gamePaths };
      delete newPaths[activeGameId];
      setGamePaths(newPaths);
      localStorage.setItem('warmane_game_paths', JSON.stringify(newPaths));
  };

  const handleDownload = async () => {
      if (downloadState.isDownloading) {
          showModal('Download in Progress', 'Please wait for the current download to finish before starting another.', <button className="modal-btn-primary" onClick={closeModal}>OK</button>);
          return;
      }
      
      try {
          let installPath = defaultDownloadPath;
          if (!installPath) {
              installPath = await ipcRenderer.invoke('select-directory');
          }
          if (!installPath) return;

          // Set the gameId in state immediately
          setDownloadState(prev => ({
              ...prev,
              isDownloading: true,
              gameId: activeGameId
          }));
          
          // Track the game ID in ref for event handlers
          downloadingGameIdRef.current = activeGameId;

          const downloadSource = activeGame.downloads ? activeGame.downloads[selectedDownloadIndex].url : activeGame.magnet;

          const result = await ipcRenderer.invoke('start-download', { 
              magnetURI: downloadSource, 
              downloadPath: installPath 
          });

          if (!result.success && result.message) {
              setDownloadState(prev => ({ ...prev, isDownloading: false, gameId: null }));
              downloadingGameIdRef.current = null;
              showModal('Download Failed', result.message, <button className="modal-btn-primary" onClick={closeModal}>OK</button>);
          }
      } catch (error) {
          setDownloadState(prev => ({ ...prev, isDownloading: false, gameId: null }));
          downloadingGameIdRef.current = null;
          console.error("Download error:", error);
          showModal('Download Error', "Failed to start download: " + error.message, <button className="modal-btn-primary" onClick={closeModal}>OK</button>);
      }
  };

  const handleCancelDownload = () => {
      ipcRenderer.send('cancel-download');
  };

  const launchGame = async (path) => {
    setIsPlaying(true);
    
    if (clearCacheOnLaunch) {
        try {
            await ipcRenderer.invoke('clear-game-cache', path);
        } catch (e) {
            console.error("Failed to clear cache:", e);
        }
    }

    setTimeout(() => {
      ipcRenderer.send('launch-game', path);
      if (autoCloseLauncher) {
          setTimeout(() => ipcRenderer.send('close-window'), 2000);
      }
    }, 1000);
  };

  const handleRealmlistSave = async () => {
      const { gameId, content } = realmlistConfig;
      const path = gamePaths[gameId];
      
      if (!path) {
          showModal('Error', 'Game path is missing.');
          return;
      }

      try {
          // Save realmlist via IPC
          const result = await ipcRenderer.invoke('update-realmlist', { gamePath: path, content });
          
          if (!result.success) {
              console.error("Realmlist update failed:", result.message);
              showModal('Configuration Error', `Failed to update realmlist: ${result.message || 'Unknown error'}. \n\nYou may need to run the launcher as Administrator.`, <button className="modal-btn-primary" onClick={closeModal}>OK</button>);
              return;
          }
          
          // Mark as configured
          localStorage.setItem(`realmlist_configured_${gameId}`, 'true');

          // Save to history if not exists
          if (content && !savedRealmlists.includes(content)) {
              const newHistory = [...savedRealmlists, content];
              setSavedRealmlists(newHistory);
              localStorage.setItem('warmane_saved_realmlists', JSON.stringify(newHistory));
          }
          
          // Close modal
          setRealmlistConfig(prev => ({ ...prev, isOpen: false }));
          
          // Launch the game (Only if not just configuring)
          // We can check if this was triggered by "Play" or explicit config.
          // For now, if we are in this function, we just save. 
          // But wait, the original logic launched the game.
          // If the user clicked the "Realmlist" button, they might not want to launch immediately.
          // However, keeping it simple: The modal says "Save & Play" currently.
          // I should probably change the modal button text or logic depending on context.
          // But for now, let's keep it as is, or maybe checking if isPlaying is false?
          // Actually, let's just NOT launch the game if it was opened via the new button.
          // I can add a flag to realmlistConfig: 'launchOnSave'
          
          if (realmlistConfig.launchOnSave) {
             launchGame(path);
          } else {
             showModal('Success', 'Realmlist updated successfully!', <button className="modal-btn-primary" onClick={closeModal}>OK</button>);
          }

      } catch (error) {
          console.error("Realmlist save error:", error);
          showModal('Error', `An unexpected error occurred: ${error.message}`, <button className="modal-btn-primary" onClick={closeModal}>OK</button>);
      }
  };

  const handleConfigureRealmlist = async () => {
      const path = gamePaths[activeGameId];
      if (!path) return;

      let currentContent = 'set realmlist logon.warmane.com';
      
      try {
          const result = await ipcRenderer.invoke('read-realmlist', { gamePath: path });
          if (result.success && result.content) {
              currentContent = result.content;
          }
      } catch (e) {
          console.error("Failed to read realmlist", e);
      }

      setRealmlistConfig({
          isOpen: true,
          content: currentContent,
          gameId: activeGameId,
          launchOnSave: false // Don't launch after simple edit
      });
  };

  const handlePlay = () => {
    const path = gamePaths[activeGameId];
    if (!path) {
        handleLocateGame();
        return;
    }

    // Check if realmlist is configured for this game
    const isConfigured = localStorage.getItem(`realmlist_configured_${activeGameId}`);
    
    if (!isConfigured) {
        setRealmlistConfig({
            isOpen: true,
            content: 'set realmlist logon.warmane.com',
            gameId: activeGameId,
            launchOnSave: true
        });
        return;
    }

    launchGame(path);
  };

  const handleOpenAddons = async () => {
      setActiveView('addons');
      const path = gamePaths[activeGameId];
      if (!path) {
          setAddonsList([]);
          return;
      }
      setLoadingAddons(true);
      const addons = await ipcRenderer.invoke('get-addons', path);
      setAddonsList(addons);
      setLoadingAddons(false);
  };

  const handleDeleteAddon = async (names) => {
      const targets = Array.isArray(names) ? names : [names];
      const count = targets.length;
      const msg = count > 1 
        ? `Are you sure you want to delete ${count} addons/modules?` 
        : `Are you sure you want to delete ${targets[0]}?`;

      const confirmDelete = async () => {
          closeModal();
          const path = gamePaths[activeGameId];
          
          for (const target of targets) {
              try {
                  await ipcRenderer.invoke('delete-addon', { gamePath: path, addonName: target });
              } catch (e) {
                  console.error(`Failed to delete ${target}:`, e);
              }
          }
          
          const addons = await ipcRenderer.invoke('get-addons', path);
          setAddonsList(addons);
      };

      showModal('Confirm Delete', msg, (
          <>
              <button className="modal-btn-secondary" onClick={closeModal}>Cancel</button>
              <button className="modal-btn-danger" onClick={confirmDelete}>Delete</button>
          </>
      ));
  };

  const groupAddons = (list) => {
      if (!list || list.length === 0) return [];

      let items = list.map(item => {
          if (typeof item === 'string') return { folderName: item, title: item };
          return item;
      }).sort((a, b) => a.folderName.length - b.folderName.length);

      const groups = {};
      const processed = new Set();

      // Pass 1: Parent-Child (e.g. "Recount" -> "Recount_Modes")
      items.forEach(item => {
          if (processed.has(item.folderName)) return;

          const children = items.filter(other => 
              other.folderName !== item.folderName && 
              !processed.has(other.folderName) &&
              (other.folderName.startsWith(item.folderName + '_') || other.folderName.startsWith(item.folderName + '-'))
          );

          if (children.length > 0) {
              groups[item.folderName] = { ...item, modules: children };
              processed.add(item.folderName);
              children.forEach(c => processed.add(c.folderName));
          }
      });

      // Pass 2: Shared Prefix (e.g. "DBM-Core", "DBM-PvP" -> group under "DBM-Core")
      const remaining = items.filter(i => !processed.has(i.folderName));
      
      remaining.forEach(item => {
          if (processed.has(item.folderName)) return;

          let prefix = '';
          const separators = ['-', '_'];
          
          for (const sep of separators) {
              const idx = item.folderName.indexOf(sep);
              if (idx >= 3) { // Require at least 3 chars for prefix to avoid weak matches
                  const candidate = item.folderName.substring(0, idx);
                  const cluster = remaining.filter(other => 
                       !processed.has(other.folderName) && 
                       (other.folderName.startsWith(candidate + '-') || other.folderName.startsWith(candidate + '_'))
                  );
                  
                  if (cluster.length > 1) {
                       prefix = candidate;
                       break; 
                  }
              }
          }

          if (prefix) {
              const cluster = remaining.filter(other => 
                  !processed.has(other.folderName) && 
                  (other.folderName.startsWith(prefix + '-') || other.folderName.startsWith(prefix + '_'))
              );
              
              // Find best parent (prefer "Core", "Base", "Common", or just keep shortest)
              let parent = cluster[0];
              const priorityKeywords = ['core', 'base', 'common', 'main'];
              const bestCandidate = cluster.find(c => priorityKeywords.some(k => c.folderName.toLowerCase().includes(k)));
              if (bestCandidate) parent = bestCandidate;

              const children = cluster.filter(c => c.folderName !== parent.folderName);
              groups[parent.folderName] = { ...parent, modules: children };
              
              cluster.forEach(c => processed.add(c.folderName));
          } else {
              if (!processed.has(item.folderName)) {
                 groups[item.folderName] = { ...item, modules: [] };
                 processed.add(item.folderName);
              }
          }
      });

      return Object.values(groups);
  };

  const groupedAddons = groupAddons(addonsList).map(addon => {
      // Manual overrides for common mismatches
      const overrides = {
          'DBM-Core': 'Deadly Boss Mods',
          'AtlasLoot': 'AtlasLoot Enhanced',
          'Recount': 'Recount',
          'Questie': 'Questie'
      };
      
      let searchTitle = addon.title;
      if (overrides[addon.title]) searchTitle = overrides[addon.title];

      // Try to find matching metadata in localAddons
      const meta = localAddons.find(a => 
          a.title.toLowerCase() === searchTitle.toLowerCase() || 
          (searchTitle.toLowerCase().includes(a.title.toLowerCase()) && a.title.length > 3) ||
          (a.title.toLowerCase().includes(searchTitle.toLowerCase()) && searchTitle.length > 3)
      );
      
      // Use the Store Title if found (better display name), otherwise keep folder name
      const displayTitle = meta ? meta.title : addon.title;
      
      return { ...addon, ...meta, title: displayTitle, originalFolderName: addon.folderName };
  });

  const handleInstallAddon = async () => {
      const path = gamePaths[activeGameId];
      const zipPath = await ipcRenderer.invoke('select-zip-file');
      if (zipPath) {
          setLoadingAddons(true);
          const result = await ipcRenderer.invoke('install-addon', { gamePath: path, filePath: zipPath });
          if (!result.success) {
              showModal('Installation Failed', result.message, <button className="modal-btn-primary" onClick={closeModal}>OK</button>);
          }
          const addons = await ipcRenderer.invoke('get-addons', path);
          setAddonsList(addons);
          setLoadingAddons(false);
      }
  };

  const handleAddonSearchChange = (val) => {
      setAddonSearch(val);
      setAddonPage(1);
  };

  const handleAddonSortChange = (val) => {
      setAddonSort(val);
      setAddonPage(1);
  };

  const currentPath = gamePaths[activeGameId];

  const formatBytes = (bytes, decimals = 2) => {
      if (!+bytes) return '0 B';
      const k = 1024;
      const dm = decimals < 0 ? 0 : decimals;
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };

  const toggleMusic = () => {
      if (audioRef.current) {
          if (isMusicPlaying) {
              audioRef.current.pause();
              setIsMusicPlaying(false);
          } else {
              const playPromise = audioRef.current.play();
              if (playPromise !== undefined) {
                  playPromise.then(() => {
                      audioRef.current.volume = 0.3;
                      setIsMusicPlaying(true);
                  }).catch(error => {
                      console.error("Playback failed:", error);
                      showModal('Music Error', "Could not play music. Please check your internet connection or try again.", <button className="modal-btn-primary" onClick={closeModal}>OK</button>);
                      setIsMusicPlaying(false);
                  });
              }
          }
      }
  };

  const togglePlayMusicOnStartup = () => {
      const newValue = !playMusicOnStartup;
      setPlayMusicOnStartup(newValue);
      localStorage.setItem('warmane_play_music_on_startup', JSON.stringify(newValue));
  };

  const toggleClearCache = () => {
      const newValue = !clearCacheOnLaunch;
      setClearCacheOnLaunch(newValue);
      localStorage.setItem('warmane_clear_cache', JSON.stringify(newValue));
  };

  const handleCleanCacheNow = async () => {
      const path = gamePaths[activeGameId];
      if (!path) {
          showModal('Error', `No installation path found for ${activeGame.name}. Please locate the game first.`, <button className="modal-btn-primary" onClick={closeModal}>OK</button>);
          return;
      }
      
      try {
          const result = await ipcRenderer.invoke('clear-game-cache', path);
          if (result.success) {
              if (result.cleared) {
                  showModal('Success', 'Cache folders (WDB/Cache) have been successfully cleared.', <button className="modal-btn-primary" onClick={closeModal}>OK</button>);
              } else {
                  showModal('Info', 'Cache folders were already empty or not found.', <button className="modal-btn-primary" onClick={closeModal}>OK</button>);
              }
          } else {
              showModal('Error', `Failed to clear cache: ${result.message}`, <button className="modal-btn-primary" onClick={closeModal}>OK</button>);
          }
      } catch (error) {
          console.error("Failed to clear cache:", error);
          showModal('Error', `An unexpected error occurred: ${error.message}`, <button className="modal-btn-primary" onClick={closeModal}>OK</button>);
      }
  };

  const toggleNotifications = () => {
      const newValue = !enableNotifications;
      setEnableNotifications(newValue);
      localStorage.setItem('warmane_notifications', JSON.stringify(newValue));
      if (newValue && Notification.permission !== "granted") {
          Notification.requestPermission();
      }
  };

  const toggleSoundEffects = () => {
      const newValue = !enableSoundEffects;
      setEnableSoundEffects(newValue);
      localStorage.setItem('warmane_sound_effects', JSON.stringify(newValue));
      if (newValue) playNotificationSound(); // Preview sound
  };

  const handleSetDefaultPath = async () => {
      try {
          const path = await ipcRenderer.invoke('select-directory');
          if (path) {
              setDefaultDownloadPath(path);
              localStorage.setItem('warmane_default_download_path', path);
          }
      } catch (error) {
          console.error("Failed to select default path:", error);
      }
  };

  const handleClearDefaultPath = () => {
      setDefaultDownloadPath('');
      localStorage.removeItem('warmane_default_download_path');
  };

  return (
    <div className="app-container">
      {/* Audio Element */}
      <audio 
        ref={audioRef} 
        src={WOTLK_THEME_URL} 
        loop 
        onError={(e) => {
            console.error("Audio Load Error:", e);
        }}
      />

      {/* Background Image Layer */}
      <div className="app-background">
         {/* Dynamic Background based on active game - DISABLED BY USER REQUEST
         <div className="bg-image-container" style={{
             backgroundImage: `url(${activeGame.bg})`
         }}></div>
         */}
         <div className="bg-gradient-overlay"></div>
         <div className="bg-vignette"></div>
      </div>

      {/* Title Bar */}
      <div className="title-bar">
        <div className="app-title"></div>
        
        <div className="window-controls">
          <button onClick={handleMinimize} className="control-btn" title="Minimize"><Minus size={16} strokeWidth={1.5} /></button>
          <button onClick={handleMaximize} className="control-btn" title="Maximize"><Square size={12} strokeWidth={1.5} /></button>
          <button onClick={handleClose} className="control-btn close" title="Close"><X size={16} strokeWidth={1.5} /></button>
        </div>
      </div>

      <div className="main-layout">
        {/* Sidebar */}
        <div className="sidebar">
            <div className="sidebar-logo">
            <div className="sidebar-logo-glow">
                <img src={azerothLogo} alt="WoW Launcher" />
            </div>
        </div>

            <div className="nav-menu">
                <div className="nav-label">MENU</div>
                <button 
                    className={`nav-item ${activeView === 'dashboard' ? 'active' : ''}`}
                    onClick={() => setActiveView('dashboard')}
                >
                    <Home size={18} /> Dashboard
                </button>
                
                <div className="nav-label">CLIENTS</div>
                {games.filter(g => visibleGameIds.includes(g.id)).map(game => (
                    <button 
                        key={game.id}
                        className={`nav-item ${activeView === 'game' && activeGameId === game.id ? 'active' : ''}`}
                        onClick={() => {
                            setActiveGameId(game.id);
                            setActiveView('game');
                        }}
                    >
                        <Layers size={18} /> {game.shortName}
                    </button>
                ))}
                
                <button 
                    className="nav-item manage-games-btn"
                    onClick={() => setIsManageClientsOpen(true)}
                    style={{
                        marginTop: '5px',
                        color: 'var(--text-secondary)',
                        fontSize: '12px',
                        justifyContent: 'center',
                        border: '1px dashed rgba(255,255,255,0.1)',
                        background: 'transparent'
                    }}
                >
                    <Plus size={14} /> Manage Clients
                </button>

                <div className="nav-label">TOOLS</div>
                <button 
                    className={`nav-item ${activeView === 'addons' ? 'active' : ''}`}
                    onClick={() => {
                        if (activeView !== 'game') {
                            // Default to wotlk if coming from dashboard
                             // Keep current game id
                        }
                        handleOpenAddons();
                    }}
                >
                    <Puzzle size={18} /> Addons
                </button>
                <button 
                    className={`nav-item ${activeView === 'settings' ? 'active' : ''}`}
                    onClick={() => setActiveView('settings')}
                >
                    <Settings size={18} /> Settings
                </button>
                <button 
                    className={`nav-item ${activeView === 'about' ? 'active' : ''}`}
                    onClick={() => setActiveView('about')}
                >
                    <Info size={18} /> About
                    {integrityStatus === 'danger' && <AlertTriangle size={14} color="#ef4444" style={{marginLeft: 'auto'}} />}
                </button>
            </div>

            <div className="sidebar-footer">
                <button className="music-toggle" onClick={toggleMusic} title="Toggle Music">
                    {isMusicPlaying ? <Music size={16} className="animate-pulse" /> : <Music size={16} />}
                </button>
                <div className="version-info">
                    <span className="version-text">v{appVersion}</span>
                    {updateInfo && updateInfo.updateAvailable && (
                        <a href={updateInfo.url} target="_blank" rel="noreferrer" className="update-badge" title="Update Available">
                            <Download size={12} />
                        </a>
                    )}
                </div>
            </div>
        </div>

        {/* Content Area */}
        <div className="content-area">
            
            {/* DASHBOARD VIEW */}
            {activeView === 'dashboard' && (
                <div className="dashboard-view">
                    {/* Professional Hero */}
                    <div className="hero-section" style={{padding: '80px 20px', border: 'none', background: 'transparent', boxShadow: 'none'}}>
                        <div className="hero-badge" style={{marginBottom: '15px'}}>WELCOME TO</div>
                        <h1 style={{fontSize: '52px', marginBottom: '20px'}}>AZEROTH LEGACY LAUNCHER</h1>
                        <p className="hero-description" style={{maxWidth: '700px', fontSize: '20px', color: '#ccc', lineHeight: '1.6'}}>
                            A new experience with private servers. <br/>
                            Seamlessly manage your clients, addons, and gameplay in one unified hub.
                        </p>

                        <div className="supported-games-preview" style={{
                            display: 'flex', 
                            justifyContent: 'center', 
                            gap: '60px', 
                            marginTop: '80px',
                            padding: '40px',
                            background: 'linear-gradient(90deg, transparent, rgba(0,0,0,0.3), transparent)',
                            borderTop: '1px solid rgba(255,255,255,0.05)',
                            borderBottom: '1px solid rgba(255,255,255,0.05)'
                        }}>
                            <div className="game-icon-card" style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px'}}>
                                <div className="icon-glow" style={{
                                    width: '80px', 
                                    height: '80px', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center',
                                    background: 'radial-gradient(circle, rgba(205,165,88,0.1) 0%, transparent 70%)',
                                    borderRadius: '50%'
                                }}>
                                    <img src={classicIco} alt="Classic" style={{width: '64px', height: '64px', filter: 'drop-shadow(0 0 15px rgba(205,165,88,0.3))'}} />
                                </div>
                            </div>

                            <div className="game-icon-card" style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px'}}>
                                <div className="icon-glow" style={{
                                    width: '80px', 
                                    height: '80px', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center',
                                    background: 'radial-gradient(circle, rgba(34,197,94,0.1) 0%, transparent 70%)',
                                    borderRadius: '50%'
                                }}>
                                    <img src={tbcIco} alt="TBC" style={{width: '64px', height: '64px', filter: 'drop-shadow(0 0 15px rgba(34,197,94,0.3))'}} />
                                </div>
                            </div>

                            <div className="game-icon-card" style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px'}}>
                                <div className="icon-glow" style={{
                                    width: '80px', 
                                    height: '80px', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center',
                                    background: 'radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)',
                                    borderRadius: '50%'
                                }}>
                                    <img src={wotlkIco} alt="WotLK" style={{width: '64px', height: '64px', filter: 'drop-shadow(0 0 15px rgba(59,130,246,0.3))'}} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* GAME VIEW */}
            {activeView === 'game' && (
                <div className="game-view" data-game={activeGame.id} style={{justifyContent: 'flex-start', paddingTop: '20px'}}>
                    <div className="game-header" style={{flexDirection: 'column', alignItems: 'center', gap: '20px', borderBottom: 'none', width: '100%'}}>
                         <div className="game-art-wrapper" style={{
                             display: 'flex', 
                             justifyContent: 'center', 
                             width: '100%', 
                             marginBottom: '0',
                             filter: `drop-shadow(0 0 30px ${activeGame.id === 'tbc' ? 'rgba(40, 255, 60, 0.6)' : 'rgba(0, 140, 255, 0.6)'})`
                         }}>
                            <img 
                                src={activeGame.cardArt || activeGame.icon}  
                                className="game-header-art" 
                                alt={activeGame.name} 
                                style={{
                                    maxWidth: '80%',
                                    height: 'auto',
                                    display: 'block'
                                }} 
                            />
                        </div>

                        <div className="game-info-actions" style={{width: '100%', marginTop: '0', alignItems: 'center', borderTop: 'none', paddingTop: '10px'}}>
                            <div className="play-section" style={{width: '100%', justifyContent: 'center'}}>
                                {currentPath ? (
                                    <div style={{display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'center', width: '100%'}}>
                                        <button 
                                            className={`play-button-large ${isPlaying ? 'playing' : ''}`}
                                            onClick={handlePlay}
                                            disabled={isPlaying}
                                        >
                                            <Play size={24} fill="currentColor" /> PLAY
                                        </button>
                                        <button 
                                            className="icon-btn-large" 
                                            onClick={handleConfigureRealmlist}
                                            title="Configure Realmlist"
                                            style={{
                                                height: '60px', 
                                                width: '60px',
                                                borderRadius: '4px',
                                                background: 'rgba(var(--primary-rgb), 0.1)',
                                                border: '1px solid rgba(var(--primary-rgb), 0.3)',
                                                color: 'var(--primary-gold)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s'
                                            }}
                                            onMouseOver={(e) => {
                                                e.currentTarget.style.background = 'rgba(var(--primary-rgb), 0.2)';
                                                e.currentTarget.style.boxShadow = '0 0 15px rgba(var(--primary-rgb), 0.2)';
                                            }}
                                            onMouseOut={(e) => {
                                                e.currentTarget.style.background = 'rgba(var(--primary-rgb), 0.1)';
                                                e.currentTarget.style.boxShadow = 'none';
                                            }}
                                        >
                                            <Globe size={24} />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="install-section" style={{width: '100%', alignItems: 'center'}}>
                                        {downloadState.isDownloading && downloadState.gameId === activeGameId ? (
                                            <div className="download-compact-container">
                                                <div className="download-compact-header">
                                                    {downloadState.statusMessage ? (
                                                        <div className="download-status-row">
                                                            <RefreshCw size={14} className="spin-icon" style={{marginRight: '8px'}} />
                                                            <span className={`status-text ${downloadState.statusMessage.toLowerCase().includes('extracting') ? 'extracting-mode' : ''}`}>{downloadState.statusMessage}</span>
                                                        </div>
                                                    ) : (
                                                        <div className="download-stats-row">
                                                            <span className="stats-text">
                                                                <span className="highlight-text">{formatBytes(downloadState.downloaded)}</span> 
                                                                <span className="dim-text"> / {formatBytes(downloadState.total)}</span>
                                                            </span>
                                                            <span className="separator">•</span>
                                                            <span className="stats-text">{formatBytes(downloadState.speed)}/s</span>
                                                            <span className="separator">•</span>
                                                            <span className="stats-text">{(downloadState.progress * 100).toFixed(1)}%</span>
                                                        </div>
                                                    )}
                                                    <button onClick={handleCancelDownload} className="cancel-icon-btn" title="Cancel">
                                                        <X size={16}/>
                                                    </button>
                                                </div>
                                                <div className="progress-bar-slim">
                                                    <div className="progress-fill" style={{width: `${downloadState.progress * 100}%`}}>
                                                        <div className="progress-glow-slim"></div>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="install-buttons" style={{alignItems: 'center'}}>
                                                {activeGame.downloads && activeGame.downloads.length > 1 && (
                                                    <div className="version-selector-container">
                                                        <div className="version-options">
                                                            {activeGame.downloads.map((dl, idx) => (
                                                                <div 
                                                                    key={idx}
                                                                    className={`version-option ${selectedDownloadIndex === idx ? 'active' : ''}`}
                                                                    onClick={() => setSelectedDownloadIndex(idx)}
                                                                >
                                                                    <span className="version-number">{dl.version}</span>
                                                                    {selectedDownloadIndex === idx && <Check size={14} className="check-icon" />}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                                <button className="install-button-large" onClick={handleDownload} disabled={downloadState.isDownloading}>
                                                    <Download size={24} /> {downloadState.isDownloading ? 'INSTALL' : 'INSTALL'}
                                                </button>
                                                <div className="divider-text" style={{width: '100%', textAlign: 'center'}}>OR</div>
                                                <button className="locate-button" onClick={handleLocateGame}>
                                                    <FolderSearch size={16} /> Locate Existing Installation
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="game-details-grid" style={{marginTop: '0'}}>
                         <div className="detail-card">
                             <h4>Game Version</h4>
                             <p>{activeGame.downloads ? activeGame.downloads[selectedDownloadIndex].version : activeGame.version}</p>
                         </div>
                         <div className="detail-card">
                             <h4>Installation Path</h4>
                             <p className="path-text" title={currentPath || 'Not Installed'}>
                                 {currentPath || 'Not Installed'}
                             </p>
                             {currentPath && (
                                <button className="remove-path-btn" onClick={handleForgetGame}>Remove</button>
                            )}
                         </div>
                    </div>
                </div>
            )}

            {/* ADDONS VIEW */}
            {activeView === 'addons' && (
                <AddonsView 
                    activeGame={activeGame}
                    selectedVersion={activeGame.downloads ? activeGame.downloads[selectedDownloadIndex].version : activeGame.version}
                    activeAddonTab={activeAddonTab}
                    setActiveAddonTab={setActiveAddonTab}
                    groupedAddons={groupedAddons}
                    loadingAddons={loadingAddons}
                    addonSearch={addonSearch}
                    setAddonSearch={handleAddonSearchChange}
                    addonSort={addonSort}
                    setAddonSort={handleAddonSortChange}
                    browseAddonsList={browseAddonsList}
                    installingAddon={installingAddon}
                    handleInstallAddon={handleInstallAddon}
                    handleInstallWarperiaAddon={handleInstallWarperiaAddon}
                    handleDeleteAddon={handleDeleteAddon}
                    gameInstalled={!!gamePaths[activeGameId]}
                />
            )}

            {/* SETTINGS VIEW */}
            {activeView === 'settings' && (
                <div className="settings-view">
                    <h2>Settings</h2>
                    
                    <div className="settings-section">
                        <h3>Launcher Behavior</h3>
                        <div className="toggle-row">
                            <div className="toggle-label">
                                <span className="toggle-title">Auto-close Launcher</span>
                                <span className="toggle-desc">Automatically close the launcher 2 seconds after launching the game.</span>
                            </div>
                            <label className="toggle-switch">
                                <input 
                                    type="checkbox" 
                                    checked={autoCloseLauncher}
                                    onChange={toggleAutoClose}
                                />
                                <span className="slider"></span>
                            </label>
                        </div>
                        <div className="toggle-row" style={{marginTop: '10px'}}>
                            <div className="toggle-label">
                                <span className="toggle-title">Play Music on Startup</span>
                                <span className="toggle-desc">Automatically play theme music when the launcher starts.</span>
                            </div>
                            <label className="toggle-switch">
                                <input 
                                    type="checkbox" 
                                    checked={playMusicOnStartup}
                                    onChange={togglePlayMusicOnStartup}
                                />
                                <span className="slider"></span>
                            </label>
                        </div>
                        <div className="toggle-row" style={{marginTop: '10px'}}>
                             <div className="toggle-label">
                                 <span className="toggle-title">Clear Cache on Launch</span>
                                 <span className="toggle-desc">Delete WDB folder before starting game (Fixes common item/creature bugs).</span>
                             </div>
                             <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
                                 <button 
                                     className="modal-btn-secondary" 
                                     onClick={handleCleanCacheNow}
                                     style={{
                                         padding: '6px 12px', 
                                         fontSize: '12px', 
                                         height: 'auto',
                                         display: 'flex',
                                         alignItems: 'center',
                                         gap: '6px'
                                     }}
                                     title={`Clear cache for ${activeGame.shortName}`}
                                 >
                                     <Trash2 size={14} /> Clean Now
                                 </button>
                                 <label className="toggle-switch">
                                     <input 
                                         type="checkbox" 
                                         checked={clearCacheOnLaunch}
                                         onChange={toggleClearCache}
                                     />
                                     <span className="slider"></span>
                                 </label>
                             </div>
                         </div>

                        <div className="toggle-row" style={{marginTop: '10px'}}>
                            <div className="toggle-label">
                                <span className="toggle-title">App Theme</span>
                                <span className="toggle-desc">Select the visual theme for the launcher.</span>
                            </div>
                            <div className="theme-selector-container">
                                <div 
                                    className="theme-selector-trigger"
                                    onClick={() => setIsThemeDropdownOpen(!isThemeDropdownOpen)}
                                >
                                    <div style={{display: 'flex', alignItems: 'center'}}>
                                        <span className="theme-color-preview" style={{background: themes[currentTheme]?.colors['--primary-gold']}}></span>
                                        {themes[currentTheme]?.name}
                                    </div>
                                    <ChevronDown size={16} style={{transform: isThemeDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s'}} />
                                </div>
                                
                                {isThemeDropdownOpen && (
                                    <div className="theme-selector-dropdown">
                                        {Object.values(themes).map(theme => (
                                            <div 
                                                key={theme.id} 
                                                className={`theme-option ${currentTheme === theme.id ? 'selected' : ''}`}
                                                onClick={() => {
                                                    setCurrentTheme(theme.id);
                                                    setIsThemeDropdownOpen(false);
                                                }}
                                            >
                                                <span className="theme-color-preview" style={{background: theme.colors['--primary-gold']}}></span>
                                                {theme.name}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                     </div>

                    <div className="settings-section" style={{marginTop: '20px'}}>
                        <h3>Notifications & Sound</h3>
                        <div className="toggle-row">
                            <div className="toggle-label">
                                <span className="toggle-title">Desktop Notifications</span>
                                <span className="toggle-desc">Show a Windows notification when downloads complete.</span>
                            </div>
                            <label className="toggle-switch">
                                <input 
                                    type="checkbox" 
                                    checked={enableNotifications}
                                    onChange={toggleNotifications}
                                />
                                <span className="slider"></span>
                            </label>
                        </div>
                        <div className="toggle-row" style={{marginTop: '10px'}}>
                            <div className="toggle-label">
                                <span className="toggle-title">Sound Effects</span>
                                <span className="toggle-desc">Play a sound when a download finishes.</span>
                            </div>
                            <label className="toggle-switch">
                                <input 
                                    type="checkbox" 
                                    checked={enableSoundEffects}
                                    onChange={toggleSoundEffects}
                                />
                                <span className="slider"></span>
                            </label>
                        </div>
                    </div>

                     <div className="settings-section" style={{marginTop: '20px'}}>
                         <h3>Downloads & Installation</h3>
                        <div className="setting-row" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '8px'}}>
                            <div className="setting-label">
                                <div className="setting-title" style={{fontWeight: 'bold', color: '#eee', marginBottom: '4px'}}>Default Download Path</div>
                                <div className="setting-desc" style={{fontSize: '12px', color: '#aaa'}}>Games will be automatically installed here.</div>
                            </div>
                            <div className="setting-controls" style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                                <div className="path-display" style={{
                                    background: 'rgba(0,0,0,0.3)', 
                                    padding: '8px 12px', 
                                    borderRadius: '4px', 
                                    fontSize: '13px', 
                                    color: defaultDownloadPath ? '#fff' : '#888',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    maxWidth: '250px',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                }}>
                                    {defaultDownloadPath || 'No default path set'}
                                </div>
                                <button className="modal-btn-secondary" onClick={handleSetDefaultPath} style={{padding: '6px 12px', fontSize: '13px', height: 'auto'}}>
                                    {defaultDownloadPath ? 'Change' : 'Set Path'}
                                </button>
                                {defaultDownloadPath && (
                                    <button onClick={handleClearDefaultPath} style={{padding: '6px', background: 'none', border: 'none', color: '#ff4d4d', cursor: 'pointer', display: 'flex', alignItems: 'center'}} title="Clear Default Path">
                                        <XCircle size={18} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ABOUT VIEW */}
            {activeView === 'about' && (
                <div className="settings-view">
                    <h2>About & Client Sources</h2>

                    <div className="settings-section">
                        <div className="about-content">
                            <p className="app-version">Azeroth Legacy Launcher <span className="version-tag">v{appVersion || '3.0.0-beta'}</span></p>
                            
                            {/* Integrity Status Display */}
                            <div className={`integrity-status-card ${integrityStatus}`} style={{
                                marginTop: '20px',
                                marginBottom: '20px',
                                padding: '15px',
                                background: integrityStatus === 'secure' ? 'rgba(34, 197, 94, 0.1)' : (integrityStatus === 'danger' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(234, 179, 8, 0.1)'),
                                border: `1px solid ${integrityStatus === 'secure' ? 'rgba(34, 197, 94, 0.3)' : (integrityStatus === 'danger' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(234, 179, 8, 0.3)')}`,
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '15px'
                            }}>
                                <div className="status-icon" style={{
                                    color: integrityStatus === 'secure' ? '#4ade80' : (integrityStatus === 'danger' ? '#f87171' : '#facc15')
                                }}>
                                    {integrityStatus === 'secure' ? <Shield size={32} /> : <AlertTriangle size={32} />}
                                </div>
                                <div className="status-info">
                                    <h4 style={{
                                        margin: '0 0 5px 0', 
                                        color: integrityStatus === 'secure' ? '#4ade80' : (integrityStatus === 'danger' ? '#f87171' : '#facc15'),
                                        fontSize: '16px'
                                    }}>
                                        {integrityStatus === 'secure' ? 'Secure & Verified' : (integrityStatus === 'danger' ? 'Integrity Mismatch' : 'Verification Warning')}
                                    </h4>
                                    <p style={{margin: 0, fontSize: '13px', color: '#ccc'}}>
                                        {integrityMessage || 'Checking integrity...'}
                                    </p>
                                    
                                    {/* Hash Details & Link */}
                                    <div style={{marginTop: '10px', fontSize: '12px', color: '#888'}}>
                                        <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap'}}>
                                            <span style={{opacity: 0.7}}>Local Hash:</span>
                                            <code style={{
                                                background: 'rgba(0,0,0,0.2)', 
                                                padding: '2px 6px', 
                                                borderRadius: '4px', 
                                                userSelect: 'all',
                                                fontFamily: 'monospace',
                                                fontSize: '11px',
                                                border: '1px solid rgba(255,255,255,0.05)',
                                                color: integrityStatus === 'secure' ? '#4ade80' : '#ddd'
                                            }}>
                                                {integrityHash || 'Calculating...'}
                                            </code>
                                        </div>
                                        <a 
                                            href="https://github.com/Litas-dev/Unofficial-warmane-launcher/blob/main/security.json" 
                                            target="_blank" 
                                            rel="noreferrer"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                ipcRenderer.send('open-external', "https://github.com/Litas-dev/Unofficial-warmane-launcher/blob/main/security.json");
                                            }}
                                            style={{
                                                color: 'var(--primary-gold)', 
                                                textDecoration: 'none', 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                gap: '5px', 
                                                width: 'fit-content',
                                                fontSize: '12px',
                                                marginTop: '4px',
                                                opacity: 0.8,
                                                transition: 'opacity 0.2s'
                                            }}
                                            onMouseOver={(e) => e.currentTarget.style.opacity = 1}
                                            onMouseOut={(e) => e.currentTarget.style.opacity = 0.8}
                                        >
                                            <ExternalLink size={12} /> Verify Official Hash on GitHub
                                        </a>
                                    </div>
                                </div>
                            </div>
                            
                            <p className="source-note">
                                This launcher provides automated downloads for World of Warcraft clients from trusted community sources.
                                We do not host any game files directly.
                            </p>
                            
                            <div className="sources-list">
                                <div className="source-item">
                                    <div className="source-icon">
                                        <Globe size={20} color="#cda558" />
                                    </div>
                                    <div className="source-info">
                                        <span className="source-game">World of Warcraft Classic (1.12.1)</span>
                                        <span className="source-origin">Provided by <a href="#" className="source-link">TwinStar</a></span>
                                    </div>
                                </div>
                                <div className="source-item">
                                    <div className="source-icon">
                                        <Zap size={20} color="#cda558" />
                                    </div>
                                    <div className="source-info">
                                        <span className="source-game">The Burning Crusade (2.4.3)</span>
                                        <span className="source-origin">Provided by <a href="#" className="source-link">WoWLibrary</a></span>
                                    </div>
                                </div>
                                <div className="source-item">
                                    <div className="source-icon">
                                        <Zap size={20} color="#cda558" />
                                    </div>
                                    <div className="source-info">
                                        <span className="source-game">The Burning Crusade (2.5.2)</span>
                                        <span className="source-origin">Provided by <a href="#" className="source-link">WoWLibrary</a></span>
                                    </div>
                                </div>
                                <div className="source-item">
                                    <div className="source-icon">
                                        <Layers size={20} color="#cda558" />
                                    </div>
                                    <div className="source-info">
                                        <span className="source-game">Wrath of the Lich King (3.3.5a)</span>
                                        <span className="source-origin">Community Magnet <span className="source-badge">P2P</span></span>
                                    </div>
                                </div>
                                <div className="source-item">
                                    <div className="source-icon">
                                        <Puzzle size={20} color="#cda558" />
                                    </div>
                                    <div className="source-info">
                                        <span className="source-game">Addon Repository</span>
                                        <span className="source-origin">Provided by <a href="https://warperia.com" target="_blank" rel="noreferrer" className="source-link">Warperia</a></span>
                                    </div>
                                </div>
                            </div>

                            <div className="legal-disclaimer">
                                <p>World of Warcraft® and Blizzard Entertainment® are all trademarks or registered trademarks of Blizzard Entertainment in the United States and/or other countries. These terms and all related materials, logos, and images are copyright © Blizzard Entertainment. This launcher is in no way associated with or endorsed by Blizzard Entertainment.</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
      </div>
      
      <Modal
          isOpen={isManageClientsOpen}
          onClose={() => setIsManageClientsOpen(false)}
          title="Manage Clients"
          footer={<button className="modal-btn-primary" onClick={() => setIsManageClientsOpen(false)}>Done</button>}
      >
          <div className="manage-games-modal">
              <p style={{color: 'var(--text-secondary)', marginBottom: '20px'}}>
                  Select which expansions you want to see in the sidebar.
              </p>
              <div className="games-toggle-list">
                  {games.map(game => (
                      <div key={game.id} className="game-toggle-item" style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px',
                          background: 'rgba(0,0,0,0.2)',
                          border: '1px solid rgba(255,255,255,0.05)',
                          marginBottom: '8px',
                          borderRadius: '6px'
                      }}>
                          <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                              <img src={game.clientIcon} alt="" style={{width: '24px', height: '24px', borderRadius: '4px'}} />
                              <span style={{fontWeight: '600'}}>{game.name}</span>
                          </div>
                          <label className="toggle-switch">
                              <input 
                                  type="checkbox" 
                                  checked={visibleGameIds.includes(game.id)}
                                  onChange={() => toggleGameVisibility(game.id)}
                                  disabled={visibleGameIds.includes(game.id) && visibleGameIds.length <= 1}
                              />
                              <span className="slider"></span>
                          </label>
                      </div>
                  ))}
              </div>
          </div>
      </Modal>

      <Modal 
          isOpen={modalConfig.isOpen} 
          onClose={closeModal} 
          title={modalConfig.title} 
          footer={modalConfig.footer}
      >
          {modalConfig.body}
      </Modal>

      <Modal
          isOpen={realmlistConfig.isOpen}
          onClose={() => setRealmlistConfig(prev => ({ ...prev, isOpen: false }))}
          title="Configure Realmlist"
          footer={
              <>
                  <button className="modal-btn-secondary" onClick={() => setRealmlistConfig(prev => ({ ...prev, isOpen: false }))}>Cancel</button>
                  <button className="modal-btn-primary" onClick={handleRealmlistSave}>
                      {realmlistConfig.launchOnSave ? 'Save & Play' : 'Save'}
                  </button>
              </>
          }
      >
          <p style={{marginBottom: '15px', color: '#ccc'}}>
              Since this is your first time launching {games.find(g => g.id === realmlistConfig.gameId)?.name}, 
              please confirm the realmlist setting.
          </p>
          <div className="form-group">
              <label style={{display: 'block', marginBottom: '8px', color: '#aaa', fontSize: '14px'}}>Realmlist Line</label>
              <input 
                  type="text" 
                  value={realmlistConfig.content}
                  onChange={(e) => setRealmlistConfig(prev => ({ ...prev, content: e.target.value }))}
                  className="modal-input"
                  style={{
                      width: '100%',
                      padding: '10px',
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#fff',
                      borderRadius: '4px',
                      marginBottom: '10px'
                  }}
              />
              <p style={{fontSize: '12px', color: '#888'}}>
                  Default for Warmane: <code style={{background: 'rgba(255,255,255,0.1)', padding: '2px 4px', borderRadius: '3px'}}>set realmlist logon.warmane.com</code>
              </p>
          </div>

          <div className="saved-realmlists" style={{marginTop: '20px'}}>
              <label style={{display: 'block', marginBottom: '8px', color: '#aaa', fontSize: '14px'}}>Saved Realmlists</label>
              <div style={{
                  maxHeight: '150px', 
                  overflowY: 'auto', 
                  border: '1px solid rgba(255,255,255,0.1)', 
                  borderRadius: '4px',
                  background: 'rgba(0,0,0,0.2)'
              }}>
                  {savedRealmlists.map((item, idx) => (
                      <div 
                          key={idx} 
                          onClick={() => setRealmlistConfig(prev => ({ ...prev, content: item }))}
                          style={{
                              padding: '8px 10px',
                              borderBottom: '1px solid rgba(255,255,255,0.05)',
                              cursor: 'pointer',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              background: realmlistConfig.content === item ? 'rgba(205, 165, 88, 0.1)' : 'transparent',
                              color: realmlistConfig.content === item ? '#cda558' : '#ddd',
                              transition: 'background 0.2s'
                          }}
                          className="realmlist-item"
                          onMouseOver={(e) => e.currentTarget.style.background = realmlistConfig.content === item ? 'rgba(205, 165, 88, 0.2)' : 'rgba(255,255,255,0.05)'}
                          onMouseOut={(e) => e.currentTarget.style.background = realmlistConfig.content === item ? 'rgba(205, 165, 88, 0.1)' : 'transparent'}
                      >
                          <span style={{fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '380px'}}>{item}</span>
                          {item !== 'set realmlist logon.warmane.com' && (
                              <button 
                                  onClick={(e) => removeSavedRealmlist(e, item)}
                                  title="Remove from history"
                                  style={{
                                      background: 'none', 
                                      border: 'none', 
                                      color: '#666', 
                                      cursor: 'pointer', 
                                      padding: '4px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      borderRadius: '4px'
                                  }}
                                  onMouseOver={(e) => {
                                      e.currentTarget.style.background = 'rgba(255,0,0,0.2)';
                                      e.currentTarget.style.color = '#ff4d4d';
                                  }}
                                  onMouseOut={(e) => {
                                      e.currentTarget.style.background = 'none';
                                      e.currentTarget.style.color = '#666';
                                  }}
                              >
                                  <X size={14} />
                              </button>
                          )}
                      </div>
                  ))}
              </div>
          </div>
      </Modal>
    </div>
  );
}

export default App;