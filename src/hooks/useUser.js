import { useState, useEffect } from 'react';

const ADJECTIVES = [
  'Ancient', 'Arcane', 'Azure', 'Bitter', 'Black', 'Blessed', 'Blood', 'Bone', 
  'Brave', 'Bright', 'Broken', 'Burning', 'Chaos', 'Cold', 'Crimson', 'Crystal',
  'Dark', 'Deadly', 'Divine', 'Dread', 'Dusk', 'Ebon', 'Elder', 'Ember', 
  'Eternal', 'Fallen', 'Fel', 'Fierce', 'Fiery', 'Frost', 'Frozen', 'Ghost',
  'Glorious', 'Golden', 'Grand', 'Green', 'Grim', 'Hollow', 'Holy', 'Ice',
  'Iron', 'Jade', 'Lost', 'Lunar', 'Magic', 'Mist', 'Moon', 'Mystic',
  'Nether', 'Night', 'Noble', 'Obsidian', 'Pale', 'Plague', 'Primal', 'Pure',
  'Radiant', 'Rapid', 'Red', 'Rune', 'Savage', 'Shadow', 'Silent', 'Silver',
  'Solar', 'Soul', 'Spectral', 'Spirit', 'Star', 'Steel', 'Stone', 'Storm',
  'Sun', 'Swift', 'Thunder', 'Twilight', 'Undead', 'Vengeful', 'Violet', 'Void',
  'War', 'Wild', 'Wind', 'Winter', 'Wrath'
];

const NOUNS = [
  'Arrow', 'Axe', 'Bane', 'Baron', 'Bear', 'Beast', 'Blade', 'Blood',
  'Bolt', 'Bow', 'Bringer', 'Caller', 'Caster', 'Champion', 'Claw', 'Core',
  'Crow', 'Crown', 'Crusher', 'Dagger', 'Dawn', 'Demon', 'Doom', 'Drake',
  'Dragon', 'Dream', 'Druid', 'Duke', 'Dusk', 'Eagle', 'Edge', 'Eye',
  'Fang', 'Fire', 'Fist', 'Flame', 'Force', 'Forge', 'Fury', 'Ghost',
  'Giant', 'Gladiator', 'Grave', 'Guard', 'Guardian', 'Hammer', 'Hand', 'Hawk',
  'Heart', 'Helm', 'Hero', 'Horn', 'Hunter', 'Keeper', 'King', 'Knight',
  'Legend', 'Light', 'Lion', 'Lord', 'Mage', 'Maker', 'Master', 'Might',
  'Moon', 'Nova', 'Oath', 'Oracle', 'Paladin', 'Peak', 'Phoenix', 'Priest',
  'Queen', 'Rage', 'Ranger', 'Raven', 'Reaper', 'Rider', 'Rogue', 'Rose',
  'Saber', 'Sage', 'Scout', 'Seer', 'Shade', 'Shadow', 'Shaman', 'Shard',
  'Shield', 'Singer', 'Slayer', 'Soul', 'Spark', 'Spear', 'Spell', 'Spirit',
  'Star', 'Steel', 'Stone', 'Storm', 'Strider', 'Strike', 'Sun', 'Sword',
  'Talon', 'Terror', 'Thorn', 'Thunder', 'Tiger', 'Titan', 'Totem', 'Touch',
  'Tracker', 'Vanguard', 'Walker', 'Warden', 'Warlock', 'Warrior', 'Watcher', 'Wave',
  'Weaver', 'Whisper', 'Wind', 'Wing', 'Wolf', 'Wrath'
];

const generateRandomName = () => {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${adj}${noun}`;
};

const generateDiscriminator = () => {
  return Math.floor(1000 + Math.random() * 9000).toString(); // 1000-9999
};

export const useUser = (options = {}) => {
  const { autoCreate = true } = options;
  const [userProfile, setUserProfile] = useState({
    username: '',
    discriminator: '',
    status: 'online', // online, away, busy, offline
    isAutoAway: false // Track if away was set automatically
  });

  useEffect(() => {
    const loadProfile = () => {
      const savedProfile = localStorage.getItem('user_profile');
      if (savedProfile) {
        try {
          const parsed = JSON.parse(savedProfile);
          if (parsed.username && parsed.discriminator) {
            // Ensure status exists in old profiles
            if (!parsed.status) parsed.status = 'online';
            setUserProfile(prev => ({ ...prev, ...parsed }));
          } else {
            if (autoCreate) createNewProfile();
          }
        } catch (e) {
          if (autoCreate) createNewProfile();
        }
      } else {
        if (autoCreate) createNewProfile();
      }
    };

    // Load immediately
    loadProfile();

    // Also poll specifically for Social Window which might miss storage events
    // if the profile is created in the main window milliseconds before this opens
    const pollInterval = setInterval(() => {
        const savedProfile = localStorage.getItem('user_profile');
        if (savedProfile) {
             const parsed = JSON.parse(savedProfile);
             setUserProfile(prev => {
                 if (prev.username !== parsed.username) {
                     return { ...prev, ...parsed };
                 }
                 return prev;
             });
        }
    }, 1000);

    // Listen for changes from other windows (e.g., Main Window -> Social Window)
    const handleStorageChange = (e) => {
      if (e.key === 'user_profile') {
        loadProfile();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
        window.removeEventListener('storage', handleStorageChange);
        clearInterval(pollInterval);
    };
  }, [autoCreate]); // Add autoCreate dependency

  // Idle Detection Logic
  useEffect(() => {
    const IDLE_TIMEOUT = 5 * 60 * 1000; // 5 minutes
    let activityTimeout = null;

    const handleActivity = () => {
      // Update last active time
      const now = Date.now();
      const lastActive = parseInt(localStorage.getItem('last_active') || '0');
      
      // Throttle localStorage writes (only write if > 10s has passed)
      if (now - lastActive > 10000) {
        localStorage.setItem('last_active', now.toString());
      }

      // If we were auto-away, switch back to online
      if (userProfile.status === 'away' && userProfile.isAutoAway) {
        updateStatus('online', false);
      }
    };

    const checkIdle = () => {
      const now = Date.now();
      const lastActive = parseInt(localStorage.getItem('last_active') || '0');
      
      // If idle for > 5 mins AND currently online
      if (now - lastActive > IDLE_TIMEOUT && userProfile.status === 'online') {
        updateStatus('away', true);
      }
    };

    // Attach listeners
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);

    // Check idle status every 10 seconds
    const intervalId = setInterval(checkIdle, 10000);

    // Initial last active set
    localStorage.setItem('last_active', Date.now().toString());

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      clearInterval(intervalId);
    };
  }, [userProfile]); // Depend on full userProfile to ensure closures have latest data

  const createNewProfile = () => {
    const newProfile = {
      username: generateRandomName(),
      discriminator: generateDiscriminator(),
      status: 'online',
      isAutoAway: false
    };
    saveProfile(newProfile);
  };

  const saveProfile = (profile) => {
    // Safety check: Don't save if username is missing/empty
    if (!profile.username || profile.username.trim() === '') {
      console.warn('Attempted to save invalid profile:', profile);
      return;
    }
    setUserProfile(profile);
    localStorage.setItem('user_profile', JSON.stringify(profile));
  };

  const updateStatus = (newStatus, isAuto = false) => {
    const updatedProfile = {
      ...userProfile,
      status: newStatus,
      isAutoAway: isAuto
    };
    saveProfile(updatedProfile);
  };

  const updateUsername = (newUsername) => {
    if (!newUsername || newUsername.trim().length === 0) return;
    
    // If name didn't change, do nothing
    if (newUsername.trim() === userProfile.username) return;

    const updatedProfile = {
      ...userProfile,
      username: newUsername.trim()
    };
    saveProfile(updatedProfile);
  };

  return {
    userProfile,
    updateUsername,
    updateStatus,
    generateRandomName
  };
};
