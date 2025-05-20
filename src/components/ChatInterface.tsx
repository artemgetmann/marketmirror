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
  animationComplete?: boolean;
}

interface TypewriterState {
  messageId: string;
  text: string;
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
  const [activeTyping, setActiveTyping] = useState<TypewriterState | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [userScrolledUp, setUserScrolledUp] = useState(false);
  const [messageHistory, setMessageHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Load messages from localStorage when component mounts
  useEffect(() => {
    if (sessionId) {
      const savedMessages = localStorage.getItem(`chat_${sessionId}`);
      if (savedMessages) {
        try {
          const parsed = JSON.parse(savedMessages);
          // Convert string timestamps back to Date objects
          const messagesWithDates = parsed.map((message: any) => ({
            ...message,
            timestamp: new Date(message.timestamp),
            animationComplete: true // Ensure all loaded messages show completely
          }));
          setMessages(messagesWithDates);
        } catch (e) {
          console.error("Error parsing saved messages:", e);
        }
      }

      // Load message history for this session
      const savedHistory = localStorage.getItem(`history_${sessionId}`);
      if (savedHistory) {
        try {
          setMessageHistory(JSON.parse(savedHistory));
        } catch (e) {
          console.error("Error parsing saved message history:", e);
        }
      }
    }
  }, [sessionId]);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (sessionId && messages.length > 0) {
      localStorage.setItem(`chat_${sessionId}`, JSON.stringify(messages));
    }
  }, [messages, sessionId]);

  // Save message history to localStorage
  useEffect(() => {
    if (sessionId && messageHistory.length > 0) {
      localStorage.setItem(`history_${sessionId}`, JSON.stringify(messageHistory));
    }
  }, [messageHistory, sessionId]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Handle scrolling with user override capability
  useEffect(() => {
    // Only auto-scroll when a new message is added, not during typing animation
    // And definitely not when animation completes
    const isNewMessage = messages.length > 0 && 
      messages[messages.length - 1].id !== (activeTyping?.messageId || '');
      
    // Don't scroll if user has scrolled up or animation just finished
    if (autoScroll && !userScrolledUp && isNewMessage && activeTyping) {
      scrollToBottom(false);
    }
  }, [messages, activeTyping, autoScroll, userScrolledUp]);

  // Detect user scroll to override auto-scrolling
  useEffect(() => {
    const messagesContainer = messagesContainerRef.current;
    if (!messagesContainer) return;

    let lastScrollTop = messagesContainer.scrollTop;
    let scrollTimeout: NodeJS.Timeout | null = null;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainer;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
      const scrolledUp = scrollTop < lastScrollTop;
      
      if (scrolledUp) {
        setUserScrolledUp(true);
        setAutoScroll(false);
      } else if (isAtBottom) {
        setUserScrolledUp(false);
        setAutoScroll(true);
      }
      
      lastScrollTop = scrollTop;
      
      // Clear existing timeout
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
      
      // Set a new timeout to detect when scrolling has stopped
      scrollTimeout = setTimeout(() => {
        // If at bottom when scrolling stops, enable auto-scroll again
        if (isAtBottom) {
          setAutoScroll(true);
          setUserScrolledUp(false);
        }
      }, 100);
    };

    messagesContainer.addEventListener('scroll', handleScroll);
    return () => {
      messagesContainer.removeEventListener('scroll', handleScroll);
      if (scrollTimeout) clearTimeout(scrollTimeout);
    };
  }, []);

  // Check for messages that need typewriter animation
  useEffect(() => {
    // Find the first message that needs animation
    const messageToAnimate = messages.find(
      (m) => !m.isUser && !m.animationComplete
    );

    if (messageToAnimate && !activeTyping) {
      // Start animation for this message
      setActiveTyping({
        messageId: messageToAnimate.id,
        text: ""
      });
    }
  }, [messages, activeTyping]);

  // Typewriter effect
  useEffect(() => {
    if (activeTyping) {
      const currentMessage = messages.find(m => m.id === activeTyping.messageId);
      
      if (!currentMessage) {
        setActiveTyping(null);
        return;
      }
      
      const fullContent = currentMessage.content;
      const currentPosition = activeTyping.text.length;
      
      if (currentPosition < fullContent.length) {
        // Continue typing with appropriate speeds
        const isWelcomeMessage = currentMessage === messages[0];
        
        // Restore welcome message speed to original 20ms, make other messages faster
        const typingSpeed = isWelcomeMessage ? 20 : 10;
        
        // Adjust characters per step based on message type
        const charsPerStep = isWelcomeMessage 
          ? 1 // Type one character at a time for welcome message
          : Math.max(1, Math.floor(fullContent.length / 200)); // Faster progression for other messages
        
        const nextPosition = Math.min(fullContent.length, currentPosition + charsPerStep);
        
        const typingTimeout = setTimeout(() => {
          setActiveTyping({
            messageId: activeTyping.messageId,
            text: fullContent.substring(0, nextPosition)
          });
        }, typingSpeed);
        
        return () => clearTimeout(typingTimeout);
      } else {
        // Animation completed - don't scroll to bottom
        // Just update the message state to show it's complete
        setMessages(prev => 
          prev.map(m => 
            m.id === activeTyping.messageId 
              ? { ...m, animationComplete: true }
              : m
          )
        );
        // Remove active typing state without triggering any scrolling
        setActiveTyping(null);
      }
    }
  }, [activeTyping, messages]);

  const scrollToBottom = (smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: smooth ? "smooth" : "auto"
      });
    }
  };

  // Skip typing animation for current message
  const skipAnimation = () => {
    if (activeTyping) {
      const currentMessage = messages.find(m => m.id === activeTyping.messageId);
      if (currentMessage) {
        setActiveTyping(null);
        setMessages(prev => 
          prev.map(m => 
            m.id === activeTyping.messageId 
              ? { ...m, animationComplete: true }
              : m
          )
        );
      }
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!inputValue.trim() || isLoading) return;
    
    // Skip any ongoing animation when user sends new message
    skipAnimation();

    // Enable auto-scrolling when user sends a message
    setAutoScroll(true);
    setUserScrolledUp(false);
    
    // Skip any ongoing animation when user sends new message
    skipAnimation();

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      isUser: true,
      timestamp: new Date(),
      animationComplete: true
    };

    // Add to message history for up/down navigation
    setMessageHistory(prev => [...prev, inputValue]);
    setHistoryIndex(-1);

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
        animationComplete: false
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      // Add error message
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "I couldn't answer that right now. Please try again later.",
        isUser: false,
        timestamp: new Date(),
        animationComplete: false
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle keyboard navigation through message history
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (messageHistory.length === 0) return;

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const newIndex = historyIndex < messageHistory.length - 1 ? historyIndex + 1 : historyIndex;
      setHistoryIndex(newIndex);
      if (newIndex >= 0 && newIndex < messageHistory.length) {
        setInputValue(messageHistory[messageHistory.length - 1 - newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const newIndex = historyIndex > 0 ? historyIndex - 1 : -1;
      setHistoryIndex(newIndex);
      if (newIndex >= 0) {
        setInputValue(messageHistory[messageHistory.length - 1 - newIndex]);
      } else {
        setInputValue('');
      }
    }
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);

    // If opening chat for the first time and no messages, add a welcome message
    if (!isOpen && messages.length === 0) {
      // Add welcome message
      const welcomeMessage: Message = {
        id: Date.now().toString(),
        content: welcomeMessageTemplate,
        isUser: false,
        timestamp: new Date(),
        animationComplete: false
      };

      setMessages([welcomeMessage]);
      setAutoScroll(true);
      setUserScrolledUp(false);
    }
  };

  // Clear chat history function
  const clearChat = () => {
    if (sessionId) {
      localStorage.removeItem(`chat_${sessionId}`);
      localStorage.removeItem(`history_${sessionId}`);
      setMessages([]);
      setMessageHistory([]);
      
      // Add welcome message back
      const welcomeMessage: Message = {
        id: Date.now().toString(),
        content: welcomeMessageTemplate,
        isUser: false,
        timestamp: new Date(),
        animationComplete: false
      };
      
      setMessages([welcomeMessage]);
    }
  };

  const getMessageDisplay = (message: Message) => {
    // Show typewriter text for active animation or full content when complete
    const textContent = activeTyping && activeTyping.messageId === message.id
      ? activeTyping.text
      : message.content;
    
    // Always render with ReactMarkdown for consistent formatting
    return (
      <div>
        <ReactMarkdown 
          remarkPlugins={[remarkGfm]}
          components={{
            // Custom rendering for links
            a: ({ node, ...props }: any) => (
              <a 
                {...props} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-blue-600 hover:underline"
              />
            ),
            // Custom rendering for bold/strong
            strong: ({ node, ...props }: any) => (
              <strong {...props} className="font-bold" />
            ),
            // Add styling for headers
            h1: ({ node, ...props }: any) => (
              <h1 {...props} className="text-xl font-semibold mt-4 mb-2" />
            ),
            h2: ({ node, ...props }: any) => (
              <h2 {...props} className="text-lg font-semibold mt-3 mb-2" />
            ),
            h3: ({ node, ...props }: any) => (
              <h3 {...props} className="text-base font-semibold mt-2 mb-1" />
            ),
            // Add styling for lists
            ul: ({ node, ...props }: any) => (
              <ul {...props} className="list-disc pl-5 my-2" />
            ),
            ol: ({ node, ...props }: any) => (
              <ol {...props} className="list-decimal pl-5 my-2" />
            ),
            // Add styling for block quotes
            blockquote: ({ node, ...props }: any) => (
              <blockquote {...props} className="border-l-4 border-gray-300 pl-4 italic my-2" />
            ),
            // Add styling for code blocks
            code: ({ node, inline, ...props }: any) => (
              inline 
                ? <code {...props} className="bg-gray-100 px-1 py-0.5 rounded text-[14px] font-mono" />
                : <code {...props} className="block bg-gray-100 p-2 rounded text-[14px] font-mono overflow-x-auto my-2" />
            )
          }}
        >
          {textContent}
        </ReactMarkdown>
      </div>
    );
  };

  // Determine if AI is currently typing
  const isAiTyping = activeTyping !== null;

  return (
    <div className="max-w-5xl mx-auto w-full">
      {!isOpen ? (
        <Button
          onClick={toggleChat}
          className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-900 hover:to-black text-white rounded-lg shadow transition-all duration-200"
        >
          <MessageCircle className="h-6 w-6" />
          <span className="font-medium text-[15px]">Ask MarketMirror Follow-up Questions</span>
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
            <div className="flex items-center gap-2">
              {messages.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearChat}
                  className="h-8 px-2 text-xs rounded text-white hover:bg-white/10"
                  aria-label="Clear chat"
                >
                  Clear
                </Button>
              )}
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
          </div>

          {/* Messages container */}
          <div 
            ref={messagesContainerRef}
            className="max-h-[75vh] overflow-y-auto px-5 py-4 space-y-5 bg-gray-50"
          >
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
                    "max-w-[85%] rounded-lg px-5 py-3",
                    message.isUser
                      ? "bg-gray-800 text-white"
                      : "bg-white border border-gray-200 shadow-sm"
                  )}
                >
                  <div className={cn(
                    "prose max-w-none text-[15px] leading-relaxed tracking-normal",
                    message.isUser ? "text-white" : "text-gray-800"
                  )}>
                    {message.isUser ? (
                      <span>{message.content}</span>
                    ) : (
                      getMessageDisplay(message)
                    )}
                  </div>
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
                onKeyDown={handleKeyDown}
                placeholder="Ask about this analysis..."
                className="flex-1 rounded-md border border-gray-300 py-2.5 px-4 focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-transparent text-[15px]"
                disabled={false} /* Allow input even during loading/typing */
              />
              <Button
                type="submit"
                className={cn(
                  "rounded-md flex items-center justify-center transition-colors py-2 px-4",
                  inputValue.trim() 
                    ? "bg-gray-800 hover:bg-gray-900 text-white"
                    : "bg-gray-200 text-gray-400 hover:bg-gray-300 cursor-not-allowed"
                )}
                disabled={!inputValue.trim() || isLoading}
                aria-label="Send message"
              >
                <Send className="h-5 w-5 mr-2" />
                Send
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

