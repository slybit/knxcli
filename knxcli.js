'use strict'

const argv = require('yargs');
const util = require('util');
// turn off logs as loading the knx lib generates log we do no want
let logger = require('log-driver')({ level: false });
const knx = require('knx');
const DPTLib = require('knx/src/dptlib');
// turn logs back on
logger = require('log-driver')({ level: "info" });

/*
const options = {
    ipAddr: '192.168.1.150',
    ipPort: 3671
}
*/


// Set cli options
let args = argv
    // options
    .option('s', {
        alias: 'server',
        describe: 'KNX gateway IP/hostname',
        type: 'string',
        demandOption: false,
        default: '127.0.0.1'
    })
    .option('p', {
        alias: 'port',
        describe: 'KNX gateway port',
        type: 'string',
        demandOption: false,
        default: 3671
    })
    .option('t', {
        alias: 'tunnel',
        describe: 'Force tunneling mode',
        type: 'boolean',
        demandOption: false
    })
    .option('ga', {
        alias: 'groupaddress',
        describe: 'target GA',
        type: 'string',
        demandOption: false
    })
    .option('dpt', {
        describe: 'DPT type to use',
        type: 'string',
        demandOption: false
    })
    .option('d', {
        alias: 'data',
        describe: 'data to send',
        type: 'string',
        demandOption: false
    })
    .option('l', {
        alias: 'listen',
        describe: 'snoop the KNX bus',
        type: 'boolean',
        demandOption: false
    })
    .option('r', {
        alias: 'read',
        describe: 'read value',
        type: 'boolean',
        demandOption: false
    })
    // version
    .alias('v', 'version')
    .version()
    .describe('v', 'show version information')
    // help text
    .alias('h', 'help')
    .help('help')
    .usage('Usage: $0')
    .showHelpOnFail(true, "Specify --help for available options")
    .argv


// check sending options
if (args.ga) {

    if (!args.r && !args.data) {
        logger.error("Nothing to send");
        process.exit(1);
    }

    try {
        DPTLib.resolve(args.dpt);
    } catch (err) {
        logger.error("Invalid dpt provided: " + args.dpt);
        process.exit(1);
    }

}



let options = {
    ipAddr: args.s,
    ipPort: args.p,
    forceTunneling: args.t ? true : false,
    physAddr: '13.15.13',
    minimumDelay: 10,
}

let knxConnection = knx.Connection(Object.assign({
    handlers: {
        connected: function () {
            logger.debug('KNX connected, sending message');
            if (args.read) {
                readValue();
            } else {
                writeValue();
            }
        },
        event: function (evt, src, dest, value) {
            if (args.listen) logger.info(util.format("event: %s, src: %j, dest: %j, value: %j", evt, src, dest, value));
        },
        error: function (msg) {
            logger.debug('KNX disconnected');
        },
        disconnected: function () {
            logger.debug('KNX disconnected');
        }
    }
}, options))



const writeValue = function () {
    logger.debug("Writing value");
    setTimeout(function () {
        try {
            knxConnection.write(args.ga, args.data, args.dpt);
            if (!args.listen) knxConnection.Disconnect();
        } catch (err) {
            console.log(err);
            if (!args.listen) knxConnection.Disconnect();
        }
    }, 100);

}


const readValue = function () {
    logger.debug("Reading value");
    setTimeout(function () {
        try {
            knxConnection.read(args.ga, (src, apdu) => {
                try {
                    var response = {};
                    var dpt = DPTLib.resolve(args.dpt);
                    if (dpt.subtype) {
                        response.unit = dpt.subtype.unit;
                    }
                    response.val = DPTLib.fromBuffer(apdu, dpt);
                    // do some postprocessing on the val
                    if (response.val instanceof Date) {
                        response.val = response.val.toLocaleDateString();
                    }
                } catch (err) {
                    logger.error(err);
                    payload.val = '0x' + apdu.toString('hex');
                    payload.raw = true;
                }
                console.log(response);
                if (!args.listen) knxConnection.Disconnect();
            });
        } catch (err) {
            logger.error(err);
            if (!args.listen) knxConnection.Disconnect();
        }
    }, 100);

}


