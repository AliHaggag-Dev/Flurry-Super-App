import expressAsyncHandler from "express-async-handler";
import imagekit from "../../configs/imagekit.js";
import Post from "../../models/Post.js";
import User from "../../models/User.js";
import { populatePostData } from "./helpers.js";

/**
 * @desc Create New Post with Optional Images
 * @route POST /api/post/add
 * @access Private
 */
export const addPost = expressAsyncHandler(async (req, res) => {
    const { userId: clerkId } = req.auth();
    const { content, postType } = req.body;
    const files = req.files;

    // Retrieve Real User ID
    const user = await User.findOne({ clerkId });
    if (!user) {
        res.status(404);
        throw new Error("User not found via Clerk ID");
    }

    const hasContent = content && content.trim().length > 0;
    const hasFiles = files && files.length > 0;

    if (!hasContent && !hasFiles) {
        res.status(400);
        throw new Error("Post cannot be empty.");
    }

    // Handle Image Uploads
    let image_urls = [];
    if (hasFiles) {
        image_urls = await Promise.all(
            files.map(async (file) => {
                const response = await imagekit.upload({
                    file: file.buffer,
                    fileName: file.originalname,
                    folder: "posts",
                });
                return response.url;
            })
        );
    }

    const newPost = await Post.create({
        user: user._id,
        content: content || "",
        post_type: postType,
        image_urls,
    });

    const populatedPost = await populatePostData(newPost);

    res.status(201).json({
        success: true,
        message: "Post added successfully",
        post: populatedPost,
    });
});

/**
 * @desc Update Existing Post
 * @route PUT /api/post/:id
 * @access Private
 */
export const updatePost = expressAsyncHandler(async (req, res) => {
    const { userId } = req.auth();
    const { id } = req.params;
    const { content } = req.body;

    const currentUser = await User.findOne({ clerkId: userId });
    if (!currentUser) {
        res.status(401);
        throw new Error("User not found in database");
    }

    const post = await Post.findById(id);
    if (!post) {
        res.status(404);
        throw new Error("Post not found.");
    }

    // Authorization Check
    if (post.user.toString() !== currentUser._id.toString()) {
        res.status(403);
        throw new Error("You are not authorized to update this post.");
    }

    post.content = content || post.content;
    const updatedPost = await post.save();

    res.status(200).json({
        success: true,
        message: "Post updated successfully.",
        post: updatedPost,
    });
});

/**
 * @desc Delete Post
 * @route DELETE /api/post/:id
 * @access Private
 */
export const deletePost = expressAsyncHandler(async (req, res) => {
    const { userId } = req.auth();
    const { id } = req.params;

    const currentUser = await User.findOne({ clerkId: userId });
    if (!currentUser) {
        res.status(404);
        throw new Error("User not found.");
    }

    const post = await Post.findById(id);
    if (!post) {
        res.status(404);
        throw new Error("Post not found.");
    }

    if (post.user.toString() !== currentUser._id.toString()) {
        res.status(403);
        throw new Error("You are not authorized to delete this post.");
    }

    // Note: Consider deleting images from ImageKit here for full cleanup
    await Post.findByIdAndDelete(id);

    res.status(200).json({
        success: true,
        message: "Post deleted successfully.",
    });
});
