import expressAsyncHandler from "express-async-handler";
import { inngest } from "../../inngest/index.js";
import imagekit from "../../configs/imagekit.js";
import Story from "../../models/Story.js";
import User from "../../models/User.js";

/**
 * @desc Add a new story (Text or Media)
 * @route POST /api/story/add
 * @access Private
 */
export const addStory = expressAsyncHandler(async (req, res) => {
    const { userId: clerkId } = req.auth();
    const { content, type, backgroundColor, caption } = req.body;
    const file = req.file;

    const user = await User.findOne({ clerkId });
    if (!user) {
        res.status(404);
        throw new Error("User not found. Please sync account.");
    }

    if (type === "text" && (!content || content.trim().length === 0)) {
        res.status(400);
        throw new Error("Text story must have content.");
    }
    if (type !== "text" && !file) {
        res.status(400);
        throw new Error("Media file is required for image/video stories.");
    }

    let mediaUrl = "";

    if (file) {
        const uploadResponse = await imagekit.upload({
            file: file.buffer,
            fileName: file.originalname,
            folder: "/stories/",
        });

        let transformationOptions = [];
        if (file.mimetype.startsWith("image/")) {
            transformationOptions = [{ quality: "auto" }];
        }

        mediaUrl = imagekit.url({
            path: uploadResponse.filePath,
            transformation: transformationOptions,
        });
    }

    const story = await Story.create({
        user: user._id,
        content: content || "",
        image: mediaUrl,
        type: type || "text",
        background_color: backgroundColor,
        caption,
    });

    await inngest.send({
        name: "app/story.created",
        data: {
            storyId: story._id,
        },
    });

    res.status(201).json({
        success: true,
        message: "Story added successfully",
        story,
    });
});

/**
 * @desc Delete Story (Manual Deletion)
 * @route DELETE /api/story/:id
 * @access Private
 */
export const deleteStory = expressAsyncHandler(async (req, res) => {
    const { userId: clerkId } = req.auth();
    const { id } = req.params;

    const user = await User.findOne({ clerkId });
    if (!user) {
        res.status(404);
        throw new Error("User not found.");
    }

    const story = await Story.findById(id);
    if (!story) {
        res.status(404);
        throw new Error("Story not found.");
    }

    if (story.user.toString() !== user._id.toString()) {
        res.status(403);
        throw new Error("You are not authorized to delete this story.");
    }

    await Story.findByIdAndDelete(id);

    res.status(200).json({
        success: true,
        message: "Story deleted successfully.",
    });
});
