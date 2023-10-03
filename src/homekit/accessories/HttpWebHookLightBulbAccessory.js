const Constants = require('../../Constants');
const Util = require('../../Util');

function HttpWebHookLightBulbAccessory(ServiceParam, CharacteristicParam, platform, lightConfig) {
  Service = ServiceParam;
  Characteristic = CharacteristicParam;

  this.platform = platform;
  this.log = platform.log;
  this.storage = platform.storage;

  this.id = lightConfig["id"];
  this.type = "lightbulb";
  this.name = lightConfig["name"];
  this.rejectUnauthorized = lightConfig["rejectUnauthorized"] === undefined ? true: lightConfig["rejectUnauthorized"] === true;
  this.onURL = lightConfig["on_url"] || "";
  this.onMethod = lightConfig["on_method"] || "GET";
  this.onBody = lightConfig["on_body"] || "";
  this.onForm = lightConfig["on_form"] || "";
  this.onHeaders = lightConfig["on_headers"] || "{}";
  this.offURL = lightConfig["off_url"] || "";
  this.offMethod = lightConfig["off_method"] || "GET";
  this.offBody = lightConfig["off_body"] || "";
  this.offForm = lightConfig["off_form"] || "";
  this.offHeaders = lightConfig["off_headers"] || "{}";
  this.brightnessURL = lightConfig["brightness_url"] || "";
  this.brightnessMethod = lightConfig["brightness_method"] || "GET";
  this.brightnessBody = lightConfig["brightness_body"] || "";
  this.brightnessForm = lightConfig["brightness_form"] || "";
  this.brightnessHeaders = lightConfig["brightness_headers"] || "{}";
  this.brightnessFactor = lightConfig["brightness_factor"] || 1;

  this.manufacturer = lightConfig["manufacturer"] || "HttpWebHooksPlatform";
  this.modelPrefix = lightConfig["modelPrefix"] || "HttpWebHookAccessory-";
  this.serialPrefix = lightConfig["serialPrefix"] || "HttpWebHookAccessory-";

  this.preventResets = lightConfig["preventResets"] || true;

  this.informationService = new Service.AccessoryInformation();
  this.informationService.setCharacteristic(Characteristic.Manufacturer, this.manufacturer);
  this.informationService.setCharacteristic(Characteristic.Model, this.modelPrefix + this.name);
  this.informationService.setCharacteristic(Characteristic.SerialNumber, this.serialPrefix + this.id);

  this.service = new Service.Lightbulb(this.name);
  this.service.getCharacteristic(Characteristic.On).on('get', this.getState.bind(this)).on('set', this.setState.bind(this));
  this.service.getCharacteristic(Characteristic.Brightness).on('get', this.getBrightness.bind(this)).on('set', this.setBrightness.bind(this));
}

HttpWebHookLightBulbAccessory.prototype.changeFromServer = function(urlParams) {
  var cachedState = this.storage.getItemSync("http-webhook-" + this.id);
  if (cachedState === undefined) {
    cachedState = false;
  }
  var cachedBrightness = this.storage.getItemSync("http-webhook-brightness-" + this.id);
  if (cachedBrightness === undefined) {
    cachedBrightness = 100;
  }
  if (!urlParams.state && !urlParams.value) {
    return {
      "success" : true,
      "brightness" : cachedBrightness,
      "state" : cachedState
    };
  }
  else {
    var brightness = urlParams.value || cachedBrightness;
    var state = urlParams.state || cachedState;
    var stateBool = state === "true" || state === true;
    this.storage.setItemSync("http-webhook-" + this.id, stateBool);
    var brightnessInt = parseInt(brightness);
    this.storage.setItemSync("http-webhook-brightness-" + this.id, brightnessInt);
    if (cachedState !== stateBool){
      this.log("\x1b[38;2;253;182;mExternal:\x1b[0m Set '%s' state to '%s'.",this.id , stateBool);
      this.service.getCharacteristic(Characteristic.On).updateValue(stateBool, undefined, Constants.CONTEXT_FROM_WEBHOOK);
    }
    if(cachedBrightness != brightnessInt) {
      var brightnessToSet = Math.ceil(brightnessInt / this.brightnessFactor);
      this.log("\x1b[38;2;253;182;mExternal:\x1b[0m Set '%s' brightness to '%s'.",this.id , brightnessToSet);
      this.service.getCharacteristic(Characteristic.Brightness).updateValue(brightnessToSet, undefined, Constants.CONTEXT_FROM_WEBHOOK);
    }
    return {
      "success" : true
    };
  }
};

HttpWebHookLightBulbAccessory.prototype.getState = function(callback) {
  var state = this.storage.getItemSync("http-webhook-" + this.id);
  if (state === undefined) {
    state = false;
  }
  this.log.debug("\x1b[38;5;147mHomeKit:\x1b[0m Get '%s' state ('%s').", this.id ,state);
  callback(null, state);
};

HttpWebHookLightBulbAccessory.prototype.setState = function(powerOn, callback, context) {
  var stateBool = powerOn ? "true":"false";
  this.log("\x1b[38;5;147mHomeKit:\x1b[0m Set '%s' state to '%s'.", this.id ,stateBool);
  this.storage.setItemSync("http-webhook-" + this.id, powerOn);
  var urlToCall = this.onURL;
  var urlMethod = this.onMethod;
  var urlBody = this.onBody;
  var urlForm = this.onForm;
  var urlHeaders = this.onHeaders;
  if (!powerOn) {
    urlToCall = this.offURL;
    urlMethod = this.offMethod;
    urlBody = this.offBody;
    urlForm = this.offForm;
    urlHeaders = this.offHeaders;
  }
  Util.callHttpApi(this.log, urlToCall, urlMethod, urlBody, urlForm, urlHeaders, this.rejectUnauthorized, callback, context);
};

HttpWebHookLightBulbAccessory.prototype.getBrightness = function(callback) {
  var state = this.storage.getItemSync("http-webhook-" + this.id);
  if (state === undefined) {
    state = false;
  }
  //setting values to 0 without updating cachedValue may result in homekit resetting the value to 100% once the device is turned on, if getValue was called when the device was off
  var cachedBrightness = this.storage.getItemSync("http-webhook-brightness-" + this.id);
  if (cachedBrightness === undefined) {
    cachedBrightness = 100;
    this.storage.setItemSync("http-webhook-brightness-" + this.id, cachedBrightness);
  }

  this.log.debug("\x1b[38;5;147mHomeKit:\x1b[0m Get '%s' brightness ('%s').", this.id ,cachedBrightness);
  callback(null, parseInt(cachedBrightness));
};

HttpWebHookLightBulbAccessory.prototype.setBrightness = function(brightnessArg, callback, context) {
  //prevent reset of adjustable value to 100% when turning accessory on manually in case homekit forgot previous value
  //in this case the accessory is off but homekit sends value==100. ignore it and send the cached value instead to update homekit.
  var brightness = brightnessArg;
  if(this.preventResets){
    var state = this.storage.getItemSync("http-webhook-" + this.id);
    var cachedBrightness = this.storage.getItemSync("http-webhook-brightness-" + this.id);
    if(brightnessArg == 100 && state == false){
      brightness=cachedBrightness;
      this.log("Light prevent brightness reset for '%s'...", this.id);
    }
  }

  this.log("\x1b[38;5;147mHomeKit:\x1b[0m Set '%s' brightness to '%s'.", this.id ,brightness);
  var newState = brightness > 0;
  this.storage.setItemSync("http-webhook-" + this.id, newState);
  this.storage.setItemSync("http-webhook-brightness-" + this.id, brightness);
  var brightnessFactor = this.brightnessFactor;
  var brightnessToSet = Math.ceil(brightness * brightnessFactor);
  var urlToCall = this.replaceVariables(this.brightnessURL, newState, brightnessToSet);
  var urlMethod = this.brightnessMethod;
  var urlBody = this.brightnessBody;
  var urlForm = this.brightnessForm;
  var urlHeaders = this.brightnessHeaders;

  if (urlForm) {
    urlForm = this.replaceVariables(urlForm, newState, brightnessToSet);
  }
  else if (urlBody) {
    urlBody = this.replaceVariables(urlBody, newState, brightnessToSet);
  }

  Util.callHttpApi(this.log, urlToCall, urlMethod, urlBody, urlForm, urlHeaders, this.rejectUnauthorized, callback, context);
};

HttpWebHookLightBulbAccessory.prototype.replaceVariables = function(text, state, brightness) {
  return text.replace("%statusPlaceholder", state).replace("%brightnessPlaceholder", brightness);
};

HttpWebHookLightBulbAccessory.prototype.getServices = function() {
  return [ this.service, this.informationService ];
};

module.exports = HttpWebHookLightBulbAccessory;
