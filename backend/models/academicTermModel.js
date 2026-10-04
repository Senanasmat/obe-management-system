const mongoose = require('mongoose');

const academicTermSchema = mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },

        season: {
            type: String,
            enum: ['Fall', 'Spring'],
            required: true
        },

        year: {
            type: Number,
            required: true
        }
    },
    { timestamps: true }
);

academicTermSchema.index(
    { season: 1, year: 1 },
    { unique: true }
);

module.exports = mongoose.model('AcademicTerm', academicTermSchema);