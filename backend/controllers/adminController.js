const { PLO, CLO, Course, Student } = require('../models/academicModels');
const CourseAssignment = require('../models/courseAssignmentModel');
const { parse } = require('csv-parse/sync');
const { Result, ALL_MODELS } = require('../models/assessmentModel');
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
            .populate('clos')
            .populate('students', 'name regNo batch');
        res.json(courses);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const enrollStudents = async (req, res) => {
    try {
        const { studentIds } = req.body;
        const course = await Course.findById(req.params.id);
        if (!course) return res.status(404).json({ message: 'Course not found' });
        course.students = studentIds || [];
        await course.save();
        await course.populate('students', 'name regNo batch');
        res.json(course);
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

const bulkImportStudents = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No CSV file uploaded.' });
        }

        const records = parse(req.file.buffer, {
            columns: true,
            skip_empty_lines: true,
            trim: true
        });

        if (!records.length) {
            return res.status(400).json({ message: 'CSV file is empty or invalid.' });
        }

        // Validate headers (case-insensitive)
        const required = ['name', 'regno', 'batch'];
        const headers = Object.keys(records[0]).map(h => h.toLowerCase().trim());
        for (const col of required) {
            if (!headers.includes(col)) {
                return res.status(400).json({ message: `Missing required column: "${col}". Expected columns: name, regNo, batch` });
            }
        }

        let inserted = 0;
        let skipped = 0;
        const errors = [];

        for (const row of records) {
            const name = row.name || row.Name;
            const regNo = row.regNo || row.RegNo || row.regno;
            const batch = row.batch || row.Batch;

            if (!name || !regNo || !batch) {
                errors.push(`Skipped row — missing data: ${JSON.stringify(row)}`);
                skipped++;
                continue;
            }

            const exists = await Student.findOne({ regNo });
            if (exists) {
                skipped++;
                continue;
            }

            await Student.create({ name, regNo, batch });
            inserted++;
        }

        res.status(201).json({
            message: `Import complete. ${inserted} student(s) added, ${skipped} skipped.`,
            inserted,
            skipped,
            errors
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getDashboardStats = async (req, res) => {
    try {
        const assessmentCounts = await Promise.all(ALL_MODELS.map(M => M.countDocuments()));
        const totalAssessments = assessmentCounts.reduce((s, n) => s + n, 0);

        const [totalStudents, totalCourses, totalPLOs, totalFaculty, totalCLOs] = await Promise.all([
            Student.countDocuments(),
            Course.countDocuments(),
            PLO.countDocuments(),
            User.countDocuments({ role: 'faculty' }),
            CLO.countDocuments(),
        ]);

        const plos = await PLO.find({});
        const clos = await CLO.find({});

        // Calculate CLO Achievements
        const cloAchievements = await Promise.all(clos.map(async (clo) => {
            const perModel = await Promise.all(ALL_MODELS.map(M => M.find({ 'questions.clos': clo._id  })));
            const assessments = perModel.flat();
            let totalObtained = 0;
            let totalMax = 0;

            for (const assessment of assessments) {
                const results = await Result.find({ assessment: assessment._id });

                // Identify question indices for this CLO
                const cloQuestionIndices = assessment.questions
                    .map((q, idx) =>
                        q.clos?.some(
                            cloId => cloId.toString() === clo._id.toString()
                        )
                            ? idx
                            : -1
                    )
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
            totalFaculty,
            totalCourses,
            totalPLOs,
            totalCLOs,
            totalAssessments,
            cloAchievements,
            ploAchievements
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getBatchPLOAchievements = async (req, res) => {
    try {
        const { batch } = req.query;

        if (!batch) {
            return res.status(400).json({
                message: 'Batch is required'
            });
        }

        // Get students from selected batch
        const students = await Student.find({ batch });

        if (!students.length) {
            return res.json({
                batch,
                ploAchievements: []
            });
        }

        const studentIds = students.map(student => student._id);

        const plos = await PLO.find({});
        const clos = await CLO.find({});

        // Get courses containing students from this batch
        const courses = await Course.find({
            students: { $in: studentIds }
        });

        const courseIds = courses.map(course => course._id);

        // Get all assessments belonging to those courses
        const assessmentResults = await Promise.all(
            ALL_MODELS.map(Model =>
                Model.find({
                    course: { $in: courseIds }
                })
            )
        );

        const assessments = assessmentResults.flat();

        const assessmentIds = assessments.map(a => a._id);

        // Get results only for students of selected batch
        const results = await Result.find({
            assessment: { $in: assessmentIds },
            student: { $in: studentIds }
        });

        // Calculate achievement for every CLO
        const cloAchievements = [];

        for (const clo of clos) {
            let totalObtained = 0;
            let totalMax = 0;

            const cloAssessments = assessments.filter(assessment =>
                assessment.questions.some(
                    question =>
                        question.clos?.some(
                            cloId => cloId.toString() === clo._id.toString()
                        )
                )
            );

            for (const assessment of cloAssessments) {
                const cloQuestionIndices = assessment.questions
                    .map((question, index) =>
                        question.clos?.some(
                            cloId => cloId.toString() === clo._id.toString()
                        )
                            ? index
                            : -1
                    )
                    .filter(index => index !== -1);

                const assessmentResults = results.filter(
                    result =>
                        result.assessment.toString() ===
                        assessment._id.toString()
                );

                for (const result of assessmentResults) {
                    for (const index of cloQuestionIndices) {
                        const markRecord = result.obtainedMarks.find(
                            mark => mark.questionIndex === index
                        );

                        if (markRecord) {
                            totalObtained += markRecord.marks;
                            totalMax += assessment.questions[index].maxMarks;
                        }
                    }
                }
            }

            cloAchievements.push({
                cloId: clo._id,
                code: clo.code,
                achievement:
                    totalMax > 0
                        ? (totalObtained / totalMax) * 100
                        : 0,
                plo: clo.plo
            });
        }

        // Calculate PLO achievement from its related CLOs
        const ploAchievements = plos.map(plo => {
            const relatedCLOs = cloAchievements.filter(
                clo =>
                    clo.plo &&
                    clo.plo.toString() === plo._id.toString()
            );

            const achievement =
                relatedCLOs.length > 0
                    ? relatedCLOs.reduce(
                        (sum, clo) => sum + clo.achievement,
                        0
                    ) / relatedCLOs.length
                    : 0;

            return {
                code: plo.code,
                achievement: Number(achievement.toFixed(2))
            };
        });

        res.json({
            batch,
            ploAchievements
        });

    } catch (error) {
        console.error('Batch PLO achievement error:', error);
        res.status(500).json({
            message: error.message
        });
    }
};


// --- Update / Delete wrappers for full CRUD ---

const updatePLO = async (req, res) => {
    try {
        const plo = await PLO.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(plo);
    } catch (error) { res.status(400).json({ message: error.message }); }
};

const updateCLO = async (req, res) => {
    try {
        const clo = await CLO.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(clo);
    } catch (error) { res.status(400).json({ message: error.message }); }
};

const updateCourse = async (req, res) => {
    try {
        const course = await Course.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(course);
    } catch (error) { res.status(400).json({ message: error.message }); }
};

const deleteCourse = async (req, res) => {
    try {
        await CourseAssignment.deleteMany({
            course: req.params.id
        });
        await Course.findByIdAndDelete(req.params.id);
        res.json({ message: 'Course and assignments removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateStudent = async (req, res) => {
    try {
        const student = await Student.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(student);
    } catch (error) { res.status(400).json({ message: error.message }); }
};

const deleteStudent = async (req, res) => {
    try {
        await Student.findByIdAndDelete(req.params.id);
        res.json({ message: 'Student removed' });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

// --- Faculty CRUD (via User model, role = 'faculty') ---
const getFaculty = async (req, res) => {
    try {
        const faculty = await User.find({ role: 'faculty' }).select('-password');
        res.json(faculty);
    } catch (error) { res.status(500).json({ message: error.message }); }
};

const createFacultyMember = async (req, res) => {
    try {
        const { name, email, password, department, designation } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email & Password required' });
        }

        const exists = await User.findOne({ email });
        if (exists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const user = await User.create({
            name,
            email: email || undefined,
            password,
            role: 'faculty',
            department,
            designation
        });

        res.status(201).json(user);

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const updateFacultyMember = async (req, res) => {
    try {
        const { name, email, password, role, department, designation } = req.body;

        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'Not found' });
        }

        if (name) user.name = name;
        if (email !== undefined) user.email = email || undefined;
        if (role) user.role = role;
        if (department) user.department = department;
        if (designation) user.designation = designation;

        if (password && password.trim() !== '') {
            user.password = password;
        }

        await user.save();

        res.json(user);

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const deleteFacultyMember = async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ message: 'Faculty member removed' });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

module.exports = {
    createPLO, getPLOs, updatePLO, deletePLO,
    createCLO, getCLOs, updateCLO, deleteCLO,
    createCourse, getCourses, updateCourse, deleteCourse, assignFaculty, enrollStudents,
    createStudent, getStudents, updateStudent, deleteStudent, bulkImportStudents,
    getFaculty, createFacultyMember, updateFacultyMember, deleteFacultyMember,
    getBatchPLOAchievements,
    getDashboardStats
};
