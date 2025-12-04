const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose");

const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  name: { type: String, default: "New User" },
  bio: { type: String, default: "" },
  language: { type: String, default: "English" },
  currency: { type: String, default: "INR" },

  avatar: {
    url: { type: String, default: "https://i.ibb.co/2FsfXqM/default-avatar.png" },
    filename: String
  },

  googleId: String,
  githubId: String
}, { timestamps: true });

userSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User", userSchema);
