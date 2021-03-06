const express = require('express');
const db = require('../models/trip_query');
const wp = require('../models/notification');

const router = express.Router();

const errorMessage = res => {
    return res.status(401).json({
      error: true,
      message: "Oops! Something went wrong. Please try again."
    });
};

// create new trip
router.post('/newtrip', (req, res) => {
    const tripData = req.body;
    db.addTrip(tripData, (tripID, users) => {
      wp.pushNotification(users, "You have been added to the trip, " + tripData.tripName + ".");
      return res.json({ trip_id: tripID });
    }, () => errorMessage(res));
});

// get all the trips of a user
router.get('/gettrips', function (req, res) {
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
router.get('/gettripinfo', function (req, res) {
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
router.post('/addtransaction', function (req, res) {
    const transactionData = req.body;
    db.addTransaction(transactionData, () => {
      return res.json({message: "Success"});
    }, () => errorMessage(res));
});

// get all transactions from trip
router.get('/getledger', function (req, res) {
    const tripId = req.query.tripid;
    if (tripId) {
      db.getLedger(tripId, tripData => {
        return res.json({ trip: tripData[0], users: tripData[1], transactions: tripData[2], currency: tripData[3] });
      }, () => errorMessage(res));
    } else {
      errorMessage(res);
    }
});

// edit trip name
router.post('/edittrip', function (req, res) {
    const tripData = req.body;
    db.editTrip(tripData, () => {
      return db.getTripInfo(tripData.trip_id, tripData => {
        return res.json({trip: tripData[0], users: tripData[1], currency: tripData[2]});
      }, () => errorMessage(res));
    }, () => errorMessage(res));
});

// edit user's name in a trip
router.post('/edittripuser', function (req, res) {
  const userData = req.body;
  db.editTripUser(userData, (user) => {
    wp.pushNotification(user, "You have been added to a trip.");
    return db.getTripInfo(userData.trip_id, tripData => {
      return res.json({trip: tripData[0], users: tripData[1], currency: tripData[2]});
    }, () => errorMessage(res));
  }, () => errorMessage(res));
});

// add one user to trip
router.post('/adduser', function (req, res) {
  const userData = req.body;
  db.addNewUser(userData, (user) => {
    wp.pushNotification(user, "You have been added to a trip.");
    return db.getTripInfo(userData.trip_id, tripData => {
      return res.json({trip: tripData[0], users: tripData[1], currency: tripData[2]});
    }, () => errorMessage(res));
  }, () => errorMessage(res));
});

// remove user from trip
router.post('/removeuser', function (req, res) {
  const userData = req.body;
  db.removeUser(userData, () => {
    return db.getTripInfo(userData.trip_id, tripData => {
      return res.json({trip: tripData[0], users: tripData[1], currency: tripData[2]});
    }, () => errorMessage(res));
  }, () => errorMessage(res));
});

// edit currency in a trip
router.post('/edittripcurrency', function (req, res) {
  const currencyData = req.body;
  db.editTripCurrency(currencyData, () => {
    return db.getTripInfo(currencyData.trip_id, tripData => {
      return res.json({trip: tripData[0], users: tripData[1], currency: tripData[2]});
    }, () => errorMessage(res));
  }, () => errorMessage(res));
});

// add new currency to trip
router.post('/addcurrency', function (req, res) {
  const currencyData = req.body;
  db.addNewCurrency(currencyData, () => {
    return db.getTripInfo(currencyData.trip_id, tripData => {
      return res.json({trip: tripData[0], users: tripData[1], currency: tripData[2]});
    }, () => errorMessage(res));
  }, () => errorMessage(res));
});

// remove currency from trip
router.post('/removecurrency', function (req, res) {
  const currencyData = req.body;
  db.removeCurrency(currencyData, () => {
    return db.getTripInfo(currencyData.trip_id, tripData => {
      return res.json({trip: tripData[0], users: tripData[1], currency: tripData[2]});
    }, () => errorMessage(res));
  }, () => errorMessage(res));
});

// end trip
router.post('/endtrip', function (req, res) {
    const userData = req.body;
    db.endTrip(userData, (userId, users) => {
      wp.pushNotification(users, "A trip has ended. Please go to the ledger to view the suggested payments.");
      return db.getTrips(userId, tripsData => {
        return res.json({ trips: tripsData });
      }, () => errorMessage(res));
    }, () => errorMessage(res));
});

// undo end trip
router.post('/undoendtrip', function (req, res) {
  const userData = req.body;
  db.undoEndTrip(userData, userId => {
    return db.getTrips(userId, tripsData => {
      return res.json({ trips: tripsData });
    }, () => errorMessage(res));
  }, () => errorMessage(res));
});

router.get('/gettransaction', function (req, res) {
  const tripData = req.query;
  db.getTransaction(tripData, transactionData => {
    return res.json({ trip: transactionData[0], users: transactionData[1], transactions: transactionData[2], currency: transactionData[3] });
  }, () => errorMessage(res));
});

router.post('/edittransaction', function (req, res) {
  const transactionData = req.body;
  db.editTransaction(transactionData, () => {
    return res.json({ message: "Success" });
  }, () => errorMessage(res));
});

router.post('/deletetransaction', function (req, res) {
  const transactionData = req.body;
  db.deleteTransaction(transactionData, () => {
    return res.json({ message: "Success" });
  }, () => errorMessage(res));
});

router.post('/deletetrip', function (req, res) {
  const userData = req.body;
  db.deleteTrip(userData, userId => {
    return db.getTrips(userId, tripsData => {
      return res.json({ trips: tripsData });
    }, () => errorMessage(res));
  }, () => errorMessage(res));
});

router.post('/deletetripall', function (req, res) {
  const tripData = req.body;
  db.deleteTripForAll(tripData, userId => {
    return db.getTrips(userId, tripsData => {
      return res.json({ trips: tripsData });
    }, () => errorMessage(res));
  }, () => errorMessage(res));
});

// make payment from suggested payment
router.post('/makepayment', function (req, res) {
  const transactionData = req.body;
  transactionData.isPayment = true;
  db.addTransaction(transactionData, (user) => {
    wp.pushNotification(user.receiving, user.paying + " has made a payment to you as settlement.");
    return db.getLedger(transactionData.trip_id, tripData => {
      return res.json({ trip: tripData[0], users: tripData[1], transactions: tripData[2], currency: tripData[3] });
    }, () => errorMessage(res));
  }, () => errorMessage(res));
});

module.exports = router;