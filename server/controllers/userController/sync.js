import expressAsyncHandler from "express-async-handler";
import User from "../../models/User.js";
import sendEmail from "../../utils/sendEmail.js";

/**
 * @desc Sync User from Clerk (Login/Signup)
 * @route POST /api/user/sync
 * @access Private
 */
export const syncUser = expressAsyncHandler(async (req, res) => {
    const { id, emailAddresses, firstName, lastName, imageUrl, image_url, username } = req.body;
    const clerkUserId = id || (req.auth?.userId);

    if (!clerkUserId) {
        res.status(400);
        throw new Error("Clerk User ID is missing");
    }

    const email = emailAddresses?.[0]?.emailAddress || req.body.email;
    const fullName = (firstName && lastName) ? `${firstName} ${lastName}` : (req.body.fullName || "User");
    const imageFromClerk = imageUrl || image_url || req.body.profile_image_url || "";
    const userNameData = username || req.body.username || email?.split("@")[0] || `user_${Date.now()}`;

    let user = await User.findOne({ clerkId: clerkUserId });

    if (user) {
        user.email = email;
        user.full_name = fullName;
        if (!user.profile_picture || user.profile_picture === "") {
            user.profile_picture = imageFromClerk;
        }
        user.username = userNameData;
        await user.save();
        return res.status(200).json({ success: true, user });
    }

    user = await User.create({
        clerkId: clerkUserId,
        email,
        full_name: fullName,
        username: userNameData,
        profile_picture: imageFromClerk
    });

    // Send Welcome Email (Background Task)
    sendEmail({
        to: email,
        subject: "Welcome to Flurry! 🚀",
        html: `
            <div style="font-family: sans-serif; text-align: center; padding: 20px; background-color: #f9fafb; border-radius: 10px;">
                <h1 style="color: #2563eb;">Welcome ${fullName}! 👋</h1>
                <p>We are thrilled to have you on board.</p>
                <hr style="margin: 20px 0;" />
                <p style="font-size: 12px; color: #9ca3af;">Flurry Team</p>
            </div>
        `
    }).catch(console.error);

    res.status(201).json({ success: true, user });
});

/**
 * @desc Get Logged-In User Profile
 * @route GET /api/user/me
 * @access Private
 */
export const getUserData = expressAsyncHandler(async (req, res) => {
    const userId = req.user.id; // From middleware

    const user = await User.findById(userId)
        .select("-password")
        .populate("followers following connections pendingRequests sentRequests followRequests", "full_name username profile_picture isVerified");

    if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.status(200).json({ success: true, data: user });
});

/**
 * @desc Search Users
 * @route GET /api/user/search
 * @access Private
 */
export const discoverUsers = expressAsyncHandler(async (req, res) => {
    const { query } = req.query;
    if (!query || !query.trim()) return res.json({ success: true, users: [] });

    const { userId: clerkId } = req.auth();
    const currentUser = await User.findOne({ clerkId }).select("_id blockedUsers");

    if (!currentUser) return res.json({ success: true, users: [] });

    // Escape regex characters to prevent ReDoS
    const safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const searchRegex = new RegExp(safeQuery, "i");

    const users = await User.find({
        $and: [
            {
                $or: [
                    { username: searchRegex },
                    { full_name: searchRegex },
                    { bio: searchRegex },
                    { location: searchRegex }
                ]
            },
            { _id: { $ne: currentUser._id } },
            { _id: { $nin: currentUser.blockedUsers || [] } },
            { blockedUsers: { $ne: currentUser._id } }
        ]
    })
        .select("_id full_name username profile_picture bio isVerified location")
        .limit(20)
        .lean();

    res.status(200).json({ success: true, users });
});

/**
 * @desc Get Public Profile
 * @route GET /api/user/:id
 * @access Public/Private
 */
export const getUserById = expressAsyncHandler(async (req, res) => {
    const { id } = req.params;
    const user = await User.findById(id).select("-password -email -clerkId -blockedUsers -mutedUsers");

    if (!user) { res.status(404); throw new Error("User not found"); }

    res.status(200).json({ success: true, user });
});
