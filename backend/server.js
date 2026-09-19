const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');

if (process.env.NODE_ENV !== 'production') {
    dotenv.config();
}

// database connection
if (!process.env.MONGO_URI) {
    console.error('CRITICAL ERROR: MONGO_URI is not defined in environment variables.');
} else {
    connectDB().catch(err => console.error('Initial DB Connection Error:', err));
}

const app = express();

// Middleware
const corsOptions = {
    origin: [
        'https://obe-management-system.netlify.app',
        'http://localhost:3000',
        'http://localhost:5173',
        'http://127.0.0.1:5173'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));
app.use(express.json());

// Routes Placeholder
app.get('/', (req, res) => {
    res.send('OBE Management System API is running...');
});

console.log('Loading user routes...');
app.use('/api/users', require('./routes/userRoutes'));

console.log('Loading admin routes...');
const adminRoutes = require('./routes/adminRoutes');
console.log('Admin routes loaded, stack length:', adminRoutes.stack.length);
adminRoutes.stack.forEach((layer, i) => {
    if (layer.route) {
        console.log(`  ${i}: ${layer.route.path} - ${Object.keys(layer.route.methods).join(',')}`);
    }
});
app.use('/api/admin', adminRoutes);
app.use('/api/admin/catch-all', (req, res) => {
    res.json({ message: 'Catch-all route hit' });
});

console.log('Loading faculty routes...');
app.use('/api/faculty', require('./routes/facultyRoutes'));

console.log('Loading course assignment routes...');
app.use('/api/assignments', require('./routes/courseAssignmentRoutes'));
console.log('✅ All routes loaded successfully');

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});

module.exports = app;
