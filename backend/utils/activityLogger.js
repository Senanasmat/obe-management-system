const Activity = require('../models/activityModel');

const logActivity = async ({ userId, action, details, targetType, targetId }) => {
    try {
        if (!userId) {
            console.warn('logActivity: missing userId, skipping');
            return;
        }
        await Activity.create({
            user: userId,
            action,
            details,
            targetType,
            targetId: targetId || undefined
        });
    } catch (err) {
        console.error(`[ActivityLogger] Failed to log "${action}":`, err.message);
    }
};

module.exports = logActivity;
