const mongoose = require('mongoose');
require('dotenv').config();

const fixCourseAssignmentIndex = async () => {
    try {
        console.log('🔄 Connecting to database...');
        await mongoose.connect(process.env.MONGO_URI);

        const CourseAssignment = require('../models/courseAssignmentModel');
        const collection = CourseAssignment.collection;

        console.log('🔍 Checking existing indexes...');
        const indexes = await collection.getIndexes();
        console.log('Current indexes:', indexes);

        // Drop old semester index if it exists
        try {
            await collection.dropIndex('faculty_1_course_1_semester_1');
            console.log('✅ Dropped old semester index');
        } catch (err) {
            console.log('ℹ️  No old semester index found:', err.message);
        }

        // Drop any index with semester in the name
        for (const indexName in indexes) {
            if (indexName.includes('semester')) {
                try {
                    await collection.dropIndex(indexName);
                    console.log(`✅ Dropped index: ${indexName}`);
                } catch (err) {
                    console.log(`ℹ️  Could not drop index ${indexName}: ${err.message}`);
                }
            }
        }

        // Create correct index
        await collection.createIndex(
            { faculty: 1, course: 1, academicTerm: 1 },
            { unique: true }
        );
        console.log('✅ Created correct academicTerm index');

        console.log('🎉 Migration complete!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    }
};

fixCourseAssignmentIndex();
