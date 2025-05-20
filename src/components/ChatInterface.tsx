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
    // Only auto-scroll when the user hasn't manually scrolled up
    // This will run on new text from typing animation or new messages
    if (autoScroll && !userScrolledUp) {
      scrollToBottom(false);
    }
  }, [messages, activeTyping?.text, autoScroll, userScrolledUp]);

  // Detect user scroll to override auto-scrolling
  useEffect(() => {
    const messagesContainer = messagesContainerRef.current;
    if (!messagesContainer) return;

    let lastScrollTop = messagesContainer.scrollTop;
    let scrollTimeout: NodeJS.Timeout | null = null;
    
    // Detect any scroll movement, even programmatic ones
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainer;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
      
      // If user scrolled up (manually), disable auto-scroll
      if (scrollTop < lastScrollTop && Math.abs(scrollTop - lastScrollTop) > 10) {
        setUserScrolledUp(true);
        setAutoScroll(false);
      }
      // If user scrolled to bottom, re-enable auto-scroll
      else if (isAtBottom) {
        setUserScrolledUp(false);
        setAutoScroll(true);
      }
      
      lastScrollTop = scrollTop;
    };

    // Detect any user input - this ensures we know it's user-initiated
    const handleUserInput = () => {
      // Capture current scroll position to detect direction after movement
      lastScrollTop = messagesContainer.scrollTop;
    };

    // Handle wheel events specifically to detect user scroll
    const handleWheel = () => {
      setUserScrolledUp(true);
      setAutoScroll(false);
    };
    
    messagesContainer.addEventListener('scroll', handleScroll, { passive: true });
    messagesContainer.addEventListener('mousedown', handleUserInput, { passive: true });
    messagesContainer.addEventListener('touchstart', handleUserInput, { passive: true });
    messagesContainer.addEventListener('wheel', handleWheel, { passive: true });
    
    return () => {
      messagesContainer.removeEventListener('scroll', handleScroll);
      messagesContainer.removeEventListener('mousedown', handleUserInput);
      messagesContainer.removeEventListener('touchstart', handleUserInput);
      messagesContainer.removeEventListener('wheel', handleWheel);
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
        
        // Make typing faster - 10ms for welcome message, 5ms for other messages
        const typingSpeed = isWelcomeMessage ? 10 : 5;
        
        // Increase characters per step for faster display
        const charsPerStep = isWelcomeMessage 
          ? 3 // Type three characters at a time for welcome message 
          : Math.max(5, Math.floor(fullContent.length / 100)); // Much faster progression for other messages
        
        const nextPosition = Math.min(fullContent.length, currentPosition + charsPerStep);
        
        const typingTimeout = setTimeout(() => {
          setActiveTyping({
            messageId: activeTyping.messageId,
            text: fullContent.substring(0, nextPosition)
          });
        }, typingSpeed);
        
        return () => clearTimeout(typingTimeout);
      } else {
        // Animation completed
        setMessages(prev => 
          prev.map(m => 
            m.id === activeTyping.messageId 
              ? { ...m, animationComplete: true }
              : m
          )
        );
        setActiveTyping(null);
      }
    }
  }, [activeTyping, messages]);

  const scrollToBottom = (smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: smooth ? "smooth" : "auto",
        block: "end" // Always scroll to the end of the container
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
        // Reset scroll state when animation is skipped
        setAutoScroll(true);
        setUserScrolledUp(false);
      }
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!inputValue.trim()) return; // Only check for empty input, allow during loading
    
    // Skip any ongoing animation when user sends new message
    skipAnimation();

    // Enable auto-scrolling when user sends a message
    setAutoScroll(true);
    setUserScrolledUp(false);

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
              <h1 {...props} className="text-xl font-bold mt-4 mb-2" />
            ),
            h2: ({ node, ...props }: any) => (
              <h2 {...props} className="text-lg font-bold mt-3 mb-2" />
            ),
            h3: ({ node, ...props }: any) => (
              <h3 {...props} className="text-md font-bold mt-2 mb-1" />
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
                ? <code {...props} className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono" />
                : <code {...props} className="block bg-gray-100 p-2 rounded text-sm font-mono overflow-x-auto my-2" />
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
    <div>
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
            className="max-h-[500px] overflow-y-auto p-4 space-y-4 bg-gray-50" /* Reduced vertical spacing */
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
                    "max-w-[85%] rounded-lg px-4 py-3",
                    message.isUser
                      ? "bg-gray-800 text-white"
                      : "bg-white border border-gray-200 shadow-sm"
                  )}
                >
                  <div className={cn(
                    "prose prose-sm max-w-none",
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
            className="p-4 bg-white" /* Removed border-t and border-gray-200 */
          >
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about this analysis..."
                className="flex-1 rounded-md border border-gray-300 py-2 px-4 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent text-sm"
                disabled={false} /* Allow input even during loading/typing */
              />
              <Button
                type="submit"
                className={cn(
                  "rounded-md flex items-center justify-center transition-colors py-2",
                  inputValue.trim()
                    ? "bg-gray-800 hover:bg-gray-900 text-white"
                    : "bg-gray-200 text-gray-400 hover:bg-gray-300 cursor-not-allowed"
                )}
                disabled={!inputValue.trim()} /* Only disable if no input - allow sending during AI typing */
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

