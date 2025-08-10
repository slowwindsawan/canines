import { Message, Conversation, MessageTemplate } from '../types';

export const mockMessages: Message[] = [
  {
    id: 'msg-1',
    conversationId: 'conv-1',
    senderId: '1',
    senderName: 'Sarah Johnson',
    senderType: 'user',
    content: 'Hi! I have some questions about Max\'s new protocol. He seems to be doing better but I\'m wondering about the fish oil dosage.',
    timestamp: '2024-01-23T10:30:00Z',
    isRead: true,
    type: 'chat',
    dogId: 'dog-1'
  },
  {
    id: 'msg-2',
    conversationId: 'conv-1',
    senderId: 'admin-1',
    senderName: 'Dr. Sarah Wilson',
    senderType: 'admin',
    content: 'Hello Sarah! I\'m so glad to hear Max is improving. Regarding the fish oil dosage, you can continue with the current 500mg daily. If you notice continued improvement over the next week, we might consider increasing it slightly.',
    timestamp: '2024-01-23T11:15:00Z',
    isRead: true,
    type: 'chat',
    dogId: 'dog-1'
  },
  {
    id: 'msg-3',
    conversationId: 'conv-1',
    senderId: 'admin-1',
    senderName: 'Dr. Sarah Wilson',
    senderType: 'admin',
    content: 'I\'ve also updated Max\'s protocol to include some additional probiotics that should help with his digestive sensitivity. You can find the updated plan in your dashboard.',
    timestamp: '2024-01-23T11:16:00Z',
    isRead: true,
    type: 'plan_update',
    dogId: 'dog-1'
  },
  {
    id: 'msg-4',
    conversationId: 'conv-1',
    senderId: '1',
    senderName: 'Sarah Johnson',
    senderType: 'user',
    content: 'Thank you so much! I see the updated protocol. Should I introduce the probiotics gradually?',
    timestamp: '2024-01-23T14:20:00Z',
    isRead: false,
    type: 'chat',
    dogId: 'dog-1'
  },
  {
    id: 'msg-5',
    conversationId: 'conv-2',
    senderId: 'user-2',
    senderName: 'Marcus Thompson',
    senderType: 'user',
    content: 'Rex had another episode of vomiting this morning. Should I be concerned? He seems okay now but I\'m worried.',
    timestamp: '2024-01-23T09:45:00Z',
    isRead: false,
    type: 'chat',
    dogId: 'dog-2'
  },
  {
    id: 'msg-6',
    conversationId: 'conv-3',
    senderId: 'user-3',
    senderName: 'Jennifer Park',
    senderType: 'user',
    content: 'Milo\'s skin is looking much better! The omega-3 supplements are really working. When should we schedule his next check-in?',
    timestamp: '2024-01-22T16:30:00Z',
    isRead: true,
    type: 'chat',
    dogId: 'dog-3'
  },
  {
    id: 'msg-7',
    conversationId: 'conv-3',
    senderId: 'admin-1',
    senderName: 'Dr. Sarah Wilson',
    senderType: 'admin',
    content: 'That\'s wonderful news about Milo! Let\'s schedule his next check-in for 2 weeks from now. I\'ll send you a calendar link shortly.',
    timestamp: '2024-01-22T17:45:00Z',
    isRead: true,
    type: 'chat',
    dogId: 'dog-3'
  }
];

export const mockConversations: Conversation[] = [
  {
    id: 'conv-1',
    userId: '1',
    userName: 'Sarah Johnson',
    userEmail: 'sarah@example.com',
    dogId: 'dog-1',
    dogName: 'Max',
    lastMessage: mockMessages.find(m => m.id === 'msg-4'),
    unreadCount: 1,
    createdAt: '2024-01-20T10:00:00Z',
    updatedAt: '2024-01-23T14:20:00Z'
  },
  {
    id: 'conv-2',
    userId: 'user-2',
    userName: 'Marcus Thompson',
    userEmail: 'marcus.thompson@email.com',
    dogId: 'dog-2',
    dogName: 'Rex',
    lastMessage: mockMessages.find(m => m.id === 'msg-5'),
    unreadCount: 1,
    createdAt: '2024-01-23T09:45:00Z',
    updatedAt: '2024-01-23T09:45:00Z'
  },
  {
    id: 'conv-3',
    userId: 'user-3',
    userName: 'Jennifer Park',
    userEmail: 'jennifer.park@email.com',
    dogId: 'dog-3',
    dogName: 'Milo',
    lastMessage: mockMessages.find(m => m.id === 'msg-7'),
    unreadCount: 0,
    createdAt: '2024-01-22T16:30:00Z',
    updatedAt: '2024-01-22T17:45:00Z'
  }
];

export const mockMessageTemplates: MessageTemplate[] = [
  {
    id: 'template-1',
    title: 'Welcome Message',
    content: 'Welcome to The Canine Nutritionist! I\'m here to help you with your dog\'s health journey. How can I assist you today?',
    category: 'greeting'
  },
  {
    id: 'template-2',
    title: 'Protocol Update',
    content: 'I\'ve updated your dog\'s protocol based on their recent progress. Please check your dashboard for the latest recommendations.',
    category: 'plan_update'
  },
  {
    id: 'template-3',
    title: 'Follow-up Check',
    content: 'How is your dog responding to the current protocol? Please let me know if you\'ve noticed any changes in symptoms or behavior.',
    category: 'follow_up'
  },
  {
    id: 'template-4',
    title: 'Supplement Instructions',
    content: 'When introducing new supplements, start with half the recommended dose for the first 3-5 days to allow your dog\'s system to adjust.',
    category: 'general'
  },
  {
    id: 'template-5',
    title: 'Emergency Guidance',
    content: 'If your dog is experiencing severe symptoms (persistent vomiting, bloody stool, lethargy), please contact your veterinarian immediately.',
    category: 'general'
  }
];