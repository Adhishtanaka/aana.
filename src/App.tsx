import axios from "axios";
import { useChat } from "ai/react";
import rehypeRaw from "rehype-raw";
import Markdown from "react-markdown";
import { FaHistory } from "react-icons/fa";
import { RiChatNewLine, RiRobot2Fill, RiSparklingFill } from "react-icons/ri";
import ChatHistoryModal from "./ChatHistoryModal";
import { useState, useRef, useEffect, MouseEvent, KeyboardEvent } from "react";
import { useNavigate} from "react-router";

interface BasicSearchResult {
  title: string;
  link: string;
  snippet: string;
}

interface SearchData {
  search_results?: {
    organic?: BasicSearchResult[];
    peopleAlsoAsk?: {
      question?: string;
      snippet?: string;
    }[];
  };
  first_message?: string;
}

function App() {
  const [i, setI] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchInfo, setSearchInfo] = useState<SearchData | null>(null);
  const [shouldAutoSubmit, setShouldAutoSubmit] = useState(false);
  const [array, setArray] = useState([0]);
  const [isFetchSearchInfo, setIsFetchSearchInfo] = useState(false);

  const navigate = useNavigate();

  const apiUrl = `http://127.0.0.1:8000/api/chat/${i}`;

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    stop,
    error,
    reload,
  } = useChat({
    api: apiUrl,
    experimental_throttle: 100,
    experimental_prepareRequestBody: ({ messages }) => {
      return {
        messages: messages.map((message) => {
          const base = {
            role: message.role,
            content: message.content,
          };
          if (message.createdAt) {
            return { ...base, createdAt: message.createdAt.toISOString() };
          }
          return base;
        }),
      };
    },
    onFinish: async () => {
      if (!isFetchSearchInfo) {
        fetchSearchInfo();
        setIsFetchSearchInfo(true);
      }
    },
  });

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const deleteChat = async () => {
    try {
      await axios.delete("http://127.0.0.1:8000/api/chat/delete");
    } catch (error) {
      console.error("Error reseting data:", error);
    }
  };

  const resetChat = async () => {
    try {
      await axios.patch("http://127.0.0.1:8000/api/chat/reset");
    } catch (error) {
      console.error("Error reseting data:", error);
    }
  };

  const fetchSearchInfo = async () => {
    try {
      const response = await axios.get("http://127.0.0.1:8000/api/chat/info");
      if (searchInfo?.first_message !== response.data.first_message) {
        setSearchInfo(response.data);
      }
    } catch (error) {
      console.error("Error fetching search info:", error);
    }
  };

  useEffect(() => {
    deleteChat();
  }, []);

  const handleDelete = () => {
    navigate(0);
  };

  const change_url = (index: number) => {
    // Add safety check to prevent invalid indices
    const maxIndex = (searchInfo?.search_results?.organic?.length || 1) - 1;
    if (index > maxIndex) {
      index = 0;
    }
    
    setI(index);
    resetChat();
    if (!array.includes(index)) {
      if (searchInfo?.first_message) {
        setShouldAutoSubmit(true);
        handleInputChange({
          target: {
            value: searchInfo.first_message,
          },
        } as React.ChangeEvent<HTMLTextAreaElement>);
      }
    }
  };

  useEffect(() => {
    if (shouldAutoSubmit && input === searchInfo?.first_message) {
      const submitEvent = {
        preventDefault: () => {},
        type: "submit",
      } as React.FormEvent<HTMLFormElement>;

      handleSubmit(submitEvent);
      setShouldAutoSubmit(false);
    }
  }, [input, shouldAutoSubmit]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + "...";
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleStopClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    stop();
  };

  const handleReloadClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    reload();
  };

  const getErrorMessage = (error: Error) => {
    if (!navigator.onLine) {
      return "Network connection lost. Please check your internet connection.";
    }
    if (error.message.includes("timeout")) {
      return "Request timed out. Please try again.";
    }
    return "An unexpected error occurred. Please try again later.";
  };

  const shouldShowTimestamp = (index: number) => {
    if (index === 0) return true;

    const currentMessage = messages[index];
    const previousMessage = messages[index - 1];

    if (!currentMessage.createdAt || !previousMessage.createdAt) return false;

    const currentTime = new Date(currentMessage.createdAt);
    const previousTime = new Date(previousMessage.createdAt);

    return currentTime.getTime() - previousTime.getTime() > 60000;
  };

  const renderTimestamp = (index: number) => {
    if (!shouldShowTimestamp(index)) return null;
    const message = messages[index];
    const timestamp = message.createdAt
      ? new Date(message.createdAt)
      : new Date();
    return timestamp.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "numeric",
    });
  };

  return (
    <div className="flex h-screen bg-[#1f1f1f]">
      <div className="w-4/12 bg-[#1f1f1f] p-4 border-r border-gray-700 max-h-screen">
        <header className="bg-[#1f1f1f] sticky w-full top-0">
          <div className="max-w-3xl mx-auto px-8 pt-6 pb-4">
            <h1 className="text-3xl font-bold text-white animate-fade-in">
              <a href="https://github.com/Adhishtanaka/aana."> Aana </a>
            </h1>
            <p className="text-gray-400 text-xs my-1 block ">made by <a className="text-blue-500" href="https://github.com/Adhishtanaka" target="_blank" >adhishtanaka</a></p>
          </div>
        </header>
       
        <div className="flex w-full space-x-2 mb-6">
          <button
            className="flex-1 p-2 text-black bg-gray-400 rounded transition-all hover:scale-105 hover:bg-gray-300 active:scale-95 flex items-center justify-center"
            title="View History"
            onClick={handleOpenModal}
          >
            <FaHistory size={15} />
          </button>
          <button
            className="flex-1 p-2 text-black bg-gray-400 rounded transition-all hover:scale-105 hover:bg-gray-300 active:scale-95 flex items-center justify-center"
            title="Start New Chat"
            onClick={handleDelete}
          >
            <RiChatNewLine size={15} />
          </button>
          <ChatHistoryModal isOpen={isModalOpen} onClose={handleCloseModal} />
        </div>
        <div
          className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-500 scrollbar-track-gray-800 pr-2"
          style={{ maxHeight: "calc(100vh - 200px)" }}
        >
          {searchInfo?.search_results?.organic &&
          searchInfo.search_results.organic.length > 0 ? (
            <>
              <h1 className="w-full mb-4 px-4 pt-2 text-lg text-white transition-colors">
                Search Results
              </h1>
              {searchInfo.search_results.organic.map((result, index) => (
                <div
                  key={index}
                  className={`p-3 mb-2 bg-gray-600 rounded-lg cursor-pointer transition-all hover:scale-102 animate-fade-in-up ${
                    i === index
                      ? "border-[1.5px] border-gray-500 bg-gray-800"
                      : "border-2 border-transparent"
                  }`}
                  style={{
                    animationDelay: `${index * 100}ms`,
                  }}
                  onClick={() => {
                    void change_url(index);
                    setArray((prevArray) => {
                      if (!prevArray.includes(index)) {
                        return [...prevArray, index];
                      }
                      return prevArray;
                    });
                  }}
                >
                  <h3 className="text-sm font-medium text-white mb-1">
                    {truncateText(result.title, 30)}
                  </h3>
                  <p className="text-xs text-gray-300">
                    {truncateText(result.snippet, 50)}
                  </p>
                  <span className="text-xs text-gray-400 block mt-1">
                    {truncateText(result.link, 30)}
                  </span>
                </div>
              ))}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 animate-fade-in">
              <p className="mb-2">No search results available yet</p>
              <p className="text-sm">
                Start a conversation to see relevant results
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="w-full flex flex-col">
        <div
          ref={containerRef}
          className="flex-1 overflow-y-auto"
          aria-live="polite"
          aria-relevant="additions"
        >
          <div className="max-w-3xl mx-auto px-8 py-6">
            {messages.length > 0 ? (
              messages.map((message, index) => (
                <div
                  key={message.id}
                  className="mb-8 animate-fade-in-up"
                  style={{
                    animationDelay: `${index * 100}ms`,
                  }}
                  role="article"
                  aria-label={`${message.role} message`}
                >
                  <div
                    className={`flex w-full ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[85%] px-6 py-4 rounded-2xl break-words hover:scale-101 transition-transform ${
                        message.role === "user"
                          ? "bg-gray-700 text-white"
                          : "bg-gray-800 text-gray-100"
                      }`}
                    >
                      <div className="prose prose-sm prose-invert max-w-none overflow-x-auto">
                        <Markdown
                          rehypePlugins={[rehypeRaw]}
                          components={{
                            pre: ({ ...props }) => (
                              <div className="overflow-x-auto">
                                <pre {...props} />
                              </div>
                            ),
                            code: ({ ...props }) => (
                              <code
                                className="break-words whitespace-pre-wrap"
                                {...props}
                              />
                            ),
                            iframe: ({ ...props }) => (
                              <div className="my-4">
                                <iframe
                                  {...props}
                                  className="w-full max-w-full"
                                  style={{ aspectRatio: '16/9', minHeight: '315px' }}
                                />
                              </div>
                            ),
                          }}
                        >
                          {message.content}
                        </Markdown>
                      </div>
                      <span className="text-gray-400 text-xs mt-2 block">
                        {renderTimestamp(index)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col mt-14 items-center justify-center min-h-[70vh] text-center text-gray-300">
                <div className="mb-8 relative">
                  <RiRobot2Fill
                    size={48}
                    className="text-gray-400 animate-pulse"
                  />
                  <RiSparklingFill
                    size={24}
                    className="absolute -top-2 -right-2 text-gray-300 animate-spin-slow"
                  />
                </div>

                <h1 className="text-4xl font-bold mb-6 text-gray-300 animate-fade-in">
                  Search with AANA
                </h1>

                <div className="space-y-6 animate-fade-in-up">
                  <div className="p-4 rounded-lg  backdrop-blur-sm transform hover:scale-105 transition-all duration-300">

                    <p className="text-gray-400">
                      Start typing below to search for relevant results.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {isLoading && (
              <div className="flex justify-center items-center py-4 animate-fade-in">
                <button
                  onClick={handleStopClick}
                  className="group flex items-center gap-2 px-6 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-all duration-200 border border-red-500/20 hover:border-red-500/30 hover:scale-105 active:scale-95"
                  aria-label="Stop message generation"
                >
                  Stop generating...
                </button>
              </div>
            )}

            {error && (
              <div
                className="flex flex-col items-center gap-2 p-4 animate-fade-in"
                role="alert"
              >
                <p className="text-gray-400">{getErrorMessage(error)}</p>
                <button
                  onClick={handleReloadClick}
                  className="px-4 py-2 text-sm bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg transition-all hover:scale-105 active:scale-95"
                  aria-label="Retry message generation"
                >
                  Retry
                </button>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="sticky bottom-0 bg-[#1f1f1f] py-4">
          <form
            className="flex items-center mx-auto px-4 sm:px-8 gap-2 w-full max-w-3xl animate-fade-in"
            onSubmit={handleSubmit}
          >
            <textarea
              ref={textareaRef}
              className="bg-[#424242] bottom-0 w-full p-2 mb-4 sm:mb-8 border-0 rounded shadow-lg text-white focus:outline-none focus:ring-2 focus:ring-gray-600 resize-none min-h-[48px] max-h-[200px] transition-all duration-200 focus:shadow-xl"
              value={input}
              placeholder="What's your question? (Press Shift + Enter for new line)"
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              rows={1}
              aria-label="Message input"
            />
           
          </form>

        </div>
      </div>
    </div>
  );
}

export default App;
