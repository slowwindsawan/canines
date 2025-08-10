import React, { useState, useRef, useEffect } from 'react';
import { useMessage } from '../../context/MessageContext';
import { MessageCircle, Send, User, Stethoscope, Search, BookTemplate as Template, FileText, Clock } from 'lucide-react';

const Messages: React.FC = () => {
  const { 
    conversations, 
    selectedConversation,
    selectConversation,
    sendMessage,
    getConversationMessages,
    sendTemplateMessage,
    templates,
    markAsRead,
    isLoading 
  } = useMessage();
  
  const [inputText, setInputText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const filteredConversations = conversations.filter(conv =>
    conv.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.dogName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.userEmail.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const messages = selectedConversation ? getConversationMessages(selectedConversation.id) : [];

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    if (selectedConversation) {
      markAsRead(selectedConversation.id);
    }
  }, [selectedConversation, markAsRead]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || !selectedConversation || isLoading) return;

    await sendMessage(selectedConversation.id, inputText);
    setInputText('');
  };

  const handleSendTemplate = async (templateId: string) => {
    if (!selectedConversation) return;
    
    await sendTemplateMessage(selectedConversation.id, templateId);
    setShowTemplates(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getMessageTypeIcon = (type: string) => {
    switch (type) {
      case 'plan_update': return '📋';
      case 'admin_note': return '📝';
      case 'system_notification': return '🔔';
      default: return '';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Messages & Support</h1>
          <p className="text-lg text-gray-600">Communicate with users and manage support requests</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
          {/* Conversations List */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {filteredConversations.map((conversation) => (
                <div
                  key={conversation.id}
                  onClick={() => selectConversation(conversation.id)}
                  className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedConversation?.id === conversation.id ? 'bg-emerald-50 border-emerald-200' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-gray-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                          {conversation.userName}
                        </h3>
                        {conversation.unreadCount > 0 && (
                          <span className="bg-emerald-600 text-white text-xs rounded-full px-2 py-1 ml-2">
                            {conversation.unreadCount}
                          </span>
                        )}
                      </div>
                      {conversation.dogName && (
                        <p className="text-xs text-gray-500">About {conversation.dogName}</p>
                      )}
                      {conversation.lastMessage && (
                        <p className="text-sm text-gray-600 truncate mt-1">
                          {getMessageTypeIcon(conversation.lastMessage.type)}
                          {conversation.lastMessage.content}
                        </p>
                      )}
                      <div className="flex items-center space-x-1 mt-1">
                        <Clock className="h-3 w-3 text-gray-400" />
                        <span className="text-xs text-gray-400">
                          {conversation.lastMessage && new Date(conversation.lastMessage.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col">
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {selectedConversation.userName}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {selectedConversation.dogName ? `About ${selectedConversation.dogName}` : 'General Support'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.senderType === 'admin' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`flex items-start space-x-2 max-w-[80%] ${message.senderType === 'admin' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                        <div className={`p-2 rounded-full ${message.senderType === 'admin' ? 'bg-emerald-600' : 'bg-gray-400'}`}>
                          {message.senderType === 'admin' ? (
                            <Stethoscope className="h-4 w-4 text-white" />
                          ) : (
                            <User className="h-4 w-4 text-white" />
                          )}
                        </div>
                        <div
                          className={`p-3 rounded-lg ${
                            message.senderType === 'admin'
                              ? 'bg-emerald-600 text-white'
                              : message.type === 'plan_update'
                              ? 'bg-blue-100 text-blue-900 border border-blue-200'
                              : 'bg-gray-100 text-gray-900'
                          }`}
                        >
                          {(message.type === 'plan_update' || message.type === 'admin_note') && (
                            <div className="text-xs font-medium mb-1 opacity-75">
                              {getMessageTypeIcon(message.type)} {message.type === 'plan_update' ? 'Protocol Update' : 'Admin Note'}
                            </div>
                          )}
                          <p className="text-sm">{message.content}</p>
                          <p className={`text-xs mt-1 ${message.senderType === 'admin' ? 'text-emerald-100' : 'text-gray-500'}`}>
                            {message.senderName} • {new Date(message.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}

                  {isLoading && (
                    <div className="flex justify-end">
                      <div className="flex items-start space-x-2 max-w-[80%] flex-row-reverse space-x-reverse">
                        <div className="p-2 rounded-full bg-emerald-600">
                          <Stethoscope className="h-4 w-4 text-white" />
                        </div>
                        <div className="bg-emerald-600 text-white p-3 rounded-lg">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-emerald-200 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-emerald-200 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-emerald-200 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="p-4 border-t border-gray-200">
                  {/* Templates */}
                  {showTemplates && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Quick Templates:</h4>
                      <div className="space-y-2">
                        {templates.map((template) => (
                          <button
                            key={template.id}
                            onClick={() => handleSendTemplate(template.id)}
                            className="w-full text-left text-sm bg-white border border-gray-200 rounded p-2 hover:border-emerald-500 hover:bg-emerald-50 transition-colors"
                          >
                            <div className="font-medium text-gray-900">{template.title}</div>
                            <div className="text-gray-600 text-xs mt-1 truncate">{template.content}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex space-x-2">
                    <button
                      onClick={() => setShowTemplates(!showTemplates)}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg transition-colors"
                      title="Templates"
                    >
                      <Template className="h-4 w-4" />
                    </button>
                    <input
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Type your message..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!inputText.trim() || isLoading}
                      className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4 py-2 rounded-lg hover:from-emerald-700 hover:to-teal-700 transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Conversation</h3>
                  <p className="text-gray-600">Choose a conversation from the list to start messaging</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Messages;