var Service, Characteristic;
var request = require("request");

module.exports = function(homebridge){
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  homebridge.registerAccessory("homebridge-thermostat-tech-controllers", "Termostat Pracovna", Thermostat);
  homebridge.registerAccessory("homebridge-thermostat-tech-controllers", "Termostat Detska", Thermostat);
  homebridge.registerAccessory("homebridge-thermostat-tech-controllers", "Termostat Spalna", Thermostat);
  homebridge.registerAccessory("homebridge-thermostat-tech-controllers", "Termostat Obyvacka", Thermostat);
  homebridge.registerAccessory("homebridge-thermostat-tech-controllers", "Termostat Kupelna", Thermostat);
};

function Thermostat(log, config) {
  this.log = log;

  this.name = config.name;
  this.manufacturer = 'Peter Suly';
  this.model = 'Homebridge Thermostat';
  this.serial = 'Unknown';
  this.token = config.token;
  this.zoneId = config.zoneId;
  this.modeId = config.modeId;
  this.index = config.index;
  this.timeout = config.timeout || 5000;
  this.currentHumidity = config.currentHumidity || false;
  this.targetHumidity = config.targetHumidity || false;
  this.temperatureDisplayUnits = 0;
  this.maxTemp = config.maxTemp || 35;
  this.minTemp = config.minTemp || 15;
  this.targetTemperature = 25;
  this.currentTemperature = 20;

  this.service = new Service.Thermostat(this.name);
}

Thermostat.prototype = {

	identify: function(callback) {
		this.log("Identify requested!");
		callback();
	},

  _httpRequest: function (url, body, method, callback) {
      request({
          url: url,
          body: body,
          method: method,
          timeout: this.timeout,
          rejectUnauthorized: false,
          headers: {
              'Accept': 'application/json',
              'Authorization': 'Bearer ' + this.token
          }
      },
          function (error, response, body) {
              callback(error, response, body);
          });
  },

  getCurrentHeatingCoolingState: function(callback) {
    var url = "https://emodul.eu/api/v1/users/154698038/modules/a32fe44db41b65e243c55e548b5ef249";

    this._httpRequest(url, '', 'GET', function (error, response, responseBody) {
        if (error) {
          this.log("[!] Error getting currentHeatingCoolingState: %s", error.message);
          callback(error);
        } else {
          var json = JSON.parse(responseBody);
          var state = 0

          if(json.zones.elements[this.index].zone.flags.relayState == "on") { state = 1 };

          this.currentHeatingCoolingState = state;
          this.log("[*] currentHeatingCoolingState: %s", state);
          callback(null, this.currentHeatingCoolingState);
        }
    }.bind(this));
  },

  getCurrentTemperature: function(callback) {
    var url = "https://emodul.eu/api/v1/users/154698038/modules/a32fe44db41b65e243c55e548b5ef249";

    this._httpRequest(url, '', 'GET', function (error, response, responseBody) {
        if (error) {
          this.log("[!] Error getting currentTemperature: %s", error.message);
  				callback(error);
        } else {
  			var json = JSON.parse(responseBody);
  			var temp = json.zones.elements[this.index].zone.currentTemperature/10.0;
            this.currentTemperature = temp;
            this.log("[*] currentTemperature: %s", temp);
  		    callback(null, this.currentTemperature);
        }
    }.bind(this));
  },

  getTargetTemperature: function(callback) {
    var url = "https://emodul.eu/api/v1/users/154698038/modules/a32fe44db41b65e243c55e548b5ef249";

    this._httpRequest(url, '', 'GET', function (error, response, responseBody) {
        if (error) {
          this.log("[!] Error getting targetTemperature: %s", error.message);
  				callback(error);
        } else {
  			var json = JSON.parse(responseBody);
            var temp = json.zones.elements[this.index].zone.setTemperature/10.0;
  			this.targetTemperature = temp;
  			this.log("[*] targetTemperature: %s", this.targetTemperature);
  			callback(null, this.targetTemperature);
        }
    }.bind(this));
  },

  setTargetTemperature: function(value, callback) {
    var url = "https://emodul.eu/api/v1/users/154698038/modules/a32fe44db41b65e243c55e548b5ef249/zones";
    var body = `{"mode": {"id": ${this.modeId},"parentId": ${this.zoneId} ,"mode": "constantTemp","constTempTime": 0,"setTemperature": ${value*10},"scheduleIndex": 0 } }`

    this._httpRequest(url, body, 'POST', function (error, response, responseBody) {
        if (error) {
          this.log("[!] Error setting targetTemperature", error.message);
          callback(error);
        } else {
          this.log("[*] Sucessfully set targetTemperature to %s", value);
          callback();
        }
    }.bind(this));
  },

  getName: function(callback) {
    callback(null, this.name);
  },

  getServices: function() {

    this.informationService = new Service.AccessoryInformation();
    this.informationService
      .setCharacteristic(Characteristic.Manufacturer, this.manufacturer)
      .setCharacteristic(Characteristic.Model, this.model)
      .setCharacteristic(Characteristic.SerialNumber, this.serial);

    this.service
        .getCharacteristic(Characteristic.CurrentHeatingCoolingState)
        .on('get', this.getCurrentHeatingCoolingState.bind(this));

    this.service
        .getCharacteristic(Characteristic.CurrentTemperature)
        .on('get', this.getCurrentTemperature.bind(this));

    this.service
        .getCharacteristic(Characteristic.TargetTemperature)
        .on('get', this.getTargetTemperature.bind(this))
        .on('set', this.setTargetTemperature.bind(this));

    this.service
        .getCharacteristic(Characteristic.Name)
        .on('get', this.getName.bind(this));

    this.service.getCharacteristic(Characteristic.CurrentTemperature)
        .setProps({
            minStep: 0.1
        });

    this.service.getCharacteristic(Characteristic.TargetTemperature)
        .setProps({
            minValue: this.minTemp,
            maxValue: this.maxTemp,
            minStep: 0.5
        });

    this.service.getCharacteristic(Characteristic.TargetHeatingCoolingState)
        .setProps({
            minValue: 0,
            maxValue: 3,
            validValues: [3]
        });

    return [this.informationService, this.service];
}
};
