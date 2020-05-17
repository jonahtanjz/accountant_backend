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
                let sqlQuery = "CREATE TABLE userTrips_" + results[1][0].user_id + " (id INT(24) NOT NULL AUTO_INCREMENT, trip_id INT(24) NOT NULL, PRIMARY KEY (`id`))";
                pool.query(sqlQuery, function (err, result, fields) {
                    if (err) {
                        console.error('error query: ' + err.stack);
                        return error();
                    }
                    return callback(results[1]);
                });
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