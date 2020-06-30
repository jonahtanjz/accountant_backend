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

function changeUsername(userData, callback, error) {
    let sqlQuery = "UPDATE users SET username = ? WHERE user_id = ?;"
            + "UPDATE user_trips SET name = ? WHERE user_id = ?;";
    pool.query(sqlQuery, [userData.username, userData.user_id, userData.username, userData.user_id], function (err, result) {
        if (err) {
            console.error('error query: ' + err.stack);
            return error();
        }
        return callback();
    });
}

function changePassword(userData, callback, wrongPassword, error) {
    let sqlQuery = "SELECT password FROM users WHERE user_id = ?";
    pool.query(sqlQuery, [userData.user_id], function(err, result) {
        if (err) {
            console.error('error query: ' + err.stack);
            return error();
        }
        if (result.length !== 0 && bcrypt.compareSync(userData.currentPassword, result[0].password)) {
            let sqlQuery = "UPDATE users SET password = ? WHERE user_id = ?";
            const hash = bcrypt.hashSync(userData.newPassword, 10);
            pool.query(sqlQuery, [hash, userData.user_id], function (err, result) {
                if (err) {
                    console.error('error query: ' + err.stack);
                    return error();
                }
                return callback();
            });
        } else {
            return wrongPassword();
        }
    });
}

module.exports = {
    validateSignin,
    userSignup,
    changeUsername,
    changePassword
}

