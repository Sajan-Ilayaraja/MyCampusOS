const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
      proxy: true,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        if (!profile.emails || profile.emails.length === 0) {
          return done(new Error('No email found in Google profile'), null);
        }

        const email = profile.emails[0].value.toLowerCase();
        let user = await User.findOne({ email });

        if (user) {
          console.log(`[Passport Google Strategy] User found: ${email}`);
          let modified = false;
          if (user.provider !== 'google') {
            user.provider = 'google';
            modified = true;
          }
          
          const googlePhoto = profile.photos && profile.photos[0] ? profile.photos[0].value : '';
          if (googlePhoto && !user.profileImage) {
            user.profileImage = googlePhoto;
            modified = true;
          }
          if (googlePhoto && !user.avatar) {
            user.avatar = googlePhoto;
            modified = true;
          }

          if (modified) {
            await user.save();
          }
          return done(null, user);
        }

        console.log(`[Passport Google Strategy] User not found. Creating Google user: ${email}`);
        const googlePhoto = profile.photos && profile.photos[0] ? profile.photos[0].value : '';
        user = await User.create({
          name: profile.displayName,
          email: email,
          profileImage: googlePhoto,
          avatar: googlePhoto,
          provider: 'google',
        });
        console.log(`[Passport Google Strategy] User created: ${email}`);

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

module.exports = passport;
