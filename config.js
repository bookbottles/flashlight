/**
 * This config file is provided as a convenience for development. You can either
 * set the environment variables on your server or modify the values here.
 *
 * At a minimum, you must set FB_URL and Paths to Monitor. Everything else is optional, assuming your
 * ElasticSearch server is at localhost:9200.
 */

/** Firebase Settings
 ***************************************************/

var _ = require('lodash');

// Your Firebase instance where we will listen and write search results
exports.FB_URL   = process.env.FB_URL || 'https://bb-app-sandbox.firebaseio.com/';

// The path in your Firebase where clients will write search requests
exports.FB_REQ   = process.env.FB_REQ || 'search/request';

// The path in your Firebase where this app will write the results
exports.FB_RES   = process.env.FB_RES || 'search/response';

// See https://firebase.google.com/docs/server/setup for instructions
// to auto-generate the service-account.json file
exports.FB_SERVICEACCOUNT = process.env.FB_ACC || 'service-account.json';

/** ElasticSearch Settings
 *********************************************/

if( process.env.BONSAI_URL ) {
  processBonsaiUrl(exports, process.env.BONSAI_URL);
}
else {
  // ElasticSearch server's host URL
  exports.ES_HOST  = process.env.ES_HOST || 'localhost';

  // ElasticSearch server's host port
  exports.ES_PORT  = process.env.ES_PORT || '9200';

  // ElasticSearch username for http auth
  exports.ES_USER  = process.env.ES_USER || null;

  // ElasticSearch password for http auth
  exports.ES_PASS  = process.env.ES_PASS || null;
}

/** Paths to Monitor
 *
 * Each path can have these keys:
 * {string}   path:    [required] the Firebase path to be monitored, for example, `users/profiles`
 *                     would monitor https://<instance>.firebaseio.com/users/profiles
 * {string}   index:   [required] the name of the ES index to write data into
 * {string}   type:    [required] name of the ES object type this document will be stored as
 * {Array}    fields:  list of fields to be monitored and indexed (defaults to all fields, ignored if "parser" is specified)
 * {Array}    omit:    list of fields that should not be indexed in ES (ignored if "parser" is specified)
 * {Function} filter:  if provided, only records that return true are indexed
 * {Function} parser:  if provided, the results of this function are passed to ES, rather than the raw data (fields is ignored if this is used)
 * {Function} refBuilder: see README
 *
 * To store your paths dynamically, rather than specifying them all here, you can store them in Firebase.
 * Format each path object with the same keys described above, and store the array of paths at whatever
 * location you specified in the FB_PATHS variable. Be sure to restrict that data in your Security Rules.
 ****************************************************/
var paths = [
  {
    name  : "response",
    path  : "queue/responses",
    index : "firebase",
    type  : "logs",
    parser: function(data) {
      return {
        response: {
          data: normalizeResponseData(data.data),
          status: data.status,
          time: data.time
        }
      };
    }
  },
  {
    name  : "request",
    path  : "logs/queue/requests",
    index : "firebase",
    type  : "logs",
    resolver: function(data, key) {
      return data.response;
    },
    parser: function(data, key) {
      return {
        request: {
          _id: key,
          action: data.action,
          data: normalizeRequestData(data.data),
          time: data.time
        },
        user: data.user,
        venue: data.venue
      };
    }
  },
  {
    name  : "error",
    path  : "logs/queue/errors",
    index : "firebase",
    type  : "logs",
    filter: function(data) {
      return !!data.task;
    },
    resolver: function(data, key) {
      return data.task.response;
    },
    parser: function(data, key) {
      return {
        error: {
          _id: key,
          _log: data.task._log,
          error: data.error,
          state: data.state,
          time: data.time
        }
      };
    }
  }
];

exports.SEARCH_QUEUE = process.env.SEARCH_QUEUE;

if (process.env.MONITOR_PATHS) {
  exports.MONITOR_PATHS = process.env.MONITOR_PATHS === 'all' ? _.map(paths, 'name') : process.env.MONITOR_PATHS.split(',');

  exports.paths = _.filter(paths, function(path) {
    return exports.MONITOR_PATHS.indexOf(path.name) > -1;
  });
}

// Paths can also be stored in Firebase! See README for details.
//exports.paths = process.env.FB_PATHS || null;

// Additional options for ElasticSearch client
exports.ES_OPTS = {
  //requestTimeout: 60000, maxSockets: 100, log: 'error'
};

/** Config Options
 ***************************************************/

// How often should the script remove unclaimed search results? probably just leave this alone
exports.CLEANUP_INTERVAL =
  process.env.NODE_ENV === 'production' ?
  3600 * 1000 /* once an hour */ :
  60 * 1000 /* once a minute */;

function processBonsaiUrl(exports, url) {
  var matches = url.match(/^https?:\/\/([^:]+):([^@]+)@([^/]+)\/?$/);
  exports.ES_HOST = matches[3];
  exports.ES_PORT = 80;
  exports.ES_USER = matches[1];
  exports.ES_PASS = matches[2];
  console.log('Configured using BONSAI_URL environment variable', url, exports);
}


var propertyHandlers = {
  'venue': enforceObject,
  'user': enforceObject,
  'guest': enforceObject,
  'guest.birthday': enforceDate,
  'event': enforceObject,
  'event.flyer': enforceObject,
  'event.promoters': enforceValuesArray,
  'ticket': enforceObject,
  'ticket.questions': enforceKeyValueObjectsArray,
  'area': enforceObject,
  'party': enforceObject,
  'party.guest': enforceObject,
  'party.guest.birthday': enforceDate,
  'party.questions': enforceKeyValueObjectsArray,
  'reservation.servers': enforceValuesArray,
  'reservation.tables': enforceReservationTablesArray,
  'reservation.spends': enforceObject,
  'reservation.guest': enforceObject,
  'reservation.guest.birthday': enforceDate,
  'promotion': enforceObject,
  'promotion.days': enforceValuesArray,
  'promo': enforceObject,
  'promo.tickets': enforceValuesArray,
  'referrer': enforceObject,
  'date': enforceDate,
  'priority': enforceNumeric,
  'payment.reservation.gratuity': enforceNumeric,
  'payment.reservation.tax': enforceNumeric
};

function enforceObject(data) {
  return typeof data !== 'object' ? { _id: data } : data;
}

function enforceKeyValueObjectsArray(data) {
  return _.isArray(data) ? data : _.map(data, function(val, key) {
    return {
      _id: key,
      _value: val ? val.toString() : ''
    };
  });
}

function enforceValuesArray(data) {
  return _.isArray(data) ? data : _.keys(data);
}

function enforceReservationTablesArray(data) {
  return _.flatten(_.map(data, function(tables, area) {
    return _.map(enforceValuesArray(tables), function(table) {
      return {
        area: area,
        table: table
      };
    });
  }));
}

function enforceNumeric(data) {
  var val = parseFloat(data);
  return val && !isNaN(val) ? val.toString() : null;
}

function enforceDate(data) {
  try {
    return new Date(data).toISOString();  
  } catch (e) {
    console.warn('cannot parse ' + data + ' as date');
    return null;
  }
}

function normalizeRequestData(data) {
  if (_.isObject(data)) {
    _.each(propertyHandlers, function(handler, prop) {
      var val = _.get(data, prop);
      if (val) {
        _.set(data, prop, handler(val));
      } else if (val === '') {
        _.set(data, prop, null);
      }
    });
  } else if (!_.isNil(data)) {
    return _.set({}, '_value', data);
  }
  return data;
}

function normalizeResponseData(data) {
  if (_.isObject(data)) {
    if (!_.isArray(data)) {
      if (!_.some(data, _.negate(_.isObject))) {
        return _.map(data, function(val, key) {
          return _.set(val, '_id', key);
        });
      }
    }
  } else if (!_.isNil(data)) {
    return _.set({}, '_value', data);
  }
  return data;
}