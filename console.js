
/**
 * Adapted from https://github.com/reactiverse/es4x/blob/develop/es4x/src/main/resources/io/reactiverse/es4x/polyfill/console.js
 * Copyright 2014-2018 Red Hat, Inc.
 * Licensed under the Apache License, Version 2.0
 */

/**
 * Console namespace.
 * This namespace provides an alternative implentation to the builtin console object provided by the JS runtime 
 * to use the openHAB slf4j logging implementation
 **/
const System = Java.type('java.lang.System');
const log = require('./log')('console');

const formatRegExp = /%[sdj%]/g;

function stringify(value) {
    try {
        if (Java.isJavaObject(value)) {
            return value.toString();
        } else {
            // special cases
            if (value === undefined) {
                return "undefined"
            }
            if (typeof value === 'function') {
                return "[Function]"
            }
            if (value instanceof RegExp) {
                return value.toString();
            }
            // fallback to JSON
            return JSON.stringify(value, null, 2);
        }
    } catch (e) {
        return '[Circular: ' + e + ']';
    }
}

function format(f) {
    if (typeof f !== 'string') {
        var objects = [];
        for (var index = 0; index < arguments.length; index++) {
            objects.push(stringify(arguments[index]));
        }
        return objects.join(' ');
    }

    if (arguments.length === 1) return f;

    var i = 1;
    var args = arguments;
    var len = args.length;
    var str = String(f).replace(formatRegExp, function (x) {
        if (x === '%%') return '%';
        if (i >= len) return x;
        switch (x) {
            case '%s': return String(args[i++]);
            case '%d': return Number(args[i++]);
            case '%j':
                try {
                    return stringify(args[i++]);
                } catch (_) {
                    return '[Circular]';
                }
            // falls through
            default:
                return x;
        }
    });
    for (var x = args[i]; i < len; x = args[++i]) {
        if (x === null || (typeof x !== 'object' && typeof x !== 'symbol')) {
            str += ' ' + x;
        } else {
            str += ' ' + stringify(x);
        }
    }
    return str;
}

const counters = {};
const timers = {};

const customConsole = {
    'assert': function (expression, message) {
        if (!expression) {
            log.error(message);
        }
    },

    count: function (label) {
        let counter;

        if (label) {
            if (counters.hasOwnProperty(label)) {
                counter = counters[label];
            } else {
                counter = 0;
            }

            // update
            counters[label] = ++counter;
            log.debug(format.apply(null, [label + ':', counter]));
        }
    },

    debug: function () {
        log.debug(format.apply(null, arguments));
    },

    info: function () {
        log.info(format.apply(null, arguments));
    },

    log: function () {
        log.info(format.apply(null, arguments));
    },

    warn: function () {
        log.warn(format.apply(null, arguments));
    },

    error: function () {
        log.error(format.apply(null, arguments));
    },

    trace: function (e) {
        if (Java.isJavaObject(e)) {
            log.trace(e.getLocalizedMessage(), e);
        } else {
            if (e.stack) {
                log.trace(e.stack);
            } else {
                if (e.message) {
                    log.trace(format.apply(null, [(e.name || 'Error') + ':', e.message]));
                } else {
                    log.trace((e.name || 'Error'));
                }
            }
        }
    },

    time: function (label) {
        if (label) {
            timers[label] = System.currentTimeMillis();
        }
    },
    timeEnd: function (label) {
        if (label) {
            const now = System.currentTimeMillis();
            if (timers.hasOwnProperty(label)) {
                log.info(format.apply(null, [label + ':', (now - timers[label]) + 'ms']));
                delete timers[label];
            } else {
                log.info(format.apply(null, [label + ':', '<no timer>']));
            }
        }
    }
};
module.exports = customConsole;