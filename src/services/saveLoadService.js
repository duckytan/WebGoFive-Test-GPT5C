import { STORAGE_KEYS } from '../constants.js';
import { createStorage } from './storageAdapter.js';

const VERSION = '2.0.0';

const generateId = () => `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

export class SaveLoadService {
  constructor({ storageKey = STORAGE_KEYS.SAVES, autoSaveKey = STORAGE_KEYS.AUTO_SAVE } = {}) {
    this.storage = createStorage();
    this.storageKey = storageKey;
    this.autoSaveKey = autoSaveKey;
  }

  list() {
    const raw = this.storage.getItem(this.storageKey);
    if (!raw) return [];
    try {
      const saves = JSON.parse(raw);
      return Array.isArray(saves) ? saves : [];
    } catch (error) {
      console.error('Failed to parse saves', error);
      return [];
    }
  }

  saveSnapshot(name, snapshot) {
    const saves = this.list();
    const record = {
      id: generateId(),
      name: name || `存档-${new Date().toLocaleString()}`,
      createdAt: Date.now(),
      version: VERSION,
      snapshot
    };
    saves.push(record);
    this.storage.setItem(this.storageKey, JSON.stringify(saves));
    return record;
  }

  loadSnapshot(id) {
    const saves = this.list();
    return saves.find(save => save.id === id) ?? null;
  }

  deleteSnapshot(id) {
    const saves = this.list().filter(save => save.id !== id);
    this.storage.setItem(this.storageKey, JSON.stringify(saves));
    return saves;
  }

  clearAll() {
    this.storage.removeItem(this.storageKey);
  }

  autoSave(snapshot) {
    const payload = {
      version: VERSION,
      updatedAt: Date.now(),
      snapshot
    };
    this.storage.setItem(this.autoSaveKey, JSON.stringify(payload));
    return payload;
  }

  loadAutoSave() {
    const raw = this.storage.getItem(this.autoSaveKey);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (error) {
      console.error('Failed to parse auto-save', error);
      return null;
    }
  }
}
