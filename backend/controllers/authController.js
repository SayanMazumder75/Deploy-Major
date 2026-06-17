import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { sendOTPEmail } from "../utils/emailService.js";

// In-memory OTP store: { email: { otp, expiry, newEmail } }
const otpStore = {};
const passwordOtpStore = {};

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE || "7d",
    });
};

export const register = async (req, res, next) => {
    try {
        const { username, email, password } = req.body;
        const userExists = await User.findOne({ $or: [{ email }] });
        if (userExists) {
            const token = generateToken(userExists._id);
            return res.status(200).json({
                success: true,
                data: {
                    user: {
                        id: userExists._id,
                        username: userExists.username,
                        email: userExists.email,
                        profileImage: userExists.profileImage,
                        createdAt: userExists.createdAt
                    },
                    token
                },
                message: "User already exists, logged in"
            });
        }
        const user = await User.create({ username, email, password });
        const token = generateToken(user._id);
        res.status(201).json({
            success: true,
            data: {
                user: {
                    id: user._id,
                    username: user.username,
                    email: user.email,
                    profileImage: user.profileImage,
                    createdAt: user.createdAt,
                },
                token,
            },
            message: "User registered successfully",
        });
    } catch (error) {
        next(error);
    }
};

export const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: "Please provide email and password",
            });
        }
        const user = await User.findOne({ email }).select("+password");
        if (!user) {
            return res.status(401).json({ success: false, error: "Invalid credentials" });
        }
        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.status(401).json({ success: false, error: "Invalid credentials" });
        }
        const token = generateToken(user._id);
        res.status(200).json({
            success: true,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                profileImage: user.profileImage,
            },
            token,
            message: "Login successful",
        });
    } catch (error) {
        next(error);
    }
};

export const getProfile = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id);
        res.status(200).json({
            success: true,
            data: {
                id: user._id,
                username: user.username,
                email: user.email,
                profileImage: user.profileImage,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            },
        });
    } catch (error) {
        next(error);
    }
};

export const updateProfile = async (req, res, next) => {
    try {
        const { username, email, profileImage } = req.body;
        const user = await User.findById(req.user._id);
        if (username) user.username = username;
        if (email) user.email = email;
        if (profileImage) user.profileImage = profileImage;
        await user.save();
        res.status(200).json({
            success: true,
            data: {
                id: user._id,
                username: user.username,
                email: user.email,
                profileImage: user.profileImage,
            },
            message: "Profile updated successfully",
        });
    } catch (error) {
        next(error);
    }
};

export const changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, error: "Please provide current and new password" });
        }
        const user = await User.findById(req.user._id).select("+password");
        const isMatch = await user.matchPassword(currentPassword);
        if (!isMatch) {
            return res.status(401).json({ success: false, error: "Current password is incorrect" });
        }
        user.password = newPassword;
        await user.save();
        res.status(200).json({ success: true, message: "Password changed successfully" });
    } catch (error) {
        next(error);
    }
};

// @desc   Send OTP to new email
// @route  POST /api/auth/send-email-otp
// @access Private
export const sendEmailOTP = async (req, res, next) => {
    try {
        const { newEmail } = req.body;
        if (!newEmail) {
            return res.status(400).json({ success: false, error: "Please provide new email" });
        }

        // Check if email already taken
        const existing = await User.findOne({ email: newEmail });
        if (existing) {
            return res.status(400).json({ success: false, error: "Email already in use" });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiry = Date.now() + 10 * 60 * 1000; // 10 minutes

        // Store OTP
        otpStore[req.user._id.toString()] = { otp, expiry, newEmail };

        // Send email
        await sendOTPEmail(newEmail, otp);

        res.status(200).json({ success: true, message: "OTP sent to new email" });
    } catch (error) {
        next(error);
    }
};

// @desc   Verify OTP and update email
// @route  POST /api/auth/verify-email-otp
// @access Private
export const verifyEmailOTP = async (req, res, next) => {
    try {
        const { otp } = req.body;
        const userId = req.user._id.toString();
        const record = otpStore[userId];

        if (!record) {
            return res.status(400).json({ success: false, error: "No OTP requested. Please request a new one." });
        }
        if (Date.now() > record.expiry) {
            delete otpStore[userId];
            return res.status(400).json({ success: false, error: "OTP expired. Please request a new one." });
        }
        if (record.otp !== otp) {
            return res.status(400).json({ success: false, error: "Invalid OTP." });
        }

        // Update email
        const user = await User.findById(userId);
        user.email = record.newEmail;
        await user.save();

        delete otpStore[userId];

        res.status(200).json({ success: true, message: "Email updated successfully", data: { email: user.email } });
    } catch (error) {
        next(error);
    }
};

// @desc   Send OTP to current email for password change
// @route  POST /api/auth/send-password-otp
// @access Private
export const sendPasswordOTP = async (req, res, next) => {
    try {
        const { currentPassword } = req.body;

const user = await User.findById(
  req.user._id
).select("+password");

const isMatch =
  await user.matchPassword(
    currentPassword
  );

if (!isMatch) {
  return res.status(400).json({
    success: false,
    error:
      "Current password is incorrect",
  });
}

        if (!user) {
            return res.status(404).json({
                success: false,
                error: "User not found",
            });
        }

        // Generate OTP
        const otp = Math.floor(
            100000 + Math.random() * 900000
        ).toString();

        const expiry = Date.now() + 10 * 60 * 1000;

        passwordOtpStore[req.user._id.toString()] = {
            otp,
            expiry,
        };

        // Send OTP to current email
        await sendOTPEmail(user.email, otp);

        res.status(200).json({
            success: true,
            message: "OTP sent to your email",
        });

    } catch (error) {
        next(error);
    }
};

// @desc   Verify OTP and change password
// @route  POST /api/auth/verify-password-otp
// @access Private
export const verifyPasswordOTP = async (req, res, next) => {
    try {

        const { otp, newPassword } = req.body;

        const userId = req.user._id.toString();

        const record = passwordOtpStore[userId];

        if (!record) {
            return res.status(400).json({
                success: false,
                error: "No OTP requested",
            });
        }

        if (Date.now() > record.expiry) {
            delete passwordOtpStore[userId];

            return res.status(400).json({
                success: false,
                error: "OTP expired",
            });
        }

        if (record.otp !== otp) {
            return res.status(400).json({
                success: false,
                error: "Invalid OTP",
            });
        }

        const user = await User.findById(userId);

        user.password = newPassword;

        await user.save();

        delete passwordOtpStore[userId];

        res.status(200).json({
            success: true,
            message: "Password changed successfully",
        });

    } catch (error) {
        next(error);
    }
};

// In-memory store for forgot password OTPs
const forgotPasswordOtpStore = {};

// @desc   Send OTP to email for password reset (no login required)
// @route  POST /api/auth/forgot-password
// @access Public
export const forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;
        console.log('🔍 forgotPassword called with email:', email); // ← ADD

        if (!email) {
            return res.status(400).json({ success: false, error: "Please provide email" });
        }

        const user = await User.findOne({ email });
        console.log('👤 User found:', user ? 'YES' : 'NO'); // ← ADD

        if (!user) {
            return res.status(200).json({ success: true, message: "If that email exists, an OTP has been sent." });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiry = Date.now() + 10 * 60 * 1000;

        forgotPasswordOtpStore[email] = { otp, expiry, userId: user._id.toString() };

        console.log(`🔑 OTP for ${email}: ${otp}`); // ← ADD

        try {
            await sendOTPEmail(email, otp);
            console.log('✅ Email sent successfully'); // ← ADD
        } catch (emailError) {
            console.error('❌ Email send failed:', emailError.message); // ← ADD
        }

        res.status(200).json({ success: true, message: "OTP sent to your email" });
    } catch (error) {
        next(error);
    }
};

// @desc   Verify OTP and reset password
// @route  POST /api/auth/reset-password
// @access Public
export const resetPassword = async (req, res, next) => {
    try {
        const { email, otp, newPassword } = req.body;

        if (!email || !otp || !newPassword) {
            return res.status(400).json({ success: false, error: "Please provide email, OTP and new password" });
        }

        const record = forgotPasswordOtpStore[email];

        if (!record) {
            return res.status(400).json({ success: false, error: "No OTP requested. Please request a new one." });
        }
        if (Date.now() > record.expiry) {
            delete forgotPasswordOtpStore[email];
            return res.status(400).json({ success: false, error: "OTP expired. Please request a new one." });
        }
        if (record.otp !== otp) {
            return res.status(400).json({ success: false, error: "Invalid OTP." });
        }

        const user = await User.findById(record.userId);
        user.password = newPassword;
        await user.save();

        delete forgotPasswordOtpStore[email];

        res.status(200).json({ success: true, message: "Password reset successfully" });
    } catch (error) {
        next(error);
    }
};