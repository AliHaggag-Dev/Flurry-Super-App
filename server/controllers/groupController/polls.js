import expressAsyncHandler from "express-async-handler";
import Group from "../../models/Group.js";
import GroupMessage from "../../models/GroupMessage.js";
import User from "../../models/User.js";
import { io } from "../../socket/socket.js";

/**
 * @desc    Create a new Poll message
 * @route   POST /api/group/poll
 * @access  Private
 */
export const createPoll = expressAsyncHandler(async (req, res) => {
    const { groupId, question, options, allowMultipleAnswers } = req.body;
    const { userId: clerkId } = req.auth();

    // 1. Validation
    if (!groupId || !question || !options || !Array.isArray(options) || options.length < 2) {
        res.status(400);
        throw new Error("Invalid poll data. Must have question and at least 2 options.");
    }

    const user = await User.findOne({ clerkId });
    if (!user) { res.status(404); throw new Error("User not found"); }

    const group = await Group.findById(groupId);
    if (!group) { res.status(404); throw new Error("Group not found"); }

    // 2. Check Membership
    const isMember = group.members.some(m => m.user.toString() === user._id.toString() && m.status === "accepted");
    if (!isMember) { res.status(403); throw new Error("You are not a member of this group"); }

    // 3. Check Chat Lock
    if (group.isChatLocked && group.owner.toString() !== user._id.toString()) {
        res.status(403); throw new Error("Chat is locked");
    }

    // 4. Create Poll Message
    const formattedOptions = options.map(opt => ({ text: opt, votes: [] }));

    const newPoll = await GroupMessage.create({
        group: groupId,
        sender: user._id,
        message_type: "poll",
        poll: {
            question,
            options: formattedOptions,
            allowMultipleAnswers: allowMultipleAnswers || false
        },
        readBy: [user._id]
    });

    await newPoll.populate("sender", "full_name username profile_picture image");

    // 5. Socket Emit
    try {
        const socketIoInstance = req.app.get("io") || io;
        if (socketIoInstance) {
            socketIoInstance.to(groupId).emit("receiveGroupMessage", newPoll);
        }
    } catch (error) { console.error("Socket emit failed:", error); }

    res.status(201).json({ success: true, message: newPoll });
});

/**
 * @desc    Vote on a Poll
 * @route   PUT /api/group/poll/vote
 * @access  Private
 */
export const votePoll = expressAsyncHandler(async (req, res) => {
    const { messageId, optionIndex } = req.body;
    const { userId: clerkId } = req.auth();

    const user = await User.findOne({ clerkId });
    if (!user) { res.status(404); throw new Error("User not found"); }

    const message = await GroupMessage.findById(messageId);
    if (!message || message.message_type !== "poll") {
        res.status(404); throw new Error("Poll not found");
    }

    // Validate Option
    if (optionIndex < 0 || optionIndex >= message.poll.options.length) {
        res.status(400); throw new Error("Invalid option index");
    }

    const userIdStr = user._id.toString();
    const poll = message.poll;
    const targetOption = poll.options[optionIndex];

    // Check if user already voted for THIS option
    const alreadyVotedThis = targetOption.votes.some(id => id.toString() === userIdStr);

    if (alreadyVotedThis) {
        targetOption.votes = targetOption.votes.filter(id => id.toString() !== userIdStr);
    } else {
        if (!poll.allowMultipleAnswers) {
            poll.options.forEach(opt => {
                opt.votes = opt.votes.filter(id => id.toString() !== userIdStr);
            });
        }
        targetOption.votes.push(user._id);
    }

    await message.save();

    try {
        const socketIoInstance = req.app.get("io") || io;
        if (socketIoInstance) {
            socketIoInstance.to(message.group.toString()).emit("pollUpdated", {
                messageId: message._id,
                poll: message.poll
            });
        }
    } catch (error) { console.error("Socket emit failed:", error); }

    res.status(200).json({ success: true, poll: message.poll });
});
