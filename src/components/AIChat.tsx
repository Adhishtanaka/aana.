import { useRef, useEffect, KeyboardEvent, useState } from 'react';
import { useChat } from 'ai/react';
import Markdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { 
  RiCloseLine, 
  RiSendPlaneLine, 
  RiRobot2Fill, 
  RiUser3Line
} from 'react-icons/ri';
import { chatHistory } from '../lib/chatHistory';

interface AIChatProps {
  isOpen: boolean;
  onClose: () => void;
  specificUrl?: string;
  initialQuery?: string;
}

const AIChat: React.FC<AIChatProps> = ({ isOpen, onClose, specificUrl, initialQuery }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [sessionId] = useState(() => chatHistory.createSession(specificUrl));
  const [hasInitialQuerySent, setHasInitialQuerySent] = useState(false);

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
  } = useChat({
    api: specificUrl 
      ? `http://127.0.0.1:8000/api/chat/0?specific_url=${encodeURIComponent(specificUrl)}`
      : 'http://127.0.0.1:8000/api/chat/0',
    experimental_prepareRequestBody: ({ messages }) => {
      return {
        messages: messages.map((message) => ({
          role: message.role,
          content: message.content,
          createdAt: message.createdAt?.toISOString() || new Date().toISOString(),
        })),
      };
    },
    onFinish: (message) => {
      chatHistory.saveMessage(sessionId, {
        role: 'assistant',
        content: message.content,
        createdAt: new Date(),
      });
    },
    onError: (error) => {
      console.error('Chat error:', error);
    },
  });

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.role === 'user') {
      chatHistory.saveMessage(sessionId, {
        role: 'user',
        content: lastMessage.content,
        createdAt: new Date(),
      });
    }
  }, [messages, sessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
    
    // Reset initial query sent state when chat closes
    if (!isOpen) {
      setHasInitialQuerySent(false);
    }
  }, [isOpen]);

  // Auto-send initial query when chat opens
  useEffect(() => {
    if (isOpen && initialQuery && !hasInitialQuerySent && messages.length === 0) {
      // Use the useChat's append function to add the initial message
      const timer = setTimeout(() => {
        handleInputChange({ target: { value: initialQuery } } as any);
        // Trigger form submission after a short delay
        setTimeout(() => {
          const form = document.querySelector('form');
          if (form) {
            const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
            form.dispatchEvent(submitEvent);
          }
          setHasInitialQuerySent(true);
        }, 50);
      }, 200);
      
      return () => clearTimeout(timer);
    }
  }, [isOpen, initialQuery, hasInitialQuerySent, messages.length, handleInputChange]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-google-light-bg dark:bg-google-dark-bg rounded-lg w-full max-w-4xl h-[80vh] flex flex-col google-elevation-3">
        <div className="flex items-center justify-between p-4 border-b border-google-light-border dark:border-google-dark-border">
          <div className="flex items-center space-x-3">
            <RiRobot2Fill size={24} className="text-google-light-text-secondary dark:text-google-dark-text-secondary" />
            <div>
              <h3 className="text-google-light-text-primary dark:text-google-dark-text-primary font-medium">AI Assistant</h3>
              {specificUrl && (
                <p className="text-google-light-text-secondary dark:text-google-dark-text-secondary text-sm truncate">
                  {new URL(specificUrl).hostname}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-google-light-text-secondary dark:text-google-dark-text-secondary hover:text-google-light-text-primary dark:hover:text-google-dark-text-primary rounded-lg hover:bg-google-light-hover dark:hover:bg-google-dark-hover google-focus"
          >
            <RiCloseLine size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-google-light-text-secondary dark:text-google-dark-text-secondary">
              <RiRobot2Fill size={48} className="mb-4 text-google-light-border dark:text-google-dark-text-disabled" />
              <h4 className="text-lg font-medium mb-2">AI Assistant Ready</h4>
              <p className="text-sm">
                {specificUrl 
                  ? `Ask me anything about this webpage${initialQuery ? ` related to "${initialQuery}"` : ''}`
                  : initialQuery
                  ? `I'll help you with "${initialQuery}"`
                  : "Ask me anything to get started"
                }
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-4 google-elevation-1 ${
                    message.role === "user"
                      ? "bg-google-blue-light dark:bg-google-blue text-white"
                      : "bg-google-light-surface dark:bg-google-dark-surface text-google-light-text-primary dark:text-google-dark-text-primary"
                  }`}
                >
                  <div className="flex items-start space-x-2 mb-2">
                    {message.role === "user" ? (
                      <RiUser3Line size={16} className="mt-1" />
                    ) : (
                      <RiRobot2Fill size={16} className="mt-1 text-google-light-text-secondary dark:text-google-dark-text-secondary" />
                    )}
                    <span className="text-xs opacity-75">
                      {message.role === "user" ? "You" : "AI"}
                    </span>
                  </div>
                  
                  <div className={`prose prose-sm max-w-none ${
                    message.role === "user" 
                      ? "prose-invert" 
                      : ""
                  }`}>
                    <Markdown
                      rehypePlugins={[rehypeRaw]}
                      components={{
                        iframe: ({ ...props }) => (
                          <div className="my-4">
                            <iframe
                              {...props}
                              className="w-full"
                              style={{ aspectRatio: '16/9', minHeight: '315px' }}
                            />
                          </div>
                        ),
                      }}
                    >
                      {message.content}
                    </Markdown>
                  </div>
                </div>
              </div>
            ))
          )}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-google-light-surface dark:bg-google-dark-surface rounded-lg p-4 google-elevation-1">
                <div className="flex items-center space-x-2">
                  <RiRobot2Fill size={16} className="text-google-light-text-secondary dark:text-google-dark-text-secondary" />
                  <span className="text-google-light-text-secondary dark:text-google-dark-text-secondary">Thinking...</span>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="flex justify-start">
              <div className="bg-google-red-light dark:bg-google-red rounded-lg p-4 google-elevation-1 max-w-[80%]">
                <div className="flex items-start space-x-2">
                  <RiRobot2Fill size={16} className="mt-1 text-white" />
                  <div className="text-white">
                    <p className="font-medium mb-1">Service Temporarily Unavailable</p>
                    <p className="text-sm opacity-90 mb-3">
                      The AI service is experiencing high demand. Your message was received, but I couldn't process it right now.
                    </p>
                    <button
                      onClick={() => window.location.reload()}
                      className="text-sm bg-white bg-opacity-20 hover:bg-opacity-30 px-3 py-1 rounded transition-colors"
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-google-light-border dark:border-google-dark-border p-4">
          <form onSubmit={handleSubmit} className="flex space-x-3">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={
                specificUrl
                  ? `Ask about this webpage: "${initialQuery || 'this content'}"`
                  : initialQuery
                  ? `Ask about: "${initialQuery}"`
                  : "Ask me anything..."
              }
              disabled={isLoading}
              rows={1}
              className="flex-1 bg-google-light-surface dark:bg-google-dark-surface border border-google-light-border dark:border-google-dark-border rounded-lg px-4 py-3 text-google-light-text-primary dark:text-google-dark-text-primary placeholder-google-light-text-secondary dark:placeholder-google-dark-text-secondary google-focus resize-none"
              style={{ minHeight: '48px', maxHeight: '120px' }}
            />
            
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="px-6 py-3 bg-google-blue-light dark:bg-google-blue text-white rounded-lg hover:bg-blue-700 dark:hover:bg-google-blue-hover disabled:bg-google-light-text-disabled dark:disabled:bg-google-dark-text-disabled disabled:cursor-not-allowed google-focus"
            >
              <RiSendPlaneLine size={18} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AIChat;