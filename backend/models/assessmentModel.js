const mongoose = require('mongoose');

const assessmentSchema = mongoose.Schema({
    title: { type: String, required: true }, // e.g., Quiz 1, Midterm
    type: {
        type: String,
        enum: ['Quiz', 'Assignment', 'Midterm', 'Final', 'Project'],
        required: true
    },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    totalMarks: { type: Number, required: true },
    questions: [{
        questionText: { type: String },
        maxMarks: { type: Number, required: true },
        clo: { type: mongoose.Schema.Types.ObjectId, ref: 'CLO' } // Mapping Question to CLO
    }]
}, { timestamps: true });

const resultSchema = mongoose.Schema({
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    assessment: { type: mongoose.Schema.Types.ObjectId, ref: 'Assessment', required: true },
    obtainedMarks: [{
        questionIndex: { type: Number, required: true }, // Index of the question in assessment.questions
        marks: { type: Number, required: true }
    }]
}, { timestamps: true });

const Assessment = mongoose.model('Assessment', assessmentSchema);
const Result = mongoose.model('Result', resultSchema);

module.exports = { Assessment, Result };
