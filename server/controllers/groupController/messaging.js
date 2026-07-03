import expressAsyncHandler from "express-async-handler";
import Group from "../../models/Group.js";
import GroupMessage from "../../models/GroupMessage.js";
import User from "../../models/User.js";
import imagekit from "../../configs/imagekit.js";
import { connections } from "../messageController/sse.js";
import { io } from "../../socket/socket.js";
import { sendGroupPushNotification } from "../../utils/sendNotification.js";

const POPULATE_MESSAGE_SENDER = {
    path: "sender",
    select: "full_name profile_picture username clerkId"
};

const POPULATE_REPLY_TO = {
    path: "replyTo",
    select: "text sender message_type media_url",
    populate: {
        path: "sender",
        select: "full_name username"
    }
};

/**
 * @desc Send Group Message
 * @route POST /api/group/send
 * @access Private
 */
export const sendGroupMessage = expressAsyncHandler(async (req, res) => {
    const { userId } = req.auth();
    const { groupId, text, replyTo } = req.body;
    const file = req.file;

    // 1. Validation & Setup
    const currentUser = await User.findOne({ clerkId: userId });
    const group = await Group.findById(groupId);

    if (!group) { res.status(404); throw new Error("Group not found"); }

    // --- Chat Lock Check ---
    if (group.isChatLocked && group.owner.toString() !== currentUser._id.toString()) {
        res.status(403);
        throw new Error("Chat is locked by admin");
    }

    const isMember = group.members.some(
        m => m.user.toString() === currentUser._id.toString() && m.status === "accepted"
    );

    if (!isMember) { res.status(403); throw new Error("Not a member"); }

    // 2. Media Handling
    let mediaUrl = "";
    let messageType = "text";

    if (file) {
        const timestamp = Date.now();
        if (file.mimetype.startsWith("image/")) {
            messageType = "image";
            const upload = await imagekit.upload({
                file: file.buffer,
                fileName: `group-img-${timestamp}-${file.originalname}`,
                folder: "/group-messages/images"
            });
            mediaUrl = imagekit.url({
                path: upload.filePath,
                transformation: [{ quality: "auto" }, { width: "800" }]
            });
        } else if (file.mimetype.startsWith("audio/")) {
            messageType = "audio";
            const upload = await imagekit.upload({
                file: file.buffer,
                fileName: `group-voice-${timestamp}.webm`,
                folder: "/group-messages/voices"
            });
            mediaUrl = upload.url;
        }
    }

    // 3. Create Message
    let newMessage = await GroupMessage.create({
        group: groupId,
        sender: currentUser._id,
        text: text || "",
        message_type: messageType,
        media_url: mediaUrl,
        replyTo: replyTo || null,
        readBy: [currentUser._id]
    });

    // 4. Populate
    newMessage = await newMessage.populate([
        { path: "sender", select: "full_name username profile_picture" },
        { path: "replyTo", select: "text media_url message_type sender" }
    ]);

    // 5. SSE & Socket Emission
    // A. SSE
    const payload = JSON.stringify(newMessage);
    group.members.forEach(member => {
        const memberId = member.user.toString();
        if (memberId !== currentUser._id.toString() && connections && connections[memberId]) {
            connections[memberId].write(`data: ${payload}\n\n`);
        }
    });

    // B. Socket.io
    const socketIoInstance = req.app.get("io") || io;
    if (socketIoInstance) {
        socketIoInstance.to(groupId).emit("receiveGroupMessage", newMessage);
    }

    // 🔥🔥🔥 6. Group Push Notification Logic 🔥🔥🔥
    try {
        const recipientIds = group.members
            .filter(m => m.user.toString() !== currentUser._id.toString() && m.status === "accepted")
            .map(m => m.user);

        if (recipientIds.length > 0) {
            let notificationBody = text;
            if (messageType === 'image') notificationBody = `${currentUser.full_name} sent a photo 📷`;
            else if (messageType === 'audio') notificationBody = `${currentUser.full_name} sent a voice message 🎤`;
            else notificationBody = `${currentUser.full_name}: ${text}`;

            await sendGroupPushNotification(
                recipientIds,
                group.name,
                notificationBody,
                {
                    type: "group_chat",
                    groupId: groupId,
                    groupName: group.name,
                    groupImage: group.group_image || group.image || "",
                    senderImage: currentUser.profile_picture || currentUser.image || ""
                }
            );
        }
    } catch (error) {
        console.error("⚠️ Failed to send group notification:", error);
    }

    res.status(201).json({ success: true, data: newMessage });
});

/**
 * @desc Get Group Chat History
 * @route GET /api/group/messages/:groupId
 * @access Private
 */
export const getGroupMessages = expressAsyncHandler(async (req, res) => {
    const { userId } = req.auth();
    const { groupId } = req.params;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const currentUser = await User.findOne({ clerkId: userId });
    const group = await Group.findById(groupId);

    if (!group) { res.status(404); throw new Error("Group not found"); }

    const isMember = group.members.some(
        m => m.user.toString() === currentUser._id.toString() && m.status === "accepted"
    );

    if (!isMember) { res.status(403); throw new Error("Not a member"); }

    const messages = await GroupMessage.find({ group: groupId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate(POPULATE_MESSAGE_SENDER)
        .populate(POPULATE_REPLY_TO)
        .populate("reactions.user", "full_name username profile_picture")
        .lean();

    const sortedMessages = messages.reverse();

    res.status(200).json({
        success: true,
        count: sortedMessages.length,
        messages: sortedMessages,
        hasMore: messages.length === limit
    });
});

/**
 * @desc React to Message
 * @route PUT /api/group/react
 * @access Private
 */
export const reactToGroupMessage = expressAsyncHandler(async (req, res) => {
    const { userId } = req.auth();
    const { messageId, emoji } = req.body;

    const currentUser = await User.findOne({ clerkId: userId });
    const message = await GroupMessage.findById(messageId);

    if (!message) { res.status(404); throw new Error("Message not found"); }

    const existingIndex = message.reactions.findIndex(
        r => r.user.toString() === currentUser._id.toString()
    );

    if (existingIndex > -1) {
        if (message.reactions[existingIndex].emoji === emoji) {
            message.reactions.splice(existingIndex, 1);
        } else {
            message.reactions[existingIndex].emoji = emoji;
        }
    } else {
        message.reactions.push({ user: currentUser._id, emoji });
    }

    await message.save();

    const populatedMessage = await message.populate({
        path: "reactions.user",
        select: "full_name username profile_picture"
    });

    const socketIoInstance = req.app.get("io") || io;
    if (socketIoInstance) {
        socketIoInstance.to(message.group.toString()).emit("groupMessageReaction", {
            messageId,
            reactions: populatedMessage.reactions
        });
    }

    res.status(200).json({ success: true, reactions: populatedMessage.reactions });
});

/**
 * @desc Mark All as Read
 * @route PUT /api/group/mark-read/:groupId
 * @access Private
 */
export const markGroupMessagesRead = expressAsyncHandler(async (req, res) => {
    const { userId } = req.auth();
    const { groupId } = req.params;

    const currentUser = await User.findOne({ clerkId: userId });

    const result = await GroupMessage.updateMany(
        {
            group: groupId,
            sender: { $ne: currentUser._id },
            readBy: { $ne: currentUser._id }
        },
        { $addToSet: { readBy: currentUser._id } }
    );

    if (result.modifiedCount > 0) {
        const socketIoInstance = req.app.get("io") || io;
        if (socketIoInstance) {
            socketIoInstance.to(groupId).emit("groupMessagesRead", {
                groupId,
                userId: currentUser._id
            });
        }
    }

    res.status(200).json({ success: true });
});

/**
 * @desc    Delete a group message (Soft Delete)
 * @route   DELETE /api/group/message/:id
 * @access  Private
 */
export const deleteGroupMessage = expressAsyncHandler(async (req, res) => {
    const { id: messageId } = req.params;
    const { userId: clerkId } = req.auth();

    const user = await User.findOne({ clerkId });
    if (!user) { res.status(404); throw new Error("User not found"); }

    const message = await GroupMessage.findById(messageId);
    if (!message) { res.status(404); throw new Error("Message not found"); }

    const group = await Group.findById(message.group);
    if (!group) { res.status(404); throw new Error("Group not found"); }

    const isSender = message.sender.toString() === user._id.toString();
    const isAdmin = group.owner.toString() === user._id.toString();

    if (!isSender && !isAdmin) {
        res.status(401);
        throw new Error("Not authorized to delete this message");
    }

    message.text = "";
    message.media_url = null;
    message.isDeleted = true;
    await message.save();

    try {
        const socketIoInstance = req.app.get("io") || io;
        if (socketIoInstance) {
            socketIoInstance.to(message.group.toString()).emit("groupMessageDeleted", {
                messageId,
                groupId: message.group.toString()
            });
        }
    } catch (socketError) {
        console.error("Socket emit failed:", socketError);
    }

    res.status(200).json({ success: true, message: "Group message deleted" });
});

/**
 * @desc    Edit a group message
 * @route   PUT /api/group/message/:id
 * @access  Private
 */
export const editGroupMessage = expressAsyncHandler(async (req, res) => {
    const { id: messageId } = req.params;
    const { text } = req.body;
    const { userId: clerkId } = req.auth();

    if (!text || !text.trim()) { res.status(400); throw new Error("Text required"); }

    const user = await User.findOne({ clerkId });
    if (!user) { res.status(404); throw new Error("User not found"); }

    const message = await GroupMessage.findById(messageId);
    if (!message) { res.status(404); throw new Error("Group Message not found"); }

    if (message.sender.toString() !== user._id.toString()) {
        res.status(401);
        throw new Error("Not authorized");
    }

    if (message.isDeleted) { res.status(400); throw new Error("Cannot edit deleted message"); }

    message.text = text;
    message.isEdited = true;
    await message.save();

    try {
        const socketIoInstance = req.app.get("io") || io;
        if (socketIoInstance) {
            socketIoInstance.to(message.group.toString()).emit("groupMessageUpdated", {
                messageId,
                groupId: message.group.toString(),
                newText: text,
                isEdited: true
            });
        }
    } catch (socketError) { console.error("Socket emit failed:", socketError); }

    res.status(200).json({ success: true, data: message });
});
