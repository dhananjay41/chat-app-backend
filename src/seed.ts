/**
 * Seed script — creates 4 demo users + 3 conversations with sample messages.
 *
 * DEMO AUTH NOTE: This is an intentional deviation from production auth.
 * Users have no passwords — they are selected from a list on login.
 * The JWT handshake, per-event re-authorization, and rate limiting are unchanged.
 *
 * Run: npx tsx src/seed.ts
 * WARNING: Drops all existing users and conversations before inserting.
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import { User } from './models/User';
import { Conversation } from './models/Conversation';
import { Message } from './models/Message';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI is not set in .env');
  process.exit(1);
}

const AVATAR_COLORS: Record<string, string> = {
  alice: '6366f1',   // indigo
  bob: '10b981',     // emerald
  charlie: 'f59e0b', // amber
  diana: 'ec4899',   // pink
};

const seedUsers = [
  { username: 'alice', displayName: 'Alice Chen', avatarUrl: '' },
  { username: 'bob', displayName: 'Bob Marquez', avatarUrl: '' },
  { username: 'charlie', displayName: 'Charlie Park', avatarUrl: '' },
  { username: 'diana', displayName: 'Diana Osei', avatarUrl: '' },
];

async function run() {
  await mongoose.connect(MONGODB_URI!);
  console.log('✓ Connected to MongoDB');

  // --- Wipe existing data (dev-only cluster confirmed) ---
  await Message.deleteMany({});
  await Conversation.deleteMany({});
  await User.deleteMany({});
  
  // Drop the old email index if it exists, since we removed email from the schema
  await mongoose.connection.collection('users').dropIndex('email_1').catch(() => {});
  
  console.log('✓ Cleared existing users, conversations, messages and removed old index');

  // --- Create users ---
  const createdUsers = await User.insertMany(
    seedUsers.map((u) => ({
      ...u,
      avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(u.displayName)}&background=${AVATAR_COLORS[u.username]}&color=fff&bold=true&size=128`,
    }))
  );

  const [alice, bob, charlie, diana] = createdUsers;

  console.log('\n✓ Created users:');
  createdUsers.forEach((u) => {
    console.log(`  ${u.displayName} (${u.username}) — id: ${u._id}`);
  });

  // --- Helper to create a DM conversation ---
  const createConv = async (
    userA: typeof alice,
    userB: typeof bob,
    messages: { sender: typeof alice; body: string; minutesAgo: number }[]
  ) => {
    const conv = await Conversation.create({
      members: [userA._id, userB._id],
    });

    const savedMessages = [];
    for (const m of messages) {
      const created = await Message.create({
        conversationId: conv._id,
        senderId: m.sender._id,
        body: m.body,
        attachments: [],
        createdAt: new Date(Date.now() - m.minutesAgo * 60 * 1000),
      });
      savedMessages.push(created);
    }

    if (savedMessages.length > 0) {
      conv.lastMessage = savedMessages[savedMessages.length - 1]._id as mongoose.Types.ObjectId;
      await conv.save();
    }

    return conv;
  };

  // --- Alice ↔ Bob (4 messages) ---
  await createConv(alice, bob, [
    { sender: alice, body: 'Hey Bob! Did you see the new design specs?', minutesAgo: 120 },
    { sender: bob, body: 'Yeah! The new color palette looks great. Can you share the Figma link?', minutesAgo: 110 },
    { sender: alice, body: "Sure, I'll forward the link in a sec. Also — want to test the media upload together?", minutesAgo: 100 },
    { sender: bob, body: "Absolutely! Let's do it. Drop me the file here.", minutesAgo: 90 },
  ]);
  console.log('\n✓ Created conversation: Alice ↔ Bob');

  // --- Alice ↔ Charlie (2 messages) ---
  await createConv(alice, charlie, [
    { sender: charlie, body: 'Alice, I forwarded that document to you. Did you receive it?', minutesAgo: 60 },
    { sender: alice, body: 'Yes got it, thanks! Forwarding to Diana now.', minutesAgo: 55 },
  ]);
  console.log('✓ Created conversation: Alice ↔ Charlie');

  // --- Bob ↔ Diana (1 message) ---
  await createConv(bob, diana, [
    { sender: diana, body: 'Bob, quick question about the socket auth setup — can we hop on a call?', minutesAgo: 30 },
  ]);
  console.log('✓ Created conversation: Bob ↔ Diana');

  console.log('\n🌱 Seed complete! Start the server and open two browser tabs to test.\n');
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error('Seed failed:', err);
  mongoose.disconnect().then(() => process.exit(1));
});
