import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Shield, ExternalLink, Users, Edit, Globe, Puzzle, Trash2, Palette, Music, RefreshCw, CheckCircle } from 'lucide-react';
import styles from './About.module.css';
import PluginStore from '../../utils/PluginStore';

const About = ({ appVersion, integrityStatus, integrityHash }) => {
  const { t } = useTranslation();
  const [pluginWidgets, setPluginWidgets] = useState([]);

  useEffect(() => {
    const updateWidgets = () => {
        setPluginWidgets([...PluginStore.getAboutWidgets()]);
    };

    const unsubscribe = PluginStore.subscribe(updateWidgets);
    updateWidgets();
    return unsubscribe;
  }, []);

  const openLink = (url) => {
    window.open(url, '_blank');
  };

  return (
    <div className={styles.aboutView}>
      <div className={styles.header}>
        <h2>{t('about.title')} <span className={styles.versionTag}>v{appVersion || '3.0.1'}</span></h2>
      </div>

      <div className={`${styles.securityCard} ${styles[integrityStatus] || styles.secure}`} id="system-integrity-check">
        <div className={styles.securityHeader}>
          <Shield size={40} className={styles.shieldIcon} />
          <div className={styles.securityInfo}>
            <h3 className={styles.securityTitle}>
              {integrityStatus === 'secure' ? t('about.secure_verified') : 
               integrityStatus === 'warning' ? t('about.security_warning') : 
               t('about.security_risk')}
            </h3>
            <span className={styles.securitySubtitle}>
              {integrityStatus === 'secure' ? t('about.protected') : 
               integrityStatus === 'warning' ? t('about.hash_mismatch') : 
               t('about.integrity_compromised')}
            </span>
          </div>
        </div>
        
        <div className={styles.hashSection}>
          <label className={styles.hashLabel}>{t('about.local_hash')}</label>
          <code className={styles.hashCode}>
            {integrityHash || 'e7c9b5a628a7007f5a9635cc83f593461757dcff7580fa0dbd67a5f02e9ea6be'}
          </code>
        </div>
        
        <button className={styles.verifyLink} onClick={() => openLink('https://github.com/Litas-dev/Relictum-Launcher')}>
          <ExternalLink size={12} style={{marginRight: '5px'}}/> {t('about.verify_github')}
        </button>
      </div>

      <div className={styles.gameList}>
        <div className={styles.gameItem}>
          <div className={styles.gameIconWrapper}><Users size={24} color="#fbbf24" /></div>
          <div className={styles.gameInfo}>
            <h4>{t('about.manage_clients')}</h4>
            <span>{t('about.manage_clients_desc')}</span>
          </div>
        </div>

        <div className={styles.gameItem}>
          <div className={styles.gameIconWrapper}><Edit size={24} color="#fbbf24" /></div>
          <div className={styles.gameInfo}>
            <h4>{t('about.rename_clients')}</h4>
            <span>{t('about.rename_clients_desc')}</span>
          </div>
        </div>

        <div className={styles.gameItem}>
          <div className={styles.gameIconWrapper}><Globe size={24} color="#fbbf24" /></div>
          <div className={styles.gameInfo}>
            <h4>{t('about.realmlist_editor')}</h4>
            <span>{t('about.realmlist_editor_desc')}</span>
          </div>
        </div>

        <div className={styles.gameItem}>
          <div className={styles.gameIconWrapper}><Puzzle size={24} color="#fbbf24" /></div>
          <div className={styles.gameInfo}>
            <h4>{t('about.addons_manager')}</h4>
            <span>{t('about.addons_manager_desc')}</span>
          </div>
        </div>

        <div className={styles.gameItem}>
          <div className={styles.gameIconWrapper}><Trash2 size={24} color="#fbbf24" /></div>
          <div className={styles.gameInfo}>
            <h4>{t('about.cache_cleanup')}</h4>
            <span>{t('about.cache_cleanup_desc')}</span>
          </div>
        </div>

        <div className={styles.gameItem}>
          <div className={styles.gameIconWrapper}><Palette size={24} color="#fbbf24" /></div>
          <div className={styles.gameInfo}>
            <h4>{t('about.theme_selector')}</h4>
            <span>{t('about.theme_selector_desc')}</span>
          </div>
        </div>

        <div className={styles.gameItem}>
          <div className={styles.gameIconWrapper}><Music size={24} color="#fbbf24" /></div>
          <div className={styles.gameInfo}>
            <h4>{t('about.ambient_music')}</h4>
            <span>{t('about.ambient_music_desc')}</span>
          </div>
        </div>

        <div className={styles.gameItem}>
          <div className={styles.gameIconWrapper}><CheckCircle size={24} color="#fbbf24" /></div>
          <div className={styles.gameInfo}>
            <h4>{t('about.integrity_check')}</h4>
            <span>{t('about.integrity_check_desc')}</span>
          </div>
        </div>

        <div className={styles.gameItem}>
          <div className={styles.gameIconWrapper}><RefreshCw size={24} color="#fbbf24" /></div>
          <div className={styles.gameInfo}>
            <h4>{t('about.update_awareness')}</h4>
            <span>{t('about.update_awareness_desc')}</span>
          </div>
        </div>
      </div>

      {pluginWidgets.length > 0 && (
        <div className={styles.pluginWidgetsSection}>
          {pluginWidgets.map(widget => (
            <div key={widget.id} className={styles.pluginWidget}>
              {widget.title && <h3>{widget.title}</h3>}
              <div dangerouslySetInnerHTML={{ __html: widget.content }} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default About;
