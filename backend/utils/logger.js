const Activity = require('../models/activityModel');


const logActivity = async (userId, action, details, targetType, targetId = null) => {
    try {
        await Activity.create({
            user: userId,
            action,
            details,
            targetType,
            targetId
        });
    } catch (error) {
        console.error('Error logging activity:', error);
    }
};

module.exports = { logActivity };
