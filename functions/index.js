const functions = require('firebase-functions');
const admin = require('firebase-admin')
const express = require('express');
const loadExpressApp = require('./api/loadExpressApp');
const axios = require('axios');
const { extract } = require('article-parser/dist/cjs/article-parser.js')

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
});

const app = express();
loadExpressApp(app);

exports.api = functions.runWith({
  timeoutSeconds: 360,
  memory: "1GB",
}).https.onRequest(app);

exports.scrap = functions.pubsub
  .schedule('0 * * * *')
  .timeZone('Asia/Seoul')
  .onRun(async() => {
    const bookmarksQuery = admin.firestore()
      .collection('bookmarks')
      .where('recommends', '==', null);

    const bookmarks = await bookmarksQuery.get();

    const queuedPromises = bookmarks.docs.map((bookmark) => {
      return new Promise(async(resolve, reject) => {
        const { keywords } = bookmark.data();
        const query = keywords.map((word) => encodeURI(word)).join('%2B');

        const response = await axios.get(`https://customsearch.googleapis.com/customsearch/v1?cx=006045920514796618854%3Ac71ixzdakt6&q=${query}&lr=lang_ko&key=AIzaSyDJ10zw0KLAOWzDP4YSKbAicTF_bGxP7ek`)
        const searchResults = response.data.items.slice(0,3);

        const recommendPromises = searchResults.map((result) =>
          new Promise(async(resolve, reject) => {

            const parsed = await extract(result.link)
            resolve(parsed ? {
              url: parsed.url,
              title: parsed.title,
              image: parsed.image,
              description: parsed.description
            } : undefined)
          })
        )

        const recommends = await Promise.all(recommendPromises)
        console.log(recommends)
        await bookmark.ref.update({
          recommends : recommends.filter((recommend) => recommend !== undefined)
        })
        resolve(recommends)
      })
    })

    await Promise.all(queuedPromises)

    return res.status(200).json({
      status: 'ok'
    })
  });
