import expressAsyncHandler from "express-async-handler";
import Group from "../../models/Group.js";
import GroupMessage from "../../models/GroupMessage.js";
import User from "../../models/User.js";
import imagekit from "../../configs/imagekit.js";

const POPULATE_OWNER = {
    path: "owner",
    select: "full_name profile_picture clerkId"
};

/**
 * @desc Create a new group chat
 * @route POST /api/group/create
 * @access Private
 */
export const createGroup = expressAsyncHandler(async (req, res) => {
    const { userId } = req.auth();
    let { name, description, memberIds } = req.body;
    const file = req.file;

    // 1. Resolve Owner
    const ownerUser = await User.findOne({ clerkId: userId });
    if (!ownerUser) {
        res.status(404);
        throw new Error("User not found");
    }

    // 2. Parse Members (Handle FormData stringification)
    if (typeof memberIds === 'string') {
        try {
            memberIds = JSON.parse(memberIds);
        } catch (e) {
            memberIds = [];
        }
    }

    // 3. Image Upload
    let groupImageUrl = "";
    if (file) {
        const uploadResponse = await imagekit.upload({
            file: file.buffer,
            fileName: `group-${Date.now()}-${file.originalname}`,
            folder: "/groups"
        });
        groupImageUrl = imagekit.url({
            path: uploadResponse.filePath,
            transformation: [{ quality: "auto" }, { width: "500" }]
        });
    }

    // 4. Construct Member List
    const initialMembers = [{
        user: ownerUser._id,
        role: "admin",
        status: "accepted",
        joinedAt: Date.now()
    }];

    if (Array.isArray(memberIds)) {
        // Filter duplicates and self
        const uniqueIds = [...new Set(memberIds)];
        uniqueIds.forEach(friendId => {
            if (friendId !== ownerUser._id.toString()) {
                initialMembers.push({
                    user: friendId,
                    role: "member",
                    status: "accepted"
                });
            }
        });
    }

    // 5. Create Group
    let group = await Group.create({
        name,
        description: description || "",
        group_image: groupImageUrl,
        owner: ownerUser._id,
        members: initialMembers
    });

    // 6. Populate for Frontend
    group = await group.populate([
        {
            path: "owner",
            select: "clerkId full_name profile_picture"
        },
        {
            path: "members.user",
            select: "clerkId full_name profile_picture"
        }
    ]);

    res.status(201).json({
        success: true,
        message: "Group created successfully 🎉",
        group
    });
});

/**
 * @desc Get Groups the user belongs to
 * @route GET /api/group/my-groups
 * @access Private
 */
export const getAvailableGroups = expressAsyncHandler(async (req, res) => {
    const { userId } = req.auth();
    const currentUser = await User.findOne({ clerkId: userId });

    if (!currentUser) { res.status(404); throw new Error("User not found"); }

    const groups = await Group.find({
        $or: [
            { "members.user": currentUser._id },
            { "owner": currentUser._id }
        ]
    })
        .populate("members.user", "full_name profile_picture clerkId _id")
        .populate(POPULATE_OWNER)
        .sort({ updatedAt: -1 });

    res.status(200).json({
        success: true,
        count: groups.length,
        groups
    });
});

/**
 * @desc Discover Public Groups (Not joined yet)
 * @route GET /api/group/discovery
 * @access Private
 */
export const getDiscoveryGroups = expressAsyncHandler(async (req, res) => {
    const { userId } = req.auth();
    const currentUser = await User.findOne({ clerkId: userId });
    if (!currentUser) { res.status(404); throw new Error("User not found"); }

    const groups = await Group.find({
        $and: [
            { "members.user": { $ne: currentUser._id } },
            { "owner": { $ne: currentUser._id } }
        ]
    })
        .select("name description group_image members owner")
        .populate(POPULATE_OWNER)
        .sort({ createdAt: -1 })
        .limit(50);

    res.status(200).json(groups);
});

/**
 * @desc Join a Group
 * @route POST /api/group/join/:groupId
 * @access Private
 */
export const joinGroup = expressAsyncHandler(async (req, res) => {
    const { userId } = req.auth();
    const { groupId } = req.params;

    const [currentUser, group] = await Promise.all([
        User.findOne({ clerkId: userId }),
        Group.findById(groupId)
    ]);

    if (!currentUser) { res.status(404); throw new Error("User not found"); }
    if (!group) { res.status(404); throw new Error("Group not found"); }

    const isAlreadyMember = group.members.some(
        m => m.user.toString() === currentUser._id.toString()
    );

    if (isAlreadyMember) {
        res.status(400);
        throw new Error("You are already a member of this group");
    }

    group.members.push({
        user: currentUser._id,
        role: "member",
        status: "pending"
    });

    await group.save();

    const populatedGroup = await group.populate("members.user", "full_name profile_picture");

    res.status(200).json({
        success: true,
        message: "Join request sent successfully",
        group: populatedGroup
    });
});

/**
 * @desc Get Pending Requests
 * @route GET /api/group/requests/:groupId
 * @access Private (Owner Only)
 */
export const getGroupRequests = expressAsyncHandler(async (req, res) => {
    const { userId } = req.auth();
    const { groupId } = req.params;

    const currentUser = await User.findOne({ clerkId: userId });
    const group = await Group.findById(groupId).populate("members.user", "full_name profile_picture username");

    if (!group) { res.status(404); throw new Error("Group not found"); }

    if (group.owner.toString() !== currentUser._id.toString()) {
        res.status(403);
        throw new Error("Not authorized");
    }

    const requests = group.members.filter(m => m.status === "pending");

    res.status(200).json({
        success: true,
        count: requests.length,
        requests
    });
});

/**
 * @desc Respond to Join Request
 * @route PUT /api/group/request/respond
 * @access Private (Owner Only)
 */
export const respondToJoinRequest = expressAsyncHandler(async (req, res) => {
    const { userId } = req.auth();
    const { groupId, memberId, action } = req.body;

    const currentUser = await User.findOne({ clerkId: userId });
    const group = await Group.findById(groupId);

    if (!group) {
        res.status(404);
        throw new Error("Group not found");
    }

    if (group.owner.toString() !== currentUser._id.toString()) {
        res.status(403);
        throw new Error("Not authorized");
    }

    const memberIndex = group.members.findIndex(
        m => m.user.toString() === memberId && m.status === "pending"
    );

    if (memberIndex === -1) {
        res.status(404);
        throw new Error("Request not found or already processed");
    }

    if (action === "accept") {
        group.members[memberIndex].status = "accepted";
        group.members[memberIndex].joinedAt = Date.now();

        const newMemberUser = await User.findById(memberId);
        if (newMemberUser) {
            const sysMsg = await GroupMessage.create({
                group: groupId,
                sender: newMemberUser._id,
                text: `${newMemberUser.full_name} has joined the group`,
                message_type: "system"
            });

            const io = req.app.get("io");
            if (io) io.to(groupId).emit("receiveGroupMessage", sysMsg);
        }
    } else {
        group.members.splice(memberIndex, 1);
    }

    await group.save();

    res.status(200).json({
        success: true,
        message: action === "accept" ? "Accepted" : "Rejected",
        memberId
    });
});

/**
 * @desc Get Group Details
 * @route GET /api/group/:groupId
 * @access Private (Members Only)
 */
export const getGroupDetails = expressAsyncHandler(async (req, res) => {
    const { userId } = req.auth();
    const { groupId } = req.params;

    const currentUser = await User.findOne({ clerkId: userId });
    const group = await Group.findById(groupId)
        .populate("members.user", "full_name profile_picture username bio")
        .populate(POPULATE_OWNER);

    if (!group) {
        res.status(404);
        throw new Error("Group not found");
    }

    const isMember = group.members.some(
        m => m.user && m.user._id.toString() === currentUser._id.toString() && m.status === "accepted"
    );

    if (!isMember) {
        res.status(403);
        throw new Error("Not a member");
    }

    group.members = group.members.filter(m => m.user !== null);

    res.status(200).json({ success: true, group });
});

/**
 * @desc Leave Group
 * @route PUT /api/group/leave/:groupId
 * @access Private
 */
export const leaveGroup = expressAsyncHandler(async (req, res) => {
    const { userId } = req.auth();
    const { groupId } = req.params;

    const currentUser = await User.findOne({ clerkId: userId });
    const group = await Group.findById(groupId);

    if (!group) { res.status(404); throw new Error("Group not found"); }

    if (group.owner.toString() === currentUser._id.toString()) {
        res.status(400);
        throw new Error("Owner cannot leave. Transfer ownership or delete group.");
    }

    const initialCount = group.members.length;
    group.members = group.members.filter(m => m.user.toString() !== currentUser._id.toString());

    if (group.members.length === initialCount) {
        res.status(400);
        throw new Error("You are not in this group");
    }

    await group.save();

    await GroupMessage.create({
        group: groupId,
        sender: currentUser._id,
        text: `${currentUser.full_name} left the group`,
        message_type: "system"
    });

    res.status(200).json({ success: true, message: "Left successfully" });
});

/**
 * @desc Kick Member
 * @route PUT /api/group/kick
 * @access Private (Owner Only)
 */
export const removeMember = expressAsyncHandler(async (req, res) => {
    const { userId } = req.auth();
    const { groupId, memberId } = req.body;

    const currentUser = await User.findOne({ clerkId: userId });
    const group = await Group.findById(groupId);

    if (!group) { res.status(404); throw new Error("Group not found"); }
    if (group.owner.toString() !== currentUser._id.toString()) {
        res.status(403);
        throw new Error("Not authorized");
    }
    if (memberId === group.owner.toString()) {
        res.status(400);
        throw new Error("Cannot kick yourself");
    }

    const memberIndex = group.members.findIndex(m => m.user.toString() === memberId);
    if (memberIndex === -1) {
        res.status(404);
        throw new Error("Member not found");
    }

    group.members.splice(memberIndex, 1);
    await group.save();

    const kickedUser = await User.findById(memberId);
    if (kickedUser) {
        await GroupMessage.create({
            group: groupId,
            sender: currentUser._id,
            text: `${kickedUser.full_name} was removed`,
            message_type: "system"
        });
    }

    res.status(200).json({ success: true, message: "Removed successfully", memberId });
});

/**
 * @desc Toggle Group Lock
 * @route PUT /api/group/toggle-lock/:groupId
 * @access Private (Owner Only)
 */
export const toggleGroupLock = expressAsyncHandler(async (req, res) => {
    const { userId } = req.auth();
    const { groupId } = req.params;

    const currentUser = await User.findOne({ clerkId: userId });
    if (!currentUser) {
        res.status(404);
        throw new Error("User not found");
    }

    const group = await Group.findById(groupId);
    if (!group) {
        res.status(404);
        throw new Error("Group not found");
    }

    if (group.owner.toString() !== currentUser._id.toString()) {
        res.status(403);
        throw new Error("Not authorized: Only the group owner can lock the chat");
    }

    group.isChatLocked = !group.isChatLocked;
    await group.save();

    const io = req.app.get("io");
    if (io) {
        io.to(groupId).emit("groupUpdated", {
            groupId,
            isChatLocked: group.isChatLocked
        });

        const systemMsg = await GroupMessage.create({
            group: groupId,
            sender: currentUser._id,
            text: group.isChatLocked ? "🔒 Group chat locked by admin" : "🔓 Group chat unlocked by admin",
            message_type: "system",
            readBy: [currentUser._id]
        });
        io.to(groupId).emit("receiveGroupMessage", systemMsg);
    }

    res.status(200).json({ success: true, isChatLocked: group.isChatLocked });
});
