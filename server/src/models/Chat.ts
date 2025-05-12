import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ["user", "assistant"],
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const ChatSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  messages: [MessageSchema],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  userId: {
    type: String,
    required: true,
    index: true,
  },
});

ChatSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

export const Chat = mongoose.models.Chat || mongoose.model("Chat", ChatSchema);
export const Message =
  mongoose.models.Message || mongoose.model("Message", MessageSchema);

export interface IMessage {
  _id?: string;
  content: string;
  role: "user" | "assistant";
  timestamp?: Date;
}

export interface IChat {
  _id?: string;
  title: string;
  messages: IMessage[];
  createdAt?: Date;
  updatedAt?: Date;
  userId: string;
}

export default { Chat, Message };
