import expressAsyncHandler from "express-async-handler";
import Post from "../../models/Post.js";
import User from "../../models/User.js";
import Story from "../../models/Story.js";

/**
 * @desc Get Feed Posts (Unified Logic For You & Following)
 * @route GET /api/post/feed
 * @access Private
 */
export const getPostsFeed = expressAsyncHandler(async (req, res) => {
    const currentUser = req.user; // Assumes middleware attaches full user
    const { type } = req.query; // "for-you" | "following"
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // --- 1. Block Logic ---
    const blockedByMe = currentUser.blockedUsers?.map((id) => id.toString()) || [];

    // Optimized: Fetch blocking users and hidden private users in parallel if needed
    const usersWhoBlockedMe = await User.find({ blockedUsers: currentUser._id }).distinct("_id");
    const blockedByThem = usersWhoBlockedMe.map((id) => id.toString());
    const baseExcludeList = [...blockedByMe, ...blockedByThem];

    // --- 2. Query Construction ---
    const isHiddenCondition = {
        $or: [{ isHidden: false }, { isHidden: { $exists: false } }],
    };

    let query = {};

    if (type === "following") {
        query = {
            $and: [
                {
                    user: {
                        $in: currentUser.following,
                        $nin: baseExcludeList,
                    },
                },
                isHiddenCondition,
            ],
        };
    } else {
        // "For You" Logic
        const myCircle = [...currentUser.following, currentUser._id];

        // Fetch private accounts outside my circle
        const hiddenPrivateUsers = await User.find({
            isPrivate: true,
            _id: { $nin: myCircle },
        }).distinct("_id");

        const finalExcludeList = [...baseExcludeList, ...hiddenPrivateUsers];

        query = {
            $and: [
                { user: { $nin: finalExcludeList } },
                isHiddenCondition,
            ],
        };
    }

    // --- 3. Execution & Story Injection ---
    let posts = await Post.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("user", "full_name username profile_picture isPrivate isVerified")
        .populate("comments.user", "full_name username profile_picture isVerified")
        .lean();

    // Optimized Story Fetching (Map-based O(N))
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const userIdsInFeed = posts.map((p) => p.user._id);

    const activeStories = await Story.find({
        user: { $in: userIdsInFeed },
        createdAt: { $gte: twentyFourHoursAgo },
    }).lean();

    // Group stories by User ID for fast lookup
    const storiesMap = new Map();
    activeStories.forEach((story) => {
        const uid = story.user.toString();
        if (!storiesMap.has(uid)) storiesMap.set(uid, []);
        storiesMap.get(uid).push(story);
    });

    // Inject Stories into Posts
    posts = posts.map((post) => {
        const userStories = storiesMap.get(post.user._id.toString()) || [];

        const storiesWithSeenStatus = userStories.map((s) => ({
            ...s,
            seen: s.viewers
                ? s.viewers.some((v) => {
                    const viewerId = v.user ? v.user.toString() : v.toString();
                    return viewerId === currentUser._id.toString();
                })
                : false,
        }));

        return {
            ...post,
            user: {
                ...post.user,
                stories: storiesWithSeenStatus,
                hasActiveStory: userStories.length > 0,
            },
        };
    });

    const totalPosts = await Post.countDocuments(query);

    res.status(200).json({
        success: true,
        posts,
        currentPage: page,
        totalPages: Math.ceil(totalPosts / limit),
        hasMore: totalPosts > skip + posts.length,
    });
});

/**
 * @desc Get Single Post by ID
 * @route GET /api/post/:id
 * @access Public/Private
 */
export const getPostById = expressAsyncHandler(async (req, res) => {
    const { id } = req.params;

    // Determine Viewer
    let viewerMongoId = null;
    if (req.auth) {
        const { userId: clerkId } = req.auth();
        const viewer = await User.findOne({ clerkId });
        viewerMongoId = viewer?._id;
    }

    let post = await Post.findById(id)
        .populate("user", "full_name username profile_picture isPrivate isVerified blockedUsers")
        .populate({
            path: "comments",
            populate: { path: "user", select: "full_name username profile_picture isVerified" },
        })
        .lean();

    if (!post) {
        res.status(404);
        throw new Error("Post not found.");
    }

    // --- Deduplication Logic (Key Fix) ---
    if (post.comments && Array.isArray(post.comments)) {
        const seenIds = new Set();
        post.comments = post.comments.filter((comment) => {
            if (comment && comment._id) {
                const idStr = comment._id.toString();
                if (seenIds.has(idStr)) return false;
                seenIds.add(idStr);
                return true;
            }
            return false;
        });
    }

    // --- Privacy Check ---
    if (post.user && post.user.isPrivate) {
        const isOwner = viewerMongoId && post.user._id.toString() === viewerMongoId.toString();

        if (!isOwner && viewerMongoId) {
            // Check following status (Simplified for performance, ideally explicit query)
            const viewerData = await User.findById(viewerMongoId).select("following");
            const isFollowing = viewerData?.following?.some(
                (id) => id.toString() === post.user._id.toString()
            );

            if (!isFollowing) {
                res.status(403);
                throw new Error("This post is from a private account.");
            }
        }
    }

    // --- Story Injection ---
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const stories = await Story.find({
        user: post.user._id,
        createdAt: { $gte: twentyFourHoursAgo },
    })
        .populate("user", "full_name username profile_picture isVerified")
        .lean();

    if (post.user) {
        post.user.stories = stories.map((s) => ({
            ...s,
            seen: s.viewers
                ? s.viewers.some((v) => {
                    const viewerId = v.user ? v.user.toString() : v.toString();
                    return viewerMongoId && viewerId === viewerMongoId.toString();
                })
                : false,
        }));
    }

    res.status(200).json({ success: true, post });
});

/**
 * @desc Get User Profile by ID (With Logic for Block, Follow, Connection)
 * @route GET /api/post/user/:userId
 * @access Public/Private
 */
export const getUserById = expressAsyncHandler(async (req, res) => {
    const { userId } = req.params;
    let { userId: myClerkId } = req.auth();

    // 1. Fetch Target and Viewer in Parallel
    const [targetUser, viewer] = await Promise.all([
        User.findById(userId).select("-password -email").lean(),
        User.findOne({ clerkId: myClerkId }).select(
            "connections pendingRequests sentRequests blockedUsers following followRequests"
        ),
    ]);

    if (!targetUser) {
        res.status(404);
        throw new Error("User not found.");
    }

    const targetUserIdStr = targetUser._id.toString();
    const viewerMongoId = viewer?._id.toString();

    // --- Block Logic ---
    if (viewer && viewerMongoId !== targetUserIdStr) {
        const isBlockedByMe = viewer.blockedUsers?.some((id) => id.toString() === targetUserIdStr);
        const isBlockedByTarget = targetUser.blockedUsers?.some(
            (id) => id.toString() === viewerMongoId
        );

        if (isBlockedByMe || isBlockedByTarget) {
            return res.status(200).json({
                success: true,
                user: {
                    _id: targetUser._id,
                    full_name: isBlockedByMe ? targetUser.full_name : "User Unavailable",
                    username: isBlockedByMe ? targetUser.username : "unavailable",
                    profile_picture: isBlockedByMe
                        ? targetUser.profile_picture
                        : "/avatar-placeholder.png",
                    bio: null,
                    followers: [],
                    following: [],
                    isBlockedByMe,
                    isBlockedByTarget,
                },
                posts: [],
                connectionStatus: "none",
                hasMore: false,
            });
        }
    }

    // --- Connection Status ---
    let connectionStatus = "none";
    if (viewer) {
        if (viewerMongoId === targetUserIdStr) {
            connectionStatus = "self";
        } else if (viewer.connections?.some((id) => id.toString() === targetUserIdStr)) {
            connectionStatus = "connected";
        } else if (viewer.pendingRequests?.some((id) => id.toString() === targetUserIdStr)) {
            connectionStatus = "received";
        } else if (targetUser.pendingRequests?.some((id) => id.toString() === viewerMongoId)) {
            connectionStatus = "sent";
        }
    }

    // --- Follow Status ---
    let followStatus = "none";
    if (viewer && viewerMongoId !== targetUserIdStr) {
        if (viewer.following?.some((id) => id.toString() === targetUserIdStr)) {
            followStatus = "following";
        } else if (targetUser.followRequests?.some((id) => id.toString() === viewerMongoId)) {
            followStatus = "requested";
        }
    }

    // --- Active Stories ---
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const activeStories = await Story.find({
        user: targetUser._id,
        createdAt: { $gte: twentyFourHoursAgo },
    })
        .populate("user", "full_name username profile_picture isVerified")
        .lean();

    targetUser.stories = activeStories.map((story) => {
        if (!viewer) return { ...story, seen: false };
        const isSeen = story.viewers?.some((v) => {
            const viewerId = v.user ? v.user.toString() : v.toString();
            return viewerId === viewerMongoId;
        });
        return { ...story, seen: isSeen };
    });

    targetUser.hasActiveStory = activeStories.length > 0;

    // --- User Posts ---
    const isOwner = viewerMongoId === targetUserIdStr;
    let postQuery = { user: targetUser._id };

    if (!isOwner) {
        postQuery.$or = [{ isHidden: false }, { isHidden: { $exists: false } }];
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const posts = await Post.find(postQuery)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("user", "full_name username profile_picture isVerified isPrivate")
        .populate("comments.user", "full_name username profile_picture isVerified")
        .lean();

    res.status(200).json({
        success: true,
        user: { ...targetUser, isBlockedByMe: false, isBlockedByTarget: false },
        posts,
        connectionStatus,
        followStatus,
        hasMore: posts.length === limit,
    });
});

/**
 * @desc Get Saved Posts
 * @route GET /api/post/saved
 * @access Private
 */
export const getSavedPosts = expressAsyncHandler(async (req, res) => {
    const { userId } = req.auth();
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const currentUser = await User.findOne({ clerkId: userId });
    if (!currentUser) {
        res.status(404);
        throw new Error("User not found.");
    }

    const query = {
        saves: currentUser._id,
        $or: [{ isHidden: false }, { isHidden: { $exists: false } }],
    };

    let posts = await Post.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("user", "full_name username profile_picture isPrivate isVerified")
        .populate("comments.user", "full_name username profile_picture")
        .lean();

    // Consistent Story Injection Logic
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const userIdsInFeed = posts.map((p) => p.user._id);

    const activeStories = await Story.find({
        user: { $in: userIdsInFeed },
        createdAt: { $gte: twentyFourHoursAgo },
    }).lean();

    // Map optimized lookup
    const storiesMap = new Map();
    activeStories.forEach(story => {
        const uid = story.user.toString();
        if (!storiesMap.has(uid)) storiesMap.set(uid, []);
        storiesMap.get(uid).push(story);
    });

    posts = posts.map((post) => {
        const userStories = storiesMap.get(post.user._id.toString()) || [];
        const storiesWithSeenStatus = userStories.map((s) => ({
            ...s,
            seen: s.viewers
                ? s.viewers.some((v) => v.toString() === currentUser._id.toString())
                : false,
        }));

        return {
            ...post,
            user: {
                ...post.user,
                stories: storiesWithSeenStatus,
                hasActiveStory: userStories.length > 0,
            },
        };
    });

    const totalPosts = await Post.countDocuments(query);

    res.status(200).json({
        success: true,
        posts,
        currentPage: page,
        totalPages: Math.ceil(totalPosts / limit),
        hasMore: totalPosts > skip + posts.length,
    });
});
