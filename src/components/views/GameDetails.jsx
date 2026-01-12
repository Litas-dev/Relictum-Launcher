import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Play, Globe, FolderSearch, Puzzle, Settings, Image as ImageIcon, User, Camera, Palette, Edit } from 'lucide-react';
import styles from './GameDetails.module.css';
import ipcRenderer from '../../utils/ipc';
import ExtensionStore from '../../utils/ExtensionStore';

const GameDetails = ({
  activeGame,
  activeGameId,
  currentPath,
  isPlaying,
  onPlay,
  onConfigureRealmlist,
  onLocateGame,
  onForgetGame,
  enableGlowEffects
}) => {
  const { t } = useTranslation();
  const [detectedVersion, setDetectedVersion] = useState(null);
  const [isVersionCompatible, setIsVersionCompatible] = useState(true);
  const [extensionActions, setExtensionActions] = useState([]);
  const [extensionWidgets, setExtensionWidgets] = useState([]);
  const [gameImages, setGameImages] = useState({});
  const [gameGlow, setGameGlow] = useState(null);

  useEffect(() => {
    const updateActions = () => {
        setExtensionActions([...ExtensionStore.getGameActions()]);
        setExtensionWidgets([...ExtensionStore.getGameDetailsWidgets()]);
        setGameImages(ExtensionStore.getGameImages(activeGameId));
        setGameGlow(ExtensionStore.getGameGlow(activeGameId));
    };
    updateActions();
    return ExtensionStore.subscribe(updateActions);
  }, [activeGameId]);

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
      /** Extract major version number (e.g. "3.3.5" -> "3") */
      // This handles cases like "Version 3.3" -> "3", "3.3.5a" -> "3", "v1.12" -> "1"
      const getMajor = (v) => {
        const match = v.toString().match(/(\d+)/);
        return match ? match[0] : null;
      };

      const gameMajor = getMajor(activeGame.version);
      const detectedMajor = getMajor(detectedVersion);

      // Check compatibility only if both versions were successfully parsed
      if (gameMajor && detectedMajor && !activeGame.isCustom) {
        setIsVersionCompatible(gameMajor === detectedMajor);
      } else {
        // Default to compatible if version parsing fails to prevent blocking valid clients
        // Also always compatible for custom games (user responsibility)
        setIsVersionCompatible(true);
      }
    } else {
      setIsVersionCompatible(true);
    }
  }, [detectedVersion, activeGame, currentPath]);

  return (
    <div id="game-details-view" className={styles.gameView} data-game={activeGame.id}>
      <div id="game-header" className={styles.gameHeader}>
        <div className={styles.gameArtWrapper}>
          <div className={styles.artContainer}>
            {(gameImages.cardArt !== undefined ? gameImages.cardArt : (activeGame.cardArt || activeGame.icon)) && (
              <img 
                id="game-hero-art"
                src={gameImages.cardArt !== undefined ? gameImages.cardArt : (activeGame.cardArt || activeGame.icon)}  
                className={`${styles.gameHeaderArt} ${enableGlowEffects && !gameGlow ? (styles[`banner_glow_${activeGame.id}`] || styles.banner_glow_wotlk) : ''}`}
                alt={activeGame.name}
                style={enableGlowEffects && gameGlow ? {
                  filter: `drop-shadow(0 0 30px ${gameGlow})`
                } : {}}
              />
            )}
            <div 
              className={`${styles.overlayIcon} ${!gameGlow ? styles[`glow_${activeGame.id}`] : ''}`}
              style={enableGlowEffects ? (gameGlow ? { filter: `drop-shadow(0 0 15px ${gameGlow})` } : {}) : { filter: 'none', boxShadow: 'none' }}
            >
              {(gameImages.clientIcon !== undefined ? gameImages.clientIcon : activeGame.clientIcon) && (
                <img 
                  id="game-logo-icon"
                  src={gameImages.clientIcon !== undefined ? gameImages.clientIcon : activeGame.clientIcon} 
                  alt={`${activeGame.shortName} Icon`}
                  className={styles.largeGameIcon}
                  style={enableGlowEffects ? {} : { filter: 'drop-shadow(0 0 10px rgba(0,0,0,0.5))' }}
                />
              )}
            </div>
          </div>
        </div>

        <div id="game-info-actions" className={styles.gameInfoActions}>
          <div id="play-section" className={styles.playSection}>
            {currentPath ? (
              <div id="play-button-group" className={styles.playButtonGroup}>
                <button 
                  id="play-button"
                  className={`${styles.playButtonLarge} ${isPlaying ? styles.playing : ''} ${!isVersionCompatible ? styles.disabledError : ''}`}
                  onClick={onPlay}
                  disabled={isPlaying || !isVersionCompatible}
                >
                  <Play size={24} fill="currentColor" /> 
                  {!isVersionCompatible ? t('game_details.wrong_version') : (isPlaying ? t('game_details.playing') : t('game_details.play'))}
                </button>
                
                <button
                    className={styles.iconBtnLarge}
                    onClick={() => onConfigureRealmlist(activeGameId)}
                    title={t('game_details.configure_realmlist')}
                >
                    <Settings size={24} />
                </button>

                {extensionActions.map(action => {
                    if (action.condition && !action.condition(activeGame)) return null;
                    const IconComponent = (action.icon && {
                        'puzzle': Puzzle,
                        'image': ImageIcon,
                        'user': User,
                        'camera': Camera,
                        'palette': Palette,
                        'edit': Edit,
                        'settings': Settings
                    }[action.icon.toLowerCase()]) || Puzzle;
                    
                    return (
                        <button
                            key={action.id}
                            className={styles.iconBtnLarge}
                            onClick={() => {
                                if (typeof action.callback === 'function') {
                                    action.callback(activeGame);
                                } else if (typeof action.callback === 'string') {
                                    console.warn("Extension action callback is not a function", action);
                                }
                            }}
                            title={action.label}
                            style={{ gap: '10px' }}
                        >
                            <IconComponent size={22} />
                            <span style={{ fontSize: '16px', fontWeight: '600' }}>{action.label}</span>
                        </button>
                    );
                })}
              </div>
            ) : (
              <div id="install-section" className={styles.installSection}>
                <div className={styles.installButtons}>
                  <button id="locate-button" className={styles.locateButton} onClick={onLocateGame}>
                    <FolderSearch size={16} /> {t('game_details.locate_game')}
                  </button>
                  {extensionActions.length > 0 && (
                    <div style={{ display: 'flex', gap: '10px', marginLeft: '10px', flexWrap: 'wrap' }}>
                        {extensionActions.map(action => {
                            if (action.condition && !action.condition(activeGame)) return null;
                            const IconComponent = (action.icon && {
                                'puzzle': Puzzle,
                                'image': ImageIcon,
                                'user': User,
                                'camera': Camera,
                                'palette': Palette,
                                'edit': Edit,
                                'settings': Settings
                            }[action.icon.toLowerCase()]) || Puzzle;

                            return (
                                <button
                                    key={action.id}
                                    className={styles.iconBtnLarge}
                                    onClick={() => {
                                        if (typeof action.callback === 'function') {
                                            action.callback(activeGame);
                                        }
                                    }}
                                    title={action.label}
                                    style={{ gap: '10px' }}
                                >
                                    <IconComponent size={20} />
                                    <span style={{ fontSize: '14px', fontWeight: '600' }}>{action.label}</span>
                                </button>
                            );
                        })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div id="game-details-grid" className={styles.gameDetailsGrid}>
        <div className={styles.detailCard}>
          <h4>{t('game_details.game_version')}</h4>
          <p>{activeGame.version}</p>
          {detectedVersion && (
            <p className={!isVersionCompatible ? styles.errorText : ''} style={isVersionCompatible ? { fontSize: '0.8em', color: '#888', marginTop: '4px' } : { fontSize: '0.9em', marginTop: '4px' }}>
              {t('game_details.detected_version', { version: detectedVersion })} {!isVersionCompatible && t('game_details.incompatible')}
            </p>
          )}
        </div>
        <div className={styles.detailCard}>
          <h4>{t('game_details.installation_path')}</h4>
          <p className={styles.pathText} title={currentPath || t('game_details.not_installed')}>
            {currentPath || t('game_details.not_installed')}
          </p>
          {currentPath && (
            <button className={styles.removePathBtn} onClick={onForgetGame}>{t('game_details.remove')}</button>
          )}
        </div>
      </div>

      {extensionWidgets.length > 0 && (
          <div id="extension-widgets-area" style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {extensionWidgets.map(widget => (
                  <div key={widget.id} id={widget.id} className="extension-widget" style={{
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid rgba(255,255,255,0.05)',
                      borderRadius: '8px',
                      padding: '15px'
                  }}>
                      {widget.title && <h4 style={{ margin: '0 0 10px 0', color: '#f8b700' }}>{widget.title}</h4>}
                      <div dangerouslySetInnerHTML={{ __html: widget.content }} />
                  </div>
              ))}
          </div>
      )}
    </div>
  );
};

export default GameDetails;
