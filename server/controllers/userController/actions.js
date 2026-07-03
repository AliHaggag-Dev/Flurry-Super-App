import expressAsyncHandler from "express-async-handler";
import User from "../../models/User.js";
import Notification from "../../models/Notification.js";
import { getReceiverSocketId, io } from "../../socket/socket.js";

/**
 * @desc Get Followers/Following List
 * @route GET /api/user/:id/:type
 * @access Private
 */
export const getUserNetwork = expressAsyncHandler(async (req, res) => {
    const { id, type } = req.params;
    if (!['followers', 'following'].includes(type)) {
        res.status(400); throw new Error("Invalid type");
    }

    const user = await User.findById(id).populate(type, "full_name username profile_picture bio location isVerified");
    if (!user) { res.status(404); throw new Error("User not found"); }

    res.status(200).json({ success: true, users: user[type] });
});

/**
 * @desc Follow User
 * @route POST /api/user/follow/:id
 * @access Private
 */
export const followUser = expressAsyncHandler(async (req, res) => {
    const { id: targetUserId } = req.params;

    const currentUser = await User.findById(req.user.id);
    const targetUser = await User.findById(targetUserId);

    if (!currentUser || !targetUser) { res.status(404); throw new Error("User not found"); }
    if (currentUser._id.equals(targetUser._id)) { res.status(400); throw new Error("Cannot follow yourself"); }

    // Case 1: Private Account (Send Request)
    if (targetUser.isPrivate) {
        if (targetUser.followRequests.includes(currentUser._id)) {
            return res.status(200).json({ success: true, status: "requested", message: "Request already sent" });
        }

        await targetUser.updateOne({ $addToSet: { followRequests: currentUser._id } });

        // Trigger Notification
        const notif = await Notification.create({
            recipient: targetUser._id,
            sender: currentUser._id,
            type: "follow_request",
            status: "pending"
        });

        // Socket Event
        const socketId = getReceiverSocketId(targetUser._id);
        if (socketId) {
            const populatedNotif = await notif.populate("sender", "full_name username profile_picture");
            io.to(socketId).emit("newNotification", populatedNotif);
        }

        return res.status(200).json({ success: true, status: "requested", message: "Follow request sent" });
    }

    // Case 2: Public Account (Direct Follow)
    await currentUser.updateOne({ $addToSet: { following: targetUser._id } });
    await targetUser.updateOne({ $addToSet: { followers: currentUser._id } });

    // Trigger Notification
    const notif = await Notification.create({
        recipient: targetUser._id,
        sender: currentUser._id,
        type: "follow"
    });

    // Socket Event
    const socketId = getReceiverSocketId(targetUser._id);
    if (socketId) {
        const populatedNotif = await notif.populate("sender", "full_name username profile_picture");
        io.to(socketId).emit("newNotification", populatedNotif);
    }

    res.status(200).json({ success: true, status: "following", message: `You are now following ${targetUser.full_name}` });
});

/**
 * @desc Unfollow User / Cancel Request
 * @route POST /api/user/unfollow/:id
 * @access Private
 */
export const unfollowUser = expressAsyncHandler(async (req, res) => {
    const { id: targetUserId } = req.params;
    const currentUser = await User.findById(req.user.id);
    const targetUser = await User.findById(targetUserId);

    if (!currentUser || !targetUser) { res.status(404); throw new Error("User not found"); }

    if (currentUser.following.includes(targetUser._id)) {
        await currentUser.updateOne({ $pull: { following: targetUser._id } });
        await targetUser.updateOne({ $pull: { followers: currentUser._id } });
        return res.status(200).json({ success: true, status: "none", message: "Unfollowed" });
    }

    if (targetUser.followRequests.includes(currentUser._id)) {
        await targetUser.updateOne({ $pull: { followRequests: currentUser._id } });
        await Notification.deleteOne({ recipient: targetUser._id, sender: currentUser._id, type: "follow_request" });
        return res.status(200).json({ success: true, status: "none", message: "Request cancelled" });
    }

    res.status(400); throw new Error("You don't follow this user");
});

/**
 * @desc Accept Follow Request
 * @route POST /api/user/follow-request/accept/:id
 * @access Private
 */
export const acceptFollowRequest = expressAsyncHandler(async (req, res) => {
    const { id: requesterId } = req.params;
    const currentUser = await User.findById(req.user.id);
    const requester = await User.findById(requesterId);

    if (!currentUser || !requester) { res.status(404); throw new Error("User not found"); }

    if (!currentUser.followRequests.includes(requesterId)) {
        res.status(400); throw new Error("No request found");
    }

    await currentUser.updateOne({
        $push: { followers: requesterId },
        $pull: { followRequests: requesterId }
    });
    await requester.updateOne({ $push: { following: currentUser._id } });

    // Create "Accept" Notification
    const notif = await Notification.create({
        recipient: requester._id,
        sender: currentUser._id,
        type: "follow_accept"
    });

    // Update Original Request Notification status
    await Notification.updateMany(
        { recipient: currentUser._id, sender: requesterId, type: "follow_request" },
        { status: "accepted" }
    );

    // Socket Event
    const socketId = getReceiverSocketId(requester._id);
    if (socketId) {
        const populatedNotif = await notif.populate("sender", "full_name username profile_picture");
        io.to(socketId).emit("newNotification", populatedNotif);
    }

    res.status(200).json({ success: true, message: "Request accepted" });
});

/**
 * @desc Decline Follow Request
 * @route POST /api/user/follow-request/decline/:id
 * @access Private
 */
export const declineFollowRequest = expressAsyncHandler(async (req, res) => {
    const { id: requesterId } = req.params;
    const currentUser = await User.findById(req.user.id);

    await currentUser.updateOne({ $pull: { followRequests: requesterId } });

    // Update Notification Status
    await Notification.updateMany(
        { recipient: currentUser._id, sender: requesterId, type: "follow_request" },
        { status: "rejected" }
    );

    res.status(200).json({ success: true, message: "Request declined" });
});

/**
 * @desc Toggle Block User
 * @route PUT /api/user/block/:id
 * @access Private
 */
export const toggleBlockUser = expressAsyncHandler(async (req, res) => {
    const { id: targetId } = req.params;
    const currentUser = await User.findOne({ clerkId: req.auth().userId });

    if (!currentUser) { res.status(404); throw new Error("User not found"); }

    if (currentUser.blockedUsers.includes(targetId)) {
        await currentUser.updateOne({ $pull: { blockedUsers: targetId } });
        res.status(200).json({ success: true, message: "User unblocked", isBlocked: false });
    } else {
        await currentUser.updateOne({
            $push: { blockedUsers: targetId },
            $pull: { following: targetId, followers: targetId }
        });
        res.status(200).json({ success: true, message: "User blocked", isBlocked: true });
    }
});

/**
 * @desc Toggle Mute User
 * @route PUT /api/user/mute/:id
 * @access Private
 */
export const toggleMuteUser = expressAsyncHandler(async (req, res) => {
    const { id: targetId } = req.params;
    const currentUser = await User.findOne({ clerkId: req.auth().userId });

    if (currentUser.mutedUsers.includes(targetId)) {
        await currentUser.updateOne({ $pull: { mutedUsers: targetId } });
        res.status(200).json({ success: true, message: "Notifications unmuted", isMuted: false });
    } else {
        await currentUser.updateOne({ $push: { mutedUsers: targetId } });
        res.status(200).json({ success: true, message: "Notifications muted", isMuted: true });
    }
});
