import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Bot, User, Presentation } from 'lucide-react';
import { studentAPI } from '../../lib/api';

const formatMarkdown = (text: string) => {
  let html = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  html = html.replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mt-4 mb-2 text-gray-800">$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold mt-5 mb-3 text-gray-800 border-b border-gray-200 pb-1">$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-6 mb-4 text-indigo-700">$1</h1>');
  html = html.replace(/\*\*(.*?)\*\*/gim, '<strong class="font-bold text-gray-900">$1</strong>');
  html = html.replace(/^\* (.*$)/gim, '<ul class="list-none"><li class="ml-6 list-disc mb-1">$1</li></ul>');
  html = html.replace(/^- (.*$)/gim, '<ul class="list-none"><li class="ml-6 list-disc mb-1">$1</li></ul>');
  html = html.replace(/^\d+\.\s(.*$)/gim, '<ul class="list-none"><li class="ml-6 list-decimal mb-1">$1</li></ul>');
  return html;
};

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export default function MockInterview() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const sendMessage = async (text: string, currentHistory: ChatMessage[]) => {
    if (!text.trim() || isLoading) return;

    setIsLoading(true);
    setInputValue('');

    const userMsg: ChatMessage = { role: 'user', text };
    const newMessages = [...currentHistory, userMsg];
    setMessages(newMessages);

    try {
      const historyPayload = currentHistory.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.text }]
      }));

      const res = await studentAPI.sendMockInterviewMessage(text, historyPayload);

      if (res.data.success && res.data.reply) {
        setMessages([...newMessages, { role: 'model', text: res.data.reply }]);
      } else {
        setMessages([...newMessages, { role: 'model', text: 'Error: Could not get a response.' }]);
      }
    } catch (err: any) {
      console.error(err);
      let detail = 'Error connecting to the server.';
      if (err.response?.data?.error) {
        detail = `Server Error: ${err.response.data.error}`;
      } else if (err.response?.data?.message) {
        detail = `Server Error: ${err.response.data.message}`;
      }
      setMessages([...newMessages, { role: 'model', text: detail }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    await sendMessage(inputValue, messages);
  };

  const startInterview = (topic: string) => {
    setMessages([]);
    sendMessage(topic, []);
  };

  return (
    <div className="max-w-5xl mx-auto flex flex-col h-[calc(100vh-8rem)]">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Presentation className="h-7 w-7 text-indigo-600" />
            AI Mock Interview
          </h1>
          <p className="mt-2 text-gray-600 text-sm">
            Practice for HR, Technical, or placement interviews. Receive realistic feedback and evaluation.
          </p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="text-sm px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 bg-white"
          >
            Restart Interview
          </button>
        )}
      </div>

      <div className="bg-white flex-1 shadow-lg rounded-xl border border-gray-100 flex flex-col overflow-hidden">

        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gray-50/50">
            <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-6">
              <Bot className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Ready to practice?</h2>
            <p className="text-gray-500 mb-8 max-w-md">
              Choose a template below or type your own introduction to get started.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <button onClick={() => startInterview('Start an HR interview')} className="px-5 py-2.5 bg-white border border-gray-200 shadow-sm rounded-lg hover:border-indigo-400 hover:shadow-md transition-all text-sm font-medium text-gray-700">HR Interview</button>
              <button onClick={() => startInterview('Start a Technical interview')} className="px-5 py-2.5 bg-white border border-gray-200 shadow-sm rounded-lg hover:border-indigo-400 hover:shadow-md transition-all text-sm font-medium text-gray-700">Technical Interview</button>
              <button onClick={() => startInterview('Quick mock (5 questions)')} className="px-5 py-2.5 bg-white border border-gray-200 shadow-sm rounded-lg hover:border-indigo-400 hover:shadow-md transition-all text-sm font-medium text-gray-700">Quick Mock</button>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-gray-50/50">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-4 max-w-[85%] ${msg.role === 'user' ? 'ml-auto' : 'mr-auto'}`}>
                {msg.role === 'model' && (
                  <div className="w-8 h-8 shrink-0 rounded-full bg-indigo-600 flex items-center justify-center text-white mt-1 shadow-sm">
                    <Bot className="w-4 h-4" />
                  </div>
                )}
                <div className={`p-4 rounded-2xl ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none shadow-sm' : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none shadow-sm'}`}>
                  {msg.role === 'user' ? (
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                  ) : (
                    <div
                      className="whitespace-pre-wrap text-[15px] leading-relaxed markdown-report"
                      dangerouslySetInnerHTML={{ __html: formatMarkdown(msg.text) }}
                    />
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="w-8 h-8 shrink-0 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 mt-1 shadow-sm">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-4 max-w-[85%] mr-auto">
                <div className="w-8 h-8 shrink-0 rounded-full bg-indigo-600 flex items-center justify-center text-white mt-1 shadow-sm">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="p-4 bg-white border border-gray-200 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-3 text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                  <span className="text-sm font-medium">Interviewer is typing...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        <div className="p-4 bg-white border-t border-gray-100 relative z-10">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={messages.length === 0 ? "Or type your own custom topic..." : "Type your answer..."}
              className="flex-1 border border-gray-300 rounded-xl px-5 py-3.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm"
              disabled={isLoading}
            />
            <button
              id="mock-interview-submit"
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className="px-6 py-3.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors flex items-center gap-2 font-medium shadow-sm"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
