'use strict'

const yargs = require('yargs');
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





/*
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
*/


const connect = function(command, argv) {

    let options = {
        ipAddr: argv.s,
        ipPort: argv.p,
        forceTunneling: argv.t ? true : false,
        physAddr: '13.15.13',
        minimumDelay: 10,
    }

    // check sending options
    /*
    if (command === 'write') {
        try {
            DPTLib.resolve(args.dpt);
        } catch (err) {
            logger.error("Invalid dpt provided: " + args.dpt);
            process.exit(1);
        }
    }
    */

    logger.info('Connecting to KNX gateway on ' + argv.s + ":" + argv.port);
    let knxConnection = knx.Connection(Object.assign({
        handlers: {
            connected: function () {
                logger.debug('KNX connected, sending message');
                if (command === 'read') {
                    readValue(knxConnection, argv);
                } else if (command === 'write') {
                    writeValue(knxConnection, argv);
                }
            },
            event: function (evt, src, dest, value) {
                if (command === 'listen') logger.info(util.format("event: %s, src: %j, dest: %j, value: %j", evt, src, dest, value));
            },
            error: function (msg) {
                logger.debug('KNX disconnected');
            },
            disconnected: function () {
                logger.debug('KNX disconnected');
            }
        }
    }, options))
}




const writeValue = function (knxConnection, argv) {
    logger.debug("Writing value");
    setTimeout(function () {
        try {
            knxConnection.write(argv.ga, argv.value, argv.dpt);
            knxConnection.Disconnect();
        } catch (err) {
            console.log(err.message);
            knxConnection.Disconnect();
        }
    }, 100);

}


const readValue = function (knxConnection, argv) {
    logger.debug("Reading value");
    setTimeout(function () {
        try {
            knxConnection.read(argv.ga, (src, apdu) => {
                try {
                    var response = {};
                    var dpt = DPTLib.resolve(argv.dpt);
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
                knxConnection.Disconnect();
            });
        } catch (err) {
            logger.error(err.message);
            knxConnection.Disconnect();
        }
    }, 100);

}




yargs
    .command({
        command: 'write <ga> <dpt> <value>',
        desc: 'send a KNX message',
        handler: (argv) => { connect('write', argv); }
    })
    .command({
        command: 'read <ga> <dpt>',
        desc: 'read data from KNX group address',
        handler: (argv) => { connect('read', argv); }
    })
    .command({
        command: 'listen',
        desc: 'listen to the KNX bus',
        handler: (argv) => { connect('listen', argv); }
    })
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
    .help()
    .argv


