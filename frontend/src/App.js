

import React, { useState, useEffect, useRef } from 'react';
import { Search, MoreVertical, Paperclip, Smile, Mic, Send, Archive, Settings, Users, MessageCircle, Phone, Video, Info, X, Plus } from 'lucide-react';
import io from 'socket.io-client';

function App() {
  const [conversations, setConversations] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const [socket, setSocket] = useState(null);
  const [backendError, setBackendError] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const emojiPickerRef = useRef(null);

  // Backend URL - adjust this based on your deployment
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

  // Initialize Socket.IO connection
  useEffect(() => {
    const newSocket = io(BACKEND_URL, {
      transports: ['websocket', 'polling']
    });
    
    newSocket.on('connect', () => {
      console.log('🟢 Connected to backend');
      setIsOnline(true);
      setBackendError(null);
    });
    
    newSocket.on('disconnect', () => {
      console.log('🔴 Disconnected from backend');
      setIsOnline(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error);
      setBackendError('Failed to connect to server');
      setIsOnline(false);
    });
    
    newSocket.on('new-message', (message) => {
      console.log('📥 New message received:', message);
      
      // Update messages if this message is related to the current active chat
      if (selectedChat && 
          ((message.fromNumber === selectedChat.userNumber && message.isFromUser) ||
           (message.toNumber === selectedChat.userNumber && !message.isFromUser))) {
        setMessages(prev => {
          // Check if message already exists to prevent duplicates
          const exists = prev.find(msg => msg.messageId === message.messageId);
          if (exists) return prev;
          
          return [...prev, message];
        });
      }
      
      // Update conversations list
      refreshConversations();
    });
    
    newSocket.on('message-status-update', (statusUpdate) => {
      console.log('📊 Message status update:', statusUpdate);
      
      // Update message status in current chat
      setMessages(prev => 
        prev.map(msg => 
          msg.messageId === statusUpdate.messageId 
            ? { ...msg, status: statusUpdate.status }
            : msg
        )
      );
    });
    
    newSocket.on('conversation-update', (update) => {
      console.log('💬 Conversation update:', update);
      refreshConversations();
    });
    
    setSocket(newSocket);
    
    return () => newSocket.close();
  }, [BACKEND_URL, selectedChat]);

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // API Functions
  const apiCall = async (endpoint, options = {}) => {
    try {
      const response = await fetch(`${BACKEND_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setBackendError(null);
      return data;
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error);
      setBackendError(`Backend error: ${error.message}`);
      throw error;
    }
  };

  const refreshConversations = async () => {
    try {
      const data = await apiCall('/api/conversations');
      setConversations(data);
      
      // Also update localStorage
      localStorage.setItem('whatsapp_conversations', JSON.stringify(data));
    } catch (error) {
      console.error('Failed to fetch conversations, using localStorage:', error);
      // Fallback to localStorage
      const stored = JSON.parse(localStorage.getItem('whatsapp_conversations') || '[]');
      setConversations(stored);
    }
  };

  const loadMessages = async (userNumber) => {
    try {
      const data = await apiCall(`/api/messages/${userNumber}`);
      setMessages(data);
      
      // Also update localStorage
      const messagesByUser = JSON.parse(localStorage.getItem('whatsapp_messages') || '{}');
      messagesByUser[userNumber] = data;
      localStorage.setItem('whatsapp_messages', JSON.stringify(messagesByUser));
    } catch (error) {
      console.error('Failed to fetch messages, using localStorage:', error);
      // Fallback to localStorage
      const storedMessages = JSON.parse(localStorage.getItem('whatsapp_messages') || '{}');
      setMessages(storedMessages[userNumber] || []);
    }
  };

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      
      try {
        // Try to load from backend first
        await refreshConversations();
      } catch (error) {
        console.error('Backend unavailable, initializing with sample data:', error);
        // Initialize with sample data if backend is not available
        initializeSampleData();
      }
      
      setLoading(false);
    };

    loadInitialData();
  }, []);

  const initializeSampleData = () => {
    const sampleConversations = [
      {
        _id: { userNumber: '919876543210', userName: 'Neha Sharma' },
        lastMessage: 'Hello! I\'m interested in your services',
        lastTimestamp: Date.now() / 1000 - 300,
        unreadCount: 2,
        isOnline: true
      },
      {
        _id: { userNumber: '919876543211', userName: 'Ravi Kumar' },
        lastMessage: 'Can you share more details about pricing?',
        lastTimestamp: Date.now() / 1000 - 1800,
        unreadCount: 1,
        isOnline: false
      },
      {
        _id: { userNumber: '919876543212', userName: 'Priya Singh' },
        lastMessage: 'Thank you for the quick response!',
        lastTimestamp: Date.now() / 1000 - 3600,
        unreadCount: 0,
        isOnline: true
      },
      {
        _id: { userNumber: '919876543213', userName: 'Amit Patel' },
        lastMessage: 'Are you available for a call today?',
        lastTimestamp: Date.now() / 1000 - 7200,
        unreadCount: 0,
        isOnline: false
      }
    ];

    const initialMessages = {
      '919876543210': [
        {
          messageId: '1',
          messageText: 'Hello! I\'m interested in your services',
          isFromUser: true,
          timestamp: Date.now() / 1000 - 1800,
          status: 'read',
          isRead: false
        },
        {
          messageId: '2',
          messageText: 'Hi Neha! Thank you for reaching out. We offer comprehensive digital marketing services. What specifically are you looking for?',
          isFromUser: false,
          timestamp: Date.now() / 1000 - 1700,
          status: 'read'
        }
      ]
    };
    
    setConversations(sampleConversations);
    
    // Save to localStorage as backup
    localStorage.setItem('whatsapp_conversations', JSON.stringify(sampleConversations));
    localStorage.setItem('whatsapp_messages', JSON.stringify(initialMessages));

    // Try to sync with backend (fire and forget)
    syncSampleDataToBackend(sampleConversations, initialMessages);
  };

  const syncSampleDataToBackend = async (conversations, messages) => {
    try {
      // This would require a new API endpoint to bulk import data
      // For now, we'll just log that we have sample data
      console.log('Sample data initialized, backend sync would happen here');
    } catch (error) {
      console.error('Failed to sync sample data to backend:', error);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);
const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChat || sendingMessage) return;

    setSendingMessage(true);
    const messageToSend = newMessage.trim();
    setNewMessage('');
    
    // Create a temporary message for immediate UI update with 'sent' status
    const tempMessageId = `temp_${Date.now()}`;
    const tempMessage = {
      messageId: tempMessageId,
      messageText: messageToSend,
      isFromUser: false,
      timestamp: Date.now() / 1000,
      status: 'sent',
      fromNumber: '918329446654', // business number
      toNumber: selectedChat.userNumber
    };
    
    // Add message to UI immediately
    setMessages(prev => [...prev, tempMessage]);
    
    try {
      if (socket && isOnline) {
        // Send via Socket.IO for real-time updates
        socket.emit('send-message', {
          toNumber: selectedChat.userNumber,
          userName: selectedChat.userName,
          messageText: messageToSend
        });
      } else {
        // Fallback to REST API
        const response = await apiCall('/api/send-message', {
          method: 'POST',
          body: JSON.stringify({
            toNumber: selectedChat.userNumber,
            userName: selectedChat.userName,
            messageText: messageToSend
          })
        });
        
        // Replace temp message with actual message from server
        const actualMessage = {
          messageId: response.messageId || Date.now().toString(),
          messageText: messageToSend,
          isFromUser: false,
          timestamp: Date.now() / 1000,
          status: 'sent',
          fromNumber: '918329446654',
          toNumber: selectedChat.userNumber
        };
        
        setMessages(prev => prev.map(msg => 
          msg.messageId === tempMessageId ? actualMessage : msg
        ));
        
        // Simulate status progression: sent -> delivered -> read
        setTimeout(() => {
          setMessages(prev => prev.map(msg => 
            msg.messageId === actualMessage.messageId 
              ? { ...msg, status: 'delivered' }
              : msg
          ));
          
          // After another 2 seconds, mark as read
          setTimeout(() => {
            setMessages(prev => prev.map(msg => 
              msg.messageId === actualMessage.messageId 
                ? { ...msg, status: 'read' }
                : msg
            ));
          }, 2000);
        }, 1000);
        
        // Update localStorage with the actual message
        const storedMessages = JSON.parse(localStorage.getItem('whatsapp_messages') || '{}');
        const currentMessages = storedMessages[selectedChat.userNumber] || [];
        storedMessages[selectedChat.userNumber] = [...currentMessages.filter(m => m.messageId !== tempMessageId), actualMessage];
        localStorage.setItem('whatsapp_messages', JSON.stringify(storedMessages));
        
        // Refresh conversations to update last message
        refreshConversations();
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      
      // Update temp message status to indicate error
      setMessages(prev => prev.map(msg => 
        msg.messageId === tempMessageId 
          ? { ...msg, status: 'failed', error: true }
          : msg
      ));
      
      // Show error to user
      alert('Message failed to send. Check your connection.');
    }
    
    setSendingMessage(false);
    inputRef.current?.focus();
  };
  // Emoji functionality
  const emojis = [
    '😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚',
    '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️',
    '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥',
    '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤',
    '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈', '👿', '👹', '👺', '🤡', '💩', '👻',
    '💀', '☠️', '👽', '👾', '🤖', '🎃', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾', '👋', '🤚', '🖐️', '✋',
    '🖖', '👌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛',
    '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃', '🧠',
    '🦷', '🦴', '👀', '👁️', '👅', '👄', '💋', '🩸', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️',
    '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐',
    '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓', '🆔', '⚛️', '🉑', '☢️', '☣️', '📴', '📳',
    '🈶', '🈚', '🈸', '🈺', '🈷️', '✴️', '🆚', '💮', '🉐', '㊙️', '㊗️', '🈴', '🈵', '🈹', '🈲', '🅰️', '🅱️', '🆎',
    '🆑', '🅾️', '🆘', '❌', '⭕', '🛑', '⛔', '📛', '🚫', '💯', '💢', '♨️', '🚷', '🚯', '🚳', '🚱', '🔞', '📵', '🚭'
  ];

  const handleEmojiClick = (emoji) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  const toggleEmojiPicker = () => {
    setShowEmojiPicker(!showEmojiPicker);
  };

  const selectChat = async (conversation) => {
    const chatInfo = {
      userNumber: conversation._id.userNumber,
      userName: conversation._id.userName,
      isOnline: conversation.isOnline
    };
    
    setSelectedChat(chatInfo);
    
    // Load messages for this chat
    await loadMessages(conversation._id.userNumber);
    
    // Mark messages as read if there are unread messages
    if (conversation.unreadCount > 0) {
      // Update conversation unread count locally
      setConversations(prev => 
        prev.map(conv => 
          conv._id.userNumber === conversation._id.userNumber 
            ? { ...conv, unreadCount: 0 }
            : conv
        )
      );
      
      // Update localStorage
      const storedConversations = conversations.map(conv => 
        conv._id.userNumber === conversation._id.userNumber 
          ? { ...conv, unreadCount: 0 }
          : conv
      );
      localStorage.setItem('whatsapp_conversations', JSON.stringify(storedConversations));
    }
    
    // Join this conversation room for real-time updates
    if (socket) {
      socket.emit('join-conversations', [conversation._id.userNumber]);
    }
  };

  const formatTime = (timestamp) => {
    const now = new Date();
    const msgTime = new Date(timestamp * 1000);
    const diff = now - msgTime;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (hours < 24) {
      return msgTime.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return msgTime.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return msgTime.toLocaleDateString('en-US', { 
        day: '2-digit',
        month: '2-digit'
      });
    }
  };

  const simulateUserMessage = () => {
    if (!selectedChat) return;
    
    const customerMessages = [
      "That sounds perfect! When can we start?",
      "Can we schedule a call this week?",
      "What are your payment terms?",
      "I'd like to see some of your previous work",
      "Do you have any case studies to share?",
      "This is exactly what I was looking for!",
      "Can you send me a detailed proposal?",
      "What's the timeline for this project?",
      "How do we proceed from here?",
      "I'm ready to move forward with this!",
      "Can you share more details about the pricing?",
      "What's included in the package?",
      "Do you offer any guarantees?",
      "When would be the best time to start?"
    ];
    
    const randomMessage = customerMessages[Math.floor(Math.random() * customerMessages.length)];
    
    setIsTyping(true);
    
    setTimeout(() => {
      setIsTyping(false);
      
      if (socket && isOnline) {
        // Send via Socket.IO
        socket.emit('simulate-user-message', {
          fromNumber: selectedChat.userNumber,
          userName: selectedChat.userName,
          messageText: randomMessage
        });
      } else {
        // Fallback to local simulation
        const newMsg = {
          messageId: `user_${Date.now()}`,
          messageText: randomMessage,
          isFromUser: true,
          timestamp: Date.now() / 1000,
          status: 'delivered', // User messages are typically delivered
          isRead: false, // Mark as unread initially
          fromNumber: selectedChat.userNumber,
          toNumber: '918329446654'
        };
        
        setMessages(prev => [...prev, newMsg]);
        
        // Mark user message as read after 3 seconds (simulate reading it)
        setTimeout(() => {
          setMessages(prev => prev.map(msg => 
            msg.messageId === newMsg.messageId 
              ? { ...msg, isRead: true, status: 'read' }
              : msg
          ));
        }, 3000);
        
        // Update localStorage
        const storedMessages = JSON.parse(localStorage.getItem('whatsapp_messages') || '{}');
        storedMessages[selectedChat.userNumber] = [...(storedMessages[selectedChat.userNumber] || []), newMsg];
        localStorage.setItem('whatsapp_messages', JSON.stringify(storedMessages));
        
        // Update conversation with unread count
        setConversations(prev => 
          prev.map(conv => 
            conv._id.userNumber === selectedChat.userNumber 
              ? { 
                  ...conv, 
                  lastMessage: randomMessage, 
                  lastTimestamp: Date.now() / 1000,
                  unreadCount: conv.unreadCount + 1
                }
              : conv
          )
        );
        
        // After 3 seconds, mark conversation as read (simulate reading)
        setTimeout(() => {
          setConversations(prev => 
            prev.map(conv => 
              conv._id.userNumber === selectedChat.userNumber 
                ? { ...conv, unreadCount: 0 }
                : conv
            )
          );
        }, 3000);
      }
    }, Math.random() * 1500 + 1000); // Random typing delay between 1-2.5 seconds
  };
  
const getStatusIcon = (status, hasError = false) => {
    if (hasError) {
      return (
        <div className="flex items-center">
          <svg className="w-4 h-4 text-red-500" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
            <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
          </svg>
        </div>
      );
    }

    switch (status) {
      case 'sent':
        return (
          <div className="flex items-center">
            <svg className="w-4 h-4 text-gray-400" viewBox="0 0 16 15" fill="currentColor">
              <path d="M10.91 3.316l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z"/>
            </svg>
          </div>
        );
      case 'delivered':
        return (
          <div className="flex items-center">
            <svg className="w-4 h-4 text-gray-400" viewBox="0 0 16 15" fill="currentColor">
              <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-1.91-1.909a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l2.258 2.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z"/>
              <path d="M10.91 3.316l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z"/>
            </svg>
          </div>
        );
      case 'read':
        return (
          <div className="flex items-center">
            <svg className="w-4 h-4 text-blue-500" viewBox="0 0 16 15" fill="currentColor">
              <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-1.91-1.909a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l2.258 2.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z"/>
              <path d="M10.91 3.316l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z"/>
            </svg>
          </div>
        );
      default:
        return null;
    }
  };

  // Filter conversations based on active tab and search
  const getFilteredConversations = () => {
    let filtered = conversations.filter(conv =>
      conv._id.userName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    switch (activeTab) {
      case 'Unread':
        return filtered.filter(conv => conv.unreadCount > 0);
      case 'Favourites':
        return filtered.filter(conv => conv.isFavourite);
      case 'Groups':
        return filtered.filter(conv => conv.isGroup);
      default:
        return filtered;
    }
  };

  const filteredConversations = getFilteredConversations();

  // Clear all data function (for testing)
  const clearAllData = async () => {
    if (window.confirm('This will clear all data. Are you sure?')) {
      // Clear localStorage
      localStorage.removeItem('whatsapp_conversations');
      localStorage.removeItem('whatsapp_messages');
      
      // Clear state
      setConversations([]);
      setMessages([]);
      setSelectedChat(null);
      
      // Reinitialize with sample data
      initializeSampleData();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <div className="text-xl text-gray-600 mb-2">Loading WhatsApp...</div>
          <div className={`text-sm ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
            {isOnline ? '🟢 Connected to Backend' : '🔴 Connecting to Backend...'}
          </div>
          {backendError && (
            <div className="text-xs text-amber-600 mt-2">
              ⚠️ Using offline mode: {backendError}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white">
      {/* Connection Status Bar */}
      {backendError && (
        <div className="fixed top-0 left-0 right-0 bg-amber-100 border-b border-amber-200 px-4 py-2 text-sm text-amber-800 text-center z-50">
          ⚠️ Backend unavailable: {backendError} - Running in offline mode
        </div>
      )}

      {/* Left Sidebar */}
      <div className={`w-full md:w-96 bg-white border-r border-gray-200 flex flex-col ${backendError ? 'pt-10' : ''}`}>
        {/* Header */}
        <div className="bg-gray-100 p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center overflow-hidden">
                <img 
                  src="https://ui-avatars.com/api/?name=Business&background=22c55e&color=fff&size=40" 
                  alt="Business" 
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="text-lg font-medium text-gray-900">WhatsApp</span>
            </div>
            <div className="flex items-center space-x-1">
              <button className="p-2 text-gray-600 hover:bg-gray-200 rounded-full transition-colors">
                <Users className="w-5 h-5" />
              </button>
              <button className="p-2 text-gray-600 hover:bg-gray-200 rounded-full transition-colors">
                <MessageCircle className="w-5 h-5" />
              </button>
              <button 
                onClick={clearAllData}
                className="p-2 text-gray-600 hover:bg-gray-200 rounded-full transition-colors"
                title="Clear all data"
              >
                <MoreVertical className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          {/* Search */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="w-4 h-4 text-gray-500" />
            </div>
            <input
              type="text"
              placeholder="Search or start a new chat"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-white border-b border-gray-200 px-4">
          {['All', 'Unread', 'Favourites', 'Groups'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-2 py-3 text-sm font-medium border-b-2 transition-colors relative ${
                activeTab === tab 
                  ? 'text-green-600 border-green-600' 
                  : 'text-gray-500 hover:text-gray-700 border-transparent'
              }`}
            >
              {tab}
              {tab === 'Unread' && conversations.filter(c => c.unreadCount > 0).length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              )}
            </button>
          ))}
        </div>

        {/* Notification Banner */}
        <div className="bg-blue-50 p-3 border-b border-blue-100">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs">🔔</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-blue-900">Backend Integration Active</p>
              <p className="text-xs text-blue-700 mt-1">
                {isOnline ? '✅ Data syncing with MongoDB Atlas' : '⚠️ Offline mode - data stored locally'}
              </p>
            </div>
            <div className={`flex-shrink-0 w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
          </div>
        </div>

        {/* Archived */}
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="flex items-center space-x-3 text-gray-600 hover:bg-gray-50 rounded-lg p-2 cursor-pointer transition-colors">
            <Archive className="w-5 h-5" />
            <span className="text-sm font-medium">Archived</span>
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.map((conv, index) => (
            <div
              key={index}
              onClick={() => selectChat(conv)}
              className={`px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50 transition-colors ${
                selectedChat?.userNumber === conv._id.userNumber ? 'bg-gray-100' : ''
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="relative flex-shrink-0">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-300">
                    <img 
                      src={`https://ui-avatars.com/api/?name=${encodeURIComponent(conv._id.userName || 'User')}&background=random&size=48`}
                      alt={conv._id.userName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {conv.isOnline && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <h3 className={`text-sm font-medium truncate ${conv.unreadCount > 0 ? 'text-gray-900 font-semibold' : 'text-gray-900'}`}>
                      {conv._id.userName || 'Unknown'}
                    </h3>
                    <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                      {formatTime(conv.lastTimestamp)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className={`text-sm truncate flex-1 mr-2 ${conv.unreadCount > 0 ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                      {conv.lastMessage}
                    </p>
                    {conv.unreadCount > 0 && (
                      <div className="bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                        {conv.unreadCount}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {filteredConversations.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="font-medium">
                {activeTab === 'Unread' ? 'No unread messages' : 'No conversations found'}
              </p>
              <p className="text-sm mt-2">
                {activeTab === 'Unread' ? 'All caught up!' : 'Try a different search term'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`flex-1 flex flex-col ${backendError ? 'pt-10' : ''}`}>
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="bg-gray-100 px-4 py-3 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-300">
                      <img 
                        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(selectedChat.userName || 'User')}&background=random&size=40`}
                        alt={selectedChat.userName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {selectedChat.isOnline && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                    )}
                  </div>
                  <div>
                    <h2 className="font-medium text-gray-900">{selectedChat.userName}</h2>
                    <p className="text-xs text-gray-500">
                      {isTyping ? (
                        <span className="text-green-600 flex items-center">
                          <span>typing</span>
                          <span className="ml-1 flex space-x-1">
                            <span className="w-1 h-1 bg-green-600 rounded-full animate-bounce"></span>
                            <span className="w-1 h-1 bg-green-600 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></span>
                            <span className="w-1 h-1 bg-green-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></span>
                          </span>
                        </span>
                      ) : selectedChat.isOnline ? (
                        'online'
                      ) : (
                        'last seen recently'
                      )}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-1">
                  <button 
                    onClick={simulateUserMessage}
                    disabled={isTyping}
                    className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                      isTyping 
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                        : 'bg-blue-500 text-white hover:bg-blue-600'
                    }`}
                  >
                    {isTyping ? 'Typing...' : '👤 Simulate'}
                  </button>
                  <button className="p-2 text-gray-600 hover:bg-gray-200 rounded-full transition-colors">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <div 
              className="flex-1 overflow-y-auto px-4 py-4"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23f0f0f0' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                backgroundColor: '#efeae2'
              }}
            >
              <div className="space-y-2">
                {messages.map((msg, index) => (
                  <div
                    key={msg.messageId || index}
                    className={`flex ${msg.isFromUser ? 'justify-start' : 'justify-end'} animate-fade-in`}
                  >
                    <div
                      className={`max-w-md px-3 py-2 rounded-lg shadow-sm relative ${
                        msg.isFromUser
                          ? 'bg-white text-gray-800 rounded-tl-none'
                          : msg.error 
                            ? 'bg-red-100 text-red-800 rounded-tr-none border border-red-300'
                            : 'bg-green-500 text-white rounded-tr-none'
                      }`}
                    >
                      {/* Unread indicator for user messages */}
                      {msg.isFromUser && !msg.isRead && (
                        <div className="absolute -left-2 top-2 w-2 h-2 bg-red-500 rounded-full"></div>
                      )}
                      <p className="text-sm break-words leading-relaxed">{msg.messageText}</p>
                      {msg.error && (
                        <p className="text-xs text-red-600 mt-1">Failed to send</p>
                      )}
                      <div className={`flex items-center justify-end space-x-1 mt-1 ${
                        msg.isFromUser ? 'text-gray-500' : msg.error ? 'text-red-600' : 'text-green-100'
                      }`}>
                        <span className="text-xs">
                          {formatTime(msg.timestamp)}
                        </span>
                        {!msg.isFromUser && (
                          <div className="ml-2 flex-shrink-0">
                            {getStatusIcon(msg.status, msg.error)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex justify-start animate-fade-in">
                    <div className="bg-white px-4 py-3 rounded-lg rounded-tl-none shadow-sm">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Message Input */}
            <div className="bg-gray-100 px-4 py-3 relative">
              <div className="flex items-end space-x-2">
                <div className="relative" ref={emojiPickerRef}>
                  <button 
                    onClick={toggleEmojiPicker}
                    className="p-2 text-gray-600 hover:bg-gray-200 rounded-full transition-colors"
                  >
                    <Smile className="w-5 h-5" />
                  </button>
                  
                  {/* Emoji Picker */}
                  {showEmojiPicker && (
                    <div className="absolute bottom-12 left-0 bg-white border border-gray-300 rounded-lg shadow-lg p-3 w-80 h-64 overflow-y-auto z-50">
                      <div className="grid grid-cols-8 gap-2">
                        {emojis.map((emoji, index) => (
                          <button
                            key={index}
                            onClick={() => handleEmojiClick(emoji)}
                            className="w-8 h-8 flex items-center justify-center text-lg hover:bg-gray-100 rounded transition-colors"
                            title={emoji}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="text-xs text-gray-500 text-center">
                          Click any emoji to add to your message
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <button className="p-2 text-gray-600 hover:bg-gray-200 rounded-full transition-colors">
                  <Paperclip className="w-5 h-5" />
                </button>
                <div className="flex-1">
                  <input
                    ref={inputRef}
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Type a message"
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-full focus:outline-none focus:border-green-500 text-sm resize-none"
                    disabled={sendingMessage}
                  />
                </div>
                {newMessage.trim() ? (
                  <button
                    onClick={sendMessage}
                    disabled={sendingMessage}
                    className="p-2 bg-green-500 text-white rounded-full hover:bg-green-600 disabled:opacity-50 transition-colors"
                  >
                    {sendingMessage ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </button>
                ) : (
                  <button className="p-2 text-gray-600 hover:bg-gray-200 rounded-full transition-colors">
                    <Mic className="w-5 h-5" />
                  </button>
                )}
              </div>
              
              {/* Connection Status */}
              <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
                <div className="flex items-center space-x-4">
                  <span>💼 Business Account</span>
                  <span className="flex items-center space-x-1">
                    <span>Status:</span>
                    <span className="text-gray-400">✓ Sent</span>
                    <span className="text-gray-400">✓✓ Delivered</span>
                    <span className="text-blue-500">✓✓ Read</span>
                  </span>
                </div>
                <span className={`flex items-center space-x-1 ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
                  <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span>{isOnline ? 'Backend Connected' : 'Offline Mode'}</span>
                </span>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center max-w-md">
              <div className="w-64 h-64 mx-auto mb-8 opacity-10">
                <svg viewBox="0 0 303 172" width="303" height="172" className="w-full h-full">
                  <g fill="#f0f0f0">
                    <path d="M93.5 15.5c0-8.8 7.2-16 16-16h84c8.8 0 16 7.2 16 16v41c0 8.8-7.2 16-16 16h-84c-8.8 0-16-7.2-16-16v-41z"/>
                    <path d="M93.5 82.5c0-8.8 7.2-16 16-16h84c8.8 0 16 7.2 16 16v73c0 8.8-7.2 16-16 16h-84c-8.8 0-16-7.2-16-16v-73z"/>
                  </g>
                </svg>
              </div>
              <h2 className="text-2xl font-light text-gray-600 mb-2">WhatsApp Web with Backend</h2>
              <p className="text-gray-500 mb-4 leading-relaxed">
                Send and receive messages with real-time sync to MongoDB Atlas.<br/>
                Data is stored both locally and in the cloud for reliability.
              </p>
              <div className="flex items-center justify-center space-x-4 text-sm">
                <div className="flex items-center space-x-2 text-green-600">
                  <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                  <span>{isOnline ? 'Backend Connected' : 'Offline Mode'}</span>
                </div>
                <div className="text-gray-400">|</div>
                <div className="text-gray-600">
                  📊 MongoDB Atlas {isOnline ? 'Syncing' : 'Offline'}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Custom Styles */}
      <style jsx>{`
        @keyframes fade-in {
          from { 
            opacity: 0; 
            transform: translateY(10px) scale(0.98); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0) scale(1); 
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        
        /* Custom scrollbar */
        .overflow-y-auto::-webkit-scrollbar {
          width: 6px;
        }
        .overflow-y-auto::-webkit-scrollbar-track {
          background: transparent;
        }
        .overflow-y-auto::-webkit-scrollbar-thumb {
          background: rgba(0,0,0,0.2);
          border-radius: 3px;
        }
        .overflow-y-auto::-webkit-scrollbar-thumb:hover {
          background: rgba(0,0,0,0.3);
        }

        /* Emoji picker scrollbar */
        .overflow-y-auto::-webkit-scrollbar {
          width: 4px;
        }
        
        /* Smooth emoji animations */
        .emoji-hover:hover {
          transform: scale(1.2);
          transition: transform 0.1s ease;
        }
      `}</style>
    </div>
  );
}

export default App;