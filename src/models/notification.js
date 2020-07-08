const webpush = require('web-push');
const pool = require('./db');

let vapidKeys = {
    publicKey: 'BEihlKsIj93XnvJwx8kgF13l6ZdNJlAyY0zqGA8Tzzq_iYvy1KccHEZCwUKY6L3BPV7qmOkA_9arNjTD_6xYVlE',
    privateKey: '2nRtATZMQW2KeE7ksKLKfq77mi67JEgEWqNGBbnPiQM'
}

webpush.setVapidDetails('mailto: tanjz1999@gmail.com', vapidKeys.publicKey, vapidKeys.privateKey);

function pushNotification(userIds, payload) {
    for (let i = 0; i < userIds.length; i++) {
        let sqlQuery = "SELECT pushSubscription FROM push_subscriptions WHERE user_id = ?"
        pool.query(sqlQuery, [userIds[i]], function (err, result) {
            if (err) {
                console.error('error query: ' + err.stack);
            }
            if (result.length !== 0) {
                webpush.sendNotification(JSON.parse(result[0].pushSubscription), payload);
            }
        })
    }
}

module.exports = {
    pushNotification
}