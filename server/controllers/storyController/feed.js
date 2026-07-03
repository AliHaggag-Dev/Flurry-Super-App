import expressAsyncHandler from "express-async-handler";
import Story from "../../models/Story.js";
import User from "../../models/User.js";
import { getTwentyFourHoursAgo } from "./helpers.js";

/**
 * @desc Get Stories Feed (Grouped by User, Sorted by Unseen)
 * @route GET /api/story/feed
 * @access Private
 */
export const getStoriesFeed = expressAsyncHandler(async (req, res) => {
    const { userId: clerkId } = req.auth();
    const user = await User.findOne({ clerkId });

    if (!user) {
        res.status(404);
        throw new Error("User not found.");
    }

    const blockedList = user.blockedUsers || [];
    const blockedIdsSet = new Set(blockedList.map((id) => id.toString()));

    const relevantUserIds = [
        user._id,
        ...(user.following || []),
        ...(user.connections || []),
    ].filter((id) => !blockedIdsSet.has(id.toString()));

    const rawStories = await Story.find({
        user: {
            $in: relevantUserIds,
            $nin: blockedList,
        },
        createdAt: { $gt: getTwentyFourHoursAgo() },
    })
        .populate("user", "username full_name profile_picture isVerified")
        .populate({
            path: "viewers.user",
            select: "username full_name profile_picture",
        })
        .sort({ createdAt: 1 })
        .lean();

    const groupedStories = {};
    const currentUserIdStr = user._id.toString();

    rawStories.forEach((story) => {
        if (!story.user) return;

        const storyOwnerIdStr = story.user._id.toString();
        const isOwner = storyOwnerIdStr === currentUserIdStr;

        const isViewedByMe = isOwner
            ? !!story.openedByOwnerAt
            : story.viewers.some(
                (v) => v.user && v.user._id.toString() === currentUserIdStr
            );

        story.isViewed = isViewedByMe;

        if (!groupedStories[storyOwnerIdStr]) {
            groupedStories[storyOwnerIdStr] = {
                user: story.user,
                stories: [],
                hasUnseen: false,
                lastStoryTime: story.createdAt,
            };
        }

        groupedStories[storyOwnerIdStr].stories.push(story);

        if (new Date(story.createdAt) > new Date(groupedStories[storyOwnerIdStr].lastStoryTime)) {
            groupedStories[storyOwnerIdStr].lastStoryTime = story.createdAt;
        }

        if (!story.isViewed) {
            groupedStories[storyOwnerIdStr].hasUnseen = true;
        }
    });

    const formattedStories = Object.values(groupedStories).sort((a, b) => {
        if (a.hasUnseen !== b.hasUnseen) {
            return a.hasUnseen ? -1 : 1;
        }
        return new Date(b.lastStoryTime) - new Date(a.lastStoryTime);
    });

    res.status(200).json({
        success: true,
        stories: formattedStories,
    });
});

/**
 * @desc Get Active Stories for a Specific User
 * @route GET /api/story/user/:userId
 * @access Private
 */
export const getUserStories = expressAsyncHandler(async (req, res) => {
    const { userId: targetUserId } = req.params;
    let viewerId = null;

    if (req.auth) {
        const { userId: clerkId } = req.auth();
        const viewer = await User.findOne({ clerkId });
        viewerId = viewer?._id.toString();
    }

    const user = await User.findById(targetUserId).select(
        "_id full_name username profile_picture isVerified"
    );
    if (!user) {
        res.status(404);
        throw new Error("User not found.");
    }

    let stories = await Story.find({
        user: targetUserId,
        createdAt: { $gt: getTwentyFourHoursAgo() },
    })
        .populate("user", "username full_name profile_picture isVerified")
        .sort({ createdAt: 1 })
        .lean();

    stories = stories.map((story) => {
        let isSeen = false;

        if (viewerId) {
            if (story.user._id.toString() === viewerId) {
                isSeen = !!story.openedByOwnerAt;
            } else {
                isSeen =
                    story.viewers &&
                    story.viewers.some((v) => {
                        if (!v) return false;
                        const idToCheck = v.user ? v.user : v;
                        return idToCheck?.toString() === viewerId;
                    });
            }
        }

        return {
            ...story,
            seen: isSeen,
            isViewed: isSeen,
        };
    });

    res.status(200).json({
        success: true,
        user,
        stories,
    });
});
