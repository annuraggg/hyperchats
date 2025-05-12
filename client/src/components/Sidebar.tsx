import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  PlusCircle,
  Trash2,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Types
interface ChatItem {
  id: string;
  title: string;
  createdAt: Date;
}

interface SidebarProps {
  chats: ChatItem[];
  onDeleteChat: (id: string) => void;
  formatDate: (date: Date) => string;
  loading: boolean;
}

const Sidebar = ({
  chats,
  onDeleteChat,
  formatDate,
  loading,
}: SidebarProps) => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(true);
  const [hoveredChatId, setHoveredChatId] = useState<string | null>(null);

  // Group chats by date
  const groupedChats = chats.reduce<Record<string, ChatItem[]>>(
    (groups, chat) => {
      const dateLabel = formatDate(chat.createdAt);
      if (!groups[dateLabel]) {
        groups[dateLabel] = [];
      }
      groups[dateLabel].push(chat);
      return groups;
    },
    {}
  );

  return (
    <motion.div
      initial={{ width: 320, opacity: 1 }}
      animate={{ width: isOpen ? 320 : 80 }}
      className="h-screen bg-gray-100 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden relative z-20"
    >
      {/* Logo and header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="p-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-700"
      >
        <div className="flex items-center">
          <img src="/logo-icon.svg" alt="Logo" className="h-8 w-8 mr-2" />
          {isOpen && (
            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xl font-semibold text-gray-900 dark:text-white"
            >
              Hyperchats
            </motion.h1>
          )}
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          {isOpen ? (
            <ChevronLeft className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          ) : (
            <ChevronRight className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          )}
        </button>
      </motion.div>

      {/* New chat button */}
      <motion.div whileHover={{ scale: 1.01 }} className="p-3">
        <Link
          to="/new"
          className="flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md w-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
        >
          <PlusCircle className="h-5 w-5" />
          {isOpen && <span className="font-medium">New Chat</span>}
        </Link>
      </motion.div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-3">
            {isOpen && (
              <div className="space-y-2">
                {[1, 2, 3].map((n) => (
                  <motion.div
                    key={n}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: n * 0.1 }}
                    className="h-12 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse"
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <AnimatePresence>
            {Object.keys(groupedChats).length > 0 ? (
              Object.entries(groupedChats).map(([date, dateChats]) => (
                <motion.div
                  key={date}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {isOpen && (
                    <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {date}
                    </div>
                  )}
                  <div className="space-y-1 px-3">
                    {dateChats.map((chat) => {
                      const isActive =
                        location.pathname === `/${chat.id}` ||
                        (location.pathname === "/" && chats[0]?.id === chat.id);

                      return (
                        <motion.div
                          key={chat.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          transition={{ duration: 0.2 }}
                          className="relative"
                          onMouseEnter={() => setHoveredChatId(chat.id)}
                          onMouseLeave={() => setHoveredChatId(null)}
                        >
                          <Link
                            to={`/${chat.id}`}
                            className={`flex items-center py-2 px-3 rounded-md ${
                              isActive
                                ? "bg-blue-100/80 dark:bg-blue-900/40 text-blue-700 dark:text-blue-200"
                                : "hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200"
                            }`}
                          >
                            <MessageSquare
                              className={`h-4 w-4 ${
                                isOpen ? "mr-3" : ""
                              } flex-shrink-0`}
                            />
                            {!isOpen ? (
                              <span className="sr-only">{chat.title}</span>
                            ) : (
                              <div className="truncate pr-8">{chat.title}</div>
                            )}
                          </Link>

                          {isOpen && hoveredChatId === chat.id && (
                            <motion.button
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onDeleteChat(chat.id);
                              }}
                              aria-label="Delete chat"
                            >
                              <Trash2 className="h-4 w-4" />
                            </motion.button>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                {isOpen ? "No chats yet" : ""}
              </div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* User info section */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-3">
        <div
          className={`flex items-center ${
            isOpen ? "justify-between" : "justify-center"
          } bg-gray-200 dark:bg-gray-700 rounded-md p-2`}
        >
          <div className="flex items-center">
            <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-sm">
              {isOpen ? "A" : "A"}
            </div>
            {isOpen && (
              <div className="ml-2">
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  annuraggg1
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  @annuraggg1
                </div>
              </div>
            )}
          </div>
          {isOpen && (
            <button
              className="p-1.5 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600"
              aria-label="User settings"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-gray-500 dark:text-gray-400"
              >
                <circle cx="12" cy="12" r="1" />
                <circle cx="19" cy="12" r="1" />
                <circle cx="5" cy="12" r="1" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default Sidebar;
