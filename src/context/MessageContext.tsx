import React, { createContext, useContext, useState, useEffect } from "react";
import { Message, Conversation, MessageTemplate } from "../types";
import {
  mockMessages,
  mockConversations,
  mockMessageTemplates,
} from "../data/mockMessageData";
import { useAuth } from "./AuthContext";
import { useAdmin } from "./AdminContext";

interface MessageContextType {
  conversations: Conversation[];
  messages: Message[];
  templates: MessageTemplate[];
  selectedConversation: Conversation | null;
  sendMessage: (
    conversationId: string,
    content: string,
    type?: Message["type"]
  ) => Promise<void>;
  createConversation: (userId: string, dogId?: string) => Promise<string>;
  selectConversation: (conversationId: string) => void;
  markAsRead: (conversationId: string) => void;
  getUserConversation: (userId: string, dogId?: string) => Conversation | null;
  getConversationMessages: (conversationId: string) => Message[];
  sendTemplateMessage: (
    conversationId: string,
    templateId: string
  ) => Promise<void>;
  isLoading: boolean;
}

// Create MessageContext once here
const MessageContext = createContext<MessageContextType | undefined>(undefined);

// Custom hook to consume the context
export const useMessage = (): MessageContextType => {
  const context = useContext(MessageContext);
  if (context === undefined) {
    throw new Error("useMessage must be used within a MessageProvider");
  }
  return context;
};

export const MessageProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();
  const { adminUser } = useAdmin();
  const [conversations, setConversations] =
    useState<Conversation[]>(mockConversations);
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [templates] = useState<MessageTemplate[]>(mockMessageTemplates);
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Update conversations with latest messages
    const updatedConversations = conversations.map((conv) => {
      const conversationMessages = messages.filter(
        (m) => m.conversationId === conv.id
      );
      const lastMessage = conversationMessages.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )[0];

      const unreadCount = conversationMessages.filter(
        (m) => !m.isRead && m.senderType !== (adminUser ? "admin" : "user")
      ).length;

      return {
        ...conv,
        lastMessage,
        unreadCount,
        updatedAt: lastMessage?.timestamp || conv.updatedAt,
      };
    });

    setConversations(updatedConversations);
  }, [messages, adminUser]);

  const sendMessage = async (
    conversationId: string,
    content: string,
    type: Message["type"] = "chat"
  ) => {
    setIsLoading(true);

    await new Promise((resolve) => setTimeout(resolve, 500));

    const currentUser = adminUser || user;
    if (!currentUser) {
      setIsLoading(false);
      return;
    }

    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      conversationId,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderType: adminUser ? "admin" : "user",
      content,
      timestamp: new Date().toISOString(),
      isRead: false,
      type,
      dogId: conversations.find((c) => c.id === conversationId)?.dogId,
    };

    setMessages((prev) => [...prev, newMessage]);
    setIsLoading(false);
  };

  const createConversation = async (
    userId: string,
    dogId?: string
  ): Promise<string> => {
    setIsLoading(true);

    const existingConv = conversations.find(
      (c) => c.userId === userId && c.dogId === dogId
    );

    if (existingConv) {
      setIsLoading(false);
      return existingConv.id;
    }

    await new Promise((resolve) => setTimeout(resolve, 500));

    const newConversation: Conversation = {
      id: `conv-${Date.now()}`,
      userId,
      userName: user?.name || "User",
      userEmail: user?.email || "user@example.com",
      dogId,
      dogName: dogId ? "Dog" : undefined,
      unreadCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setConversations((prev) => [...prev, newConversation]);
    setIsLoading(false);

    return newConversation.id;
  };

  const selectConversation = (conversationId: string) => {
    const conversation = conversations.find((c) => c.id === conversationId);
    setSelectedConversation(conversation || null);
  };

  const markAsRead = (conversationId: string) => {
    const currentUserType = adminUser ? "admin" : "user";

    setMessages((prev) =>
      prev.map((message) =>
        message.conversationId === conversationId &&
        message.senderType !== currentUserType
          ? { ...message, isRead: true }
          : message
      )
    );
  };

  const getUserConversation = (
    userId: string,
    dogId?: string
  ): Conversation | null => {
    return (
      conversations.find((c) => c.userId === userId && c.dogId === dogId) ||
      null
    );
  };

  const getConversationMessages = (conversationId: string): Message[] => {
    return messages
      .filter((m) => m.conversationId === conversationId)
      .sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
  };

  const sendTemplateMessage = async (
    conversationId: string,
    templateId: string
  ) => {
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      await sendMessage(conversationId, template.content, "admin_note");
    }
  };

  return (
    <MessageContext.Provider
      value={{
        conversations,
        messages,
        templates,
        selectedConversation,
        sendMessage,
        createConversation,
        selectConversation,
        markAsRead,
        getUserConversation,
        getConversationMessages,
        sendTemplateMessage,
        isLoading,
      }}
    >
      {children}
    </MessageContext.Provider>
  );
};
