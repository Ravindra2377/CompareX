import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "../config/api";
import { secureStorage } from "./secureStorage";

const BASE_CONVERSATIONS_KEY = "comparez_saved_conversations";

/**
 * Returns account-isolated storage key to prevent conversation leaks across shared devices.
 */
async function getAccountStorageKey() {
  try {
    const rawUser = await secureStorage.getItem("userData");
    if (rawUser) {
      const user = JSON.parse(rawUser);
      const uid = user?.id || user?.email || user?.userId;
      if (uid) return `${BASE_CONVERSATIONS_KEY}_${uid}`;
    }
  } catch {}
  return `${BASE_CONVERSATIONS_KEY}_guest`;
}

const ConversationService = {
  /**
   * Fetches list of conversations (from PostgreSQL backend if authenticated, fallback to account-isolated local storage).
   */
  async listConversations() {
    const storageKey = await getAccountStorageKey();

    try {
      const token = await secureStorage.getItem("userToken");
      if (token) {
        const resp = await fetch(`${API_URL}/ai/conversations`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        if (resp.ok) {
          const data = await resp.json();
          if (Array.isArray(data)) {
            // Cache locally for offline availability under the active account's key
            await AsyncStorage.setItem(storageKey, JSON.stringify(data));
            return data;
          }
        }
      }
    } catch (e) {
      // Backend unreachable; fallback to local storage
    }

    try {
      const raw = await AsyncStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  /**
   * Loads a full conversation with its message turns, sources, and metadata.
   */
  async getConversation(id) {
    if (!id) return null;
    const isLocalOnly = String(id).startsWith("local-") || isNaN(Number(id));
    const storageKey = await getAccountStorageKey();

    try {
      const token = await secureStorage.getItem("userToken");
      if (token && !isLocalOnly) {
        const resp = await fetch(`${API_URL}/ai/conversations/${id}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        if (resp.ok) {
          const conv = await resp.json();
          return conv;
        }
      }
    } catch (e) {
      // Backend error; check local cache
    }

    try {
      const raw = await AsyncStorage.getItem(storageKey);
      if (raw) {
        const list = JSON.parse(raw);
        const found = list.find((c) => String(c.id) === String(id));
        if (found) return found;
      }
    } catch {}

    return null;
  },

  /**
   * Deletes a conversation session. Confirms with backend before reporting success.
   */
  async deleteConversation(id) {
    if (!id) return false;
    const isLocalOnly = String(id).startsWith("local-") || isNaN(Number(id));
    const storageKey = await getAccountStorageKey();

    try {
      const token = await secureStorage.getItem("userToken");
      if (token && !isLocalOnly) {
        const resp = await fetch(`${API_URL}/ai/conversations/${id}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        if (!resp.ok && resp.status !== 404) {
          return false;
        }
      }
    } catch (e) {
      const token = await secureStorage.getItem("userToken");
      if (token && !isLocalOnly) {
        return false;
      }
    }

    try {
      const raw = await AsyncStorage.getItem(storageKey);
      if (raw) {
        const list = JSON.parse(raw);
        const filtered = list.filter((c) => String(c.id) !== String(id));
        await AsyncStorage.setItem(storageKey, JSON.stringify(filtered));
      }
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Saves or updates a local conversation session with full metadata (takeaways, followups).
   */
  async saveLocalConversation(conv) {
    if (!conv || !conv.id) return;
    try {
      const storageKey = await getAccountStorageKey();
      const raw = await AsyncStorage.getItem(storageKey);
      let list = raw ? JSON.parse(raw) : [];
      const idx = list.findIndex((c) => String(c.id) === String(conv.id));
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...conv, updated_at: new Date().toISOString() };
      } else {
        list.unshift({ ...conv, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
      }
      await AsyncStorage.setItem(storageKey, JSON.stringify(list.slice(0, 50)));
    } catch {}
  },

  /**
   * Truncates messages after an edited or regenerated turn so history stays synchronized.
   */
  async truncateConversation(id, messageCount) {
    if (!id) return;
    const isBackend = Number.isInteger(Number(id)) && Number(id) > 0;
    if (isBackend) {
      try {
        const token = await secureStorage.getItem("userToken");
        if (token) {
          await fetch(`${API_URL}/ai/conversations/${id}/messages?keep_count=${messageCount}`, {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          });
        }
      } catch {}
    }

    try {
      const storageKey = await getAccountStorageKey();
      const raw = await AsyncStorage.getItem(storageKey);
      if (raw) {
        const list = JSON.parse(raw);
        const idx = list.findIndex((c) => String(c.id) === String(id));
        if (idx >= 0 && Array.isArray(list[idx].messages)) {
          list[idx].messages = list[idx].messages.slice(0, messageCount);
          list[idx].updated_at = new Date().toISOString();
          await AsyncStorage.setItem(storageKey, JSON.stringify(list));
        }
      }
    } catch {}
  },
};

export default ConversationService;
