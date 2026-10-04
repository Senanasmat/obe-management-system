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

        academicTerm: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'AcademicTerm',
            required: true
        }
    },
    { timestamps: true }
);

courseAssignmentSchema.index(
    { faculty: 1, course: 1, academicTerm: 1 },
    { unique: true }
);

module.exports = mongoose.model(
    'CourseAssignment',
    courseAssignmentSchema
);