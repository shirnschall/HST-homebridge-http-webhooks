const Constants = require('../../Constants');

function HSTHttpCarbonDioxideSensor(ServiceParam, CharacteristicParam, platform, sensorConfig) {
  Service = ServiceParam;
  Characteristic = CharacteristicParam;

  this.platform = platform;
  this.log = platform.log;
  this.storage = platform.storage;

  this.id = sensorConfig["id"];
  this.name = sensorConfig["name"];
  this.type = "co2";
  this.co2PeakLevel = sensorConfig["co2_peak_level"] || 1200;

  this.manufacturer = sensorConfig["manufacturer"] || "Hirnschall Technologies";
  this.modelPrefix = sensorConfig["modelPrefix"] || "HST-";
  this.serialPrefix = sensorConfig["serialPrefix"] || "HST-";

  this.informationService = new Service.AccessoryInformation();
  this.informationService.setCharacteristic(Characteristic.Manufacturer, this.manufacturer);
  this.informationService.setCharacteristic(Characteristic.Model, this.modelPrefix + this.name);
  this.informationService.setCharacteristic(Characteristic.SerialNumber, this.serialPrefix + this.id);

  this.service = new Service.CarbonDioxideSensor(this.name);
  this.service.getCharacteristic(Characteristic.CarbonDioxideLevel).on('get', this.getCarbonDioxideLevel.bind(this));
  this.service.getCharacteristic(Characteristic.CarbonDioxideDetected).on('get', this.getCarbonDioxideDetected.bind(this));
}

HSTHttpCarbonDioxideSensor.prototype.changeFromServer = function(urlParams) {
  var cached = this.storage.getItemSync("http-webhook-" + this.id) || 0;
  if (typeof urlParams.value !== 'undefined') {
  var urlValue = urlParams.value;
  var co2Detected = urlValue > this.co2PeakLevel;

  this.storage.setItemSync("http-webhook-carbon-dioxide-level-" + this.id, urlValue);
  this.storage.setItemSync("http-webhook-carbon-dioxide-detected-" + this.id, co2Detected);

  if (cached !== urlValue) {
    this.log("Change HomeKit value for " + this.type + " sensor to '%s'.", urlValue);
    cached = urlValue;
    this.service.getCharacteristic(Characteristic.CarbonDioxideLevel).updateValue(urlValue, undefined, Constants.CONTEXT_FROM_WEBHOOK);
    this.service.getCharacteristic(Characteristic.CarbonDioxideDetected).updateValue(co2Detected ? Characteristic.CarbonDioxideDetected.CO2_LEVELS_ABNORMAL : Characteristic.CarbonDioxideDetected.CO2_LEVELS_NORMAL, undefined, Constants.CONTEXT_FROM_WEBHOOK);
  }
  } else{
    this.log.debug("\x1b[38;2;253;182;mExternal:\x1b[0m '%s' updated without url value.", this.id);
  }
  return {
    "success" : true,
    "state" : cached
  };
}

HSTHttpCarbonDioxideSensor.prototype.getCarbonDioxideLevel = function(callback) {
  var temp = this.storage.getItemSync("http-webhook-carbon-dioxide-level-" + this.id);
  if (typeof temp === 'undefined') {
    temp = 0;
  }

  this.log.debug("\x1b[38;5;147mHomeKit:\x1b[0m Get '%s' carbon dioxide level ('%s').", this.id ,temp);
  callback(null, temp);
};

HSTHttpCarbonDioxideSensor.prototype.getCarbonDioxideDetected = function(callback) {
    var state = this.storage.getItemSync("http-webhook-carbon-dioxide-detected-" + this.id);
    if (state === undefined) {
        state = false;
    }
    this.log.debug("\x1b[38;5;147mHomeKit:\x1b[0m Get '%s' carbon dioxide detected ('%s').", this.id ,state);
    callback(null, state ? Characteristic.CarbonDioxideDetected.CO2_LEVELS_ABNORMAL : Characteristic.CarbonDioxideDetected.CO2_LEVELS_NORMAL);
};

HSTHttpCarbonDioxideSensor.prototype.getServices = function() {
  return [ this.service, this.informationService ];
};

module.exports = HSTHttpCarbonDioxideSensor;
