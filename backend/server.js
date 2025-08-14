// const express = require('express');
// const mongoose = require('mongoose');
// const cors = require('cors');
// const path = require('path');
// const http = require('http');
// const socketIo = require('socket.io');

// const app = express();
// const server = http.createServer(app);
// const io = socketIo(server, {
//   cors: {
//     origin: "http://localhost:3000",
//     methods: ["GET", "POST"]
//   }
// });

// // Middleware
// app.use(cors());
// app.use(express.json());
// app.use(express.static(path.join(__dirname, 'public')));

// // MongoDB Connection
// mongoose.connect('mongodb://localhost:27017/whatsapp');

// // Message Schema
// const messageSchema = new mongoose.Schema({
//   messageId: String,
//   conversationId: String,
//   fromNumber: String,
//   toNumber: String,
//   userName: String,
//   messageText: String,
//   timestamp: Number,
//   status: { type: String, default: 'sent' },
//   isFromUser: Boolean,
//   createdAt: { type: Date, default: Date.now }
// });

// const Message = mongoose.model('Message', messageSchema);

// // WebSocket Connection Handling
// io.on('connection', (socket) => {
//   console.log('User connected:', socket.id);
  
//   // Join user to their conversation rooms
//   socket.on('join-conversations', (userNumbers) => {
//     userNumbers.forEach(number => {
//       socket.join(`conv_${number}`);
//     });
//     console.log(`User ${socket.id} joined conversations:`, userNumbers);
//   });
  
//   // Handle real-time message sending
//   socket.on('send-message', async (messageData) => {
//     try {
//       const newMessage = new Message({
//         messageId: `msg_${Date.now()}_${socket.id}`,
//         conversationId: `conv_${messageData.toNumber}`,
//         fromNumber: '918329446654',
//         toNumber: messageData.toNumber,
//         userName: messageData.userName,
//         messageText: messageData.messageText,
//         timestamp: Math.floor(Date.now() / 1000),
//         status: 'sent', // Start with single tick
//         isFromUser: false
//       });
      
//       await newMessage.save();
      
//       // Emit to all clients in this conversation
//       io.to(`conv_${messageData.toNumber}`).emit('new-message', newMessage);
      
//       // Also emit to general room for sidebar updates
//       io.emit('conversation-update', {
//         userNumber: messageData.toNumber,
//         userName: messageData.userName,
//         lastMessage: messageData.messageText,
//         timestamp: newMessage.timestamp
//       });
      
//       // AUTOMATIC: After 2 seconds, change to delivered (double grey tick)
//       setTimeout(async () => {
//         try {
//           await Message.updateOne({ _id: newMessage._id }, { status: 'delivered' });
//           io.to(`conv_${messageData.toNumber}`).emit('message-status-update', {
//             messageId: newMessage.messageId,
//             status: 'delivered'
//           });
//           console.log(`✓✓ Message ${newMessage.messageId} marked as delivered`);
//         } catch (error) {
//           console.error('Error updating to delivered:', error);
//         }
//       }, 2000); // 2 seconds delay
      
//       // NOTE: We DON'T automatically mark as read - only when customer sends message
      
//     } catch (error) {
//       console.error('WebSocket message error:', error);
//       socket.emit('message-error', error.message);
//     }
//   });
  
//   // Simulate incoming user messages AND mark business messages as read
//   socket.on('simulate-user-message', async (data) => {
//     try {
//       // 1. Create the user's message
//       const userMessage = new Message({
//         messageId: `user_msg_${Date.now()}`,
//         conversationId: `conv_${data.fromNumber}`,
//         fromNumber: data.fromNumber,
//         toNumber: '918329446654',
//         userName: data.userName,
//         messageText: data.messageText,
//         timestamp: Math.floor(Date.now() / 1000),
//         status: 'sent',
//         isFromUser: true
//       });
      
//       await userMessage.save();
      
//       // 2. Mark ALL unread business messages in this conversation as READ (blue ticks)
//       const updateResult = await Message.updateMany(
//         { 
//           toNumber: data.fromNumber, // Messages sent TO this user
//           isFromUser: false, // Only business messages
//           status: { $in: ['sent', 'delivered'] } // Only unread messages
//         },
//         { status: 'read' }
//       );
      
//       console.log(`📱 Customer ${data.userName} sent message. Marked ${updateResult.modifiedCount} business messages as read`);
      
//       // 3. Emit the new user message to all clients
//       io.emit('new-message', userMessage);
      
//       // 4. If we marked any messages as read, emit status updates
//       if (updateResult.modifiedCount > 0) {
//         // Get the messages we just updated to emit individual status updates
//         const readMessages = await Message.find({
//           toNumber: data.fromNumber,
//           isFromUser: false,
//           status: 'read'
//         });
        
//         // Emit status update for each message that was marked as read
//         readMessages.forEach(msg => {
//           io.to(`conv_${data.fromNumber}`).emit('message-status-update', {
//             messageId: msg.messageId,
//             status: 'read'
//           });
//         });
//       }
      
//       // 5. Update conversations sidebar for everyone
//       io.emit('conversation-update', {
//         userNumber: data.fromNumber,
//         userName: data.userName,
//         lastMessage: data.messageText,
//         timestamp: userMessage.timestamp
//       });
      
//     } catch (error) {
//       console.error('Simulate message error:', error);
//     }
//   });
  
//   socket.on('disconnect', () => {
//     console.log('User disconnected:', socket.id);
//   });
// });

// // Routes

// // Simple test route
// app.get('/api/test', async (req, res) => {
//   try {
//     const count = await Message.countDocuments();
//     const sample = await Message.findOne();
//     res.json({ 
//       message: 'Backend is working!', 
//       totalMessages: count,
//       sampleMessage: sample 
//     });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

// // Get all conversations (grouped by user)
// app.get('/api/conversations', async (req, res) => {
//   try {
//     console.log('Fetching conversations...');
    
//     const conversations = await Message.aggregate([
//       {
//         $group: {
//           _id: {
//             userNumber: { $cond: [{ $eq: ["$isFromUser", true] }, "$fromNumber", "$toNumber"] },
//             userName: "$userName"
//           },
//           lastMessage: { $last: "$messageText" },
//           lastTimestamp: { $max: "$timestamp" },
//           unreadCount: { $sum: { $cond: [{ $ne: ["$status", "read"] }, 1, 0] } }
//         }
//       },
//       { $sort: { lastTimestamp: -1 } }
//     ]);
    
//     console.log('Conversations found:', conversations);
//     res.json(conversations);
//   } catch (error) {
//     console.error('Error in /api/conversations:', error);
//     res.status(500).json({ error: error.message });
//   }
// });

// // Get messages for a specific conversation
// app.get('/api/messages/:userNumber', async (req, res) => {
//   try {
//     const messages = await Message.find({
//       $or: [
//         { fromNumber: req.params.userNumber },
//         { toNumber: req.params.userNumber }
//       ]
//     }).sort({ timestamp: 1 });
    
//     res.json(messages);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

// // Send a new message (REST API - still works)
// app.post('/api/send-message', async (req, res) => {
//   try {
//     const { toNumber, userName, messageText } = req.body;
    
//     const newMessage = new Message({
//       messageId: `msg_${Date.now()}`,
//       conversationId: `conv_${toNumber}`,
//       fromNumber: '918329446654',
//       toNumber: toNumber,
//       userName: userName,
//       messageText: messageText,
//       timestamp: Math.floor(Date.now() / 1000),
//       status: 'sent',
//       isFromUser: false
//     });
    
//     await newMessage.save();
    
//     // Emit via WebSocket too
//     io.to(`conv_${toNumber}`).emit('new-message', newMessage);
    
//     // Auto-deliver after 2 seconds (same logic as WebSocket)
//     setTimeout(async () => {
//       try {
//         await Message.updateOne({ _id: newMessage._id }, { status: 'delivered' });
//         io.to(`conv_${toNumber}`).emit('message-status-update', {
//           messageId: newMessage.messageId,
//           status: 'delivered'
//         });
//       } catch (error) {
//         console.error('Error updating REST message to delivered:', error);
//       }
//     }, 2000);
    
//     res.json(newMessage);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

// // Process webhook payload
// app.post('/api/process-payload', async (req, res) => {
//   try {
//     const payload = req.body;
    
//     if (payload.metaData?.entry?.[0]?.changes?.[0]?.value?.messages) {
//       const messages = payload.metaData.entry[0].changes[0].value.messages;
      
//       for (const msg of messages) {
//         const contact = payload.metaData.entry[0].changes[0].value.contacts?.[0];
        
//         const messageData = new Message({
//           messageId: msg.id,
//           conversationId: `conv_${msg.from}`,
//           fromNumber: msg.from,
//           toNumber: msg.from === '918329446654' ? contact?.wa_id : '918329446654',
//           userName: contact?.profile?.name || 'Unknown',
//           messageText: msg.text?.body || '',
//           timestamp: parseInt(msg.timestamp),
//           status: 'sent',
//           isFromUser: msg.from !== '918329446654'
//         });
        
//         await messageData.save();
        
//         // If this is a user message, mark business messages as read
//         if (msg.from !== '918329446654') {
//           const userNumber = msg.from;
//           await Message.updateMany(
//             { 
//               toNumber: userNumber,
//               isFromUser: false,
//               status: { $in: ['sent', 'delivered'] }
//             },
//             { status: 'read' }
//           );
//         }
        
//         // Emit new message via WebSocket
//         const userNumber = msg.from !== '918329446654' ? msg.from : contact?.wa_id;
//         io.to(`conv_${userNumber}`).emit('new-message', messageData);
//       }
//     }
    
//     // Handle status updates
//     if (payload.metaData?.entry?.[0]?.changes?.[0]?.value?.statuses) {
//       const statuses = payload.metaData.entry[0].changes[0].value.statuses;
      
//       for (const status of statuses) {
//         await Message.updateOne(
//           { messageId: status.id },
//           { status: status.status }
//         );
        
//         // Emit status update
//         io.emit('message-status-update', {
//           messageId: status.id,
//           status: status.status
//         });
//       }
//     }
    
//     res.json({ success: true });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

// const PORT = process.env.PORT || 5000;
// server.listen(PORT, () => {
//   console.log(`Server with WhatsApp-like status flow running on port ${PORT}`);
//   console.log('📋 Status Flow:');
//   console.log('  ✓ Sent (immediately)');
//   console.log('  ✓✓ Delivered (after 2 seconds)');
//   console.log('  ✓✓ Read/Blue (only when customer replies)');
// });

// require('dotenv').config();
// const express = require('express');
// const mongoose = require('mongoose');
// const cors = require('cors');
// const path = require('path');
// const http = require('http');
// const socketIo = require('socket.io');

// const app = express();
// const server = http.createServer(app);
// const io = socketIo(server, {
//   cors: {
//     origin: process.env.FRONTEND_URL || "http://localhost:3000",
//     methods: ["GET", "POST"]
//   }
// });

// // Middleware
// app.use(cors());
// app.use(express.json());
// app.use(express.static(path.join(__dirname, 'public')));

// // MongoDB Atlas Connection with improved error handling
// const connectDB = async () => {
//   try {
//     const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/whatsapp', {
//       useNewUrlParser: true,
//       useUnifiedTopology: true,
//     });
    
//     console.log(`✅ MongoDB Atlas Connected: ${conn.connection.host}`);
//     console.log(`📊 Database: ${conn.connection.name}`);
//   } catch (error) {
//     console.error('❌ MongoDB Atlas connection error:', error.message);
//     console.error('💡 Make sure your:');
//     console.error('   - MONGODB_URI is correct in .env file');
//     console.error('   - IP address is whitelisted in Atlas');
//     console.error('   - Database user has proper permissions');
//     process.exit(1);
//   }
// };

// // Connect to database
// connectDB();

// // Handle MongoDB connection events
// mongoose.connection.on('connected', () => {
//   console.log('🔗 Mongoose connected to MongoDB Atlas');
// });

// mongoose.connection.on('error', (err) => {
//   console.error('❌ Mongoose connection error:', err);
// });

// mongoose.connection.on('disconnected', () => {
//   console.log('🔌 Mongoose disconnected from MongoDB Atlas');
// });

// // Graceful shutdown
// process.on('SIGINT', async () => {
//   try {
//     await mongoose.connection.close();
//     console.log('🔒 MongoDB Atlas connection closed through app termination');
//     process.exit(0);
//   } catch (error) {
//     console.error('Error closing MongoDB connection:', error);
//     process.exit(1);
//   }
// });

// // Message Schema
// const messageSchema = new mongoose.Schema({
//   messageId: { type: String, required: true, unique: true },
//   conversationId: { type: String, required: true, index: true },
//   fromNumber: { type: String, required: true },
//   toNumber: { type: String, required: true },
//   userName: { type: String, required: true },
//   messageText: { type: String, required: true },
//   timestamp: { type: Number, required: true },
//   status: { type: String, default: 'sent', enum: ['sent', 'delivered', 'read'] },
//   isFromUser: { type: Boolean, required: true },
//   createdAt: { type: Date, default: Date.now }
// });

// // Add indexes for better performance
// messageSchema.index({ fromNumber: 1, toNumber: 1 });
// messageSchema.index({ timestamp: -1 });
// messageSchema.index({ status: 1 });

// const Message = mongoose.model('Message', messageSchema);

// // WebSocket Connection Handling
// io.on('connection', (socket) => {
//   console.log('👤 User connected:', socket.id);
  
//   // Join user to their conversation rooms
//   socket.on('join-conversations', (userNumbers) => {
//     userNumbers.forEach(number => {
//       socket.join(`conv_${number}`);
//     });
//     console.log(`🏠 User ${socket.id} joined conversations:`, userNumbers);
//   });
  
//   // Handle real-time message sending
//   socket.on('send-message', async (messageData) => {
//     try {
//       const newMessage = new Message({
//         messageId: `msg_${Date.now()}_${socket.id}`,
//         conversationId: `conv_${messageData.toNumber}`,
//         fromNumber: process.env.BUSINESS_NUMBER || '918329446654',
//         toNumber: messageData.toNumber,
//         userName: messageData.userName,
//         messageText: messageData.messageText,
//         timestamp: Math.floor(Date.now() / 1000),
//         status: 'sent', // Start with single tick
//         isFromUser: false
//       });
      
//       await newMessage.save();
//       console.log('💬 Message saved to Atlas:', newMessage.messageId);
      
//       // Emit to all clients in this conversation
//       io.to(`conv_${messageData.toNumber}`).emit('new-message', newMessage);
      
//       // Also emit to general room for sidebar updates
//       io.emit('conversation-update', {
//         userNumber: messageData.toNumber,
//         userName: messageData.userName,
//         lastMessage: messageData.messageText,
//         timestamp: newMessage.timestamp
//       });
      
//       // AUTOMATIC: After 2 seconds, change to delivered (double grey tick)
//       setTimeout(async () => {
//         try {
//           await Message.updateOne({ _id: newMessage._id }, { status: 'delivered' });
//           io.to(`conv_${messageData.toNumber}`).emit('message-status-update', {
//             messageId: newMessage.messageId,
//             status: 'delivered'
//           });
//           console.log(`✓✓ Message ${newMessage.messageId} marked as delivered`);
//         } catch (error) {
//           console.error('❌ Error updating to delivered:', error);
//         }
//       }, 2000); // 2 seconds delay
      
//       // NOTE: We DON'T automatically mark as read - only when customer sends message
      
//     } catch (error) {
//       console.error('❌ WebSocket message error:', error);
//       socket.emit('message-error', error.message);
//     }
//   });
  
//   // Simulate incoming user messages AND mark business messages as read
//   socket.on('simulate-user-message', async (data) => {
//     try {
//       // 1. Create the user's message
//       const userMessage = new Message({
//         messageId: `user_msg_${Date.now()}`,
//         conversationId: `conv_${data.fromNumber}`,
//         fromNumber: data.fromNumber,
//         toNumber: process.env.BUSINESS_NUMBER || '918329446654',
//         userName: data.userName,
//         messageText: data.messageText,
//         timestamp: Math.floor(Date.now() / 1000),
//         status: 'sent',
//         isFromUser: true
//       });
      
//       await userMessage.save();
//       console.log('📱 User message saved to Atlas:', userMessage.messageId);
      
//       // 2. Mark ALL unread business messages in this conversation as READ (blue ticks)
//       const updateResult = await Message.updateMany(
//         { 
//           toNumber: data.fromNumber, // Messages sent TO this user
//           isFromUser: false, // Only business messages
//           status: { $in: ['sent', 'delivered'] } // Only unread messages
//         },
//         { status: 'read' }
//       );
      
//       console.log(`📱 Customer ${data.userName} sent message. Marked ${updateResult.modifiedCount} business messages as read`);
      
//       // 3. Emit the new user message to all clients
//       io.emit('new-message', userMessage);
      
//       // 4. If we marked any messages as read, emit status updates
//       if (updateResult.modifiedCount > 0) {
//         // Get the messages we just updated to emit individual status updates
//         const readMessages = await Message.find({
//           toNumber: data.fromNumber,
//           isFromUser: false,
//           status: 'read'
//         });
        
//         // Emit status update for each message that was marked as read
//         readMessages.forEach(msg => {
//           io.to(`conv_${data.fromNumber}`).emit('message-status-update', {
//             messageId: msg.messageId,
//             status: 'read'
//           });
//         });
//       }
      
//       // 5. Update conversations sidebar for everyone
//       io.emit('conversation-update', {
//         userNumber: data.fromNumber,
//         userName: data.userName,
//         lastMessage: data.messageText,
//         timestamp: userMessage.timestamp
//       });
      
//     } catch (error) {
//       console.error('❌ Simulate message error:', error);
//     }
//   });
  
//   socket.on('disconnect', () => {
//     console.log('👋 User disconnected:', socket.id);
//   });
// });

// // Routes

// // Health check route
// app.get('/api/health', (req, res) => {
//   res.json({ 
//     status: 'healthy',
//     database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
//     timestamp: new Date().toISOString()
//   });
// });

// // Simple test route
// app.get('/api/test', async (req, res) => {
//   try {
//     const count = await Message.countDocuments();
//     const sample = await Message.findOne();
//     res.json({ 
//       message: 'Backend is working with MongoDB Atlas!', 
//       database: 'MongoDB Atlas',
//       totalMessages: count,
//       sampleMessage: sample,
//       connectionState: mongoose.connection.readyState
//     });
//   } catch (error) {
//     console.error('❌ Test route error:', error);
//     res.status(500).json({ error: error.message });
//   }
// });

// // Get all conversations (grouped by user)
// app.get('/api/conversations', async (req, res) => {
//   try {
//     console.log('📋 Fetching conversations from Atlas...');
    
//     const conversations = await Message.aggregate([
//       {
//         $group: {
//           _id: {
//             userNumber: { $cond: [{ $eq: ["$isFromUser", true] }, "$fromNumber", "$toNumber"] },
//             userName: "$userName"
//           },
//           lastMessage: { $last: "$messageText" },
//           lastTimestamp: { $max: "$timestamp" },
//           unreadCount: { 
//             $sum: { 
//               $cond: [
//                 { 
//                   $and: [
//                     { $eq: ["$isFromUser", false] },
//                     { $ne: ["$status", "read"] }
//                   ]
//                 }, 
//                 1, 
//                 0 
//               ] 
//             } 
//           }
//         }
//       },
//       { $sort: { lastTimestamp: -1 } }
//     ]);
    
//     console.log(`📋 Found ${conversations.length} conversations`);
//     res.json(conversations);
//   } catch (error) {
//     console.error('❌ Error in /api/conversations:', error);
//     res.status(500).json({ error: error.message });
//   }
// });

// // Get messages for a specific conversation
// app.get('/api/messages/:userNumber', async (req, res) => {
//   try {
//     const { userNumber } = req.params;
//     console.log(`💬 Fetching messages for user: ${userNumber}`);
    
//     const messages = await Message.find({
//       $or: [
//         { fromNumber: userNumber },
//         { toNumber: userNumber }
//       ]
//     }).sort({ timestamp: 1 });
    
//     console.log(`💬 Found ${messages.length} messages`);
//     res.json(messages);
//   } catch (error) {
//     console.error('❌ Error fetching messages:', error);
//     res.status(500).json({ error: error.message });
//   }
// });

// // Send a new message (REST API - still works)
// app.post('/api/send-message', async (req, res) => {
//   try {
//     const { toNumber, userName, messageText } = req.body;
    
//     if (!toNumber || !userName || !messageText) {
//       return res.status(400).json({ error: 'Missing required fields' });
//     }
    
//     const newMessage = new Message({
//       messageId: `msg_${Date.now()}`,
//       conversationId: `conv_${toNumber}`,
//       fromNumber: process.env.BUSINESS_NUMBER || '918329446654',
//       toNumber: toNumber,
//       userName: userName,
//       messageText: messageText,
//       timestamp: Math.floor(Date.now() / 1000),
//       status: 'sent',
//       isFromUser: false
//     });
    
//     await newMessage.save();
//     console.log('💬 REST message saved to Atlas:', newMessage.messageId);
    
//     // Emit via WebSocket too
//     io.to(`conv_${toNumber}`).emit('new-message', newMessage);
    
//     // Auto-deliver after 2 seconds (same logic as WebSocket)
//     setTimeout(async () => {
//       try {
//         await Message.updateOne({ _id: newMessage._id }, { status: 'delivered' });
//         io.to(`conv_${toNumber}`).emit('message-status-update', {
//           messageId: newMessage.messageId,
//           status: 'delivered'
//         });
//         console.log(`✓✓ REST Message ${newMessage.messageId} marked as delivered`);
//       } catch (error) {
//         console.error('❌ Error updating REST message to delivered:', error);
//       }
//     }, 2000);
    
//     res.json(newMessage);
//   } catch (error) {
//     console.error('❌ Send message error:', error);
//     res.status(500).json({ error: error.message });
//   }
// });

// // Process webhook payload
// app.post('/api/process-payload', async (req, res) => {
//   try {
//     const payload = req.body;
    
//     if (payload.metaData?.entry?.[0]?.changes?.[0]?.value?.messages) {
//       const messages = payload.metaData.entry[0].changes[0].value.messages;
      
//       for (const msg of messages) {
//         const contact = payload.metaData.entry[0].changes[0].value.contacts?.[0];
        
//         const messageData = new Message({
//           messageId: msg.id,
//           conversationId: `conv_${msg.from}`,
//           fromNumber: msg.from,
//           toNumber: msg.from === (process.env.BUSINESS_NUMBER || '918329446654') ? contact?.wa_id : (process.env.BUSINESS_NUMBER || '918329446654'),
//           userName: contact?.profile?.name || 'Unknown',
//           messageText: msg.text?.body || '',
//           timestamp: parseInt(msg.timestamp),
//           status: 'sent',
//           isFromUser: msg.from !== (process.env.BUSINESS_NUMBER || '918329446654')
//         });
        
//         await messageData.save();
//         console.log('📞 Webhook message saved to Atlas:', messageData.messageId);
        
//         // If this is a user message, mark business messages as read
//         if (msg.from !== (process.env.BUSINESS_NUMBER || '918329446654')) {
//           const userNumber = msg.from;
//           const updateResult = await Message.updateMany(
//             { 
//               toNumber: userNumber,
//               isFromUser: false,
//               status: { $in: ['sent', 'delivered'] }
//             },
//             { status: 'read' }
//           );
          
//           console.log(`📞 Webhook: Marked ${updateResult.modifiedCount} messages as read`);
//         }
        
//         // Emit new message via WebSocket
//         const userNumber = msg.from !== (process.env.BUSINESS_NUMBER || '918329446654') ? msg.from : contact?.wa_id;
//         io.to(`conv_${userNumber}`).emit('new-message', messageData);
//       }
//     }
    
//     // Handle status updates
//     if (payload.metaData?.entry?.[0]?.changes?.[0]?.value?.statuses) {
//       const statuses = payload.metaData.entry[0].changes[0].value.statuses;
      
//       for (const status of statuses) {
//         await Message.updateOne(
//           { messageId: status.id },
//           { status: status.status }
//         );
        
//         console.log(`📞 Webhook: Updated message ${status.id} to ${status.status}`);
        
//         // Emit status update
//         io.emit('message-status-update', {
//           messageId: status.id,
//           status: status.status
//         });
//       }
//     }
    
//     res.json({ success: true });
//   } catch (error) {
//     console.error('❌ Webhook error:', error);
//     res.status(500).json({ error: error.message });
//   }
// });

// const PORT = process.env.PORT || 5000;
// server.listen(PORT, () => {
//   console.log(`🚀 Server with WhatsApp-like status flow running on port ${PORT}`);
//   console.log('🗄️  Database: MongoDB Atlas');
//   console.log('📋 Status Flow:');
//   console.log('  ✓ Sent (immediately)');
//   console.log('  ✓✓ Delivered (after 2 seconds)');
//   console.log('  ✓✓ Read/Blue (only when customer replies)');
//   console.log('🌐 Environment:', process.env.NODE_ENV || 'development');
// });


require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: [
      process.env.FRONTEND_URL || "http://localhost:3000",
      "https://whatsapp-web-clone-production-6fc7.up.railway.app"
    ],
    methods: ["GET", "POST"],
    credentials: true
  }
});
// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Atlas Connection with improved error handling
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/whatsapp', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log(`✅ MongoDB Atlas Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
  } catch (error) {
    console.error('❌ MongoDB Atlas connection error:', error.message);
    console.error('💡 Make sure your:');
    console.error('   - MONGODB_URI is correct in .env file');
    console.error('   - IP address is whitelisted in Atlas');
    console.error('   - Database user has proper permissions');
    process.exit(1);
  }
};

// Connect to database
connectDB();

// Handle MongoDB connection events
mongoose.connection.on('connected', () => {
  console.log('🔗 Mongoose connected to MongoDB Atlas');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('🔌 Mongoose disconnected from MongoDB Atlas');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    console.log('🔒 MongoDB Atlas connection closed through app termination');
    process.exit(0);
  } catch (error) {
    console.error('Error closing MongoDB connection:', error);
    process.exit(1);
  }
});

// Message Schema
const messageSchema = new mongoose.Schema({
  messageId: { type: String, required: true, unique: true },
  conversationId: { type: String, required: true, index: true },
  fromNumber: { type: String, required: true },
  toNumber: { type: String, required: true },
  userName: { type: String, required: true },
  messageText: { type: String, required: true },
  timestamp: { type: Number, required: true },
  status: { type: String, default: 'sent', enum: ['sent', 'delivered', 'read'] },
  isFromUser: { type: Boolean, required: true },
  createdAt: { type: Date, default: Date.now }
});

// Add indexes for better performance
messageSchema.index({ fromNumber: 1, toNumber: 1 });
messageSchema.index({ timestamp: -1 });
messageSchema.index({ status: 1 });

const Message = mongoose.model('Message', messageSchema);

// WebSocket Connection Handling
io.on('connection', (socket) => {
  console.log('👤 User connected:', socket.id);
  
  // Join user to their conversation rooms
  socket.on('join-conversations', (userNumbers) => {
    userNumbers.forEach(number => {
      socket.join(`conv_${number}`);
    });
    console.log(`🏠 User ${socket.id} joined conversations:`, userNumbers);
  });
  
  // Handle real-time message sending
  socket.on('send-message', async (messageData) => {
    try {
      const newMessage = new Message({
        messageId: `msg_${Date.now()}_${socket.id}`,
        conversationId: `conv_${messageData.toNumber}`,
        fromNumber: process.env.BUSINESS_NUMBER || '918329446654',
        toNumber: messageData.toNumber,
        userName: messageData.userName,
        messageText: messageData.messageText,
        timestamp: Math.floor(Date.now() / 1000),
        status: 'sent',
        isFromUser: false
      });
      
      await newMessage.save();
      console.log('💬 Message saved to Atlas:', newMessage.messageId);
      
      // Emit to all clients in this conversation
      io.to(`conv_${messageData.toNumber}`).emit('new-message', newMessage);
      
      // Also emit to general room for sidebar updates
      io.emit('conversation-update', {
        userNumber: messageData.toNumber,
        userName: messageData.userName,
        lastMessage: messageData.messageText,
        timestamp: newMessage.timestamp
      });
      
      // AUTOMATIC: After 2 seconds, change to delivered (double grey tick)
      setTimeout(async () => {
        try {
          await Message.updateOne({ _id: newMessage._id }, { status: 'delivered' });
          io.to(`conv_${messageData.toNumber}`).emit('message-status-update', {
            messageId: newMessage.messageId,
            status: 'delivered'
          });
          console.log(`✓✓ Message ${newMessage.messageId} marked as delivered`);
        } catch (error) {
          console.error('❌ Error updating to delivered:', error);
        }
      }, 2000);
      
    } catch (error) {
      console.error('❌ WebSocket message error:', error);
      socket.emit('message-error', error.message);
    }
  });
  
  // Simulate incoming user messages AND mark business messages as read
  socket.on('simulate-user-message', async (data) => {
    try {
      // 1. Create the user's message
      const userMessage = new Message({
        messageId: `user_msg_${Date.now()}`,
        conversationId: `conv_${data.fromNumber}`,
        fromNumber: data.fromNumber,
        toNumber: process.env.BUSINESS_NUMBER || '918329446654',
        userName: data.userName,
        messageText: data.messageText,
        timestamp: Math.floor(Date.now() / 1000),
        status: 'sent',
        isFromUser: true
      });
      
      await userMessage.save();
      console.log('📱 User message saved to Atlas:', userMessage.messageId);
      
      // 2. Mark ALL unread business messages in this conversation as READ
      const updateResult = await Message.updateMany(
        { 
          toNumber: data.fromNumber,
          isFromUser: false,
          status: { $in: ['sent', 'delivered'] }
        },
        { status: 'read' }
      );
      
      console.log(`📱 Customer ${data.userName} sent message. Marked ${updateResult.modifiedCount} business messages as read`);
      
      // 3. Emit the new user message to all clients
      io.emit('new-message', userMessage);
      
      // 4. If we marked any messages as read, emit status updates
      if (updateResult.modifiedCount > 0) {
        const readMessages = await Message.find({
          toNumber: data.fromNumber,
          isFromUser: false,
          status: 'read'
        });
        
        readMessages.forEach(msg => {
          io.to(`conv_${data.fromNumber}`).emit('message-status-update', {
            messageId: msg.messageId,
            status: 'read'
          });
        });
      }
      
      // 5. Update conversations sidebar for everyone
      io.emit('conversation-update', {
        userNumber: data.fromNumber,
        userName: data.userName,
        lastMessage: data.messageText,
        timestamp: userMessage.timestamp
      });
      
    } catch (error) {
      console.error('❌ Simulate message error:', error);
    }
  });
  
  socket.on('disconnect', () => {
    console.log('👋 User disconnected:', socket.id);
  });
});

// Routes

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// Simple test route
app.get('/api/test', async (req, res) => {
  try {
    const count = await Message.countDocuments();
    const sample = await Message.findOne();
    res.json({ 
      message: 'Backend is working with MongoDB Atlas!', 
      database: 'MongoDB Atlas',
      totalMessages: count,
      sampleMessage: sample,
      connectionState: mongoose.connection.readyState
    });
  } catch (error) {
    console.error('❌ Test route error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all conversations (grouped by user)
app.get('/api/conversations', async (req, res) => {
  try {
    console.log('📋 Fetching conversations from Atlas...');
    
    const conversations = await Message.aggregate([
      {
        $group: {
          _id: {
            userNumber: { $cond: [{ $eq: ["$isFromUser", true] }, "$fromNumber", "$toNumber"] },
            userName: "$userName"
          },
          lastMessage: { $last: "$messageText" },
          lastTimestamp: { $max: "$timestamp" },
          unreadCount: { 
            $sum: { 
              $cond: [
                { 
                  $and: [
                    { $eq: ["$isFromUser", false] },
                    { $ne: ["$status", "read"] }
                  ]
                }, 
                1, 
                0 
              ] 
            } 
          }
        }
      },
      { $sort: { lastTimestamp: -1 } }
    ]);
    
    console.log(`📋 Found ${conversations.length} conversations`);
    res.json(conversations);
  } catch (error) {
    console.error('❌ Error in /api/conversations:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get messages for a specific conversation
app.get('/api/messages/:userNumber', async (req, res) => {
  try {
    const { userNumber } = req.params;
    console.log(`💬 Fetching messages for user: ${userNumber}`);
    
    const messages = await Message.find({
      $or: [
        { fromNumber: userNumber },
        { toNumber: userNumber }
      ]
    }).sort({ timestamp: 1 });
    
    console.log(`💬 Found ${messages.length} messages`);
    res.json(messages);
  } catch (error) {
    console.error('❌ Error fetching messages:', error);
    res.status(500).json({ error: error.message });
  }
});

// Send a new message (REST API)
app.post('/api/send-message', async (req, res) => {
  try {
    const { toNumber, userName, messageText } = req.body;
    
    if (!toNumber || !userName || !messageText) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const newMessage = new Message({
      messageId: `msg_${Date.now()}`,
      conversationId: `conv_${toNumber}`,
      fromNumber: process.env.BUSINESS_NUMBER || '918329446654',
      toNumber: toNumber,
      userName: userName,
      messageText: messageText,
      timestamp: Math.floor(Date.now() / 1000),
      status: 'sent',
      isFromUser: false
    });
    
    await newMessage.save();
    console.log('💬 REST message saved to Atlas:', newMessage.messageId);
    
    // Emit via WebSocket too
    io.to(`conv_${toNumber}`).emit('new-message', newMessage);
    
    // Auto-deliver after 2 seconds
    setTimeout(async () => {
      try {
        await Message.updateOne({ _id: newMessage._id }, { status: 'delivered' });
        io.to(`conv_${toNumber}`).emit('message-status-update', {
          messageId: newMessage.messageId,
          status: 'delivered'
        });
        console.log(`✓✓ REST Message ${newMessage.messageId} marked as delivered`);
      } catch (error) {
        console.error('❌ Error updating REST message to delivered:', error);
      }
    }, 2000);
    
    res.json(newMessage);
  } catch (error) {
    console.error('❌ Send message error:', error);
    res.status(500).json({ error: error.message });
  }
});

// NEW: Bulk import messages and conversations from frontend
app.post('/api/bulk-import', async (req, res) => {
  try {
    const { conversations, messages } = req.body;
    
    if (!conversations || !messages) {
      return res.status(400).json({ error: 'Missing conversations or messages data' });
    }
    
    console.log('📦 Starting bulk import...');
    
    // Clear existing data (optional - remove if you want to keep existing data)
    // await Message.deleteMany({});
    
    let totalImported = 0;
    
    // Import messages from all conversations
    for (const [userNumber, userMessages] of Object.entries(messages)) {
      if (Array.isArray(userMessages)) {
        for (const msg of userMessages) {
          try {
            const messageDoc = new Message({
              messageId: msg.messageId || `imported_${Date.now()}_${Math.random()}`,
              conversationId: `conv_${userNumber}`,
              fromNumber: msg.isFromUser ? userNumber : (process.env.BUSINESS_NUMBER || '918329446654'),
              toNumber: msg.isFromUser ? (process.env.BUSINESS_NUMBER || '918329446654') : userNumber,
              userName: conversations.find(c => c._id.userNumber === userNumber)?._id.userName || 'Unknown',
              messageText: msg.messageText,
              timestamp: msg.timestamp,
              status: msg.status || 'sent',
              isFromUser: msg.isFromUser || false
            });
            
            await messageDoc.save();
            totalImported++;
          } catch (error) {
            console.error(`Failed to import message ${msg.messageId}:`, error.message);
          }
        }
      }
    }
    
    console.log(`📦 Bulk import completed: ${totalImported} messages imported`);
    
    res.json({ 
      success: true, 
      imported: totalImported,
      message: `Successfully imported ${totalImported} messages`
    });
    
  } catch (error) {
    console.error('❌ Bulk import error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Process webhook payload
app.post('/api/process-payload', async (req, res) => {
  try {
    const payload = req.body;
    
    if (payload.metaData?.entry?.[0]?.changes?.[0]?.value?.messages) {
      const messages = payload.metaData.entry[0].changes[0].value.messages;
      
      for (const msg of messages) {
        const contact = payload.metaData.entry[0].changes[0].value.contacts?.[0];
        
        const messageData = new Message({
          messageId: msg.id,
          conversationId: `conv_${msg.from}`,
          fromNumber: msg.from,
          toNumber: msg.from === (process.env.BUSINESS_NUMBER || '918329446654') ? contact?.wa_id : (process.env.BUSINESS_NUMBER || '918329446654'),
          userName: contact?.profile?.name || 'Unknown',
          messageText: msg.text?.body || '',
          timestamp: parseInt(msg.timestamp),
          status: 'sent',
          isFromUser: msg.from !== (process.env.BUSINESS_NUMBER || '918329446654')
        });
        
        await messageData.save();
        console.log('📞 Webhook message saved to Atlas:', messageData.messageId);
        
        // If this is a user message, mark business messages as read
        if (msg.from !== (process.env.BUSINESS_NUMBER || '918329446654')) {
          const userNumber = msg.from;
          const updateResult = await Message.updateMany(
            { 
              toNumber: userNumber,
              isFromUser: false,
              status: { $in: ['sent', 'delivered'] }
            },
            { status: 'read' }
          );
          
          console.log(`📞 Webhook: Marked ${updateResult.modifiedCount} messages as read`);
        }
        
        // Emit new message via WebSocket
        const userNumber = msg.from !== (process.env.BUSINESS_NUMBER || '918329446654') ? msg.from : contact?.wa_id;
        io.to(`conv_${userNumber}`).emit('new-message', messageData);
      }
    }
    
    // Handle status updates
    if (payload.metaData?.entry?.[0]?.changes?.[0]?.value?.statuses) {
      const statuses = payload.metaData.entry[0].changes[0].value.statuses;
      
      for (const status of statuses) {
        await Message.updateOne(
          { messageId: status.id },
          { status: status.status }
        );
        
        console.log(`📞 Webhook: Updated message ${status.id} to ${status.status}`);
        
        // Emit status update
        io.emit('message-status-update', {
          messageId: status.id,
          status: status.status
        });
      }
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

// NEW: Clear all data (for development/testing)
app.post('/api/clear-data', async (req, res) => {
  try {
    const result = await Message.deleteMany({});
    console.log(`🗑️ Cleared ${result.deletedCount} messages from database`);
    
    // Emit update to all connected clients
    io.emit('data-cleared');
    
    res.json({ 
      success: true, 
      deletedCount: result.deletedCount,
      message: `Cleared ${result.deletedCount} messages`
    });
  } catch (error) {
    console.error('❌ Clear data error:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server with WhatsApp-like status flow running on port ${PORT}`);
  console.log('🗄️  Database: MongoDB Atlas');
  console.log('📋 Status Flow:');
  console.log('  ✓ Sent (immediately)');
  console.log('  ✓✓ Delivered (after 2 seconds)');
  console.log('  ✓✓ Read/Blue (only when customer replies)');
  console.log('🌐 Environment:', process.env.NODE_ENV || 'development');
  console.log('🔗 Frontend URL:', process.env.FRONTEND_URL || 'http://localhost:3000');
  console.log('📞 Business Number:', process.env.BUSINESS_NUMBER || '918329446654');
});