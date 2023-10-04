const Constants = require('../Constants');
const Server = require('../Server');

var HSTHttpSensor = require('./accessories/HSTHttpSensor');
var HSTHttpSwitch = require('./accessories/HSTHttpSwitch');
var HSTHttpPushButton = require('./accessories/HSTHttpPushButton');
var HSTHttpLightBulb = require('./accessories/HSTHttpLightBulb');
var HSTHttpThermostat = require('./accessories/HSTHttpThermostat');
var HSTHttpOutlet = require('./accessories/HSTHttpOutlet');
var HSTHttpSecurity = require('./accessories/HSTHttpSecurity');
var HSTHttpGarageDoorOpener = require('./accessories/HSTHttpGarageDoorOpener');
var HSTHttpStatelessSwitch = require('./accessories/HSTHttpStatelessSwitch');
var HSTHttpLockMechanism = require('./accessories/HSTHttpLockMechanism');
var HSTHttpWindowCovering = require('./accessories/HSTHttpWindowCovering');
var HSTHttpFanv2 = require('./accessories/HSTHttpFanv2');
var HSTHttpCarbonDioxideSensory = require('./accessories/HSTHttpCarbonDioxideSensor');
var HSTHttpValve = require('./accessories/HSTHttpValve');

var Service, Characteristic;

function HSTHttpsPlatform(log, config, homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;

  this.log = log;
  this.cacheDirectory = config["cache_directory"] || Constants.DEFAULT_CACHE_DIR;
  this.storage = require('node-persist');
  this.storage.initSync({
    dir : this.cacheDirectory
  });

  this.sensors = config["sensors"] || [];
  this.switches = config["switches"] || [];
  this.pushButtons = config["pushbuttons"] || [];
  this.lights = config["lights"] || [];
  this.thermostats = config["thermostats"] || [];
  this.outlets = config["outlets"] || [];
  this.security = config["security"] || [];
  this.garageDoorOpeners = config["garagedooropeners"] || [];
  this.statelessSwitches = config["statelessswitches"] || [];
  this.windowCoverings = config["windowcoverings"] || [];
  this.lockMechanisms = config["lockmechanisms"] || [];
  this.fanv2s = config["fanv2s"] || [];
  this.co2sensors = config["co2sensors"] || [];
  this.valves = config["valves"] || [];

  this.server = new Server(Service, Characteristic, this, config);
};

HSTHttpsPlatform.prototype.accessories = function(callback) {
  var accessories = [];

  for (var i = 0; i < this.sensors.length; i++) {
    var sensor = new HSTHttpSensor(Service, Characteristic, this, this.sensors[i]);
    accessories.push(sensor);
  }

  for (var i = 0; i < this.switches.length; i++) {
    var switchAccessory = new HSTHttpSwitch(Service, Characteristic, this, this.switches[i]);
    accessories.push(switchAccessory);
  }

  for (var i = 0; i < this.pushButtons.length; i++) {
    var pushButtonsAccessory = new HSTHttpPushButton(Service, Characteristic, this, this.pushButtons[i]);
    accessories.push(pushButtonsAccessory);
  }

  for (var i = 0; i < this.lights.length; i++) {
    var lightAccessory = new HSTHttpLightBulb(Service, Characteristic, this, this.lights[i]);
    accessories.push(lightAccessory);
  }

  for (var i = 0; i < this.thermostats.length; i++) {
    var thermostatAccessory = new HSTHttpThermostat(Service, Characteristic, this, this.thermostats[i]);
    accessories.push(thermostatAccessory);
  }

  for (var i = 0; i < this.outlets.length; i++) {
    var outletAccessory = new HSTHttpOutlet(Service, Characteristic, this, this.outlets[i]);
    accessories.push(outletAccessory);
  }

  for (var i = 0; i < this.security.length; i++) {
    var securityAccessory = new HSTHttpSecurity(Service, Characteristic, this, this.security[i]);
    accessories.push(securityAccessory);
  }

  for (var i = 0; i < this.garageDoorOpeners.length; i++) {
    var garageDoorOpenerAccessory = new HSTHttpGarageDoorOpener(Service, Characteristic, this, this.garageDoorOpeners[i]);
    accessories.push(garageDoorOpenerAccessory);
  }

  for (var i = 0; i < this.windowCoverings.length; i++) {
    var WindowCoveringAccessory = new HSTHttpWindowCovering(Service, Characteristic, this, this.windowCoverings[i]);
    accessories.push(WindowCoveringAccessory);
  }

  for (var i = 0; i < this.statelessSwitches.length; i++) {
    var statelessSwitchAccessory = new HSTHttpStatelessSwitch(Service, Characteristic, this, this.statelessSwitches[i]);
    accessories.push(statelessSwitchAccessory);
  }

  for (var i = 0; i < this.lockMechanisms.length; i++) {
    var lockMechanismAccessory = new HSTHttpLockMechanism(Service, Characteristic, this, this.lockMechanisms[i]);
    accessories.push(lockMechanismAccessory);
  }

  for (var i = 0; i < this.fanv2s.length; i++) {
    var fanv2Accessory = new HSTHttpFanv2(Service, Characteristic, this, this.fanv2s[i]);
    accessories.push(fanv2Accessory);
  }

  for (var i = 0; i < this.co2sensors.length; i++) {
    var co2sensorAccessory = new HSTHttpCarbonDioxideSensory(Service, Characteristic, this, this.co2sensors[i]);
    accessories.push(co2sensorAccessory);
  }

  for (var i = 0; i < this.valves.length; i++) {
    var valveAccessory = new HSTHttpValve(Service, Characteristic, this, this.valves[i]);
    accessories.push(valveAccessory);
  }

  this.server.setAccessories(accessories);
  this.server.start();

  callback(accessories);
};

module.exports = HSTHttpsPlatform;
