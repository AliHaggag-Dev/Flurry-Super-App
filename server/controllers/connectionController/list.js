import expressAsyncHandler from "express-async-handler";
import User from "../../models/User.js";

/**
 * @desc Get User Connections & Requests
 * @route /api/connection
 * @method GET
 */
export const getUserConnections = expressAsyncHandler(async (req, res) => {
    const { userId } = req.auth();
    const publicFields = "full_name username profile_picture bio";

    const user = await User.findOne({ clerkId: userId })
        .populate("connections", publicFields)
        .populate("pendingRequests", publicFields)
        .populate("sentRequests", publicFields)
        .populate("followers", publicFields)
        .populate("following", publicFields)
        .populate("blockedUsers", publicFields);

    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }

    res.status(200).json({
        success: true,
        data: {
            connections: user.connections || [],
            pendingRequests: user.pendingRequests || [],
            sentRequests: user.sentRequests || [],
            followers: user.followers || [],
            following: user.following || [],
            blockedUsers: user.blockedUsers || []
        }
    });
});
