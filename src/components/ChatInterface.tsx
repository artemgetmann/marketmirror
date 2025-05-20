import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Send, ChevronDown, ChevronUp, MessageCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

interface ChatInterfaceProps {
  sessionId: string;
  ticker: string;
}

export function ChatInterface({ sessionId, ticker }: ChatInterfaceProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const response = await fetch(
        "https://marketmirror-api.onrender.com/followup",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sessionId,
            question: userMessage.content,
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to get a response");
      }

      const data = await response.json();

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.answer,
        isUser: false,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      // Add error message
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "I couldn't answer that right now. Please try again later.",
        isUser: false,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);

    // If opening chat for the first time and no messages, add a welcome message
    if (!isOpen && messages.length === 0) {
      const welcomeMessage: Message = {
        id: Date.now().toString(),
        content: `Hi, I'm MarketMirror AI.\nWaging war on traditional finance!\n\nBuilt on the brain of Artem Getman — an investor pulling 41% annual returns with no fund, no pedigree — just results.\n\nGoldman Sachs. UBS. Deutsche.\nThey made the rules. I make them... Obsolete.\n\nAsk anything.\nLet's break their models — and build returns they only dream of ;)`,
        isUser: false,
        timestamp: new Date(),
      };

      setMessages([welcomeMessage]);
    }
  };

  return (
    <div className="mt-12 border-t border-gray-200 pt-6">
      {!isOpen ? (
        <Button
          onClick={toggleChat}
          className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg shadow transition-all duration-200"
        >
          <MessageCircle className="h-5 w-5" />
          <span className="font-medium">Ask MarketMirror Follow-up Questions</span>
        </Button>
      ) : (
        <div
          ref={chatContainerRef}
          className="border rounded-lg shadow-sm overflow-hidden bg-white"
        >
          {/* Chat header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 flex justify-between items-center">
            <h3 className="font-medium text-white flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              {ticker.toUpperCase()} Analysis Assistant
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleChat}
              className="h-8 w-8 p-0 rounded-full text-white hover:bg-blue-800/20"
              aria-label="Close chat"
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
          </div>

          {/* Messages container */}
          <div className="max-h-[500px] overflow-y-auto p-4 space-y-6 bg-gray-50">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex",
                  message.isUser ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-lg px-4 py-3",
                    message.isUser
                      ? "bg-blue-600 text-white"
                      : "bg-white border border-gray-200 shadow-sm"
                  )}
                >
                  <div className="prose prose-sm max-w-none break-words">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {message.content}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 shadow-sm flex items-center space-x-2">
                  <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                  <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                  <span className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <form
            onSubmit={handleSubmit}
            className="border-t border-gray-200 p-4 bg-white"
          >
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask about this analysis..."
                className="flex-1 rounded-md border border-gray-300 py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                disabled={isLoading}
              />
              <Button
                type="submit"
                className={cn(
                  "rounded-md flex items-center justify-center transition-colors py-2",
                  inputValue.trim() && !isLoading
                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                    : "bg-gray-200 text-gray-400 hover:bg-gray-300 cursor-not-allowed"
                )}
                disabled={!inputValue.trim() || isLoading}
                aria-label="Send message"
              >
                <Send className="h-4 w-4 mr-2" />
                Send
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
