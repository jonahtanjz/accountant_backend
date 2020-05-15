var mysql      = require('mysql');

var connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'username',
  password : 'password',
  database: "acountant"
});

function validateSignin(userData) {
    connection.connect(function(err) {
        if (err) {
            console.error('error connecting: ' + err.stack);
            return;
        }

        connection.query("SELECT * FROM users WHERE username = " + userData.username + "AND password = " + userData.password, function (err, result, fields) {
            if (err) throw err;
            connection.end();
            return result;
        });

    });
}

function userSignup(userData) {
    connection.connect(function(err) {
        if (err) {
            console.error('error connecting: ' + err.stack);
            return;
        }

        connection.query("INSERT INTO users (username, password) VALUES (" + userData.username + ", " + userData.password + ")", function (err, result) {
            if (err) throw err;
            connection.end();
            return true;
        });

    });
}


module.exports = {
    validateSignin,
    userSignup
}