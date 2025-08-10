import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, User, Stethoscope } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useMessage } from '../context/MessageContext';
import { useDog } from '../context/DogContext';

const AIChatbot: React.FC = () => {
  const { user } = useAuth();
  const { selectedDog } = useDog();
  const { 
    getUserConversation, 
    createConversation, 
    sendMessage, 
    getConversationMessages,
    markAsRead,
    isLoading 
  } = useMessage();
  
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (user && isOpen) {
      initializeConversation();
    }
  }, [user, selectedDog, isOpen]);

  useEffect(() => {
    if (conversationId) {
      const conversationMessages = getConversationMessages(conversationId);
      setMessages(conversationMessages);
      markAsRead(conversationId);
    }
  }, [conversationId, getConversationMessages]);

  const initializeConversation = async () => {
    if (!user) return;

    let conversation = getUserConversation(user.id, selectedDog?.id);
    
    if (!conversation) {
      const newConvId = await createConversation(user.id, selectedDog?.id);
      setConversationId(newConvId);
    } else {
      setConversationId(conversation.id);
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || !conversationId || isLoading) return;

    await sendMessage(conversationId, inputText);
    setInputText('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const quickQuestions = [
    "How is my dog's protocol working?",
    "When should I see improvements?",
    "Can I adjust the meal portions?",
    "Are there any side effects to watch for?",
    "How often should I update progress?"
  ];

  return (
    <>
      {/* Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 bg-gradient-to-r bg-brand-charcoal text-white p-4 rounded-full shadow-lg hover:bg-brand-midgrey hover:to-teal-700 transition-all duration-200 transform hover:scale-[1.02] z-50"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-4 sm:bottom-6 right-4 sm:right-6 w-[calc(100vw-2rem)] sm:w-96 h-[calc(100vh-2rem)] sm:h-[600px] max-w-md bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col z-50">
          {/* Header */}
          <div className="bg-gradient-to-r bg-brand-charcoal text-white p-4 rounded-t-xl flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Stethoscope className="h-6 w-6" />
              <div>
                <h3 className="font-semibold text-sm sm:text-base">Chat with Nutritionist</h3>
                <p className="text-xs opacity-90 hidden sm:block">
                  {selectedDog ? `About ${selectedDog.name}` : 'General Support'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:bg-white/20 p-1 rounded transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Quick Questions */}
          {messages.length === 0 && (
            <div className="p-3 sm:p-4 border-b border-gray-200 bg-gray-50">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Quick Questions:</h4>
              <div className="space-y-2">
                {quickQuestions.slice(0, 3).map((question, index) => (
                  <button
                    key={index}
                    onClick={() => setInputText(question)}
                    className="w-full text-left text-xs sm:text-sm bg-white border border-gray-200 rounded-lg p-2 sm:p-3 text-gray-700 hover:border-brand-midgrey hover:bg-brand-offwhite transition-all duration-200"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-8">
                <Stethoscope className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 text-sm">
                  Start a conversation with your nutritionist
                </p>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.senderType === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex items-start space-x-2 max-w-[85%] sm:max-w-[80%] ${message.senderType === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  <div className={`p-2 rounded-full ${message.senderType === 'user' ? 'bg-brand-charcoal' : 'bg-brand-charcoal'}`}>
                    {message.senderType === 'user' ? (
                      <User className="h-4 w-4 text-white" />
                    ) : (
                      <Stethoscope className="h-4 w-4 text-white" />
                    )}
                  </div>
                  <div
                    className={`p-3 rounded-lg ${
                      message.senderType === 'user'
                        ? 'bg-brand-charcoal text-white'
                        : message.type === 'plan_update'
                        ? 'bg-blue-100 text-blue-900 border border-blue-200'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    {message.type === 'plan_update' && (
                      <div className="text-xs font-medium text-blue-700 mb-1">
                        📋 Protocol Update
                      </div>
                    )}
                    <p className="text-xs sm:text-sm">{message.content}</p>
                    <p className={`text-xs mt-1 ${message.senderType === 'user' ? 'text-emerald-100' : 'text-gray-500'}`}>
                      {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="flex items-start space-x-2 max-w-[85%] sm:max-w-[80%]">
                  <div className="p-2 rounded-full bg-brand-charcoal">
                    <Stethoscope className="h-4 w-4 text-white" />
                  </div>
                  <div className="bg-gray-100 p-3 rounded-lg">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 sm:p-4 border-t border-gray-200">
            <div className="flex space-x-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about your dog's health..."
                className="flex-1 px-2 sm:px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-charcoal focus:border-brand-charcoal text-xs sm:text-sm"
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputText.trim() || isLoading}
                className="bg-gradient-to-r bg-brand-charcoal text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-brand-midgrey duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AIChatbot;