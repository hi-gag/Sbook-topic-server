const functions = require('firebase-functions');
const admin = require('firebase-admin')
const express = require('express');
const loadExpressApp = require('./api/loadExpressApp')

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
});

const app = express();
loadExpressApp(app);

exports.api = functions.runWith({
  timeoutSeconds: 360,
  memory: "1GB",
}).https.onRequest(app);

