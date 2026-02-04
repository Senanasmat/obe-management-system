const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/userModel');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const importData = async () => {
    try {
        await User.deleteMany(); // Caution: Clears users

        const adminUser = await User.create({
            name: 'Super Admin',
            email: 'admin@obe.com',
            password: 'password123',
            role: 'admin',
        });

        const facultyUser = await User.create({
            name: 'Faculty Member',
            email: 'faculty@obe.com',
            password: 'password123',
            role: 'faculty',
        });

        console.log('Data Imported!');
        console.log(`Admin Info: admin@obe.com / password123`);
        console.log(`Faculty Info: faculty@obe.com / password123`);

        process.exit();
    } catch (error) {
        console.error(`${error}`);
        process.exit(1);
    }
};

importData();
