// save-data-manager.js - Advanced Save Data Management System
'use strict';

/**
 * Save Data Manager with versioning, backup/restore, and migration
 */
const SaveDataManager = {
  VERSION: '4.1.0',
  COMPATIBILITY_VERSIONS: ['4.0.0', '4.0.1', '4.1.0'], // Versions this can read
  SAVE_KEY: 'nflGM4.league',
  BACKUP_KEY_PREFIX: 'nflGM4.backup.',
  MAX_BACKUPS: 5,
  
  /**
   * Enhanced save function with versioning
   * @param {Object} gameState - Game state to save
   * @param {Object} options - Save options
   * @returns {Object} Save result
   */
  save(gameState = null, options = {}) {
    try {
      const stateToSave = gameState || window.state;
      if (!stateToSave) {
        return { success: false, error: 'No game state to save' };
      }
      
      // Create save package with metadata
      const savePackage = {
        version: this.VERSION,
        timestamp: new Date().toISOString(),
        gameData: this.prepareSaveData(stateToSave),
        metadata: {
          playerName: stateToSave.player?.name || 'GM',
          teamName: this.getUserTeamName(stateToSave),
          season: stateToSave.league?.year || 2025,
          week: stateToSave.league?.week || 1,
          gameMode: stateToSave.gameMode || 'gm',
          checksum: this.calculateChecksum(stateToSave)
        }
      };
      
      // Create backup before saving if enabled
      if (options.createBackup !== false) {
        this.createAutomaticBackup(savePackage);
      }
      
      // Save to localStorage
      const serialized = JSON.stringify(savePackage);
      localStorage.setItem(this.SAVE_KEY, serialized);
      
      console.log('✅ Game saved successfully with version', this.VERSION);
      
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
   * Enhanced load function with migration support
   * @returns {Object} Load result
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
          error: `Save version ${savePackage.version} is not compatible with current version ${this.VERSION}`,
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
      
      // Validate data integrity
      if (!this.validateSaveData(gameData)) {
        return { success: false, error: 'Save data is corrupted or invalid' };
      }
      
      console.log('✅ Game loaded successfully');
      
      return { 
        success: true, 
        gameData: gameData,
        metadata: savePackage.metadata,
        version: savePackage.version,
        wasMigrated: savePackage.version !== this.VERSION
      };
      
    } catch (error) {
      console.error('Load failed:', error);
      return { success: false, error: 'Save data is corrupted: ' + error.message };
    }
  },
  
  /**
   * Export save data to file
   * @param {Object} options - Export options
   * @returns {Object} Export result
   */
  exportSave(options = {}) {
    try {
      const loadResult = this.load();
      if (!loadResult.success) {
        // Try to export current state if no save exists
        const currentState = window.state;
        if (!currentState) {
          return { success: false, error: 'No data to export' };
        }
        
        const exportData = {
          version: this.VERSION,
          timestamp: new Date().toISOString(),
          gameData: this.prepareSaveData(currentState),
          metadata: {
            playerName: currentState.player?.name || 'GM',
            teamName: this.getUserTeamName(currentState),
            season: currentState.league?.year || 2025,
            week: currentState.league?.week || 1,
            gameMode: currentState.gameMode || 'gm',
            exportType: 'current_state'
          }
        };
        
        return this.downloadData(exportData, options);
      }
      
      // Export the loaded save
      const exportData = {
        version: loadResult.version,
        timestamp: new Date().toISOString(),
        gameData: loadResult.gameData,
        metadata: {
          ...loadResult.metadata,
          exportType: 'save_file'
        }
      };
      
      return this.downloadData(exportData, options);
      
    } catch (error) {
      console.error('Export failed:', error);
      return { success: false, error: error.message };
    }
  },
  
  /**
   * Import save data from file
   * @param {File} file - File to import
   * @returns {Promise<Object>} Import result
   */
  async importSave(file) {
    try {
      if (!file) {
        return { success: false, error: 'No file provided' };
      }
      
      const text = await file.text();
      const importData = JSON.parse(text);
      
      // Validate import data structure
      if (!this.validateImportData(importData)) {
        return { success: false, error: 'Invalid save file format' };
      }
      
      // Check version compatibility
      if (!this.isVersionCompatible(importData.version)) {
        return { 
          success: false, 
          error: `Imported save version ${importData.version} is not compatible`,
          needsMigration: true,
          saveVersion: importData.version
        };
      }
      
      // Create backup of current save before importing
      this.createManualBackup('before_import');
      
      // Migrate if necessary
      let gameData = importData.gameData;
      if (importData.version !== this.VERSION) {
        gameData = this.migrateSaveData(gameData, importData.version);
      }
      
      // Save the imported data
      const saveResult = this.save(gameData, { createBackup: false });
      if (!saveResult.success) {
        return { success: false, error: 'Failed to save imported data: ' + saveResult.error };
      }
      
      console.log('✅ Save imported successfully');
      
      return { 
        success: true, 
        metadata: importData.metadata,
        version: importData.version,
        wasMigrated: importData.version !== this.VERSION
      };
      
    } catch (error) {
      console.error('Import failed:', error);
      return { success: false, error: 'Invalid file format: ' + error.message };
    }
  },
  
  /**
   * Create automatic backup
   * @param {Object} savePackage - Save package to backup
   */
  createAutomaticBackup(savePackage) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupKey = `${this.BACKUP_KEY_PREFIX}auto_${timestamp}`;
      
      localStorage.setItem(backupKey, JSON.stringify({
        ...savePackage,
        backupType: 'automatic',
        backupTimestamp: new Date().toISOString()
      }));
      
      // Clean up old automatic backups
      this.cleanupOldBackups();
      
    } catch (error) {
      console.error('Backup creation failed:', error);
    }
  },
  
  /**
   * Create manual backup
   * @param {string} reason - Reason for backup
   * @returns {Object} Backup result
   */
  createManualBackup(reason = 'manual') {
    try {
      const loadResult = this.load();
      if (!loadResult.success) {
        return { success: false, error: 'No save data to backup' };
      }
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupKey = `${this.BACKUP_KEY_PREFIX}manual_${timestamp}`;
      
      const backupData = {
        version: loadResult.version,
        timestamp: new Date().toISOString(),
        gameData: loadResult.gameData,
        metadata: {
          ...loadResult.metadata,
          backupType: 'manual',
          backupReason: reason,
          backupTimestamp: new Date().toISOString()
        }
      };
      
      localStorage.setItem(backupKey, JSON.stringify(backupData));
      
      return { success: true, key: backupKey, timestamp: backupData.timestamp };
      
    } catch (error) {
      console.error('Manual backup failed:', error);
      return { success: false, error: error.message };
    }
  },
  
  /**
   * Get all available backups
   * @returns {Array} List of backups
   */
  getBackups() {
    const backups = [];
    
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.BACKUP_KEY_PREFIX)) {
          try {
            const backupData = JSON.parse(localStorage.getItem(key));
            backups.push({
              key: key,
              timestamp: backupData.timestamp || backupData.backupTimestamp,
              metadata: backupData.metadata,
              version: backupData.version,
              type: backupData.backupType || (key.includes('manual') ? 'manual' : 'automatic'),
              size: this.formatBytes(localStorage.getItem(key).length)
            });
          } catch (error) {
            console.error('Error reading backup:', key, error);
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
   * Restore from backup
   * @param {string} backupKey - Key of backup to restore
   * @returns {Object} Restore result
   */
  restoreBackup(backupKey) {
    try {
      const backupData = localStorage.getItem(backupKey);
      if (!backupData) {
        return { success: false, error: 'Backup not found' };
      }
      
      const backup = JSON.parse(backupData);
      
      // Create backup of current state before restoring
      this.createManualBackup('before_restore');
      
      // Restore the backup
      const saveResult = this.save(backup.gameData, { createBackup: false });
      if (!saveResult.success) {
        return { success: false, error: 'Failed to restore backup: ' + saveResult.error };
      }
      
      return { 
        success: true, 
        metadata: backup.metadata,
        version: backup.version,
        timestamp: backup.timestamp
      };
      
    } catch (error) {
      console.error('Restore failed:', error);
      return { success: false, error: error.message };
    }
  },
  
  /**
   * Delete a backup
   * @param {string} backupKey - Key of backup to delete
   * @returns {boolean} Success status
   */
  deleteBackup(backupKey) {
    try {
      localStorage.removeItem(backupKey);
      return true;
    } catch (error) {
      console.error('Delete backup failed:', error);
      return false;
    }
  },
  
  /**
   * Clean up old automatic backups
   */
  cleanupOldBackups() {
    try {
      const backups = this.getBackups().filter(b => b.type === 'automatic');
      
      if (backups.length > this.MAX_BACKUPS) {
        const toDelete = backups.slice(this.MAX_BACKUPS);
        toDelete.forEach(backup => {
          localStorage.removeItem(backup.key);
        });
        
        console.log(`Cleaned up ${toDelete.length} old automatic backups`);
      }
    } catch (error) {
      console.error('Backup cleanup failed:', error);
    }
  },
  
  /**
   * Check if a version is compatible
   * @param {string} version - Version to check
   * @returns {boolean} Whether version is compatible
   */
  isVersionCompatible(version) {
    return this.COMPATIBILITY_VERSIONS.includes(version);
  },
  
  /**
   * Migrate save data between versions
   * @param {Object} gameData - Game data to migrate
   * @param {string} fromVersion - Source version
   * @returns {Object} Migrated data
   */
  migrateSaveData(gameData, fromVersion) {
    console.log(`Migrating save data from ${fromVersion} to ${this.VERSION}`);
    
    let migratedData = { ...gameData };
    
    // Version-specific migrations
    if (fromVersion === '4.0.0') {
      migratedData = this.migrateFrom400(migratedData);
    }
    
    if (fromVersion === '4.0.1') {
      migratedData = this.migrateFrom401(migratedData);
    }
    
    // Update version info
    migratedData.version = this.VERSION;
    migratedData.lastMigration = {
      from: fromVersion,
      to: this.VERSION,
      timestamp: new Date().toISOString()
    };
    
    return migratedData;
  },
  
  /**
   * Migration from version 4.0.0
   * @param {Object} data - Data to migrate
   * @returns {Object} Migrated data
   */
  migrateFrom400(data) {
    // Add any new properties that didn't exist in 4.0.0
    if (!data.settings) {
      data.settings = {
        autoSave: true,
        difficulty: 'normal',
        simSpeed: 'normal',
        notifications: true,
        sound: false
      };
    }
    
    // Migrate coaching stats if they exist
    if (data.league && data.league.teams) {
      data.league.teams.forEach(team => {
        if (team.staff) {
          Object.values(team.staff).forEach(coach => {
            if (coach && !coach.stats) {
              if (window.initializeCoachingStats) {
                window.initializeCoachingStats(coach);
              }
            }
          });
        }
      });
    }
    
    return data;
  },
  
  /**
   * Migration from version 4.0.1
   * @param {Object} data - Data to migrate
   * @returns {Object} Migrated data
   */
  migrateFrom401(data) {
    // Add any changes between 4.0.1 and current version
    return data;
  },
  
  /**
   * Prepare game data for saving
   * @param {Object} gameState - Raw game state
   * @returns {Object} Prepared data
   */
  prepareSaveData(gameState) {
    // Create a clean copy without unnecessary data
    const cleanData = JSON.parse(JSON.stringify(gameState));
    
    // Remove temporary/computed properties
    if (cleanData.league && cleanData.league.teams) {
      cleanData.league.teams.forEach(team => {
        // Remove computed standings data
        delete team.winPercentage;
        delete team.gamesPlayed;
        delete team.remaining;
        delete team.pointDifferential;
        
        // Clean player data
        if (team.roster) {
          team.roster.forEach(player => {
            // Remove temporary training data
            delete player.tempStats;
            delete player.displayData;
          });
        }
      });
    }
    
    return cleanData;
  },
  
  /**
   * Validate save data structure
   * @param {Object} gameData - Game data to validate
   * @returns {boolean} Whether data is valid
   */
  validateSaveData(gameData) {
    try {
      // Basic structure validation
      if (!gameData || typeof gameData !== 'object') {
        return false;
      }
      
      // Check required properties
      const requiredProps = ['onboarded', 'namesMode'];
      for (const prop of requiredProps) {
        if (gameData[prop] === undefined) {
          console.warn(`Missing required property: ${prop}`);
          return false;
        }
      }
      
      // Validate league structure if present
      if (gameData.league) {
        if (!gameData.league.teams || !Array.isArray(gameData.league.teams)) {
          console.warn('Invalid league.teams structure');
          return false;
        }
        
        if (!gameData.league.year || !gameData.league.week) {
          console.warn('Missing league year or week');
          return false;
        }
      }
      
      return true;
      
    } catch (error) {
      console.error('Save validation error:', error);
      return false;
    }
  },
  
  /**
   * Validate import data structure
   * @param {Object} importData - Import data to validate
   * @returns {boolean} Whether data is valid
   */
  validateImportData(importData) {
    return importData && 
           importData.version && 
           importData.gameData && 
           typeof importData.gameData === 'object';
  },
  
  /**
   * Calculate checksum for data integrity
   * @param {Object} data - Data to checksum
   * @returns {string} Checksum
   */
  calculateChecksum(data) {
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  },
  
  /**
   * Get user's team name for metadata
   * @param {Object} gameState - Game state
   * @returns {string} Team name
   */
  getUserTeamName(gameState) {
    if (!gameState.league || !gameState.league.teams) {
      return 'Unknown Team';
    }
    
    const userTeamId = gameState.userTeamId || gameState.player?.teamId || 0;
    const team = gameState.league.teams[userTeamId];
    return team ? team.name : 'Unknown Team';
  },
  
  /**
   * Format bytes to readable string
   * @param {number} bytes - Number of bytes
   * @returns {string} Formatted string
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  },
  
  /**
   * Download data as file
   * @param {Object} data - Data to download
   * @param {Object} options - Download options
   * @returns {Object} Download result
   */
  downloadData(data, options = {}) {
    try {
      const filename = options.filename || this.generateFilename(data);
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      return { 
        success: true, 
        filename: filename,
        size: this.formatBytes(jsonString.length)
      };
      
    } catch (error) {
      console.error('Download failed:', error);
      return { success: false, error: error.message };
    }
  },
  
  /**
   * Generate filename for export
   * @param {Object} data - Export data
   * @returns {string} Generated filename
   */
  generateFilename(data) {
    const metadata = data.metadata || {};
    const teamName = (metadata.teamName || 'Team').replace(/[^a-zA-Z0-9]/g, '');
    const season = metadata.season || 2025;
    const timestamp = new Date().toISOString().split('T')[0];
    
    return `NFLGM_${teamName}_Season${season}_${timestamp}.json`;
  }
};

/**
 * Render Save Data Management UI
 */
function renderSaveDataManager() {
  const settingsView = document.getElementById('settings');
  if (!settingsView) return;
  
  const backups = SaveDataManager.getBackups();
  const currentSaveExists = localStorage.getItem(SaveDataManager.SAVE_KEY);
  
  const saveManagerHTML = `
    <div class="card save-data-manager">
      <h3>Save Data Management</h3>
      
      <div class="save-actions">
        <div class="save-action-group">
          <h4>Current Save</h4>
          <div class="save-buttons">
            <button id="btnExportSave" class="btn primary">Export Save</button>
            <button id="btnManualBackup" class="btn">Create Backup</button>
            ${currentSaveExists ? '<button id="btnDeleteSave" class="btn danger">Delete Save</button>' : ''}
          </div>
        </div>
        
        <div class="save-action-group">
          <h4>Import</h4>
          <div class="import-area">
            <input type="file" id="importSaveFile" accept=".json" style="display: none;">
            <button id="btnImportSave" class="btn">Import Save File</button>
            <div class="import-info">
              <small class="muted">Supports NFL GM save files (.json)</small>
            </div>
          </div>
        </div>
      </div>
      
      ${backups.length > 0 ? `
        <div class="backups-section">
          <h4>Available Backups (${backups.length})</h4>
          <div class="backups-list">
            ${backups.map(backup => `
              <div class="backup-item">
                <div class="backup-info">
                  <div class="backup-title">
                    ${backup.metadata?.teamName || 'Unknown Team'} - Season ${backup.metadata?.season || 'Unknown'}
                  </div>
                  <div class="backup-details">
                    <span class="backup-date">${new Date(backup.timestamp).toLocaleString()}</span>
                    <span class="backup-type ${backup.type}">${backup.type}</span>
                    <span class="backup-size">${backup.size}</span>
                    <span class="backup-version">v${backup.version}</span>
                  </div>
                </div>
                <div class="backup-actions">
                  <button class="btn btn-restore" data-backup-key="${backup.key}">Restore</button>
                  <button class="btn danger btn-delete-backup" data-backup-key="${backup.key}">Delete</button>
                </div>
              </div>
            `).join('')}
          </div>
          
          <div class="backup-cleanup">
            <button id="btnCleanupBackups" class="btn">Cleanup Old Backups</button>
            <small class="muted">Removes automatic backups older than the latest ${SaveDataManager.MAX_BACKUPS}</small>
          </div>
        </div>
      ` : ''}
      
      <div class="save-info">
        <h4>Save Information</h4>
        <div class="save-details">
          <div>Version: ${SaveDataManager.VERSION}</div>
          <div>Compatible Versions: ${SaveDataManager.COMPATIBILITY_VERSIONS.join(', ')}</div>
          <div>Max Backups: ${SaveDataManager.MAX_BACKUPS}</div>
        </div>
      </div>
    </div>
  `;
  
  // Insert before existing settings content
  const existingCard = settingsView.querySelector('.card');
  if (existingCard) {
    existingCard.insertAdjacentHTML('beforebegin', saveManagerHTML);
  } else {
    settingsView.innerHTML = saveManagerHTML + settingsView.innerHTML;
  }
  
  setupSaveDataManagerEvents();
}

/**
 * Set up event listeners for save data manager
 */
function setupSaveDataManagerEvents() {
  // Export save
  const btnExport = document.getElementById('btnExportSave');
  if (btnExport) {
    btnExport.addEventListener('click', () => {
      const result = SaveDataManager.exportSave();
      if (result.success) {
        window.setStatus(`Save exported: ${result.filename} (${result.size})`);
      } else {
        window.setStatus(`Export failed: ${result.error}`);
      }
    });
  }
  
  // Import save
  const btnImport = document.getElementById('btnImportSave');
  const fileInput = document.getElementById('importSaveFile');
  
  if (btnImport && fileInput) {
    btnImport.addEventListener('click', () => {
      fileInput.click();
    });
    
    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const result = await SaveDataManager.importSave(file);
      if (result.success) {
        window.setStatus('Save imported successfully! Reload the page to see changes.');
        setTimeout(() => {
          if (confirm('Save imported! Reload the page now to apply changes?')) {
            location.reload();
          }
        }, 1000);
      } else {
        window.setStatus(`Import failed: ${result.error}`);
      }
      
      // Reset file input
      fileInput.value = '';
    });
  }
  
  // Manual backup
  const btnBackup = document.getElementById('btnManualBackup');
  if (btnBackup) {
    btnBackup.addEventListener('click', () => {
      const result = SaveDataManager.createManualBackup('user_requested');
      if (result.success) {
        window.setStatus('Backup created successfully');
        // Refresh the manager view
        setTimeout(renderSaveDataManager, 500);
      } else {
        window.setStatus(`Backup failed: ${result.error}`);
      }
    });
  }
  
  // Delete current save
  const btnDelete = document.getElementById('btnDeleteSave');
  if (btnDelete) {
    btnDelete.addEventListener('click', () => {
      if (confirm('Are you sure you want to delete your current save? This cannot be undone!')) {
        localStorage.removeItem(SaveDataManager.SAVE_KEY);
        window.setStatus('Save deleted');
        setTimeout(renderSaveDataManager, 500);
      }
    });
  }
  
  // Restore backup
  document.querySelectorAll('.btn-restore').forEach(btn => {
    btn.addEventListener('click', () => {
      const backupKey = btn.dataset.backupKey;
      if (confirm('Are you sure you want to restore this backup? Your current save will be backed up first.')) {
        const result = SaveDataManager.restoreBackup(backupKey);
        if (result.success) {
          window.setStatus('Backup restored successfully! Reload to see changes.');
          setTimeout(() => {
            if (confirm('Backup restored! Reload the page now?')) {
              location.reload();
            }
          }, 1000);
        } else {
          window.setStatus(`Restore failed: ${result.error}`);
        }
      }
    });
  });
  
  // Delete backup
  document.querySelectorAll('.btn-delete-backup').forEach(btn => {
    btn.addEventListener('click', () => {
      const backupKey = btn.dataset.backupKey;
      if (confirm('Are you sure you want to delete this backup?')) {
        if (SaveDataManager.deleteBackup(backupKey)) {
          window.setStatus('Backup deleted');
          setTimeout(renderSaveDataManager, 500);
        } else {
          window.setStatus('Failed to delete backup');
        }
      }
    });
  });
  
  // Cleanup backups
  const btnCleanup = document.getElementById('btnCleanupBackups');
  if (btnCleanup) {
    btnCleanup.addEventListener('click', () => {
      SaveDataManager.cleanupOldBackups();
      window.setStatus('Old backups cleaned up');
      setTimeout(renderSaveDataManager, 500);
    });
  }
}

// Override the existing save/load functions to use the new manager
window.saveState = function(stateToSave) {
  return SaveDataManager.save(stateToSave);
};

window.loadState = function() {
  const result = SaveDataManager.load();
  return result.success ? result.gameData : null;
};

// Make the manager globally available
window.SaveDataManager = SaveDataManager;
window.renderSaveDataManager = renderSaveDataManager;
window.setupSaveDataManagerEvents = setupSaveDataManagerEvents;

console.log('✅ Save Data Management System loaded successfully');
