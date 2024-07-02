const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/userModel");
const dotenv = require("dotenv");
const bcrypt = require("bcrypt");
require("dotenv").config();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      // Here, use the profile info (mainly profile.id) to check if the user is registered in  db
      const existingUser = await User.findOne({ googleId: profile.id });
      if (existingUser) {
        // If user exists, proceed to login
        done(null, existingUser);
      } else {
        // If user doesn't exist, create a new user in your db
        const newUser = await User.create({
          name: profile.displayName,
          email: profile.emails[0].value,
          googleId: profile.id,
          // No need to store a password if logging in through Google
        });
        done(null, newUser);
      }
    }
  )
);

// Serialize user into the sessions
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from the sessions
passport.deserializeUser((id, done) => {
  User.findById(id).then((user) => {
    done(null, user);
  });
});
