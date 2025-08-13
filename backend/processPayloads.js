// require('dotenv').config();
// const mongoose = require('mongoose');
// const fs = require('fs');
// const path = require('path');

// // Connect to MongoDB
// mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/whatsapp', {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
// });

// // Message Schema (same as server.js)
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

// async function processPayloads() {
//   try {
//     // Clear existing data
//     await Message.deleteMany({});
//     console.log('Cleared existing messages');

//     // Read all JSON files from payloads folder
//     const payloadFolder = './payloads'; // Put your JSON files here
//     const files = fs.readdirSync(payloadFolder);
    
//     for (const file of files) {
//       if (file.endsWith('.json')) {
//         console.log(`Processing ${file}`);
//         const filePath = path.join(payloadFolder, file);
//         const payload = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
//         // Process messages
//         if (payload.metaData?.entry?.[0]?.changes?.[0]?.value?.messages) {
//           const messages = payload.metaData.entry[0].changes[0].value.messages;
//           const contacts = payload.metaData.entry[0].changes[0].value.contacts;
          
//           for (const msg of messages) {
//             const contact = contacts?.[0];
//             const isFromBusiness = msg.from === '918329446654';
            
//             const messageData = {
//               messageId: msg.id,
//               conversationId: `conv_${isFromBusiness ? contact?.wa_id : msg.from}`,
//               fromNumber: msg.from,
//               toNumber: isFromBusiness ? contact?.wa_id : '918329446654',
//               userName: contact?.profile?.name || 'Unknown',
//               messageText: msg.text?.body || '',
//               timestamp: parseInt(msg.timestamp),
//               status: 'sent',
//               isFromUser: !isFromBusiness
//             };
            
//             await Message.create(messageData);
//             console.log(`Added message: ${msg.text?.body}`);
//           }
//         }
        
//         // Process status updates
//         if (payload.metaData?.entry?.[0]?.changes?.[0]?.value?.statuses) {
//           const statuses = payload.metaData.entry[0].changes[0].value.statuses;
          
//           for (const status of statuses) {
//             await Message.updateOne(
//               { messageId: status.id },
//               { status: status.status }
//             );
//             console.log(`Updated status for message ${status.id}: ${status.status}`);
//           }
//         }
//       }
//     }
    
//     console.log('All payloads processed successfully!');
//     process.exit(0);
//   } catch (error) {
//     console.error('Error processing payloads:', error);
//     process.exit(1);
//   }
// }

// processPayloads();






require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/whatsapp', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Message Schema (same as server.js)
const messageSchema = new mongoose.Schema({
  messageId: String,
  conversationId: String,
  fromNumber: String,
  toNumber: String,
  userName: String,
  messageText: String,
  timestamp: Number,
  status: { type: String, default: 'sent' },
  isFromUser: Boolean,
  createdAt: { type: Date, default: Date.now }
});

const Message = mongoose.model('Message', messageSchema);

async function processPayloads() {
  try {
    // Clear existing data
    await Message.deleteMany({});
    console.log('Cleared existing messages');

    // Read all JSON files from payloads folder
    const payloadFolder = './payloads'; // Put your JSON files here
    const files = fs.readdirSync(payloadFolder);
    
    // Keep track of processed message IDs to avoid duplicates
    const processedMessageIds = new Set();
    let totalProcessed = 0;
    let duplicatesSkipped = 0;
    let errorsCount = 0;
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        console.log(`Processing ${file}`);
        const filePath = path.join(payloadFolder, file);
        
        try {
          const payload = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          
          // Process messages
          if (payload.metaData?.entry?.[0]?.changes?.[0]?.value?.messages) {
            const messages = payload.metaData.entry[0].changes[0].value.messages;
            const contacts = payload.metaData.entry[0].changes[0].value.contacts;
            
            for (const msg of messages) {
              // Skip if we've already processed this message ID
              if (processedMessageIds.has(msg.id)) {
                console.log(`⚠️ Skipping duplicate message: ${msg.id}`);
                duplicatesSkipped++;
                continue;
              }
              
              const contact = contacts?.[0];
              const isFromBusiness = msg.from === '918329446654';
              
              const messageData = {
                messageId: msg.id,
                conversationId: `conv_${isFromBusiness ? contact?.wa_id : msg.from}`,
                fromNumber: msg.from,
                toNumber: isFromBusiness ? contact?.wa_id : '918329446654',
                userName: contact?.profile?.name || 'Unknown',
                messageText: msg.text?.body || '',
                timestamp: parseInt(msg.timestamp),
                status: 'sent',
                isFromUser: !isFromBusiness
              };
              
              try {
                await Message.create(messageData);
                processedMessageIds.add(msg.id);
                totalProcessed++;
                console.log(`✅ Added message: ${msg.text?.body?.substring(0, 50)}${msg.text?.body?.length > 50 ? '...' : ''}`);
              } catch (error) {
                if (error.code === 11000) {
                  console.log(`⚠️ Duplicate key skipped: ${msg.id}`);
                  duplicatesSkipped++;
                } else {
                  console.error(`❌ Error creating message ${msg.id}:`, error.message);
                  errorsCount++;
                }
              }
            }
          }
          
          // Process status updates
          if (payload.metaData?.entry?.[0]?.changes?.[0]?.value?.statuses) {
            const statuses = payload.metaData.entry[0].changes[0].value.statuses;
            
            for (const status of statuses) {
              try {
                const updateResult = await Message.updateOne(
                  { messageId: status.id },
                  { status: status.status }
                );
                
                if (updateResult.matchedCount > 0) {
                  console.log(`✅ Updated status for message ${status.id}: ${status.status}`);
                } else {
                  console.log(`⚠️ Message not found for status update: ${status.id}`);
                }
              } catch (error) {
                console.error(`❌ Error updating status for ${status.id}:`, error.message);
                errorsCount++;
              }
            }
          }
          
        } catch (parseError) {
          console.error(`❌ Error parsing JSON file ${file}:`, parseError.message);
          errorsCount++;
        }
      }
    }
    
    console.log('\n📊 Processing Summary:');
    console.log(`✅ Messages processed: ${totalProcessed}`);
    console.log(`⚠️ Duplicates skipped: ${duplicatesSkipped}`);
    console.log(`❌ Errors encountered: ${errorsCount}`);
    console.log('🎉 All payloads processed!');
    
    // Show some statistics
    const totalMessages = await Message.countDocuments();
    const conversations = await Message.distinct('conversationId');
    console.log(`\n📈 Database Stats:`);
    console.log(`Total messages in database: ${totalMessages}`);
    console.log(`Total conversations: ${conversations.length}`);
    
    process.exit(0);
  } catch (error) {
    console.error('💥 Fatal error processing payloads:', error);
    process.exit(1);
  }
}

// Handle process termination gracefully
process.on('SIGINT', async () => {
  console.log('\n🛑 Process interrupted. Closing database connection...');
  await mongoose.connection.close();
  process.exit(0);
});

processPayloads();