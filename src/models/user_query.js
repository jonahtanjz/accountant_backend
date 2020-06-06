const pool = require('./db');
const bcrypt = require('bcrypt');

// For login
function validateSignin(userData, callback, error) {
    let sqlQuery = "SELECT * FROM users WHERE username = ?";
    pool.query(sqlQuery, [userData.username], function (err, result, fields) {
        if (err) {
            console.error('error query: ' + err.stack);
            return error();
        }
        if (bcrypt.compareSync(userData.password, result[0].password)) {
            return callback(result);
        } else {
            return callback();
        }
    });
}

// For signup
function userSignup(userData, callback, exists, error) {
    let sqlQuery = "SELECT * FROM users WHERE username = ?";
    pool.query(sqlQuery, [userData.username], function (err, result, fields) {
        if (err) {
            console.error('error query: ' + err.stack);
            return error();
        }

        if (result.length === 0) {
            let sqlQuery = "INSERT INTO users (username, password) VALUES (?, ?);"
                    + "SELECT * FROM users WHERE username = ? AND password = ?;";
            const hash = bcrypt.hashSync(userData.password, 10);        
            pool.query(sqlQuery, [userData.username, hash, userData.username, hash], function (err, results) {
                if (err) {
                    console.error('error query: ' + err.stack);
                    return error();
                }
                return callback(results[1]);
            });
        } else {
            return exists();
        }
    });
}

module.exports = {
    validateSignin,
    userSignup
}
