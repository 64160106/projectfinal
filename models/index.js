const User = require('./user');
const Post = require('./post');

User.hasMany(Post, { foreignKey: 'userId', as: 'posts' });
Post.belongsTo(User, { foreignKey: 'userId', as: 'user' });

module.exports = {
  User,
  Post
};