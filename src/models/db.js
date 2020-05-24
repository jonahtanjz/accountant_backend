var mysql = require('mysql');

var pool = mysql.createPool({
    connectionLimit : 100,
    host     : '127.0.0.1',
    user     : process.env.DB_USER,
    password : process.env.DB_PASS,
    database: 'accountant',
    multipleStatements: true
});

module.exports = pool;