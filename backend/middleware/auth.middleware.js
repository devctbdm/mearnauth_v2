import jwt from "jsonwebtoken";
import User from "../models/user.model.js"; // Assuming you have a User model

/**
 * Middleware to verify JWT token and authenticate users
 */
export const protect = async (req, res, next) => {
  try {
    let token;

    // Check for token in headers (Authorization: Bearer <token>)
    if (req.headers.authorization?.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }
    // Also check in cookies (if using cookie-based auth)
    else if (req.cookies?.token) {
      token = req.cookies.token;
    }

    // If no token found
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized to access this route. No token provided.",
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Find user and attach to request object (excluding password)
      const user = await User.findById(decoded.id).select("-password");

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "User not found with this token",
        });
      }

      // Attach user to request object
      req.user = user;
      next();
    } catch (error) {
      // Handle specific JWT errors
      if (error.name === "JsonWebTokenError") {
        return res.status(401).json({
          success: false,
          message: "Invalid token",
        });
      } else if (error.name === "TokenExpiredError") {
        return res.status(401).json({
          success: false,
          message: "Token expired",
        });
      } else {
        throw error;
      }
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Authentication error",
      error: error.message,
    });
  }
};

/**
 * Middleware to restrict access based on user roles
 * @param {...string} roles - Allowed roles (e.g., 'admin', 'user')
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    // Check if user exists (should be added by protect middleware)
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    // Check if user role is allowed
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role ${req.user.role} is not authorized to access this route`,
      });
    }

    next();
  };
};

/**
 * Optional authentication - doesn't require token but attaches user if present
 */
export const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization?.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select("-password");
        if (user) {
          req.user = user;
        }
      } catch (error) {
        // Silently fail - user remains unauthenticated
      }
    }

    next();
  } catch (error) {
    next(); // Continue even if optional auth fails
  }
};

/**
 * Generate JWT Token (helper function)
 */
export const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "30d",
  });
};

/**
 * Check if user owns resource or is admin
 * @param {Function} getResourceUserId - Function to extract userId from resource
 */
export const checkOwnership = (getResourceUserId) => {
  return async (req, res, next) => {
    try {
      // First ensure user is authenticated
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      // Admin can access anything
      if (req.user.role === "admin") {
        return next();
      }

      // Get the resource's owner ID
      const resourceUserId = await getResourceUserId(req);

      // Check if user owns the resource
      if (
        resourceUserId &&
        resourceUserId.toString() !== req.user._id.toString()
      ) {
        return res.status(403).json({
          success: false,
          message: "You don't have permission to access this resource",
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Error checking ownership",
        error: error.message,
      });
    }
  };
};

// Example usage in routes:
/*
import { protect, authorize, optionalAuth } from '../middleware/auth.middleware.js';

// Protected route - any authenticated user
router.get('/profile', protect, getProfile);

// Admin only route
router.delete('/users/:id', protect, authorize('admin'), deleteUser);

// Optional auth - attaches user if token exists
router.get('/posts', optionalAuth, getPosts);

// Ownership check
router.put('/posts/:id', protect, 
  checkOwnership(async (req) => {
    const post = await Post.findById(req.params.id);
    return post?.userId;
  }), 
  updatePost
);
*/
