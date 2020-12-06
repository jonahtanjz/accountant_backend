const webpush = require('web-push');
const pool = require('./db');

let vapidKeys = {
    publicKey: process.env.notificationPublicKey,
    privateKey: process.env.notificationPrivateKey
}

webpush.setVapidDetails('mailto: ' + process.env.notificationEmail, vapidKeys.publicKey, vapidKeys.privateKey);

function pushNotification(userIds, payload) {
    for (let i = 0; i < userIds.length; i++) {
        let sqlQuery = "SELECT pushSubscription FROM push_subscriptions WHERE user_id = ?"
        pool.query(sqlQuery, [userIds[i]], function (err, result) {
            if (err) {
                console.error('error query: ' + err.stack);
            }
            if (result.length !== 0) {
                try {
                    webpush.sendNotification(JSON.parse(result[0].pushSubscription), payload);
                } catch (err) {
                    console.error('error query: ' + err.stack);
                }
            }
        });
    }
}

module.exports = {
    pushNotification
}
