const webpush = require('web-push');
const pool = require('./db');

webpush.setGCMAPIKey(process.env.FCM_SERVER_KEY);

function pushNotification(userIds, payload) {
    for (let i = 0; i < userIds; i++) {
        let sqlQuery = "SELECT pushSubscription FROM push_subscriptions WHERE user_id = ?"
        pool.query(sqlQuery, [userIds[i]], function (err, result) {
            if (err) {
                console.error('error query: ' + err.stack);
            }
            if (result.length !== 0) {
                webpush.sendNotification(result[0].pushSubscription, payload);
            }
        })
    }
}

module.exports = {
    pushNotification
}