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
  isTyping?: boolean;
  displayedContent?: string;
}

interface ChatInterfaceProps {
  sessionId: string;
  ticker: string;
}

// Welcome message with exact line breaks as specified
const welcomeMessageTemplate = 
`Hi, I'm MarketMirror AI.
Waging war on traditional finance!

Built on the brain of Artem Getman — an investor  
pulling 41% annual returns with no fund, no pedigree — just results.

Goldman Sachs. UBS. Deutsche.  
They made the rules. I make them... Obsolete.

Ask anything.  
Let's break their models — and build returns they only dream of ;)`;

export function ChatInterface({ sessionId, ticker }: ChatInterfaceProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [activeTypingMessageId, setActiveTypingMessageId] = useState<string | null>(null);
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
  }, [messages, isTyping]);

  // Typewriter effect for any message
  useEffect(() => {
    if (isTyping && activeTypingMessageId) {
      const messageToType = messages.find(m => m.id === activeTypingMessageId);
      
      if (!messageToType) {
        setIsTyping(false);
        return;
      }
      
      const fullContent = messageToType.content;
      let currentPosition = 0;
      
      const typingInterval = setInterval(() => {
        if (currentPosition <= fullContent.length) {
          setMessages(prev => 
            prev.map(m => 
              m.id === activeTypingMessageId 
                ? { ...m, displayedContent: fullContent.substring(0, currentPosition) } 
                : m
            )
          );
          currentPosition++;
        } else {
          clearInterval(typingInterval);
          setActiveTypingMessageId(null);
          setIsTyping(false);
          
          // Mark typing as complete
          setMessages(prev => 
            prev.map(m => 
              m.id === activeTypingMessageId 
                ? { ...m, isTyping: false } 
                : m
            )
          );
        }
      }, 10); // faster typing speed for responses
      
      return () => clearInterval(typingInterval);
    }
  }, [isTyping, activeTypingMessageId, messages]);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Start typewriter animation for a message
  const startTypingAnimation = (messageId: string) => {
    setActiveTypingMessageId(messageId);
    setIsTyping(true);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!inputValue.trim() || isLoading || isTyping) return;

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
        displayedContent: "", // Start empty for typewriter effect
        isUser: false,
        timestamp: new Date(),
        isTyping: true,
      };

      setMessages((prev) => [...prev, aiMessage]);
      
      // Start typewriter effect for the AI response
      setTimeout(() => {
        startTypingAnimation(aiMessage.id);
      }, 300);
      
    } catch (error) {
      // Add error message
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "I couldn't answer that right now. Please try again later.",
        displayedContent: "", // Start empty for typewriter effect
        isUser: false,
        timestamp: new Date(),
        isTyping: true,
      };

      setMessages((prev) => [...prev, errorMessage]);
      
      // Start typewriter effect for the error message
      setTimeout(() => {
        startTypingAnimation(errorMessage.id);
      }, 300);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);

    // If opening chat for the first time and no messages, add a welcome message
    if (!isOpen && messages.length === 0) {
      const welcomeId = Date.now().toString();
      const welcomeMessage: Message = {
        id: welcomeId,
        content: welcomeMessageTemplate,
        displayedContent: "", // Start empty for typewriter effect
        isUser: false,
        timestamp: new Date(),
        isTyping: true,
      };

      setMessages([welcomeMessage]);
      
      // Start typewriter effect immediately
      setActiveTypingMessageId(welcomeId);
      setIsTyping(true);
    }
  };

  return (
    <div className="mt-12 border-t border-gray-200 pt-6">
      {!isOpen ? (
        <Button
          onClick={toggleChat}
          className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-900 hover:to-black text-white rounded-lg shadow transition-all duration-200"
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
          <div className="bg-gradient-to-r from-gray-800 to-gray-900 p-4 flex justify-between items-center">
            <h3 className="font-medium text-white flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              MarketMirror
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleChat}
              className="h-8 w-8 p-0 rounded-full text-white hover:bg-white/10"
              aria-label="Close chat"
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
          </div>

          {/* Messages container */}
          <div className="max-h-[500px] overflow-y-auto p-4 space-y-6 bg-gray-50">
            {messages.map((message, index) => (
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
                      ? "bg-gray-800 text-white"
                      : "bg-white border border-gray-200 shadow-sm"
                  )}
                >
                  {message.isTyping ? (
                    <div className="prose prose-sm max-w-none whitespace-pre-line">
                      {message.displayedContent}
                      <span className="inline-block w-1 h-4 bg-gray-400 ml-0.5 animate-pulse"></span>
                    </div>
                  ) : (
                    <div className="prose prose-sm max-w-none whitespace-pre-line">
                      {message.content}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 shadow-sm flex items-center space-x-2">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                  <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                  <span className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
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
                className="flex-1 rounded-md border border-gray-300 py-2 px-4 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent text-sm"
                disabled={isLoading || isTyping}
              />
              <Button
                type="submit"
                className={cn(
                  "rounded-md flex items-center justify-center transition-colors py-2",
                  inputValue.trim() && !isLoading && !isTyping
                    ? "bg-gray-800 hover:bg-gray-900 text-white"
                    : "bg-gray-200 text-gray-400 hover:bg-gray-300 cursor-not-allowed"
                )}
                disabled={!inputValue.trim() || isLoading || isTyping}
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
