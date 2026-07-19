import mongoose, { Schema } from 'mongoose';

export interface IAttachment {
  secure_url: string;
  public_id: string;
  resource_type: string;
  bytes: number;
}

export interface IMessage {
  conversationId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  body?: string;
  attachments: IAttachment[];
  forwardedFrom?: {
    messageId: mongoose.Types.ObjectId;
    conversationId: mongoose.Types.ObjectId;
    senderId: mongoose.Types.ObjectId;
  };
  clientTempId?: string; // used for optimistic UI reconciliation
  readBy: { userId: mongoose.Types.ObjectId; readAt: Date }[];
  createdAt: Date; // Server timestamp is authoritative
  updatedAt: Date;
}

const AttachmentSchema = new Schema<IAttachment>({
  secure_url: { type: String, required: true },
  public_id: { type: String, required: true },
  resource_type: { type: String, required: true },
  bytes: { type: Number, required: true },
}, { _id: false });

const MessageSchema = new Schema<IMessage>(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    body: { type: String, trim: true },
    attachments: { type: [AttachmentSchema], default: [] },
    forwardedFrom: {
      messageId: { type: Schema.Types.ObjectId, ref: 'Message' },
      conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation' },
      senderId: { type: Schema.Types.ObjectId, ref: 'User' },
    },
    clientTempId: { type: String },
    readBy: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        readAt: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Compound index for querying a conversation's messages ordered by creation time
MessageSchema.index({ conversationId: 1, createdAt: -1 });

export const Message = (mongoose.models.Message as mongoose.Model<IMessage>) || mongoose.model<IMessage>('Message', MessageSchema);
