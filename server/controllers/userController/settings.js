import expressAsyncHandler from "express-async-handler";
import User from "../../models/User.js";
import imagekit from "../../configs/imagekit.js";
import { clerkClient } from "@clerk/clerk-sdk-node";

/**
 * @desc Update User Profile
 * @route PUT /api/user/update-profile
 * @access Private
 */
export const updateUserData = expressAsyncHandler(async (req, res) => {
    const { userId } = req.auth();
    let { username, bio, location, full_name } = req.body;

    const updatedData = {
        ...(bio && { bio }),
        ...(location && { location }),
        ...(full_name && { full_name }),
    };

    if (req.files?.profile_picture?.[0]) {
        const file = req.files.profile_picture[0];
        const fileName = `${Date.now()}_${file.originalname}`;

        const result = await imagekit.upload({
            file: file.buffer,
            fileName: fileName
        });

        updatedData.profile_picture = imagekit.url({
            path: result.filePath,
            transformation: [{ format: "webp" }, { width: 512 }, { quality: "auto" }]
        });
    }

    if (req.files?.cover?.[0]) {
        const file = req.files.cover[0];
        const fileName = `${Date.now()}_${file.originalname}`;

        const result = await imagekit.upload({
            file: file.buffer,
            fileName: fileName
        });

        updatedData.cover_photo = imagekit.url({
            path: result.filePath,
            transformation: [{ format: "webp" }, { width: 1280 }, { quality: "auto" }]
        });
    }

    try {
        const clerkUpdateData = {};

        if (username) {
            const userExists = await User.findOne({ username });
            if (userExists && userExists.clerkId !== userId) {
                res.status(400);
                throw new Error("Username is already taken (Local DB check)");
            }

            clerkUpdateData.username = username;
            updatedData.username = username;
        }

        if (full_name) {
            const nameParts = full_name.trim().split(" ");
            clerkUpdateData.firstName = nameParts[0];
            clerkUpdateData.lastName = nameParts.slice(1).join(" ") || "";
        }

        if (Object.keys(clerkUpdateData).length > 0) {
            await clerkClient.users.updateUser(userId, clerkUpdateData);
        }

    } catch (error) {
        console.error("❌ Clerk Update Failed:", error);

        if (error.errors && error.errors[0]?.message) {
            res.status(400);
            throw new Error(`Clerk Error: ${error.errors[0].message}`);
        } else if (error.message.includes("Username is already taken")) {
            res.status(400);
            throw new Error("Username is already taken");
        } else {
            res.status(500);
            throw new Error("Failed to update user identity in Clerk");
        }
    }

    const user = await User.findOneAndUpdate(
        { clerkId: userId },
        updatedData,
        { new: true }
    ).select("-password");

    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }

    res.status(200).json({
        success: true,
        data: user,
        message: "Profile updated successfully"
    });
});

/**
 * @desc Update Privacy Settings
 * @route PUT /api/user/update-privacy
 * @access Private
 */
export const updatePrivacySettings = expressAsyncHandler(async (req, res) => {
    const { isPrivate, hideOnlineStatus } = req.body;
    const user = await User.findOne({ clerkId: req.auth().userId });

    if (isPrivate !== undefined) user.isPrivate = isPrivate;
    if (hideOnlineStatus !== undefined) user.hideOnlineStatus = hideOnlineStatus;

    await user.save();
    res.status(200).json({ success: true, user: { isPrivate: user.isPrivate, hideOnlineStatus: user.hideOnlineStatus } });
});

/**
 * @desc Update Notification Settings
 * @route PUT /api/user/update-settings
 * @access Private
 */
export const updateNotificationSettings = expressAsyncHandler(async (req, res) => {
    const { email, push } = req.body;
    const user = await User.findOne({ clerkId: req.auth().userId });

    if (!user.notificationSettings) user.notificationSettings = {};
    if (email !== undefined) user.notificationSettings.email = email;
    if (push !== undefined) user.notificationSettings.push = push;

    await user.save();
    res.status(200).json({ success: true, settings: user.notificationSettings });
});

/**
 * @desc Save FCM Token for Push Notifications
 * @route POST /api/user/fcm-token
 * @access Private
 */
export const saveFcmToken = expressAsyncHandler(async (req, res) => {
    const { token } = req.body;
    const { userId } = req.auth();

    if (!token) {
        res.status(400);
        throw new Error("Token is required");
    }

    const user = await User.findOneAndUpdate(
        { clerkId: userId },
        { $addToSet: { fcmTokens: token } },
        { new: true }
    );

    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }

    res.status(200).json({ success: true, message: "Token saved successfully" });
});
