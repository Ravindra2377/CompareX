import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "../config/api";
import secureStorage from "./secureStorage";

const LOCAL_CONVERSATIONS_KEY = "comparez_saved_conversations";

const ConversationService = {
  /**
   * Fetches list of conversations (from PostgreSQL backend if authenticated, fallback to local storage).
   */
  async listConversations() {
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
            // Cache locally for offline availability
            await AsyncStorage.setItem(LOCAL_CONVERSATIONS_KEY, JSON.stringify(data));
            return data;
          }
        }
      }
    } catch (e) {
      // Backend unreachable; fallback to local storage
    }

    try {
      const raw = await AsyncStorage.getItem(LOCAL_CONVERSATIONS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  /**
   * Loads a full conversation with its message turns and sources.
   */
  async getConversation(id) {
    if (!id) return null;

    try {
      const token = await secureStorage.getItem("userToken");
      if (token) {
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
      const raw = await AsyncStorage.getItem(LOCAL_CONVERSATIONS_KEY);
      if (raw) {
        const list = JSON.parse(raw);
        const found = list.find((c) => String(c.id) === String(id));
        if (found) return found;
      }
    } catch {}

    return null;
  },

  /**
   * Deletes a conversation session.
   */
  async deleteConversation(id) {
    if (!id) return false;

    try {
      const token = await secureStorage.getItem("userToken");
      if (token) {
        await fetch(`${API_URL}/ai/conversations/${id}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
      }
    } catch (e) {}

    try {
      const raw = await AsyncStorage.getItem(LOCAL_CONVERSATIONS_KEY);
      if (raw) {
        const list = JSON.parse(raw);
        const filtered = list.filter((c) => String(c.id) !== String(id));
        await AsyncStorage.setItem(LOCAL_CONVERSATIONS_KEY, JSON.stringify(filtered));
      }
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Saves or updates a local conversation session.
   */
  async saveLocalConversation(conv) {
    if (!conv || !conv.id) return;
    try {
      const raw = await AsyncStorage.getItem(LOCAL_CONVERSATIONS_KEY);
      let list = raw ? JSON.parse(raw) : [];
      const idx = list.findIndex((c) => String(c.id) === String(conv.id));
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...conv, updated_at: new Date().toISOString() };
      } else {
        list.unshift({ ...conv, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
      }
      await AsyncStorage.setItem(LOCAL_CONVERSATIONS_KEY, JSON.stringify(list.slice(0, 50)));
    } catch {}
  },
};

export default ConversationService;
