const mongoose = require('mongoose');

const courseAssignmentSchema = mongoose.Schema(
    {
        faculty: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        course: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Course',
            required: true
        },
        semester: {
            type: String,
            required: true
        }
    },
    { timestamps: true }
);

// Prevent duplicate assignment (same faculty + course + semester)
courseAssignmentSchema.index(
    { faculty: 1, course: 1, semester: 1 },
    { unique: true }
);

module.exports = mongoose.model('CourseAssignment', courseAssignmentSchema);