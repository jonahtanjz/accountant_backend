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

        return addUsers(tripData.users, result.insertId, () => { 
                addCurrency(tripData.currency, result.insertId, () => callback(result.insertId), error);
            }, error);
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
                return error();
            }
            if (result.length === 0) {
                userData.push(null);
                userData.push(trip_id);
                userData.push(users[i]);
            } else {
                userData.push(result[0].user_id);
                userData.push(trip_id);
                userData.push(users[i]);
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

// Add currency to trip
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

// Get all trips from a user
function getTrips(userId, callback, error) {
    let sqlQuery = "SELECT trip_id FROM user_trips WHERE user_id = ?";
    pool.query(sqlQuery, [userId], function (err, result) {
        if (err) {
            console.error('error query: ' + err.stack);
            return error();
        }
        let sqlTemplate = "SELECT * FROM trips where trip_id = ?;";
        let sqlQuery = "";
        let tripIds = [];
        for (let i = 0; i < result.length; i++) {
            sqlQuery = sqlQuery + sqlTemplate;
            tripIds.push(result[i].trip_id);
        }
        pool.query(sqlQuery, tripIds, function (err, results) {
            if (err) {
                console.error('error query: ' + err.stack);
                return error();
            }
            return callback(results);
        }); 
    });
} 

// get individual trip info
function getTripInfo(tripId, callback, error) {
    let sqlQuery = "SELECT * FROM trips WHERE trip_id = ?;"
            + "SELECT name FROM user_trips WHERE trip_id = ?;" 
            + "SELECT name, value FROM currency WHERE trip_id = ?;";

    pool.query(sqlQuery, [tripId, tripId, tripId], function (err, results) {
        if (err) {
            console.error('error query: ' + err.stack);
            return error();
        }

        if (results[0].length === 0 || results[1].length === 0 || results[2].length === 0) {
            return error();
        }
        return callback(results);
    });
}

// add new transaction
function addTransaction(transactionData, callback, error) {
    let sqlTemplate = "INSERT INTO transactions (payer, payee, amount, description, currency, trip_id) "
            + "VALUES (?, ?, ?, ?, ?, ?);"
    let sqlQuery = "";
    let transactionQueryData = [];
    let payees = transactionData.payees;
    let payers = transactionData.payers;
    let payersCount = 0;
    let totalAmount = 0;
    let totalRatio = 0;

    for (let i = 0; i < payees.length; i++) {
        totalAmount = totalAmount + payees[i][1];
    }

    for (let i = 0; i < payers.length; i++) {
        totalRatio = totalRatio + payers[i][1];
    }

    payers = payers.map(payer => {
        let amount = (payer[1] / totalRatio) * totalAmount;
        return [payer[0], amount];
    });

    for (let i = 0; i < payees.length; i++) {
        while (payees[i][1] !== 0) {
            if (payers[payersCount][1] > payees[i][1]) {
                if (payees[i][0] !== payers[payersCount][0]) {
                    sqlQuery = sqlQuery + sqlTemplate;
                    transactionQueryData.push(payers[payersCount][0]);
                    transactionQueryData.push(payees[i][0]);
                    transactionQueryData.push(payees[i][1]);
                    transactionQueryData.push(transactionData.description);
                    transactionQueryData.push(transactionData.currency);
                    transactionQueryData.push(transactionData.trip_id);
                }
                payers[payersCount][1] = payers[payersCount][1] - payees[i][1];
                payees[i][1] = 0;
            } else {
                if (payees[i][0] !== payers[payersCount][0]) {
                    sqlQuery = sqlQuery + sqlTemplate;
                    transactionQueryData.push(payers[payersCount][0]);
                    transactionQueryData.push(payees[i][0]);
                    transactionQueryData.push(payers[payersCount][1]);
                    transactionQueryData.push(transactionData.description);
                    transactionQueryData.push(transactionData.currency);
                    transactionQueryData.push(transactionData.trip_id);
                }
                payees[i][1] = payees[i][1] - payers[payersCount][1];
                payersCount++;
            }
        }
    }

    pool.query(sqlQuery, transactionQueryData, function (err, result) {
        if (err) {
            console.error('error query: ' + err.stack);
            return error();
        }
        callback();
    });
}

function getLedger(tripId, callback, error) {
    let sqlQuery = "SELECT * FROM trips WHERE trip_id = ?;"
            + "SELECT name FROM user_trips WHERE trip_id = ?;"
            + "SELECT * FROM transactions WHERE trip_id = ?;" 
            + "SELECT name, value FROM currency WHERE trip_id = ?;";
    
    pool.query(sqlQuery, [tripId, tripId, tripId, tripId], function (err, results) {
        if (err) {
            console.error(err);
            error();
        }
        if (results[0].length === 0 || results[1].length === 0 || results[2].length === 0 || results[3].length === 0) {
            return error();
        }
        callback(results);
    });
}

module.exports = {
    validateSignin,
    userSignup,
    addTrip,
    addUsers, 
    addCurrency,
    getTrips,
    getTripInfo,
    addTransaction,
    getLedger
}