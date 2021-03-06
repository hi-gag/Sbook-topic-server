const cors = require('cors');
const controller = require('./controller')

const loadExpressApp = (app) => {
  app.use(cors({ origin: true, credentials: true }));

  app.post('/bookmark/:bookmarkListId/new', controller.postBookmark);
  app.get('/bookmark/:bookmarkListId/recommends', controller.getRecommends);

  app.use((error, req, res, next) => {
    res
      .status(500)
      .json({
        message: error.message,
        error,
      })
      .end();
  });
};

module.exports = loadExpressApp;
