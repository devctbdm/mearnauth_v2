import { sendVerificationEmail } from "../lib/email.js";
import { generateEmailVerificationToken } from "../lib/verificationCode.js";
import User from "../models/user.model.js";

// @desc    Register user with email verification
export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if user exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    // Generate verification token
    const { token, expiresAt } = generateEmailVerificationToken();

    // Create user with verification token
    const user = new User({
      name,
      email,
      password, // Password will be hashed by the model
      verificationToken: token, // Store token
      verificationTokenExpires: expiresAt,
    });

    await user.save();

    // Send verification email
    await sendVerificationEmail(email, token, name);

    res.status(201).json({
      success: true,
      message: "Registration successful! Please verify your email.",
      data: user.toJSON(),
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      message: "Registration failed",
      error: error.message,
    });
  }
};

export const login = async (req, res) => {
  res.send("Login");
};

export const logout = async (req, res) => {
  res.send("Logout");
};
