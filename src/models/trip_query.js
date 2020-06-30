const pool = require('./db');
const { v4: uuidv4 } = require('uuid');

// For new trip
function addTrip(tripData, callback, error) {
    let sqlQuery = "INSERT INTO trips (trip_id, trip_name, owner) VALUES (?, ?, ?)"
    let tripId = uuidv4();
    pool.query(sqlQuery, [tripId, tripData.tripName, tripData.user_id], function (err, result) {
        if (err) {
            console.error('error query: ' + err.stack);
            return error();
        }

        return addUsers(tripData.users, tripId, () => { 
                addCurrency(tripData.currency, tripId, () => callback(tripId), error);
            }, error);
    });
}

// Add new users to trip
function addUsers(users, trip_id, callback, error) {
    let sqlTemplate = "INSERT INTO user_trips (user_id, trip_id, name) VALUES (?, ?, ?);";
    let sqlQuery = "";
    let userData = [];
    function synchronousForLoop(i) {
        sqlQuery = sqlQuery + sqlTemplate;
        pool.query("SELECT user_id, username FROM users WHERE username = ?", [users[i]], function (err, result) {
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
                userData.push(result[0].username);
            }

            if (i === users.length - 1) {
                pool.query(sqlQuery, userData, function (err, result) {
                    if (err) {
                        console.error('error query: ' + err.stack);
                        return error();
                    }
                    return callback();
                });
            } else {
                return synchronousForLoop(i + 1);
            }
        });
    }
    synchronousForLoop(0);
}

// add one user to the trip
function addNewUser(userData, callback, error) {
    let sqlQuery = "SELECT id FROM user_trips WHERE trip_id = ? AND name = ?";
    pool.query(sqlQuery, [userData.trip_id, userData.username], function (err, result) {
        if (err) {
            console.error('error query: ' + err.stack);
            return error();
        }
        if (result.length === 0) {
            return addUsers([userData.username], userData.trip_id, callback, error);
        } else {
            let sqlQuery = "UPDATE user_trips SET in_trip = 1, deleted = 0 WHERE id = ?";
            pool.query(sqlQuery, [result[0].id], function (err, result) {
                if (err) {
                    console.error('error query: ' + err.stack);
                    return error();
                }
                return callback();
            });
        }
    });
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
    if (currency.length !== 0) {
        pool.query(sqlQuery, currencyData, function (err, result) {
            if (err) {
                console.error('error query: ' + err.stack);
                return error();
            }
            return callback();
        });
    } else {
        return callback();
    }
}

// add one new currency to the trip
function addNewCurrency(currencyData, callback, error) {
    let sqlQuery = "SELECT name FROM currency WHERE trip_id = ? AND name = ?";
    pool.query(sqlQuery, [currencyData.trip_id, currencyData.currency[0]], function (err, result) {
        if (err) {
            console.error('error query: ' + err.stack);
            return error();
        }
        if (result.length === 0) {
            return addCurrency([currencyData.currency], currencyData.trip_id, callback, error);
        } else {
            let sqlQuery = "UPDATE currency SET value = ?, in_trip = 1 WHERE trip_id = ? AND name = ?";
            pool.query(sqlQuery, [currencyData.currency[1], currencyData.trip_id, result[0].name], function (err, result) {
                if (err) {
                    console.error('error query: ' + err.stack);
                    return error();
                }
                return callback();
            });
        }
    });
}

// Get all trips from a user
function getTrips(userId, callback, error) {
    let sqlQuery = "SELECT trip_id, in_trip, deleted FROM user_trips WHERE user_id = ?";
    pool.query(sqlQuery, [userId], function (err, result) {
        if (err) {
            console.error('error query: ' + err.stack);
            return error();
        }
        if (result.length !== 0) { 
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
                if (results.length === 1) {
                    results[0].in_trip = result[0].in_trip; 
                    results[0].deleted = result[0].deleted; 
                    return callback([results]);
                } else {
                    for (let i = 0; i < results.length; i++) {
                        results[i][0].in_trip = result[i].in_trip;
                        results[i][0].deleted = result[i].deleted; 
                    }
                    return callback(results);
                }
            }); 
        } else {
            return callback(result);
        }
    });
} 

// get individual trip info
function getTripInfo(tripId, callback, error) {
    let sqlQuery = "SELECT * FROM trips WHERE trip_id = ?;"
            + "SELECT id, user_id, name, in_trip FROM user_trips WHERE trip_id = ?;" 
            + "SELECT name, value, in_trip FROM currency WHERE trip_id = ?;";

    pool.query(sqlQuery, [tripId, tripId, tripId], function (err, results) {
        if (err) {
            console.error('error query: ' + err.stack);
            return error();
        }

        if (results[0].length === 0 || results[1].length === 0) {
            return error();
        }
        return callback(results);
    });
}

// add new transaction
function addTransaction(transactionData, callback, error) {
    pool.query("SELECT user_id, name FROM user_trips WHERE trip_id = ?", [transactionData.trip_id], function(err, userData) {
        if (err) {
            console.error('error query: ' + err.stack);
            return error();
        }
        let userId = {};
        userData.forEach(user => {
            userId[user.name] = user.user_id; 
        })
        pool.query("INSERT into transaction_ids (trip_id) VALUES (?)", [transactionData.trip_id], function (err, result) {
            let sqlTemplate = "INSERT INTO transactions (payer_id, payer, payee_id, payee, amount, description, currency, trip_id, transaction_id) "
                    + "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);";
            let sqlTemplate2 = "INSERT INTO original_transactions (user_id, name, type, amount, description, currency, trip_id, transaction_id, equal) "
                    + "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);"         
            let sqlQuery = "";
            let transactionQueryData = [];
            let payees = transactionData.payees;
            let payers = transactionData.payers;
            let payersCount = 0;
            let totalAmount = 0;
            let totalRatio = 0;

            for (let i = 0; i < payees.length; i++) {
                totalAmount = totalAmount + payees[i][1];
                
                sqlQuery = sqlQuery + sqlTemplate2;
                
                if (userId[payees[i][0]] !== null) {
                    transactionQueryData.push(userId[payees[i][0]]);
                    transactionQueryData.push(null);
                } else {
                    transactionQueryData.push(null);
                    transactionQueryData.push(payees[i][0]);
                }
                transactionQueryData.push("payee");
                transactionQueryData.push(payees[i][1]);
                transactionQueryData.push(transactionData.description);
                transactionQueryData.push(transactionData.currency);
                transactionQueryData.push(transactionData.trip_id);
                transactionQueryData.push(result.insertId);
                transactionQueryData.push(transactionData.equal);
            }

            for (let i = 0; i < payers.length; i++) {
                totalRatio = totalRatio + payers[i][1];
                
                sqlQuery = sqlQuery + sqlTemplate2;
                
                if (userId[payers[i][0]] !== null) {
                    transactionQueryData.push(userId[payers[i][0]]);
                    transactionQueryData.push(null);
                } else {
                    transactionQueryData.push(null);
                    transactionQueryData.push(payers[i][0]);
                }
                transactionQueryData.push("payer");
                transactionQueryData.push(payers[i][1]);
                transactionQueryData.push(transactionData.description);
                transactionQueryData.push(transactionData.currency);
                transactionQueryData.push(transactionData.trip_id);
                transactionQueryData.push(result.insertId);
                transactionQueryData.push(transactionData.equal);
            }

            payers = payers.map(payer => {
                let amount = (payer[1] / totalRatio) * totalAmount;
                return [payer[0], amount];
            });

            for (let i = 0; i < payees.length; i++) {
                while (payees[i][1] > 0.005 && payersCount < payers.length) {
                    if (payers[payersCount][1] > payees[i][1]) {
                        if (payees[i][0] !== payers[payersCount][0]) {
                            sqlQuery = sqlQuery + sqlTemplate;
                            
                            if (userId[payers[payersCount][0]] !== null) {
                                transactionQueryData.push(userId[payers[payersCount][0]]);
                                transactionQueryData.push(null);
                            } else {
                                transactionQueryData.push(null);
                                transactionQueryData.push(payers[payersCount][0]);
                            }

                            if (userId[payees[i][0]] !== null) {
                                transactionQueryData.push(userId[payees[i][0]]);
                                transactionQueryData.push(null);
                            } else {
                                transactionQueryData.push(null);
                                transactionQueryData.push(payees[i][0]);
                            }
                            transactionQueryData.push(payees[i][1]);
                            transactionQueryData.push(transactionData.description);
                            transactionQueryData.push(transactionData.currency);
                            transactionQueryData.push(transactionData.trip_id);
                            transactionQueryData.push(result.insertId);
                        }
                        payers[payersCount][1] = payers[payersCount][1] - payees[i][1];
                        payees[i][1] = 0;
                    } else {
                        if (payees[i][0] !== payers[payersCount][0]) {
                            sqlQuery = sqlQuery + sqlTemplate;

                            if (userId[payers[payersCount][0]] !== null) {
                                transactionQueryData.push(userId[payers[payersCount][0]]);
                                transactionQueryData.push(null);
                            } else {
                                transactionQueryData.push(null);
                                transactionQueryData.push(payers[payersCount][0]);
                            }

                            if (userId[payees[i][0]] !== null) {
                                transactionQueryData.push(userId[payees[i][0]]);
                                transactionQueryData.push(null);
                            } else {
                                transactionQueryData.push(null);
                                transactionQueryData.push(payees[i][0]);
                            }
                            transactionQueryData.push(payers[payersCount][1]);
                            transactionQueryData.push(transactionData.description);
                            transactionQueryData.push(transactionData.currency);
                            transactionQueryData.push(transactionData.trip_id);
                            transactionQueryData.push(result.insertId);
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
                return callback();
            });
        });
    });
}

// get transactions from a trip
function getLedger(tripId, callback, error) {
    let sqlQuery = "SELECT * FROM trips WHERE trip_id = ?;"
            + "SELECT user_id, name FROM user_trips WHERE trip_id = ?;"
            + "SELECT * FROM transactions WHERE trip_id = ?;" 
            + "SELECT name, value FROM currency WHERE trip_id = ?;";
    
    pool.query(sqlQuery, [tripId, tripId, tripId, tripId], function (err, results) {
        if (err) {
            console.error('error query: ' + err.stack);
            return error();
        }
        if (results[0].length === 0 || results[1].length === 0) {
            return error();
        }

        let userId = {};
        results[1].forEach(user => {
            userId[user.user_id] = user.name; 
        });

        results[2].forEach(transaction => {
            if (transaction.payee === null) {
                transaction.payee = userId[transaction.payee_id];
            }
            if (transaction.payer === null) {
                transaction.payer = userId[transaction.payer_id];
            }
        });
        return callback(results);
    });
}

// edit trip data
function editTrip(tripData, callback, error) {
    let sqlQuery = "UPDATE trips SET trip_name = ? WHERE trip_id = ?";
    pool.query(sqlQuery, [tripData.tripName, tripData.trip_id], function (err, result) {
        if (err) {
            console.error('error query: ' + err.stack);
            return error();
        } 
        return callback();
    });
}

// edit user's name in a trip
function editTripUser(userData, callback, error) {
    let sqlQuery = "SELECT user_id, name FROM user_trips WHERE id = ?;" 
            + "SELECT user_id, username FROM users WHERE username = ?;"
            + "SELECT id FROM user_trips WHERE trip_id = ? AND name = ?;";
    pool.query(sqlQuery, [userData.id, userData.newUsername, userData.trip_id, userData.newUsername], function (err, results) {
        if (err) {
            console.error('error query: ' + err.stack);
            return error();
        }

        let sqlQuery = "";
        let userQueryData = [];

        if (results[2].length === 0) {
            sqlQuery = sqlQuery + "UPDATE user_trips SET user_id = ?, name = ? WHERE id = ?;";

            if (results[1].length === 0) {
                userQueryData.push(null);
                userQueryData.push(userData.newUsername);
            } else {
                userQueryData.push(results[1][0].user_id);
                userQueryData.push(results[1][0].username);
            }
            userQueryData.push(userData.id);
        } else {
            sqlQuery = sqlQuery + "UPDATE user_trips SET in_trip = 1 WHERE id = ?;"
                    + "UPDATE user_trips SET in_trip = 0 WHERE id = ?;";
            userQueryData.push(results[2][0].id);
            userQueryData.push(userData.id);        
        }

        sqlQuery = sqlQuery + "UPDATE transactions " 
                + "SET " + (results[1].length === 0 ? "payee" : "payee_id") + " = CASE " + (results[0][0].user_id === null ? "payee" : "payee_id") + " WHEN ? THEN ? ELSE " + (results[1].length === 0 ? "payee" : "payee_id") + " END, "
                + (results[1].length === 0 ? "payer" : "payer_id") + " = CASE " + (results[0][0].user_id === null ? "payer" : "payer_id") + " WHEN ? THEN ? ELSE " + (results[1].length === 0 ? "payer" : "payer_id") + " END, "
                + (results[1].length === 0 ? "payee_id" : "payee") + " = CASE " + (results[1].length === 0 ? "payee_id" : "payee") + " WHEN ? THEN NULL ELSE " + (results[1].length === 0 ? "payee_id" : "payee") + " END, "
                + (results[1].length === 0 ? "payer_id" : "payer") + " = CASE " + (results[1].length === 0 ? "payer_id" : "payer") + " WHEN ? THEN NULL ELSE " + (results[1].length === 0 ? "payer_id" : "payer") + " END "
                + "WHERE " + (results[0][0].user_id === null ? "(? IN (payee, payer))" : "(? IN (payee_id, payer_id))") + " AND trip_id = ?;"
                + "UPDATE original_transactions SET " + (results[1].length === 0 ? "user_id = NULL, name = ? " : "user_id = ?, name = NULL ") 
                + "WHERE " + (results[0][0].user_id === null ? "name" : "user_id") + " = ? AND trip_id = ?;";

        results[0][0].user_id === null ? userQueryData.push(results[0][0].name) : userQueryData.push(results[0][0].user_id);
        results[1].length === 0 ? userQueryData.push(userData.newUsername) : userQueryData.push(results[1][0].user_id);
        results[0][0].user_id === null ? userQueryData.push(results[0][0].name) : userQueryData.push(results[0][0].user_id);
        results[1].length === 0 ? userQueryData.push(userData.newUsername) : userQueryData.push(results[1][0].user_id);
        results[0][0].user_id === null ? userQueryData.push(results[0][0].name) : userQueryData.push(results[0][0].user_id);
        results[0][0].user_id === null ? userQueryData.push(results[0][0].name) : userQueryData.push(results[0][0].user_id);
        results[0][0].user_id === null ? userQueryData.push(results[0][0].name) : userQueryData.push(results[0][0].user_id);
        userQueryData.push(userData.trip_id);
        results[1].length === 0 ? userQueryData.push(userData.newUsername) : userQueryData.push(results[1][0].user_id);
        results[0][0].user_id === null ? userQueryData.push(results[0][0].name) : userQueryData.push(results[0][0].user_id);
        userQueryData.push(userData.trip_id);     

        pool.query(sqlQuery, userQueryData, function (err, result) {
            if (err) {
                console.error('error query: ' + err.stack);
                return error();
            } 
            return callback();
        });

    });
}

// remove user from trip
function removeUser(userData, callback, error) {
    let sqlQuery = "UPDATE user_trips SET in_trip = 0 WHERE id = ?";
    pool.query(sqlQuery, [userData.id], function (err, result) {
        if (err) {
            console.error('error query: ' + err.stack);
            return error();
        } 
        return callback();
    });
}

// edit currency name and value from a trip
function editTripCurrency(currencyData, callback, error) {
    let sqlQuery = "SELECT name FROM currency WHERE trip_id = ? AND name = ?";
    pool.query(sqlQuery, [currencyData.trip_id, currencyData.newName], function (err, result) {
        if (err) {
            console.error('error query: ' + err.stack);
            return error();
        } 

        let sqlQuery = "";
        let currencyQueryData = [];
        if (result.length === 0) {
            sqlQuery = sqlQuery + "UPDATE currency SET name = ?, value = ? WHERE trip_id = ? AND name = ?;";
            currencyQueryData = [currencyData.newName, currencyData.newValue, currencyData.trip_id,
                    currencyData.originalName];
        } else {
            sqlQuery = sqlQuery + "UPDATE currency SET in_trip = 0 WHERE trip_id = ? AND name = ?;"
                    + "UPDATE currency SET in_trip = 1, value = ? WHERE trip_id = ? AND name = ?;";
            currencyQueryData = [currencyData.trip_id, currencyData.originalName, currencyData.newValue, 
                    currencyData.trip_id, currencyData.newName];
        }

        sqlQuery = sqlQuery + "UPDATE transactions SET currency = ? WHERE currency = ? AND trip_id = ?;"
                + "UPDATE original_transactions SET currency = ? WHERE currency = ? AND trip_id = ?;";

        currencyQueryData.push(currencyData.newName);
        currencyQueryData.push(currencyData.originalName);
        currencyQueryData.push(currencyData.trip_id);
        currencyQueryData.push(currencyData.newName);
        currencyQueryData.push(currencyData.originalName);
        currencyQueryData.push(currencyData.trip_id);

        pool.query(sqlQuery, currencyQueryData, function (err, result) {
            if (err) {
                console.error('error query: ' + err.stack);
                return error();
            }
            return callback();
        });    
    });    
}

// remove a currency from a trip 
function removeCurrency(currencyData, callback, error) {
    let sqlQuery = "UPDATE currency SET in_trip = 0 WHERE trip_id = ? AND name = ?";
    pool.query(sqlQuery, [currencyData.trip_id, currencyData.name], function (err, result) {
        if (err) {
            console.error('error query: ' + err.stack);
            return error();
        }
        return callback();
    })
}

// end a trip
function endTrip(userData, callback, error) {
    let sqlQuery = "UPDATE trips SET ended = 1 WHERE trip_id = ?";
    pool.query(sqlQuery, [userData.trip_id], function (err, result) {
        if (err) {
            console.error('error query: ' + err.stack);
            return error();
        }
        return callback(userData.user_id);
    });
}

// undo end trip
function undoEndTrip(userData, callback, error) {
    let sqlQuery = "UPDATE trips SET ended = 0 WHERE trip_id = ?";
    pool.query(sqlQuery, [userData.trip_id], function (err, result) {
        if (err) {
            console.error('error query: ' + err.stack);
            return error();
        }
        return callback(userData.user_id);
    });
}

function getTransaction(tripData, callback, error) {
    let sqlQuery = "SELECT * FROM trips WHERE trip_id = ?;"
            + "SELECT id, user_id, name, in_trip FROM user_trips WHERE trip_id = ?;"
            + "SELECT * FROM original_transactions WHERE transaction_id = ?;" 
            + "SELECT name, value, in_trip FROM currency WHERE trip_id = ?;";
    pool.query(sqlQuery, [tripData.trip_id, tripData.trip_id, tripData.transactionid, tripData.trip_id], function (err, results) {
        if (err) {
            console.error('error query: ' + err.stack);
            return error();
        }

        let userId = {};
        results[1].forEach(user => {
            userId[user.user_id] = user.name; 
        });

        results[2].forEach(transaction => {
            if (transaction.name === null) {
                transaction.name = userId[transaction.user_id];
            }
        });

        return callback(results);
    });
}

function editTransaction(transactionData, callback, error) {
    let sqlQuery = "DELETE FROM transaction_ids WHERE id = ?";
    pool.query(sqlQuery, [transactionData.transaction_id], function (err, result) {
        if (err) {
            console.error('error query: ' + err.stack);
            return error();
        }
        return addTransaction(transactionData, callback, error);
    });
}

function deleteTransaction(transactionData, callback, error) {
    let sqlQuery = "DELETE FROM transaction_ids WHERE id = ?";
    pool.query(sqlQuery, [transactionData.transaction_id], function (err, result) {
        if (err) {
            console.error('error query: ' + err.stack);
            return error();
        }
        return callback();
    });
}

function deleteTrip(userData, callback, error) {
    let sqlQuery = "UPDATE user_trips SET in_trip = 0, deleted = 1 WHERE user_id = ? AND trip_id = ?";
    pool.query(sqlQuery, [userData.user_id, userData.trip_id], function (err, result) {
        if (err) {
            console.error('error query: ' + err.stack);
            return error();
        }
        return callback(userData.user_id);
    });
}

function deleteTripForAll(tripData, callback, error) {
    let sqlQuery = "DELETE FROM trips WHERE trip_id = ?";
    pool.query(sqlQuery, [tripData.trip_id], function (err, result) {
        if (err) {
            console.error('error query: ' + err.stack);
            return error();
        }
        return callback(tripData.user_id);
    });
}

module.exports = {
    addTrip,
    addUsers, 
    addCurrency,
    getTrips,
    getTripInfo,
    addTransaction,
    getLedger,
    editTrip,
    editTripUser,
    removeUser,
    addNewUser,
    addNewCurrency,
    editTripCurrency,
    removeCurrency,
    endTrip,
    undoEndTrip,
    getTransaction,
    editTransaction,
    deleteTransaction,
    deleteTrip,
    deleteTripForAll
}