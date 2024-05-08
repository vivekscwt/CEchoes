// passport-setup.js

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const dotenv = require('dotenv');
dotenv.config({ path: './.env' });
// Configure the Google Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.MAIN_URL+'auth/google/callback'
}, (accessToken, refreshToken, profile, done) => {
    // This function is called when the user logs in successfully
    // You can use the `profile` object to access user data
    return done(null, profile);
}));

passport.use(
    new FacebookStrategy(
      {
        clientID: process.env.FB_CLIENT_ID,
        clientSecret: process.env.FB_CLIENT_SECRET,
        callbackURL: process.env.MAIN_URL+'auth/facebook/callback',
        profileFields: ['id', 'displayName', 'name', 'gender', 'email', 'picture.type(large)'],
      },
      (accessToken, refreshToken, profile, done) => {
        // You can save or retrieve user data from your database here.
        // For demo purposes, we'll just pass the profile to the done() function.
        return done(null, profile);
      }
    )
  );