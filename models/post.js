const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('../db');
const User = require('./user'); // นำเข้าโมเดล User

const Post = sequelize.define('Post', {
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    image: {
        type: DataTypes.STRING
    },
    location: {
        type: DataTypes.STRING,
        allowNull: false
    },
    date: {
        type: DataTypes.DATE,
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('found', 'lost'),
        allowNull: false
    },
    userId: {
        type: DataTypes.INTEGER,
        references: {
            model: User,
            key: 'id'
        }
    }
});

// สร้างความสัมพันธ์ระหว่าง Post และ User
Post.belongsTo(User, { foreignKey: 'userId', as: 'user' });

module.exports = Post;
