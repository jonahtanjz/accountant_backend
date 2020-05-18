var mysql = require('mysql');
var pool = mysql.createPool({
    connectionLimit : 100,
    host     : '127.0.0.1',
    user     : process.env.DB_USER,
    password : process.env.DB_PASS,
    database: 'accountant',
    multipleStatements: true
});


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

// For new trip
function addTrip(tripData, callback, error) {
    let sqlQuery = "INSERT INTO trips (trip_name, owner, ended) VALUES (?, ?, 0)"
    pool.query(sqlQuery, [tripData.tripName, tripData.user_id], function (err, result) {
        if (err) {
            console.error('error query: ' + err.stack);
            return error();
        }
        addUsers(tripData.users, result.insertId, () => true, () => false);
        addCurrency(tripData.currency, result.insertId, () => true, () => false);
        return callback(result.insertId);
    });
}

// Add new users to trip
function addUsers(users, trip_id, callback, error) {
    let sqlTemplate = "INSERT INTO user_trips (user_id, trip_id, name) VALUES (?, ?, ?);";
    let sqlQuery = "";
    let userData = [];
    for (let i = 0; i < users.length; i++) {
        sqlQuery = sqlQuery + sqlTemplate;
        pool.query("SELECT user_id FROM users WHERE username = ?", [users[i]], function (err, result) {
            if (err) {
                console.error('error query: ' + err.stack);
            }
            if (result.length === 0) {
                userData.push(null);
                userData.push(trip_id);
                userData.push(users[i]);
            } else {
                userData.push(result[0].user_id);
                userData.push(trip_id);
                userData.push(null);
            }

            if (i === users.length - 1) {
                pool.query(sqlQuery, userData, function (err, result) {
                    if (err) {
                        console.error('error query: ' + err.stack);
                        return error();
                    }
                    return callback();
                });
            }
        });
    }
}

function addCurrency(currency, trip_id, callback, error) {
    let sqlTemplate = "INSERT INTO currency (trip_id, name, value) VALUES (?, ?, ?);";
    let sqlQuery = "";
    let currencyData = [];
    for (let i = 0; i < currency.length; i++) {
        sqlQuery = sqlQuery + sqlTemplate;
        currencyData.push(trip_id);
        currencyData.push(currency[i][0]);
        currencyData.push(currency[i][1]);
    }
    pool.query(sqlQuery, currencyData, function (err, result) {
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
    addTrip
}