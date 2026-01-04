import React, { useState, useEffect } from 'react';
import { Play, Globe, FolderSearch } from 'lucide-react';
import styles from './GameDetails.module.css';
import ipcRenderer from '../../utils/ipc';

const GameDetails = ({
  activeGame,
  activeGameId,
  currentPath,
  isPlaying,
  onPlay,
  onConfigureRealmlist,
  onLocateGame,
  onForgetGame
}) => {
  const [detectedVersion, setDetectedVersion] = useState(null);
  const [isVersionCompatible, setIsVersionCompatible] = useState(true);

  useEffect(() => {
    const fetchVersion = async () => {
      if (currentPath) {
        try {
          const version = await ipcRenderer.invoke('get-game-version', currentPath);
          setDetectedVersion(version);
        } catch (error) {
          console.error('Failed to get game version:', error);
          setDetectedVersion(null);
        }
      } else {
        setDetectedVersion(null);
      }
    };
    fetchVersion();
  }, [currentPath]);

  useEffect(() => {
    if (currentPath && detectedVersion && activeGame.version) {
      // Extract the first number found (Major version)
      // This handles cases like "Version 3.3" -> "3", "3.3.5a" -> "3", "v1.12" -> "1"
      const getMajor = (v) => {
        const match = v.toString().match(/(\d+)/);
        return match ? match[0] : null;
      };

      const gameMajor = getMajor(activeGame.version);
      const detectedMajor = getMajor(detectedVersion);

      // Only mark incompatible if we successfully extracted both major versions and they differ
      if (gameMajor && detectedMajor) {
        setIsVersionCompatible(gameMajor === detectedMajor);
      } else {
        // If parsing fails, default to compatible to avoid blocking valid but weirdly versioned clients
        setIsVersionCompatible(true);
      }
    } else {
      setIsVersionCompatible(true);
    }
  }, [detectedVersion, activeGame, currentPath]);

  return (
    <div className={styles.gameView} data-game={activeGame.id}>
      <div className={styles.gameHeader}>
        <div 
          className={styles.gameArtWrapper}
          style={{
            filter: `drop-shadow(0 0 30px ${activeGame.id === 'tbc' ? 'rgba(40, 255, 60, 0.6)' : 'rgba(0, 140, 255, 0.6)'})`
          }}
        >
          <img 
            src={activeGame.cardArt || activeGame.icon}  
            className={styles.gameHeaderArt} 
            alt={activeGame.name} 
          />
        </div>

        <div className={styles.gameInfoActions}>
          <div className={styles.playSection}>
            {currentPath ? (
              <div className={styles.playButtonGroup}>
                <button 
                  className={`${styles.playButtonLarge} ${isPlaying ? styles.playing : ''} ${!isVersionCompatible ? styles.disabledError : ''}`}
                  onClick={onPlay}
                  disabled={isPlaying || !isVersionCompatible}
                >
                  <Play size={24} fill="currentColor" /> 
                  {!isVersionCompatible ? "WRONG VERSION" : (isPlaying ? "PLAYING" : "PLAY")}
                </button>
                <button 
                  className={styles.iconBtnLarge} 
                  onClick={onConfigureRealmlist}
                  title="Configure Realmlist"
                >
                  <Globe size={24} />
                </button>
              </div>
            ) : (
              <div className={styles.installSection}>
                <div className={styles.installButtons}>
                  <button className={styles.locateButton} onClick={onLocateGame}>
                    <FolderSearch size={16} /> Locate Existing Installation
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={styles.gameDetailsGrid}>
        <div className={styles.detailCard}>
          <h4>Game Version</h4>
          <p>{activeGame.version}</p>
          {detectedVersion && (
            <p className={!isVersionCompatible ? styles.errorText : ''} style={isVersionCompatible ? { fontSize: '0.8em', color: '#888', marginTop: '4px' } : { fontSize: '0.9em', marginTop: '4px' }}>
              Detected: {detectedVersion} {!isVersionCompatible && '(Incompatible)'}
            </p>
          )}
        </div>
        <div className={styles.detailCard}>
          <h4>Installation Path</h4>
          <p className={styles.pathText} title={currentPath || 'Not Installed'}>
            {currentPath || 'Not Installed'}
          </p>
          {currentPath && (
            <button className={styles.removePathBtn} onClick={onForgetGame}>Remove</button>
          )}
        </div>
      </div>
    </div>
  );
};

export default GameDetails;
