// save-data-manager-fixed.js - Fixed localStorage quota management
'use strict';

/**
 * Fixed Save Data Manager with better storage management
 */
const SaveDataManager = {
  VERSION: '4.1.0',
  COMPATIBILITY_VERSIONS: ['4.0.0', '4.0.1', '4.1.0'],
  SAVE_KEY: 'nflGM4.league',
  BACKUP_KEY_PREFIX: 'nflGM4.backup.',
  MAX_BACKUPS: 2, // Reduced to save space
  BACKUP_COOLDOWN: 60000, // 1 minute between automatic backups
  
  // More conservative storage limits
  GAME_STORAGE_LIMIT: 3 * 1024 * 1024, // 3MB for game data only
  EMERGENCY_THRESHOLD: 0.9, // Trigger cleanup at 90% usage
  
  lastAutoBackupTime: 0,
  
  /**
   * Get storage usage for this game only (more accurate)
   */
  getGameStorageUsage() {
    let gameSize = 0;
    
    try {
      // Check main save
      const mainSave = localStorage.getItem(this.SAVE_KEY);
      if (mainSave) {
        gameSize += mainSave.length + this.SAVE_KEY.length;
      }
      
      // Check all backups
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.BACKUP_KEY_PREFIX)) {
          const item = localStorage.getItem(key);
          if (item) {
            gameSize += item.length + key.length;
          }
        }
      }
      
      // Check for old version data
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('nflGM') && !key.startsWith('nflGM4.')) {
          const item = localStorage.getItem(key);
          if (item) {
            gameSize += item.length + key.length;
          }
        }
      }
      
    } catch (error) {
      console.warn('Error calculating game storage usage:', error);
    }
    
    return gameSize;
  },
  
  /**
   * Check available localStorage space more accurately
   */
  getAvailableSpace() {
    try {
      // Test by trying to store a temporary item
      const testData = 'x'.repeat(1024); // 1KB test
      const testKey = 'nflGM4.storage_test';
      
      localStorage.setItem(testKey, testData);
      localStorage.removeItem(testKey);
      
      // If test succeeded, we have at least 1KB available
      // Now get more precise measurement
      const currentUsage = this.getGameStorageUsage();
      return Math.max(0, this.GAME_STORAGE_LIMIT - currentUsage);
      
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        return 0; // No space available
      }
      console.warn('Error checking available space:', error);
      return this.GAME_STORAGE_LIMIT * 0.1; // Assume 10% available if we can't check
    }
  },
  
  /**
   * Enhanced save function with better error handling
   */
  save(gameState = null, options = {}) {
    try {
      const stateToSave = gameState || window.state;
      if (!stateToSave) {
        return { success: false, error: 'No game state to save' };
      }
      
      // Prepare save data first to check size
      const cleanData = this.prepareSaveData(stateToSave);
      const savePackage = {
        version: this.VERSION,
        timestamp: new Date().toISOString(),
        gameData: cleanData,
        metadata: {
          playerName: stateToSave.player?.name || 'GM',
          teamName: this.getUserTeamName(stateToSave),
          season: stateToSave.league?.year || 2025,
          week: stateToSave.league?.week || 1,
          gameMode: stateToSave.gameMode || 'gm'
        }
      };
      
      const serialized = JSON.stringify(savePackage);
      const requiredSpace = serialized.length * 1.2; // Add 20% buffer
      
      console.log(`Save size: ${this.formatBytes(serialized.length)}, Required space: ${this.formatBytes(requiredSpace)}`);
      
      // Check if we have enough space
      const availableSpace = this.getAvailableSpace();
      console.log(`Available space: ${this.formatBytes(availableSpace)}`);
      
      if (requiredSpace > availableSpace) {
        console.warn('Insufficient space, performing aggressive cleanup...');
        
        // Perform aggressive cleanup
        this.performAggressiveCleanup();
        
        // Check again after cleanup
        const newAvailableSpace = this.getAvailableSpace();
        console.log(`Space after cleanup: ${this.formatBytes(newAvailableSpace)}`);
        
        if (requiredSpace > newAvailableSpace) {
          return { 
            success: false, 
            error: `Not enough storage space. Need ${this.formatBytes(requiredSpace)}, have ${this.formatBytes(newAvailableSpace)}` 
          };
        }
      }
      
      // Try to save
      try {
        localStorage.setItem(this.SAVE_KEY, serialized);
      } catch (storageError) {
        if (storageError.name === 'QuotaExceededError') {
          // Last resort - remove ALL backups and try again
          this.removeAllBackups();
          localStorage.setItem(this.SAVE_KEY, serialized);
        } else {
          throw storageError;
        }
      }
      
      // Create backup only if we have sufficient space and it's requested
      if (options.createBackup !== false && this.shouldCreateAutoBackup()) {
        this.createAutomaticBackupSafe(savePackage);
      }
      
      console.log('✅ Game saved successfully');
      
      return { 
        success: true, 
        version: this.VERSION,
        timestamp: savePackage.timestamp,
        size: this.formatBytes(serialized.length)
      };
      
    } catch (error) {
      console.error('Save failed:', error);
      return { success: false, error: error.message };
    }
  },
  
  /**
   * Perform aggressive cleanup to free space
   */
  performAggressiveCleanup() {
    console.log('🧹 Performing aggressive cleanup...');
    
    let spaceCleaned = 0;
    
    // 1. Remove all automatic backups first
    const backups = this.getBackups();
    const autoBackups = backups.filter(b => b.type === 'automatic');
    
    autoBackups.forEach(backup => {
      const item = localStorage.getItem(backup.key);
      if (item) {
        spaceCleaned += item.length + backup.key.length;
        localStorage.removeItem(backup.key);
      }
    });
    
    console.log(`Removed ${autoBackups.length} automatic backups, freed ${this.formatBytes(spaceCleaned)}`);
    
    // 2. Keep only the most recent manual backup
    const manualBackups = backups.filter(b => b.type === 'manual')
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    if (manualBackups.length > 1) {
      const toRemove = manualBackups.slice(1);
      toRemove.forEach(backup => {
        const item = localStorage.getItem(backup.key);
        if (item) {
          spaceCleaned += item.length + backup.key.length;
          localStorage.removeItem(backup.key);
        }
      });
      console.log(`Kept 1 manual backup, removed ${toRemove.length}`);
    }
    
    // 3. Remove any old version data
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.startsWith('nflGM') && !key.startsWith('nflGM4.')) {
        const item = localStorage.getItem(key);
        if (item) {
          spaceCleaned += item.length + key.length;
          localStorage.removeItem(key);
        }
      }
    }
    
    // 4. Remove any other game-related temporary data
    const tempKeys = ['nflGM4.temp', 'nflGM4.cache', 'nflGM4.debug'];
    tempKeys.forEach(key => {
      if (localStorage.getItem(key)) {
        const item = localStorage.getItem(key);
        spaceCleaned += item.length + key.length;
        localStorage.removeItem(key);
      }
    });
    
    console.log(`✅ Aggressive cleanup completed, total space freed: ${this.formatBytes(spaceCleaned)}`);
  },
  
  /**
   * Remove all backups (emergency measure)
   */
  removeAllBackups() {
    console.log('🚨 Emergency: Removing ALL backups to free space');
    
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.BACKUP_KEY_PREFIX)) {
        localStorage.removeItem(key);
      }
    }
  },
  
  /**
   * Create automatic backup only if safe to do so
   */
  createAutomaticBackupSafe(savePackage) {
    try {
      // Only create backup if we have sufficient space
      const backupSize = JSON.stringify(savePackage).length * 1.2; // 20% buffer
      const availableSpace = this.getAvailableSpace();
      
      if (backupSize < availableSpace * 0.3) { // Only if backup uses less than 30% of available space
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupKey = `${this.BACKUP_KEY_PREFIX}auto_${timestamp}`;
        
        const backupData = JSON.stringify({
          ...savePackage,
          backupType: 'automatic',
          backupTimestamp: new Date().toISOString()
        });
        
        localStorage.setItem(backupKey, backupData);
        this.lastAutoBackupTime = Date.now();
        
        // Immediately cleanup old backups to maintain limit
        this.cleanupOldBackups();
        
        console.log('✅ Automatic backup created');
      } else {
        console.log('⚠️  Skipped automatic backup - insufficient space');
      }
      
    } catch (error) {
      console.warn('Automatic backup failed:', error.message);
      // Don't throw error - backup failure shouldn't prevent saving
    }
  },
  
  /**
   * Improved data preparation that's more aggressive about size reduction
   */
  prepareSaveData(gameState) {
    // Create a clean copy
    const cleanData = JSON.parse(JSON.stringify(gameState));
    
    // More aggressive cleanup to reduce size
    if (cleanData.league && cleanData.league.teams) {
      cleanData.league.teams.forEach(team => {
        // Remove all computed properties
        delete team.winPercentage;
        delete team.gamesPlayed;
        delete team.remaining;
        delete team.pointDifferential;
        delete team.divisionRank;
        delete team.conferenceRank;
        delete team.playoffSeed;
        delete team.scheduleCache;
        delete team.standingsCache;
        delete team.statsCache;
        
        // Clean player data more aggressively
        if (team.roster) {
          team.roster.forEach(player => {
            // Remove all temporary and computed data
            delete player.tempStats;
            delete player.displayData;
            delete player.projectedStats;
            delete player.seasonStats;
            delete player.careerStats;
            delete player.developmentHistory;
            delete player.injuryHistory;
            delete player.awardsHistory;
            delete player.contractHistory;
            
            // Only keep essential contract data
            if (player.years <= 0) {
              delete player.baseAnnual;
              delete player.signingBonus;
              delete player.guaranteedYears;
            }
          });
        }
        
        // Reduce staff data
        if (team.staff) {
          Object.values(team.staff).forEach(staff => {
            if (staff && staff.stats) {
              // Keep only essential coaching stats
              if (staff.stats.careerHistory) {
                staff.stats.careerHistory = staff.stats.careerHistory.slice(-5); // Keep only last 5 years
              }
            }
          });
        }
      });
      
      // Clean league-wide data
      if (cleanData.league.schedule) {
        delete cleanData.league.schedule.cache;
        delete cleanData.league.schedule.standingsCache;
      }
      
      // Remove large historical data if present
      if (cleanData.league.history) {
        // Keep only recent history
        cleanData.league.history = cleanData.league.history.slice(-3);
      }
      
      // Clean free agents
      if (cleanData.freeAgents) {
        cleanData.freeAgents.forEach(player => {
          delete player.tempStats;
          delete player.displayData;
          delete player.projectedStats;
          delete player.seasonStats;
          delete player.careerStats;
        });
      }
      
      // Clean draft prospects
      if (cleanData.draftProspects) {
        cleanData.draftProspects.forEach(prospect => {
          delete prospect.scoutingReports;
          delete prospect.workoutResults;
          delete prospect.displayData;
        });
      }
    }
    
    return cleanData;
  },
  
  /**
   * Enhanced load function with better error recovery
   */
  load() {
    try {
      const saved = localStorage.getItem(this.SAVE_KEY);
      if (!saved) {
        return { success: false, error: 'No save data found' };
      }
      
      const savePackage = JSON.parse(saved);
      
      // Check version compatibility
      if (!this.isVersionCompatible(savePackage.version)) {
        return { 
          success: false, 
          error: `Save version ${savePackage.version} is not compatible`,
          needsMigration: true,
          saveVersion: savePackage.version
        };
      }
      
      // Migrate if necessary
      let gameData = savePackage.gameData;
      if (savePackage.version !== this.VERSION) {
        console.log(`Migrating save from ${savePackage.version} to ${this.VERSION}`);
        gameData = this.migrateSaveData(gameData, savePackage.version);
      }
      
      console.log('✅ Game loaded successfully');
      
      return { 
        success: true, 
        gameData: gameData,
        metadata: savePackage.metadata,
        version: savePackage.version
      };
      
    } catch (error) {
      console.error('Load failed:', error);
      
      // Try to recover from backup
      const backups = this.getBackups();
      if (backups.length > 0) {
        console.log('Attempting to recover from most recent backup...');
        const mostRecent = backups[0];
        
        try {
          const backupData = localStorage.getItem(mostRecent.key);
          const backup = JSON.parse(backupData);
          
          return {
            success: true,
            gameData: backup.gameData,
            metadata: backup.metadata,
            version: backup.version,
            recoveredFromBackup: true
          };
          
        } catch (backupError) {
          console.error('Backup recovery failed:', backupError);
        }
      }
      
      return { success: false, error: 'Save data is corrupted: ' + error.message };
    }
  },
  
  /**
   * Check if should create automatic backup (with longer cooldown)
   */
  shouldCreateAutoBackup() {
    const now = Date.now();
    const timeSinceLastBackup = now - this.lastAutoBackupTime;
    return timeSinceLastBackup >= this.BACKUP_COOLDOWN;
  },
  
  /**
   * Get backups with size information
   */
  getBackups() {
    const backups = [];
    
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.BACKUP_KEY_PREFIX)) {
          try {
            const backupData = localStorage.getItem(key);
            const backup = JSON.parse(backupData);
            
            backups.push({
              key: key,
              timestamp: backup.timestamp || backup.backupTimestamp,
              metadata: backup.metadata,
              version: backup.version,
              type: backup.backupType || (key.includes('manual') ? 'manual' : 'automatic'),
              size: this.formatBytes(backupData.length)
            });
          } catch (error) {
            console.error('Error reading backup:', key, error);
            // Remove corrupted backup
            localStorage.removeItem(key);
          }
        }
      }
      
      // Sort by timestamp (newest first)
      backups.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
    } catch (error) {
      console.error('Error getting backups:', error);
    }
    
    return backups;
  },
  
  /**
   * Cleanup old backups more aggressively
   */
  cleanupOldBackups() {
    try {
      const backups = this.getBackups();
      const autoBackups = backups.filter(b => b.type === 'automatic');
      
      if (autoBackups.length > this.MAX_BACKUPS) {
        const toDelete = autoBackups.slice(this.MAX_BACKUPS);
        toDelete.forEach(backup => {
          localStorage.removeItem(backup.key);
        });
        
        console.log(`Cleaned up ${toDelete.length} old automatic backups`);
      }
      
      // Also limit manual backups to prevent storage bloat
      const manualBackups = backups.filter(b => b.type === 'manual');
      const MAX_MANUAL_BACKUPS = 3;
      
      if (manualBackups.length > MAX_MANUAL_BACKUPS) {
        const toDelete = manualBackups.slice(MAX_MANUAL_BACKUPS);
        toDelete.forEach(backup => {
          localStorage.removeItem(backup.key);
        });
        
        console.log(`Cleaned up ${toDelete.length} old manual backups`);
      }
      
    } catch (error) {
      console.error('Backup cleanup failed:', error);
    }
  },
  
  // ... (keeping other helper functions the same)
  
  isVersionCompatible(version) {
    return this.COMPATIBILITY_VERSIONS.includes(version);
  },
  
  migrateSaveData(gameData, fromVersion) {
    console.log(`Migrating save data from ${fromVersion} to ${this.VERSION}`);
    let migratedData = { ...gameData };
    
    if (fromVersion === '4.0.0') {
      migratedData = this.migrateFrom400(migratedData);
    }
    
    migratedData.version = this.VERSION;
    migratedData.lastMigration = {
      from: fromVersion,
      to: this.VERSION,
      timestamp: new Date().toISOString()
    };
    
    return migratedData;
  },
  
  migrateFrom400(data) {
    if (!data.settings) {
      data.settings = {
        autoSave: true,
        difficulty: 'normal',
        simSpeed: 'normal'
      };
    }
    return data;
  },
  
  getUserTeamName(gameState) {
    if (!gameState.league || !gameState.league.teams) {
      return 'Unknown Team';
    }
    
    const userTeamId = gameState.userTeamId || gameState.player?.teamId || 0;
    const team = gameState.league.teams[userTeamId];
    return team ? team.name : 'Unknown Team';
  },
  
  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  },
  
  /**
   * Get storage statistics with better accuracy
   */
  getStorageStats() {
    const stats = {
      gameUsage: 0,
      totalUsage: 0,
      saveSize: 0,
      backupsSize: 0,
      backupsCount: 0,
      availableSpace: 0
    };
    
    try {
      // Game-specific usage
      stats.gameUsage = this.getGameStorageUsage();
      stats.availableSpace = this.getAvailableSpace();
      
      // Save size
      const saveData = localStorage.getItem(this.SAVE_KEY);
      if (saveData) {
        stats.saveSize = saveData.length;
      }
      
      // Backups
      const backups = this.getBackups();
      stats.backupsCount = backups.length;
      backups.forEach(backup => {
        const backupData = localStorage.getItem(backup.key);
        if (backupData) {
          stats.backupsSize += backupData.length;
        }
      });
      
      // Total localStorage usage
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          stats.totalUsage += localStorage[key].length + key.length;
        }
      }
      
    } catch (error) {
      console.error('Error calculating storage stats:', error);
    }
    
    return stats;
  }
};

// Override the save/load functions
window.saveState = function(stateToSave) {
  const result = SaveDataManager.save(stateToSave);
  if (!result.success) {
    console.error('Save failed:', result.error);
    if (window.setStatus) {
      window.setStatus(`Save failed: ${result.error}`);
    }
  }
  return result;
};

window.loadState = function() {
  const result = SaveDataManager.load();
  if (!result.success) {
    console.error('Load failed:', result.error);
    if (result.recoveredFromBackup) {
      console.log('✅ Recovered from backup');
      if (window.setStatus) {
        window.setStatus('Save was corrupted, recovered from backup');
      }
    }
  }
  return result.success ? result.gameData : null;
};

// Make available globally
window.SaveDataManager = SaveDataManager;

console.log('✅ Fixed Save Data Manager loaded successfully');
