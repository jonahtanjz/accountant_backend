require('dotenv').config();
 
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const utils = require('./utils');
const db = require('./db.js');
 
const app = express();
const port = process.env.PORT || 4000;

const errorMessage = res => {
  return res.status(401).json({
    error: true,
    message: "Oops! Something went wrong. Please try again."
  });
};
 
// enable CORS
app.use(cors());
// parse application/json
app.use(bodyParser.json());
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));

//middleware that checks if JWT token exists and verifies it if it does exist.
//In all future routes, this helps to know if the request is authenticated or not.
app.use(function (req, res, next) {
    // check header or url parameters or post parameters for token
    var token = req.headers['authorization'];
    if (!token) return next(); //if no token, continue
   
    token = token.replace('Bearer ', '');
    jwt.verify(token, process.env.JWT_SECRET, function (err, user) {
      if (err) {
        return res.status(401).json({
          error: true,
          message: "Invalid user."
        });
      } else {
        req.user = user; //set the user to req so other routes can use it
        next();
      }
    });
});

// request handlers
app.get('/api', (req, res) => {
    if (!req.user) return res.status(401).json({ success: false, message: 'Invalid user to access it.' });
    res.send('The Accountant Backend API - ' + req.user.name);
});

// validate the user credentials
app.post('/api/users/signin', (req, res) => {
    const userData = req.body;
    db.validateSignin(userData, user => {
    
      // return 401 status if the credential is not match.
      if (user === undefined || user.length === 0) {
        return res.status(401).json({
          error: true,
          message: "Username or Password is Wrong."
        });
      }
      
      // generate token
      const token = utils.generateToken(user[0]);
      // get basic user details
      const userObj = utils.getCleanUser(user[0]);
      // return the token along with user details
      return res.json({ user: userObj, token });
    }, () => errorMessage(res));
});

// create new user account
app.post('/api/users/signup', (req, res) => {
    const userData = req.body;
    db.userSignup(userData, user => {
      // generate token
      const token = utils.generateToken(user[0]);
      // get basic user details
      const userObj = utils.getCleanUser(user[0]);
      // return the token along with user details
      return res.json({ user: userObj, token });
    }, () => {
      return res.status(401).json({
        error: true,
        message: "Username already exists."
      });
    }, () => errorMessage(res));
});

// create new trip
app.post('/api/newtrip', (req, res) => {
    const tripData = req.body;
    db.addTrip(tripData, tripID => {
      return res.json({ trip_id: tripID });
    }, () => errorMessage(res));
});

// get all the trips of a user
app.get('/api/gettrips', function (req, res) {
    const userId = req.query.userid;
    if (userId) {
      db.getTrips(userId, tripsData => {
        return res.json({ trips: tripsData });
      }, () => errorMessage(res));
    } else {
      errorMessage(res);
    }
});

// get individual trip info
app.get('/api/gettripinfo', function (req, res) {
    const tripId = req.query.tripid;
    if (tripId) {
      db.getTripInfo(tripId, tripData => {
        return res.json({trip: tripData[0], users: tripData[1], currency: tripData[2]});
      }, () => errorMessage(res));
    } else {
      errorMessage(res);
    }
});

// add new transaction
app.post('/api/addtransaction', function (req, res) {
    const transactionData = req.body;
    db.addTransaction(transactionData, () => {
      return res.json({message: "Success"});
    }, () => errorMessage(res));
});

// get all transactions from trip
app.get('/api/getledger', function (req, res) {
    const tripId = req.query.tripid;
    if (tripId) {
      db.getLedger(tripId, tripData => {
        return res.json({ trip: tripData[0], users: tripData[1], transactions: tripData[2], currency: tripData[3] });
      }, () => errorMessage(res));
    } else {
      errorMessage(res);
    }
});

// verify the token and return it if it's valid
app.get('/api/verifyToken', function (req, res) {
    // check header or url parameters or post parameters for token
    var token = req.body.token || req.query.token;
    if (!token) {
      return res.status(400).json({
        error: true,
        message: "Token is required."
      });
    }
    // check token that was passed by decoding token using secret
    jwt.verify(token, process.env.JWT_SECRET, function (err, user) {
      if (err) return res.status(401).json({
        error: true,
        message: "Invalid token."
      });
   
      // return 401 status if the userId does not match.
      // if (user.user_id !== userData.userId) {
      //   return res.status(401).json({
      //     error: true,
      //     message: "Invalid user."
      //   });
      // }
      
      // get basic user details
      var userObj = utils.getCleanUser(user);
      return res.json({ user: userObj, token });
    });
});

app.listen(port, () => {
  console.log('Server started on: ' + port);
});