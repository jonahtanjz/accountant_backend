const express = require('express');
const jwt = require('jsonwebtoken');
const utils = require('../utils/utils');
const db = require('../models/user_query');

const router = express.Router();

const errorMessage = res => {
    return res.status(401).json({
      error: true,
      message: "Oops! Something went wrong. Please try again."
    });
};

// validate the user credentials
router.post('/signin', (req, res) => {
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
router.post('/signup', (req, res) => {
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

// verify the token and return it if it's valid
router.get('/verifyToken', function (req, res) {
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

router.post('/changeusername', function (req, res) {
    const userData = req.body;
    db.changeUsername(userData, () => {
      // generate token
      const token = utils.generateToken(userData);
      // get basic user details
      const userObj = utils.getCleanUser(userData);
      // return the token along with user details
      return res.json({ 
        message: "Success", 
        user: userObj, token 
      });
    }, () => errorMessage(res));
});

router.post('/changepassword', function (req, res) {
  const userData = req.body;
  db.changePassword(userData, () => {
    return res.json({message: "Success"});
  }, () => {
    return res.status(401).json({
      message: "Current password is wrong."
    });
  }, () => errorMessage(res));
});

router.post('/checkusername', function (req, res) {
  const username = req.body.username;
  db.checkUsername(username, status => {
    return res.json({
      exists: (status.length === 0 ? false : true)
    });
  }, () => errorMessage(res));
});

module.exports = router;