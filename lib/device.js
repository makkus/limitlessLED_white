var stream = require('stream')
    , util = require('util')
    , dgram = require('dgram');

// Give our device a stream interface
util.inherits(Device,stream);


// lamp/group aliases
const WHITE_1 = 1
const WHITE_2 = 2
const WHITE_3 = 3
const WHITE_4 = 4

var lamps = new Object()
lamps[WHITE_1] = {on: 56, off: 59, brightnessUp: 60, brightnessDown: 52, nightMode: 187, full: 184}
lamps[WHITE_2] = {on: 61, off: 51, brightnessUp: 60, brightnessDown: 52, nightMode: 179, full: 189}
lamps[WHITE_3] = {on: 55, off: 58, brightnessUp: 60, brightnessDown: 52, nightMode: 186, full: 183}
lamps[WHITE_4] = {on: 50, off: 54, brightnessUp: 60, brightnessDown: 52, nightMode: 182, full: 178}

// lamp properties
const ON = 'on'
const OFF = 'off'
const NIGHTMODE = 'nightMode'
const FULL = 'full'
const BRIGHTNESS_UP = 'brightnessUp'
const BRIGHTNESS_DOWN = 'brightnessDown'
const BRIGHTNESS_MAX = 11
const BRIGHTNESS_MIN = 1
const BRIGHTNESS_NIGHT = 0
const BRIGHTNESS_UNDEF = -1
// command constants
const valByteNA = 0x00;
const cmdEndByte = 0x55;

const DELAY = 100;

/**
 * Creates a new Device Object
 *
 * @property {Boolean} readable Whether the device emits data
 * @property {Boolean} writable Whether the data can be actuated
 *
 * @property {Number} G - the channel of this device
 * @property {Number} V - the vendor ID of this device
 * @property {Number} D - the device ID of this device
 *
 * @property {Function} write Called when data is received from the Ninja Platform
 *
 * @fires data - Emit this when you wish to send data to the Ninja Platform
 */
function Device(ipAddress, port, group) {

    var self = this;

    // This device will emit data
    this.readable = false;
    // This device can be actuated
    this.writeable = true;

    this.G = "0"; // G is a string a represents the channel
    this.V = 0; // 0 is Ninja Blocks' device list
    this.D = 224; // 2000 is a generic Ninja Blocks sandbox device

    this.ipAddress = ipAddress
    this.port = port
    this.group = group

    this.lamp = lamps[this.group]

    this.switchedOn = true
    this.brightness = BRIGHTNESS_UNDEF
    this.brightness_max_unknown = BRIGHTNESS_MAX

    //calibrate(self, false)
    //setBrightness(self, 5)
    full(self)

    process.nextTick(function() {
        self.emit('data','Hello World');
    });
};


/**
 * Called whenever there is data from the Ninja Platform
 * This is required if Device.writable = true
 *
 * @param  {String} data The data received
 */
Device.prototype.write = function(data) {

    var self = this;

    // I'm being actuated with data!
    console.log(data);

    console.log('ip: '+this.ipAddress)
    console.log('port: '+this.port)
    console.log('group: '+this.group)

    var command = JSON.parse(data)


    console.log("LAMP: " + this.lamp)

    var state = command.on ? ON : OFF
    var desired_brightness = command.bri
    if ( desired_brightness <= 0 ) {
        desired_brightness = 0
    } else if ( desired_brightness == 254 ) {
        desired_brightness = BRIGHTNESS_MAX
    } else {
        desired_brightness = Math.round((desired_brightness/254)*BRIGHTNESS_MAX)
        if ( desired_brightness == 0 ) {
            desired_brightness++
        } else if ( desired_brightness == BRIGHTNESS_MAX ) {
            desired_brightness--

        }
    }


    console.log("ON: " + state)
    sendCommand(self, state)

	if ( state == ON ) {
        console.log("desired brightness: " + desired_brightness)
        setBrightness(self, desired_brightness, DELAY)
	}

    self.emit('data', data);

};

function setBrightness(driver, desired_brightness, wait) {

    if ( desired_brightness >= BRIGHTNESS_MAX ) {
        setTimeout(function(){full(driver)}, wait)
        wait = wait + DELAY
        return wait
    } else if ( driver.brightness == BRIGHTNESS_UNDEF ) {
        setTimeout(function(){calibrate(driver, false)}, wait)
        wait = wait + (BRIGHTNESS_MAX*DELAY)
    }


    if ( desired_brightness == driver.brightness ) {
        console.log("Don't need to do anything, brightness is all right now.")
        return wait
    } else if ( desired_brightness < driver.brightness ) {
        setTimeout(function(){
            var steps = driver.brightness - desired_brightness
            console.log("Dimming "+steps+" steps...")
            wait = wait + dimm(driver, steps)
        }, wait)
    } else {

        setTimeout(function(){
            var steps = desired_brightness - driver.brightness
            console.log("Brighten "+steps+" steps...")
            wait = wait + brighten(driver, steps)
        }, wait)
    }

    return wait
}

function calibrate(driver, full) {

    console.log("Calibrating...")

    sendCommand(driver, ON)

    if (full) {
        setTimeout(function(){sendCommand(driver, FULL)}, 100)
        dimm(driver, BRIGHTNESS_MAX)
    } else {
        dimm(driver, BRIGHTNESS_MAX)
    }

    return (BRIGHTNESS_MAX+1) * DELAY
}

function full(driver) {
    sendCommand(driver, FULL)
    return DELAY
}

function nightmode(driver) {
    sendCommand(driver, NIGHTMODE)
    return DELAY
}

function brighten(driver, steps) {
    var c = 0
    var interval = setInterval(
        function(){
            sendCommand(driver, BRIGHTNESS_UP)
            c++
            if ( c >= steps ) clearInterval(interval)
        }, DELAY)
    return DELAY * steps
}

function dimm(driver, steps) {
    var c = 0
    var interval = setInterval(
        function(){
            sendCommand(driver, BRIGHTNESS_DOWN)
            c++
            if ( c >= steps ) clearInterval(interval)
        }, DELAY)
    return DELAY * steps
}

function sendCommand(driver, command, command_options) {
    //console.log("LAMP: " + driver.lamp.on + "    " + command)
    function sendUDPCommandToLamp() {

        var didFinishSend = function (err, bytes) {
            client.close();
            if (typeof callback !== 'undefined') {
                setTimeout(callback, 100);
            }
        }

        if (command == BRIGHTNESS_DOWN) {
            if ( driver.brightness == BRIGHTNESS_UNDEF && driver.brightness_max_unknown > BRIGHTNESS_MIN) {
                driver.brightness_max_unknown --
                if ( driver.brightness_max_unknown <= BRIGHTNESS_MIN ) {
                    driver.brightness = BRIGHTNESS_MIN
                } else if ( driver.brightness_max_unknown >= BRIGHTNESS_MAX ) {
                    driver.brightness = BRIGHTNESS_MAX
                }
            } else if ( driver.brightness > BRIGHTNESS_MIN ) {
                driver.brightness--
            }
        } else if ( command == BRIGHTNESS_UP) {
            if ( driver.brightness == BRIGHTNESS_UNDEF && driver.brightness_max_unknown < BRIGHTNESS_MAX) {
                driver.brightness_max_unknown ++
                if ( driver.brightness_max_unknown <= BRIGHTNESS_MIN ) {
                    driver.brightness = BRIGHTNESS_MIN
                } else if ( driver.brightness_max_unknown >= BRIGHTNESS_MAX ) {
                    driver.brightness = BRIGHTNESS_MAX
                }
            } else if ( driver.brightness < BRIGHTNESS_MAX ) {
                driver.brightness++
            }
        } else if ( command == NIGHTMODE ) {
            driver.brightness = BRIGHTNESS_NIGHT
        } else if ( command == FULL ) {
            driver.brightness = BRIGHTNESS_MAX
        }

        var cmdByte = driver.lamp[command]
        //console.log('byte: ' + cmdByte)
        var valByte = command_options || valByteNA
        //console.log("ip: "+self)
        //console.log('sending: ' + cmdByte + ':' + valByte + ':' + cmdEndByte)

        var cmd = new Buffer([cmdByte, valByte, cmdEndByte]);
        var client = dgram.createSocket('udp4');

        client.send(cmd, 0, cmd.length, driver.port, driver.ipAddress, didFinishSend)
        //client.send(cmd, 0, cmd.length, driver.port, driver.ipAddress, didFinishSend)
        //console.log('sent')
    }

    sendUDPCommandToLamp()
    console.log("Sent command: "+command)
    console.log("Lamp: "+driver.group+" state: "+driver.switchedOn+"  brightness: "+driver.brightness)

}



// Export it
module.exports=Device;
