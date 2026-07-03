import expressAsyncHandler from "express-async-handler";
import Post from "../../models/Post.js";
import User from "../../models/User.js";
import Comment from "../../models/Comment.js";
import Notification from "../../models/Notification.js";
import { getRecursiveCommentIds } from "./helpers.js";

/**
 * @desc Add Comment or Reply
 * @route POST /api/post/comment/:postId
 * @access Private
 */
export const addComment = expressAsyncHandler(async (req, res) => {
    const { userId } = req.auth();
    const { postId } = req.params;
    const { text, parentId } = req.body;

    if (!text || text.trim().length === 0) {
        res.status(400);
        throw new Error("Comment text is required.");
    }

    const currentUser = await User.findOne({ clerkId: userId });
    if (!currentUser) {
        res.status(404);
        throw new Error("User not found.");
    }

    const post = await Post.findById(postId);
    if (!post) {
        res.status(404);
        throw new Error("Post not found.");
    }

    let newComment = await Comment.create({
        user: currentUser._id,
        post: postId,
        text,
        parentId: parentId || null,
    });

    newComment = await newComment.populate("user", "username full_name profile_picture");
    await Post.findByIdAndUpdate(postId, { $push: { comments: newComment._id } });

    // Notification
    if (post.user.toString() !== currentUser._id.toString()) {
        try {
            await Notification.create({
                recipient: post.user,
                sender: currentUser._id,
                type: parentId ? "reply" : "comment",
                post: post._id,
                commentId: newComment._id,
            });
        } catch (error) {
            console.warn("Notification Error (Comment):", error.message);
        }
    }

    res.status(201).json({
        success: true,
        message: parentId ? "Reply added successfully" : "Comment added successfully",
        comment: newComment,
    });
});

/**
 * @desc Update Comment
 * @route PUT /api/post/comment/:commentId
 * @access Private
 */
export const updateComment = expressAsyncHandler(async (req, res) => {
    const { userId } = req.auth();
    const { commentId } = req.params;
    const { text } = req.body;

    const currentUser = await User.findOne({ clerkId: userId });
    if (!currentUser) {
        res.status(404);
        throw new Error("User not found via Clerk ID");
    }

    if (!text || text.trim().length === 0) {
        res.status(400);
        throw new Error("Comment text is required.");
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
        res.status(404);
        throw new Error("Comment not found.");
    }

    if (comment.user.toString() !== currentUser._id.toString()) {
        res.status(403);
        throw new Error("You are not authorized to update this comment.");
    }

    comment.text = text;
    comment.isEdited = true;
    await comment.save();

    res.status(200).json({
        success: true,
        message: "Comment updated successfully.",
        comment: comment,
    });
});

/**
 * @desc Delete Comment (Cascade Delete for Replies)
 * @route DELETE /api/post/comment/:commentId
 * @access Private
 */
export const deleteComment = expressAsyncHandler(async (req, res) => {
    const { userId } = req.auth();
    const { commentId } = req.params;

    const currentUser = await User.findOne({ clerkId: userId });
    if (!currentUser) {
        res.status(404);
        throw new Error("User not found.");
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
        res.status(404);
        throw new Error("Comment not found.");
    }

    const post = await Post.findById(comment.post);
    if (!post) {
        res.status(404);
        throw new Error("Post not found.");
    }

    const isCommentOwner = comment.user.toString() === currentUser._id.toString();
    const isPostOwner = post.user.toString() === currentUser._id.toString();

    if (!isCommentOwner && !isPostOwner) {
        res.status(403);
        throw new Error("You are not authorized to delete this comment.");
    }

    // --- Cascade Delete Logic ---
    const childrenIds = await getRecursiveCommentIds(commentId);
    const allIdsToDelete = [comment._id, ...childrenIds];

    // Batch delete from Comment Collection
    await Comment.deleteMany({ _id: { $in: allIdsToDelete } });

    // Update Post Reference
    await Post.findByIdAndUpdate(comment.post, {
        $pull: { comments: { $in: allIdsToDelete } },
    });

    res.status(200).json({
        success: true,
        message: `Comment and ${childrenIds.length} replies deleted successfully.`,
        deletedCount: allIdsToDelete.length,
    });
});

/**
 * @desc Toggle Like on Comment
 * @route POST /api/post/comment/like/:commentId
 * @access Private
 */
export const toggleCommentLike = expressAsyncHandler(async (req, res) => {
    const { userId } = req.auth();
    const { commentId } = req.params;

    const currentUser = await User.findOne({ clerkId: userId });
    if (!currentUser) {
        res.status(404);
        throw new Error("User not found via Clerk ID");
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
        res.status(404);
        throw new Error("Comment not found.");
    }

    if (!comment.likes) comment.likes = [];

    const userIdStr = currentUser._id.toString();
    const isLiked = comment.likes.some((id) => id.toString() === userIdStr);

    if (isLiked) {
        comment.likes = comment.likes.filter((id) => id.toString() !== userIdStr);
    } else {
        comment.likes.push(currentUser._id);
    }

    await comment.save();

    res.status(200).json({
        success: true,
        message: isLiked ? "Comment unliked" : "Comment liked",
        likes_count: comment.likes.length,
    });
});
