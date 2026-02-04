const mongoose = require('mongoose');

const ploSchema = mongoose.Schema({
    code: { type: String, required: true, unique: true }, // e.g., PLO-1
    description: { type: String, required: true }
});

const cloSchema = mongoose.Schema({
    code: { type: String, required: true }, // e.g., CLO-1
    description: { type: String, required: true },
    plo: { type: mongoose.Schema.Types.ObjectId, ref: 'PLO' } // Mapping CLO to PLO
});

const studentSchema = mongoose.Schema({
    name: { type: String, required: true },
    regNo: { type: String, required: true, unique: true },
    batch: { type: String, required: true }
});

const courseSchema = mongoose.Schema({
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    creditHours: { type: Number, required: true },
    faculty: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Assigned Faculty
    clos: [{ type: mongoose.Schema.Types.ObjectId, ref: 'CLO' }], // Mapped CLOs for this course
    students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }] // Enrolled Students
});

const PLO = mongoose.model('PLO', ploSchema);
const CLO = mongoose.model('CLO', cloSchema);
const Student = mongoose.model('Student', studentSchema);
const Course = mongoose.model('Course', courseSchema);

module.exports = { PLO, CLO, Student, Course };
