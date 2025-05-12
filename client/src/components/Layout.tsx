import { useState, useEffect } from "react";
import {
  RedirectToSignIn,
  SignedIn,
  SignedOut,
  UserButton,
  useUser,
} from "@clerk/clerk-react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import Sidebar from "./Sidebar";
import Chat from "./Chat";
import { format, isToday, isYesterday, isSameYear } from "date-fns";
import axios from "axios";
import { Toaster, toast } from "sonner";

// Types
interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
}

interface ChatItem {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
}

// API service for chat operations
const API_BASE_URL = import.meta.env.VITE_API_URL;

const chatService = {
  // Create a new chat
  createChat: async (message: string, userId: string) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/chats`, {
        message,
        userId,
      });
      return response.data;
    } catch (error) {
      console.error("Error creating chat:", error);
      throw error;
    }
  },

  // Add a message to an existing chat
  addMessage: async (chatId: string, message: string, userId: string) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/chats`, {
        chatId,
        message,
        userId,
      });
      return response.data;
    } catch (error) {
      console.error("Error adding message:", error);
      throw error;
    }
  },

  // Get all chats for a user
  getUserChats: async (userId: string) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/chats?userId=${userId}`
      );
      return response.data.chats;
    } catch (error) {
      console.error("Error fetching chats:", error);
      throw error;
    }
  },

  // Get a specific chat
  getChat: async (chatId: string, userId: string) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/chats/${chatId}?userId=${userId}`
      );
      return response.data.chat;
    } catch (error) {
      console.error("Error fetching chat:", error);
      throw error;
    }
  },

  // Delete a chat
  deleteChat: async (chatId: string, userId: string) => {
    try {
      const response = await axios.delete(`${API_BASE_URL}/chats/${chatId}`, {
        data: { userId },
      });
      return response.data;
    } catch (error) {
      console.error("Error deleting chat:", error);
      throw error;
    }
  },
};

const Layout = () => {
  const navigate = useNavigate();
  const { chatId } = useParams();
  const { user } = useUser();
  const userId = user?.id;

  const [chats, setChats] = useState<ChatItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMessage, setCurrentMessage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedText, setGeneratedText] = useState("");

  // Format dates dynamically
  const formatDate = (date: Date): string => {
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    if (isSameYear(date, new Date())) return format(date, "MMM d");
    return format(date, "MMM d, yyyy");
  };

  // Create a new chat
  const createNewChat = async (message: string) => {
    if (!userId) {
      toast.error("Authentication required. Please sign in.");
      return;
    }

    try {
      // Create a temporary chat for optimistic UI update
      const tempId = `temp-${Date.now()}`;
      const tempChat: ChatItem = {
        id: tempId,
        title: message.slice(0, 30) + (message.length > 30 ? "..." : ""),
        messages: [
          {
            id: `msg-${Date.now()}`,
            content: message,
            role: "user",
            timestamp: new Date(),
          },
        ],
        createdAt: new Date(),
      };

      setChats((prevChats) => [tempChat, ...prevChats]);
      navigate(`/${tempId}`);
      setIsGenerating(true);
      setGeneratedText("");

      // Call API to create chat
      const response = await chatService.createChat(message, userId);

      // For streaming effect
      const aiResponse =
        response.chat.messages.find((msg: any) => msg.role === "assistant")
          ?.content || "";
      setGeneratedText(aiResponse);

      // Update the chat with actual data from server
      setTimeout(() => {
        setChats((prevChats) => {
          const updatedChats = prevChats.filter((chat) => chat.id !== tempId);

          // Map the response data to our format
          const serverChat = response.chat;
          const newChat: ChatItem = {
            id: serverChat._id,
            title: serverChat.title,
            messages: serverChat.messages.map((msg: any) => ({
              id: msg._id || `msg-${Date.now()}-${Math.random()}`,
              content: msg.content,
              role: msg.role,
              timestamp: new Date(msg.timestamp),
            })),
            createdAt: new Date(serverChat.createdAt),
          };

          return [newChat, ...updatedChats];
        });

        // Navigate to the real chat URL with the permanent ID
        navigate(`/${response.chat._id}`);
        setIsGenerating(false);
        setGeneratedText("");
      }, aiResponse.length * 15 + 500);
    } catch (error) {
      console.error("Error creating chat:", error);
      setIsGenerating(false);
      setGeneratedText("");

      // Show error toast
      toast.error("Failed to create new chat. Please try again.");

      // Remove temporary chat if it exists
      setChats((prevChats) =>
        prevChats.filter((chat) => !chat.id.startsWith("temp-"))
      );
    }
  };

  // Add message to existing chat
  const addMessageToChat = async (chatId: string, message: string) => {
    if (!userId) {
      toast.error("Authentication required. Please sign in.");
      return;
    }

    try {
      // Add message optimistically for immediate UI update
      const msgId = `msg-${Date.now()}`;
      setChats((prevChats) => {
        return prevChats.map((chat) => {
          if (chat.id === chatId) {
            return {
              ...chat,
              messages: [
                ...chat.messages,
                {
                  id: msgId,
                  content: message,
                  role: "user",
                  timestamp: new Date(),
                },
              ],
            };
          }
          return chat;
        });
      });

      setIsGenerating(true);
      setGeneratedText("");

      // Call API to add message to chat
      const response = await chatService.addMessage(chatId, message, userId);

      // For streaming effect
      const aiResponse = response.message.content;
      setGeneratedText(aiResponse);

      // Update state with AI response after simulating streaming effect
      setTimeout(() => {
        setChats((prevChats) => {
          return prevChats.map((chat) => {
            if (chat.id === chatId) {
              const aiMessage = response.message;
              return {
                ...chat,
                messages: [
                  ...chat.messages,
                  {
                    id: aiMessage._id || `msg-${Date.now()}-${Math.random()}`,
                    content: aiMessage.content,
                    role: "assistant",
                    timestamp: new Date(aiMessage.timestamp),
                  },
                ],
              };
            }
            return chat;
          });
        });

        setIsGenerating(false);
        setGeneratedText("");
      }, aiResponse.length * 15 + 500);
    } catch (error) {
      console.error("Error adding message:", error);
      setIsGenerating(false);
      setGeneratedText("");

      // Show error toast
      toast.error("Failed to send message. Please try again.");

      // Remove the optimistically added message
      setChats((prevChats) => {
        return prevChats.map((chat) => {
          if (chat.id === chatId) {
            return {
              ...chat,
              messages: chat.messages.filter(
                (msg) => !msg.id.startsWith("msg-")
              ),
            };
          }
          return chat;
        });
      });
    }
  };

  // Handle form submission
  const handleSubmit = (message: string) => {
    setCurrentMessage("");

    if (!chatId || chatId === "new") {
      createNewChat(message);
    } else {
      addMessageToChat(chatId, message);
    }
  };

  // Delete chat
  const handleDeleteChat = async (id: string) => {
    if (!userId) {
      toast.error("Authentication required. Please sign in.");
      return;
    }

    // Store the chat being deleted for potential recovery
    const deletedChat = chats.find((chat) => chat.id === id);

    try {
      // Delete from UI first (optimistic update)
      setChats((prevChats) => prevChats.filter((chat) => chat.id !== id));

      if (chatId === id) {
        if (chats.length > 1) {
          const remainingChats = chats.filter((chat) => chat.id !== id);
          navigate(`/${remainingChats[0].id}`);
        } else {
          navigate("/");
        }
      }

      // Delete from server
      await chatService.deleteChat(id, userId);

      // Show success toast
      toast.success("Chat deleted successfully");
    } catch (error) {
      console.error("Error deleting chat:", error);

      // Show error toast
      toast.error("Failed to delete chat. Please try again.");

      // Restore the deleted chat if it exists
      if (deletedChat) {
        setChats((prevChats) => [...prevChats, deletedChat]);
      }
    }
  };

  // Load user's chats from API
  useEffect(() => {
    const fetchChats = async () => {
      if (!userId) return;

      try {
        setLoading(true);
        const fetchedChats = await chatService.getUserChats(userId);

        // Map the API response to our format
        const formattedChats: ChatItem[] = fetchedChats.map((chat: any) => ({
          id: chat._id,
          title: chat.title,
          createdAt: new Date(chat.createdAt),
          messages: [], // Initially empty, will load details when clicking on a chat
        }));

        setChats(formattedChats);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching chats:", error);
        setLoading(false);
        toast.error("Failed to load your chats. Please refresh the page.");
      }
    };

    fetchChats();
  }, [userId]);

  // Load chat details when a specific chat is selected
  useEffect(() => {
    const loadChatDetails = async () => {
      // Don't load if it's a new chat or temporary chat
      if (!userId || !chatId || chatId === "new" || chatId.startsWith("temp-"))
        return;

      // Don't reload if we already have the messages
      const existingChat = chats.find((c) => c.id === chatId);
      if (
        existingChat &&
        existingChat.messages &&
        existingChat.messages.length > 0
      )
        return;

      try {
        const chatDetails = await chatService.getChat(chatId, userId);

        if (!chatDetails) return;

        // Update the chat with full details
        setChats((prevChats) => {
          return prevChats.map((chat) => {
            if (chat.id === chatId) {
              return {
                ...chat,
                messages: chatDetails.messages.map((msg: any) => ({
                  id: msg._id || `msg-${Date.now()}-${Math.random()}`,
                  content: msg.content,
                  role: msg.role,
                  timestamp: new Date(msg.timestamp),
                })),
              };
            }
            return chat;
          });
        });
      } catch (error) {
        console.error("Error loading chat details:", error);
        toast.error("Failed to load chat details. Please try again.");
      }
    };

    loadChatDetails();
  }, [chatId, userId, chats]);

  // Find current chat
  const currentChat = chats.find((chat) => chat.id === chatId);

  return (
    <>
      {/* Add Sonner Toaster component */}
      <Toaster
        position="top-right"
        closeButton
        richColors
        visibleToasts={3}
        toastOptions={{
          duration: 3000,
          className: "my-toast-class",
          style: {
            background: "var(--background)",
            color: "var(--foreground)",
          },
        }}
      />

      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
      <SignedIn>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="flex h-screen overflow-hidden"
        >
          <Sidebar
            loading={loading}
            chats={chats}
            onDeleteChat={handleDeleteChat}
            formatDate={formatDate}
          />
          <div className="w-full min-h-screen">
            <div className="flex items-center justify-end px-5 py-2 bg-gray-100 border-b">
              <UserButton />
            </div>
            <Chat
              chat={currentChat}
              onSubmit={handleSubmit}
              currentMessage={currentMessage}
              setCurrentMessage={setCurrentMessage}
              isGenerating={isGenerating}
              generatedText={generatedText}
            />
          </div>
        </motion.div>
      </SignedIn>
    </>
  );
};

export default Layout;
