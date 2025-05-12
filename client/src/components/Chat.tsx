import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BsSendFill } from "react-icons/bs";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

// Types
interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
}

interface ChatProps {
  chat?: {
    id: string;
    title: string;
    messages: Message[];
  };
  onSubmit: (message: string) => void;
  currentMessage: string;
  setCurrentMessage: (message: string) => void;
  isGenerating: boolean;
  generatedText: string;
}

// Memoized CodeBlock component to prevent re-renders when parent state changes
const CodeBlock = React.memo(
  ({ language, value }: { language: string; value: string }) => {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-md overflow-hidden my-4"
      >
        <SyntaxHighlighter
          language={language}
          style={vscDarkPlus}
          customStyle={{
            borderRadius: "0.5rem",
            margin: 0,
          }}
        >
          {value}
        </SyntaxHighlighter>
      </motion.div>
    );
  }
);

// Memoized LoadingAnimation component
const LoadingAnimation = React.memo(() => {
  return (
    <div className="flex space-x-1.5 justify-center items-center h-6">
      <div
        className="h-2 w-2 bg-blue-500 rounded-full animate-bounce"
        style={{ animationDelay: "0ms" }}
      ></div>
      <div
        className="h-2 w-2 bg-blue-500 rounded-full animate-bounce"
        style={{ animationDelay: "150ms" }}
      ></div>
      <div
        className="h-2 w-2 bg-blue-500 rounded-full animate-bounce"
        style={{ animationDelay: "300ms" }}
      ></div>
    </div>
  );
});

// Memoized MessageContent component to prevent re-renders
const MessageContent = React.memo(
  ({ content, role }: { content: string; role: "user" | "assistant" }) => {
    // Memoize the markdown components configuration
    const markdownComponents = useMemo(
      () => ({
        code({ node, className, children, ...props }: any) {
          const match = /language-(\w+)/.exec(className || "");
          return match ? (
            <CodeBlock
              language={match[1]}
              value={String(children).replace(/\n$/, "")}
              {...props}
            />
          ) : (
            <code className={className} {...props}>
              {children}
            </code>
          );
        },
      }),
      []
    );

    if (role === "assistant") {
      return (
        <div className="flex items-start space-x-3">
          <img src="/logo-icon-black.png" alt="AI" className="w-6 h-6 mt-1" />
          <div className="prose dark:prose-invert max-w-none">
            <ReactMarkdown components={markdownComponents}>
              {content}
            </ReactMarkdown>
          </div>
        </div>
      );
    }
    return <div className="whitespace-pre-wrap">{content}</div>;
  }
);

const Chat = ({
  chat,
  onSubmit,
  currentMessage,
  setCurrentMessage,
  isGenerating,
}: ChatProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat?.messages]);

  // Update loading state based on isGenerating
  useEffect(() => {
    setIsLoading(isGenerating);

    // Auto-focus input when message generation completes
    if (!isGenerating && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isGenerating]);

  // Memoize handleSubmit to prevent recreation on every render
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (currentMessage.trim() && !isGenerating) {
        onSubmit(currentMessage.trim());
      }
    },
    [currentMessage, isGenerating, onSubmit]
  );

  // Memoize the handleChange function
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setCurrentMessage(e.target.value);
    },
    [setCurrentMessage]
  );

  // Welcome screen when no chat is selected
  if (!chat) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex-1 p-6 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 h-[94vh]"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl text-center"
        >
          <img
            src="/logo-icon-black.png"
            alt="AI Assistant"
            className="h-16 w-16 mx-auto mb-6"
          />
          <h1 className="text-3xl font-bold mb-4 dark:text-white">
            Welcome to Hyperchats
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-8">
            Start a new conversation by typing a message below or select an
            existing chat from the sidebar.
          </p>
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-lg mx-auto mt-4"
          >
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                placeholder="Ask me anything..."
                value={currentMessage}
                onChange={handleChange}
                className="w-full p-4 pr-12 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white shadow-sm"
                disabled={isGenerating}
                autoFocus
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="submit"
                disabled={!currentMessage.trim() || isGenerating}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-blue-600 dark:text-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <BsSendFill className="text-xl" />
              </motion.button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-[94vh] overflow-hidden bg-gray-50 dark:bg-gray-900">
      {/* Chat header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="p-4 border-b dark:border-gray-800 bg-white dark:bg-gray-800 shadow-sm"
      >
        <h2 className="font-medium text-lg dark:text-white">{chat.title}</h2>
      </motion.div>

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <AnimatePresence>
          {chat.messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[85%] md:max-w-[75%] rounded-2xl p-4 ${
                  message.role === "user"
                    ? "bg-blue-600 text-white rounded-tr-none"
                    : "bg-white dark:bg-gray-800 dark:text-white shadow-sm rounded-tl-none"
                }`}
              >
                <MessageContent content={message.content} role={message.role} />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Show loading animation when generating content */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <div className="max-w-[85%] md:max-w-[75%] rounded-2xl p-4 bg-white dark:bg-gray-800 dark:text-white shadow-sm rounded-tl-none">
              <div className="flex items-start space-x-3">
                <img
                  src="/logo-icon-black.png"
                  alt="AI"
                  className="w-6 h-6 mt-1"
                />
                <LoadingAnimation />
              </div>
            </div>
          </motion.div>
        )}

        {/* Empty div to enable scrolling to bottom */}
        <div ref={messagesEndRef} />
      </div>

      {/* Chat input */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="p-4 border-t dark:border-gray-800 bg-white dark:bg-gray-800"
      >
        <form onSubmit={handleSubmit} className="flex items-center">
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              placeholder="Type your message..."
              value={currentMessage}
              onChange={handleChange}
              className="w-full p-4 pr-12 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
              disabled={isGenerating}
              autoFocus
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="submit"
              disabled={!currentMessage.trim() || isGenerating}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-blue-600 dark:text-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <BsSendFill className="text-xl" />
            </motion.button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default Chat;
