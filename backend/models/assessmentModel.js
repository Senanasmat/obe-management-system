const mongoose = require('mongoose');

const questionSchema = {
    questionName: { type: String, default: '' },
    questionText: { type: String, default: '' },
    maxMarks: { type: Number, required: true },
    obeWeight: { type: Number, default: 0 },
    complexity: { type: String, enum: ['Low', 'Medium', 'High', ''], default: '' },
    clo: { type: mongoose.Schema.Types.ObjectId, ref: 'CLO' },
    notForOBE: { type: Boolean, default: false }
};

// Shared schema — each model gets its own collection
const makeSchema = () => mongoose.Schema({
    title: { type: String, required: true },
    type: { type: String, required: true }, // kept for display/grouping on frontend
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    totalMarks: { type: Number, required: true },
    gpaWeight: { type: Number, default: 0 },
    activityNature: { type: String, default: 'None' },
    includeForGPA: { type: Boolean, default: true },
    date: { type: Date, default: Date.now },
    questions: [questionSchema]
}, { timestamps: true });

// Separate collections: quizzes, assignments, midterms, finals, projects
const Quiz       = mongoose.model('Quiz',       makeSchema());
const Assignment = mongoose.model('Assignment', makeSchema());
const Midterm    = mongoose.model('Midterm',    makeSchema());
const Final      = mongoose.model('Final',      makeSchema());
const Project    = mongoose.model('Project',    makeSchema());

const ALL_MODELS = [Quiz, Assignment, Midterm, Final, Project];

const getModelByType = (type) => {
    const map = { Quiz, Assignment, Midterm, Final, Project };
    return map[type] || null;
};

// Search every collection for a document by id
const findAssessmentById = async (id) => {
    for (const Model of ALL_MODELS) {
        const doc = await Model.findById(id).catch(() => null);
        if (doc) return { doc, Model };
    }
    return null;
};

// Result stays in its own collection; no ref needed since we search by id
const resultSchema = mongoose.Schema({
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    assessment: { type: mongoose.Schema.Types.ObjectId, required: true },
    obtainedMarks: [{
        questionIndex: { type: Number, required: true },
        marks: { type: Number, required: true }
    }]
}, { timestamps: true });

const Result = mongoose.model('Result', resultSchema);

module.exports = {
    Quiz, Assignment, Midterm, Final, Project,
    Result,
    ALL_MODELS,
    getModelByType,
    findAssessmentById,
};
