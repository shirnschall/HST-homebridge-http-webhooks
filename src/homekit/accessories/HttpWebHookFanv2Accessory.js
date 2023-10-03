const { parse } = require('node-persist');
const Constants = require('../../Constants');
const Util = require('../../Util');

function HttpWebHookFanv2Accessory(ServiceParam, CharacteristicParam, platform, fanv2Config) {
    Service = ServiceParam;
    Characteristic = CharacteristicParam;

    this.platform = platform;
    this.log = platform.log;
    this.storage = platform.storage;

    this.id = fanv2Config["id"];
    this.type = "fanv2";
    this.name = fanv2Config["name"];
    this.rejectUnauthorized = fanv2Config["rejectUnauthorized"] === undefined ? true :
        fanv2Config["rejectUnauthorized"] === true;

    this.onURL = fanv2Config["on_url"] || "";
    this.onMethod = fanv2Config["on_method"] || "GET";
    this.onBody = fanv2Config["on_body"] || "";
    this.onForm = fanv2Config["on_form"] || "";
    this.onHeaders = fanv2Config["on_headers"] || "{}";
    this.offURL = fanv2Config["off_url"] || "";
    this.offMethod = fanv2Config["off_method"] || "GET";
    this.offBody = fanv2Config["off_body"] || "";
    this.offForm = fanv2Config["off_form"] || "";
    this.offHeaders = fanv2Config["off_headers"] || "{}";
    this.speedURL = fanv2Config["speed_url"] || "";
    this.speedMethod = fanv2Config["speed_method"] || "GET";
    this.speedBody = fanv2Config["speed_body"] || "";
    this.speedForm = fanv2Config["speed_form"] || "";
    this.speedHeaders = fanv2Config["speed_headers"] || "{}";
    this.speedFactor = fanv2Config["speed_factor"] || 1;

    this.enableLockPhysicalControls = fanv2Config["enableLockPhysicalControls"] || false;
    this.lockURL = fanv2Config["lock_url"] || "";
    this.lockMethod = fanv2Config["lock_method"] || "GET";
    this.lockBody = fanv2Config["lock_body"] || "";
    this.lockForm = fanv2Config["lock_form"] || "";
    this.lockHeaders = fanv2Config["lock_headers"] || "{}";
    this.unlockURL = fanv2Config["unlock_url"] || "";
    this.unlockMethod = fanv2Config["unlock_method"] || "GET";
    this.unlockBody = fanv2Config["unlock_body"] || "";
    this.unlockForm = fanv2Config["unlock_form"] || "";
    this.unlockHeaders = fanv2Config["unlock_headers"] || "{}";

    this.enableTargetStateControls = fanv2Config["enableTargetStateControls"] || false;
    this.targetStateURL = fanv2Config["target_state_url"] || "";
    this.targetStateMethod = fanv2Config["target_state_method"] || "GET";
    this.targetStateBody = fanv2Config["target_state_body"] || "";
    this.targetStateForm = fanv2Config["target_state_form"] || "";
    this.targetStateHeaders = fanv2Config["target_state_headers"] || "{}";

    this.enableSwingModeControls = fanv2Config["enableSwingModeControls"] || false;
    this.swingModeURL = fanv2Config["swing_mode_url"] || "";
    this.swingModeMethod = fanv2Config["swing_mode_method"] || "GET";
    this.swingModeBody = fanv2Config["swing_mode_body"] || "";
    this.swingModeForm = fanv2Config["swing_mode_form"] || "";
    this.swingModeHeaders = fanv2Config["swing_mode_headers"] || "{}";

    this.rotationDirectionURL = fanv2Config["rotation_direction_url"] || "";
    this.rotationDirectionMethod = fanv2Config["rotation_direction_method"] || "GET";
    this.rotationDirectionBody = fanv2Config["rotation_direction_body"] || "";
    this.rotationDirectionForm = fanv2Config["rotation_direction_form"] || "";
    this.rotationDirectionHeaders = fanv2Config["rotation_direction_headers"] || "{}";

    this.manufacturer = fanv2Config["manufacturer"] || "HttpWebHooksPlatform";
    this.modelPrefix = fanv2Config["modelPrefix"] || "HttpWebHookAccessory-";
    this.serialPrefix = fanv2Config["serialPrefix"] || "HttpWebHookAccessory-";
    
    this.preventResets = fanv2Config["preventResets"] || true;

    this.informationService = new Service.AccessoryInformation();
    this.informationService.setCharacteristic(Characteristic.Manufacturer, this.manufacturer);
    this.informationService.setCharacteristic(Characteristic.Model, this.modelPrefix + this.name);
    this.informationService.setCharacteristic(Characteristic.SerialNumber, this.serialPrefix + this.id);

    this.service = new Service.Fanv2(this.name);
    this.service.getCharacteristic(Characteristic.Active).on('get', this.getState.bind(this)).on('set', this.setState.bind(this));
    this.service.getCharacteristic(Characteristic.RotationSpeed).on('get', this.getSpeed.bind(this)).on('set', this.setSpeed.bind(this));
    this.service.getCharacteristic(Characteristic.RotationDirection).on('get', this.getRotationDirection.bind(this)).on('set', this.setRotationDirection.bind(this));


    if (this.enableLockPhysicalControls) {
        this.service.getCharacteristic(Characteristic.LockPhysicalControls).on('get', this.getLockState.bind(this)).on('set', this.setLockState.bind(this));
    }

    if (this.enableTargetStateControls) {
        this.service.getCharacteristic(Characteristic.TargetFanState).on('get', this.getTargetState.bind(this)).on('set', this.setTargetState.bind(this));
    }

    if (this.enableSwingModeControls) {
        this.service.getCharacteristic(Characteristic.SwingMode).on('get', this.getSwingMode.bind(this)).on('set', this.setSwingMode.bind(this));
    }
}

HttpWebHookFanv2Accessory.prototype.changeFromServer = function (urlParams) {
    if (urlParams.state != cachedState) {
        var cachedState = this.storage.getItemSync("http-webhook-" + this.id);
        if (cachedState === undefined) {
            cachedState = false;
        }
        var state = urlParams.state || cachedState;
        var stateBool = state === "true" || state === true;
        this.log("\x1b[38;2;253;182;mExternal:\x1b[0m Set '%s' state to '%s'.",this.id , stateBool);

        this.storage.setItemSync("http-webhook-" + this.id, state);   //update cached speed
        this.service.getCharacteristic(Characteristic.Active).updateValue(state?1:0, undefined, Constants.CONTEXT_FROM_WEBHOOK);
    }
    if (urlParams.speed != null) {
        var cachedSpeed = this.storage.getItemSync("http-webhook-speed-" + this.id);
        var speed = parseInt(urlParams.speed);
        if (cachedSpeed != speed) {
            this.log("\x1b[38;2;253;182;mExternal:\x1b[0m Set '%s' speed to '%s\%'.",this.id , speed);
            this.service.getCharacteristic(Characteristic.RotationSpeed).updateValue(speed, undefined, Constants.CONTEXT_FROM_WEBHOOK);
        }
        this.storage.setItemSync("http-webhook-speed-" + this.id, speed);   //update cached speed
    }
    if (urlParams.swingMode != null && this.enableSwingModeControls) {
        var cachedSwingMode = this.storage.getItemSync("http-webhook-swingmode-" + this.id);
        var swingMode = parseInt(urlParams.swingMode);
        if (cachedSwingMode != swingMode) {
            this.log("\x1b[38;2;253;182;mExternal:\x1b[0m Set '%s' swing mode to '%s\%'.",this.id , swingMode);
            this.service.getCharacteristic(Characteristic.SwingMode).updateValue(swingMode?1:0, undefined, Constants.CONTEXT_FROM_WEBHOOK);
        }
    }
    if (urlParams.rotationDirection != null) {
        var cachedRotationDirection = this.storage.getItemSync("http-webhook-rotationdirection-" + this.id);
        var rotationDirection = parseInt(urlParams.rotationDirection);
        if (cachedRotationDirection != rotationDirection) {
            this.log("\x1b[38;2;253;182;mExternal:\x1b[0m Set '%s' rotation direction to '%s'.",this.id , rotationDirection);
            this.service.getCharacteristic(Characteristic.RotationDirection).updateValue(rotationDirection?1:0, undefined, Constants.CONTEXT_FROM_WEBHOOK);
        }
        this.storage.setItemSync("http-webhook-rotationdirection-" + this.id, rotationDirection);   //update cached speed
    }
    if (urlParams.lockstate != null && this.enableLockPhysicalControls) {
        var cachedLockstate = this.storage.getItemSync("http-webhook-lockstate-" + this.id);
        var lockstate = parseInt(urlParams.lockState);
        if (cachedLockstate != lockstate) {
            this.log("\x1b[38;2;253;182;mExternal:\x1b[0m Set '%s' lock state to '%s'.",this.id , lockstate);
            this.service.getCharacteristic(Characteristic.LockPhysicalControls).updateValue(lockstate?1:0, undefined, Constants.CONTEXT_FROM_WEBHOOK);
        }
        this.storage.setItemSync("http-webhook-lockstate-" + this.id, lockstate);   //update cached speed
    }
    if (urlParams.targetState != null && this.enableTargetStateControls) {
        var cachedTargetstate = this.storage.getItemSync("http-webhook-targetstate-" + this.id);
        var targetState = parseInt(urlParams.targetState);
        if (cachedTargetstate != targetState) {
            this.log("\x1b[38;2;253;182;mExternal:\x1b[0m Set '%s' target state to '%s'.",this.id , targetState);
            this.service.getCharacteristic(Characteristic.TargetFanState).updateValue(targetState?1:0, undefined, Constants.CONTEXT_FROM_WEBHOOK);
        }
        this.storage.setItemSync("http-webhook-targetstate-" + this.id, targetState);   //update cached speed
    }
    return {
        "success": true
    };
}

HttpWebHookFanv2Accessory.prototype.getState = function (callback) {
    var state = this.storage.getItemSync("http-webhook-" + this.id);
    
    var stateBool = state === "true" || state === true;
    this.log("\x1b[38;5;147mHomeKit:\x1b[0m Get '%s' state ('%s').", this.id ,stateBool);
    if (state === undefined) {
        state = false;
    }
    callback(null, state?1:0);
};

HttpWebHookFanv2Accessory.prototype.setState = function (powerOn, callback, context) {
    var stateBool = powerOn === "true" || powerOn === true;
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

HttpWebHookFanv2Accessory.prototype.getSpeed = function (callback) {
    var state = this.storage.getItemSync("http-webhook-" + this.id);
    if (state === undefined) {
        state = false;
    }
    //setting values to 0 without updating cachedValue may result in homekit resetting the value to 100% once the device is turned on, if getValue was called when the device was off
    var cachedSpeed = this.storage.getItemSync("http-webhook-speed-" + this.id);
    if (cachedSpeed === undefined) {
        cachedSpeed = 100;
        this.storage.setItemSync("http-webhook-speed-" + this.id, cachedSpeed);   //update cached speed
    }

    this.log("\x1b[38;5;147mHomeKit:\x1b[0m Get '%s' speed ('%s\%').", this.id ,cachedSpeed);
    callback(null, parseInt(cachedSpeed));
};

HttpWebHookFanv2Accessory.prototype.setSpeed = function (speedArg, callback, context) {
    //prevent reset of adjustable value to 100% when turning accessory on manually in case homekit forgot previous value
    //in this case the accessory is off but homekit sends value==100. ignore it and send the cached value instead to update homekit.
    var speed = speedArg;
    if(this.preventResets){
        var state = this.storage.getItemSync("http-webhook-" + this.id);
        var cachedSpeed = this.storage.getItemSync("http-webhook-speed-" + this.id);
        if(speedArg == 100 && state == false){
            speed=cachedSpeed;
            this.log("Fanv2 prevent rotation speed reset for '%s'...", this.id);
        }
    }

    
    this.log("\x1b[38;5;147mHomeKit:\x1b[0m Set '%s' speed to '%s\%'.", this.id ,speed);
    var newState = speed > 0;
    this.storage.setItemSync("http-webhook-" + this.id, newState);
    this.storage.setItemSync("http-webhook-speed-" + this.id, speed);
    var speedFactor = this.speedFactor;
    var speedToSet = Math.ceil(speed * speedFactor);
    var urlToCall = this.replaceVariables(this.speedURL, newState, speedToSet);
    var urlMethod = this.speedMethod;
    var urlBody = this.speedBody;
    var urlForm = this.speedForm;
    var urlHeaders = this.speedHeaders;

    if (urlForm) {
        urlForm = this.replaceVariables(urlForm, newState, speedToSet);
    }
    else if (urlBody) {
        urlBody = this.replaceVariables(urlBody, newState, speedToSet);
    }

    Util.callHttpApi(this.log, urlToCall, urlMethod, urlBody, urlForm, urlHeaders, this.rejectUnauthorized, callback, context);
};

HttpWebHookFanv2Accessory.prototype.getLockState = function (callback) {
    var lockstate = this.storage.getItemSync("http-webhook-lockstate-" + this.id);
    if (lockstate === undefined) {
        lockstate = false;
    }
    
    var stateBool = lockstate === "true" || lockstate === true;
    this.log("\x1b[38;5;147mHomeKit:\x1b[0m Get '%s' lock state ('%s').", this.id ,stateBool);
    callback(null, lockstate);
};

HttpWebHookFanv2Accessory.prototype.setLockState = function (lockState, callback, context) {
    var stateBool = lockState === "true" || lockState === true;
    this.log("\x1b[38;5;147mHomeKit:\x1b[0m Set '%s' lock state to '%s'.", this.id ,stateBool);
    this.storage.setItemSync("http-webhook-lockstate-" + this.id, lockState);
    var urlToCall = this.lockURL;
    var urlMethod = this.lockMethod;
    var urlBody = this.lockBody;
    var urlForm = this.lockForm;
    var urlHeaders = this.lockHeaders;
    if (!lockState) {
        urlToCall = this.unlockURL;
        urlMethod = this.unlockMethod;
        urlBody = this.unlockBody;
        urlForm = this.unlockForm;
        urlHeaders = this.unlockHeaders;
    }
    Util.callHttpApi(this.log, urlToCall, urlMethod, urlBody, urlForm, urlHeaders, this.rejectUnauthorized, callback, context);
};

HttpWebHookFanv2Accessory.prototype.getTargetState = function (callback) {
    var targetState = this.storage.getItemSync("http-webhook-targetstate-" + this.id);
    if (targetState === undefined) {
        targetState = false;
    }
    var stateBool = targetState === "true" || targetState === true;
    this.log("\x1b[38;5;147mHomeKit:\x1b[0m Get '%s' target state ('%s').", this.id ,stateBool);
    callback(null, targetState);
};

HttpWebHookFanv2Accessory.prototype.setTargetState = function (targetState, callback, context) {
    var stateBool = targetState === "true" || targetState === true;
    this.log("\x1b[38;5;147mHomeKit:\x1b[0m Set '%s' target state to '%s'.", this.id ,stateBool);
    this.storage.setItemSync("http-webhook-targetstate-" + this.id, targetState);
    var state = this.storage.getItemSync("http-webhook-" + this.id);
    if (state === undefined) {
        state = false;
    }
    var urlToCall = this.targetStateURL.replace("%targetState", targetState);
    var urlMethod = this.targetStateMethod;
    var urlBody = this.targetStateBody.replace("%targetState", targetState);;
    var urlForm = this.targetStateForm;
    var urlHeaders = this.targetStateHeaders;

    Util.callHttpApi(this.log, urlToCall, urlMethod, urlBody, urlForm, urlHeaders, this.rejectUnauthorized, callback, context);
};

HttpWebHookFanv2Accessory.prototype.getSwingMode = function (callback) {
    var swingMode = this.storage.getItemSync("http-webhook-swingmode-" + this.id);
    if (swingMode === undefined) {
        swingMode = false;
    }
    var modeBool = swingMode === "true" || swingMode === true;
    this.log("\x1b[38;5;147mHomeKit:\x1b[0m Get '%s' swing mode ('%s').", this.id ,modeBool);
    callback(null, swingMode);
};

HttpWebHookFanv2Accessory.prototype.setSwingMode = function (swingMode, callback, context) {
    var modeBool = swingMode === "true" || swingMode === true;
    this.log("\x1b[38;5;147mHomeKit:\x1b[0m Set '%s' swing mode to '%s'.", this.id ,modeBool);
    this.storage.setItemSync("http-webhook-swingmode-" + this.id, swingMode);
    var state = this.storage.getItemSync("http-webhook-" + this.id);
    if (state === undefined) {
        state = false;
    }
    var urlToCall = this.swingModeURL.replace("%swingMode", swingMode);
    var urlMethod = this.swingModeMethod;
    var urlBody = this.swingModeBody.replace("%swingMode", swingMode);;
    var urlForm = this.swingModeForm;
    var urlHeaders = this.swingModeHeaders;

    Util.callHttpApi(this.log, urlToCall, urlMethod, urlBody, urlForm, urlHeaders, this.rejectUnauthorized, callback, context);
};

HttpWebHookFanv2Accessory.prototype.getRotationDirection = function (callback) {
    var rotationDirection = this.storage.getItemSync("http-webhook-rotationdirection-" + this.id);
    if (rotationDirection === undefined) {
        rotationDirection = false;
    }
    var directionBool = rotationDirection === "true" || rotationDirection === true;
    this.log("\x1b[38;5;147mHomeKit:\x1b[0m Get '%s' rotation direction ('%s').", this.id ,directionBool);
    callback(null, rotationDirection);
};

HttpWebHookFanv2Accessory.prototype.setRotationDirection = function (rotationDirection, callback, context) {
    var directionBool = rotationDirection === "true" || rotationDirection === true;
    this.log("\x1b[38;5;147mHomeKit:\x1b[0m Set '%s' rotation direction to '%s'.", this.id ,directionBool);
    this.storage.setItemSync("http-webhook-rotationdirection-" + this.id, rotationDirection);
    var urlToCall = this.rotationDirectionURL.replace("%rotationDirection", rotationDirection);
    var urlMethod = this.rotationDirectionMethod;
    var urlBody = this.rotationDirectionBody.replace("%rotationDirection", rotationDirection);;
    var urlForm = this.rotationDirectionForm;
    var urlHeaders = this.rotationDirectionHeaders;

    Util.callHttpApi(this.log, urlToCall, urlMethod, urlBody, urlForm, urlHeaders, this.rejectUnauthorized, callback, context);
};

HttpWebHookFanv2Accessory.prototype.replaceVariables = function (text, state, speed) {
    return text.replace("%statusPlaceholder", state).replace("%speedPlaceholder", speed);
};


HttpWebHookFanv2Accessory.prototype.getServices = function () {
    return [this.service, this.informationService];
};

module.exports = HttpWebHookFanv2Accessory;