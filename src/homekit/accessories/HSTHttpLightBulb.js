const Constants = require('../../Constants');
const Util = require('../../Util');

function HSTHttpLightBulb(ServiceParam, CharacteristicParam, platform, lightConfig) {
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

  this.manufacturer = lightConfig["manufacturer"] || "Hirnschall Technologies";
  this.modelPrefix = lightConfig["modelPrefix"] || "HST-";
  this.serialPrefix = lightConfig["serialPrefix"] || "HST-";

  this.informationService = new Service.AccessoryInformation();
  this.informationService.setCharacteristic(Characteristic.Manufacturer, this.manufacturer);
  this.informationService.setCharacteristic(Characteristic.Model, this.modelPrefix + this.name);
  this.informationService.setCharacteristic(Characteristic.SerialNumber, this.serialPrefix + this.id);

  this.service = new Service.Lightbulb(this.name);
  this.service.getCharacteristic(Characteristic.On).on('get', this.getState.bind(this)).on('set', this.setState.bind(this));
  this.service.getCharacteristic(Characteristic.Brightness).on('get', this.getBrightness.bind(this)).on('set', this.setBrightness.bind(this));
}

HSTHttpLightBulb.prototype.changeFromServer = function(urlParams) {
  var cachedState = this.storage.getItemSync("http-webhook-" + this.id);
  var cachedBrightness = this.storage.getItemSync("http-webhook-brightness-" + this.id);

  if(urlParams.state != null){
    if (cachedState === undefined) {
      cachedState = false;
    }
    if(urlParams.state != cachedState){
      var state = urlParams.state || cachedState;
      var stateBool = state === "true" || state === true;
      this.log("\x1b[38;2;253;182;mExternal:\x1b[0m Set '%s' state to '%s'.",this.id , stateBool);
      this.service.getCharacteristic(Characteristic.On).updateValue(stateBool, undefined, Constants.CONTEXT_FROM_WEBHOOK);
      this.storage.setItemSync("http-webhook-" + this.id, stateBool);
      cachedState = stateBool;
    }
  }
  if(urlParams.value != null){
    if (cachedBrightness === undefined) {
      cachedBrightness = 100;
    }
    if(urlParams.value != cachedBrightness){
      var brightness = urlParams.value || cachedBrightness;
      var brightnessInt = parseInt(brightness);
      if(cachedBrightness != brightnessInt) {
        var brightnessToSet = Math.ceil(brightnessInt / this.brightnessFactor);
        this.log("\x1b[38;2;253;182;mExternal:\x1b[0m Set '%s' brightness to '%s'.",this.id , brightnessToSet);
        this.service.getCharacteristic(Characteristic.Brightness).updateValue(brightnessToSet, undefined, Constants.CONTEXT_FROM_WEBHOOK);
        this.storage.setItemSync("http-webhook-brightness-" + this.id, brightnessInt);
        cachedBrightness = brightnessInt;
      }
    }
  }
    
  return {
      "success" : true,
      "brightness" : cachedBrightness,
      "state" : cachedState
    };
};

HSTHttpLightBulb.prototype.getState = function(callback) {
  var state = this.storage.getItemSync("http-webhook-" + this.id);
  if (state === undefined) {
    state = false;
  }
  this.log.debug("\x1b[38;5;147mHomeKit:\x1b[0m Get '%s' state ('%s').", this.id ,state);
  callback(null, state);
};

HSTHttpLightBulb.prototype.setState = function(state, callback, context) {
  var stateBool = state ? "true":"false";
  this.log("\x1b[38;5;147mHomeKit:\x1b[0m Set '%s' state to '%s'.", this.id ,stateBool);
  this.storage.setItemSync("http-webhook-" + this.id, state);
  var urlToCall = state?this.onURL:this.offURL;
  var urlMethod = state?this.onMethod:this.offMethod;
  var urlBody = state?this.onBody:this.offBody;
  var urlForm = state?this.onForm:this.offForm;
  var urlHeaders = state?this.onHeaders:this.offHeaders;

  Util.callHttpApi(this.log, urlToCall, urlMethod, urlBody, urlForm, urlHeaders, this.rejectUnauthorized, callback, context);
};

HSTHttpLightBulb.prototype.getBrightness = function(callback) {
  //setting values to 0 without updating cachedValue may result in homekit resetting the value to 100% once the device is turned on, if getValue was called when the device was off
  var cachedBrightness = this.storage.getItemSync("http-webhook-brightness-" + this.id);
  if (cachedBrightness === undefined) {
    cachedBrightness = 100;
    this.storage.setItemSync("http-webhook-brightness-" + this.id, cachedBrightness);
  }

  this.log.debug("\x1b[38;5;147mHomeKit:\x1b[0m Get '%s' brightness ('%s').", this.id ,cachedBrightness);
  callback(null, parseInt(cachedBrightness));
};

HSTHttpLightBulb.prototype.setBrightness = function(brightness, callback, context) {

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

HSTHttpLightBulb.prototype.replaceVariables = function(text, state, brightness) {
  return text.replace("%statusPlaceholder", state).replace("%brightnessPlaceholder", brightness);
};

HSTHttpLightBulb.prototype.getServices = function() {
  return [ this.service, this.informationService ];
};

module.exports = HSTHttpLightBulb;
