const sequelize = require('../db');
const User = require('./user');

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
  status: {
    type: sequelize.Sequelize.ENUM('searching', 'found', 'unclaimed'),
    defaultValue: 'searching'
  },
  contact_info: {  // เพิ่มฟิลด์นี้
    type: sequelize.Sequelize.STRING,
    allowNull: true
  }
});

Post.belongsTo(User, { foreignKey: 'userId', as: 'user' });

module.exports = Post;