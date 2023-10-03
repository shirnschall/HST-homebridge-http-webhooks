const Constants = require('./Constants');

var request = require("request");

const callHttpApi = function(log, urlToCall, urlMethod, urlBody, urlForm, urlHeaders, rejectUnauthorized, homeKitCallback, context, onSuccessCallback, onFailureCallback, timeout) {
  if (urlToCall !== "" && context !== Constants.CONTEXT_FROM_WEBHOOK) {
    var theRequest = {
      method : urlMethod,
      url : urlToCall,
      timeout : timeout || Constants.DEFAULT_REQUEST_TIMEOUT,
      headers : JSON.parse(urlHeaders),
      rejectUnauthorized: rejectUnauthorized
    };
    if (urlMethod === "POST" || urlMethod === "PUT" || urlMethod === "PATCH") {
      if (urlForm) {
        log("\x1b[32mServer:\x1b[0m Add Form " + urlForm);
        theRequest.form = JSON.parse(urlForm);
      }
      else if (urlBody) {
        log("\x1b[32mServer:\x1b[0m Add Body " + urlBody);
        theRequest.body = urlBody;
      }
    }
    request(theRequest, (function(err, response, body) {
      var statusCode = response && response.statusCode ? response.statusCode : -1;
      log("\x1b[32mServer:\x1b[0m GET '%s', status code '%s', body '%s'.", urlToCall, statusCode, body, err);
      if (!err && statusCode >= 200 && statusCode < 300) {
        if (onSuccessCallback) {
          onSuccessCallback();
        }
        homeKitCallback(null);
      }
      else {
        if (onFailureCallback) {
          onFailureCallback();
        }
        homeKitCallback(err || new Error("\x1b[31mServer:\x1b[0m GET '" + urlToCall + "' unsuccesful."));
      }
    }).bind(this));
  }
  else {
    if (onSuccessCallback) {
      onSuccessCallback();
    }
    homeKitCallback(null);
  }
};

module.exports = {
  callHttpApi : callHttpApi
};