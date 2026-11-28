import ConversationService from "../ConversationService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import secureStorage from "../secureStorage";

jest.mock("../secureStorage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe("ConversationService", () => {
  let storage = {};

  beforeEach(() => {
    jest.clearAllMocks();
    storage = {};
    AsyncStorage.getItem.mockImplementation(async (key) => storage[key] || null);
    AsyncStorage.setItem.mockImplementation(async (key, val) => {
      storage[key] = String(val);
    });
    AsyncStorage.removeItem.mockImplementation(async (key) => {
      delete storage[key];
    });
    global.fetch = jest.fn();
  });

  describe("listConversations", () => {
    it("returns local conversations when unauthenticated", async () => {
      secureStorage.getItem.mockResolvedValue(null);
      const mockLocal = [
        { id: "c1", title: "Milk comparison", updated_at: "2026-11-28" },
      ];
      storage["comparez_saved_conversations"] = JSON.stringify(mockLocal);

      const res = await ConversationService.listConversations();
      expect(res).toEqual(mockLocal);
    });

    it("fetches from backend when token is present and caches locally", async () => {
      secureStorage.getItem.mockResolvedValue("mock-jwt-token");
      const backendData = [
        { id: 101, title: "iPhone vs Galaxy", updated_at: "2026-11-28" },
      ];
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => backendData,
      });

      const res = await ConversationService.listConversations();
      expect(res).toEqual(backendData);

      const cached = storage["comparez_saved_conversations"];
      expect(JSON.parse(cached)).toEqual(backendData);
    });
  });

  describe("saveLocalConversation & deleteConversation", () => {
    it("saves and deletes conversations from local storage", async () => {
      secureStorage.getItem.mockResolvedValue(null);
      await ConversationService.saveLocalConversation({
        id: "test-conv-1",
        title: "Test Chat",
      });

      let list = await ConversationService.listConversations();
      expect(list.length).toBe(1);
      expect(list[0].title).toBe("Test Chat");

      await ConversationService.deleteConversation("test-conv-1");
      list = await ConversationService.listConversations();
      expect(list.length).toBe(0);
    });
  });

  describe("getConversation", () => {
    it("retrieves a conversation by id from local storage", async () => {
      secureStorage.getItem.mockResolvedValue(null);
      await ConversationService.saveLocalConversation({
        id: "conv-42",
        title: "Protein powder review",
      });

      const found = await ConversationService.getConversation("conv-42");
      expect(found).toBeTruthy();
      expect(found.title).toBe("Protein powder review");
    });
  });
});
