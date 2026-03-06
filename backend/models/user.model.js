import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true, // Remove whitespace
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true, // Store emails in lowercase
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Please fill a valid email address",
      ], // Email validation
    },
    password: {
      type: String,
      required: true,
      minlength: 6, // Minimum password length
      select: false, // Don't return password by default in queries
    },
    role: {
      type: String,
      enum: ["user", "admin", "moderator"],
      default: "user",
    },
    lastLogin: {
      type: Date,
      default: Date.now,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    verificationToken: String,
    verificationTokenExpires: Date,
    profilePicture: {
      type: String,
      default: "", // URL to default avatar
    },
    phoneNumber: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true, // For soft deletes
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true }, // Include virtuals when converting to JSON
    toObject: { virtuals: true },
  },
);

// Add indexes for frequently queried fields (email already has unique index)
userSchema.index({ resetPasswordToken: 1 });
userSchema.index({ verificationToken: 1 });
userSchema.index({ createdAt: -1 }); // For sorting by newest users

// Virtual for full profile URL (if you have a profile feature)
userSchema.virtual("profileUrl").get(function () {
  return `/users/${this._id}`;
});

// Pre-save middleware to hash password
userSchema.pre("save", async function (next) {
  // Only hash if password is modified
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to generate auth token (if using JWT)
userSchema.methods.generateAuthToken = function () {
  return jwt.sign(
    {
      id: this._id,
      email: this.email,
      role: this.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || "1d" },
  );
};

// Method to return user data without sensitive info
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  delete user.resetPasswordToken;
  delete user.resetPasswordExpires;
  delete user.verificationToken;
  delete user.verificationTokenExpires;
  delete user.__v;
  return user;
};

// Static method to find by email with case-insensitive search
userSchema.statics.findByEmail = function (email) {
  return this.findOne({ email: email.toLowerCase() });
};

// Static method to find verified users only
userSchema.statics.findVerified = function () {
  return this.find({ isVerified: true });
};

// Query middleware - automatically exclude inactive users unless specified
userSchema.pre(/^find/, function (next) {
  // Only apply if not explicitly wanting to include inactive
  if (!this.getQuery().includeInactive) {
    this.where({ isActive: { $ne: false } });
  }
  next();
});

export default mongoose.models.User || mongoose.model("User", userSchema);
