/**
 * Calculates the timestamp for 24 hours ago.
 * @returns {Date}
 */
export const getTwentyFourHoursAgo = () => new Date(Date.now() - 24 * 60 * 60 * 1000);

/**
 * cleans the viewers array by removing nulls and duplicates.
 * @param {Array} viewers - The raw viewers array from the DB.
 * @returns {Array} Cleaned array of viewer objects.
 */
export const cleanViewersList = (viewers) => {
    if (!viewers || viewers.length === 0) return [];

    const uniqueViewers = [];
    const seenIds = new Set();

    for (const v of viewers) {
        if (!v || !v.user) continue;

        const vId = v.user.toString();
        if (!seenIds.has(vId)) {
            seenIds.add(vId);
            uniqueViewers.push(v);
        }
    }
    return uniqueViewers;
};
