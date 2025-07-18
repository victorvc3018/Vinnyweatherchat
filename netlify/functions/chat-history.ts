import type { Handler } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

const CHAT_HISTORY_KEY = "global-chat-history";

const handler: Handler = async (event) => {
  // Use a descriptive name for your blob store
  const store = getStore("chat-history-store");

  switch (event.httpMethod) {
    case "GET":
      try {
        const history = await store.get(CHAT_HISTORY_KEY, { type: "json" });
        return {
          statusCode: 200,
          headers: { "Content-Type": "application/json" },
          // Return an empty array if history is null/undefined
          body: JSON.stringify(history || []),
        };
      } catch (error) {
        console.error("Error retrieving chat history:", error);
        return {
          statusCode: 500,
          body: JSON.stringify({ error: "Failed to retrieve chat history." }),
        };
      }

    case "POST":
      try {
        if (!event.body) {
          return { statusCode: 400, body: "Bad Request: No body provided." };
        }
        // The body is already parsed as a JavaScript object by Netlify Functions
        const messages = JSON.parse(event.body);
        await store.setJSON(CHAT_HISTORY_KEY, messages);
        return {
          statusCode: 200,
          body: JSON.stringify({ success: true }),
        };
      } catch (error) {
        console.error("Error saving chat history:", error);
        return {
          statusCode: 500,
          body: JSON.stringify({ error: "Failed to save chat history." }),
        };
      }

    default:
      return {
        statusCode: 405,
        headers: { "Allow": "GET, POST" },
        body: "Method Not Allowed",
      };
  }
};

export { handler };
