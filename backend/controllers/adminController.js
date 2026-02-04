const { PLO, CLO, Course, Student } = require('../models/academicModels');
const { Assessment, Result } = require('../models/assessmentModel');
const User = require('../models/userModel');

// --- PLO Operations ---
const createPLO = async (req, res) => {
    try {
        const plo = await PLO.create(req.body);
        res.status(201).json(plo);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const getPLOs = async (req, res) => {
    try {
        const plos = await PLO.find({});
        res.json(plos);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const deletePLO = async (req, res) => {
    try {
        await PLO.findByIdAndDelete(req.params.id);
        res.json({ message: 'PLO removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// --- CLO Operations ---
const createCLO = async (req, res) => {
    try {
        const clo = await CLO.create(req.body);
        res.status(201).json(clo);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const getCLOs = async (req, res) => {
    try {
        const clos = await CLO.find({}).populate('plo');
        res.json(clos);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const deleteCLO = async (req, res) => {
    try {
        await CLO.findByIdAndDelete(req.params.id);
        res.json({ message: 'CLO removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// --- Course Operations ---
const createCourse = async (req, res) => {
    try {
        const course = await Course.create(req.body);
        res.status(201).json(course);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const getCourses = async (req, res) => {
    try {
        const courses = await Course.find({})
            .populate('faculty', 'name email')
            .populate('clos');
        res.json(courses);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const assignFaculty = async (req, res) => {
    const { courseId, facultyId } = req.body;
    try {
        const course = await Course.findById(courseId);
        if (course) {
            course.faculty = facultyId;
            await course.save();
            res.json(course);
        } else {
            res.status(404).json({ message: 'Course not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// --- Student Operations ---
const createStudent = async (req, res) => {
    try {
        const student = await Student.create(req.body);
        res.status(201).json(student);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const getStudents = async (req, res) => {
    try {
        const students = await Student.find({});
        res.json(students);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getDashboardStats = async (req, res) => {
    try {
        const totalStudents = await Student.countDocuments();
        const totalCourses = await Course.countDocuments();
        const totalPLOs = await PLO.countDocuments();

        const plos = await PLO.find({});
        const clos = await CLO.find({});

        // Calculate CLO Achievements
        const cloAchievements = await Promise.all(clos.map(async (clo) => {
            const assessments = await Assessment.find({ 'questions.clo': clo._id });
            let totalObtained = 0;
            let totalMax = 0;

            for (const assessment of assessments) {
                const results = await Result.find({ assessment: assessment._id });

                // Identify question indices for this CLO
                const cloQuestionIndices = assessment.questions
                    .map((q, idx) => q.clo?.toString() === clo._id.toString() ? idx : -1)
                    .filter(idx => idx !== -1);

                for (const result of results) {
                    for (const index of cloQuestionIndices) {
                        const markRecord = result.obtainedMarks.find(m => m.questionIndex === index);
                        if (markRecord) {
                            totalObtained += markRecord.marks;
                            totalMax += assessment.questions[index].maxMarks;
                        }
                    }
                }
            }

            return {
                code: clo.code,
                achievement: totalMax > 0 ? (totalObtained / totalMax) * 100 : 0
            };
        }));

        // Calculate PLO Achievements (Average of its CLOs)
        const ploAchievements = plos.map(plo => {
            const relatedClos = clos.filter(c => c.plo?.toString() === plo._id.toString());
            const relatedAchievements = cloAchievements.filter(ca =>
                relatedClos.some(rc => rc.code === ca.code)
            );

            const avgAchievement = relatedAchievements.length > 0
                ? relatedAchievements.reduce((acc, curr) => acc + curr.achievement, 0) / relatedAchievements.length
                : 0;

            return {
                code: plo.code,
                achievement: avgAchievement
            };
        });

        res.json({
            totalStudents,
            totalCourses,
            totalPLOs,
            cloAchievements,
            ploAchievements
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createPLO, getPLOs, deletePLO,
    createCLO, getCLOs, deleteCLO,
    createCourse, getCourses, assignFaculty,
    createStudent, getStudents,
    getDashboardStats
};
