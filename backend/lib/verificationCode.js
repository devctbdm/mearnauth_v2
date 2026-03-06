// lib/verificationCode.js
import crypto from "crypto";

/**
 * Generate a random verification code
 * @param {number} length - Length of the code (default: 6)
 * @returns {string} - Numeric verification code
 */
export const generateVerificationCode = (length = 6) => {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return Math.floor(Math.random() * (max - min + 1) + min).toString();
};

/**
 * Generate a secure random token (for email verification, password reset)
 * @param {number} bytes - Number of bytes (default: 32)
 * @returns {string} - Hex token
 */
export const generateSecureToken = (bytes = 32) => {
  return crypto.randomBytes(bytes).toString("hex");
};

/**
 * Generate email verification token with expiry
 * @returns {Object} - { token, expiresAt }
 */
export const generateEmailVerificationToken = () => {
  const token = generateSecureToken();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours from now

  return {
    token,
    expiresAt,
  };
};

/**
 * Generate password reset token with expiry
 * @returns {Object} - { token, expiresAt }
 */
export const generatePasswordResetToken = () => {
  const token = generateSecureToken();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour from now

  return {
    token,
    expiresAt,
  };
};

/**
 * Verify if token is expired
 * @param {Date} expiryDate - Token expiry date
 * @returns {boolean} - True if expired
 */
export const isTokenExpired = (expiryDate) => {
  return new Date() > new Date(expiryDate);
};

/**
 * Generate a 6-digit SMS verification code
 * @returns {string} - 6-digit code
 */
export const generateSmsCode = () => {
  return generateVerificationCode(6);
};

/**
 * Hash a token for secure storage (optional, for extra security)
 * @param {string} token - Token to hash
 * @returns {string} - Hashed token
 */
export const hashToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

/**
 * Create verification URL for email
 * @param {string} baseUrl - Your app base URL
 * @param {string} token - Verification token
 * @param {string} type - 'verify-email' or 'reset-password'
 * @returns {string} - Full verification URL
 */
export const createVerificationUrl = (
  baseUrl,
  token,
  type = "verify-email",
) => {
  return `${baseUrl}/api/auth/${type}/${token}`;
};

/**
 * Generate expiry date
 * @param {number} hours - Hours until expiry
 * @returns {Date} - Expiry date
 */
export const generateExpiryDate = (hours = 24) => {
  const date = new Date();
  date.setHours(date.getHours() + hours);
  return date;
};
