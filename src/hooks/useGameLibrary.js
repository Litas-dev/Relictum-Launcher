import { useState, useEffect } from 'react';
import { games } from '../config/games';
import ipcRenderer from '../utils/ipc';

export const useGameLibrary = () => {
    const [activeGameId, setActiveGameId] = useState('wotlk');
    const [gamePaths, setGamePaths] = useState({});
    const [visibleGameIds, setVisibleGameIds] = useState(games.map(g => g.id));
    const [isPlaying, setIsPlaying] = useState(false);

    // Load visible games
    useEffect(() => {
        try {
            const savedVisibleGames = localStorage.getItem('warmane_visible_games');
            if (savedVisibleGames) {
                const parsed = JSON.parse(savedVisibleGames);
                if (Array.isArray(parsed)) {
                    setVisibleGameIds(parsed);
                }
            }
        } catch (e) {
            console.error("Failed to load visible games settings:", e);
        }
    }, []);

    // Save visible games
    useEffect(() => {
        localStorage.setItem('warmane_visible_games', JSON.stringify(visibleGameIds));
    }, [visibleGameIds]);

    // Load game paths
    useEffect(() => {
        const loadPaths = () => {
            const savedPaths = localStorage.getItem('warmane_game_paths');
            if (savedPaths) {
                setGamePaths(JSON.parse(savedPaths));
            }
        };

        loadPaths();
        
        // Listen for updates from plugins
        window.addEventListener('warmane-game-paths-updated', loadPaths);
        return () => window.removeEventListener('warmane-game-paths-updated', loadPaths);
    }, []);

    // Listen for game events
    useEffect(() => {
        const handleGameClosed = () => setIsPlaying(false);
        
        // We handle launch error via promise or separate event, but global listener is good too
        const handleGameLaunchError = (event, message) => {
            setIsPlaying(false);
            // Error handling usually requires UI (Modal), so we might bubble this up or expose an error state
        };

        ipcRenderer.on('game-closed', handleGameClosed);
        ipcRenderer.on('game-launch-error', handleGameLaunchError);

        return () => {
            if (ipcRenderer.removeListener) {
                ipcRenderer.removeListener('game-closed', handleGameClosed);
                ipcRenderer.removeListener('game-launch-error', handleGameLaunchError);
            }
        };
    }, []);

    const toggleGameVisibility = (gameId) => {
        setVisibleGameIds(prev => {
            if (!Array.isArray(prev)) return [gameId]; // Safety fallback
            
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

    const savePath = (gameId, path) => {
        const newPaths = { ...gamePaths, [gameId]: path };
        setGamePaths(newPaths);
        localStorage.setItem('warmane_game_paths', JSON.stringify(newPaths));
    };

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

    const launchGame = async (path, { clearCache, autoClose } = {}) => {
        setIsPlaying(true);
        
        if (clearCache) {
            try {
                await ipcRenderer.invoke('clear-game-cache', path);
            } catch (e) {
                console.error("Failed to clear cache:", e);
            }
        }

        setTimeout(() => {
            ipcRenderer.send('launch-game', path);
            if (autoClose) {
                setTimeout(() => ipcRenderer.send('close-window'), 2000);
            }
        }, 1000);
    };

    return {
        activeGameId,
        setActiveGameId,
        visibleGameIds,
        toggleGameVisibility,
        gamePaths,
        savePath,
        handleLocateGame,
        handleForgetGame,
        launchGame,
        isPlaying,
        setIsPlaying
    };
};
