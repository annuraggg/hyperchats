import * as dotenv from "dotenv";
dotenv.config();

import type { Context } from "hono";
import { Chat } from "@/models/Chat.js";
import type { IMessage } from "@/models/Chat.js";

const CF_API_ENDPOINT = "https://api.cloudflare.com/client/v4/accounts";
const MODEL = "@cf/meta/llama-3-8b-instruct";
const API_TIMEOUT = 30000;

const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID || "";
const CF_API_TOKEN = process.env.CF_API_TOKEN || "";

async function callCloudflareAI(prompt: string, maxTokens = 500) {
  if (!CF_ACCOUNT_ID || !CF_API_TOKEN) {
    console.error("Missing Cloudflare credentials:", {
      accountIdExists: !!CF_ACCOUNT_ID,
      apiTokenExists: !!CF_API_TOKEN,
    });
    throw new Error("Cloudflare API credentials are missing or invalid");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    console.log(
      `Calling Cloudflare AI API with account ID: ${CF_ACCOUNT_ID.slice(
        0,
        5
      )}...`
    );

    const response = await fetch(
      `${CF_API_ENDPOINT}/${CF_ACCOUNT_ID}/ai/run/${MODEL}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${CF_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
        }),
        signal: controller.signal,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `Cloudflare AI API responded with status ${response.status}:`,
        errorText
      );
      throw new Error(
        `Cloudflare AI API error (${response.status}): ${errorText}`
      );
    }

    const result = await response.json();

    if (result && result.result && result.result.response) {
      return result.result.response;
    } else {
      console.warn(
        "Unexpected response format from Cloudflare AI API:",
        result
      );
      return "I couldn't generate an appropriate response.";
    }
  } catch (error) {
    console.error("Error calling Cloudflare AI API:", error);
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function generateChatTitle(userMessage: string): Promise<string> {
  try {
    const prompt = `Based on the following user message, generate a short, concise title (3-6 words only). Return ONLY the title, no quotes or additional text.

User message: "${userMessage}"`;

    const response = await callCloudflareAI(prompt, 20);

    let title = response?.trim() || "";
    title = title.replace(/^["'](.+)["']$/, "$1");

    if (!title || title.length < 2) {
      return "New conversation";
    }

    return title;
  } catch (error) {
    console.error("Error generating title:", error);
    return "New conversation";
  }
}

async function generateResponse(userMessage: string): Promise<string> {
  try {
    const prompt = `Please respond to the following message in a helpful and concise way: "${userMessage}"`;
    return await callCloudflareAI(prompt);
  } catch (error) {
    console.error("Error generating response:", error);
    return "I apologize, but I encountered an issue processing your request. Please try again.";
  }
}

async function createNewChat(c: Context) {
  try {
    const { message, userId } = await c.req.json();

    console.log("Creating new chat with environment variables:", {
      CF_ACCOUNT_ID: CF_ACCOUNT_ID
        ? `${CF_ACCOUNT_ID.slice(0, 5)}...`
        : "undefined",
      CF_API_TOKEN: CF_API_TOKEN ? "present" : "undefined",
    });

    if (!message || !userId) {
      return c.json({ error: "Message and userId are required" }, 400);
    }

    let title = "New conversation";
    try {
      title = await generateChatTitle(message);
    } catch (titleError) {
      console.error(
        "Failed to generate chat title, using default:",
        titleError
      );
    }

    const userMessage: IMessage = {
      content: message,
      role: "user",
      timestamp: new Date(),
    };

    const newChat = new Chat({
      title,
      messages: [userMessage],
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const savedChat = await newChat.save();

    let aiResponseContent =
      "I'm sorry, I couldn't process your request at this time.";
    try {
      aiResponseContent = await generateResponse(message);
    } catch (responseError) {
      console.error(
        "Failed to generate AI response, using default:",
        responseError
      );
    }

    const aiMessage: IMessage = {
      content: aiResponseContent,
      role: "assistant",
      timestamp: new Date(),
    };

    savedChat.messages.push(aiMessage);
    await savedChat.save();

    return c.json(
      {
        success: true,
        chat: {
          _id: savedChat._id,
          title: savedChat.title,
          messages: savedChat.messages,
          createdAt: savedChat.createdAt,
        },
      },
      201
    );
  } catch (error) {
    console.error("Error creating new chat:", error);
    return c.json({ error: "Failed to create new chat" }, 500);
  }
}

async function addMessageToChat(c: Context) {
  try {
    const { message, chatId, userId } = await c.req.json();

    if (!message || !chatId || !userId) {
      return c.json({ error: "Message, chatId, and userId are required" }, 400);
    }

    const chat = await Chat.findOne({
      _id: chatId,
      userId,
    });

    if (!chat) {
      return c.json({ error: "Chat not found" }, 404);
    }

    const userMessage: IMessage = {
      content: message,
      role: "user",
      timestamp: new Date(),
    };
    chat.messages.push(userMessage);
    await chat.save();

    let aiResponseContent =
      "I'm sorry, I couldn't process your request at this time.";
    try {
      aiResponseContent = await generateResponse(message);
    } catch (responseError) {
      console.error(
        "Failed to generate AI response, using default:",
        responseError
      );
    }

    const aiMessage: IMessage = {
      content: aiResponseContent,
      role: "assistant",
      timestamp: new Date(),
    };
    chat.messages.push(aiMessage);
    await chat.save();

    return c.json({
      success: true,
      message: aiMessage,
      chatId: chat._id,
    });
  } catch (error) {
    console.error("Error adding message to chat:", error);
    return c.json({ error: "Failed to add message to chat" }, 500);
  }
}

async function handleChat(c: Context) {
  try {
    const body = await c.req.json();

    if (!body.message || !body.userId) {
      return c.json({ error: "Message and userId are required" }, 400);
    }

    if (body.chatId) {
      return addMessageToChat(c);
    }

    return createNewChat(c);
  } catch (error) {
    console.error("Error in handleChat:", error);
    return c.json({ error: "An error occurred processing your request" }, 500);
  }
}

async function getUserChats(c: Context) {
  try {
    const userId = c.req.query("userId");

    if (!userId) {
      return c.json({ error: "User ID is required" }, 400);
    }

    const chats = await Chat.find({ userId })
      .select("_id title createdAt updatedAt")
      .sort({ updatedAt: -1 });

    return c.json({ chats });
  } catch (error) {
    console.error("Error fetching user chats:", error);
    return c.json({ error: "Failed to fetch chats" }, 500);
  }
}

async function getChat(c: Context) {
  try {
    const chatId = c.req.param("id");
    const userId = c.req.query("userId");

    if (!userId) {
      return c.json({ error: "User ID is required" }, 400);
    }

    const chat = await Chat.findOne({
      _id: chatId,
      userId,
    });

    if (!chat) {
      return c.json({ error: "Chat not found" }, 404);
    }

    return c.json({ chat });
  } catch (error) {
    console.error("Error fetching chat:", error);
    return c.json({ error: "Failed to fetch chat" }, 500);
  }
}

async function deleteChat(c: Context) {
  try {
    const chatId = c.req.param("id");
    const { userId } = await c.req.json();

    if (!userId) {
      return c.json({ error: "User ID is required" }, 400);
    }

    const result = await Chat.deleteOne({
      _id: chatId,
      userId,
    });

    if (result.deletedCount === 0) {
      return c.json(
        { error: "Chat not found or not authorized to delete" },
        404
      );
    }

    return c.json({ success: true, message: "Chat deleted successfully" });
  } catch (error) {
    console.error("Error deleting chat:", error);
    return c.json({ error: "Failed to delete chat" }, 500);
  }
}

export default {
  handleChat,
  getUserChats,
  getChat,
  deleteChat,
};
