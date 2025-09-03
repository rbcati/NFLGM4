'use strict';

/**
 * Enhanced Save Data Manager with improved performance and storage efficiency
 */
class SaveDataManager {
    constructor() {
        this.VERSION = '4.2.0';
        this.COMPATIBILITY_VERSIONS = ['4.0.0', '4.0.1', '4.1.0', '4.2.0'];
        this.SAVE_KEY = 'nflGM4.league';
        this.BACKUP_KEY_PREFIX = 'nflGM4.backup.';
        this.SETTINGS_KEY = 'nflGM4.settings';
        
        // Optimized storage limits
        this.MAX_BACKUPS = 2;
        this.MAX_MANUAL_BACKUPS = 2;
        this.BACKUP_COOLDOWN = 60000; // 1 minute
        this.STORAGE_LIMIT = 4 * 1024 * 1024; // 4MB total
        this.SAVE_LIMIT = 3 * 1024 * 1024; // 3MB for saves
        
        // Cache for performance
        this.storageCache = new Map();
        this.lastAutoBackupTime = 0;
        this.compressionEnabled = true;
    }

    // --- OPTIMIZED STORAGE CALCULATIONS ---
    getStorageUsage(useCache = true) {
        const cacheKey = 'storage_usage';
        
        if (useCache && this.storageCache.has(cacheKey)) {
            const cached = this.storageCache.get(cacheKey);
            // Cache for 30 seconds
            if (Date.now() - cached.timestamp < 30000) {
                return cached.data;
            }
        }

        const usage = {
            total: 0,
            gameData: 0,
            backups: 0,
            settings: 0,
            other: 0,
            available: 0
        };

        try {
            // Single iteration through localStorage
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (!key) continue;
                
                const item = localStorage.getItem(key);
                if (!item) continue;
                
                const size = item.length + key.length;
                usage.total += size;
                
                if (key === this.SAVE_KEY) {
                    usage.gameData = size;
                } else if (key.startsWith(this.BACKUP_KEY_PREFIX)) {
                    usage.backups += size;
                } else if (key === this.SETTINGS_KEY) {
                    usage.settings = size;
                } else if (key.startsWith('nflGM')) {
                    usage.gameData += size; // Include other game data
                } else {
                    usage.other += size;
                }
            }
            
            usage.available = Math.max(0, this.STORAGE_LIMIT - usage.total);
            
            // Cache the result
            this.storageCache.set(cacheKey, {
                data: usage,
                timestamp: Date.now()
            });
            
        } catch (error) {
            console.error('Error calculating storage usage:', error);
        }
        
        return usage;
    }

    // --- STREAMLINED SAVE PROCESS ---
    async save(gameState = null, options = {}) {
        try {
            const stateToSave = gameState || window.state;
            if (!stateToSave) {
                return { success: false, error: 'No game state to save' };
            }

            // Mark state as needing save
            if (window.state) {
                window.state.needsSave = true;
            }

            console.time('Save Process');
            
            // Prepare and compress data
            const optimizedData = await this.optimizeGameData(stateToSave);
            const savePackage = this.createSavePackage(optimizedData);
            
            // Check storage requirements
            const serialized = JSON.stringify(savePackage);
            const requiredSpace = serialized.length * 1.1; // 10% buffer
            
            console.log(`Save size: ${this.formatBytes(serialized.length)}`);
            
            // Ensure we have enough space
            await this.ensureStorageSpace(requiredSpace);
            
            // Perform the save
            try {
                localStorage.setItem(this.SAVE_KEY, serialized);
            } catch (saveError) {
                if (saveError.name === 'QuotaExceededError') {
                    // Emergency cleanup and retry
                    await this.emergencyCleanup();
                    localStorage.setItem(this.SAVE_KEY, serialized);
                } else {
                    throw saveError;
                }
            }
            
            // Create backup if requested and safe
            if (options.createBackup !== false && this.shouldCreateBackup()) {
                await this.createBackupSafe(savePackage);
            }
            
            // Clear save flag
            if (window.state) {
                window.state.needsSave = false;
            }
            
            // Clear cache to ensure fresh calculations
            this.storageCache.clear();
            
            console.timeEnd('Save Process');
            console.log('✅ Save completed successfully');
            
            return {
                success: true,
                version: this.VERSION,
                timestamp: savePackage.timestamp,
                size: this.formatBytes(serialized.length),
                compressed: this.compressionEnabled
            };
            
        } catch (error) {
            console.error('Save failed:', error);
            return { 
                success: false, 
                error: error.message,
                details: error.stack
            };
        }
    }

    // --- ENHANCED DATA OPTIMIZATION ---
    async optimizeGameData(gameState) {
        console.time('Data Optimization');
        
        // Create optimized copy without modifying original
        const optimized = this.deepOptimize(gameState);
        
        console.timeEnd('Data Optimization');
        return optimized;
    }

    deepOptimize(obj, depth = 0, maxDepth = 50) {
        // Prevent infinite recursion
        if (depth > maxDepth || obj === null || typeof obj !== 'object') {
            return obj;
        }

        // Handle arrays
        if (Array.isArray(obj)) {
            return obj.map(item => this.deepOptimize(item, depth + 1, maxDepth));
        }

        // Handle dates and other objects that shouldn't be optimized
        if (obj instanceof Date || obj instanceof RegExp) {
            return obj;
        }

        // Optimize object
        const optimized = {};
        for (const [key, value] of Object.entries(obj)) {
            // Skip null/undefined values to save space
            if (value === null || value === undefined) {
                continue;
            }
            
            // Skip temporary/computed properties
            if (this.isTemporaryProperty(key)) {
                continue;
            }
            
            // Skip empty arrays/objects
            if (this.isEmpty(value)) {
                continue;
            }
            
            optimized[key] = this.deepOptimize(value, depth + 1, maxDepth);
        }
        
        return optimized;
    }

    isTemporaryProperty(key) {
        const tempKeys = new Set([
            'tempStats', 'displayData', 'projectedStats', 'cache', 'cached',
            'winPercentage', 'gamesPlayed', 'pointDifferential', 'scheduleCache',
            'standingsCache', 'statsCache', 'developmentHistory', 'injuryHistory',
            'awardsHistory', 'scoutingReports', 'workoutResults', 'timeoutId'
        ]);
        
        return tempKeys.has(key) || key.startsWith('temp') || key.startsWith('cache') || key.endsWith('Cache');
    }

    isEmpty(value) {
        if (Array.isArray(value)) {
            return value.length === 0;
        }
        if (typeof value === 'object' && value !== null) {
            return Object.keys(value).length === 0;
        }
        return false;
    }

    // --- IMPROVED SAVE PACKAGE CREATION ---
    createSavePackage(gameData) {
        const metadata = this.extractMetadata(gameData);
        
        return {
            version: this.VERSION,
            timestamp: new Date().toISOString(),
            gameData: gameData,
            metadata: metadata,
            checksum: this.createChecksum(gameData)
        };
    }

    extractMetadata(gameData) {
        try {
            return {
                playerName: gameData.player?.name || 'GM',
                teamName: this.getTeamName(gameData),
                season: gameData.league?.year || 2025,
                week: gameData.league?.week || 1,
                gameMode: gameData.gameMode || 'gm',
                namesMode: gameData.namesMode || 'fictional'
            };
        } catch (error) {
            console.warn('Error extracting metadata:', error);
            return { playerName: 'GM', teamName: 'Unknown', season: 2025, week: 1 };
        }
    }

    getTeamName(gameData) {
        try {
            const teamId = gameData.userTeamId ?? gameData.player?.teamId ?? 0;
            const team = gameData.league?.teams?.[teamId];
            return team?.name || 'Unknown Team';
        } catch (error) {
            return 'Unknown Team';
        }
    }

    createChecksum(data) {
        // Simple checksum for data integrity
        const str = JSON.stringify(data);
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString(36);
    }

    // --- SMART STORAGE MANAGEMENT ---
    async ensureStorageSpace(requiredBytes) {
        const usage = this.getStorageUsage(false); // Force fresh calculation
        
        if (usage.available >= requiredBytes) {
            return; // We have enough space
        }
        
        console.log(`Need ${this.formatBytes(requiredBytes)}, have ${this.formatBytes(usage.available)}`);
        
        // Progressive cleanup strategy
        let freedSpace = 0;
        
        // 1. Remove old automatic backups
        freedSpace += await this.cleanupAutoBackups();
        
        if (usage.available + freedSpace >= requiredBytes) {
            return;
        }
        
        // 2. Remove excess manual backups
        freedSpace += await this.cleanupExcessManualBackups();
        
        if (usage.available + freedSpace >= requiredBytes) {
            return;
        }
        
        // 3. Emergency cleanup
        freedSpace += await this.emergencyCleanup();
        
        // Final check
        const finalUsage = this.getStorageUsage(false);
        if (finalUsage.available < requiredBytes) {
            throw new Error(`Insufficient storage space. Need ${this.formatBytes(requiredBytes)}, have ${this.formatBytes(finalUsage.available)}`);
        }
    }

    async cleanupAutoBackups() {
        let freedBytes = 0;
        const backups = await this.getBackups();
        const autoBackups = backups.filter(b => b.type === 'automatic');
        
        // Remove all but the most recent automatic backup
        const toRemove = autoBackups.slice(1);
        
        for (const backup of toRemove) {
            const item = localStorage.getItem(backup.key);
            if (item) {
                freedBytes += item.length + backup.key.length;
                localStorage.removeItem(backup.key);
            }
        }
        
        if (toRemove.length > 0) {
            console.log(`Removed ${toRemove.length} automatic backups, freed ${this.formatBytes(freedBytes)}`);
        }
        
        return freedBytes;
    }

    async cleanupExcessManualBackups() {
        let freedBytes = 0;
        const backups = await this.getBackups();
        const manualBackups = backups.filter(b => b.type === 'manual')
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        if (manualBackups.length > this.MAX_MANUAL_BACKUPS) {
            const toRemove = manualBackups.slice(this.MAX_MANUAL_BACKUPS);
            
            for (const backup of toRemove) {
                const item = localStorage.getItem(backup.key);
                if (item) {
                    freedBytes += item.length + backup.key.length;
                    localStorage.removeItem(backup.key);
                }
            }
            
            console.log(`Removed ${toRemove.length} excess manual backups, freed ${this.formatBytes(freedBytes)}`);
        }
        
        return freedBytes;
    }

    async emergencyCleanup() {
        console.log('🚨 Performing emergency cleanup...');
        let freedBytes = 0;
        
        // Remove ALL backups
        const backups = await this.getBackups();
        for (const backup of backups) {
            const item = localStorage.getItem(backup.key);
            if (item) {
                freedBytes += item.length + backup.key.length;
                localStorage.removeItem(backup.key);
            }
        }
        
        // Remove old version data
        for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);
            if (key && key.startsWith('nflGM') && !key.startsWith('nflGM4.')) {
                const item = localStorage.getItem(key);
                if (item) {
                    freedBytes += item.length + key.length;
                    localStorage.removeItem(key);
                }
            }
        }
        
        // Clear cache
        this.storageCache.clear();
        
        console.log(`Emergency cleanup freed ${this.formatBytes(freedBytes)}`);
        return freedBytes;
    }

    // --- ENHANCED BACKUP MANAGEMENT ---
    shouldCreateBackup() {
        const timeSinceLastBackup = Date.now() - this.lastAutoBackupTime;
        return timeSinceLastBackup >= this.BACKUP_COOLDOWN;
    }

    async createBackupSafe(savePackage) {
        try {
            const usage = this.getStorageUsage();
            const backupSize = JSON.stringify(savePackage).length * 1.1;
            
            // Only create backup if we have at least 20% free space remaining
            if (backupSize < usage.available * 0.2) {
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const backupKey = `${this.BACKUP_KEY_PREFIX}auto_${timestamp}`;
                
                const backupData = JSON.stringify({
                    ...savePackage,
                    backupType: 'automatic',
                    backupTimestamp: new Date().toISOString()
                });
                
                localStorage.setItem(backupKey, backupData);
                this.lastAutoBackupTime = Date.now();
                
                // Cleanup old backups immediately
                await this.cleanupAutoBackups();
                
                console.log('✅ Automatic backup created');
            } else {
                console.log('⚠️ Skipped automatic backup - insufficient space');
            }
        } catch (error) {
            console.warn('Backup creation failed:', error);
            // Don't throw - backup failure shouldn't prevent saving
        }
    }

    // --- OPTIMIZED LOAD PROCESS ---
    async load() {
        try {
            console.time('Load Process');
            
            const saved = localStorage.getItem(this.SAVE_KEY);
            if (!saved) {
                console.timeEnd('Load Process');
                return { success: false, error: 'No save data found' };
            }
            
            const savePackage = JSON.parse(saved);
            
            // Verify data integrity
            if (!this.verifySaveIntegrity(savePackage)) {
                console.warn('Save data integrity check failed, attempting backup recovery...');
                return await this.recoverFromBackup();
            }
            
            // Handle version compatibility
            if (!this.isVersionCompatible(savePackage.version)) {
                if (this.canMigrate(savePackage.version)) {
                    console.log(`Migrating save from ${savePackage.version} to ${this.VERSION}`);
                    savePackage.gameData = await this.migrateSaveData(savePackage.gameData, savePackage.version);
                    savePackage.version = this.VERSION;
                } else {
                    console.timeEnd('Load Process');
                    return { 
                        success: false, 
                        error: `Save version ${savePackage.version} is not supported`,
                        needsMigration: true,
                        saveVersion: savePackage.version
                    };
                }
            }
            
            console.timeEnd('Load Process');
            console.log('✅ Game loaded successfully');
            
            return {
                success: true,
                gameData: savePackage.gameData,
                metadata: savePackage.metadata,
                version: savePackage.version
            };
            
        } catch (error) {
            console.error('Load failed:', error);
            console.timeEnd('Load Process');
            return await this.recoverFromBackup();
        }
    }

    verifySaveIntegrity(savePackage) {
        try {
            // Basic structure check
            if (!savePackage.gameData || !savePackage.version || !savePackage.timestamp) {
                return false;
            }
            
            // Checksum verification
            if (savePackage.checksum) {
                const expectedChecksum = this.createChecksum(savePackage.gameData);
                if (expectedChecksum !== savePackage.checksum) {
                    console.warn('Checksum mismatch detected');
                    return false;
                }
            }
            
            return true;
        } catch (error) {
            console.error('Error verifying save integrity:', error);
            return false;
        }
    }

    async recoverFromBackup() {
        try {
            console.log('Attempting recovery from backup...');
            const backups = await this.getBackups();
            
            if (backups.length === 0) {
                return { success: false, error: 'No backups available for recovery' };
            }
            
            // Try backups in order of recency
            for (const backup of backups) {
                try {
                    const backupData = localStorage.getItem(backup.key);
                    const backupPackage = JSON.parse(backupData);
                    
                    if (this.verifySaveIntegrity(backupPackage)) {
                        console.log(`✅ Recovered from backup: ${backup.key}`);
                        return {
                            success: true,
                            gameData: backupPackage.gameData,
                            metadata: backupPackage.metadata,
                            version: backupPackage.version,
                            recoveredFromBackup: true,
                            backupUsed: backup.key
                        };
                    }
                } catch (backupError) {
                    console.warn(`Backup ${backup.key} is also corrupted:`, backupError);
                    continue;
                }
            }
            
            return { success: false, error: 'All backups are corrupted' };
            
        } catch (error) {
            console.error('Backup recovery failed:', error);
            return { success: false, error: 'Backup recovery failed: ' + error.message };
        }
    }

    // --- BACKUP LISTING ---
    async getBackups() {
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
                        console.warn(`Removing corrupted backup: ${key}`, error);
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
    }

    // --- UTILITY METHODS ---
    isVersionCompatible(version) {
        return this.COMPATIBILITY_VERSIONS.includes(version);
    }

    canMigrate(version) {
        // Define which versions can be migrated
        const migratableVersions = ['4.0.0', '4.0.1', '4.1.0'];
        return migratableVersions.includes(version);
    }

    async migrateSaveData(gameData, fromVersion) {
        console.log(`Migrating from ${fromVersion} to ${this.VERSION}`);
        
        let migratedData = { ...gameData };
        
        // Version-specific migrations
        if (fromVersion === '4.0.0' || fromVersion === '4.0.1') {
            migratedData = this.migrateFrom400(migratedData);
        }
        
        if (fromVersion === '4.1.0') {
            migratedData = this.migrateFrom410(migratedData);
        }
        
        // Add migration metadata
        migratedData.migrationHistory = migratedData.migrationHistory || [];
        migratedData.migrationHistory.push({
            from: fromVersion,
            to: this.VERSION,
            timestamp: new Date().toISOString()
        });
        
        return migratedData;
    }

    migrateFrom400(data) {
        // Add default settings if missing
        if (!data.settings) {
            data.settings = {
                autoSave: true,
                difficulty: 'normal',
                simSpeed: 'normal'
            };
        }
        return data;
    }

    migrateFrom410(data) {
        // Handle any 4.1.0 specific migrations
        return data;
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    // --- STORAGE STATISTICS ---
    getStorageStats() {
        const usage = this.getStorageUsage();
        const backups = this.getBackups();
        
        return {
            ...usage,
            backupsCount: backups.length,
            storageLimit: this.formatBytes(this.STORAGE_LIMIT),
            usagePercentage: Math.round((usage.total / this.STORAGE_LIMIT) * 100)
        };
    }

    // --- MANUAL BACKUP CREATION ---
    async createManualBackup(name = null) {
        try {
            const gameState = window.state;
            if (!gameState) {
                throw new Error('No game state to backup');
            }
            
            const optimizedData = await this.optimizeGameData(gameState);
            const savePackage = this.createSavePackage(optimizedData);
            
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupName = name ? `manual_${name}_${timestamp}` : `manual_${timestamp}`;
            const backupKey = `${this.BACKUP_KEY_PREFIX}${backupName}`;
            
            const backupData = JSON.stringify({
                ...savePackage,
                backupType: 'manual',
                backupTimestamp: new Date().toISOString(),
                backupName: name
            });
            
            // Check space
            const requiredSpace = backupData.length * 1.1;
            await this.ensureStorageSpace(requiredSpace);
            
            localStorage.setItem(backupKey, backupData);
            
            console.log('✅ Manual backup created');
            return { success: true, backupKey, size: this.formatBytes(backupData.length) };
            
        } catch (error) {
            console.error('Manual backup failed:', error);
            return { success: false, error: error.message };
        }
    }
}

// --- GLOBAL SETUP ---
const saveManager = new SaveDataManager();

// Override global save/load functions
window.saveState = function(stateToSave, options = {}) {
    return saveManager.save(stateToSave, options);
};

window.loadState = function() {
    const result = saveManager.load();
    if (!result.success) {
        console.error('Load failed:', result.error);
        if (result.recoveredFromBackup && window.setStatus) {
            window.setStatus('Save was corrupted, recovered from backup', 'warning');
        }
    }
    return result.success ? result.gameData : null;
};

// Expose manager globally
window.SaveDataManager = saveManager;

console.log('✅ Enhanced Save Data Manager loaded successfully');
