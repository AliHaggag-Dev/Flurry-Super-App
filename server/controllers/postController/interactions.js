import expressAsyncHandler from "express-async-handler";
import Post from "../../models/Post.js";
import User from "../../models/User.js";
import Notification from "../../models/Notification.js";
import Report from "../../models/Report.js";

/**
 * @desc Toggle Like on Post
 * @route POST /api/post/like/:postId
 * @access Private
 */
export const likeUnlikePost = expressAsyncHandler(async (req, res) => {
    const userId = req.user._id; // Assumes middleware attaches user
    const { id: postId } = req.params;

    const post = await Post.findById(postId);
    if (!post) {
        res.status(404);
        throw new Error("Post not found.");
    }

    if (!post.likes) post.likes = [];

    const userIdStr = userId.toString();
    const isLiked = post.likes.some((id) => id.toString() === userIdStr);

    if (isLiked) {
        // Unlike
        post.likes = post.likes.filter((id) => id.toString() !== userIdStr);

        await Notification.findOneAndDelete({
            from_user: userId,
            post: post._id,
            type: "like",
        });
    } else {
        // Like
        post.likes.push(userId);

        // Notify if not self-like
        if (post.user.toString() !== userIdStr) {
            try {
                await Notification.create({
                    recipient: post.user,
                    sender: userId,
                    post: post._id,
                    type: "like",
                });
            } catch (error) {
                console.warn("Notification Error (Like):", error.message);
            }
        }
    }

    await post.save();

    res.status(200).json({
        success: true,
        message: isLiked ? "Post unliked" : "Post liked",
        likes: post.likes,
        likes_count: post.likes.length,
    });
});

/**
 * @desc Share Post
 * @route POST /api/post/share/:id
 * @access Private
 */
export const sharePost = expressAsyncHandler(async (req, res) => {
    const { id } = req.params;
    const { userId } = req.auth();

    const currentUser = await User.findOne({ clerkId: userId });
    if (!currentUser) {
        res.status(404);
        throw new Error("User not found via Clerk ID");
    }

    const post = await Post.findById(id);
    if (!post) {
        res.status(404);
        throw new Error("Post not found");
    }

    const updatedPost = await Post.findByIdAndUpdate(
        id,
        { $push: { shares: currentUser._id } },
        { new: true }
    );

    if (post.user.toString() !== currentUser._id.toString()) {
        try {
            await Notification.create({
                recipient: post.user,
                sender: currentUser._id,
                type: "share",
                post: post._id,
            });
        } catch (error) {
            console.warn("Notification Error (Share):", error.message);
        }
    }

    res.status(200).json(updatedPost);
});

/**
 * @desc Toggle Save Post
 * @route PUT /api/post/save/:id
 * @access Private
 */
export const togglePostSave = expressAsyncHandler(async (req, res) => {
    const { id } = req.params;
    const { userId } = req.auth();

    const currentUser = await User.findOne({ clerkId: userId });
    if (!currentUser) {
        res.status(404);
        throw new Error("User not found via Clerk ID");
    }

    const post = await Post.findById(id);
    if (!post) {
        res.status(404);
        throw new Error("Post not found");
    }

    const isSaved = post.saves.includes(currentUser._id);

    if (isSaved) {
        post.saves.pull(currentUser._id);
    } else {
        post.saves.push(currentUser._id);
    }

    await post.save();

    res.status(200).json({
        success: true,
        message: isSaved ? "Post unsaved successfully" : "Post saved successfully",
        saves: post.saves,
        saves_count: post.saves.length,
    });
});

/**
 * @desc Report a Post
 * @route POST /api/post/report/:id
 * @access Private
 */
export const reportPost = expressAsyncHandler(async (req, res) => {
    const { id: postId } = req.params;
    const { userId } = req.auth(); // Clerk ID
    const { reason } = req.body;

    // 1. a map of reasons to their translated versions
    const REASON_MAP = {
        "spam": "Spam",
        "harassment": "Harassment",
        "hateSpeech": "Hate Speech",
        "violence": "Violence",
        "nudity": "Nudity",
        "other": "Other"
    };

    const formattedReason = REASON_MAP[reason] || "Other";

    const currentUser = await User.findOne({ clerkId: userId });
    if (!currentUser) {
        res.status(404);
        throw new Error("User not found via Clerk ID");
    }

    const post = await Post.findById(postId);
    if (!post) {
        res.status(404);
        throw new Error("Post not found");
    }

    const isAlreadyReported = post.reports.includes(currentUser._id);

    if (isAlreadyReported) {
        res.status(400);
        throw new Error("You have already reported this post");
    }

    await Report.create({
        reporter: currentUser._id,
        targetPost: postId,
        reason: formattedReason,
    });

    const updatedPost = await Post.findByIdAndUpdate(
        postId,
        {
            $addToSet: { reports: currentUser._id }
        },
        { new: true }
    );

    const REPORT_THRESHOLD = 5;

    if (updatedPost.reports.length >= REPORT_THRESHOLD) {
        updatedPost.isHidden = true;
        await updatedPost.save();
        console.log(`🚨 Auto-Moderation: Post ${postId} hidden due to high reports.`);
    }

    res.status(201).json({
        success: true,
        message: "Report submitted successfully.",
    });
});
