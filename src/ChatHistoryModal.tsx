import axios from 'axios';
import { FaTrash } from 'react-icons/fa';
import React, { useEffect, useState } from 'react';

interface Conversation {
  created_time: string;
  user_question: string;
  url: string;
}

interface ChatHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ChatHistoryModal: React.FC<ChatHistoryModalProps> = ({ isOpen, onClose }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen]);

const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
        const response = await axios.get('http://127.0.0.1:8000/api/chat/history');
        setConversations(response.data);
    } catch (err) {
        setError((err as Error).message);
    } finally {
        setLoading(false);
    }
};

const deleteHistory = async (created_time: string) => {
    try {
        await axios.delete(`http://127.0.0.1:8000/api/chat/history/${created_time}`);
        setConversations((prev) =>
            prev.filter((conversation) => conversation.created_time !== created_time)
        );
    } catch (err) {
        setError((err as Error).message);
    }
};

const clearAllHistory = async () => {
    try {
        await axios.delete('http://127.0.0.1:8000/api/chat/history');
        setConversations([]);
    } catch (err) {
        setError((err as Error).message);
    }
};

  if (!isOpen) return null;

  return (
    <div className="relative z-10" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      {/* Background overlay */}
      <div 
        className="fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity" 
        aria-hidden="true" 
        onClick={onClose}
      />

      <div className="fixed inset-0 z-10 flex items-center justify-center p-4">
        {/* Modal panel */}
        <div className="relative transform overflow-hidden rounded-md bg-[#212121] text-left shadow-xl transition-all w-full max-w-xl">
          {/* Header */}
          <div className="border-b border-gray-800 px-4 py-3">
            <h3 
              className="text-base font-medium text-gray-100" 
              id="modal-title"
            >
              Conversation History
            </h3>
          </div>

          {/* Content */}
          <div className="px-4 py-3">
            {loading && (
              <p className="text-sm text-gray-400">Loading...</p>
            )}
            
            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}

            <ul className="space-y-2 max-h-72 overflow-y-auto">
              {!loading && !error && conversations.map(({ created_time, user_question, url }) => (
                <li
                  key={created_time}
                  className="group border-b border-gray-800 py-2 last:border-0"
                >
                  
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-100 truncate">
                        {user_question}
                      </p>
                      <div className="mt-1 flex items-center space-x-3">
                        <p className="text-xs text-gray-400">
                          {new Date(created_time).toLocaleString()}
                        </p>
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-400 hover:underline truncate"
                        >
                          {url}
                        </a>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteHistory(created_time)}
                      className="mr-2 py-2 text-gray-400 hover:text-red-500 opacity-100 transition-opacity"
                      title="Delete conversation"
                    >
                      <FaTrash className="h-4 w-4" />
                    </button>
                  </li>
                  
              ))}
            </ul>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-800 px-4 py-3 flex justify-between items-center">
            <button
              className="text-xs text-gray-400 hover:text-red-500 flex items-center space-x-1"
              onClick={clearAllHistory}
            >
              <FaTrash className="h-3 w-3 " />
              <span>Clear History</span>
            </button>
            <button
              className="text-xs font-medium text-gray-300 hover:text-white px-3 py-1.5 rounded-md bg-gray-800  hover:bg-gray-700"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatHistoryModal;