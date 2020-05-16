var mysql = require('mysql');
var pool = mysql.createPool({
    connectionLimit : 100,
    host     : '127.0.0.1',
    user     : process.env.DB_USER,
    password : process.env.DB_PASS,
    database: 'accountant'
});


// For login
function validateSignin(userData, callback) {
    pool.query("SELECT * FROM users WHERE username = \"" + userData.username + "\" AND password = \"" + userData.password + "\"", function (err, result, fields) {
        if (err) {
            console.error('error query: ' + err.stack);
            return;
        }
        return callback(result);
    });
}

// For signup
function userSignup(userData, callback, error) {
    pool.query("SELECT * FROM users WHERE username = \"" + userData.username + "\"", function (err, result, fields) {
        if (err) {
            console.error('error query: ' + err.stack);
            return;
        }

        if (result.length === 0) {
            pool.query("INSERT INTO users (username, password) VALUES (\"" + userData.username + "\", \"" + userData.password + "\")", function (err, result) {
                if (err) {
                    console.error('error query: ' + err.stack);
                    return;
                }

                pool.query("SELECT * FROM users WHERE username = \"" + userData.username + "\" AND password = \"" + userData.password + "\"", function (err, result, fields) {
                    if (err) {
                        console.error('error query: ' + err.stack);
                        return;
                    }
                    return callback(result);
                });
            });
        } else {
            return error();
        }
    });
}


module.exports = {
    validateSignin,
    userSignup
}