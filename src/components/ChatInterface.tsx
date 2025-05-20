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
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Handle scrolling with user override capability
  useEffect(() => {
    if (autoScroll && !userScrolledUp) {
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
        
        // Restore welcome message speed to original 20ms, make other messages slower
        const typingSpeed = isWelcomeMessage ? 20 : 15;
        
        // Adjust characters per step based on message type
        const charsPerStep = isWelcomeMessage 
          ? 1 // Type one character at a time for welcome message
          : 1; // Always type one character at a time for proper reading
        
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

  const getMessageDisplay = (message: Message) => {
    // Show typewriter text for active animation
    if (activeTyping && activeTyping.messageId === message.id) {
      return (
        <div onClick={skipAnimation} className="cursor-pointer" title="Click to skip animation">
          {activeTyping.text}
          <span className="inline-block w-1 h-4 bg-gray-400 ml-0.5 animate-pulse"></span>
        </div>
      );
    }
    
    // Show full content with Markdown when animation complete
    return (
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]}
        components={{
          // Custom rendering for links
          a: ({ node, ...props }) => (
            <a 
              {...props} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-blue-600 hover:underline"
            />
          ),
          // Custom rendering for bold/strong
          strong: ({ node, ...props }) => (
            <strong {...props} className="font-bold" />
          ),
          // Add styling for headers
          h1: ({ node, ...props }) => (
            <h1 {...props} className="text-xl font-bold mt-4 mb-2" />
          ),
          h2: ({ node, ...props }) => (
            <h2 {...props} className="text-lg font-bold mt-3 mb-2" />
          ),
          h3: ({ node, ...props }) => (
            <h3 {...props} className="text-md font-bold mt-2 mb-1" />
          ),
          // Add styling for lists
          ul: ({ node, ...props }) => (
            <ul {...props} className="list-disc pl-5 my-2" />
          ),
          ol: ({ node, ...props }) => (
            <ol {...props} className="list-decimal pl-5 my-2" />
          ),
          // Add styling for block quotes
          blockquote: ({ node, ...props }) => (
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
        {message.content}
      </ReactMarkdown>
    );
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
            <div className="flex items-center gap-2">
              {activeTyping && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={skipAnimation}
                  className="h-8 text-xs px-2 text-gray-100 hover:bg-white/10"
                >
                  Skip animation
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
            className="max-h-[500px] overflow-y-auto p-4 space-y-6 bg-gray-50"
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
                disabled={isLoading}
              />
              <Button
                type="submit"
                className={cn(
                  "rounded-md flex items-center justify-center transition-colors py-2",
                  inputValue.trim() && !isLoading
                    ? "bg-gray-800 hover:bg-gray-900 text-white"
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

