// lib/email.js
import nodemailer from "nodemailer";
import { createVerificationUrl } from "./verificationCode.js";

// Create transporter
const transporter = nodemailer.createTransport({
  service: "gmail", // or your email service
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

/**
 * Send verification email
 * @param {string} email - User email
 * @param {string} token - Verification token
 * @param {string} name - User name
 */
export const sendVerificationEmail = async (email, token, name) => {
  const verificationUrl = createVerificationUrl(
    process.env.BASE_URL,
    token,
    "verify-email",
  );

  const mailOptions = {
    from: '"Your App" <noreply@yourapp.com>',
    to: email,
    subject: "Verify Your Email",
    html: `
      <h1>Hello ${name}!</h1>
      <p>Please verify your email by clicking the link below:</p>
      <a href="${verificationUrl}">Verify Email</a>
      <p>This link will expire in 24 hours.</p>
      <p>If you didn't create an account, ignore this email.</p>
    `,
  };

  await transporter.sendMail(mailOptions);
};

/**
 * Send password reset email
 */
export const sendPasswordResetEmail = async (email, token, name) => {
  const resetUrl = createVerificationUrl(
    process.env.BASE_URL,
    token,
    "reset-password",
  );

  const mailOptions = {
    from: '"Your App" <noreply@yourapp.com>',
    to: email,
    subject: "Reset Your Password",
    html: `
      <h1>Hello ${name}!</h1>
      <p>You requested to reset your password. Click below:</p>
      <a href="${resetUrl}">Reset Password</a>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this, ignore this email.</p>
    `,
  };

  await transporter.sendMail(mailOptions);
};
