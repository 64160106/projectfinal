const LocalStrategy = require('passport-local').Strategy;
const User = require('../models/user');

module.exports = function(passport) {
    passport.use(new LocalStrategy({ usernameField: 'username' }, (username, password, done) => {
        User.findOne({ where: { username } })
            .then(user => {
                if (!user) return done(null, false, { message: 'Incorrect username.' });
                if (!bcrypt.compareSync(password, user.password)) return done(null, false, { message: 'Incorrect password.' });
                return done(null, user);
            });
    }));

    passport.serializeUser((user, done) => {
        done(null, user.id);
    });

    passport.deserializeUser((id, done) => {
        User.findByPk(id).then(user => {
            done(null, user);
        });
    });
};
    