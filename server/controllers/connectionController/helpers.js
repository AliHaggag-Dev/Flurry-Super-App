import { io, getReceiverSocketId } from "../../socket/socket.js";
import sendEmail from "../../utils/sendEmail.js";

/**
 * Helper to emit socket notifications safely
 */
export const emitSocketNotification = (receiverId, event, data) => {
    const socketId = getReceiverSocketId(receiverId);
    if (socketId) {
        io.to(socketId).emit(event, data);
        console.log(`📡 Socket event [${event}] sent to UID: ${receiverId}`);
    }
};

/**
 * Helper to handle connection emails
 */
export const sendConnectionEmail = async (receiver, sender, type) => {
    if (!receiver.notificationSettings?.email) return;

    try {
        const profileUrl = `${process.env.CLIENT_URL}/profile/${sender.username}`;
        const subjects = {
            request: `New Connection Request from ${sender.full_name} 👥`,
            accept: `Connection Accepted: You are now connected with ${sender.full_name}! 🎉`
        };

        const htmlContent = type === 'request'
            ? `<h2>Hello ${receiver.full_name.split(" ")[0]}!</h2><p><strong>${sender.full_name}</strong> wants to connect with you on Flurry.</p><a href="${profileUrl}">View Profile</a>`
            : `<h2>Good News! 🥳</h2><p><strong>${sender.full_name}</strong> accepted your connection request.</p><a href="${profileUrl}">Visit Profile</a>`;

        sendEmail({
            to: receiver.email,
            subject: subjects[type],
            html: `<div style="font-family: Arial, sans-serif; padding: 20px;">${htmlContent}</div>`
        });
    } catch (error) {
        console.error("📧 Email dispatch failed:", error);
    }
};
