var mysql = require('mysql');

// For login
function validateSignin(userData, callback) {
    var connection = mysql.createConnection({
        host     : '127.0.0.1',
        user     : process.env.DB_USER,
        password : process.env.DB_PASS,
        database: 'accountant'
    });

    connection.connect(function(err) {
        if (err) {
            console.error('error connecting: ' + err.stack);
            return;
        }

        connection.query("SELECT * FROM users WHERE username = \"" + userData.username + "\" AND password = \"" + userData.password + "\"", function (err, result, fields) {
            if (err) {
                console.error('error query: ' + err.stack);
                return;
            }
            connection.end();
            return callback(result);
        });
    });
}
// For signup
function userSignup(userData, callback, error) {
    var connection = mysql.createConnection({
        host     : '127.0.0.1',
        user     : process.env.DB_USER,
        password : process.env.DB_PASS,
        database: 'accountant'
    });

    connection.connect(function(err) {
        if (err) {
            console.error('error connecting: ' + err.stack);
            return;
        }

        connection.query("SELECT * FROM users WHERE username = \"" + userData.username + "\"", function (err, result, fields) {
            if (err) {
                console.error('error query: ' + err.stack);
                return;
            }

            if (result.length === 0) {
                connection.query("INSERT INTO users (username, password) VALUES (\"" + userData.username + "\", \"" + userData.password + "\")", function (err, result) {
                    if (err) throw err;
                    connection.query("SELECT * FROM users WHERE username = \"" + userData.username + "\" AND password = \"" + userData.password + "\"", function (err, result, fields) {
                        if (err) {
                            console.error('error query: ' + err.stack);
                            return;
                        }
                        connection.end();
                        return callback(result);
                    });
                });
            } else {
                connection.end();
                return error();
            }
        });

    });
}


module.exports = {
    validateSignin,
    userSignup
}