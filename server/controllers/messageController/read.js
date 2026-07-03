import mongoose from "mongoose";
import expressAsyncHandler from "express-async-handler";
import Message from "../../models/Message.js";
import User from "../../models/User.js";
import { getReceiverSocketId, io } from "../../socket/socket.js";

/**
 * @desc Mark all messages from a sender as read
 * @route PUT /api/message/read/:senderId
 * @access Private
 */
export const markMessagesAsRead = expressAsyncHandler(async (req, res) => {
    const { senderId } = req.params;
    const { userId: clerkId } = req.auth();

    const user = await User.findOne({ clerkId });
    const myId = user._id;

    // Resolve Sender ID
    let finalSenderId = senderId;
    if (!mongoose.Types.ObjectId.isValid(senderId)) {
        const senderUser = await User.findOne({ clerkId: senderId });
        if (senderUser) finalSenderId = senderUser._id;
    }

    // Update DB
    const result = await Message.updateMany(
        { sender: finalSenderId, receiver: myId, read: false },
        { $set: { read: true } }
    );

    // Real-time Notification
    if (result.modifiedCount > 0) {
        const senderSocketId = getReceiverSocketId(finalSenderId.toString());
        const socketIoInstance = req.app.get("io") || io;
        if (senderSocketId && socketIoInstance) {
            socketIoInstance.to(senderSocketId).emit("messagesSeen", { byUserId: myId });
        }
    }

    res.status(200).json({ success: true, message: "Messages marked as read" });
});
