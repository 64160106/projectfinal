const sequelize = require('../db');
const { DataTypes } = require('sequelize');
const User = require('./user');

User.hasMany(Post, { foreignKey: 'userId', as: 'posts' });
Post.belongsTo(User, { foreignKey: 'userId', as: 'user' });

const Post = sequelize.define('Post', {
  item_description: {
    type: sequelize.Sequelize.STRING,
    allowNull: false
  },
  location: {
    type: sequelize.Sequelize.STRING,
    allowNull: false
  },
  found_time: {
    type: sequelize.Sequelize.DATE,
    allowNull: false
  },
  image: {
    type: sequelize.Sequelize.STRING,
    allowNull: true
  },
  post_type: {
    type: DataTypes.ENUM('Found', 'Lost'),
    allowNull: false
  },
  status: {
    type: sequelize.Sequelize.ENUM('Pending', 'Founded', 'Unreceived', 'Received'),
    defaultValue: function() {
      return this.post_type === 'Found' ? 'Pending' : 'Unreceived';
    }
  },
  contact_info: {  // เพิ่มฟิลด์นี้
    type: sequelize.Sequelize.STRING,
    allowNull: true
  }
});

Post.belongsTo(User, { foreignKey: 'userId', as: 'user' });

module.exports = {
  User,
  Post
};