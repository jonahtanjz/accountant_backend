const pool = require('./db');

// For login
function validateSignin(userData, callback, error) {
    let sqlQuery = "SELECT * FROM users WHERE username = ? AND password = ?";
    pool.query(sqlQuery, [userData.username, userData.password], function (err, result, fields) {
        if (err) {
            console.error('error query: ' + err.stack);
            return error();
        }
        return callback(result);
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
            pool.query(sqlQuery, [userData.username, userData.password, userData.username, userData.password], function (err, results) {
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

