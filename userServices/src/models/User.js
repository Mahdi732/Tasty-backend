import mongoose from "mongoose";
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    refreshTokenHash: { type: String },
    refreshTokenId: { type: String },
    refreshTokenExpiresAt: { type: Date }
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.setRefreshToken = async function (token, tokenId, expiresAt) {
  const salt = await bcrypt.genSalt(12);
  this.refreshTokenHash = await bcrypt.hash(token, salt);
  this.refreshTokenId = tokenId;
  this.refreshTokenExpiresAt = expiresAt;
};

userSchema.methods.clearRefreshToken = function () {
  this.refreshTokenHash = undefined;
  this.refreshTokenId = undefined;
  this.refreshTokenExpiresAt = undefined;
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject({ versionKey: false });
  delete obj.password;
  delete obj.refreshTokenHash;
  delete obj.refreshTokenId;
  delete obj.refreshTokenExpiresAt;
  return obj;
};

export const User = mongoose.model("User", userSchema);
