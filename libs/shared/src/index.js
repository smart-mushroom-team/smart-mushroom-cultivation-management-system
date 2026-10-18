'use strict';

module.exports = {
  ...require('./constants'),
  ...require('./errors'),
  ...require('./config'),
  ...require('./logger'),
  ...require('./jwt'),
  ...require('./app'),
  ...require('./db'),
  z: require('zod').z, // một phiên bản zod duy nhất cho mọi service
  ...require('./middleware/requestId'),
  ...require('./middleware/httpLogger'),
  ...require('./middleware/errorHandler'),
  ...require('./middleware/auth'),
  ...require('./middleware/validate'),
};
