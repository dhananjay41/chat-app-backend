import mongoose, { Schema } from 'mongoose';

export interface IConversation {
  members: mongoose.Types.ObjectId[];
  name?: string;
  lastMessage?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema = new Schema<IConversation>(
  {
    members: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
    name: { type: String, trim: true },
    lastMessage: { type: Schema.Types.ObjectId, ref: 'Message' },
  },
  {
    timestamps: true,
  }
);

export const Conversation =
  (mongoose.models.Conversation as mongoose.Model<IConversation>) || mongoose.model<IConversation>('Conversation', ConversationSchema);
