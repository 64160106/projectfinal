const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('lost_and_found', 'root', '', {
    host: 'localhost',
    dialect: 'mysql'
});

module.exports = sequelize;
