import jwt from "jsonwebtoken";
import Conversation from "./models/Conversation.js";
import Message from "./models/Message.js";

function getTokenFromHandshake(socket) {
  // client will send: io(URL, { auth: { token } })
  return socket.handshake?.auth?.token || null;
}

export function setupSocket(io) {
  io.use((socket, next) => {
    try {
      const token = getTokenFromHandshake(socket);
      if (!token) return next(new Error("No token"));

      const payload = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = payload.id || payload._id || payload.userId; // depends on your JWT payload
      if (!socket.userId) return next(new Error("Invalid token payload"));

      next();
    } catch (e) {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    // join conversation room
    socket.on("joinConversation", async ({ conversationId }) => {
      const convo = await Conversation.findById(conversationId);
      if (!convo) return;

      const isMember = convo.participants.map(String).includes(String(socket.userId));
      if (!isMember) return;

      socket.join(String(conversationId));
    });

    // send message
    socket.on("sendMessage", async ({ conversationId, text }) => {
      if (!text || !text.trim()) return;

      const convo = await Conversation.findById(conversationId);
      if (!convo) return;

      const isMember = convo.participants.map(String).includes(String(socket.userId));
      if (!isMember) return;

      const msg = await Message.create({
        conversation: conversationId,
        sender: socket.userId,
        text: text.trim(),
      });

      convo.lastMessageAt = new Date();
      await convo.save();

      io.to(String(conversationId)).emit("newMessage", {
        id: msg._id,
        conversationId,
        senderId: socket.userId,
        text: msg.text,
        createdAt: msg.createdAt,
      });
    });
  });
}
