const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('lost_found_system', 'root', '', {
    host: 'localhost',
    dialect: 'mysql'
});

module.exports = sequelize;
