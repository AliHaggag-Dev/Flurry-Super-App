import User from "../../models/User.js";
import Comment from "../../models/Comment.js";

export const UNKNOWN_USER = {
    _id: null,
    full_name: "Unknown User",
    username: "unknown",
    profile_picture: "default_avatar_url.png",
};

/**
 * Manually populates post data to prevent N+1 queries, specifically for nested replies.
 * @param {Object} post - The raw post document.
 * @returns {Promise<Object>} The fully populated post object.
 */
export const populatePostData = async (post) => {
    // 1. Collect all unique User IDs (Post Author + Comment Authors + Reply Authors)
    const userIds = new Set();
    userIds.add(post.user.toString());

    if (post.comments) {
        post.comments.forEach((c) => {
            userIds.add(c.user.toString());
            if (c.replies) {
                c.replies.forEach((r) => userIds.add(r.user.toString()));
            }
        });
    }

    // 2. Batch Fetch Users (Single DB Call)
    const users = await User.find({ _id: { $in: [...userIds] } })
        .select("_id full_name username profile_picture")
        .lean();

    // 3. Create O(1) Lookup Map
    const userMap = new Map(users.map((user) => [user._id.toString(), user]));

    const populatedUser = userMap.get(post.user.toString()) || UNKNOWN_USER;

    // 4. Map Data back to structure
    const populatedComments = post.comments
        ? post.comments.map((c) => {
            const commentUser = userMap.get(c.user.toString()) || UNKNOWN_USER;

            const populatedReplies = c.replies
                ? c.replies.map((r) => {
                    const replyUser = userMap.get(r.user.toString()) || UNKNOWN_USER;
                    const replyData = r.toObject ? r.toObject() : r;
                    return { ...replyData, user: replyUser };
                 })
                : [];

            const commentData = c.toObject ? c.toObject() : c;
            return {
                ...commentData,
                user: commentUser,
                replies: populatedReplies,
            };
        })
        : [];

    const postData = post.toObject ? post.toObject() : post;
    return {
        ...postData,
        user: populatedUser,
        comments: populatedComments,
    };
};

/**
 * Recursively fetches IDs of a comment and all its descendants.
 * @param {string} commentId - The root comment ID.
 * @returns {Promise<string[]>} Array of ObjectId strings.
 */
export const getRecursiveCommentIds = async (commentId) => {
    const children = await Comment.find({ parentId: commentId });
    let ids = [];

    for (const child of children) {
        ids.push(child._id);
        const grandChildrenIds = await getRecursiveCommentIds(child._id);
        ids = [...ids, ...grandChildrenIds];
    }
    return ids;
};
