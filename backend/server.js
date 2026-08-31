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
app.use(cors());
app.use(express.json());

// Routes Placeholder
app.get('/', (req, res) => {
    res.send('OBE Management System API is running...');
});

app.use('/api/users', require('./routes/userRoutes'));
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
app.use('/api/faculty', require('./routes/facultyRoutes'));
app.use('/api/assignments', require('./routes/courseAssignmentRoutes'));

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

module.exports = app;
