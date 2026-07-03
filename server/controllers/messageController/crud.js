import mongoose from "mongoose";
import expressAsyncHandler from "express-async-handler";
import imagekit from "../../configs/imagekit.js";
import Message from "../../models/Message.js";
import User from "../../models/User.js";
import { getReceiverSocketId, io } from "../../socket/socket.js";
import { sendPushNotification } from "../../utils/sendNotification.js";

const POPULATE_SENDER = {
    path: "sender",
    select: "full_name profile_picture clerkId username",
};

const POPULATE_STORY = {
    path: "replyToStoryId",
    select: "image mediaUrl content type background_color",
};

const POPULATE_REPLY_TO = {
    path: "replyTo",
    select: "text sender message_type media_url",
    populate: {
        path: "sender",
        select: "full_name username",
    },
};

const POPULATE_REACTIONS = {
    path: "reactions.user",
    select: "full_name username profile_picture",
};

export const FULL_MESSAGE_POPULATE = [
    POPULATE_SENDER,
    POPULATE_STORY,
    POPULATE_REPLY_TO,
    POPULATE_REACTIONS
];

/**
 * @desc Send a new message (Text, Image, Audio, or Shared Post)
 * @route POST /api/message/send
 * @access Private
 */
export const sendMessage = expressAsyncHandler(async (req, res) => {
    const { userId } = req.auth();
    const { receiverId, text, sharedPostId, storyId, replyTo } = req.body;
    const file = req.file;

    // 1. Validate Sender
    const senderUser = await User.findOne({ clerkId: userId });
    if (!senderUser) {
        res.status(404);
        throw new Error("Sender not found");
    }
    const senderMongoId = senderUser._id;

    // 2. Validate Receiver (Support Clerk ID or Mongo ID)
    let receiverUser = null;
    const isMongoId = mongoose.Types.ObjectId.isValid(receiverId);

    if (isMongoId) {
        receiverUser = await User.findById(receiverId);
    } else {
        receiverUser = await User.findOne({ clerkId: receiverId });
    }

    if (!receiverUser) {
        res.status(404);
        throw new Error("Receiver not found");
    }
    const finalReceiverId = receiverUser._id;

    // 3. Privacy & Block Checks
    const isSenderBlocked = senderUser.blockedUsers.includes(finalReceiverId);
    const isReceiverBlocked = receiverUser.blockedUsers.includes(senderMongoId);

    if (isSenderBlocked || isReceiverBlocked) {
        res.status(403);
        throw new Error("You cannot send messages to this user (Blocked).");
    }

    // 4. Connection Requirement Check
    const isConnected = senderUser.connections.some(
        (id) => id.toString() === finalReceiverId.toString()
    );

    if (!isConnected) {
        res.status(403);
        throw new Error("You must be connected to send messages.");
    }

    // 5. Handle Media Uploads (ImageKit)
    let mediaUrl = "";
    let messageType = "text";

    if (file) {
        const timestamp = Date.now();
        try {
            if (file.mimetype.startsWith("image")) {
                messageType = "image";
                const { url } = await imagekit.upload({
                    file: file.buffer,
                    fileName: `msg-${timestamp}`,
                    folder: "/messages/images",
                });
                mediaUrl = url;
            } else if (file.mimetype.startsWith("audio")) {
                messageType = "audio";
                const { url } = await imagekit.upload({
                    file: file.buffer,
                    fileName: `voice-${timestamp}.webm`,
                    folder: "/messages/voices",
                });
                mediaUrl = url;
            }
        } catch (uploadError) {
            console.error("❌ ImageKit Upload Error:", uploadError);
            res.status(500);
            throw new Error(`Media upload failed: ${uploadError.message}`);
        }
    } else if (sharedPostId) {
        messageType = "shared_post";
    } else if (storyId) {
        messageType = "story_reply";
    }

    // 6. Determine Delivery Status
    const receiverSocketId = getReceiverSocketId(finalReceiverId.toString());
    const isDelivered = !!receiverSocketId;

    // 7. Create & Populate Message
    let newMessage = await Message.create({
        sender: senderMongoId,
        receiver: finalReceiverId,
        text: text || "",
        message_type: messageType,
        media_url: mediaUrl,
        sharedPostId: sharedPostId || null,
        replyToStoryId: storyId || null,
        replyTo: replyTo || null,
        delivered: isDelivered,
        read: false,
    });

    newMessage = await newMessage.populate(FULL_MESSAGE_POPULATE);

    // 8. Real-time Emission (Socket.io)
    const socketIoInstance = req.app.get("io") || io;
    if (receiverSocketId && socketIoInstance) {
        socketIoInstance.to(receiverSocketId).emit("receiveMessage", newMessage);

        // Notify sender of delivery
        const senderSocketId = getReceiverSocketId(senderMongoId.toString());
        if (senderSocketId) {
            socketIoInstance.to(senderSocketId).emit("messageDelivered", { toUserId: finalReceiverId });
        }
    }

    // 🔥🔥🔥 9. Push Notification Logic 🔥🔥🔥
    try {
        let notificationBody = text;
        if (messageType === 'image') notificationBody = " Sent a photo 📷";
        if (messageType === 'audio') notificationBody = " Sent a voice message 🎤";
        if (messageType === 'shared_post') notificationBody = " Shared a post 🔗";
        if (messageType === 'story_reply') notificationBody = " Replied to a story 📝";

        await sendPushNotification(
            finalReceiverId,
            senderUser.full_name,
            notificationBody || "New message",
            {
                type: "chat",
                chatId: senderMongoId.toString(),
                senderId: senderMongoId.toString(),
                senderImage: senderUser.profile_picture || senderUser.image || "",
            }
        );
    } catch (error) {
        console.error("⚠️ Failed to send push notification:", error);
    }

    res.status(201).json({ success: true, data: newMessage });
});

/**
 * @desc Fetch Chat History with a specific user
 * @route GET /api/message/:withUserId
 * @access Private
 */
export const getChatMessages = expressAsyncHandler(async (req, res) => {
    const { userId: clerkId } = req.auth();
    const { withUserId } = req.params;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // 1. Resolve Current User
    const user = await User.findOne({ clerkId });
    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }
    const myId = user._id;

    // 2. Resolve Partner ID
    let partnerId = withUserId;
    if (!mongoose.Types.ObjectId.isValid(withUserId)) {
        const partner = await User.findOne({ clerkId: withUserId });
        if (partner) {
            partnerId = partner._id;
        } else {
            return res.status(200).json({ success: true, data: [], hasMore: false });
        }
    }

    // 3. Query Messages
    const messages = await Message.find({
        $and: [
            {
                $or: [
                    { sender: myId, receiver: partnerId },
                    { sender: partnerId, receiver: myId },
                ],
            },
            { deletedBy: { $ne: myId } },
        ],
    })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate(FULL_MESSAGE_POPULATE)
        .lean();

    const sortedMessages = messages.reverse();

    // 4. Mark Messages as Read (Batch Update)
    await Message.updateMany(
        { sender: partnerId, receiver: myId, read: false },
        { $set: { read: true } }
    );

    const partnerSocketId = getReceiverSocketId(partnerId.toString());
    const socketIoInstance = req.app.get("io") || io;
    if (partnerSocketId && socketIoInstance) {
        socketIoInstance.to(partnerSocketId).emit("messagesSeen", { byUserId: myId });
    }

    res.status(200).json({
        success: true,
        data: sortedMessages,
        hasMore: messages.length === limit
    });
});

/**
 * @desc Get List of Recent Conversations
 * @route GET /api/message/recent
 * @access Private
 */
export const getRecentMessages = expressAsyncHandler(async (req, res) => {
    const { userId: clerkId } = req.auth();

    const user = await User.findOne({ clerkId });
    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }
    const myId = user._id;

    const conversations = await Message.aggregate([
        {
            $match: {
                $or: [{ sender: myId }, { receiver: myId }],
                deletedBy: { $ne: myId },
            },
        },
        { $sort: { createdAt: -1 } },
        {
            $group: {
                _id: {
                    $cond: {
                        if: { $eq: ["$sender", myId] },
                        then: "$receiver",
                        else: "$sender",
                    },
                },
                lastMessage: { $first: "$$ROOT" },
                unreadCount: {
                    $sum: {
                        $cond: [
                            {
                                $and: [
                                    { $eq: ["$receiver", myId] },
                                    { $eq: ["$read", false] },
                                ],
                            },
                            1,
                            0,
                        ],
                    },
                },
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "_id",
                foreignField: "_id",
                as: "partnerDetails",
            },
        },
        {
            $project: {
                lastMessage: 1,
                unreadCount: 1,
                partnerRaw: { $arrayElemAt: ["$partnerDetails", 0] },
            },
        },
        {
            $project: {
                lastMessage: 1,
                unreadCount: 1,
                partner: {
                    _id: "$partnerRaw._id",
                    full_name: "$partnerRaw.full_name",
                    username: "$partnerRaw.username",
                    profile_picture: "$partnerRaw.profile_picture",
                },
                isBlockedByMe: {
                    $in: ["$partnerRaw._id", user.blockedUsers || []],
                },
                isBlockedByPartner: {
                    $in: [myId, { $ifNull: ["$partnerRaw.blockedUsers", []] }],
                },
            },
        },
        { $sort: { "lastMessage.createdAt": -1 } },
    ]);

    res.status(200).json({ success: true, conversations });
});

/**
 * @desc Clear Conversation (Soft Delete)
 * @route DELETE /api/message/conversation/:targetId
 * @access Private
 */
export const deleteConversation = expressAsyncHandler(async (req, res) => {
    const { userId } = req.auth();
    const { targetId } = req.params;

    const currentUser = await User.findOne({ clerkId: userId });
    const myId = currentUser._id;

    await Message.updateMany(
        {
            $or: [
                { sender: myId, receiver: targetId },
                { sender: targetId, receiver: myId },
            ],
        },
        {
            $addToSet: { deletedBy: myId },
        }
    );

    res.status(200).json({ success: true, message: "Chat cleared for you only" });
});

/**
 * @desc    Delete a specific message (Soft Delete)
 * @route   DELETE /api/message/:id
 * @access  Private
 */
export const deleteMessage = expressAsyncHandler(async (req, res) => {
    const { id: messageId } = req.params;
    const { userId: clerkId } = req.auth();

    try {
        const user = await User.findOne({ clerkId });
        if (!user) {
            res.status(404);
            throw new Error("User not found");
        }

        const message = await Message.findById(messageId);
        if (!message) {
            res.status(404);
            throw new Error("Message not found");
        }

        if (message.sender.toString() !== user._id.toString()) {
            res.status(401);
            throw new Error("Not authorized to delete this message");
        }

        message.text = "";
        message.media_url = null;
        message.isDeleted = true;

        await message.save();

        try {
            if (message.receiver) {
                const socketIoInstance = req.app.get("io") || io;
                if (typeof getReceiverSocketId === 'function' && socketIoInstance) {
                    const receiverSocketId = getReceiverSocketId(message.receiver.toString());
                    if (receiverSocketId) {
                        socketIoInstance.to(receiverSocketId).emit("messageDeleted", { messageId });
                    }
                }
            }
        } catch (socketError) {
            console.error("⚠️ Socket Notification Failed:", socketError.message);
        }

        res.status(200).json({ success: true, message: "Message deleted successfully" });

    } catch (error) {
        console.error("🔥 Delete Controller Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * @desc    Edit a specific message
 * @route   PUT /api/message/:id
 * @access  Private
 */
export const editMessage = expressAsyncHandler(async (req, res) => {
    const { id: messageId } = req.params;
    const { text } = req.body;
    const { userId: clerkId } = req.auth();

    if (!text || !text.trim()) {
        res.status(400);
        throw new Error("Text content is required for editing");
    }

    const user = await User.findOne({ clerkId });
    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }

    const message = await Message.findById(messageId);
    if (!message) {
        res.status(404);
        throw new Error("Message not found");
    }

    if (message.sender.toString() !== user._id.toString()) {
        res.status(401);
        throw new Error("Not authorized to edit this message");
    }

    if (message.isDeleted) {
        res.status(400);
        throw new Error("Cannot edit a deleted message");
    }

    message.text = text;
    message.isEdited = true;
    await message.save();

    const receiverSocketId = getReceiverSocketId(message.receiver.toString());
    const socketIoInstance = req.app.get("io") || io;
    if (receiverSocketId && socketIoInstance) {
        socketIoInstance.to(receiverSocketId).emit("messageUpdated", {
            messageId,
            newText: text,
            isEdited: true
        });
    }

    res.status(200).json({ success: true, data: message });
});
