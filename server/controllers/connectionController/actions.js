import expressAsyncHandler from "express-async-handler";
import User from "../../models/User.js";
import Notification from "../../models/Notification.js";
import { emitSocketNotification, sendConnectionEmail } from "./helpers.js";

/**
 * @desc Send Connection Request
 * @route /api/connection/send
 * @method POST
 */
export const sendConnectionRequest = expressAsyncHandler(async (req, res) => {
    const { userId } = req.auth();
    const { receiverId } = req.body;

    if (userId === receiverId) throw new Error("You cannot send a request to yourself");

    const sender = await User.findOne({ clerkId: userId });
    const receiver = await User.findById(receiverId);

    if (!sender || !receiver) {
        res.status(404);
        throw new Error("User not found");
    }

    if (sender.connections.includes(receiver._id)) throw new Error("You are already connected");
    if (sender.sentRequests.includes(receiver._id)) throw new Error("Request already sent");

    await Promise.all([
        User.findByIdAndUpdate(sender._id, { $addToSet: { sentRequests: receiver._id } }),
        User.findByIdAndUpdate(receiver._id, { $addToSet: { pendingRequests: sender._id } })
    ]);

    const notification = await Notification.create({
        recipient: receiver._id,
        sender: sender._id,
        type: "connection_request",
        status: "pending"
    });

    emitSocketNotification(receiverId, "newNotification", {
        _id: notification._id,
        type: "connection_request",
        sender: {
            _id: sender._id,
            full_name: sender.full_name,
            profile_picture: sender.profile_picture,
            username: sender.username
        },
        message: "New connection request"
    });

    sendConnectionEmail(receiver, sender, 'request');

    res.status(200).json({ success: true, message: "Connection request sent" });
});

/**
 * @desc Remove Connection Only (Unfriend)
 * @route /api/connection/remove/:userId
 * @method PUT
 */
export const removeConnection = expressAsyncHandler(async (req, res) => {
    const { userId } = req.auth();
    const { userId: targetUserId } = req.params;

    const currentUser = await User.findOne({ clerkId: userId });
    const targetUser = await User.findById(targetUserId);

    if (!currentUser || !targetUser) throw new Error("User not found");

    await Promise.all([
        User.findByIdAndUpdate(currentUser._id, { $pull: { connections: targetUser._id } }),
        User.findByIdAndUpdate(targetUser._id, { $pull: { connections: currentUser._id } })
    ]);

    emitSocketNotification(targetUserId, "connectionRemoved", {
        removerId: currentUser._id,
        message: "Connection removed"
    });

    res.status(200).json({ success: true, message: "Connection removed successfully" });
});

/**
 * @desc Accept Connection Request
 * @route /api/connection/accept/:requestId
 * @method POST
 */
export const acceptConnection = expressAsyncHandler(async (req, res) => {
    const { userId } = req.auth();
    const { requestId: senderId } = req.params;

    const me = await User.findOne({ clerkId: userId });
    const sender = await User.findById(senderId);

    if (!me || !sender) throw new Error("User not found");

    await Promise.all([
        User.findByIdAndUpdate(me._id, {
            $addToSet: { connections: sender._id, followers: sender._id, following: sender._id },
            $pull: { pendingRequests: sender._id }
        }),
        User.findByIdAndUpdate(sender._id, {
            $addToSet: { connections: me._id, followers: me._id, following: me._id },
            $pull: { sentRequests: me._id }
        })
    ]);

    await Notification.findOneAndUpdate(
        { recipient: me._id, sender: sender._id, type: "connection_request" },
        { status: "accepted" }
    );

    const newNotification = await Notification.create({
        recipient: sender._id,
        sender: me._id,
        type: "connection_accept",
        message: `${me.full_name} accepted your connection request`
    });

    emitSocketNotification(senderId, "newNotification", {
        _id: newNotification._id,
        type: "connection_accept",
        sender: {
            _id: me._id,
            full_name: me.full_name,
            profile_picture: me.profile_picture,
            username: me.username
        },
        message: "Connection accepted"
    });

    sendConnectionEmail(sender, me, 'accept');

    res.status(200).json({ success: true, message: "Connection accepted" });
});

/**
 * @desc Reject OR Cancel Connection Request
 * @route /api/connection/reject/:id
 * @method POST
 */
export const rejectConnectionRequest = expressAsyncHandler(async (req, res) => {
    const { userId } = req.auth();
    const { id: targetUserId } = req.params;

    const currentUser = await User.findOne({ clerkId: userId });
    const targetUser = await User.findById(targetUserId);

    if (!currentUser || !targetUser) throw new Error("User not found");

    await Promise.all([
        User.findByIdAndUpdate(currentUser._id, {
            $pull: { pendingRequests: targetUser._id, sentRequests: targetUser._id, followRequests: targetUser._id }
        }),
        User.findByIdAndUpdate(targetUser._id, {
            $pull: { pendingRequests: currentUser._id, sentRequests: currentUser._id, followRequests: currentUser._id }
        }),
        Notification.findOneAndUpdate(
            {
                $or: [
                    { recipient: currentUser._id, sender: targetUser._id },
                    { recipient: targetUser._id, sender: currentUser._id }
                ],
                type: { $in: ["connection_request", "follow_request"] }
            },
            { status: "rejected" }
        )
    ]);

    res.status(200).json({ success: true, message: "Request removed/rejected successfully" });
});
