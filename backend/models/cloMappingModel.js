const mongoose = require('mongoose');

const cloMappingSchema = new mongoose.Schema(
    {
        course: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Course',
            required: true
        },

        clo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'CLO',
            required: true
        },

        plo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'PLO',
            required: true
        },

        academicTerm: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'AcademicTerm',
            required: true
        },

        // Uses the same batch value stored on Student.batch
        batch: {
            type: String,
            required: true,
            trim: true
        },

        learningType: {
            type: String,
            default: 'Cognitive'
        },

        level: {
            type: String,
            default: ''
        },

        emphasisLevel: {
            type: String,
            default: ''
        }
    },
    { timestamps: true }
);

// Prevent duplicate mappings for the same course, CLO,
// PLO, academic term, and batch.
cloMappingSchema.index(
    {
        course: 1,
        clo: 1,
        plo: 1,
        academicTerm: 1,
        batch: 1
    },
    { unique: true }
);

module.exports = mongoose.model(
    'CLOMapping',
    cloMappingSchema
);
