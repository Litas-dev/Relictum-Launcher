import React, { useState, useEffect } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import styles from './Dashboard.module.css';
import { games } from '../../config/games';
import ipcRenderer from '../../utils/ipc';
import PluginStore from '../../utils/PluginStore';
import { Users, Dices } from 'lucide-react';
import titleImage from '../../assets/logo-new-white.png';

const Dashboard = ({ games, onGameSelect, settings, user }) => {
  const { t } = useTranslation();
  
  // User Profile Edit State
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');

  const handleStartEdit = () => {
    if (user && user.userProfile) {
      setTempName(user.userProfile.username);
      setIsEditingName(true);
    }
  };

  const handleSaveName = () => {
    if (user && user.updateUsername) {
      user.updateUsername(tempName);
    }
    setIsEditingName(false);
  };

  const handleRandomize = () => {
    if (user && user.generateRandomName) {
      const newName = user.generateRandomName();
      setTempName(newName);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSaveName();
    if (e.key === 'Escape') setIsEditingName(false);
  };

  // Plugin Image Overrides
  const [gameOverrides, setGameOverrides] = useState({});

  useEffect(() => {
    const update = () => {
        const overrides = {};
        games.forEach(g => {
            overrides[g.id] = PluginStore.getGameImages(g.id);
        });
        setGameOverrides(overrides);
    };
    update();
    return PluginStore.subscribe(update);
  }, [games]);

  const enableGlows = settings?.enableGlowEffects !== false; // Default to true if undefined
  const glowClass = enableGlows ? '' : styles.disableGlow;

  // Helper: Retrieve game icon from configuration
  const getGameIcon = (id) => {
    if (gameOverrides[id] && gameOverrides[id].clientIcon) {
        return gameOverrides[id].clientIcon;
    }
    const game = games.find(g => g.id === id);
    return game ? game.clientIcon : null;
  };

  const classicIcon = getGameIcon('classic');
  const tbcIcon = getGameIcon('tbc');
  const wotlkIcon = getGameIcon('wotlk');

  return (
    <div className={styles.dashboardView}>
      <div className={styles.heroSection}>
        <img src={titleImage} alt="Relictum Logo" className={styles.titleImage} />
        
        {/* Welcome Message */}
        {user && user.userProfile && (
          <div className={styles.welcomeContainer}>
            <span className={styles.welcomeText}>{t('dashboard.welcome_back', 'Welcome back')}, </span>
            <div className={styles.userTag}>
              {isEditingName ? (
                <div className={styles.editContainer}>
                  <input 
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    onBlur={handleSaveName}
                    onKeyDown={handleKeyDown}
                    autoFocus
                    className={styles.nameInput}
                    maxLength={20}
                  />
                  <button 
                    className={styles.randomButton}
                    onMouseDown={(e) => { e.preventDefault(); handleRandomize(); }}
                    title={t('dashboard.random_name', 'Randomize Name')}
                  >
                    <Dices size={20} />
                  </button>
                </div>
              ) : (
                <span 
                  className={styles.username} 
                  onClick={handleStartEdit}
                  title={t('dashboard.click_to_edit', 'Click to edit name')}
                >
                  {user.userProfile.username}
                </span>
              )}
            </div>
          </div>
        )}

        <p className={styles.heroDescription}>
          <Trans i18nKey="dashboard.hero_description">
            Cross the threshold. Here, you hold the keys to realms of legend. <br/>
            Manage your worlds, tailor your journey, and carve your name into a history that is yours to write.
          </Trans>
        </p>

        <div className={styles.supportedGamesPreview}>
          <div 
            className={`${styles.gameIconCard} ${glowClass}`} 
            onClick={() => onGameSelect && onGameSelect('classic')}
            style={{ cursor: 'pointer' }}
          >
            <div className={`${styles.iconGlow} ${styles.iconGlowClassic}`}>
              {classicIcon && (
                <img 
                  src={classicIcon} 
                  alt="Classic" 
                  className={`${styles.gameIcon} ${styles.gameIconClassic}`} 
                />
              )}
            </div>
            <span className={`${styles.versionLabel} ${styles.versionLabelClassic}`}>1.12</span>
          </div>

          <div 
            className={`${styles.gameIconCard} ${glowClass}`}
            onClick={() => onGameSelect && onGameSelect('tbc')}
            style={{ cursor: 'pointer' }}
          >
            <div className={`${styles.iconGlow} ${styles.iconGlowTbc}`}>
              {tbcIcon && (
                <img 
                  src={tbcIcon} 
                  alt="TBC" 
                  className={`${styles.gameIcon} ${styles.gameIconTbc}`} 
                />
              )}
            </div>
            <span className={`${styles.versionLabel} ${styles.versionLabelTbc}`}>2.4.3</span>
          </div>

          <div 
            className={`${styles.gameIconCard} ${glowClass}`}
            onClick={() => onGameSelect && onGameSelect('wotlk')}
            style={{ cursor: 'pointer' }}
          >
            <div className={`${styles.iconGlow} ${styles.iconGlowWotlk}`}>
              {wotlkIcon && (
                <img 
                  src={wotlkIcon} 
                  alt="WotLK" 
                  className={`${styles.gameIcon} ${styles.gameIconWotlk}`} 
                />
              )}
            </div>
            <span className={`${styles.versionLabel} ${styles.versionLabelWotlk}`}>3.3.5</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
