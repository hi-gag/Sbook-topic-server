const cors = require('cors');
const controller = require('./controller')

const loadExpressApp = (app) => {
  app.use(cors({ origin: true, credentials: true }));

  app.get('/', controller.getSample);

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
