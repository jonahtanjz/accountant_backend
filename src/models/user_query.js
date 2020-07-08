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

function checkUsername(username, callback, error) {
    let sqlQuery = "SELECT user_id FROM users WHERE username = ?";
    pool.query(sqlQuery, [username], function (err, result) {
        if (err) {
            console.error('error query: ' + err.stack);
            return error();
        }
        return callback(result);
    });
}

function pushSubscribe(subscriptionObject, callback, error) {
    let sqlQuery = "SELECT user_id FROM push_subscriptions WHERE user_id = ?";
    pool.query(sqlQuery, [subscriptionObject.user_id], function (err, subscribed) {
        if (err) {
            console.error('error query: ' + err.stack);
            return error();
        }
        let sqlQuery;
        let sqlQueryData = [];
        if (subscribed.length === 0) {
            sqlQuery = "INSERT INTO push_subscriptions (user_id, pushSubscription) VALUES (?, ?)";
            sqlQueryData.push(subscriptionObject.user_id);
            sqlQueryData.push(JSON.stringify(subscriptionObject.pushSubscription));
        } else {
            sqlQuery = "UPDATE push_subscriptions SET pushSubscription = ?";
            sqlQueryData.push(JSON.stringify(subscriptionObject.pushSubscription));
        }

        pool.query(sqlQuery, sqlQueryData, function (err, result) {
            if (err) {
                console.error('error query: ' + err.stack);
                return error();
            }
            return callback();
        });
    });
}

function pushUnsubscribe(subscriptionObject, callback, error) {
    let sqlQuery = "DELETE FROM push_subscriptions WHERE user_id = ?";
    pool.query(sqlQuery, [subscriptionObject.user_id], function (err, result) {
        if (err) {
            console.error('error query: ' + err.stack);
            return error();
        }
        return callback();
    });
}

module.exports = {
    validateSignin,
    userSignup,
    changeUsername,
    changePassword,
    checkUsername,
    pushSubscribe,
    pushUnsubscribe
}

