const pool = require('./db');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

// For login
function validateSignin(userData, callback, error) {
    let sqlQuery = "SELECT * FROM users WHERE username = ?";
    pool.query(sqlQuery, [userData.username], function (err, result, fields) {
        if (err) {
            console.error('error query: ' + err.stack);
            return error();
        }
        if (result.length !== 0 && bcrypt.compareSync(userData.password, result[0].password)) {
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
            let sqlQuery = "INSERT INTO users (user_id, username, password) VALUES (?, ?, ?);"
                    + "SELECT * FROM users WHERE username = ? AND password = ?;";
            const hash = bcrypt.hashSync(userData.password, 10);  
            let userId = uuidv4();      
            pool.query(sqlQuery, [userId, userData.username, hash, userData.username, hash], function (err, results) {
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

