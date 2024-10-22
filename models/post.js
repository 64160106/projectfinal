const { DataTypes } = require('sequelize');
const sequelize = require('../db');


const Post = sequelize.define('Post', {
  item_description: {
    type: DataTypes.STRING,
    allowNull: false
  },
  location: {
    type: DataTypes.STRING,
    allowNull: false
  },
  found_time: {
    type: DataTypes.DATE,
    allowNull: false
  },
  image: {
    type: DataTypes.STRING,
    allowNull: true
  },
  post_type: {
    type: DataTypes.ENUM('Found', 'Lost'),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('Pending', 'Founded', 'Unreceived', 'Received'),
    defaultValue: function() {
      return this.post_type === 'Found' ? 'Pending' : 'Unreceived';
    }
  },
  contact_info: {
    type: DataTypes.STRING,
    allowNull: true
  }
});

module.exports = Post;