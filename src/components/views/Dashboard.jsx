import React from 'react';
import styles from './Dashboard.module.css';
import { games } from '../../config/games';
import ipcRenderer from '../../utils/ipc';
import { Users, ExternalLink } from 'lucide-react';

const Dashboard = ({ games, onGameSelect }) => {
  // Helper: Retrieve game icon from configuration
  const getGameIcon = (id) => {
    const game = games.find(g => g.id === id);
    return game ? game.clientIcon : null;
  };

  const handleJoinCommunity = () => {
    ipcRenderer.send('open-external', 'https://www.reddit.com/r/AzerothLegacy/');
  };

  const classicIco = getGameIcon('classic');
  const tbcIco = getGameIcon('tbc');
  const wotlkIco = getGameIcon('wotlk');

  return (
    <div className={styles.dashboardView}>
      <div className={styles.heroSection}>
        <div className={styles.heroBadge}>WELCOME TO</div>
        <h1 className={styles.title}>AZEROTH LEGACY LAUNCHER</h1>
        <p className={styles.heroDescription}>
          A new experience with private servers. <br/>
          Seamlessly manage your clients, addons, and gameplay in one unified hub.
        </p>

        <button className={styles.communityButton} onClick={handleJoinCommunity}>
          <Users size={20} />
          <span>Join Community</span>
          <ExternalLink size={16} style={{ opacity: 0.7 }} />
        </button>

        <div className={styles.supportedGamesPreview}>
          <div 
            className={styles.gameIconCard} 
            onClick={() => onGameSelect && onGameSelect('classic')}
            style={{ cursor: 'pointer' }}
          >
            <div className={`${styles.iconGlow} ${styles.iconGlowClassic}`}>
              <img 
                src={classicIco} 
                alt="Classic" 
                className={`${styles.gameIcon} ${styles.gameIconClassic}`} 
              />
            </div>
            <span className={`${styles.versionLabel} ${styles.versionLabelClassic}`}>1.12</span>
          </div>

          <div 
            className={styles.gameIconCard}
            onClick={() => onGameSelect && onGameSelect('tbc')}
            style={{ cursor: 'pointer' }}
          >
            <div className={`${styles.iconGlow} ${styles.iconGlowTbc}`}>
              <img 
                src={tbcIco} 
                alt="TBC" 
                className={`${styles.gameIcon} ${styles.gameIconTbc}`} 
              />
            </div>
            <span className={`${styles.versionLabel} ${styles.versionLabelTbc}`}>2.4.3</span>
          </div>

          <div 
            className={styles.gameIconCard}
            onClick={() => onGameSelect && onGameSelect('wotlk')}
            style={{ cursor: 'pointer' }}
          >
            <div className={`${styles.iconGlow} ${styles.iconGlowWotlk}`}>
              <img 
                src={wotlkIco} 
                alt="WotLK" 
                className={`${styles.gameIcon} ${styles.gameIconWotlk}`} 
              />
            </div>
            <span className={`${styles.versionLabel} ${styles.versionLabelWotlk}`}>3.3.5</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
