import expressAsyncHandler from "express-async-handler";
import User from "../../models/User.js";
import Connection from "../../models/Connection.js";

/**
 * @desc Block User
 * @route /api/connection/block/:id
 * @method POST
 */
export const blockUser = expressAsyncHandler(async (req, res) => {
    const { userId: clerkId } = req.auth();
    const { id: targetUserId } = req.params;

    const currentUser = await User.findOne({ clerkId });
    if (!currentUser) throw new Error("User not found");

    const currentUserId = currentUser._id;
    if (currentUserId.toString() === targetUserId) {
        res.status(400);
        throw new Error("You cannot block yourself.");
    }

    await Promise.all([
        User.findByIdAndUpdate(currentUserId, {
            $addToSet: { blockedUsers: targetUserId },
            $pull: { following: targetUserId, followers: targetUserId, connections: targetUserId }
        }),
        User.findByIdAndUpdate(targetUserId, {
            $pull: { following: currentUserId, followers: currentUserId, connections: currentUserId }
        }),
        Connection.findOneAndDelete({
            $or: [
                { sender: currentUserId, receiver: targetUserId },
                { sender: targetUserId, receiver: currentUserId }
            ]
        })
    ]);

    res.status(200).json({ success: true, message: "User blocked successfully" });
});

/**
 * @desc Unblock User
 * @route /api/connection/unblock/:id
 * @method POST
 */
export const unblockUser = expressAsyncHandler(async (req, res) => {
    const { userId } = req.auth();
    const { id: targetUserId } = req.params;

    const currentUser = await User.findOne({ clerkId: userId });
    if (!currentUser) throw new Error("User not found");

    await User.findByIdAndUpdate(currentUser._id, {
        $pull: { blockedUsers: targetUserId }
    });

    res.status(200).json({ success: true, message: "User unblocked successfully" });
});
