/**
 * Global SSE Connection Registry.
 * Note: In a clustered environment (Kubernetes/PM2), use Redis for session management.
 */
export const connections = {};

/**
 * @desc Initialize Server-Sent Events (SSE) Stream
 * @route GET /api/message/stream/:userId
 * @access Public/Private
 */
export const sseController = (req, res) => {
    const { userId } = req.params;

    // 1. Establish SSE Headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // 2. Register Active Connection
    connections[userId] = res;

    // 3. Send Heartbeat/Handshake
    res.write(`data: ${JSON.stringify({ type: "connected" })}\n\n`);

    // 4. Cleanup on Client Disconnect
    req.on("close", () => {
        if (connections[userId] === res) {
            delete connections[userId];
        }
        console.log(`[SSE] Client ${userId} disconnected`);
    });
};
