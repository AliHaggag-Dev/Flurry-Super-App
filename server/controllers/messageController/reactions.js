import expressAsyncHandler from "express-async-handler";
import Message from "../../models/Message.js";
import User from "../../models/User.js";
import { getReceiverSocketId, io } from "../../socket/socket.js";

/**
 * @desc Toggle Message Reaction (Add/Remove/Update)
 * @route POST /api/message/react
 * @access Private
 */
export const reactToMessage = expressAsyncHandler(async (req, res) => {
    const { userId } = req.auth();
    const { messageId, emoji } = req.body;

    const currentUser = await User.findOne({ clerkId: userId });
    if (!currentUser) {
        res.status(404);
        throw new Error("User not found");
    }

    // Find Message
    let message = await Message.findById(messageId);
    let isGroupMsg = false;

    if (!message) {
        res.status(404);
        throw new Error("Message not found");
    }

    // Reaction Logic
    const existingReactionIndex = message.reactions.findIndex(
        (r) => r.user.toString() === currentUser._id.toString()
    );

    if (existingReactionIndex > -1) {
        if (message.reactions[existingReactionIndex].emoji === emoji) {
            message.reactions.splice(existingReactionIndex, 1);
        } else {
            message.reactions[existingReactionIndex].emoji = emoji;
        }
    } else {
        message.reactions.push({ user: currentUser._id, emoji });
    }

    await message.save();

    const populatedMessage = await message.populate({
        path: "reactions.user",
        select: "full_name username profile_picture",
    });

    const socketPayload = {
        messageId,
        reactions: populatedMessage.reactions,
    };

    const ioInstance = req.app.get("io") || io;

    if (isGroupMsg) {
        ioInstance.to(message.group.toString()).emit("messageReaction", socketPayload);
    } else {
        const receiverSocket = getReceiverSocketId(message.receiver.toString());
        const senderSocket = getReceiverSocketId(message.sender.toString());

        if (receiverSocket) ioInstance.to(receiverSocket).emit("messageReaction", socketPayload);
        if (senderSocket) ioInstance.to(senderSocket).emit("messageReaction", socketPayload);
    }

    res.status(200).json({ success: true, reactions: message.reactions });
});
