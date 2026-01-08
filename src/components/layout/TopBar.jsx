import React from 'react';
import { useTranslation } from 'react-i18next';
import { Minus, Square, X, Users } from 'lucide-react';
import styles from './TopBar.module.css';

const TopBar = ({ activeGame, onMinimize, onMaximize, onClose }) => {
    const { t } = useTranslation();
    return (
        <div className={styles.titleBar}>
            <div className={styles.appTitle}>
                {/* Optional: App Title or Breadcrumbs could go here */}
            </div>
            
            <div className={styles.rightControls}>
                <div className={styles.windowControls}>
                    <button onClick={onMinimize} className={styles.controlBtn} title={t('topbar.minimize')}>
                        <Minus size={16} strokeWidth={1.5} />
                    </button>
                    <button onClick={onMaximize} className={styles.controlBtn} title={t('topbar.maximize')}>
                        <Square size={12} strokeWidth={1.5} />
                    </button>
                    <button onClick={onClose} className={`${styles.controlBtn} ${styles.close}`} title={t('topbar.close')}>
                        <X size={16} strokeWidth={1.5} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TopBar;
