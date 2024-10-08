const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('../db');

const User = sequelize.define('User', {
    username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    // add new field
    isAdmin: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      }
});

// เพิ่มความสัมพันธ์กับ Post
User.hasMany(Post, { foreignKey: 'userId', as: 'posts' });

module.exports = User;
