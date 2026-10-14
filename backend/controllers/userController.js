const User = require('../models/userModel');
const generateToken = require('../utils/generateToken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const passwordResetEmailConfigured = () => Boolean(
    process.env.EMAIL_HOST &&
    process.env.EMAIL_PORT &&
    process.env.EMAIL_USER &&
    process.env.EMAIL_PASS &&
    process.env.EMAIL_FROM &&
    process.env.FRONTEND_URL
);

const findUserByEmail = email => User.findOne({
    email: { $regex: `^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' }
});

const sendPasswordResetEmail = async (email, resetUrl) => {
    const port = Number(process.env.EMAIL_PORT);
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port,
        secure: port === 465,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: email,
        subject: 'Reset your OBE Management System password',
        text: `We received a request to reset your password. Open this link within 30 minutes to choose a new password: ${resetUrl}\n\nIf you did not request this, you can ignore this email.`,
        html: `<p>We received a request to reset your OBE Management System password.</p><p><a href="${resetUrl}">Choose a new password</a></p><p>This link expires in 30 minutes. If you did not request a reset, you can ignore this email.</p>`
    });
};

const requestPasswordReset = async (req, res) => {
    if (!passwordResetEmailConfigured()) {
        return res.status(503).json({
            message: 'Password reset email is not configured. Please contact the system administrator.'
        });
    }

    const email = String(req.body.email || '').trim().toLowerCase();
    if (!email) {
        return res.status(400).json({ message: 'Email is required.' });
    }

    try {
        const user = await findUserByEmail(email);

        // Keep the response the same whether the address is registered or not.
        if (user) {
            const token = crypto.randomBytes(32).toString('hex');
            user.passwordResetTokenHash = crypto
                .createHash('sha256')
                .update(token)
                .digest('hex');
            user.passwordResetExpiresAt = new Date(Date.now() + 30 * 60 * 1000);
            await user.save();

            const resetUrl = new URL('/reset-password', process.env.FRONTEND_URL);
            resetUrl.searchParams.set('email', email);
            resetUrl.searchParams.set('token', token);

            try {
                await sendPasswordResetEmail(email, resetUrl.toString());
            } catch (mailError) {
                user.passwordResetTokenHash = undefined;
                user.passwordResetExpiresAt = undefined;
                await user.save();
                throw mailError;
            }
        }

        return res.json({
            message: 'If an account exists for that email, a password reset link has been sent.'
        });
    } catch (error) {
        console.error('Password reset email error:', error.message);
        return res.status(500).json({
            message: 'Could not send the password reset email. Please try again later.'
        });
    }
};

const resetPassword = async (req, res) => {
    const email = String(req.body.email || '').trim().toLowerCase();
    const { token, password } = req.body;

    if (!email || !token || typeof password !== 'string' || password.length < 8) {
        return res.status(400).json({
            message: 'A valid reset link and a password of at least 8 characters are required.'
        });
    }

    try {
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const user = await User.findOne({
            email: { $regex: `^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
            passwordResetTokenHash: tokenHash,
            passwordResetExpiresAt: { $gt: new Date() }
        }).select('+passwordResetTokenHash +passwordResetExpiresAt');

        if (!user) {
            return res.status(400).json({
                message: 'This password reset link is invalid or has expired. Request a new one.'
            });
        }

        user.password = password;
        user.passwordResetTokenHash = undefined;
        user.passwordResetExpiresAt = undefined;
        await user.save();

        return res.json({ message: 'Your password has been reset. You can now sign in.' });
    } catch (error) {
        console.error('Password reset error:', error.message);
        return res.status(500).json({ message: 'Could not reset the password. Please try again.' });
    }
};

// @desc    Auth user & get token
// @route   POST /api/users/login
// @access  Public
const authUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });

        if (user && (await user.matchPassword(password))) {
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                department: user.department,
                designation: user.designation,
                token: generateToken(user._id),
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ message: 'Server Error during login', error: error.message });
    }
};

// @desc    Register a new user (Admin/Faculty)
// @route   POST /api/users
// @access  Private/Admin
const registerUser = async (req, res) => {
    const { name, email, password, role } = req.body;

    const userExists = await User.findOne({ email });

    if (userExists) {
        res.status(400).json({ message: 'User already exists' });
        return;
    }

    const user = await User.create({
        name,
        email,
        password,
        role,
    });

    if (user) {
        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
        });
    } else {
        res.status(400).json({ message: 'Invalid user data' });
    }
};

module.exports = { authUser, registerUser, requestPasswordReset, resetPassword };
