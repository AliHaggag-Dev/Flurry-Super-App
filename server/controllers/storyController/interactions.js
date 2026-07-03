import expressAsyncHandler from "express-async-handler";
import Story from "../../models/Story.js";
import User from "../../models/User.js";
import { cleanViewersList, getTwentyFourHoursAgo } from "./helpers.js";

/**
 * @desc Mark Story as Viewed (Includes Deduplication Cleaning)
 * @route PUT /api/story/:id/view
 * @access Private
 */
export const viewStory = expressAsyncHandler(async (req, res) => {
    const { userId: clerkId } = req.auth();
    const { id } = req.params;

    const user = await User.findOne({ clerkId });
    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }

    const story = await Story.findById(id);
    if (!story) {
        res.status(404);
        throw new Error("Story not found");
    }

    const currentUserIdStr = user._id.toString();

    let uniqueViewers = cleanViewersList(story.viewers);

    const isOwner = story.user.toString() === currentUserIdStr;

    if (!isOwner) {
        const alreadyViewed = uniqueViewers.some(
            (v) => v.user.toString() === currentUserIdStr
        );

        if (!alreadyViewed) {
            uniqueViewers.push({
                user: user._id,
                viewedAt: new Date(),
                reaction: null,
            });
        }
    } else {
        if (!story.openedByOwnerAt) {
            story.openedByOwnerAt = new Date();
        }
    }

    story.viewers = uniqueViewers;
    await story.save();

    res.status(200).json({ success: true });
});

/**
 * @desc Bulk Mark All Stories of User as Seen
 * @route PUT /api/story/mark-all-seen
 * @access Private
 */
export const handleStoriesEnd = expressAsyncHandler(async (req, res) => {
    const { targetUserId } = req.params;
    const { userId: viewerClerkId } = req.auth();

    const viewer = await User.findOne({ clerkId: viewerClerkId });
    if (!viewer) {
        res.status(404);
        throw new Error("Viewer not found");
    }

    await Story.updateMany(
        {
            user: targetUserId,
            createdAt: { $gte: getTwentyFourHoursAgo() },
            viewers: { $ne: viewer._id },
            user: { $ne: viewer._id },
        },
        {
            $addToSet: { viewers: viewer._id },
        }
    );

    res.status(200).json({
        success: true,
        message: "All stories marked as seen successfully",
    });
});

/**
 * @desc Toggle Story Reaction
 * @route POST /api/story/:storyId/react
 * @access Private
 */
export const toggleReaction = expressAsyncHandler(async (req, res) => {
    const { storyId } = req.params;
    const { emoji } = req.body;
    const { userId: clerkId } = req.auth();

    const user = await User.findOne({ clerkId });
    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }

    const story = await Story.findById(storyId);
    if (!story) {
        res.status(404);
        throw new Error("Story not found");
    }

    story.viewers = cleanViewersList(story.viewers);

    const userIdStr = user._id.toString();
    const viewerIndex = story.viewers.findIndex(
        (v) => v.user.toString() === userIdStr
    );

    if (viewerIndex > -1) {
        story.viewers[viewerIndex].reaction = emoji;
        story.markModified("viewers");
    } else {
        story.viewers.push({
            user: user._id,
            viewedAt: new Date(),
            reaction: emoji,
        });
    }

    await story.save();

    res.status(200).json({ success: true, reaction: emoji });
});
