import { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Loader2 } from 'lucide-react';
import axios from 'axios';
import api from '../../lib/api';

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
}

const formatMarkdown = (text: string) => {
  let html = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  html = html.replace(/^### (.*$)/gim, '<h3 class="text-base font-semibold mt-3 mb-1 text-gray-800">$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2 class="text-lg font-bold mt-4 mb-2 text-gray-800 border-b border-gray-100 pb-1">$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1 class="text-xl font-bold mt-4 mb-2 text-indigo-700">$1</h1>');
  html = html.replace(/\*\*(.*?)\*\*/gim, '<strong class="font-bold text-gray-900">$1</strong>');
  html = html.replace(/^\* (.*$)/gim, '<ul class="list-none my-1"><li class="ml-4 list-disc">$1</li></ul>');
  html = html.replace(/^- (.*$)/gim, '<ul class="list-none my-1"><li class="ml-4 list-disc">$1</li></ul>');
  html = html.replace(/^\d+\.\s(.*$)/gim, '<ul class="list-none my-1"><li class="ml-4 list-decimal">$1</li></ul>');
  return html;
};

export function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'bot',
      text: 'Hi! I am your Student Assistant — placements, careers, academics, coding, productivity, college life, and how to use this portal. Ask me anything.',
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userText = inputValue;
    const newMessage: Message = { id: Date.now().toString(), sender: 'user', text: userText };
    setMessages((prev) => [...prev, newMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await api.post<{ success: boolean; reply?: string; message?: string }>(
        '/chatbot/query',
        { message: userText }
      );

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: response.data.reply || 'Sorry, I did not receive a proper response.',
      };
      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      let detail =
        'Sorry, I am having trouble connecting to the server right now.';
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          detail =
            'Your session may have expired. Please refresh the page or sign in again.';
        } else if (typeof error.response?.data?.message === 'string') {
          detail = error.response.data.message;
        }
      }
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: detail,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 p-4 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-colors z-40 outline-none"
        aria-label="Open student assistant chat"
      >
        <MessageSquare className="w-6 h-6" />
      </button>

      {isOpen && (
        <div className="fixed bottom-24 right-6 w-80 sm:w-96 h-[500px] bg-white rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden border border-gray-100 transform transition-all duration-300 ease-in-out">
          <div className="bg-indigo-600 p-4 text-white flex justify-between items-center rounded-t-2xl shadow-sm">
            <div>
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Student Assistant
              </h3>
              <p className="text-indigo-100 text-xs mt-1">Placements, study, coding, life — ask anything</p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-indigo-100 hover:text-white transition-colors p-1 rounded-full hover:bg-indigo-500"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex max-w-[85%] ${
                  msg.sender === 'user' ? 'ml-auto justify-end' : 'mr-auto justify-start'
                }`}
              >
                <div
                  className={`px-4 py-3 rounded-2xl shadow-sm overflow-hidden ${
                    msg.sender === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-none'
                      : 'bg-white border border-gray-100 text-gray-800 rounded-bl-none'
                  }`}
                >
                  {msg.sender === 'user' ? (
                     <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                  ) : (
                     <div 
                       className="text-sm leading-relaxed markdown-report" 
                       dangerouslySetInnerHTML={{ __html: formatMarkdown(msg.text) }} 
                     />
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex max-w-[85%] mr-auto justify-start">
                <div className="px-4 py-3 bg-white border border-gray-100 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                  <span className="text-xs text-gray-500">Thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 bg-white border-t border-gray-100">
            <form onSubmit={handleSubmit} className="flex gap-2 relative">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask something..."
                className="flex-1 bg-gray-50 text-sm border border-gray-200 rounded-full py-2.5 pl-4 pr-12 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder:text-gray-400"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !inputValue.trim()}
                className="absolute right-1 top-1 bottom-1 px-3 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors flex items-center justify-center outline-none"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
