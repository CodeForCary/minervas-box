/*[production-config]*/
steal={env: 'production', configMain: 'package.json!npm'};
/*steal*/
!function(e){"object"==typeof exports?module.exports=e():"function"==typeof define&&define.amd?define(e):"undefined"!=typeof window?window.Promise=e():"undefined"!=typeof global?global.Promise=e():"undefined"!=typeof self&&(self.Promise=e())}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

/**
 * ES6 global Promise shim
 */
var unhandledRejections = require('../lib/decorators/unhandledRejection');
var PromiseConstructor = unhandledRejections(require('../lib/Promise'));

module.exports = typeof global != 'undefined' ? (global.Promise = PromiseConstructor)
	           : typeof self   != 'undefined' ? (self.Promise   = PromiseConstructor)
	           : PromiseConstructor;

},{"../lib/Promise":2,"../lib/decorators/unhandledRejection":4}],2:[function(require,module,exports){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

(function(define) { 'use strict';
define(function (require) {

	var makePromise = require('./makePromise');
	var Scheduler = require('./Scheduler');
	var async = require('./env').asap;

	return makePromise({
		scheduler: new Scheduler(async)
	});

});
})(typeof define === 'function' && define.amd ? define : function (factory) { module.exports = factory(require); });

},{"./Scheduler":3,"./env":5,"./makePromise":7}],3:[function(require,module,exports){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

(function(define) { 'use strict';
define(function() {

	// Credit to Twisol (https://github.com/Twisol) for suggesting
	// this type of extensible queue + trampoline approach for next-tick conflation.

	/**
	 * Async task scheduler
	 * @param {function} async function to schedule a single async function
	 * @constructor
	 */
	function Scheduler(async) {
		this._async = async;
		this._running = false;

		this._queue = this;
		this._queueLen = 0;
		this._afterQueue = {};
		this._afterQueueLen = 0;

		var self = this;
		this.drain = function() {
			self._drain();
		};
	}

	/**
	 * Enqueue a task
	 * @param {{ run:function }} task
	 */
	Scheduler.prototype.enqueue = function(task) {
		this._queue[this._queueLen++] = task;
		this.run();
	};

	/**
	 * Enqueue a task to run after the main task queue
	 * @param {{ run:function }} task
	 */
	Scheduler.prototype.afterQueue = function(task) {
		this._afterQueue[this._afterQueueLen++] = task;
		this.run();
	};

	Scheduler.prototype.run = function() {
		if (!this._running) {
			this._running = true;
			this._async(this.drain);
		}
	};

	/**
	 * Drain the handler queue entirely, and then the after queue
	 */
	Scheduler.prototype._drain = function() {
		var i = 0;
		for (; i < this._queueLen; ++i) {
			this._queue[i].run();
			this._queue[i] = void 0;
		}

		this._queueLen = 0;
		this._running = false;

		for (i = 0; i < this._afterQueueLen; ++i) {
			this._afterQueue[i].run();
			this._afterQueue[i] = void 0;
		}

		this._afterQueueLen = 0;
	};

	return Scheduler;

});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(); }));

},{}],4:[function(require,module,exports){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

(function(define) { 'use strict';
define(function(require) {

	var setTimer = require('../env').setTimer;
	var format = require('../format');

	return function unhandledRejection(Promise) {

		var logError = noop;
		var logInfo = noop;
		var localConsole;

		if(typeof console !== 'undefined') {
			// Alias console to prevent things like uglify's drop_console option from
			// removing console.log/error. Unhandled rejections fall into the same
			// category as uncaught exceptions, and build tools shouldn't silence them.
			localConsole = console;
			logError = typeof localConsole.error !== 'undefined'
				? function (e) { localConsole.error(e); }
				: function (e) { localConsole.log(e); };

			logInfo = typeof localConsole.info !== 'undefined'
				? function (e) { localConsole.info(e); }
				: function (e) { localConsole.log(e); };
		}

		Promise.onPotentiallyUnhandledRejection = function(rejection) {
			enqueue(report, rejection);
		};

		Promise.onPotentiallyUnhandledRejectionHandled = function(rejection) {
			enqueue(unreport, rejection);
		};

		Promise.onFatalRejection = function(rejection) {
			enqueue(throwit, rejection.value);
		};

		var tasks = [];
		var reported = [];
		var running = null;

		function report(r) {
			if(!r.handled) {
				reported.push(r);
				logError('Potentially unhandled rejection [' + r.id + '] ' + format.formatError(r.value));
			}
		}

		function unreport(r) {
			var i = reported.indexOf(r);
			if(i >= 0) {
				reported.splice(i, 1);
				logInfo('Handled previous rejection [' + r.id + '] ' + format.formatObject(r.value));
			}
		}

		function enqueue(f, x) {
			tasks.push(f, x);
			if(running === null) {
				running = setTimer(flush, 0);
			}
		}

		function flush() {
			running = null;
			while(tasks.length > 0) {
				tasks.shift()(tasks.shift());
			}
		}

		return Promise;
	};

	function throwit(e) {
		throw e;
	}

	function noop() {}

});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(require); }));

},{"../env":5,"../format":6}],5:[function(require,module,exports){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

/*global process,document,setTimeout,clearTimeout,MutationObserver,WebKitMutationObserver*/
(function(define) { 'use strict';
define(function(require) {
	/*jshint maxcomplexity:6*/

	// Sniff "best" async scheduling option
	// Prefer process.nextTick or MutationObserver, then check for
	// setTimeout, and finally vertx, since its the only env that doesn't
	// have setTimeout

	var MutationObs;
	var capturedSetTimeout = typeof setTimeout !== 'undefined' && setTimeout;

	// Default env
	var setTimer = function(f, ms) { return setTimeout(f, ms); };
	var clearTimer = function(t) { return clearTimeout(t); };
	var asap = function (f) { return capturedSetTimeout(f, 0); };

	// Detect specific env
	if (isNode()) { // Node
		asap = function (f) { return process.nextTick(f); };

	} else if (MutationObs = hasMutationObserver()) { // Modern browser
		asap = initMutationObserver(MutationObs);

	} else if (!capturedSetTimeout) { // vert.x
		var vertxRequire = require;
		var vertx = vertxRequire('vertx');
		setTimer = function (f, ms) { return vertx.setTimer(ms, f); };
		clearTimer = vertx.cancelTimer;
		asap = vertx.runOnLoop || vertx.runOnContext;
	}

	return {
		setTimer: setTimer,
		clearTimer: clearTimer,
		asap: asap
	};

	function isNode () {
		return typeof process !== 'undefined' && process !== null &&
			typeof process.nextTick === 'function';
	}

	function hasMutationObserver () {
		return (typeof MutationObserver === 'function' && MutationObserver) ||
			(typeof WebKitMutationObserver === 'function' && WebKitMutationObserver);
	}

	function initMutationObserver(MutationObserver) {
		var scheduled;
		var node = document.createTextNode('');
		var o = new MutationObserver(run);
		o.observe(node, { characterData: true });

		function run() {
			var f = scheduled;
			scheduled = void 0;
			f();
		}

		var i = 0;
		return function (f) {
			scheduled = f;
			node.data = (i ^= 1);
		};
	}
});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(require); }));

},{}],6:[function(require,module,exports){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

(function(define) { 'use strict';
define(function() {

	return {
		formatError: formatError,
		formatObject: formatObject,
		tryStringify: tryStringify
	};

	/**
	 * Format an error into a string.  If e is an Error and has a stack property,
	 * it's returned.  Otherwise, e is formatted using formatObject, with a
	 * warning added about e not being a proper Error.
	 * @param {*} e
	 * @returns {String} formatted string, suitable for output to developers
	 */
	function formatError(e) {
		var s = typeof e === 'object' && e !== null && e.stack ? e.stack : formatObject(e);
		return e instanceof Error ? s : s + ' (WARNING: non-Error used)';
	}

	/**
	 * Format an object, detecting "plain" objects and running them through
	 * JSON.stringify if possible.
	 * @param {Object} o
	 * @returns {string}
	 */
	function formatObject(o) {
		var s = String(o);
		if(s === '[object Object]' && typeof JSON !== 'undefined') {
			s = tryStringify(o, s);
		}
		return s;
	}

	/**
	 * Try to return the result of JSON.stringify(x).  If that fails, return
	 * defaultValue
	 * @param {*} x
	 * @param {*} defaultValue
	 * @returns {String|*} JSON.stringify(x) or defaultValue
	 */
	function tryStringify(x, defaultValue) {
		try {
			return JSON.stringify(x);
		} catch(e) {
			return defaultValue;
		}
	}

});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(); }));

},{}],7:[function(require,module,exports){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

(function(define) { 'use strict';
define(function() {

	return function makePromise(environment) {

		var tasks = environment.scheduler;
		var emitRejection = initEmitRejection();

		var objectCreate = Object.create ||
			function(proto) {
				function Child() {}
				Child.prototype = proto;
				return new Child();
			};

		/**
		 * Create a promise whose fate is determined by resolver
		 * @constructor
		 * @returns {Promise} promise
		 * @name Promise
		 */
		function Promise(resolver, handler) {
			this._handler = resolver === Handler ? handler : init(resolver);
		}

		/**
		 * Run the supplied resolver
		 * @param resolver
		 * @returns {Pending}
		 */
		function init(resolver) {
			var handler = new Pending();

			try {
				resolver(promiseResolve, promiseReject, promiseNotify);
			} catch (e) {
				promiseReject(e);
			}

			return handler;

			/**
			 * Transition from pre-resolution state to post-resolution state, notifying
			 * all listeners of the ultimate fulfillment or rejection
			 * @param {*} x resolution value
			 */
			function promiseResolve (x) {
				handler.resolve(x);
			}
			/**
			 * Reject this promise with reason, which will be used verbatim
			 * @param {Error|*} reason rejection reason, strongly suggested
			 *   to be an Error type
			 */
			function promiseReject (reason) {
				handler.reject(reason);
			}

			/**
			 * @deprecated
			 * Issue a progress event, notifying all progress listeners
			 * @param {*} x progress event payload to pass to all listeners
			 */
			function promiseNotify (x) {
				handler.notify(x);
			}
		}

		// Creation

		Promise.resolve = resolve;
		Promise.reject = reject;
		Promise.never = never;

		Promise._defer = defer;
		Promise._handler = getHandler;

		/**
		 * Returns a trusted promise. If x is already a trusted promise, it is
		 * returned, otherwise returns a new trusted Promise which follows x.
		 * @param  {*} x
		 * @return {Promise} promise
		 */
		function resolve(x) {
			return isPromise(x) ? x
				: new Promise(Handler, new Async(getHandler(x)));
		}

		/**
		 * Return a reject promise with x as its reason (x is used verbatim)
		 * @param {*} x
		 * @returns {Promise} rejected promise
		 */
		function reject(x) {
			return new Promise(Handler, new Async(new Rejected(x)));
		}

		/**
		 * Return a promise that remains pending forever
		 * @returns {Promise} forever-pending promise.
		 */
		function never() {
			return foreverPendingPromise; // Should be frozen
		}

		/**
		 * Creates an internal {promise, resolver} pair
		 * @private
		 * @returns {Promise}
		 */
		function defer() {
			return new Promise(Handler, new Pending());
		}

		// Transformation and flow control

		/**
		 * Transform this promise's fulfillment value, returning a new Promise
		 * for the transformed result.  If the promise cannot be fulfilled, onRejected
		 * is called with the reason.  onProgress *may* be called with updates toward
		 * this promise's fulfillment.
		 * @param {function=} onFulfilled fulfillment handler
		 * @param {function=} onRejected rejection handler
		 * @param {function=} onProgress @deprecated progress handler
		 * @return {Promise} new promise
		 */
		Promise.prototype.then = function(onFulfilled, onRejected, onProgress) {
			var parent = this._handler;
			var state = parent.join().state();

			if ((typeof onFulfilled !== 'function' && state > 0) ||
				(typeof onRejected !== 'function' && state < 0)) {
				// Short circuit: value will not change, simply share handler
				return new this.constructor(Handler, parent);
			}

			var p = this._beget();
			var child = p._handler;

			parent.chain(child, parent.receiver, onFulfilled, onRejected, onProgress);

			return p;
		};

		/**
		 * If this promise cannot be fulfilled due to an error, call onRejected to
		 * handle the error. Shortcut for .then(undefined, onRejected)
		 * @param {function?} onRejected
		 * @return {Promise}
		 */
		Promise.prototype['catch'] = function(onRejected) {
			return this.then(void 0, onRejected);
		};

		/**
		 * Creates a new, pending promise of the same type as this promise
		 * @private
		 * @returns {Promise}
		 */
		Promise.prototype._beget = function() {
			return begetFrom(this._handler, this.constructor);
		};

		function begetFrom(parent, Promise) {
			var child = new Pending(parent.receiver, parent.join().context);
			return new Promise(Handler, child);
		}

		// Array combinators

		Promise.all = all;
		Promise.race = race;
		Promise._traverse = traverse;

		/**
		 * Return a promise that will fulfill when all promises in the
		 * input array have fulfilled, or will reject when one of the
		 * promises rejects.
		 * @param {array} promises array of promises
		 * @returns {Promise} promise for array of fulfillment values
		 */
		function all(promises) {
			return traverseWith(snd, null, promises);
		}

		/**
		 * Array<Promise<X>> -> Promise<Array<f(X)>>
		 * @private
		 * @param {function} f function to apply to each promise's value
		 * @param {Array} promises array of promises
		 * @returns {Promise} promise for transformed values
		 */
		function traverse(f, promises) {
			return traverseWith(tryCatch2, f, promises);
		}

		function traverseWith(tryMap, f, promises) {
			var handler = typeof f === 'function' ? mapAt : settleAt;

			var resolver = new Pending();
			var pending = promises.length >>> 0;
			var results = new Array(pending);

			for (var i = 0, x; i < promises.length && !resolver.resolved; ++i) {
				x = promises[i];

				if (x === void 0 && !(i in promises)) {
					--pending;
					continue;
				}

				traverseAt(promises, handler, i, x, resolver);
			}

			if(pending === 0) {
				resolver.become(new Fulfilled(results));
			}

			return new Promise(Handler, resolver);

			function mapAt(i, x, resolver) {
				if(!resolver.resolved) {
					traverseAt(promises, settleAt, i, tryMap(f, x, i), resolver);
				}
			}

			function settleAt(i, x, resolver) {
				results[i] = x;
				if(--pending === 0) {
					resolver.become(new Fulfilled(results));
				}
			}
		}

		function traverseAt(promises, handler, i, x, resolver) {
			if (maybeThenable(x)) {
				var h = getHandlerMaybeThenable(x);
				var s = h.state();

				if (s === 0) {
					h.fold(handler, i, void 0, resolver);
				} else if (s > 0) {
					handler(i, h.value, resolver);
				} else {
					resolver.become(h);
					visitRemaining(promises, i+1, h);
				}
			} else {
				handler(i, x, resolver);
			}
		}

		Promise._visitRemaining = visitRemaining;
		function visitRemaining(promises, start, handler) {
			for(var i=start; i<promises.length; ++i) {
				markAsHandled(getHandler(promises[i]), handler);
			}
		}

		function markAsHandled(h, handler) {
			if(h === handler) {
				return;
			}

			var s = h.state();
			if(s === 0) {
				h.visit(h, void 0, h._unreport);
			} else if(s < 0) {
				h._unreport();
			}
		}

		/**
		 * Fulfill-reject competitive race. Return a promise that will settle
		 * to the same state as the earliest input promise to settle.
		 *
		 * WARNING: The ES6 Promise spec requires that race()ing an empty array
		 * must return a promise that is pending forever.  This implementation
		 * returns a singleton forever-pending promise, the same singleton that is
		 * returned by Promise.never(), thus can be checked with ===
		 *
		 * @param {array} promises array of promises to race
		 * @returns {Promise} if input is non-empty, a promise that will settle
		 * to the same outcome as the earliest input promise to settle. if empty
		 * is empty, returns a promise that will never settle.
		 */
		function race(promises) {
			if(typeof promises !== 'object' || promises === null) {
				return reject(new TypeError('non-iterable passed to race()'));
			}

			// Sigh, race([]) is untestable unless we return *something*
			// that is recognizable without calling .then() on it.
			return promises.length === 0 ? never()
				 : promises.length === 1 ? resolve(promises[0])
				 : runRace(promises);
		}

		function runRace(promises) {
			var resolver = new Pending();
			var i, x, h;
			for(i=0; i<promises.length; ++i) {
				x = promises[i];
				if (x === void 0 && !(i in promises)) {
					continue;
				}

				h = getHandler(x);
				if(h.state() !== 0) {
					resolver.become(h);
					visitRemaining(promises, i+1, h);
					break;
				} else {
					h.visit(resolver, resolver.resolve, resolver.reject);
				}
			}
			return new Promise(Handler, resolver);
		}

		// Promise internals
		// Below this, everything is @private

		/**
		 * Get an appropriate handler for x, without checking for cycles
		 * @param {*} x
		 * @returns {object} handler
		 */
		function getHandler(x) {
			if(isPromise(x)) {
				return x._handler.join();
			}
			return maybeThenable(x) ? getHandlerUntrusted(x) : new Fulfilled(x);
		}

		/**
		 * Get a handler for thenable x.
		 * NOTE: You must only call this if maybeThenable(x) == true
		 * @param {object|function|Promise} x
		 * @returns {object} handler
		 */
		function getHandlerMaybeThenable(x) {
			return isPromise(x) ? x._handler.join() : getHandlerUntrusted(x);
		}

		/**
		 * Get a handler for potentially untrusted thenable x
		 * @param {*} x
		 * @returns {object} handler
		 */
		function getHandlerUntrusted(x) {
			try {
				var untrustedThen = x.then;
				return typeof untrustedThen === 'function'
					? new Thenable(untrustedThen, x)
					: new Fulfilled(x);
			} catch(e) {
				return new Rejected(e);
			}
		}

		/**
		 * Handler for a promise that is pending forever
		 * @constructor
		 */
		function Handler() {}

		Handler.prototype.when
			= Handler.prototype.become
			= Handler.prototype.notify // deprecated
			= Handler.prototype.fail
			= Handler.prototype._unreport
			= Handler.prototype._report
			= noop;

		Handler.prototype._state = 0;

		Handler.prototype.state = function() {
			return this._state;
		};

		/**
		 * Recursively collapse handler chain to find the handler
		 * nearest to the fully resolved value.
		 * @returns {object} handler nearest the fully resolved value
		 */
		Handler.prototype.join = function() {
			var h = this;
			while(h.handler !== void 0) {
				h = h.handler;
			}
			return h;
		};

		Handler.prototype.chain = function(to, receiver, fulfilled, rejected, progress) {
			this.when({
				resolver: to,
				receiver: receiver,
				fulfilled: fulfilled,
				rejected: rejected,
				progress: progress
			});
		};

		Handler.prototype.visit = function(receiver, fulfilled, rejected, progress) {
			this.chain(failIfRejected, receiver, fulfilled, rejected, progress);
		};

		Handler.prototype.fold = function(f, z, c, to) {
			this.when(new Fold(f, z, c, to));
		};

		/**
		 * Handler that invokes fail() on any handler it becomes
		 * @constructor
		 */
		function FailIfRejected() {}

		inherit(Handler, FailIfRejected);

		FailIfRejected.prototype.become = function(h) {
			h.fail();
		};

		var failIfRejected = new FailIfRejected();

		/**
		 * Handler that manages a queue of consumers waiting on a pending promise
		 * @constructor
		 */
		function Pending(receiver, inheritedContext) {
			Promise.createContext(this, inheritedContext);

			this.consumers = void 0;
			this.receiver = receiver;
			this.handler = void 0;
			this.resolved = false;
		}

		inherit(Handler, Pending);

		Pending.prototype._state = 0;

		Pending.prototype.resolve = function(x) {
			this.become(getHandler(x));
		};

		Pending.prototype.reject = function(x) {
			if(this.resolved) {
				return;
			}

			this.become(new Rejected(x));
		};

		Pending.prototype.join = function() {
			if (!this.resolved) {
				return this;
			}

			var h = this;

			while (h.handler !== void 0) {
				h = h.handler;
				if (h === this) {
					return this.handler = cycle();
				}
			}

			return h;
		};

		Pending.prototype.run = function() {
			var q = this.consumers;
			var handler = this.handler;
			this.handler = this.handler.join();
			this.consumers = void 0;

			for (var i = 0; i < q.length; ++i) {
				handler.when(q[i]);
			}
		};

		Pending.prototype.become = function(handler) {
			if(this.resolved) {
				return;
			}

			this.resolved = true;
			this.handler = handler;
			if(this.consumers !== void 0) {
				tasks.enqueue(this);
			}

			if(this.context !== void 0) {
				handler._report(this.context);
			}
		};

		Pending.prototype.when = function(continuation) {
			if(this.resolved) {
				tasks.enqueue(new ContinuationTask(continuation, this.handler));
			} else {
				if(this.consumers === void 0) {
					this.consumers = [continuation];
				} else {
					this.consumers.push(continuation);
				}
			}
		};

		/**
		 * @deprecated
		 */
		Pending.prototype.notify = function(x) {
			if(!this.resolved) {
				tasks.enqueue(new ProgressTask(x, this));
			}
		};

		Pending.prototype.fail = function(context) {
			var c = typeof context === 'undefined' ? this.context : context;
			this.resolved && this.handler.join().fail(c);
		};

		Pending.prototype._report = function(context) {
			this.resolved && this.handler.join()._report(context);
		};

		Pending.prototype._unreport = function() {
			this.resolved && this.handler.join()._unreport();
		};

		/**
		 * Wrap another handler and force it into a future stack
		 * @param {object} handler
		 * @constructor
		 */
		function Async(handler) {
			this.handler = handler;
		}

		inherit(Handler, Async);

		Async.prototype.when = function(continuation) {
			tasks.enqueue(new ContinuationTask(continuation, this));
		};

		Async.prototype._report = function(context) {
			this.join()._report(context);
		};

		Async.prototype._unreport = function() {
			this.join()._unreport();
		};

		/**
		 * Handler that wraps an untrusted thenable and assimilates it in a future stack
		 * @param {function} then
		 * @param {{then: function}} thenable
		 * @constructor
		 */
		function Thenable(then, thenable) {
			Pending.call(this);
			tasks.enqueue(new AssimilateTask(then, thenable, this));
		}

		inherit(Pending, Thenable);

		/**
		 * Handler for a fulfilled promise
		 * @param {*} x fulfillment value
		 * @constructor
		 */
		function Fulfilled(x) {
			Promise.createContext(this);
			this.value = x;
		}

		inherit(Handler, Fulfilled);

		Fulfilled.prototype._state = 1;

		Fulfilled.prototype.fold = function(f, z, c, to) {
			runContinuation3(f, z, this, c, to);
		};

		Fulfilled.prototype.when = function(cont) {
			runContinuation1(cont.fulfilled, this, cont.receiver, cont.resolver);
		};

		var errorId = 0;

		/**
		 * Handler for a rejected promise
		 * @param {*} x rejection reason
		 * @constructor
		 */
		function Rejected(x) {
			Promise.createContext(this);

			this.id = ++errorId;
			this.value = x;
			this.handled = false;
			this.reported = false;

			this._report();
		}

		inherit(Handler, Rejected);

		Rejected.prototype._state = -1;

		Rejected.prototype.fold = function(f, z, c, to) {
			to.become(this);
		};

		Rejected.prototype.when = function(cont) {
			if(typeof cont.rejected === 'function') {
				this._unreport();
			}
			runContinuation1(cont.rejected, this, cont.receiver, cont.resolver);
		};

		Rejected.prototype._report = function(context) {
			tasks.afterQueue(new ReportTask(this, context));
		};

		Rejected.prototype._unreport = function() {
			if(this.handled) {
				return;
			}
			this.handled = true;
			tasks.afterQueue(new UnreportTask(this));
		};

		Rejected.prototype.fail = function(context) {
			this.reported = true;
			emitRejection('unhandledRejection', this);
			Promise.onFatalRejection(this, context === void 0 ? this.context : context);
		};

		function ReportTask(rejection, context) {
			this.rejection = rejection;
			this.context = context;
		}

		ReportTask.prototype.run = function() {
			if(!this.rejection.handled && !this.rejection.reported) {
				this.rejection.reported = true;
				emitRejection('unhandledRejection', this.rejection) ||
					Promise.onPotentiallyUnhandledRejection(this.rejection, this.context);
			}
		};

		function UnreportTask(rejection) {
			this.rejection = rejection;
		}

		UnreportTask.prototype.run = function() {
			if(this.rejection.reported) {
				emitRejection('rejectionHandled', this.rejection) ||
					Promise.onPotentiallyUnhandledRejectionHandled(this.rejection);
			}
		};

		// Unhandled rejection hooks
		// By default, everything is a noop

		Promise.createContext
			= Promise.enterContext
			= Promise.exitContext
			= Promise.onPotentiallyUnhandledRejection
			= Promise.onPotentiallyUnhandledRejectionHandled
			= Promise.onFatalRejection
			= noop;

		// Errors and singletons

		var foreverPendingHandler = new Handler();
		var foreverPendingPromise = new Promise(Handler, foreverPendingHandler);

		function cycle() {
			return new Rejected(new TypeError('Promise cycle'));
		}

		// Task runners

		/**
		 * Run a single consumer
		 * @constructor
		 */
		function ContinuationTask(continuation, handler) {
			this.continuation = continuation;
			this.handler = handler;
		}

		ContinuationTask.prototype.run = function() {
			this.handler.join().when(this.continuation);
		};

		/**
		 * Run a queue of progress handlers
		 * @constructor
		 */
		function ProgressTask(value, handler) {
			this.handler = handler;
			this.value = value;
		}

		ProgressTask.prototype.run = function() {
			var q = this.handler.consumers;
			if(q === void 0) {
				return;
			}

			for (var c, i = 0; i < q.length; ++i) {
				c = q[i];
				runNotify(c.progress, this.value, this.handler, c.receiver, c.resolver);
			}
		};

		/**
		 * Assimilate a thenable, sending it's value to resolver
		 * @param {function} then
		 * @param {object|function} thenable
		 * @param {object} resolver
		 * @constructor
		 */
		function AssimilateTask(then, thenable, resolver) {
			this._then = then;
			this.thenable = thenable;
			this.resolver = resolver;
		}

		AssimilateTask.prototype.run = function() {
			var h = this.resolver;
			tryAssimilate(this._then, this.thenable, _resolve, _reject, _notify);

			function _resolve(x) { h.resolve(x); }
			function _reject(x)  { h.reject(x); }
			function _notify(x)  { h.notify(x); }
		};

		function tryAssimilate(then, thenable, resolve, reject, notify) {
			try {
				then.call(thenable, resolve, reject, notify);
			} catch (e) {
				reject(e);
			}
		}

		/**
		 * Fold a handler value with z
		 * @constructor
		 */
		function Fold(f, z, c, to) {
			this.f = f; this.z = z; this.c = c; this.to = to;
			this.resolver = failIfRejected;
			this.receiver = this;
		}

		Fold.prototype.fulfilled = function(x) {
			this.f.call(this.c, this.z, x, this.to);
		};

		Fold.prototype.rejected = function(x) {
			this.to.reject(x);
		};

		Fold.prototype.progress = function(x) {
			this.to.notify(x);
		};

		// Other helpers

		/**
		 * @param {*} x
		 * @returns {boolean} true iff x is a trusted Promise
		 */
		function isPromise(x) {
			return x instanceof Promise;
		}

		/**
		 * Test just enough to rule out primitives, in order to take faster
		 * paths in some code
		 * @param {*} x
		 * @returns {boolean} false iff x is guaranteed *not* to be a thenable
		 */
		function maybeThenable(x) {
			return (typeof x === 'object' || typeof x === 'function') && x !== null;
		}

		function runContinuation1(f, h, receiver, next) {
			if(typeof f !== 'function') {
				return next.become(h);
			}

			Promise.enterContext(h);
			tryCatchReject(f, h.value, receiver, next);
			Promise.exitContext();
		}

		function runContinuation3(f, x, h, receiver, next) {
			if(typeof f !== 'function') {
				return next.become(h);
			}

			Promise.enterContext(h);
			tryCatchReject3(f, x, h.value, receiver, next);
			Promise.exitContext();
		}

		/**
		 * @deprecated
		 */
		function runNotify(f, x, h, receiver, next) {
			if(typeof f !== 'function') {
				return next.notify(x);
			}

			Promise.enterContext(h);
			tryCatchReturn(f, x, receiver, next);
			Promise.exitContext();
		}

		function tryCatch2(f, a, b) {
			try {
				return f(a, b);
			} catch(e) {
				return reject(e);
			}
		}

		/**
		 * Return f.call(thisArg, x), or if it throws return a rejected promise for
		 * the thrown exception
		 */
		function tryCatchReject(f, x, thisArg, next) {
			try {
				next.become(getHandler(f.call(thisArg, x)));
			} catch(e) {
				next.become(new Rejected(e));
			}
		}

		/**
		 * Same as above, but includes the extra argument parameter.
		 */
		function tryCatchReject3(f, x, y, thisArg, next) {
			try {
				f.call(thisArg, x, y, next);
			} catch(e) {
				next.become(new Rejected(e));
			}
		}

		/**
		 * @deprecated
		 * Return f.call(thisArg, x), or if it throws, *return* the exception
		 */
		function tryCatchReturn(f, x, thisArg, next) {
			try {
				next.notify(f.call(thisArg, x));
			} catch(e) {
				next.notify(e);
			}
		}

		function inherit(Parent, Child) {
			Child.prototype = objectCreate(Parent.prototype);
			Child.prototype.constructor = Child;
		}

		function snd(x, y) {
			return y;
		}

		function noop() {}

		function initEmitRejection() {
			/*global process, self, CustomEvent*/
			if(typeof process !== 'undefined' && process !== null
				&& typeof process.emit === 'function') {
				// Returning falsy here means to call the default
				// onPotentiallyUnhandledRejection API.  This is safe even in
				// browserify since process.emit always returns falsy in browserify:
				// https://github.com/defunctzombie/node-process/blob/master/browser.js#L40-L46
				return function(type, rejection) {
					return type === 'unhandledRejection'
						? process.emit(type, rejection.value, rejection)
						: process.emit(type, rejection);
				};
			} else if(typeof self !== 'undefined' && typeof CustomEvent === 'function') {
				return (function(noop, self, CustomEvent) {
					var hasCustomEvent = false;
					try {
						var ev = new CustomEvent('unhandledRejection');
						hasCustomEvent = ev instanceof CustomEvent;
					} catch (e) {}

					return !hasCustomEvent ? noop : function(type, rejection) {
						var ev = new CustomEvent(type, {
							detail: {
								reason: rejection.value,
								key: rejection
							},
							bubbles: false,
							cancelable: true
						});

						return !self.dispatchEvent(ev);
					};
				}(noop, self, CustomEvent));
			}

			return noop;
		}

		return Promise;
	};
});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(); }));

},{}]},{},[1])
(1)
});
;
(function(__global) {
  
$__Object$getPrototypeOf = Object.getPrototypeOf || function(obj) {
  return obj.__proto__;
};

var $__Object$defineProperty;
(function () {
  try {
    if (!!Object.defineProperty({}, 'a', {})) {
      $__Object$defineProperty = Object.defineProperty;
    }
  } catch (e) {
    $__Object$defineProperty = function (obj, prop, opt) {
      try {
        obj[prop] = opt.value || opt.get.call(obj);
      }
      catch(e) {}
    }
  }
}());

$__Object$create = Object.create || function(o, props) {
  function F() {}
  F.prototype = o;

  if (typeof(props) === "object") {
    for (prop in props) {
      if (props.hasOwnProperty((prop))) {
        F[prop] = props[prop];
      }
    }
  }
  return new F();
};

/*
*********************************************************************************************

  Dynamic Module Loader Polyfill

    - Implemented exactly to the former 2014-08-24 ES6 Specification Draft Rev 27, Section 15
      http://wiki.ecmascript.org/doku.php?id=harmony:specification_drafts#august_24_2014_draft_rev_27

    - Functions are commented with their spec numbers, with spec differences commented.

    - Spec bugs are commented in this code with links.

    - Abstract functions have been combined where possible, and their associated functions
      commented.

    - Realm implementation is entirely omitted.

*********************************************************************************************
*/

// Some Helpers

// logs a linkset snapshot for debugging
/* function snapshot(loader) {
  console.log('---Snapshot---');
  for (var i = 0; i < loader.loads.length; i++) {
    var load = loader.loads[i];
    var linkSetLog = '  ' + load.name + ' (' + load.status + '): ';

    for (var j = 0; j < load.linkSets.length; j++) {
      linkSetLog += '{' + logloads(load.linkSets[j].loads) + '} ';
    }
    console.log(linkSetLog);
  }
  console.log('');
}
function logloads(loads) {
  var log = '';
  for (var k = 0; k < loads.length; k++)
    log += loads[k].name + (k != loads.length - 1 ? ' ' : '');
  return log;
} */


/* function checkInvariants() {
  // see https://bugs.ecmascript.org/show_bug.cgi?id=2603#c1

  var loads = System._loader.loads;
  var linkSets = [];

  for (var i = 0; i < loads.length; i++) {
    var load = loads[i];
    console.assert(load.status == 'loading' || load.status == 'loaded', 'Each load is loading or loaded');

    for (var j = 0; j < load.linkSets.length; j++) {
      var linkSet = load.linkSets[j];

      for (var k = 0; k < linkSet.loads.length; k++)
        console.assert(loads.indexOf(linkSet.loads[k]) != -1, 'linkSet loads are a subset of loader loads');

      if (linkSets.indexOf(linkSet) == -1)
        linkSets.push(linkSet);
    }
  }

  for (var i = 0; i < loads.length; i++) {
    var load = loads[i];
    for (var j = 0; j < linkSets.length; j++) {
      var linkSet = linkSets[j];

      if (linkSet.loads.indexOf(load) != -1)
        console.assert(load.linkSets.indexOf(linkSet) != -1, 'linkSet contains load -> load contains linkSet');

      if (load.linkSets.indexOf(linkSet) != -1)
        console.assert(linkSet.loads.indexOf(load) != -1, 'load contains linkSet -> linkSet contains load');
    }
  }

  for (var i = 0; i < linkSets.length; i++) {
    var linkSet = linkSets[i];
    for (var j = 0; j < linkSet.loads.length; j++) {
      var load = linkSet.loads[j];

      for (var k = 0; k < load.dependencies.length; k++) {
        var depName = load.dependencies[k].value;
        var depLoad;
        for (var l = 0; l < loads.length; l++) {
          if (loads[l].name != depName)
            continue;
          depLoad = loads[l];
          break;
        }

        // loading records are allowed not to have their dependencies yet
        // if (load.status != 'loading')
        //  console.assert(depLoad, 'depLoad found');

        // console.assert(linkSet.loads.indexOf(depLoad) != -1, 'linkset contains all dependencies');
      }
    }
  }
} */


(function() {
  var Promise = __global.Promise || require('when/es6-shim/Promise');
  if (__global.console)
    console.assert = console.assert || function() {};

  // IE8 support
  var indexOf = Array.prototype.indexOf || function(item) {
    for (var i = 0, thisLen = this.length; i < thisLen; i++) {
      if (this[i] === item) {
        return i;
      }
    }
    return -1;
  };
  var defineProperty = $__Object$defineProperty;

  // 15.2.3 - Runtime Semantics: Loader State

  // 15.2.3.11
  function createLoaderLoad(object) {
    return {
      // modules is an object for ES5 implementation
      modules: {},
      loads: [],
      loaderObj: object
    };
  }

  // 15.2.3.2 Load Records and LoadRequest Objects

  // 15.2.3.2.1
  function createLoad(name) {
    return {
      status: 'loading',
      name: name,
      linkSets: [],
      dependencies: [],
      metadata: {}
    };
  }

  // 15.2.3.2.2 createLoadRequestObject, absorbed into calling functions

  // 15.2.4

  // 15.2.4.1
  function loadModule(loader, name, options) {
    return new Promise(asyncStartLoadPartwayThrough({
      step: options.address ? 'fetch' : 'locate',
      loader: loader,
      moduleName: name,
      // allow metadata for import https://bugs.ecmascript.org/show_bug.cgi?id=3091
      moduleMetadata: options && options.metadata || {},
      moduleSource: options.source,
      moduleAddress: options.address
    }));
  }

  // 15.2.4.2
  function requestLoad(loader, request, refererName, refererAddress) {
    // 15.2.4.2.1 CallNormalize
    return new Promise(function(resolve, reject) {
      resolve(loader.loaderObj.normalize(request, refererName, refererAddress));
    })
    // 15.2.4.2.2 GetOrCreateLoad
    .then(function(name) {
      var load;
      if (loader.modules[name]) {
        load = createLoad(name);
        load.status = 'linked';
        // https://bugs.ecmascript.org/show_bug.cgi?id=2795
        load.module = loader.modules[name];
        return load;
      }

      for (var i = 0, l = loader.loads.length; i < l; i++) {
        load = loader.loads[i];
        if (load.name != name)
          continue;
        console.assert(load.status == 'loading' || load.status == 'loaded', 'loading or loaded');
        return load;
      }

      load = createLoad(name);
      loader.loads.push(load);

      proceedToLocate(loader, load);

      return load;
    });
  }

  // 15.2.4.3
  function proceedToLocate(loader, load) {
    proceedToFetch(loader, load,
      Promise.resolve()
      // 15.2.4.3.1 CallLocate
      .then(function() {
        return loader.loaderObj.locate({ name: load.name, metadata: load.metadata });
      })
    );
  }

  // 15.2.4.4
  function proceedToFetch(loader, load, p) {
    proceedToTranslate(loader, load,
      p
      // 15.2.4.4.1 CallFetch
      .then(function(address) {
        // adjusted, see https://bugs.ecmascript.org/show_bug.cgi?id=2602
        if (load.status != 'loading')
          return;
        load.address = address;

        return loader.loaderObj.fetch({ name: load.name, metadata: load.metadata, address: address });
      })
    );
  }

  var anonCnt = 0;

  // 15.2.4.5
  function proceedToTranslate(loader, load, p) {
    p
    // 15.2.4.5.1 CallTranslate
    .then(function(source) {
      if (load.status != 'loading')
        return;

      return Promise.resolve(loader.loaderObj.translate({ name: load.name, metadata: load.metadata, address: load.address, source: source }))

      // 15.2.4.5.2 CallInstantiate
      .then(function(source) {
        if(load.status != 'loading') {
          return;
        }
        load.source = source;
        return loader.loaderObj.instantiate({ name: load.name, metadata: load.metadata, address: load.address, source: source });
      })

      // 15.2.4.5.3 InstantiateSucceeded
      .then(function(instantiateResult) {
        if(load.status != 'loading') {
          return;
        }
        if (instantiateResult === undefined) {
          load.address = load.address || '<Anonymous Module ' + ++anonCnt + '>';

          // instead of load.kind, use load.isDeclarative
          load.isDeclarative = true;
          return loader.loaderObj.transpile(load)
          .then(function(transpiled) {
            // Hijack System.register to set declare function
            var curSystem = __global.System;
            var curRegister = curSystem.register;
            curSystem.register = function(name, deps, declare) {
              if (typeof name != 'string') {
                declare = deps;
                deps = name;
              }
              // store the registered declaration as load.declare
              // store the deps as load.deps
              load.declare = declare;
              load.depsList = deps;
            }            
            __eval(transpiled, __global, load);
            curSystem.register = curRegister;
          });
        }
        else if (typeof instantiateResult == 'object') {
          load.depsList = instantiateResult.deps || [];
          load.execute = instantiateResult.execute;
          load.isDeclarative = false;
        }
        else
          throw TypeError('Invalid instantiate return value');
      })
      // 15.2.4.6 ProcessLoadDependencies
      .then(function() {
        if(load.status != 'loading') {
          return;
        }
        load.dependencies = [];
        var depsList = load.depsList;

        var loadPromises = [];
        for (var i = 0, l = depsList.length; i < l; i++) (function(request, index) {
          loadPromises.push(
            requestLoad(loader, request, load.name, load.address)

            // 15.2.4.6.1 AddDependencyLoad (load is parentLoad)
            .then(function(depLoad) {

              // adjusted from spec to maintain dependency order
              // this is due to the System.register internal implementation needs
              load.dependencies[index] = {
                key: request,
                value: depLoad.name
              };

              if (depLoad.status != 'linked') {
                var linkSets = load.linkSets.concat([]);
                for (var i = 0, l = linkSets.length; i < l; i++)
                  addLoadToLinkSet(linkSets[i], depLoad);
              }

              // console.log('AddDependencyLoad ' + depLoad.name + ' for ' + load.name);
              // snapshot(loader);
            })
          );
        })(depsList[i], i);

        return Promise.all(loadPromises);
      })

      // 15.2.4.6.2 LoadSucceeded
      .then(function() {
        // console.log('LoadSucceeded ' + load.name);
        // snapshot(loader);
        if(load.status != 'loading') {
          return;
        }

        console.assert(load.status == 'loading', 'is loading');

        load.status = 'loaded';

        var linkSets = load.linkSets.concat([]);
        for (var i = 0, l = linkSets.length; i < l; i++)
          updateLinkSetOnLoad(linkSets[i], load);
      });
    })
    // 15.2.4.5.4 LoadFailed
    ['catch'](function(exc) {
      load.status = 'failed';
      load.exception = exc;

      var linkSets = load.linkSets.concat([]);
      for (var i = 0, l = linkSets.length; i < l; i++) {
        linkSetFailed(linkSets[i], load, exc);
      }

      console.assert(load.linkSets.length == 0, 'linkSets not removed');
    });
  }

  // 15.2.4.7 PromiseOfStartLoadPartwayThrough absorbed into calling functions

  // 15.2.4.7.1
  function asyncStartLoadPartwayThrough(stepState) {
    return function(resolve, reject) {
      var loader = stepState.loader;
      var name = stepState.moduleName;
      var step = stepState.step;

      if (loader.modules[name])
        throw new TypeError('"' + name + '" already exists in the module table');

      // adjusted to pick up existing loads
      var existingLoad;
      for (var i = 0, l = loader.loads.length; i < l; i++) {
        if (loader.loads[i].name == name) {
          existingLoad = loader.loads[i];

          if(step == 'translate' && !existingLoad.source) {
            existingLoad.address = stepState.moduleAddress;
            proceedToTranslate(loader, existingLoad, Promise.resolve(stepState.moduleSource));
          }

          return existingLoad.linkSets[0].done.then(function() {
            resolve(existingLoad);
          });
        }
      }

      var load = createLoad(name);

      load.metadata = stepState.moduleMetadata;

      var linkSet = createLinkSet(loader, load);

      loader.loads.push(load);

      resolve(linkSet.done);

      if (step == 'locate')
        proceedToLocate(loader, load);

      else if (step == 'fetch')
        proceedToFetch(loader, load, Promise.resolve(stepState.moduleAddress));

      else {
        console.assert(step == 'translate', 'translate step');
        load.address = stepState.moduleAddress;
        proceedToTranslate(loader, load, Promise.resolve(stepState.moduleSource));
      }
    }
  }

  // Declarative linking functions run through alternative implementation:
  // 15.2.5.1.1 CreateModuleLinkageRecord not implemented
  // 15.2.5.1.2 LookupExport not implemented
  // 15.2.5.1.3 LookupModuleDependency not implemented

  // 15.2.5.2.1
  function createLinkSet(loader, startingLoad) {
    var linkSet = {
      loader: loader,
      loads: [],
      startingLoad: startingLoad, // added see spec bug https://bugs.ecmascript.org/show_bug.cgi?id=2995
      loadingCount: 0
    };
    linkSet.done = new Promise(function(resolve, reject) {
      linkSet.resolve = resolve;
      linkSet.reject = reject;
    });
    addLoadToLinkSet(linkSet, startingLoad);
    return linkSet;
  }
  // 15.2.5.2.2
  function addLoadToLinkSet(linkSet, load) {
    console.assert(load.status == 'loading' || load.status == 'loaded', 'loading or loaded on link set');

    for (var i = 0, l = linkSet.loads.length; i < l; i++)
      if (linkSet.loads[i] == load)
        return;

    linkSet.loads.push(load);
    load.linkSets.push(linkSet);

    // adjustment, see https://bugs.ecmascript.org/show_bug.cgi?id=2603
    if (load.status != 'loaded') {
      linkSet.loadingCount++;
    }

    var loader = linkSet.loader;

    for (var i = 0, l = load.dependencies.length; i < l; i++) {
      var name = load.dependencies[i].value;

      if (loader.modules[name])
        continue;

      for (var j = 0, d = loader.loads.length; j < d; j++) {
        if (loader.loads[j].name != name)
          continue;

        addLoadToLinkSet(linkSet, loader.loads[j]);
        break;
      }
    }
    // console.log('add to linkset ' + load.name);
    // snapshot(linkSet.loader);
  }

  // linking errors can be generic or load-specific
  // this is necessary for debugging info
  function doLink(linkSet) {
    var error = false;
    try {
      link(linkSet, function(load, exc) {
        linkSetFailed(linkSet, load, exc);
        error = true;
      });
    }
    catch(e) {
      linkSetFailed(linkSet, null, e);
      error = true;
    }
    return error;
  }

  // 15.2.5.2.3
  function updateLinkSetOnLoad(linkSet, load) {
    // console.log('update linkset on load ' + load.name);
    // snapshot(linkSet.loader);

    console.assert(load.status == 'loaded' || load.status == 'linked', 'loaded or linked');

    linkSet.loadingCount--;

    if (linkSet.loadingCount > 0)
      return;

    // adjusted for spec bug https://bugs.ecmascript.org/show_bug.cgi?id=2995
    var startingLoad = linkSet.startingLoad;

    // non-executing link variation for loader tracing
    // on the server. Not in spec.
    /***/
    if (linkSet.loader.loaderObj.execute === false) {
      var loads = [].concat(linkSet.loads);
      for (var i = 0, l = loads.length; i < l; i++) {
        var load = loads[i];
        load.module = !load.isDeclarative ? {
          module: _newModule({})
        } : {
          name: load.name,
          module: _newModule({}),
          evaluated: true
        };
        load.status = 'linked';
        finishLoad(linkSet.loader, load);
      }
      return linkSet.resolve(startingLoad);
    }
    /***/

    var abrupt = doLink(linkSet);

    if (abrupt)
      return;

    console.assert(linkSet.loads.length == 0, 'loads cleared');

    linkSet.resolve(startingLoad);
  }

  // 15.2.5.2.4
  function linkSetFailed(linkSet, load, exc) {
    var loader = linkSet.loader;

    if (linkSet.loads[0].name != load.name)
      exc = addToError(exc, 'Error loading "' + load.name + '" from "' + linkSet.loads[0].name + '" at ' + (linkSet.loads[0].address || '<unknown>') + '\n');

    exc = addToError(exc, 'Error loading "' + load.name + '" at ' + (load.address || '<unknown>') + '\n');

    var loads = linkSet.loads.concat([]);
    for (var i = 0, l = loads.length; i < l; i++) {
      var load = loads[i];

      // store all failed load records
      loader.loaderObj.failed = loader.loaderObj.failed || [];
      if (indexOf.call(loader.loaderObj.failed, load) == -1)
        loader.loaderObj.failed.push(load);

      var linkIndex = indexOf.call(load.linkSets, linkSet);
      console.assert(linkIndex != -1, 'link not present');
      load.linkSets.splice(linkIndex, 1);
      if (load.linkSets.length == 0) {
        var globalLoadsIndex = indexOf.call(linkSet.loader.loads, load);
        if (globalLoadsIndex != -1)
          linkSet.loader.loads.splice(globalLoadsIndex, 1);
      }
    }
    linkSet.reject(exc);
  }

  // 15.2.5.2.5
  function finishLoad(loader, load) {
    // add to global trace if tracing
    if (loader.loaderObj.trace) {
      if (!loader.loaderObj.loads)
        loader.loaderObj.loads = {};
      var depMap = {};
      load.dependencies.forEach(function(dep) {
        depMap[dep.key] = dep.value;
      });
      loader.loaderObj.loads[load.name] = {
        name: load.name,
        deps: load.dependencies.map(function(dep){ return dep.key }),
        depMap: depMap,
        address: load.address,
        metadata: load.metadata,
        source: load.source,
        kind: load.isDeclarative ? 'declarative' : 'dynamic'
      };
    }
    // if not anonymous, add to the module table
    if (load.name) {
      console.assert(!loader.modules[load.name], 'load not in module table');
      loader.modules[load.name] = load.module;
    }
    var loadIndex = indexOf.call(loader.loads, load);
    if (loadIndex != -1)
      loader.loads.splice(loadIndex, 1);
    for (var i = 0, l = load.linkSets.length; i < l; i++) {
      loadIndex = indexOf.call(load.linkSets[i].loads, load);
      if (loadIndex != -1)
        load.linkSets[i].loads.splice(loadIndex, 1);
    }
    load.linkSets.splice(0, load.linkSets.length);
  }

  // 15.2.5.3 Module Linking Groups

  // 15.2.5.3.2 BuildLinkageGroups alternative implementation
  // Adjustments (also see https://bugs.ecmascript.org/show_bug.cgi?id=2755)
  // 1. groups is an already-interleaved array of group kinds
  // 2. load.groupIndex is set when this function runs
  // 3. load.groupIndex is the interleaved index ie 0 declarative, 1 dynamic, 2 declarative, ... (or starting with dynamic)
  function buildLinkageGroups(load, loads, groups) {
    groups[load.groupIndex] = groups[load.groupIndex] || [];

    // if the load already has a group index and its in its group, its already been done
    // this logic naturally handles cycles
    if (indexOf.call(groups[load.groupIndex], load) != -1)
      return;

    // now add it to the group to indicate its been seen
    groups[load.groupIndex].push(load);

    for (var i = 0, l = loads.length; i < l; i++) {
      var loadDep = loads[i];

      // dependencies not found are already linked
      for (var j = 0; j < load.dependencies.length; j++) {
        if (loadDep.name == load.dependencies[j].value) {
          // by definition all loads in linkset are loaded, not linked
          console.assert(loadDep.status == 'loaded', 'Load in linkSet not loaded!');

          // if it is a group transition, the index of the dependency has gone up
          // otherwise it is the same as the parent
          var loadDepGroupIndex = load.groupIndex + (loadDep.isDeclarative != load.isDeclarative);

          // the group index of an entry is always the maximum
          if (loadDep.groupIndex === undefined || loadDep.groupIndex < loadDepGroupIndex) {

            // if already in a group, remove from the old group
            if (loadDep.groupIndex !== undefined) {
              groups[loadDep.groupIndex].splice(indexOf.call(groups[loadDep.groupIndex], loadDep), 1);

              // if the old group is empty, then we have a mixed depndency cycle
              if (groups[loadDep.groupIndex].length == 0)
                throw new TypeError("Mixed dependency cycle detected");
            }

            loadDep.groupIndex = loadDepGroupIndex;
          }

          buildLinkageGroups(loadDep, loads, groups);
        }
      }
    }
  }

  function doDynamicExecute(linkSet, load, linkError) {
    try {
      var module = load.execute();
    }
    catch(e) {
      linkError(load, e);
      return;
    }
    if (!module || !(module instanceof Module))
      linkError(load, new TypeError('Execution must define a Module instance'));
    else
      return module;
  }

  // 15.2.5.4
  function link(linkSet, linkError) {

    var loader = linkSet.loader;

    if (!linkSet.loads.length)
      return;

    // console.log('linking {' + logloads(linkSet.loads) + '}');
    // snapshot(loader);

    // 15.2.5.3.1 LinkageGroups alternative implementation

    // build all the groups
    // because the first load represents the top of the tree
    // for a given linkset, we can work down from there
    var groups = [];
    var startingLoad = linkSet.loads[0];
    startingLoad.groupIndex = 0;
    buildLinkageGroups(startingLoad, linkSet.loads, groups);

    // determine the kind of the bottom group
    var curGroupDeclarative = startingLoad.isDeclarative == groups.length % 2;

    // run through the groups from bottom to top
    for (var i = groups.length - 1; i >= 0; i--) {
      var group = groups[i];
      for (var j = 0; j < group.length; j++) {
        var load = group[j];

        // 15.2.5.5 LinkDeclarativeModules adjusted
        if (curGroupDeclarative) {
          linkDeclarativeModule(load, linkSet.loads, loader);
        }
        // 15.2.5.6 LinkDynamicModules adjusted
        else {
          var module = doDynamicExecute(linkSet, load, linkError);
          if (!module)
            return;
          load.module = {
            name: load.name,
            module: module
          };
          load.status = 'linked';
        }
        finishLoad(loader, load);
      }

      // alternative current kind for next loop
      curGroupDeclarative = !curGroupDeclarative;
    }
  }


  // custom module records for binding graph
  // store linking module records in a separate table
  function getOrCreateModuleRecord(name, loader) {
    var moduleRecords = loader.moduleRecords;
    return moduleRecords[name] || (moduleRecords[name] = {
      name: name,
      dependencies: [],
      module: new Module(), // start from an empty module and extend
      importers: []
    });
  }

  // custom declarative linking function
  function linkDeclarativeModule(load, loads, loader) {
    if (load.module)
      return;

    var module = load.module = getOrCreateModuleRecord(load.name, loader);
    var moduleObj = load.module.module;

    var registryEntry = load.declare.call(__global, function(name, value) {
      // NB This should be an Object.defineProperty, but that is very slow.
      //    By disaling this module write-protection we gain performance.
      //    It could be useful to allow an option to enable or disable this.
      module.locked = true;
      moduleObj[name] = value;

      for (var i = 0, l = module.importers.length; i < l; i++) {
        var importerModule = module.importers[i];
        if (!importerModule.locked) {
          var importerIndex = indexOf.call(importerModule.dependencies, module);
          importerModule.setters[importerIndex](moduleObj);
        }
      }

      module.locked = false;
      return value;
    });

    // setup our setters and execution function
    module.setters = registryEntry.setters;
    module.execute = registryEntry.execute;

    // now link all the module dependencies
    // amending the depMap as we go
    for (var i = 0, l = load.dependencies.length; i < l; i++) {
      var depName = load.dependencies[i].value;
      var depModule = loader.modules[depName];

      // if dependency not already in the module registry
      // then try and link it now
      if (!depModule) {
        // get the dependency load record
        for (var j = 0; j < loads.length; j++) {
          if (loads[j].name != depName)
            continue;

          // only link if already not already started linking (stops at circular / dynamic)
          if (!loads[j].module) {
            linkDeclarativeModule(loads[j], loads, loader);
            depModule = loads[j].module;
          }
          // if circular, create the module record
          else {
            depModule = getOrCreateModuleRecord(depName, loader);
          }
        }
      }

      // only declarative modules have dynamic bindings
      if (depModule.importers) {
        module.dependencies.push(depModule);
        depModule.importers.push(module);
      }
      else {
        // track dynamic records as null module records as already linked
        module.dependencies.push(null);
      }

      // run the setter for this dependency
      if (module.setters[i])
        module.setters[i](depModule.module);
    }

    load.status = 'linked';
  }



  // 15.2.5.5.1 LinkImports not implemented
  // 15.2.5.7 ResolveExportEntries not implemented
  // 15.2.5.8 ResolveExports not implemented
  // 15.2.5.9 ResolveExport not implemented
  // 15.2.5.10 ResolveImportEntries not implemented

  // 15.2.6.1
  function evaluateLoadedModule(loader, load) {
    console.assert(load.status == 'linked', 'is linked ' + load.name);

    doEnsureEvaluated(load.module, [], loader);
    return load.module.module;
  }

  /*
   * Module Object non-exotic for ES5:
   *
   * module.module        bound module object
   * module.execute       execution function for module
   * module.dependencies  list of module objects for dependencies
   * See getOrCreateModuleRecord for all properties
   *
   */
  function doExecute(module) {
    try {
      module.execute.call(__global);
    }
    catch(e) {
      return e;
    }
  }

  // propogate execution errors
  // see https://bugs.ecmascript.org/show_bug.cgi?id=2993
  function doEnsureEvaluated(module, seen, loader) {
    var err = ensureEvaluated(module, seen, loader);
    if (err)
      throw err;
  }
  // 15.2.6.2 EnsureEvaluated adjusted
  function ensureEvaluated(module, seen, loader) {
    if (module.evaluated || !module.dependencies)
      return;

    seen.push(module);

    var deps = module.dependencies;
    var err;

    for (var i = 0, l = deps.length; i < l; i++) {
      var dep = deps[i];
      // dynamic dependencies are empty in module.dependencies
      // as they are already linked
      if (!dep)
        continue;
      if (indexOf.call(seen, dep) == -1) {
        err = ensureEvaluated(dep, seen, loader);
        // stop on error, see https://bugs.ecmascript.org/show_bug.cgi?id=2996
        if (err) {
          err = addToError(err, 'Error evaluating ' + dep.name + '\n');
          return err;
        }
      }
    }

    if (module.failed)
      return new Error('Module failed execution.');

    if (module.evaluated)
      return;

    module.evaluated = true;
    err = doExecute(module);
    if (err) {
      module.failed = true;
    }
    else if (Object.preventExtensions) {
      // spec variation
      // we don't create a new module here because it was created and ammended
      // we just disable further extensions instead
      Object.preventExtensions(module.module);
    }

    module.execute = undefined;
    return err;
  }

  function addToError(err, msg) {
    if (err instanceof Error)
      err.message = msg + err.message;
    else
      err = msg + err;
    return err;
  }

  // 26.3 Loader

  // 26.3.1.1
  function Loader(options) {
    if (typeof options != 'object')
      throw new TypeError('Options must be an object');

    if (options.normalize)
      this.normalize = options.normalize;
    if (options.locate)
      this.locate = options.locate;
    if (options.fetch)
      this.fetch = options.fetch;
    if (options.translate)
      this.translate = options.translate;
    if (options.instantiate)
      this.instantiate = options.instantiate;

    this._loader = {
      loaderObj: this,
      loads: [],
      modules: {},
      importPromises: {},
      moduleRecords: {}
    };

    // 26.3.3.6
    defineProperty(this, 'global', {
      get: function() {
        return __global;
      }
    });

    // 26.3.3.13 realm not implemented
  }

  function Module() {}

  // importPromises adds ability to import a module twice without error - https://bugs.ecmascript.org/show_bug.cgi?id=2601
  function createImportPromise(loader, name, promise) {
    var importPromises = loader._loader.importPromises;
    return importPromises[name] = promise.then(function(m) {
      importPromises[name] = undefined;
      return m;
    }, function(e) {
      importPromises[name] = undefined;
      throw e;
    });
  }

  Loader.prototype = {
    // 26.3.3.1
    constructor: Loader,
    // 26.3.3.2
    define: function(name, source, options) {
      // check if already defined
      if (this._loader.importPromises[name])
        throw new TypeError('Module is already loading.');
      return createImportPromise(this, name, new Promise(asyncStartLoadPartwayThrough({
        step: 'translate',
        loader: this._loader,
        moduleName: name,
        moduleMetadata: options && options.metadata || {},
        moduleSource: source,
        moduleAddress: options && options.address
      })));
    },
    // 26.3.3.3
    'delete': function(name) {
      var loader = this._loader;
      delete loader.importPromises[name];
      delete loader.moduleRecords[name];
      return loader.modules[name] ? delete loader.modules[name] : false;
    },
    // 26.3.3.4 entries not implemented
    // 26.3.3.5
    get: function(key) {
      if (!this._loader.modules[key])
        return;
      doEnsureEvaluated(this._loader.modules[key], [], this);
      return this._loader.modules[key].module;
    },
    // 26.3.3.7
    has: function(name) {
      return !!this._loader.modules[name];
    },
    // 26.3.3.8
    'import': function(name, options) {
      // run normalize first
      var loaderObj = this;

      // added, see https://bugs.ecmascript.org/show_bug.cgi?id=2659
      return Promise.resolve(loaderObj.normalize(name, options && options.name, options && options.address))
      .then(function(name) {
        var loader = loaderObj._loader;

        if (loader.modules[name]) {
          doEnsureEvaluated(loader.modules[name], [], loader._loader);
          return loader.modules[name].module;
        }

        return loader.importPromises[name] || createImportPromise(loaderObj, name,
          loadModule(loader, name, options || {})
          .then(function(load) {
            delete loader.importPromises[name];
            return evaluateLoadedModule(loader, load);
          }));
      });
    },
    // 26.3.3.9 keys not implemented
    // 26.3.3.10
    load: function(name, options) {
      if (this._loader.modules[name]) {
        doEnsureEvaluated(this._loader.modules[name], [], this._loader);
        return Promise.resolve(this._loader.modules[name].module);
      }
      return this._loader.importPromises[name] || createImportPromise(this, name, loadModule(this._loader, name, {}));
    },
    // 26.3.3.11
    module: function(source, options) {
      var load = createLoad();
      load.address = options && options.address;
      var linkSet = createLinkSet(this._loader, load);
      var sourcePromise = Promise.resolve(source);
      var loader = this._loader;
      var p = linkSet.done.then(function() {
        return evaluateLoadedModule(loader, load);
      });
      proceedToTranslate(loader, load, sourcePromise);
      return p;
    },
    // 26.3.3.12
    newModule: function (obj) {
      if (typeof obj != 'object')
        throw new TypeError('Expected object');

      // we do this to be able to tell if a module is a module privately in ES5
      // by doing m instanceof Module
      var m = new Module();

      for (var key in obj) {
        (function (key) {
          defineProperty(m, key, {
            configurable: false,
            enumerable: true,
            get: function () {
              return obj[key];
            }
          });
        })(key);
      }

      if (Object.preventExtensions)
        Object.preventExtensions(m);

      return m;
    },
    // 26.3.3.14
    set: function(name, module) {
      if (!(module instanceof Module))
        throw new TypeError('Loader.set(' + name + ', module) must be a module');
      this._loader.modules[name] = {
        module: module
      };
    },
    // 26.3.3.15 values not implemented
    // 26.3.3.16 @@iterator not implemented
    // 26.3.3.17 @@toStringTag not implemented

    // 26.3.3.18.1
    normalize: function(name, referrerName, referrerAddress) {
      return name;
    },
    // 26.3.3.18.2
    locate: function(load) {
      return load.name;
    },
    // 26.3.3.18.3
    fetch: function(load) {
      throw new TypeError('Fetch not implemented');
    },
    // 26.3.3.18.4
    translate: function(load) {
      return load.source;
    },
    // 26.3.3.18.5
    instantiate: function(load) {
    }
  };

  var _newModule = Loader.prototype.newModule;

  if (typeof exports === 'object')
    module.exports = Loader;

  __global.Reflect = __global.Reflect || {};
  __global.Reflect.Loader = __global.Reflect.Loader || Loader;
  __global.Reflect.global = __global.Reflect.global || __global;
  __global.LoaderPolyfill = Loader;

})();

/*
 * Traceur and Babel transpile hook for Loader
 */
(function(Loader) {
  var g = __global;

  function getTranspilerModule(loader, globalName) {
    return loader.newModule({ 'default': g[globalName], __useDefault: true });
  }

  // use Traceur by default
  Loader.prototype.transpiler = 'traceur';

  Loader.prototype.transpile = function(load) {
    var self = this;

    // pick up Transpiler modules from existing globals on first run if set
    if (!self.transpilerHasRun) {
      if (g.traceur && !self.has('traceur'))
        self.set('traceur', getTranspilerModule(self, 'traceur'));
      if (g.babel && !self.has('babel'))
        self.set('babel', getTranspilerModule(self, 'babel'));
      self.transpilerHasRun = true;
    }
    
    return self['import'](self.transpiler).then(function(transpiler) {
      if (transpiler.__useDefault)
        transpiler = transpiler['default'];
      return 'var __moduleAddress = "' + load.address + '";' + (transpiler.Compiler ? traceurTranspile : babelTranspile).call(self, load, transpiler);
    });
  };

  Loader.prototype.instantiate = function(load) {
    var self = this;
    return Promise.resolve(self.normalize(self.transpiler))
    .then(function(transpilerNormalized) {
      // load transpiler as a global (avoiding System clobbering)
      if (load.name === transpilerNormalized) {
        return {
          deps: [],
          execute: function() {
            var curSystem = g.System;
            var curLoader = g.Reflect.Loader;
            // ensure not detected as CommonJS
            __eval('(function(require,exports,module){' + load.source + '})();', g, load);
            g.System = curSystem;
            g.Reflect.Loader = curLoader;
            return getTranspilerModule(self, load.name);
          }
        };
      }
    });
  };

  function traceurTranspile(load, traceur) {
    var options = this.traceurOptions || {};
    options.modules = 'instantiate';
    options.script = false;
    options.sourceMaps = 'inline';
    options.filename = load.address;
    options.inputSourceMap = load.metadata.sourceMap;
    options.moduleName = false;

    var compiler = new traceur.Compiler(options);
    var source = doTraceurCompile(load.source, compiler, options.filename);

    // add "!eval" to end of Traceur sourceURL
    // I believe this does something?
    source += '!eval';

    return source;
  }
  function doTraceurCompile(source, compiler, filename) {
    try {
      return compiler.compile(source, filename);
    }
    catch(e) {
      // traceur throws an error array
      throw e[0];
    }
  }

  function babelTranspile(load, babel) {
    var options = this.babelOptions || {};
    options.modules = 'system';
    options.sourceMap = 'inline';
    options.filename = load.address;
    options.code = true;
    options.ast = false;
    
    if (!options.blacklist)
      options.blacklist = ['react'];

    var source = babel.transform(load.source, options).code;

    // add "!eval" to end of Babel sourceURL
    // I believe this does something?
    return source + '\n//# sourceURL=' + load.address + '!eval';
  }


})(__global.LoaderPolyfill);
/*
*********************************************************************************************

  System Loader Implementation

    - Implemented to https://github.com/jorendorff/js-loaders/blob/master/browser-loader.js

    - <script type="module"> supported

*********************************************************************************************
*/



(function() {
  var isWorker = typeof self !== 'undefined' && typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope;
  var isBrowser = typeof window != 'undefined' && !isWorker;
  var isWindows = typeof process != 'undefined' && !!process.platform.match(/^win/);
  var Promise = __global.Promise || require('when/es6-shim/Promise');

  // Helpers
  // Absolute URL parsing, from https://gist.github.com/Yaffle/1088850
  function parseURI(url) {
    var m = String(url).replace(/^\s+|\s+$/g, '').match(/^([^:\/?#]+:)?(\/\/(?:[^:@\/?#]*(?::[^:@\/?#]*)?@)?(([^:\/?#]*)(?::(\d*))?))?([^?#]*)(\?[^#]*)?(#[\s\S]*)?/);
    // authority = '//' + user + ':' + pass '@' + hostname + ':' port
    return (m ? {
      href     : m[0] || '',
      protocol : m[1] || '',
      authority: m[2] || '',
      host     : m[3] || '',
      hostname : m[4] || '',
      port     : m[5] || '',
      pathname : m[6] || '',
      search   : m[7] || '',
      hash     : m[8] || ''
    } : null);
  }

  function removeDotSegments(input) {
    var output = [];
    input.replace(/^(\.\.?(\/|$))+/, '')
      .replace(/\/(\.(\/|$))+/g, '/')
      .replace(/\/\.\.$/, '/../')
      .replace(/\/?[^\/]*/g, function (p) {
        if (p === '/..')
          output.pop();
        else
          output.push(p);
    });
    return output.join('').replace(/^\//, input.charAt(0) === '/' ? '/' : '');
  }

  function toAbsoluteURL(base, href) {

    if (isWindows)
      href = href.replace(/\\/g, '/');

    href = parseURI(href || '');
    base = parseURI(base || '');

    return !href || !base ? null : (href.protocol || base.protocol) +
      (href.protocol || href.authority ? href.authority : base.authority) +
      removeDotSegments(href.protocol || href.authority || href.pathname.charAt(0) === '/' ? href.pathname : (href.pathname ? ((base.authority && !base.pathname ? '/' : '') + base.pathname.slice(0, base.pathname.lastIndexOf('/') + 1) + href.pathname) : base.pathname)) +
      (href.protocol || href.authority || href.pathname ? href.search : (href.search || base.search)) +
      href.hash;
  }

  var fetchTextFromURL;

  if (typeof XMLHttpRequest != 'undefined') {
    fetchTextFromURL = function(url, fulfill, reject) {
      var xhr = new XMLHttpRequest();
      var sameDomain = true;
      var doTimeout = false;
      if (!('withCredentials' in xhr)) {
        // check if same domain
        var domainCheck = /^(\w+:)?\/\/([^\/]+)/.exec(url);
        if (domainCheck) {
          sameDomain = domainCheck[2] === window.location.host;
          if (domainCheck[1])
            sameDomain &= domainCheck[1] === window.location.protocol;
        }
      }
      if (!sameDomain && typeof XDomainRequest != 'undefined') {
        xhr = new XDomainRequest();
        xhr.onload = load;
        xhr.onerror = error;
        xhr.ontimeout = error;
        xhr.onprogress = function() {};
        xhr.timeout = 0;
        doTimeout = true;
      }
      function load() {
        fulfill(xhr.responseText);
      }
      function error() {
        reject(xhr.statusText + ': ' + url || 'XHR error');
      }

      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
          if (xhr.status === 200 || (xhr.status == 0 && xhr.responseText)) {
            load();
          } else {
            error();
          }
        }
      };
      xhr.open("GET", url, true);

      if (doTimeout)
        setTimeout(function() {
          xhr.send();
        }, 0);

      xhr.send(null);
    }
  }
  else if (typeof require != 'undefined') {
    var fs;
    fetchTextFromURL = function(url, fulfill, reject) {
      if (url.substr(0, 5) != 'file:')
        throw 'Only file URLs of the form file: allowed running in Node.';
      fs = fs || require('fs');
      url = url.substr(5);
      if (isWindows)
        url = url.replace(/\//g, '\\');
      return fs.readFile(url, function(err, data) {
        if (err)
          return reject(err);
        else
          fulfill(data + '');
      });
    }
  }
  else {
    throw new TypeError('No environment fetch API available.');
  }

  var SystemLoader = function($__super) {
    function SystemLoader(options) {
      $__super.call(this, options || {});

      // Set default baseURL and paths
      if (typeof location != 'undefined' && location.href) {
        var href = __global.location.href.split('#')[0].split('?')[0];
        this.baseURL = href.substring(0, href.lastIndexOf('/') + 1);
      }
      else if (typeof process != 'undefined' && process.cwd) {
        this.baseURL = 'file:' + process.cwd() + '/';
        if (isWindows)
          this.baseURL = this.baseURL.replace(/\\/g, '/');
      }
      else {
        throw new TypeError('No environment baseURL');
      }
      this.paths = { '*': '*.js' };
    }

    SystemLoader.__proto__ = ($__super !== null ? $__super : Function.prototype);
    SystemLoader.prototype = $__Object$create(($__super !== null ? $__super.prototype : null));

    $__Object$defineProperty(SystemLoader.prototype, "constructor", {
      value: SystemLoader
    });

    $__Object$defineProperty(SystemLoader.prototype, "global", {
      get: function() {
        return isBrowser ? window : (isWorker ? self : __global);
      },

      enumerable: false
    });

    $__Object$defineProperty(SystemLoader.prototype, "strict", {
      get: function() { return true; },
      enumerable: false
    });

    $__Object$defineProperty(SystemLoader.prototype, "normalize", {
      value: function(name, parentName, parentAddress) {
        if (typeof name != 'string')
          throw new TypeError('Module name must be a string');

        var segments = name.split('/');

        if (segments.length == 0)
          throw new TypeError('No module name provided');

        // current segment
        var i = 0;
        // is the module name relative
        var rel = false;
        // number of backtracking segments
        var dotdots = 0;
        if (segments[0] == '.') {
          i++;
          if (i == segments.length)
            throw new TypeError('Illegal module name "' + name + '"');
          rel = true;
        }
        else {
          while (segments[i] == '..') {
            i++;
            if (i == segments.length)
              throw new TypeError('Illegal module name "' + name + '"');
          }
          if (i)
            rel = true;
          dotdots = i;
        }

        for (var j = i; j < segments.length; j++) {
          var segment = segments[j];
          if (segment == '' || segment == '.' || segment == '..')
            throw new TypeError('Illegal module name "' + name + '"');
        }

        if (!rel)
          return name;

        // build the full module name
        var normalizedParts = [];
        var parentParts = (parentName || '').split('/');
        var normalizedLen = parentParts.length - 1 - dotdots;

        normalizedParts = normalizedParts.concat(parentParts.splice(0, parentParts.length - 1 - dotdots));
        normalizedParts = normalizedParts.concat(segments.splice(i, segments.length - i));

        return normalizedParts.join('/');
      },

      enumerable: false,
      writable: true
    });

    $__Object$defineProperty(SystemLoader.prototype, "locate", {
      value: function(load) {
        var name = load.name;

        // NB no specification provided for System.paths, used ideas discussed in https://github.com/jorendorff/js-loaders/issues/25

        // most specific (longest) match wins
        var pathMatch = '', wildcard;

        // check to see if we have a paths entry
        for (var p in this.paths) {
          var pathParts = p.split('*');
          if (pathParts.length > 2)
            throw new TypeError('Only one wildcard in a path is permitted');

          // exact path match
          if (pathParts.length == 1) {
            if (name == p && p.length > pathMatch.length) {
              pathMatch = p;
              break;
            }
          }

          // wildcard path match
          else {
            if (name.substr(0, pathParts[0].length) == pathParts[0] && name.substr(name.length - pathParts[1].length) == pathParts[1]) {
              pathMatch = p;
              wildcard = name.substr(pathParts[0].length, name.length - pathParts[1].length - pathParts[0].length);
            }
          }
        }

        var outPath = this.paths[pathMatch];
        if (wildcard)
          outPath = outPath.replace('*', wildcard);

        // percent encode just '#' in module names
        // according to https://github.com/jorendorff/js-loaders/blob/master/browser-loader.js#L238
        // we should encode everything, but it breaks for servers that don't expect it 
        // like in (https://github.com/systemjs/systemjs/issues/168)
        if (isBrowser)
          outPath = outPath.replace(/#/g, '%23');

        return toAbsoluteURL(this.baseURL, outPath);
      },

      enumerable: false,
      writable: true
    });

    $__Object$defineProperty(SystemLoader.prototype, "fetch", {
      value: function(load) {
        var self = this;
        return new Promise(function(resolve, reject) {
          fetchTextFromURL(toAbsoluteURL(self.baseURL, load.address), function(source) {
            resolve(source);
          }, reject);
        });
      },

      enumerable: false,
      writable: true
    });

    return SystemLoader;
  }(__global.LoaderPolyfill);

  var System = new SystemLoader();

  // note we have to export before runing "init" below
  if (typeof exports === 'object')
    module.exports = System;

  __global.System = System;

  // <script type="module"> support
  // allow a data-init function callback once loaded
  if (isBrowser && typeof document.getElementsByTagName != 'undefined') {
    var curScript = document.getElementsByTagName('script');
    curScript = curScript[curScript.length - 1];

    function completed() {
      document.removeEventListener( "DOMContentLoaded", completed, false );
      window.removeEventListener( "load", completed, false );
      ready();
    }

    function ready() {
      var scripts = document.getElementsByTagName('script');
      for (var i = 0; i < scripts.length; i++) {
        var script = scripts[i];
        if (script.type == 'module') {
          var source = script.innerHTML.substr(1);
          // It is important to reference the global System, rather than the one
          // in our closure. We want to ensure that downstream users/libraries
          // can override System w/ custom behavior.
          __global.System.module(source)['catch'](function(err) { setTimeout(function() { throw err; }); });
        }
      }
    }

    // DOM ready, taken from https://github.com/jquery/jquery/blob/master/src/core/ready.js#L63
    if (document.readyState === 'complete') {
      setTimeout(ready);
    }
    else if (document.addEventListener) {
      document.addEventListener('DOMContentLoaded', completed, false);
      window.addEventListener('load', completed, false);
    }

    // run the data-init function on the script tag
    if (curScript.getAttribute('data-init'))
      window[curScript.getAttribute('data-init')]();
  }
})();


// Define our eval outside of the scope of any other reference defined in this
// file to avoid adding those references to the evaluation scope.
function __eval(__source, __global, __load) {
  try {
    eval('(function() { var __moduleName = "' + (__load.name || '').replace('"', '\"') + '"; ' + __source + ' \n }).call(__global);');
  }
  catch(e) {
    if (e.name == 'SyntaxError' || e.name == 'TypeError')
      e.message = 'Evaluating ' + (__load.name || load.address) + '\n\t' + e.message;
    throw e;
  }
}

})(typeof window != 'undefined' ? window : (typeof WorkerGlobalScope != 'undefined' ?
                                           self : global));

/*
 * SystemJS v0.16.6
 */

(function($__global) {

$__global.upgradeSystemLoader = function() {
  $__global.upgradeSystemLoader = undefined;

  // indexOf polyfill for IE
  var indexOf = Array.prototype.indexOf || function(item) {
    for (var i = 0, l = this.length; i < l; i++)
      if (this[i] === item)
        return i;
    return -1;
  }

  var isWindows = typeof process != 'undefined' && !!process.platform.match(/^win/);

  // Absolute URL parsing, from https://gist.github.com/Yaffle/1088850
  function parseURI(url) {
    var m = String(url).replace(/^\s+|\s+$/g, '').match(/^([^:\/?#]+:)?(\/\/(?:[^:@\/?#]*(?::[^:@\/?#]*)?@)?(([^:\/?#]*)(?::(\d*))?))?([^?#]*)(\?[^#]*)?(#[\s\S]*)?/);
    // authority = '//' + user + ':' + pass '@' + hostname + ':' port
    return (m ? {
      href     : m[0] || '',
      protocol : m[1] || '',
      authority: m[2] || '',
      host     : m[3] || '',
      hostname : m[4] || '',
      port     : m[5] || '',
      pathname : m[6] || '',
      search   : m[7] || '',
      hash     : m[8] || ''
    } : null);
  }
  function toAbsoluteURL(base, href) {
    function removeDotSegments(input) {
      var output = [];
      input.replace(/^(\.\.?(\/|$))+/, '')
        .replace(/\/(\.(\/|$))+/g, '/')
        .replace(/\/\.\.$/, '/../')
        .replace(/\/?[^\/]*/g, function (p) {
          if (p === '/..')
            output.pop();
          else
            output.push(p);
      });
      return output.join('').replace(/^\//, input.charAt(0) === '/' ? '/' : '');
    }

    if (isWindows)
      href = href.replace(/\\/g, '/');

    href = parseURI(href || '');
    base = parseURI(base || '');

    return !href || !base ? null : (href.protocol || base.protocol) +
      (href.protocol || href.authority ? href.authority : base.authority) +
      removeDotSegments(href.protocol || href.authority || href.pathname.charAt(0) === '/' ? href.pathname : (href.pathname ? ((base.authority && !base.pathname ? '/' : '') + base.pathname.slice(0, base.pathname.lastIndexOf('/') + 1) + href.pathname) : base.pathname)) +
      (href.protocol || href.authority || href.pathname ? href.search : (href.search || base.search)) +
      href.hash;
  }

  // clone the original System loader
  var System;
  (function() {
    var originalSystem = $__global.System;
    System = $__global.System = new LoaderPolyfill(originalSystem);
    System.baseURL = originalSystem.baseURL;
    System.paths = { '*': '*.js' };
    System.originalSystem = originalSystem;
  })();

  System.noConflict = function() {
    $__global.SystemJS = System;
    $__global.System = System.originalSystem;
  }

  
/*
 * SystemJS Core
 * Code should be vaguely readable
 * 
 */
var originalSystem = $__global.System.originalSystem;
function core(loader) {
  /*
    __useDefault
    
    When a module object looks like:
    newModule(
      __useDefault: true,
      default: 'some-module'
    })

    Then importing that module provides the 'some-module'
    result directly instead of the full module.

    Useful for eg module.exports = function() {}
  */
  var loaderImport = loader['import'];
  loader['import'] = function(name, options) {
    return loaderImport.call(this, name, options).then(function(module) {
      return module.__useDefault ? module['default'] : module;
    });
  };

  // support the empty module, as a concept
  loader.set('@empty', loader.newModule({}));

  // include the node require since we're overriding it
  if (typeof require != 'undefined')
    loader._nodeRequire = require;

  /*
    Config
    Extends config merging one deep only

    loader.config({
      some: 'random',
      config: 'here',
      deep: {
        config: { too: 'too' }
      }
    });

    <=>

    loader.some = 'random';
    loader.config = 'here'
    loader.deep = loader.deep || {};
    loader.deep.config = { too: 'too' };
  */
  loader.config = function(cfg) {
    for (var c in cfg) {
      var v = cfg[c];
      if (typeof v == 'object' && !(v instanceof Array)) {
        this[c] = this[c] || {};
        for (var p in v)
          this[c][p] = v[p];
      }
      else
        this[c] = v;
    }
  };

  // override locate to allow baseURL to be document-relative
  var baseURI;
  if (typeof window == 'undefined' &&
      typeof WorkerGlobalScope == 'undefined') {
    baseURI = 'file:' + process.cwd() + '/';
    if (isWindows)
      baseURI = baseURI.replace(/\\/g, '/');
  }
  // Inside of a Web Worker
  else if(typeof window == 'undefined') {
    baseURI = loader.global.location.href;
  }
  else {
    baseURI = document.baseURI;
    if (!baseURI) {
      var bases = document.getElementsByTagName('base');
      baseURI = bases[0] && bases[0].href || window.location.href;
    }
  }

  var loaderLocate = loader.locate;
  var normalizedBaseURL;
  loader.locate = function(load) {
    if (this.baseURL != normalizedBaseURL) {
      normalizedBaseURL = toAbsoluteURL(baseURI, this.baseURL);

      if (normalizedBaseURL.substr(normalizedBaseURL.length - 1, 1) != '/')
        normalizedBaseURL += '/';
      this.baseURL = normalizedBaseURL;
    }

    return Promise.resolve(loaderLocate.call(this, load));
  };

  function applyExtensions(extensions, loader) {
    loader._extensions = [];
    for(var i = 0, len = extensions.length; i < len; i++) {
      extensions[i](loader);
    }
  }

  loader._extensions = loader._extensions || [];
  loader._extensions.push(core);

  loader.clone = function() {
    var originalLoader = this;
    var loader = new LoaderPolyfill(originalSystem);
    loader.baseURL = originalLoader.baseURL;
    loader.paths = { '*': '*.js' };
    applyExtensions(originalLoader._extensions, loader);
    return loader;
  };
}
/*
 * Meta Extension
 *
 * Sets default metadata on a load record (load.metadata) from
 * loader.meta[moduleName].
 * Also provides an inline meta syntax for module meta in source.
 *
 * Eg:
 *
 * loader.meta['my/module'] = { some: 'meta' };
 *
 * load.metadata.some = 'meta' will now be set on the load record.
 *
 * The same meta could be set with a my/module.js file containing:
 * 
 * my/module.js
 *   "some meta"; 
 *   "another meta";
 *   console.log('this is my/module');
 *
 * The benefit of inline meta is that coniguration doesn't need
 * to be known in advance, which is useful for modularising
 * configuration and avoiding the need for configuration injection.
 *
 *
 * Example
 * -------
 *
 * The simplest meta example is setting the module format:
 *
 * System.meta['my/module'] = { format: 'amd' };
 *
 * or inside 'my/module.js':
 *
 * "format amd";
 * define(...);
 * 
 */

function meta(loader) {
  var metaRegEx = /^(\s*\/\*.*\*\/|\s*\/\/[^\n]*|\s*"[^"]+"\s*;?|\s*'[^']+'\s*;?)+/;
  var metaPartRegEx = /\/\*.*\*\/|\/\/[^\n]*|"[^"]+"\s*;?|'[^']+'\s*;?/g;

  loader.meta = {};
  loader._extensions = loader._extensions || [];
  loader._extensions.push(meta);

  function setConfigMeta(loader, load) {
    var meta = loader.meta && loader.meta[load.name];
    if (meta) {
      for (var p in meta)
        load.metadata[p] = load.metadata[p] || meta[p];
    }
  }

  var loaderLocate = loader.locate;
  loader.locate = function(load) {
    setConfigMeta(this, load);
    return loaderLocate.call(this, load);
  }

  var loaderTranslate = loader.translate;
  loader.translate = function(load) {
    // detect any meta header syntax
    var meta = load.source.match(metaRegEx);
    if (meta) {
      var metaParts = meta[0].match(metaPartRegEx);
      for (var i = 0; i < metaParts.length; i++) {
        var len = metaParts[i].length;

        var firstChar = metaParts[i].substr(0, 1);
        if (metaParts[i].substr(len - 1, 1) == ';')
          len--;
      
        if (firstChar != '"' && firstChar != "'")
          continue;

        var metaString = metaParts[i].substr(1, metaParts[i].length - 3);

        var metaName = metaString.substr(0, metaString.indexOf(' '));
        if (metaName) {
          var metaValue = metaString.substr(metaName.length + 1, metaString.length - metaName.length - 1);

          if (load.metadata[metaName] instanceof Array)
            load.metadata[metaName].push(metaValue);
          else if (!load.metadata[metaName])
            load.metadata[metaName] = metaValue;
        }
      }
    }
    // config meta overrides
    setConfigMeta(this, load);
    
    return loaderTranslate.call(this, load);
  }
}
/*
 * Instantiate registry extension
 *
 * Supports Traceur System.register 'instantiate' output for loading ES6 as ES5.
 *
 * - Creates the loader.register function
 * - Also supports metadata.format = 'register' in instantiate for anonymous register modules
 * - Also supports metadata.deps, metadata.execute and metadata.executingRequire
 *     for handling dynamic modules alongside register-transformed ES6 modules
 *
 * Works as a standalone extension, but benefits from having a more 
 * advanced __eval defined like in SystemJS polyfill-wrapper-end.js
 *
 * The code here replicates the ES6 linking groups algorithm to ensure that
 * circular ES6 compiled into System.register can work alongside circular AMD 
 * and CommonJS, identically to the actual ES6 loader.
 *
 */
function register(loader) {
  if (typeof indexOf == 'undefined')
    indexOf = Array.prototype.indexOf;
  if (typeof __eval == 'undefined' || typeof document != 'undefined' && !document.addEventListener)
    __eval = 0 || eval; // uglify breaks without the 0 ||

  loader._extensions = loader._extensions || [];
  loader._extensions.push(register);

  // define exec for easy evaluation of a load record (load.name, load.source, load.address)
  // main feature is source maps support handling
  var curSystem;
  function exec(load) {
    var loader = this;
    // support sourceMappingURL (efficiently)
    var sourceMappingURL;
    var lastLineIndex = load.source.lastIndexOf('\n');
    if (lastLineIndex != -1) {
      if (load.source.substr(lastLineIndex + 1, 21) == '//# sourceMappingURL=') {
        sourceMappingURL = load.source.substr(lastLineIndex + 22, load.source.length - lastLineIndex - 22);
        if (typeof toAbsoluteURL != 'undefined')
          sourceMappingURL = toAbsoluteURL(load.address, sourceMappingURL);
      }
    }

    __eval(load.source, load.address, sourceMappingURL);
  }
  loader.__exec = exec;

  function dedupe(deps) {
    var newDeps = [];
    for (var i = 0, l = deps.length; i < l; i++)
      if (indexOf.call(newDeps, deps[i]) == -1)
        newDeps.push(deps[i])
    return newDeps;
  }

  /*
   * There are two variations of System.register:
   * 1. System.register for ES6 conversion (2-3 params) - System.register([name, ]deps, declare)
   *    see https://github.com/ModuleLoader/es6-module-loader/wiki/System.register-Explained
   *
   * 2. System.register for dynamic modules (3-4 params) - System.register([name, ]deps, executingRequire, execute)
   * the true or false statement 
   *
   * this extension implements the linking algorithm for the two variations identical to the spec
   * allowing compiled ES6 circular references to work alongside AMD and CJS circular references.
   *
   */
  // loader.register sets loader.defined for declarative modules
  var anonRegister;
  var calledRegister;
  function registerModule(name, deps, declare, execute) {
    if (typeof name != 'string') {
      execute = declare;
      declare = deps;
      deps = name;
      name = null;
    }

    calledRegister = true;
    
    var register;

    // dynamic
    if (typeof declare == 'boolean') {
      register = {
        declarative: false,
        deps: deps,
        execute: execute,
        executingRequire: declare
      };
    }
    else {
      // ES6 declarative
      register = {
        declarative: true,
        deps: deps,
        declare: declare
      };
    }
    
    // named register
    if (name) {
      register.name = name;
      // we never overwrite an existing define
      if (!(name in loader.defined))
        loader.defined[name] = register; 
    }
    // anonymous register
    else if (register.declarative) {
      if (anonRegister)
        throw new TypeError('Multiple anonymous System.register calls in the same module file.');
      anonRegister = register;
    }
  }
  /*
   * Registry side table - loader.defined
   * Registry Entry Contains:
   *    - name
   *    - deps 
   *    - declare for declarative modules
   *    - execute for dynamic modules, different to declarative execute on module
   *    - executingRequire indicates require drives execution for circularity of dynamic modules
   *    - declarative optional boolean indicating which of the above
   *
   * Can preload modules directly on System.defined['my/module'] = { deps, execute, executingRequire }
   *
   * Then the entry gets populated with derived information during processing:
   *    - normalizedDeps derived from deps, created in instantiate
   *    - groupIndex used by group linking algorithm
   *    - evaluated indicating whether evaluation has happend
   *    - module the module record object, containing:
   *      - exports actual module exports
   *      
   *    Then for declarative only we track dynamic bindings with the records:
   *      - name
   *      - setters declarative setter functions
   *      - exports actual module values
   *      - dependencies, module records of dependencies
   *      - importers, module records of dependents
   *
   * After linked and evaluated, entries are removed, declarative module records remain in separate
   * module binding table
   *
   */

  function defineRegister(loader) {
    if (loader.register)
      return;

    loader.register = registerModule;

    if (!loader.defined)
      loader.defined = {};
    
    // script injection mode calls this function synchronously on load
    var onScriptLoad = loader.onScriptLoad;
    loader.onScriptLoad = function(load) {
      onScriptLoad(load);
      // anonymous define
      if (anonRegister)
        load.metadata.entry = anonRegister;
      
      if (calledRegister) {
        load.metadata.format = load.metadata.format || 'register';
        load.metadata.registered = true;
      }
    }
  }

  defineRegister(loader);

  function buildGroups(entry, loader, groups) {
    groups[entry.groupIndex] = groups[entry.groupIndex] || [];

    if (indexOf.call(groups[entry.groupIndex], entry) != -1)
      return;

    groups[entry.groupIndex].push(entry);

    for (var i = 0, l = entry.normalizedDeps.length; i < l; i++) {
      var depName = entry.normalizedDeps[i];
      var depEntry = loader.defined[depName];
      
      // not in the registry means already linked / ES6
      if (!depEntry || depEntry.evaluated)
        continue;
      
      // now we know the entry is in our unlinked linkage group
      var depGroupIndex = entry.groupIndex + (depEntry.declarative != entry.declarative);

      // the group index of an entry is always the maximum
      if (depEntry.groupIndex === undefined || depEntry.groupIndex < depGroupIndex) {
        
        // if already in a group, remove from the old group
        if (depEntry.groupIndex !== undefined) {
          groups[depEntry.groupIndex].splice(indexOf.call(groups[depEntry.groupIndex], depEntry), 1);

          // if the old group is empty, then we have a mixed depndency cycle
          if (groups[depEntry.groupIndex].length == 0)
            throw new TypeError("Mixed dependency cycle detected");
        }

        depEntry.groupIndex = depGroupIndex;
      }

      buildGroups(depEntry, loader, groups);
    }
  }

  function link(name, loader) {
    var startEntry = loader.defined[name];

    // skip if already linked
    if (startEntry.module)
      return;

    startEntry.groupIndex = 0;

    var groups = [];

    buildGroups(startEntry, loader, groups);

    var curGroupDeclarative = !!startEntry.declarative == groups.length % 2;
    for (var i = groups.length - 1; i >= 0; i--) {
      var group = groups[i];
      for (var j = 0; j < group.length; j++) {
        var entry = group[j];

        // link each group
        if (curGroupDeclarative)
          linkDeclarativeModule(entry, loader);
        else
          linkDynamicModule(entry, loader);
      }
      curGroupDeclarative = !curGroupDeclarative; 
    }
  }

  // module binding records
  var moduleRecords = {};
  function getOrCreateModuleRecord(name) {
    return moduleRecords[name] || (moduleRecords[name] = {
      name: name,
      dependencies: [],
      exports: {}, // start from an empty module and extend
      importers: []
    })
  }

  function linkDeclarativeModule(entry, loader) {
    // only link if already not already started linking (stops at circular)
    if (entry.module)
      return;

    var module = entry.module = getOrCreateModuleRecord(entry.name);
    var exports = entry.module.exports;

    var declaration = entry.declare.call(loader.global, function(name, value) {
      module.locked = true;
      exports[name] = value;

      for (var i = 0, l = module.importers.length; i < l; i++) {
        var importerModule = module.importers[i];
        if (!importerModule.locked) {
          var importerIndex = indexOf.call(importerModule.dependencies, module);
          importerModule.setters[importerIndex](exports);
        }
      }

      module.locked = false;
      return value;
    });
    
    module.setters = declaration.setters;
    module.execute = declaration.execute;

    if (!module.setters || !module.execute) {
      throw new TypeError('Invalid System.register form for ' + entry.name);
    }

    // now link all the module dependencies
    for (var i = 0, l = entry.normalizedDeps.length; i < l; i++) {
      var depName = entry.normalizedDeps[i];
      var depEntry = loader.defined[depName];
      var depModule = moduleRecords[depName];

      // work out how to set depExports based on scenarios...
      var depExports;

      if (depModule) {
        depExports = depModule.exports;
      }
      // dynamic, already linked in our registry
      else if (depEntry && !depEntry.declarative) {
        if (depEntry.module.exports && depEntry.module.exports.__esModule)
          depExports = depEntry.module.exports;
        else
          depExports = { 'default': depEntry.module.exports, '__useDefault': true };
      }
      // in the loader registry
      else if (!depEntry) {
        depExports = loader.get(depName);
      }
      // we have an entry -> link
      else {
        linkDeclarativeModule(depEntry, loader);
        depModule = depEntry.module;
        depExports = depModule.exports;
      }

      // only declarative modules have dynamic bindings
      if (depModule && depModule.importers) {
        depModule.importers.push(module);
        module.dependencies.push(depModule);
      }
      else {
        module.dependencies.push(null);
      }

      // run the setter for this dependency
      if (module.setters[i])
        module.setters[i](depExports);
    }
  }

  // An analog to loader.get covering execution of all three layers (real declarative, simulated declarative, simulated dynamic)
  function getModule(name, loader) {
    var exports;
    var entry = loader.defined[name];

    if (!entry) {
      exports = loader.get(name);
      if (!exports)
        throw new Error('Unable to load dependency ' + name + '.');
    }

    else {
      if (entry.declarative)
        ensureEvaluated(name, [], loader);
    
      else if (!entry.evaluated)
        linkDynamicModule(entry, loader);

      exports = entry.module.exports;
    }

    if ((!entry || entry.declarative) && exports && exports.__useDefault)
      return exports['default'];
    
    return exports;
  }

  function linkDynamicModule(entry, loader) {
    if (entry.module)
      return;

    var exports = {};

    var module = entry.module = { exports: exports, id: entry.name };

    // AMD requires execute the tree first
    if (!entry.executingRequire) {
      for (var i = 0, l = entry.normalizedDeps.length; i < l; i++) {
        var depName = entry.normalizedDeps[i];
        var depEntry = loader.defined[depName];
        if (depEntry)
          linkDynamicModule(depEntry, loader);
      }
    }

    // now execute
    entry.evaluated = true;
    var output = entry.execute.call(loader.global, function(name) {
      for (var i = 0, l = entry.deps.length; i < l; i++) {
        if (entry.deps[i] != name)
          continue;
        return getModule(entry.normalizedDeps[i], loader);
      }
      throw new TypeError('Module ' + name + ' not declared as a dependency.');
    }, exports, module);
    
    if (output)
      module.exports = output;
      
    /*if ( output && output.__esModule )
      entry.module = output;
    else if (output)
      entry.module['default'] = output;*/
  }

  /*
   * Given a module, and the list of modules for this current branch,
   *  ensure that each of the dependencies of this module is evaluated
   *  (unless one is a circular dependency already in the list of seen
   *  modules, in which case we execute it)
   *
   * Then we evaluate the module itself depth-first left to right 
   * execution to match ES6 modules
   */
  function ensureEvaluated(moduleName, seen, loader) {
    var entry = loader.defined[moduleName];

    // if already seen, that means it's an already-evaluated non circular dependency
    if (!entry || entry.evaluated || !entry.declarative)
      return;

    // this only applies to declarative modules which late-execute

    seen.push(moduleName);

    for (var i = 0, l = entry.normalizedDeps.length; i < l; i++) {
      var depName = entry.normalizedDeps[i];
      if (indexOf.call(seen, depName) == -1) {
        if (!loader.defined[depName])
          loader.get(depName);
        else
          ensureEvaluated(depName, seen, loader);
      }
    }

    if (entry.evaluated)
      return;

    entry.evaluated = true;
    entry.module.execute.call(loader.global);
  }

  var registerRegEx = /System\.register/;

  var loaderFetch = loader.fetch;
  loader.fetch = function(load) {
    var loader = this;
    defineRegister(loader);
    if (loader.defined[load.name]) {
      load.metadata.format = 'defined';
      return '';
    }
    anonRegister = null;
    calledRegister = false;
    // the above get picked up by onScriptLoad
    return loaderFetch.call(loader, load);
  }

  var loaderTranslate = loader.translate;
  loader.translate = function(load) {
    this.register = registerModule;

    this.__exec = exec;

    load.metadata.deps = load.metadata.deps || [];

    // we run the meta detection here (register is after meta)
    return Promise.resolve(loaderTranslate.call(this, load)).then(function(source) {
      
      // dont run format detection for globals shimmed
      // ideally this should be in the global extension, but there is
      // currently no neat way to separate it
      if (load.metadata.init || load.metadata.exports)
        load.metadata.format = load.metadata.format || 'global';

      // run detection for register format
      if (load.metadata.format == 'register' || !load.metadata.format && load.source.match(registerRegEx))
        load.metadata.format = 'register';
      return source;
    });
  }


  var loaderInstantiate = loader.instantiate;
  loader.instantiate = function(load) {
    var loader = this;

    var entry;

    // first we check if this module has already been defined in the registry
    if (loader.defined[load.name]) {
      entry = loader.defined[load.name];
      entry.deps = entry.deps.concat(load.metadata.deps);
    }

    // picked up already by a script injection
    else if (load.metadata.entry)
      entry = load.metadata.entry;

    // otherwise check if it is dynamic
    else if (load.metadata.execute) {
      entry = {
        declarative: false,
        deps: load.metadata.deps || [],
        execute: load.metadata.execute,
        executingRequire: load.metadata.executingRequire // NodeJS-style requires or not
      };
    }

    // Contains System.register calls
    else if (load.metadata.format == 'register') {
      anonRegister = null;
      calledRegister = false;

      var curSystem = loader.global.System;

      loader.global.System = loader;

      loader.__exec(load);

      loader.global.System = curSystem;

      if (anonRegister)
        entry = anonRegister;

      if (!entry && System.defined[load.name])
        entry = System.defined[load.name];

      if (!calledRegister && !load.metadata.registered)
        throw new TypeError(load.name + ' detected as System.register but didn\'t execute.');
    }

    // named bundles are just an empty module
    if (!entry && load.metadata.format != 'es6')
      return {
        deps: load.metadata.deps,
        execute: function() {
          return loader.newModule({});
        }
      };

    // place this module onto defined for circular references
    if (entry)
      loader.defined[load.name] = entry;

    // no entry -> treat as ES6
    else
      return loaderInstantiate.call(this, load);

    entry.deps = dedupe(entry.deps);
    entry.name = load.name;

    // first, normalize all dependencies
    var normalizePromises = [];
    for (var i = 0, l = entry.deps.length; i < l; i++)
      normalizePromises.push(Promise.resolve(loader.normalize(entry.deps[i], load.name)));

    return Promise.all(normalizePromises).then(function(normalizedDeps) {

      entry.normalizedDeps = normalizedDeps;

      return {
        deps: entry.deps,
        execute: function() {
          // recursively ensure that the module and all its 
          // dependencies are linked (with dependency group handling)
          link(load.name, loader);

          // now handle dependency execution in correct order
          ensureEvaluated(load.name, [], loader);

          // remove from the registry
          loader.defined[load.name] = undefined;

          var module = entry.module.exports;

          if (!module || !entry.declarative && module.__esModule !== true)
            module = { 'default': module, __useDefault: true };

          // return the defined module object
          return loader.newModule(module);
        }
      };
    });
  }
}
/*
 * Extension to detect ES6 and auto-load Traceur or Babel for processing
 */
function es6(loader) {
  loader._extensions.push(es6);

  // good enough ES6 detection regex - format detections not designed to be accurate, but to handle the 99% use case
  var es6RegEx = /(^\s*|[}\);\n]\s*)(import\s+(['"]|(\*\s+as\s+)?[^"'\(\)\n;]+\s+from\s+['"]|\{)|export\s+\*\s+from\s+["']|export\s+(\{|default|function|class|var|const|let|async\s+function))/;

  var traceurRuntimeRegEx = /\$traceurRuntime\s*\./;
  var babelHelpersRegEx = /babelHelpers\s*\./;

  var transpilerNormalized, transpilerRuntimeNormalized;

  var firstLoad = true;

  var nodeResolver = typeof process != 'undefined' && typeof require != 'undefined' && require.resolve;

  function setConfig(loader, module, nodeModule) {
    loader.meta[module] = {format: 'global'};
    if (nodeResolver && !loader.paths[module]) {
      try {
        loader.paths[module] = require.resolve(nodeModule || module);
      }
      catch(e) {}
    }
  }

  var loaderLocate = loader.locate;
  loader.locate = function(load) {
    var self = this;
    if (firstLoad) {
      if (self.transpiler == 'traceur') {
        setConfig(self, 'traceur', 'traceur/bin/traceur.js');
        self.meta['traceur'].exports = 'traceur';
        setConfig(self, 'traceur-runtime', 'traceur/bin/traceur-runtime.js');
      }
      else if (self.transpiler == 'babel') {
        setConfig(self, 'babel', 'babel-core/browser.js');
        setConfig(self, 'babel-runtime', 'babel-core/external-helpers.js');
      }
      firstLoad = false;
    }
    return loaderLocate.call(self, load);
  };

  var loaderTranslate = loader.translate;
  loader.translate = function(load) {
    var loader = this;

    return loaderTranslate.call(loader, load)
    .then(function(source) {

      // detect ES6
      if (load.metadata.format == 'es6' || !load.metadata.format && source.match(es6RegEx)) {
        load.metadata.format = 'es6';
        return source;
      }

      if (load.metadata.format == 'register') {
        if (!loader.global.$traceurRuntime && load.source.match(traceurRuntimeRegEx)) {
          return loader['import']('traceur-runtime').then(function() {
            return source;
          });
        }
        if (!loader.global.babelHelpers && load.source.match(babelHelpersRegEx)) {
          return loader['import']('babel/external-helpers').then(function() {
            return source;
          });
        }
      }

      // ensure Traceur doesn't clobber the System global
      if (loader.transpiler == 'traceur')
        return Promise.all([
          transpilerNormalized || (transpilerNormalized = loader.normalize(loader.transpiler)),
          transpilerRuntimeNormalized || (transpilerRuntimeNormalized = loader.normalize(loader.transpiler + '-runtime'))
        ])
        .then(function(normalized) {
          if (load.name == normalized[0] || load.name == normalized[1])
            return '(function() { var curSystem = System; ' + source + '\nSystem = curSystem; })();';

          return source;
        });

      return source;
    });

  };

}
/*
  SystemJS Global Format

  Supports
    metadata.deps
    metadata.init
    metadata.exports

  Also detects writes to the global object avoiding global collisions.
  See the SystemJS readme global support section for further information.
*/
function global(loader) {

  loader._extensions.push(global);

  function readGlobalProperty(p, value) {
    var pParts = p.split('.');
    while (pParts.length)
      value = value[pParts.shift()];
    return value;
  }

  function createHelpers(loader) {
    if (loader.has('@@global-helpers'))
      return;

    var hasOwnProperty = loader.global.hasOwnProperty;
    var moduleGlobals = {};

    var curGlobalObj;
    var ignoredGlobalProps;

    loader.set('@@global-helpers', loader.newModule({
      prepareGlobal: function(moduleName, deps) {
        // first, we add all the dependency modules to the global
        for (var i = 0; i < deps.length; i++) {
          var moduleGlobal = moduleGlobals[deps[i]];
          if (moduleGlobal)
            for (var m in moduleGlobal)
              loader.global[m] = moduleGlobal[m];
        }

        // now store a complete copy of the global object
        // in order to detect changes
        curGlobalObj = {};
        ignoredGlobalProps = ['indexedDB', 'sessionStorage', 'localStorage',
          'clipboardData', 'frames', 'webkitStorageInfo', 'toolbar', 'statusbar',
          'scrollbars', 'personalbar', 'menubar', 'locationbar', 'webkitIndexedDB',
          'screenTop', 'screenLeft'
        ];
        for (var g in loader.global) {
          if (indexOf.call(ignoredGlobalProps, g) != -1) { continue; }
          if (!hasOwnProperty || loader.global.hasOwnProperty(g)) {
            try {
              curGlobalObj[g] = loader.global[g];
            } catch (e) {
              ignoredGlobalProps.push(g);
            }
          }
        }
      },
      retrieveGlobal: function(moduleName, exportName, init) {
        var singleGlobal;
        var multipleExports;
        var exports = {};

        // run init
        if (init)
          singleGlobal = init.call(loader.global);

        // check for global changes, creating the globalObject for the module
        // if many globals, then a module object for those is created
        // if one global, then that is the module directly
        else if (exportName) {
          var firstPart = exportName.split('.')[0];
          singleGlobal = readGlobalProperty(exportName, loader.global);
          exports[firstPart] = loader.global[firstPart];
        }

        else {
          for (var g in loader.global) {
            if (indexOf.call(ignoredGlobalProps, g) != -1)
              continue;
            if ((!hasOwnProperty || loader.global.hasOwnProperty(g)) && g != loader.global && curGlobalObj[g] != loader.global[g]) {
              exports[g] = loader.global[g];
              if (singleGlobal) {
                if (singleGlobal !== loader.global[g])
                  multipleExports = true;
              }
              else if (singleGlobal === undefined) {
                singleGlobal = loader.global[g];
              }
            }
          }
        }

        moduleGlobals[moduleName] = exports;

        return multipleExports ? exports : singleGlobal;
      }
    }));
  }

  createHelpers(loader);

  var loaderInstantiate = loader.instantiate;
  loader.instantiate = function(load) {
    var loader = this;

    createHelpers(loader);

    var exportName = load.metadata.exports;

    if (!load.metadata.format)
      load.metadata.format = 'global';

    // global is a fallback module format
    if (load.metadata.format == 'global') {
      load.metadata.execute = function(require, exports, module) {

        loader.get('@@global-helpers').prepareGlobal(module.id, load.metadata.deps);

        if (exportName)
          load.source += '\nthis["' + exportName + '"] = ' + exportName + ';';

        // disable module detection
        var define = loader.global.define;
        var require = loader.global.require;
        
        loader.global.define = undefined;
        loader.global.module = undefined;
        loader.global.exports = undefined;

        loader.__exec(load);

        loader.global.require = require;
        loader.global.define = define;

        return loader.get('@@global-helpers').retrieveGlobal(module.id, exportName, load.metadata.init);
      }
    }
    return loaderInstantiate.call(loader, load);
  }
}
/*
  SystemJS CommonJS Format
*/
function cjs(loader) {
  loader._extensions.push(cjs);

  // CJS Module Format
  // require('...') || exports[''] = ... || exports.asd = ... || module.exports = ...
  var cjsExportsRegEx = /(?:^\uFEFF?|[^$_a-zA-Z\xA0-\uFFFF.]|module\.)(exports\s*\[['"]|\exports\s*\.)|(?:^\uFEFF?|[^$_a-zA-Z\xA0-\uFFFF.])module\.exports\s*\=/;
  // RegEx adjusted from https://github.com/jbrantly/yabble/blob/master/lib/yabble.js#L339
  var cjsRequireRegEx = /(?:^\uFEFF?|[^$_a-zA-Z\xA0-\uFFFF."'])require\s*\(\s*("[^"\\]*(?:\\.[^"\\]*)*"|'[^'\\]*(?:\\.[^'\\]*)*')\s*\)/g;
  var commentRegEx = /(\/\*([\s\S]*?)\*\/|([^:]|^)\/\/(.*)$)/mg;

  function getCJSDeps(source) {
    cjsRequireRegEx.lastIndex = 0;

    var deps = [];

    // remove comments from the source first, if not minified
    if (source.length / source.split('\n').length < 200)
      source = source.replace(commentRegEx, '');

    var match;

    while (match = cjsRequireRegEx.exec(source))
      deps.push(match[1].substr(1, match[1].length - 2));

    return deps;
  }

  var loaderInstantiate = loader.instantiate;
  loader.instantiate = function(load) {

    if (!load.metadata.format) {
      cjsExportsRegEx.lastIndex = 0;
      cjsRequireRegEx.lastIndex = 0;
      if (cjsRequireRegEx.exec(load.source) || cjsExportsRegEx.exec(load.source))
        load.metadata.format = 'cjs';
    }

    if (load.metadata.format == 'cjs') {
      load.metadata.deps = load.metadata.deps ? load.metadata.deps.concat(getCJSDeps(load.source)) : getCJSDeps(load.source);

      load.metadata.executingRequire = true;

      load.metadata.execute = function(require, exports, module) {
        var dirname = (load.address || '').split('/');
        dirname.pop();
        dirname = dirname.join('/');

        // if on the server, remove the "file:" part from the dirname
        if (System._nodeRequire)
          dirname = dirname.substr(5);

        var globals = loader.global._g = {
          global: loader.global,
          exports: exports,
          module: module,
          require: require,
          __filename: System._nodeRequire ? load.address.substr(5) : load.address,
          __dirname: dirname
        };


        // disable AMD detection
        var define = loader.global.define;
        loader.global.define = undefined;

        var execLoad = {
          name: load.name,
          source: '(function() {\n(function(global, exports, module, require, __filename, __dirname){\n' + load.source + 
                                  '\n}).call(_g.exports, _g.global, _g.exports, _g.module, _g.require, _g.__filename, _g.__dirname);})();',
          address: load.address
        };
        loader.__exec(execLoad);

        loader.global.define = define;

        loader.global._g = undefined;
      }
    }

    return loaderInstantiate.call(this, load);
  };
}
/*
  SystemJS AMD Format
  Provides the AMD module format definition at System.format.amd
  as well as a RequireJS-style require on System.require
*/
function amd(loader) {
  // by default we only enforce AMD noConflict mode in Node
  var isNode = typeof module != 'undefined' && module.exports;

  loader._extensions.push(amd);

  // AMD Module Format Detection RegEx
  // define([.., .., ..], ...)
  // define(varName); || define(function(require, exports) {}); || define({})
  var amdRegEx = /(?:^\uFEFF?|[^$_a-zA-Z\xA0-\uFFFF.])define\s*\(\s*("[^"]+"\s*,\s*|'[^']+'\s*,\s*)?\s*(\[(\s*(("[^"]+"|'[^']+')\s*,|\/\/.*\r?\n|\/\*(.|\s)*?\*\/))*(\s*("[^"]+"|'[^']+')\s*,?)?(\s*(\/\/.*\r?\n|\/\*(.|\s)*?\*\/))*\s*\]|function\s*|{|[_$a-zA-Z\xA0-\uFFFF][_$a-zA-Z0-9\xA0-\uFFFF]*\))/;
  var commentRegEx = /(\/\*([\s\S]*?)\*\/|([^:]|^)\/\/(.*)$)/mg;

  var cjsRequirePre = "(?:^|[^$_a-zA-Z\\xA0-\\uFFFF.])";
  var cjsRequirePost = "\\s*\\(\\s*(\"([^\"]+)\"|'([^']+)')\\s*\\)";

  var fnBracketRegEx = /\(([^\)]*)\)/;

  var wsRegEx = /^\s+|\s+$/g;

  var requireRegExs = {};

  function getCJSDeps(source, requireIndex) {

    // remove comments
    source = source.replace(commentRegEx, '');

    // determine the require alias
    var params = source.match(fnBracketRegEx);
    var requireAlias = (params[1].split(',')[requireIndex] || 'require').replace(wsRegEx, '');

    // find or generate the regex for this requireAlias
    var requireRegEx = requireRegExs[requireAlias] || (requireRegExs[requireAlias] = new RegExp(cjsRequirePre + requireAlias + cjsRequirePost, 'g'));

    requireRegEx.lastIndex = 0;

    var deps = [];

    var match;
    while (match = requireRegEx.exec(source))
      deps.push(match[2] || match[3]);

    return deps;
  }

  /*
    AMD-compatible require
    To copy RequireJS, set window.require = window.requirejs = loader.amdRequire
  */
  function require(names, callback, errback, referer) {
    // 'this' is bound to the loader
    var loader = this;

    // in amd, first arg can be a config object... we just ignore
    if (typeof names == 'object' && !(names instanceof Array))
      return require.apply(null, Array.prototype.splice.call(arguments, 1, arguments.length - 1));

    // amd require
    if (names instanceof Array)
      Promise.all(names.map(function(name) {
        return loader['import'](name, referer);
      })).then(function(modules) {
        if(callback) {
          callback.apply(null, modules);
        }
      }, errback);

    // commonjs require
    else if (typeof names == 'string') {
      var module = loader.get(names);
      return module.__useDefault ? module['default'] : module;
    }

    else
      throw new TypeError('Invalid require');
  };
  loader.amdRequire = function() {
    return require.apply(this, arguments);
  };

  function makeRequire(parentName, staticRequire, loader) {
    return function(names, callback, errback) {
      if (typeof names == 'string')
        return staticRequire(names);
      return require.call(loader, names, callback, errback, { name: parentName });
    }
  }

  // run once per loader
  function generateDefine(loader) {
    // script injection mode calls this function synchronously on load
    var onScriptLoad = loader.onScriptLoad;
    loader.onScriptLoad = function(load) {
      onScriptLoad(load);
      if (anonDefine || defineBundle) {
        load.metadata.format = 'defined';
        load.metadata.registered = true;
      }

      if (anonDefine) {
        load.metadata.deps = load.metadata.deps ? load.metadata.deps.concat(anonDefine.deps) : anonDefine.deps;
        load.metadata.execute = anonDefine.execute;
      }
    }

    function define(name, deps, factory) {
      if (typeof name != 'string') {
        factory = deps;
        deps = name;
        name = null;
      }
      if (!(deps instanceof Array)) {
        factory = deps;
        deps = ['require', 'exports', 'module'];
      }

      if (typeof factory != 'function')
        factory = (function(factory) {
          return function() { return factory; }
        })(factory);

      // in IE8, a trailing comma becomes a trailing undefined entry
      if (deps[deps.length - 1] === undefined)
        deps.pop();

      // remove system dependencies
      var requireIndex, exportsIndex, moduleIndex;
      
      if ((requireIndex = indexOf.call(deps, 'require')) != -1) {
        
        deps.splice(requireIndex, 1);

        var factoryText = factory.toString();

        deps = deps.concat(getCJSDeps(factoryText, requireIndex));
      }
        

      if ((exportsIndex = indexOf.call(deps, 'exports')) != -1)
        deps.splice(exportsIndex, 1);
      
      if ((moduleIndex = indexOf.call(deps, 'module')) != -1)
        deps.splice(moduleIndex, 1);

      var define = {
        deps: deps,
        execute: function(require, exports, module) {

          var depValues = [];
          for (var i = 0; i < deps.length; i++)
            depValues.push(require(deps[i]));

          module.uri = loader.baseURL + module.id;

          module.config = function() {};

          // add back in system dependencies
          if (moduleIndex != -1)
            depValues.splice(moduleIndex, 0, module);
          
          if (exportsIndex != -1)
            depValues.splice(exportsIndex, 0, exports);
          
          if (requireIndex != -1)
            depValues.splice(requireIndex, 0, makeRequire(module.id, require, loader));

          var output = factory.apply(global, depValues);

          if (typeof output == 'undefined' && module)
            output = module.exports;

          if (typeof output != 'undefined')
            return output;
        }
      };

      // anonymous define
      if (!name) {
        // already defined anonymously -> throw
        if (anonDefine)
          throw new TypeError('Multiple defines for anonymous module');
        anonDefine = define;
      }
      // named define
      else {
        // if it has no dependencies and we don't have any other
        // defines, then let this be an anonymous define
        if (deps.length == 0 && !anonDefine && !defineBundle)
          anonDefine = define;

        // otherwise its a bundle only
        else
          anonDefine = null;

        // the above is just to support single modules of the form:
        // define('jquery')
        // still loading anonymously
        // because it is done widely enough to be useful

        // note this is now a bundle
        defineBundle = true;

        // define the module through the register registry
        loader.register(name, define.deps, false, define.execute);
      }
    };
    define.amd = {};
    loader.amdDefine = define;
  }

  var anonDefine;
  // set to true if the current module turns out to be a named define bundle
  var defineBundle;

  var oldModule, oldExports, oldDefine;

  // adds define as a global (potentially just temporarily)
  function createDefine(loader) {
    if (!loader.amdDefine)
      generateDefine(loader);

    anonDefine = null;
    defineBundle = null;

    // ensure no NodeJS environment detection
    var global = loader.global;

    oldModule = global.module;
    oldExports = global.exports;
    oldDefine = global.define;

    global.module = undefined;
    global.exports = undefined;

    if (global.define && global.define === loader.amdDefine)
      return;

    global.define = loader.amdDefine;
  }

  function removeDefine(loader) {
    var global = loader.global;
    global.define = oldDefine;
    global.module = oldModule;
    global.exports = oldExports;
  }

  generateDefine(loader);

  if (loader.scriptLoader) {
    var loaderFetch = loader.fetch;
    loader.fetch = function(load) {
      createDefine(this);
      return loaderFetch.call(this, load);
    }
  }

  var loaderInstantiate = loader.instantiate;
  loader.instantiate = function(load) {
    var loader = this;

    if (load.metadata.format == 'amd' || !load.metadata.format && load.source.match(amdRegEx)) {
      load.metadata.format = 'amd';

      if (loader.execute !== false) {
        createDefine(loader);

        loader.__exec(load);

        removeDefine(loader);

        if (!anonDefine && !defineBundle && !isNode)
          throw new TypeError('AMD module ' + load.name + ' did not define');
      }

      if (anonDefine) {
        load.metadata.deps = load.metadata.deps ? load.metadata.deps.concat(anonDefine.deps) : anonDefine.deps;
        load.metadata.execute = anonDefine.execute;
      }
    }

    return loaderInstantiate.call(loader, load);
  }
}
/*
  SystemJS map support
  
  Provides map configuration through
    System.map['jquery'] = 'some/module/map'

  As well as contextual map config through
    System.map['bootstrap'] = {
      jquery: 'some/module/map2'
    }

  Note that this applies for subpaths, just like RequireJS

  jquery      -> 'some/module/map'
  jquery/path -> 'some/module/map/path'
  bootstrap   -> 'bootstrap'

  Inside any module name of the form 'bootstrap' or 'bootstrap/*'
    jquery    -> 'some/module/map2'
    jquery/p  -> 'some/module/map2/p'

  Maps are carefully applied from most specific contextual map, to least specific global map
*/
function map(loader) {
  loader.map = loader.map || {};

  loader._extensions.push(map);

  // return if prefix parts (separated by '/') match the name
  // eg prefixMatch('jquery/some/thing', 'jquery') -> true
  //    prefixMatch('jqueryhere/', 'jquery') -> false
  function prefixMatch(name, prefix) {
    if (name.length < prefix.length)
      return false;
    if (name.substr(0, prefix.length) != prefix)
      return false;
    if (name[prefix.length] && name[prefix.length] != '/')
      return false;
    return true;
  }

  // get the depth of a given path
  // eg pathLen('some/name') -> 2
  function pathLen(name) {
    var len = 1;
    for (var i = 0, l = name.length; i < l; i++)
      if (name[i] === '/')
        len++;
    return len;
  }

  function doMap(name, matchLen, map) {
    return map + name.substr(matchLen);
  }

  // given a relative-resolved module name and normalized parent name,
  // apply the map configuration
  function applyMap(name, parentName, loader) {
    var curMatch, curMatchLength = 0;
    var curParent, curParentMatchLength = 0;
    var tmpParentLength, tmpPrefixLength;
    var subPath;
    var nameParts;
    
    // first find most specific contextual match
    if (parentName) {
      for (var p in loader.map) {
        var curMap = loader.map[p];
        if (typeof curMap != 'object')
          continue;

        // most specific parent match wins first
        if (!prefixMatch(parentName, p))
          continue;

        tmpParentLength = pathLen(p);
        if (tmpParentLength <= curParentMatchLength)
          continue;

        for (var q in curMap) {
          // most specific name match wins
          if (!prefixMatch(name, q))
            continue;
          tmpPrefixLength = pathLen(q);
          if (tmpPrefixLength <= curMatchLength)
            continue;

          curMatch = q;
          curMatchLength = tmpPrefixLength;
          curParent = p;
          curParentMatchLength = tmpParentLength;
        }
      }
    }

    // if we found a contextual match, apply it now
    if (curMatch)
      return doMap(name, curMatch.length, loader.map[curParent][curMatch]);

    // now do the global map
    for (var p in loader.map) {
      var curMap = loader.map[p];
      if (typeof curMap != 'string')
        continue;

      if (!prefixMatch(name, p))
        continue;

      var tmpPrefixLength = pathLen(p);

      if (tmpPrefixLength <= curMatchLength)
        continue;

      curMatch = p;
      curMatchLength = tmpPrefixLength;
    }

    if (curMatch)
      return doMap(name, curMatch.length, loader.map[curMatch]);

    return name;
  }

  var loaderNormalize = loader.normalize;
  loader.normalize = function(name, parentName, parentAddress) {
    var loader = this;
    if (!loader.map)
      loader.map = {};

    var isPackage = false;
    if (name.substr(name.length - 1, 1) == '/') {
      isPackage = true;
      name += '#';
    }

    return Promise.resolve(loaderNormalize.call(loader, name, parentName, parentAddress))
    .then(function(name) {
      name = applyMap(name, parentName, loader);

      // Normalize "module/" into "module/module"
      // Convenient for packages
      if (isPackage) {
        var nameParts = name.split('/');
        nameParts.pop();
        var pkgName = nameParts.pop();
        nameParts.push(pkgName);
        nameParts.push(pkgName);
        name = nameParts.join('/');
      }

      return name;
    });
  }
}
/*
  SystemJS Plugin Support

  Supports plugin syntax with "!"

  The plugin name is loaded as a module itself, and can override standard loader hooks
  for the plugin resource. See the plugin section of the systemjs readme.
*/
function plugins(loader) {
  if (typeof indexOf == 'undefined')
    indexOf = Array.prototype.indexOf;

  loader._extensions.push(plugins);

  var loaderNormalize = loader.normalize;
  loader.normalize = function(name, parentName, parentAddress) {
    var loader = this;
    // if parent is a plugin, normalize against the parent plugin argument only
    var parentPluginIndex;
    if (parentName && (parentPluginIndex = parentName.indexOf('!')) != -1)
      parentName = parentName.substr(0, parentPluginIndex);

    return Promise.resolve(loaderNormalize.call(loader, name, parentName, parentAddress))
    .then(function(name) {
      // if this is a plugin, normalize the plugin name and the argument
      var pluginIndex = name.lastIndexOf('!');
      if (pluginIndex != -1) {
        var argumentName = name.substr(0, pluginIndex);

        // plugin name is part after "!" or the extension itself
        var pluginName = name.substr(pluginIndex + 1) || argumentName.substr(argumentName.lastIndexOf('.') + 1);

        // normalize the plugin name relative to the same parent
        return new Promise(function(resolve) {
          resolve(loader.normalize(pluginName, parentName, parentAddress)); 
        })
        // normalize the plugin argument
        .then(function(_pluginName) {
          pluginName = _pluginName;
          return loader.normalize(argumentName, parentName, parentAddress);
        })
        .then(function(argumentName) {
          return argumentName + '!' + pluginName;
        });
      }

      // standard normalization
      return name;
    });
  };

  var loaderLocate = loader.locate;
  loader.locate = function(load) {
    var loader = this;

    var name = load.name;

    // only fetch the plugin itself if this name isn't defined
    if (this.defined && this.defined[name])
      return loaderLocate.call(this, load);

    // plugin
    var pluginIndex = name.lastIndexOf('!');
    if (pluginIndex != -1) {
      var pluginName = name.substr(pluginIndex + 1);

      // the name to locate is the plugin argument only
      load.name = name.substr(0, pluginIndex);

      var pluginLoader = loader.pluginLoader || loader;

      // load the plugin module
      // NB ideally should use pluginLoader.load for normalized,
      //    but not currently working for some reason
      return pluginLoader['import'](pluginName)
      .then(function() {
        var plugin = pluginLoader.get(pluginName);
        plugin = plugin['default'] || plugin;

        // allow plugins to opt-out of build
        if (plugin.build === false && loader.pluginLoader)
          load.metadata.build = false;

        // store the plugin module itself on the metadata
        load.metadata.plugin = plugin;
        load.metadata.pluginName = pluginName;
        load.metadata.pluginArgument = load.name;
        load.metadata.buildType = plugin.buildType || "js";

        // run plugin locate if given
        if (plugin.locate)
          return plugin.locate.call(loader, load);

        // otherwise use standard locate without '.js' extension adding
        else
          return Promise.resolve(loader.locate(load))
          .then(function(address) {
            return address.replace(/\.js$/, '');
          });
      });
    }

    return loaderLocate.call(this, load);
  };

  var loaderFetch = loader.fetch;
  loader.fetch = function(load) {
    var loader = this;
    // ignore fetching build = false unless in a plugin loader
    if (load.metadata.build === false && loader.pluginLoader)
      return '';
    else if (load.metadata.plugin && load.metadata.plugin.fetch && !load.metadata.pluginFetchCalled) {
      load.metadata.pluginFetchCalled = true;
      return load.metadata.plugin.fetch.call(loader, load, loaderFetch);
    }
    else
      return loaderFetch.call(loader, load);
  };

  var loaderTranslate = loader.translate;
  loader.translate = function(load) {
    var loader = this;
    if (load.metadata.plugin && load.metadata.plugin.translate)
      return Promise.resolve(load.metadata.plugin.translate.call(loader, load)).then(function(result) {
        if (typeof result == 'string')
          load.source = result;
        return loaderTranslate.call(loader, load);
      });
    else
      return loaderTranslate.call(loader, load);
  };

  var loaderInstantiate = loader.instantiate;
  loader.instantiate = function(load) {
    var loader = this;
    if (load.metadata.plugin && load.metadata.plugin.instantiate)
       return Promise.resolve(load.metadata.plugin.instantiate.call(loader, load)).then(function(result) {
        if (result) {
          // load.metadata.format = 'defined';
          // load.metadata.execute = function() {
          //   return result;
          // };
          return result;
        }
        return loaderInstantiate.call(loader, load);
      });
    else if (load.metadata.plugin && load.metadata.plugin.build === false) {
      load.metadata.format = 'defined';
      load.metadata.deps.push(load.metadata.pluginName);
      load.metadata.execute = function() {
        return loader.newModule({});
      };
      return loaderInstantiate.call(loader, load);
    }
    else
      return loaderInstantiate.call(loader, load);
  }

}
/*
  System bundles

  Allows a bundle module to be specified which will be dynamically 
  loaded before trying to load a given module.

  For example:
  System.bundles['mybundle'] = ['jquery', 'bootstrap/js/bootstrap']

  Will result in a load to "mybundle" whenever a load to "jquery"
  or "bootstrap/js/bootstrap" is made.

  In this way, the bundle becomes the request that provides the module
*/

function bundles(loader) {
  if (typeof indexOf == 'undefined')
    indexOf = Array.prototype.indexOf;

  loader._extensions.push(bundles);

  // bundles support (just like RequireJS)
  // bundle name is module name of bundle itself
  // bundle is array of modules defined by the bundle
  // when a module in the bundle is requested, the bundle is loaded instead
  // of the form System.bundles['mybundle'] = ['jquery', 'bootstrap/js/bootstrap']
  loader.bundles = loader.bundles || {};

  var loaderFetch = loader.fetch;
  loader.fetch = function(load) {
    var loader = this;
    if (loader.trace)
      return loaderFetch.call(this, load);
    if (!loader.bundles)
      loader.bundles = {};

    // if this module is in a bundle, load the bundle first then
    for (var b in loader.bundles) {
      if (indexOf.call(loader.bundles[b], load.name) == -1)
        continue;
      // we do manual normalization in case the bundle is mapped
      // this is so we can still know the normalized name is a bundle
      return Promise.resolve(loader.normalize(b))
      .then(function(normalized) {
        loader.bundles[normalized] = loader.bundles[normalized] || loader.bundles[b];

        // note this module is a bundle in the meta
        loader.meta = loader.meta || {};
        loader.meta[normalized] = loader.meta[normalized] || {};
        loader.meta[normalized].bundle = true;

        return loader.load(normalized);
      })
      .then(function() {
        return '';
      });
    }
    return loaderFetch.call(this, load);
  }
}
/*
 * Dependency Tree Cache
 * 
 * Allows a build to pre-populate a dependency trace tree on the loader of 
 * the expected dependency tree, to be loaded upfront when requesting the
 * module, avoinding the n round trips latency of module loading, where 
 * n is the dependency tree depth.
 *
 * eg:
 * System.depCache = {
 *  'app': ['normalized', 'deps'],
 *  'normalized': ['another'],
 *  'deps': ['tree']
 * };
 * 
 * System.import('app') 
 * // simultaneously starts loading all of:
 * // 'normalized', 'deps', 'another', 'tree'
 * // before "app" source is even loaded
 */

function depCache(loader) {
  loader.depCache = loader.depCache || {};

  loader._extensions.push(depCache);

  var loaderLocate = loader.locate;
  loader.locate = function(load) {
    var loader = this;

    if (!loader.depCache)
      loader.depCache = {};

    // load direct deps, in turn will pick up their trace trees
    var deps = loader.depCache[load.name];
    if (deps)
      for (var i = 0; i < deps.length; i++)
        loader.load(deps[i]);

    return loaderLocate.call(loader, load);
  }
}
  
core(System);
meta(System);
register(System);
es6(System);
global(System);
cjs(System);
amd(System);
map(System);
plugins(System);
bundles(System);
depCache(System);

};

var $__curScript, __eval;

(function() {

  var doEval;

  __eval = function(source, address, sourceMap) {
    source += '\n//# sourceURL=' + address + (sourceMap ? '\n//# sourceMappingURL=' + sourceMap : '');

    try {
      doEval(source);
    }
    catch(e) {
      var msg = 'Error evaluating ' + address + '\n';
      if (e instanceof Error)
        e.message = msg + e.message;
      else
        e = msg + e;
      throw e;
    }
  };

  if (typeof document != 'undefined') {
    var head;

    var scripts = document.getElementsByTagName('script');
    $__curScript = scripts[scripts.length - 1];

    // globally scoped eval for the browser
    doEval = function(source) {
      if (!head)
        head = document.head || document.body || document.documentElement;

      var script = document.createElement('script');
      script.text = source;
      var onerror = window.onerror;
      var e;
      window.onerror = function(_e) {
        e = _e;
      }
      head.appendChild(script);
      head.removeChild(script);
      window.onerror = onerror;
      if (e)
        throw e;
    }

    if (!$__global.System || !$__global.LoaderPolyfill) {
      // determine the current script path as the base path
      var curPath = $__curScript.src;
      var basePath = curPath.substr(0, curPath.lastIndexOf('/') + 1);
      document.write(
        '<' + 'script type="text/javascript" src="' + basePath + 'es6-module-loader.js" data-init="upgradeSystemLoader">' + '<' + '/script>'
      );
    }
    else {
      $__global.upgradeSystemLoader();
    }
  }
  else if (typeof WorkerGlobalScope != 'undefined' && typeof importScripts != 'undefined') {
    doEval = function(source) {
      try {
        eval(source);
      } catch(e) {
        throw e;
      }
    };

    if (!$__global.System || !$__global.LoaderPolyfill) {
      var basePath = '';
      try {
        throw new Error('Get worker base path via error stack');
      } catch (e) {
        e.stack.replace(/(?:at|@).*(http.+):[\d]+:[\d]+/, function (m, url) {
          basePath = url.replace(/\/[^\/]*$/, '/');
        });
      }
      importScripts(basePath + 'es6-module-loader.js');
      $__global.upgradeSystemLoader();
    } else {
      $__global.upgradeSystemLoader();
    }
  }
  else {
    var es6ModuleLoader = require('es6-module-loader');
    $__global.System = es6ModuleLoader.System;
    $__global.Loader = es6ModuleLoader.Loader;
    $__global.upgradeSystemLoader();
    module.exports = $__global.System;

    // global scoped eval for node
    var vm = require('vm');
    doEval = function(source, address, sourceMap) {
      vm.runInThisContext(source);
    }
  }
})();

})(typeof window != 'undefined' ? window : (typeof WorkerGlobalScope != 'undefined' ? self : global));

(function(global){

	// helpers
	var camelize = function(str){
		return str.replace(/-+(.)?/g, function(match, chr){ 
			return chr ? chr.toUpperCase() : '' 
		});
	},
		each = function( o, cb){
			var i, len;

			// weak array detection, but we only use this internally so don't
			// pass it weird stuff
			if ( typeof o.length == 'number' && (o.length - 1) in o) {
				for ( i = 0, len = o.length; i < len; i++ ) {
					cb.call(o[i], o[i], i, o);
				}
			} else {
				for ( i in o ) {
					if(o.hasOwnProperty(i)){
						cb.call(o[i], o[i], i, o);
					}
				}
			}
			return o;
		},
		map = function(o, cb) {
			var arr = [];
			each(o, function(item, i){
				arr[i] = cb(item, i);
			});
			return arr;
		},
		isString = function(o) {
			return typeof o == "string";
		},
		extend = function(d,s){
			each(s, function(v, p){
				d[p] = v;
			});
			return d;
		},
		dir = function(uri){
			var lastSlash = uri.lastIndexOf("/");
			//if no / slashes, check for \ slashes since it might be a windows path
			if(lastSlash === -1)
				lastSlash = uri.lastIndexOf("\\");
			if(lastSlash !== -1) {
				return uri.substr(0, lastSlash);
			} else {
				return uri;
			}
		},
		last = function(arr){
			return arr[arr.length - 1];
		},
		parseURI = function(url) {
			var m = String(url).replace(/^\s+|\s+$/g, '').match(/^([^:\/?#]+:)?(\/\/(?:[^:@]*(?::[^:@]*)?@)?(([^:\/?#]*)(?::(\d*))?))?([^?#]*)(\?[^#]*)?(#[\s\S]*)?/);
				// authority = '//' + user + ':' + pass '@' + hostname + ':' port
				return (m ? {
				href     : m[0] || '',
				protocol : m[1] || '',
				authority: m[2] || '',
				host     : m[3] || '',
				hostname : m[4] || '',
				port     : m[5] || '',
				pathname : m[6] || '',
				search   : m[7] || '',
				hash     : m[8] || ''
			} : null);
		},
		joinURIs = function(base, href) {
			function removeDotSegments(input) {
				var output = [];
				input.replace(/^(\.\.?(\/|$))+/, '')
					.replace(/\/(\.(\/|$))+/g, '/')
					.replace(/\/\.\.$/, '/../')
					.replace(/\/?[^\/]*/g, function (p) {
						if (p === '/..') {
							output.pop();
						} else {
							output.push(p);
						}
					});
				return output.join('').replace(/^\//, input.charAt(0) === '/' ? '/' : '');
			}

			href = parseURI(href || '');
			base = parseURI(base || '');

			return !href || !base ? null : (href.protocol || base.protocol) +
				(href.protocol || href.authority ? href.authority : base.authority) +
				removeDotSegments(href.protocol || href.authority || href.pathname.charAt(0) === '/' ? href.pathname : (href.pathname ? ((base.authority && !base.pathname ? '/' : '') + base.pathname.slice(0, base.pathname.lastIndexOf('/') + 1) + href.pathname) : base.pathname)) +
					(href.protocol || href.authority || href.pathname ? href.search : (href.search || base.search)) +
					href.hash;
		};
	var filename = function(uri){
		var lastSlash = uri.lastIndexOf("/");
		//if no / slashes, check for \ slashes since it might be a windows path
		if(lastSlash === -1)
			lastSlash = uri.lastIndexOf("\\");
		var matches = ( lastSlash == -1 ? uri : uri.substr(lastSlash+1) ).match(/^[\w-\s\.!]+/);
		return matches ? matches[0] : "";
	};
	
	var ext = function(uri){
		var fn = filename(uri);
		var dot = fn.lastIndexOf(".");
		if(dot !== -1) {
			return fn.substr(dot+1);
		} else {
			return "";
		}
	};

	var pluginCache = {};
	
	var normalize = function(name, loader){

		// Detech if this name contains a plugin part like: app.less!steal/less
		// and catch the plugin name so that when it is normalized we do not perform
		// Steal's normalization against it.
		var pluginIndex = name.lastIndexOf('!');
		var pluginPart = "";
		if (pluginIndex != -1) {
			// argumentName is the part before the !
			var argumentName = name.substr(0, pluginIndex);
			var pluginName = name.substr(pluginIndex + 1);
			pluginPart = "!" + pluginName;

			// Set the name to the argument name so that we can normalize it alone.
			name = argumentName;
		} 
		
		var last = filename(name),
			extension = ext(name);
		// if the name ends with /
		if(	name[name.length -1] === "/" ) {
			return name+filename( name.substr(0, name.length-1) ) + pluginPart;
		} else if(	!/^(\w+(?:s)?:\/\/|\.|file|\/)/.test(name) &&
			// and doesn't end with a dot
			 last.indexOf(".") === -1 
			) {
			return name+"/"+last + pluginPart;
		} else {
			if(extension === "js") {
				return name.substr(0, name.lastIndexOf(".")) + pluginPart;
			} else {
				return name + pluginPart;
			}
		}
	};

var makeSteal = function(System){
	
	System.set('@loader', System.newModule({'default':System, __useDefault: true}));
		
	var configDeferred,
		devDeferred,
		appDeferred;

	var steal = function(){
		var args = arguments;
		var afterConfig = function(){
			var imports = [];
			var factory;
			each(args, function(arg){
				if(isString(arg)) {
					imports.push( steal.System['import']( normalize(arg) ) );
				} else if(typeof arg === "function") {
					factory = arg;
				}
			});
			
			var modules = Promise.all(imports);
			if(factory) {
				return modules.then(function(modules) {
			        return factory && factory.apply(null, modules);
			   });
			} else {
				return modules;
			}
		};
		if(System.env === "production") {
			return afterConfig();
		} else {
			// wait until the config has loaded
			return configDeferred.then(afterConfig,afterConfig);
		}
		
	};
	
	steal.System = System;
	steal.parseURI = parseURI;
	steal.joinURIs = joinURIs;
	steal.normalize = normalize;

	// System.ext = {bar: "path/to/bar"}
	// foo.bar! -> foo.bar!path/to/bar
	var addExt = function(loader) {
		
		loader.ext = {};
		
		var normalize = loader.normalize,
			endingExtension = /\.(\w+)!$/;
			
		loader.normalize = function(name, parentName, parentAddress){
			var matches = name.match(endingExtension),
				ext,
				newName = name;
			
			if(matches && loader.ext[ext = matches[1]]) {
				newName = name + loader.ext[ext];
			}
			return normalize.call(this, newName, parentName, parentAddress);
		};
	};

	if(typeof System){
		addExt(System);
	}
	

	// "path/to/folder/" -> "path/to/folder/folder"
	var addForwardSlash = function(loader) {
		var normalize = loader.normalize;

		loader.normalize = function(name, parentName, parentAddress) {
			var lastPos = name.length - 1,
				secondToLast,
				folderName;

			if (name[lastPos] === "/") {
				secondToLast = name.substring(0, lastPos).lastIndexOf("/");
				folderName = name.substring(secondToLast + 1, lastPos);
				name += folderName;
			}
			return normalize.call(this, name, parentName, parentAddress);
		};
	};

	if (typeof System) {
		addForwardSlash(System);
	}

/*
  SystemJS JSON Format
  Provides the JSON module format definition.
*/
function _SYSTEM_addJSON(loader) {
	var jsonTest = /^[\s\n\r]*[\{\[]/;
	var jsonExt = /\.json$/i;
	var jsExt = /\.js$/i;
	var inNode = typeof window === "undefined";

	// Add the extension to _extensions so that it can be cloned.
	loader._extensions.push(_SYSTEM_addJSON);

	// if someone has a moduleName that is .json, make sure it loads a json file
	// no matter what paths might do
	var loaderLocate = loader.locate;
	loader.locate = function(load){
	  return loaderLocate.apply(this, arguments).then(function(address){
		if(jsonExt.test(load.name)) {
			return address.replace(jsExt, "");
		}

	    return address;
	  });
	};

	// If we are in a build we should convert to CommonJS instead.
	if(inNode) {
		var loaderTranslate = loader.translate;
		loader.translate = function(load){
			if(jsonExt.test(load.name)) {
				var parsed = parse(load);
				if(parsed) {
					return "def" + "ine([], function(){\n" +
						"\treturn " + load.source + "\n});";
				}
			}

			return loaderTranslate.call(this, load);
		};
		return;
	}

	var loaderInstantiate = loader.instantiate;
	loader.instantiate = function(load) {
		var loader = this,
			parsed;

		parsed = parse(load);
		if(parsed) {
			load.metadata.format = 'json';

			load.metadata.execute = function(){
				return parsed;
			};
		}

		return loaderInstantiate.call(loader, load);
	};

	return loader;

	// Attempt to parse a load as json.
	function parse(load){
		if ( (load.metadata.format === 'json' || !load.metadata.format) && jsonTest.test(load.source)  ) {
			try {
				return JSON.parse(load.source);
			} catch(e) {}
		}

	}
}

if (typeof System !== "undefined") {
	_SYSTEM_addJSON(System);
}

	// Overwrites System.config with setter hooks
	var setterConfig = function(loader, configSpecial){
		var oldConfig = loader.config;
		
		loader.config =  function(cfg){
			
			var data = extend({},cfg);
			// check each special
			each(configSpecial, function(special, name){
				// if there is a setter and a value
				if(special.set && data[name]){
					// call the setter
					var res = special.set.call(loader,data[name], cfg);
					// if the setter returns a value
					if(res !== undefined) {
						// set that on the loader
						loader[name] = res;
					} 
					// delete the property b/c setting is done
					delete data[name];
				}
			});
			oldConfig.call(this, data);
		};
	};
	
	var setIfNotPresent = function(obj, prop, value){
		if(!obj[prop]) {
			obj[prop] = value;	
		}
	};
	
	// steal.js's default configuration values
	System.configMain = "@config";
	System.paths[System.configMain] = "stealconfig.js";
	System.env = "development";
	System.ext = {
		css: '$css',
		less: '$less'
	};
	System.logLevel = 0;
	var cssBundlesNameGlob = "bundles/*.css",
		jsBundlesNameGlob = "bundles/*";
	setIfNotPresent(System.paths,cssBundlesNameGlob, "dist/bundles/*css");
	setIfNotPresent(System.paths,jsBundlesNameGlob, "dist/bundles/*.js");
	
	var configSetter = {
		set: function(val){
			var name = filename(val),
				root = dir(val);
			System.configMain = name;
			System.paths[name] = name;
			addProductionBundles.call(this);
			this.config({ baseURL: (root === val ? "." : root) + "/" });
		}
	},
		mainSetter = {
			set: function(val){
				this.main = val;
				addProductionBundles.call(this);
			}
		};

	// checks if we're running in node, then prepends the "file:" protocol if we are
	var envPath = function(val) {
		if(typeof window === "undefined" && !/^file:/.test(val)) {
			// If relative join with the current working directory
			if(val[0] === "." && (val[1] === "/" ||
								 (val[1] === "." && val[2] === "/"))) {
				val = require("path").join(process.cwd(), val);
			}
			if(!val) return val;

			return "file:" + val;
		}
		return val;
	};

	var fileSetter = function(prop) {
		return {
			set: function(val) {
				this[prop] = envPath(val);
			}
		};
	};
		
	var setToSystem = function(prop){
		return {
			set: function(val){
				if(typeof val === "object" && typeof steal.System[prop] === "object") {
					this[prop] = extend(this[prop] || {},val || {});
				} else {
					this[prop] = val;
				}
			}
		};
	};
	
	var pluginPart = function(name) {
		var bang = name.lastIndexOf("!");
		if(bang !== -1) {
			return name.substr(bang+1);
		}
	};
	
	var addProductionBundles = function(){
		if(this.env === "production" && this.main) {
			var main = this.main,
				bundlesDir = this.bundlesName || "bundles/",
				mainBundleName = bundlesDir+main;
				
			setIfNotPresent(this.meta, mainBundleName, {format:"amd"});
			
			// If the configMain has a plugin like package.json!npm,
			// plugin has to be defined prior to importing.
			var plugin = pluginPart(System.configMain);
			var bundle = [main, System.configMain];
			if(plugin){
				System.set(plugin, System.newModule({}));
			}
			this.bundles[mainBundleName] = bundle;
		}
	};
	
	var isNode = typeof module !== 'undefined' && module.exports;
	var LESS_ENGINE = "less-2.4.0";
	
	setterConfig(System,{
		env: {
			set: function(val){
				System.env =  val;
				addProductionBundles.call(this);
			}
		},
		baseUrl: fileSetter("baseURL"),
		baseURL: fileSetter("baseURL"),
		root: fileSetter("baseURL"),  //backwards comp
		config: configSetter,
		configPath: configSetter,
		startId: {
			set: function(val){
				mainSetter.set.call(this, normalize(val) );
			}
		},
		main: mainSetter,
		// this gets called with the __dirname steal is in
		stealPath: {
			set: function(dirname, cfg) {
				dirname = envPath(dirname);
				var parts = dirname.split("/");

				// steal keeps this around to make things easy no matter how you are using it.
				setIfNotPresent(this.paths,"@dev", dirname+"/ext/dev.js");
				setIfNotPresent(this.paths,"$css", dirname+"/ext/css.js");
				setIfNotPresent(this.paths,"$less", dirname+"/ext/less.js");
				setIfNotPresent(this.paths,"npm", dirname+"/ext/npm.js");
				setIfNotPresent(this.paths,"npm-extension", dirname+"/ext/npm-extension.js");
				setIfNotPresent(this.paths,"npm-utils", dirname+"/ext/npm-utils.js");
				setIfNotPresent(this.paths,"npm-crawl", dirname+"/ext/npm-crawl.js");
				setIfNotPresent(this.paths,"semver", dirname+"/ext/semver.js");
				setIfNotPresent(this.paths,"bower", dirname+"/ext/bower.js");
				this.paths["traceur"] = dirname+"/ext/traceur.js";
				this.paths["traceur-runtime"] = dirname+"/ext/traceur-runtime.js";
				this.paths["babel"] = dirname+"/ext/babel.js";
				this.paths["babel-runtime"] = dirname+"/ext/babel-runtime.js";
				
				if(isNode) {
					System.register("less",[], false, function(){
						var r = require;
						return r('less');
					});
				} else {
					setIfNotPresent(this.paths,"less",  dirname+"/ext/"+LESS_ENGINE+".js");
					
					// make sure we don't set baseURL if something else is going to set it
					if(!cfg.root && !cfg.baseUrl && !cfg.baseURL && !cfg.config && !cfg.configPath) {
						if ( last(parts) === "steal" ) {
							parts.pop();
							if ( last(parts) === "bower_components" ) {
								System.configMain = "bower.json!bower";
								addProductionBundles.call(this);
								parts.pop();
							}
							if (last(parts) === "node_modules") {
								System.configMain = "package.json!npm";
								addProductionBundles.call(this);
								parts.pop();
							}
						}
						this.config({ baseURL: parts.join("/")+"/"});
					}
				}
			}
		},
		// System.config does not like being passed arrays.
		bundle: {
			set: function(val){
				System.bundle = val;
			}
		},
		bundlesPath: {
			set: function(val){
				this.paths[cssBundlesNameGlob] = val+"/*css";
				this.paths[jsBundlesNameGlob]  = val+"/*.js";
				return val;
			}
		},
		instantiated: {
			set: function(val){
				var loader = this;
				
				each(val || {}, function(value, name){
					loader.set(name,  loader.newModule(value));
				});
			}
		}
	});
	
	steal.config = function(cfg){
		if(typeof cfg === "string") {
			return System[cfg];
		} else {
			System.config(cfg);
		}
	};
	

	var getScriptOptions = function () {

		var options = {},
			parts, src, query, startFile, env,
			scripts = document.getElementsByTagName("script");

		var script = scripts[scripts.length - 1];

		if (script) {

			// Split on question mark to get query
			parts = script.src.split("?");
			src = parts.shift();
			query = parts.join("?");

			// Split on comma to get startFile and env
			parts = query.split(",");

			if (src.indexOf("steal.production") > -1) {
				options.env = "production";
			}

			if (parts[0]) {
				options.startId = parts[0];
			}
			// Grab env
			if (parts[1]) {
				options.env = parts[1];
			}

			// Split on / to get rootUrl
			parts = src.split("/");
			var lastPart = parts.pop();
			
			options.stealPath = parts.join("/");

			each(script.attributes, function(attr){
				var optionName = 
					camelize( attr.nodeName.indexOf("data-") === 0 ?
						attr.nodeName.replace("data-","") :
						attr.nodeName );
				options[optionName] = (attr.value === "") ? true : attr.value;
			});
			
			var source = script.innerHTML.substr(1);
			if(/\S/.test(source)){
				options.mainSource = source;
			}
		}

		return options;
	};

	steal.startup = function(config){

		// Get options from the script tag
		if(global.document) {
			var urlOptions = getScriptOptions();
		} else {
			// or the only option is where steal is.
			var urlOptions = {
				stealPath: __dirname
			};
		}

		// B: DO THINGS WITH OPTIONS
		// CALCULATE CURRENT LOCATION OF THINGS ...
		System.config(urlOptions);
		
		if(config){
			System.config(config);
		}

		// Read the env now because we can't overwrite everything yet

		// immediate steals we do
		var steals = [];

		// we only load things with force = true
		if ( System.env == "production" ) {

			configDeferred = System["import"](System.configMain);

			appDeferred = configDeferred.then(function(cfg){
				return System.main ? System["import"](System.main) : cfg;
			})["catch"](function(e){
				console.log(e);
			});

		} else if(System.env == "development" || System.env == "build"){

			configDeferred = System["import"](System.configMain);

			devDeferred = configDeferred.then(function(){
				// If a configuration was passed to startup we'll use that to overwrite
				// what was loaded in stealconfig.js
				// This means we call it twice, but that's ok
				if(config) {
					System.config(config);
				}

				return System["import"]("@dev");
			},function(e){
				console.log("steal - error loading @config.",e);
				return steal.System["import"]("@dev");
			});

			appDeferred = devDeferred.then(function(){
				// if there's a main, get it, otherwise, we are just loading
				// the config.
				if(!System.main || System.env === "build") {
					return configDeferred;
				}
				var main = System.main;
				if(typeof main === "string") {
					main = [main];
				}
				return Promise.all( map(main,function(main){
					return System["import"](main);
				}) );
			}).then(null, function(error){
				console.log("error",error,  error.stack);
				throw error;
			});
			
		}
		
		if(System.mainSource) {
			appDeferred = appDeferred.then(function(){
				System.module(System.mainSource);
			});
		}
		return appDeferred;
	};
	steal.done = function(){
		return appDeferred;
	};
	return steal;


};
/*
  SystemJS Steal Format
  Provides the Steal module format definition.
*/
function addSteal(loader) {

  // Steal Module Format Detection RegEx
  // steal(module, ...)
  var stealRegEx = /(?:^\s*|[}{\(\);,\n\?\&]\s*)steal\s*\(\s*((?:"[^"]+"\s*,|'[^']+'\s*,\s*)*)/;

  // What we stole.
  var stealInstantiateResult;
  
  function createSteal(loader) {
    stealInstantiateResult = null;

    // ensure no NodeJS environment detection
    loader.global.module = undefined;
    loader.global.exports = undefined;

    function steal() {
      var deps = [];
      var factory;
      
      for( var i = 0; i < arguments.length; i++ ) {
        if (typeof arguments[i] === 'string') {
          deps.push( normalize(arguments[i]) );
        } else {
          factory = arguments[i];
        }
      }

      if (typeof factory !== 'function') {
        factory = (function(factory) {
          return function() { return factory; };
        })(factory);
      }

      stealInstantiateResult = {
        deps: deps,
        execute: function(require, exports, moduleName) {

          var depValues = [];
          for (var i = 0; i < deps.length; i++) {
            depValues.push(require(deps[i]));
          }

          var output = factory.apply(loader.global, depValues);

          if (typeof output !== 'undefined') {
            return output;
          }
        }
      };
    }

    loader.global.steal = steal;
  }

  var loaderInstantiate = loader.instantiate;
  loader.instantiate = function(load) {
    var loader = this;

    if (load.metadata.format === 'steal' || !load.metadata.format && load.source.match(stealRegEx)) {
      load.metadata.format = 'steal';

      var oldSteal = loader.global.steal;

      createSteal(loader);

      loader.__exec(load);

      loader.global.steal = oldSteal;

      if (!stealInstantiateResult) {
        throw "Steal module " + load.name + " did not call steal";
      }

      if (stealInstantiateResult) {
        load.metadata.deps = load.metadata.deps ? load.metadata.deps.concat(stealInstantiateResult.deps) : stealInstantiateResult.deps;
        load.metadata.execute = stealInstantiateResult.execute;
      }
    }
    return loaderInstantiate.call(loader, load);
  };

  return loader;
}

if (typeof System !== "undefined") {
  addSteal(System);
}

	if (typeof window != 'undefined') {
		var oldSteal = window.steal;
		window.steal = makeSteal(System);
		window.steal.startup(oldSteal && typeof oldSteal == 'object' && oldSteal  );
		window.steal.addSteal = addSteal;
		
		// I think production needs this
		// global.define = System.amdDefine;
		
	} else {
    	
		require('systemjs');
			
		global.steal = makeSteal(System);
		global.steal.System = System;
		global.steal.dev = require("./ext/dev.js");
		steal.clone = makeSteal;
		module.exports = global.steal;
		global.steal.addSteal = addSteal;
		require("system-json");
	}
    
})(typeof window == "undefined" ? global : window);

/*[add-define]*/
window.define = System.amdDefine;
/*[system-bundles-config]*/
System.paths["bundles/*.css"] ="../../../../../../../../minervas-box/*css";
System.paths["bundles/*"] = "../../../../../../../../minervas-box/*.js";
System.bundles = {"bundles/src/index.css!":["src/index.less!$less","pages/cities/cities.less!$less"]};
/*npm-utils*/
define('npm-utils', function (require, exports, module) {
    var npmModuleRegEx = /.+@.+\..+\..+#.+/;
    var utils = {
            extend: function (d, s) {
                for (var prop in s) {
                    d[prop] = s[prop];
                }
                return d;
            },
            map: function (arr, fn) {
                var i = 0, len = arr.length, out = [];
                for (; i < len; i++) {
                    out.push(fn.call(arr, arr[i]));
                }
                return out;
            },
            filter: function (arr, fn) {
                var i = 0, len = arr.length, out = [], res;
                for (; i < len; i++) {
                    res = fn.call(arr, arr[i]);
                    if (res) {
                        out.push(res);
                    }
                }
                return out;
            },
            forEach: function (arr, fn) {
                var i = 0, len = arr.length;
                for (; i < len; i++) {
                    fn.call(arr, arr[i], i);
                }
            },
            moduleName: {
                create: function (descriptor, standard) {
                    if (standard) {
                        return descriptor.moduleName;
                    } else {
                        if (descriptor === '@empty') {
                            return descriptor;
                        }
                        var modulePath;
                        if (descriptor.modulePath) {
                            modulePath = descriptor.modulePath.substr(0, 2) === './' ? descriptor.modulePath.substr(2) : descriptor.modulePath;
                        }
                        return descriptor.packageName + (descriptor.version ? '@' + descriptor.version : '') + (modulePath ? '#' + modulePath : '') + (descriptor.plugin ? descriptor.plugin : '');
                    }
                },
                isNpm: function (moduleName) {
                    return npmModuleRegEx.test(moduleName);
                },
                parse: function (moduleName, currentPackageName) {
                    var pluginParts = moduleName.split('!');
                    var modulePathParts = pluginParts[0].split('#');
                    var versionParts = modulePathParts[0].split('@');
                    if (!modulePathParts[1] && !versionParts[0]) {
                        versionParts = ['@' + versionParts[1]];
                    }
                    var packageName, modulePath;
                    if (currentPackageName && utils.path.isRelative(moduleName)) {
                        packageName = currentPackageName;
                        modulePath = versionParts[0];
                    } else {
                        if (modulePathParts[1]) {
                            packageName = versionParts[0];
                            modulePath = modulePathParts[1];
                        } else {
                            var folderParts = versionParts[0].split('/');
                            packageName = folderParts.shift();
                            modulePath = folderParts.join('/');
                        }
                    }
                    return {
                        plugin: pluginParts.length === 2 ? '!' + pluginParts[1] : undefined,
                        version: versionParts[1],
                        modulePath: modulePath,
                        packageName: packageName,
                        moduleName: moduleName
                    };
                },
                parseFromPackage: function (loader, refPkg, name, parentName) {
                    var packageName = utils.pkg.name(refPkg), parsedModuleName = utils.moduleName.parse(name, packageName);
                    if (utils.path.isRelative(parsedModuleName.modulePath)) {
                        var parentParsed = utils.moduleName.parse(parentName, packageName);
                        if (parentParsed.packageName === parsedModuleName.packageName && parentParsed.modulePath) {
                            parsedModuleName.modulePath = utils.path.makeRelative(utils.path.joinURIs(parentParsed.modulePath, parsedModuleName.modulePath));
                        }
                    }
                    var mapName = utils.moduleName.create(parsedModuleName), mappedName;
                    if (refPkg.browser && typeof refPkg.browser !== 'string' && mapName in refPkg.browser && (!refPkg.system || !refPkg.system.ignoreBrowser)) {
                        mappedName = refPkg.browser[mapName] === false ? '@empty' : refPkg.browser[mapName];
                    }
                    var global = loader && loader.globalBrowser && loader.globalBrowser[mapName];
                    if (global) {
                        mappedName = global.moduleName === false ? '@empty' : global.moduleName;
                    }
                    if (mappedName) {
                        return utils.moduleName.parse(mappedName, packageName);
                    } else {
                        return parsedModuleName;
                    }
                }
            },
            pkg: {
                name: function (pkg) {
                    return pkg.system && pkg.system.name || pkg.name;
                },
                main: function (pkg) {
                    return utils.path.removeJS(pkg.system && pkg.system.main || typeof pkg.browser === 'string' && pkg.browser || pkg.main || 'index');
                },
                rootDir: function (pkg, isRoot) {
                    var root = isRoot ? utils.path.removePackage(pkg.fileUrl) : utils.path.pkgDir(pkg.fileUrl);
                    var lib = pkg.system && pkg.system.directories && pkg.system.directories.lib;
                    if (lib) {
                        root = utils.path.joinURIs(utils.path.addEndingSlash(root), lib);
                    }
                    return root;
                },
                findByModuleNameOrAddress: function (loader, moduleName, moduleAddress) {
                    if (loader.npm) {
                        if (moduleName) {
                            var parsed = utils.moduleName.parse(moduleName);
                            if (parsed.version && parsed.packageName) {
                                var name = parsed.packageName + '@' + parsed.version;
                                if (name in loader.npm) {
                                    return loader.npm[name];
                                }
                            }
                        }
                        if (moduleAddress) {
                            var packageFolder = utils.pkg.folderAddress(moduleAddress);
                            return packageFolder ? loader.npmPaths[packageFolder] : loader.npmPaths.__default;
                        } else {
                            return loader.npmPaths.__default;
                        }
                    }
                },
                folderAddress: function (address) {
                    var nodeModules = '/node_modules/', nodeModulesIndex = address.lastIndexOf(nodeModules), nextSlash = address.indexOf('/', nodeModulesIndex + nodeModules.length);
                    if (nodeModulesIndex >= 0) {
                        return nextSlash >= 0 ? address.substr(0, nextSlash) : address;
                    }
                },
                findDep: function (loader, refPackage, name) {
                    if (loader.npm && refPackage && !utils.path.startsWithDotSlash(name)) {
                        var curPackage = utils.path.depPackageDir(refPackage.fileUrl, name);
                        while (curPackage) {
                            var pkg = loader.npmPaths[curPackage];
                            if (pkg) {
                                return pkg;
                            }
                            var parentAddress = utils.path.parentNodeModuleAddress(curPackage);
                            if (!parentAddress) {
                                return;
                            }
                            curPackage = parentAddress + '/' + name;
                        }
                    }
                },
                findByName: function (loader, name) {
                    if (loader.npm && !utils.path.startsWithDotSlash(name)) {
                        return loader.npm[name];
                    }
                },
                hasDirectoriesLib: function (pkg) {
                    var system = pkg.system;
                    return system && system.directories && !!system.directories.lib;
                }
            },
            path: {
                makeRelative: function (path) {
                    if (utils.path.isRelative(path) && path.substr(0, 1) !== '/') {
                        return path;
                    } else {
                        return './' + path;
                    }
                },
                removeJS: function (path) {
                    return path.replace(/\.js(!|$)/, function (whole, part) {
                        return part;
                    });
                },
                removePackage: function (path) {
                    return path.replace(/\/package\.json.*/, '');
                },
                addJS: function (path) {
                    if (/\.js(on)?$/.test(path)) {
                        return path;
                    } else {
                        return path + '.js';
                    }
                },
                isRelative: function (path) {
                    return path.substr(0, 1) === '.';
                },
                joinURIs: function (base, href) {
                    function removeDotSegments(input) {
                        var output = [];
                        input.replace(/^(\.\.?(\/|$))+/, '').replace(/\/(\.(\/|$))+/g, '/').replace(/\/\.\.$/, '/../').replace(/\/?[^\/]*/g, function (p) {
                            if (p === '/..') {
                                output.pop();
                            } else {
                                output.push(p);
                            }
                        });
                        return output.join('').replace(/^\//, input.charAt(0) === '/' ? '/' : '');
                    }
                    href = parseURI(href || '');
                    base = parseURI(base || '');
                    return !href || !base ? null : (href.protocol || base.protocol) + (href.protocol || href.authority ? href.authority : base.authority) + removeDotSegments(href.protocol || href.authority || href.pathname.charAt(0) === '/' ? href.pathname : href.pathname ? (base.authority && !base.pathname ? '/' : '') + base.pathname.slice(0, base.pathname.lastIndexOf('/') + 1) + href.pathname : base.pathname) + (href.protocol || href.authority || href.pathname ? href.search : href.search || base.search) + href.hash;
                },
                startsWithDotSlash: function (path) {
                    return path.substr(0, 2) === './';
                },
                endsWithSlash: function (path) {
                    return path[path.length - 1] === '/';
                },
                addEndingSlash: function (path) {
                    return utils.path.endsWithSlash(path) ? path : path + '/';
                },
                depPackage: function (parentPackageAddress, childName) {
                    var packageFolderName = parentPackageAddress.replace(/\/package\.json.*/, '');
                    return (packageFolderName ? packageFolderName + '/' : '') + 'node_modules/' + childName + '/package.json';
                },
                depPackageDir: function (parentPackageAddress, childName) {
                    return utils.path.depPackage(parentPackageAddress, childName).replace(/\/package\.json.*/, '');
                },
                parentNodeModuleAddress: function (address) {
                    var nodeModules = '/node_modules/', nodeModulesIndex = address.lastIndexOf(nodeModules), prevModulesIndex = address.lastIndexOf(nodeModules, nodeModulesIndex - 1);
                    if (prevModulesIndex >= 0) {
                        return address.substr(0, prevModulesIndex + nodeModules.length - 1);
                    }
                },
                pkgDir: function (address) {
                    var nodeModules = '/node_modules/', nodeModulesIndex = address.lastIndexOf(nodeModules), nextSlash = address.indexOf('/', nodeModulesIndex + nodeModules.length);
                    if (nodeModulesIndex >= 0) {
                        return nextSlash >= 0 ? address.substr(0, nextSlash) : address;
                    }
                }
            },
            includeInBuild: true
        };
    function parseURI(url) {
        var m = String(url).replace(/^\s+|\s+$/g, '').match(/^([^:\/?#]+:)?(\/\/(?:[^:@]*(?::[^:@]*)?@)?(([^:\/?#]*)(?::(\d*))?))?([^?#]*)(\?[^#]*)?(#[\s\S]*)?/);
        return m ? {
            href: m[0] || '',
            protocol: m[1] || '',
            authority: m[2] || '',
            host: m[3] || '',
            hostname: m[4] || '',
            port: m[5] || '',
            pathname: m[6] || '',
            search: m[7] || '',
            hash: m[8] || ''
        } : null;
    }
    module.exports = utils;
});
/*npm-extension*/
define('npm-extension', function (require, exports, module) {
    'format cjs';
    var utils = require('./npm-utils');
    exports.includeInBuild = true;
    exports.addExtension = function (System) {
        var oldNormalize = System.normalize;
        System.normalize = function (name, parentName, parentAddress) {
            if (parentName && utils.path.isRelative(name) && !utils.moduleName.isNpm(parentName)) {
                return oldNormalize.call(this, name, parentName, parentAddress);
            }
            var refPkg = utils.pkg.findByModuleNameOrAddress(this, parentName, parentAddress);
            if (!refPkg) {
                return oldNormalize.call(this, name, parentName, parentAddress);
            }
            var parsedModuleName = utils.moduleName.parseFromPackage(this, refPkg, name, parentName);
            var depPkg = utils.pkg.findDep(this, refPkg, parsedModuleName.packageName);
            if (!depPkg) {
                depPkg = utils.pkg.findByName(this, parsedModuleName.packageName);
            }
            if (!depPkg) {
                var browserPackageName = this.globalBrowser[parsedModuleName.packageName];
                if (browserPackageName) {
                    parsedModuleName.packageName = browserPackageName;
                    depPkg = utils.pkg.findByName(this, parsedModuleName.packageName);
                }
            }
            if (!depPkg && refPkg === this.npmPaths.__default && name === refPkg.main && utils.pkg.hasDirectoriesLib(refPkg)) {
                parsedModuleName.version = refPkg.version;
                parsedModuleName.packageName = refPkg.name;
                parsedModuleName.modulePath = utils.pkg.main(refPkg);
                return oldNormalize.call(this, utils.moduleName.create(parsedModuleName), parentName, parentAddress);
            }
            if (depPkg) {
                parsedModuleName.version = depPkg.version;
                if (!parsedModuleName.modulePath) {
                    parsedModuleName.modulePath = utils.pkg.main(depPkg);
                }
                var moduleName = utils.moduleName.create(parsedModuleName);
                if (refPkg.system && refPkg.system.map && typeof refPkg.system.map[moduleName] === 'string') {
                    moduleName = refPkg.system.map[moduleName];
                }
                return oldNormalize.call(this, moduleName, parentName, parentAddress);
            } else {
                if (depPkg === this.npmPaths.__default) {
                    var localName = parsedModuleName.modulePath ? parsedModuleName.modulePath + (parsedModuleName.plugin ? parsedModuleName.plugin : '') : utils.pkg.main(depPkg);
                    return oldNormalize.call(this, localName, parentName, parentAddress);
                }
                if (refPkg.browser && refPkg.browser[name]) {
                    return oldNormalize.call(this, refPkg.browser[name], parentName, parentAddress);
                }
                return oldNormalize.call(this, name, parentName, parentAddress);
            }
        };
        var oldLocate = System.locate;
        System.locate = function (load) {
            var parsedModuleName = utils.moduleName.parse(load.name), loader = this;
            if (parsedModuleName.version && this.npm && !loader.paths[load.name]) {
                var pkg = this.npm[parsedModuleName.packageName];
                if (pkg) {
                    return oldLocate.call(this, load).then(function (address) {
                        var root = utils.pkg.rootDir(pkg, pkg === loader.npmPaths.__default);
                        if (parsedModuleName.modulePath) {
                            return utils.path.joinURIs(utils.path.addEndingSlash(root), parsedModuleName.plugin ? parsedModuleName.modulePath : utils.path.addJS(parsedModuleName.modulePath));
                        }
                        return address;
                    });
                }
            }
            return oldLocate.call(this, load);
        };
        var convertName = function (loader, name) {
            var pkg = utils.pkg.findByName(loader, name.split('/')[0]);
            if (pkg) {
                var parsed = utils.moduleName.parse(name, pkg.name);
                parsed.version = pkg.version;
                if (!parsed.modulePath) {
                    parsed.modulePath = utils.pkg.main(pkg);
                }
                return utils.moduleName.create(parsed);
            }
            return name;
        };
        var configSpecial = {
                map: function (map) {
                    var newMap = {}, val;
                    for (var name in map) {
                        val = map[name];
                        newMap[convertName(this, name)] = typeof val === 'object' ? configSpecial.map(val) : convertName(this, val);
                    }
                    return newMap;
                },
                paths: function (paths) {
                    var newPaths = {};
                    for (var name in paths) {
                        newPaths[convertName(this, name)] = paths[name];
                    }
                    return newPaths;
                }
            };
        var oldConfig = System.config;
        System.config = function (cfg) {
            var loader = this;
            for (var name in cfg) {
                if (configSpecial[name]) {
                    cfg[name] = configSpecial[name].call(loader, cfg[name]);
                }
            }
            oldConfig.apply(loader, arguments);
        };
    };
});
/*bower*/
System.set('bower', System.newModule({}));
/*bower_components/jquery/bower.json!bower*/
define('bower_components/jquery/bower.json!bower', []);
/*bower.json!bower*/
define('bower.json!bower', [
    '@loader',
    'bower_components/jquery/bower.json!bower'
], function (loader) {
    loader.config({ 'paths': {} });
});
/*semver*/
System.set('semver', System.newModule({}));
/*npm-crawl*/
System.set('npm-crawl', System.newModule({}));
/*npm*/
System.set('npm', System.newModule({}));
/*package.json!npm*/
define('package.json!npm', [
    '@loader',
    'npm-extension',
    'bower.json!bower'
], function (loader, npmExtension) {
    npmExtension.addExtension(loader);
    if (!loader.main) {
        loader.main = 'src/index';
    }
    (function (loader, packages) {
        var g;
        if (typeof window !== 'undefined') {
            g = window;
        } else {
            g = global;
        }
        if (!g.process) {
            g.process = {
                cwd: function () {
                },
                env: { NODE_ENV: loader.env }
            };
        }
        if (!loader.npm) {
            loader.npm = {};
            loader.npmPaths = {};
            loader.globalBrowser = {};
        }
        loader.npmPaths.__default = packages[0];
        var lib = packages[0].system && packages[0].system.directories && packages[0].system.directories.lib;
        var setGlobalBrowser = function (globals, pkg) {
            for (var name in globals) {
                loader.globalBrowser[name] = {
                    pkg: pkg,
                    moduleName: globals[name]
                };
            }
        };
        var setInNpm = function (name, pkg) {
            if (!loader.npm[name]) {
                loader.npm[name] = pkg;
            }
            loader.npm[name + '@' + pkg.version] = pkg;
        };
        var forEach = function (arr, fn) {
            var i = 0, len = arr.length;
            for (; i < len; i++) {
                fn.call(arr, arr[i]);
            }
        };
        forEach(packages, function (pkg) {
            if (pkg.system) {
                var main = pkg.system.main;
                delete pkg.system.main;
                loader.config(pkg.system);
                pkg.system.main = main;
            }
            if (pkg.globalBrowser) {
                setGlobalBrowser(pkg.globalBrowser, pkg);
            }
            var systemName = pkg.system && pkg.system.name;
            if (systemName) {
                setInNpm(systemName, pkg);
            } else {
                setInNpm(pkg.name, pkg);
            }
            if (!loader.npm[pkg.name]) {
                loader.npm[pkg.name] = pkg;
            }
            loader.npm[pkg.name + '@' + pkg.version] = pkg;
            var pkgAddress = pkg.fileUrl.replace(/\/package\.json.*/, '');
            loader.npmPaths[pkgAddress] = pkg;
        });
    }(loader, [
        {
            'name': 'artProject',
            'version': '0.0.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/package.json',
            'main': 'dist/index.html',
            'system': {
                'main': 'src/index',
                'map': {
                    'can@2.2.4#can': 'can@2.2.4#can',
                    'can@2.2.4#map/define': 'can@2.2.4#map/define/',
                    'can@2.2.4#route/pushstate': 'can@2.2.4#route/pushstate/',
                    'can@2.2.4#util/fixture': 'can@2.2.4#util/fixture/',
                    'jquery/jquery': 'jquery',
                    'can@2.2.4#util/util': 'can@2.2.4#util/jquery/jquery'
                },
                'paths': {
                    'jquery': 'bower_components/jquery/dist/jquery.js',
                    'can@2.2.4#can': 'node_modules/can/can.js',
                    'can@2.2.4#*': 'node_modules/can/*.js',
                    'bootstrap@3.3.4#dist/js/npm': 'node_modules/bootstrap/dist/js/bootstrap.js',
                    'bootstrap@3.3.4#*': 'node_modules/bootstrap/js/*.js',
                    'components/*': 'src/components/*.js',
                    'models/*': 'src/models/*.js',
                    'pages/*': 'src/pages/*.js'
                },
                'npmIgnore': { 'documentjs': true },
                'meta': {
                    'jquery': {
                        'exports': 'jquery',
                        'format': 'amd'
                    },
                    'canjs': {
                        'exports': 'can',
                        'format': 'amd'
                    }
                },
                'configDependencies': ['bower.json!bower'],
                'transpiler': 'babel'
            },
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'bootstrap',
            'version': '3.3.4',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/bootstrap/package.json',
            'main': './dist/js/npm',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'can',
            'version': '2.2.4',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/can/package.json',
            'main': './can',
            'system': {
                'ignoreBrowser': true,
                'main': 'can',
                'map': {
                    'can@2.2.4#can': 'can@2.2.4#can',
                    'jquery@2.1.3#jquery': 'jquery@2.1.3#dist/jquery',
                    'steal-qunit/steal-qunit': 'steal-qunit'
                },
                'paths': {
                    'dojo/dojo': 'util/dojo/dojo-1.8.1.js',
                    'yui/yui': 'util/yui/yui-3.7.3.js',
                    'mootools/mootools': 'bower_components/mootools/dist/mootools-core.js',
                    'zepto/zepto': 'bower_components/zepto/zepto.js'
                },
                'meta': {
                    'jquery@2.1.3#dist/jquery': {
                        'format': 'global',
                        'exports': 'jQuery'
                    },
                    'dojo/dojo': { 'format': 'global' },
                    'yui/yui': {
                        'format': 'global',
                        'scriptEval': true
                    },
                    'mootools/mootools': {
                        'format': 'global',
                        'scriptEval': true
                    },
                    'zepto/zepto': {
                        'format': 'global',
                        'exports': 'Zepto'
                    }
                },
                'ext': {
                    'ejs': 'can/view/ejs/system',
                    'mustache': 'can/view/mustache/system',
                    'stache': 'can/view/stache/system'
                },
                'buildConfig': { 'map': { 'can@2.2.4#util/util': 'can@2.2.4#util/domless/domless' } },
                'npmIgnore': {
                    'grunt-docco2': true,
                    'testee': true,
                    'zombie': true,
                    'bitovi-tools': true,
                    'steal': true,
                    'bower': true,
                    'steal-tools': true,
                    'connect': true,
                    'grunt': true,
                    'grunt-cli': true,
                    'grunt-contrib-clean': true,
                    'grunt-contrib-connect': true,
                    'grunt-contrib-jshint': true,
                    'grunt-contrib-uglify': true,
                    'grunt-jsbeautifier': true,
                    'grunt-plato': true,
                    'grunt-release-steps': true,
                    'grunt-shell': true,
                    'grunt-simple-mocha': true,
                    'grunt-string-replace': true,
                    'rimraf': true,
                    'lodash': true,
                    'browserify': true,
                    'grunt-banner': true
                }
            },
            'globalBrowser': {},
            'browser': {
                'can#can': 'can#dist/cjs/can',
                'can#component/component': 'can#dist/cjs/component/component',
                'can#construct/construct': 'can#dist/cjs/construct/construct',
                'can#map/map': 'can#dist/cjs/map/map',
                'can#list/list': 'can#dist/cjs/list/list',
                'can#list/promise/promise': 'can#dist/cjs/list/promise/promise',
                'can#observe/observe': 'can#dist/cjs/observe/observe',
                'can#compute/compute': 'can#dist/cjs/compute/compute',
                'can#model/model': 'can#dist/cjs/model/model',
                'can#view/view': 'can#dist/cjs/view/view',
                'can#view/ejs/ejs': 'can#dist/cjs/view/ejs/ejs',
                'can#view/stache/stache': 'can#dist/cjs/view/stache/stache',
                'can#control/control': 'can#dist/cjs/control/control',
                'can#route/route': 'can#dist/cjs/route/route',
                'can#control/route/route': 'can#dist/cjs/control/route/route',
                'can#view/mustache/mustache': 'can#dist/cjs/view/mustache/mustache',
                'can#route/pushstate/pushstate': 'can#dist/cjs/route/pushstate/pushstate',
                'can#model/queue/queue': 'can#dist/cjs/model/queue/queue',
                'can#construct/super/super': 'can#dist/cjs/construct/super/super',
                'can#construct/proxy/proxy': 'can#dist/cjs/construct/proxy/proxy',
                'can#map/lazy/lazy': 'can#dist/cjs/map/lazy/lazy',
                'can#map/delegate/delegate': 'can#dist/cjs/map/delegate/delegate',
                'can#map/setter/setter': 'can#dist/cjs/map/setter/setter',
                'can#map/attributes/attributes': 'can#dist/cjs/map/attributes/attributes',
                'can#map/validations/validations': 'can#dist/cjs/map/validations/validations',
                'can#map/backup/backup': 'can#dist/cjs/map/backup/backup',
                'can#map/list/list': 'can#dist/cjs/map/list/list',
                'can#map/define/define': 'can#dist/cjs/map/define/define',
                'can#list/sort/sort': 'can#dist/cjs/list/sort/sort',
                'can#control/plugin/plugin': 'can#dist/cjs/control/plugin/plugin',
                'can#view/modifiers/modifiers': 'can#dist/cjs/view/modifiers/modifiers',
                'can#util/object/object': 'can#dist/cjs/util/object/object',
                'can#util/fixture/fixture': 'can#dist/cjs/util/fixture/fixture',
                'can#view/bindings/bindings': 'can#dist/cjs/view/bindings/bindings',
                'can#view/live/live': 'can#dist/cjs/view/live/live',
                'can#view/scope/scope': 'can#dist/cjs/view/scope/scope',
                'can#util/string/string': 'can#dist/cjs/util/string/string',
                'can#util/attr/attr': 'can#dist/cjs/util/attr/attr',
                'can#view/autorender/autorender': 'can#dist/cjs/view/autorender/autorender',
                'can#util/domless/domless': 'can#dist/cjs/util/domless/domless',
                'can#view/stache/system': 'can#dist/cjs/view/stache/system',
                'can#view/mustache/system': 'can#dist/cjs/view/mustache/system',
                'can#view/ejs/system': 'can#dist/cjs/view/ejs/system',
                'can#util/event': 'can#dist/cjs/util/event',
                'can#map/sort/sort': 'can#dist/cjs/map/sort/sort'
            }
        },
        {
            'name': 'babel',
            'version': '5.1.11',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/babel/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'browser-sync',
            'version': '2.6.4',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'del',
            'version': '1.1.1',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/del/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'gulp',
            'version': '3.8.11',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'gulp-jshint',
            'version': '1.10.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp-jshint/package.json',
            'main': './src/index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'gulp-rename',
            'version': '1.2.2',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp-rename/package.json',
            'main': './index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'gulp-replace',
            'version': '0.5.3',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp-replace/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'gulp-util',
            'version': '3.0.4',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp-util/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'jshint-stylish',
            'version': '1.0.1',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/jshint-stylish/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'require-dir',
            'version': '0.1.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/require-dir/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'jquery',
            'version': '2.1.3',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/jquery/package.json',
            'main': 'dist/jquery.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'chokidar',
            'version': '1.0.1',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/babel/node_modules/chokidar/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'babel-core',
            'version': '5.1.11',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/babel/node_modules/babel-core/package.json',
            'main': 'lib/babel/api/node.js',
            'globalBrowser': {},
            'browser': { 'babel-core#lib/babel/api/register/node.js': 'babel-core#lib/babel/api/register/browser.js' }
        },
        {
            'name': 'commander',
            'version': '2.8.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/babel/node_modules/commander/package.json',
            'main': 'index',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'fs-readdir-recursive',
            'version': '0.1.1',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/babel/node_modules/fs-readdir-recursive/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'output-file-sync',
            'version': '1.1.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/babel/node_modules/output-file-sync/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'lodash',
            'version': '3.7.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/babel/node_modules/lodash/package.json',
            'main': 'index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'convert-source-map',
            'version': '0.5.1',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/babel/node_modules/convert-source-map/package.json',
            'main': 'index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'source-map',
            'version': '0.4.2',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/babel/node_modules/source-map/package.json',
            'main': './lib/source-map.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'path-is-absolute',
            'version': '1.0.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/babel/node_modules/path-is-absolute/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'anymatch',
            'version': '1.2.1',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/anymatch/package.json',
            'main': 'index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'async-each-series',
            'version': '0.1.1',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/async-each-series/package.json',
            'main': 'index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'browser-sync-client',
            'version': '2.0.1',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/browser-sync-client/package.json',
            'main': 'index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'browser-sync-ui',
            'version': '0.5.7',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/browser-sync-ui/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'connect',
            'version': '3.3.5',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/connect/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'dev-ip',
            'version': '1.0.1',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/dev-ip/package.json',
            'main': 'lib/dev-ip',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'easy-extender',
            'version': '2.3.1',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/easy-extender/package.json',
            'main': 'index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'eazy-logger',
            'version': '2.1.2',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/eazy-logger/package.json',
            'main': 'index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'emitter-steward',
            'version': '0.0.1',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/emitter-steward/package.json',
            'main': 'index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'foxy',
            'version': '10.1.1',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/foxy/package.json',
            'main': 'index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'immutable',
            'version': '3.7.2',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/immutable/package.json',
            'main': 'dist/immutable.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'localtunnel',
            'version': '1.5.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/localtunnel/package.json',
            'main': './client.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'meow',
            'version': '3.1.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/meow/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'opn',
            'version': '1.0.1',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/opn/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'portscanner',
            'version': '1.0.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/portscanner/package.json',
            'main': './lib/portscanner.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'query-string',
            'version': '1.0.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/query-string/package.json',
            'main': 'query-string.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'resp-modifier',
            'version': '2.0.1',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/resp-modifier/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'serve-static',
            'version': '1.9.2',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/serve-static/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'serve-index',
            'version': '1.6.3',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/serve-index/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'socket.io',
            'version': '1.3.5',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/socket.io/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'ua-parser-js',
            'version': '0.7.6',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/ua-parser-js/package.json',
            'main': 'src/ua-parser.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'each-async',
            'version': '1.1.1',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/del/node_modules/each-async/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'globby',
            'version': '1.2.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/del/node_modules/globby/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'is-path-cwd',
            'version': '1.0.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/del/node_modules/is-path-cwd/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'object-assign',
            'version': '2.0.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/del/node_modules/object-assign/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'is-path-in-cwd',
            'version': '1.0.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/del/node_modules/is-path-in-cwd/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'rimraf',
            'version': '2.3.2',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/del/node_modules/rimraf/package.json',
            'main': 'rimraf.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'archy',
            'version': '1.0.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp/node_modules/archy/package.json',
            'main': 'index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'chalk',
            'version': '0.5.1',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp/node_modules/chalk/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'deprecated',
            'version': '0.0.1',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp/node_modules/deprecated/package.json',
            'main': './index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'interpret',
            'version': '0.3.10',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp/node_modules/interpret/package.json',
            'main': 'index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'minimist',
            'version': '1.1.1',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp/node_modules/minimist/package.json',
            'main': 'index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'liftoff',
            'version': '2.0.3',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp/node_modules/liftoff/package.json',
            'main': 'index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'pretty-hrtime',
            'version': '0.2.2',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp/node_modules/pretty-hrtime/package.json',
            'main': './index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'orchestrator',
            'version': '0.3.7',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp/node_modules/orchestrator/package.json',
            'main': './index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'semver',
            'version': '4.3.3',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp/node_modules/semver/package.json',
            'main': 'semver.js',
            'globalBrowser': {},
            'browser': 'semver.browser.js'
        },
        {
            'name': 'tildify',
            'version': '1.0.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp/node_modules/tildify/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'v8flags',
            'version': '2.0.5',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp/node_modules/v8flags/package.json',
            'main': 'index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'jshint',
            'version': '2.7.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp-jshint/node_modules/jshint/package.json',
            'main': './src/jshint.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'vinyl-fs',
            'version': '0.3.13',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp/node_modules/vinyl-fs/package.json',
            'main': './index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'minimatch',
            'version': '2.0.4',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp-jshint/node_modules/minimatch/package.json',
            'main': 'minimatch.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'rcloader',
            'version': '0.1.2',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp-jshint/node_modules/rcloader/package.json',
            'main': 'index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'through2',
            'version': '0.6.5',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp-jshint/node_modules/through2/package.json',
            'main': 'through2.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'istextorbinary',
            'version': '1.0.2',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp-replace/node_modules/istextorbinary/package.json',
            'main': './out/lib/istextorbinary.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'replacestream',
            'version': '2.0.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp-replace/node_modules/replacestream/package.json',
            'main': 'index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'through2',
            'version': '0.6.3',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp-replace/node_modules/through2/package.json',
            'main': 'through2.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'array-differ',
            'version': '1.0.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp-util/node_modules/array-differ/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'array-uniq',
            'version': '1.0.2',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp-util/node_modules/array-uniq/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'beeper',
            'version': '1.0.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp-util/node_modules/beeper/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'chalk',
            'version': '1.0.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp-util/node_modules/chalk/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'dateformat',
            'version': '1.0.11',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp-util/node_modules/dateformat/package.json',
            'main': 'lib/dateformat',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'lodash._reescape',
            'version': '3.0.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp-util/node_modules/lodash._reescape/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'lodash._reevaluate',
            'version': '3.0.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp-util/node_modules/lodash._reevaluate/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'lodash._reinterpolate',
            'version': '3.0.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp-util/node_modules/lodash._reinterpolate/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'lodash.template',
            'version': '3.5.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp-util/node_modules/lodash.template/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'multipipe',
            'version': '0.1.2',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp-util/node_modules/multipipe/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'replace-ext',
            'version': '0.0.1',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp-util/node_modules/replace-ext/package.json',
            'main': './index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'log-symbols',
            'version': '1.0.2',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/jshint-stylish/node_modules/log-symbols/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'vinyl',
            'version': '0.4.6',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp-util/node_modules/vinyl/package.json',
            'main': './index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'string-length',
            'version': '1.0.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/jshint-stylish/node_modules/string-length/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'text-table',
            'version': '0.2.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/jshint-stylish/node_modules/text-table/package.json',
            'main': 'index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'ast-types',
            'version': '0.7.6',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/babel/node_modules/babel-core/node_modules/ast-types/package.json',
            'main': 'main.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'convert-source-map',
            'version': '1.0.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/babel/node_modules/babel-core/node_modules/convert-source-map/package.json',
            'main': 'index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'core-js',
            'version': '0.8.4',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/babel/node_modules/babel-core/node_modules/core-js/package.json',
            'main': 'index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'debug',
            'version': '2.1.3',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/babel/node_modules/babel-core/node_modules/debug/package.json',
            'main': './node.js',
            'globalBrowser': {},
            'browser': './browser.js'
        },
        {
            'name': 'detect-indent',
            'version': '3.0.1',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/babel/node_modules/babel-core/node_modules/detect-indent/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'estraverse',
            'version': '3.1.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/babel/node_modules/babel-core/node_modules/estraverse/package.json',
            'main': 'estraverse.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'esutils',
            'version': '2.0.2',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/babel/node_modules/babel-core/node_modules/esutils/package.json',
            'main': 'lib/utils.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'globals',
            'version': '6.4.1',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/babel/node_modules/babel-core/node_modules/globals/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'is-integer',
            'version': '1.0.4',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/babel/node_modules/babel-core/node_modules/is-integer/package.json',
            'main': 'index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'line-numbers',
            'version': '0.2.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/babel/node_modules/babel-core/node_modules/line-numbers/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'js-tokens',
            'version': '1.0.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/babel/node_modules/babel-core/node_modules/js-tokens/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'private',
            'version': '0.1.6',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/babel/node_modules/babel-core/node_modules/private/package.json',
            'main': 'private.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'leven',
            'version': '1.0.1',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/babel/node_modules/babel-core/node_modules/leven/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'regenerator',
            'version': '0.8.22',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/babel/node_modules/babel-core/node_modules/regenerator/package.json',
            'main': 'main.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'regexpu',
            'version': '1.1.2',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/babel/node_modules/babel-core/node_modules/regexpu/package.json',
            'main': 'regexpu.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'repeating',
            'version': '1.1.2',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/babel/node_modules/babel-core/node_modules/repeating/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'shebang-regex',
            'version': '1.0.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/babel/node_modules/babel-core/node_modules/shebang-regex/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'slash',
            'version': '1.0.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/babel/node_modules/babel-core/node_modules/slash/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'source-map-support',
            'version': '0.2.10',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/babel/node_modules/babel-core/node_modules/source-map-support/package.json',
            'main': './source-map-support.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'strip-json-comments',
            'version': '1.0.2',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/babel/node_modules/babel-core/node_modules/strip-json-comments/package.json',
            'main': 'strip-json-comments',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'to-fast-properties',
            'version': '1.0.1',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/babel/node_modules/babel-core/node_modules/to-fast-properties/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'trim-right',
            'version': '1.0.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/babel/node_modules/babel-core/node_modules/trim-right/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'user-home',
            'version': '1.1.1',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/babel/node_modules/babel-core/node_modules/user-home/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'arrify',
            'version': '1.0.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/babel/node_modules/chokidar/node_modules/arrify/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'async-each',
            'version': '0.1.6',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/babel/node_modules/chokidar/node_modules/async-each/package.json',
            'main': 'index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'glob-parent',
            'version': '1.2.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/babel/node_modules/chokidar/node_modules/glob-parent/package.json',
            'main': 'index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'is-binary-path',
            'version': '1.0.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/babel/node_modules/chokidar/node_modules/is-binary-path/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'is-glob',
            'version': '1.1.3',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/babel/node_modules/chokidar/node_modules/is-glob/package.json',
            'main': 'index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'readdirp',
            'version': '1.3.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/babel/node_modules/chokidar/node_modules/readdirp/package.json',
            'main': 'readdirp.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'fsevents',
            'version': '0.3.5',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/babel/node_modules/chokidar/node_modules/fsevents/package.json',
            'main': 'fsevents.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'graceful-readlink',
            'version': '1.0.1',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/babel/node_modules/commander/node_modules/graceful-readlink/package.json',
            'main': 'index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'mkdirp',
            'version': '0.5.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/babel/node_modules/output-file-sync/node_modules/mkdirp/package.json',
            'main': './index',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'xtend',
            'version': '4.0.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/babel/node_modules/output-file-sync/node_modules/xtend/package.json',
            'main': 'immutable',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'amdefine',
            'version': '0.1.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/babel/node_modules/source-map/node_modules/amdefine/package.json',
            'main': './amdefine.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'micromatch',
            'version': '2.1.6',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/anymatch/node_modules/micromatch/package.json',
            'main': 'index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'angular',
            'version': '1.3.15',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/browser-sync-ui/node_modules/angular/package.json',
            'main': 'index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'angular-route',
            'version': '1.3.15',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/browser-sync-ui/node_modules/angular-route/package.json',
            'main': 'index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'angular-sanitize',
            'version': '1.3.15',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/browser-sync-ui/node_modules/angular-sanitize/package.json',
            'main': 'index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'angular-touch',
            'version': '1.3.15',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/browser-sync-ui/node_modules/angular-touch/package.json',
            'main': 'index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'connect-history-api-fallback',
            'version': '0.0.5',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/browser-sync-ui/node_modules/connect-history-api-fallback/package.json',
            'main': 'lib/index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'stream-throttle',
            'version': '0.1.3',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/browser-sync-ui/node_modules/stream-throttle/package.json',
            'main': './index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'weinre',
            'version': '2.0.0-pre-I0Z7U9OV',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/browser-sync-ui/node_modules/weinre/package.json',
            'main': './lib/weinre',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'finalhandler',
            'version': '0.3.4',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/connect/node_modules/finalhandler/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'parseurl',
            'version': '1.3.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/connect/node_modules/parseurl/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'utils-merge',
            'version': '1.0.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/connect/node_modules/utils-merge/package.json',
            'main': './index',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'lodash',
            'version': '2.4.1',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/easy-extender/node_modules/lodash/package.json',
            'main': 'dist/lodash.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'opt-merger',
            'version': '1.1.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/eazy-logger/node_modules/opt-merger/package.json',
            'main': 'index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'tfunk',
            'version': '3.0.1',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/eazy-logger/node_modules/tfunk/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'cookie',
            'version': '0.1.2',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/foxy/node_modules/cookie/package.json',
            'main': 'index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'http-proxy',
            'version': '1.10.1',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/foxy/node_modules/http-proxy/package.json',
            'main': 'index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'request',
            'version': '2.11.4',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/localtunnel/node_modules/request/package.json',
            'main': './main',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'optimist',
            'version': '0.3.4',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/localtunnel/node_modules/optimist/package.json',
            'main': './index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'debug',
            'version': '0.7.4',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/localtunnel/node_modules/debug/package.json',
            'main': 'lib/debug.js',
            'globalBrowser': {},
            'browser': './debug.js'
        },
        {
            'name': 'camelcase-keys',
            'version': '1.0.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/meow/node_modules/camelcase-keys/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'indent-string',
            'version': '1.2.1',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/meow/node_modules/indent-string/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'async',
            'version': '0.1.15',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/portscanner/node_modules/async/package.json',
            'main': './index',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'accepts',
            'version': '1.2.5',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/serve-index/node_modules/accepts/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'batch',
            'version': '0.5.2',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/serve-index/node_modules/batch/package.json',
            'main': 'index',
            'globalBrowser': {},
            'browser': { 'emitter': 'component-emitter' }
        },
        {
            'name': 'escape-html',
            'version': '1.0.1',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/serve-index/node_modules/escape-html/package.json',
            'main': 'index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'http-errors',
            'version': '1.3.1',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/serve-index/node_modules/http-errors/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'mime-types',
            'version': '2.0.10',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/serve-index/node_modules/mime-types/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'send',
            'version': '0.12.2',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/serve-static/node_modules/send/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'engine.io',
            'version': '1.5.1',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/socket.io/node_modules/engine.io/package.json',
            'main': './lib/engine.io',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'socket.io-parser',
            'version': '2.2.4',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/socket.io/node_modules/socket.io-parser/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'socket.io-client',
            'version': '1.3.5',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/socket.io/node_modules/socket.io-client/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'socket.io-adapter',
            'version': '0.3.1',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/socket.io/node_modules/socket.io-adapter/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'has-binary-data',
            'version': '0.1.3',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/socket.io/node_modules/has-binary-data/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'onetime',
            'version': '1.0.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/del/node_modules/each-async/node_modules/onetime/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'debug',
            'version': '2.1.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/socket.io/node_modules/debug/package.json',
            'main': './node.js',
            'globalBrowser': {},
            'browser': './browser.js'
        },
        {
            'name': 'set-immediate-shim',
            'version': '1.0.1',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/del/node_modules/each-async/node_modules/set-immediate-shim/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'array-union',
            'version': '1.0.1',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/del/node_modules/globby/node_modules/array-union/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'async',
            'version': '0.9.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/del/node_modules/globby/node_modules/async/package.json',
            'main': './lib/async',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'glob',
            'version': '4.5.3',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/del/node_modules/globby/node_modules/glob/package.json',
            'main': 'glob.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'is-path-inside',
            'version': '1.0.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/del/node_modules/is-path-in-cwd/node_modules/is-path-inside/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'ansi-styles',
            'version': '1.1.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp/node_modules/chalk/node_modules/ansi-styles/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'escape-string-regexp',
            'version': '1.0.3',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp/node_modules/chalk/node_modules/escape-string-regexp/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'has-ansi',
            'version': '0.1.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp/node_modules/chalk/node_modules/has-ansi/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'strip-ansi',
            'version': '0.3.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp/node_modules/chalk/node_modules/strip-ansi/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'supports-color',
            'version': '0.2.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp/node_modules/chalk/node_modules/supports-color/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'extend',
            'version': '2.0.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp/node_modules/liftoff/node_modules/extend/package.json',
            'main': 'index',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'findup-sync',
            'version': '0.2.1',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp/node_modules/liftoff/node_modules/findup-sync/package.json',
            'main': 'lib/findup-sync',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'flagged-respawn',
            'version': '0.3.1',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp/node_modules/liftoff/node_modules/flagged-respawn/package.json',
            'main': 'index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'resolve',
            'version': '1.1.6',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp/node_modules/liftoff/node_modules/resolve/package.json',
            'main': 'index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'end-of-stream',
            'version': '0.1.5',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp/node_modules/orchestrator/node_modules/end-of-stream/package.json',
            'main': 'index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'sequencify',
            'version': '0.0.7',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp/node_modules/orchestrator/node_modules/sequencify/package.json',
            'main': './index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'stream-consume',
            'version': '0.1.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp/node_modules/orchestrator/node_modules/stream-consume/package.json',
            'main': 'index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'defaults',
            'version': '1.0.2',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp/node_modules/vinyl-fs/node_modules/defaults/package.json',
            'main': 'index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'glob-stream',
            'version': '3.1.18',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp/node_modules/vinyl-fs/node_modules/glob-stream/package.json',
            'main': './index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'glob-watcher',
            'version': '0.0.6',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp/node_modules/vinyl-fs/node_modules/glob-watcher/package.json',
            'main': './index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'graceful-fs',
            'version': '3.0.6',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp/node_modules/vinyl-fs/node_modules/graceful-fs/package.json',
            'main': 'graceful-fs.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'strip-bom',
            'version': '1.0.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp/node_modules/vinyl-fs/node_modules/strip-bom/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'cli',
            'version': '0.6.6',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp-jshint/node_modules/jshint/node_modules/cli/package.json',
            'main': 'cli.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'console-browserify',
            'version': '1.1.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp-jshint/node_modules/jshint/node_modules/console-browserify/package.json',
            'main': 'index',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'exit',
            'version': '0.1.2',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp-jshint/node_modules/jshint/node_modules/exit/package.json',
            'main': 'lib/exit',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'htmlparser2',
            'version': '3.8.2',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp-jshint/node_modules/jshint/node_modules/htmlparser2/package.json',
            'main': 'lib/index.js',
            'globalBrowser': {},
            'browser': { 'readable-stream': '@empty' }
        },
        {
            'name': 'shelljs',
            'version': '0.3.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp-jshint/node_modules/jshint/node_modules/shelljs/package.json',
            'main': './shell.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'lodash',
            'version': '3.6.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp-jshint/node_modules/jshint/node_modules/lodash/package.json',
            'main': 'index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'brace-expansion',
            'version': '1.1.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp-jshint/node_modules/minimatch/node_modules/brace-expansion/package.json',
            'main': 'index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'rcfinder',
            'version': '0.1.8',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp-jshint/node_modules/rcloader/node_modules/rcfinder/package.json',
            'main': 'index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'readable-stream',
            'version': '1.0.33',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp-jshint/node_modules/through2/node_modules/readable-stream/package.json',
            'main': 'readable.js',
            'globalBrowser': {},
            'browser': { 'util': '@empty' }
        },
        {
            'name': 'textextensions',
            'version': '1.0.1',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp-replace/node_modules/istextorbinary/node_modules/textextensions/package.json',
            'main': './index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'binaryextensions',
            'version': '1.0.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp-replace/node_modules/istextorbinary/node_modules/binaryextensions/package.json',
            'main': './index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'through',
            'version': '2.3.7',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp-replace/node_modules/replacestream/node_modules/through/package.json',
            'main': 'index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'ansi-styles',
            'version': '2.0.1',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp-util/node_modules/chalk/node_modules/ansi-styles/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'has-ansi',
            'version': '1.0.3',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp-util/node_modules/chalk/node_modules/has-ansi/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'strip-ansi',
            'version': '2.0.1',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp-util/node_modules/chalk/node_modules/strip-ansi/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'supports-color',
            'version': '1.3.1',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp-util/node_modules/chalk/node_modules/supports-color/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'get-stdin',
            'version': '4.0.1',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp-util/node_modules/dateformat/node_modules/get-stdin/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'lodash._basecopy',
            'version': '3.0.1',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp-util/node_modules/lodash.template/node_modules/lodash._basecopy/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'lodash._basetostring',
            'version': '3.0.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp-util/node_modules/lodash.template/node_modules/lodash._basetostring/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'lodash._basevalues',
            'version': '3.0.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp-util/node_modules/lodash.template/node_modules/lodash._basevalues/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'lodash._isiterateecall',
            'version': '3.0.6',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp-util/node_modules/lodash.template/node_modules/lodash._isiterateecall/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'lodash.escape',
            'version': '3.0.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp-util/node_modules/lodash.template/node_modules/lodash.escape/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'lodash.isnative',
            'version': '3.0.2',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp-util/node_modules/lodash.template/node_modules/lodash.isnative/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'lodash.keys',
            'version': '3.0.6',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp-util/node_modules/lodash.template/node_modules/lodash.keys/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'lodash.restparam',
            'version': '3.6.1',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp-util/node_modules/lodash.template/node_modules/lodash.restparam/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'lodash.templatesettings',
            'version': '3.1.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp-util/node_modules/lodash.template/node_modules/lodash.templatesettings/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'duplexer2',
            'version': '0.0.2',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp-util/node_modules/multipipe/node_modules/duplexer2/package.json',
            'main': 'index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'clone',
            'version': '0.2.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp-util/node_modules/vinyl/node_modules/clone/package.json',
            'main': 'clone.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'clone-stats',
            'version': '0.0.1',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp-util/node_modules/vinyl/node_modules/clone-stats/package.json',
            'main': 'index.js',
            'globalBrowser': {},
            'browser': 'index.js'
        },
        {
            'name': 'ms',
            'version': '0.7.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/babel/node_modules/babel-core/node_modules/debug/node_modules/ms/package.json',
            'main': './index',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'is-finite',
            'version': '1.0.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/babel/node_modules/babel-core/node_modules/is-integer/node_modules/is-finite/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'is-nan',
            'version': '1.0.1',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/babel/node_modules/babel-core/node_modules/is-integer/node_modules/is-nan/package.json',
            'main': 'index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'left-pad',
            'version': '0.0.3',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/babel/node_modules/babel-core/node_modules/line-numbers/node_modules/left-pad/package.json',
            'main': 'index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'commoner',
            'version': '0.10.1',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/babel/node_modules/babel-core/node_modules/regenerator/node_modules/commoner/package.json',
            'main': 'main.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'esprima-fb',
            'version': '13001.1.0-dev-harmony-fb',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/babel/node_modules/babel-core/node_modules/regenerator/node_modules/esprima-fb/package.json',
            'main': 'esprima.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'recast',
            'version': '0.10.12',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/babel/node_modules/babel-core/node_modules/regenerator/node_modules/recast/package.json',
            'main': 'main.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'defs',
            'version': '1.1.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/babel/node_modules/babel-core/node_modules/regenerator/node_modules/defs/package.json',
            'main': 'build/es5/defs-main.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'regenerate',
            'version': '1.2.1',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/babel/node_modules/babel-core/node_modules/regexpu/node_modules/regenerate/package.json',
            'main': 'regenerate.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'regjsgen',
            'version': '0.2.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/babel/node_modules/babel-core/node_modules/regexpu/node_modules/regjsgen/package.json',
            'main': 'regjsgen.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'regjsparser',
            'version': '0.1.4',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/babel/node_modules/babel-core/node_modules/regexpu/node_modules/regjsparser/package.json',
            'main': './parser',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'source-map',
            'version': '0.1.32',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/babel/node_modules/babel-core/node_modules/source-map-support/node_modules/source-map/package.json',
            'main': './lib/source-map.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'binary-extensions',
            'version': '1.3.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/babel/node_modules/chokidar/node_modules/is-binary-path/node_modules/binary-extensions/package.json',
            'main': 'binary-extensions.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'graceful-fs',
            'version': '2.0.3',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/babel/node_modules/chokidar/node_modules/readdirp/node_modules/graceful-fs/package.json',
            'main': 'graceful-fs.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'minimatch',
            'version': '0.2.14',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/babel/node_modules/chokidar/node_modules/readdirp/node_modules/minimatch/package.json',
            'main': 'minimatch.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'nan',
            'version': '1.5.3',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/babel/node_modules/chokidar/node_modules/fsevents/node_modules/nan/package.json',
            'main': 'include_dirs.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'minimist',
            'version': '0.0.8',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/babel/node_modules/output-file-sync/node_modules/mkdirp/node_modules/minimist/package.json',
            'main': 'index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'arr-diff',
            'version': '1.0.1',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/anymatch/node_modules/micromatch/node_modules/arr-diff/package.json',
            'main': 'index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'braces',
            'version': '1.8.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/anymatch/node_modules/micromatch/node_modules/braces/package.json',
            'main': 'index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'expand-brackets',
            'version': '0.1.1',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/anymatch/node_modules/micromatch/node_modules/expand-brackets/package.json',
            'main': 'index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'filename-regex',
            'version': '2.0.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/anymatch/node_modules/micromatch/node_modules/filename-regex/package.json',
            'main': 'index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'kind-of',
            'version': '1.1.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/anymatch/node_modules/micromatch/node_modules/kind-of/package.json',
            'main': 'index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'object.omit',
            'version': '0.2.1',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/anymatch/node_modules/micromatch/node_modules/object.omit/package.json',
            'main': 'index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'parse-glob',
            'version': '3.0.1',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/anymatch/node_modules/micromatch/node_modules/parse-glob/package.json',
            'main': 'index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'regex-cache',
            'version': '0.4.2',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/anymatch/node_modules/micromatch/node_modules/regex-cache/package.json',
            'main': 'index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'limiter',
            'version': '1.0.5',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/browser-sync-ui/node_modules/stream-throttle/node_modules/limiter/package.json',
            'main': './index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'express',
            'version': '2.5.11',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/browser-sync-ui/node_modules/weinre/node_modules/express/package.json',
            'main': 'index',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'underscore',
            'version': '1.7.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/browser-sync-ui/node_modules/weinre/node_modules/underscore/package.json',
            'main': 'underscore.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'nopt',
            'version': '3.0.1',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/browser-sync-ui/node_modules/weinre/node_modules/nopt/package.json',
            'main': 'lib/nopt.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'on-finished',
            'version': '2.2.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/connect/node_modules/finalhandler/node_modules/on-finished/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'object-path',
            'version': '0.9.2',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/eazy-logger/node_modules/tfunk/node_modules/object-path/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'eventemitter3',
            'version': '0.1.6',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/foxy/node_modules/http-proxy/node_modules/eventemitter3/package.json',
            'main': 'index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'requires-port',
            'version': '0.0.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/foxy/node_modules/http-proxy/node_modules/requires-port/package.json',
            'main': 'index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'form-data',
            'version': '0.0.3',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/localtunnel/node_modules/request/node_modules/form-data/package.json',
            'main': './lib/form_data',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'mime',
            'version': '1.2.7',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/localtunnel/node_modules/request/node_modules/mime/package.json',
            'main': 'mime.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'wordwrap',
            'version': '0.0.2',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/localtunnel/node_modules/optimist/node_modules/wordwrap/package.json',
            'main': './index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'camelcase',
            'version': '1.0.2',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/meow/node_modules/camelcase-keys/node_modules/camelcase/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'map-obj',
            'version': '1.0.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/meow/node_modules/camelcase-keys/node_modules/map-obj/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'negotiator',
            'version': '0.5.1',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/serve-index/node_modules/accepts/node_modules/negotiator/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'inherits',
            'version': '2.0.1',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/serve-index/node_modules/http-errors/node_modules/inherits/package.json',
            'main': './inherits.js',
            'globalBrowser': {},
            'browser': './inherits_browser.js'
        },
        {
            'name': 'statuses',
            'version': '1.2.1',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/serve-index/node_modules/http-errors/node_modules/statuses/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'mime-db',
            'version': '1.8.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/serve-index/node_modules/mime-types/node_modules/mime-db/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'depd',
            'version': '1.0.1',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/serve-static/node_modules/send/node_modules/depd/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'destroy',
            'version': '1.0.3',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/serve-static/node_modules/send/node_modules/destroy/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'etag',
            'version': '1.5.1',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/serve-static/node_modules/send/node_modules/etag/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'fresh',
            'version': '0.2.4',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/serve-static/node_modules/send/node_modules/fresh/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'mime',
            'version': '1.3.4',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/serve-static/node_modules/send/node_modules/mime/package.json',
            'main': 'mime.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'range-parser',
            'version': '1.0.2',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/serve-static/node_modules/send/node_modules/range-parser/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'debug',
            'version': '1.0.3',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/socket.io/node_modules/engine.io/node_modules/debug/package.json',
            'main': './node.js',
            'globalBrowser': {},
            'browser': './browser.js'
        },
        {
            'name': 'ws',
            'version': '0.5.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/socket.io/node_modules/engine.io/node_modules/ws/package.json',
            'globalBrowser': {},
            'browser': './lib/browser.js'
        },
        {
            'name': 'engine.io-parser',
            'version': '1.2.1',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/socket.io/node_modules/engine.io/node_modules/engine.io-parser/package.json',
            'globalBrowser': {},
            'browser': './lib/browser.js'
        },
        {
            'name': 'base64id',
            'version': '0.1.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/socket.io/node_modules/engine.io/node_modules/base64id/package.json',
            'main': './lib/base64id.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'component-emitter',
            'version': '1.1.2',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/socket.io/node_modules/socket.io-parser/node_modules/component-emitter/package.json',
            'main': 'index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'json3',
            'version': '3.2.6',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/socket.io/node_modules/socket.io-parser/node_modules/json3/package.json',
            'main': './lib/json3',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'isarray',
            'version': '0.0.1',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/socket.io/node_modules/socket.io-parser/node_modules/isarray/package.json',
            'main': 'index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'benchmark',
            'version': '1.0.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/socket.io/node_modules/socket.io-parser/node_modules/benchmark/package.json',
            'main': 'benchmark',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'engine.io-client',
            'version': '1.5.1',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/socket.io/node_modules/socket.io-client/node_modules/engine.io-client/package.json',
            'globalBrowser': {},
            'browser': { 'xmlhttprequest': 'engine.io-client#lib/xmlhttprequest.js' }
        },
        {
            'name': 'object-component',
            'version': '0.0.3',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/socket.io/node_modules/socket.io-client/node_modules/object-component/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'component-bind',
            'version': '1.0.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/socket.io/node_modules/socket.io-client/node_modules/component-bind/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'has-binary',
            'version': '0.1.6',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/socket.io/node_modules/socket.io-client/node_modules/has-binary/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'indexof',
            'version': '0.0.1',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/socket.io/node_modules/socket.io-client/node_modules/indexof/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'parseuri',
            'version': '0.0.2',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/socket.io/node_modules/socket.io-client/node_modules/parseuri/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'to-array',
            'version': '0.1.3',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/socket.io/node_modules/socket.io-client/node_modules/to-array/package.json',
            'main': 'index',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'backo2',
            'version': '1.0.2',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/socket.io/node_modules/socket.io-client/node_modules/backo2/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'debug',
            'version': '1.0.2',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/socket.io/node_modules/socket.io-adapter/node_modules/debug/package.json',
            'main': './node.js',
            'globalBrowser': {},
            'browser': './browser.js'
        },
        {
            'name': 'socket.io-parser',
            'version': '2.2.2',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/socket.io/node_modules/socket.io-adapter/node_modules/socket.io-parser/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'object-keys',
            'version': '1.0.1',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/socket.io/node_modules/socket.io-adapter/node_modules/object-keys/package.json',
            'main': 'index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'ms',
            'version': '0.6.2',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/socket.io/node_modules/debug/node_modules/ms/package.json',
            'main': './index',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'inflight',
            'version': '1.0.4',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/del/node_modules/globby/node_modules/glob/node_modules/inflight/package.json',
            'main': 'inflight.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'once',
            'version': '1.3.1',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/del/node_modules/globby/node_modules/glob/node_modules/once/package.json',
            'main': 'once.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'path-is-inside',
            'version': '1.0.1',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/del/node_modules/is-path-in-cwd/node_modules/is-path-inside/node_modules/path-is-inside/package.json',
            'main': 'lib/path-is-inside.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'ansi-regex',
            'version': '0.2.1',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp/node_modules/chalk/node_modules/has-ansi/node_modules/ansi-regex/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'glob',
            'version': '4.3.5',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp/node_modules/liftoff/node_modules/findup-sync/node_modules/glob/package.json',
            'main': 'glob.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'clone',
            'version': '0.1.19',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp/node_modules/vinyl-fs/node_modules/defaults/node_modules/clone/package.json',
            'main': 'clone.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'ordered-read-streams',
            'version': '0.1.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp/node_modules/vinyl-fs/node_modules/glob-stream/node_modules/ordered-read-streams/package.json',
            'main': 'index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'glob2base',
            'version': '0.0.12',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp/node_modules/vinyl-fs/node_modules/glob-stream/node_modules/glob2base/package.json',
            'main': './index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'unique-stream',
            'version': '1.0.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp/node_modules/vinyl-fs/node_modules/glob-stream/node_modules/unique-stream/package.json',
            'main': 'index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'gaze',
            'version': '0.5.1',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp/node_modules/vinyl-fs/node_modules/glob-watcher/node_modules/gaze/package.json',
            'main': 'lib/gaze',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'first-chunk-stream',
            'version': '1.0.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp/node_modules/vinyl-fs/node_modules/strip-bom/node_modules/first-chunk-stream/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'is-utf8',
            'version': '0.2.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp/node_modules/vinyl-fs/node_modules/strip-bom/node_modules/is-utf8/package.json',
            'main': 'is-utf8.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'glob',
            'version': '3.2.11',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp-jshint/node_modules/jshint/node_modules/cli/node_modules/glob/package.json',
            'main': 'glob.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'date-now',
            'version': '0.1.4',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp-jshint/node_modules/jshint/node_modules/console-browserify/node_modules/date-now/package.json',
            'main': 'index',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'domhandler',
            'version': '2.3.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp-jshint/node_modules/jshint/node_modules/htmlparser2/node_modules/domhandler/package.json',
            'main': 'index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'domutils',
            'version': '1.5.1',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp-jshint/node_modules/jshint/node_modules/htmlparser2/node_modules/domutils/package.json',
            'main': 'index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'readable-stream',
            'version': '1.1.13',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp-jshint/node_modules/jshint/node_modules/htmlparser2/node_modules/readable-stream/package.json',
            'main': 'readable.js',
            'globalBrowser': {},
            'browser': { 'util': '@empty' }
        },
        {
            'name': 'domelementtype',
            'version': '1.3.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp-jshint/node_modules/jshint/node_modules/htmlparser2/node_modules/domelementtype/package.json',
            'main': 'index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'entities',
            'version': '1.0.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp-jshint/node_modules/jshint/node_modules/htmlparser2/node_modules/entities/package.json',
            'main': './index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'balanced-match',
            'version': '0.2.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp-jshint/node_modules/minimatch/node_modules/brace-expansion/node_modules/balanced-match/package.json',
            'main': 'index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'concat-map',
            'version': '0.0.1',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp-jshint/node_modules/minimatch/node_modules/brace-expansion/node_modules/concat-map/package.json',
            'main': 'index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'core-util-is',
            'version': '1.0.1',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp-jshint/node_modules/through2/node_modules/readable-stream/node_modules/core-util-is/package.json',
            'main': 'lib/util.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'string_decoder',
            'version': '0.10.31',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp-jshint/node_modules/through2/node_modules/readable-stream/node_modules/string_decoder/package.json',
            'main': 'index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'ansi-regex',
            'version': '1.1.1',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp-util/node_modules/chalk/node_modules/has-ansi/node_modules/ansi-regex/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'lodash.isarguments',
            'version': '3.0.1',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp-util/node_modules/lodash.template/node_modules/lodash.keys/node_modules/lodash.isarguments/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'lodash.isarray',
            'version': '3.0.2',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp-util/node_modules/lodash.template/node_modules/lodash.keys/node_modules/lodash.isarray/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'q',
            'version': '1.1.2',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/babel/node_modules/babel-core/node_modules/regenerator/node_modules/commoner/node_modules/q/package.json',
            'main': 'q.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'recast',
            'version': '0.9.18',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/babel/node_modules/babel-core/node_modules/regenerator/node_modules/commoner/node_modules/recast/package.json',
            'main': 'main.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'commander',
            'version': '2.5.1',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/babel/node_modules/babel-core/node_modules/regenerator/node_modules/commoner/node_modules/commander/package.json',
            'main': 'index',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'glob',
            'version': '4.2.2',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/babel/node_modules/babel-core/node_modules/regenerator/node_modules/commoner/node_modules/glob/package.json',
            'main': 'glob.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'install',
            'version': '0.1.8',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/babel/node_modules/babel-core/node_modules/regenerator/node_modules/commoner/node_modules/install/package.json',
            'main': 'main.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'iconv-lite',
            'version': '0.4.8',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/babel/node_modules/babel-core/node_modules/regenerator/node_modules/commoner/node_modules/iconv-lite/package.json',
            'main': './lib/index.js',
            'globalBrowser': {},
            'browser': {
                'iconv-lite#extend-node': '@empty',
                'iconv-lite#streams': '@empty'
            }
        },
        {
            'name': 'esprima-fb',
            'version': '14001.1.0-dev-harmony-fb',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/babel/node_modules/babel-core/node_modules/regenerator/node_modules/recast/node_modules/esprima-fb/package.json',
            'main': 'esprima.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'alter',
            'version': '0.2.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/babel/node_modules/babel-core/node_modules/regenerator/node_modules/defs/node_modules/alter/package.json',
            'main': 'alter.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'ast-traverse',
            'version': '0.1.1',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/babel/node_modules/babel-core/node_modules/regenerator/node_modules/defs/node_modules/ast-traverse/package.json',
            'main': 'ast-traverse.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'breakable',
            'version': '1.0.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/babel/node_modules/babel-core/node_modules/regenerator/node_modules/defs/node_modules/breakable/package.json',
            'main': 'breakable.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'simple-fmt',
            'version': '0.1.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/babel/node_modules/babel-core/node_modules/regenerator/node_modules/defs/node_modules/simple-fmt/package.json',
            'main': 'simple-fmt.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'esprima-fb',
            'version': '8001.1001.0-dev-harmony-fb',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/babel/node_modules/babel-core/node_modules/regenerator/node_modules/defs/node_modules/esprima-fb/package.json',
            'main': 'esprima.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'simple-is',
            'version': '0.2.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/babel/node_modules/babel-core/node_modules/regenerator/node_modules/defs/node_modules/simple-is/package.json',
            'main': 'simple-is.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'stringmap',
            'version': '0.2.2',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/babel/node_modules/babel-core/node_modules/regenerator/node_modules/defs/node_modules/stringmap/package.json',
            'main': 'stringmap.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'stringset',
            'version': '0.2.1',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/babel/node_modules/babel-core/node_modules/regenerator/node_modules/defs/node_modules/stringset/package.json',
            'main': 'stringset.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'tryor',
            'version': '0.1.2',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/babel/node_modules/babel-core/node_modules/regenerator/node_modules/defs/node_modules/tryor/package.json',
            'main': 'tryor.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'yargs',
            'version': '1.3.3',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/babel/node_modules/babel-core/node_modules/regenerator/node_modules/defs/node_modules/yargs/package.json',
            'main': './index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'jsesc',
            'version': '0.5.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/babel/node_modules/babel-core/node_modules/regexpu/node_modules/regjsparser/node_modules/jsesc/package.json',
            'main': 'jsesc.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'lru-cache',
            'version': '2.6.1',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/babel/node_modules/chokidar/node_modules/readdirp/node_modules/minimatch/node_modules/lru-cache/package.json',
            'main': 'lib/lru-cache.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'sigmund',
            'version': '1.0.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/babel/node_modules/chokidar/node_modules/readdirp/node_modules/minimatch/node_modules/sigmund/package.json',
            'main': 'sigmund.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'array-slice',
            'version': '0.2.3',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/anymatch/node_modules/micromatch/node_modules/arr-diff/node_modules/array-slice/package.json',
            'main': 'index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'expand-range',
            'version': '1.8.1',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/anymatch/node_modules/micromatch/node_modules/braces/node_modules/expand-range/package.json',
            'main': 'index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'preserve',
            'version': '0.2.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/anymatch/node_modules/micromatch/node_modules/braces/node_modules/preserve/package.json',
            'main': 'index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'repeat-element',
            'version': '1.1.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/anymatch/node_modules/micromatch/node_modules/braces/node_modules/repeat-element/package.json',
            'main': 'index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'for-own',
            'version': '0.1.3',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/anymatch/node_modules/micromatch/node_modules/object.omit/node_modules/for-own/package.json',
            'main': 'index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'isobject',
            'version': '0.2.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/anymatch/node_modules/micromatch/node_modules/object.omit/node_modules/isobject/package.json',
            'main': 'index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'glob-base',
            'version': '0.2.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/anymatch/node_modules/micromatch/node_modules/parse-glob/node_modules/glob-base/package.json',
            'main': 'index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'is-dotfile',
            'version': '1.0.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/anymatch/node_modules/micromatch/node_modules/parse-glob/node_modules/is-dotfile/package.json',
            'main': 'index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'is-extglob',
            'version': '1.0.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/anymatch/node_modules/micromatch/node_modules/parse-glob/node_modules/is-extglob/package.json',
            'main': 'index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'is-equal-shallow',
            'version': '0.1.2',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/anymatch/node_modules/micromatch/node_modules/regex-cache/node_modules/is-equal-shallow/package.json',
            'main': 'index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'is-primitive',
            'version': '2.0.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/anymatch/node_modules/micromatch/node_modules/regex-cache/node_modules/is-primitive/package.json',
            'main': 'index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'connect',
            'version': '1.9.2',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/browser-sync-ui/node_modules/weinre/node_modules/express/node_modules/connect/package.json',
            'main': 'index',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'mime',
            'version': '1.2.4',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/browser-sync-ui/node_modules/weinre/node_modules/express/node_modules/mime/package.json',
            'main': 'mime.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'qs',
            'version': '0.4.2',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/browser-sync-ui/node_modules/weinre/node_modules/express/node_modules/qs/package.json',
            'main': 'index',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'mkdirp',
            'version': '0.3.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/browser-sync-ui/node_modules/weinre/node_modules/express/node_modules/mkdirp/package.json',
            'main': './index',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'abbrev',
            'version': '1.0.5',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/browser-sync-ui/node_modules/weinre/node_modules/nopt/node_modules/abbrev/package.json',
            'main': 'abbrev.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'ee-first',
            'version': '1.1.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/connect/node_modules/finalhandler/node_modules/on-finished/node_modules/ee-first/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'combined-stream',
            'version': '0.0.3',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/localtunnel/node_modules/request/node_modules/form-data/node_modules/combined-stream/package.json',
            'main': './lib/combined_stream',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'async',
            'version': '0.1.9',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/localtunnel/node_modules/request/node_modules/form-data/node_modules/async/package.json',
            'main': './index',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'crc',
            'version': '3.2.1',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/serve-static/node_modules/send/node_modules/etag/node_modules/crc/package.json',
            'main': './lib/index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'nan',
            'version': '1.4.3',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/socket.io/node_modules/engine.io/node_modules/ws/node_modules/nan/package.json',
            'main': 'include_dirs.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'options',
            'version': '0.0.6',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/socket.io/node_modules/engine.io/node_modules/ws/node_modules/options/package.json',
            'main': 'lib/options',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'ultron',
            'version': '1.0.1',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/socket.io/node_modules/engine.io/node_modules/ws/node_modules/ultron/package.json',
            'main': 'index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'after',
            'version': '0.8.1',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/socket.io/node_modules/engine.io/node_modules/engine.io-parser/node_modules/after/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'arraybuffer.slice',
            'version': '0.0.6',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/socket.io/node_modules/engine.io/node_modules/engine.io-parser/node_modules/arraybuffer.slice/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'base64-arraybuffer',
            'version': '0.1.2',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/socket.io/node_modules/engine.io/node_modules/engine.io-parser/node_modules/base64-arraybuffer/package.json',
            'main': 'lib/base64-arraybuffer',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'blob',
            'version': '0.0.2',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/socket.io/node_modules/engine.io/node_modules/engine.io-parser/node_modules/blob/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'has-binary',
            'version': '0.1.5',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/socket.io/node_modules/engine.io/node_modules/engine.io-parser/node_modules/has-binary/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'utf8',
            'version': '2.0.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/socket.io/node_modules/engine.io/node_modules/engine.io-parser/node_modules/utf8/package.json',
            'main': 'utf8.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'has-cors',
            'version': '1.0.3',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/socket.io/node_modules/socket.io-client/node_modules/engine.io-client/node_modules/has-cors/package.json',
            'main': 'index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'ws',
            'version': '0.4.31',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/socket.io/node_modules/socket.io-client/node_modules/engine.io-client/node_modules/ws/package.json',
            'globalBrowser': {},
            'browser': './lib/browser.js'
        },
        {
            'name': 'xmlhttprequest',
            'version': '1.5.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/socket.io/node_modules/socket.io-client/node_modules/engine.io-client/node_modules/xmlhttprequest/package.json',
            'main': './lib/XMLHttpRequest.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'debug',
            'version': '1.0.4',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/socket.io/node_modules/socket.io-client/node_modules/engine.io-client/node_modules/debug/package.json',
            'main': './node.js',
            'globalBrowser': {},
            'browser': './browser.js'
        },
        {
            'name': 'parseuri',
            'version': '0.0.4',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/socket.io/node_modules/socket.io-client/node_modules/engine.io-client/node_modules/parseuri/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'parsejson',
            'version': '0.0.1',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/socket.io/node_modules/socket.io-client/node_modules/engine.io-client/node_modules/parsejson/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'parseqs',
            'version': '0.0.2',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/socket.io/node_modules/socket.io-client/node_modules/engine.io-client/node_modules/parseqs/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'component-inherit',
            'version': '0.0.3',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/socket.io/node_modules/socket.io-client/node_modules/engine.io-client/node_modules/component-inherit/package.json',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'better-assert',
            'version': '1.0.2',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/socket.io/node_modules/socket.io-client/node_modules/parseuri/node_modules/better-assert/package.json',
            'main': 'index',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'wrappy',
            'version': '1.0.1',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/del/node_modules/globby/node_modules/glob/node_modules/inflight/node_modules/wrappy/package.json',
            'main': 'wrappy.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'find-index',
            'version': '0.1.1',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp/node_modules/vinyl-fs/node_modules/glob-stream/node_modules/glob2base/node_modules/find-index/package.json',
            'main': 'index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'globule',
            'version': '0.1.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp/node_modules/vinyl-fs/node_modules/glob-watcher/node_modules/gaze/node_modules/globule/package.json',
            'main': 'lib/globule',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'minimatch',
            'version': '0.3.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp-jshint/node_modules/jshint/node_modules/cli/node_modules/glob/node_modules/minimatch/package.json',
            'main': 'minimatch.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'dom-serializer',
            'version': '0.1.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp-jshint/node_modules/jshint/node_modules/htmlparser2/node_modules/domutils/node_modules/dom-serializer/package.json',
            'main': './index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'esprima-fb',
            'version': '10001.1.0-dev-harmony-fb',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/babel/node_modules/babel-core/node_modules/regenerator/node_modules/commoner/node_modules/recast/node_modules/esprima-fb/package.json',
            'main': 'esprima.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'source-map',
            'version': '0.1.43',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/babel/node_modules/babel-core/node_modules/regenerator/node_modules/commoner/node_modules/recast/node_modules/source-map/package.json',
            'main': './lib/source-map.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'ast-types',
            'version': '0.6.16',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/babel/node_modules/babel-core/node_modules/regenerator/node_modules/commoner/node_modules/recast/node_modules/ast-types/package.json',
            'main': 'main.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'minimatch',
            'version': '1.0.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/babel/node_modules/babel-core/node_modules/regenerator/node_modules/commoner/node_modules/glob/node_modules/minimatch/package.json',
            'main': 'minimatch.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'stable',
            'version': '0.1.5',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/babel/node_modules/babel-core/node_modules/regenerator/node_modules/defs/node_modules/alter/node_modules/stable/package.json',
            'main': './stable.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'fill-range',
            'version': '2.2.2',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/anymatch/node_modules/micromatch/node_modules/braces/node_modules/expand-range/node_modules/fill-range/package.json',
            'main': 'index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'for-in',
            'version': '0.1.4',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/anymatch/node_modules/micromatch/node_modules/object.omit/node_modules/for-own/node_modules/for-in/package.json',
            'main': 'index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'is-primitive',
            'version': '1.0.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/anymatch/node_modules/micromatch/node_modules/regex-cache/node_modules/is-equal-shallow/node_modules/is-primitive/package.json',
            'main': 'index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'formidable',
            'version': '1.0.17',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/browser-sync-ui/node_modules/weinre/node_modules/express/node_modules/connect/node_modules/formidable/package.json',
            'main': './lib/index',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'delayed-stream',
            'version': '0.0.5',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/localtunnel/node_modules/request/node_modules/form-data/node_modules/combined-stream/node_modules/delayed-stream/package.json',
            'main': './lib/delayed_stream',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'global',
            'version': '2.0.1',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/socket.io/node_modules/socket.io-client/node_modules/engine.io-client/node_modules/has-cors/node_modules/global/package.json',
            'main': 'index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'commander',
            'version': '0.6.1',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/socket.io/node_modules/socket.io-client/node_modules/engine.io-client/node_modules/ws/node_modules/commander/package.json',
            'main': 'index',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'nan',
            'version': '0.3.2',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/socket.io/node_modules/socket.io-client/node_modules/engine.io-client/node_modules/ws/node_modules/nan/package.json',
            'main': '.index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'tinycolor',
            'version': '0.0.1',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/socket.io/node_modules/socket.io-client/node_modules/engine.io-client/node_modules/ws/node_modules/tinycolor/package.json',
            'main': 'tinycolor',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'callsite',
            'version': '1.0.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/socket.io/node_modules/socket.io-client/node_modules/parseuri/node_modules/better-assert/node_modules/callsite/package.json',
            'main': 'index',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'lodash',
            'version': '1.0.2',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp/node_modules/vinyl-fs/node_modules/glob-watcher/node_modules/gaze/node_modules/globule/node_modules/lodash/package.json',
            'main': './dist/lodash.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'glob',
            'version': '3.1.21',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp/node_modules/vinyl-fs/node_modules/glob-watcher/node_modules/gaze/node_modules/globule/node_modules/glob/package.json',
            'main': 'glob.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'domelementtype',
            'version': '1.1.3',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp-jshint/node_modules/jshint/node_modules/htmlparser2/node_modules/domutils/node_modules/dom-serializer/node_modules/domelementtype/package.json',
            'main': 'index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'entities',
            'version': '1.1.1',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp-jshint/node_modules/jshint/node_modules/htmlparser2/node_modules/domutils/node_modules/dom-serializer/node_modules/entities/package.json',
            'main': './index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'is-number',
            'version': '1.1.2',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/anymatch/node_modules/micromatch/node_modules/braces/node_modules/expand-range/node_modules/fill-range/node_modules/is-number/package.json',
            'main': 'index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'isobject',
            'version': '1.0.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/anymatch/node_modules/micromatch/node_modules/braces/node_modules/expand-range/node_modules/fill-range/node_modules/isobject/package.json',
            'main': 'index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'randomatic',
            'version': '1.1.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/anymatch/node_modules/micromatch/node_modules/braces/node_modules/expand-range/node_modules/fill-range/node_modules/randomatic/package.json',
            'main': 'index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'repeat-string',
            'version': '1.5.2',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/browser-sync/node_modules/anymatch/node_modules/micromatch/node_modules/braces/node_modules/expand-range/node_modules/fill-range/node_modules/repeat-string/package.json',
            'main': 'index.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'graceful-fs',
            'version': '1.2.3',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp/node_modules/vinyl-fs/node_modules/glob-watcher/node_modules/gaze/node_modules/globule/node_modules/glob/node_modules/graceful-fs/package.json',
            'main': 'graceful-fs.js',
            'globalBrowser': {},
            'browser': {}
        },
        {
            'name': 'inherits',
            'version': '1.0.0',
            'fileUrl': 'file:/Users/jorozco/Dropbox/codeforcary/apps/artProject/work/node_modules/gulp/node_modules/vinyl-fs/node_modules/glob-watcher/node_modules/gaze/node_modules/globule/node_modules/glob/node_modules/inherits/package.json',
            'main': './inherits.js',
            'globalBrowser': {},
            'browser': {}
        }
    ]));
});
/*jquery@2.1.3#dist/jquery*/
System.define('jquery@2.1.3#dist/jquery', '/*!\n * jQuery JavaScript Library v2.1.3\n * http://jquery.com/\n *\n * Includes Sizzle.js\n * http://sizzlejs.com/\n *\n * Copyright 2005, 2014 jQuery Foundation, Inc. and other contributors\n * Released under the MIT license\n * http://jquery.org/license\n *\n * Date: 2014-12-18T15:11Z\n */\n\n(function( global, factory ) {\n\n\tif ( typeof module === "object" && typeof module.exports === "object" ) {\n\t\t// For CommonJS and CommonJS-like environments where a proper `window`\n\t\t// is present, execute the factory and get jQuery.\n\t\t// For environments that do not have a `window` with a `document`\n\t\t// (such as Node.js), expose a factory as module.exports.\n\t\t// This accentuates the need for the creation of a real `window`.\n\t\t// e.g. var jQuery = require("jquery")(window);\n\t\t// See ticket #14549 for more info.\n\t\tmodule.exports = global.document ?\n\t\t\tfactory( global, true ) :\n\t\t\tfunction( w ) {\n\t\t\t\tif ( !w.document ) {\n\t\t\t\t\tthrow new Error( "jQuery requires a window with a document" );\n\t\t\t\t}\n\t\t\t\treturn factory( w );\n\t\t\t};\n\t} else {\n\t\tfactory( global );\n\t}\n\n// Pass this if window is not defined yet\n}(typeof window !== "undefined" ? window : this, function( window, noGlobal ) {\n\n// Support: Firefox 18+\n// Can\'t be in strict mode, several libs including ASP.NET trace\n// the stack via arguments.caller.callee and Firefox dies if\n// you try to trace through "use strict" call chains. (#13335)\n//\n\nvar arr = [];\n\nvar slice = arr.slice;\n\nvar concat = arr.concat;\n\nvar push = arr.push;\n\nvar indexOf = arr.indexOf;\n\nvar class2type = {};\n\nvar toString = class2type.toString;\n\nvar hasOwn = class2type.hasOwnProperty;\n\nvar support = {};\n\n\n\nvar\n\t// Use the correct document accordingly with window argument (sandbox)\n\tdocument = window.document,\n\n\tversion = "2.1.3",\n\n\t// Define a local copy of jQuery\n\tjQuery = function( selector, context ) {\n\t\t// The jQuery object is actually just the init constructor \'enhanced\'\n\t\t// Need init if jQuery is called (just allow error to be thrown if not included)\n\t\treturn new jQuery.fn.init( selector, context );\n\t},\n\n\t// Support: Android<4.1\n\t// Make sure we trim BOM and NBSP\n\trtrim = /^[\\s\\uFEFF\\xA0]+|[\\s\\uFEFF\\xA0]+$/g,\n\n\t// Matches dashed string for camelizing\n\trmsPrefix = /^-ms-/,\n\trdashAlpha = /-([\\da-z])/gi,\n\n\t// Used by jQuery.camelCase as callback to replace()\n\tfcamelCase = function( all, letter ) {\n\t\treturn letter.toUpperCase();\n\t};\n\njQuery.fn = jQuery.prototype = {\n\t// The current version of jQuery being used\n\tjquery: version,\n\n\tconstructor: jQuery,\n\n\t// Start with an empty selector\n\tselector: "",\n\n\t// The default length of a jQuery object is 0\n\tlength: 0,\n\n\ttoArray: function() {\n\t\treturn slice.call( this );\n\t},\n\n\t// Get the Nth element in the matched element set OR\n\t// Get the whole matched element set as a clean array\n\tget: function( num ) {\n\t\treturn num != null ?\n\n\t\t\t// Return just the one element from the set\n\t\t\t( num < 0 ? this[ num + this.length ] : this[ num ] ) :\n\n\t\t\t// Return all the elements in a clean array\n\t\t\tslice.call( this );\n\t},\n\n\t// Take an array of elements and push it onto the stack\n\t// (returning the new matched element set)\n\tpushStack: function( elems ) {\n\n\t\t// Build a new jQuery matched element set\n\t\tvar ret = jQuery.merge( this.constructor(), elems );\n\n\t\t// Add the old object onto the stack (as a reference)\n\t\tret.prevObject = this;\n\t\tret.context = this.context;\n\n\t\t// Return the newly-formed element set\n\t\treturn ret;\n\t},\n\n\t// Execute a callback for every element in the matched set.\n\t// (You can seed the arguments with an array of args, but this is\n\t// only used internally.)\n\teach: function( callback, args ) {\n\t\treturn jQuery.each( this, callback, args );\n\t},\n\n\tmap: function( callback ) {\n\t\treturn this.pushStack( jQuery.map(this, function( elem, i ) {\n\t\t\treturn callback.call( elem, i, elem );\n\t\t}));\n\t},\n\n\tslice: function() {\n\t\treturn this.pushStack( slice.apply( this, arguments ) );\n\t},\n\n\tfirst: function() {\n\t\treturn this.eq( 0 );\n\t},\n\n\tlast: function() {\n\t\treturn this.eq( -1 );\n\t},\n\n\teq: function( i ) {\n\t\tvar len = this.length,\n\t\t\tj = +i + ( i < 0 ? len : 0 );\n\t\treturn this.pushStack( j >= 0 && j < len ? [ this[j] ] : [] );\n\t},\n\n\tend: function() {\n\t\treturn this.prevObject || this.constructor(null);\n\t},\n\n\t// For internal use only.\n\t// Behaves like an Array\'s method, not like a jQuery method.\n\tpush: push,\n\tsort: arr.sort,\n\tsplice: arr.splice\n};\n\njQuery.extend = jQuery.fn.extend = function() {\n\tvar options, name, src, copy, copyIsArray, clone,\n\t\ttarget = arguments[0] || {},\n\t\ti = 1,\n\t\tlength = arguments.length,\n\t\tdeep = false;\n\n\t// Handle a deep copy situation\n\tif ( typeof target === "boolean" ) {\n\t\tdeep = target;\n\n\t\t// Skip the boolean and the target\n\t\ttarget = arguments[ i ] || {};\n\t\ti++;\n\t}\n\n\t// Handle case when target is a string or something (possible in deep copy)\n\tif ( typeof target !== "object" && !jQuery.isFunction(target) ) {\n\t\ttarget = {};\n\t}\n\n\t// Extend jQuery itself if only one argument is passed\n\tif ( i === length ) {\n\t\ttarget = this;\n\t\ti--;\n\t}\n\n\tfor ( ; i < length; i++ ) {\n\t\t// Only deal with non-null/undefined values\n\t\tif ( (options = arguments[ i ]) != null ) {\n\t\t\t// Extend the base object\n\t\t\tfor ( name in options ) {\n\t\t\t\tsrc = target[ name ];\n\t\t\t\tcopy = options[ name ];\n\n\t\t\t\t// Prevent never-ending loop\n\t\t\t\tif ( target === copy ) {\n\t\t\t\t\tcontinue;\n\t\t\t\t}\n\n\t\t\t\t// Recurse if we\'re merging plain objects or arrays\n\t\t\t\tif ( deep && copy && ( jQuery.isPlainObject(copy) || (copyIsArray = jQuery.isArray(copy)) ) ) {\n\t\t\t\t\tif ( copyIsArray ) {\n\t\t\t\t\t\tcopyIsArray = false;\n\t\t\t\t\t\tclone = src && jQuery.isArray(src) ? src : [];\n\n\t\t\t\t\t} else {\n\t\t\t\t\t\tclone = src && jQuery.isPlainObject(src) ? src : {};\n\t\t\t\t\t}\n\n\t\t\t\t\t// Never move original objects, clone them\n\t\t\t\t\ttarget[ name ] = jQuery.extend( deep, clone, copy );\n\n\t\t\t\t// Don\'t bring in undefined values\n\t\t\t\t} else if ( copy !== undefined ) {\n\t\t\t\t\ttarget[ name ] = copy;\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n\n\t// Return the modified object\n\treturn target;\n};\n\njQuery.extend({\n\t// Unique for each copy of jQuery on the page\n\texpando: "jQuery" + ( version + Math.random() ).replace( /\\D/g, "" ),\n\n\t// Assume jQuery is ready without the ready module\n\tisReady: true,\n\n\terror: function( msg ) {\n\t\tthrow new Error( msg );\n\t},\n\n\tnoop: function() {},\n\n\tisFunction: function( obj ) {\n\t\treturn jQuery.type(obj) === "function";\n\t},\n\n\tisArray: Array.isArray,\n\n\tisWindow: function( obj ) {\n\t\treturn obj != null && obj === obj.window;\n\t},\n\n\tisNumeric: function( obj ) {\n\t\t// parseFloat NaNs numeric-cast false positives (null|true|false|"")\n\t\t// ...but misinterprets leading-number strings, particularly hex literals ("0x...")\n\t\t// subtraction forces infinities to NaN\n\t\t// adding 1 corrects loss of precision from parseFloat (#15100)\n\t\treturn !jQuery.isArray( obj ) && (obj - parseFloat( obj ) + 1) >= 0;\n\t},\n\n\tisPlainObject: function( obj ) {\n\t\t// Not plain objects:\n\t\t// - Any object or value whose internal [[Class]] property is not "[object Object]"\n\t\t// - DOM nodes\n\t\t// - window\n\t\tif ( jQuery.type( obj ) !== "object" || obj.nodeType || jQuery.isWindow( obj ) ) {\n\t\t\treturn false;\n\t\t}\n\n\t\tif ( obj.constructor &&\n\t\t\t\t!hasOwn.call( obj.constructor.prototype, "isPrototypeOf" ) ) {\n\t\t\treturn false;\n\t\t}\n\n\t\t// If the function hasn\'t returned already, we\'re confident that\n\t\t// |obj| is a plain object, created by {} or constructed with new Object\n\t\treturn true;\n\t},\n\n\tisEmptyObject: function( obj ) {\n\t\tvar name;\n\t\tfor ( name in obj ) {\n\t\t\treturn false;\n\t\t}\n\t\treturn true;\n\t},\n\n\ttype: function( obj ) {\n\t\tif ( obj == null ) {\n\t\t\treturn obj + "";\n\t\t}\n\t\t// Support: Android<4.0, iOS<6 (functionish RegExp)\n\t\treturn typeof obj === "object" || typeof obj === "function" ?\n\t\t\tclass2type[ toString.call(obj) ] || "object" :\n\t\t\ttypeof obj;\n\t},\n\n\t// Evaluates a script in a global context\n\tglobalEval: function( code ) {\n\t\tvar script,\n\t\t\tindirect = eval;\n\n\t\tcode = jQuery.trim( code );\n\n\t\tif ( code ) {\n\t\t\t// If the code includes a valid, prologue position\n\t\t\t// strict mode pragma, execute code by injecting a\n\t\t\t// script tag into the document.\n\t\t\tif ( code.indexOf("use strict") === 1 ) {\n\t\t\t\tscript = document.createElement("script");\n\t\t\t\tscript.text = code;\n\t\t\t\tdocument.head.appendChild( script ).parentNode.removeChild( script );\n\t\t\t} else {\n\t\t\t// Otherwise, avoid the DOM node creation, insertion\n\t\t\t// and removal by using an indirect global eval\n\t\t\t\tindirect( code );\n\t\t\t}\n\t\t}\n\t},\n\n\t// Convert dashed to camelCase; used by the css and data modules\n\t// Support: IE9-11+\n\t// Microsoft forgot to hump their vendor prefix (#9572)\n\tcamelCase: function( string ) {\n\t\treturn string.replace( rmsPrefix, "ms-" ).replace( rdashAlpha, fcamelCase );\n\t},\n\n\tnodeName: function( elem, name ) {\n\t\treturn elem.nodeName && elem.nodeName.toLowerCase() === name.toLowerCase();\n\t},\n\n\t// args is for internal usage only\n\teach: function( obj, callback, args ) {\n\t\tvar value,\n\t\t\ti = 0,\n\t\t\tlength = obj.length,\n\t\t\tisArray = isArraylike( obj );\n\n\t\tif ( args ) {\n\t\t\tif ( isArray ) {\n\t\t\t\tfor ( ; i < length; i++ ) {\n\t\t\t\t\tvalue = callback.apply( obj[ i ], args );\n\n\t\t\t\t\tif ( value === false ) {\n\t\t\t\t\t\tbreak;\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t} else {\n\t\t\t\tfor ( i in obj ) {\n\t\t\t\t\tvalue = callback.apply( obj[ i ], args );\n\n\t\t\t\t\tif ( value === false ) {\n\t\t\t\t\t\tbreak;\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t}\n\n\t\t// A special, fast, case for the most common use of each\n\t\t} else {\n\t\t\tif ( isArray ) {\n\t\t\t\tfor ( ; i < length; i++ ) {\n\t\t\t\t\tvalue = callback.call( obj[ i ], i, obj[ i ] );\n\n\t\t\t\t\tif ( value === false ) {\n\t\t\t\t\t\tbreak;\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t} else {\n\t\t\t\tfor ( i in obj ) {\n\t\t\t\t\tvalue = callback.call( obj[ i ], i, obj[ i ] );\n\n\t\t\t\t\tif ( value === false ) {\n\t\t\t\t\t\tbreak;\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\n\t\treturn obj;\n\t},\n\n\t// Support: Android<4.1\n\ttrim: function( text ) {\n\t\treturn text == null ?\n\t\t\t"" :\n\t\t\t( text + "" ).replace( rtrim, "" );\n\t},\n\n\t// results is for internal usage only\n\tmakeArray: function( arr, results ) {\n\t\tvar ret = results || [];\n\n\t\tif ( arr != null ) {\n\t\t\tif ( isArraylike( Object(arr) ) ) {\n\t\t\t\tjQuery.merge( ret,\n\t\t\t\t\ttypeof arr === "string" ?\n\t\t\t\t\t[ arr ] : arr\n\t\t\t\t);\n\t\t\t} else {\n\t\t\t\tpush.call( ret, arr );\n\t\t\t}\n\t\t}\n\n\t\treturn ret;\n\t},\n\n\tinArray: function( elem, arr, i ) {\n\t\treturn arr == null ? -1 : indexOf.call( arr, elem, i );\n\t},\n\n\tmerge: function( first, second ) {\n\t\tvar len = +second.length,\n\t\t\tj = 0,\n\t\t\ti = first.length;\n\n\t\tfor ( ; j < len; j++ ) {\n\t\t\tfirst[ i++ ] = second[ j ];\n\t\t}\n\n\t\tfirst.length = i;\n\n\t\treturn first;\n\t},\n\n\tgrep: function( elems, callback, invert ) {\n\t\tvar callbackInverse,\n\t\t\tmatches = [],\n\t\t\ti = 0,\n\t\t\tlength = elems.length,\n\t\t\tcallbackExpect = !invert;\n\n\t\t// Go through the array, only saving the items\n\t\t// that pass the validator function\n\t\tfor ( ; i < length; i++ ) {\n\t\t\tcallbackInverse = !callback( elems[ i ], i );\n\t\t\tif ( callbackInverse !== callbackExpect ) {\n\t\t\t\tmatches.push( elems[ i ] );\n\t\t\t}\n\t\t}\n\n\t\treturn matches;\n\t},\n\n\t// arg is for internal usage only\n\tmap: function( elems, callback, arg ) {\n\t\tvar value,\n\t\t\ti = 0,\n\t\t\tlength = elems.length,\n\t\t\tisArray = isArraylike( elems ),\n\t\t\tret = [];\n\n\t\t// Go through the array, translating each of the items to their new values\n\t\tif ( isArray ) {\n\t\t\tfor ( ; i < length; i++ ) {\n\t\t\t\tvalue = callback( elems[ i ], i, arg );\n\n\t\t\t\tif ( value != null ) {\n\t\t\t\t\tret.push( value );\n\t\t\t\t}\n\t\t\t}\n\n\t\t// Go through every key on the object,\n\t\t} else {\n\t\t\tfor ( i in elems ) {\n\t\t\t\tvalue = callback( elems[ i ], i, arg );\n\n\t\t\t\tif ( value != null ) {\n\t\t\t\t\tret.push( value );\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\n\t\t// Flatten any nested arrays\n\t\treturn concat.apply( [], ret );\n\t},\n\n\t// A global GUID counter for objects\n\tguid: 1,\n\n\t// Bind a function to a context, optionally partially applying any\n\t// arguments.\n\tproxy: function( fn, context ) {\n\t\tvar tmp, args, proxy;\n\n\t\tif ( typeof context === "string" ) {\n\t\t\ttmp = fn[ context ];\n\t\t\tcontext = fn;\n\t\t\tfn = tmp;\n\t\t}\n\n\t\t// Quick check to determine if target is callable, in the spec\n\t\t// this throws a TypeError, but we will just return undefined.\n\t\tif ( !jQuery.isFunction( fn ) ) {\n\t\t\treturn undefined;\n\t\t}\n\n\t\t// Simulated bind\n\t\targs = slice.call( arguments, 2 );\n\t\tproxy = function() {\n\t\t\treturn fn.apply( context || this, args.concat( slice.call( arguments ) ) );\n\t\t};\n\n\t\t// Set the guid of unique handler to the same of original handler, so it can be removed\n\t\tproxy.guid = fn.guid = fn.guid || jQuery.guid++;\n\n\t\treturn proxy;\n\t},\n\n\tnow: Date.now,\n\n\t// jQuery.support is not used in Core but other projects attach their\n\t// properties to it so it needs to exist.\n\tsupport: support\n});\n\n// Populate the class2type map\njQuery.each("Boolean Number String Function Array Date RegExp Object Error".split(" "), function(i, name) {\n\tclass2type[ "[object " + name + "]" ] = name.toLowerCase();\n});\n\nfunction isArraylike( obj ) {\n\tvar length = obj.length,\n\t\ttype = jQuery.type( obj );\n\n\tif ( type === "function" || jQuery.isWindow( obj ) ) {\n\t\treturn false;\n\t}\n\n\tif ( obj.nodeType === 1 && length ) {\n\t\treturn true;\n\t}\n\n\treturn type === "array" || length === 0 ||\n\t\ttypeof length === "number" && length > 0 && ( length - 1 ) in obj;\n}\nvar Sizzle =\n/*!\n * Sizzle CSS Selector Engine v2.2.0-pre\n * http://sizzlejs.com/\n *\n * Copyright 2008, 2014 jQuery Foundation, Inc. and other contributors\n * Released under the MIT license\n * http://jquery.org/license\n *\n * Date: 2014-12-16\n */\n(function( window ) {\n\nvar i,\n\tsupport,\n\tExpr,\n\tgetText,\n\tisXML,\n\ttokenize,\n\tcompile,\n\tselect,\n\toutermostContext,\n\tsortInput,\n\thasDuplicate,\n\n\t// Local document vars\n\tsetDocument,\n\tdocument,\n\tdocElem,\n\tdocumentIsHTML,\n\trbuggyQSA,\n\trbuggyMatches,\n\tmatches,\n\tcontains,\n\n\t// Instance-specific data\n\texpando = "sizzle" + 1 * new Date(),\n\tpreferredDoc = window.document,\n\tdirruns = 0,\n\tdone = 0,\n\tclassCache = createCache(),\n\ttokenCache = createCache(),\n\tcompilerCache = createCache(),\n\tsortOrder = function( a, b ) {\n\t\tif ( a === b ) {\n\t\t\thasDuplicate = true;\n\t\t}\n\t\treturn 0;\n\t},\n\n\t// General-purpose constants\n\tMAX_NEGATIVE = 1 << 31,\n\n\t// Instance methods\n\thasOwn = ({}).hasOwnProperty,\n\tarr = [],\n\tpop = arr.pop,\n\tpush_native = arr.push,\n\tpush = arr.push,\n\tslice = arr.slice,\n\t// Use a stripped-down indexOf as it\'s faster than native\n\t// http://jsperf.com/thor-indexof-vs-for/5\n\tindexOf = function( list, elem ) {\n\t\tvar i = 0,\n\t\t\tlen = list.length;\n\t\tfor ( ; i < len; i++ ) {\n\t\t\tif ( list[i] === elem ) {\n\t\t\t\treturn i;\n\t\t\t}\n\t\t}\n\t\treturn -1;\n\t},\n\n\tbooleans = "checked|selected|async|autofocus|autoplay|controls|defer|disabled|hidden|ismap|loop|multiple|open|readonly|required|scoped",\n\n\t// Regular expressions\n\n\t// Whitespace characters http://www.w3.org/TR/css3-selectors/#whitespace\n\twhitespace = "[\\\\x20\\\\t\\\\r\\\\n\\\\f]",\n\t// http://www.w3.org/TR/css3-syntax/#characters\n\tcharacterEncoding = "(?:\\\\\\\\.|[\\\\w-]|[^\\\\x00-\\\\xa0])+",\n\n\t// Loosely modeled on CSS identifier characters\n\t// An unquoted value should be a CSS identifier http://www.w3.org/TR/css3-selectors/#attribute-selectors\n\t// Proper syntax: http://www.w3.org/TR/CSS21/syndata.html#value-def-identifier\n\tidentifier = characterEncoding.replace( "w", "w#" ),\n\n\t// Attribute selectors: http://www.w3.org/TR/selectors/#attribute-selectors\n\tattributes = "\\\\[" + whitespace + "*(" + characterEncoding + ")(?:" + whitespace +\n\t\t// Operator (capture 2)\n\t\t"*([*^$|!~]?=)" + whitespace +\n\t\t// "Attribute values must be CSS identifiers [capture 5] or strings [capture 3 or capture 4]"\n\t\t"*(?:\'((?:\\\\\\\\.|[^\\\\\\\\\'])*)\'|\\"((?:\\\\\\\\.|[^\\\\\\\\\\"])*)\\"|(" + identifier + "))|)" + whitespace +\n\t\t"*\\\\]",\n\n\tpseudos = ":(" + characterEncoding + ")(?:\\\\((" +\n\t\t// To reduce the number of selectors needing tokenize in the preFilter, prefer arguments:\n\t\t// 1. quoted (capture 3; capture 4 or capture 5)\n\t\t"(\'((?:\\\\\\\\.|[^\\\\\\\\\'])*)\'|\\"((?:\\\\\\\\.|[^\\\\\\\\\\"])*)\\")|" +\n\t\t// 2. simple (capture 6)\n\t\t"((?:\\\\\\\\.|[^\\\\\\\\()[\\\\]]|" + attributes + ")*)|" +\n\t\t// 3. anything else (capture 2)\n\t\t".*" +\n\t\t")\\\\)|)",\n\n\t// Leading and non-escaped trailing whitespace, capturing some non-whitespace characters preceding the latter\n\trwhitespace = new RegExp( whitespace + "+", "g" ),\n\trtrim = new RegExp( "^" + whitespace + "+|((?:^|[^\\\\\\\\])(?:\\\\\\\\.)*)" + whitespace + "+$", "g" ),\n\n\trcomma = new RegExp( "^" + whitespace + "*," + whitespace + "*" ),\n\trcombinators = new RegExp( "^" + whitespace + "*([>+~]|" + whitespace + ")" + whitespace + "*" ),\n\n\trattributeQuotes = new RegExp( "=" + whitespace + "*([^\\\\]\'\\"]*?)" + whitespace + "*\\\\]", "g" ),\n\n\trpseudo = new RegExp( pseudos ),\n\tridentifier = new RegExp( "^" + identifier + "$" ),\n\n\tmatchExpr = {\n\t\t"ID": new RegExp( "^#(" + characterEncoding + ")" ),\n\t\t"CLASS": new RegExp( "^\\\\.(" + characterEncoding + ")" ),\n\t\t"TAG": new RegExp( "^(" + characterEncoding.replace( "w", "w*" ) + ")" ),\n\t\t"ATTR": new RegExp( "^" + attributes ),\n\t\t"PSEUDO": new RegExp( "^" + pseudos ),\n\t\t"CHILD": new RegExp( "^:(only|first|last|nth|nth-last)-(child|of-type)(?:\\\\(" + whitespace +\n\t\t\t"*(even|odd|(([+-]|)(\\\\d*)n|)" + whitespace + "*(?:([+-]|)" + whitespace +\n\t\t\t"*(\\\\d+)|))" + whitespace + "*\\\\)|)", "i" ),\n\t\t"bool": new RegExp( "^(?:" + booleans + ")$", "i" ),\n\t\t// For use in libraries implementing .is()\n\t\t// We use this for POS matching in `select`\n\t\t"needsContext": new RegExp( "^" + whitespace + "*[>+~]|:(even|odd|eq|gt|lt|nth|first|last)(?:\\\\(" +\n\t\t\twhitespace + "*((?:-\\\\d)?\\\\d*)" + whitespace + "*\\\\)|)(?=[^-]|$)", "i" )\n\t},\n\n\trinputs = /^(?:input|select|textarea|button)$/i,\n\trheader = /^h\\d$/i,\n\n\trnative = /^[^{]+\\{\\s*\\[native \\w/,\n\n\t// Easily-parseable/retrievable ID or TAG or CLASS selectors\n\trquickExpr = /^(?:#([\\w-]+)|(\\w+)|\\.([\\w-]+))$/,\n\n\trsibling = /[+~]/,\n\trescape = /\'|\\\\/g,\n\n\t// CSS escapes http://www.w3.org/TR/CSS21/syndata.html#escaped-characters\n\trunescape = new RegExp( "\\\\\\\\([\\\\da-f]{1,6}" + whitespace + "?|(" + whitespace + ")|.)", "ig" ),\n\tfunescape = function( _, escaped, escapedWhitespace ) {\n\t\tvar high = "0x" + escaped - 0x10000;\n\t\t// NaN means non-codepoint\n\t\t// Support: Firefox<24\n\t\t// Workaround erroneous numeric interpretation of +"0x"\n\t\treturn high !== high || escapedWhitespace ?\n\t\t\tescaped :\n\t\t\thigh < 0 ?\n\t\t\t\t// BMP codepoint\n\t\t\t\tString.fromCharCode( high + 0x10000 ) :\n\t\t\t\t// Supplemental Plane codepoint (surrogate pair)\n\t\t\t\tString.fromCharCode( high >> 10 | 0xD800, high & 0x3FF | 0xDC00 );\n\t},\n\n\t// Used for iframes\n\t// See setDocument()\n\t// Removing the function wrapper causes a "Permission Denied"\n\t// error in IE\n\tunloadHandler = function() {\n\t\tsetDocument();\n\t};\n\n// Optimize for push.apply( _, NodeList )\ntry {\n\tpush.apply(\n\t\t(arr = slice.call( preferredDoc.childNodes )),\n\t\tpreferredDoc.childNodes\n\t);\n\t// Support: Android<4.0\n\t// Detect silently failing push.apply\n\tarr[ preferredDoc.childNodes.length ].nodeType;\n} catch ( e ) {\n\tpush = { apply: arr.length ?\n\n\t\t// Leverage slice if possible\n\t\tfunction( target, els ) {\n\t\t\tpush_native.apply( target, slice.call(els) );\n\t\t} :\n\n\t\t// Support: IE<9\n\t\t// Otherwise append directly\n\t\tfunction( target, els ) {\n\t\t\tvar j = target.length,\n\t\t\t\ti = 0;\n\t\t\t// Can\'t trust NodeList.length\n\t\t\twhile ( (target[j++] = els[i++]) ) {}\n\t\t\ttarget.length = j - 1;\n\t\t}\n\t};\n}\n\nfunction Sizzle( selector, context, results, seed ) {\n\tvar match, elem, m, nodeType,\n\t\t// QSA vars\n\t\ti, groups, old, nid, newContext, newSelector;\n\n\tif ( ( context ? context.ownerDocument || context : preferredDoc ) !== document ) {\n\t\tsetDocument( context );\n\t}\n\n\tcontext = context || document;\n\tresults = results || [];\n\tnodeType = context.nodeType;\n\n\tif ( typeof selector !== "string" || !selector ||\n\t\tnodeType !== 1 && nodeType !== 9 && nodeType !== 11 ) {\n\n\t\treturn results;\n\t}\n\n\tif ( !seed && documentIsHTML ) {\n\n\t\t// Try to shortcut find operations when possible (e.g., not under DocumentFragment)\n\t\tif ( nodeType !== 11 && (match = rquickExpr.exec( selector )) ) {\n\t\t\t// Speed-up: Sizzle("#ID")\n\t\t\tif ( (m = match[1]) ) {\n\t\t\t\tif ( nodeType === 9 ) {\n\t\t\t\t\telem = context.getElementById( m );\n\t\t\t\t\t// Check parentNode to catch when Blackberry 4.6 returns\n\t\t\t\t\t// nodes that are no longer in the document (jQuery #6963)\n\t\t\t\t\tif ( elem && elem.parentNode ) {\n\t\t\t\t\t\t// Handle the case where IE, Opera, and Webkit return items\n\t\t\t\t\t\t// by name instead of ID\n\t\t\t\t\t\tif ( elem.id === m ) {\n\t\t\t\t\t\t\tresults.push( elem );\n\t\t\t\t\t\t\treturn results;\n\t\t\t\t\t\t}\n\t\t\t\t\t} else {\n\t\t\t\t\t\treturn results;\n\t\t\t\t\t}\n\t\t\t\t} else {\n\t\t\t\t\t// Context is not a document\n\t\t\t\t\tif ( context.ownerDocument && (elem = context.ownerDocument.getElementById( m )) &&\n\t\t\t\t\t\tcontains( context, elem ) && elem.id === m ) {\n\t\t\t\t\t\tresults.push( elem );\n\t\t\t\t\t\treturn results;\n\t\t\t\t\t}\n\t\t\t\t}\n\n\t\t\t// Speed-up: Sizzle("TAG")\n\t\t\t} else if ( match[2] ) {\n\t\t\t\tpush.apply( results, context.getElementsByTagName( selector ) );\n\t\t\t\treturn results;\n\n\t\t\t// Speed-up: Sizzle(".CLASS")\n\t\t\t} else if ( (m = match[3]) && support.getElementsByClassName ) {\n\t\t\t\tpush.apply( results, context.getElementsByClassName( m ) );\n\t\t\t\treturn results;\n\t\t\t}\n\t\t}\n\n\t\t// QSA path\n\t\tif ( support.qsa && (!rbuggyQSA || !rbuggyQSA.test( selector )) ) {\n\t\t\tnid = old = expando;\n\t\t\tnewContext = context;\n\t\t\tnewSelector = nodeType !== 1 && selector;\n\n\t\t\t// qSA works strangely on Element-rooted queries\n\t\t\t// We can work around this by specifying an extra ID on the root\n\t\t\t// and working up from there (Thanks to Andrew Dupont for the technique)\n\t\t\t// IE 8 doesn\'t work on object elements\n\t\t\tif ( nodeType === 1 && context.nodeName.toLowerCase() !== "object" ) {\n\t\t\t\tgroups = tokenize( selector );\n\n\t\t\t\tif ( (old = context.getAttribute("id")) ) {\n\t\t\t\t\tnid = old.replace( rescape, "\\\\$&" );\n\t\t\t\t} else {\n\t\t\t\t\tcontext.setAttribute( "id", nid );\n\t\t\t\t}\n\t\t\t\tnid = "[id=\'" + nid + "\'] ";\n\n\t\t\t\ti = groups.length;\n\t\t\t\twhile ( i-- ) {\n\t\t\t\t\tgroups[i] = nid + toSelector( groups[i] );\n\t\t\t\t}\n\t\t\t\tnewContext = rsibling.test( selector ) && testContext( context.parentNode ) || context;\n\t\t\t\tnewSelector = groups.join(",");\n\t\t\t}\n\n\t\t\tif ( newSelector ) {\n\t\t\t\ttry {\n\t\t\t\t\tpush.apply( results,\n\t\t\t\t\t\tnewContext.querySelectorAll( newSelector )\n\t\t\t\t\t);\n\t\t\t\t\treturn results;\n\t\t\t\t} catch(qsaError) {\n\t\t\t\t} finally {\n\t\t\t\t\tif ( !old ) {\n\t\t\t\t\t\tcontext.removeAttribute("id");\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n\n\t// All others\n\treturn select( selector.replace( rtrim, "$1" ), context, results, seed );\n}\n\n/**\n * Create key-value caches of limited size\n * @returns {Function(string, Object)} Returns the Object data after storing it on itself with\n *\tproperty name the (space-suffixed) string and (if the cache is larger than Expr.cacheLength)\n *\tdeleting the oldest entry\n */\nfunction createCache() {\n\tvar keys = [];\n\n\tfunction cache( key, value ) {\n\t\t// Use (key + " ") to avoid collision with native prototype properties (see Issue #157)\n\t\tif ( keys.push( key + " " ) > Expr.cacheLength ) {\n\t\t\t// Only keep the most recent entries\n\t\t\tdelete cache[ keys.shift() ];\n\t\t}\n\t\treturn (cache[ key + " " ] = value);\n\t}\n\treturn cache;\n}\n\n/**\n * Mark a function for special use by Sizzle\n * @param {Function} fn The function to mark\n */\nfunction markFunction( fn ) {\n\tfn[ expando ] = true;\n\treturn fn;\n}\n\n/**\n * Support testing using an element\n * @param {Function} fn Passed the created div and expects a boolean result\n */\nfunction assert( fn ) {\n\tvar div = document.createElement("div");\n\n\ttry {\n\t\treturn !!fn( div );\n\t} catch (e) {\n\t\treturn false;\n\t} finally {\n\t\t// Remove from its parent by default\n\t\tif ( div.parentNode ) {\n\t\t\tdiv.parentNode.removeChild( div );\n\t\t}\n\t\t// release memory in IE\n\t\tdiv = null;\n\t}\n}\n\n/**\n * Adds the same handler for all of the specified attrs\n * @param {String} attrs Pipe-separated list of attributes\n * @param {Function} handler The method that will be applied\n */\nfunction addHandle( attrs, handler ) {\n\tvar arr = attrs.split("|"),\n\t\ti = attrs.length;\n\n\twhile ( i-- ) {\n\t\tExpr.attrHandle[ arr[i] ] = handler;\n\t}\n}\n\n/**\n * Checks document order of two siblings\n * @param {Element} a\n * @param {Element} b\n * @returns {Number} Returns less than 0 if a precedes b, greater than 0 if a follows b\n */\nfunction siblingCheck( a, b ) {\n\tvar cur = b && a,\n\t\tdiff = cur && a.nodeType === 1 && b.nodeType === 1 &&\n\t\t\t( ~b.sourceIndex || MAX_NEGATIVE ) -\n\t\t\t( ~a.sourceIndex || MAX_NEGATIVE );\n\n\t// Use IE sourceIndex if available on both nodes\n\tif ( diff ) {\n\t\treturn diff;\n\t}\n\n\t// Check if b follows a\n\tif ( cur ) {\n\t\twhile ( (cur = cur.nextSibling) ) {\n\t\t\tif ( cur === b ) {\n\t\t\t\treturn -1;\n\t\t\t}\n\t\t}\n\t}\n\n\treturn a ? 1 : -1;\n}\n\n/**\n * Returns a function to use in pseudos for input types\n * @param {String} type\n */\nfunction createInputPseudo( type ) {\n\treturn function( elem ) {\n\t\tvar name = elem.nodeName.toLowerCase();\n\t\treturn name === "input" && elem.type === type;\n\t};\n}\n\n/**\n * Returns a function to use in pseudos for buttons\n * @param {String} type\n */\nfunction createButtonPseudo( type ) {\n\treturn function( elem ) {\n\t\tvar name = elem.nodeName.toLowerCase();\n\t\treturn (name === "input" || name === "button") && elem.type === type;\n\t};\n}\n\n/**\n * Returns a function to use in pseudos for positionals\n * @param {Function} fn\n */\nfunction createPositionalPseudo( fn ) {\n\treturn markFunction(function( argument ) {\n\t\targument = +argument;\n\t\treturn markFunction(function( seed, matches ) {\n\t\t\tvar j,\n\t\t\t\tmatchIndexes = fn( [], seed.length, argument ),\n\t\t\t\ti = matchIndexes.length;\n\n\t\t\t// Match elements found at the specified indexes\n\t\t\twhile ( i-- ) {\n\t\t\t\tif ( seed[ (j = matchIndexes[i]) ] ) {\n\t\t\t\t\tseed[j] = !(matches[j] = seed[j]);\n\t\t\t\t}\n\t\t\t}\n\t\t});\n\t});\n}\n\n/**\n * Checks a node for validity as a Sizzle context\n * @param {Element|Object=} context\n * @returns {Element|Object|Boolean} The input node if acceptable, otherwise a falsy value\n */\nfunction testContext( context ) {\n\treturn context && typeof context.getElementsByTagName !== "undefined" && context;\n}\n\n// Expose support vars for convenience\nsupport = Sizzle.support = {};\n\n/**\n * Detects XML nodes\n * @param {Element|Object} elem An element or a document\n * @returns {Boolean} True iff elem is a non-HTML XML node\n */\nisXML = Sizzle.isXML = function( elem ) {\n\t// documentElement is verified for cases where it doesn\'t yet exist\n\t// (such as loading iframes in IE - #4833)\n\tvar documentElement = elem && (elem.ownerDocument || elem).documentElement;\n\treturn documentElement ? documentElement.nodeName !== "HTML" : false;\n};\n\n/**\n * Sets document-related variables once based on the current document\n * @param {Element|Object} [doc] An element or document object to use to set the document\n * @returns {Object} Returns the current document\n */\nsetDocument = Sizzle.setDocument = function( node ) {\n\tvar hasCompare, parent,\n\t\tdoc = node ? node.ownerDocument || node : preferredDoc;\n\n\t// If no document and documentElement is available, return\n\tif ( doc === document || doc.nodeType !== 9 || !doc.documentElement ) {\n\t\treturn document;\n\t}\n\n\t// Set our document\n\tdocument = doc;\n\tdocElem = doc.documentElement;\n\tparent = doc.defaultView;\n\n\t// Support: IE>8\n\t// If iframe document is assigned to "document" variable and if iframe has been reloaded,\n\t// IE will throw "permission denied" error when accessing "document" variable, see jQuery #13936\n\t// IE6-8 do not support the defaultView property so parent will be undefined\n\tif ( parent && parent !== parent.top ) {\n\t\t// IE11 does not have attachEvent, so all must suffer\n\t\tif ( parent.addEventListener ) {\n\t\t\tparent.addEventListener( "unload", unloadHandler, false );\n\t\t} else if ( parent.attachEvent ) {\n\t\t\tparent.attachEvent( "onunload", unloadHandler );\n\t\t}\n\t}\n\n\t/* Support tests\n\t---------------------------------------------------------------------- */\n\tdocumentIsHTML = !isXML( doc );\n\n\t/* Attributes\n\t---------------------------------------------------------------------- */\n\n\t// Support: IE<8\n\t// Verify that getAttribute really returns attributes and not properties\n\t// (excepting IE8 booleans)\n\tsupport.attributes = assert(function( div ) {\n\t\tdiv.className = "i";\n\t\treturn !div.getAttribute("className");\n\t});\n\n\t/* getElement(s)By*\n\t---------------------------------------------------------------------- */\n\n\t// Check if getElementsByTagName("*") returns only elements\n\tsupport.getElementsByTagName = assert(function( div ) {\n\t\tdiv.appendChild( doc.createComment("") );\n\t\treturn !div.getElementsByTagName("*").length;\n\t});\n\n\t// Support: IE<9\n\tsupport.getElementsByClassName = rnative.test( doc.getElementsByClassName );\n\n\t// Support: IE<10\n\t// Check if getElementById returns elements by name\n\t// The broken getElementById methods don\'t pick up programatically-set names,\n\t// so use a roundabout getElementsByName test\n\tsupport.getById = assert(function( div ) {\n\t\tdocElem.appendChild( div ).id = expando;\n\t\treturn !doc.getElementsByName || !doc.getElementsByName( expando ).length;\n\t});\n\n\t// ID find and filter\n\tif ( support.getById ) {\n\t\tExpr.find["ID"] = function( id, context ) {\n\t\t\tif ( typeof context.getElementById !== "undefined" && documentIsHTML ) {\n\t\t\t\tvar m = context.getElementById( id );\n\t\t\t\t// Check parentNode to catch when Blackberry 4.6 returns\n\t\t\t\t// nodes that are no longer in the document #6963\n\t\t\t\treturn m && m.parentNode ? [ m ] : [];\n\t\t\t}\n\t\t};\n\t\tExpr.filter["ID"] = function( id ) {\n\t\t\tvar attrId = id.replace( runescape, funescape );\n\t\t\treturn function( elem ) {\n\t\t\t\treturn elem.getAttribute("id") === attrId;\n\t\t\t};\n\t\t};\n\t} else {\n\t\t// Support: IE6/7\n\t\t// getElementById is not reliable as a find shortcut\n\t\tdelete Expr.find["ID"];\n\n\t\tExpr.filter["ID"] =  function( id ) {\n\t\t\tvar attrId = id.replace( runescape, funescape );\n\t\t\treturn function( elem ) {\n\t\t\t\tvar node = typeof elem.getAttributeNode !== "undefined" && elem.getAttributeNode("id");\n\t\t\t\treturn node && node.value === attrId;\n\t\t\t};\n\t\t};\n\t}\n\n\t// Tag\n\tExpr.find["TAG"] = support.getElementsByTagName ?\n\t\tfunction( tag, context ) {\n\t\t\tif ( typeof context.getElementsByTagName !== "undefined" ) {\n\t\t\t\treturn context.getElementsByTagName( tag );\n\n\t\t\t// DocumentFragment nodes don\'t have gEBTN\n\t\t\t} else if ( support.qsa ) {\n\t\t\t\treturn context.querySelectorAll( tag );\n\t\t\t}\n\t\t} :\n\n\t\tfunction( tag, context ) {\n\t\t\tvar elem,\n\t\t\t\ttmp = [],\n\t\t\t\ti = 0,\n\t\t\t\t// By happy coincidence, a (broken) gEBTN appears on DocumentFragment nodes too\n\t\t\t\tresults = context.getElementsByTagName( tag );\n\n\t\t\t// Filter out possible comments\n\t\t\tif ( tag === "*" ) {\n\t\t\t\twhile ( (elem = results[i++]) ) {\n\t\t\t\t\tif ( elem.nodeType === 1 ) {\n\t\t\t\t\t\ttmp.push( elem );\n\t\t\t\t\t}\n\t\t\t\t}\n\n\t\t\t\treturn tmp;\n\t\t\t}\n\t\t\treturn results;\n\t\t};\n\n\t// Class\n\tExpr.find["CLASS"] = support.getElementsByClassName && function( className, context ) {\n\t\tif ( documentIsHTML ) {\n\t\t\treturn context.getElementsByClassName( className );\n\t\t}\n\t};\n\n\t/* QSA/matchesSelector\n\t---------------------------------------------------------------------- */\n\n\t// QSA and matchesSelector support\n\n\t// matchesSelector(:active) reports false when true (IE9/Opera 11.5)\n\trbuggyMatches = [];\n\n\t// qSa(:focus) reports false when true (Chrome 21)\n\t// We allow this because of a bug in IE8/9 that throws an error\n\t// whenever `document.activeElement` is accessed on an iframe\n\t// So, we allow :focus to pass through QSA all the time to avoid the IE error\n\t// See http://bugs.jquery.com/ticket/13378\n\trbuggyQSA = [];\n\n\tif ( (support.qsa = rnative.test( doc.querySelectorAll )) ) {\n\t\t// Build QSA regex\n\t\t// Regex strategy adopted from Diego Perini\n\t\tassert(function( div ) {\n\t\t\t// Select is set to empty string on purpose\n\t\t\t// This is to test IE\'s treatment of not explicitly\n\t\t\t// setting a boolean content attribute,\n\t\t\t// since its presence should be enough\n\t\t\t// http://bugs.jquery.com/ticket/12359\n\t\t\tdocElem.appendChild( div ).innerHTML = "<a id=\'" + expando + "\'></a>" +\n\t\t\t\t"<select id=\'" + expando + "-\\f]\' msallowcapture=\'\'>" +\n\t\t\t\t"<option selected=\'\'></option></select>";\n\n\t\t\t// Support: IE8, Opera 11-12.16\n\t\t\t// Nothing should be selected when empty strings follow ^= or $= or *=\n\t\t\t// The test attribute must be unknown in Opera but "safe" for WinRT\n\t\t\t// http://msdn.microsoft.com/en-us/library/ie/hh465388.aspx#attribute_section\n\t\t\tif ( div.querySelectorAll("[msallowcapture^=\'\']").length ) {\n\t\t\t\trbuggyQSA.push( "[*^$]=" + whitespace + "*(?:\'\'|\\"\\")" );\n\t\t\t}\n\n\t\t\t// Support: IE8\n\t\t\t// Boolean attributes and "value" are not treated correctly\n\t\t\tif ( !div.querySelectorAll("[selected]").length ) {\n\t\t\t\trbuggyQSA.push( "\\\\[" + whitespace + "*(?:value|" + booleans + ")" );\n\t\t\t}\n\n\t\t\t// Support: Chrome<29, Android<4.2+, Safari<7.0+, iOS<7.0+, PhantomJS<1.9.7+\n\t\t\tif ( !div.querySelectorAll( "[id~=" + expando + "-]" ).length ) {\n\t\t\t\trbuggyQSA.push("~=");\n\t\t\t}\n\n\t\t\t// Webkit/Opera - :checked should return selected option elements\n\t\t\t// http://www.w3.org/TR/2011/REC-css3-selectors-20110929/#checked\n\t\t\t// IE8 throws error here and will not see later tests\n\t\t\tif ( !div.querySelectorAll(":checked").length ) {\n\t\t\t\trbuggyQSA.push(":checked");\n\t\t\t}\n\n\t\t\t// Support: Safari 8+, iOS 8+\n\t\t\t// https://bugs.webkit.org/show_bug.cgi?id=136851\n\t\t\t// In-page `selector#id sibing-combinator selector` fails\n\t\t\tif ( !div.querySelectorAll( "a#" + expando + "+*" ).length ) {\n\t\t\t\trbuggyQSA.push(".#.+[+~]");\n\t\t\t}\n\t\t});\n\n\t\tassert(function( div ) {\n\t\t\t// Support: Windows 8 Native Apps\n\t\t\t// The type and name attributes are restricted during .innerHTML assignment\n\t\t\tvar input = doc.createElement("input");\n\t\t\tinput.setAttribute( "type", "hidden" );\n\t\t\tdiv.appendChild( input ).setAttribute( "name", "D" );\n\n\t\t\t// Support: IE8\n\t\t\t// Enforce case-sensitivity of name attribute\n\t\t\tif ( div.querySelectorAll("[name=d]").length ) {\n\t\t\t\trbuggyQSA.push( "name" + whitespace + "*[*^$|!~]?=" );\n\t\t\t}\n\n\t\t\t// FF 3.5 - :enabled/:disabled and hidden elements (hidden elements are still enabled)\n\t\t\t// IE8 throws error here and will not see later tests\n\t\t\tif ( !div.querySelectorAll(":enabled").length ) {\n\t\t\t\trbuggyQSA.push( ":enabled", ":disabled" );\n\t\t\t}\n\n\t\t\t// Opera 10-11 does not throw on post-comma invalid pseudos\n\t\t\tdiv.querySelectorAll("*,:x");\n\t\t\trbuggyQSA.push(",.*:");\n\t\t});\n\t}\n\n\tif ( (support.matchesSelector = rnative.test( (matches = docElem.matches ||\n\t\tdocElem.webkitMatchesSelector ||\n\t\tdocElem.mozMatchesSelector ||\n\t\tdocElem.oMatchesSelector ||\n\t\tdocElem.msMatchesSelector) )) ) {\n\n\t\tassert(function( div ) {\n\t\t\t// Check to see if it\'s possible to do matchesSelector\n\t\t\t// on a disconnected node (IE 9)\n\t\t\tsupport.disconnectedMatch = matches.call( div, "div" );\n\n\t\t\t// This should fail with an exception\n\t\t\t// Gecko does not error, returns false instead\n\t\t\tmatches.call( div, "[s!=\'\']:x" );\n\t\t\trbuggyMatches.push( "!=", pseudos );\n\t\t});\n\t}\n\n\trbuggyQSA = rbuggyQSA.length && new RegExp( rbuggyQSA.join("|") );\n\trbuggyMatches = rbuggyMatches.length && new RegExp( rbuggyMatches.join("|") );\n\n\t/* Contains\n\t---------------------------------------------------------------------- */\n\thasCompare = rnative.test( docElem.compareDocumentPosition );\n\n\t// Element contains another\n\t// Purposefully does not implement inclusive descendent\n\t// As in, an element does not contain itself\n\tcontains = hasCompare || rnative.test( docElem.contains ) ?\n\t\tfunction( a, b ) {\n\t\t\tvar adown = a.nodeType === 9 ? a.documentElement : a,\n\t\t\t\tbup = b && b.parentNode;\n\t\t\treturn a === bup || !!( bup && bup.nodeType === 1 && (\n\t\t\t\tadown.contains ?\n\t\t\t\t\tadown.contains( bup ) :\n\t\t\t\t\ta.compareDocumentPosition && a.compareDocumentPosition( bup ) & 16\n\t\t\t));\n\t\t} :\n\t\tfunction( a, b ) {\n\t\t\tif ( b ) {\n\t\t\t\twhile ( (b = b.parentNode) ) {\n\t\t\t\t\tif ( b === a ) {\n\t\t\t\t\t\treturn true;\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t}\n\t\t\treturn false;\n\t\t};\n\n\t/* Sorting\n\t---------------------------------------------------------------------- */\n\n\t// Document order sorting\n\tsortOrder = hasCompare ?\n\tfunction( a, b ) {\n\n\t\t// Flag for duplicate removal\n\t\tif ( a === b ) {\n\t\t\thasDuplicate = true;\n\t\t\treturn 0;\n\t\t}\n\n\t\t// Sort on method existence if only one input has compareDocumentPosition\n\t\tvar compare = !a.compareDocumentPosition - !b.compareDocumentPosition;\n\t\tif ( compare ) {\n\t\t\treturn compare;\n\t\t}\n\n\t\t// Calculate position if both inputs belong to the same document\n\t\tcompare = ( a.ownerDocument || a ) === ( b.ownerDocument || b ) ?\n\t\t\ta.compareDocumentPosition( b ) :\n\n\t\t\t// Otherwise we know they are disconnected\n\t\t\t1;\n\n\t\t// Disconnected nodes\n\t\tif ( compare & 1 ||\n\t\t\t(!support.sortDetached && b.compareDocumentPosition( a ) === compare) ) {\n\n\t\t\t// Choose the first element that is related to our preferred document\n\t\t\tif ( a === doc || a.ownerDocument === preferredDoc && contains(preferredDoc, a) ) {\n\t\t\t\treturn -1;\n\t\t\t}\n\t\t\tif ( b === doc || b.ownerDocument === preferredDoc && contains(preferredDoc, b) ) {\n\t\t\t\treturn 1;\n\t\t\t}\n\n\t\t\t// Maintain original order\n\t\t\treturn sortInput ?\n\t\t\t\t( indexOf( sortInput, a ) - indexOf( sortInput, b ) ) :\n\t\t\t\t0;\n\t\t}\n\n\t\treturn compare & 4 ? -1 : 1;\n\t} :\n\tfunction( a, b ) {\n\t\t// Exit early if the nodes are identical\n\t\tif ( a === b ) {\n\t\t\thasDuplicate = true;\n\t\t\treturn 0;\n\t\t}\n\n\t\tvar cur,\n\t\t\ti = 0,\n\t\t\taup = a.parentNode,\n\t\t\tbup = b.parentNode,\n\t\t\tap = [ a ],\n\t\t\tbp = [ b ];\n\n\t\t// Parentless nodes are either documents or disconnected\n\t\tif ( !aup || !bup ) {\n\t\t\treturn a === doc ? -1 :\n\t\t\t\tb === doc ? 1 :\n\t\t\t\taup ? -1 :\n\t\t\t\tbup ? 1 :\n\t\t\t\tsortInput ?\n\t\t\t\t( indexOf( sortInput, a ) - indexOf( sortInput, b ) ) :\n\t\t\t\t0;\n\n\t\t// If the nodes are siblings, we can do a quick check\n\t\t} else if ( aup === bup ) {\n\t\t\treturn siblingCheck( a, b );\n\t\t}\n\n\t\t// Otherwise we need full lists of their ancestors for comparison\n\t\tcur = a;\n\t\twhile ( (cur = cur.parentNode) ) {\n\t\t\tap.unshift( cur );\n\t\t}\n\t\tcur = b;\n\t\twhile ( (cur = cur.parentNode) ) {\n\t\t\tbp.unshift( cur );\n\t\t}\n\n\t\t// Walk down the tree looking for a discrepancy\n\t\twhile ( ap[i] === bp[i] ) {\n\t\t\ti++;\n\t\t}\n\n\t\treturn i ?\n\t\t\t// Do a sibling check if the nodes have a common ancestor\n\t\t\tsiblingCheck( ap[i], bp[i] ) :\n\n\t\t\t// Otherwise nodes in our document sort first\n\t\t\tap[i] === preferredDoc ? -1 :\n\t\t\tbp[i] === preferredDoc ? 1 :\n\t\t\t0;\n\t};\n\n\treturn doc;\n};\n\nSizzle.matches = function( expr, elements ) {\n\treturn Sizzle( expr, null, null, elements );\n};\n\nSizzle.matchesSelector = function( elem, expr ) {\n\t// Set document vars if needed\n\tif ( ( elem.ownerDocument || elem ) !== document ) {\n\t\tsetDocument( elem );\n\t}\n\n\t// Make sure that attribute selectors are quoted\n\texpr = expr.replace( rattributeQuotes, "=\'$1\']" );\n\n\tif ( support.matchesSelector && documentIsHTML &&\n\t\t( !rbuggyMatches || !rbuggyMatches.test( expr ) ) &&\n\t\t( !rbuggyQSA     || !rbuggyQSA.test( expr ) ) ) {\n\n\t\ttry {\n\t\t\tvar ret = matches.call( elem, expr );\n\n\t\t\t// IE 9\'s matchesSelector returns false on disconnected nodes\n\t\t\tif ( ret || support.disconnectedMatch ||\n\t\t\t\t\t// As well, disconnected nodes are said to be in a document\n\t\t\t\t\t// fragment in IE 9\n\t\t\t\t\telem.document && elem.document.nodeType !== 11 ) {\n\t\t\t\treturn ret;\n\t\t\t}\n\t\t} catch (e) {}\n\t}\n\n\treturn Sizzle( expr, document, null, [ elem ] ).length > 0;\n};\n\nSizzle.contains = function( context, elem ) {\n\t// Set document vars if needed\n\tif ( ( context.ownerDocument || context ) !== document ) {\n\t\tsetDocument( context );\n\t}\n\treturn contains( context, elem );\n};\n\nSizzle.attr = function( elem, name ) {\n\t// Set document vars if needed\n\tif ( ( elem.ownerDocument || elem ) !== document ) {\n\t\tsetDocument( elem );\n\t}\n\n\tvar fn = Expr.attrHandle[ name.toLowerCase() ],\n\t\t// Don\'t get fooled by Object.prototype properties (jQuery #13807)\n\t\tval = fn && hasOwn.call( Expr.attrHandle, name.toLowerCase() ) ?\n\t\t\tfn( elem, name, !documentIsHTML ) :\n\t\t\tundefined;\n\n\treturn val !== undefined ?\n\t\tval :\n\t\tsupport.attributes || !documentIsHTML ?\n\t\t\telem.getAttribute( name ) :\n\t\t\t(val = elem.getAttributeNode(name)) && val.specified ?\n\t\t\t\tval.value :\n\t\t\t\tnull;\n};\n\nSizzle.error = function( msg ) {\n\tthrow new Error( "Syntax error, unrecognized expression: " + msg );\n};\n\n/**\n * Document sorting and removing duplicates\n * @param {ArrayLike} results\n */\nSizzle.uniqueSort = function( results ) {\n\tvar elem,\n\t\tduplicates = [],\n\t\tj = 0,\n\t\ti = 0;\n\n\t// Unless we *know* we can detect duplicates, assume their presence\n\thasDuplicate = !support.detectDuplicates;\n\tsortInput = !support.sortStable && results.slice( 0 );\n\tresults.sort( sortOrder );\n\n\tif ( hasDuplicate ) {\n\t\twhile ( (elem = results[i++]) ) {\n\t\t\tif ( elem === results[ i ] ) {\n\t\t\t\tj = duplicates.push( i );\n\t\t\t}\n\t\t}\n\t\twhile ( j-- ) {\n\t\t\tresults.splice( duplicates[ j ], 1 );\n\t\t}\n\t}\n\n\t// Clear input after sorting to release objects\n\t// See https://github.com/jquery/sizzle/pull/225\n\tsortInput = null;\n\n\treturn results;\n};\n\n/**\n * Utility function for retrieving the text value of an array of DOM nodes\n * @param {Array|Element} elem\n */\ngetText = Sizzle.getText = function( elem ) {\n\tvar node,\n\t\tret = "",\n\t\ti = 0,\n\t\tnodeType = elem.nodeType;\n\n\tif ( !nodeType ) {\n\t\t// If no nodeType, this is expected to be an array\n\t\twhile ( (node = elem[i++]) ) {\n\t\t\t// Do not traverse comment nodes\n\t\t\tret += getText( node );\n\t\t}\n\t} else if ( nodeType === 1 || nodeType === 9 || nodeType === 11 ) {\n\t\t// Use textContent for elements\n\t\t// innerText usage removed for consistency of new lines (jQuery #11153)\n\t\tif ( typeof elem.textContent === "string" ) {\n\t\t\treturn elem.textContent;\n\t\t} else {\n\t\t\t// Traverse its children\n\t\t\tfor ( elem = elem.firstChild; elem; elem = elem.nextSibling ) {\n\t\t\t\tret += getText( elem );\n\t\t\t}\n\t\t}\n\t} else if ( nodeType === 3 || nodeType === 4 ) {\n\t\treturn elem.nodeValue;\n\t}\n\t// Do not include comment or processing instruction nodes\n\n\treturn ret;\n};\n\nExpr = Sizzle.selectors = {\n\n\t// Can be adjusted by the user\n\tcacheLength: 50,\n\n\tcreatePseudo: markFunction,\n\n\tmatch: matchExpr,\n\n\tattrHandle: {},\n\n\tfind: {},\n\n\trelative: {\n\t\t">": { dir: "parentNode", first: true },\n\t\t" ": { dir: "parentNode" },\n\t\t"+": { dir: "previousSibling", first: true },\n\t\t"~": { dir: "previousSibling" }\n\t},\n\n\tpreFilter: {\n\t\t"ATTR": function( match ) {\n\t\t\tmatch[1] = match[1].replace( runescape, funescape );\n\n\t\t\t// Move the given value to match[3] whether quoted or unquoted\n\t\t\tmatch[3] = ( match[3] || match[4] || match[5] || "" ).replace( runescape, funescape );\n\n\t\t\tif ( match[2] === "~=" ) {\n\t\t\t\tmatch[3] = " " + match[3] + " ";\n\t\t\t}\n\n\t\t\treturn match.slice( 0, 4 );\n\t\t},\n\n\t\t"CHILD": function( match ) {\n\t\t\t/* matches from matchExpr["CHILD"]\n\t\t\t\t1 type (only|nth|...)\n\t\t\t\t2 what (child|of-type)\n\t\t\t\t3 argument (even|odd|\\d*|\\d*n([+-]\\d+)?|...)\n\t\t\t\t4 xn-component of xn+y argument ([+-]?\\d*n|)\n\t\t\t\t5 sign of xn-component\n\t\t\t\t6 x of xn-component\n\t\t\t\t7 sign of y-component\n\t\t\t\t8 y of y-component\n\t\t\t*/\n\t\t\tmatch[1] = match[1].toLowerCase();\n\n\t\t\tif ( match[1].slice( 0, 3 ) === "nth" ) {\n\t\t\t\t// nth-* requires argument\n\t\t\t\tif ( !match[3] ) {\n\t\t\t\t\tSizzle.error( match[0] );\n\t\t\t\t}\n\n\t\t\t\t// numeric x and y parameters for Expr.filter.CHILD\n\t\t\t\t// remember that false/true cast respectively to 0/1\n\t\t\t\tmatch[4] = +( match[4] ? match[5] + (match[6] || 1) : 2 * ( match[3] === "even" || match[3] === "odd" ) );\n\t\t\t\tmatch[5] = +( ( match[7] + match[8] ) || match[3] === "odd" );\n\n\t\t\t// other types prohibit arguments\n\t\t\t} else if ( match[3] ) {\n\t\t\t\tSizzle.error( match[0] );\n\t\t\t}\n\n\t\t\treturn match;\n\t\t},\n\n\t\t"PSEUDO": function( match ) {\n\t\t\tvar excess,\n\t\t\t\tunquoted = !match[6] && match[2];\n\n\t\t\tif ( matchExpr["CHILD"].test( match[0] ) ) {\n\t\t\t\treturn null;\n\t\t\t}\n\n\t\t\t// Accept quoted arguments as-is\n\t\t\tif ( match[3] ) {\n\t\t\t\tmatch[2] = match[4] || match[5] || "";\n\n\t\t\t// Strip excess characters from unquoted arguments\n\t\t\t} else if ( unquoted && rpseudo.test( unquoted ) &&\n\t\t\t\t// Get excess from tokenize (recursively)\n\t\t\t\t(excess = tokenize( unquoted, true )) &&\n\t\t\t\t// advance to the next closing parenthesis\n\t\t\t\t(excess = unquoted.indexOf( ")", unquoted.length - excess ) - unquoted.length) ) {\n\n\t\t\t\t// excess is a negative index\n\t\t\t\tmatch[0] = match[0].slice( 0, excess );\n\t\t\t\tmatch[2] = unquoted.slice( 0, excess );\n\t\t\t}\n\n\t\t\t// Return only captures needed by the pseudo filter method (type and argument)\n\t\t\treturn match.slice( 0, 3 );\n\t\t}\n\t},\n\n\tfilter: {\n\n\t\t"TAG": function( nodeNameSelector ) {\n\t\t\tvar nodeName = nodeNameSelector.replace( runescape, funescape ).toLowerCase();\n\t\t\treturn nodeNameSelector === "*" ?\n\t\t\t\tfunction() { return true; } :\n\t\t\t\tfunction( elem ) {\n\t\t\t\t\treturn elem.nodeName && elem.nodeName.toLowerCase() === nodeName;\n\t\t\t\t};\n\t\t},\n\n\t\t"CLASS": function( className ) {\n\t\t\tvar pattern = classCache[ className + " " ];\n\n\t\t\treturn pattern ||\n\t\t\t\t(pattern = new RegExp( "(^|" + whitespace + ")" + className + "(" + whitespace + "|$)" )) &&\n\t\t\t\tclassCache( className, function( elem ) {\n\t\t\t\t\treturn pattern.test( typeof elem.className === "string" && elem.className || typeof elem.getAttribute !== "undefined" && elem.getAttribute("class") || "" );\n\t\t\t\t});\n\t\t},\n\n\t\t"ATTR": function( name, operator, check ) {\n\t\t\treturn function( elem ) {\n\t\t\t\tvar result = Sizzle.attr( elem, name );\n\n\t\t\t\tif ( result == null ) {\n\t\t\t\t\treturn operator === "!=";\n\t\t\t\t}\n\t\t\t\tif ( !operator ) {\n\t\t\t\t\treturn true;\n\t\t\t\t}\n\n\t\t\t\tresult += "";\n\n\t\t\t\treturn operator === "=" ? result === check :\n\t\t\t\t\toperator === "!=" ? result !== check :\n\t\t\t\t\toperator === "^=" ? check && result.indexOf( check ) === 0 :\n\t\t\t\t\toperator === "*=" ? check && result.indexOf( check ) > -1 :\n\t\t\t\t\toperator === "$=" ? check && result.slice( -check.length ) === check :\n\t\t\t\t\toperator === "~=" ? ( " " + result.replace( rwhitespace, " " ) + " " ).indexOf( check ) > -1 :\n\t\t\t\t\toperator === "|=" ? result === check || result.slice( 0, check.length + 1 ) === check + "-" :\n\t\t\t\t\tfalse;\n\t\t\t};\n\t\t},\n\n\t\t"CHILD": function( type, what, argument, first, last ) {\n\t\t\tvar simple = type.slice( 0, 3 ) !== "nth",\n\t\t\t\tforward = type.slice( -4 ) !== "last",\n\t\t\t\tofType = what === "of-type";\n\n\t\t\treturn first === 1 && last === 0 ?\n\n\t\t\t\t// Shortcut for :nth-*(n)\n\t\t\t\tfunction( elem ) {\n\t\t\t\t\treturn !!elem.parentNode;\n\t\t\t\t} :\n\n\t\t\t\tfunction( elem, context, xml ) {\n\t\t\t\t\tvar cache, outerCache, node, diff, nodeIndex, start,\n\t\t\t\t\t\tdir = simple !== forward ? "nextSibling" : "previousSibling",\n\t\t\t\t\t\tparent = elem.parentNode,\n\t\t\t\t\t\tname = ofType && elem.nodeName.toLowerCase(),\n\t\t\t\t\t\tuseCache = !xml && !ofType;\n\n\t\t\t\t\tif ( parent ) {\n\n\t\t\t\t\t\t// :(first|last|only)-(child|of-type)\n\t\t\t\t\t\tif ( simple ) {\n\t\t\t\t\t\t\twhile ( dir ) {\n\t\t\t\t\t\t\t\tnode = elem;\n\t\t\t\t\t\t\t\twhile ( (node = node[ dir ]) ) {\n\t\t\t\t\t\t\t\t\tif ( ofType ? node.nodeName.toLowerCase() === name : node.nodeType === 1 ) {\n\t\t\t\t\t\t\t\t\t\treturn false;\n\t\t\t\t\t\t\t\t\t}\n\t\t\t\t\t\t\t\t}\n\t\t\t\t\t\t\t\t// Reverse direction for :only-* (if we haven\'t yet done so)\n\t\t\t\t\t\t\t\tstart = dir = type === "only" && !start && "nextSibling";\n\t\t\t\t\t\t\t}\n\t\t\t\t\t\t\treturn true;\n\t\t\t\t\t\t}\n\n\t\t\t\t\t\tstart = [ forward ? parent.firstChild : parent.lastChild ];\n\n\t\t\t\t\t\t// non-xml :nth-child(...) stores cache data on `parent`\n\t\t\t\t\t\tif ( forward && useCache ) {\n\t\t\t\t\t\t\t// Seek `elem` from a previously-cached index\n\t\t\t\t\t\t\touterCache = parent[ expando ] || (parent[ expando ] = {});\n\t\t\t\t\t\t\tcache = outerCache[ type ] || [];\n\t\t\t\t\t\t\tnodeIndex = cache[0] === dirruns && cache[1];\n\t\t\t\t\t\t\tdiff = cache[0] === dirruns && cache[2];\n\t\t\t\t\t\t\tnode = nodeIndex && parent.childNodes[ nodeIndex ];\n\n\t\t\t\t\t\t\twhile ( (node = ++nodeIndex && node && node[ dir ] ||\n\n\t\t\t\t\t\t\t\t// Fallback to seeking `elem` from the start\n\t\t\t\t\t\t\t\t(diff = nodeIndex = 0) || start.pop()) ) {\n\n\t\t\t\t\t\t\t\t// When found, cache indexes on `parent` and break\n\t\t\t\t\t\t\t\tif ( node.nodeType === 1 && ++diff && node === elem ) {\n\t\t\t\t\t\t\t\t\touterCache[ type ] = [ dirruns, nodeIndex, diff ];\n\t\t\t\t\t\t\t\t\tbreak;\n\t\t\t\t\t\t\t\t}\n\t\t\t\t\t\t\t}\n\n\t\t\t\t\t\t// Use previously-cached element index if available\n\t\t\t\t\t\t} else if ( useCache && (cache = (elem[ expando ] || (elem[ expando ] = {}))[ type ]) && cache[0] === dirruns ) {\n\t\t\t\t\t\t\tdiff = cache[1];\n\n\t\t\t\t\t\t// xml :nth-child(...) or :nth-last-child(...) or :nth(-last)?-of-type(...)\n\t\t\t\t\t\t} else {\n\t\t\t\t\t\t\t// Use the same loop as above to seek `elem` from the start\n\t\t\t\t\t\t\twhile ( (node = ++nodeIndex && node && node[ dir ] ||\n\t\t\t\t\t\t\t\t(diff = nodeIndex = 0) || start.pop()) ) {\n\n\t\t\t\t\t\t\t\tif ( ( ofType ? node.nodeName.toLowerCase() === name : node.nodeType === 1 ) && ++diff ) {\n\t\t\t\t\t\t\t\t\t// Cache the index of each encountered element\n\t\t\t\t\t\t\t\t\tif ( useCache ) {\n\t\t\t\t\t\t\t\t\t\t(node[ expando ] || (node[ expando ] = {}))[ type ] = [ dirruns, diff ];\n\t\t\t\t\t\t\t\t\t}\n\n\t\t\t\t\t\t\t\t\tif ( node === elem ) {\n\t\t\t\t\t\t\t\t\t\tbreak;\n\t\t\t\t\t\t\t\t\t}\n\t\t\t\t\t\t\t\t}\n\t\t\t\t\t\t\t}\n\t\t\t\t\t\t}\n\n\t\t\t\t\t\t// Incorporate the offset, then check against cycle size\n\t\t\t\t\t\tdiff -= last;\n\t\t\t\t\t\treturn diff === first || ( diff % first === 0 && diff / first >= 0 );\n\t\t\t\t\t}\n\t\t\t\t};\n\t\t},\n\n\t\t"PSEUDO": function( pseudo, argument ) {\n\t\t\t// pseudo-class names are case-insensitive\n\t\t\t// http://www.w3.org/TR/selectors/#pseudo-classes\n\t\t\t// Prioritize by case sensitivity in case custom pseudos are added with uppercase letters\n\t\t\t// Remember that setFilters inherits from pseudos\n\t\t\tvar args,\n\t\t\t\tfn = Expr.pseudos[ pseudo ] || Expr.setFilters[ pseudo.toLowerCase() ] ||\n\t\t\t\t\tSizzle.error( "unsupported pseudo: " + pseudo );\n\n\t\t\t// The user may use createPseudo to indicate that\n\t\t\t// arguments are needed to create the filter function\n\t\t\t// just as Sizzle does\n\t\t\tif ( fn[ expando ] ) {\n\t\t\t\treturn fn( argument );\n\t\t\t}\n\n\t\t\t// But maintain support for old signatures\n\t\t\tif ( fn.length > 1 ) {\n\t\t\t\targs = [ pseudo, pseudo, "", argument ];\n\t\t\t\treturn Expr.setFilters.hasOwnProperty( pseudo.toLowerCase() ) ?\n\t\t\t\t\tmarkFunction(function( seed, matches ) {\n\t\t\t\t\t\tvar idx,\n\t\t\t\t\t\t\tmatched = fn( seed, argument ),\n\t\t\t\t\t\t\ti = matched.length;\n\t\t\t\t\t\twhile ( i-- ) {\n\t\t\t\t\t\t\tidx = indexOf( seed, matched[i] );\n\t\t\t\t\t\t\tseed[ idx ] = !( matches[ idx ] = matched[i] );\n\t\t\t\t\t\t}\n\t\t\t\t\t}) :\n\t\t\t\t\tfunction( elem ) {\n\t\t\t\t\t\treturn fn( elem, 0, args );\n\t\t\t\t\t};\n\t\t\t}\n\n\t\t\treturn fn;\n\t\t}\n\t},\n\n\tpseudos: {\n\t\t// Potentially complex pseudos\n\t\t"not": markFunction(function( selector ) {\n\t\t\t// Trim the selector passed to compile\n\t\t\t// to avoid treating leading and trailing\n\t\t\t// spaces as combinators\n\t\t\tvar input = [],\n\t\t\t\tresults = [],\n\t\t\t\tmatcher = compile( selector.replace( rtrim, "$1" ) );\n\n\t\t\treturn matcher[ expando ] ?\n\t\t\t\tmarkFunction(function( seed, matches, context, xml ) {\n\t\t\t\t\tvar elem,\n\t\t\t\t\t\tunmatched = matcher( seed, null, xml, [] ),\n\t\t\t\t\t\ti = seed.length;\n\n\t\t\t\t\t// Match elements unmatched by `matcher`\n\t\t\t\t\twhile ( i-- ) {\n\t\t\t\t\t\tif ( (elem = unmatched[i]) ) {\n\t\t\t\t\t\t\tseed[i] = !(matches[i] = elem);\n\t\t\t\t\t\t}\n\t\t\t\t\t}\n\t\t\t\t}) :\n\t\t\t\tfunction( elem, context, xml ) {\n\t\t\t\t\tinput[0] = elem;\n\t\t\t\t\tmatcher( input, null, xml, results );\n\t\t\t\t\t// Don\'t keep the element (issue #299)\n\t\t\t\t\tinput[0] = null;\n\t\t\t\t\treturn !results.pop();\n\t\t\t\t};\n\t\t}),\n\n\t\t"has": markFunction(function( selector ) {\n\t\t\treturn function( elem ) {\n\t\t\t\treturn Sizzle( selector, elem ).length > 0;\n\t\t\t};\n\t\t}),\n\n\t\t"contains": markFunction(function( text ) {\n\t\t\ttext = text.replace( runescape, funescape );\n\t\t\treturn function( elem ) {\n\t\t\t\treturn ( elem.textContent || elem.innerText || getText( elem ) ).indexOf( text ) > -1;\n\t\t\t};\n\t\t}),\n\n\t\t// "Whether an element is represented by a :lang() selector\n\t\t// is based solely on the element\'s language value\n\t\t// being equal to the identifier C,\n\t\t// or beginning with the identifier C immediately followed by "-".\n\t\t// The matching of C against the element\'s language value is performed case-insensitively.\n\t\t// The identifier C does not have to be a valid language name."\n\t\t// http://www.w3.org/TR/selectors/#lang-pseudo\n\t\t"lang": markFunction( function( lang ) {\n\t\t\t// lang value must be a valid identifier\n\t\t\tif ( !ridentifier.test(lang || "") ) {\n\t\t\t\tSizzle.error( "unsupported lang: " + lang );\n\t\t\t}\n\t\t\tlang = lang.replace( runescape, funescape ).toLowerCase();\n\t\t\treturn function( elem ) {\n\t\t\t\tvar elemLang;\n\t\t\t\tdo {\n\t\t\t\t\tif ( (elemLang = documentIsHTML ?\n\t\t\t\t\t\telem.lang :\n\t\t\t\t\t\telem.getAttribute("xml:lang") || elem.getAttribute("lang")) ) {\n\n\t\t\t\t\t\telemLang = elemLang.toLowerCase();\n\t\t\t\t\t\treturn elemLang === lang || elemLang.indexOf( lang + "-" ) === 0;\n\t\t\t\t\t}\n\t\t\t\t} while ( (elem = elem.parentNode) && elem.nodeType === 1 );\n\t\t\t\treturn false;\n\t\t\t};\n\t\t}),\n\n\t\t// Miscellaneous\n\t\t"target": function( elem ) {\n\t\t\tvar hash = window.location && window.location.hash;\n\t\t\treturn hash && hash.slice( 1 ) === elem.id;\n\t\t},\n\n\t\t"root": function( elem ) {\n\t\t\treturn elem === docElem;\n\t\t},\n\n\t\t"focus": function( elem ) {\n\t\t\treturn elem === document.activeElement && (!document.hasFocus || document.hasFocus()) && !!(elem.type || elem.href || ~elem.tabIndex);\n\t\t},\n\n\t\t// Boolean properties\n\t\t"enabled": function( elem ) {\n\t\t\treturn elem.disabled === false;\n\t\t},\n\n\t\t"disabled": function( elem ) {\n\t\t\treturn elem.disabled === true;\n\t\t},\n\n\t\t"checked": function( elem ) {\n\t\t\t// In CSS3, :checked should return both checked and selected elements\n\t\t\t// http://www.w3.org/TR/2011/REC-css3-selectors-20110929/#checked\n\t\t\tvar nodeName = elem.nodeName.toLowerCase();\n\t\t\treturn (nodeName === "input" && !!elem.checked) || (nodeName === "option" && !!elem.selected);\n\t\t},\n\n\t\t"selected": function( elem ) {\n\t\t\t// Accessing this property makes selected-by-default\n\t\t\t// options in Safari work properly\n\t\t\tif ( elem.parentNode ) {\n\t\t\t\telem.parentNode.selectedIndex;\n\t\t\t}\n\n\t\t\treturn elem.selected === true;\n\t\t},\n\n\t\t// Contents\n\t\t"empty": function( elem ) {\n\t\t\t// http://www.w3.org/TR/selectors/#empty-pseudo\n\t\t\t// :empty is negated by element (1) or content nodes (text: 3; cdata: 4; entity ref: 5),\n\t\t\t//   but not by others (comment: 8; processing instruction: 7; etc.)\n\t\t\t// nodeType < 6 works because attributes (2) do not appear as children\n\t\t\tfor ( elem = elem.firstChild; elem; elem = elem.nextSibling ) {\n\t\t\t\tif ( elem.nodeType < 6 ) {\n\t\t\t\t\treturn false;\n\t\t\t\t}\n\t\t\t}\n\t\t\treturn true;\n\t\t},\n\n\t\t"parent": function( elem ) {\n\t\t\treturn !Expr.pseudos["empty"]( elem );\n\t\t},\n\n\t\t// Element/input types\n\t\t"header": function( elem ) {\n\t\t\treturn rheader.test( elem.nodeName );\n\t\t},\n\n\t\t"input": function( elem ) {\n\t\t\treturn rinputs.test( elem.nodeName );\n\t\t},\n\n\t\t"button": function( elem ) {\n\t\t\tvar name = elem.nodeName.toLowerCase();\n\t\t\treturn name === "input" && elem.type === "button" || name === "button";\n\t\t},\n\n\t\t"text": function( elem ) {\n\t\t\tvar attr;\n\t\t\treturn elem.nodeName.toLowerCase() === "input" &&\n\t\t\t\telem.type === "text" &&\n\n\t\t\t\t// Support: IE<8\n\t\t\t\t// New HTML5 attribute values (e.g., "search") appear with elem.type === "text"\n\t\t\t\t( (attr = elem.getAttribute("type")) == null || attr.toLowerCase() === "text" );\n\t\t},\n\n\t\t// Position-in-collection\n\t\t"first": createPositionalPseudo(function() {\n\t\t\treturn [ 0 ];\n\t\t}),\n\n\t\t"last": createPositionalPseudo(function( matchIndexes, length ) {\n\t\t\treturn [ length - 1 ];\n\t\t}),\n\n\t\t"eq": createPositionalPseudo(function( matchIndexes, length, argument ) {\n\t\t\treturn [ argument < 0 ? argument + length : argument ];\n\t\t}),\n\n\t\t"even": createPositionalPseudo(function( matchIndexes, length ) {\n\t\t\tvar i = 0;\n\t\t\tfor ( ; i < length; i += 2 ) {\n\t\t\t\tmatchIndexes.push( i );\n\t\t\t}\n\t\t\treturn matchIndexes;\n\t\t}),\n\n\t\t"odd": createPositionalPseudo(function( matchIndexes, length ) {\n\t\t\tvar i = 1;\n\t\t\tfor ( ; i < length; i += 2 ) {\n\t\t\t\tmatchIndexes.push( i );\n\t\t\t}\n\t\t\treturn matchIndexes;\n\t\t}),\n\n\t\t"lt": createPositionalPseudo(function( matchIndexes, length, argument ) {\n\t\t\tvar i = argument < 0 ? argument + length : argument;\n\t\t\tfor ( ; --i >= 0; ) {\n\t\t\t\tmatchIndexes.push( i );\n\t\t\t}\n\t\t\treturn matchIndexes;\n\t\t}),\n\n\t\t"gt": createPositionalPseudo(function( matchIndexes, length, argument ) {\n\t\t\tvar i = argument < 0 ? argument + length : argument;\n\t\t\tfor ( ; ++i < length; ) {\n\t\t\t\tmatchIndexes.push( i );\n\t\t\t}\n\t\t\treturn matchIndexes;\n\t\t})\n\t}\n};\n\nExpr.pseudos["nth"] = Expr.pseudos["eq"];\n\n// Add button/input type pseudos\nfor ( i in { radio: true, checkbox: true, file: true, password: true, image: true } ) {\n\tExpr.pseudos[ i ] = createInputPseudo( i );\n}\nfor ( i in { submit: true, reset: true } ) {\n\tExpr.pseudos[ i ] = createButtonPseudo( i );\n}\n\n// Easy API for creating new setFilters\nfunction setFilters() {}\nsetFilters.prototype = Expr.filters = Expr.pseudos;\nExpr.setFilters = new setFilters();\n\ntokenize = Sizzle.tokenize = function( selector, parseOnly ) {\n\tvar matched, match, tokens, type,\n\t\tsoFar, groups, preFilters,\n\t\tcached = tokenCache[ selector + " " ];\n\n\tif ( cached ) {\n\t\treturn parseOnly ? 0 : cached.slice( 0 );\n\t}\n\n\tsoFar = selector;\n\tgroups = [];\n\tpreFilters = Expr.preFilter;\n\n\twhile ( soFar ) {\n\n\t\t// Comma and first run\n\t\tif ( !matched || (match = rcomma.exec( soFar )) ) {\n\t\t\tif ( match ) {\n\t\t\t\t// Don\'t consume trailing commas as valid\n\t\t\t\tsoFar = soFar.slice( match[0].length ) || soFar;\n\t\t\t}\n\t\t\tgroups.push( (tokens = []) );\n\t\t}\n\n\t\tmatched = false;\n\n\t\t// Combinators\n\t\tif ( (match = rcombinators.exec( soFar )) ) {\n\t\t\tmatched = match.shift();\n\t\t\ttokens.push({\n\t\t\t\tvalue: matched,\n\t\t\t\t// Cast descendant combinators to space\n\t\t\t\ttype: match[0].replace( rtrim, " " )\n\t\t\t});\n\t\t\tsoFar = soFar.slice( matched.length );\n\t\t}\n\n\t\t// Filters\n\t\tfor ( type in Expr.filter ) {\n\t\t\tif ( (match = matchExpr[ type ].exec( soFar )) && (!preFilters[ type ] ||\n\t\t\t\t(match = preFilters[ type ]( match ))) ) {\n\t\t\t\tmatched = match.shift();\n\t\t\t\ttokens.push({\n\t\t\t\t\tvalue: matched,\n\t\t\t\t\ttype: type,\n\t\t\t\t\tmatches: match\n\t\t\t\t});\n\t\t\t\tsoFar = soFar.slice( matched.length );\n\t\t\t}\n\t\t}\n\n\t\tif ( !matched ) {\n\t\t\tbreak;\n\t\t}\n\t}\n\n\t// Return the length of the invalid excess\n\t// if we\'re just parsing\n\t// Otherwise, throw an error or return tokens\n\treturn parseOnly ?\n\t\tsoFar.length :\n\t\tsoFar ?\n\t\t\tSizzle.error( selector ) :\n\t\t\t// Cache the tokens\n\t\t\ttokenCache( selector, groups ).slice( 0 );\n};\n\nfunction toSelector( tokens ) {\n\tvar i = 0,\n\t\tlen = tokens.length,\n\t\tselector = "";\n\tfor ( ; i < len; i++ ) {\n\t\tselector += tokens[i].value;\n\t}\n\treturn selector;\n}\n\nfunction addCombinator( matcher, combinator, base ) {\n\tvar dir = combinator.dir,\n\t\tcheckNonElements = base && dir === "parentNode",\n\t\tdoneName = done++;\n\n\treturn combinator.first ?\n\t\t// Check against closest ancestor/preceding element\n\t\tfunction( elem, context, xml ) {\n\t\t\twhile ( (elem = elem[ dir ]) ) {\n\t\t\t\tif ( elem.nodeType === 1 || checkNonElements ) {\n\t\t\t\t\treturn matcher( elem, context, xml );\n\t\t\t\t}\n\t\t\t}\n\t\t} :\n\n\t\t// Check against all ancestor/preceding elements\n\t\tfunction( elem, context, xml ) {\n\t\t\tvar oldCache, outerCache,\n\t\t\t\tnewCache = [ dirruns, doneName ];\n\n\t\t\t// We can\'t set arbitrary data on XML nodes, so they don\'t benefit from dir caching\n\t\t\tif ( xml ) {\n\t\t\t\twhile ( (elem = elem[ dir ]) ) {\n\t\t\t\t\tif ( elem.nodeType === 1 || checkNonElements ) {\n\t\t\t\t\t\tif ( matcher( elem, context, xml ) ) {\n\t\t\t\t\t\t\treturn true;\n\t\t\t\t\t\t}\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t} else {\n\t\t\t\twhile ( (elem = elem[ dir ]) ) {\n\t\t\t\t\tif ( elem.nodeType === 1 || checkNonElements ) {\n\t\t\t\t\t\touterCache = elem[ expando ] || (elem[ expando ] = {});\n\t\t\t\t\t\tif ( (oldCache = outerCache[ dir ]) &&\n\t\t\t\t\t\t\toldCache[ 0 ] === dirruns && oldCache[ 1 ] === doneName ) {\n\n\t\t\t\t\t\t\t// Assign to newCache so results back-propagate to previous elements\n\t\t\t\t\t\t\treturn (newCache[ 2 ] = oldCache[ 2 ]);\n\t\t\t\t\t\t} else {\n\t\t\t\t\t\t\t// Reuse newcache so results back-propagate to previous elements\n\t\t\t\t\t\t\touterCache[ dir ] = newCache;\n\n\t\t\t\t\t\t\t// A match means we\'re done; a fail means we have to keep checking\n\t\t\t\t\t\t\tif ( (newCache[ 2 ] = matcher( elem, context, xml )) ) {\n\t\t\t\t\t\t\t\treturn true;\n\t\t\t\t\t\t\t}\n\t\t\t\t\t\t}\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t}\n\t\t};\n}\n\nfunction elementMatcher( matchers ) {\n\treturn matchers.length > 1 ?\n\t\tfunction( elem, context, xml ) {\n\t\t\tvar i = matchers.length;\n\t\t\twhile ( i-- ) {\n\t\t\t\tif ( !matchers[i]( elem, context, xml ) ) {\n\t\t\t\t\treturn false;\n\t\t\t\t}\n\t\t\t}\n\t\t\treturn true;\n\t\t} :\n\t\tmatchers[0];\n}\n\nfunction multipleContexts( selector, contexts, results ) {\n\tvar i = 0,\n\t\tlen = contexts.length;\n\tfor ( ; i < len; i++ ) {\n\t\tSizzle( selector, contexts[i], results );\n\t}\n\treturn results;\n}\n\nfunction condense( unmatched, map, filter, context, xml ) {\n\tvar elem,\n\t\tnewUnmatched = [],\n\t\ti = 0,\n\t\tlen = unmatched.length,\n\t\tmapped = map != null;\n\n\tfor ( ; i < len; i++ ) {\n\t\tif ( (elem = unmatched[i]) ) {\n\t\t\tif ( !filter || filter( elem, context, xml ) ) {\n\t\t\t\tnewUnmatched.push( elem );\n\t\t\t\tif ( mapped ) {\n\t\t\t\t\tmap.push( i );\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n\n\treturn newUnmatched;\n}\n\nfunction setMatcher( preFilter, selector, matcher, postFilter, postFinder, postSelector ) {\n\tif ( postFilter && !postFilter[ expando ] ) {\n\t\tpostFilter = setMatcher( postFilter );\n\t}\n\tif ( postFinder && !postFinder[ expando ] ) {\n\t\tpostFinder = setMatcher( postFinder, postSelector );\n\t}\n\treturn markFunction(function( seed, results, context, xml ) {\n\t\tvar temp, i, elem,\n\t\t\tpreMap = [],\n\t\t\tpostMap = [],\n\t\t\tpreexisting = results.length,\n\n\t\t\t// Get initial elements from seed or context\n\t\t\telems = seed || multipleContexts( selector || "*", context.nodeType ? [ context ] : context, [] ),\n\n\t\t\t// Prefilter to get matcher input, preserving a map for seed-results synchronization\n\t\t\tmatcherIn = preFilter && ( seed || !selector ) ?\n\t\t\t\tcondense( elems, preMap, preFilter, context, xml ) :\n\t\t\t\telems,\n\n\t\t\tmatcherOut = matcher ?\n\t\t\t\t// If we have a postFinder, or filtered seed, or non-seed postFilter or preexisting results,\n\t\t\t\tpostFinder || ( seed ? preFilter : preexisting || postFilter ) ?\n\n\t\t\t\t\t// ...intermediate processing is necessary\n\t\t\t\t\t[] :\n\n\t\t\t\t\t// ...otherwise use results directly\n\t\t\t\t\tresults :\n\t\t\t\tmatcherIn;\n\n\t\t// Find primary matches\n\t\tif ( matcher ) {\n\t\t\tmatcher( matcherIn, matcherOut, context, xml );\n\t\t}\n\n\t\t// Apply postFilter\n\t\tif ( postFilter ) {\n\t\t\ttemp = condense( matcherOut, postMap );\n\t\t\tpostFilter( temp, [], context, xml );\n\n\t\t\t// Un-match failing elements by moving them back to matcherIn\n\t\t\ti = temp.length;\n\t\t\twhile ( i-- ) {\n\t\t\t\tif ( (elem = temp[i]) ) {\n\t\t\t\t\tmatcherOut[ postMap[i] ] = !(matcherIn[ postMap[i] ] = elem);\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\n\t\tif ( seed ) {\n\t\t\tif ( postFinder || preFilter ) {\n\t\t\t\tif ( postFinder ) {\n\t\t\t\t\t// Get the final matcherOut by condensing this intermediate into postFinder contexts\n\t\t\t\t\ttemp = [];\n\t\t\t\t\ti = matcherOut.length;\n\t\t\t\t\twhile ( i-- ) {\n\t\t\t\t\t\tif ( (elem = matcherOut[i]) ) {\n\t\t\t\t\t\t\t// Restore matcherIn since elem is not yet a final match\n\t\t\t\t\t\t\ttemp.push( (matcherIn[i] = elem) );\n\t\t\t\t\t\t}\n\t\t\t\t\t}\n\t\t\t\t\tpostFinder( null, (matcherOut = []), temp, xml );\n\t\t\t\t}\n\n\t\t\t\t// Move matched elements from seed to results to keep them synchronized\n\t\t\t\ti = matcherOut.length;\n\t\t\t\twhile ( i-- ) {\n\t\t\t\t\tif ( (elem = matcherOut[i]) &&\n\t\t\t\t\t\t(temp = postFinder ? indexOf( seed, elem ) : preMap[i]) > -1 ) {\n\n\t\t\t\t\t\tseed[temp] = !(results[temp] = elem);\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t}\n\n\t\t// Add elements to results, through postFinder if defined\n\t\t} else {\n\t\t\tmatcherOut = condense(\n\t\t\t\tmatcherOut === results ?\n\t\t\t\t\tmatcherOut.splice( preexisting, matcherOut.length ) :\n\t\t\t\t\tmatcherOut\n\t\t\t);\n\t\t\tif ( postFinder ) {\n\t\t\t\tpostFinder( null, results, matcherOut, xml );\n\t\t\t} else {\n\t\t\t\tpush.apply( results, matcherOut );\n\t\t\t}\n\t\t}\n\t});\n}\n\nfunction matcherFromTokens( tokens ) {\n\tvar checkContext, matcher, j,\n\t\tlen = tokens.length,\n\t\tleadingRelative = Expr.relative[ tokens[0].type ],\n\t\timplicitRelative = leadingRelative || Expr.relative[" "],\n\t\ti = leadingRelative ? 1 : 0,\n\n\t\t// The foundational matcher ensures that elements are reachable from top-level context(s)\n\t\tmatchContext = addCombinator( function( elem ) {\n\t\t\treturn elem === checkContext;\n\t\t}, implicitRelative, true ),\n\t\tmatchAnyContext = addCombinator( function( elem ) {\n\t\t\treturn indexOf( checkContext, elem ) > -1;\n\t\t}, implicitRelative, true ),\n\t\tmatchers = [ function( elem, context, xml ) {\n\t\t\tvar ret = ( !leadingRelative && ( xml || context !== outermostContext ) ) || (\n\t\t\t\t(checkContext = context).nodeType ?\n\t\t\t\t\tmatchContext( elem, context, xml ) :\n\t\t\t\t\tmatchAnyContext( elem, context, xml ) );\n\t\t\t// Avoid hanging onto element (issue #299)\n\t\t\tcheckContext = null;\n\t\t\treturn ret;\n\t\t} ];\n\n\tfor ( ; i < len; i++ ) {\n\t\tif ( (matcher = Expr.relative[ tokens[i].type ]) ) {\n\t\t\tmatchers = [ addCombinator(elementMatcher( matchers ), matcher) ];\n\t\t} else {\n\t\t\tmatcher = Expr.filter[ tokens[i].type ].apply( null, tokens[i].matches );\n\n\t\t\t// Return special upon seeing a positional matcher\n\t\t\tif ( matcher[ expando ] ) {\n\t\t\t\t// Find the next relative operator (if any) for proper handling\n\t\t\t\tj = ++i;\n\t\t\t\tfor ( ; j < len; j++ ) {\n\t\t\t\t\tif ( Expr.relative[ tokens[j].type ] ) {\n\t\t\t\t\t\tbreak;\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t\treturn setMatcher(\n\t\t\t\t\ti > 1 && elementMatcher( matchers ),\n\t\t\t\t\ti > 1 && toSelector(\n\t\t\t\t\t\t// If the preceding token was a descendant combinator, insert an implicit any-element `*`\n\t\t\t\t\t\ttokens.slice( 0, i - 1 ).concat({ value: tokens[ i - 2 ].type === " " ? "*" : "" })\n\t\t\t\t\t).replace( rtrim, "$1" ),\n\t\t\t\t\tmatcher,\n\t\t\t\t\ti < j && matcherFromTokens( tokens.slice( i, j ) ),\n\t\t\t\t\tj < len && matcherFromTokens( (tokens = tokens.slice( j )) ),\n\t\t\t\t\tj < len && toSelector( tokens )\n\t\t\t\t);\n\t\t\t}\n\t\t\tmatchers.push( matcher );\n\t\t}\n\t}\n\n\treturn elementMatcher( matchers );\n}\n\nfunction matcherFromGroupMatchers( elementMatchers, setMatchers ) {\n\tvar bySet = setMatchers.length > 0,\n\t\tbyElement = elementMatchers.length > 0,\n\t\tsuperMatcher = function( seed, context, xml, results, outermost ) {\n\t\t\tvar elem, j, matcher,\n\t\t\t\tmatchedCount = 0,\n\t\t\t\ti = "0",\n\t\t\t\tunmatched = seed && [],\n\t\t\t\tsetMatched = [],\n\t\t\t\tcontextBackup = outermostContext,\n\t\t\t\t// We must always have either seed elements or outermost context\n\t\t\t\telems = seed || byElement && Expr.find["TAG"]( "*", outermost ),\n\t\t\t\t// Use integer dirruns iff this is the outermost matcher\n\t\t\t\tdirrunsUnique = (dirruns += contextBackup == null ? 1 : Math.random() || 0.1),\n\t\t\t\tlen = elems.length;\n\n\t\t\tif ( outermost ) {\n\t\t\t\toutermostContext = context !== document && context;\n\t\t\t}\n\n\t\t\t// Add elements passing elementMatchers directly to results\n\t\t\t// Keep `i` a string if there are no elements so `matchedCount` will be "00" below\n\t\t\t// Support: IE<9, Safari\n\t\t\t// Tolerate NodeList properties (IE: "length"; Safari: <number>) matching elements by id\n\t\t\tfor ( ; i !== len && (elem = elems[i]) != null; i++ ) {\n\t\t\t\tif ( byElement && elem ) {\n\t\t\t\t\tj = 0;\n\t\t\t\t\twhile ( (matcher = elementMatchers[j++]) ) {\n\t\t\t\t\t\tif ( matcher( elem, context, xml ) ) {\n\t\t\t\t\t\t\tresults.push( elem );\n\t\t\t\t\t\t\tbreak;\n\t\t\t\t\t\t}\n\t\t\t\t\t}\n\t\t\t\t\tif ( outermost ) {\n\t\t\t\t\t\tdirruns = dirrunsUnique;\n\t\t\t\t\t}\n\t\t\t\t}\n\n\t\t\t\t// Track unmatched elements for set filters\n\t\t\t\tif ( bySet ) {\n\t\t\t\t\t// They will have gone through all possible matchers\n\t\t\t\t\tif ( (elem = !matcher && elem) ) {\n\t\t\t\t\t\tmatchedCount--;\n\t\t\t\t\t}\n\n\t\t\t\t\t// Lengthen the array for every element, matched or not\n\t\t\t\t\tif ( seed ) {\n\t\t\t\t\t\tunmatched.push( elem );\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t}\n\n\t\t\t// Apply set filters to unmatched elements\n\t\t\tmatchedCount += i;\n\t\t\tif ( bySet && i !== matchedCount ) {\n\t\t\t\tj = 0;\n\t\t\t\twhile ( (matcher = setMatchers[j++]) ) {\n\t\t\t\t\tmatcher( unmatched, setMatched, context, xml );\n\t\t\t\t}\n\n\t\t\t\tif ( seed ) {\n\t\t\t\t\t// Reintegrate element matches to eliminate the need for sorting\n\t\t\t\t\tif ( matchedCount > 0 ) {\n\t\t\t\t\t\twhile ( i-- ) {\n\t\t\t\t\t\t\tif ( !(unmatched[i] || setMatched[i]) ) {\n\t\t\t\t\t\t\t\tsetMatched[i] = pop.call( results );\n\t\t\t\t\t\t\t}\n\t\t\t\t\t\t}\n\t\t\t\t\t}\n\n\t\t\t\t\t// Discard index placeholder values to get only actual matches\n\t\t\t\t\tsetMatched = condense( setMatched );\n\t\t\t\t}\n\n\t\t\t\t// Add matches to results\n\t\t\t\tpush.apply( results, setMatched );\n\n\t\t\t\t// Seedless set matches succeeding multiple successful matchers stipulate sorting\n\t\t\t\tif ( outermost && !seed && setMatched.length > 0 &&\n\t\t\t\t\t( matchedCount + setMatchers.length ) > 1 ) {\n\n\t\t\t\t\tSizzle.uniqueSort( results );\n\t\t\t\t}\n\t\t\t}\n\n\t\t\t// Override manipulation of globals by nested matchers\n\t\t\tif ( outermost ) {\n\t\t\t\tdirruns = dirrunsUnique;\n\t\t\t\toutermostContext = contextBackup;\n\t\t\t}\n\n\t\t\treturn unmatched;\n\t\t};\n\n\treturn bySet ?\n\t\tmarkFunction( superMatcher ) :\n\t\tsuperMatcher;\n}\n\ncompile = Sizzle.compile = function( selector, match /* Internal Use Only */ ) {\n\tvar i,\n\t\tsetMatchers = [],\n\t\telementMatchers = [],\n\t\tcached = compilerCache[ selector + " " ];\n\n\tif ( !cached ) {\n\t\t// Generate a function of recursive functions that can be used to check each element\n\t\tif ( !match ) {\n\t\t\tmatch = tokenize( selector );\n\t\t}\n\t\ti = match.length;\n\t\twhile ( i-- ) {\n\t\t\tcached = matcherFromTokens( match[i] );\n\t\t\tif ( cached[ expando ] ) {\n\t\t\t\tsetMatchers.push( cached );\n\t\t\t} else {\n\t\t\t\telementMatchers.push( cached );\n\t\t\t}\n\t\t}\n\n\t\t// Cache the compiled function\n\t\tcached = compilerCache( selector, matcherFromGroupMatchers( elementMatchers, setMatchers ) );\n\n\t\t// Save selector and tokenization\n\t\tcached.selector = selector;\n\t}\n\treturn cached;\n};\n\n/**\n * A low-level selection function that works with Sizzle\'s compiled\n *  selector functions\n * @param {String|Function} selector A selector or a pre-compiled\n *  selector function built with Sizzle.compile\n * @param {Element} context\n * @param {Array} [results]\n * @param {Array} [seed] A set of elements to match against\n */\nselect = Sizzle.select = function( selector, context, results, seed ) {\n\tvar i, tokens, token, type, find,\n\t\tcompiled = typeof selector === "function" && selector,\n\t\tmatch = !seed && tokenize( (selector = compiled.selector || selector) );\n\n\tresults = results || [];\n\n\t// Try to minimize operations if there is no seed and only one group\n\tif ( match.length === 1 ) {\n\n\t\t// Take a shortcut and set the context if the root selector is an ID\n\t\ttokens = match[0] = match[0].slice( 0 );\n\t\tif ( tokens.length > 2 && (token = tokens[0]).type === "ID" &&\n\t\t\t\tsupport.getById && context.nodeType === 9 && documentIsHTML &&\n\t\t\t\tExpr.relative[ tokens[1].type ] ) {\n\n\t\t\tcontext = ( Expr.find["ID"]( token.matches[0].replace(runescape, funescape), context ) || [] )[0];\n\t\t\tif ( !context ) {\n\t\t\t\treturn results;\n\n\t\t\t// Precompiled matchers will still verify ancestry, so step up a level\n\t\t\t} else if ( compiled ) {\n\t\t\t\tcontext = context.parentNode;\n\t\t\t}\n\n\t\t\tselector = selector.slice( tokens.shift().value.length );\n\t\t}\n\n\t\t// Fetch a seed set for right-to-left matching\n\t\ti = matchExpr["needsContext"].test( selector ) ? 0 : tokens.length;\n\t\twhile ( i-- ) {\n\t\t\ttoken = tokens[i];\n\n\t\t\t// Abort if we hit a combinator\n\t\t\tif ( Expr.relative[ (type = token.type) ] ) {\n\t\t\t\tbreak;\n\t\t\t}\n\t\t\tif ( (find = Expr.find[ type ]) ) {\n\t\t\t\t// Search, expanding context for leading sibling combinators\n\t\t\t\tif ( (seed = find(\n\t\t\t\t\ttoken.matches[0].replace( runescape, funescape ),\n\t\t\t\t\trsibling.test( tokens[0].type ) && testContext( context.parentNode ) || context\n\t\t\t\t)) ) {\n\n\t\t\t\t\t// If seed is empty or no tokens remain, we can return early\n\t\t\t\t\ttokens.splice( i, 1 );\n\t\t\t\t\tselector = seed.length && toSelector( tokens );\n\t\t\t\t\tif ( !selector ) {\n\t\t\t\t\t\tpush.apply( results, seed );\n\t\t\t\t\t\treturn results;\n\t\t\t\t\t}\n\n\t\t\t\t\tbreak;\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n\n\t// Compile and execute a filtering function if one is not provided\n\t// Provide `match` to avoid retokenization if we modified the selector above\n\t( compiled || compile( selector, match ) )(\n\t\tseed,\n\t\tcontext,\n\t\t!documentIsHTML,\n\t\tresults,\n\t\trsibling.test( selector ) && testContext( context.parentNode ) || context\n\t);\n\treturn results;\n};\n\n// One-time assignments\n\n// Sort stability\nsupport.sortStable = expando.split("").sort( sortOrder ).join("") === expando;\n\n// Support: Chrome 14-35+\n// Always assume duplicates if they aren\'t passed to the comparison function\nsupport.detectDuplicates = !!hasDuplicate;\n\n// Initialize against the default document\nsetDocument();\n\n// Support: Webkit<537.32 - Safari 6.0.3/Chrome 25 (fixed in Chrome 27)\n// Detached nodes confoundingly follow *each other*\nsupport.sortDetached = assert(function( div1 ) {\n\t// Should return 1, but returns 4 (following)\n\treturn div1.compareDocumentPosition( document.createElement("div") ) & 1;\n});\n\n// Support: IE<8\n// Prevent attribute/property "interpolation"\n// http://msdn.microsoft.com/en-us/library/ms536429%28VS.85%29.aspx\nif ( !assert(function( div ) {\n\tdiv.innerHTML = "<a href=\'#\'></a>";\n\treturn div.firstChild.getAttribute("href") === "#" ;\n}) ) {\n\taddHandle( "type|href|height|width", function( elem, name, isXML ) {\n\t\tif ( !isXML ) {\n\t\t\treturn elem.getAttribute( name, name.toLowerCase() === "type" ? 1 : 2 );\n\t\t}\n\t});\n}\n\n// Support: IE<9\n// Use defaultValue in place of getAttribute("value")\nif ( !support.attributes || !assert(function( div ) {\n\tdiv.innerHTML = "<input/>";\n\tdiv.firstChild.setAttribute( "value", "" );\n\treturn div.firstChild.getAttribute( "value" ) === "";\n}) ) {\n\taddHandle( "value", function( elem, name, isXML ) {\n\t\tif ( !isXML && elem.nodeName.toLowerCase() === "input" ) {\n\t\t\treturn elem.defaultValue;\n\t\t}\n\t});\n}\n\n// Support: IE<9\n// Use getAttributeNode to fetch booleans when getAttribute lies\nif ( !assert(function( div ) {\n\treturn div.getAttribute("disabled") == null;\n}) ) {\n\taddHandle( booleans, function( elem, name, isXML ) {\n\t\tvar val;\n\t\tif ( !isXML ) {\n\t\t\treturn elem[ name ] === true ? name.toLowerCase() :\n\t\t\t\t\t(val = elem.getAttributeNode( name )) && val.specified ?\n\t\t\t\t\tval.value :\n\t\t\t\tnull;\n\t\t}\n\t});\n}\n\nreturn Sizzle;\n\n})( window );\n\n\n\njQuery.find = Sizzle;\njQuery.expr = Sizzle.selectors;\njQuery.expr[":"] = jQuery.expr.pseudos;\njQuery.unique = Sizzle.uniqueSort;\njQuery.text = Sizzle.getText;\njQuery.isXMLDoc = Sizzle.isXML;\njQuery.contains = Sizzle.contains;\n\n\n\nvar rneedsContext = jQuery.expr.match.needsContext;\n\nvar rsingleTag = (/^<(\\w+)\\s*\\/?>(?:<\\/\\1>|)$/);\n\n\n\nvar risSimple = /^.[^:#\\[\\.,]*$/;\n\n// Implement the identical functionality for filter and not\nfunction winnow( elements, qualifier, not ) {\n\tif ( jQuery.isFunction( qualifier ) ) {\n\t\treturn jQuery.grep( elements, function( elem, i ) {\n\t\t\t/* jshint -W018 */\n\t\t\treturn !!qualifier.call( elem, i, elem ) !== not;\n\t\t});\n\n\t}\n\n\tif ( qualifier.nodeType ) {\n\t\treturn jQuery.grep( elements, function( elem ) {\n\t\t\treturn ( elem === qualifier ) !== not;\n\t\t});\n\n\t}\n\n\tif ( typeof qualifier === "string" ) {\n\t\tif ( risSimple.test( qualifier ) ) {\n\t\t\treturn jQuery.filter( qualifier, elements, not );\n\t\t}\n\n\t\tqualifier = jQuery.filter( qualifier, elements );\n\t}\n\n\treturn jQuery.grep( elements, function( elem ) {\n\t\treturn ( indexOf.call( qualifier, elem ) >= 0 ) !== not;\n\t});\n}\n\njQuery.filter = function( expr, elems, not ) {\n\tvar elem = elems[ 0 ];\n\n\tif ( not ) {\n\t\texpr = ":not(" + expr + ")";\n\t}\n\n\treturn elems.length === 1 && elem.nodeType === 1 ?\n\t\tjQuery.find.matchesSelector( elem, expr ) ? [ elem ] : [] :\n\t\tjQuery.find.matches( expr, jQuery.grep( elems, function( elem ) {\n\t\t\treturn elem.nodeType === 1;\n\t\t}));\n};\n\njQuery.fn.extend({\n\tfind: function( selector ) {\n\t\tvar i,\n\t\t\tlen = this.length,\n\t\t\tret = [],\n\t\t\tself = this;\n\n\t\tif ( typeof selector !== "string" ) {\n\t\t\treturn this.pushStack( jQuery( selector ).filter(function() {\n\t\t\t\tfor ( i = 0; i < len; i++ ) {\n\t\t\t\t\tif ( jQuery.contains( self[ i ], this ) ) {\n\t\t\t\t\t\treturn true;\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t}) );\n\t\t}\n\n\t\tfor ( i = 0; i < len; i++ ) {\n\t\t\tjQuery.find( selector, self[ i ], ret );\n\t\t}\n\n\t\t// Needed because $( selector, context ) becomes $( context ).find( selector )\n\t\tret = this.pushStack( len > 1 ? jQuery.unique( ret ) : ret );\n\t\tret.selector = this.selector ? this.selector + " " + selector : selector;\n\t\treturn ret;\n\t},\n\tfilter: function( selector ) {\n\t\treturn this.pushStack( winnow(this, selector || [], false) );\n\t},\n\tnot: function( selector ) {\n\t\treturn this.pushStack( winnow(this, selector || [], true) );\n\t},\n\tis: function( selector ) {\n\t\treturn !!winnow(\n\t\t\tthis,\n\n\t\t\t// If this is a positional/relative selector, check membership in the returned set\n\t\t\t// so $("p:first").is("p:last") won\'t return true for a doc with two "p".\n\t\t\ttypeof selector === "string" && rneedsContext.test( selector ) ?\n\t\t\t\tjQuery( selector ) :\n\t\t\t\tselector || [],\n\t\t\tfalse\n\t\t).length;\n\t}\n});\n\n\n// Initialize a jQuery object\n\n\n// A central reference to the root jQuery(document)\nvar rootjQuery,\n\n\t// A simple way to check for HTML strings\n\t// Prioritize #id over <tag> to avoid XSS via location.hash (#9521)\n\t// Strict HTML recognition (#11290: must start with <)\n\trquickExpr = /^(?:\\s*(<[\\w\\W]+>)[^>]*|#([\\w-]*))$/,\n\n\tinit = jQuery.fn.init = function( selector, context ) {\n\t\tvar match, elem;\n\n\t\t// HANDLE: $(""), $(null), $(undefined), $(false)\n\t\tif ( !selector ) {\n\t\t\treturn this;\n\t\t}\n\n\t\t// Handle HTML strings\n\t\tif ( typeof selector === "string" ) {\n\t\t\tif ( selector[0] === "<" && selector[ selector.length - 1 ] === ">" && selector.length >= 3 ) {\n\t\t\t\t// Assume that strings that start and end with <> are HTML and skip the regex check\n\t\t\t\tmatch = [ null, selector, null ];\n\n\t\t\t} else {\n\t\t\t\tmatch = rquickExpr.exec( selector );\n\t\t\t}\n\n\t\t\t// Match html or make sure no context is specified for #id\n\t\t\tif ( match && (match[1] || !context) ) {\n\n\t\t\t\t// HANDLE: $(html) -> $(array)\n\t\t\t\tif ( match[1] ) {\n\t\t\t\t\tcontext = context instanceof jQuery ? context[0] : context;\n\n\t\t\t\t\t// Option to run scripts is true for back-compat\n\t\t\t\t\t// Intentionally let the error be thrown if parseHTML is not present\n\t\t\t\t\tjQuery.merge( this, jQuery.parseHTML(\n\t\t\t\t\t\tmatch[1],\n\t\t\t\t\t\tcontext && context.nodeType ? context.ownerDocument || context : document,\n\t\t\t\t\t\ttrue\n\t\t\t\t\t) );\n\n\t\t\t\t\t// HANDLE: $(html, props)\n\t\t\t\t\tif ( rsingleTag.test( match[1] ) && jQuery.isPlainObject( context ) ) {\n\t\t\t\t\t\tfor ( match in context ) {\n\t\t\t\t\t\t\t// Properties of context are called as methods if possible\n\t\t\t\t\t\t\tif ( jQuery.isFunction( this[ match ] ) ) {\n\t\t\t\t\t\t\t\tthis[ match ]( context[ match ] );\n\n\t\t\t\t\t\t\t// ...and otherwise set as attributes\n\t\t\t\t\t\t\t} else {\n\t\t\t\t\t\t\t\tthis.attr( match, context[ match ] );\n\t\t\t\t\t\t\t}\n\t\t\t\t\t\t}\n\t\t\t\t\t}\n\n\t\t\t\t\treturn this;\n\n\t\t\t\t// HANDLE: $(#id)\n\t\t\t\t} else {\n\t\t\t\t\telem = document.getElementById( match[2] );\n\n\t\t\t\t\t// Support: Blackberry 4.6\n\t\t\t\t\t// gEBID returns nodes no longer in the document (#6963)\n\t\t\t\t\tif ( elem && elem.parentNode ) {\n\t\t\t\t\t\t// Inject the element directly into the jQuery object\n\t\t\t\t\t\tthis.length = 1;\n\t\t\t\t\t\tthis[0] = elem;\n\t\t\t\t\t}\n\n\t\t\t\t\tthis.context = document;\n\t\t\t\t\tthis.selector = selector;\n\t\t\t\t\treturn this;\n\t\t\t\t}\n\n\t\t\t// HANDLE: $(expr, $(...))\n\t\t\t} else if ( !context || context.jquery ) {\n\t\t\t\treturn ( context || rootjQuery ).find( selector );\n\n\t\t\t// HANDLE: $(expr, context)\n\t\t\t// (which is just equivalent to: $(context).find(expr)\n\t\t\t} else {\n\t\t\t\treturn this.constructor( context ).find( selector );\n\t\t\t}\n\n\t\t// HANDLE: $(DOMElement)\n\t\t} else if ( selector.nodeType ) {\n\t\t\tthis.context = this[0] = selector;\n\t\t\tthis.length = 1;\n\t\t\treturn this;\n\n\t\t// HANDLE: $(function)\n\t\t// Shortcut for document ready\n\t\t} else if ( jQuery.isFunction( selector ) ) {\n\t\t\treturn typeof rootjQuery.ready !== "undefined" ?\n\t\t\t\trootjQuery.ready( selector ) :\n\t\t\t\t// Execute immediately if ready is not present\n\t\t\t\tselector( jQuery );\n\t\t}\n\n\t\tif ( selector.selector !== undefined ) {\n\t\t\tthis.selector = selector.selector;\n\t\t\tthis.context = selector.context;\n\t\t}\n\n\t\treturn jQuery.makeArray( selector, this );\n\t};\n\n// Give the init function the jQuery prototype for later instantiation\ninit.prototype = jQuery.fn;\n\n// Initialize central reference\nrootjQuery = jQuery( document );\n\n\nvar rparentsprev = /^(?:parents|prev(?:Until|All))/,\n\t// Methods guaranteed to produce a unique set when starting from a unique set\n\tguaranteedUnique = {\n\t\tchildren: true,\n\t\tcontents: true,\n\t\tnext: true,\n\t\tprev: true\n\t};\n\njQuery.extend({\n\tdir: function( elem, dir, until ) {\n\t\tvar matched = [],\n\t\t\ttruncate = until !== undefined;\n\n\t\twhile ( (elem = elem[ dir ]) && elem.nodeType !== 9 ) {\n\t\t\tif ( elem.nodeType === 1 ) {\n\t\t\t\tif ( truncate && jQuery( elem ).is( until ) ) {\n\t\t\t\t\tbreak;\n\t\t\t\t}\n\t\t\t\tmatched.push( elem );\n\t\t\t}\n\t\t}\n\t\treturn matched;\n\t},\n\n\tsibling: function( n, elem ) {\n\t\tvar matched = [];\n\n\t\tfor ( ; n; n = n.nextSibling ) {\n\t\t\tif ( n.nodeType === 1 && n !== elem ) {\n\t\t\t\tmatched.push( n );\n\t\t\t}\n\t\t}\n\n\t\treturn matched;\n\t}\n});\n\njQuery.fn.extend({\n\thas: function( target ) {\n\t\tvar targets = jQuery( target, this ),\n\t\t\tl = targets.length;\n\n\t\treturn this.filter(function() {\n\t\t\tvar i = 0;\n\t\t\tfor ( ; i < l; i++ ) {\n\t\t\t\tif ( jQuery.contains( this, targets[i] ) ) {\n\t\t\t\t\treturn true;\n\t\t\t\t}\n\t\t\t}\n\t\t});\n\t},\n\n\tclosest: function( selectors, context ) {\n\t\tvar cur,\n\t\t\ti = 0,\n\t\t\tl = this.length,\n\t\t\tmatched = [],\n\t\t\tpos = rneedsContext.test( selectors ) || typeof selectors !== "string" ?\n\t\t\t\tjQuery( selectors, context || this.context ) :\n\t\t\t\t0;\n\n\t\tfor ( ; i < l; i++ ) {\n\t\t\tfor ( cur = this[i]; cur && cur !== context; cur = cur.parentNode ) {\n\t\t\t\t// Always skip document fragments\n\t\t\t\tif ( cur.nodeType < 11 && (pos ?\n\t\t\t\t\tpos.index(cur) > -1 :\n\n\t\t\t\t\t// Don\'t pass non-elements to Sizzle\n\t\t\t\t\tcur.nodeType === 1 &&\n\t\t\t\t\t\tjQuery.find.matchesSelector(cur, selectors)) ) {\n\n\t\t\t\t\tmatched.push( cur );\n\t\t\t\t\tbreak;\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\n\t\treturn this.pushStack( matched.length > 1 ? jQuery.unique( matched ) : matched );\n\t},\n\n\t// Determine the position of an element within the set\n\tindex: function( elem ) {\n\n\t\t// No argument, return index in parent\n\t\tif ( !elem ) {\n\t\t\treturn ( this[ 0 ] && this[ 0 ].parentNode ) ? this.first().prevAll().length : -1;\n\t\t}\n\n\t\t// Index in selector\n\t\tif ( typeof elem === "string" ) {\n\t\t\treturn indexOf.call( jQuery( elem ), this[ 0 ] );\n\t\t}\n\n\t\t// Locate the position of the desired element\n\t\treturn indexOf.call( this,\n\n\t\t\t// If it receives a jQuery object, the first element is used\n\t\t\telem.jquery ? elem[ 0 ] : elem\n\t\t);\n\t},\n\n\tadd: function( selector, context ) {\n\t\treturn this.pushStack(\n\t\t\tjQuery.unique(\n\t\t\t\tjQuery.merge( this.get(), jQuery( selector, context ) )\n\t\t\t)\n\t\t);\n\t},\n\n\taddBack: function( selector ) {\n\t\treturn this.add( selector == null ?\n\t\t\tthis.prevObject : this.prevObject.filter(selector)\n\t\t);\n\t}\n});\n\nfunction sibling( cur, dir ) {\n\twhile ( (cur = cur[dir]) && cur.nodeType !== 1 ) {}\n\treturn cur;\n}\n\njQuery.each({\n\tparent: function( elem ) {\n\t\tvar parent = elem.parentNode;\n\t\treturn parent && parent.nodeType !== 11 ? parent : null;\n\t},\n\tparents: function( elem ) {\n\t\treturn jQuery.dir( elem, "parentNode" );\n\t},\n\tparentsUntil: function( elem, i, until ) {\n\t\treturn jQuery.dir( elem, "parentNode", until );\n\t},\n\tnext: function( elem ) {\n\t\treturn sibling( elem, "nextSibling" );\n\t},\n\tprev: function( elem ) {\n\t\treturn sibling( elem, "previousSibling" );\n\t},\n\tnextAll: function( elem ) {\n\t\treturn jQuery.dir( elem, "nextSibling" );\n\t},\n\tprevAll: function( elem ) {\n\t\treturn jQuery.dir( elem, "previousSibling" );\n\t},\n\tnextUntil: function( elem, i, until ) {\n\t\treturn jQuery.dir( elem, "nextSibling", until );\n\t},\n\tprevUntil: function( elem, i, until ) {\n\t\treturn jQuery.dir( elem, "previousSibling", until );\n\t},\n\tsiblings: function( elem ) {\n\t\treturn jQuery.sibling( ( elem.parentNode || {} ).firstChild, elem );\n\t},\n\tchildren: function( elem ) {\n\t\treturn jQuery.sibling( elem.firstChild );\n\t},\n\tcontents: function( elem ) {\n\t\treturn elem.contentDocument || jQuery.merge( [], elem.childNodes );\n\t}\n}, function( name, fn ) {\n\tjQuery.fn[ name ] = function( until, selector ) {\n\t\tvar matched = jQuery.map( this, fn, until );\n\n\t\tif ( name.slice( -5 ) !== "Until" ) {\n\t\t\tselector = until;\n\t\t}\n\n\t\tif ( selector && typeof selector === "string" ) {\n\t\t\tmatched = jQuery.filter( selector, matched );\n\t\t}\n\n\t\tif ( this.length > 1 ) {\n\t\t\t// Remove duplicates\n\t\t\tif ( !guaranteedUnique[ name ] ) {\n\t\t\t\tjQuery.unique( matched );\n\t\t\t}\n\n\t\t\t// Reverse order for parents* and prev-derivatives\n\t\t\tif ( rparentsprev.test( name ) ) {\n\t\t\t\tmatched.reverse();\n\t\t\t}\n\t\t}\n\n\t\treturn this.pushStack( matched );\n\t};\n});\nvar rnotwhite = (/\\S+/g);\n\n\n\n// String to Object options format cache\nvar optionsCache = {};\n\n// Convert String-formatted options into Object-formatted ones and store in cache\nfunction createOptions( options ) {\n\tvar object = optionsCache[ options ] = {};\n\tjQuery.each( options.match( rnotwhite ) || [], function( _, flag ) {\n\t\tobject[ flag ] = true;\n\t});\n\treturn object;\n}\n\n/*\n * Create a callback list using the following parameters:\n *\n *\toptions: an optional list of space-separated options that will change how\n *\t\t\tthe callback list behaves or a more traditional option object\n *\n * By default a callback list will act like an event callback list and can be\n * "fired" multiple times.\n *\n * Possible options:\n *\n *\tonce:\t\t\twill ensure the callback list can only be fired once (like a Deferred)\n *\n *\tmemory:\t\t\twill keep track of previous values and will call any callback added\n *\t\t\t\t\tafter the list has been fired right away with the latest "memorized"\n *\t\t\t\t\tvalues (like a Deferred)\n *\n *\tunique:\t\t\twill ensure a callback can only be added once (no duplicate in the list)\n *\n *\tstopOnFalse:\tinterrupt callings when a callback returns false\n *\n */\njQuery.Callbacks = function( options ) {\n\n\t// Convert options from String-formatted to Object-formatted if needed\n\t// (we check in cache first)\n\toptions = typeof options === "string" ?\n\t\t( optionsCache[ options ] || createOptions( options ) ) :\n\t\tjQuery.extend( {}, options );\n\n\tvar // Last fire value (for non-forgettable lists)\n\t\tmemory,\n\t\t// Flag to know if list was already fired\n\t\tfired,\n\t\t// Flag to know if list is currently firing\n\t\tfiring,\n\t\t// First callback to fire (used internally by add and fireWith)\n\t\tfiringStart,\n\t\t// End of the loop when firing\n\t\tfiringLength,\n\t\t// Index of currently firing callback (modified by remove if needed)\n\t\tfiringIndex,\n\t\t// Actual callback list\n\t\tlist = [],\n\t\t// Stack of fire calls for repeatable lists\n\t\tstack = !options.once && [],\n\t\t// Fire callbacks\n\t\tfire = function( data ) {\n\t\t\tmemory = options.memory && data;\n\t\t\tfired = true;\n\t\t\tfiringIndex = firingStart || 0;\n\t\t\tfiringStart = 0;\n\t\t\tfiringLength = list.length;\n\t\t\tfiring = true;\n\t\t\tfor ( ; list && firingIndex < firingLength; firingIndex++ ) {\n\t\t\t\tif ( list[ firingIndex ].apply( data[ 0 ], data[ 1 ] ) === false && options.stopOnFalse ) {\n\t\t\t\t\tmemory = false; // To prevent further calls using add\n\t\t\t\t\tbreak;\n\t\t\t\t}\n\t\t\t}\n\t\t\tfiring = false;\n\t\t\tif ( list ) {\n\t\t\t\tif ( stack ) {\n\t\t\t\t\tif ( stack.length ) {\n\t\t\t\t\t\tfire( stack.shift() );\n\t\t\t\t\t}\n\t\t\t\t} else if ( memory ) {\n\t\t\t\t\tlist = [];\n\t\t\t\t} else {\n\t\t\t\t\tself.disable();\n\t\t\t\t}\n\t\t\t}\n\t\t},\n\t\t// Actual Callbacks object\n\t\tself = {\n\t\t\t// Add a callback or a collection of callbacks to the list\n\t\t\tadd: function() {\n\t\t\t\tif ( list ) {\n\t\t\t\t\t// First, we save the current length\n\t\t\t\t\tvar start = list.length;\n\t\t\t\t\t(function add( args ) {\n\t\t\t\t\t\tjQuery.each( args, function( _, arg ) {\n\t\t\t\t\t\t\tvar type = jQuery.type( arg );\n\t\t\t\t\t\t\tif ( type === "function" ) {\n\t\t\t\t\t\t\t\tif ( !options.unique || !self.has( arg ) ) {\n\t\t\t\t\t\t\t\t\tlist.push( arg );\n\t\t\t\t\t\t\t\t}\n\t\t\t\t\t\t\t} else if ( arg && arg.length && type !== "string" ) {\n\t\t\t\t\t\t\t\t// Inspect recursively\n\t\t\t\t\t\t\t\tadd( arg );\n\t\t\t\t\t\t\t}\n\t\t\t\t\t\t});\n\t\t\t\t\t})( arguments );\n\t\t\t\t\t// Do we need to add the callbacks to the\n\t\t\t\t\t// current firing batch?\n\t\t\t\t\tif ( firing ) {\n\t\t\t\t\t\tfiringLength = list.length;\n\t\t\t\t\t// With memory, if we\'re not firing then\n\t\t\t\t\t// we should call right away\n\t\t\t\t\t} else if ( memory ) {\n\t\t\t\t\t\tfiringStart = start;\n\t\t\t\t\t\tfire( memory );\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t\treturn this;\n\t\t\t},\n\t\t\t// Remove a callback from the list\n\t\t\tremove: function() {\n\t\t\t\tif ( list ) {\n\t\t\t\t\tjQuery.each( arguments, function( _, arg ) {\n\t\t\t\t\t\tvar index;\n\t\t\t\t\t\twhile ( ( index = jQuery.inArray( arg, list, index ) ) > -1 ) {\n\t\t\t\t\t\t\tlist.splice( index, 1 );\n\t\t\t\t\t\t\t// Handle firing indexes\n\t\t\t\t\t\t\tif ( firing ) {\n\t\t\t\t\t\t\t\tif ( index <= firingLength ) {\n\t\t\t\t\t\t\t\t\tfiringLength--;\n\t\t\t\t\t\t\t\t}\n\t\t\t\t\t\t\t\tif ( index <= firingIndex ) {\n\t\t\t\t\t\t\t\t\tfiringIndex--;\n\t\t\t\t\t\t\t\t}\n\t\t\t\t\t\t\t}\n\t\t\t\t\t\t}\n\t\t\t\t\t});\n\t\t\t\t}\n\t\t\t\treturn this;\n\t\t\t},\n\t\t\t// Check if a given callback is in the list.\n\t\t\t// If no argument is given, return whether or not list has callbacks attached.\n\t\t\thas: function( fn ) {\n\t\t\t\treturn fn ? jQuery.inArray( fn, list ) > -1 : !!( list && list.length );\n\t\t\t},\n\t\t\t// Remove all callbacks from the list\n\t\t\tempty: function() {\n\t\t\t\tlist = [];\n\t\t\t\tfiringLength = 0;\n\t\t\t\treturn this;\n\t\t\t},\n\t\t\t// Have the list do nothing anymore\n\t\t\tdisable: function() {\n\t\t\t\tlist = stack = memory = undefined;\n\t\t\t\treturn this;\n\t\t\t},\n\t\t\t// Is it disabled?\n\t\t\tdisabled: function() {\n\t\t\t\treturn !list;\n\t\t\t},\n\t\t\t// Lock the list in its current state\n\t\t\tlock: function() {\n\t\t\t\tstack = undefined;\n\t\t\t\tif ( !memory ) {\n\t\t\t\t\tself.disable();\n\t\t\t\t}\n\t\t\t\treturn this;\n\t\t\t},\n\t\t\t// Is it locked?\n\t\t\tlocked: function() {\n\t\t\t\treturn !stack;\n\t\t\t},\n\t\t\t// Call all callbacks with the given context and arguments\n\t\t\tfireWith: function( context, args ) {\n\t\t\t\tif ( list && ( !fired || stack ) ) {\n\t\t\t\t\targs = args || [];\n\t\t\t\t\targs = [ context, args.slice ? args.slice() : args ];\n\t\t\t\t\tif ( firing ) {\n\t\t\t\t\t\tstack.push( args );\n\t\t\t\t\t} else {\n\t\t\t\t\t\tfire( args );\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t\treturn this;\n\t\t\t},\n\t\t\t// Call all the callbacks with the given arguments\n\t\t\tfire: function() {\n\t\t\t\tself.fireWith( this, arguments );\n\t\t\t\treturn this;\n\t\t\t},\n\t\t\t// To know if the callbacks have already been called at least once\n\t\t\tfired: function() {\n\t\t\t\treturn !!fired;\n\t\t\t}\n\t\t};\n\n\treturn self;\n};\n\n\njQuery.extend({\n\n\tDeferred: function( func ) {\n\t\tvar tuples = [\n\t\t\t\t// action, add listener, listener list, final state\n\t\t\t\t[ "resolve", "done", jQuery.Callbacks("once memory"), "resolved" ],\n\t\t\t\t[ "reject", "fail", jQuery.Callbacks("once memory"), "rejected" ],\n\t\t\t\t[ "notify", "progress", jQuery.Callbacks("memory") ]\n\t\t\t],\n\t\t\tstate = "pending",\n\t\t\tpromise = {\n\t\t\t\tstate: function() {\n\t\t\t\t\treturn state;\n\t\t\t\t},\n\t\t\t\talways: function() {\n\t\t\t\t\tdeferred.done( arguments ).fail( arguments );\n\t\t\t\t\treturn this;\n\t\t\t\t},\n\t\t\t\tthen: function( /* fnDone, fnFail, fnProgress */ ) {\n\t\t\t\t\tvar fns = arguments;\n\t\t\t\t\treturn jQuery.Deferred(function( newDefer ) {\n\t\t\t\t\t\tjQuery.each( tuples, function( i, tuple ) {\n\t\t\t\t\t\t\tvar fn = jQuery.isFunction( fns[ i ] ) && fns[ i ];\n\t\t\t\t\t\t\t// deferred[ done | fail | progress ] for forwarding actions to newDefer\n\t\t\t\t\t\t\tdeferred[ tuple[1] ](function() {\n\t\t\t\t\t\t\t\tvar returned = fn && fn.apply( this, arguments );\n\t\t\t\t\t\t\t\tif ( returned && jQuery.isFunction( returned.promise ) ) {\n\t\t\t\t\t\t\t\t\treturned.promise()\n\t\t\t\t\t\t\t\t\t\t.done( newDefer.resolve )\n\t\t\t\t\t\t\t\t\t\t.fail( newDefer.reject )\n\t\t\t\t\t\t\t\t\t\t.progress( newDefer.notify );\n\t\t\t\t\t\t\t\t} else {\n\t\t\t\t\t\t\t\t\tnewDefer[ tuple[ 0 ] + "With" ]( this === promise ? newDefer.promise() : this, fn ? [ returned ] : arguments );\n\t\t\t\t\t\t\t\t}\n\t\t\t\t\t\t\t});\n\t\t\t\t\t\t});\n\t\t\t\t\t\tfns = null;\n\t\t\t\t\t}).promise();\n\t\t\t\t},\n\t\t\t\t// Get a promise for this deferred\n\t\t\t\t// If obj is provided, the promise aspect is added to the object\n\t\t\t\tpromise: function( obj ) {\n\t\t\t\t\treturn obj != null ? jQuery.extend( obj, promise ) : promise;\n\t\t\t\t}\n\t\t\t},\n\t\t\tdeferred = {};\n\n\t\t// Keep pipe for back-compat\n\t\tpromise.pipe = promise.then;\n\n\t\t// Add list-specific methods\n\t\tjQuery.each( tuples, function( i, tuple ) {\n\t\t\tvar list = tuple[ 2 ],\n\t\t\t\tstateString = tuple[ 3 ];\n\n\t\t\t// promise[ done | fail | progress ] = list.add\n\t\t\tpromise[ tuple[1] ] = list.add;\n\n\t\t\t// Handle state\n\t\t\tif ( stateString ) {\n\t\t\t\tlist.add(function() {\n\t\t\t\t\t// state = [ resolved | rejected ]\n\t\t\t\t\tstate = stateString;\n\n\t\t\t\t// [ reject_list | resolve_list ].disable; progress_list.lock\n\t\t\t\t}, tuples[ i ^ 1 ][ 2 ].disable, tuples[ 2 ][ 2 ].lock );\n\t\t\t}\n\n\t\t\t// deferred[ resolve | reject | notify ]\n\t\t\tdeferred[ tuple[0] ] = function() {\n\t\t\t\tdeferred[ tuple[0] + "With" ]( this === deferred ? promise : this, arguments );\n\t\t\t\treturn this;\n\t\t\t};\n\t\t\tdeferred[ tuple[0] + "With" ] = list.fireWith;\n\t\t});\n\n\t\t// Make the deferred a promise\n\t\tpromise.promise( deferred );\n\n\t\t// Call given func if any\n\t\tif ( func ) {\n\t\t\tfunc.call( deferred, deferred );\n\t\t}\n\n\t\t// All done!\n\t\treturn deferred;\n\t},\n\n\t// Deferred helper\n\twhen: function( subordinate /* , ..., subordinateN */ ) {\n\t\tvar i = 0,\n\t\t\tresolveValues = slice.call( arguments ),\n\t\t\tlength = resolveValues.length,\n\n\t\t\t// the count of uncompleted subordinates\n\t\t\tremaining = length !== 1 || ( subordinate && jQuery.isFunction( subordinate.promise ) ) ? length : 0,\n\n\t\t\t// the master Deferred. If resolveValues consist of only a single Deferred, just use that.\n\t\t\tdeferred = remaining === 1 ? subordinate : jQuery.Deferred(),\n\n\t\t\t// Update function for both resolve and progress values\n\t\t\tupdateFunc = function( i, contexts, values ) {\n\t\t\t\treturn function( value ) {\n\t\t\t\t\tcontexts[ i ] = this;\n\t\t\t\t\tvalues[ i ] = arguments.length > 1 ? slice.call( arguments ) : value;\n\t\t\t\t\tif ( values === progressValues ) {\n\t\t\t\t\t\tdeferred.notifyWith( contexts, values );\n\t\t\t\t\t} else if ( !( --remaining ) ) {\n\t\t\t\t\t\tdeferred.resolveWith( contexts, values );\n\t\t\t\t\t}\n\t\t\t\t};\n\t\t\t},\n\n\t\t\tprogressValues, progressContexts, resolveContexts;\n\n\t\t// Add listeners to Deferred subordinates; treat others as resolved\n\t\tif ( length > 1 ) {\n\t\t\tprogressValues = new Array( length );\n\t\t\tprogressContexts = new Array( length );\n\t\t\tresolveContexts = new Array( length );\n\t\t\tfor ( ; i < length; i++ ) {\n\t\t\t\tif ( resolveValues[ i ] && jQuery.isFunction( resolveValues[ i ].promise ) ) {\n\t\t\t\t\tresolveValues[ i ].promise()\n\t\t\t\t\t\t.done( updateFunc( i, resolveContexts, resolveValues ) )\n\t\t\t\t\t\t.fail( deferred.reject )\n\t\t\t\t\t\t.progress( updateFunc( i, progressContexts, progressValues ) );\n\t\t\t\t} else {\n\t\t\t\t\t--remaining;\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\n\t\t// If we\'re not waiting on anything, resolve the master\n\t\tif ( !remaining ) {\n\t\t\tdeferred.resolveWith( resolveContexts, resolveValues );\n\t\t}\n\n\t\treturn deferred.promise();\n\t}\n});\n\n\n// The deferred used on DOM ready\nvar readyList;\n\njQuery.fn.ready = function( fn ) {\n\t// Add the callback\n\tjQuery.ready.promise().done( fn );\n\n\treturn this;\n};\n\njQuery.extend({\n\t// Is the DOM ready to be used? Set to true once it occurs.\n\tisReady: false,\n\n\t// A counter to track how many items to wait for before\n\t// the ready event fires. See #6781\n\treadyWait: 1,\n\n\t// Hold (or release) the ready event\n\tholdReady: function( hold ) {\n\t\tif ( hold ) {\n\t\t\tjQuery.readyWait++;\n\t\t} else {\n\t\t\tjQuery.ready( true );\n\t\t}\n\t},\n\n\t// Handle when the DOM is ready\n\tready: function( wait ) {\n\n\t\t// Abort if there are pending holds or we\'re already ready\n\t\tif ( wait === true ? --jQuery.readyWait : jQuery.isReady ) {\n\t\t\treturn;\n\t\t}\n\n\t\t// Remember that the DOM is ready\n\t\tjQuery.isReady = true;\n\n\t\t// If a normal DOM Ready event fired, decrement, and wait if need be\n\t\tif ( wait !== true && --jQuery.readyWait > 0 ) {\n\t\t\treturn;\n\t\t}\n\n\t\t// If there are functions bound, to execute\n\t\treadyList.resolveWith( document, [ jQuery ] );\n\n\t\t// Trigger any bound ready events\n\t\tif ( jQuery.fn.triggerHandler ) {\n\t\t\tjQuery( document ).triggerHandler( "ready" );\n\t\t\tjQuery( document ).off( "ready" );\n\t\t}\n\t}\n});\n\n/**\n * The ready event handler and self cleanup method\n */\nfunction completed() {\n\tdocument.removeEventListener( "DOMContentLoaded", completed, false );\n\twindow.removeEventListener( "load", completed, false );\n\tjQuery.ready();\n}\n\njQuery.ready.promise = function( obj ) {\n\tif ( !readyList ) {\n\n\t\treadyList = jQuery.Deferred();\n\n\t\t// Catch cases where $(document).ready() is called after the browser event has already occurred.\n\t\t// We once tried to use readyState "interactive" here, but it caused issues like the one\n\t\t// discovered by ChrisS here: http://bugs.jquery.com/ticket/12282#comment:15\n\t\tif ( document.readyState === "complete" ) {\n\t\t\t// Handle it asynchronously to allow scripts the opportunity to delay ready\n\t\t\tsetTimeout( jQuery.ready );\n\n\t\t} else {\n\n\t\t\t// Use the handy event callback\n\t\t\tdocument.addEventListener( "DOMContentLoaded", completed, false );\n\n\t\t\t// A fallback to window.onload, that will always work\n\t\t\twindow.addEventListener( "load", completed, false );\n\t\t}\n\t}\n\treturn readyList.promise( obj );\n};\n\n// Kick off the DOM ready check even if the user does not\njQuery.ready.promise();\n\n\n\n\n// Multifunctional method to get and set values of a collection\n// The value/s can optionally be executed if it\'s a function\nvar access = jQuery.access = function( elems, fn, key, value, chainable, emptyGet, raw ) {\n\tvar i = 0,\n\t\tlen = elems.length,\n\t\tbulk = key == null;\n\n\t// Sets many values\n\tif ( jQuery.type( key ) === "object" ) {\n\t\tchainable = true;\n\t\tfor ( i in key ) {\n\t\t\tjQuery.access( elems, fn, i, key[i], true, emptyGet, raw );\n\t\t}\n\n\t// Sets one value\n\t} else if ( value !== undefined ) {\n\t\tchainable = true;\n\n\t\tif ( !jQuery.isFunction( value ) ) {\n\t\t\traw = true;\n\t\t}\n\n\t\tif ( bulk ) {\n\t\t\t// Bulk operations run against the entire set\n\t\t\tif ( raw ) {\n\t\t\t\tfn.call( elems, value );\n\t\t\t\tfn = null;\n\n\t\t\t// ...except when executing function values\n\t\t\t} else {\n\t\t\t\tbulk = fn;\n\t\t\t\tfn = function( elem, key, value ) {\n\t\t\t\t\treturn bulk.call( jQuery( elem ), value );\n\t\t\t\t};\n\t\t\t}\n\t\t}\n\n\t\tif ( fn ) {\n\t\t\tfor ( ; i < len; i++ ) {\n\t\t\t\tfn( elems[i], key, raw ? value : value.call( elems[i], i, fn( elems[i], key ) ) );\n\t\t\t}\n\t\t}\n\t}\n\n\treturn chainable ?\n\t\telems :\n\n\t\t// Gets\n\t\tbulk ?\n\t\t\tfn.call( elems ) :\n\t\t\tlen ? fn( elems[0], key ) : emptyGet;\n};\n\n\n/**\n * Determines whether an object can have data\n */\njQuery.acceptData = function( owner ) {\n\t// Accepts only:\n\t//  - Node\n\t//    - Node.ELEMENT_NODE\n\t//    - Node.DOCUMENT_NODE\n\t//  - Object\n\t//    - Any\n\t/* jshint -W018 */\n\treturn owner.nodeType === 1 || owner.nodeType === 9 || !( +owner.nodeType );\n};\n\n\nfunction Data() {\n\t// Support: Android<4,\n\t// Old WebKit does not have Object.preventExtensions/freeze method,\n\t// return new empty object instead with no [[set]] accessor\n\tObject.defineProperty( this.cache = {}, 0, {\n\t\tget: function() {\n\t\t\treturn {};\n\t\t}\n\t});\n\n\tthis.expando = jQuery.expando + Data.uid++;\n}\n\nData.uid = 1;\nData.accepts = jQuery.acceptData;\n\nData.prototype = {\n\tkey: function( owner ) {\n\t\t// We can accept data for non-element nodes in modern browsers,\n\t\t// but we should not, see #8335.\n\t\t// Always return the key for a frozen object.\n\t\tif ( !Data.accepts( owner ) ) {\n\t\t\treturn 0;\n\t\t}\n\n\t\tvar descriptor = {},\n\t\t\t// Check if the owner object already has a cache key\n\t\t\tunlock = owner[ this.expando ];\n\n\t\t// If not, create one\n\t\tif ( !unlock ) {\n\t\t\tunlock = Data.uid++;\n\n\t\t\t// Secure it in a non-enumerable, non-writable property\n\t\t\ttry {\n\t\t\t\tdescriptor[ this.expando ] = { value: unlock };\n\t\t\t\tObject.defineProperties( owner, descriptor );\n\n\t\t\t// Support: Android<4\n\t\t\t// Fallback to a less secure definition\n\t\t\t} catch ( e ) {\n\t\t\t\tdescriptor[ this.expando ] = unlock;\n\t\t\t\tjQuery.extend( owner, descriptor );\n\t\t\t}\n\t\t}\n\n\t\t// Ensure the cache object\n\t\tif ( !this.cache[ unlock ] ) {\n\t\t\tthis.cache[ unlock ] = {};\n\t\t}\n\n\t\treturn unlock;\n\t},\n\tset: function( owner, data, value ) {\n\t\tvar prop,\n\t\t\t// There may be an unlock assigned to this node,\n\t\t\t// if there is no entry for this "owner", create one inline\n\t\t\t// and set the unlock as though an owner entry had always existed\n\t\t\tunlock = this.key( owner ),\n\t\t\tcache = this.cache[ unlock ];\n\n\t\t// Handle: [ owner, key, value ] args\n\t\tif ( typeof data === "string" ) {\n\t\t\tcache[ data ] = value;\n\n\t\t// Handle: [ owner, { properties } ] args\n\t\t} else {\n\t\t\t// Fresh assignments by object are shallow copied\n\t\t\tif ( jQuery.isEmptyObject( cache ) ) {\n\t\t\t\tjQuery.extend( this.cache[ unlock ], data );\n\t\t\t// Otherwise, copy the properties one-by-one to the cache object\n\t\t\t} else {\n\t\t\t\tfor ( prop in data ) {\n\t\t\t\t\tcache[ prop ] = data[ prop ];\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t\treturn cache;\n\t},\n\tget: function( owner, key ) {\n\t\t// Either a valid cache is found, or will be created.\n\t\t// New caches will be created and the unlock returned,\n\t\t// allowing direct access to the newly created\n\t\t// empty data object. A valid owner object must be provided.\n\t\tvar cache = this.cache[ this.key( owner ) ];\n\n\t\treturn key === undefined ?\n\t\t\tcache : cache[ key ];\n\t},\n\taccess: function( owner, key, value ) {\n\t\tvar stored;\n\t\t// In cases where either:\n\t\t//\n\t\t//   1. No key was specified\n\t\t//   2. A string key was specified, but no value provided\n\t\t//\n\t\t// Take the "read" path and allow the get method to determine\n\t\t// which value to return, respectively either:\n\t\t//\n\t\t//   1. The entire cache object\n\t\t//   2. The data stored at the key\n\t\t//\n\t\tif ( key === undefined ||\n\t\t\t\t((key && typeof key === "string") && value === undefined) ) {\n\n\t\t\tstored = this.get( owner, key );\n\n\t\t\treturn stored !== undefined ?\n\t\t\t\tstored : this.get( owner, jQuery.camelCase(key) );\n\t\t}\n\n\t\t// [*]When the key is not a string, or both a key and value\n\t\t// are specified, set or extend (existing objects) with either:\n\t\t//\n\t\t//   1. An object of properties\n\t\t//   2. A key and value\n\t\t//\n\t\tthis.set( owner, key, value );\n\n\t\t// Since the "set" path can have two possible entry points\n\t\t// return the expected data based on which path was taken[*]\n\t\treturn value !== undefined ? value : key;\n\t},\n\tremove: function( owner, key ) {\n\t\tvar i, name, camel,\n\t\t\tunlock = this.key( owner ),\n\t\t\tcache = this.cache[ unlock ];\n\n\t\tif ( key === undefined ) {\n\t\t\tthis.cache[ unlock ] = {};\n\n\t\t} else {\n\t\t\t// Support array or space separated string of keys\n\t\t\tif ( jQuery.isArray( key ) ) {\n\t\t\t\t// If "name" is an array of keys...\n\t\t\t\t// When data is initially created, via ("key", "val") signature,\n\t\t\t\t// keys will be converted to camelCase.\n\t\t\t\t// Since there is no way to tell _how_ a key was added, remove\n\t\t\t\t// both plain key and camelCase key. #12786\n\t\t\t\t// This will only penalize the array argument path.\n\t\t\t\tname = key.concat( key.map( jQuery.camelCase ) );\n\t\t\t} else {\n\t\t\t\tcamel = jQuery.camelCase( key );\n\t\t\t\t// Try the string as a key before any manipulation\n\t\t\t\tif ( key in cache ) {\n\t\t\t\t\tname = [ key, camel ];\n\t\t\t\t} else {\n\t\t\t\t\t// If a key with the spaces exists, use it.\n\t\t\t\t\t// Otherwise, create an array by matching non-whitespace\n\t\t\t\t\tname = camel;\n\t\t\t\t\tname = name in cache ?\n\t\t\t\t\t\t[ name ] : ( name.match( rnotwhite ) || [] );\n\t\t\t\t}\n\t\t\t}\n\n\t\t\ti = name.length;\n\t\t\twhile ( i-- ) {\n\t\t\t\tdelete cache[ name[ i ] ];\n\t\t\t}\n\t\t}\n\t},\n\thasData: function( owner ) {\n\t\treturn !jQuery.isEmptyObject(\n\t\t\tthis.cache[ owner[ this.expando ] ] || {}\n\t\t);\n\t},\n\tdiscard: function( owner ) {\n\t\tif ( owner[ this.expando ] ) {\n\t\t\tdelete this.cache[ owner[ this.expando ] ];\n\t\t}\n\t}\n};\nvar data_priv = new Data();\n\nvar data_user = new Data();\n\n\n\n//\tImplementation Summary\n//\n//\t1. Enforce API surface and semantic compatibility with 1.9.x branch\n//\t2. Improve the module\'s maintainability by reducing the storage\n//\t\tpaths to a single mechanism.\n//\t3. Use the same single mechanism to support "private" and "user" data.\n//\t4. _Never_ expose "private" data to user code (TODO: Drop _data, _removeData)\n//\t5. Avoid exposing implementation details on user objects (eg. expando properties)\n//\t6. Provide a clear path for implementation upgrade to WeakMap in 2014\n\nvar rbrace = /^(?:\\{[\\w\\W]*\\}|\\[[\\w\\W]*\\])$/,\n\trmultiDash = /([A-Z])/g;\n\nfunction dataAttr( elem, key, data ) {\n\tvar name;\n\n\t// If nothing was found internally, try to fetch any\n\t// data from the HTML5 data-* attribute\n\tif ( data === undefined && elem.nodeType === 1 ) {\n\t\tname = "data-" + key.replace( rmultiDash, "-$1" ).toLowerCase();\n\t\tdata = elem.getAttribute( name );\n\n\t\tif ( typeof data === "string" ) {\n\t\t\ttry {\n\t\t\t\tdata = data === "true" ? true :\n\t\t\t\t\tdata === "false" ? false :\n\t\t\t\t\tdata === "null" ? null :\n\t\t\t\t\t// Only convert to a number if it doesn\'t change the string\n\t\t\t\t\t+data + "" === data ? +data :\n\t\t\t\t\trbrace.test( data ) ? jQuery.parseJSON( data ) :\n\t\t\t\t\tdata;\n\t\t\t} catch( e ) {}\n\n\t\t\t// Make sure we set the data so it isn\'t changed later\n\t\t\tdata_user.set( elem, key, data );\n\t\t} else {\n\t\t\tdata = undefined;\n\t\t}\n\t}\n\treturn data;\n}\n\njQuery.extend({\n\thasData: function( elem ) {\n\t\treturn data_user.hasData( elem ) || data_priv.hasData( elem );\n\t},\n\n\tdata: function( elem, name, data ) {\n\t\treturn data_user.access( elem, name, data );\n\t},\n\n\tremoveData: function( elem, name ) {\n\t\tdata_user.remove( elem, name );\n\t},\n\n\t// TODO: Now that all calls to _data and _removeData have been replaced\n\t// with direct calls to data_priv methods, these can be deprecated.\n\t_data: function( elem, name, data ) {\n\t\treturn data_priv.access( elem, name, data );\n\t},\n\n\t_removeData: function( elem, name ) {\n\t\tdata_priv.remove( elem, name );\n\t}\n});\n\njQuery.fn.extend({\n\tdata: function( key, value ) {\n\t\tvar i, name, data,\n\t\t\telem = this[ 0 ],\n\t\t\tattrs = elem && elem.attributes;\n\n\t\t// Gets all values\n\t\tif ( key === undefined ) {\n\t\t\tif ( this.length ) {\n\t\t\t\tdata = data_user.get( elem );\n\n\t\t\t\tif ( elem.nodeType === 1 && !data_priv.get( elem, "hasDataAttrs" ) ) {\n\t\t\t\t\ti = attrs.length;\n\t\t\t\t\twhile ( i-- ) {\n\n\t\t\t\t\t\t// Support: IE11+\n\t\t\t\t\t\t// The attrs elements can be null (#14894)\n\t\t\t\t\t\tif ( attrs[ i ] ) {\n\t\t\t\t\t\t\tname = attrs[ i ].name;\n\t\t\t\t\t\t\tif ( name.indexOf( "data-" ) === 0 ) {\n\t\t\t\t\t\t\t\tname = jQuery.camelCase( name.slice(5) );\n\t\t\t\t\t\t\t\tdataAttr( elem, name, data[ name ] );\n\t\t\t\t\t\t\t}\n\t\t\t\t\t\t}\n\t\t\t\t\t}\n\t\t\t\t\tdata_priv.set( elem, "hasDataAttrs", true );\n\t\t\t\t}\n\t\t\t}\n\n\t\t\treturn data;\n\t\t}\n\n\t\t// Sets multiple values\n\t\tif ( typeof key === "object" ) {\n\t\t\treturn this.each(function() {\n\t\t\t\tdata_user.set( this, key );\n\t\t\t});\n\t\t}\n\n\t\treturn access( this, function( value ) {\n\t\t\tvar data,\n\t\t\t\tcamelKey = jQuery.camelCase( key );\n\n\t\t\t// The calling jQuery object (element matches) is not empty\n\t\t\t// (and therefore has an element appears at this[ 0 ]) and the\n\t\t\t// `value` parameter was not undefined. An empty jQuery object\n\t\t\t// will result in `undefined` for elem = this[ 0 ] which will\n\t\t\t// throw an exception if an attempt to read a data cache is made.\n\t\t\tif ( elem && value === undefined ) {\n\t\t\t\t// Attempt to get data from the cache\n\t\t\t\t// with the key as-is\n\t\t\t\tdata = data_user.get( elem, key );\n\t\t\t\tif ( data !== undefined ) {\n\t\t\t\t\treturn data;\n\t\t\t\t}\n\n\t\t\t\t// Attempt to get data from the cache\n\t\t\t\t// with the key camelized\n\t\t\t\tdata = data_user.get( elem, camelKey );\n\t\t\t\tif ( data !== undefined ) {\n\t\t\t\t\treturn data;\n\t\t\t\t}\n\n\t\t\t\t// Attempt to "discover" the data in\n\t\t\t\t// HTML5 custom data-* attrs\n\t\t\t\tdata = dataAttr( elem, camelKey, undefined );\n\t\t\t\tif ( data !== undefined ) {\n\t\t\t\t\treturn data;\n\t\t\t\t}\n\n\t\t\t\t// We tried really hard, but the data doesn\'t exist.\n\t\t\t\treturn;\n\t\t\t}\n\n\t\t\t// Set the data...\n\t\t\tthis.each(function() {\n\t\t\t\t// First, attempt to store a copy or reference of any\n\t\t\t\t// data that might\'ve been store with a camelCased key.\n\t\t\t\tvar data = data_user.get( this, camelKey );\n\n\t\t\t\t// For HTML5 data-* attribute interop, we have to\n\t\t\t\t// store property names with dashes in a camelCase form.\n\t\t\t\t// This might not apply to all properties...*\n\t\t\t\tdata_user.set( this, camelKey, value );\n\n\t\t\t\t// *... In the case of properties that might _actually_\n\t\t\t\t// have dashes, we need to also store a copy of that\n\t\t\t\t// unchanged property.\n\t\t\t\tif ( key.indexOf("-") !== -1 && data !== undefined ) {\n\t\t\t\t\tdata_user.set( this, key, value );\n\t\t\t\t}\n\t\t\t});\n\t\t}, null, value, arguments.length > 1, null, true );\n\t},\n\n\tremoveData: function( key ) {\n\t\treturn this.each(function() {\n\t\t\tdata_user.remove( this, key );\n\t\t});\n\t}\n});\n\n\njQuery.extend({\n\tqueue: function( elem, type, data ) {\n\t\tvar queue;\n\n\t\tif ( elem ) {\n\t\t\ttype = ( type || "fx" ) + "queue";\n\t\t\tqueue = data_priv.get( elem, type );\n\n\t\t\t// Speed up dequeue by getting out quickly if this is just a lookup\n\t\t\tif ( data ) {\n\t\t\t\tif ( !queue || jQuery.isArray( data ) ) {\n\t\t\t\t\tqueue = data_priv.access( elem, type, jQuery.makeArray(data) );\n\t\t\t\t} else {\n\t\t\t\t\tqueue.push( data );\n\t\t\t\t}\n\t\t\t}\n\t\t\treturn queue || [];\n\t\t}\n\t},\n\n\tdequeue: function( elem, type ) {\n\t\ttype = type || "fx";\n\n\t\tvar queue = jQuery.queue( elem, type ),\n\t\t\tstartLength = queue.length,\n\t\t\tfn = queue.shift(),\n\t\t\thooks = jQuery._queueHooks( elem, type ),\n\t\t\tnext = function() {\n\t\t\t\tjQuery.dequeue( elem, type );\n\t\t\t};\n\n\t\t// If the fx queue is dequeued, always remove the progress sentinel\n\t\tif ( fn === "inprogress" ) {\n\t\t\tfn = queue.shift();\n\t\t\tstartLength--;\n\t\t}\n\n\t\tif ( fn ) {\n\n\t\t\t// Add a progress sentinel to prevent the fx queue from being\n\t\t\t// automatically dequeued\n\t\t\tif ( type === "fx" ) {\n\t\t\t\tqueue.unshift( "inprogress" );\n\t\t\t}\n\n\t\t\t// Clear up the last queue stop function\n\t\t\tdelete hooks.stop;\n\t\t\tfn.call( elem, next, hooks );\n\t\t}\n\n\t\tif ( !startLength && hooks ) {\n\t\t\thooks.empty.fire();\n\t\t}\n\t},\n\n\t// Not public - generate a queueHooks object, or return the current one\n\t_queueHooks: function( elem, type ) {\n\t\tvar key = type + "queueHooks";\n\t\treturn data_priv.get( elem, key ) || data_priv.access( elem, key, {\n\t\t\tempty: jQuery.Callbacks("once memory").add(function() {\n\t\t\t\tdata_priv.remove( elem, [ type + "queue", key ] );\n\t\t\t})\n\t\t});\n\t}\n});\n\njQuery.fn.extend({\n\tqueue: function( type, data ) {\n\t\tvar setter = 2;\n\n\t\tif ( typeof type !== "string" ) {\n\t\t\tdata = type;\n\t\t\ttype = "fx";\n\t\t\tsetter--;\n\t\t}\n\n\t\tif ( arguments.length < setter ) {\n\t\t\treturn jQuery.queue( this[0], type );\n\t\t}\n\n\t\treturn data === undefined ?\n\t\t\tthis :\n\t\t\tthis.each(function() {\n\t\t\t\tvar queue = jQuery.queue( this, type, data );\n\n\t\t\t\t// Ensure a hooks for this queue\n\t\t\t\tjQuery._queueHooks( this, type );\n\n\t\t\t\tif ( type === "fx" && queue[0] !== "inprogress" ) {\n\t\t\t\t\tjQuery.dequeue( this, type );\n\t\t\t\t}\n\t\t\t});\n\t},\n\tdequeue: function( type ) {\n\t\treturn this.each(function() {\n\t\t\tjQuery.dequeue( this, type );\n\t\t});\n\t},\n\tclearQueue: function( type ) {\n\t\treturn this.queue( type || "fx", [] );\n\t},\n\t// Get a promise resolved when queues of a certain type\n\t// are emptied (fx is the type by default)\n\tpromise: function( type, obj ) {\n\t\tvar tmp,\n\t\t\tcount = 1,\n\t\t\tdefer = jQuery.Deferred(),\n\t\t\telements = this,\n\t\t\ti = this.length,\n\t\t\tresolve = function() {\n\t\t\t\tif ( !( --count ) ) {\n\t\t\t\t\tdefer.resolveWith( elements, [ elements ] );\n\t\t\t\t}\n\t\t\t};\n\n\t\tif ( typeof type !== "string" ) {\n\t\t\tobj = type;\n\t\t\ttype = undefined;\n\t\t}\n\t\ttype = type || "fx";\n\n\t\twhile ( i-- ) {\n\t\t\ttmp = data_priv.get( elements[ i ], type + "queueHooks" );\n\t\t\tif ( tmp && tmp.empty ) {\n\t\t\t\tcount++;\n\t\t\t\ttmp.empty.add( resolve );\n\t\t\t}\n\t\t}\n\t\tresolve();\n\t\treturn defer.promise( obj );\n\t}\n});\nvar pnum = (/[+-]?(?:\\d*\\.|)\\d+(?:[eE][+-]?\\d+|)/).source;\n\nvar cssExpand = [ "Top", "Right", "Bottom", "Left" ];\n\nvar isHidden = function( elem, el ) {\n\t\t// isHidden might be called from jQuery#filter function;\n\t\t// in that case, element will be second argument\n\t\telem = el || elem;\n\t\treturn jQuery.css( elem, "display" ) === "none" || !jQuery.contains( elem.ownerDocument, elem );\n\t};\n\nvar rcheckableType = (/^(?:checkbox|radio)$/i);\n\n\n\n(function() {\n\tvar fragment = document.createDocumentFragment(),\n\t\tdiv = fragment.appendChild( document.createElement( "div" ) ),\n\t\tinput = document.createElement( "input" );\n\n\t// Support: Safari<=5.1\n\t// Check state lost if the name is set (#11217)\n\t// Support: Windows Web Apps (WWA)\n\t// `name` and `type` must use .setAttribute for WWA (#14901)\n\tinput.setAttribute( "type", "radio" );\n\tinput.setAttribute( "checked", "checked" );\n\tinput.setAttribute( "name", "t" );\n\n\tdiv.appendChild( input );\n\n\t// Support: Safari<=5.1, Android<4.2\n\t// Older WebKit doesn\'t clone checked state correctly in fragments\n\tsupport.checkClone = div.cloneNode( true ).cloneNode( true ).lastChild.checked;\n\n\t// Support: IE<=11+\n\t// Make sure textarea (and checkbox) defaultValue is properly cloned\n\tdiv.innerHTML = "<textarea>x</textarea>";\n\tsupport.noCloneChecked = !!div.cloneNode( true ).lastChild.defaultValue;\n})();\nvar strundefined = typeof undefined;\n\n\n\nsupport.focusinBubbles = "onfocusin" in window;\n\n\nvar\n\trkeyEvent = /^key/,\n\trmouseEvent = /^(?:mouse|pointer|contextmenu)|click/,\n\trfocusMorph = /^(?:focusinfocus|focusoutblur)$/,\n\trtypenamespace = /^([^.]*)(?:\\.(.+)|)$/;\n\nfunction returnTrue() {\n\treturn true;\n}\n\nfunction returnFalse() {\n\treturn false;\n}\n\nfunction safeActiveElement() {\n\ttry {\n\t\treturn document.activeElement;\n\t} catch ( err ) { }\n}\n\n/*\n * Helper functions for managing events -- not part of the public interface.\n * Props to Dean Edwards\' addEvent library for many of the ideas.\n */\njQuery.event = {\n\n\tglobal: {},\n\n\tadd: function( elem, types, handler, data, selector ) {\n\n\t\tvar handleObjIn, eventHandle, tmp,\n\t\t\tevents, t, handleObj,\n\t\t\tspecial, handlers, type, namespaces, origType,\n\t\t\telemData = data_priv.get( elem );\n\n\t\t// Don\'t attach events to noData or text/comment nodes (but allow plain objects)\n\t\tif ( !elemData ) {\n\t\t\treturn;\n\t\t}\n\n\t\t// Caller can pass in an object of custom data in lieu of the handler\n\t\tif ( handler.handler ) {\n\t\t\thandleObjIn = handler;\n\t\t\thandler = handleObjIn.handler;\n\t\t\tselector = handleObjIn.selector;\n\t\t}\n\n\t\t// Make sure that the handler has a unique ID, used to find/remove it later\n\t\tif ( !handler.guid ) {\n\t\t\thandler.guid = jQuery.guid++;\n\t\t}\n\n\t\t// Init the element\'s event structure and main handler, if this is the first\n\t\tif ( !(events = elemData.events) ) {\n\t\t\tevents = elemData.events = {};\n\t\t}\n\t\tif ( !(eventHandle = elemData.handle) ) {\n\t\t\teventHandle = elemData.handle = function( e ) {\n\t\t\t\t// Discard the second event of a jQuery.event.trigger() and\n\t\t\t\t// when an event is called after a page has unloaded\n\t\t\t\treturn typeof jQuery !== strundefined && jQuery.event.triggered !== e.type ?\n\t\t\t\t\tjQuery.event.dispatch.apply( elem, arguments ) : undefined;\n\t\t\t};\n\t\t}\n\n\t\t// Handle multiple events separated by a space\n\t\ttypes = ( types || "" ).match( rnotwhite ) || [ "" ];\n\t\tt = types.length;\n\t\twhile ( t-- ) {\n\t\t\ttmp = rtypenamespace.exec( types[t] ) || [];\n\t\t\ttype = origType = tmp[1];\n\t\t\tnamespaces = ( tmp[2] || "" ).split( "." ).sort();\n\n\t\t\t// There *must* be a type, no attaching namespace-only handlers\n\t\t\tif ( !type ) {\n\t\t\t\tcontinue;\n\t\t\t}\n\n\t\t\t// If event changes its type, use the special event handlers for the changed type\n\t\t\tspecial = jQuery.event.special[ type ] || {};\n\n\t\t\t// If selector defined, determine special event api type, otherwise given type\n\t\t\ttype = ( selector ? special.delegateType : special.bindType ) || type;\n\n\t\t\t// Update special based on newly reset type\n\t\t\tspecial = jQuery.event.special[ type ] || {};\n\n\t\t\t// handleObj is passed to all event handlers\n\t\t\thandleObj = jQuery.extend({\n\t\t\t\ttype: type,\n\t\t\t\torigType: origType,\n\t\t\t\tdata: data,\n\t\t\t\thandler: handler,\n\t\t\t\tguid: handler.guid,\n\t\t\t\tselector: selector,\n\t\t\t\tneedsContext: selector && jQuery.expr.match.needsContext.test( selector ),\n\t\t\t\tnamespace: namespaces.join(".")\n\t\t\t}, handleObjIn );\n\n\t\t\t// Init the event handler queue if we\'re the first\n\t\t\tif ( !(handlers = events[ type ]) ) {\n\t\t\t\thandlers = events[ type ] = [];\n\t\t\t\thandlers.delegateCount = 0;\n\n\t\t\t\t// Only use addEventListener if the special events handler returns false\n\t\t\t\tif ( !special.setup || special.setup.call( elem, data, namespaces, eventHandle ) === false ) {\n\t\t\t\t\tif ( elem.addEventListener ) {\n\t\t\t\t\t\telem.addEventListener( type, eventHandle, false );\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t}\n\n\t\t\tif ( special.add ) {\n\t\t\t\tspecial.add.call( elem, handleObj );\n\n\t\t\t\tif ( !handleObj.handler.guid ) {\n\t\t\t\t\thandleObj.handler.guid = handler.guid;\n\t\t\t\t}\n\t\t\t}\n\n\t\t\t// Add to the element\'s handler list, delegates in front\n\t\t\tif ( selector ) {\n\t\t\t\thandlers.splice( handlers.delegateCount++, 0, handleObj );\n\t\t\t} else {\n\t\t\t\thandlers.push( handleObj );\n\t\t\t}\n\n\t\t\t// Keep track of which events have ever been used, for event optimization\n\t\t\tjQuery.event.global[ type ] = true;\n\t\t}\n\n\t},\n\n\t// Detach an event or set of events from an element\n\tremove: function( elem, types, handler, selector, mappedTypes ) {\n\n\t\tvar j, origCount, tmp,\n\t\t\tevents, t, handleObj,\n\t\t\tspecial, handlers, type, namespaces, origType,\n\t\t\telemData = data_priv.hasData( elem ) && data_priv.get( elem );\n\n\t\tif ( !elemData || !(events = elemData.events) ) {\n\t\t\treturn;\n\t\t}\n\n\t\t// Once for each type.namespace in types; type may be omitted\n\t\ttypes = ( types || "" ).match( rnotwhite ) || [ "" ];\n\t\tt = types.length;\n\t\twhile ( t-- ) {\n\t\t\ttmp = rtypenamespace.exec( types[t] ) || [];\n\t\t\ttype = origType = tmp[1];\n\t\t\tnamespaces = ( tmp[2] || "" ).split( "." ).sort();\n\n\t\t\t// Unbind all events (on this namespace, if provided) for the element\n\t\t\tif ( !type ) {\n\t\t\t\tfor ( type in events ) {\n\t\t\t\t\tjQuery.event.remove( elem, type + types[ t ], handler, selector, true );\n\t\t\t\t}\n\t\t\t\tcontinue;\n\t\t\t}\n\n\t\t\tspecial = jQuery.event.special[ type ] || {};\n\t\t\ttype = ( selector ? special.delegateType : special.bindType ) || type;\n\t\t\thandlers = events[ type ] || [];\n\t\t\ttmp = tmp[2] && new RegExp( "(^|\\\\.)" + namespaces.join("\\\\.(?:.*\\\\.|)") + "(\\\\.|$)" );\n\n\t\t\t// Remove matching events\n\t\t\torigCount = j = handlers.length;\n\t\t\twhile ( j-- ) {\n\t\t\t\thandleObj = handlers[ j ];\n\n\t\t\t\tif ( ( mappedTypes || origType === handleObj.origType ) &&\n\t\t\t\t\t( !handler || handler.guid === handleObj.guid ) &&\n\t\t\t\t\t( !tmp || tmp.test( handleObj.namespace ) ) &&\n\t\t\t\t\t( !selector || selector === handleObj.selector || selector === "**" && handleObj.selector ) ) {\n\t\t\t\t\thandlers.splice( j, 1 );\n\n\t\t\t\t\tif ( handleObj.selector ) {\n\t\t\t\t\t\thandlers.delegateCount--;\n\t\t\t\t\t}\n\t\t\t\t\tif ( special.remove ) {\n\t\t\t\t\t\tspecial.remove.call( elem, handleObj );\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t}\n\n\t\t\t// Remove generic event handler if we removed something and no more handlers exist\n\t\t\t// (avoids potential for endless recursion during removal of special event handlers)\n\t\t\tif ( origCount && !handlers.length ) {\n\t\t\t\tif ( !special.teardown || special.teardown.call( elem, namespaces, elemData.handle ) === false ) {\n\t\t\t\t\tjQuery.removeEvent( elem, type, elemData.handle );\n\t\t\t\t}\n\n\t\t\t\tdelete events[ type ];\n\t\t\t}\n\t\t}\n\n\t\t// Remove the expando if it\'s no longer used\n\t\tif ( jQuery.isEmptyObject( events ) ) {\n\t\t\tdelete elemData.handle;\n\t\t\tdata_priv.remove( elem, "events" );\n\t\t}\n\t},\n\n\ttrigger: function( event, data, elem, onlyHandlers ) {\n\n\t\tvar i, cur, tmp, bubbleType, ontype, handle, special,\n\t\t\teventPath = [ elem || document ],\n\t\t\ttype = hasOwn.call( event, "type" ) ? event.type : event,\n\t\t\tnamespaces = hasOwn.call( event, "namespace" ) ? event.namespace.split(".") : [];\n\n\t\tcur = tmp = elem = elem || document;\n\n\t\t// Don\'t do events on text and comment nodes\n\t\tif ( elem.nodeType === 3 || elem.nodeType === 8 ) {\n\t\t\treturn;\n\t\t}\n\n\t\t// focus/blur morphs to focusin/out; ensure we\'re not firing them right now\n\t\tif ( rfocusMorph.test( type + jQuery.event.triggered ) ) {\n\t\t\treturn;\n\t\t}\n\n\t\tif ( type.indexOf(".") >= 0 ) {\n\t\t\t// Namespaced trigger; create a regexp to match event type in handle()\n\t\t\tnamespaces = type.split(".");\n\t\t\ttype = namespaces.shift();\n\t\t\tnamespaces.sort();\n\t\t}\n\t\tontype = type.indexOf(":") < 0 && "on" + type;\n\n\t\t// Caller can pass in a jQuery.Event object, Object, or just an event type string\n\t\tevent = event[ jQuery.expando ] ?\n\t\t\tevent :\n\t\t\tnew jQuery.Event( type, typeof event === "object" && event );\n\n\t\t// Trigger bitmask: & 1 for native handlers; & 2 for jQuery (always true)\n\t\tevent.isTrigger = onlyHandlers ? 2 : 3;\n\t\tevent.namespace = namespaces.join(".");\n\t\tevent.namespace_re = event.namespace ?\n\t\t\tnew RegExp( "(^|\\\\.)" + namespaces.join("\\\\.(?:.*\\\\.|)") + "(\\\\.|$)" ) :\n\t\t\tnull;\n\n\t\t// Clean up the event in case it is being reused\n\t\tevent.result = undefined;\n\t\tif ( !event.target ) {\n\t\t\tevent.target = elem;\n\t\t}\n\n\t\t// Clone any incoming data and prepend the event, creating the handler arg list\n\t\tdata = data == null ?\n\t\t\t[ event ] :\n\t\t\tjQuery.makeArray( data, [ event ] );\n\n\t\t// Allow special events to draw outside the lines\n\t\tspecial = jQuery.event.special[ type ] || {};\n\t\tif ( !onlyHandlers && special.trigger && special.trigger.apply( elem, data ) === false ) {\n\t\t\treturn;\n\t\t}\n\n\t\t// Determine event propagation path in advance, per W3C events spec (#9951)\n\t\t// Bubble up to document, then to window; watch for a global ownerDocument var (#9724)\n\t\tif ( !onlyHandlers && !special.noBubble && !jQuery.isWindow( elem ) ) {\n\n\t\t\tbubbleType = special.delegateType || type;\n\t\t\tif ( !rfocusMorph.test( bubbleType + type ) ) {\n\t\t\t\tcur = cur.parentNode;\n\t\t\t}\n\t\t\tfor ( ; cur; cur = cur.parentNode ) {\n\t\t\t\teventPath.push( cur );\n\t\t\t\ttmp = cur;\n\t\t\t}\n\n\t\t\t// Only add window if we got to document (e.g., not plain obj or detached DOM)\n\t\t\tif ( tmp === (elem.ownerDocument || document) ) {\n\t\t\t\teventPath.push( tmp.defaultView || tmp.parentWindow || window );\n\t\t\t}\n\t\t}\n\n\t\t// Fire handlers on the event path\n\t\ti = 0;\n\t\twhile ( (cur = eventPath[i++]) && !event.isPropagationStopped() ) {\n\n\t\t\tevent.type = i > 1 ?\n\t\t\t\tbubbleType :\n\t\t\t\tspecial.bindType || type;\n\n\t\t\t// jQuery handler\n\t\t\thandle = ( data_priv.get( cur, "events" ) || {} )[ event.type ] && data_priv.get( cur, "handle" );\n\t\t\tif ( handle ) {\n\t\t\t\thandle.apply( cur, data );\n\t\t\t}\n\n\t\t\t// Native handler\n\t\t\thandle = ontype && cur[ ontype ];\n\t\t\tif ( handle && handle.apply && jQuery.acceptData( cur ) ) {\n\t\t\t\tevent.result = handle.apply( cur, data );\n\t\t\t\tif ( event.result === false ) {\n\t\t\t\t\tevent.preventDefault();\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t\tevent.type = type;\n\n\t\t// If nobody prevented the default action, do it now\n\t\tif ( !onlyHandlers && !event.isDefaultPrevented() ) {\n\n\t\t\tif ( (!special._default || special._default.apply( eventPath.pop(), data ) === false) &&\n\t\t\t\tjQuery.acceptData( elem ) ) {\n\n\t\t\t\t// Call a native DOM method on the target with the same name name as the event.\n\t\t\t\t// Don\'t do default actions on window, that\'s where global variables be (#6170)\n\t\t\t\tif ( ontype && jQuery.isFunction( elem[ type ] ) && !jQuery.isWindow( elem ) ) {\n\n\t\t\t\t\t// Don\'t re-trigger an onFOO event when we call its FOO() method\n\t\t\t\t\ttmp = elem[ ontype ];\n\n\t\t\t\t\tif ( tmp ) {\n\t\t\t\t\t\telem[ ontype ] = null;\n\t\t\t\t\t}\n\n\t\t\t\t\t// Prevent re-triggering of the same event, since we already bubbled it above\n\t\t\t\t\tjQuery.event.triggered = type;\n\t\t\t\t\telem[ type ]();\n\t\t\t\t\tjQuery.event.triggered = undefined;\n\n\t\t\t\t\tif ( tmp ) {\n\t\t\t\t\t\telem[ ontype ] = tmp;\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\n\t\treturn event.result;\n\t},\n\n\tdispatch: function( event ) {\n\n\t\t// Make a writable jQuery.Event from the native event object\n\t\tevent = jQuery.event.fix( event );\n\n\t\tvar i, j, ret, matched, handleObj,\n\t\t\thandlerQueue = [],\n\t\t\targs = slice.call( arguments ),\n\t\t\thandlers = ( data_priv.get( this, "events" ) || {} )[ event.type ] || [],\n\t\t\tspecial = jQuery.event.special[ event.type ] || {};\n\n\t\t// Use the fix-ed jQuery.Event rather than the (read-only) native event\n\t\targs[0] = event;\n\t\tevent.delegateTarget = this;\n\n\t\t// Call the preDispatch hook for the mapped type, and let it bail if desired\n\t\tif ( special.preDispatch && special.preDispatch.call( this, event ) === false ) {\n\t\t\treturn;\n\t\t}\n\n\t\t// Determine handlers\n\t\thandlerQueue = jQuery.event.handlers.call( this, event, handlers );\n\n\t\t// Run delegates first; they may want to stop propagation beneath us\n\t\ti = 0;\n\t\twhile ( (matched = handlerQueue[ i++ ]) && !event.isPropagationStopped() ) {\n\t\t\tevent.currentTarget = matched.elem;\n\n\t\t\tj = 0;\n\t\t\twhile ( (handleObj = matched.handlers[ j++ ]) && !event.isImmediatePropagationStopped() ) {\n\n\t\t\t\t// Triggered event must either 1) have no namespace, or 2) have namespace(s)\n\t\t\t\t// a subset or equal to those in the bound event (both can have no namespace).\n\t\t\t\tif ( !event.namespace_re || event.namespace_re.test( handleObj.namespace ) ) {\n\n\t\t\t\t\tevent.handleObj = handleObj;\n\t\t\t\t\tevent.data = handleObj.data;\n\n\t\t\t\t\tret = ( (jQuery.event.special[ handleObj.origType ] || {}).handle || handleObj.handler )\n\t\t\t\t\t\t\t.apply( matched.elem, args );\n\n\t\t\t\t\tif ( ret !== undefined ) {\n\t\t\t\t\t\tif ( (event.result = ret) === false ) {\n\t\t\t\t\t\t\tevent.preventDefault();\n\t\t\t\t\t\t\tevent.stopPropagation();\n\t\t\t\t\t\t}\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\n\t\t// Call the postDispatch hook for the mapped type\n\t\tif ( special.postDispatch ) {\n\t\t\tspecial.postDispatch.call( this, event );\n\t\t}\n\n\t\treturn event.result;\n\t},\n\n\thandlers: function( event, handlers ) {\n\t\tvar i, matches, sel, handleObj,\n\t\t\thandlerQueue = [],\n\t\t\tdelegateCount = handlers.delegateCount,\n\t\t\tcur = event.target;\n\n\t\t// Find delegate handlers\n\t\t// Black-hole SVG <use> instance trees (#13180)\n\t\t// Avoid non-left-click bubbling in Firefox (#3861)\n\t\tif ( delegateCount && cur.nodeType && (!event.button || event.type !== "click") ) {\n\n\t\t\tfor ( ; cur !== this; cur = cur.parentNode || this ) {\n\n\t\t\t\t// Don\'t process clicks on disabled elements (#6911, #8165, #11382, #11764)\n\t\t\t\tif ( cur.disabled !== true || event.type !== "click" ) {\n\t\t\t\t\tmatches = [];\n\t\t\t\t\tfor ( i = 0; i < delegateCount; i++ ) {\n\t\t\t\t\t\thandleObj = handlers[ i ];\n\n\t\t\t\t\t\t// Don\'t conflict with Object.prototype properties (#13203)\n\t\t\t\t\t\tsel = handleObj.selector + " ";\n\n\t\t\t\t\t\tif ( matches[ sel ] === undefined ) {\n\t\t\t\t\t\t\tmatches[ sel ] = handleObj.needsContext ?\n\t\t\t\t\t\t\t\tjQuery( sel, this ).index( cur ) >= 0 :\n\t\t\t\t\t\t\t\tjQuery.find( sel, this, null, [ cur ] ).length;\n\t\t\t\t\t\t}\n\t\t\t\t\t\tif ( matches[ sel ] ) {\n\t\t\t\t\t\t\tmatches.push( handleObj );\n\t\t\t\t\t\t}\n\t\t\t\t\t}\n\t\t\t\t\tif ( matches.length ) {\n\t\t\t\t\t\thandlerQueue.push({ elem: cur, handlers: matches });\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\n\t\t// Add the remaining (directly-bound) handlers\n\t\tif ( delegateCount < handlers.length ) {\n\t\t\thandlerQueue.push({ elem: this, handlers: handlers.slice( delegateCount ) });\n\t\t}\n\n\t\treturn handlerQueue;\n\t},\n\n\t// Includes some event props shared by KeyEvent and MouseEvent\n\tprops: "altKey bubbles cancelable ctrlKey currentTarget eventPhase metaKey relatedTarget shiftKey target timeStamp view which".split(" "),\n\n\tfixHooks: {},\n\n\tkeyHooks: {\n\t\tprops: "char charCode key keyCode".split(" "),\n\t\tfilter: function( event, original ) {\n\n\t\t\t// Add which for key events\n\t\t\tif ( event.which == null ) {\n\t\t\t\tevent.which = original.charCode != null ? original.charCode : original.keyCode;\n\t\t\t}\n\n\t\t\treturn event;\n\t\t}\n\t},\n\n\tmouseHooks: {\n\t\tprops: "button buttons clientX clientY offsetX offsetY pageX pageY screenX screenY toElement".split(" "),\n\t\tfilter: function( event, original ) {\n\t\t\tvar eventDoc, doc, body,\n\t\t\t\tbutton = original.button;\n\n\t\t\t// Calculate pageX/Y if missing and clientX/Y available\n\t\t\tif ( event.pageX == null && original.clientX != null ) {\n\t\t\t\teventDoc = event.target.ownerDocument || document;\n\t\t\t\tdoc = eventDoc.documentElement;\n\t\t\t\tbody = eventDoc.body;\n\n\t\t\t\tevent.pageX = original.clientX + ( doc && doc.scrollLeft || body && body.scrollLeft || 0 ) - ( doc && doc.clientLeft || body && body.clientLeft || 0 );\n\t\t\t\tevent.pageY = original.clientY + ( doc && doc.scrollTop  || body && body.scrollTop  || 0 ) - ( doc && doc.clientTop  || body && body.clientTop  || 0 );\n\t\t\t}\n\n\t\t\t// Add which for click: 1 === left; 2 === middle; 3 === right\n\t\t\t// Note: button is not normalized, so don\'t use it\n\t\t\tif ( !event.which && button !== undefined ) {\n\t\t\t\tevent.which = ( button & 1 ? 1 : ( button & 2 ? 3 : ( button & 4 ? 2 : 0 ) ) );\n\t\t\t}\n\n\t\t\treturn event;\n\t\t}\n\t},\n\n\tfix: function( event ) {\n\t\tif ( event[ jQuery.expando ] ) {\n\t\t\treturn event;\n\t\t}\n\n\t\t// Create a writable copy of the event object and normalize some properties\n\t\tvar i, prop, copy,\n\t\t\ttype = event.type,\n\t\t\toriginalEvent = event,\n\t\t\tfixHook = this.fixHooks[ type ];\n\n\t\tif ( !fixHook ) {\n\t\t\tthis.fixHooks[ type ] = fixHook =\n\t\t\t\trmouseEvent.test( type ) ? this.mouseHooks :\n\t\t\t\trkeyEvent.test( type ) ? this.keyHooks :\n\t\t\t\t{};\n\t\t}\n\t\tcopy = fixHook.props ? this.props.concat( fixHook.props ) : this.props;\n\n\t\tevent = new jQuery.Event( originalEvent );\n\n\t\ti = copy.length;\n\t\twhile ( i-- ) {\n\t\t\tprop = copy[ i ];\n\t\t\tevent[ prop ] = originalEvent[ prop ];\n\t\t}\n\n\t\t// Support: Cordova 2.5 (WebKit) (#13255)\n\t\t// All events should have a target; Cordova deviceready doesn\'t\n\t\tif ( !event.target ) {\n\t\t\tevent.target = document;\n\t\t}\n\n\t\t// Support: Safari 6.0+, Chrome<28\n\t\t// Target should not be a text node (#504, #13143)\n\t\tif ( event.target.nodeType === 3 ) {\n\t\t\tevent.target = event.target.parentNode;\n\t\t}\n\n\t\treturn fixHook.filter ? fixHook.filter( event, originalEvent ) : event;\n\t},\n\n\tspecial: {\n\t\tload: {\n\t\t\t// Prevent triggered image.load events from bubbling to window.load\n\t\t\tnoBubble: true\n\t\t},\n\t\tfocus: {\n\t\t\t// Fire native event if possible so blur/focus sequence is correct\n\t\t\ttrigger: function() {\n\t\t\t\tif ( this !== safeActiveElement() && this.focus ) {\n\t\t\t\t\tthis.focus();\n\t\t\t\t\treturn false;\n\t\t\t\t}\n\t\t\t},\n\t\t\tdelegateType: "focusin"\n\t\t},\n\t\tblur: {\n\t\t\ttrigger: function() {\n\t\t\t\tif ( this === safeActiveElement() && this.blur ) {\n\t\t\t\t\tthis.blur();\n\t\t\t\t\treturn false;\n\t\t\t\t}\n\t\t\t},\n\t\t\tdelegateType: "focusout"\n\t\t},\n\t\tclick: {\n\t\t\t// For checkbox, fire native event so checked state will be right\n\t\t\ttrigger: function() {\n\t\t\t\tif ( this.type === "checkbox" && this.click && jQuery.nodeName( this, "input" ) ) {\n\t\t\t\t\tthis.click();\n\t\t\t\t\treturn false;\n\t\t\t\t}\n\t\t\t},\n\n\t\t\t// For cross-browser consistency, don\'t fire native .click() on links\n\t\t\t_default: function( event ) {\n\t\t\t\treturn jQuery.nodeName( event.target, "a" );\n\t\t\t}\n\t\t},\n\n\t\tbeforeunload: {\n\t\t\tpostDispatch: function( event ) {\n\n\t\t\t\t// Support: Firefox 20+\n\t\t\t\t// Firefox doesn\'t alert if the returnValue field is not set.\n\t\t\t\tif ( event.result !== undefined && event.originalEvent ) {\n\t\t\t\t\tevent.originalEvent.returnValue = event.result;\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t},\n\n\tsimulate: function( type, elem, event, bubble ) {\n\t\t// Piggyback on a donor event to simulate a different one.\n\t\t// Fake originalEvent to avoid donor\'s stopPropagation, but if the\n\t\t// simulated event prevents default then we do the same on the donor.\n\t\tvar e = jQuery.extend(\n\t\t\tnew jQuery.Event(),\n\t\t\tevent,\n\t\t\t{\n\t\t\t\ttype: type,\n\t\t\t\tisSimulated: true,\n\t\t\t\toriginalEvent: {}\n\t\t\t}\n\t\t);\n\t\tif ( bubble ) {\n\t\t\tjQuery.event.trigger( e, null, elem );\n\t\t} else {\n\t\t\tjQuery.event.dispatch.call( elem, e );\n\t\t}\n\t\tif ( e.isDefaultPrevented() ) {\n\t\t\tevent.preventDefault();\n\t\t}\n\t}\n};\n\njQuery.removeEvent = function( elem, type, handle ) {\n\tif ( elem.removeEventListener ) {\n\t\telem.removeEventListener( type, handle, false );\n\t}\n};\n\njQuery.Event = function( src, props ) {\n\t// Allow instantiation without the \'new\' keyword\n\tif ( !(this instanceof jQuery.Event) ) {\n\t\treturn new jQuery.Event( src, props );\n\t}\n\n\t// Event object\n\tif ( src && src.type ) {\n\t\tthis.originalEvent = src;\n\t\tthis.type = src.type;\n\n\t\t// Events bubbling up the document may have been marked as prevented\n\t\t// by a handler lower down the tree; reflect the correct value.\n\t\tthis.isDefaultPrevented = src.defaultPrevented ||\n\t\t\t\tsrc.defaultPrevented === undefined &&\n\t\t\t\t// Support: Android<4.0\n\t\t\t\tsrc.returnValue === false ?\n\t\t\treturnTrue :\n\t\t\treturnFalse;\n\n\t// Event type\n\t} else {\n\t\tthis.type = src;\n\t}\n\n\t// Put explicitly provided properties onto the event object\n\tif ( props ) {\n\t\tjQuery.extend( this, props );\n\t}\n\n\t// Create a timestamp if incoming event doesn\'t have one\n\tthis.timeStamp = src && src.timeStamp || jQuery.now();\n\n\t// Mark it as fixed\n\tthis[ jQuery.expando ] = true;\n};\n\n// jQuery.Event is based on DOM3 Events as specified by the ECMAScript Language Binding\n// http://www.w3.org/TR/2003/WD-DOM-Level-3-Events-20030331/ecma-script-binding.html\njQuery.Event.prototype = {\n\tisDefaultPrevented: returnFalse,\n\tisPropagationStopped: returnFalse,\n\tisImmediatePropagationStopped: returnFalse,\n\n\tpreventDefault: function() {\n\t\tvar e = this.originalEvent;\n\n\t\tthis.isDefaultPrevented = returnTrue;\n\n\t\tif ( e && e.preventDefault ) {\n\t\t\te.preventDefault();\n\t\t}\n\t},\n\tstopPropagation: function() {\n\t\tvar e = this.originalEvent;\n\n\t\tthis.isPropagationStopped = returnTrue;\n\n\t\tif ( e && e.stopPropagation ) {\n\t\t\te.stopPropagation();\n\t\t}\n\t},\n\tstopImmediatePropagation: function() {\n\t\tvar e = this.originalEvent;\n\n\t\tthis.isImmediatePropagationStopped = returnTrue;\n\n\t\tif ( e && e.stopImmediatePropagation ) {\n\t\t\te.stopImmediatePropagation();\n\t\t}\n\n\t\tthis.stopPropagation();\n\t}\n};\n\n// Create mouseenter/leave events using mouseover/out and event-time checks\n// Support: Chrome 15+\njQuery.each({\n\tmouseenter: "mouseover",\n\tmouseleave: "mouseout",\n\tpointerenter: "pointerover",\n\tpointerleave: "pointerout"\n}, function( orig, fix ) {\n\tjQuery.event.special[ orig ] = {\n\t\tdelegateType: fix,\n\t\tbindType: fix,\n\n\t\thandle: function( event ) {\n\t\t\tvar ret,\n\t\t\t\ttarget = this,\n\t\t\t\trelated = event.relatedTarget,\n\t\t\t\thandleObj = event.handleObj;\n\n\t\t\t// For mousenter/leave call the handler if related is outside the target.\n\t\t\t// NB: No relatedTarget if the mouse left/entered the browser window\n\t\t\tif ( !related || (related !== target && !jQuery.contains( target, related )) ) {\n\t\t\t\tevent.type = handleObj.origType;\n\t\t\t\tret = handleObj.handler.apply( this, arguments );\n\t\t\t\tevent.type = fix;\n\t\t\t}\n\t\t\treturn ret;\n\t\t}\n\t};\n});\n\n// Support: Firefox, Chrome, Safari\n// Create "bubbling" focus and blur events\nif ( !support.focusinBubbles ) {\n\tjQuery.each({ focus: "focusin", blur: "focusout" }, function( orig, fix ) {\n\n\t\t// Attach a single capturing handler on the document while someone wants focusin/focusout\n\t\tvar handler = function( event ) {\n\t\t\t\tjQuery.event.simulate( fix, event.target, jQuery.event.fix( event ), true );\n\t\t\t};\n\n\t\tjQuery.event.special[ fix ] = {\n\t\t\tsetup: function() {\n\t\t\t\tvar doc = this.ownerDocument || this,\n\t\t\t\t\tattaches = data_priv.access( doc, fix );\n\n\t\t\t\tif ( !attaches ) {\n\t\t\t\t\tdoc.addEventListener( orig, handler, true );\n\t\t\t\t}\n\t\t\t\tdata_priv.access( doc, fix, ( attaches || 0 ) + 1 );\n\t\t\t},\n\t\t\tteardown: function() {\n\t\t\t\tvar doc = this.ownerDocument || this,\n\t\t\t\t\tattaches = data_priv.access( doc, fix ) - 1;\n\n\t\t\t\tif ( !attaches ) {\n\t\t\t\t\tdoc.removeEventListener( orig, handler, true );\n\t\t\t\t\tdata_priv.remove( doc, fix );\n\n\t\t\t\t} else {\n\t\t\t\t\tdata_priv.access( doc, fix, attaches );\n\t\t\t\t}\n\t\t\t}\n\t\t};\n\t});\n}\n\njQuery.fn.extend({\n\n\ton: function( types, selector, data, fn, /*INTERNAL*/ one ) {\n\t\tvar origFn, type;\n\n\t\t// Types can be a map of types/handlers\n\t\tif ( typeof types === "object" ) {\n\t\t\t// ( types-Object, selector, data )\n\t\t\tif ( typeof selector !== "string" ) {\n\t\t\t\t// ( types-Object, data )\n\t\t\t\tdata = data || selector;\n\t\t\t\tselector = undefined;\n\t\t\t}\n\t\t\tfor ( type in types ) {\n\t\t\t\tthis.on( type, selector, data, types[ type ], one );\n\t\t\t}\n\t\t\treturn this;\n\t\t}\n\n\t\tif ( data == null && fn == null ) {\n\t\t\t// ( types, fn )\n\t\t\tfn = selector;\n\t\t\tdata = selector = undefined;\n\t\t} else if ( fn == null ) {\n\t\t\tif ( typeof selector === "string" ) {\n\t\t\t\t// ( types, selector, fn )\n\t\t\t\tfn = data;\n\t\t\t\tdata = undefined;\n\t\t\t} else {\n\t\t\t\t// ( types, data, fn )\n\t\t\t\tfn = data;\n\t\t\t\tdata = selector;\n\t\t\t\tselector = undefined;\n\t\t\t}\n\t\t}\n\t\tif ( fn === false ) {\n\t\t\tfn = returnFalse;\n\t\t} else if ( !fn ) {\n\t\t\treturn this;\n\t\t}\n\n\t\tif ( one === 1 ) {\n\t\t\torigFn = fn;\n\t\t\tfn = function( event ) {\n\t\t\t\t// Can use an empty set, since event contains the info\n\t\t\t\tjQuery().off( event );\n\t\t\t\treturn origFn.apply( this, arguments );\n\t\t\t};\n\t\t\t// Use same guid so caller can remove using origFn\n\t\t\tfn.guid = origFn.guid || ( origFn.guid = jQuery.guid++ );\n\t\t}\n\t\treturn this.each( function() {\n\t\t\tjQuery.event.add( this, types, fn, data, selector );\n\t\t});\n\t},\n\tone: function( types, selector, data, fn ) {\n\t\treturn this.on( types, selector, data, fn, 1 );\n\t},\n\toff: function( types, selector, fn ) {\n\t\tvar handleObj, type;\n\t\tif ( types && types.preventDefault && types.handleObj ) {\n\t\t\t// ( event )  dispatched jQuery.Event\n\t\t\thandleObj = types.handleObj;\n\t\t\tjQuery( types.delegateTarget ).off(\n\t\t\t\thandleObj.namespace ? handleObj.origType + "." + handleObj.namespace : handleObj.origType,\n\t\t\t\thandleObj.selector,\n\t\t\t\thandleObj.handler\n\t\t\t);\n\t\t\treturn this;\n\t\t}\n\t\tif ( typeof types === "object" ) {\n\t\t\t// ( types-object [, selector] )\n\t\t\tfor ( type in types ) {\n\t\t\t\tthis.off( type, selector, types[ type ] );\n\t\t\t}\n\t\t\treturn this;\n\t\t}\n\t\tif ( selector === false || typeof selector === "function" ) {\n\t\t\t// ( types [, fn] )\n\t\t\tfn = selector;\n\t\t\tselector = undefined;\n\t\t}\n\t\tif ( fn === false ) {\n\t\t\tfn = returnFalse;\n\t\t}\n\t\treturn this.each(function() {\n\t\t\tjQuery.event.remove( this, types, fn, selector );\n\t\t});\n\t},\n\n\ttrigger: function( type, data ) {\n\t\treturn this.each(function() {\n\t\t\tjQuery.event.trigger( type, data, this );\n\t\t});\n\t},\n\ttriggerHandler: function( type, data ) {\n\t\tvar elem = this[0];\n\t\tif ( elem ) {\n\t\t\treturn jQuery.event.trigger( type, data, elem, true );\n\t\t}\n\t}\n});\n\n\nvar\n\trxhtmlTag = /<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\\w:]+)[^>]*)\\/>/gi,\n\trtagName = /<([\\w:]+)/,\n\trhtml = /<|&#?\\w+;/,\n\trnoInnerhtml = /<(?:script|style|link)/i,\n\t// checked="checked" or checked\n\trchecked = /checked\\s*(?:[^=]|=\\s*.checked.)/i,\n\trscriptType = /^$|\\/(?:java|ecma)script/i,\n\trscriptTypeMasked = /^true\\/(.*)/,\n\trcleanScript = /^\\s*<!(?:\\[CDATA\\[|--)|(?:\\]\\]|--)>\\s*$/g,\n\n\t// We have to close these tags to support XHTML (#13200)\n\twrapMap = {\n\n\t\t// Support: IE9\n\t\toption: [ 1, "<select multiple=\'multiple\'>", "</select>" ],\n\n\t\tthead: [ 1, "<table>", "</table>" ],\n\t\tcol: [ 2, "<table><colgroup>", "</colgroup></table>" ],\n\t\ttr: [ 2, "<table><tbody>", "</tbody></table>" ],\n\t\ttd: [ 3, "<table><tbody><tr>", "</tr></tbody></table>" ],\n\n\t\t_default: [ 0, "", "" ]\n\t};\n\n// Support: IE9\nwrapMap.optgroup = wrapMap.option;\n\nwrapMap.tbody = wrapMap.tfoot = wrapMap.colgroup = wrapMap.caption = wrapMap.thead;\nwrapMap.th = wrapMap.td;\n\n// Support: 1.x compatibility\n// Manipulating tables requires a tbody\nfunction manipulationTarget( elem, content ) {\n\treturn jQuery.nodeName( elem, "table" ) &&\n\t\tjQuery.nodeName( content.nodeType !== 11 ? content : content.firstChild, "tr" ) ?\n\n\t\telem.getElementsByTagName("tbody")[0] ||\n\t\t\telem.appendChild( elem.ownerDocument.createElement("tbody") ) :\n\t\telem;\n}\n\n// Replace/restore the type attribute of script elements for safe DOM manipulation\nfunction disableScript( elem ) {\n\telem.type = (elem.getAttribute("type") !== null) + "/" + elem.type;\n\treturn elem;\n}\nfunction restoreScript( elem ) {\n\tvar match = rscriptTypeMasked.exec( elem.type );\n\n\tif ( match ) {\n\t\telem.type = match[ 1 ];\n\t} else {\n\t\telem.removeAttribute("type");\n\t}\n\n\treturn elem;\n}\n\n// Mark scripts as having already been evaluated\nfunction setGlobalEval( elems, refElements ) {\n\tvar i = 0,\n\t\tl = elems.length;\n\n\tfor ( ; i < l; i++ ) {\n\t\tdata_priv.set(\n\t\t\telems[ i ], "globalEval", !refElements || data_priv.get( refElements[ i ], "globalEval" )\n\t\t);\n\t}\n}\n\nfunction cloneCopyEvent( src, dest ) {\n\tvar i, l, type, pdataOld, pdataCur, udataOld, udataCur, events;\n\n\tif ( dest.nodeType !== 1 ) {\n\t\treturn;\n\t}\n\n\t// 1. Copy private data: events, handlers, etc.\n\tif ( data_priv.hasData( src ) ) {\n\t\tpdataOld = data_priv.access( src );\n\t\tpdataCur = data_priv.set( dest, pdataOld );\n\t\tevents = pdataOld.events;\n\n\t\tif ( events ) {\n\t\t\tdelete pdataCur.handle;\n\t\t\tpdataCur.events = {};\n\n\t\t\tfor ( type in events ) {\n\t\t\t\tfor ( i = 0, l = events[ type ].length; i < l; i++ ) {\n\t\t\t\t\tjQuery.event.add( dest, type, events[ type ][ i ] );\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n\n\t// 2. Copy user data\n\tif ( data_user.hasData( src ) ) {\n\t\tudataOld = data_user.access( src );\n\t\tudataCur = jQuery.extend( {}, udataOld );\n\n\t\tdata_user.set( dest, udataCur );\n\t}\n}\n\nfunction getAll( context, tag ) {\n\tvar ret = context.getElementsByTagName ? context.getElementsByTagName( tag || "*" ) :\n\t\t\tcontext.querySelectorAll ? context.querySelectorAll( tag || "*" ) :\n\t\t\t[];\n\n\treturn tag === undefined || tag && jQuery.nodeName( context, tag ) ?\n\t\tjQuery.merge( [ context ], ret ) :\n\t\tret;\n}\n\n// Fix IE bugs, see support tests\nfunction fixInput( src, dest ) {\n\tvar nodeName = dest.nodeName.toLowerCase();\n\n\t// Fails to persist the checked state of a cloned checkbox or radio button.\n\tif ( nodeName === "input" && rcheckableType.test( src.type ) ) {\n\t\tdest.checked = src.checked;\n\n\t// Fails to return the selected option to the default selected state when cloning options\n\t} else if ( nodeName === "input" || nodeName === "textarea" ) {\n\t\tdest.defaultValue = src.defaultValue;\n\t}\n}\n\njQuery.extend({\n\tclone: function( elem, dataAndEvents, deepDataAndEvents ) {\n\t\tvar i, l, srcElements, destElements,\n\t\t\tclone = elem.cloneNode( true ),\n\t\t\tinPage = jQuery.contains( elem.ownerDocument, elem );\n\n\t\t// Fix IE cloning issues\n\t\tif ( !support.noCloneChecked && ( elem.nodeType === 1 || elem.nodeType === 11 ) &&\n\t\t\t\t!jQuery.isXMLDoc( elem ) ) {\n\n\t\t\t// We eschew Sizzle here for performance reasons: http://jsperf.com/getall-vs-sizzle/2\n\t\t\tdestElements = getAll( clone );\n\t\t\tsrcElements = getAll( elem );\n\n\t\t\tfor ( i = 0, l = srcElements.length; i < l; i++ ) {\n\t\t\t\tfixInput( srcElements[ i ], destElements[ i ] );\n\t\t\t}\n\t\t}\n\n\t\t// Copy the events from the original to the clone\n\t\tif ( dataAndEvents ) {\n\t\t\tif ( deepDataAndEvents ) {\n\t\t\t\tsrcElements = srcElements || getAll( elem );\n\t\t\t\tdestElements = destElements || getAll( clone );\n\n\t\t\t\tfor ( i = 0, l = srcElements.length; i < l; i++ ) {\n\t\t\t\t\tcloneCopyEvent( srcElements[ i ], destElements[ i ] );\n\t\t\t\t}\n\t\t\t} else {\n\t\t\t\tcloneCopyEvent( elem, clone );\n\t\t\t}\n\t\t}\n\n\t\t// Preserve script evaluation history\n\t\tdestElements = getAll( clone, "script" );\n\t\tif ( destElements.length > 0 ) {\n\t\t\tsetGlobalEval( destElements, !inPage && getAll( elem, "script" ) );\n\t\t}\n\n\t\t// Return the cloned set\n\t\treturn clone;\n\t},\n\n\tbuildFragment: function( elems, context, scripts, selection ) {\n\t\tvar elem, tmp, tag, wrap, contains, j,\n\t\t\tfragment = context.createDocumentFragment(),\n\t\t\tnodes = [],\n\t\t\ti = 0,\n\t\t\tl = elems.length;\n\n\t\tfor ( ; i < l; i++ ) {\n\t\t\telem = elems[ i ];\n\n\t\t\tif ( elem || elem === 0 ) {\n\n\t\t\t\t// Add nodes directly\n\t\t\t\tif ( jQuery.type( elem ) === "object" ) {\n\t\t\t\t\t// Support: QtWebKit, PhantomJS\n\t\t\t\t\t// push.apply(_, arraylike) throws on ancient WebKit\n\t\t\t\t\tjQuery.merge( nodes, elem.nodeType ? [ elem ] : elem );\n\n\t\t\t\t// Convert non-html into a text node\n\t\t\t\t} else if ( !rhtml.test( elem ) ) {\n\t\t\t\t\tnodes.push( context.createTextNode( elem ) );\n\n\t\t\t\t// Convert html into DOM nodes\n\t\t\t\t} else {\n\t\t\t\t\ttmp = tmp || fragment.appendChild( context.createElement("div") );\n\n\t\t\t\t\t// Deserialize a standard representation\n\t\t\t\t\ttag = ( rtagName.exec( elem ) || [ "", "" ] )[ 1 ].toLowerCase();\n\t\t\t\t\twrap = wrapMap[ tag ] || wrapMap._default;\n\t\t\t\t\ttmp.innerHTML = wrap[ 1 ] + elem.replace( rxhtmlTag, "<$1></$2>" ) + wrap[ 2 ];\n\n\t\t\t\t\t// Descend through wrappers to the right content\n\t\t\t\t\tj = wrap[ 0 ];\n\t\t\t\t\twhile ( j-- ) {\n\t\t\t\t\t\ttmp = tmp.lastChild;\n\t\t\t\t\t}\n\n\t\t\t\t\t// Support: QtWebKit, PhantomJS\n\t\t\t\t\t// push.apply(_, arraylike) throws on ancient WebKit\n\t\t\t\t\tjQuery.merge( nodes, tmp.childNodes );\n\n\t\t\t\t\t// Remember the top-level container\n\t\t\t\t\ttmp = fragment.firstChild;\n\n\t\t\t\t\t// Ensure the created nodes are orphaned (#12392)\n\t\t\t\t\ttmp.textContent = "";\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\n\t\t// Remove wrapper from fragment\n\t\tfragment.textContent = "";\n\n\t\ti = 0;\n\t\twhile ( (elem = nodes[ i++ ]) ) {\n\n\t\t\t// #4087 - If origin and destination elements are the same, and this is\n\t\t\t// that element, do not do anything\n\t\t\tif ( selection && jQuery.inArray( elem, selection ) !== -1 ) {\n\t\t\t\tcontinue;\n\t\t\t}\n\n\t\t\tcontains = jQuery.contains( elem.ownerDocument, elem );\n\n\t\t\t// Append to fragment\n\t\t\ttmp = getAll( fragment.appendChild( elem ), "script" );\n\n\t\t\t// Preserve script evaluation history\n\t\t\tif ( contains ) {\n\t\t\t\tsetGlobalEval( tmp );\n\t\t\t}\n\n\t\t\t// Capture executables\n\t\t\tif ( scripts ) {\n\t\t\t\tj = 0;\n\t\t\t\twhile ( (elem = tmp[ j++ ]) ) {\n\t\t\t\t\tif ( rscriptType.test( elem.type || "" ) ) {\n\t\t\t\t\t\tscripts.push( elem );\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\n\t\treturn fragment;\n\t},\n\n\tcleanData: function( elems ) {\n\t\tvar data, elem, type, key,\n\t\t\tspecial = jQuery.event.special,\n\t\t\ti = 0;\n\n\t\tfor ( ; (elem = elems[ i ]) !== undefined; i++ ) {\n\t\t\tif ( jQuery.acceptData( elem ) ) {\n\t\t\t\tkey = elem[ data_priv.expando ];\n\n\t\t\t\tif ( key && (data = data_priv.cache[ key ]) ) {\n\t\t\t\t\tif ( data.events ) {\n\t\t\t\t\t\tfor ( type in data.events ) {\n\t\t\t\t\t\t\tif ( special[ type ] ) {\n\t\t\t\t\t\t\t\tjQuery.event.remove( elem, type );\n\n\t\t\t\t\t\t\t// This is a shortcut to avoid jQuery.event.remove\'s overhead\n\t\t\t\t\t\t\t} else {\n\t\t\t\t\t\t\t\tjQuery.removeEvent( elem, type, data.handle );\n\t\t\t\t\t\t\t}\n\t\t\t\t\t\t}\n\t\t\t\t\t}\n\t\t\t\t\tif ( data_priv.cache[ key ] ) {\n\t\t\t\t\t\t// Discard any remaining `private` data\n\t\t\t\t\t\tdelete data_priv.cache[ key ];\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t}\n\t\t\t// Discard any remaining `user` data\n\t\t\tdelete data_user.cache[ elem[ data_user.expando ] ];\n\t\t}\n\t}\n});\n\njQuery.fn.extend({\n\ttext: function( value ) {\n\t\treturn access( this, function( value ) {\n\t\t\treturn value === undefined ?\n\t\t\t\tjQuery.text( this ) :\n\t\t\t\tthis.empty().each(function() {\n\t\t\t\t\tif ( this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9 ) {\n\t\t\t\t\t\tthis.textContent = value;\n\t\t\t\t\t}\n\t\t\t\t});\n\t\t}, null, value, arguments.length );\n\t},\n\n\tappend: function() {\n\t\treturn this.domManip( arguments, function( elem ) {\n\t\t\tif ( this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9 ) {\n\t\t\t\tvar target = manipulationTarget( this, elem );\n\t\t\t\ttarget.appendChild( elem );\n\t\t\t}\n\t\t});\n\t},\n\n\tprepend: function() {\n\t\treturn this.domManip( arguments, function( elem ) {\n\t\t\tif ( this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9 ) {\n\t\t\t\tvar target = manipulationTarget( this, elem );\n\t\t\t\ttarget.insertBefore( elem, target.firstChild );\n\t\t\t}\n\t\t});\n\t},\n\n\tbefore: function() {\n\t\treturn this.domManip( arguments, function( elem ) {\n\t\t\tif ( this.parentNode ) {\n\t\t\t\tthis.parentNode.insertBefore( elem, this );\n\t\t\t}\n\t\t});\n\t},\n\n\tafter: function() {\n\t\treturn this.domManip( arguments, function( elem ) {\n\t\t\tif ( this.parentNode ) {\n\t\t\t\tthis.parentNode.insertBefore( elem, this.nextSibling );\n\t\t\t}\n\t\t});\n\t},\n\n\tremove: function( selector, keepData /* Internal Use Only */ ) {\n\t\tvar elem,\n\t\t\telems = selector ? jQuery.filter( selector, this ) : this,\n\t\t\ti = 0;\n\n\t\tfor ( ; (elem = elems[i]) != null; i++ ) {\n\t\t\tif ( !keepData && elem.nodeType === 1 ) {\n\t\t\t\tjQuery.cleanData( getAll( elem ) );\n\t\t\t}\n\n\t\t\tif ( elem.parentNode ) {\n\t\t\t\tif ( keepData && jQuery.contains( elem.ownerDocument, elem ) ) {\n\t\t\t\t\tsetGlobalEval( getAll( elem, "script" ) );\n\t\t\t\t}\n\t\t\t\telem.parentNode.removeChild( elem );\n\t\t\t}\n\t\t}\n\n\t\treturn this;\n\t},\n\n\tempty: function() {\n\t\tvar elem,\n\t\t\ti = 0;\n\n\t\tfor ( ; (elem = this[i]) != null; i++ ) {\n\t\t\tif ( elem.nodeType === 1 ) {\n\n\t\t\t\t// Prevent memory leaks\n\t\t\t\tjQuery.cleanData( getAll( elem, false ) );\n\n\t\t\t\t// Remove any remaining nodes\n\t\t\t\telem.textContent = "";\n\t\t\t}\n\t\t}\n\n\t\treturn this;\n\t},\n\n\tclone: function( dataAndEvents, deepDataAndEvents ) {\n\t\tdataAndEvents = dataAndEvents == null ? false : dataAndEvents;\n\t\tdeepDataAndEvents = deepDataAndEvents == null ? dataAndEvents : deepDataAndEvents;\n\n\t\treturn this.map(function() {\n\t\t\treturn jQuery.clone( this, dataAndEvents, deepDataAndEvents );\n\t\t});\n\t},\n\n\thtml: function( value ) {\n\t\treturn access( this, function( value ) {\n\t\t\tvar elem = this[ 0 ] || {},\n\t\t\t\ti = 0,\n\t\t\t\tl = this.length;\n\n\t\t\tif ( value === undefined && elem.nodeType === 1 ) {\n\t\t\t\treturn elem.innerHTML;\n\t\t\t}\n\n\t\t\t// See if we can take a shortcut and just use innerHTML\n\t\t\tif ( typeof value === "string" && !rnoInnerhtml.test( value ) &&\n\t\t\t\t!wrapMap[ ( rtagName.exec( value ) || [ "", "" ] )[ 1 ].toLowerCase() ] ) {\n\n\t\t\t\tvalue = value.replace( rxhtmlTag, "<$1></$2>" );\n\n\t\t\t\ttry {\n\t\t\t\t\tfor ( ; i < l; i++ ) {\n\t\t\t\t\t\telem = this[ i ] || {};\n\n\t\t\t\t\t\t// Remove element nodes and prevent memory leaks\n\t\t\t\t\t\tif ( elem.nodeType === 1 ) {\n\t\t\t\t\t\t\tjQuery.cleanData( getAll( elem, false ) );\n\t\t\t\t\t\t\telem.innerHTML = value;\n\t\t\t\t\t\t}\n\t\t\t\t\t}\n\n\t\t\t\t\telem = 0;\n\n\t\t\t\t// If using innerHTML throws an exception, use the fallback method\n\t\t\t\t} catch( e ) {}\n\t\t\t}\n\n\t\t\tif ( elem ) {\n\t\t\t\tthis.empty().append( value );\n\t\t\t}\n\t\t}, null, value, arguments.length );\n\t},\n\n\treplaceWith: function() {\n\t\tvar arg = arguments[ 0 ];\n\n\t\t// Make the changes, replacing each context element with the new content\n\t\tthis.domManip( arguments, function( elem ) {\n\t\t\targ = this.parentNode;\n\n\t\t\tjQuery.cleanData( getAll( this ) );\n\n\t\t\tif ( arg ) {\n\t\t\t\targ.replaceChild( elem, this );\n\t\t\t}\n\t\t});\n\n\t\t// Force removal if there was no new content (e.g., from empty arguments)\n\t\treturn arg && (arg.length || arg.nodeType) ? this : this.remove();\n\t},\n\n\tdetach: function( selector ) {\n\t\treturn this.remove( selector, true );\n\t},\n\n\tdomManip: function( args, callback ) {\n\n\t\t// Flatten any nested arrays\n\t\targs = concat.apply( [], args );\n\n\t\tvar fragment, first, scripts, hasScripts, node, doc,\n\t\t\ti = 0,\n\t\t\tl = this.length,\n\t\t\tset = this,\n\t\t\tiNoClone = l - 1,\n\t\t\tvalue = args[ 0 ],\n\t\t\tisFunction = jQuery.isFunction( value );\n\n\t\t// We can\'t cloneNode fragments that contain checked, in WebKit\n\t\tif ( isFunction ||\n\t\t\t\t( l > 1 && typeof value === "string" &&\n\t\t\t\t\t!support.checkClone && rchecked.test( value ) ) ) {\n\t\t\treturn this.each(function( index ) {\n\t\t\t\tvar self = set.eq( index );\n\t\t\t\tif ( isFunction ) {\n\t\t\t\t\targs[ 0 ] = value.call( this, index, self.html() );\n\t\t\t\t}\n\t\t\t\tself.domManip( args, callback );\n\t\t\t});\n\t\t}\n\n\t\tif ( l ) {\n\t\t\tfragment = jQuery.buildFragment( args, this[ 0 ].ownerDocument, false, this );\n\t\t\tfirst = fragment.firstChild;\n\n\t\t\tif ( fragment.childNodes.length === 1 ) {\n\t\t\t\tfragment = first;\n\t\t\t}\n\n\t\t\tif ( first ) {\n\t\t\t\tscripts = jQuery.map( getAll( fragment, "script" ), disableScript );\n\t\t\t\thasScripts = scripts.length;\n\n\t\t\t\t// Use the original fragment for the last item instead of the first because it can end up\n\t\t\t\t// being emptied incorrectly in certain situations (#8070).\n\t\t\t\tfor ( ; i < l; i++ ) {\n\t\t\t\t\tnode = fragment;\n\n\t\t\t\t\tif ( i !== iNoClone ) {\n\t\t\t\t\t\tnode = jQuery.clone( node, true, true );\n\n\t\t\t\t\t\t// Keep references to cloned scripts for later restoration\n\t\t\t\t\t\tif ( hasScripts ) {\n\t\t\t\t\t\t\t// Support: QtWebKit\n\t\t\t\t\t\t\t// jQuery.merge because push.apply(_, arraylike) throws\n\t\t\t\t\t\t\tjQuery.merge( scripts, getAll( node, "script" ) );\n\t\t\t\t\t\t}\n\t\t\t\t\t}\n\n\t\t\t\t\tcallback.call( this[ i ], node, i );\n\t\t\t\t}\n\n\t\t\t\tif ( hasScripts ) {\n\t\t\t\t\tdoc = scripts[ scripts.length - 1 ].ownerDocument;\n\n\t\t\t\t\t// Reenable scripts\n\t\t\t\t\tjQuery.map( scripts, restoreScript );\n\n\t\t\t\t\t// Evaluate executable scripts on first document insertion\n\t\t\t\t\tfor ( i = 0; i < hasScripts; i++ ) {\n\t\t\t\t\t\tnode = scripts[ i ];\n\t\t\t\t\t\tif ( rscriptType.test( node.type || "" ) &&\n\t\t\t\t\t\t\t!data_priv.access( node, "globalEval" ) && jQuery.contains( doc, node ) ) {\n\n\t\t\t\t\t\t\tif ( node.src ) {\n\t\t\t\t\t\t\t\t// Optional AJAX dependency, but won\'t run scripts if not present\n\t\t\t\t\t\t\t\tif ( jQuery._evalUrl ) {\n\t\t\t\t\t\t\t\t\tjQuery._evalUrl( node.src );\n\t\t\t\t\t\t\t\t}\n\t\t\t\t\t\t\t} else {\n\t\t\t\t\t\t\t\tjQuery.globalEval( node.textContent.replace( rcleanScript, "" ) );\n\t\t\t\t\t\t\t}\n\t\t\t\t\t\t}\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\n\t\treturn this;\n\t}\n});\n\njQuery.each({\n\tappendTo: "append",\n\tprependTo: "prepend",\n\tinsertBefore: "before",\n\tinsertAfter: "after",\n\treplaceAll: "replaceWith"\n}, function( name, original ) {\n\tjQuery.fn[ name ] = function( selector ) {\n\t\tvar elems,\n\t\t\tret = [],\n\t\t\tinsert = jQuery( selector ),\n\t\t\tlast = insert.length - 1,\n\t\t\ti = 0;\n\n\t\tfor ( ; i <= last; i++ ) {\n\t\t\telems = i === last ? this : this.clone( true );\n\t\t\tjQuery( insert[ i ] )[ original ]( elems );\n\n\t\t\t// Support: QtWebKit\n\t\t\t// .get() because push.apply(_, arraylike) throws\n\t\t\tpush.apply( ret, elems.get() );\n\t\t}\n\n\t\treturn this.pushStack( ret );\n\t};\n});\n\n\nvar iframe,\n\telemdisplay = {};\n\n/**\n * Retrieve the actual display of a element\n * @param {String} name nodeName of the element\n * @param {Object} doc Document object\n */\n// Called only from within defaultDisplay\nfunction actualDisplay( name, doc ) {\n\tvar style,\n\t\telem = jQuery( doc.createElement( name ) ).appendTo( doc.body ),\n\n\t\t// getDefaultComputedStyle might be reliably used only on attached element\n\t\tdisplay = window.getDefaultComputedStyle && ( style = window.getDefaultComputedStyle( elem[ 0 ] ) ) ?\n\n\t\t\t// Use of this method is a temporary fix (more like optimization) until something better comes along,\n\t\t\t// since it was removed from specification and supported only in FF\n\t\t\tstyle.display : jQuery.css( elem[ 0 ], "display" );\n\n\t// We don\'t have any data stored on the element,\n\t// so use "detach" method as fast way to get rid of the element\n\telem.detach();\n\n\treturn display;\n}\n\n/**\n * Try to determine the default display value of an element\n * @param {String} nodeName\n */\nfunction defaultDisplay( nodeName ) {\n\tvar doc = document,\n\t\tdisplay = elemdisplay[ nodeName ];\n\n\tif ( !display ) {\n\t\tdisplay = actualDisplay( nodeName, doc );\n\n\t\t// If the simple way fails, read from inside an iframe\n\t\tif ( display === "none" || !display ) {\n\n\t\t\t// Use the already-created iframe if possible\n\t\t\tiframe = (iframe || jQuery( "<iframe frameborder=\'0\' width=\'0\' height=\'0\'/>" )).appendTo( doc.documentElement );\n\n\t\t\t// Always write a new HTML skeleton so Webkit and Firefox don\'t choke on reuse\n\t\t\tdoc = iframe[ 0 ].contentDocument;\n\n\t\t\t// Support: IE\n\t\t\tdoc.write();\n\t\t\tdoc.close();\n\n\t\t\tdisplay = actualDisplay( nodeName, doc );\n\t\t\tiframe.detach();\n\t\t}\n\n\t\t// Store the correct default display\n\t\telemdisplay[ nodeName ] = display;\n\t}\n\n\treturn display;\n}\nvar rmargin = (/^margin/);\n\nvar rnumnonpx = new RegExp( "^(" + pnum + ")(?!px)[a-z%]+$", "i" );\n\nvar getStyles = function( elem ) {\n\t\t// Support: IE<=11+, Firefox<=30+ (#15098, #14150)\n\t\t// IE throws on elements created in popups\n\t\t// FF meanwhile throws on frame elements through "defaultView.getComputedStyle"\n\t\tif ( elem.ownerDocument.defaultView.opener ) {\n\t\t\treturn elem.ownerDocument.defaultView.getComputedStyle( elem, null );\n\t\t}\n\n\t\treturn window.getComputedStyle( elem, null );\n\t};\n\n\n\nfunction curCSS( elem, name, computed ) {\n\tvar width, minWidth, maxWidth, ret,\n\t\tstyle = elem.style;\n\n\tcomputed = computed || getStyles( elem );\n\n\t// Support: IE9\n\t// getPropertyValue is only needed for .css(\'filter\') (#12537)\n\tif ( computed ) {\n\t\tret = computed.getPropertyValue( name ) || computed[ name ];\n\t}\n\n\tif ( computed ) {\n\n\t\tif ( ret === "" && !jQuery.contains( elem.ownerDocument, elem ) ) {\n\t\t\tret = jQuery.style( elem, name );\n\t\t}\n\n\t\t// Support: iOS < 6\n\t\t// A tribute to the "awesome hack by Dean Edwards"\n\t\t// iOS < 6 (at least) returns percentage for a larger set of values, but width seems to be reliably pixels\n\t\t// this is against the CSSOM draft spec: http://dev.w3.org/csswg/cssom/#resolved-values\n\t\tif ( rnumnonpx.test( ret ) && rmargin.test( name ) ) {\n\n\t\t\t// Remember the original values\n\t\t\twidth = style.width;\n\t\t\tminWidth = style.minWidth;\n\t\t\tmaxWidth = style.maxWidth;\n\n\t\t\t// Put in the new values to get a computed value out\n\t\t\tstyle.minWidth = style.maxWidth = style.width = ret;\n\t\t\tret = computed.width;\n\n\t\t\t// Revert the changed values\n\t\t\tstyle.width = width;\n\t\t\tstyle.minWidth = minWidth;\n\t\t\tstyle.maxWidth = maxWidth;\n\t\t}\n\t}\n\n\treturn ret !== undefined ?\n\t\t// Support: IE\n\t\t// IE returns zIndex value as an integer.\n\t\tret + "" :\n\t\tret;\n}\n\n\nfunction addGetHookIf( conditionFn, hookFn ) {\n\t// Define the hook, we\'ll check on the first run if it\'s really needed.\n\treturn {\n\t\tget: function() {\n\t\t\tif ( conditionFn() ) {\n\t\t\t\t// Hook not needed (or it\'s not possible to use it due\n\t\t\t\t// to missing dependency), remove it.\n\t\t\t\tdelete this.get;\n\t\t\t\treturn;\n\t\t\t}\n\n\t\t\t// Hook needed; redefine it so that the support test is not executed again.\n\t\t\treturn (this.get = hookFn).apply( this, arguments );\n\t\t}\n\t};\n}\n\n\n(function() {\n\tvar pixelPositionVal, boxSizingReliableVal,\n\t\tdocElem = document.documentElement,\n\t\tcontainer = document.createElement( "div" ),\n\t\tdiv = document.createElement( "div" );\n\n\tif ( !div.style ) {\n\t\treturn;\n\t}\n\n\t// Support: IE9-11+\n\t// Style of cloned element affects source element cloned (#8908)\n\tdiv.style.backgroundClip = "content-box";\n\tdiv.cloneNode( true ).style.backgroundClip = "";\n\tsupport.clearCloneStyle = div.style.backgroundClip === "content-box";\n\n\tcontainer.style.cssText = "border:0;width:0;height:0;top:0;left:-9999px;margin-top:1px;" +\n\t\t"position:absolute";\n\tcontainer.appendChild( div );\n\n\t// Executing both pixelPosition & boxSizingReliable tests require only one layout\n\t// so they\'re executed at the same time to save the second computation.\n\tfunction computePixelPositionAndBoxSizingReliable() {\n\t\tdiv.style.cssText =\n\t\t\t// Support: Firefox<29, Android 2.3\n\t\t\t// Vendor-prefix box-sizing\n\t\t\t"-webkit-box-sizing:border-box;-moz-box-sizing:border-box;" +\n\t\t\t"box-sizing:border-box;display:block;margin-top:1%;top:1%;" +\n\t\t\t"border:1px;padding:1px;width:4px;position:absolute";\n\t\tdiv.innerHTML = "";\n\t\tdocElem.appendChild( container );\n\n\t\tvar divStyle = window.getComputedStyle( div, null );\n\t\tpixelPositionVal = divStyle.top !== "1%";\n\t\tboxSizingReliableVal = divStyle.width === "4px";\n\n\t\tdocElem.removeChild( container );\n\t}\n\n\t// Support: node.js jsdom\n\t// Don\'t assume that getComputedStyle is a property of the global object\n\tif ( window.getComputedStyle ) {\n\t\tjQuery.extend( support, {\n\t\t\tpixelPosition: function() {\n\n\t\t\t\t// This test is executed only once but we still do memoizing\n\t\t\t\t// since we can use the boxSizingReliable pre-computing.\n\t\t\t\t// No need to check if the test was already performed, though.\n\t\t\t\tcomputePixelPositionAndBoxSizingReliable();\n\t\t\t\treturn pixelPositionVal;\n\t\t\t},\n\t\t\tboxSizingReliable: function() {\n\t\t\t\tif ( boxSizingReliableVal == null ) {\n\t\t\t\t\tcomputePixelPositionAndBoxSizingReliable();\n\t\t\t\t}\n\t\t\t\treturn boxSizingReliableVal;\n\t\t\t},\n\t\t\treliableMarginRight: function() {\n\n\t\t\t\t// Support: Android 2.3\n\t\t\t\t// Check if div with explicit width and no margin-right incorrectly\n\t\t\t\t// gets computed margin-right based on width of container. (#3333)\n\t\t\t\t// WebKit Bug 13343 - getComputedStyle returns wrong value for margin-right\n\t\t\t\t// This support function is only executed once so no memoizing is needed.\n\t\t\t\tvar ret,\n\t\t\t\t\tmarginDiv = div.appendChild( document.createElement( "div" ) );\n\n\t\t\t\t// Reset CSS: box-sizing; display; margin; border; padding\n\t\t\t\tmarginDiv.style.cssText = div.style.cssText =\n\t\t\t\t\t// Support: Firefox<29, Android 2.3\n\t\t\t\t\t// Vendor-prefix box-sizing\n\t\t\t\t\t"-webkit-box-sizing:content-box;-moz-box-sizing:content-box;" +\n\t\t\t\t\t"box-sizing:content-box;display:block;margin:0;border:0;padding:0";\n\t\t\t\tmarginDiv.style.marginRight = marginDiv.style.width = "0";\n\t\t\t\tdiv.style.width = "1px";\n\t\t\t\tdocElem.appendChild( container );\n\n\t\t\t\tret = !parseFloat( window.getComputedStyle( marginDiv, null ).marginRight );\n\n\t\t\t\tdocElem.removeChild( container );\n\t\t\t\tdiv.removeChild( marginDiv );\n\n\t\t\t\treturn ret;\n\t\t\t}\n\t\t});\n\t}\n})();\n\n\n// A method for quickly swapping in/out CSS properties to get correct calculations.\njQuery.swap = function( elem, options, callback, args ) {\n\tvar ret, name,\n\t\told = {};\n\n\t// Remember the old values, and insert the new ones\n\tfor ( name in options ) {\n\t\told[ name ] = elem.style[ name ];\n\t\telem.style[ name ] = options[ name ];\n\t}\n\n\tret = callback.apply( elem, args || [] );\n\n\t// Revert the old values\n\tfor ( name in options ) {\n\t\telem.style[ name ] = old[ name ];\n\t}\n\n\treturn ret;\n};\n\n\nvar\n\t// Swappable if display is none or starts with table except "table", "table-cell", or "table-caption"\n\t// See here for display values: https://developer.mozilla.org/en-US/docs/CSS/display\n\trdisplayswap = /^(none|table(?!-c[ea]).+)/,\n\trnumsplit = new RegExp( "^(" + pnum + ")(.*)$", "i" ),\n\trrelNum = new RegExp( "^([+-])=(" + pnum + ")", "i" ),\n\n\tcssShow = { position: "absolute", visibility: "hidden", display: "block" },\n\tcssNormalTransform = {\n\t\tletterSpacing: "0",\n\t\tfontWeight: "400"\n\t},\n\n\tcssPrefixes = [ "Webkit", "O", "Moz", "ms" ];\n\n// Return a css property mapped to a potentially vendor prefixed property\nfunction vendorPropName( style, name ) {\n\n\t// Shortcut for names that are not vendor prefixed\n\tif ( name in style ) {\n\t\treturn name;\n\t}\n\n\t// Check for vendor prefixed names\n\tvar capName = name[0].toUpperCase() + name.slice(1),\n\t\torigName = name,\n\t\ti = cssPrefixes.length;\n\n\twhile ( i-- ) {\n\t\tname = cssPrefixes[ i ] + capName;\n\t\tif ( name in style ) {\n\t\t\treturn name;\n\t\t}\n\t}\n\n\treturn origName;\n}\n\nfunction setPositiveNumber( elem, value, subtract ) {\n\tvar matches = rnumsplit.exec( value );\n\treturn matches ?\n\t\t// Guard against undefined "subtract", e.g., when used as in cssHooks\n\t\tMath.max( 0, matches[ 1 ] - ( subtract || 0 ) ) + ( matches[ 2 ] || "px" ) :\n\t\tvalue;\n}\n\nfunction augmentWidthOrHeight( elem, name, extra, isBorderBox, styles ) {\n\tvar i = extra === ( isBorderBox ? "border" : "content" ) ?\n\t\t// If we already have the right measurement, avoid augmentation\n\t\t4 :\n\t\t// Otherwise initialize for horizontal or vertical properties\n\t\tname === "width" ? 1 : 0,\n\n\t\tval = 0;\n\n\tfor ( ; i < 4; i += 2 ) {\n\t\t// Both box models exclude margin, so add it if we want it\n\t\tif ( extra === "margin" ) {\n\t\t\tval += jQuery.css( elem, extra + cssExpand[ i ], true, styles );\n\t\t}\n\n\t\tif ( isBorderBox ) {\n\t\t\t// border-box includes padding, so remove it if we want content\n\t\t\tif ( extra === "content" ) {\n\t\t\t\tval -= jQuery.css( elem, "padding" + cssExpand[ i ], true, styles );\n\t\t\t}\n\n\t\t\t// At this point, extra isn\'t border nor margin, so remove border\n\t\t\tif ( extra !== "margin" ) {\n\t\t\t\tval -= jQuery.css( elem, "border" + cssExpand[ i ] + "Width", true, styles );\n\t\t\t}\n\t\t} else {\n\t\t\t// At this point, extra isn\'t content, so add padding\n\t\t\tval += jQuery.css( elem, "padding" + cssExpand[ i ], true, styles );\n\n\t\t\t// At this point, extra isn\'t content nor padding, so add border\n\t\t\tif ( extra !== "padding" ) {\n\t\t\t\tval += jQuery.css( elem, "border" + cssExpand[ i ] + "Width", true, styles );\n\t\t\t}\n\t\t}\n\t}\n\n\treturn val;\n}\n\nfunction getWidthOrHeight( elem, name, extra ) {\n\n\t// Start with offset property, which is equivalent to the border-box value\n\tvar valueIsBorderBox = true,\n\t\tval = name === "width" ? elem.offsetWidth : elem.offsetHeight,\n\t\tstyles = getStyles( elem ),\n\t\tisBorderBox = jQuery.css( elem, "boxSizing", false, styles ) === "border-box";\n\n\t// Some non-html elements return undefined for offsetWidth, so check for null/undefined\n\t// svg - https://bugzilla.mozilla.org/show_bug.cgi?id=649285\n\t// MathML - https://bugzilla.mozilla.org/show_bug.cgi?id=491668\n\tif ( val <= 0 || val == null ) {\n\t\t// Fall back to computed then uncomputed css if necessary\n\t\tval = curCSS( elem, name, styles );\n\t\tif ( val < 0 || val == null ) {\n\t\t\tval = elem.style[ name ];\n\t\t}\n\n\t\t// Computed unit is not pixels. Stop here and return.\n\t\tif ( rnumnonpx.test(val) ) {\n\t\t\treturn val;\n\t\t}\n\n\t\t// Check for style in case a browser which returns unreliable values\n\t\t// for getComputedStyle silently falls back to the reliable elem.style\n\t\tvalueIsBorderBox = isBorderBox &&\n\t\t\t( support.boxSizingReliable() || val === elem.style[ name ] );\n\n\t\t// Normalize "", auto, and prepare for extra\n\t\tval = parseFloat( val ) || 0;\n\t}\n\n\t// Use the active box-sizing model to add/subtract irrelevant styles\n\treturn ( val +\n\t\taugmentWidthOrHeight(\n\t\t\telem,\n\t\t\tname,\n\t\t\textra || ( isBorderBox ? "border" : "content" ),\n\t\t\tvalueIsBorderBox,\n\t\t\tstyles\n\t\t)\n\t) + "px";\n}\n\nfunction showHide( elements, show ) {\n\tvar display, elem, hidden,\n\t\tvalues = [],\n\t\tindex = 0,\n\t\tlength = elements.length;\n\n\tfor ( ; index < length; index++ ) {\n\t\telem = elements[ index ];\n\t\tif ( !elem.style ) {\n\t\t\tcontinue;\n\t\t}\n\n\t\tvalues[ index ] = data_priv.get( elem, "olddisplay" );\n\t\tdisplay = elem.style.display;\n\t\tif ( show ) {\n\t\t\t// Reset the inline display of this element to learn if it is\n\t\t\t// being hidden by cascaded rules or not\n\t\t\tif ( !values[ index ] && display === "none" ) {\n\t\t\t\telem.style.display = "";\n\t\t\t}\n\n\t\t\t// Set elements which have been overridden with display: none\n\t\t\t// in a stylesheet to whatever the default browser style is\n\t\t\t// for such an element\n\t\t\tif ( elem.style.display === "" && isHidden( elem ) ) {\n\t\t\t\tvalues[ index ] = data_priv.access( elem, "olddisplay", defaultDisplay(elem.nodeName) );\n\t\t\t}\n\t\t} else {\n\t\t\thidden = isHidden( elem );\n\n\t\t\tif ( display !== "none" || !hidden ) {\n\t\t\t\tdata_priv.set( elem, "olddisplay", hidden ? display : jQuery.css( elem, "display" ) );\n\t\t\t}\n\t\t}\n\t}\n\n\t// Set the display of most of the elements in a second loop\n\t// to avoid the constant reflow\n\tfor ( index = 0; index < length; index++ ) {\n\t\telem = elements[ index ];\n\t\tif ( !elem.style ) {\n\t\t\tcontinue;\n\t\t}\n\t\tif ( !show || elem.style.display === "none" || elem.style.display === "" ) {\n\t\t\telem.style.display = show ? values[ index ] || "" : "none";\n\t\t}\n\t}\n\n\treturn elements;\n}\n\njQuery.extend({\n\n\t// Add in style property hooks for overriding the default\n\t// behavior of getting and setting a style property\n\tcssHooks: {\n\t\topacity: {\n\t\t\tget: function( elem, computed ) {\n\t\t\t\tif ( computed ) {\n\n\t\t\t\t\t// We should always get a number back from opacity\n\t\t\t\t\tvar ret = curCSS( elem, "opacity" );\n\t\t\t\t\treturn ret === "" ? "1" : ret;\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t},\n\n\t// Don\'t automatically add "px" to these possibly-unitless properties\n\tcssNumber: {\n\t\t"columnCount": true,\n\t\t"fillOpacity": true,\n\t\t"flexGrow": true,\n\t\t"flexShrink": true,\n\t\t"fontWeight": true,\n\t\t"lineHeight": true,\n\t\t"opacity": true,\n\t\t"order": true,\n\t\t"orphans": true,\n\t\t"widows": true,\n\t\t"zIndex": true,\n\t\t"zoom": true\n\t},\n\n\t// Add in properties whose names you wish to fix before\n\t// setting or getting the value\n\tcssProps: {\n\t\t"float": "cssFloat"\n\t},\n\n\t// Get and set the style property on a DOM Node\n\tstyle: function( elem, name, value, extra ) {\n\n\t\t// Don\'t set styles on text and comment nodes\n\t\tif ( !elem || elem.nodeType === 3 || elem.nodeType === 8 || !elem.style ) {\n\t\t\treturn;\n\t\t}\n\n\t\t// Make sure that we\'re working with the right name\n\t\tvar ret, type, hooks,\n\t\t\torigName = jQuery.camelCase( name ),\n\t\t\tstyle = elem.style;\n\n\t\tname = jQuery.cssProps[ origName ] || ( jQuery.cssProps[ origName ] = vendorPropName( style, origName ) );\n\n\t\t// Gets hook for the prefixed version, then unprefixed version\n\t\thooks = jQuery.cssHooks[ name ] || jQuery.cssHooks[ origName ];\n\n\t\t// Check if we\'re setting a value\n\t\tif ( value !== undefined ) {\n\t\t\ttype = typeof value;\n\n\t\t\t// Convert "+=" or "-=" to relative numbers (#7345)\n\t\t\tif ( type === "string" && (ret = rrelNum.exec( value )) ) {\n\t\t\t\tvalue = ( ret[1] + 1 ) * ret[2] + parseFloat( jQuery.css( elem, name ) );\n\t\t\t\t// Fixes bug #9237\n\t\t\t\ttype = "number";\n\t\t\t}\n\n\t\t\t// Make sure that null and NaN values aren\'t set (#7116)\n\t\t\tif ( value == null || value !== value ) {\n\t\t\t\treturn;\n\t\t\t}\n\n\t\t\t// If a number, add \'px\' to the (except for certain CSS properties)\n\t\t\tif ( type === "number" && !jQuery.cssNumber[ origName ] ) {\n\t\t\t\tvalue += "px";\n\t\t\t}\n\n\t\t\t// Support: IE9-11+\n\t\t\t// background-* props affect original clone\'s values\n\t\t\tif ( !support.clearCloneStyle && value === "" && name.indexOf( "background" ) === 0 ) {\n\t\t\t\tstyle[ name ] = "inherit";\n\t\t\t}\n\n\t\t\t// If a hook was provided, use that value, otherwise just set the specified value\n\t\t\tif ( !hooks || !("set" in hooks) || (value = hooks.set( elem, value, extra )) !== undefined ) {\n\t\t\t\tstyle[ name ] = value;\n\t\t\t}\n\n\t\t} else {\n\t\t\t// If a hook was provided get the non-computed value from there\n\t\t\tif ( hooks && "get" in hooks && (ret = hooks.get( elem, false, extra )) !== undefined ) {\n\t\t\t\treturn ret;\n\t\t\t}\n\n\t\t\t// Otherwise just get the value from the style object\n\t\t\treturn style[ name ];\n\t\t}\n\t},\n\n\tcss: function( elem, name, extra, styles ) {\n\t\tvar val, num, hooks,\n\t\t\torigName = jQuery.camelCase( name );\n\n\t\t// Make sure that we\'re working with the right name\n\t\tname = jQuery.cssProps[ origName ] || ( jQuery.cssProps[ origName ] = vendorPropName( elem.style, origName ) );\n\n\t\t// Try prefixed name followed by the unprefixed name\n\t\thooks = jQuery.cssHooks[ name ] || jQuery.cssHooks[ origName ];\n\n\t\t// If a hook was provided get the computed value from there\n\t\tif ( hooks && "get" in hooks ) {\n\t\t\tval = hooks.get( elem, true, extra );\n\t\t}\n\n\t\t// Otherwise, if a way to get the computed value exists, use that\n\t\tif ( val === undefined ) {\n\t\t\tval = curCSS( elem, name, styles );\n\t\t}\n\n\t\t// Convert "normal" to computed value\n\t\tif ( val === "normal" && name in cssNormalTransform ) {\n\t\t\tval = cssNormalTransform[ name ];\n\t\t}\n\n\t\t// Make numeric if forced or a qualifier was provided and val looks numeric\n\t\tif ( extra === "" || extra ) {\n\t\t\tnum = parseFloat( val );\n\t\t\treturn extra === true || jQuery.isNumeric( num ) ? num || 0 : val;\n\t\t}\n\t\treturn val;\n\t}\n});\n\njQuery.each([ "height", "width" ], function( i, name ) {\n\tjQuery.cssHooks[ name ] = {\n\t\tget: function( elem, computed, extra ) {\n\t\t\tif ( computed ) {\n\n\t\t\t\t// Certain elements can have dimension info if we invisibly show them\n\t\t\t\t// but it must have a current display style that would benefit\n\t\t\t\treturn rdisplayswap.test( jQuery.css( elem, "display" ) ) && elem.offsetWidth === 0 ?\n\t\t\t\t\tjQuery.swap( elem, cssShow, function() {\n\t\t\t\t\t\treturn getWidthOrHeight( elem, name, extra );\n\t\t\t\t\t}) :\n\t\t\t\t\tgetWidthOrHeight( elem, name, extra );\n\t\t\t}\n\t\t},\n\n\t\tset: function( elem, value, extra ) {\n\t\t\tvar styles = extra && getStyles( elem );\n\t\t\treturn setPositiveNumber( elem, value, extra ?\n\t\t\t\taugmentWidthOrHeight(\n\t\t\t\t\telem,\n\t\t\t\t\tname,\n\t\t\t\t\textra,\n\t\t\t\t\tjQuery.css( elem, "boxSizing", false, styles ) === "border-box",\n\t\t\t\t\tstyles\n\t\t\t\t) : 0\n\t\t\t);\n\t\t}\n\t};\n});\n\n// Support: Android 2.3\njQuery.cssHooks.marginRight = addGetHookIf( support.reliableMarginRight,\n\tfunction( elem, computed ) {\n\t\tif ( computed ) {\n\t\t\treturn jQuery.swap( elem, { "display": "inline-block" },\n\t\t\t\tcurCSS, [ elem, "marginRight" ] );\n\t\t}\n\t}\n);\n\n// These hooks are used by animate to expand properties\njQuery.each({\n\tmargin: "",\n\tpadding: "",\n\tborder: "Width"\n}, function( prefix, suffix ) {\n\tjQuery.cssHooks[ prefix + suffix ] = {\n\t\texpand: function( value ) {\n\t\t\tvar i = 0,\n\t\t\t\texpanded = {},\n\n\t\t\t\t// Assumes a single number if not a string\n\t\t\t\tparts = typeof value === "string" ? value.split(" ") : [ value ];\n\n\t\t\tfor ( ; i < 4; i++ ) {\n\t\t\t\texpanded[ prefix + cssExpand[ i ] + suffix ] =\n\t\t\t\t\tparts[ i ] || parts[ i - 2 ] || parts[ 0 ];\n\t\t\t}\n\n\t\t\treturn expanded;\n\t\t}\n\t};\n\n\tif ( !rmargin.test( prefix ) ) {\n\t\tjQuery.cssHooks[ prefix + suffix ].set = setPositiveNumber;\n\t}\n});\n\njQuery.fn.extend({\n\tcss: function( name, value ) {\n\t\treturn access( this, function( elem, name, value ) {\n\t\t\tvar styles, len,\n\t\t\t\tmap = {},\n\t\t\t\ti = 0;\n\n\t\t\tif ( jQuery.isArray( name ) ) {\n\t\t\t\tstyles = getStyles( elem );\n\t\t\t\tlen = name.length;\n\n\t\t\t\tfor ( ; i < len; i++ ) {\n\t\t\t\t\tmap[ name[ i ] ] = jQuery.css( elem, name[ i ], false, styles );\n\t\t\t\t}\n\n\t\t\t\treturn map;\n\t\t\t}\n\n\t\t\treturn value !== undefined ?\n\t\t\t\tjQuery.style( elem, name, value ) :\n\t\t\t\tjQuery.css( elem, name );\n\t\t}, name, value, arguments.length > 1 );\n\t},\n\tshow: function() {\n\t\treturn showHide( this, true );\n\t},\n\thide: function() {\n\t\treturn showHide( this );\n\t},\n\ttoggle: function( state ) {\n\t\tif ( typeof state === "boolean" ) {\n\t\t\treturn state ? this.show() : this.hide();\n\t\t}\n\n\t\treturn this.each(function() {\n\t\t\tif ( isHidden( this ) ) {\n\t\t\t\tjQuery( this ).show();\n\t\t\t} else {\n\t\t\t\tjQuery( this ).hide();\n\t\t\t}\n\t\t});\n\t}\n});\n\n\nfunction Tween( elem, options, prop, end, easing ) {\n\treturn new Tween.prototype.init( elem, options, prop, end, easing );\n}\njQuery.Tween = Tween;\n\nTween.prototype = {\n\tconstructor: Tween,\n\tinit: function( elem, options, prop, end, easing, unit ) {\n\t\tthis.elem = elem;\n\t\tthis.prop = prop;\n\t\tthis.easing = easing || "swing";\n\t\tthis.options = options;\n\t\tthis.start = this.now = this.cur();\n\t\tthis.end = end;\n\t\tthis.unit = unit || ( jQuery.cssNumber[ prop ] ? "" : "px" );\n\t},\n\tcur: function() {\n\t\tvar hooks = Tween.propHooks[ this.prop ];\n\n\t\treturn hooks && hooks.get ?\n\t\t\thooks.get( this ) :\n\t\t\tTween.propHooks._default.get( this );\n\t},\n\trun: function( percent ) {\n\t\tvar eased,\n\t\t\thooks = Tween.propHooks[ this.prop ];\n\n\t\tif ( this.options.duration ) {\n\t\t\tthis.pos = eased = jQuery.easing[ this.easing ](\n\t\t\t\tpercent, this.options.duration * percent, 0, 1, this.options.duration\n\t\t\t);\n\t\t} else {\n\t\t\tthis.pos = eased = percent;\n\t\t}\n\t\tthis.now = ( this.end - this.start ) * eased + this.start;\n\n\t\tif ( this.options.step ) {\n\t\t\tthis.options.step.call( this.elem, this.now, this );\n\t\t}\n\n\t\tif ( hooks && hooks.set ) {\n\t\t\thooks.set( this );\n\t\t} else {\n\t\t\tTween.propHooks._default.set( this );\n\t\t}\n\t\treturn this;\n\t}\n};\n\nTween.prototype.init.prototype = Tween.prototype;\n\nTween.propHooks = {\n\t_default: {\n\t\tget: function( tween ) {\n\t\t\tvar result;\n\n\t\t\tif ( tween.elem[ tween.prop ] != null &&\n\t\t\t\t(!tween.elem.style || tween.elem.style[ tween.prop ] == null) ) {\n\t\t\t\treturn tween.elem[ tween.prop ];\n\t\t\t}\n\n\t\t\t// Passing an empty string as a 3rd parameter to .css will automatically\n\t\t\t// attempt a parseFloat and fallback to a string if the parse fails.\n\t\t\t// Simple values such as "10px" are parsed to Float;\n\t\t\t// complex values such as "rotate(1rad)" are returned as-is.\n\t\t\tresult = jQuery.css( tween.elem, tween.prop, "" );\n\t\t\t// Empty strings, null, undefined and "auto" are converted to 0.\n\t\t\treturn !result || result === "auto" ? 0 : result;\n\t\t},\n\t\tset: function( tween ) {\n\t\t\t// Use step hook for back compat.\n\t\t\t// Use cssHook if its there.\n\t\t\t// Use .style if available and use plain properties where available.\n\t\t\tif ( jQuery.fx.step[ tween.prop ] ) {\n\t\t\t\tjQuery.fx.step[ tween.prop ]( tween );\n\t\t\t} else if ( tween.elem.style && ( tween.elem.style[ jQuery.cssProps[ tween.prop ] ] != null || jQuery.cssHooks[ tween.prop ] ) ) {\n\t\t\t\tjQuery.style( tween.elem, tween.prop, tween.now + tween.unit );\n\t\t\t} else {\n\t\t\t\ttween.elem[ tween.prop ] = tween.now;\n\t\t\t}\n\t\t}\n\t}\n};\n\n// Support: IE9\n// Panic based approach to setting things on disconnected nodes\nTween.propHooks.scrollTop = Tween.propHooks.scrollLeft = {\n\tset: function( tween ) {\n\t\tif ( tween.elem.nodeType && tween.elem.parentNode ) {\n\t\t\ttween.elem[ tween.prop ] = tween.now;\n\t\t}\n\t}\n};\n\njQuery.easing = {\n\tlinear: function( p ) {\n\t\treturn p;\n\t},\n\tswing: function( p ) {\n\t\treturn 0.5 - Math.cos( p * Math.PI ) / 2;\n\t}\n};\n\njQuery.fx = Tween.prototype.init;\n\n// Back Compat <1.8 extension point\njQuery.fx.step = {};\n\n\n\n\nvar\n\tfxNow, timerId,\n\trfxtypes = /^(?:toggle|show|hide)$/,\n\trfxnum = new RegExp( "^(?:([+-])=|)(" + pnum + ")([a-z%]*)$", "i" ),\n\trrun = /queueHooks$/,\n\tanimationPrefilters = [ defaultPrefilter ],\n\ttweeners = {\n\t\t"*": [ function( prop, value ) {\n\t\t\tvar tween = this.createTween( prop, value ),\n\t\t\t\ttarget = tween.cur(),\n\t\t\t\tparts = rfxnum.exec( value ),\n\t\t\t\tunit = parts && parts[ 3 ] || ( jQuery.cssNumber[ prop ] ? "" : "px" ),\n\n\t\t\t\t// Starting value computation is required for potential unit mismatches\n\t\t\t\tstart = ( jQuery.cssNumber[ prop ] || unit !== "px" && +target ) &&\n\t\t\t\t\trfxnum.exec( jQuery.css( tween.elem, prop ) ),\n\t\t\t\tscale = 1,\n\t\t\t\tmaxIterations = 20;\n\n\t\t\tif ( start && start[ 3 ] !== unit ) {\n\t\t\t\t// Trust units reported by jQuery.css\n\t\t\t\tunit = unit || start[ 3 ];\n\n\t\t\t\t// Make sure we update the tween properties later on\n\t\t\t\tparts = parts || [];\n\n\t\t\t\t// Iteratively approximate from a nonzero starting point\n\t\t\t\tstart = +target || 1;\n\n\t\t\t\tdo {\n\t\t\t\t\t// If previous iteration zeroed out, double until we get *something*.\n\t\t\t\t\t// Use string for doubling so we don\'t accidentally see scale as unchanged below\n\t\t\t\t\tscale = scale || ".5";\n\n\t\t\t\t\t// Adjust and apply\n\t\t\t\t\tstart = start / scale;\n\t\t\t\t\tjQuery.style( tween.elem, prop, start + unit );\n\n\t\t\t\t// Update scale, tolerating zero or NaN from tween.cur(),\n\t\t\t\t// break the loop if scale is unchanged or perfect, or if we\'ve just had enough\n\t\t\t\t} while ( scale !== (scale = tween.cur() / target) && scale !== 1 && --maxIterations );\n\t\t\t}\n\n\t\t\t// Update tween properties\n\t\t\tif ( parts ) {\n\t\t\t\tstart = tween.start = +start || +target || 0;\n\t\t\t\ttween.unit = unit;\n\t\t\t\t// If a +=/-= token was provided, we\'re doing a relative animation\n\t\t\t\ttween.end = parts[ 1 ] ?\n\t\t\t\t\tstart + ( parts[ 1 ] + 1 ) * parts[ 2 ] :\n\t\t\t\t\t+parts[ 2 ];\n\t\t\t}\n\n\t\t\treturn tween;\n\t\t} ]\n\t};\n\n// Animations created synchronously will run synchronously\nfunction createFxNow() {\n\tsetTimeout(function() {\n\t\tfxNow = undefined;\n\t});\n\treturn ( fxNow = jQuery.now() );\n}\n\n// Generate parameters to create a standard animation\nfunction genFx( type, includeWidth ) {\n\tvar which,\n\t\ti = 0,\n\t\tattrs = { height: type };\n\n\t// If we include width, step value is 1 to do all cssExpand values,\n\t// otherwise step value is 2 to skip over Left and Right\n\tincludeWidth = includeWidth ? 1 : 0;\n\tfor ( ; i < 4 ; i += 2 - includeWidth ) {\n\t\twhich = cssExpand[ i ];\n\t\tattrs[ "margin" + which ] = attrs[ "padding" + which ] = type;\n\t}\n\n\tif ( includeWidth ) {\n\t\tattrs.opacity = attrs.width = type;\n\t}\n\n\treturn attrs;\n}\n\nfunction createTween( value, prop, animation ) {\n\tvar tween,\n\t\tcollection = ( tweeners[ prop ] || [] ).concat( tweeners[ "*" ] ),\n\t\tindex = 0,\n\t\tlength = collection.length;\n\tfor ( ; index < length; index++ ) {\n\t\tif ( (tween = collection[ index ].call( animation, prop, value )) ) {\n\n\t\t\t// We\'re done with this property\n\t\t\treturn tween;\n\t\t}\n\t}\n}\n\nfunction defaultPrefilter( elem, props, opts ) {\n\t/* jshint validthis: true */\n\tvar prop, value, toggle, tween, hooks, oldfire, display, checkDisplay,\n\t\tanim = this,\n\t\torig = {},\n\t\tstyle = elem.style,\n\t\thidden = elem.nodeType && isHidden( elem ),\n\t\tdataShow = data_priv.get( elem, "fxshow" );\n\n\t// Handle queue: false promises\n\tif ( !opts.queue ) {\n\t\thooks = jQuery._queueHooks( elem, "fx" );\n\t\tif ( hooks.unqueued == null ) {\n\t\t\thooks.unqueued = 0;\n\t\t\toldfire = hooks.empty.fire;\n\t\t\thooks.empty.fire = function() {\n\t\t\t\tif ( !hooks.unqueued ) {\n\t\t\t\t\toldfire();\n\t\t\t\t}\n\t\t\t};\n\t\t}\n\t\thooks.unqueued++;\n\n\t\tanim.always(function() {\n\t\t\t// Ensure the complete handler is called before this completes\n\t\t\tanim.always(function() {\n\t\t\t\thooks.unqueued--;\n\t\t\t\tif ( !jQuery.queue( elem, "fx" ).length ) {\n\t\t\t\t\thooks.empty.fire();\n\t\t\t\t}\n\t\t\t});\n\t\t});\n\t}\n\n\t// Height/width overflow pass\n\tif ( elem.nodeType === 1 && ( "height" in props || "width" in props ) ) {\n\t\t// Make sure that nothing sneaks out\n\t\t// Record all 3 overflow attributes because IE9-10 do not\n\t\t// change the overflow attribute when overflowX and\n\t\t// overflowY are set to the same value\n\t\topts.overflow = [ style.overflow, style.overflowX, style.overflowY ];\n\n\t\t// Set display property to inline-block for height/width\n\t\t// animations on inline elements that are having width/height animated\n\t\tdisplay = jQuery.css( elem, "display" );\n\n\t\t// Test default display if display is currently "none"\n\t\tcheckDisplay = display === "none" ?\n\t\t\tdata_priv.get( elem, "olddisplay" ) || defaultDisplay( elem.nodeName ) : display;\n\n\t\tif ( checkDisplay === "inline" && jQuery.css( elem, "float" ) === "none" ) {\n\t\t\tstyle.display = "inline-block";\n\t\t}\n\t}\n\n\tif ( opts.overflow ) {\n\t\tstyle.overflow = "hidden";\n\t\tanim.always(function() {\n\t\t\tstyle.overflow = opts.overflow[ 0 ];\n\t\t\tstyle.overflowX = opts.overflow[ 1 ];\n\t\t\tstyle.overflowY = opts.overflow[ 2 ];\n\t\t});\n\t}\n\n\t// show/hide pass\n\tfor ( prop in props ) {\n\t\tvalue = props[ prop ];\n\t\tif ( rfxtypes.exec( value ) ) {\n\t\t\tdelete props[ prop ];\n\t\t\ttoggle = toggle || value === "toggle";\n\t\t\tif ( value === ( hidden ? "hide" : "show" ) ) {\n\n\t\t\t\t// If there is dataShow left over from a stopped hide or show and we are going to proceed with show, we should pretend to be hidden\n\t\t\t\tif ( value === "show" && dataShow && dataShow[ prop ] !== undefined ) {\n\t\t\t\t\thidden = true;\n\t\t\t\t} else {\n\t\t\t\t\tcontinue;\n\t\t\t\t}\n\t\t\t}\n\t\t\torig[ prop ] = dataShow && dataShow[ prop ] || jQuery.style( elem, prop );\n\n\t\t// Any non-fx value stops us from restoring the original display value\n\t\t} else {\n\t\t\tdisplay = undefined;\n\t\t}\n\t}\n\n\tif ( !jQuery.isEmptyObject( orig ) ) {\n\t\tif ( dataShow ) {\n\t\t\tif ( "hidden" in dataShow ) {\n\t\t\t\thidden = dataShow.hidden;\n\t\t\t}\n\t\t} else {\n\t\t\tdataShow = data_priv.access( elem, "fxshow", {} );\n\t\t}\n\n\t\t// Store state if its toggle - enables .stop().toggle() to "reverse"\n\t\tif ( toggle ) {\n\t\t\tdataShow.hidden = !hidden;\n\t\t}\n\t\tif ( hidden ) {\n\t\t\tjQuery( elem ).show();\n\t\t} else {\n\t\t\tanim.done(function() {\n\t\t\t\tjQuery( elem ).hide();\n\t\t\t});\n\t\t}\n\t\tanim.done(function() {\n\t\t\tvar prop;\n\n\t\t\tdata_priv.remove( elem, "fxshow" );\n\t\t\tfor ( prop in orig ) {\n\t\t\t\tjQuery.style( elem, prop, orig[ prop ] );\n\t\t\t}\n\t\t});\n\t\tfor ( prop in orig ) {\n\t\t\ttween = createTween( hidden ? dataShow[ prop ] : 0, prop, anim );\n\n\t\t\tif ( !( prop in dataShow ) ) {\n\t\t\t\tdataShow[ prop ] = tween.start;\n\t\t\t\tif ( hidden ) {\n\t\t\t\t\ttween.end = tween.start;\n\t\t\t\t\ttween.start = prop === "width" || prop === "height" ? 1 : 0;\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\n\t// If this is a noop like .hide().hide(), restore an overwritten display value\n\t} else if ( (display === "none" ? defaultDisplay( elem.nodeName ) : display) === "inline" ) {\n\t\tstyle.display = display;\n\t}\n}\n\nfunction propFilter( props, specialEasing ) {\n\tvar index, name, easing, value, hooks;\n\n\t// camelCase, specialEasing and expand cssHook pass\n\tfor ( index in props ) {\n\t\tname = jQuery.camelCase( index );\n\t\teasing = specialEasing[ name ];\n\t\tvalue = props[ index ];\n\t\tif ( jQuery.isArray( value ) ) {\n\t\t\teasing = value[ 1 ];\n\t\t\tvalue = props[ index ] = value[ 0 ];\n\t\t}\n\n\t\tif ( index !== name ) {\n\t\t\tprops[ name ] = value;\n\t\t\tdelete props[ index ];\n\t\t}\n\n\t\thooks = jQuery.cssHooks[ name ];\n\t\tif ( hooks && "expand" in hooks ) {\n\t\t\tvalue = hooks.expand( value );\n\t\t\tdelete props[ name ];\n\n\t\t\t// Not quite $.extend, this won\'t overwrite existing keys.\n\t\t\t// Reusing \'index\' because we have the correct "name"\n\t\t\tfor ( index in value ) {\n\t\t\t\tif ( !( index in props ) ) {\n\t\t\t\t\tprops[ index ] = value[ index ];\n\t\t\t\t\tspecialEasing[ index ] = easing;\n\t\t\t\t}\n\t\t\t}\n\t\t} else {\n\t\t\tspecialEasing[ name ] = easing;\n\t\t}\n\t}\n}\n\nfunction Animation( elem, properties, options ) {\n\tvar result,\n\t\tstopped,\n\t\tindex = 0,\n\t\tlength = animationPrefilters.length,\n\t\tdeferred = jQuery.Deferred().always( function() {\n\t\t\t// Don\'t match elem in the :animated selector\n\t\t\tdelete tick.elem;\n\t\t}),\n\t\ttick = function() {\n\t\t\tif ( stopped ) {\n\t\t\t\treturn false;\n\t\t\t}\n\t\t\tvar currentTime = fxNow || createFxNow(),\n\t\t\t\tremaining = Math.max( 0, animation.startTime + animation.duration - currentTime ),\n\t\t\t\t// Support: Android 2.3\n\t\t\t\t// Archaic crash bug won\'t allow us to use `1 - ( 0.5 || 0 )` (#12497)\n\t\t\t\ttemp = remaining / animation.duration || 0,\n\t\t\t\tpercent = 1 - temp,\n\t\t\t\tindex = 0,\n\t\t\t\tlength = animation.tweens.length;\n\n\t\t\tfor ( ; index < length ; index++ ) {\n\t\t\t\tanimation.tweens[ index ].run( percent );\n\t\t\t}\n\n\t\t\tdeferred.notifyWith( elem, [ animation, percent, remaining ]);\n\n\t\t\tif ( percent < 1 && length ) {\n\t\t\t\treturn remaining;\n\t\t\t} else {\n\t\t\t\tdeferred.resolveWith( elem, [ animation ] );\n\t\t\t\treturn false;\n\t\t\t}\n\t\t},\n\t\tanimation = deferred.promise({\n\t\t\telem: elem,\n\t\t\tprops: jQuery.extend( {}, properties ),\n\t\t\topts: jQuery.extend( true, { specialEasing: {} }, options ),\n\t\t\toriginalProperties: properties,\n\t\t\toriginalOptions: options,\n\t\t\tstartTime: fxNow || createFxNow(),\n\t\t\tduration: options.duration,\n\t\t\ttweens: [],\n\t\t\tcreateTween: function( prop, end ) {\n\t\t\t\tvar tween = jQuery.Tween( elem, animation.opts, prop, end,\n\t\t\t\t\t\tanimation.opts.specialEasing[ prop ] || animation.opts.easing );\n\t\t\t\tanimation.tweens.push( tween );\n\t\t\t\treturn tween;\n\t\t\t},\n\t\t\tstop: function( gotoEnd ) {\n\t\t\t\tvar index = 0,\n\t\t\t\t\t// If we are going to the end, we want to run all the tweens\n\t\t\t\t\t// otherwise we skip this part\n\t\t\t\t\tlength = gotoEnd ? animation.tweens.length : 0;\n\t\t\t\tif ( stopped ) {\n\t\t\t\t\treturn this;\n\t\t\t\t}\n\t\t\t\tstopped = true;\n\t\t\t\tfor ( ; index < length ; index++ ) {\n\t\t\t\t\tanimation.tweens[ index ].run( 1 );\n\t\t\t\t}\n\n\t\t\t\t// Resolve when we played the last frame; otherwise, reject\n\t\t\t\tif ( gotoEnd ) {\n\t\t\t\t\tdeferred.resolveWith( elem, [ animation, gotoEnd ] );\n\t\t\t\t} else {\n\t\t\t\t\tdeferred.rejectWith( elem, [ animation, gotoEnd ] );\n\t\t\t\t}\n\t\t\t\treturn this;\n\t\t\t}\n\t\t}),\n\t\tprops = animation.props;\n\n\tpropFilter( props, animation.opts.specialEasing );\n\n\tfor ( ; index < length ; index++ ) {\n\t\tresult = animationPrefilters[ index ].call( animation, elem, props, animation.opts );\n\t\tif ( result ) {\n\t\t\treturn result;\n\t\t}\n\t}\n\n\tjQuery.map( props, createTween, animation );\n\n\tif ( jQuery.isFunction( animation.opts.start ) ) {\n\t\tanimation.opts.start.call( elem, animation );\n\t}\n\n\tjQuery.fx.timer(\n\t\tjQuery.extend( tick, {\n\t\t\telem: elem,\n\t\t\tanim: animation,\n\t\t\tqueue: animation.opts.queue\n\t\t})\n\t);\n\n\t// attach callbacks from options\n\treturn animation.progress( animation.opts.progress )\n\t\t.done( animation.opts.done, animation.opts.complete )\n\t\t.fail( animation.opts.fail )\n\t\t.always( animation.opts.always );\n}\n\njQuery.Animation = jQuery.extend( Animation, {\n\n\ttweener: function( props, callback ) {\n\t\tif ( jQuery.isFunction( props ) ) {\n\t\t\tcallback = props;\n\t\t\tprops = [ "*" ];\n\t\t} else {\n\t\t\tprops = props.split(" ");\n\t\t}\n\n\t\tvar prop,\n\t\t\tindex = 0,\n\t\t\tlength = props.length;\n\n\t\tfor ( ; index < length ; index++ ) {\n\t\t\tprop = props[ index ];\n\t\t\ttweeners[ prop ] = tweeners[ prop ] || [];\n\t\t\ttweeners[ prop ].unshift( callback );\n\t\t}\n\t},\n\n\tprefilter: function( callback, prepend ) {\n\t\tif ( prepend ) {\n\t\t\tanimationPrefilters.unshift( callback );\n\t\t} else {\n\t\t\tanimationPrefilters.push( callback );\n\t\t}\n\t}\n});\n\njQuery.speed = function( speed, easing, fn ) {\n\tvar opt = speed && typeof speed === "object" ? jQuery.extend( {}, speed ) : {\n\t\tcomplete: fn || !fn && easing ||\n\t\t\tjQuery.isFunction( speed ) && speed,\n\t\tduration: speed,\n\t\teasing: fn && easing || easing && !jQuery.isFunction( easing ) && easing\n\t};\n\n\topt.duration = jQuery.fx.off ? 0 : typeof opt.duration === "number" ? opt.duration :\n\t\topt.duration in jQuery.fx.speeds ? jQuery.fx.speeds[ opt.duration ] : jQuery.fx.speeds._default;\n\n\t// Normalize opt.queue - true/undefined/null -> "fx"\n\tif ( opt.queue == null || opt.queue === true ) {\n\t\topt.queue = "fx";\n\t}\n\n\t// Queueing\n\topt.old = opt.complete;\n\n\topt.complete = function() {\n\t\tif ( jQuery.isFunction( opt.old ) ) {\n\t\t\topt.old.call( this );\n\t\t}\n\n\t\tif ( opt.queue ) {\n\t\t\tjQuery.dequeue( this, opt.queue );\n\t\t}\n\t};\n\n\treturn opt;\n};\n\njQuery.fn.extend({\n\tfadeTo: function( speed, to, easing, callback ) {\n\n\t\t// Show any hidden elements after setting opacity to 0\n\t\treturn this.filter( isHidden ).css( "opacity", 0 ).show()\n\n\t\t\t// Animate to the value specified\n\t\t\t.end().animate({ opacity: to }, speed, easing, callback );\n\t},\n\tanimate: function( prop, speed, easing, callback ) {\n\t\tvar empty = jQuery.isEmptyObject( prop ),\n\t\t\toptall = jQuery.speed( speed, easing, callback ),\n\t\t\tdoAnimation = function() {\n\t\t\t\t// Operate on a copy of prop so per-property easing won\'t be lost\n\t\t\t\tvar anim = Animation( this, jQuery.extend( {}, prop ), optall );\n\n\t\t\t\t// Empty animations, or finishing resolves immediately\n\t\t\t\tif ( empty || data_priv.get( this, "finish" ) ) {\n\t\t\t\t\tanim.stop( true );\n\t\t\t\t}\n\t\t\t};\n\t\t\tdoAnimation.finish = doAnimation;\n\n\t\treturn empty || optall.queue === false ?\n\t\t\tthis.each( doAnimation ) :\n\t\t\tthis.queue( optall.queue, doAnimation );\n\t},\n\tstop: function( type, clearQueue, gotoEnd ) {\n\t\tvar stopQueue = function( hooks ) {\n\t\t\tvar stop = hooks.stop;\n\t\t\tdelete hooks.stop;\n\t\t\tstop( gotoEnd );\n\t\t};\n\n\t\tif ( typeof type !== "string" ) {\n\t\t\tgotoEnd = clearQueue;\n\t\t\tclearQueue = type;\n\t\t\ttype = undefined;\n\t\t}\n\t\tif ( clearQueue && type !== false ) {\n\t\t\tthis.queue( type || "fx", [] );\n\t\t}\n\n\t\treturn this.each(function() {\n\t\t\tvar dequeue = true,\n\t\t\t\tindex = type != null && type + "queueHooks",\n\t\t\t\ttimers = jQuery.timers,\n\t\t\t\tdata = data_priv.get( this );\n\n\t\t\tif ( index ) {\n\t\t\t\tif ( data[ index ] && data[ index ].stop ) {\n\t\t\t\t\tstopQueue( data[ index ] );\n\t\t\t\t}\n\t\t\t} else {\n\t\t\t\tfor ( index in data ) {\n\t\t\t\t\tif ( data[ index ] && data[ index ].stop && rrun.test( index ) ) {\n\t\t\t\t\t\tstopQueue( data[ index ] );\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t}\n\n\t\t\tfor ( index = timers.length; index--; ) {\n\t\t\t\tif ( timers[ index ].elem === this && (type == null || timers[ index ].queue === type) ) {\n\t\t\t\t\ttimers[ index ].anim.stop( gotoEnd );\n\t\t\t\t\tdequeue = false;\n\t\t\t\t\ttimers.splice( index, 1 );\n\t\t\t\t}\n\t\t\t}\n\n\t\t\t// Start the next in the queue if the last step wasn\'t forced.\n\t\t\t// Timers currently will call their complete callbacks, which\n\t\t\t// will dequeue but only if they were gotoEnd.\n\t\t\tif ( dequeue || !gotoEnd ) {\n\t\t\t\tjQuery.dequeue( this, type );\n\t\t\t}\n\t\t});\n\t},\n\tfinish: function( type ) {\n\t\tif ( type !== false ) {\n\t\t\ttype = type || "fx";\n\t\t}\n\t\treturn this.each(function() {\n\t\t\tvar index,\n\t\t\t\tdata = data_priv.get( this ),\n\t\t\t\tqueue = data[ type + "queue" ],\n\t\t\t\thooks = data[ type + "queueHooks" ],\n\t\t\t\ttimers = jQuery.timers,\n\t\t\t\tlength = queue ? queue.length : 0;\n\n\t\t\t// Enable finishing flag on private data\n\t\t\tdata.finish = true;\n\n\t\t\t// Empty the queue first\n\t\t\tjQuery.queue( this, type, [] );\n\n\t\t\tif ( hooks && hooks.stop ) {\n\t\t\t\thooks.stop.call( this, true );\n\t\t\t}\n\n\t\t\t// Look for any active animations, and finish them\n\t\t\tfor ( index = timers.length; index--; ) {\n\t\t\t\tif ( timers[ index ].elem === this && timers[ index ].queue === type ) {\n\t\t\t\t\ttimers[ index ].anim.stop( true );\n\t\t\t\t\ttimers.splice( index, 1 );\n\t\t\t\t}\n\t\t\t}\n\n\t\t\t// Look for any animations in the old queue and finish them\n\t\t\tfor ( index = 0; index < length; index++ ) {\n\t\t\t\tif ( queue[ index ] && queue[ index ].finish ) {\n\t\t\t\t\tqueue[ index ].finish.call( this );\n\t\t\t\t}\n\t\t\t}\n\n\t\t\t// Turn off finishing flag\n\t\t\tdelete data.finish;\n\t\t});\n\t}\n});\n\njQuery.each([ "toggle", "show", "hide" ], function( i, name ) {\n\tvar cssFn = jQuery.fn[ name ];\n\tjQuery.fn[ name ] = function( speed, easing, callback ) {\n\t\treturn speed == null || typeof speed === "boolean" ?\n\t\t\tcssFn.apply( this, arguments ) :\n\t\t\tthis.animate( genFx( name, true ), speed, easing, callback );\n\t};\n});\n\n// Generate shortcuts for custom animations\njQuery.each({\n\tslideDown: genFx("show"),\n\tslideUp: genFx("hide"),\n\tslideToggle: genFx("toggle"),\n\tfadeIn: { opacity: "show" },\n\tfadeOut: { opacity: "hide" },\n\tfadeToggle: { opacity: "toggle" }\n}, function( name, props ) {\n\tjQuery.fn[ name ] = function( speed, easing, callback ) {\n\t\treturn this.animate( props, speed, easing, callback );\n\t};\n});\n\njQuery.timers = [];\njQuery.fx.tick = function() {\n\tvar timer,\n\t\ti = 0,\n\t\ttimers = jQuery.timers;\n\n\tfxNow = jQuery.now();\n\n\tfor ( ; i < timers.length; i++ ) {\n\t\ttimer = timers[ i ];\n\t\t// Checks the timer has not already been removed\n\t\tif ( !timer() && timers[ i ] === timer ) {\n\t\t\ttimers.splice( i--, 1 );\n\t\t}\n\t}\n\n\tif ( !timers.length ) {\n\t\tjQuery.fx.stop();\n\t}\n\tfxNow = undefined;\n};\n\njQuery.fx.timer = function( timer ) {\n\tjQuery.timers.push( timer );\n\tif ( timer() ) {\n\t\tjQuery.fx.start();\n\t} else {\n\t\tjQuery.timers.pop();\n\t}\n};\n\njQuery.fx.interval = 13;\n\njQuery.fx.start = function() {\n\tif ( !timerId ) {\n\t\ttimerId = setInterval( jQuery.fx.tick, jQuery.fx.interval );\n\t}\n};\n\njQuery.fx.stop = function() {\n\tclearInterval( timerId );\n\ttimerId = null;\n};\n\njQuery.fx.speeds = {\n\tslow: 600,\n\tfast: 200,\n\t// Default speed\n\t_default: 400\n};\n\n\n// Based off of the plugin by Clint Helfers, with permission.\n// http://blindsignals.com/index.php/2009/07/jquery-delay/\njQuery.fn.delay = function( time, type ) {\n\ttime = jQuery.fx ? jQuery.fx.speeds[ time ] || time : time;\n\ttype = type || "fx";\n\n\treturn this.queue( type, function( next, hooks ) {\n\t\tvar timeout = setTimeout( next, time );\n\t\thooks.stop = function() {\n\t\t\tclearTimeout( timeout );\n\t\t};\n\t});\n};\n\n\n(function() {\n\tvar input = document.createElement( "input" ),\n\t\tselect = document.createElement( "select" ),\n\t\topt = select.appendChild( document.createElement( "option" ) );\n\n\tinput.type = "checkbox";\n\n\t// Support: iOS<=5.1, Android<=4.2+\n\t// Default value for a checkbox should be "on"\n\tsupport.checkOn = input.value !== "";\n\n\t// Support: IE<=11+\n\t// Must access selectedIndex to make default options select\n\tsupport.optSelected = opt.selected;\n\n\t// Support: Android<=2.3\n\t// Options inside disabled selects are incorrectly marked as disabled\n\tselect.disabled = true;\n\tsupport.optDisabled = !opt.disabled;\n\n\t// Support: IE<=11+\n\t// An input loses its value after becoming a radio\n\tinput = document.createElement( "input" );\n\tinput.value = "t";\n\tinput.type = "radio";\n\tsupport.radioValue = input.value === "t";\n})();\n\n\nvar nodeHook, boolHook,\n\tattrHandle = jQuery.expr.attrHandle;\n\njQuery.fn.extend({\n\tattr: function( name, value ) {\n\t\treturn access( this, jQuery.attr, name, value, arguments.length > 1 );\n\t},\n\n\tremoveAttr: function( name ) {\n\t\treturn this.each(function() {\n\t\t\tjQuery.removeAttr( this, name );\n\t\t});\n\t}\n});\n\njQuery.extend({\n\tattr: function( elem, name, value ) {\n\t\tvar hooks, ret,\n\t\t\tnType = elem.nodeType;\n\n\t\t// don\'t get/set attributes on text, comment and attribute nodes\n\t\tif ( !elem || nType === 3 || nType === 8 || nType === 2 ) {\n\t\t\treturn;\n\t\t}\n\n\t\t// Fallback to prop when attributes are not supported\n\t\tif ( typeof elem.getAttribute === strundefined ) {\n\t\t\treturn jQuery.prop( elem, name, value );\n\t\t}\n\n\t\t// All attributes are lowercase\n\t\t// Grab necessary hook if one is defined\n\t\tif ( nType !== 1 || !jQuery.isXMLDoc( elem ) ) {\n\t\t\tname = name.toLowerCase();\n\t\t\thooks = jQuery.attrHooks[ name ] ||\n\t\t\t\t( jQuery.expr.match.bool.test( name ) ? boolHook : nodeHook );\n\t\t}\n\n\t\tif ( value !== undefined ) {\n\n\t\t\tif ( value === null ) {\n\t\t\t\tjQuery.removeAttr( elem, name );\n\n\t\t\t} else if ( hooks && "set" in hooks && (ret = hooks.set( elem, value, name )) !== undefined ) {\n\t\t\t\treturn ret;\n\n\t\t\t} else {\n\t\t\t\telem.setAttribute( name, value + "" );\n\t\t\t\treturn value;\n\t\t\t}\n\n\t\t} else if ( hooks && "get" in hooks && (ret = hooks.get( elem, name )) !== null ) {\n\t\t\treturn ret;\n\n\t\t} else {\n\t\t\tret = jQuery.find.attr( elem, name );\n\n\t\t\t// Non-existent attributes return null, we normalize to undefined\n\t\t\treturn ret == null ?\n\t\t\t\tundefined :\n\t\t\t\tret;\n\t\t}\n\t},\n\n\tremoveAttr: function( elem, value ) {\n\t\tvar name, propName,\n\t\t\ti = 0,\n\t\t\tattrNames = value && value.match( rnotwhite );\n\n\t\tif ( attrNames && elem.nodeType === 1 ) {\n\t\t\twhile ( (name = attrNames[i++]) ) {\n\t\t\t\tpropName = jQuery.propFix[ name ] || name;\n\n\t\t\t\t// Boolean attributes get special treatment (#10870)\n\t\t\t\tif ( jQuery.expr.match.bool.test( name ) ) {\n\t\t\t\t\t// Set corresponding property to false\n\t\t\t\t\telem[ propName ] = false;\n\t\t\t\t}\n\n\t\t\t\telem.removeAttribute( name );\n\t\t\t}\n\t\t}\n\t},\n\n\tattrHooks: {\n\t\ttype: {\n\t\t\tset: function( elem, value ) {\n\t\t\t\tif ( !support.radioValue && value === "radio" &&\n\t\t\t\t\tjQuery.nodeName( elem, "input" ) ) {\n\t\t\t\t\tvar val = elem.value;\n\t\t\t\t\telem.setAttribute( "type", value );\n\t\t\t\t\tif ( val ) {\n\t\t\t\t\t\telem.value = val;\n\t\t\t\t\t}\n\t\t\t\t\treturn value;\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n});\n\n// Hooks for boolean attributes\nboolHook = {\n\tset: function( elem, value, name ) {\n\t\tif ( value === false ) {\n\t\t\t// Remove boolean attributes when set to false\n\t\t\tjQuery.removeAttr( elem, name );\n\t\t} else {\n\t\t\telem.setAttribute( name, name );\n\t\t}\n\t\treturn name;\n\t}\n};\njQuery.each( jQuery.expr.match.bool.source.match( /\\w+/g ), function( i, name ) {\n\tvar getter = attrHandle[ name ] || jQuery.find.attr;\n\n\tattrHandle[ name ] = function( elem, name, isXML ) {\n\t\tvar ret, handle;\n\t\tif ( !isXML ) {\n\t\t\t// Avoid an infinite loop by temporarily removing this function from the getter\n\t\t\thandle = attrHandle[ name ];\n\t\t\tattrHandle[ name ] = ret;\n\t\t\tret = getter( elem, name, isXML ) != null ?\n\t\t\t\tname.toLowerCase() :\n\t\t\t\tnull;\n\t\t\tattrHandle[ name ] = handle;\n\t\t}\n\t\treturn ret;\n\t};\n});\n\n\n\n\nvar rfocusable = /^(?:input|select|textarea|button)$/i;\n\njQuery.fn.extend({\n\tprop: function( name, value ) {\n\t\treturn access( this, jQuery.prop, name, value, arguments.length > 1 );\n\t},\n\n\tremoveProp: function( name ) {\n\t\treturn this.each(function() {\n\t\t\tdelete this[ jQuery.propFix[ name ] || name ];\n\t\t});\n\t}\n});\n\njQuery.extend({\n\tpropFix: {\n\t\t"for": "htmlFor",\n\t\t"class": "className"\n\t},\n\n\tprop: function( elem, name, value ) {\n\t\tvar ret, hooks, notxml,\n\t\t\tnType = elem.nodeType;\n\n\t\t// Don\'t get/set properties on text, comment and attribute nodes\n\t\tif ( !elem || nType === 3 || nType === 8 || nType === 2 ) {\n\t\t\treturn;\n\t\t}\n\n\t\tnotxml = nType !== 1 || !jQuery.isXMLDoc( elem );\n\n\t\tif ( notxml ) {\n\t\t\t// Fix name and attach hooks\n\t\t\tname = jQuery.propFix[ name ] || name;\n\t\t\thooks = jQuery.propHooks[ name ];\n\t\t}\n\n\t\tif ( value !== undefined ) {\n\t\t\treturn hooks && "set" in hooks && (ret = hooks.set( elem, value, name )) !== undefined ?\n\t\t\t\tret :\n\t\t\t\t( elem[ name ] = value );\n\n\t\t} else {\n\t\t\treturn hooks && "get" in hooks && (ret = hooks.get( elem, name )) !== null ?\n\t\t\t\tret :\n\t\t\t\telem[ name ];\n\t\t}\n\t},\n\n\tpropHooks: {\n\t\ttabIndex: {\n\t\t\tget: function( elem ) {\n\t\t\t\treturn elem.hasAttribute( "tabindex" ) || rfocusable.test( elem.nodeName ) || elem.href ?\n\t\t\t\t\telem.tabIndex :\n\t\t\t\t\t-1;\n\t\t\t}\n\t\t}\n\t}\n});\n\nif ( !support.optSelected ) {\n\tjQuery.propHooks.selected = {\n\t\tget: function( elem ) {\n\t\t\tvar parent = elem.parentNode;\n\t\t\tif ( parent && parent.parentNode ) {\n\t\t\t\tparent.parentNode.selectedIndex;\n\t\t\t}\n\t\t\treturn null;\n\t\t}\n\t};\n}\n\njQuery.each([\n\t"tabIndex",\n\t"readOnly",\n\t"maxLength",\n\t"cellSpacing",\n\t"cellPadding",\n\t"rowSpan",\n\t"colSpan",\n\t"useMap",\n\t"frameBorder",\n\t"contentEditable"\n], function() {\n\tjQuery.propFix[ this.toLowerCase() ] = this;\n});\n\n\n\n\nvar rclass = /[\\t\\r\\n\\f]/g;\n\njQuery.fn.extend({\n\taddClass: function( value ) {\n\t\tvar classes, elem, cur, clazz, j, finalValue,\n\t\t\tproceed = typeof value === "string" && value,\n\t\t\ti = 0,\n\t\t\tlen = this.length;\n\n\t\tif ( jQuery.isFunction( value ) ) {\n\t\t\treturn this.each(function( j ) {\n\t\t\t\tjQuery( this ).addClass( value.call( this, j, this.className ) );\n\t\t\t});\n\t\t}\n\n\t\tif ( proceed ) {\n\t\t\t// The disjunction here is for better compressibility (see removeClass)\n\t\t\tclasses = ( value || "" ).match( rnotwhite ) || [];\n\n\t\t\tfor ( ; i < len; i++ ) {\n\t\t\t\telem = this[ i ];\n\t\t\t\tcur = elem.nodeType === 1 && ( elem.className ?\n\t\t\t\t\t( " " + elem.className + " " ).replace( rclass, " " ) :\n\t\t\t\t\t" "\n\t\t\t\t);\n\n\t\t\t\tif ( cur ) {\n\t\t\t\t\tj = 0;\n\t\t\t\t\twhile ( (clazz = classes[j++]) ) {\n\t\t\t\t\t\tif ( cur.indexOf( " " + clazz + " " ) < 0 ) {\n\t\t\t\t\t\t\tcur += clazz + " ";\n\t\t\t\t\t\t}\n\t\t\t\t\t}\n\n\t\t\t\t\t// only assign if different to avoid unneeded rendering.\n\t\t\t\t\tfinalValue = jQuery.trim( cur );\n\t\t\t\t\tif ( elem.className !== finalValue ) {\n\t\t\t\t\t\telem.className = finalValue;\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\n\t\treturn this;\n\t},\n\n\tremoveClass: function( value ) {\n\t\tvar classes, elem, cur, clazz, j, finalValue,\n\t\t\tproceed = arguments.length === 0 || typeof value === "string" && value,\n\t\t\ti = 0,\n\t\t\tlen = this.length;\n\n\t\tif ( jQuery.isFunction( value ) ) {\n\t\t\treturn this.each(function( j ) {\n\t\t\t\tjQuery( this ).removeClass( value.call( this, j, this.className ) );\n\t\t\t});\n\t\t}\n\t\tif ( proceed ) {\n\t\t\tclasses = ( value || "" ).match( rnotwhite ) || [];\n\n\t\t\tfor ( ; i < len; i++ ) {\n\t\t\t\telem = this[ i ];\n\t\t\t\t// This expression is here for better compressibility (see addClass)\n\t\t\t\tcur = elem.nodeType === 1 && ( elem.className ?\n\t\t\t\t\t( " " + elem.className + " " ).replace( rclass, " " ) :\n\t\t\t\t\t""\n\t\t\t\t);\n\n\t\t\t\tif ( cur ) {\n\t\t\t\t\tj = 0;\n\t\t\t\t\twhile ( (clazz = classes[j++]) ) {\n\t\t\t\t\t\t// Remove *all* instances\n\t\t\t\t\t\twhile ( cur.indexOf( " " + clazz + " " ) >= 0 ) {\n\t\t\t\t\t\t\tcur = cur.replace( " " + clazz + " ", " " );\n\t\t\t\t\t\t}\n\t\t\t\t\t}\n\n\t\t\t\t\t// Only assign if different to avoid unneeded rendering.\n\t\t\t\t\tfinalValue = value ? jQuery.trim( cur ) : "";\n\t\t\t\t\tif ( elem.className !== finalValue ) {\n\t\t\t\t\t\telem.className = finalValue;\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\n\t\treturn this;\n\t},\n\n\ttoggleClass: function( value, stateVal ) {\n\t\tvar type = typeof value;\n\n\t\tif ( typeof stateVal === "boolean" && type === "string" ) {\n\t\t\treturn stateVal ? this.addClass( value ) : this.removeClass( value );\n\t\t}\n\n\t\tif ( jQuery.isFunction( value ) ) {\n\t\t\treturn this.each(function( i ) {\n\t\t\t\tjQuery( this ).toggleClass( value.call(this, i, this.className, stateVal), stateVal );\n\t\t\t});\n\t\t}\n\n\t\treturn this.each(function() {\n\t\t\tif ( type === "string" ) {\n\t\t\t\t// Toggle individual class names\n\t\t\t\tvar className,\n\t\t\t\t\ti = 0,\n\t\t\t\t\tself = jQuery( this ),\n\t\t\t\t\tclassNames = value.match( rnotwhite ) || [];\n\n\t\t\t\twhile ( (className = classNames[ i++ ]) ) {\n\t\t\t\t\t// Check each className given, space separated list\n\t\t\t\t\tif ( self.hasClass( className ) ) {\n\t\t\t\t\t\tself.removeClass( className );\n\t\t\t\t\t} else {\n\t\t\t\t\t\tself.addClass( className );\n\t\t\t\t\t}\n\t\t\t\t}\n\n\t\t\t// Toggle whole class name\n\t\t\t} else if ( type === strundefined || type === "boolean" ) {\n\t\t\t\tif ( this.className ) {\n\t\t\t\t\t// store className if set\n\t\t\t\t\tdata_priv.set( this, "__className__", this.className );\n\t\t\t\t}\n\n\t\t\t\t// If the element has a class name or if we\'re passed `false`,\n\t\t\t\t// then remove the whole classname (if there was one, the above saved it).\n\t\t\t\t// Otherwise bring back whatever was previously saved (if anything),\n\t\t\t\t// falling back to the empty string if nothing was stored.\n\t\t\t\tthis.className = this.className || value === false ? "" : data_priv.get( this, "__className__" ) || "";\n\t\t\t}\n\t\t});\n\t},\n\n\thasClass: function( selector ) {\n\t\tvar className = " " + selector + " ",\n\t\t\ti = 0,\n\t\t\tl = this.length;\n\t\tfor ( ; i < l; i++ ) {\n\t\t\tif ( this[i].nodeType === 1 && (" " + this[i].className + " ").replace(rclass, " ").indexOf( className ) >= 0 ) {\n\t\t\t\treturn true;\n\t\t\t}\n\t\t}\n\n\t\treturn false;\n\t}\n});\n\n\n\n\nvar rreturn = /\\r/g;\n\njQuery.fn.extend({\n\tval: function( value ) {\n\t\tvar hooks, ret, isFunction,\n\t\t\telem = this[0];\n\n\t\tif ( !arguments.length ) {\n\t\t\tif ( elem ) {\n\t\t\t\thooks = jQuery.valHooks[ elem.type ] || jQuery.valHooks[ elem.nodeName.toLowerCase() ];\n\n\t\t\t\tif ( hooks && "get" in hooks && (ret = hooks.get( elem, "value" )) !== undefined ) {\n\t\t\t\t\treturn ret;\n\t\t\t\t}\n\n\t\t\t\tret = elem.value;\n\n\t\t\t\treturn typeof ret === "string" ?\n\t\t\t\t\t// Handle most common string cases\n\t\t\t\t\tret.replace(rreturn, "") :\n\t\t\t\t\t// Handle cases where value is null/undef or number\n\t\t\t\t\tret == null ? "" : ret;\n\t\t\t}\n\n\t\t\treturn;\n\t\t}\n\n\t\tisFunction = jQuery.isFunction( value );\n\n\t\treturn this.each(function( i ) {\n\t\t\tvar val;\n\n\t\t\tif ( this.nodeType !== 1 ) {\n\t\t\t\treturn;\n\t\t\t}\n\n\t\t\tif ( isFunction ) {\n\t\t\t\tval = value.call( this, i, jQuery( this ).val() );\n\t\t\t} else {\n\t\t\t\tval = value;\n\t\t\t}\n\n\t\t\t// Treat null/undefined as ""; convert numbers to string\n\t\t\tif ( val == null ) {\n\t\t\t\tval = "";\n\n\t\t\t} else if ( typeof val === "number" ) {\n\t\t\t\tval += "";\n\n\t\t\t} else if ( jQuery.isArray( val ) ) {\n\t\t\t\tval = jQuery.map( val, function( value ) {\n\t\t\t\t\treturn value == null ? "" : value + "";\n\t\t\t\t});\n\t\t\t}\n\n\t\t\thooks = jQuery.valHooks[ this.type ] || jQuery.valHooks[ this.nodeName.toLowerCase() ];\n\n\t\t\t// If set returns undefined, fall back to normal setting\n\t\t\tif ( !hooks || !("set" in hooks) || hooks.set( this, val, "value" ) === undefined ) {\n\t\t\t\tthis.value = val;\n\t\t\t}\n\t\t});\n\t}\n});\n\njQuery.extend({\n\tvalHooks: {\n\t\toption: {\n\t\t\tget: function( elem ) {\n\t\t\t\tvar val = jQuery.find.attr( elem, "value" );\n\t\t\t\treturn val != null ?\n\t\t\t\t\tval :\n\t\t\t\t\t// Support: IE10-11+\n\t\t\t\t\t// option.text throws exceptions (#14686, #14858)\n\t\t\t\t\tjQuery.trim( jQuery.text( elem ) );\n\t\t\t}\n\t\t},\n\t\tselect: {\n\t\t\tget: function( elem ) {\n\t\t\t\tvar value, option,\n\t\t\t\t\toptions = elem.options,\n\t\t\t\t\tindex = elem.selectedIndex,\n\t\t\t\t\tone = elem.type === "select-one" || index < 0,\n\t\t\t\t\tvalues = one ? null : [],\n\t\t\t\t\tmax = one ? index + 1 : options.length,\n\t\t\t\t\ti = index < 0 ?\n\t\t\t\t\t\tmax :\n\t\t\t\t\t\tone ? index : 0;\n\n\t\t\t\t// Loop through all the selected options\n\t\t\t\tfor ( ; i < max; i++ ) {\n\t\t\t\t\toption = options[ i ];\n\n\t\t\t\t\t// IE6-9 doesn\'t update selected after form reset (#2551)\n\t\t\t\t\tif ( ( option.selected || i === index ) &&\n\t\t\t\t\t\t\t// Don\'t return options that are disabled or in a disabled optgroup\n\t\t\t\t\t\t\t( support.optDisabled ? !option.disabled : option.getAttribute( "disabled" ) === null ) &&\n\t\t\t\t\t\t\t( !option.parentNode.disabled || !jQuery.nodeName( option.parentNode, "optgroup" ) ) ) {\n\n\t\t\t\t\t\t// Get the specific value for the option\n\t\t\t\t\t\tvalue = jQuery( option ).val();\n\n\t\t\t\t\t\t// We don\'t need an array for one selects\n\t\t\t\t\t\tif ( one ) {\n\t\t\t\t\t\t\treturn value;\n\t\t\t\t\t\t}\n\n\t\t\t\t\t\t// Multi-Selects return an array\n\t\t\t\t\t\tvalues.push( value );\n\t\t\t\t\t}\n\t\t\t\t}\n\n\t\t\t\treturn values;\n\t\t\t},\n\n\t\t\tset: function( elem, value ) {\n\t\t\t\tvar optionSet, option,\n\t\t\t\t\toptions = elem.options,\n\t\t\t\t\tvalues = jQuery.makeArray( value ),\n\t\t\t\t\ti = options.length;\n\n\t\t\t\twhile ( i-- ) {\n\t\t\t\t\toption = options[ i ];\n\t\t\t\t\tif ( (option.selected = jQuery.inArray( option.value, values ) >= 0) ) {\n\t\t\t\t\t\toptionSet = true;\n\t\t\t\t\t}\n\t\t\t\t}\n\n\t\t\t\t// Force browsers to behave consistently when non-matching value is set\n\t\t\t\tif ( !optionSet ) {\n\t\t\t\t\telem.selectedIndex = -1;\n\t\t\t\t}\n\t\t\t\treturn values;\n\t\t\t}\n\t\t}\n\t}\n});\n\n// Radios and checkboxes getter/setter\njQuery.each([ "radio", "checkbox" ], function() {\n\tjQuery.valHooks[ this ] = {\n\t\tset: function( elem, value ) {\n\t\t\tif ( jQuery.isArray( value ) ) {\n\t\t\t\treturn ( elem.checked = jQuery.inArray( jQuery(elem).val(), value ) >= 0 );\n\t\t\t}\n\t\t}\n\t};\n\tif ( !support.checkOn ) {\n\t\tjQuery.valHooks[ this ].get = function( elem ) {\n\t\t\treturn elem.getAttribute("value") === null ? "on" : elem.value;\n\t\t};\n\t}\n});\n\n\n\n\n// Return jQuery for attributes-only inclusion\n\n\njQuery.each( ("blur focus focusin focusout load resize scroll unload click dblclick " +\n\t"mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave " +\n\t"change select submit keydown keypress keyup error contextmenu").split(" "), function( i, name ) {\n\n\t// Handle event binding\n\tjQuery.fn[ name ] = function( data, fn ) {\n\t\treturn arguments.length > 0 ?\n\t\t\tthis.on( name, null, data, fn ) :\n\t\t\tthis.trigger( name );\n\t};\n});\n\njQuery.fn.extend({\n\thover: function( fnOver, fnOut ) {\n\t\treturn this.mouseenter( fnOver ).mouseleave( fnOut || fnOver );\n\t},\n\n\tbind: function( types, data, fn ) {\n\t\treturn this.on( types, null, data, fn );\n\t},\n\tunbind: function( types, fn ) {\n\t\treturn this.off( types, null, fn );\n\t},\n\n\tdelegate: function( selector, types, data, fn ) {\n\t\treturn this.on( types, selector, data, fn );\n\t},\n\tundelegate: function( selector, types, fn ) {\n\t\t// ( namespace ) or ( selector, types [, fn] )\n\t\treturn arguments.length === 1 ? this.off( selector, "**" ) : this.off( types, selector || "**", fn );\n\t}\n});\n\n\nvar nonce = jQuery.now();\n\nvar rquery = (/\\?/);\n\n\n\n// Support: Android 2.3\n// Workaround failure to string-cast null input\njQuery.parseJSON = function( data ) {\n\treturn JSON.parse( data + "" );\n};\n\n\n// Cross-browser xml parsing\njQuery.parseXML = function( data ) {\n\tvar xml, tmp;\n\tif ( !data || typeof data !== "string" ) {\n\t\treturn null;\n\t}\n\n\t// Support: IE9\n\ttry {\n\t\ttmp = new DOMParser();\n\t\txml = tmp.parseFromString( data, "text/xml" );\n\t} catch ( e ) {\n\t\txml = undefined;\n\t}\n\n\tif ( !xml || xml.getElementsByTagName( "parsererror" ).length ) {\n\t\tjQuery.error( "Invalid XML: " + data );\n\t}\n\treturn xml;\n};\n\n\nvar\n\trhash = /#.*$/,\n\trts = /([?&])_=[^&]*/,\n\trheaders = /^(.*?):[ \\t]*([^\\r\\n]*)$/mg,\n\t// #7653, #8125, #8152: local protocol detection\n\trlocalProtocol = /^(?:about|app|app-storage|.+-extension|file|res|widget):$/,\n\trnoContent = /^(?:GET|HEAD)$/,\n\trprotocol = /^\\/\\//,\n\trurl = /^([\\w.+-]+:)(?:\\/\\/(?:[^\\/?#]*@|)([^\\/?#:]*)(?::(\\d+)|)|)/,\n\n\t/* Prefilters\n\t * 1) They are useful to introduce custom dataTypes (see ajax/jsonp.js for an example)\n\t * 2) These are called:\n\t *    - BEFORE asking for a transport\n\t *    - AFTER param serialization (s.data is a string if s.processData is true)\n\t * 3) key is the dataType\n\t * 4) the catchall symbol "*" can be used\n\t * 5) execution will start with transport dataType and THEN continue down to "*" if needed\n\t */\n\tprefilters = {},\n\n\t/* Transports bindings\n\t * 1) key is the dataType\n\t * 2) the catchall symbol "*" can be used\n\t * 3) selection will start with transport dataType and THEN go to "*" if needed\n\t */\n\ttransports = {},\n\n\t// Avoid comment-prolog char sequence (#10098); must appease lint and evade compression\n\tallTypes = "*/".concat( "*" ),\n\n\t// Document location\n\tajaxLocation = window.location.href,\n\n\t// Segment location into parts\n\tajaxLocParts = rurl.exec( ajaxLocation.toLowerCase() ) || [];\n\n// Base "constructor" for jQuery.ajaxPrefilter and jQuery.ajaxTransport\nfunction addToPrefiltersOrTransports( structure ) {\n\n\t// dataTypeExpression is optional and defaults to "*"\n\treturn function( dataTypeExpression, func ) {\n\n\t\tif ( typeof dataTypeExpression !== "string" ) {\n\t\t\tfunc = dataTypeExpression;\n\t\t\tdataTypeExpression = "*";\n\t\t}\n\n\t\tvar dataType,\n\t\t\ti = 0,\n\t\t\tdataTypes = dataTypeExpression.toLowerCase().match( rnotwhite ) || [];\n\n\t\tif ( jQuery.isFunction( func ) ) {\n\t\t\t// For each dataType in the dataTypeExpression\n\t\t\twhile ( (dataType = dataTypes[i++]) ) {\n\t\t\t\t// Prepend if requested\n\t\t\t\tif ( dataType[0] === "+" ) {\n\t\t\t\t\tdataType = dataType.slice( 1 ) || "*";\n\t\t\t\t\t(structure[ dataType ] = structure[ dataType ] || []).unshift( func );\n\n\t\t\t\t// Otherwise append\n\t\t\t\t} else {\n\t\t\t\t\t(structure[ dataType ] = structure[ dataType ] || []).push( func );\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t};\n}\n\n// Base inspection function for prefilters and transports\nfunction inspectPrefiltersOrTransports( structure, options, originalOptions, jqXHR ) {\n\n\tvar inspected = {},\n\t\tseekingTransport = ( structure === transports );\n\n\tfunction inspect( dataType ) {\n\t\tvar selected;\n\t\tinspected[ dataType ] = true;\n\t\tjQuery.each( structure[ dataType ] || [], function( _, prefilterOrFactory ) {\n\t\t\tvar dataTypeOrTransport = prefilterOrFactory( options, originalOptions, jqXHR );\n\t\t\tif ( typeof dataTypeOrTransport === "string" && !seekingTransport && !inspected[ dataTypeOrTransport ] ) {\n\t\t\t\toptions.dataTypes.unshift( dataTypeOrTransport );\n\t\t\t\tinspect( dataTypeOrTransport );\n\t\t\t\treturn false;\n\t\t\t} else if ( seekingTransport ) {\n\t\t\t\treturn !( selected = dataTypeOrTransport );\n\t\t\t}\n\t\t});\n\t\treturn selected;\n\t}\n\n\treturn inspect( options.dataTypes[ 0 ] ) || !inspected[ "*" ] && inspect( "*" );\n}\n\n// A special extend for ajax options\n// that takes "flat" options (not to be deep extended)\n// Fixes #9887\nfunction ajaxExtend( target, src ) {\n\tvar key, deep,\n\t\tflatOptions = jQuery.ajaxSettings.flatOptions || {};\n\n\tfor ( key in src ) {\n\t\tif ( src[ key ] !== undefined ) {\n\t\t\t( flatOptions[ key ] ? target : ( deep || (deep = {}) ) )[ key ] = src[ key ];\n\t\t}\n\t}\n\tif ( deep ) {\n\t\tjQuery.extend( true, target, deep );\n\t}\n\n\treturn target;\n}\n\n/* Handles responses to an ajax request:\n * - finds the right dataType (mediates between content-type and expected dataType)\n * - returns the corresponding response\n */\nfunction ajaxHandleResponses( s, jqXHR, responses ) {\n\n\tvar ct, type, finalDataType, firstDataType,\n\t\tcontents = s.contents,\n\t\tdataTypes = s.dataTypes;\n\n\t// Remove auto dataType and get content-type in the process\n\twhile ( dataTypes[ 0 ] === "*" ) {\n\t\tdataTypes.shift();\n\t\tif ( ct === undefined ) {\n\t\t\tct = s.mimeType || jqXHR.getResponseHeader("Content-Type");\n\t\t}\n\t}\n\n\t// Check if we\'re dealing with a known content-type\n\tif ( ct ) {\n\t\tfor ( type in contents ) {\n\t\t\tif ( contents[ type ] && contents[ type ].test( ct ) ) {\n\t\t\t\tdataTypes.unshift( type );\n\t\t\t\tbreak;\n\t\t\t}\n\t\t}\n\t}\n\n\t// Check to see if we have a response for the expected dataType\n\tif ( dataTypes[ 0 ] in responses ) {\n\t\tfinalDataType = dataTypes[ 0 ];\n\t} else {\n\t\t// Try convertible dataTypes\n\t\tfor ( type in responses ) {\n\t\t\tif ( !dataTypes[ 0 ] || s.converters[ type + " " + dataTypes[0] ] ) {\n\t\t\t\tfinalDataType = type;\n\t\t\t\tbreak;\n\t\t\t}\n\t\t\tif ( !firstDataType ) {\n\t\t\t\tfirstDataType = type;\n\t\t\t}\n\t\t}\n\t\t// Or just use first one\n\t\tfinalDataType = finalDataType || firstDataType;\n\t}\n\n\t// If we found a dataType\n\t// We add the dataType to the list if needed\n\t// and return the corresponding response\n\tif ( finalDataType ) {\n\t\tif ( finalDataType !== dataTypes[ 0 ] ) {\n\t\t\tdataTypes.unshift( finalDataType );\n\t\t}\n\t\treturn responses[ finalDataType ];\n\t}\n}\n\n/* Chain conversions given the request and the original response\n * Also sets the responseXXX fields on the jqXHR instance\n */\nfunction ajaxConvert( s, response, jqXHR, isSuccess ) {\n\tvar conv2, current, conv, tmp, prev,\n\t\tconverters = {},\n\t\t// Work with a copy of dataTypes in case we need to modify it for conversion\n\t\tdataTypes = s.dataTypes.slice();\n\n\t// Create converters map with lowercased keys\n\tif ( dataTypes[ 1 ] ) {\n\t\tfor ( conv in s.converters ) {\n\t\t\tconverters[ conv.toLowerCase() ] = s.converters[ conv ];\n\t\t}\n\t}\n\n\tcurrent = dataTypes.shift();\n\n\t// Convert to each sequential dataType\n\twhile ( current ) {\n\n\t\tif ( s.responseFields[ current ] ) {\n\t\t\tjqXHR[ s.responseFields[ current ] ] = response;\n\t\t}\n\n\t\t// Apply the dataFilter if provided\n\t\tif ( !prev && isSuccess && s.dataFilter ) {\n\t\t\tresponse = s.dataFilter( response, s.dataType );\n\t\t}\n\n\t\tprev = current;\n\t\tcurrent = dataTypes.shift();\n\n\t\tif ( current ) {\n\n\t\t// There\'s only work to do if current dataType is non-auto\n\t\t\tif ( current === "*" ) {\n\n\t\t\t\tcurrent = prev;\n\n\t\t\t// Convert response if prev dataType is non-auto and differs from current\n\t\t\t} else if ( prev !== "*" && prev !== current ) {\n\n\t\t\t\t// Seek a direct converter\n\t\t\t\tconv = converters[ prev + " " + current ] || converters[ "* " + current ];\n\n\t\t\t\t// If none found, seek a pair\n\t\t\t\tif ( !conv ) {\n\t\t\t\t\tfor ( conv2 in converters ) {\n\n\t\t\t\t\t\t// If conv2 outputs current\n\t\t\t\t\t\ttmp = conv2.split( " " );\n\t\t\t\t\t\tif ( tmp[ 1 ] === current ) {\n\n\t\t\t\t\t\t\t// If prev can be converted to accepted input\n\t\t\t\t\t\t\tconv = converters[ prev + " " + tmp[ 0 ] ] ||\n\t\t\t\t\t\t\t\tconverters[ "* " + tmp[ 0 ] ];\n\t\t\t\t\t\t\tif ( conv ) {\n\t\t\t\t\t\t\t\t// Condense equivalence converters\n\t\t\t\t\t\t\t\tif ( conv === true ) {\n\t\t\t\t\t\t\t\t\tconv = converters[ conv2 ];\n\n\t\t\t\t\t\t\t\t// Otherwise, insert the intermediate dataType\n\t\t\t\t\t\t\t\t} else if ( converters[ conv2 ] !== true ) {\n\t\t\t\t\t\t\t\t\tcurrent = tmp[ 0 ];\n\t\t\t\t\t\t\t\t\tdataTypes.unshift( tmp[ 1 ] );\n\t\t\t\t\t\t\t\t}\n\t\t\t\t\t\t\t\tbreak;\n\t\t\t\t\t\t\t}\n\t\t\t\t\t\t}\n\t\t\t\t\t}\n\t\t\t\t}\n\n\t\t\t\t// Apply converter (if not an equivalence)\n\t\t\t\tif ( conv !== true ) {\n\n\t\t\t\t\t// Unless errors are allowed to bubble, catch and return them\n\t\t\t\t\tif ( conv && s[ "throws" ] ) {\n\t\t\t\t\t\tresponse = conv( response );\n\t\t\t\t\t} else {\n\t\t\t\t\t\ttry {\n\t\t\t\t\t\t\tresponse = conv( response );\n\t\t\t\t\t\t} catch ( e ) {\n\t\t\t\t\t\t\treturn { state: "parsererror", error: conv ? e : "No conversion from " + prev + " to " + current };\n\t\t\t\t\t\t}\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n\n\treturn { state: "success", data: response };\n}\n\njQuery.extend({\n\n\t// Counter for holding the number of active queries\n\tactive: 0,\n\n\t// Last-Modified header cache for next request\n\tlastModified: {},\n\tetag: {},\n\n\tajaxSettings: {\n\t\turl: ajaxLocation,\n\t\ttype: "GET",\n\t\tisLocal: rlocalProtocol.test( ajaxLocParts[ 1 ] ),\n\t\tglobal: true,\n\t\tprocessData: true,\n\t\tasync: true,\n\t\tcontentType: "application/x-www-form-urlencoded; charset=UTF-8",\n\t\t/*\n\t\ttimeout: 0,\n\t\tdata: null,\n\t\tdataType: null,\n\t\tusername: null,\n\t\tpassword: null,\n\t\tcache: null,\n\t\tthrows: false,\n\t\ttraditional: false,\n\t\theaders: {},\n\t\t*/\n\n\t\taccepts: {\n\t\t\t"*": allTypes,\n\t\t\ttext: "text/plain",\n\t\t\thtml: "text/html",\n\t\t\txml: "application/xml, text/xml",\n\t\t\tjson: "application/json, text/javascript"\n\t\t},\n\n\t\tcontents: {\n\t\t\txml: /xml/,\n\t\t\thtml: /html/,\n\t\t\tjson: /json/\n\t\t},\n\n\t\tresponseFields: {\n\t\t\txml: "responseXML",\n\t\t\ttext: "responseText",\n\t\t\tjson: "responseJSON"\n\t\t},\n\n\t\t// Data converters\n\t\t// Keys separate source (or catchall "*") and destination types with a single space\n\t\tconverters: {\n\n\t\t\t// Convert anything to text\n\t\t\t"* text": String,\n\n\t\t\t// Text to html (true = no transformation)\n\t\t\t"text html": true,\n\n\t\t\t// Evaluate text as a json expression\n\t\t\t"text json": jQuery.parseJSON,\n\n\t\t\t// Parse text as xml\n\t\t\t"text xml": jQuery.parseXML\n\t\t},\n\n\t\t// For options that shouldn\'t be deep extended:\n\t\t// you can add your own custom options here if\n\t\t// and when you create one that shouldn\'t be\n\t\t// deep extended (see ajaxExtend)\n\t\tflatOptions: {\n\t\t\turl: true,\n\t\t\tcontext: true\n\t\t}\n\t},\n\n\t// Creates a full fledged settings object into target\n\t// with both ajaxSettings and settings fields.\n\t// If target is omitted, writes into ajaxSettings.\n\tajaxSetup: function( target, settings ) {\n\t\treturn settings ?\n\n\t\t\t// Building a settings object\n\t\t\tajaxExtend( ajaxExtend( target, jQuery.ajaxSettings ), settings ) :\n\n\t\t\t// Extending ajaxSettings\n\t\t\tajaxExtend( jQuery.ajaxSettings, target );\n\t},\n\n\tajaxPrefilter: addToPrefiltersOrTransports( prefilters ),\n\tajaxTransport: addToPrefiltersOrTransports( transports ),\n\n\t// Main method\n\tajax: function( url, options ) {\n\n\t\t// If url is an object, simulate pre-1.5 signature\n\t\tif ( typeof url === "object" ) {\n\t\t\toptions = url;\n\t\t\turl = undefined;\n\t\t}\n\n\t\t// Force options to be an object\n\t\toptions = options || {};\n\n\t\tvar transport,\n\t\t\t// URL without anti-cache param\n\t\t\tcacheURL,\n\t\t\t// Response headers\n\t\t\tresponseHeadersString,\n\t\t\tresponseHeaders,\n\t\t\t// timeout handle\n\t\t\ttimeoutTimer,\n\t\t\t// Cross-domain detection vars\n\t\t\tparts,\n\t\t\t// To know if global events are to be dispatched\n\t\t\tfireGlobals,\n\t\t\t// Loop variable\n\t\t\ti,\n\t\t\t// Create the final options object\n\t\t\ts = jQuery.ajaxSetup( {}, options ),\n\t\t\t// Callbacks context\n\t\t\tcallbackContext = s.context || s,\n\t\t\t// Context for global events is callbackContext if it is a DOM node or jQuery collection\n\t\t\tglobalEventContext = s.context && ( callbackContext.nodeType || callbackContext.jquery ) ?\n\t\t\t\tjQuery( callbackContext ) :\n\t\t\t\tjQuery.event,\n\t\t\t// Deferreds\n\t\t\tdeferred = jQuery.Deferred(),\n\t\t\tcompleteDeferred = jQuery.Callbacks("once memory"),\n\t\t\t// Status-dependent callbacks\n\t\t\tstatusCode = s.statusCode || {},\n\t\t\t// Headers (they are sent all at once)\n\t\t\trequestHeaders = {},\n\t\t\trequestHeadersNames = {},\n\t\t\t// The jqXHR state\n\t\t\tstate = 0,\n\t\t\t// Default abort message\n\t\t\tstrAbort = "canceled",\n\t\t\t// Fake xhr\n\t\t\tjqXHR = {\n\t\t\t\treadyState: 0,\n\n\t\t\t\t// Builds headers hashtable if needed\n\t\t\t\tgetResponseHeader: function( key ) {\n\t\t\t\t\tvar match;\n\t\t\t\t\tif ( state === 2 ) {\n\t\t\t\t\t\tif ( !responseHeaders ) {\n\t\t\t\t\t\t\tresponseHeaders = {};\n\t\t\t\t\t\t\twhile ( (match = rheaders.exec( responseHeadersString )) ) {\n\t\t\t\t\t\t\t\tresponseHeaders[ match[1].toLowerCase() ] = match[ 2 ];\n\t\t\t\t\t\t\t}\n\t\t\t\t\t\t}\n\t\t\t\t\t\tmatch = responseHeaders[ key.toLowerCase() ];\n\t\t\t\t\t}\n\t\t\t\t\treturn match == null ? null : match;\n\t\t\t\t},\n\n\t\t\t\t// Raw string\n\t\t\t\tgetAllResponseHeaders: function() {\n\t\t\t\t\treturn state === 2 ? responseHeadersString : null;\n\t\t\t\t},\n\n\t\t\t\t// Caches the header\n\t\t\t\tsetRequestHeader: function( name, value ) {\n\t\t\t\t\tvar lname = name.toLowerCase();\n\t\t\t\t\tif ( !state ) {\n\t\t\t\t\t\tname = requestHeadersNames[ lname ] = requestHeadersNames[ lname ] || name;\n\t\t\t\t\t\trequestHeaders[ name ] = value;\n\t\t\t\t\t}\n\t\t\t\t\treturn this;\n\t\t\t\t},\n\n\t\t\t\t// Overrides response content-type header\n\t\t\t\toverrideMimeType: function( type ) {\n\t\t\t\t\tif ( !state ) {\n\t\t\t\t\t\ts.mimeType = type;\n\t\t\t\t\t}\n\t\t\t\t\treturn this;\n\t\t\t\t},\n\n\t\t\t\t// Status-dependent callbacks\n\t\t\t\tstatusCode: function( map ) {\n\t\t\t\t\tvar code;\n\t\t\t\t\tif ( map ) {\n\t\t\t\t\t\tif ( state < 2 ) {\n\t\t\t\t\t\t\tfor ( code in map ) {\n\t\t\t\t\t\t\t\t// Lazy-add the new callback in a way that preserves old ones\n\t\t\t\t\t\t\t\tstatusCode[ code ] = [ statusCode[ code ], map[ code ] ];\n\t\t\t\t\t\t\t}\n\t\t\t\t\t\t} else {\n\t\t\t\t\t\t\t// Execute the appropriate callbacks\n\t\t\t\t\t\t\tjqXHR.always( map[ jqXHR.status ] );\n\t\t\t\t\t\t}\n\t\t\t\t\t}\n\t\t\t\t\treturn this;\n\t\t\t\t},\n\n\t\t\t\t// Cancel the request\n\t\t\t\tabort: function( statusText ) {\n\t\t\t\t\tvar finalText = statusText || strAbort;\n\t\t\t\t\tif ( transport ) {\n\t\t\t\t\t\ttransport.abort( finalText );\n\t\t\t\t\t}\n\t\t\t\t\tdone( 0, finalText );\n\t\t\t\t\treturn this;\n\t\t\t\t}\n\t\t\t};\n\n\t\t// Attach deferreds\n\t\tdeferred.promise( jqXHR ).complete = completeDeferred.add;\n\t\tjqXHR.success = jqXHR.done;\n\t\tjqXHR.error = jqXHR.fail;\n\n\t\t// Remove hash character (#7531: and string promotion)\n\t\t// Add protocol if not provided (prefilters might expect it)\n\t\t// Handle falsy url in the settings object (#10093: consistency with old signature)\n\t\t// We also use the url parameter if available\n\t\ts.url = ( ( url || s.url || ajaxLocation ) + "" ).replace( rhash, "" )\n\t\t\t.replace( rprotocol, ajaxLocParts[ 1 ] + "//" );\n\n\t\t// Alias method option to type as per ticket #12004\n\t\ts.type = options.method || options.type || s.method || s.type;\n\n\t\t// Extract dataTypes list\n\t\ts.dataTypes = jQuery.trim( s.dataType || "*" ).toLowerCase().match( rnotwhite ) || [ "" ];\n\n\t\t// A cross-domain request is in order when we have a protocol:host:port mismatch\n\t\tif ( s.crossDomain == null ) {\n\t\t\tparts = rurl.exec( s.url.toLowerCase() );\n\t\t\ts.crossDomain = !!( parts &&\n\t\t\t\t( parts[ 1 ] !== ajaxLocParts[ 1 ] || parts[ 2 ] !== ajaxLocParts[ 2 ] ||\n\t\t\t\t\t( parts[ 3 ] || ( parts[ 1 ] === "http:" ? "80" : "443" ) ) !==\n\t\t\t\t\t\t( ajaxLocParts[ 3 ] || ( ajaxLocParts[ 1 ] === "http:" ? "80" : "443" ) ) )\n\t\t\t);\n\t\t}\n\n\t\t// Convert data if not already a string\n\t\tif ( s.data && s.processData && typeof s.data !== "string" ) {\n\t\t\ts.data = jQuery.param( s.data, s.traditional );\n\t\t}\n\n\t\t// Apply prefilters\n\t\tinspectPrefiltersOrTransports( prefilters, s, options, jqXHR );\n\n\t\t// If request was aborted inside a prefilter, stop there\n\t\tif ( state === 2 ) {\n\t\t\treturn jqXHR;\n\t\t}\n\n\t\t// We can fire global events as of now if asked to\n\t\t// Don\'t fire events if jQuery.event is undefined in an AMD-usage scenario (#15118)\n\t\tfireGlobals = jQuery.event && s.global;\n\n\t\t// Watch for a new set of requests\n\t\tif ( fireGlobals && jQuery.active++ === 0 ) {\n\t\t\tjQuery.event.trigger("ajaxStart");\n\t\t}\n\n\t\t// Uppercase the type\n\t\ts.type = s.type.toUpperCase();\n\n\t\t// Determine if request has content\n\t\ts.hasContent = !rnoContent.test( s.type );\n\n\t\t// Save the URL in case we\'re toying with the If-Modified-Since\n\t\t// and/or If-None-Match header later on\n\t\tcacheURL = s.url;\n\n\t\t// More options handling for requests with no content\n\t\tif ( !s.hasContent ) {\n\n\t\t\t// If data is available, append data to url\n\t\t\tif ( s.data ) {\n\t\t\t\tcacheURL = ( s.url += ( rquery.test( cacheURL ) ? "&" : "?" ) + s.data );\n\t\t\t\t// #9682: remove data so that it\'s not used in an eventual retry\n\t\t\t\tdelete s.data;\n\t\t\t}\n\n\t\t\t// Add anti-cache in url if needed\n\t\t\tif ( s.cache === false ) {\n\t\t\t\ts.url = rts.test( cacheURL ) ?\n\n\t\t\t\t\t// If there is already a \'_\' parameter, set its value\n\t\t\t\t\tcacheURL.replace( rts, "$1_=" + nonce++ ) :\n\n\t\t\t\t\t// Otherwise add one to the end\n\t\t\t\t\tcacheURL + ( rquery.test( cacheURL ) ? "&" : "?" ) + "_=" + nonce++;\n\t\t\t}\n\t\t}\n\n\t\t// Set the If-Modified-Since and/or If-None-Match header, if in ifModified mode.\n\t\tif ( s.ifModified ) {\n\t\t\tif ( jQuery.lastModified[ cacheURL ] ) {\n\t\t\t\tjqXHR.setRequestHeader( "If-Modified-Since", jQuery.lastModified[ cacheURL ] );\n\t\t\t}\n\t\t\tif ( jQuery.etag[ cacheURL ] ) {\n\t\t\t\tjqXHR.setRequestHeader( "If-None-Match", jQuery.etag[ cacheURL ] );\n\t\t\t}\n\t\t}\n\n\t\t// Set the correct header, if data is being sent\n\t\tif ( s.data && s.hasContent && s.contentType !== false || options.contentType ) {\n\t\t\tjqXHR.setRequestHeader( "Content-Type", s.contentType );\n\t\t}\n\n\t\t// Set the Accepts header for the server, depending on the dataType\n\t\tjqXHR.setRequestHeader(\n\t\t\t"Accept",\n\t\t\ts.dataTypes[ 0 ] && s.accepts[ s.dataTypes[0] ] ?\n\t\t\t\ts.accepts[ s.dataTypes[0] ] + ( s.dataTypes[ 0 ] !== "*" ? ", " + allTypes + "; q=0.01" : "" ) :\n\t\t\t\ts.accepts[ "*" ]\n\t\t);\n\n\t\t// Check for headers option\n\t\tfor ( i in s.headers ) {\n\t\t\tjqXHR.setRequestHeader( i, s.headers[ i ] );\n\t\t}\n\n\t\t// Allow custom headers/mimetypes and early abort\n\t\tif ( s.beforeSend && ( s.beforeSend.call( callbackContext, jqXHR, s ) === false || state === 2 ) ) {\n\t\t\t// Abort if not done already and return\n\t\t\treturn jqXHR.abort();\n\t\t}\n\n\t\t// Aborting is no longer a cancellation\n\t\tstrAbort = "abort";\n\n\t\t// Install callbacks on deferreds\n\t\tfor ( i in { success: 1, error: 1, complete: 1 } ) {\n\t\t\tjqXHR[ i ]( s[ i ] );\n\t\t}\n\n\t\t// Get transport\n\t\ttransport = inspectPrefiltersOrTransports( transports, s, options, jqXHR );\n\n\t\t// If no transport, we auto-abort\n\t\tif ( !transport ) {\n\t\t\tdone( -1, "No Transport" );\n\t\t} else {\n\t\t\tjqXHR.readyState = 1;\n\n\t\t\t// Send global event\n\t\t\tif ( fireGlobals ) {\n\t\t\t\tglobalEventContext.trigger( "ajaxSend", [ jqXHR, s ] );\n\t\t\t}\n\t\t\t// Timeout\n\t\t\tif ( s.async && s.timeout > 0 ) {\n\t\t\t\ttimeoutTimer = setTimeout(function() {\n\t\t\t\t\tjqXHR.abort("timeout");\n\t\t\t\t}, s.timeout );\n\t\t\t}\n\n\t\t\ttry {\n\t\t\t\tstate = 1;\n\t\t\t\ttransport.send( requestHeaders, done );\n\t\t\t} catch ( e ) {\n\t\t\t\t// Propagate exception as error if not done\n\t\t\t\tif ( state < 2 ) {\n\t\t\t\t\tdone( -1, e );\n\t\t\t\t// Simply rethrow otherwise\n\t\t\t\t} else {\n\t\t\t\t\tthrow e;\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\n\t\t// Callback for when everything is done\n\t\tfunction done( status, nativeStatusText, responses, headers ) {\n\t\t\tvar isSuccess, success, error, response, modified,\n\t\t\t\tstatusText = nativeStatusText;\n\n\t\t\t// Called once\n\t\t\tif ( state === 2 ) {\n\t\t\t\treturn;\n\t\t\t}\n\n\t\t\t// State is "done" now\n\t\t\tstate = 2;\n\n\t\t\t// Clear timeout if it exists\n\t\t\tif ( timeoutTimer ) {\n\t\t\t\tclearTimeout( timeoutTimer );\n\t\t\t}\n\n\t\t\t// Dereference transport for early garbage collection\n\t\t\t// (no matter how long the jqXHR object will be used)\n\t\t\ttransport = undefined;\n\n\t\t\t// Cache response headers\n\t\t\tresponseHeadersString = headers || "";\n\n\t\t\t// Set readyState\n\t\t\tjqXHR.readyState = status > 0 ? 4 : 0;\n\n\t\t\t// Determine if successful\n\t\t\tisSuccess = status >= 200 && status < 300 || status === 304;\n\n\t\t\t// Get response data\n\t\t\tif ( responses ) {\n\t\t\t\tresponse = ajaxHandleResponses( s, jqXHR, responses );\n\t\t\t}\n\n\t\t\t// Convert no matter what (that way responseXXX fields are always set)\n\t\t\tresponse = ajaxConvert( s, response, jqXHR, isSuccess );\n\n\t\t\t// If successful, handle type chaining\n\t\t\tif ( isSuccess ) {\n\n\t\t\t\t// Set the If-Modified-Since and/or If-None-Match header, if in ifModified mode.\n\t\t\t\tif ( s.ifModified ) {\n\t\t\t\t\tmodified = jqXHR.getResponseHeader("Last-Modified");\n\t\t\t\t\tif ( modified ) {\n\t\t\t\t\t\tjQuery.lastModified[ cacheURL ] = modified;\n\t\t\t\t\t}\n\t\t\t\t\tmodified = jqXHR.getResponseHeader("etag");\n\t\t\t\t\tif ( modified ) {\n\t\t\t\t\t\tjQuery.etag[ cacheURL ] = modified;\n\t\t\t\t\t}\n\t\t\t\t}\n\n\t\t\t\t// if no content\n\t\t\t\tif ( status === 204 || s.type === "HEAD" ) {\n\t\t\t\t\tstatusText = "nocontent";\n\n\t\t\t\t// if not modified\n\t\t\t\t} else if ( status === 304 ) {\n\t\t\t\t\tstatusText = "notmodified";\n\n\t\t\t\t// If we have data, let\'s convert it\n\t\t\t\t} else {\n\t\t\t\t\tstatusText = response.state;\n\t\t\t\t\tsuccess = response.data;\n\t\t\t\t\terror = response.error;\n\t\t\t\t\tisSuccess = !error;\n\t\t\t\t}\n\t\t\t} else {\n\t\t\t\t// Extract error from statusText and normalize for non-aborts\n\t\t\t\terror = statusText;\n\t\t\t\tif ( status || !statusText ) {\n\t\t\t\t\tstatusText = "error";\n\t\t\t\t\tif ( status < 0 ) {\n\t\t\t\t\t\tstatus = 0;\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t}\n\n\t\t\t// Set data for the fake xhr object\n\t\t\tjqXHR.status = status;\n\t\t\tjqXHR.statusText = ( nativeStatusText || statusText ) + "";\n\n\t\t\t// Success/Error\n\t\t\tif ( isSuccess ) {\n\t\t\t\tdeferred.resolveWith( callbackContext, [ success, statusText, jqXHR ] );\n\t\t\t} else {\n\t\t\t\tdeferred.rejectWith( callbackContext, [ jqXHR, statusText, error ] );\n\t\t\t}\n\n\t\t\t// Status-dependent callbacks\n\t\t\tjqXHR.statusCode( statusCode );\n\t\t\tstatusCode = undefined;\n\n\t\t\tif ( fireGlobals ) {\n\t\t\t\tglobalEventContext.trigger( isSuccess ? "ajaxSuccess" : "ajaxError",\n\t\t\t\t\t[ jqXHR, s, isSuccess ? success : error ] );\n\t\t\t}\n\n\t\t\t// Complete\n\t\t\tcompleteDeferred.fireWith( callbackContext, [ jqXHR, statusText ] );\n\n\t\t\tif ( fireGlobals ) {\n\t\t\t\tglobalEventContext.trigger( "ajaxComplete", [ jqXHR, s ] );\n\t\t\t\t// Handle the global AJAX counter\n\t\t\t\tif ( !( --jQuery.active ) ) {\n\t\t\t\t\tjQuery.event.trigger("ajaxStop");\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\n\t\treturn jqXHR;\n\t},\n\n\tgetJSON: function( url, data, callback ) {\n\t\treturn jQuery.get( url, data, callback, "json" );\n\t},\n\n\tgetScript: function( url, callback ) {\n\t\treturn jQuery.get( url, undefined, callback, "script" );\n\t}\n});\n\njQuery.each( [ "get", "post" ], function( i, method ) {\n\tjQuery[ method ] = function( url, data, callback, type ) {\n\t\t// Shift arguments if data argument was omitted\n\t\tif ( jQuery.isFunction( data ) ) {\n\t\t\ttype = type || callback;\n\t\t\tcallback = data;\n\t\t\tdata = undefined;\n\t\t}\n\n\t\treturn jQuery.ajax({\n\t\t\turl: url,\n\t\t\ttype: method,\n\t\t\tdataType: type,\n\t\t\tdata: data,\n\t\t\tsuccess: callback\n\t\t});\n\t};\n});\n\n\njQuery._evalUrl = function( url ) {\n\treturn jQuery.ajax({\n\t\turl: url,\n\t\ttype: "GET",\n\t\tdataType: "script",\n\t\tasync: false,\n\t\tglobal: false,\n\t\t"throws": true\n\t});\n};\n\n\njQuery.fn.extend({\n\twrapAll: function( html ) {\n\t\tvar wrap;\n\n\t\tif ( jQuery.isFunction( html ) ) {\n\t\t\treturn this.each(function( i ) {\n\t\t\t\tjQuery( this ).wrapAll( html.call(this, i) );\n\t\t\t});\n\t\t}\n\n\t\tif ( this[ 0 ] ) {\n\n\t\t\t// The elements to wrap the target around\n\t\t\twrap = jQuery( html, this[ 0 ].ownerDocument ).eq( 0 ).clone( true );\n\n\t\t\tif ( this[ 0 ].parentNode ) {\n\t\t\t\twrap.insertBefore( this[ 0 ] );\n\t\t\t}\n\n\t\t\twrap.map(function() {\n\t\t\t\tvar elem = this;\n\n\t\t\t\twhile ( elem.firstElementChild ) {\n\t\t\t\t\telem = elem.firstElementChild;\n\t\t\t\t}\n\n\t\t\t\treturn elem;\n\t\t\t}).append( this );\n\t\t}\n\n\t\treturn this;\n\t},\n\n\twrapInner: function( html ) {\n\t\tif ( jQuery.isFunction( html ) ) {\n\t\t\treturn this.each(function( i ) {\n\t\t\t\tjQuery( this ).wrapInner( html.call(this, i) );\n\t\t\t});\n\t\t}\n\n\t\treturn this.each(function() {\n\t\t\tvar self = jQuery( this ),\n\t\t\t\tcontents = self.contents();\n\n\t\t\tif ( contents.length ) {\n\t\t\t\tcontents.wrapAll( html );\n\n\t\t\t} else {\n\t\t\t\tself.append( html );\n\t\t\t}\n\t\t});\n\t},\n\n\twrap: function( html ) {\n\t\tvar isFunction = jQuery.isFunction( html );\n\n\t\treturn this.each(function( i ) {\n\t\t\tjQuery( this ).wrapAll( isFunction ? html.call(this, i) : html );\n\t\t});\n\t},\n\n\tunwrap: function() {\n\t\treturn this.parent().each(function() {\n\t\t\tif ( !jQuery.nodeName( this, "body" ) ) {\n\t\t\t\tjQuery( this ).replaceWith( this.childNodes );\n\t\t\t}\n\t\t}).end();\n\t}\n});\n\n\njQuery.expr.filters.hidden = function( elem ) {\n\t// Support: Opera <= 12.12\n\t// Opera reports offsetWidths and offsetHeights less than zero on some elements\n\treturn elem.offsetWidth <= 0 && elem.offsetHeight <= 0;\n};\njQuery.expr.filters.visible = function( elem ) {\n\treturn !jQuery.expr.filters.hidden( elem );\n};\n\n\n\n\nvar r20 = /%20/g,\n\trbracket = /\\[\\]$/,\n\trCRLF = /\\r?\\n/g,\n\trsubmitterTypes = /^(?:submit|button|image|reset|file)$/i,\n\trsubmittable = /^(?:input|select|textarea|keygen)/i;\n\nfunction buildParams( prefix, obj, traditional, add ) {\n\tvar name;\n\n\tif ( jQuery.isArray( obj ) ) {\n\t\t// Serialize array item.\n\t\tjQuery.each( obj, function( i, v ) {\n\t\t\tif ( traditional || rbracket.test( prefix ) ) {\n\t\t\t\t// Treat each array item as a scalar.\n\t\t\t\tadd( prefix, v );\n\n\t\t\t} else {\n\t\t\t\t// Item is non-scalar (array or object), encode its numeric index.\n\t\t\t\tbuildParams( prefix + "[" + ( typeof v === "object" ? i : "" ) + "]", v, traditional, add );\n\t\t\t}\n\t\t});\n\n\t} else if ( !traditional && jQuery.type( obj ) === "object" ) {\n\t\t// Serialize object item.\n\t\tfor ( name in obj ) {\n\t\t\tbuildParams( prefix + "[" + name + "]", obj[ name ], traditional, add );\n\t\t}\n\n\t} else {\n\t\t// Serialize scalar item.\n\t\tadd( prefix, obj );\n\t}\n}\n\n// Serialize an array of form elements or a set of\n// key/values into a query string\njQuery.param = function( a, traditional ) {\n\tvar prefix,\n\t\ts = [],\n\t\tadd = function( key, value ) {\n\t\t\t// If value is a function, invoke it and return its value\n\t\t\tvalue = jQuery.isFunction( value ) ? value() : ( value == null ? "" : value );\n\t\t\ts[ s.length ] = encodeURIComponent( key ) + "=" + encodeURIComponent( value );\n\t\t};\n\n\t// Set traditional to true for jQuery <= 1.3.2 behavior.\n\tif ( traditional === undefined ) {\n\t\ttraditional = jQuery.ajaxSettings && jQuery.ajaxSettings.traditional;\n\t}\n\n\t// If an array was passed in, assume that it is an array of form elements.\n\tif ( jQuery.isArray( a ) || ( a.jquery && !jQuery.isPlainObject( a ) ) ) {\n\t\t// Serialize the form elements\n\t\tjQuery.each( a, function() {\n\t\t\tadd( this.name, this.value );\n\t\t});\n\n\t} else {\n\t\t// If traditional, encode the "old" way (the way 1.3.2 or older\n\t\t// did it), otherwise encode params recursively.\n\t\tfor ( prefix in a ) {\n\t\t\tbuildParams( prefix, a[ prefix ], traditional, add );\n\t\t}\n\t}\n\n\t// Return the resulting serialization\n\treturn s.join( "&" ).replace( r20, "+" );\n};\n\njQuery.fn.extend({\n\tserialize: function() {\n\t\treturn jQuery.param( this.serializeArray() );\n\t},\n\tserializeArray: function() {\n\t\treturn this.map(function() {\n\t\t\t// Can add propHook for "elements" to filter or add form elements\n\t\t\tvar elements = jQuery.prop( this, "elements" );\n\t\t\treturn elements ? jQuery.makeArray( elements ) : this;\n\t\t})\n\t\t.filter(function() {\n\t\t\tvar type = this.type;\n\n\t\t\t// Use .is( ":disabled" ) so that fieldset[disabled] works\n\t\t\treturn this.name && !jQuery( this ).is( ":disabled" ) &&\n\t\t\t\trsubmittable.test( this.nodeName ) && !rsubmitterTypes.test( type ) &&\n\t\t\t\t( this.checked || !rcheckableType.test( type ) );\n\t\t})\n\t\t.map(function( i, elem ) {\n\t\t\tvar val = jQuery( this ).val();\n\n\t\t\treturn val == null ?\n\t\t\t\tnull :\n\t\t\t\tjQuery.isArray( val ) ?\n\t\t\t\t\tjQuery.map( val, function( val ) {\n\t\t\t\t\t\treturn { name: elem.name, value: val.replace( rCRLF, "\\r\\n" ) };\n\t\t\t\t\t}) :\n\t\t\t\t\t{ name: elem.name, value: val.replace( rCRLF, "\\r\\n" ) };\n\t\t}).get();\n\t}\n});\n\n\njQuery.ajaxSettings.xhr = function() {\n\ttry {\n\t\treturn new XMLHttpRequest();\n\t} catch( e ) {}\n};\n\nvar xhrId = 0,\n\txhrCallbacks = {},\n\txhrSuccessStatus = {\n\t\t// file protocol always yields status code 0, assume 200\n\t\t0: 200,\n\t\t// Support: IE9\n\t\t// #1450: sometimes IE returns 1223 when it should be 204\n\t\t1223: 204\n\t},\n\txhrSupported = jQuery.ajaxSettings.xhr();\n\n// Support: IE9\n// Open requests must be manually aborted on unload (#5280)\n// See https://support.microsoft.com/kb/2856746 for more info\nif ( window.attachEvent ) {\n\twindow.attachEvent( "onunload", function() {\n\t\tfor ( var key in xhrCallbacks ) {\n\t\t\txhrCallbacks[ key ]();\n\t\t}\n\t});\n}\n\nsupport.cors = !!xhrSupported && ( "withCredentials" in xhrSupported );\nsupport.ajax = xhrSupported = !!xhrSupported;\n\njQuery.ajaxTransport(function( options ) {\n\tvar callback;\n\n\t// Cross domain only allowed if supported through XMLHttpRequest\n\tif ( support.cors || xhrSupported && !options.crossDomain ) {\n\t\treturn {\n\t\t\tsend: function( headers, complete ) {\n\t\t\t\tvar i,\n\t\t\t\t\txhr = options.xhr(),\n\t\t\t\t\tid = ++xhrId;\n\n\t\t\t\txhr.open( options.type, options.url, options.async, options.username, options.password );\n\n\t\t\t\t// Apply custom fields if provided\n\t\t\t\tif ( options.xhrFields ) {\n\t\t\t\t\tfor ( i in options.xhrFields ) {\n\t\t\t\t\t\txhr[ i ] = options.xhrFields[ i ];\n\t\t\t\t\t}\n\t\t\t\t}\n\n\t\t\t\t// Override mime type if needed\n\t\t\t\tif ( options.mimeType && xhr.overrideMimeType ) {\n\t\t\t\t\txhr.overrideMimeType( options.mimeType );\n\t\t\t\t}\n\n\t\t\t\t// X-Requested-With header\n\t\t\t\t// For cross-domain requests, seeing as conditions for a preflight are\n\t\t\t\t// akin to a jigsaw puzzle, we simply never set it to be sure.\n\t\t\t\t// (it can always be set on a per-request basis or even using ajaxSetup)\n\t\t\t\t// For same-domain requests, won\'t change header if already provided.\n\t\t\t\tif ( !options.crossDomain && !headers["X-Requested-With"] ) {\n\t\t\t\t\theaders["X-Requested-With"] = "XMLHttpRequest";\n\t\t\t\t}\n\n\t\t\t\t// Set headers\n\t\t\t\tfor ( i in headers ) {\n\t\t\t\t\txhr.setRequestHeader( i, headers[ i ] );\n\t\t\t\t}\n\n\t\t\t\t// Callback\n\t\t\t\tcallback = function( type ) {\n\t\t\t\t\treturn function() {\n\t\t\t\t\t\tif ( callback ) {\n\t\t\t\t\t\t\tdelete xhrCallbacks[ id ];\n\t\t\t\t\t\t\tcallback = xhr.onload = xhr.onerror = null;\n\n\t\t\t\t\t\t\tif ( type === "abort" ) {\n\t\t\t\t\t\t\t\txhr.abort();\n\t\t\t\t\t\t\t} else if ( type === "error" ) {\n\t\t\t\t\t\t\t\tcomplete(\n\t\t\t\t\t\t\t\t\t// file: protocol always yields status 0; see #8605, #14207\n\t\t\t\t\t\t\t\t\txhr.status,\n\t\t\t\t\t\t\t\t\txhr.statusText\n\t\t\t\t\t\t\t\t);\n\t\t\t\t\t\t\t} else {\n\t\t\t\t\t\t\t\tcomplete(\n\t\t\t\t\t\t\t\t\txhrSuccessStatus[ xhr.status ] || xhr.status,\n\t\t\t\t\t\t\t\t\txhr.statusText,\n\t\t\t\t\t\t\t\t\t// Support: IE9\n\t\t\t\t\t\t\t\t\t// Accessing binary-data responseText throws an exception\n\t\t\t\t\t\t\t\t\t// (#11426)\n\t\t\t\t\t\t\t\t\ttypeof xhr.responseText === "string" ? {\n\t\t\t\t\t\t\t\t\t\ttext: xhr.responseText\n\t\t\t\t\t\t\t\t\t} : undefined,\n\t\t\t\t\t\t\t\t\txhr.getAllResponseHeaders()\n\t\t\t\t\t\t\t\t);\n\t\t\t\t\t\t\t}\n\t\t\t\t\t\t}\n\t\t\t\t\t};\n\t\t\t\t};\n\n\t\t\t\t// Listen to events\n\t\t\t\txhr.onload = callback();\n\t\t\t\txhr.onerror = callback("error");\n\n\t\t\t\t// Create the abort callback\n\t\t\t\tcallback = xhrCallbacks[ id ] = callback("abort");\n\n\t\t\t\ttry {\n\t\t\t\t\t// Do send the request (this may raise an exception)\n\t\t\t\t\txhr.send( options.hasContent && options.data || null );\n\t\t\t\t} catch ( e ) {\n\t\t\t\t\t// #14683: Only rethrow if this hasn\'t been notified as an error yet\n\t\t\t\t\tif ( callback ) {\n\t\t\t\t\t\tthrow e;\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t},\n\n\t\t\tabort: function() {\n\t\t\t\tif ( callback ) {\n\t\t\t\t\tcallback();\n\t\t\t\t}\n\t\t\t}\n\t\t};\n\t}\n});\n\n\n\n\n// Install script dataType\njQuery.ajaxSetup({\n\taccepts: {\n\t\tscript: "text/javascript, application/javascript, application/ecmascript, application/x-ecmascript"\n\t},\n\tcontents: {\n\t\tscript: /(?:java|ecma)script/\n\t},\n\tconverters: {\n\t\t"text script": function( text ) {\n\t\t\tjQuery.globalEval( text );\n\t\t\treturn text;\n\t\t}\n\t}\n});\n\n// Handle cache\'s special case and crossDomain\njQuery.ajaxPrefilter( "script", function( s ) {\n\tif ( s.cache === undefined ) {\n\t\ts.cache = false;\n\t}\n\tif ( s.crossDomain ) {\n\t\ts.type = "GET";\n\t}\n});\n\n// Bind script tag hack transport\njQuery.ajaxTransport( "script", function( s ) {\n\t// This transport only deals with cross domain requests\n\tif ( s.crossDomain ) {\n\t\tvar script, callback;\n\t\treturn {\n\t\t\tsend: function( _, complete ) {\n\t\t\t\tscript = jQuery("<script>").prop({\n\t\t\t\t\tasync: true,\n\t\t\t\t\tcharset: s.scriptCharset,\n\t\t\t\t\tsrc: s.url\n\t\t\t\t}).on(\n\t\t\t\t\t"load error",\n\t\t\t\t\tcallback = function( evt ) {\n\t\t\t\t\t\tscript.remove();\n\t\t\t\t\t\tcallback = null;\n\t\t\t\t\t\tif ( evt ) {\n\t\t\t\t\t\t\tcomplete( evt.type === "error" ? 404 : 200, evt.type );\n\t\t\t\t\t\t}\n\t\t\t\t\t}\n\t\t\t\t);\n\t\t\t\tdocument.head.appendChild( script[ 0 ] );\n\t\t\t},\n\t\t\tabort: function() {\n\t\t\t\tif ( callback ) {\n\t\t\t\t\tcallback();\n\t\t\t\t}\n\t\t\t}\n\t\t};\n\t}\n});\n\n\n\n\nvar oldCallbacks = [],\n\trjsonp = /(=)\\?(?=&|$)|\\?\\?/;\n\n// Default jsonp settings\njQuery.ajaxSetup({\n\tjsonp: "callback",\n\tjsonpCallback: function() {\n\t\tvar callback = oldCallbacks.pop() || ( jQuery.expando + "_" + ( nonce++ ) );\n\t\tthis[ callback ] = true;\n\t\treturn callback;\n\t}\n});\n\n// Detect, normalize options and install callbacks for jsonp requests\njQuery.ajaxPrefilter( "json jsonp", function( s, originalSettings, jqXHR ) {\n\n\tvar callbackName, overwritten, responseContainer,\n\t\tjsonProp = s.jsonp !== false && ( rjsonp.test( s.url ) ?\n\t\t\t"url" :\n\t\t\ttypeof s.data === "string" && !( s.contentType || "" ).indexOf("application/x-www-form-urlencoded") && rjsonp.test( s.data ) && "data"\n\t\t);\n\n\t// Handle iff the expected data type is "jsonp" or we have a parameter to set\n\tif ( jsonProp || s.dataTypes[ 0 ] === "jsonp" ) {\n\n\t\t// Get callback name, remembering preexisting value associated with it\n\t\tcallbackName = s.jsonpCallback = jQuery.isFunction( s.jsonpCallback ) ?\n\t\t\ts.jsonpCallback() :\n\t\t\ts.jsonpCallback;\n\n\t\t// Insert callback into url or form data\n\t\tif ( jsonProp ) {\n\t\t\ts[ jsonProp ] = s[ jsonProp ].replace( rjsonp, "$1" + callbackName );\n\t\t} else if ( s.jsonp !== false ) {\n\t\t\ts.url += ( rquery.test( s.url ) ? "&" : "?" ) + s.jsonp + "=" + callbackName;\n\t\t}\n\n\t\t// Use data converter to retrieve json after script execution\n\t\ts.converters["script json"] = function() {\n\t\t\tif ( !responseContainer ) {\n\t\t\t\tjQuery.error( callbackName + " was not called" );\n\t\t\t}\n\t\t\treturn responseContainer[ 0 ];\n\t\t};\n\n\t\t// force json dataType\n\t\ts.dataTypes[ 0 ] = "json";\n\n\t\t// Install callback\n\t\toverwritten = window[ callbackName ];\n\t\twindow[ callbackName ] = function() {\n\t\t\tresponseContainer = arguments;\n\t\t};\n\n\t\t// Clean-up function (fires after converters)\n\t\tjqXHR.always(function() {\n\t\t\t// Restore preexisting value\n\t\t\twindow[ callbackName ] = overwritten;\n\n\t\t\t// Save back as free\n\t\t\tif ( s[ callbackName ] ) {\n\t\t\t\t// make sure that re-using the options doesn\'t screw things around\n\t\t\t\ts.jsonpCallback = originalSettings.jsonpCallback;\n\n\t\t\t\t// save the callback name for future use\n\t\t\t\toldCallbacks.push( callbackName );\n\t\t\t}\n\n\t\t\t// Call if it was a function and we have a response\n\t\t\tif ( responseContainer && jQuery.isFunction( overwritten ) ) {\n\t\t\t\toverwritten( responseContainer[ 0 ] );\n\t\t\t}\n\n\t\t\tresponseContainer = overwritten = undefined;\n\t\t});\n\n\t\t// Delegate to script\n\t\treturn "script";\n\t}\n});\n\n\n\n\n// data: string of html\n// context (optional): If specified, the fragment will be created in this context, defaults to document\n// keepScripts (optional): If true, will include scripts passed in the html string\njQuery.parseHTML = function( data, context, keepScripts ) {\n\tif ( !data || typeof data !== "string" ) {\n\t\treturn null;\n\t}\n\tif ( typeof context === "boolean" ) {\n\t\tkeepScripts = context;\n\t\tcontext = false;\n\t}\n\tcontext = context || document;\n\n\tvar parsed = rsingleTag.exec( data ),\n\t\tscripts = !keepScripts && [];\n\n\t// Single tag\n\tif ( parsed ) {\n\t\treturn [ context.createElement( parsed[1] ) ];\n\t}\n\n\tparsed = jQuery.buildFragment( [ data ], context, scripts );\n\n\tif ( scripts && scripts.length ) {\n\t\tjQuery( scripts ).remove();\n\t}\n\n\treturn jQuery.merge( [], parsed.childNodes );\n};\n\n\n// Keep a copy of the old load method\nvar _load = jQuery.fn.load;\n\n/**\n * Load a url into a page\n */\njQuery.fn.load = function( url, params, callback ) {\n\tif ( typeof url !== "string" && _load ) {\n\t\treturn _load.apply( this, arguments );\n\t}\n\n\tvar selector, type, response,\n\t\tself = this,\n\t\toff = url.indexOf(" ");\n\n\tif ( off >= 0 ) {\n\t\tselector = jQuery.trim( url.slice( off ) );\n\t\turl = url.slice( 0, off );\n\t}\n\n\t// If it\'s a function\n\tif ( jQuery.isFunction( params ) ) {\n\n\t\t// We assume that it\'s the callback\n\t\tcallback = params;\n\t\tparams = undefined;\n\n\t// Otherwise, build a param string\n\t} else if ( params && typeof params === "object" ) {\n\t\ttype = "POST";\n\t}\n\n\t// If we have elements to modify, make the request\n\tif ( self.length > 0 ) {\n\t\tjQuery.ajax({\n\t\t\turl: url,\n\n\t\t\t// if "type" variable is undefined, then "GET" method will be used\n\t\t\ttype: type,\n\t\t\tdataType: "html",\n\t\t\tdata: params\n\t\t}).done(function( responseText ) {\n\n\t\t\t// Save response for use in complete callback\n\t\t\tresponse = arguments;\n\n\t\t\tself.html( selector ?\n\n\t\t\t\t// If a selector was specified, locate the right elements in a dummy div\n\t\t\t\t// Exclude scripts to avoid IE \'Permission Denied\' errors\n\t\t\t\tjQuery("<div>").append( jQuery.parseHTML( responseText ) ).find( selector ) :\n\n\t\t\t\t// Otherwise use the full result\n\t\t\t\tresponseText );\n\n\t\t}).complete( callback && function( jqXHR, status ) {\n\t\t\tself.each( callback, response || [ jqXHR.responseText, status, jqXHR ] );\n\t\t});\n\t}\n\n\treturn this;\n};\n\n\n\n\n// Attach a bunch of functions for handling common AJAX events\njQuery.each( [ "ajaxStart", "ajaxStop", "ajaxComplete", "ajaxError", "ajaxSuccess", "ajaxSend" ], function( i, type ) {\n\tjQuery.fn[ type ] = function( fn ) {\n\t\treturn this.on( type, fn );\n\t};\n});\n\n\n\n\njQuery.expr.filters.animated = function( elem ) {\n\treturn jQuery.grep(jQuery.timers, function( fn ) {\n\t\treturn elem === fn.elem;\n\t}).length;\n};\n\n\n\n\nvar docElem = window.document.documentElement;\n\n/**\n * Gets a window from an element\n */\nfunction getWindow( elem ) {\n\treturn jQuery.isWindow( elem ) ? elem : elem.nodeType === 9 && elem.defaultView;\n}\n\njQuery.offset = {\n\tsetOffset: function( elem, options, i ) {\n\t\tvar curPosition, curLeft, curCSSTop, curTop, curOffset, curCSSLeft, calculatePosition,\n\t\t\tposition = jQuery.css( elem, "position" ),\n\t\t\tcurElem = jQuery( elem ),\n\t\t\tprops = {};\n\n\t\t// Set position first, in-case top/left are set even on static elem\n\t\tif ( position === "static" ) {\n\t\t\telem.style.position = "relative";\n\t\t}\n\n\t\tcurOffset = curElem.offset();\n\t\tcurCSSTop = jQuery.css( elem, "top" );\n\t\tcurCSSLeft = jQuery.css( elem, "left" );\n\t\tcalculatePosition = ( position === "absolute" || position === "fixed" ) &&\n\t\t\t( curCSSTop + curCSSLeft ).indexOf("auto") > -1;\n\n\t\t// Need to be able to calculate position if either\n\t\t// top or left is auto and position is either absolute or fixed\n\t\tif ( calculatePosition ) {\n\t\t\tcurPosition = curElem.position();\n\t\t\tcurTop = curPosition.top;\n\t\t\tcurLeft = curPosition.left;\n\n\t\t} else {\n\t\t\tcurTop = parseFloat( curCSSTop ) || 0;\n\t\t\tcurLeft = parseFloat( curCSSLeft ) || 0;\n\t\t}\n\n\t\tif ( jQuery.isFunction( options ) ) {\n\t\t\toptions = options.call( elem, i, curOffset );\n\t\t}\n\n\t\tif ( options.top != null ) {\n\t\t\tprops.top = ( options.top - curOffset.top ) + curTop;\n\t\t}\n\t\tif ( options.left != null ) {\n\t\t\tprops.left = ( options.left - curOffset.left ) + curLeft;\n\t\t}\n\n\t\tif ( "using" in options ) {\n\t\t\toptions.using.call( elem, props );\n\n\t\t} else {\n\t\t\tcurElem.css( props );\n\t\t}\n\t}\n};\n\njQuery.fn.extend({\n\toffset: function( options ) {\n\t\tif ( arguments.length ) {\n\t\t\treturn options === undefined ?\n\t\t\t\tthis :\n\t\t\t\tthis.each(function( i ) {\n\t\t\t\t\tjQuery.offset.setOffset( this, options, i );\n\t\t\t\t});\n\t\t}\n\n\t\tvar docElem, win,\n\t\t\telem = this[ 0 ],\n\t\t\tbox = { top: 0, left: 0 },\n\t\t\tdoc = elem && elem.ownerDocument;\n\n\t\tif ( !doc ) {\n\t\t\treturn;\n\t\t}\n\n\t\tdocElem = doc.documentElement;\n\n\t\t// Make sure it\'s not a disconnected DOM node\n\t\tif ( !jQuery.contains( docElem, elem ) ) {\n\t\t\treturn box;\n\t\t}\n\n\t\t// Support: BlackBerry 5, iOS 3 (original iPhone)\n\t\t// If we don\'t have gBCR, just use 0,0 rather than error\n\t\tif ( typeof elem.getBoundingClientRect !== strundefined ) {\n\t\t\tbox = elem.getBoundingClientRect();\n\t\t}\n\t\twin = getWindow( doc );\n\t\treturn {\n\t\t\ttop: box.top + win.pageYOffset - docElem.clientTop,\n\t\t\tleft: box.left + win.pageXOffset - docElem.clientLeft\n\t\t};\n\t},\n\n\tposition: function() {\n\t\tif ( !this[ 0 ] ) {\n\t\t\treturn;\n\t\t}\n\n\t\tvar offsetParent, offset,\n\t\t\telem = this[ 0 ],\n\t\t\tparentOffset = { top: 0, left: 0 };\n\n\t\t// Fixed elements are offset from window (parentOffset = {top:0, left: 0}, because it is its only offset parent\n\t\tif ( jQuery.css( elem, "position" ) === "fixed" ) {\n\t\t\t// Assume getBoundingClientRect is there when computed position is fixed\n\t\t\toffset = elem.getBoundingClientRect();\n\n\t\t} else {\n\t\t\t// Get *real* offsetParent\n\t\t\toffsetParent = this.offsetParent();\n\n\t\t\t// Get correct offsets\n\t\t\toffset = this.offset();\n\t\t\tif ( !jQuery.nodeName( offsetParent[ 0 ], "html" ) ) {\n\t\t\t\tparentOffset = offsetParent.offset();\n\t\t\t}\n\n\t\t\t// Add offsetParent borders\n\t\t\tparentOffset.top += jQuery.css( offsetParent[ 0 ], "borderTopWidth", true );\n\t\t\tparentOffset.left += jQuery.css( offsetParent[ 0 ], "borderLeftWidth", true );\n\t\t}\n\n\t\t// Subtract parent offsets and element margins\n\t\treturn {\n\t\t\ttop: offset.top - parentOffset.top - jQuery.css( elem, "marginTop", true ),\n\t\t\tleft: offset.left - parentOffset.left - jQuery.css( elem, "marginLeft", true )\n\t\t};\n\t},\n\n\toffsetParent: function() {\n\t\treturn this.map(function() {\n\t\t\tvar offsetParent = this.offsetParent || docElem;\n\n\t\t\twhile ( offsetParent && ( !jQuery.nodeName( offsetParent, "html" ) && jQuery.css( offsetParent, "position" ) === "static" ) ) {\n\t\t\t\toffsetParent = offsetParent.offsetParent;\n\t\t\t}\n\n\t\t\treturn offsetParent || docElem;\n\t\t});\n\t}\n});\n\n// Create scrollLeft and scrollTop methods\njQuery.each( { scrollLeft: "pageXOffset", scrollTop: "pageYOffset" }, function( method, prop ) {\n\tvar top = "pageYOffset" === prop;\n\n\tjQuery.fn[ method ] = function( val ) {\n\t\treturn access( this, function( elem, method, val ) {\n\t\t\tvar win = getWindow( elem );\n\n\t\t\tif ( val === undefined ) {\n\t\t\t\treturn win ? win[ prop ] : elem[ method ];\n\t\t\t}\n\n\t\t\tif ( win ) {\n\t\t\t\twin.scrollTo(\n\t\t\t\t\t!top ? val : window.pageXOffset,\n\t\t\t\t\ttop ? val : window.pageYOffset\n\t\t\t\t);\n\n\t\t\t} else {\n\t\t\t\telem[ method ] = val;\n\t\t\t}\n\t\t}, method, val, arguments.length, null );\n\t};\n});\n\n// Support: Safari<7+, Chrome<37+\n// Add the top/left cssHooks using jQuery.fn.position\n// Webkit bug: https://bugs.webkit.org/show_bug.cgi?id=29084\n// Blink bug: https://code.google.com/p/chromium/issues/detail?id=229280\n// getComputedStyle returns percent when specified for top/left/bottom/right;\n// rather than make the css module depend on the offset module, just check for it here\njQuery.each( [ "top", "left" ], function( i, prop ) {\n\tjQuery.cssHooks[ prop ] = addGetHookIf( support.pixelPosition,\n\t\tfunction( elem, computed ) {\n\t\t\tif ( computed ) {\n\t\t\t\tcomputed = curCSS( elem, prop );\n\t\t\t\t// If curCSS returns percentage, fallback to offset\n\t\t\t\treturn rnumnonpx.test( computed ) ?\n\t\t\t\t\tjQuery( elem ).position()[ prop ] + "px" :\n\t\t\t\t\tcomputed;\n\t\t\t}\n\t\t}\n\t);\n});\n\n\n// Create innerHeight, innerWidth, height, width, outerHeight and outerWidth methods\njQuery.each( { Height: "height", Width: "width" }, function( name, type ) {\n\tjQuery.each( { padding: "inner" + name, content: type, "": "outer" + name }, function( defaultExtra, funcName ) {\n\t\t// Margin is only for outerHeight, outerWidth\n\t\tjQuery.fn[ funcName ] = function( margin, value ) {\n\t\t\tvar chainable = arguments.length && ( defaultExtra || typeof margin !== "boolean" ),\n\t\t\t\textra = defaultExtra || ( margin === true || value === true ? "margin" : "border" );\n\n\t\t\treturn access( this, function( elem, type, value ) {\n\t\t\t\tvar doc;\n\n\t\t\t\tif ( jQuery.isWindow( elem ) ) {\n\t\t\t\t\t// As of 5/8/2012 this will yield incorrect results for Mobile Safari, but there\n\t\t\t\t\t// isn\'t a whole lot we can do. See pull request at this URL for discussion:\n\t\t\t\t\t// https://github.com/jquery/jquery/pull/764\n\t\t\t\t\treturn elem.document.documentElement[ "client" + name ];\n\t\t\t\t}\n\n\t\t\t\t// Get document width or height\n\t\t\t\tif ( elem.nodeType === 9 ) {\n\t\t\t\t\tdoc = elem.documentElement;\n\n\t\t\t\t\t// Either scroll[Width/Height] or offset[Width/Height] or client[Width/Height],\n\t\t\t\t\t// whichever is greatest\n\t\t\t\t\treturn Math.max(\n\t\t\t\t\t\telem.body[ "scroll" + name ], doc[ "scroll" + name ],\n\t\t\t\t\t\telem.body[ "offset" + name ], doc[ "offset" + name ],\n\t\t\t\t\t\tdoc[ "client" + name ]\n\t\t\t\t\t);\n\t\t\t\t}\n\n\t\t\t\treturn value === undefined ?\n\t\t\t\t\t// Get width or height on the element, requesting but not forcing parseFloat\n\t\t\t\t\tjQuery.css( elem, type, extra ) :\n\n\t\t\t\t\t// Set width or height on the element\n\t\t\t\t\tjQuery.style( elem, type, value, extra );\n\t\t\t}, type, chainable ? margin : undefined, chainable, null );\n\t\t};\n\t});\n});\n\n\n// The number of elements contained in the matched element set\njQuery.fn.size = function() {\n\treturn this.length;\n};\n\njQuery.fn.andSelf = jQuery.fn.addBack;\n\n\n\n\n// Register as a named AMD module, since jQuery can be concatenated with other\n// files that may use define, but not via a proper concatenation script that\n// understands anonymous AMD modules. A named AMD is safest and most robust\n// way to register. Lowercase jquery is used because AMD module names are\n// derived from file names, and jQuery is normally delivered in a lowercase\n// file name. Do this after creating the global so that if an AMD module wants\n// to call noConflict to hide this version of jQuery, it will work.\n\n// Note that for maximum portability, libraries that are not jQuery should\n// declare themselves as anonymous modules, and avoid setting a global if an\n// AMD loader is present. jQuery is a special case. For more information, see\n// https://github.com/jrburke/requirejs/wiki/Updating-existing-libraries#wiki-anon\n\nif ( typeof define === "function" && define.amd ) {\n\tdefine( "jquery", [], function() {\n\t\treturn jQuery;\n\t});\n}\n\n\n\n\nvar\n\t// Map over jQuery in case of overwrite\n\t_jQuery = window.jQuery,\n\n\t// Map over the $ in case of overwrite\n\t_$ = window.$;\n\njQuery.noConflict = function( deep ) {\n\tif ( window.$ === jQuery ) {\n\t\twindow.$ = _$;\n\t}\n\n\tif ( deep && window.jQuery === jQuery ) {\n\t\twindow.jQuery = _jQuery;\n\t}\n\n\treturn jQuery;\n};\n\n// Expose jQuery and $ identifiers, even in AMD\n// (#7102#comment:10, https://github.com/jquery/jquery/pull/557)\n// and CommonJS for browser emulators (#13566)\nif ( typeof noGlobal === strundefined ) {\n\twindow.jQuery = window.$ = jQuery;\n}\n\n\n\n\nreturn jQuery;\n\n}));\n', {
    'address': 'jquery@2.1.3#dist/jquery',
    'metadata': {
        'format': 'global',
        'exports': 'jQuery',
        'deps': []
    }
});
/*can@2.2.4#util/can*/
define('can@2.2.4#util/can', [], function () {
    var glbl = typeof window !== 'undefined' ? window : global;
    var can = {};
    if (typeof GLOBALCAN === 'undefined' || GLOBALCAN !== false) {
        glbl.can = can;
    }
    can.global = glbl;
    can.k = function () {
    };
    can.isDeferred = can.isPromise = function (obj) {
        return obj && typeof obj.then === 'function' && typeof obj.pipe === 'function';
    };
    can.isMapLike = function (obj) {
        return can.Map && (obj instanceof can.Map || obj && obj.__get);
    };
    var cid = 0;
    can.cid = function (object, name) {
        if (!object._cid) {
            cid++;
            object._cid = (name || '') + cid;
        }
        return object._cid;
    };
    can.VERSION = '@EDGE';
    can.simpleExtend = function (d, s) {
        for (var prop in s) {
            d[prop] = s[prop];
        }
        return d;
    };
    can.last = function (arr) {
        return arr && arr[arr.length - 1];
    };
    can.frag = function (item) {
        var frag;
        if (!item || typeof item === 'string') {
            frag = can.buildFragment(item == null ? '' : '' + item, document.body);
            if (!frag.childNodes.length) {
                frag.appendChild(document.createTextNode(''));
            }
            return frag;
        } else if (item.nodeType === 11) {
            return item;
        } else if (typeof item.nodeType === 'number') {
            frag = document.createDocumentFragment();
            frag.appendChild(item);
            return frag;
        } else if (typeof item.length === 'number') {
            frag = document.createDocumentFragment();
            can.each(item, function (item) {
                frag.appendChild(can.frag(item));
            });
            return frag;
        } else {
            frag = can.buildFragment('' + item, document.body);
            if (!frag.childNodes.length) {
                frag.appendChild(document.createTextNode(''));
            }
            return frag;
        }
    };
    can.scope = can.viewModel = function (el, attr, val) {
        el = can.$(el);
        var scope = can.data(el, 'scope') || can.data(el, 'viewModel');
        if (!scope) {
            scope = new can.Map();
            can.data(el, 'scope', scope);
            can.data(el, 'viewModel', scope);
        }
        switch (arguments.length) {
        case 0:
        case 1:
            return scope;
        case 2:
            return scope.attr(attr);
        default:
            scope.attr(attr, val);
            return el;
        }
    };
    can['import'] = function (moduleName) {
        var deferred = new can.Deferred();
        if (typeof window.System === 'object' && can.isFunction(window.System['import'])) {
            window.System['import'](moduleName).then(can.proxy(deferred.resolve, deferred), can.proxy(deferred.reject, deferred));
        } else if (window.define && window.define.amd) {
            window.require([moduleName], function (value) {
                deferred.resolve(value);
            });
        } else if (window.steal) {
            steal.steal(moduleName, function (value) {
                deferred.resolve(value);
            });
        } else if (window.require) {
            deferred.resolve(window.require(moduleName));
        } else {
            deferred.resolve();
        }
        return deferred.promise();
    };
    can.__reading = function () {
    };
    return can;
});
/*can@2.2.4#util/attr/attr*/
define('can@2.2.4#util/attr/attr', ['can/util/can'], function (can) {
    var setImmediate = can.global.setImmediate || function (cb) {
            return setTimeout(cb, 0);
        }, attr = {
            MutationObserver: can.global.MutationObserver || can.global.WebKitMutationObserver || can.global.MozMutationObserver,
            map: {
                'class': 'className',
                'value': 'value',
                'innertext': 'innerText',
                'textcontent': 'textContent',
                'checked': true,
                'disabled': true,
                'readonly': true,
                'required': true,
                src: function (el, val) {
                    if (val == null || val === '') {
                        el.removeAttribute('src');
                        return null;
                    } else {
                        el.setAttribute('src', val);
                        return val;
                    }
                },
                style: function (el, val) {
                    return el.style.cssText = val || '';
                }
            },
            defaultValue: [
                'input',
                'textarea'
            ],
            set: function (el, attrName, val) {
                attrName = attrName.toLowerCase();
                var oldValue;
                if (!attr.MutationObserver) {
                    oldValue = attr.get(el, attrName);
                }
                var tagName = el.nodeName.toString().toLowerCase(), prop = attr.map[attrName], newValue;
                if (typeof prop === 'function') {
                    newValue = prop(el, val);
                } else if (prop === true) {
                    newValue = el[attrName] = true;
                    if (attrName === 'checked' && el.type === 'radio') {
                        if (can.inArray(tagName, attr.defaultValue) >= 0) {
                            el.defaultChecked = true;
                        }
                    }
                } else if (prop) {
                    newValue = val;
                    if (el[prop] !== val) {
                        el[prop] = val;
                    }
                    if (prop === 'value' && can.inArray(tagName, attr.defaultValue) >= 0) {
                        el.defaultValue = val;
                    }
                } else {
                    el.setAttribute(attrName, val);
                    newValue = val;
                }
                if (!attr.MutationObserver && newValue !== oldValue) {
                    attr.trigger(el, attrName, oldValue);
                }
            },
            trigger: function (el, attrName, oldValue) {
                if (can.data(can.$(el), 'canHasAttributesBindings')) {
                    attrName = attrName.toLowerCase();
                    return setImmediate(function () {
                        can.trigger(el, {
                            type: 'attributes',
                            attributeName: attrName,
                            target: el,
                            oldValue: oldValue,
                            bubbles: false
                        }, []);
                    });
                }
            },
            get: function (el, attrName) {
                attrName = attrName.toLowerCase();
                var prop = attr.map[attrName];
                if (typeof prop === 'string' && el[prop]) {
                    return el[prop];
                }
                return el.getAttribute(attrName);
            },
            remove: function (el, attrName) {
                attrName = attrName.toLowerCase();
                var oldValue;
                if (!attr.MutationObserver) {
                    oldValue = attr.get(el, attrName);
                }
                var setter = attr.map[attrName];
                if (typeof setter === 'function') {
                    setter(el, undefined);
                }
                if (setter === true) {
                    el[attrName] = false;
                } else if (typeof setter === 'string') {
                    el[setter] = '';
                } else {
                    el.removeAttribute(attrName);
                }
                if (!attr.MutationObserver && oldValue != null) {
                    attr.trigger(el, attrName, oldValue);
                }
            },
            has: function () {
                var el = can.global.document && document.createElement('div');
                if (el && el.hasAttribute) {
                    return function (el, name) {
                        return el.hasAttribute(name);
                    };
                } else {
                    return function (el, name) {
                        return el.getAttribute(name) !== null;
                    };
                }
            }()
        };
    return attr;
});
/*can@2.2.4#event/event*/
define('can@2.2.4#event/event', ['can/util/can'], function (can) {
    can.addEvent = function (event, handler) {
        var allEvents = this.__bindEvents || (this.__bindEvents = {}), eventList = allEvents[event] || (allEvents[event] = []);
        eventList.push({
            handler: handler,
            name: event
        });
        return this;
    };
    can.listenTo = function (other, event, handler) {
        var idedEvents = this.__listenToEvents;
        if (!idedEvents) {
            idedEvents = this.__listenToEvents = {};
        }
        var otherId = can.cid(other);
        var othersEvents = idedEvents[otherId];
        if (!othersEvents) {
            othersEvents = idedEvents[otherId] = {
                obj: other,
                events: {}
            };
        }
        var eventsEvents = othersEvents.events[event];
        if (!eventsEvents) {
            eventsEvents = othersEvents.events[event] = [];
        }
        eventsEvents.push(handler);
        can.bind.call(other, event, handler);
    };
    can.stopListening = function (other, event, handler) {
        var idedEvents = this.__listenToEvents, iterIdedEvents = idedEvents, i = 0;
        if (!idedEvents) {
            return this;
        }
        if (other) {
            var othercid = can.cid(other);
            (iterIdedEvents = {})[othercid] = idedEvents[othercid];
            if (!idedEvents[othercid]) {
                return this;
            }
        }
        for (var cid in iterIdedEvents) {
            var othersEvents = iterIdedEvents[cid], eventsEvents;
            other = idedEvents[cid].obj;
            if (!event) {
                eventsEvents = othersEvents.events;
            } else {
                (eventsEvents = {})[event] = othersEvents.events[event];
            }
            for (var eventName in eventsEvents) {
                var handlers = eventsEvents[eventName] || [];
                i = 0;
                while (i < handlers.length) {
                    if (handler && handler === handlers[i] || !handler) {
                        can.unbind.call(other, eventName, handlers[i]);
                        handlers.splice(i, 1);
                    } else {
                        i++;
                    }
                }
                if (!handlers.length) {
                    delete othersEvents.events[eventName];
                }
            }
            if (can.isEmptyObject(othersEvents.events)) {
                delete idedEvents[cid];
            }
        }
        return this;
    };
    can.removeEvent = function (event, fn, __validate) {
        if (!this.__bindEvents) {
            return this;
        }
        var events = this.__bindEvents[event] || [], i = 0, ev, isFunction = typeof fn === 'function';
        while (i < events.length) {
            ev = events[i];
            if (__validate ? __validate(ev, event, fn) : isFunction && ev.handler === fn || !isFunction && (ev.cid === fn || !fn)) {
                events.splice(i, 1);
            } else {
                i++;
            }
        }
        return this;
    };
    can.dispatch = function (event, args) {
        var events = this.__bindEvents;
        if (!events) {
            return;
        }
        if (typeof event === 'string') {
            event = { type: event };
        }
        var eventName = event.type, handlers = (events[eventName] || []).slice(0), passed = [event];
        if (args) {
            passed.push.apply(passed, args);
        }
        for (var i = 0, len = handlers.length; i < len; i++) {
            handlers[i].handler.apply(this, passed);
        }
        return event;
    };
    can.one = function (event, handler) {
        var one = function () {
            can.unbind.call(this, event, one);
            return handler.apply(this, arguments);
        };
        can.bind.call(this, event, one);
        return this;
    };
    can.event = {
        on: function () {
            if (arguments.length === 0 && can.Control && this instanceof can.Control) {
                return can.Control.prototype.on.call(this);
            } else {
                return can.addEvent.apply(this, arguments);
            }
        },
        off: function () {
            if (arguments.length === 0 && can.Control && this instanceof can.Control) {
                return can.Control.prototype.off.call(this);
            } else {
                return can.removeEvent.apply(this, arguments);
            }
        },
        bind: can.addEvent,
        unbind: can.removeEvent,
        delegate: function (selector, event, handler) {
            return can.addEvent.call(this, event, handler);
        },
        undelegate: function (selector, event, handler) {
            return can.removeEvent.call(this, event, handler);
        },
        trigger: can.dispatch,
        one: can.one,
        addEvent: can.addEvent,
        removeEvent: can.removeEvent,
        listenTo: can.listenTo,
        stopListening: can.stopListening,
        dispatch: can.dispatch
    };
    return can.event;
});
/*can@2.2.4#util/array/each*/
define('can@2.2.4#util/array/each', ['can/util/can'], function (can) {
    var isArrayLike = function (obj) {
        var length = obj.length;
        return typeof arr !== 'function' && (length === 0 || typeof length === 'number' && length > 0 && length - 1 in obj);
    };
    can.each = function (elements, callback, context) {
        var i = 0, key, len, item;
        if (elements) {
            if (isArrayLike(elements)) {
                if (can.List && elements instanceof can.List) {
                    for (len = elements.attr('length'); i < len; i++) {
                        item = elements.attr(i);
                        if (callback.call(context || item, item, i, elements) === false) {
                            break;
                        }
                    }
                } else {
                    for (len = elements.length; i < len; i++) {
                        item = elements[i];
                        if (callback.call(context || item, item, i, elements) === false) {
                            break;
                        }
                    }
                }
            } else if (typeof elements === 'object') {
                if (can.Map && elements instanceof can.Map || elements === can.route) {
                    var keys = can.Map.keys(elements);
                    for (i = 0, len = keys.length; i < len; i++) {
                        key = keys[i];
                        item = elements.attr(key);
                        if (callback.call(context || item, item, key, elements) === false) {
                            break;
                        }
                    }
                } else {
                    for (key in elements) {
                        if (elements.hasOwnProperty(key) && callback.call(context || elements[key], elements[key], key, elements) === false) {
                            break;
                        }
                    }
                }
            }
        }
        return elements;
    };
    return can;
});
/*can@2.2.4#util/inserted/inserted*/
define('can@2.2.4#util/inserted/inserted', ['can/util/can'], function (can) {
    can.inserted = function (elems) {
        elems = can.makeArray(elems);
        var inDocument = false, doc = can.$(document.contains ? document : document.body), children;
        for (var i = 0, elem; (elem = elems[i]) !== undefined; i++) {
            if (!inDocument) {
                if (elem.getElementsByTagName) {
                    if (can.has(doc, elem).length) {
                        inDocument = true;
                    } else {
                        return;
                    }
                } else {
                    continue;
                }
            }
            if (inDocument && elem.getElementsByTagName) {
                children = can.makeArray(elem.getElementsByTagName('*'));
                can.trigger(elem, 'inserted', [], false);
                for (var j = 0, child; (child = children[j]) !== undefined; j++) {
                    can.trigger(child, 'inserted', [], false);
                }
            }
        }
    };
    can.appendChild = function (el, child) {
        var children;
        if (child.nodeType === 11) {
            children = can.makeArray(child.childNodes);
        } else {
            children = [child];
        }
        el.appendChild(child);
        can.inserted(children);
    };
    can.insertBefore = function (el, child, ref) {
        var children;
        if (child.nodeType === 11) {
            children = can.makeArray(child.childNodes);
        } else {
            children = [child];
        }
        el.insertBefore(child, ref);
        can.inserted(children);
    };
});
/*can@2.2.4#util/jquery/jquery*/
define('can@2.2.4#util/jquery/jquery', [
    'jquery/jquery',
    'can/util/can',
    'can/util/attr/attr',
    'can/event/event',
    'can/util/array/each',
    'can/util/inserted/inserted'
], function ($, can, attr, event) {
    var isBindableElement = function (node) {
        return node.nodeName && (node.nodeType === 1 || node.nodeType === 9) || node == window;
    };
    $ = $ || window.jQuery;
    $.extend(can, $, {
        trigger: function (obj, event, args, bubbles) {
            if (isBindableElement(obj)) {
                $.event.trigger(event, args, obj, !bubbles);
            } else if (obj.trigger) {
                obj.trigger(event, args);
            } else {
                if (typeof event === 'string') {
                    event = { type: event };
                }
                event.target = event.target || obj;
                if (args) {
                    if (args.length && typeof args === 'string') {
                        args = [args];
                    } else if (!args.length) {
                        args = [args];
                    }
                }
                if (!args) {
                    args = [];
                }
                can.dispatch.call(obj, event, args);
            }
        },
        event: can.event,
        addEvent: can.addEvent,
        removeEvent: can.removeEvent,
        buildFragment: function (elems, context) {
            var ret;
            elems = [elems];
            context = context || document;
            context = !context.nodeType && context[0] || context;
            context = context.ownerDocument || context;
            ret = $.buildFragment(elems, context);
            return ret.cacheable ? $.clone(ret.fragment) : ret.fragment || ret;
        },
        $: $,
        each: can.each,
        bind: function (ev, cb) {
            if (this.bind && this.bind !== can.bind) {
                this.bind(ev, cb);
            } else if (isBindableElement(this)) {
                $.event.add(this, ev, cb);
            } else {
                can.addEvent.call(this, ev, cb);
            }
            return this;
        },
        unbind: function (ev, cb) {
            if (this.unbind && this.unbind !== can.unbind) {
                this.unbind(ev, cb);
            } else if (isBindableElement(this)) {
                $.event.remove(this, ev, cb);
            } else {
                can.removeEvent.call(this, ev, cb);
            }
            return this;
        },
        delegate: function (selector, ev, cb) {
            if (this.delegate) {
                this.delegate(selector, ev, cb);
            } else if (isBindableElement(this)) {
                $(this).delegate(selector, ev, cb);
            } else {
                can.bind.call(this, ev, cb);
            }
            return this;
        },
        undelegate: function (selector, ev, cb) {
            if (this.undelegate) {
                this.undelegate(selector, ev, cb);
            } else if (isBindableElement(this)) {
                $(this).undelegate(selector, ev, cb);
            } else {
                can.unbind.call(this, ev, cb);
            }
            return this;
        },
        proxy: function (fn, context) {
            return function () {
                return fn.apply(context, arguments);
            };
        },
        attr: attr
    });
    can.on = can.bind;
    can.off = can.unbind;
    $.each([
        'append',
        'filter',
        'addClass',
        'remove',
        'data',
        'get',
        'has'
    ], function (i, name) {
        can[name] = function (wrapped) {
            return wrapped[name].apply(wrapped, can.makeArray(arguments).slice(1));
        };
    });
    var oldClean = $.cleanData;
    $.cleanData = function (elems) {
        $.each(elems, function (i, elem) {
            if (elem) {
                can.trigger(elem, 'removed', [], false);
            }
        });
        oldClean(elems);
    };
    var oldDomManip = $.fn.domManip, cbIndex;
    $.fn.domManip = function (args, cb1, cb2) {
        for (var i = 1; i < arguments.length; i++) {
            if (typeof arguments[i] === 'function') {
                cbIndex = i;
                break;
            }
        }
        return oldDomManip.apply(this, arguments);
    };
    $(document.createElement('div')).append(document.createElement('div'));
    $.fn.domManip = cbIndex === 2 ? function (args, table, callback) {
        return oldDomManip.call(this, args, table, function (elem) {
            var elems;
            if (elem.nodeType === 11) {
                elems = can.makeArray(elem.childNodes);
            }
            var ret = callback.apply(this, arguments);
            can.inserted(elems ? elems : [elem]);
            return ret;
        });
    } : function (args, callback) {
        return oldDomManip.call(this, args, function (elem) {
            var elems;
            if (elem.nodeType === 11) {
                elems = can.makeArray(elem.childNodes);
            }
            var ret = callback.apply(this, arguments);
            can.inserted(elems ? elems : [elem]);
            return ret;
        });
    };
    if (!can.attr.MutationObserver) {
        var oldAttr = $.attr;
        $.attr = function (el, attrName) {
            var oldValue, newValue;
            if (arguments.length >= 3) {
                oldValue = oldAttr.call(this, el, attrName);
            }
            var res = oldAttr.apply(this, arguments);
            if (arguments.length >= 3) {
                newValue = oldAttr.call(this, el, attrName);
            }
            if (newValue !== oldValue) {
                can.attr.trigger(el, attrName, oldValue);
            }
            return res;
        };
        var oldRemove = $.removeAttr;
        $.removeAttr = function (el, attrName) {
            var oldValue = oldAttr.call(this, el, attrName), res = oldRemove.apply(this, arguments);
            if (oldValue != null) {
                can.attr.trigger(el, attrName, oldValue);
            }
            return res;
        };
        $.event.special.attributes = {
            setup: function () {
                can.data(can.$(this), 'canHasAttributesBindings', true);
            },
            teardown: function () {
                $.removeData(this, 'canHasAttributesBindings');
            }
        };
    } else {
        $.event.special.attributes = {
            setup: function () {
                var self = this;
                var observer = new can.attr.MutationObserver(function (mutations) {
                        mutations.forEach(function (mutation) {
                            var copy = can.simpleExtend({}, mutation);
                            can.trigger(self, copy, []);
                        });
                    });
                observer.observe(this, {
                    attributes: true,
                    attributeOldValue: true
                });
                can.data(can.$(this), 'canAttributesObserver', observer);
            },
            teardown: function () {
                can.data(can.$(this), 'canAttributesObserver').disconnect();
                $.removeData(this, 'canAttributesObserver');
            }
        };
    }
    (function () {
        var text = '<-\n>', frag = can.buildFragment(text, document);
        if (text !== frag.childNodes[0].nodeValue) {
            var oldBuildFragment = can.buildFragment;
            can.buildFragment = function (content, context) {
                var res = oldBuildFragment(content, context);
                if (res.childNodes.length === 1 && res.childNodes[0].nodeType === 3) {
                    res.childNodes[0].nodeValue = content;
                }
                return res;
            };
        }
    }());
    $.event.special.inserted = {};
    $.event.special.removed = {};
    return can;
});
/*can@2.2.4#util/bind/bind*/
define('can@2.2.4#util/bind/bind', ['can/util/util'], function (can) {
    can.bindAndSetup = function () {
        can.addEvent.apply(this, arguments);
        if (!this._init) {
            if (!this._bindings) {
                this._bindings = 1;
                if (this._bindsetup) {
                    this._bindsetup();
                }
            } else {
                this._bindings++;
            }
        }
        return this;
    };
    can.unbindAndTeardown = function (event, handler) {
        var handlers = this.__bindEvents[event] || [];
        var handlerCount = handlers.length;
        can.removeEvent.apply(this, arguments);
        if (this._bindings === null) {
            this._bindings = 0;
        } else {
            this._bindings = this._bindings - (handlerCount - handlers.length);
        }
        if (!this._bindings && this._bindteardown) {
            this._bindteardown();
        }
        return this;
    };
    return can;
});
/*can@2.2.4#map/bubble*/
define('can@2.2.4#map/bubble', ['can/util/util'], function (can) {
    var bubble = can.bubble = {
            event: function (map, boundEventName) {
                return map.constructor._bubbleRule(boundEventName, map);
            },
            childrenOf: function (parentMap, eventName) {
                parentMap._each(function (child, prop) {
                    if (child && child.bind) {
                        bubble.toParent(child, parentMap, prop, eventName);
                    }
                });
            },
            teardownChildrenFrom: function (parentMap, eventName) {
                parentMap._each(function (child) {
                    bubble.teardownFromParent(parentMap, child, eventName);
                });
            },
            toParent: function (child, parent, prop, eventName) {
                can.listenTo.call(parent, child, eventName, function () {
                    var args = can.makeArray(arguments), ev = args.shift();
                    args[0] = (can.List && parent instanceof can.List ? parent.indexOf(child) : prop) + (args[0] ? '.' + args[0] : '');
                    ev.triggeredNS = ev.triggeredNS || {};
                    if (ev.triggeredNS[parent._cid]) {
                        return;
                    }
                    ev.triggeredNS[parent._cid] = true;
                    can.trigger(parent, ev, args);
                });
            },
            teardownFromParent: function (parent, child, eventName) {
                if (child && child.unbind) {
                    can.stopListening.call(parent, child, eventName);
                }
            },
            isBubbling: function (parent, eventName) {
                return parent._bubbleBindings && parent._bubbleBindings[eventName];
            },
            bind: function (parent, eventName) {
                if (!parent._init) {
                    var bubbleEvents = bubble.event(parent, eventName), len = bubbleEvents.length, bubbleEvent;
                    if (!parent._bubbleBindings) {
                        parent._bubbleBindings = {};
                    }
                    for (var i = 0; i < len; i++) {
                        bubbleEvent = bubbleEvents[i];
                        if (!parent._bubbleBindings[bubbleEvent]) {
                            parent._bubbleBindings[bubbleEvent] = 1;
                            bubble.childrenOf(parent, bubbleEvent);
                        } else {
                            parent._bubbleBindings[bubbleEvent]++;
                        }
                    }
                }
            },
            unbind: function (parent, eventName) {
                var bubbleEvents = bubble.event(parent, eventName), len = bubbleEvents.length, bubbleEvent;
                for (var i = 0; i < len; i++) {
                    bubbleEvent = bubbleEvents[i];
                    if (parent._bubbleBindings) {
                        parent._bubbleBindings[bubbleEvent]--;
                    }
                    if (parent._bubbleBindings && !parent._bubbleBindings[bubbleEvent]) {
                        delete parent._bubbleBindings[bubbleEvent];
                        bubble.teardownChildrenFrom(parent, bubbleEvent);
                        if (can.isEmptyObject(parent._bubbleBindings)) {
                            delete parent._bubbleBindings;
                        }
                    }
                }
            },
            add: function (parent, child, prop) {
                if (child instanceof can.Map && parent._bubbleBindings) {
                    for (var eventName in parent._bubbleBindings) {
                        if (parent._bubbleBindings[eventName]) {
                            bubble.teardownFromParent(parent, child, eventName);
                            bubble.toParent(child, parent, prop, eventName);
                        }
                    }
                }
            },
            removeMany: function (parent, children) {
                for (var i = 0, len = children.length; i < len; i++) {
                    bubble.remove(parent, children[i]);
                }
            },
            remove: function (parent, child) {
                if (child instanceof can.Map && parent._bubbleBindings) {
                    for (var eventName in parent._bubbleBindings) {
                        if (parent._bubbleBindings[eventName]) {
                            bubble.teardownFromParent(parent, child, eventName);
                        }
                    }
                }
            },
            set: function (parent, prop, value, current) {
                if (can.Map.helpers.isObservable(value)) {
                    bubble.add(parent, value, prop);
                }
                if (can.Map.helpers.isObservable(current)) {
                    bubble.remove(parent, current);
                }
                return value;
            }
        };
    return bubble;
});
/*can@2.2.4#util/string/string*/
define('can@2.2.4#util/string/string', ['can/util/util'], function (can) {
    var strUndHash = /_|-/, strColons = /\=\=/, strWords = /([A-Z]+)([A-Z][a-z])/g, strLowUp = /([a-z\d])([A-Z])/g, strDash = /([a-z\d])([A-Z])/g, strReplacer = /\{([^\}]+)\}/g, strQuote = /"/g, strSingleQuote = /'/g, strHyphenMatch = /-+(.)?/g, strCamelMatch = /[a-z][A-Z]/g, getNext = function (obj, prop, add) {
            var result = obj[prop];
            if (result === undefined && add === true) {
                result = obj[prop] = {};
            }
            return result;
        }, isContainer = function (current) {
            return /^f|^o/.test(typeof current);
        }, convertBadValues = function (content) {
            var isInvalid = content === null || content === undefined || isNaN(content) && '' + content === 'NaN';
            return '' + (isInvalid ? '' : content);
        };
    can.extend(can, {
        esc: function (content) {
            return convertBadValues(content).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(strQuote, '&#34;').replace(strSingleQuote, '&#39;');
        },
        getObject: function (name, roots, add) {
            var parts = name ? name.split('.') : [], length = parts.length, current, r = 0, i, container, rootsLength;
            roots = can.isArray(roots) ? roots : [roots || window];
            rootsLength = roots.length;
            if (!length) {
                return roots[0];
            }
            for (r; r < rootsLength; r++) {
                current = roots[r];
                container = undefined;
                for (i = 0; i < length && isContainer(current); i++) {
                    container = current;
                    current = getNext(container, parts[i]);
                }
                if (container !== undefined && current !== undefined) {
                    break;
                }
            }
            if (add === false && current !== undefined) {
                delete container[parts[i - 1]];
            }
            if (add === true && current === undefined) {
                current = roots[0];
                for (i = 0; i < length && isContainer(current); i++) {
                    current = getNext(current, parts[i], true);
                }
            }
            return current;
        },
        capitalize: function (s, cache) {
            return s.charAt(0).toUpperCase() + s.slice(1);
        },
        camelize: function (str) {
            return convertBadValues(str).replace(strHyphenMatch, function (match, chr) {
                return chr ? chr.toUpperCase() : '';
            });
        },
        hyphenate: function (str) {
            return convertBadValues(str).replace(strCamelMatch, function (str, offset) {
                return str.charAt(0) + '-' + str.charAt(1).toLowerCase();
            });
        },
        underscore: function (s) {
            return s.replace(strColons, '/').replace(strWords, '$1_$2').replace(strLowUp, '$1_$2').replace(strDash, '_').toLowerCase();
        },
        sub: function (str, data, remove) {
            var obs = [];
            str = str || '';
            obs.push(str.replace(strReplacer, function (whole, inside) {
                var ob = can.getObject(inside, data, remove === true ? false : undefined);
                if (ob === undefined || ob === null) {
                    obs = null;
                    return '';
                }
                if (isContainer(ob) && obs) {
                    obs.push(ob);
                    return '';
                }
                return '' + ob;
            }));
            return obs === null ? obs : obs.length <= 1 ? obs[0] : obs;
        },
        replacer: strReplacer,
        undHash: strUndHash
    });
    return can;
});
/*can@2.2.4#construct/construct*/
define('can@2.2.4#construct/construct', ['can/util/string/string'], function (can) {
    var initializing = 0;
    var canGetDescriptor;
    try {
        Object.getOwnPropertyDescriptor({});
        canGetDescriptor = true;
    } catch (e) {
        canGetDescriptor = false;
    }
    var getDescriptor = function (newProps, name) {
            var descriptor = Object.getOwnPropertyDescriptor(newProps, name);
            if (descriptor && (descriptor.get || descriptor.set)) {
                return descriptor;
            }
            return null;
        }, inheritGetterSetter = function (newProps, oldProps, addTo) {
            addTo = addTo || newProps;
            var descriptor;
            for (var name in newProps) {
                if (descriptor = getDescriptor(newProps, name)) {
                    this._defineProperty(addTo, oldProps, name, descriptor);
                } else {
                    can.Construct._overwrite(addTo, oldProps, name, newProps[name]);
                }
            }
        }, simpleInherit = function (newProps, oldProps, addTo) {
            addTo = addTo || newProps;
            for (var name in newProps) {
                can.Construct._overwrite(addTo, oldProps, name, newProps[name]);
            }
        };
    can.Construct = function () {
        if (arguments.length) {
            return can.Construct.extend.apply(can.Construct, arguments);
        }
    };
    can.extend(can.Construct, {
        constructorExtends: true,
        newInstance: function () {
            var inst = this.instance(), args;
            if (inst.setup) {
                args = inst.setup.apply(inst, arguments);
            }
            if (inst.init) {
                inst.init.apply(inst, args || arguments);
            }
            return inst;
        },
        _inherit: canGetDescriptor ? inheritGetterSetter : simpleInherit,
        _defineProperty: function (what, oldProps, propName, descriptor) {
            Object.defineProperty(what, propName, descriptor);
        },
        _overwrite: function (what, oldProps, propName, val) {
            what[propName] = val;
        },
        setup: function (base, fullName) {
            this.defaults = can.extend(true, {}, base.defaults, this.defaults);
        },
        instance: function () {
            initializing = 1;
            var inst = new this();
            initializing = 0;
            return inst;
        },
        extend: function (name, staticProperties, instanceProperties) {
            var fullName = name, klass = staticProperties, proto = instanceProperties;
            if (typeof fullName !== 'string') {
                proto = klass;
                klass = fullName;
                fullName = null;
            }
            if (!proto) {
                proto = klass;
                klass = null;
            }
            proto = proto || {};
            var _super_class = this, _super = this.prototype, Constructor, parts, current, _fullName, _shortName, propName, shortName, namespace, prototype;
            prototype = this.instance();
            can.Construct._inherit(proto, _super, prototype);
            if (fullName) {
                parts = fullName.split('.');
                shortName = parts.pop();
            }
            if (typeof constructorName === 'undefined') {
                Constructor = function () {
                    return init.apply(this, arguments);
                };
            }
            function init() {
                if (!initializing) {
                    return this.constructor !== Constructor && arguments.length && Constructor.constructorExtends ? Constructor.extend.apply(Constructor, arguments) : Constructor.newInstance.apply(Constructor, arguments);
                }
            }
            for (propName in _super_class) {
                if (_super_class.hasOwnProperty(propName)) {
                    Constructor[propName] = _super_class[propName];
                }
            }
            can.Construct._inherit(klass, _super_class, Constructor);
            if (fullName) {
                current = can.getObject(parts.join('.'), window, true);
                namespace = current;
                _fullName = can.underscore(fullName.replace(/\./g, '_'));
                _shortName = can.underscore(shortName);
                current[shortName] = Constructor;
            }
            can.extend(Constructor, {
                constructor: Constructor,
                prototype: prototype,
                namespace: namespace,
                _shortName: _shortName,
                fullName: fullName,
                _fullName: _fullName
            });
            if (shortName !== undefined) {
                Constructor.shortName = shortName;
            }
            Constructor.prototype.constructor = Constructor;
            var t = [_super_class].concat(can.makeArray(arguments)), args = Constructor.setup.apply(Constructor, t);
            if (Constructor.init) {
                Constructor.init.apply(Constructor, args || t);
            }
            return Constructor;
        }
    });
    can.Construct.prototype.setup = function () {
    };
    can.Construct.prototype.init = function () {
    };
    return can.Construct;
});
/*can@2.2.4#util/batch/batch*/
define('can@2.2.4#util/batch/batch', ['can/util/can'], function (can) {
    var batchNum = 1, transactions = 0, batchEvents = [], stopCallbacks = [], currentBatchEvents = null;
    can.batch = {
        start: function (batchStopHandler) {
            transactions++;
            if (batchStopHandler) {
                stopCallbacks.push(batchStopHandler);
            }
        },
        stop: function (force, callStart) {
            if (force) {
                transactions = 0;
            } else {
                transactions--;
            }
            if (transactions === 0) {
                if (currentBatchEvents !== null) {
                    return;
                }
                currentBatchEvents = batchEvents.slice(0);
                var callbacks = stopCallbacks.slice(0), i, len;
                batchEvents = [];
                stopCallbacks = [];
                can.batch.batchNum = batchNum;
                batchNum++;
                if (callStart) {
                    can.batch.start();
                }
                for (i = 0; i < currentBatchEvents.length; i++) {
                    can.dispatch.apply(currentBatchEvents[i][0], currentBatchEvents[i][1]);
                }
                currentBatchEvents = null;
                for (i = 0, len = callbacks.length; i < callbacks.length; i++) {
                    callbacks[i]();
                }
                can.batch.batchNum = undefined;
            }
        },
        trigger: function (item, event, args) {
            if (!item._init) {
                event = typeof event === 'string' ? { type: event } : event;
                if (currentBatchEvents) {
                    currentBatchEvents.push([
                        item,
                        [
                            event,
                            args
                        ]
                    ]);
                } else if (transactions === 0) {
                    return can.dispatch.call(item, event, args);
                } else {
                    event.batchNum = batchNum;
                    batchEvents.push([
                        item,
                        [
                            event,
                            args
                        ]
                    ]);
                }
            }
        },
        afterPreviousEvents: function (handler) {
            if (currentBatchEvents) {
                var obj = {};
                can.bind.call(obj, 'ready', handler);
                currentBatchEvents.push([
                    obj,
                    [
                        { type: 'ready' },
                        []
                    ]
                ]);
            } else {
                handler();
            }
        }
    };
});
/*can@2.2.4#map/map*/
define('can@2.2.4#map/map', [
    'can/util/util',
    'can/util/bind/bind',
    './bubble',
    'can/construct/construct',
    'can/util/batch/batch'
], function (can, bind, bubble) {
    var madeMap = null;
    var teardownMap = function () {
        for (var cid in madeMap) {
            if (madeMap[cid].added) {
                delete madeMap[cid].obj._cid;
            }
        }
        madeMap = null;
    };
    var getMapFromObject = function (obj) {
        return madeMap && madeMap[obj._cid] && madeMap[obj._cid].instance;
    };
    var serializeMap = null;
    var Map = can.Map = can.Construct.extend({
            setup: function () {
                can.Construct.setup.apply(this, arguments);
                if (can.Map) {
                    if (!this.defaults) {
                        this.defaults = {};
                    }
                    this._computes = [];
                    for (var prop in this.prototype) {
                        if (prop !== 'define' && prop !== 'constructor' && (typeof this.prototype[prop] !== 'function' || this.prototype[prop].prototype instanceof can.Construct)) {
                            this.defaults[prop] = this.prototype[prop];
                        } else if (this.prototype[prop].isComputed) {
                            this._computes.push(prop);
                        }
                    }
                    if (this.helpers.define) {
                        this.helpers.define(this);
                    }
                }
                if (can.List && !(this.prototype instanceof can.List)) {
                    this.List = Map.List.extend({ Map: this }, {});
                }
            },
            _bubble: bubble,
            _bubbleRule: function (eventName) {
                return eventName === 'change' || eventName.indexOf('.') >= 0 ? ['change'] : [];
            },
            _computes: [],
            bind: can.bindAndSetup,
            on: can.bindAndSetup,
            unbind: can.unbindAndTeardown,
            off: can.unbindAndTeardown,
            id: 'id',
            helpers: {
                define: null,
                attrParts: function (attr, keepKey) {
                    if (keepKey) {
                        return [attr];
                    }
                    return typeof attr === 'object' ? attr : ('' + attr).split('.');
                },
                addToMap: function (obj, instance) {
                    var teardown;
                    if (!madeMap) {
                        teardown = teardownMap;
                        madeMap = {};
                    }
                    var hasCid = obj._cid;
                    var cid = can.cid(obj);
                    if (!madeMap[cid]) {
                        madeMap[cid] = {
                            obj: obj,
                            instance: instance,
                            added: !hasCid
                        };
                    }
                    return teardown;
                },
                isObservable: function (obj) {
                    return obj instanceof can.Map || obj && obj === can.route;
                },
                canMakeObserve: function (obj) {
                    return obj && !can.isDeferred(obj) && (can.isArray(obj) || can.isPlainObject(obj));
                },
                serialize: function (map, how, where) {
                    var cid = can.cid(map), firstSerialize = false;
                    if (!serializeMap) {
                        firstSerialize = true;
                        serializeMap = {
                            attr: {},
                            serialize: {}
                        };
                    }
                    serializeMap[how][cid] = where;
                    map.each(function (val, name) {
                        var result, isObservable = Map.helpers.isObservable(val), serialized = isObservable && serializeMap[how][can.cid(val)];
                        if (serialized) {
                            result = serialized;
                        } else {
                            if (how === 'serialize') {
                                result = Map.helpers._serialize(map, name, val);
                            } else {
                                result = Map.helpers._getValue(map, name, val, how);
                            }
                        }
                        if (result !== undefined) {
                            where[name] = result;
                        }
                    });
                    can.__reading(map, '__keys');
                    if (firstSerialize) {
                        serializeMap = null;
                    }
                    return where;
                },
                _serialize: function (map, name, val) {
                    return Map.helpers._getValue(map, name, val, 'serialize');
                },
                _getValue: function (map, name, val, how) {
                    if (Map.helpers.isObservable(val)) {
                        return val[how]();
                    } else {
                        return val;
                    }
                }
            },
            keys: function (map) {
                var keys = [];
                can.__reading(map, '__keys');
                for (var keyName in map._data) {
                    keys.push(keyName);
                }
                return keys;
            }
        }, {
            setup: function (obj) {
                if (obj instanceof can.Map) {
                    obj = obj.serialize();
                }
                this._data = {};
                can.cid(this, '.map');
                this._init = 1;
                this._computedBindings = {};
                var defaultValues = this._setupDefaults(obj);
                this._setupComputes(defaultValues);
                var teardownMapping = obj && can.Map.helpers.addToMap(obj, this);
                var data = can.extend(can.extend(true, {}, defaultValues), obj);
                this.attr(data);
                if (teardownMapping) {
                    teardownMapping();
                }
                this.bind('change', can.proxy(this._changes, this));
                delete this._init;
            },
            _setupComputes: function () {
                var computes = this.constructor._computes;
                for (var i = 0, len = computes.length, prop; i < len; i++) {
                    prop = computes[i];
                    this[prop] = this[prop].clone(this);
                    this._computedBindings[prop] = { count: 0 };
                }
            },
            _setupDefaults: function () {
                return this.constructor.defaults || {};
            },
            _bindsetup: function () {
            },
            _bindteardown: function () {
            },
            _changes: function (ev, attr, how, newVal, oldVal) {
                can.batch.trigger(this, {
                    type: attr,
                    batchNum: ev.batchNum,
                    target: ev.target
                }, [
                    newVal,
                    oldVal
                ]);
            },
            _triggerChange: function (attr, how, newVal, oldVal) {
                if (bubble.isBubbling(this, 'change')) {
                    can.batch.trigger(this, {
                        type: 'change',
                        target: this
                    }, [
                        attr,
                        how,
                        newVal,
                        oldVal
                    ]);
                } else {
                    can.batch.trigger(this, attr, [
                        newVal,
                        oldVal
                    ]);
                }
                if (how === 'remove' || how === 'add') {
                    can.batch.trigger(this, {
                        type: '__keys',
                        target: this
                    });
                }
            },
            _each: function (callback) {
                var data = this.__get();
                for (var prop in data) {
                    if (data.hasOwnProperty(prop)) {
                        callback(data[prop], prop);
                    }
                }
            },
            attr: function (attr, val) {
                var type = typeof attr;
                if (type !== 'string' && type !== 'number') {
                    return this._attrs(attr, val);
                } else if (arguments.length === 1) {
                    can.__reading(this, attr);
                    return this._get(attr);
                } else {
                    this._set(attr, val);
                    return this;
                }
            },
            each: function () {
                return can.each.apply(undefined, [this].concat(can.makeArray(arguments)));
            },
            removeAttr: function (attr) {
                var isList = can.List && this instanceof can.List, parts = can.Map.helpers.attrParts(attr), prop = parts.shift(), current = isList ? this[prop] : this._data[prop];
                if (parts.length && current) {
                    return current.removeAttr(parts);
                } else {
                    if (typeof attr === 'string' && !!~attr.indexOf('.')) {
                        prop = attr;
                    }
                    this._remove(prop, current);
                    return current;
                }
            },
            _remove: function (prop, current) {
                if (prop in this._data) {
                    delete this._data[prop];
                    if (!(prop in this.constructor.prototype)) {
                        delete this[prop];
                    }
                    this._triggerChange(prop, 'remove', undefined, current);
                }
            },
            _get: function (attr) {
                attr = '' + attr;
                var dotIndex = attr.indexOf('.');
                if (dotIndex >= 0) {
                    var value = this.__get(attr);
                    if (value !== undefined) {
                        return value;
                    }
                    var first = attr.substr(0, dotIndex), second = attr.substr(dotIndex + 1), current = this.__get(first);
                    return current && current._get ? current._get(second) : undefined;
                } else {
                    return this.__get(attr);
                }
            },
            __get: function (attr) {
                if (attr) {
                    if (this._computedBindings[attr]) {
                        return this[attr]();
                    } else {
                        return this._data[attr];
                    }
                } else {
                    return this._data;
                }
            },
            __type: function (value, prop) {
                if (!(value instanceof can.Map) && can.Map.helpers.canMakeObserve(value)) {
                    var cached = getMapFromObject(value);
                    if (cached) {
                        return cached;
                    }
                    if (can.isArray(value)) {
                        var List = can.List;
                        return new List(value);
                    } else {
                        var Map = this.constructor.Map || can.Map;
                        return new Map(value);
                    }
                }
                return value;
            },
            _set: function (attr, value, keepKey) {
                attr = '' + attr;
                var dotIndex = attr.indexOf('.'), current;
                if (!keepKey && dotIndex >= 0) {
                    var first = attr.substr(0, dotIndex), second = attr.substr(dotIndex + 1);
                    current = this._init ? undefined : this.__get(first);
                    if (Map.helpers.isObservable(current)) {
                        current._set(second, value);
                    } else {
                        throw 'can.Map: Object does not exist';
                    }
                } else {
                    if (this.__convert) {
                        value = this.__convert(attr, value);
                    }
                    current = this._init ? undefined : this.__get(attr);
                    this.__set(attr, this.__type(value, attr), current);
                }
            },
            __set: function (prop, value, current) {
                if (value !== current) {
                    var changeType = current !== undefined || this.__get().hasOwnProperty(prop) ? 'set' : 'add';
                    this.___set(prop, this.constructor._bubble.set(this, prop, value, current));
                    if (!this._computedBindings[prop]) {
                        this._triggerChange(prop, changeType, value, current);
                    }
                    if (current) {
                        this.constructor._bubble.teardownFromParent(this, current);
                    }
                }
            },
            ___set: function (prop, val) {
                if (this._computedBindings[prop]) {
                    this[prop](val);
                } else {
                    this._data[prop] = val;
                }
                if (typeof this.constructor.prototype[prop] !== 'function' && !this._computedBindings[prop]) {
                    this[prop] = val;
                }
            },
            bind: function (eventName, handler) {
                var computedBinding = this._computedBindings && this._computedBindings[eventName];
                if (computedBinding) {
                    if (!computedBinding.count) {
                        computedBinding.count = 1;
                        var self = this;
                        computedBinding.handler = function (ev, newVal, oldVal) {
                            can.batch.trigger(self, {
                                type: eventName,
                                batchNum: ev.batchNum,
                                target: self
                            }, [
                                newVal,
                                oldVal
                            ]);
                        };
                        this[eventName].bind('change', computedBinding.handler);
                    } else {
                        computedBinding.count++;
                    }
                }
                this.constructor._bubble.bind(this, eventName);
                return can.bindAndSetup.apply(this, arguments);
            },
            unbind: function (eventName, handler) {
                var computedBinding = this._computedBindings && this._computedBindings[eventName];
                if (computedBinding) {
                    if (computedBinding.count === 1) {
                        computedBinding.count = 0;
                        this[eventName].unbind('change', computedBinding.handler);
                        delete computedBinding.handler;
                    } else {
                        computedBinding.count--;
                    }
                }
                this.constructor._bubble.unbind(this, eventName);
                return can.unbindAndTeardown.apply(this, arguments);
            },
            serialize: function () {
                return can.Map.helpers.serialize(this, 'serialize', {});
            },
            _attrs: function (props, remove) {
                if (props === undefined) {
                    return Map.helpers.serialize(this, 'attr', {});
                }
                props = can.simpleExtend({}, props);
                var prop, self = this, newVal;
                can.batch.start();
                this.each(function (curVal, prop) {
                    if (prop === '_cid') {
                        return;
                    }
                    newVal = props[prop];
                    if (newVal === undefined) {
                        if (remove) {
                            self.removeAttr(prop);
                        }
                        return;
                    }
                    if (self.__convert) {
                        newVal = self.__convert(prop, newVal);
                    }
                    if (Map.helpers.isObservable(newVal)) {
                        self.__set(prop, self.__type(newVal, prop), curVal);
                    } else if (Map.helpers.isObservable(curVal) && Map.helpers.canMakeObserve(newVal)) {
                        curVal.attr(newVal, remove);
                    } else if (curVal !== newVal) {
                        self.__set(prop, self.__type(newVal, prop), curVal);
                    }
                    delete props[prop];
                });
                for (prop in props) {
                    if (prop !== '_cid') {
                        newVal = props[prop];
                        this._set(prop, newVal, true);
                    }
                }
                can.batch.stop();
                return this;
            },
            compute: function (prop) {
                if (can.isFunction(this.constructor.prototype[prop])) {
                    return can.compute(this[prop], this);
                } else {
                    var reads = prop.split('.'), last = reads.length - 1, options = { args: [] };
                    return can.compute(function (newVal) {
                        if (arguments.length) {
                            can.compute.read(this, reads.slice(0, last)).value.attr(reads[last], newVal);
                        } else {
                            return can.compute.read(this, reads, options).value;
                        }
                    }, this);
                }
            }
        });
    Map.prototype.on = Map.prototype.bind;
    Map.prototype.off = Map.prototype.unbind;
    return Map;
});
/*can@2.2.4#list/list*/
define('can@2.2.4#list/list', [
    'can/util/util',
    'can/map/map',
    'can/map/bubble'
], function (can, Map, bubble) {
    var splice = [].splice, spliceRemovesProps = function () {
            var obj = {
                    0: 'a',
                    length: 1
                };
            splice.call(obj, 0, 1);
            return !obj[0];
        }();
    var list = Map.extend({ Map: Map }, {
            setup: function (instances, options) {
                this.length = 0;
                can.cid(this, '.map');
                this._init = 1;
                this._computedBindings = {};
                this._setupComputes();
                instances = instances || [];
                var teardownMapping;
                if (can.isDeferred(instances)) {
                    this.replace(instances);
                } else {
                    teardownMapping = instances.length && can.Map.helpers.addToMap(instances, this);
                    this.push.apply(this, can.makeArray(instances || []));
                }
                if (teardownMapping) {
                    teardownMapping();
                }
                this.bind('change', can.proxy(this._changes, this));
                can.simpleExtend(this, options);
                delete this._init;
            },
            _triggerChange: function (attr, how, newVal, oldVal) {
                Map.prototype._triggerChange.apply(this, arguments);
                var index = +attr;
                if (!~('' + attr).indexOf('.') && !isNaN(index)) {
                    if (how === 'add') {
                        can.batch.trigger(this, how, [
                            newVal,
                            index
                        ]);
                        can.batch.trigger(this, 'length', [this.length]);
                    } else if (how === 'remove') {
                        can.batch.trigger(this, how, [
                            oldVal,
                            index
                        ]);
                        can.batch.trigger(this, 'length', [this.length]);
                    } else {
                        can.batch.trigger(this, how, [
                            newVal,
                            index
                        ]);
                    }
                }
            },
            __get: function (attr) {
                if (attr) {
                    if (this[attr] && this[attr].isComputed && can.isFunction(this.constructor.prototype[attr])) {
                        return this[attr]();
                    } else {
                        return this[attr];
                    }
                } else {
                    return this;
                }
            },
            __set: function (prop, value, current) {
                prop = isNaN(+prop) || prop % 1 ? prop : +prop;
                if (typeof prop === 'number' && prop > this.length - 1) {
                    var newArr = new Array(prop + 1 - this.length);
                    newArr[newArr.length - 1] = value;
                    this.push.apply(this, newArr);
                    return newArr;
                }
                return can.Map.prototype.__set.call(this, '' + prop, value, current);
            },
            ___set: function (attr, val) {
                this[attr] = val;
                if (+attr >= this.length) {
                    this.length = +attr + 1;
                }
            },
            _remove: function (prop, current) {
                if (isNaN(+prop)) {
                    delete this[prop];
                    this._triggerChange(prop, 'remove', undefined, current);
                } else {
                    this.splice(prop, 1);
                }
            },
            _each: function (callback) {
                var data = this.__get();
                for (var i = 0; i < data.length; i++) {
                    callback(data[i], i);
                }
            },
            serialize: function () {
                return Map.helpers.serialize(this, 'serialize', []);
            },
            splice: function (index, howMany) {
                var args = can.makeArray(arguments), added = [], i, len, listIndex, allSame = args.length > 2;
                index = index || 0;
                for (i = 0, len = args.length - 2; i < len; i++) {
                    listIndex = i + 2;
                    args[listIndex] = this.__type(args[listIndex], listIndex);
                    added.push(args[listIndex]);
                    if (this[i + index] !== args[listIndex]) {
                        allSame = false;
                    }
                }
                if (allSame) {
                    return added;
                }
                if (howMany === undefined) {
                    howMany = args[1] = this.length - index;
                }
                var removed = splice.apply(this, args);
                if (!spliceRemovesProps) {
                    for (i = this.length; i < removed.length + this.length; i++) {
                        delete this[i];
                    }
                }
                can.batch.start();
                if (howMany > 0) {
                    bubble.removeMany(this, removed);
                    this._triggerChange('' + index, 'remove', undefined, removed);
                }
                if (args.length > 2) {
                    for (i = 0, len = added.length; i < len; i++) {
                        bubble.set(this, i, added[i]);
                    }
                    this._triggerChange('' + index, 'add', added, removed);
                }
                can.batch.stop();
                return removed;
            },
            _attrs: function (items, remove) {
                if (items === undefined) {
                    return Map.helpers.serialize(this, 'attr', []);
                }
                items = can.makeArray(items);
                can.batch.start();
                this._updateAttrs(items, remove);
                can.batch.stop();
            },
            _updateAttrs: function (items, remove) {
                var len = Math.min(items.length, this.length);
                for (var prop = 0; prop < len; prop++) {
                    var curVal = this[prop], newVal = items[prop];
                    if (Map.helpers.isObservable(curVal) && Map.helpers.canMakeObserve(newVal)) {
                        curVal.attr(newVal, remove);
                    } else if (curVal !== newVal) {
                        this._set(prop, newVal);
                    } else {
                    }
                }
                if (items.length > this.length) {
                    this.push.apply(this, items.slice(this.length));
                } else if (items.length < this.length && remove) {
                    this.splice(items.length);
                }
            }
        }), getArgs = function (args) {
            return args[0] && can.isArray(args[0]) ? args[0] : can.makeArray(args);
        };
    can.each({
        push: 'length',
        unshift: 0
    }, function (where, name) {
        var orig = [][name];
        list.prototype[name] = function () {
            var args = [], len = where ? this.length : 0, i = arguments.length, res, val;
            while (i--) {
                val = arguments[i];
                args[i] = bubble.set(this, i, this.__type(val, i));
            }
            res = orig.apply(this, args);
            if (!this.comparator || args.length) {
                this._triggerChange('' + len, 'add', args, undefined);
            }
            return res;
        };
    });
    can.each({
        pop: 'length',
        shift: 0
    }, function (where, name) {
        list.prototype[name] = function () {
            if (!this.length) {
                return undefined;
            }
            var args = getArgs(arguments), len = where && this.length ? this.length - 1 : 0;
            var res = [][name].apply(this, args);
            this._triggerChange('' + len, 'remove', undefined, [res]);
            if (res && res.unbind) {
                bubble.remove(this, res);
            }
            return res;
        };
    });
    can.extend(list.prototype, {
        indexOf: function (item, fromIndex) {
            this.attr('length');
            return can.inArray(item, this, fromIndex);
        },
        join: function () {
            return [].join.apply(this.attr(), arguments);
        },
        reverse: function () {
            var list = [].reverse.call(can.makeArray(this));
            this.replace(list);
        },
        slice: function () {
            var temp = Array.prototype.slice.apply(this, arguments);
            return new this.constructor(temp);
        },
        concat: function () {
            var args = [];
            can.each(can.makeArray(arguments), function (arg, i) {
                args[i] = arg instanceof can.List ? arg.serialize() : arg;
            });
            return new this.constructor(Array.prototype.concat.apply(this.serialize(), args));
        },
        forEach: function (cb, thisarg) {
            return can.each(this, cb, thisarg || this);
        },
        replace: function (newList) {
            if (can.isDeferred(newList)) {
                newList.then(can.proxy(this.replace, this));
            } else {
                this.splice.apply(this, [
                    0,
                    this.length
                ].concat(can.makeArray(newList || [])));
            }
            return this;
        },
        filter: function (callback, thisArg) {
            var filteredList = new can.List(), self = this, filtered;
            this.each(function (item, index, list) {
                filtered = callback.call(thisArg | self, item, index, self);
                if (filtered) {
                    filteredList.push(item);
                }
            });
            return filteredList;
        }
    });
    can.List = Map.List = list;
    return can.List;
});
/*can@2.2.4#util/string/deparam/deparam*/
define('can@2.2.4#util/string/deparam/deparam', [
    'can/util/util',
    'can/util/string/string'
], function (can) {
    var digitTest = /^\d+$/, keyBreaker = /([^\[\]]+)|(\[\])/g, paramTest = /([^?#]*)(#.*)?$/, prep = function (str) {
            return decodeURIComponent(str.replace(/\+/g, ' '));
        };
    can.extend(can, {
        deparam: function (params) {
            var data = {}, pairs, lastPart;
            if (params && paramTest.test(params)) {
                pairs = params.split('&');
                can.each(pairs, function (pair) {
                    var parts = pair.split('='), key = prep(parts.shift()), value = prep(parts.join('=')), current = data;
                    if (key) {
                        parts = key.match(keyBreaker);
                        for (var j = 0, l = parts.length - 1; j < l; j++) {
                            if (!current[parts[j]]) {
                                current[parts[j]] = digitTest.test(parts[j + 1]) || parts[j + 1] === '[]' ? [] : {};
                            }
                            current = current[parts[j]];
                        }
                        lastPart = parts.pop();
                        if (lastPart === '[]') {
                            current.push(value);
                        } else {
                            current[lastPart] = value;
                        }
                    }
                });
            }
            return data;
        }
    });
    return can;
});
/*can@2.2.4#route/route*/
define('can@2.2.4#route/route', [
    'can/util/util',
    'can/map/map',
    'can/list/list',
    'can/util/string/deparam/deparam'
], function (can) {
    var matcher = /\:([\w\.]+)/g, paramsMatcher = /^(?:&[^=]+=[^&]*)+/, makeProps = function (props) {
            var tags = [];
            can.each(props, function (val, name) {
                tags.push((name === 'className' ? 'class' : name) + '="' + (name === 'href' ? val : can.esc(val)) + '"');
            });
            return tags.join(' ');
        }, matchesData = function (route, data) {
            var count = 0, i = 0, defaults = {};
            for (var name in route.defaults) {
                if (route.defaults[name] === data[name]) {
                    defaults[name] = 1;
                    count++;
                }
            }
            for (; i < route.names.length; i++) {
                if (!data.hasOwnProperty(route.names[i])) {
                    return -1;
                }
                if (!defaults[route.names[i]]) {
                    count++;
                }
            }
            return count;
        }, location = window.location, wrapQuote = function (str) {
            return (str + '').replace(/([.?*+\^$\[\]\\(){}|\-])/g, '\\$1');
        }, each = can.each, extend = can.extend, stringify = function (obj) {
            if (obj && typeof obj === 'object') {
                if (obj instanceof can.Map) {
                    obj = obj.attr();
                } else {
                    obj = can.isFunction(obj.slice) ? obj.slice() : can.extend({}, obj);
                }
                can.each(obj, function (val, prop) {
                    obj[prop] = stringify(val);
                });
            } else if (obj !== undefined && obj !== null && can.isFunction(obj.toString)) {
                obj = obj.toString();
            }
            return obj;
        }, removeBackslash = function (str) {
            return str.replace(/\\/g, '');
        }, timer, curParams, lastHash, changingData, changedAttrs = [], onRouteDataChange = function (ev, attr, how, newval) {
            changingData = 1;
            changedAttrs.push(attr);
            clearTimeout(timer);
            timer = setTimeout(function () {
                changingData = 0;
                var serialized = can.route.data.serialize(), path = can.route.param(serialized, true);
                can.route._call('setURL', path, changedAttrs);
                can.batch.trigger(eventsObject, '__url', [
                    path,
                    lastHash
                ]);
                lastHash = path;
                changedAttrs = [];
            }, 10);
        }, eventsObject = can.extend({}, can.event);
    can.route = function (url, defaults) {
        var root = can.route._call('root');
        if (root.lastIndexOf('/') === root.length - 1 && url.indexOf('/') === 0) {
            url = url.substr(1);
        }
        defaults = defaults || {};
        var names = [], res, test = '', lastIndex = matcher.lastIndex = 0, next, querySeparator = can.route._call('querySeparator'), matchSlashes = can.route._call('matchSlashes');
        while (res = matcher.exec(url)) {
            names.push(res[1]);
            test += removeBackslash(url.substring(lastIndex, matcher.lastIndex - res[0].length));
            next = '\\' + (removeBackslash(url.substr(matcher.lastIndex, 1)) || querySeparator + (matchSlashes ? '' : '|/'));
            test += '([^' + next + ']' + (defaults[res[1]] ? '*' : '+') + ')';
            lastIndex = matcher.lastIndex;
        }
        test += url.substr(lastIndex).replace('\\', '');
        can.route.routes[url] = {
            test: new RegExp('^' + test + '($|' + wrapQuote(querySeparator) + ')'),
            route: url,
            names: names,
            defaults: defaults,
            length: url.split('/').length
        };
        return can.route;
    };
    extend(can.route, {
        param: function (data, _setRoute) {
            var route, matches = 0, matchCount, routeName = data.route, propCount = 0;
            delete data.route;
            each(data, function () {
                propCount++;
            });
            each(can.route.routes, function (temp, name) {
                matchCount = matchesData(temp, data);
                if (matchCount > matches) {
                    route = temp;
                    matches = matchCount;
                }
                if (matchCount >= propCount) {
                    return false;
                }
            });
            if (can.route.routes[routeName] && matchesData(can.route.routes[routeName], data) === matches) {
                route = can.route.routes[routeName];
            }
            if (route) {
                var cpy = extend({}, data), res = route.route.replace(matcher, function (whole, name) {
                        delete cpy[name];
                        return data[name] === route.defaults[name] ? '' : encodeURIComponent(data[name]);
                    }).replace('\\', ''), after;
                each(route.defaults, function (val, name) {
                    if (cpy[name] === val) {
                        delete cpy[name];
                    }
                });
                after = can.param(cpy);
                if (_setRoute) {
                    can.route.attr('route', route.route);
                }
                return res + (after ? can.route._call('querySeparator') + after : '');
            }
            return can.isEmptyObject(data) ? '' : can.route._call('querySeparator') + can.param(data);
        },
        deparam: function (url) {
            var root = can.route._call('root');
            if (root.lastIndexOf('/') === root.length - 1 && url.indexOf('/') === 0) {
                url = url.substr(1);
            }
            var route = { length: -1 }, querySeparator = can.route._call('querySeparator'), paramsMatcher = can.route._call('paramsMatcher');
            each(can.route.routes, function (temp, name) {
                if (temp.test.test(url) && temp.length > route.length) {
                    route = temp;
                }
            });
            if (route.length > -1) {
                var parts = url.match(route.test), start = parts.shift(), remainder = url.substr(start.length - (parts[parts.length - 1] === querySeparator ? 1 : 0)), obj = remainder && paramsMatcher.test(remainder) ? can.deparam(remainder.slice(1)) : {};
                obj = extend(true, {}, route.defaults, obj);
                each(parts, function (part, i) {
                    if (part && part !== querySeparator) {
                        obj[route.names[i]] = decodeURIComponent(part);
                    }
                });
                obj.route = route.route;
                return obj;
            }
            if (url.charAt(0) !== querySeparator) {
                url = querySeparator + url;
            }
            return paramsMatcher.test(url) ? can.deparam(url.slice(1)) : {};
        },
        data: new can.Map({}),
        map: function (data) {
            var appState;
            if (data.prototype instanceof can.Map) {
                appState = new data();
            } else {
                appState = data;
            }
            can.route.data = appState;
        },
        routes: {},
        ready: function (val) {
            if (val !== true) {
                can.route._setup();
                can.route.setState();
            }
            return can.route;
        },
        url: function (options, merge) {
            if (merge) {
                options = can.extend({}, can.route.deparam(can.route._call('matchingPartOfURL')), options);
            }
            return can.route._call('root') + can.route.param(options);
        },
        link: function (name, options, props, merge) {
            return '<a ' + makeProps(extend({ href: can.route.url(options, merge) }, props)) + '>' + name + '</a>';
        },
        current: function (options) {
            can.__reading(eventsObject, '__url');
            return this._call('matchingPartOfURL') === can.route.param(options);
        },
        bindings: {
            hashchange: {
                paramsMatcher: paramsMatcher,
                querySeparator: '&',
                matchSlashes: false,
                bind: function () {
                    can.bind.call(window, 'hashchange', setState);
                },
                unbind: function () {
                    can.unbind.call(window, 'hashchange', setState);
                },
                matchingPartOfURL: function () {
                    return location.href.split(/#!?/)[1] || '';
                },
                setURL: function (path) {
                    if (location.hash !== '#' + path) {
                        location.hash = '!' + path;
                    }
                    return path;
                },
                root: '#!'
            }
        },
        defaultBinding: 'hashchange',
        currentBinding: null,
        _setup: function () {
            if (!can.route.currentBinding) {
                can.route._call('bind');
                can.route.bind('change', onRouteDataChange);
                can.route.currentBinding = can.route.defaultBinding;
            }
        },
        _teardown: function () {
            if (can.route.currentBinding) {
                can.route._call('unbind');
                can.route.unbind('change', onRouteDataChange);
                can.route.currentBinding = null;
            }
            clearTimeout(timer);
            changingData = 0;
        },
        _call: function () {
            var args = can.makeArray(arguments), prop = args.shift(), binding = can.route.bindings[can.route.currentBinding || can.route.defaultBinding], method = binding[prop];
            if (method.apply) {
                return method.apply(binding, args);
            } else {
                return method;
            }
        }
    });
    each([
        'bind',
        'unbind',
        'on',
        'off',
        'delegate',
        'undelegate',
        'removeAttr',
        'compute',
        '_get',
        '__get',
        'each'
    ], function (name) {
        can.route[name] = function () {
            if (!can.route.data[name]) {
                return;
            }
            return can.route.data[name].apply(can.route.data, arguments);
        };
    });
    can.route.attr = function (attr, val) {
        var type = typeof attr, newArguments;
        if (val === undefined) {
            newArguments = arguments;
        } else if (type !== 'string' && type !== 'number') {
            newArguments = [
                stringify(attr),
                val
            ];
        } else {
            newArguments = [
                attr,
                stringify(val)
            ];
        }
        return can.route.data.attr.apply(can.route.data, newArguments);
    };
    var setState = can.route.setState = function () {
            var hash = can.route._call('matchingPartOfURL');
            var oldParams = curParams;
            curParams = can.route.deparam(hash);
            if (!changingData || hash !== lastHash) {
                can.batch.start();
                recursiveClean(oldParams, curParams, can.route.data);
                can.route.attr(curParams);
                can.batch.trigger(eventsObject, '__url', [
                    hash,
                    lastHash
                ]);
                can.batch.stop();
            }
        };
    var recursiveClean = function (old, cur, data) {
        for (var attr in old) {
            if (cur[attr] === undefined) {
                data.removeAttr(attr);
            } else if (Object.prototype.toString.call(old[attr]) === '[object Object]') {
                recursiveClean(old[attr], cur[attr], data.attr(attr));
            }
        }
    };
    return can.route;
});
/*can@2.2.4#control/control*/
define('can@2.2.4#control/control', [
    'can/util/util',
    'can/construct/construct'
], function (can) {
    var bind = function (el, ev, callback) {
            can.bind.call(el, ev, callback);
            return function () {
                can.unbind.call(el, ev, callback);
            };
        }, isFunction = can.isFunction, extend = can.extend, each = can.each, slice = [].slice, paramReplacer = /\{([^\}]+)\}/g, special = can.getObject('$.event.special', [can]) || {}, delegate = function (el, selector, ev, callback) {
            can.delegate.call(el, selector, ev, callback);
            return function () {
                can.undelegate.call(el, selector, ev, callback);
            };
        }, binder = function (el, ev, callback, selector) {
            return selector ? delegate(el, can.trim(selector), ev, callback) : bind(el, ev, callback);
        }, basicProcessor;
    var Control = can.Control = can.Construct({
            setup: function () {
                can.Construct.setup.apply(this, arguments);
                if (can.Control) {
                    var control = this, funcName;
                    control.actions = {};
                    for (funcName in control.prototype) {
                        if (control._isAction(funcName)) {
                            control.actions[funcName] = control._action(funcName);
                        }
                    }
                }
            },
            _shifter: function (context, name) {
                var method = typeof name === 'string' ? context[name] : name;
                if (!isFunction(method)) {
                    method = context[method];
                }
                return function () {
                    context.called = name;
                    return method.apply(context, [this.nodeName ? can.$(this) : this].concat(slice.call(arguments, 0)));
                };
            },
            _isAction: function (methodName) {
                var val = this.prototype[methodName], type = typeof val;
                return methodName !== 'constructor' && (type === 'function' || type === 'string' && isFunction(this.prototype[val])) && !!(special[methodName] || processors[methodName] || /[^\w]/.test(methodName));
            },
            _action: function (methodName, options) {
                paramReplacer.lastIndex = 0;
                if (options || !paramReplacer.test(methodName)) {
                    var convertedName = options ? can.sub(methodName, this._lookup(options)) : methodName;
                    if (!convertedName) {
                        return null;
                    }
                    var arr = can.isArray(convertedName), name = arr ? convertedName[1] : convertedName, parts = name.split(/\s+/g), event = parts.pop();
                    return {
                        processor: processors[event] || basicProcessor,
                        parts: [
                            name,
                            parts.join(' '),
                            event
                        ],
                        delegate: arr ? convertedName[0] : undefined
                    };
                }
            },
            _lookup: function (options) {
                return [
                    options,
                    window
                ];
            },
            processors: {},
            defaults: {}
        }, {
            setup: function (element, options) {
                var cls = this.constructor, pluginname = cls.pluginName || cls._fullName, arr;
                this.element = can.$(element);
                if (pluginname && pluginname !== 'can_control') {
                    this.element.addClass(pluginname);
                }
                arr = can.data(this.element, 'controls');
                if (!arr) {
                    arr = [];
                    can.data(this.element, 'controls', arr);
                }
                arr.push(this);
                this.options = extend({}, cls.defaults, options);
                this.on();
                return [
                    this.element,
                    this.options
                ];
            },
            on: function (el, selector, eventName, func) {
                if (!el) {
                    this.off();
                    var cls = this.constructor, bindings = this._bindings, actions = cls.actions, element = this.element, destroyCB = can.Control._shifter(this, 'destroy'), funcName, ready;
                    for (funcName in actions) {
                        if (actions.hasOwnProperty(funcName)) {
                            ready = actions[funcName] || cls._action(funcName, this.options, this);
                            if (ready) {
                                bindings.control[funcName] = ready.processor(ready.delegate || element, ready.parts[2], ready.parts[1], funcName, this);
                            }
                        }
                    }
                    can.bind.call(element, 'removed', destroyCB);
                    bindings.user.push(function (el) {
                        can.unbind.call(el, 'removed', destroyCB);
                    });
                    return bindings.user.length;
                }
                if (typeof el === 'string') {
                    func = eventName;
                    eventName = selector;
                    selector = el;
                    el = this.element;
                }
                if (func === undefined) {
                    func = eventName;
                    eventName = selector;
                    selector = null;
                }
                if (typeof func === 'string') {
                    func = can.Control._shifter(this, func);
                }
                this._bindings.user.push(binder(el, eventName, func, selector));
                return this._bindings.user.length;
            },
            off: function () {
                var el = this.element[0], bindings = this._bindings;
                if (bindings) {
                    each(bindings.user || [], function (value) {
                        value(el);
                    });
                    each(bindings.control || {}, function (value) {
                        value(el);
                    });
                }
                this._bindings = {
                    user: [],
                    control: {}
                };
            },
            destroy: function () {
                if (this.element === null) {
                    return;
                }
                var Class = this.constructor, pluginName = Class.pluginName || Class._fullName, controls;
                this.off();
                if (pluginName && pluginName !== 'can_control') {
                    this.element.removeClass(pluginName);
                }
                controls = can.data(this.element, 'controls');
                controls.splice(can.inArray(this, controls), 1);
                can.trigger(this, 'destroyed');
                this.element = null;
            }
        });
    var processors = can.Control.processors;
    basicProcessor = function (el, event, selector, methodName, control) {
        return binder(el, event, can.Control._shifter(control, methodName), selector);
    };
    each([
        'change',
        'click',
        'contextmenu',
        'dblclick',
        'keydown',
        'keyup',
        'keypress',
        'mousedown',
        'mousemove',
        'mouseout',
        'mouseover',
        'mouseup',
        'reset',
        'resize',
        'scroll',
        'select',
        'submit',
        'focusin',
        'focusout',
        'mouseenter',
        'mouseleave',
        'touchstart',
        'touchmove',
        'touchcancel',
        'touchend',
        'touchleave',
        'inserted',
        'removed'
    ], function (v) {
        processors[v] = basicProcessor;
    });
    return Control;
});
/*can@2.2.4#control/route/route*/
define('can@2.2.4#control/route/route', [
    'can/util/util',
    'can/route/route',
    'can/control/control'
], function (can) {
    can.Control.processors.route = function (el, event, selector, funcName, controller) {
        selector = selector || '';
        if (!can.route.routes[selector]) {
            if (selector[0] === '/') {
                selector = selector.substring(1);
            }
            can.route(selector);
        }
        var batchNum, check = function (ev, attr, how) {
                if (can.route.attr('route') === selector && (ev.batchNum === undefined || ev.batchNum !== batchNum)) {
                    batchNum = ev.batchNum;
                    var d = can.route.attr();
                    delete d.route;
                    if (can.isFunction(controller[funcName])) {
                        controller[funcName](d);
                    } else {
                        controller[controller[funcName]](d);
                    }
                }
            };
        can.route.bind('change', check);
        return function () {
            can.route.unbind('change', check);
        };
    };
    return can;
});
/*can@2.2.4#model/model*/
define('can@2.2.4#model/model', [
    'can/util/util',
    'can/map/map',
    'can/list/list'
], function (can) {
    var pipe = function (def, thisArg, func) {
            var d = new can.Deferred();
            def.then(function () {
                var args = can.makeArray(arguments), success = true;
                try {
                    args[0] = func.apply(thisArg, args);
                } catch (e) {
                    success = false;
                    d.rejectWith(d, [e].concat(args));
                }
                if (success) {
                    d.resolveWith(d, args);
                }
            }, function () {
                d.rejectWith(this, arguments);
            });
            if (typeof def.abort === 'function') {
                d.abort = function () {
                    return def.abort();
                };
            }
            return d;
        }, modelNum = 0, getId = function (inst) {
            can.__reading(inst, inst.constructor.id);
            return inst.__get(inst.constructor.id);
        }, ajax = function (ajaxOb, data, type, dataType, success, error) {
            var params = {};
            if (typeof ajaxOb === 'string') {
                var parts = ajaxOb.split(/\s+/);
                params.url = parts.pop();
                if (parts.length) {
                    params.type = parts.pop();
                }
            } else {
                can.extend(params, ajaxOb);
            }
            params.data = typeof data === 'object' && !can.isArray(data) ? can.extend(params.data || {}, data) : data;
            params.url = can.sub(params.url, params.data, true);
            return can.ajax(can.extend({
                type: type || 'post',
                dataType: dataType || 'json',
                success: success,
                error: error
            }, params));
        }, makeRequest = function (modelObj, type, success, error, method) {
            var args;
            if (can.isArray(modelObj)) {
                args = modelObj[1];
                modelObj = modelObj[0];
            } else {
                args = modelObj.serialize();
            }
            args = [args];
            var deferred, model = modelObj.constructor, jqXHR;
            if (type === 'update' || type === 'destroy') {
                args.unshift(getId(modelObj));
            }
            jqXHR = model[type].apply(model, args);
            deferred = pipe(jqXHR, modelObj, function (data) {
                modelObj[method || type + 'd'](data, jqXHR);
                return modelObj;
            });
            if (jqXHR.abort) {
                deferred.abort = function () {
                    jqXHR.abort();
                };
            }
            deferred.then(success, error);
            return deferred;
        }, converters = {
            models: function (instancesRawData, oldList, xhr) {
                can.Model._reqs++;
                if (!instancesRawData) {
                    return;
                }
                if (instancesRawData instanceof this.List) {
                    return instancesRawData;
                }
                var self = this, tmp = [], ListClass = self.List || ML, modelList = oldList instanceof can.List ? oldList : new ListClass(), rawDataIsList = instancesRawData instanceof ML, raw = rawDataIsList ? instancesRawData.serialize() : instancesRawData;
                raw = self.parseModels(raw, xhr);
                if (raw.data) {
                    instancesRawData = raw;
                    raw = raw.data;
                }
                if (typeof raw === 'undefined') {
                    throw new Error('Could not get any raw data while converting using .models');
                }
                if (modelList.length) {
                    modelList.splice(0);
                }
                can.each(raw, function (rawPart) {
                    tmp.push(self.model(rawPart, xhr));
                });
                modelList.push.apply(modelList, tmp);
                if (!can.isArray(instancesRawData)) {
                    can.each(instancesRawData, function (val, prop) {
                        if (prop !== 'data') {
                            modelList.attr(prop, val);
                        }
                    });
                }
                setTimeout(can.proxy(this._clean, this), 1);
                return modelList;
            },
            model: function (attributes, oldModel, xhr) {
                if (!attributes) {
                    return;
                }
                if (typeof attributes.serialize === 'function') {
                    attributes = attributes.serialize();
                } else {
                    attributes = this.parseModel(attributes, xhr);
                }
                var id = attributes[this.id];
                if ((id || id === 0) && this.store[id]) {
                    oldModel = this.store[id];
                }
                var model = oldModel && can.isFunction(oldModel.attr) ? oldModel.attr(attributes, this.removeAttr || false) : new this(attributes);
                return model;
            }
        }, makeParser = {
            parseModel: function (prop) {
                return function (attributes) {
                    return prop ? can.getObject(prop, attributes) : attributes;
                };
            },
            parseModels: function (prop) {
                return function (attributes) {
                    if (can.isArray(attributes)) {
                        return attributes;
                    }
                    prop = prop || 'data';
                    var result = can.getObject(prop, attributes);
                    if (!can.isArray(result)) {
                        throw new Error('Could not get any raw data while converting using .models');
                    }
                    return result;
                };
            }
        }, ajaxMethods = {
            create: {
                url: '_shortName',
                type: 'post'
            },
            update: {
                data: function (id, attrs) {
                    attrs = attrs || {};
                    var identity = this.id;
                    if (attrs[identity] && attrs[identity] !== id) {
                        attrs['new' + can.capitalize(id)] = attrs[identity];
                        delete attrs[identity];
                    }
                    attrs[identity] = id;
                    return attrs;
                },
                type: 'put'
            },
            destroy: {
                type: 'delete',
                data: function (id, attrs) {
                    attrs = attrs || {};
                    attrs.id = attrs[this.id] = id;
                    return attrs;
                }
            },
            findAll: { url: '_shortName' },
            findOne: {}
        }, ajaxMaker = function (ajaxMethod, str) {
            return function (data) {
                data = ajaxMethod.data ? ajaxMethod.data.apply(this, arguments) : data;
                return ajax(str || this[ajaxMethod.url || '_url'], data, ajaxMethod.type || 'get');
            };
        }, createURLFromResource = function (model, name) {
            if (!model.resource) {
                return;
            }
            var resource = model.resource.replace(/\/+$/, '');
            if (name === 'findAll' || name === 'create') {
                return resource;
            } else {
                return resource + '/{' + model.id + '}';
            }
        };
    can.Model = can.Map.extend({
        fullName: 'can.Model',
        _reqs: 0,
        setup: function (base, fullName, staticProps, protoProps) {
            if (typeof fullName !== 'string') {
                protoProps = staticProps;
                staticProps = fullName;
            }
            if (!protoProps) {
                protoProps = staticProps;
            }
            this.store = {};
            can.Map.setup.apply(this, arguments);
            if (!can.Model) {
                return;
            }
            if (staticProps && staticProps.List) {
                this.List = staticProps.List;
                this.List.Map = this;
            } else {
                this.List = base.List.extend({ Map: this }, {});
            }
            var self = this, clean = can.proxy(this._clean, self);
            can.each(ajaxMethods, function (method, name) {
                if (staticProps && staticProps[name] && (typeof staticProps[name] === 'string' || typeof staticProps[name] === 'object')) {
                    self[name] = ajaxMaker(method, staticProps[name]);
                } else if (staticProps && staticProps.resource && !can.isFunction(staticProps[name])) {
                    self[name] = ajaxMaker(method, createURLFromResource(self, name));
                }
                if (self['make' + can.capitalize(name)]) {
                    var newMethod = self['make' + can.capitalize(name)](self[name]);
                    can.Construct._overwrite(self, base, name, function () {
                        can.Model._reqs++;
                        var def = newMethod.apply(this, arguments);
                        var then = def.then(clean, clean);
                        then.abort = def.abort;
                        return then;
                    });
                }
            });
            var hasCustomConverter = {};
            can.each(converters, function (converter, name) {
                var parseName = 'parse' + can.capitalize(name), dataProperty = staticProps && staticProps[name] || self[name];
                if (typeof dataProperty === 'string') {
                    self[parseName] = dataProperty;
                    can.Construct._overwrite(self, base, name, converter);
                } else if (staticProps && staticProps[name]) {
                    hasCustomConverter[parseName] = true;
                }
            });
            can.each(makeParser, function (maker, parseName) {
                var prop = staticProps && staticProps[parseName] || self[parseName];
                if (typeof prop === 'string') {
                    can.Construct._overwrite(self, base, parseName, maker(prop));
                } else if ((!staticProps || !can.isFunction(staticProps[parseName])) && !self[parseName]) {
                    var madeParser = maker();
                    madeParser.useModelConverter = hasCustomConverter[parseName];
                    can.Construct._overwrite(self, base, parseName, madeParser);
                }
            });
            if (self.fullName === 'can.Model' || !self.fullName) {
                self.fullName = 'Model' + ++modelNum;
            }
            can.Model._reqs = 0;
            this._url = this._shortName + '/{' + this.id + '}';
        },
        _ajax: ajaxMaker,
        _makeRequest: makeRequest,
        _clean: function () {
            can.Model._reqs--;
            if (!can.Model._reqs) {
                for (var id in this.store) {
                    if (!this.store[id]._bindings) {
                        delete this.store[id];
                    }
                }
            }
            return arguments[0];
        },
        models: converters.models,
        model: converters.model
    }, {
        setup: function (attrs) {
            var id = attrs && attrs[this.constructor.id];
            if (can.Model._reqs && id != null) {
                this.constructor.store[id] = this;
            }
            can.Map.prototype.setup.apply(this, arguments);
        },
        isNew: function () {
            var id = getId(this);
            return !(id || id === 0);
        },
        save: function (success, error) {
            return makeRequest(this, this.isNew() ? 'create' : 'update', success, error);
        },
        destroy: function (success, error) {
            if (this.isNew()) {
                var self = this;
                var def = can.Deferred();
                def.then(success, error);
                return def.done(function (data) {
                    self.destroyed(data);
                }).resolve(self);
            }
            return makeRequest(this, 'destroy', success, error, 'destroyed');
        },
        _bindsetup: function () {
            var modelInstance = this.__get(this.constructor.id);
            if (modelInstance != null) {
                this.constructor.store[modelInstance] = this;
            }
            return can.Map.prototype._bindsetup.apply(this, arguments);
        },
        _bindteardown: function () {
            delete this.constructor.store[getId(this)];
            return can.Map.prototype._bindteardown.apply(this, arguments);
        },
        ___set: function (prop, val) {
            can.Map.prototype.___set.call(this, prop, val);
            if (prop === this.constructor.id && this._bindings) {
                this.constructor.store[getId(this)] = this;
            }
        }
    });
    var makeGetterHandler = function (name) {
            return function (data, readyState, xhr) {
                return this[name](data, null, xhr);
            };
        }, createUpdateDestroyHandler = function (data) {
            if (this.parseModel.useModelConverter) {
                return this.model(data);
            }
            return this.parseModel(data);
        };
    var responseHandlers = {
            makeFindAll: makeGetterHandler('models'),
            makeFindOne: makeGetterHandler('model'),
            makeCreate: createUpdateDestroyHandler,
            makeUpdate: createUpdateDestroyHandler,
            makeDestroy: createUpdateDestroyHandler
        };
    can.each(responseHandlers, function (method, name) {
        can.Model[name] = function (oldMethod) {
            return function () {
                var args = can.makeArray(arguments), oldArgs = can.isFunction(args[1]) ? args.splice(0, 1) : args.splice(0, 2), def = pipe(oldMethod.apply(this, oldArgs), this, method);
                def.then(args[0], args[1]);
                return def;
            };
        };
    });
    can.each([
        'created',
        'updated',
        'destroyed'
    ], function (funcName) {
        can.Model.prototype[funcName] = function (attrs) {
            var self = this, constructor = self.constructor;
            if (attrs && typeof attrs === 'object') {
                this.attr(can.isFunction(attrs.attr) ? attrs.attr() : attrs);
            }
            can.dispatch.call(this, {
                type: 'change',
                target: this
            }, [funcName]);
            can.dispatch.call(constructor, funcName, [this]);
        };
    });
    var ML = can.Model.List = can.List.extend({
            _bubbleRule: function (eventName, list) {
                var bubbleRules = can.List._bubbleRule(eventName, list);
                bubbleRules.push('destroyed');
                return bubbleRules;
            }
        }, {
            setup: function (params) {
                if (can.isPlainObject(params) && !can.isArray(params)) {
                    can.List.prototype.setup.apply(this);
                    this.replace(can.isDeferred(params) ? params : this.constructor.Map.findAll(params));
                } else {
                    can.List.prototype.setup.apply(this, arguments);
                }
                this._init = 1;
                this.bind('destroyed', can.proxy(this._destroyed, this));
                delete this._init;
            },
            _destroyed: function (ev, attr) {
                if (/\w+/.test(attr)) {
                    var index;
                    while ((index = this.indexOf(ev.target)) > -1) {
                        this.splice(index, 1);
                    }
                }
            }
        });
    return can.Model;
});
/*can@2.2.4#view/view*/
define('can@2.2.4#view/view', ['can/util/util'], function (can) {
    var isFunction = can.isFunction, makeArray = can.makeArray, hookupId = 1;
    var makeRenderer = function (textRenderer) {
        var renderer = function () {
            return $view.frag(textRenderer.apply(this, arguments));
        };
        renderer.render = function () {
            return textRenderer.apply(textRenderer, arguments);
        };
        return renderer;
    };
    var checkText = function (text, url) {
        if (!text.length) {
            throw 'can.view: No template or empty template:' + url;
        }
    };
    var getRenderer = function (obj, async) {
        if (isFunction(obj)) {
            var def = can.Deferred();
            return def.resolve(obj);
        }
        var url = typeof obj === 'string' ? obj : obj.url, suffix = obj.engine && '.' + obj.engine || url.match(/\.[\w\d]+$/), type, el, id;
        if (url.match(/^#/)) {
            url = url.substr(1);
        }
        if (el = document.getElementById(url)) {
            suffix = '.' + el.type.match(/\/(x\-)?(.+)/)[2];
        }
        if (!suffix && !$view.cached[url]) {
            url += suffix = $view.ext;
        }
        if (can.isArray(suffix)) {
            suffix = suffix[0];
        }
        id = $view.toId(url);
        if (url.match(/^\/\//)) {
            url = url.substr(2);
            url = !window.steal ? url : steal.config().root.mapJoin('' + steal.id(url));
        }
        if (window.require) {
            if (require.toUrl) {
                url = require.toUrl(url);
            }
        }
        type = $view.types[suffix];
        if ($view.cached[id]) {
            return $view.cached[id];
        } else if (el) {
            return $view.registerView(id, el.innerHTML, type);
        } else {
            var d = new can.Deferred();
            can.ajax({
                async: async,
                url: url,
                dataType: 'text',
                error: function (jqXHR) {
                    checkText('', url);
                    d.reject(jqXHR);
                },
                success: function (text) {
                    checkText(text, url);
                    $view.registerView(id, text, type, d);
                }
            });
            return d;
        }
    };
    var getDeferreds = function (data) {
        var deferreds = [];
        if (can.isDeferred(data)) {
            return [data];
        } else {
            for (var prop in data) {
                if (can.isDeferred(data[prop])) {
                    deferreds.push(data[prop]);
                }
            }
        }
        return deferreds;
    };
    var usefulPart = function (resolved) {
        return can.isArray(resolved) && resolved[1] === 'success' ? resolved[0] : resolved;
    };
    var $view = can.view = can.template = function (view, data, helpers, callback) {
            if (isFunction(helpers)) {
                callback = helpers;
                helpers = undefined;
            }
            return $view.renderAs('fragment', view, data, helpers, callback);
        };
    can.extend($view, {
        frag: function (result, parentNode) {
            return $view.hookup($view.fragment(result), parentNode);
        },
        fragment: function (result) {
            if (typeof result !== 'string' && result.nodeType === 11) {
                return result;
            }
            var frag = can.buildFragment(result, document.body);
            if (!frag.childNodes.length) {
                frag.appendChild(document.createTextNode(''));
            }
            return frag;
        },
        toId: function (src) {
            return can.map(src.toString().split(/\/|\./g), function (part) {
                if (part) {
                    return part;
                }
            }).join('_');
        },
        toStr: function (txt) {
            return txt == null ? '' : '' + txt;
        },
        hookup: function (fragment, parentNode) {
            var hookupEls = [], id, func;
            can.each(fragment.childNodes ? can.makeArray(fragment.childNodes) : fragment, function (node) {
                if (node.nodeType === 1) {
                    hookupEls.push(node);
                    hookupEls.push.apply(hookupEls, can.makeArray(node.getElementsByTagName('*')));
                }
            });
            can.each(hookupEls, function (el) {
                if (el.getAttribute && (id = el.getAttribute('data-view-id')) && (func = $view.hookups[id])) {
                    func(el, parentNode, id);
                    delete $view.hookups[id];
                    el.removeAttribute('data-view-id');
                }
            });
            return fragment;
        },
        hookups: {},
        hook: function (cb) {
            $view.hookups[++hookupId] = cb;
            return ' data-view-id=\'' + hookupId + '\'';
        },
        cached: {},
        cachedRenderers: {},
        cache: true,
        register: function (info) {
            this.types['.' + info.suffix] = info;
            can[info.suffix] = $view[info.suffix] = function (id, text) {
                var renderer, renderFunc;
                if (!text) {
                    renderFunc = function () {
                        if (!renderer) {
                            if (info.fragRenderer) {
                                renderer = info.fragRenderer(null, id);
                            } else {
                                renderer = makeRenderer(info.renderer(null, id));
                            }
                        }
                        return renderer.apply(this, arguments);
                    };
                    renderFunc.render = function () {
                        var textRenderer = info.renderer(null, id);
                        return textRenderer.apply(textRenderer, arguments);
                    };
                    return renderFunc;
                }
                var registeredRenderer = function () {
                    if (!renderer) {
                        if (info.fragRenderer) {
                            renderer = info.fragRenderer(id, text);
                        } else {
                            renderer = info.renderer(id, text);
                        }
                    }
                    return renderer.apply(this, arguments);
                };
                if (info.fragRenderer) {
                    return $view.preload(id, registeredRenderer);
                } else {
                    return $view.preloadStringRenderer(id, registeredRenderer);
                }
            };
        },
        types: {},
        ext: '.ejs',
        registerScript: function (type, id, src) {
            return 'can.view.preloadStringRenderer(\'' + id + '\',' + $view.types['.' + type].script(id, src) + ');';
        },
        preload: function (id, renderer) {
            var def = $view.cached[id] = new can.Deferred().resolve(function (data, helpers) {
                    return renderer.call(data, data, helpers);
                });
            def.__view_id = id;
            $view.cachedRenderers[id] = renderer;
            return renderer;
        },
        preloadStringRenderer: function (id, stringRenderer) {
            return this.preload(id, makeRenderer(stringRenderer));
        },
        render: function (view, data, helpers, callback) {
            return can.view.renderAs('string', view, data, helpers, callback);
        },
        renderTo: function (format, renderer, data, helpers) {
            return (format === 'string' && renderer.render ? renderer.render : renderer)(data, helpers);
        },
        renderAs: function (format, view, data, helpers, callback) {
            if (isFunction(helpers)) {
                callback = helpers;
                helpers = undefined;
            }
            var deferreds = getDeferreds(data);
            var reading, deferred, dataCopy, async, response;
            if (deferreds.length) {
                deferred = new can.Deferred();
                dataCopy = can.extend({}, data);
                deferreds.push(getRenderer(view, true));
                can.when.apply(can, deferreds).then(function (resolved) {
                    var objs = makeArray(arguments), renderer = objs.pop(), result;
                    if (can.isDeferred(data)) {
                        dataCopy = usefulPart(resolved);
                    } else {
                        for (var prop in data) {
                            if (can.isDeferred(data[prop])) {
                                dataCopy[prop] = usefulPart(objs.shift());
                            }
                        }
                    }
                    result = can.view.renderTo(format, renderer, dataCopy, helpers);
                    deferred.resolve(result, dataCopy);
                    if (callback) {
                        callback(result, dataCopy);
                    }
                }, function () {
                    deferred.reject.apply(deferred, arguments);
                });
                return deferred;
            } else {
                reading = can.__clearReading();
                async = isFunction(callback);
                deferred = getRenderer(view, async);
                if (reading) {
                    can.__setReading(reading);
                }
                if (async) {
                    response = deferred;
                    deferred.then(function (renderer) {
                        callback(data ? can.view.renderTo(format, renderer, data, helpers) : renderer);
                    });
                } else {
                    if (deferred.state() === 'resolved' && deferred.__view_id) {
                        var currentRenderer = $view.cachedRenderers[deferred.__view_id];
                        return data ? can.view.renderTo(format, currentRenderer, data, helpers) : currentRenderer;
                    } else {
                        deferred.then(function (renderer) {
                            response = data ? can.view.renderTo(format, renderer, data, helpers) : renderer;
                        });
                    }
                }
                return response;
            }
        },
        registerView: function (id, text, type, def) {
            var info = typeof type === 'object' ? type : $view.types[type || $view.ext], renderer;
            if (info.fragRenderer) {
                renderer = info.fragRenderer(id, text);
            } else {
                renderer = makeRenderer(info.renderer(id, text));
            }
            def = def || new can.Deferred();
            if ($view.cache) {
                $view.cached[id] = def;
                def.__view_id = id;
                $view.cachedRenderers[id] = renderer;
            }
            return def.resolve(renderer);
        }
    });
    return can;
});
/*can@2.2.4#compute/read*/
define('can@2.2.4#compute/read', ['can/util/util'], function (can) {
    var read = function (parent, reads, options) {
        options = options || {};
        var state = { foundObservable: false };
        var cur = readValue(parent, 0, reads, options, state), type, prev, readLength = reads.length, i = 0;
        while (i < readLength) {
            prev = cur;
            for (var r = 0, readersLength = read.propertyReaders.length; r < readersLength; r++) {
                var reader = read.propertyReaders[r];
                if (reader.test(cur)) {
                    cur = reader.read(cur, reads[i], i, options, state);
                    break;
                }
            }
            i = i + 1;
            cur = readValue(cur, i, reads, options, state, prev);
            type = typeof cur;
            if (i < reads.length && (cur === null || type !== 'function' && type !== 'object')) {
                if (options.earlyExit) {
                    options.earlyExit(prev, i - 1, cur);
                }
                return {
                    value: undefined,
                    parent: prev
                };
            }
        }
        if (cur === undefined) {
            if (options.earlyExit) {
                options.earlyExit(prev, i - 1);
            }
        }
        return {
            value: cur,
            parent: prev
        };
    };
    var readValue = function (value, index, reads, options, state, prev) {
        for (var i = 0, len = read.valueReaders.length; i < len; i++) {
            if (read.valueReaders[i].test(value, index, reads, options)) {
                value = read.valueReaders[i].read(value, index, reads, options, state, prev);
            }
        }
        return value;
    };
    read.valueReaders = [
        {
            name: 'compute',
            test: function (value, i, reads, options) {
                return value && value.isComputed;
            },
            read: function (value, i, reads, options, state) {
                if (options.isArgument && i === reads.length) {
                    return value;
                }
                if (!state.foundObservable && options.foundObservable) {
                    options.foundObservable(value, i);
                    state.foundObservable = true;
                }
                return value instanceof can.Compute ? value.get() : value();
            }
        },
        {
            name: 'function',
            test: function (value, i, reads, options) {
                var type = typeof value;
                return type === 'function' && !value.isComputed && (options.executeAnonymousFunctions || options.isArgument && i === reads.length) && !(can.Construct && value.prototype instanceof can.Construct) && !(can.route && value === can.route);
            },
            read: function (value, i, reads, options, state, prev) {
                if (options.isArgument && i === reads.length) {
                    return options.proxyMethods !== false ? can.proxy(value, prev) : value;
                }
                return value.call(prev);
            }
        }
    ];
    read.propertyReaders = [
        {
            name: 'map',
            test: can.isMapLike,
            read: function (value, prop, index, options, state) {
                if (!state.foundObservable && options.foundObservable) {
                    options.foundObservable(value, index);
                    state.foundObservable = true;
                }
                if (typeof value[prop] === 'function' && value.constructor.prototype[prop] === value[prop]) {
                    if (options.returnObserveMethods) {
                        return value[prop];
                    } else if (prop === 'constructor' && value instanceof can.Construct || value[prop].prototype instanceof can.Construct) {
                        return value[prop];
                    } else {
                        return value[prop].apply(value, options.args || []);
                    }
                } else {
                    return value.attr(prop);
                }
            }
        },
        {
            name: 'promise',
            test: function (value) {
                return can.isPromise(value);
            },
            read: function (value, prop, index, options, state) {
                if (!state.foundObservable && options.foundObservable) {
                    options.foundObservable(value, index);
                    state.foundObservable = true;
                }
                var observeData = value.__observeData;
                if (!value.__observeData) {
                    observeData = value.__observeData = {
                        isPending: true,
                        state: 'pending',
                        isResolved: false,
                        isRejected: false,
                        value: undefined,
                        reason: undefined
                    };
                    can.cid(observeData);
                    can.simpleExtend(observeData, can.event);
                    value.then(function (value) {
                        observeData.isPending = false;
                        observeData.isResolved = true;
                        observeData.value = value;
                        observeData.state = 'resolved';
                        observeData.dispatch('state', [
                            'resolved',
                            'pending'
                        ]);
                    }, function (reason) {
                        observeData.isPending = false;
                        observeData.isRejected = true;
                        observeData.reason = reason;
                        observeData.state = 'rejected';
                        observeData.dispatch('state', [
                            'rejected',
                            'pending'
                        ]);
                    });
                }
                can.__reading(observeData, 'state');
                return prop in observeData ? observeData[prop] : value[prop];
            }
        },
        {
            name: 'object',
            test: function () {
                return true;
            },
            read: function (value, prop) {
                if (value == null) {
                    return undefined;
                } else {
                    return value[prop];
                }
            }
        }
    ];
    read.write = function (parent, key, value, options) {
        options = options || {};
        if (can.isMapLike(parent)) {
            if (!options.isArgument && parent._data && parent._data[key] && parent._data[key].isComputed) {
                return parent._data[key](value);
            } else {
                return parent.attr(key, value);
            }
        }
        if (parent[key] && parent[key].isComputed) {
            return parent[key](value);
        }
        if (typeof parent === 'object') {
            parent[key] = value;
        }
    };
    return read;
});
/*can@2.2.4#compute/proto_compute*/
define('can@2.2.4#compute/proto_compute', [
    'can/util/util',
    'can/util/bind/bind',
    'can/compute/read',
    'can/util/batch/batch'
], function (can, bind, read) {
    var stack = [];
    can.__read = function (func, self) {
        stack.push({});
        var value = func.call(self);
        return {
            value: value,
            observed: stack.pop()
        };
    };
    can.__reading = function (obj, event) {
        if (stack.length) {
            stack[stack.length - 1][obj._cid + '|' + event] = {
                obj: obj,
                event: event + ''
            };
        }
    };
    can.__clearReading = function () {
        if (stack.length) {
            var ret = stack[stack.length - 1];
            stack[stack.length - 1] = {};
            return ret;
        }
    };
    can.__setReading = function (o) {
        if (stack.length) {
            stack[stack.length - 1] = o;
        }
    };
    can.__addReading = function (o) {
        if (stack.length) {
            can.simpleExtend(stack[stack.length - 1], o);
        }
    };
    var getValueAndBind = function (func, context, oldObserved, onchanged) {
        var info = can.__read(func, context), newObserveSet = info.observed;
        bindNewSet(oldObserved, newObserveSet, onchanged);
        unbindOldSet(oldObserved, onchanged);
        can.batch.afterPreviousEvents(function () {
            info.ready = true;
        });
        return info;
    };
    var bindNewSet = function (oldObserved, newObserveSet, onchanged) {
        for (var name in newObserveSet) {
            bindOrPreventUnbinding(oldObserved, newObserveSet, name, onchanged);
        }
    };
    var bindOrPreventUnbinding = function (oldObserved, newObserveSet, name, onchanged) {
        if (oldObserved[name]) {
            delete oldObserved[name];
        } else {
            var obEv = newObserveSet[name];
            obEv.obj.bind(obEv.event, onchanged);
        }
    };
    var unbindOldSet = function (oldObserved, onchanged) {
        for (var name in oldObserved) {
            var obEv = oldObserved[name];
            obEv.obj.unbind(obEv.event, onchanged);
        }
    };
    var updateOnChange = function (compute, newValue, oldValue, batchNum) {
        if (newValue !== oldValue) {
            can.batch.trigger(compute, batchNum ? {
                type: 'change',
                batchNum: batchNum
            } : 'change', [
                newValue,
                oldValue
            ]);
        }
    };
    var setupComputeHandlersOn = function () {
        this.readInfo = getValueAndBind(this._getterSetter, this._context, {}, this.onchanged);
        this.setCached(this.readInfo.value);
        this.hasDependencies = !can.isEmptyObject(this.readInfo.observed);
    };
    var setupComputeHandlersOff = function () {
        for (var name in this.readInfo.observed) {
            var ob = this.readInfo.observed[name];
            ob.obj.unbind(ob.event, this.onchanged);
        }
    };
    var setupComputeHandlers = function (compute, func, context) {
        var readInfo, onchanged, batchNum;
        return {
            on: function () {
                var self = this;
                if (!onchanged) {
                    onchanged = function (ev) {
                        if (readInfo.ready && compute.bound && (ev.batchNum === undefined || ev.batchNum !== batchNum)) {
                            var oldValue = readInfo.value;
                            readInfo = getValueAndBind(func, context, readInfo.observed, onchanged);
                            self.updater(readInfo.value, oldValue, ev.batchNum);
                            batchNum = batchNum = ev.batchNum;
                        }
                    };
                }
                readInfo = getValueAndBind(func, context, {}, onchanged);
                compute.setCached(readInfo.value);
                compute.hasDependencies = !can.isEmptyObject(readInfo.observed);
            },
            off: function (updater) {
                for (var name in readInfo.observed) {
                    var ob = readInfo.observed[name];
                    ob.obj.unbind(ob.event, onchanged);
                }
            }
        };
    };
    var setupSingleBindComputeHandlers = function (compute, func, context) {
        var readInfo, oldValue, onchanged, batchNum;
        return {
            on: function (updater) {
                if (!onchanged) {
                    onchanged = function (ev) {
                        if (readInfo.ready && compute.bound && (ev.batchNum === undefined || ev.batchNum !== batchNum)) {
                            var reads = can.__clearReading();
                            var newValue = func.call(context);
                            can.__setReading(reads);
                            updater.call(compute, newValue, oldValue, ev.batchNum);
                            oldValue = newValue;
                            batchNum = batchNum = ev.batchNum;
                        }
                    };
                }
                readInfo = getValueAndBind(func, context, {}, onchanged);
                oldValue = readInfo.value;
                compute.setCached(readInfo.value);
                compute.hasDependencies = !can.isEmptyObject(readInfo.observed);
            },
            off: function (updater) {
                for (var name in readInfo.observed) {
                    var ob = readInfo.observed[name];
                    ob.obj.unbind(ob.event, onchanged);
                }
            }
        };
    };
    var k = function () {
    };
    var updater = function (newVal, oldVal, batchNum) {
            this.setCached(newVal);
            updateOnChange(this, newVal, oldVal, batchNum);
        }, createAsyncAltUpdater = function (context, oldUpdater) {
            return function () {
                oldUpdater(context._get(), context.value);
            };
        }, asyncGet = function (fn, context, lastSetValue) {
            return function () {
                return fn.call(context, lastSetValue.get());
            };
        }, asyncUpdater = function (context, oldUpdater) {
            return function (newVal) {
                if (newVal !== undefined) {
                    oldUpdater(newVal, context.value);
                }
            };
        };
    can.Compute = function (getterSetter, context, eventName, bindOnce) {
        var args = [];
        for (var i = 0, arglen = arguments.length; i < arglen; i++) {
            args[i] = arguments[i];
        }
        var contextType = typeof args[1];
        if (typeof args[0] === 'function') {
            this._setupGetterSetterFn(args[0], args[1], args[2], args[3]);
        } else if (args[1]) {
            if (contextType === 'string') {
                this._setupContextString(args[0], args[1], args[2]);
            } else if (contextType === 'function') {
                this._setupContextFunction(args[0], args[1], args[2]);
            } else {
                if (args[1] && args[1].fn) {
                    this._setupAsyncCompute(args[0], args[1]);
                } else {
                    this._setupContextSettings(args[0], args[1]);
                }
            }
        } else {
            this._setupInitialValue(args[0]);
        }
        this._args = args;
        this.isComputed = true;
        can.cid(this, 'compute');
    };
    can.simpleExtend(can.Compute.prototype, {
        _bindsetup: function () {
            this.bound = true;
            var oldReading = can.__clearReading();
            this._on(this.updater);
            can.__setReading(oldReading);
        },
        _bindteardown: function () {
            this._off(this.updater);
            this.bound = false;
        },
        bind: can.bindAndSetup,
        unbind: can.unbindAndTeardown,
        clone: function (context) {
            if (context && typeof this._args[0] === 'function') {
                this._args[1] = context;
            } else if (context) {
                this._args[2] = context;
            }
            return new can.Compute(this._args[0], this._args[1], this._args[2], this._args[3]);
        },
        _on: k,
        _off: k,
        get: function () {
            if (stack.length && this._canReadForChangeEvent !== false) {
                can.__reading(this, 'change');
                if (!this.bound) {
                    can.Compute.temporarilyBind(this);
                }
            }
            if (this.bound) {
                return this.value;
            } else {
                return this._get();
            }
        },
        _get: function () {
            return this.value;
        },
        set: function (newVal) {
            var old = this.value;
            var setVal = this._set(newVal, old);
            if (this.hasDependencies) {
                if (this._setUpdates) {
                    return this.value;
                }
                return this._get();
            }
            if (setVal === undefined) {
                this.value = this._get();
            } else {
                this.value = setVal;
            }
            updateOnChange(this, this.value, old);
            return this.value;
        },
        _set: function (newVal) {
            return this.value = newVal;
        },
        setCached: function (newVal) {
            this.value = newVal;
        },
        updater: updater,
        _computeFn: function (newVal) {
            if (arguments.length) {
                return this.set(newVal);
            }
            return this.get();
        },
        toFunction: function () {
            return can.proxy(this._computeFn, this);
        },
        _setupGetterSetterFn: function (getterSetter, context, eventName, bindOnce) {
            this._set = can.proxy(getterSetter, context);
            this._get = can.proxy(getterSetter, context);
            this._canReadForChangeEvent = eventName === false ? false : true;
            this._getterSetter = getterSetter;
            this._context = context;
            var handlers;
            if (bindOnce) {
                handlers = setupSingleBindComputeHandlers(this, getterSetter, context || this);
                this._on = handlers.on;
                this._off = handlers.off;
            } else {
                var self = this;
                this.onchanged = function (ev) {
                    if (self.bound && self.readInfo.ready && (ev.batchNum === undefined || ev.batchNum !== self.batchNum)) {
                        var oldValue = self.readInfo.value;
                        self.readInfo = getValueAndBind(getterSetter, context, self.readInfo.observed, self.onchanged);
                        self.updater(self.readInfo.value, oldValue, ev.batchNum);
                        self.batchNum = ev.batchNum;
                    }
                };
                this._on = setupComputeHandlersOn;
                this._off = setupComputeHandlersOff;
            }
        },
        _setupContextString: function (target, propertyName, eventName) {
            var isObserve = target instanceof can.Map, handler;
            this.updater = can.proxy(this.updater, this);
            if (isObserve) {
                this.hasDependencies = true;
                this._get = function () {
                    return target.attr(propertyName);
                };
                this._set = function (val) {
                    target.attr(propertyName, val);
                };
                this._on = function (update) {
                    handler = function (ev, newVal, oldVal) {
                        update(newVal, oldVal, ev.batchNum);
                    };
                    target.bind(eventName || propertyName, handler);
                    this.value = can.__read(this._get).value;
                };
                this._off = function () {
                    return target.unbind(eventName || propertyName, handler);
                };
            } else {
                this._get = can.proxy(this._get, target);
                this._set = can.proxy(this._set, target);
            }
        },
        _setupContextFunction: function (initialValue, setter, eventName) {
            this.value = initialValue;
            this._set = setter;
            can.simpleExtend(this, eventName);
        },
        _setupContextSettings: function (initialValue, settings) {
            this.value = initialValue;
            var oldUpdater = can.proxy(this.updater, this);
            this._set = settings.set ? can.proxy(settings.set, settings) : this._set;
            this._get = settings.get ? can.proxy(settings.get, settings) : this._get;
            this.updater = createAsyncAltUpdater(this, oldUpdater);
            this._on = settings.on ? settings.on : this._on;
            this._off = settings.off ? settings.off : this._off;
        },
        _setupAsyncCompute: function (initialValue, settings) {
            this.value = initialValue;
            var oldUpdater = can.proxy(this.updater, this), self = this, fn = settings.fn, data;
            this.updater = oldUpdater;
            var lastSetValue = new can.Compute(initialValue);
            this.lastSetValue = lastSetValue;
            this._setUpdates = true;
            this._set = function (newVal) {
                if (newVal === lastSetValue.get()) {
                    return this.value;
                }
                lastSetValue.set(newVal);
            };
            this._get = asyncGet(fn, settings.context, lastSetValue);
            if (fn.length === 0) {
                data = setupComputeHandlers(this, fn, settings.context);
            } else if (fn.length === 1) {
                data = setupComputeHandlers(this, function () {
                    return fn.call(settings.context, lastSetValue.get());
                }, settings);
            } else {
                this.updater = asyncUpdater(this, oldUpdater);
                data = setupComputeHandlers(this, function () {
                    var res = fn.call(settings.context, lastSetValue.get(), function (newVal) {
                            oldUpdater(newVal, self.value);
                        });
                    return res !== undefined ? res : this.value;
                }, settings);
            }
            this._on = data.on;
            this._off = data.off;
        },
        _setupInitialValue: function (initialValue) {
            this.value = initialValue;
        }
    });
    var computes, unbindComputes = function () {
            for (var i = 0, len = computes.length; i < len; i++) {
                computes[i].unbind('change', k);
            }
            computes = null;
        };
    can.Compute.temporarilyBind = function (compute) {
        compute.bind('change', k);
        if (!computes) {
            computes = [];
            setTimeout(unbindComputes, 10);
        }
        computes.push(compute);
    };
    can.Compute.async = function (initialValue, asyncComputer, context) {
        return new can.Compute(initialValue, {
            fn: asyncComputer,
            context: context
        });
    };
    can.Compute.read = read;
    can.Compute.set = read.write;
    can.Compute.truthy = function (compute) {
        return new can.Compute(function () {
            var res = compute.get();
            if (typeof res === 'function') {
                res = res.get();
            }
            return !!res;
        });
    };
    return can.Compute;
});
/*can@2.2.4#compute/compute*/
define('can@2.2.4#compute/compute', [
    'can/util/util',
    'can/util/bind/bind',
    'can/util/batch/batch',
    'can/compute/proto_compute'
], function (can, bind) {
    can.compute = function (getterSetter, context, eventName, bindOnce) {
        var internalCompute = new can.Compute(getterSetter, context, eventName, bindOnce);
        var compute = function (val) {
            if (arguments.length) {
                return internalCompute.set(val);
            }
            return internalCompute.get();
        };
        compute.bind = can.proxy(internalCompute.bind, internalCompute);
        compute.unbind = can.proxy(internalCompute.unbind, internalCompute);
        compute.isComputed = internalCompute.isComputed;
        compute.clone = function (ctx) {
            if (typeof getterSetter === 'function') {
                context = ctx;
            }
            return can.compute(getterSetter, context, ctx, bindOnce);
        };
        compute.computeInstance = internalCompute;
        return compute;
    };
    var k = function () {
    };
    var computes, unbindComputes = function () {
            for (var i = 0, len = computes.length; i < len; i++) {
                computes[i].unbind('change', k);
            }
            computes = null;
        };
    can.compute.temporarilyBind = function (compute) {
        compute.bind('change', k);
        if (!computes) {
            computes = [];
            setTimeout(unbindComputes, 10);
        }
        computes.push(compute);
    };
    can.compute.truthy = function (compute) {
        return can.compute(function () {
            var res = compute();
            if (typeof res === 'function') {
                res = res();
            }
            return !!res;
        });
    };
    can.compute.async = function (initialValue, asyncComputer, context) {
        return can.compute(initialValue, {
            fn: asyncComputer,
            context: context
        });
    };
    can.compute.read = can.Compute.read;
    can.compute.set = can.Compute.set;
    return can.compute;
});
/*can@2.2.4#view/scope/scope*/
define('can@2.2.4#view/scope/scope', [
    'can/util/util',
    'can/construct/construct',
    'can/map/map',
    'can/list/list',
    'can/view/view',
    'can/compute/compute'
], function (can) {
    var escapeReg = /(\\)?\./g, escapeDotReg = /\\\./g, getNames = function (attr) {
            var names = [], last = 0;
            attr.replace(escapeReg, function (first, second, index) {
                if (!second) {
                    names.push(attr.slice(last, index).replace(escapeDotReg, '.'));
                    last = index + first.length;
                }
            });
            names.push(attr.slice(last).replace(escapeDotReg, '.'));
            return names;
        };
    var Scope = can.Construct.extend({ read: can.compute.read }, {
            init: function (context, parent) {
                this._context = context;
                this._parent = parent;
                this.__cache = {};
            },
            attr: function (key, value) {
                var previousReads = can.__clearReading(), options = {
                        isArgument: true,
                        returnObserveMethods: true,
                        proxyMethods: false
                    }, res = this.read(key, options);
                if (arguments.length === 2) {
                    var lastIndex = key.lastIndexOf('.'), readKey = lastIndex !== -1 ? key.substring(0, lastIndex) : '.', obj = this.read(readKey, options).value;
                    if (lastIndex !== -1) {
                        key = key.substring(lastIndex + 1, key.length);
                    }
                    can.compute.set(obj, key, value, options);
                }
                can.__setReading(previousReads);
                return res.value;
            },
            add: function (context) {
                if (context !== this._context) {
                    return new this.constructor(context, this);
                } else {
                    return this;
                }
            },
            computeData: function (key, options) {
                options = options || { args: [] };
                var self = this, rootObserve, rootReads, computeData = {
                        compute: can.compute(function (newVal) {
                            if (arguments.length) {
                                if (rootObserve.isComputed) {
                                    rootObserve(newVal);
                                } else if (rootReads.length) {
                                    var last = rootReads.length - 1;
                                    var obj = rootReads.length ? can.compute.read(rootObserve, rootReads.slice(0, last)).value : rootObserve;
                                    can.compute.set(obj, rootReads[last], newVal, options);
                                }
                            } else {
                                if (rootObserve) {
                                    return can.compute.read(rootObserve, rootReads, options).value;
                                }
                                var data = self.read(key, options);
                                rootObserve = data.rootObserve;
                                rootReads = data.reads;
                                computeData.scope = data.scope;
                                computeData.initialValue = data.value;
                                computeData.reads = data.reads;
                                computeData.root = rootObserve;
                                return data.value;
                            }
                        })
                    };
                return computeData;
            },
            compute: function (key, options) {
                return this.computeData(key, options).compute;
            },
            read: function (attr, options) {
                var stopLookup;
                if (attr.substr(0, 2) === './') {
                    stopLookup = true;
                    attr = attr.substr(2);
                } else if (attr.substr(0, 3) === '../') {
                    return this._parent.read(attr.substr(3), options);
                } else if (attr === '..') {
                    return { value: this._parent._context };
                } else if (attr === '.' || attr === 'this') {
                    return { value: this._context };
                }
                var names = attr.indexOf('\\.') === -1 ? attr.split('.') : getNames(attr), context, scope = this, defaultObserve, defaultReads = [], defaultPropertyDepth = -1, defaultComputeReadings, defaultScope, currentObserve, currentReads;
                while (scope) {
                    context = scope._context;
                    if (context !== null) {
                        var data = can.compute.read(context, names, can.simpleExtend({
                                foundObservable: function (observe, nameIndex) {
                                    currentObserve = observe;
                                    currentReads = names.slice(nameIndex);
                                },
                                earlyExit: function (parentValue, nameIndex) {
                                    if (nameIndex > defaultPropertyDepth) {
                                        defaultObserve = currentObserve;
                                        defaultReads = currentReads;
                                        defaultPropertyDepth = nameIndex;
                                        defaultScope = scope;
                                        defaultComputeReadings = can.__clearReading();
                                    }
                                },
                                executeAnonymousFunctions: true
                            }, options));
                        if (data.value !== undefined) {
                            return {
                                scope: scope,
                                rootObserve: currentObserve,
                                value: data.value,
                                reads: currentReads
                            };
                        }
                    }
                    can.__clearReading();
                    if (!stopLookup) {
                        scope = scope._parent;
                    } else {
                        scope = null;
                    }
                }
                if (defaultObserve) {
                    can.__setReading(defaultComputeReadings);
                    return {
                        scope: defaultScope,
                        rootObserve: defaultObserve,
                        reads: defaultReads,
                        value: undefined
                    };
                } else {
                    return {
                        names: names,
                        value: undefined
                    };
                }
            }
        });
    can.view.Scope = Scope;
    return Scope;
});
/*can@2.2.4#view/elements*/
define('can@2.2.4#view/elements', [
    'can/util/util',
    'can/view/view'
], function (can) {
    var doc = typeof document !== 'undefined' ? document : null;
    var selectsCommentNodes = doc && function () {
            return can.$(document.createComment('~')).length === 1;
        }();
    var elements = {
            tagToContentPropMap: {
                option: doc && 'textContent' in document.createElement('option') ? 'textContent' : 'innerText',
                textarea: 'value'
            },
            attrMap: can.attr.map,
            attrReg: /([^\s=]+)[\s]*=[\s]*/,
            defaultValue: can.attr.defaultValue,
            tagMap: {
                '': 'span',
                colgroup: 'col',
                table: 'tbody',
                tr: 'td',
                ol: 'li',
                ul: 'li',
                tbody: 'tr',
                thead: 'tr',
                tfoot: 'tr',
                select: 'option',
                optgroup: 'option'
            },
            reverseTagMap: {
                col: 'colgroup',
                tr: 'tbody',
                option: 'select',
                td: 'tr',
                th: 'tr',
                li: 'ul'
            },
            getParentNode: function (el, defaultParentNode) {
                return defaultParentNode && el.parentNode.nodeType === 11 ? defaultParentNode : el.parentNode;
            },
            setAttr: can.attr.set,
            getAttr: can.attr.get,
            removeAttr: can.attr.remove,
            contentText: function (text) {
                if (typeof text === 'string') {
                    return text;
                }
                if (!text && text !== 0) {
                    return '';
                }
                return '' + text;
            },
            after: function (oldElements, newFrag) {
                var last = oldElements[oldElements.length - 1];
                if (last.nextSibling) {
                    can.insertBefore(last.parentNode, newFrag, last.nextSibling);
                } else {
                    can.appendChild(last.parentNode, newFrag);
                }
            },
            replace: function (oldElements, newFrag) {
                elements.after(oldElements, newFrag);
                if (can.remove(can.$(oldElements)).length < oldElements.length && !selectsCommentNodes) {
                    can.each(oldElements, function (el) {
                        if (el.nodeType === 8) {
                            el.parentNode.removeChild(el);
                        }
                    });
                }
            }
        };
    can.view.elements = elements;
    return elements;
});
/*can@2.2.4#view/callbacks/callbacks*/
define('can@2.2.4#view/callbacks/callbacks', [
    'can/util/util',
    'can/view/view'
], function (can) {
    var attr = can.view.attr = function (attributeName, attrHandler) {
            if (attrHandler) {
                if (typeof attributeName === 'string') {
                    attributes[attributeName] = attrHandler;
                } else {
                    regExpAttributes.push({
                        match: attributeName,
                        handler: attrHandler
                    });
                }
            } else {
                var cb = attributes[attributeName];
                if (!cb) {
                    for (var i = 0, len = regExpAttributes.length; i < len; i++) {
                        var attrMatcher = regExpAttributes[i];
                        if (attrMatcher.match.test(attributeName)) {
                            cb = attrMatcher.handler;
                            break;
                        }
                    }
                }
                return cb;
            }
        };
    var attributes = {}, regExpAttributes = [], automaticCustomElementCharacters = /[-\:]/;
    var tag = can.view.tag = function (tagName, tagHandler) {
            if (tagHandler) {
                if (can.global.html5) {
                    can.global.html5.elements += ' ' + tagName;
                    can.global.html5.shivDocument();
                }
                tags[tagName.toLowerCase()] = tagHandler;
            } else {
                var cb = tags[tagName.toLowerCase()];
                if (!cb && automaticCustomElementCharacters.test(tagName)) {
                    cb = function () {
                    };
                }
                return cb;
            }
        };
    var tags = {};
    can.view.callbacks = {
        _tags: tags,
        _attributes: attributes,
        _regExpAttributes: regExpAttributes,
        tag: tag,
        attr: attr,
        tagHandler: function (el, tagName, tagData) {
            var helperTagCallback = tagData.options.attr('tags.' + tagName), tagCallback = helperTagCallback || tags[tagName];
            var scope = tagData.scope, res;
            if (tagCallback) {
                var reads = can.__clearReading();
                res = tagCallback(el, tagData);
                can.__setReading(reads);
            } else {
                res = scope;
            }
            if (res && tagData.subtemplate) {
                if (scope !== res) {
                    scope = scope.add(res);
                }
                var result = tagData.subtemplate(scope, tagData.options);
                var frag = typeof result === 'string' ? can.view.frag(result) : result;
                can.appendChild(el, frag);
            }
        }
    };
    return can.view.callbacks;
});
/*can@2.2.4#view/scanner*/
define('can@2.2.4#view/scanner', [
    'can/view/view',
    './elements',
    'can/view/callbacks/callbacks'
], function (can, elements, viewCallbacks) {
    var newLine = /(\r|\n)+/g, notEndTag = /\//, clean = function (content) {
            return content.split('\\').join('\\\\').split('\n').join('\\n').split('"').join('\\"').split('\t').join('\\t');
        }, getTag = function (tagName, tokens, i) {
            if (tagName) {
                return tagName;
            } else {
                while (i < tokens.length) {
                    if (tokens[i] === '<' && !notEndTag.test(tokens[i + 1])) {
                        return elements.reverseTagMap[tokens[i + 1]] || 'span';
                    }
                    i++;
                }
            }
            return '';
        }, bracketNum = function (content) {
            return --content.split('{').length - --content.split('}').length;
        }, myEval = function (script) {
            eval(script);
        }, attrReg = /([^\s]+)[\s]*=[\s]*$/, startTxt = 'var ___v1ew = [];', finishTxt = 'return ___v1ew.join(\'\')', put_cmd = '___v1ew.push(\n', insert_cmd = put_cmd, htmlTag = null, quote = null, beforeQuote = null, rescan = null, getAttrName = function () {
            var matches = beforeQuote.match(attrReg);
            return matches && matches[1];
        }, status = function () {
            return quote ? '\'' + getAttrName() + '\'' : htmlTag ? 1 : 0;
        }, top = function (stack) {
            return stack[stack.length - 1];
        }, Scanner;
    can.view.Scanner = Scanner = function (options) {
        can.extend(this, {
            text: {},
            tokens: []
        }, options);
        this.text.options = this.text.options || '';
        this.tokenReg = [];
        this.tokenSimple = {
            '<': '<',
            '>': '>',
            '"': '"',
            '\'': '\''
        };
        this.tokenComplex = [];
        this.tokenMap = {};
        for (var i = 0, token; token = this.tokens[i]; i++) {
            if (token[2]) {
                this.tokenReg.push(token[2]);
                this.tokenComplex.push({
                    abbr: token[1],
                    re: new RegExp(token[2]),
                    rescan: token[3]
                });
            } else {
                this.tokenReg.push(token[1]);
                this.tokenSimple[token[1]] = token[0];
            }
            this.tokenMap[token[0]] = token[1];
        }
        this.tokenReg = new RegExp('(' + this.tokenReg.slice(0).concat([
            '<',
            '>',
            '"',
            '\''
        ]).join('|') + ')', 'g');
    };
    Scanner.prototype = {
        helpers: [],
        scan: function (source, name) {
            var tokens = [], last = 0, simple = this.tokenSimple, complex = this.tokenComplex;
            source = source.replace(newLine, '\n');
            if (this.transform) {
                source = this.transform(source);
            }
            source.replace(this.tokenReg, function (whole, part) {
                var offset = arguments[arguments.length - 2];
                if (offset > last) {
                    tokens.push(source.substring(last, offset));
                }
                if (simple[whole]) {
                    tokens.push(whole);
                } else {
                    for (var i = 0, token; token = complex[i]; i++) {
                        if (token.re.test(whole)) {
                            tokens.push(token.abbr);
                            if (token.rescan) {
                                tokens.push(token.rescan(part));
                            }
                            break;
                        }
                    }
                }
                last = offset + part.length;
            });
            if (last < source.length) {
                tokens.push(source.substr(last));
            }
            var content = '', buff = [startTxt + (this.text.start || '')], put = function (content, bonus) {
                    buff.push(put_cmd, '"', clean(content), '"' + (bonus || '') + ');');
                }, endStack = [], lastToken, startTag = null, magicInTag = false, specialStates = {
                    attributeHookups: [],
                    tagHookups: [],
                    lastTagHookup: ''
                }, popTagHookup = function () {
                    specialStates.lastTagHookup = specialStates.tagHookups.pop() + specialStates.tagHookups.length;
                }, tagName = '', tagNames = [], popTagName = false, bracketCount, specialAttribute = false, i = 0, token, tmap = this.tokenMap, attrName;
            htmlTag = quote = beforeQuote = null;
            for (; (token = tokens[i++]) !== undefined;) {
                if (startTag === null) {
                    switch (token) {
                    case tmap.left:
                    case tmap.escapeLeft:
                    case tmap.returnLeft:
                        magicInTag = htmlTag && 1;
                    case tmap.commentLeft:
                        startTag = token;
                        if (content.length) {
                            put(content);
                        }
                        content = '';
                        break;
                    case tmap.escapeFull:
                        magicInTag = htmlTag && 1;
                        rescan = 1;
                        startTag = tmap.escapeLeft;
                        if (content.length) {
                            put(content);
                        }
                        rescan = tokens[i++];
                        content = rescan.content || rescan;
                        if (rescan.before) {
                            put(rescan.before);
                        }
                        tokens.splice(i, 0, tmap.right);
                        break;
                    case tmap.commentFull:
                        break;
                    case tmap.templateLeft:
                        content += tmap.left;
                        break;
                    case '<':
                        if (tokens[i].indexOf('!--') !== 0) {
                            htmlTag = 1;
                            magicInTag = 0;
                        }
                        content += token;
                        break;
                    case '>':
                        htmlTag = 0;
                        var emptyElement = content.substr(content.length - 1) === '/' || content.substr(content.length - 2) === '--', attrs = '';
                        if (specialStates.attributeHookups.length) {
                            attrs = 'attrs: [\'' + specialStates.attributeHookups.join('\',\'') + '\'], ';
                            specialStates.attributeHookups = [];
                        }
                        if (tagName + specialStates.tagHookups.length !== specialStates.lastTagHookup && tagName === top(specialStates.tagHookups)) {
                            if (emptyElement) {
                                content = content.substr(0, content.length - 1);
                            }
                            buff.push(put_cmd, '"', clean(content), '"', ',can.view.pending({tagName:\'' + tagName + '\',' + attrs + 'scope: ' + (this.text.scope || 'this') + this.text.options);
                            if (emptyElement) {
                                buff.push('}));');
                                content = '/>';
                                popTagHookup();
                            } else if (tokens[i] === '<' && tokens[i + 1] === '/' + tagName) {
                                buff.push('}));');
                                content = token;
                                popTagHookup();
                            } else {
                                buff.push(',subtemplate: function(' + this.text.argNames + '){\n' + startTxt + (this.text.start || ''));
                                content = '';
                            }
                        } else if (magicInTag || !popTagName && elements.tagToContentPropMap[tagNames[tagNames.length - 1]] || attrs) {
                            var pendingPart = ',can.view.pending({' + attrs + 'scope: ' + (this.text.scope || 'this') + this.text.options + '}),"';
                            if (emptyElement) {
                                put(content.substr(0, content.length - 1), pendingPart + '/>"');
                            } else {
                                put(content, pendingPart + '>"');
                            }
                            content = '';
                            magicInTag = 0;
                        } else {
                            content += token;
                        }
                        if (emptyElement || popTagName) {
                            tagNames.pop();
                            tagName = tagNames[tagNames.length - 1];
                            popTagName = false;
                        }
                        specialStates.attributeHookups = [];
                        break;
                    case '\'':
                    case '"':
                        if (htmlTag) {
                            if (quote && quote === token) {
                                quote = null;
                                var attr = getAttrName();
                                if (viewCallbacks.attr(attr)) {
                                    specialStates.attributeHookups.push(attr);
                                }
                                if (specialAttribute) {
                                    content += token;
                                    put(content);
                                    buff.push(finishTxt, '}));\n');
                                    content = '';
                                    specialAttribute = false;
                                    break;
                                }
                            } else if (quote === null) {
                                quote = token;
                                beforeQuote = lastToken;
                                attrName = getAttrName();
                                if (tagName === 'img' && attrName === 'src' || attrName === 'style') {
                                    put(content.replace(attrReg, ''));
                                    content = '';
                                    specialAttribute = true;
                                    buff.push(insert_cmd, 'can.view.txt(2,\'' + getTag(tagName, tokens, i) + '\',' + status() + ',this,function(){', startTxt);
                                    put(attrName + '=' + token);
                                    break;
                                }
                            }
                        }
                    default:
                        if (lastToken === '<') {
                            tagName = token.substr(0, 3) === '!--' ? '!--' : token.split(/\s/)[0];
                            var isClosingTag = false, cleanedTagName;
                            if (tagName.indexOf('/') === 0) {
                                isClosingTag = true;
                                cleanedTagName = tagName.substr(1);
                            }
                            if (isClosingTag) {
                                if (top(tagNames) === cleanedTagName) {
                                    tagName = cleanedTagName;
                                    popTagName = true;
                                }
                                if (top(specialStates.tagHookups) === cleanedTagName) {
                                    put(content.substr(0, content.length - 1));
                                    buff.push(finishTxt + '}}) );');
                                    content = '><';
                                    popTagHookup();
                                }
                            } else {
                                if (tagName.lastIndexOf('/') === tagName.length - 1) {
                                    tagName = tagName.substr(0, tagName.length - 1);
                                }
                                if (tagName !== '!--' && viewCallbacks.tag(tagName)) {
                                    if (tagName === 'content' && elements.tagMap[top(tagNames)]) {
                                        token = token.replace('content', elements.tagMap[top(tagNames)]);
                                    }
                                    specialStates.tagHookups.push(tagName);
                                }
                                tagNames.push(tagName);
                            }
                        }
                        content += token;
                        break;
                    }
                } else {
                    switch (token) {
                    case tmap.right:
                    case tmap.returnRight:
                        switch (startTag) {
                        case tmap.left:
                            bracketCount = bracketNum(content);
                            if (bracketCount === 1) {
                                buff.push(insert_cmd, 'can.view.txt(0,\'' + getTag(tagName, tokens, i) + '\',' + status() + ',this,function(){', startTxt, content);
                                endStack.push({
                                    before: '',
                                    after: finishTxt + '}));\n'
                                });
                            } else {
                                last = endStack.length && bracketCount === -1 ? endStack.pop() : { after: ';' };
                                if (last.before) {
                                    buff.push(last.before);
                                }
                                buff.push(content, ';', last.after);
                            }
                            break;
                        case tmap.escapeLeft:
                        case tmap.returnLeft:
                            bracketCount = bracketNum(content);
                            if (bracketCount) {
                                endStack.push({
                                    before: finishTxt,
                                    after: '}));\n'
                                });
                            }
                            var escaped = startTag === tmap.escapeLeft ? 1 : 0, commands = {
                                    insert: insert_cmd,
                                    tagName: getTag(tagName, tokens, i),
                                    status: status(),
                                    specialAttribute: specialAttribute
                                };
                            for (var ii = 0; ii < this.helpers.length; ii++) {
                                var helper = this.helpers[ii];
                                if (helper.name.test(content)) {
                                    content = helper.fn(content, commands);
                                    if (helper.name.source === /^>[\s]*\w*/.source) {
                                        escaped = 0;
                                    }
                                    break;
                                }
                            }
                            if (typeof content === 'object') {
                                if (content.startTxt && content.end && specialAttribute) {
                                    buff.push(insert_cmd, 'can.view.toStr( ', content.content, '() ) );');
                                } else {
                                    if (content.startTxt) {
                                        buff.push(insert_cmd, 'can.view.txt(\n' + (typeof status() === 'string' || (content.escaped != null ? content.escaped : escaped)) + ',\n\'' + tagName + '\',\n' + status() + ',\nthis,\n');
                                    } else if (content.startOnlyTxt) {
                                        buff.push(insert_cmd, 'can.view.onlytxt(this,\n');
                                    }
                                    buff.push(content.content);
                                    if (content.end) {
                                        buff.push('));');
                                    }
                                }
                            } else if (specialAttribute) {
                                buff.push(insert_cmd, content, ');');
                            } else {
                                buff.push(insert_cmd, 'can.view.txt(\n' + (typeof status() === 'string' || escaped) + ',\n\'' + tagName + '\',\n' + status() + ',\nthis,\nfunction(){ ' + (this.text.escape || '') + 'return ', content, bracketCount ? startTxt : '}));\n');
                            }
                            if (rescan && rescan.after && rescan.after.length) {
                                put(rescan.after.length);
                                rescan = null;
                            }
                            break;
                        }
                        startTag = null;
                        content = '';
                        break;
                    case tmap.templateLeft:
                        content += tmap.left;
                        break;
                    default:
                        content += token;
                        break;
                    }
                }
                lastToken = token;
            }
            if (content.length) {
                put(content);
            }
            buff.push(';');
            var template = buff.join(''), out = { out: (this.text.outStart || '') + template + ' ' + finishTxt + (this.text.outEnd || '') };
            myEval.call(out, 'this.fn = (function(' + this.text.argNames + '){' + out.out + '});\r\n//# sourceURL=' + name + '.js');
            return out;
        }
    };
    can.view.pending = function (viewData) {
        var hooks = can.view.getHooks();
        return can.view.hook(function (el) {
            can.each(hooks, function (fn) {
                fn(el);
            });
            viewData.templateType = 'legacy';
            if (viewData.tagName) {
                viewCallbacks.tagHandler(el, viewData.tagName, viewData);
            }
            can.each(viewData && viewData.attrs || [], function (attributeName) {
                viewData.attributeName = attributeName;
                var callback = viewCallbacks.attr(attributeName);
                if (callback) {
                    callback(el, viewData);
                }
            });
        });
    };
    can.view.tag('content', function (el, tagData) {
        return tagData.scope;
    });
    can.view.Scanner = Scanner;
    return Scanner;
});
/*can@2.2.4#view/node_lists/node_lists*/
define('can@2.2.4#view/node_lists/node_lists', [
    'can/util/util',
    'can/view/elements'
], function (can) {
    var canExpando = true;
    try {
        document.createTextNode('')._ = 0;
    } catch (ex) {
        canExpando = false;
    }
    var nodeMap = {}, textNodeMap = {}, expando = 'ejs_' + Math.random(), _id = 0, id = function (node, localMap) {
            var _textNodeMap = localMap || textNodeMap;
            var id = readId(node, _textNodeMap);
            if (id) {
                return id;
            } else {
                if (canExpando || node.nodeType !== 3) {
                    ++_id;
                    return node[expando] = (node.nodeName ? 'element_' : 'obj_') + _id;
                } else {
                    ++_id;
                    _textNodeMap['text_' + _id] = node;
                    return 'text_' + _id;
                }
            }
        }, readId = function (node, textNodeMap) {
            if (canExpando || node.nodeType !== 3) {
                return node[expando];
            } else {
                for (var textNodeID in textNodeMap) {
                    if (textNodeMap[textNodeID] === node) {
                        return textNodeID;
                    }
                }
            }
        }, splice = [].splice, push = [].push, itemsInChildListTree = function (list) {
            var count = 0;
            for (var i = 0, len = list.length; i < len; i++) {
                var item = list[i];
                if (item.nodeType) {
                    count++;
                } else {
                    count += itemsInChildListTree(item);
                }
            }
            return count;
        }, replacementMap = function (replacements, idMap) {
            var map = {};
            for (var i = 0, len = replacements.length; i < len; i++) {
                var node = nodeLists.first(replacements[i]);
                map[id(node, idMap)] = replacements[i];
            }
            return map;
        };
    var nodeLists = {
            id: id,
            update: function (nodeList, newNodes) {
                var oldNodes = nodeLists.unregisterChildren(nodeList);
                newNodes = can.makeArray(newNodes);
                var oldListLength = nodeList.length;
                splice.apply(nodeList, [
                    0,
                    oldListLength
                ].concat(newNodes));
                if (nodeList.replacements) {
                    nodeLists.nestReplacements(nodeList);
                } else {
                    nodeLists.nestList(nodeList);
                }
                return oldNodes;
            },
            nestReplacements: function (list) {
                var index = 0, idMap = {}, rMap = replacementMap(list.replacements, idMap), rCount = list.replacements.length;
                while (index < list.length && rCount) {
                    var node = list[index], replacement = rMap[readId(node, idMap)];
                    if (replacement) {
                        list.splice(index, itemsInChildListTree(replacement), replacement);
                        rCount--;
                    }
                    index++;
                }
                list.replacements = [];
            },
            nestList: function (list) {
                var index = 0;
                while (index < list.length) {
                    var node = list[index], childNodeList = nodeMap[id(node)];
                    if (childNodeList) {
                        if (childNodeList !== list) {
                            list.splice(index, itemsInChildListTree(childNodeList), childNodeList);
                        }
                    } else {
                        nodeMap[id(node)] = list;
                    }
                    index++;
                }
            },
            last: function (nodeList) {
                var last = nodeList[nodeList.length - 1];
                if (last.nodeType) {
                    return last;
                } else {
                    return nodeLists.last(last);
                }
            },
            first: function (nodeList) {
                var first = nodeList[0];
                if (first.nodeType) {
                    return first;
                } else {
                    return nodeLists.first(first);
                }
            },
            flatten: function (nodeList) {
                var items = [];
                for (var i = 0; i < nodeList.length; i++) {
                    var item = nodeList[i];
                    if (item.nodeType) {
                        items.push(item);
                    } else {
                        items.push.apply(items, nodeLists.flatten(item));
                    }
                }
                return items;
            },
            register: function (nodeList, unregistered, parent) {
                nodeList.unregistered = unregistered;
                nodeList.parentList = parent;
                if (parent === true) {
                    nodeList.replacements = [];
                } else if (parent) {
                    parent.replacements.push(nodeList);
                    nodeList.replacements = [];
                } else {
                    nodeLists.nestList(nodeList);
                }
                return nodeList;
            },
            unregisterChildren: function (nodeList) {
                var nodes = [];
                can.each(nodeList, function (node) {
                    if (node.nodeType) {
                        if (!nodeList.replacements) {
                            delete nodeMap[id(node)];
                        }
                        nodes.push(node);
                    } else {
                        push.apply(nodes, nodeLists.unregister(node));
                    }
                });
                return nodes;
            },
            unregister: function (nodeList) {
                var nodes = nodeLists.unregisterChildren(nodeList);
                if (nodeList.unregistered) {
                    var unregisteredCallback = nodeList.unregistered;
                    delete nodeList.unregistered;
                    delete nodeList.replacements;
                    unregisteredCallback();
                }
                return nodes;
            },
            nodeMap: nodeMap
        };
    can.view.nodeLists = nodeLists;
    return nodeLists;
});
/*can@2.2.4#view/parser/parser*/
define('can@2.2.4#view/parser/parser', ['can/view/view'], function (can) {
    function makeMap(str) {
        var obj = {}, items = str.split(',');
        for (var i = 0; i < items.length; i++) {
            obj[items[i]] = true;
        }
        return obj;
    }
    function handleIntermediate(intermediate, handler) {
        for (var i = 0, len = intermediate.length; i < len; i++) {
            var item = intermediate[i];
            handler[item.tokenType].apply(handler, item.args);
        }
        return intermediate;
    }
    var alphaNumericHU = '-:A-Za-z0-9_', attributeNames = '[a-zA-Z_:][' + alphaNumericHU + ':.]*', spaceEQspace = '\\s*=\\s*', dblQuote2dblQuote = '"((?:\\\\.|[^"])*)"', quote2quote = '\'((?:\\\\.|[^\'])*)\'', attributeEqAndValue = '(?:' + spaceEQspace + '(?:' + '(?:"[^"]*")|(?:\'[^\']*\')|[^>\\s]+))?', matchStash = '\\{\\{[^\\}]*\\}\\}\\}?', stash = '\\{\\{([^\\}]*)\\}\\}\\}?', startTag = new RegExp('^<([' + alphaNumericHU + ']+)' + '(' + '(?:\\s*' + '(?:(?:' + '(?:' + attributeNames + ')?' + attributeEqAndValue + ')|' + '(?:' + matchStash + ')+)' + ')*' + ')\\s*(\\/?)>'), endTag = new RegExp('^<\\/([' + alphaNumericHU + ']+)[^>]*>'), attr = new RegExp('(?:' + '(?:(' + attributeNames + ')|' + stash + ')' + '(?:' + spaceEQspace + '(?:' + '(?:' + dblQuote2dblQuote + ')|(?:' + quote2quote + ')|([^>\\s]+)' + ')' + ')?)', 'g'), mustache = new RegExp(stash, 'g'), txtBreak = /<|\{\{/;
    var empty = makeMap('area,base,basefont,br,col,frame,hr,img,input,isindex,link,meta,param,embed');
    var block = makeMap('a,address,article,applet,aside,audio,blockquote,button,canvas,center,dd,del,dir,div,dl,dt,fieldset,figcaption,figure,footer,form,frameset,h1,h2,h3,h4,h5,h6,header,hgroup,hr,iframe,ins,isindex,li,map,menu,noframes,noscript,object,ol,output,p,pre,section,script,table,tbody,td,tfoot,th,thead,tr,ul,video');
    var inline = makeMap('abbr,acronym,applet,b,basefont,bdo,big,br,button,cite,code,del,dfn,em,font,i,iframe,img,input,ins,kbd,label,map,object,q,s,samp,script,select,small,span,strike,strong,sub,sup,textarea,tt,u,var');
    var closeSelf = makeMap('colgroup,dd,dt,li,options,p,td,tfoot,th,thead,tr');
    var fillAttrs = makeMap('checked,compact,declare,defer,disabled,ismap,multiple,nohref,noresize,noshade,nowrap,readonly,selected');
    var special = makeMap('script,style');
    var tokenTypes = 'start,end,close,attrStart,attrEnd,attrValue,chars,comment,special,done'.split(',');
    var fn = function () {
    };
    var HTMLParser = function (html, handler, returnIntermediate) {
        if (typeof html === 'object') {
            return handleIntermediate(html, handler);
        }
        var intermediate = [];
        handler = handler || {};
        if (returnIntermediate) {
            can.each(tokenTypes, function (name) {
                var callback = handler[name] || fn;
                handler[name] = function () {
                    if (callback.apply(this, arguments) !== false) {
                        intermediate.push({
                            tokenType: name,
                            args: can.makeArray(arguments)
                        });
                    }
                };
            });
        }
        function parseStartTag(tag, tagName, rest, unary) {
            tagName = tagName.toLowerCase();
            if (block[tagName]) {
                while (stack.last() && inline[stack.last()]) {
                    parseEndTag('', stack.last());
                }
            }
            if (closeSelf[tagName] && stack.last() === tagName) {
                parseEndTag('', tagName);
            }
            unary = empty[tagName] || !!unary;
            handler.start(tagName, unary);
            if (!unary) {
                stack.push(tagName);
            }
            HTMLParser.parseAttrs(rest, handler);
            handler.end(tagName, unary);
        }
        function parseEndTag(tag, tagName) {
            var pos;
            if (!tagName) {
                pos = 0;
            } else {
                for (pos = stack.length - 1; pos >= 0; pos--) {
                    if (stack[pos] === tagName) {
                        break;
                    }
                }
            }
            if (pos >= 0) {
                for (var i = stack.length - 1; i >= pos; i--) {
                    if (handler.close) {
                        handler.close(stack[i]);
                    }
                }
                stack.length = pos;
            }
        }
        function parseMustache(mustache, inside) {
            if (handler.special) {
                handler.special(inside);
            }
        }
        var index, chars, match, stack = [], last = html;
        stack.last = function () {
            return this[this.length - 1];
        };
        while (html) {
            chars = true;
            if (!stack.last() || !special[stack.last()]) {
                if (html.indexOf('<!--') === 0) {
                    index = html.indexOf('-->');
                    if (index >= 0) {
                        if (handler.comment) {
                            handler.comment(html.substring(4, index));
                        }
                        html = html.substring(index + 3);
                        chars = false;
                    }
                } else if (html.indexOf('</') === 0) {
                    match = html.match(endTag);
                    if (match) {
                        html = html.substring(match[0].length);
                        match[0].replace(endTag, parseEndTag);
                        chars = false;
                    }
                } else if (html.indexOf('<') === 0) {
                    match = html.match(startTag);
                    if (match) {
                        html = html.substring(match[0].length);
                        match[0].replace(startTag, parseStartTag);
                        chars = false;
                    }
                } else if (html.indexOf('{{') === 0) {
                    match = html.match(mustache);
                    if (match) {
                        html = html.substring(match[0].length);
                        match[0].replace(mustache, parseMustache);
                    }
                }
                if (chars) {
                    index = html.search(txtBreak);
                    var text = index < 0 ? html : html.substring(0, index);
                    html = index < 0 ? '' : html.substring(index);
                    if (handler.chars && text) {
                        handler.chars(text);
                    }
                }
            } else {
                html = html.replace(new RegExp('([\\s\\S]*?)</' + stack.last() + '[^>]*>'), function (all, text) {
                    text = text.replace(/<!--([\s\S]*?)-->|<!\[CDATA\[([\s\S]*?)]]>/g, '$1$2');
                    if (handler.chars) {
                        handler.chars(text);
                    }
                    return '';
                });
                parseEndTag('', stack.last());
            }
            if (html === last) {
                throw 'Parse Error: ' + html;
            }
            last = html;
        }
        parseEndTag();
        handler.done();
        return intermediate;
    };
    HTMLParser.parseAttrs = function (rest, handler) {
        (rest != null ? rest : '').replace(attr, function (text, name, special, dblQuote, singleQuote, val) {
            if (special) {
                handler.special(special);
            }
            if (name || dblQuote || singleQuote || val) {
                var value = arguments[3] ? arguments[3] : arguments[4] ? arguments[4] : arguments[5] ? arguments[5] : fillAttrs[name.toLowerCase()] ? name : '';
                handler.attrStart(name || '');
                var last = mustache.lastIndex = 0, res = mustache.exec(value), chars;
                while (res) {
                    chars = value.substring(last, mustache.lastIndex - res[0].length);
                    if (chars.length) {
                        handler.attrValue(chars);
                    }
                    handler.special(res[1]);
                    last = mustache.lastIndex;
                    res = mustache.exec(value);
                }
                chars = value.substr(last, value.length);
                if (chars) {
                    handler.attrValue(chars);
                }
                handler.attrEnd(name || '');
            }
        });
    };
    can.view.parser = HTMLParser;
    return HTMLParser;
});
/*can@2.2.4#view/live/live*/
define('can@2.2.4#view/live/live', [
    'can/util/util',
    'can/view/elements',
    'can/view/view',
    'can/view/node_lists/node_lists',
    'can/view/parser/parser'
], function (can, elements, view, nodeLists, parser) {
    elements = elements || can.view.elements;
    nodeLists = nodeLists || can.view.NodeLists;
    parser = parser || can.view.parser;
    var setup = function (el, bind, unbind) {
            var tornDown = false, teardown = function () {
                    if (!tornDown) {
                        tornDown = true;
                        unbind(data);
                        can.unbind.call(el, 'removed', teardown);
                    }
                    return true;
                }, data = {
                    teardownCheck: function (parent) {
                        return parent ? false : teardown();
                    }
                };
            can.bind.call(el, 'removed', teardown);
            bind(data);
            return data;
        }, listen = function (el, compute, change) {
            return setup(el, function () {
                compute.bind('change', change);
            }, function (data) {
                compute.unbind('change', change);
                if (data.nodeList) {
                    nodeLists.unregister(data.nodeList);
                }
            });
        }, getAttributeParts = function (newVal) {
            var attrs = {}, attr;
            parser.parseAttrs(newVal, {
                attrStart: function (name) {
                    attrs[name] = '';
                    attr = name;
                },
                attrValue: function (value) {
                    attrs[attr] += value;
                },
                attrEnd: function () {
                }
            });
            return attrs;
        }, splice = [].splice, isNode = function (obj) {
            return obj && obj.nodeType;
        }, addTextNodeIfNoChildren = function (frag) {
            if (!frag.childNodes.length) {
                frag.appendChild(document.createTextNode(''));
            }
        };
    var live = {
            list: function (el, compute, render, context, parentNode, nodeList) {
                var masterNodeList = nodeList || [el], indexMap = [], afterPreviousEvents = false, add = function (ev, items, index) {
                        if (!afterPreviousEvents) {
                            return;
                        }
                        var frag = document.createDocumentFragment(), newNodeLists = [], newIndicies = [];
                        can.each(items, function (item, key) {
                            var itemNodeList = [];
                            if (nodeList) {
                                nodeLists.register(itemNodeList, null, true);
                            }
                            var itemIndex = can.compute(key + index), itemHTML = render.call(context, item, itemIndex, itemNodeList), gotText = typeof itemHTML === 'string', itemFrag = can.frag(itemHTML);
                            itemFrag = gotText ? can.view.hookup(itemFrag) : itemFrag;
                            var childNodes = can.makeArray(itemFrag.childNodes);
                            if (nodeList) {
                                nodeLists.update(itemNodeList, childNodes);
                                newNodeLists.push(itemNodeList);
                            } else {
                                newNodeLists.push(nodeLists.register(childNodes));
                            }
                            frag.appendChild(itemFrag);
                            newIndicies.push(itemIndex);
                        });
                        var masterListIndex = index + 1;
                        if (!masterNodeList[masterListIndex]) {
                            elements.after(masterListIndex === 1 ? [text] : [nodeLists.last(masterNodeList[masterListIndex - 1])], frag);
                        } else {
                            var el = nodeLists.first(masterNodeList[masterListIndex]);
                            can.insertBefore(el.parentNode, frag, el);
                        }
                        splice.apply(masterNodeList, [
                            masterListIndex,
                            0
                        ].concat(newNodeLists));
                        splice.apply(indexMap, [
                            index,
                            0
                        ].concat(newIndicies));
                        for (var i = index + newIndicies.length, len = indexMap.length; i < len; i++) {
                            indexMap[i](i);
                        }
                    }, remove = function (ev, items, index, duringTeardown, fullTeardown) {
                        if (!afterPreviousEvents) {
                            return;
                        }
                        if (!duringTeardown && data.teardownCheck(text.parentNode)) {
                            return;
                        }
                        if (index < 0) {
                            index = indexMap.length + index;
                        }
                        var removedMappings = masterNodeList.splice(index + 1, items.length), itemsToRemove = [];
                        can.each(removedMappings, function (nodeList) {
                            var nodesToRemove = nodeLists.unregister(nodeList);
                            [].push.apply(itemsToRemove, nodesToRemove);
                        });
                        indexMap.splice(index, items.length);
                        for (var i = index, len = indexMap.length; i < len; i++) {
                            indexMap[i](i);
                        }
                        if (!fullTeardown) {
                            can.remove(can.$(itemsToRemove));
                        } else {
                            nodeLists.unregister(masterNodeList);
                        }
                    }, move = function (ev, item, newIndex, currentIndex) {
                        if (!afterPreviousEvents) {
                            return;
                        }
                        newIndex = newIndex + 1;
                        currentIndex = currentIndex + 1;
                        var referenceNodeList = masterNodeList[newIndex];
                        var movedElements = can.frag(nodeLists.flatten(masterNodeList[currentIndex]));
                        var referenceElement;
                        if (currentIndex < newIndex) {
                            referenceElement = nodeLists.last(referenceNodeList).nextSibling;
                        } else {
                            referenceElement = nodeLists.first(referenceNodeList);
                        }
                        var parentNode = masterNodeList[0].parentNode;
                        parentNode.insertBefore(movedElements, referenceElement);
                        var temp = masterNodeList[currentIndex];
                        [].splice.apply(masterNodeList, [
                            currentIndex,
                            1
                        ]);
                        [].splice.apply(masterNodeList, [
                            newIndex,
                            0,
                            temp
                        ]);
                    }, text = document.createTextNode(''), list, teardownList = function (fullTeardown) {
                        if (list && list.unbind) {
                            list.unbind('add', add).unbind('remove', remove).unbind('move', move);
                        }
                        remove({}, { length: masterNodeList.length - 1 }, 0, true, fullTeardown);
                    }, updateList = function (ev, newList, oldList) {
                        teardownList();
                        list = newList || [];
                        if (list.bind) {
                            list.bind('add', add).bind('remove', remove).bind('move', move);
                        }
                        afterPreviousEvents = true;
                        add({}, list, 0);
                        afterPreviousEvents = false;
                        can.batch.afterPreviousEvents(function () {
                            afterPreviousEvents = true;
                        });
                    };
                parentNode = elements.getParentNode(el, parentNode);
                var data = setup(parentNode, function () {
                        if (can.isFunction(compute)) {
                            compute.bind('change', updateList);
                        }
                    }, function () {
                        if (can.isFunction(compute)) {
                            compute.unbind('change', updateList);
                        }
                        teardownList(true);
                    });
                if (!nodeList) {
                    live.replace(masterNodeList, text, data.teardownCheck);
                } else {
                    elements.replace(masterNodeList, text);
                    nodeLists.update(masterNodeList, [text]);
                    nodeList.unregistered = data.teardownCheck;
                }
                updateList({}, can.isFunction(compute) ? compute() : compute);
            },
            html: function (el, compute, parentNode, nodeList) {
                var data;
                parentNode = elements.getParentNode(el, parentNode);
                data = listen(parentNode, compute, function (ev, newVal, oldVal) {
                    var attached = nodeLists.first(nodes).parentNode;
                    if (attached) {
                        makeAndPut(newVal);
                    }
                    data.teardownCheck(nodeLists.first(nodes).parentNode);
                });
                var nodes = nodeList || [el], makeAndPut = function (val) {
                        var isFunction = typeof val === 'function', aNode = isNode(val), frag = can.frag(isFunction ? '' : val), oldNodes = can.makeArray(nodes);
                        addTextNodeIfNoChildren(frag);
                        if (!aNode && !isFunction) {
                            frag = can.view.hookup(frag, parentNode);
                        }
                        oldNodes = nodeLists.update(nodes, frag.childNodes);
                        if (isFunction) {
                            val(frag.childNodes[0]);
                        }
                        elements.replace(oldNodes, frag);
                    };
                data.nodeList = nodes;
                if (!nodeList) {
                    nodeLists.register(nodes, data.teardownCheck);
                } else {
                    nodeList.unregistered = data.teardownCheck;
                }
                makeAndPut(compute());
            },
            replace: function (nodes, val, teardown) {
                var oldNodes = nodes.slice(0), frag = can.frag(val);
                nodeLists.register(nodes, teardown);
                if (typeof val === 'string') {
                    frag = can.view.hookup(frag, nodes[0].parentNode);
                }
                nodeLists.update(nodes, frag.childNodes);
                elements.replace(oldNodes, frag);
                return nodes;
            },
            text: function (el, compute, parentNode, nodeList) {
                var parent = elements.getParentNode(el, parentNode);
                var data = listen(parent, compute, function (ev, newVal, oldVal) {
                        if (typeof node.nodeValue !== 'unknown') {
                            node.nodeValue = can.view.toStr(newVal);
                        }
                        data.teardownCheck(node.parentNode);
                    });
                var node = document.createTextNode(can.view.toStr(compute()));
                if (nodeList) {
                    nodeList.unregistered = data.teardownCheck;
                    data.nodeList = nodeList;
                    nodeLists.update(nodeList, [node]);
                    elements.replace([el], node);
                } else {
                    data.nodeList = live.replace([el], node, data.teardownCheck);
                }
            },
            setAttributes: function (el, newVal) {
                var attrs = getAttributeParts(newVal);
                for (var name in attrs) {
                    can.attr.set(el, name, attrs[name]);
                }
            },
            attributes: function (el, compute, currentValue) {
                var oldAttrs = {};
                var setAttrs = function (newVal) {
                    var newAttrs = getAttributeParts(newVal), name;
                    for (name in newAttrs) {
                        var newValue = newAttrs[name], oldValue = oldAttrs[name];
                        if (newValue !== oldValue) {
                            can.attr.set(el, name, newValue);
                        }
                        delete oldAttrs[name];
                    }
                    for (name in oldAttrs) {
                        elements.removeAttr(el, name);
                    }
                    oldAttrs = newAttrs;
                };
                listen(el, compute, function (ev, newVal) {
                    setAttrs(newVal);
                });
                if (arguments.length >= 3) {
                    oldAttrs = getAttributeParts(currentValue);
                } else {
                    setAttrs(compute());
                }
            },
            attributePlaceholder: '__!!__',
            attributeReplace: /__!!__/g,
            attribute: function (el, attributeName, compute) {
                listen(el, compute, function (ev, newVal) {
                    elements.setAttr(el, attributeName, hook.render());
                });
                var wrapped = can.$(el), hooks;
                hooks = can.data(wrapped, 'hooks');
                if (!hooks) {
                    can.data(wrapped, 'hooks', hooks = {});
                }
                var attr = elements.getAttr(el, attributeName), parts = attr.split(live.attributePlaceholder), goodParts = [], hook;
                goodParts.push(parts.shift(), parts.join(live.attributePlaceholder));
                if (hooks[attributeName]) {
                    hooks[attributeName].computes.push(compute);
                } else {
                    hooks[attributeName] = {
                        render: function () {
                            var i = 0, newAttr = attr ? attr.replace(live.attributeReplace, function () {
                                    return elements.contentText(hook.computes[i++]());
                                }) : elements.contentText(hook.computes[i++]());
                            return newAttr;
                        },
                        computes: [compute],
                        batchNum: undefined
                    };
                }
                hook = hooks[attributeName];
                goodParts.splice(1, 0, compute());
                elements.setAttr(el, attributeName, goodParts.join(''));
            },
            specialAttribute: function (el, attributeName, compute) {
                listen(el, compute, function (ev, newVal) {
                    elements.setAttr(el, attributeName, getValue(newVal));
                });
                elements.setAttr(el, attributeName, getValue(compute()));
            },
            simpleAttribute: function (el, attributeName, compute) {
                listen(el, compute, function (ev, newVal) {
                    elements.setAttr(el, attributeName, newVal);
                });
                elements.setAttr(el, attributeName, compute());
            }
        };
    live.attr = live.simpleAttribute;
    live.attrs = live.attributes;
    var newLine = /(\r|\n)+/g;
    var getValue = function (val) {
        var regexp = /^["'].*["']$/;
        val = val.replace(elements.attrReg, '').replace(newLine, '');
        return regexp.test(val) ? val.substr(1, val.length - 2) : val;
    };
    can.view.live = live;
    return live;
});
/*can@2.2.4#view/render*/
define('can@2.2.4#view/render', [
    'can/view/view',
    './elements',
    'can/view/live/live',
    'can/util/string/string'
], function (can, elements, live) {
    var pendingHookups = [], tagChildren = function (tagName) {
            var newTag = elements.tagMap[tagName] || 'span';
            if (newTag === 'span') {
                return '@@!!@@';
            }
            return '<' + newTag + '>' + tagChildren(newTag) + '</' + newTag + '>';
        }, contentText = function (input, tag) {
            if (typeof input === 'string') {
                return input;
            }
            if (!input && input !== 0) {
                return '';
            }
            var hook = input.hookup && function (el, id) {
                    input.hookup.call(input, el, id);
                } || typeof input === 'function' && input;
            if (hook) {
                if (tag) {
                    return '<' + tag + ' ' + can.view.hook(hook) + '></' + tag + '>';
                } else {
                    pendingHookups.push(hook);
                }
                return '';
            }
            return '' + input;
        }, contentEscape = function (txt, tag) {
            return typeof txt === 'string' || typeof txt === 'number' ? can.esc(txt) : contentText(txt, tag);
        }, withinTemplatedSectionWithinAnElement = false, emptyHandler = function () {
        };
    var lastHookups;
    can.extend(can.view, {
        live: live,
        setupLists: function () {
            var old = can.view.lists, data;
            can.view.lists = function (list, renderer) {
                data = {
                    list: list,
                    renderer: renderer
                };
                return Math.random();
            };
            return function () {
                can.view.lists = old;
                return data;
            };
        },
        getHooks: function () {
            var hooks = pendingHookups.slice(0);
            lastHookups = hooks;
            pendingHookups = [];
            return hooks;
        },
        onlytxt: function (self, func) {
            return contentEscape(func.call(self));
        },
        txt: function (escape, tagName, status, self, func) {
            var tag = elements.tagMap[tagName] || 'span', setupLiveBinding = false, value, listData, compute, unbind = emptyHandler, attributeName;
            if (withinTemplatedSectionWithinAnElement) {
                value = func.call(self);
            } else {
                if (typeof status === 'string' || status === 1) {
                    withinTemplatedSectionWithinAnElement = true;
                }
                var listTeardown = can.view.setupLists();
                unbind = function () {
                    compute.unbind('change', emptyHandler);
                };
                compute = can.compute(func, self, false);
                compute.bind('change', emptyHandler);
                listData = listTeardown();
                value = compute();
                withinTemplatedSectionWithinAnElement = false;
                setupLiveBinding = compute.computeInstance.hasDependencies;
            }
            if (listData) {
                unbind();
                return '<' + tag + can.view.hook(function (el, parentNode) {
                    live.list(el, listData.list, listData.renderer, self, parentNode);
                }) + '></' + tag + '>';
            }
            if (!setupLiveBinding || typeof value === 'function') {
                unbind();
                return (withinTemplatedSectionWithinAnElement || escape === 2 || !escape ? contentText : contentEscape)(value, status === 0 && tag);
            }
            var contentProp = elements.tagToContentPropMap[tagName];
            if (status === 0 && !contentProp) {
                return '<' + tag + can.view.hook(escape && typeof value !== 'object' ? function (el, parentNode) {
                    live.text(el, compute, parentNode);
                    unbind();
                } : function (el, parentNode) {
                    live.html(el, compute, parentNode);
                    unbind();
                }) + '>' + tagChildren(tag) + '</' + tag + '>';
            } else if (status === 1) {
                pendingHookups.push(function (el) {
                    live.attributes(el, compute, compute());
                    unbind();
                });
                return compute();
            } else if (escape === 2) {
                attributeName = status;
                pendingHookups.push(function (el) {
                    live.specialAttribute(el, attributeName, compute);
                    unbind();
                });
                return compute();
            } else {
                attributeName = status === 0 ? contentProp : status;
                (status === 0 ? lastHookups : pendingHookups).push(function (el) {
                    live.attribute(el, attributeName, compute);
                    unbind();
                });
                return live.attributePlaceholder;
            }
        }
    });
    return can;
});
/*can@2.2.4#view/stache/utils*/
define('can@2.2.4#view/stache/utils', ['can/util/util'], function () {
    return {
        isArrayLike: function (obj) {
            return obj && obj.splice && typeof obj.length === 'number';
        },
        isObserveLike: function (obj) {
            return obj instanceof can.Map || obj && !!obj._get;
        },
        emptyHandler: function () {
        },
        jsonParse: function (str) {
            if (str[0] === '\'') {
                return str.substr(1, str.length - 2);
            } else if (str === 'undefined') {
                return undefined;
            } else if (can.global.JSON) {
                return JSON.parse(str);
            } else {
                return eval('(' + str + ')');
            }
        },
        mixins: {
            last: function () {
                return this.stack[this.stack.length - 1];
            },
            add: function (chars) {
                this.last().add(chars);
            },
            subSectionDepth: function () {
                return this.stack.length - 1;
            }
        }
    };
});
/*can@2.2.4#view/stache/mustache_helpers*/
define('can@2.2.4#view/stache/mustache_helpers', [
    'can/util/util',
    './utils',
    'can/view/live/live'
], function (can, utils, live) {
    live = live || can.view.live;
    var resolve = function (value) {
        if (utils.isObserveLike(value) && utils.isArrayLike(value) && value.attr('length')) {
            return value;
        } else if (can.isFunction(value)) {
            return value();
        } else {
            return value;
        }
    };
    var helpers = {
            'each': function (items, options) {
                var resolved = resolve(items), result = [], keys, key, i;
                if (resolved instanceof can.List) {
                    return function (el) {
                        var cb = function (item, index, parentNodeList) {
                            return options.fn(options.scope.add({ '@index': index }).add(item), options.options, parentNodeList);
                        };
                        live.list(el, items, cb, options.context, el.parentNode, options.nodeList);
                    };
                }
                var expr = resolved;
                if (!!expr && utils.isArrayLike(expr)) {
                    for (i = 0; i < expr.length; i++) {
                        result.push(options.fn(options.scope.add({ '@index': i }).add(expr[i])));
                    }
                } else if (utils.isObserveLike(expr)) {
                    keys = can.Map.keys(expr);
                    for (i = 0; i < keys.length; i++) {
                        key = keys[i];
                        result.push(options.fn(options.scope.add({ '@key': key }).add(expr[key])));
                    }
                } else if (expr instanceof Object) {
                    for (key in expr) {
                        result.push(options.fn(options.scope.add({ '@key': key }).add(expr[key])));
                    }
                }
                return result;
            },
            '@index': function (offset, options) {
                if (!options) {
                    options = offset;
                    offset = 0;
                }
                var index = options.scope.attr('@index');
                return '' + ((can.isFunction(index) ? index() : index) + offset);
            },
            'if': function (expr, options) {
                var value;
                if (can.isFunction(expr)) {
                    value = can.compute.truthy(expr)();
                } else {
                    value = !!resolve(expr);
                }
                if (value) {
                    return options.fn(options.scope || this);
                } else {
                    return options.inverse(options.scope || this);
                }
            },
            'is': function () {
                var lastValue, curValue, options = arguments[arguments.length - 1];
                if (arguments.length - 2 <= 0) {
                    return options.inverse();
                }
                for (var i = 0; i < arguments.length - 1; i++) {
                    curValue = resolve(arguments[i]);
                    curValue = can.isFunction(curValue) ? curValue() : curValue;
                    if (i > 0) {
                        if (curValue !== lastValue) {
                            return options.inverse();
                        }
                    }
                    lastValue = curValue;
                }
                return options.fn();
            },
            'eq': function () {
                return helpers.is.apply(this, arguments);
            },
            'unless': function (expr, options) {
                return helpers['if'].apply(this, [
                    can.isFunction(expr) ? can.compute(function () {
                        return !expr();
                    }) : !expr,
                    options
                ]);
            },
            'with': function (expr, options) {
                var ctx = expr;
                expr = resolve(expr);
                if (!!expr) {
                    return options.fn(ctx);
                }
            },
            'log': function (expr, options) {
                if (typeof console !== 'undefined' && console.log) {
                    if (!options) {
                        console.log(expr.context);
                    } else {
                        console.log(expr, options.context);
                    }
                }
            },
            'data': function (attr) {
                var data = arguments.length === 2 ? this : arguments[1];
                return function (el) {
                    can.data(can.$(el), attr, data || this.context);
                };
            }
        };
    return {
        registerHelper: function (name, callback) {
            helpers[name] = callback;
        },
        getHelper: function (name, options) {
            var helper = options.attr('helpers.' + name);
            if (!helper) {
                helper = helpers[name];
            }
            if (helper) {
                return { fn: helper };
            }
        }
    };
});
/*can@2.2.4#view/stache/mustache_core*/
define('can@2.2.4#view/stache/mustache_core', [
    'can/util/util',
    './utils',
    './mustache_helpers',
    'can/view/live/live',
    'can/view/elements',
    'can/view/scope/scope',
    'can/view/node_lists/node_lists'
], function (can, utils, mustacheHelpers, live, elements, Scope, nodeLists) {
    live = live || can.view.live;
    elements = elements || can.view.elements;
    Scope = Scope || can.view.Scope;
    nodeLists = nodeLists || can.view.nodeLists;
    var argumentsRegExp = /((([^'"\s]+?=)?('.*?'|".*?"))|.*?)\s/g, literalNumberStringBooleanRegExp = /^(?:(?:('.*?'|".*?")|([0-9]+\.?[0-9]*|true|false|null|undefined))|(?:(.+?)=(?:(?:('.*?'|".*?")|([0-9]+\.?[0-9]*|true|false|null|undefined))|(.+))))$/, mustacheLineBreakRegExp = /(?:(?:^|(\r?)\n)(\s*)(\{\{([^\}]*)\}\}\}?)([^\S\n\r]*)($|\r?\n))|(\{\{([^\}]*)\}\}\}?)/g, isLookup = function (obj) {
            return obj && typeof obj.get === 'string';
        }, getItemsFragContent = function (items, isObserveList, helperOptions, options) {
            var frag = document.createDocumentFragment();
            for (var i = 0, len = items.length; i < len; i++) {
                append(frag, helperOptions.fn(isObserveList ? items.attr('' + i) : items[i], options));
            }
            return frag;
        }, append = function (frag, content) {
            if (content) {
                frag.appendChild(typeof content === 'string' ? document.createTextNode(content) : content);
            }
        }, getItemsStringContent = function (items, isObserveList, helperOptions, options) {
            var txt = '';
            for (var i = 0, len = items.length; i < len; i++) {
                txt += helperOptions.fn(isObserveList ? items.attr('' + i) : items[i], options);
            }
            return txt;
        }, getKeyComputeData = function (key, scope, isArgument) {
            var data = scope.computeData(key, {
                    isArgument: isArgument,
                    args: [
                        scope.attr('.'),
                        scope
                    ]
                });
            can.compute.temporarilyBind(data.compute);
            return data;
        }, getKeyArgValue = function (key, scope) {
            var data = getKeyComputeData(key, scope, true);
            if (!data.compute.computeInstance.hasDependencies) {
                return data.initialValue;
            } else {
                return data.compute;
            }
        }, convertToScopes = function (helperOptions, scope, options, nodeList, truthyRenderer, falseyRenderer) {
            if (truthyRenderer) {
                helperOptions.fn = makeRendererConvertScopes(truthyRenderer, scope, options, nodeList);
            }
            if (falseyRenderer) {
                helperOptions.inverse = makeRendererConvertScopes(falseyRenderer, scope, options, nodeList);
            }
        }, makeRendererConvertScopes = function (renderer, parentScope, parentOptions, nodeList) {
            var rendererWithScope = function (ctx, opts, parentNodeList) {
                return renderer(ctx || parentScope, opts, parentNodeList);
            };
            return function (newScope, newOptions, parentNodeList) {
                var reads = can.__clearReading();
                if (newScope !== undefined && !(newScope instanceof can.view.Scope)) {
                    newScope = parentScope.add(newScope);
                }
                if (newOptions !== undefined && !(newOptions instanceof core.Options)) {
                    newOptions = parentOptions.add(newOptions);
                }
                var result = rendererWithScope(newScope, newOptions || parentOptions, parentNodeList || nodeList);
                can.__setReading(reads);
                return result;
            };
        };
    var core = {
            expressionData: function (expression) {
                var args = [], hashes = {}, i = 0;
                (can.trim(expression) + ' ').replace(argumentsRegExp, function (whole, arg) {
                    var m;
                    if (i && (m = arg.match(literalNumberStringBooleanRegExp))) {
                        if (m[1] || m[2]) {
                            args.push(utils.jsonParse(m[1] || m[2]));
                        } else {
                            hashes[m[3]] = m[6] ? { get: m[6] } : utils.jsonParse(m[4] || m[5]);
                        }
                    } else {
                        args.push({ get: arg });
                    }
                    i++;
                });
                return {
                    name: args.shift(),
                    args: args,
                    hash: hashes
                };
            },
            makeEvaluator: function (scope, options, nodeList, mode, exprData, truthyRenderer, falseyRenderer, stringOnly) {
                var args = [], hash = {}, helperOptions = {
                        fn: function () {
                        },
                        inverse: function () {
                        }
                    }, context = scope.attr('.'), name = exprData.name, helper, looksLikeAHelper = exprData.args.length || !can.isEmptyObject(exprData.hash), initialValue;
                for (var i = 0, len = exprData.args.length; i < len; i++) {
                    var arg = exprData.args[i];
                    if (arg && isLookup(arg)) {
                        args.push(getKeyArgValue(arg.get, scope, true));
                    } else {
                        args.push(arg);
                    }
                }
                for (var prop in exprData.hash) {
                    if (isLookup(exprData.hash[prop])) {
                        hash[prop] = getKeyArgValue(exprData.hash[prop].get, scope);
                    } else {
                        hash[prop] = exprData.hash[prop];
                    }
                }
                if (isLookup(name)) {
                    if (looksLikeAHelper) {
                        helper = mustacheHelpers.getHelper(name.get, options);
                        if (!helper && typeof context[name.get] === 'function') {
                            helper = { fn: context[name.get] };
                        }
                    }
                    if (!helper) {
                        var get = name.get;
                        var computeData = getKeyComputeData(name.get, scope, false), compute = computeData.compute;
                        initialValue = computeData.initialValue;
                        if (computeData.reads && computeData.reads.length === 1 && computeData.root instanceof can.Map && !can.isFunction(computeData.root[computeData.reads[0]])) {
                            compute = can.compute(computeData.root, computeData.reads[0]);
                        }
                        if (computeData.compute.computeInstance.hasDependencies) {
                            name = compute;
                        } else {
                            name = initialValue;
                        }
                        if (!looksLikeAHelper && initialValue === undefined) {
                            helper = mustacheHelpers.getHelper(get, options);
                        } else if (typeof initialValue === 'function') {
                            helper = { fn: initialValue };
                        }
                    }
                }
                if (mode === '^') {
                    var temp = truthyRenderer;
                    truthyRenderer = falseyRenderer;
                    falseyRenderer = temp;
                }
                if (helper) {
                    convertToScopes(helperOptions, scope, options, nodeList, truthyRenderer, falseyRenderer);
                    can.simpleExtend(helperOptions, {
                        context: context,
                        scope: scope,
                        contexts: scope,
                        hash: hash,
                        nodeList: nodeList,
                        exprData: exprData
                    });
                    args.push(helperOptions);
                    return function () {
                        return helper.fn.apply(context, args) || '';
                    };
                }
                if (!mode) {
                    if (name && name.isComputed) {
                        return name;
                    } else {
                        return function () {
                            return '' + (name != null ? name : '');
                        };
                    }
                } else if (mode === '#' || mode === '^') {
                    convertToScopes(helperOptions, scope, options, nodeList, truthyRenderer, falseyRenderer);
                    var evaluator = function () {
                        var value;
                        if (can.isFunction(name) && name.isComputed) {
                            value = name();
                        } else {
                            value = name;
                        }
                        if (utils.isArrayLike(value)) {
                            var isObserveList = utils.isObserveLike(value);
                            if (isObserveList ? value.attr('length') : value.length) {
                                return (stringOnly ? getItemsStringContent : getItemsFragContent)(value, isObserveList, helperOptions, options);
                            } else {
                                return helperOptions.inverse(scope, options);
                            }
                        } else {
                            return value ? helperOptions.fn(value || scope, options) : helperOptions.inverse(scope, options);
                        }
                    };
                    evaluator.bindOnce = false;
                    return evaluator;
                } else {
                }
            },
            makeLiveBindingPartialRenderer: function (partialName, state) {
                partialName = can.trim(partialName);
                return function (scope, options, parentSectionNodeList) {
                    var nodeList = [this];
                    nodeList.expression = '>' + partialName;
                    nodeLists.register(nodeList, null, state.directlyNested ? parentSectionNodeList || true : true);
                    var partialFrag = can.compute(function () {
                            var localPartialName = partialName;
                            var partial = options.attr('partials.' + localPartialName), res;
                            if (partial) {
                                res = partial.render ? partial.render(scope, options) : partial(scope, options);
                            } else {
                                var scopePartialName = scope.read(localPartialName, {
                                        isArgument: true,
                                        returnObserveMethods: true,
                                        proxyMethods: false
                                    }).value;
                                if (scopePartialName) {
                                    localPartialName = scopePartialName;
                                }
                                res = can.view.render(localPartialName, scope, options);
                            }
                            return can.frag(res);
                        });
                    live.html(this, partialFrag, this.parentNode, nodeList);
                };
            },
            makeStringBranchRenderer: function (mode, expression) {
                var exprData = expressionData(expression), fullExpression = mode + expression;
                return function branchRenderer(scope, options, truthyRenderer, falseyRenderer) {
                    var evaluator = scope.__cache[fullExpression];
                    if (mode || !evaluator) {
                        evaluator = makeEvaluator(scope, options, null, mode, exprData, truthyRenderer, falseyRenderer, true);
                        if (!mode) {
                            scope.__cache[fullExpression] = evaluator;
                        }
                    }
                    var res = evaluator();
                    return res == null ? '' : '' + res;
                };
            },
            makeLiveBindingBranchRenderer: function (mode, expression, state) {
                var exprData = expressionData(expression);
                return function branchRenderer(scope, options, parentSectionNodeList, truthyRenderer, falseyRenderer) {
                    var nodeList = [this];
                    nodeList.expression = expression;
                    nodeLists.register(nodeList, null, state.directlyNested ? parentSectionNodeList || true : true);
                    var evaluator = makeEvaluator(scope, options, nodeList, mode, exprData, truthyRenderer, falseyRenderer, state.tag);
                    var compute = can.compute(evaluator, null, false, evaluator.bindOnce === false ? false : true);
                    compute.bind('change', can.k);
                    var value = compute();
                    if (typeof value === 'function') {
                        var old = can.__clearReading();
                        value(this);
                        can.__setReading(old);
                    } else if (compute.computeInstance.hasDependencies) {
                        if (state.attr) {
                            live.simpleAttribute(this, state.attr, compute);
                        } else if (state.tag) {
                            live.attributes(this, compute);
                        } else if (state.text && typeof value !== 'object') {
                            live.text(this, compute, this.parentNode, nodeList);
                        } else {
                            live.html(this, compute, this.parentNode, nodeList);
                        }
                    } else {
                        if (state.attr) {
                            can.attr.set(this, state.attr, value);
                        } else if (state.tag) {
                            live.setAttributes(this, value);
                        } else if (state.text && typeof value === 'string') {
                            this.nodeValue = value;
                        } else if (value) {
                            elements.replace([this], can.frag(value));
                        }
                    }
                    compute.unbind('change', can.k);
                };
            },
            splitModeFromExpression: function (expression, state) {
                expression = can.trim(expression);
                var mode = expression.charAt(0);
                if ('#/{&^>!'.indexOf(mode) >= 0) {
                    expression = can.trim(expression.substr(1));
                } else {
                    mode = null;
                }
                if (mode === '{' && state.node) {
                    mode = null;
                }
                return {
                    mode: mode,
                    expression: expression
                };
            },
            cleanLineEndings: function (template) {
                return template.replace(mustacheLineBreakRegExp, function (whole, returnBefore, spaceBefore, special, expression, spaceAfter, returnAfter, spaceLessSpecial, spaceLessExpression, matchIndex) {
                    spaceAfter = spaceAfter || '';
                    returnBefore = returnBefore || '';
                    spaceBefore = spaceBefore || '';
                    var modeAndExpression = splitModeFromExpression(expression || spaceLessExpression, {});
                    if (spaceLessSpecial || '>{'.indexOf(modeAndExpression.mode) >= 0) {
                        return whole;
                    } else if ('^#!/'.indexOf(modeAndExpression.mode) >= 0) {
                        return special + (matchIndex !== 0 && returnAfter.length ? returnBefore + '\n' : '');
                    } else {
                        return spaceBefore + special + spaceAfter + (spaceBefore.length || matchIndex !== 0 ? returnBefore + '\n' : '');
                    }
                });
            },
            Options: can.view.Scope.extend({
                init: function (data, parent) {
                    if (!data.helpers && !data.partials && !data.tags) {
                        data = { helpers: data };
                    }
                    can.view.Scope.prototype.init.apply(this, arguments);
                }
            })
        };
    var makeEvaluator = core.makeEvaluator, expressionData = core.expressionData, splitModeFromExpression = core.splitModeFromExpression;
    return core;
});
/*can@2.2.4#view/bindings/bindings*/
define('can@2.2.4#view/bindings/bindings', [
    'can/util/util',
    'can/view/stache/mustache_core',
    'can/view/callbacks/callbacks',
    'can/control/control',
    'can/view/scope/scope'
], function (can, mustacheCore) {
    var isContentEditable = function () {
            var values = {
                    '': true,
                    'true': true,
                    'false': false
                };
            var editable = function (el) {
                if (!el || !el.getAttribute) {
                    return;
                }
                var attr = el.getAttribute('contenteditable');
                return values[attr];
            };
            return function (el) {
                var val = editable(el);
                if (typeof val === 'boolean') {
                    return val;
                } else {
                    return !!editable(el.parentNode);
                }
            };
        }(), removeCurly = function (value) {
            if (value[0] === '{' && value[value.length - 1] === '}') {
                return value.substr(1, value.length - 2);
            }
            return value;
        };
    can.view.attr('can-value', function (el, data) {
        var attr = can.trim(removeCurly(el.getAttribute('can-value'))), value = data.scope.computeData(attr, { args: [] }).compute, trueValue, falseValue;
        if (el.nodeName.toLowerCase() === 'input') {
            if (el.type === 'checkbox') {
                if (can.attr.has(el, 'can-true-value')) {
                    trueValue = el.getAttribute('can-true-value');
                } else {
                    trueValue = true;
                }
                if (can.attr.has(el, 'can-false-value')) {
                    falseValue = el.getAttribute('can-false-value');
                } else {
                    falseValue = false;
                }
            }
            if (el.type === 'checkbox' || el.type === 'radio') {
                new Checked(el, {
                    value: value,
                    trueValue: trueValue,
                    falseValue: falseValue
                });
                return;
            }
        }
        if (el.nodeName.toLowerCase() === 'select' && el.multiple) {
            new Multiselect(el, { value: value });
            return;
        }
        if (isContentEditable(el)) {
            new Content(el, { value: value });
            return;
        }
        new Value(el, { value: value });
    });
    var special = {
            enter: function (data, el, original) {
                return {
                    event: 'keyup',
                    handler: function (ev) {
                        if (ev.keyCode === 13) {
                            return original.call(this, ev);
                        }
                    }
                };
            }
        };
    can.view.attr(/can-[\w\.]+/, function (el, data) {
        var attributeName = data.attributeName, event = attributeName.substr('can-'.length), handler = function (ev) {
                var attrVal = el.getAttribute(attributeName);
                if (!attrVal) {
                    return;
                }
                var attrInfo = mustacheCore.expressionData(removeCurly(attrVal));
                var scopeData = data.scope.read(attrInfo.name.get, {
                        returnObserveMethods: true,
                        isArgument: true,
                        executeAnonymousFunctions: true
                    });
                var args = [];
                var $el = can.$(this);
                var viewModel = can.viewModel($el[0]);
                var localScope = data.scope.add({
                        '@element': $el,
                        '@event': ev,
                        '@viewModel': viewModel,
                        '@scope': data.scope,
                        '@context': data.scope._context
                    });
                if (!can.isEmptyObject(attrInfo.hash)) {
                    var hash = {};
                    can.each(attrInfo.hash, function (val, key) {
                        if (val && val.hasOwnProperty('get')) {
                            var s = !val.get.indexOf('@') ? localScope : data.scope;
                            hash[key] = s.read(val.get, {}).value;
                        } else {
                            hash[key] = val;
                        }
                    });
                    args.unshift(hash);
                }
                if (attrInfo.args.length) {
                    var arg;
                    for (var i = attrInfo.args.length - 1; i >= 0; i--) {
                        arg = attrInfo.args[i];
                        if (arg && arg.hasOwnProperty('get')) {
                            var s = !arg.get.indexOf('@') ? localScope : data.scope;
                            args.unshift(s.read(arg.get, {}).value);
                        } else {
                            args.unshift(arg);
                        }
                    }
                }
                if (!args.length) {
                    args = [
                        data.scope._context,
                        $el
                    ].concat(can.makeArray(arguments));
                }
                return scopeData.value.apply(scopeData.parent, args);
            };
        if (special[event]) {
            var specialData = special[event](data, el, handler);
            handler = specialData.handler;
            event = specialData.event;
        }
        can.bind.call(el, event, handler);
    });
    var Value = can.Control.extend({
            init: function () {
                if (this.element[0].nodeName.toUpperCase() === 'SELECT') {
                    setTimeout(can.proxy(this.set, this), 1);
                } else {
                    this.set();
                }
            },
            '{value} change': 'set',
            set: function () {
                if (!this.element) {
                    return;
                }
                var val = this.options.value();
                this.element[0].value = val == null ? '' : val;
            },
            'change': function () {
                if (!this.element) {
                    return;
                }
                var el = this.element[0];
                this.options.value(el.value);
                var newVal = this.options.value();
                if (el.value !== newVal) {
                    el.value = newVal;
                }
            }
        }), Checked = can.Control.extend({
            init: function () {
                this.isCheckbox = this.element[0].type.toLowerCase() === 'checkbox';
                this.check();
            },
            '{value} change': 'check',
            check: function () {
                if (this.isCheckbox) {
                    var value = this.options.value(), trueValue = this.options.trueValue || true;
                    this.element[0].checked = value == trueValue;
                } else {
                    var setOrRemove = this.options.value() == this.element[0].value ? 'set' : 'remove';
                    can.attr[setOrRemove](this.element[0], 'checked', true);
                }
            },
            'change': function () {
                if (this.isCheckbox) {
                    this.options.value(this.element[0].checked ? this.options.trueValue : this.options.falseValue);
                } else {
                    if (this.element[0].checked) {
                        this.options.value(this.element[0].value);
                    }
                }
            }
        }), Multiselect = Value.extend({
            init: function () {
                this.delimiter = ';';
                setTimeout(can.proxy(this.set, this), 1);
            },
            set: function () {
                var newVal = this.options.value();
                if (typeof newVal === 'string') {
                    newVal = newVal.split(this.delimiter);
                    this.isString = true;
                } else if (newVal) {
                    newVal = can.makeArray(newVal);
                }
                var isSelected = {};
                can.each(newVal, function (val) {
                    isSelected[val] = true;
                });
                can.each(this.element[0].childNodes, function (option) {
                    if (option.value) {
                        option.selected = !!isSelected[option.value];
                    }
                });
            },
            get: function () {
                var values = [], children = this.element[0].childNodes;
                can.each(children, function (child) {
                    if (child.selected && child.value) {
                        values.push(child.value);
                    }
                });
                return values;
            },
            'change': function () {
                var value = this.get(), currentValue = this.options.value();
                if (this.isString || typeof currentValue === 'string') {
                    this.isString = true;
                    this.options.value(value.join(this.delimiter));
                } else if (currentValue instanceof can.List) {
                    currentValue.attr(value, true);
                } else {
                    this.options.value(value);
                }
            }
        }), Content = can.Control.extend({
            init: function () {
                this.set();
                this.on('blur', 'setValue');
            },
            '{value} change': 'set',
            set: function () {
                var val = this.options.value();
                this.element[0].innerHTML = typeof val === 'undefined' ? '' : val;
            },
            setValue: function () {
                this.options.value(this.element[0].innerHTML);
            }
        });
});
/*can@2.2.4#view/mustache/mustache*/
define('can@2.2.4#view/mustache/mustache', [
    'can/util/util',
    'can/view/scope/scope',
    'can/view/view',
    'can/view/scanner',
    'can/compute/compute',
    'can/view/render',
    'can/view/bindings/bindings'
], function (can) {
    can.view.ext = '.mustache';
    var SCOPE = 'scope', HASH = '___h4sh', CONTEXT_OBJ = '{scope:' + SCOPE + ',options:options}', SPECIAL_CONTEXT_OBJ = '{scope:' + SCOPE + ',options:options, special: true}', ARG_NAMES = SCOPE + ',options', argumentsRegExp = /((([^'"\s]+?=)?('.*?'|".*?"))|.*?)\s/g, literalNumberStringBooleanRegExp = /^(('.*?'|".*?"|[0-9]+\.?[0-9]*|true|false|null|undefined)|((.+?)=(('.*?'|".*?"|[0-9]+\.?[0-9]*|true|false)|(.+))))$/, makeLookupLiteral = function (type) {
            return '{get:"' + type.replace(/"/g, '\\"') + '"}';
        }, isLookup = function (obj) {
            return obj && typeof obj.get === 'string';
        }, isObserveLike = function (obj) {
            return obj instanceof can.Map || obj && !!obj._get;
        }, isArrayLike = function (obj) {
            return obj && obj.splice && typeof obj.length === 'number';
        }, makeConvertToScopes = function (original, scope, options) {
            var originalWithScope = function (ctx, opts) {
                return original(ctx || scope, opts);
            };
            return function (updatedScope, updatedOptions) {
                if (updatedScope !== undefined && !(updatedScope instanceof can.view.Scope)) {
                    updatedScope = scope.add(updatedScope);
                }
                if (updatedOptions !== undefined && !(updatedOptions instanceof can.view.Options)) {
                    updatedOptions = options.add(updatedOptions);
                }
                return originalWithScope(updatedScope, updatedOptions || options);
            };
        };
    var Mustache = function (options, helpers) {
        if (this.constructor !== Mustache) {
            var mustache = new Mustache(options);
            return function (data, options) {
                return mustache.render(data, options);
            };
        }
        if (typeof options === 'function') {
            this.template = { fn: options };
            return;
        }
        can.extend(this, options);
        this.template = this.scanner.scan(this.text, this.name);
    };
    can.Mustache = can.global.Mustache = Mustache;
    Mustache.prototype.render = function (data, options) {
        if (!(data instanceof can.view.Scope)) {
            data = new can.view.Scope(data || {});
        }
        if (!(options instanceof can.view.Options)) {
            options = new can.view.Options(options || {});
        }
        options = options || {};
        return this.template.fn.call(data, data, options);
    };
    can.extend(Mustache.prototype, {
        scanner: new can.view.Scanner({
            text: {
                start: '',
                scope: SCOPE,
                options: ',options: options',
                argNames: ARG_NAMES
            },
            tokens: [
                [
                    'returnLeft',
                    '{{{',
                    '{{[{&]'
                ],
                [
                    'commentFull',
                    '{{!}}',
                    '^[\\s\\t]*{{!.+?}}\\n'
                ],
                [
                    'commentLeft',
                    '{{!',
                    '(\\n[\\s\\t]*{{!|{{!)'
                ],
                [
                    'escapeFull',
                    '{{}}',
                    '(^[\\s\\t]*{{[#/^][^}]+?}}\\n|\\n[\\s\\t]*{{[#/^][^}]+?}}\\n|\\n[\\s\\t]*{{[#/^][^}]+?}}$)',
                    function (content) {
                        return {
                            before: /^\n.+?\n$/.test(content) ? '\n' : '',
                            content: content.match(/\{\{(.+?)\}\}/)[1] || ''
                        };
                    }
                ],
                [
                    'escapeLeft',
                    '{{'
                ],
                [
                    'returnRight',
                    '}}}'
                ],
                [
                    'right',
                    '}}'
                ]
            ],
            helpers: [
                {
                    name: /^>[\s]*\w*/,
                    fn: function (content, cmd) {
                        var templateName = can.trim(content.replace(/^>\s?/, '')).replace(/["|']/g, '');
                        return 'can.Mustache.renderPartial(\'' + templateName + '\',' + ARG_NAMES + ')';
                    }
                },
                {
                    name: /^\s*data\s/,
                    fn: function (content, cmd) {
                        var attr = content.match(/["|'](.*)["|']/)[1];
                        return 'can.proxy(function(__){' + 'can.data(can.$(__),\'' + attr + '\', this.attr(\'.\')); }, ' + SCOPE + ')';
                    }
                },
                {
                    name: /\s*\(([\$\w]+)\)\s*->([^\n]*)/,
                    fn: function (content) {
                        var quickFunc = /\s*\(([\$\w]+)\)\s*->([^\n]*)/, parts = content.match(quickFunc);
                        return 'can.proxy(function(__){var ' + parts[1] + '=can.$(__);with(' + SCOPE + '.attr(\'.\')){' + parts[2] + '}}, this);';
                    }
                },
                {
                    name: /^.*$/,
                    fn: function (content, cmd) {
                        var mode = false, result = {
                                content: '',
                                startTxt: false,
                                startOnlyTxt: false,
                                end: false
                            };
                        content = can.trim(content);
                        if (content.length && (mode = content.match(/^([#^/]|else$)/))) {
                            mode = mode[0];
                            switch (mode) {
                            case '#':
                            case '^':
                                if (cmd.specialAttribute) {
                                    result.startOnlyTxt = true;
                                } else {
                                    result.startTxt = true;
                                    result.escaped = 0;
                                }
                                break;
                            case '/':
                                result.end = true;
                                result.content += 'return ___v1ew.join("");}}])';
                                return result;
                            }
                            content = content.substring(1);
                        }
                        if (mode !== 'else') {
                            var args = [], hashes = [], i = 0, m;
                            result.content += 'can.Mustache.txt(\n' + (cmd.specialAttribute ? SPECIAL_CONTEXT_OBJ : CONTEXT_OBJ) + ',\n' + (mode ? '"' + mode + '"' : 'null') + ',';
                            (can.trim(content) + ' ').replace(argumentsRegExp, function (whole, arg) {
                                if (i && (m = arg.match(literalNumberStringBooleanRegExp))) {
                                    if (m[2]) {
                                        args.push(m[0]);
                                    } else {
                                        hashes.push(m[4] + ':' + (m[6] ? m[6] : makeLookupLiteral(m[5])));
                                    }
                                } else {
                                    args.push(makeLookupLiteral(arg));
                                }
                                i++;
                            });
                            result.content += args.join(',');
                            if (hashes.length) {
                                result.content += ',{' + HASH + ':{' + hashes.join(',') + '}}';
                            }
                        }
                        if (mode && mode !== 'else') {
                            result.content += ',[\n\n';
                        }
                        switch (mode) {
                        case '^':
                        case '#':
                            result.content += '{fn:function(' + ARG_NAMES + '){var ___v1ew = [];';
                            break;
                        case 'else':
                            result.content += 'return ___v1ew.join("");}},\n{inverse:function(' + ARG_NAMES + '){\nvar ___v1ew = [];';
                            break;
                        default:
                            result.content += ')';
                            break;
                        }
                        if (!mode) {
                            result.startTxt = true;
                            result.end = true;
                        }
                        return result;
                    }
                }
            ]
        })
    });
    var helpers = can.view.Scanner.prototype.helpers;
    for (var i = 0; i < helpers.length; i++) {
        Mustache.prototype.scanner.helpers.unshift(helpers[i]);
    }
    Mustache.txt = function (scopeAndOptions, mode, name) {
        var scope = scopeAndOptions.scope, options = scopeAndOptions.options, args = [], helperOptions = {
                fn: function () {
                },
                inverse: function () {
                }
            }, hash, context = scope.attr('.'), getHelper = true, helper;
        for (var i = 3; i < arguments.length; i++) {
            var arg = arguments[i];
            if (mode && can.isArray(arg)) {
                helperOptions = can.extend.apply(can, [helperOptions].concat(arg));
            } else if (arg && arg[HASH]) {
                hash = arg[HASH];
                for (var prop in hash) {
                    if (isLookup(hash[prop])) {
                        hash[prop] = Mustache.get(hash[prop].get, scopeAndOptions, false, true);
                    }
                }
            } else if (arg && isLookup(arg)) {
                args.push(Mustache.get(arg.get, scopeAndOptions, false, true, true));
            } else {
                args.push(arg);
            }
        }
        if (isLookup(name)) {
            var get = name.get;
            name = Mustache.get(name.get, scopeAndOptions, args.length, false);
            getHelper = get === name;
        }
        helperOptions.fn = makeConvertToScopes(helperOptions.fn, scope, options);
        helperOptions.inverse = makeConvertToScopes(helperOptions.inverse, scope, options);
        if (mode === '^') {
            var tmp = helperOptions.fn;
            helperOptions.fn = helperOptions.inverse;
            helperOptions.inverse = tmp;
        }
        if (helper = getHelper && (typeof name === 'string' && Mustache.getHelper(name, options)) || can.isFunction(name) && !name.isComputed && { fn: name }) {
            can.extend(helperOptions, {
                context: context,
                scope: scope,
                contexts: scope,
                hash: hash
            });
            args.push(helperOptions);
            return function () {
                return helper.fn.apply(context, args) || '';
            };
        }
        return function () {
            var value;
            if (can.isFunction(name) && name.isComputed) {
                value = name();
            } else {
                value = name;
            }
            var validArgs = args.length ? args : [value], valid = true, result = [], i, argIsObserve, arg;
            if (mode) {
                for (i = 0; i < validArgs.length; i++) {
                    arg = validArgs[i];
                    argIsObserve = typeof arg !== 'undefined' && isObserveLike(arg);
                    if (isArrayLike(arg)) {
                        if (mode === '#') {
                            valid = valid && !!(argIsObserve ? arg.attr('length') : arg.length);
                        } else if (mode === '^') {
                            valid = valid && !(argIsObserve ? arg.attr('length') : arg.length);
                        }
                    } else {
                        valid = mode === '#' ? valid && !!arg : mode === '^' ? valid && !arg : valid;
                    }
                }
            }
            if (valid) {
                if (mode === '#') {
                    if (isArrayLike(value)) {
                        var isObserveList = isObserveLike(value);
                        for (i = 0; i < value.length; i++) {
                            result.push(helperOptions.fn(isObserveList ? value.attr('' + i) : value[i]));
                        }
                        return result.join('');
                    } else {
                        return helperOptions.fn(value || {}) || '';
                    }
                } else if (mode === '^') {
                    return helperOptions.inverse(value || {}) || '';
                } else {
                    return '' + (value != null ? value : '');
                }
            }
            return '';
        };
    };
    Mustache.get = function (key, scopeAndOptions, isHelper, isArgument, isLookup) {
        var context = scopeAndOptions.scope.attr('.'), options = scopeAndOptions.options || {};
        if (isHelper) {
            if (Mustache.getHelper(key, options)) {
                return key;
            }
            if (scopeAndOptions.scope && can.isFunction(context[key])) {
                return context[key];
            }
        }
        var computeData = scopeAndOptions.scope.computeData(key, {
                isArgument: isArgument,
                args: [
                    context,
                    scopeAndOptions.scope
                ]
            }), compute = computeData.compute;
        can.compute.temporarilyBind(compute);
        var initialValue = computeData.initialValue, helperObj = Mustache.getHelper(key, options);
        if (!isLookup && (initialValue === undefined || computeData.scope !== scopeAndOptions.scope) && Mustache.getHelper(key, options)) {
            return key;
        }
        if (!compute.computeInstance.hasDependencies) {
            return initialValue;
        } else {
            return compute;
        }
    };
    Mustache.resolve = function (value) {
        if (isObserveLike(value) && isArrayLike(value) && value.attr('length')) {
            return value;
        } else if (can.isFunction(value)) {
            return value();
        } else {
            return value;
        }
    };
    can.view.Options = can.view.Scope.extend({
        init: function (data, parent) {
            if (!data.helpers && !data.partials && !data.tags) {
                data = { helpers: data };
            }
            can.view.Scope.prototype.init.apply(this, arguments);
        }
    });
    Mustache._helpers = {};
    Mustache.registerHelper = function (name, fn) {
        this._helpers[name] = {
            name: name,
            fn: fn
        };
    };
    Mustache.getHelper = function (name, options) {
        var helper;
        if (options) {
            helper = options.attr('helpers.' + name);
        }
        return helper ? { fn: helper } : this._helpers[name];
    };
    Mustache.render = function (partial, scope, options) {
        if (!can.view.cached[partial]) {
            var reads = can.__clearReading();
            var scopePartialName = scope.attr(partial);
            if (scopePartialName) {
                partial = scopePartialName;
            }
            can.__setReading(reads);
        }
        return can.view.render(partial, scope, options);
    };
    Mustache.safeString = function (str) {
        return {
            toString: function () {
                return str;
            }
        };
    };
    Mustache.renderPartial = function (partialName, scope, options) {
        var partial = options.attr('partials.' + partialName);
        if (partial) {
            return partial.render ? partial.render(scope, options) : partial(scope, options);
        } else {
            return can.Mustache.render(partialName, scope, options);
        }
    };
    can.each({
        'if': function (expr, options) {
            var value;
            if (can.isFunction(expr)) {
                value = can.compute.truthy(expr)();
            } else {
                value = !!Mustache.resolve(expr);
            }
            if (value) {
                return options.fn(options.contexts || this);
            } else {
                return options.inverse(options.contexts || this);
            }
        },
        'is': function () {
            var lastValue, curValue, options = arguments[arguments.length - 1];
            if (arguments.length - 2 <= 0) {
                return options.inverse();
            }
            for (var i = 0; i < arguments.length - 1; i++) {
                curValue = Mustache.resolve(arguments[i]);
                curValue = can.isFunction(curValue) ? curValue() : curValue;
                if (i > 0) {
                    if (curValue !== lastValue) {
                        return options.inverse();
                    }
                }
                lastValue = curValue;
            }
            return options.fn();
        },
        'eq': function () {
            return Mustache._helpers.is.fn.apply(this, arguments);
        },
        'unless': function (expr, options) {
            return Mustache._helpers['if'].fn.apply(this, [
                can.isFunction(expr) ? can.compute(function () {
                    return !expr();
                }) : !expr,
                options
            ]);
        },
        'each': function (expr, options) {
            var resolved = Mustache.resolve(expr), result = [], keys, key, i;
            if (can.view.lists && (resolved instanceof can.List || expr && expr.isComputed && resolved === undefined)) {
                return can.view.lists(expr, function (item, index) {
                    return options.fn(options.scope.add({ '@index': index }).add(item));
                });
            }
            expr = resolved;
            if (!!expr && isArrayLike(expr)) {
                for (i = 0; i < expr.length; i++) {
                    result.push(options.fn(options.scope.add({ '@index': i }).add(expr[i])));
                }
                return result.join('');
            } else if (isObserveLike(expr)) {
                keys = can.Map.keys(expr);
                for (i = 0; i < keys.length; i++) {
                    key = keys[i];
                    result.push(options.fn(options.scope.add({ '@key': key }).add(expr[key])));
                }
                return result.join('');
            } else if (expr instanceof Object) {
                for (key in expr) {
                    result.push(options.fn(options.scope.add({ '@key': key }).add(expr[key])));
                }
                return result.join('');
            }
        },
        'with': function (expr, options) {
            var ctx = expr;
            expr = Mustache.resolve(expr);
            if (!!expr) {
                return options.fn(ctx);
            }
        },
        'log': function (expr, options) {
            if (typeof console !== 'undefined' && console.log) {
                if (!options) {
                    console.log(expr.context);
                } else {
                    console.log(expr, options.context);
                }
            }
        },
        '@index': function (offset, options) {
            if (!options) {
                options = offset;
                offset = 0;
            }
            var index = options.scope.attr('@index');
            return '' + ((can.isFunction(index) ? index() : index) + offset);
        }
    }, function (fn, name) {
        Mustache.registerHelper(name, fn);
    });
    can.view.register({
        suffix: 'mustache',
        contentType: 'x-mustache-template',
        script: function (id, src) {
            return 'can.Mustache(function(' + ARG_NAMES + ') { ' + new Mustache({
                text: src,
                name: id
            }).template.out + ' })';
        },
        renderer: function (id, text) {
            return Mustache({
                text: text,
                name: id
            });
        }
    });
    can.mustache.registerHelper = can.proxy(can.Mustache.registerHelper, can.Mustache);
    can.mustache.safeString = can.Mustache.safeString;
    return can;
});
/*can@2.2.4#observe/observe*/
define('can@2.2.4#observe/observe', [
    'can/util/util',
    'can/map/map',
    'can/list/list',
    'can/compute/compute'
], function (can) {
    can.Observe = can.Map;
    can.Observe.startBatch = can.batch.start;
    can.Observe.stopBatch = can.batch.stop;
    can.Observe.triggerBatch = can.batch.trigger;
    return can;
});
/*can@2.2.4#component/component*/
define('can@2.2.4#component/component', [
    'can/util/util',
    'can/view/callbacks/callbacks',
    'can/control/control',
    'can/observe/observe',
    'can/view/mustache/mustache',
    'can/view/bindings/bindings'
], function (can, viewCallbacks) {
    var ignoreAttributesRegExp = /^(dataViewId|class|id)$/i, paramReplacer = /\{([^\}]+)\}/g;
    var Component = can.Component = can.Construct.extend({
            setup: function () {
                can.Construct.setup.apply(this, arguments);
                if (can.Component) {
                    var self = this, scope = this.prototype.scope || this.prototype.viewModel;
                    this.Control = ComponentControl.extend(this.prototype.events);
                    if (!scope || typeof scope === 'object' && !(scope instanceof can.Map)) {
                        this.Map = can.Map.extend(scope || {});
                    } else if (scope.prototype instanceof can.Map) {
                        this.Map = scope;
                    }
                    this.attributeScopeMappings = {};
                    can.each(this.Map ? this.Map.defaults : {}, function (val, prop) {
                        if (val === '@') {
                            self.attributeScopeMappings[prop] = prop;
                        }
                    });
                    if (this.prototype.template) {
                        if (typeof this.prototype.template === 'function') {
                            var temp = this.prototype.template;
                            this.renderer = function () {
                                return can.view.frag(temp.apply(null, arguments));
                            };
                        } else {
                            this.renderer = can.view.mustache(this.prototype.template);
                        }
                    }
                    can.view.tag(this.prototype.tag, function (el, options) {
                        new self(el, options);
                    });
                }
            }
        }, {
            setup: function (el, hookupOptions) {
                var initialScopeData = {}, component = this, lexicalContent = (typeof this.leakScope === 'undefined' ? false : !this.leakScope) && this.template, twoWayBindings = {}, scope = this.scope || this.viewModel, viewModelPropertyUpdates = {}, componentScope, frag, teardownFunctions = [], callTeardownFunctions = function () {
                        for (var i = 0, len = teardownFunctions.length; i < len; i++) {
                            teardownFunctions[i]();
                        }
                    };
                can.each(this.constructor.attributeScopeMappings, function (val, prop) {
                    initialScopeData[prop] = el.getAttribute(can.hyphenate(val));
                });
                can.each(can.makeArray(el.attributes), function (node, index) {
                    var name = can.camelize(node.nodeName.toLowerCase()), value = node.value;
                    if (component.constructor.attributeScopeMappings[name] || ignoreAttributesRegExp.test(name) || viewCallbacks.attr(node.nodeName)) {
                        return;
                    }
                    if (value[0] === '{' && value[value.length - 1] === '}') {
                        value = value.substr(1, value.length - 2);
                    } else {
                        if (hookupOptions.templateType !== 'legacy') {
                            initialScopeData[name] = value;
                            return;
                        }
                    }
                    var computeData = hookupOptions.scope.computeData(value, { args: [] }), compute = computeData.compute;
                    var handler = function (ev, newVal) {
                        viewModelPropertyUpdates[name] = (viewModelPropertyUpdates[name] || 0) + 1;
                        componentScope.attr(name, newVal);
                        can.batch.afterPreviousEvents(function () {
                            --viewModelPropertyUpdates[name];
                        });
                    };
                    compute.bind('change', handler);
                    initialScopeData[name] = compute();
                    if (!compute.computeInstance.hasDependencies) {
                        compute.unbind('change', handler);
                    } else {
                        teardownFunctions.push(function () {
                            compute.unbind('change', handler);
                        });
                        twoWayBindings[name] = computeData;
                    }
                });
                if (this.constructor.Map) {
                    componentScope = new this.constructor.Map(initialScopeData);
                } else if (scope instanceof can.Map) {
                    componentScope = scope;
                } else if (can.isFunction(scope)) {
                    var scopeResult = scope.call(this, initialScopeData, hookupOptions.scope, el);
                    if (scopeResult instanceof can.Map) {
                        componentScope = scopeResult;
                    } else if (scopeResult.prototype instanceof can.Map) {
                        componentScope = new scopeResult(initialScopeData);
                    } else {
                        componentScope = new (can.Map.extend(scopeResult))(initialScopeData);
                    }
                }
                var handlers = {};
                can.each(twoWayBindings, function (computeData, prop) {
                    handlers[prop] = function (ev, newVal) {
                        if (!viewModelPropertyUpdates[prop]) {
                            computeData.compute(newVal);
                        }
                    };
                    componentScope.bind(prop, handlers[prop]);
                });
                if (!can.isEmptyObject(this.constructor.attributeScopeMappings) || hookupOptions.templateType !== 'legacy') {
                    can.bind.call(el, 'attributes', function (ev) {
                        var camelized = can.camelize(ev.attributeName);
                        if (!twoWayBindings[camelized] && !ignoreAttributesRegExp.test(camelized)) {
                            componentScope.attr(camelized, el.getAttribute(ev.attributeName));
                        }
                    });
                }
                this.scope = this.viewModel = componentScope;
                can.data(can.$(el), 'scope', this.scope);
                can.data(can.$(el), 'viewModel', this.scope);
                var renderedScope = lexicalContent ? this.scope : hookupOptions.scope.add(this.scope), options = { helpers: {} };
                can.each(this.helpers || {}, function (val, prop) {
                    if (can.isFunction(val)) {
                        options.helpers[prop] = function () {
                            return val.apply(componentScope, arguments);
                        };
                    }
                });
                teardownFunctions.push(function () {
                    can.each(handlers, function (handler, prop) {
                        componentScope.unbind(prop, handlers[prop]);
                    });
                });
                this._control = new this.constructor.Control(el, {
                    scope: this.scope,
                    viewModel: this.scope
                });
                if (this._control && this._control.destroy) {
                    var oldDestroy = this._control.destroy;
                    this._control.destroy = function () {
                        oldDestroy.apply(this, arguments);
                        callTeardownFunctions();
                    };
                    this._control.on();
                } else {
                    can.bind.call(el, 'removed', function () {
                        callTeardownFunctions();
                    });
                }
                var nodeList = can.view.nodeLists.register([], undefined, true);
                teardownFunctions.push(function () {
                    can.view.nodeLists.unregister(nodeList);
                });
                if (this.constructor.renderer) {
                    if (!options.tags) {
                        options.tags = {};
                    }
                    options.tags.content = function contentHookup(el, rendererOptions) {
                        var subtemplate = hookupOptions.subtemplate || rendererOptions.subtemplate;
                        if (subtemplate) {
                            delete options.tags.content;
                            var opts = !lexicalContent || subtemplate !== hookupOptions.subtemplate ? rendererOptions : hookupOptions;
                            can.view.live.replace([el], subtemplate(opts.scope, opts.options));
                            options.tags.content = contentHookup;
                        }
                    };
                    frag = this.constructor.renderer(renderedScope, hookupOptions.options.add(options), nodeList);
                } else {
                    if (hookupOptions.templateType === 'legacy') {
                        frag = can.view.frag(hookupOptions.subtemplate ? hookupOptions.subtemplate(renderedScope, hookupOptions.options.add(options)) : '');
                    } else {
                        frag = hookupOptions.subtemplate ? hookupOptions.subtemplate(renderedScope, hookupOptions.options.add(options), nodeList) : document.createDocumentFragment();
                    }
                }
                can.appendChild(el, frag);
                can.view.nodeLists.update(nodeList, el.childNodes);
            }
        });
    var ComponentControl = can.Control.extend({
            _lookup: function (options) {
                return [
                    options.scope,
                    options,
                    window
                ];
            },
            _action: function (methodName, options, controlInstance) {
                var hasObjectLookup, readyCompute;
                paramReplacer.lastIndex = 0;
                hasObjectLookup = paramReplacer.test(methodName);
                if (!controlInstance && hasObjectLookup) {
                    return;
                } else if (!hasObjectLookup) {
                    return can.Control._action.apply(this, arguments);
                } else {
                    readyCompute = can.compute(function () {
                        var delegate;
                        var name = methodName.replace(paramReplacer, function (matched, key) {
                                var value;
                                if (key === 'scope' || key === 'viewModel') {
                                    delegate = options.scope;
                                    return '';
                                }
                                key = key.replace(/^(scope|^viewModel)\./, '');
                                value = can.compute.read(options.scope, key.split('.'), { isArgument: true }).value;
                                if (value === undefined) {
                                    value = can.getObject(key);
                                }
                                if (typeof value === 'string') {
                                    return value;
                                } else {
                                    delegate = value;
                                    return '';
                                }
                            });
                        var parts = name.split(/\s+/g), event = parts.pop();
                        return {
                            processor: this.processors[event] || this.processors.click,
                            parts: [
                                name,
                                parts.join(' '),
                                event
                            ],
                            delegate: delegate || undefined
                        };
                    }, this);
                    var handler = function (ev, ready) {
                        controlInstance._bindings.control[methodName](controlInstance.element);
                        controlInstance._bindings.control[methodName] = ready.processor(ready.delegate || controlInstance.element, ready.parts[2], ready.parts[1], methodName, controlInstance);
                    };
                    readyCompute.bind('change', handler);
                    controlInstance._bindings.readyComputes[methodName] = {
                        compute: readyCompute,
                        handler: handler
                    };
                    return readyCompute();
                }
            }
        }, {
            setup: function (el, options) {
                this.scope = options.scope;
                this.viewModel = options.viewModel;
                return can.Control.prototype.setup.call(this, el, options);
            },
            off: function () {
                if (this._bindings) {
                    can.each(this._bindings.readyComputes || {}, function (value) {
                        value.compute.unbind('change', value.handler);
                    });
                }
                can.Control.prototype.off.apply(this, arguments);
                this._bindings.readyComputes = {};
            }
        });
    var $ = can.$;
    if ($.fn) {
        $.fn.scope = $.fn.viewModel = function () {
            return can.viewModel.apply(can, [this].concat(can.makeArray(arguments)));
        };
    }
    return Component;
});
/*can@2.2.4#can*/
define('can@2.2.4#can', [
    'can/util/util',
    'can/control/route/route',
    'can/model/model',
    'can/view/mustache/mustache',
    'can/component/component'
], function (can) {
    return can;
});
/*can@2.2.4#view/target/target*/
define('can@2.2.4#view/target/target', [
    'can/util/util',
    'can/view/elements'
], function (can, elements) {
    var processNodes = function (nodes, paths, location) {
            var frag = document.createDocumentFragment();
            for (var i = 0, len = nodes.length; i < len; i++) {
                var node = nodes[i];
                frag.appendChild(processNode(node, paths, location.concat(i)));
            }
            return frag;
        }, keepsTextNodes = typeof document !== 'undefined' && function () {
            var testFrag = document.createDocumentFragment();
            var div = document.createElement('div');
            div.appendChild(document.createTextNode(''));
            div.appendChild(document.createTextNode(''));
            testFrag.appendChild(div);
            var cloned = testFrag.cloneNode(true);
            return cloned.childNodes[0].childNodes.length === 2;
        }(), clonesWork = typeof document !== 'undefined' && function () {
            var a = document.createElement('a');
            a.innerHTML = '<xyz></xyz>';
            var clone = a.cloneNode(true);
            return clone.innerHTML === '<xyz></xyz>';
        }(), namespacesWork = typeof document !== 'undefined' && !!document.createElementNS;
    var cloneNode = clonesWork ? function (el) {
            return el.cloneNode(true);
        } : function (node) {
            var copy;
            if (node.nodeType === 1) {
                copy = document.createElement(node.nodeName);
            } else if (node.nodeType === 3) {
                copy = document.createTextNode(node.nodeValue);
            } else if (node.nodeType === 8) {
                copy = document.createComment(node.nodeValue);
            } else if (node.nodeType === 11) {
                copy = document.createDocumentFragment();
            }
            if (node.attributes) {
                var attributes = can.makeArray(node.attributes);
                can.each(attributes, function (node) {
                    if (node && node.specified) {
                        copy.setAttribute(node.nodeName, node.nodeValue);
                    }
                });
            }
            if (node.childNodes) {
                can.each(node.childNodes, function (child) {
                    copy.appendChild(cloneNode(child));
                });
            }
            return copy;
        };
    function processNode(node, paths, location) {
        var callback, loc = location, nodeType = typeof node, el, p, i, len;
        var getCallback = function () {
            if (!callback) {
                callback = {
                    path: location,
                    callbacks: []
                };
                paths.push(callback);
                loc = [];
            }
            return callback;
        };
        if (nodeType === 'object') {
            if (node.tag) {
                if (namespacesWork && node.namespace) {
                    el = document.createElementNS(node.namespace, node.tag);
                } else {
                    el = document.createElement(node.tag);
                }
                if (node.attrs) {
                    for (var attrName in node.attrs) {
                        var value = node.attrs[attrName];
                        if (typeof value === 'function') {
                            getCallback().callbacks.push({ callback: value });
                        } else {
                            el.setAttribute(attrName, value);
                        }
                    }
                }
                if (node.attributes) {
                    for (i = 0, len = node.attributes.length; i < len; i++) {
                        getCallback().callbacks.push({ callback: node.attributes[i] });
                    }
                }
                if (node.children && node.children.length) {
                    if (callback) {
                        p = callback.paths = [];
                    } else {
                        p = paths;
                    }
                    el.appendChild(processNodes(node.children, p, loc));
                }
            } else if (node.comment) {
                el = document.createComment(node.comment);
                if (node.callbacks) {
                    for (i = 0, len = node.attributes.length; i < len; i++) {
                        getCallback().callbacks.push({ callback: node.callbacks[i] });
                    }
                }
            }
        } else if (nodeType === 'string') {
            el = document.createTextNode(node);
        } else if (nodeType === 'function') {
            if (keepsTextNodes) {
                el = document.createTextNode('');
                getCallback().callbacks.push({ callback: node });
            } else {
                el = document.createComment('~');
                getCallback().callbacks.push({
                    callback: function () {
                        var el = document.createTextNode('');
                        elements.replace([this], el);
                        return node.apply(el, arguments);
                    }
                });
            }
        }
        return el;
    }
    function hydratePath(el, pathData, args) {
        var path = pathData.path, callbacks = pathData.callbacks, paths = pathData.paths, callbackData, child = el;
        for (var i = 0, len = path.length; i < len; i++) {
            child = child.childNodes[path[i]];
        }
        for (i = 0, len = callbacks.length; i < len; i++) {
            callbackData = callbacks[i];
            callbackData.callback.apply(child, args);
        }
        if (paths && paths.length) {
            for (i = paths.length - 1; i >= 0; i--) {
                hydratePath(child, paths[i], args);
            }
        }
    }
    function makeTarget(nodes) {
        var paths = [];
        var frag = processNodes(nodes, paths, []);
        return {
            paths: paths,
            clone: frag,
            hydrate: function () {
                var cloned = cloneNode(this.clone);
                var args = can.makeArray(arguments);
                for (var i = paths.length - 1; i >= 0; i--) {
                    hydratePath(cloned, paths[i], args);
                }
                return cloned;
            }
        };
    }
    makeTarget.keepsTextNodes = keepsTextNodes;
    can.view.target = makeTarget;
    return makeTarget;
});
/*can@2.2.4#view/stache/html_section*/
define('can@2.2.4#view/stache/html_section', [
    'can/util/util',
    'can/view/target/target',
    './utils',
    './mustache_core'
], function (can, target, utils, mustacheCore) {
    var decodeHTML = typeof document !== 'undefined' && function () {
            var el = document.createElement('div');
            return function (html) {
                if (html.indexOf('&') === -1) {
                    return html.replace(/\r\n/g, '\n');
                }
                el.innerHTML = html;
                return el.childNodes.length === 0 ? '' : el.childNodes[0].nodeValue;
            };
        }();
    var HTMLSectionBuilder = function () {
        this.stack = [new HTMLSection()];
    };
    can.extend(HTMLSectionBuilder.prototype, utils.mixins);
    can.extend(HTMLSectionBuilder.prototype, {
        startSubSection: function (process) {
            var newSection = new HTMLSection(process);
            this.stack.push(newSection);
            return newSection;
        },
        endSubSectionAndReturnRenderer: function () {
            if (this.last().isEmpty()) {
                this.stack.pop();
                return null;
            } else {
                var htmlSection = this.endSection();
                return can.proxy(htmlSection.compiled.hydrate, htmlSection.compiled);
            }
        },
        startSection: function (process) {
            var newSection = new HTMLSection(process);
            this.last().add(newSection.targetCallback);
            this.stack.push(newSection);
        },
        endSection: function () {
            this.last().compile();
            return this.stack.pop();
        },
        inverse: function () {
            this.last().inverse();
        },
        compile: function () {
            var compiled = this.stack.pop().compile();
            return function (scope, options, nodeList) {
                if (!(scope instanceof can.view.Scope)) {
                    scope = new can.view.Scope(scope || {});
                }
                if (!(options instanceof mustacheCore.Options)) {
                    options = new mustacheCore.Options(options || {});
                }
                return compiled.hydrate(scope, options, nodeList);
            };
        },
        push: function (chars) {
            this.last().push(chars);
        },
        pop: function () {
            return this.last().pop();
        }
    });
    var HTMLSection = function (process) {
        this.data = 'targetData';
        this.targetData = [];
        this.targetStack = [];
        var self = this;
        this.targetCallback = function (scope, options, sectionNode) {
            process.call(this, scope, options, sectionNode, can.proxy(self.compiled.hydrate, self.compiled), self.inverseCompiled && can.proxy(self.inverseCompiled.hydrate, self.inverseCompiled));
        };
    };
    can.extend(HTMLSection.prototype, {
        inverse: function () {
            this.inverseData = [];
            this.data = 'inverseData';
        },
        push: function (data) {
            this.add(data);
            this.targetStack.push(data);
        },
        pop: function () {
            return this.targetStack.pop();
        },
        add: function (data) {
            if (typeof data === 'string') {
                data = decodeHTML(data);
            }
            if (this.targetStack.length) {
                this.targetStack[this.targetStack.length - 1].children.push(data);
            } else {
                this[this.data].push(data);
            }
        },
        compile: function () {
            this.compiled = target(this.targetData);
            if (this.inverseData) {
                this.inverseCompiled = target(this.inverseData);
                delete this.inverseData;
            }
            delete this.targetData;
            delete this.targetStack;
            return this.compiled;
        },
        children: function () {
            if (this.targetStack.length) {
                return this.targetStack[this.targetStack.length - 1].children;
            } else {
                return this[this.data];
            }
        },
        isEmpty: function () {
            return !this.targetData.length;
        }
    });
    return HTMLSectionBuilder;
});
/*can@2.2.4#view/stache/text_section*/
define('can@2.2.4#view/stache/text_section', [
    'can/util/util',
    'can/view/live/live',
    './utils'
], function (can, live, utils) {
    live = live || can.view.live;
    var TextSectionBuilder = function () {
            this.stack = [new TextSection()];
        }, emptyHandler = function () {
        };
    can.extend(TextSectionBuilder.prototype, utils.mixins);
    can.extend(TextSectionBuilder.prototype, {
        startSection: function (process) {
            var subSection = new TextSection();
            this.last().add({
                process: process,
                truthy: subSection
            });
            this.stack.push(subSection);
        },
        endSection: function () {
            this.stack.pop();
        },
        inverse: function () {
            this.stack.pop();
            var falseySection = new TextSection();
            this.last().last().falsey = falseySection;
            this.stack.push(falseySection);
        },
        compile: function (state) {
            var renderer = this.stack[0].compile();
            return function (scope, options) {
                var compute = can.compute(function () {
                        return renderer(scope, options);
                    }, this, false, true);
                compute.bind('change', emptyHandler);
                var value = compute();
                if (compute.computeInstance.hasDependencies) {
                    if (state.attr) {
                        live.simpleAttribute(this, state.attr, compute);
                    } else {
                        live.attributes(this, compute);
                    }
                    compute.unbind('change', emptyHandler);
                } else {
                    if (state.attr) {
                        can.attr.set(this, state.attr, value);
                    } else {
                        live.setAttributes(this, value);
                    }
                }
            };
        }
    });
    var passTruthyFalsey = function (process, truthy, falsey) {
        return function (scope, options) {
            return process.call(this, scope, options, truthy, falsey);
        };
    };
    var TextSection = function () {
        this.values = [];
    };
    can.extend(TextSection.prototype, {
        add: function (data) {
            this.values.push(data);
        },
        last: function () {
            return this.values[this.values.length - 1];
        },
        compile: function () {
            var values = this.values, len = values.length;
            for (var i = 0; i < len; i++) {
                var value = this.values[i];
                if (typeof value === 'object') {
                    values[i] = passTruthyFalsey(value.process, value.truthy && value.truthy.compile(), value.falsey && value.falsey.compile());
                }
            }
            return function (scope, options) {
                var txt = '', value;
                for (var i = 0; i < len; i++) {
                    value = values[i];
                    txt += typeof value === 'string' ? value : value.call(this, scope, options);
                }
                return txt;
            };
        }
    });
    return TextSectionBuilder;
});
/*can@2.2.4#view/stache/intermediate_and_imports*/
define('can@2.2.4#view/stache/intermediate_and_imports', [
    'can/view/stache/mustache_core',
    'can/view/parser/parser'
], function (mustacheCore, parser) {
    return function (source) {
        var template = mustacheCore.cleanLineEndings(source);
        var imports = [], inImport = false, inFrom = false;
        var keepToken = function () {
            return inImport ? false : true;
        };
        var intermediate = parser(template, {
                start: function (tagName, unary) {
                    if (tagName === 'can-import') {
                        inImport = true;
                    }
                    return keepToken();
                },
                end: function (tagName, unary) {
                    if (tagName === 'can-import') {
                        inImport = false;
                        return false;
                    }
                    return keepToken();
                },
                attrStart: function (attrName) {
                    if (attrName === 'from') {
                        inFrom = true;
                    }
                    return keepToken();
                },
                attrEnd: function (attrName) {
                    if (attrName === 'from') {
                        inFrom = false;
                    }
                    return keepToken();
                },
                attrValue: function (value) {
                    if (inFrom && inImport) {
                        imports.push(value);
                    }
                    return keepToken();
                },
                chars: keepToken,
                comment: keepToken,
                special: keepToken,
                done: keepToken
            }, true);
        return {
            intermediate: intermediate,
            imports: imports
        };
    };
});
/*can@2.2.4#view/stache/stache*/
define('can@2.2.4#view/stache/stache', [
    'can/util/util',
    'can/view/parser/parser',
    'can/view/target/target',
    './html_section',
    './text_section',
    './mustache_core',
    './mustache_helpers',
    './intermediate_and_imports',
    'can/view/callbacks/callbacks',
    'can/view/bindings/bindings'
], function (can, parser, target, HTMLSectionBuilder, TextSectionBuilder, mustacheCore, mustacheHelpers, getIntermediateAndImports, viewCallbacks) {
    parser = parser || can.view.parser;
    viewCallbacks = viewCallbacks || can.view.callbacks;
    var svgNamespace = 'http://www.w3.org/2000/svg';
    var namespaces = {
            'svg': svgNamespace,
            'g': svgNamespace
        };
    function stache(template) {
        if (typeof template === 'string') {
            template = mustacheCore.cleanLineEndings(template);
        }
        var section = new HTMLSectionBuilder(), state = {
                node: null,
                attr: null,
                sectionElementStack: [],
                text: false,
                namespaceStack: []
            }, makeRendererAndUpdateSection = function (section, mode, stache) {
                if (mode === '>') {
                    section.add(mustacheCore.makeLiveBindingPartialRenderer(stache, state));
                } else if (mode === '/') {
                    section.endSection();
                    if (section instanceof HTMLSectionBuilder) {
                        state.sectionElementStack.pop();
                    }
                } else if (mode === 'else') {
                    section.inverse();
                } else {
                    var makeRenderer = section instanceof HTMLSectionBuilder ? mustacheCore.makeLiveBindingBranchRenderer : mustacheCore.makeStringBranchRenderer;
                    if (mode === '{' || mode === '&') {
                        section.add(makeRenderer(null, stache, copyState()));
                    } else if (mode === '#' || mode === '^') {
                        section.startSection(makeRenderer(mode, stache, copyState()));
                        if (section instanceof HTMLSectionBuilder) {
                            state.sectionElementStack.push('section');
                        }
                    } else {
                        section.add(makeRenderer(null, stache, copyState({ text: true })));
                    }
                }
            }, copyState = function (overwrites) {
                var cur = {
                        tag: state.node && state.node.tag,
                        attr: state.attr && state.attr.name,
                        directlyNested: state.sectionElementStack.length ? state.sectionElementStack[state.sectionElementStack.length - 1] === 'section' : true
                    };
                return overwrites ? can.simpleExtend(cur, overwrites) : cur;
            }, addAttributesCallback = function (node, callback) {
                if (!node.attributes) {
                    node.attributes = [];
                }
                node.attributes.push(callback);
            };
        parser(template, {
            start: function (tagName, unary) {
                var matchedNamespace = namespaces[tagName];
                if (matchedNamespace && !unary) {
                    state.namespaceStack.push(matchedNamespace);
                }
                state.node = {
                    tag: tagName,
                    children: [],
                    namespace: matchedNamespace || can.last(state.namespaceStack)
                };
            },
            end: function (tagName, unary) {
                var isCustomTag = viewCallbacks.tag(tagName);
                if (unary) {
                    section.add(state.node);
                    if (isCustomTag) {
                        addAttributesCallback(state.node, function (scope, options) {
                            viewCallbacks.tagHandler(this, tagName, {
                                scope: scope,
                                options: options,
                                subtemplate: null,
                                templateType: 'stache'
                            });
                        });
                    }
                } else {
                    section.push(state.node);
                    state.sectionElementStack.push('element');
                    if (isCustomTag) {
                        section.startSubSection();
                    }
                }
                state.node = null;
            },
            close: function (tagName) {
                var matchedNamespace = namespaces[tagName];
                if (matchedNamespace) {
                    state.namespaceStack.pop();
                }
                var isCustomTag = viewCallbacks.tag(tagName), renderer;
                if (isCustomTag) {
                    renderer = section.endSubSectionAndReturnRenderer();
                }
                var oldNode = section.pop();
                if (isCustomTag) {
                    addAttributesCallback(oldNode, function (scope, options) {
                        viewCallbacks.tagHandler(this, tagName, {
                            scope: scope,
                            options: options,
                            subtemplate: renderer,
                            templateType: 'stache'
                        });
                    });
                }
                state.sectionElementStack.pop();
            },
            attrStart: function (attrName) {
                if (state.node.section) {
                    state.node.section.add(attrName + '="');
                } else {
                    state.attr = {
                        name: attrName,
                        value: ''
                    };
                }
            },
            attrEnd: function (attrName) {
                if (state.node.section) {
                    state.node.section.add('" ');
                } else {
                    if (!state.node.attrs) {
                        state.node.attrs = {};
                    }
                    state.node.attrs[state.attr.name] = state.attr.section ? state.attr.section.compile(copyState()) : state.attr.value;
                    var attrCallback = viewCallbacks.attr(attrName);
                    if (attrCallback) {
                        if (!state.node.attributes) {
                            state.node.attributes = [];
                        }
                        state.node.attributes.push(function (scope, options) {
                            attrCallback(this, {
                                attributeName: attrName,
                                scope: scope,
                                options: options
                            });
                        });
                    }
                    state.attr = null;
                }
            },
            attrValue: function (value) {
                var section = state.node.section || state.attr.section;
                if (section) {
                    section.add(value);
                } else {
                    state.attr.value += value;
                }
            },
            chars: function (text) {
                section.add(text);
            },
            special: function (text) {
                var firstAndText = mustacheCore.splitModeFromExpression(text, state), mode = firstAndText.mode, expression = firstAndText.expression;
                if (expression === 'else') {
                    (state.attr && state.attr.section ? state.attr.section : section).inverse();
                    return;
                }
                if (mode === '!') {
                    return;
                }
                if (state.node && state.node.section) {
                    makeRendererAndUpdateSection(state.node.section, mode, expression);
                    if (state.node.section.subSectionDepth() === 0) {
                        state.node.attributes.push(state.node.section.compile(copyState()));
                        delete state.node.section;
                    }
                } else if (state.attr) {
                    if (!state.attr.section) {
                        state.attr.section = new TextSectionBuilder();
                        if (state.attr.value) {
                            state.attr.section.add(state.attr.value);
                        }
                    }
                    makeRendererAndUpdateSection(state.attr.section, mode, expression);
                } else if (state.node) {
                    if (!state.node.attributes) {
                        state.node.attributes = [];
                    }
                    if (!mode) {
                        state.node.attributes.push(mustacheCore.makeLiveBindingBranchRenderer(null, expression, copyState()));
                    } else if (mode === '#' || mode === '^') {
                        if (!state.node.section) {
                            state.node.section = new TextSectionBuilder();
                        }
                        makeRendererAndUpdateSection(state.node.section, mode, expression);
                    } else {
                        throw mode + ' is currently not supported within a tag.';
                    }
                } else {
                    makeRendererAndUpdateSection(section, mode, expression);
                }
            },
            comment: function (text) {
                section.add({ comment: text });
            },
            done: function () {
            }
        });
        return section.compile();
    }
    var escMap = {
            '\n': '\\n',
            '\r': '\\r',
            '\u2028': '\\u2028',
            '\u2029': '\\u2029'
        };
    var esc = function (string) {
        return ('' + string).replace(/["'\\\n\r\u2028\u2029]/g, function (character) {
            if ('\'"\\'.indexOf(character) >= 0) {
                return '\\' + character;
            } else {
                return escMap[character];
            }
        });
    };
    can.view.register({
        suffix: 'stache',
        contentType: 'x-stache-template',
        fragRenderer: function (id, text) {
            return stache(text);
        },
        script: function (id, src) {
            return 'can.stache("' + esc(src) + '")';
        }
    });
    can.view.ext = '.stache';
    can.extend(can.stache, mustacheHelpers);
    can.extend(stache, mustacheHelpers);
    can.stache.safeString = stache.safeString = function (text) {
        return {
            toString: function () {
                return text;
            }
        };
    };
    can.stache.async = function (source) {
        var iAi = getIntermediateAndImports(source);
        var importPromises = can.map(iAi.imports, function (moduleName) {
                return can['import'](moduleName);
            });
        return can.when.apply(can, importPromises).then(function () {
            return stache(iAi.intermediate);
        });
    };
    return stache;
});
/*can@2.2.4#view/stache/system*/
System.set('can@2.2.4#view/stache/system', System.newModule({}));
/*src/index.stache!can@2.2.4#view/stache/system*/
define('src/index.stache!can@2.2.4#view/stache/system', ['can/view/stache/stache'], function (stache) {
    return stache([
        {
            'tokenType': 'start',
            'args': [
                'ma-header',
                false
            ]
        },
        {
            'tokenType': 'end',
            'args': [
                'ma-header',
                false
            ]
        },
        {
            'tokenType': 'close',
            'args': ['ma-header']
        },
        {
            'tokenType': 'chars',
            'args': ['\n\n']
        },
        {
            'tokenType': 'start',
            'args': [
                'ma-router',
                false
            ]
        },
        {
            'tokenType': 'attrStart',
            'args': ['route-key']
        },
        {
            'tokenType': 'attrValue',
            'args': ['page']
        },
        {
            'tokenType': 'attrEnd',
            'args': ['route-key']
        },
        {
            'tokenType': 'attrStart',
            'args': ['route-path']
        },
        {
            'tokenType': 'attrEnd',
            'args': ['route-path']
        },
        {
            'tokenType': 'attrStart',
            'args': ['route-target']
        },
        {
            'tokenType': 'attrValue',
            'args': ['home']
        },
        {
            'tokenType': 'attrEnd',
            'args': ['route-target']
        },
        {
            'tokenType': 'end',
            'args': [
                'ma-router',
                false
            ]
        },
        {
            'tokenType': 'chars',
            'args': ['\n    ']
        },
        {
            'tokenType': 'start',
            'args': [
                'mp-home',
                false
            ]
        },
        {
            'tokenType': 'end',
            'args': [
                'mp-home',
                false
            ]
        },
        {
            'tokenType': 'close',
            'args': ['mp-home']
        },
        {
            'tokenType': 'chars',
            'args': ['\n']
        },
        {
            'tokenType': 'close',
            'args': ['ma-router']
        },
        {
            'tokenType': 'chars',
            'args': ['\n\n']
        },
        {
            'tokenType': 'start',
            'args': [
                'ma-router',
                false
            ]
        },
        {
            'tokenType': 'attrStart',
            'args': ['route-key']
        },
        {
            'tokenType': 'attrValue',
            'args': ['page']
        },
        {
            'tokenType': 'attrEnd',
            'args': ['route-key']
        },
        {
            'tokenType': 'attrStart',
            'args': ['route-target']
        },
        {
            'tokenType': 'attrValue',
            'args': ['cities']
        },
        {
            'tokenType': 'attrEnd',
            'args': ['route-target']
        },
        {
            'tokenType': 'end',
            'args': [
                'ma-router',
                false
            ]
        },
        {
            'tokenType': 'chars',
            'args': ['\n    ']
        },
        {
            'tokenType': 'start',
            'args': [
                'mp-cities',
                false
            ]
        },
        {
            'tokenType': 'end',
            'args': [
                'mp-cities',
                false
            ]
        },
        {
            'tokenType': 'close',
            'args': ['mp-cities']
        },
        {
            'tokenType': 'chars',
            'args': ['\n']
        },
        {
            'tokenType': 'close',
            'args': ['ma-router']
        },
        {
            'tokenType': 'chars',
            'args': ['\n\n']
        },
        {
            'tokenType': 'start',
            'args': [
                'ma-router',
                false
            ]
        },
        {
            'tokenType': 'attrStart',
            'args': ['route-key']
        },
        {
            'tokenType': 'attrValue',
            'args': ['page']
        },
        {
            'tokenType': 'attrEnd',
            'args': ['route-key']
        },
        {
            'tokenType': 'attrStart',
            'args': ['route-target']
        },
        {
            'tokenType': 'attrValue',
            'args': ['near-me']
        },
        {
            'tokenType': 'attrEnd',
            'args': ['route-target']
        },
        {
            'tokenType': 'end',
            'args': [
                'ma-router',
                false
            ]
        },
        {
            'tokenType': 'chars',
            'args': ['\n    ']
        },
        {
            'tokenType': 'start',
            'args': [
                'mp-near-me',
                false
            ]
        },
        {
            'tokenType': 'end',
            'args': [
                'mp-near-me',
                false
            ]
        },
        {
            'tokenType': 'close',
            'args': ['mp-near-me']
        },
        {
            'tokenType': 'chars',
            'args': ['\n']
        },
        {
            'tokenType': 'close',
            'args': ['ma-router']
        },
        {
            'tokenType': 'chars',
            'args': ['\n\n']
        },
        {
            'tokenType': 'start',
            'args': [
                'ma-footer',
                false
            ]
        },
        {
            'tokenType': 'end',
            'args': [
                'ma-footer',
                false
            ]
        },
        {
            'tokenType': 'close',
            'args': ['ma-footer']
        },
        {
            'tokenType': 'chars',
            'args': ['\n']
        },
        {
            'tokenType': 'done',
            'args': []
        }
    ]);
});
/*$css*/
define('$css', function (require, exports, module) {
    if (steal.config('env') === 'production') {
        exports.fetch = function (load) {
            var cssFile = load.address;
            var link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = cssFile;
            document.head.appendChild(link);
            return '';
        };
    } else {
        exports.instantiate = function (load) {
            load.metadata.deps = [];
            load.metadata.execute = function () {
                var source = load.source + '/*# sourceURL=' + load.address + ' */';
                source = source.replace(/url\(['"]?([^'"\)]*)['"]?\)/g, function (whole, part) {
                    return 'url(' + steal.joinURIs(load.address, part) + ')';
                });
                if (load.source && typeof document !== 'undefined') {
                    var head = document.head || document.getElementsByTagName('head')[0], style = document.createElement('style');
                    style.type = 'text/css';
                    if (style.styleSheet) {
                        style.styleSheet.cssText = source;
                    } else {
                        style.appendChild(document.createTextNode(source));
                    }
                    head.appendChild(style);
                }
                return System.newModule({ source: source });
            };
            load.metadata.format = 'css';
        };
    }
    exports.buildType = 'css';
    exports.includeInBuild = true;
});
/*less*/
System.set('less', System.newModule({}));
/*$less*/
System.set('$less', System.newModule({}));
/*can@2.2.4#util/object/object*/
define('can@2.2.4#util/object/object', ['can/util/util'], function (can) {
    var isArray = can.isArray;
    can.Object = {};
    var same = can.Object.same = function (a, b, compares, aParent, bParent, deep) {
            var aType = typeof a, aArray = isArray(a), comparesType = typeof compares, compare;
            if (comparesType === 'string' || compares === null) {
                compares = compareMethods[compares];
                comparesType = 'function';
            }
            if (comparesType === 'function') {
                return compares(a, b, aParent, bParent);
            }
            compares = compares || {};
            if (a === null || b === null) {
                return a === b;
            }
            if (a instanceof Date || b instanceof Date) {
                return a === b;
            }
            if (deep === -1) {
                return aType === 'object' || a === b;
            }
            if (aType !== typeof b || aArray !== isArray(b)) {
                return false;
            }
            if (a === b) {
                return true;
            }
            if (aArray) {
                if (a.length !== b.length) {
                    return false;
                }
                for (var i = 0; i < a.length; i++) {
                    compare = compares[i] === undefined ? compares['*'] : compares[i];
                    if (!same(a[i], b[i], a, b, compare)) {
                        return false;
                    }
                }
                return true;
            } else if (aType === 'object' || aType === 'function') {
                var bCopy = can.extend({}, b);
                for (var prop in a) {
                    compare = compares[prop] === undefined ? compares['*'] : compares[prop];
                    if (!same(a[prop], b[prop], compare, a, b, deep === false ? -1 : undefined)) {
                        return false;
                    }
                    delete bCopy[prop];
                }
                for (prop in bCopy) {
                    if (compares[prop] === undefined || !same(undefined, b[prop], compares[prop], a, b, deep === false ? -1 : undefined)) {
                        return false;
                    }
                }
                return true;
            }
            return false;
        };
    can.Object.subsets = function (checkSet, sets, compares) {
        var len = sets.length, subsets = [];
        for (var i = 0; i < len; i++) {
            var set = sets[i];
            if (can.Object.subset(checkSet, set, compares)) {
                subsets.push(set);
            }
        }
        return subsets;
    };
    can.Object.subset = function (subset, set, compares) {
        compares = compares || {};
        for (var prop in set) {
            if (!same(subset[prop], set[prop], compares[prop], subset, set)) {
                return false;
            }
        }
        return true;
    };
    var compareMethods = {
            'null': function () {
                return true;
            },
            i: function (a, b) {
                return ('' + a).toLowerCase() === ('' + b).toLowerCase();
            },
            eq: function (a, b) {
                return a === b;
            },
            similar: function (a, b) {
                return a == b;
            }
        };
    compareMethods.eqeq = compareMethods.similar;
    return can.Object;
});
/*can@2.2.4#util/fixture//fixture*/
define('can@2.2.4#util/fixture//fixture', [
    'can/util/util',
    'can/util/string/string',
    'can/util/object/object'
], function (can) {
    if (!can.Object) {
        throw new Error('can.fixture depends on can.Object. Please include it before can.fixture.');
    }
    var getUrl = function (url) {
        if (typeof steal !== 'undefined') {
            if (steal.joinURIs) {
                var base = steal.config('baseUrl');
                var joined = steal.joinURIs(base, url);
                return joined;
            }
            if (can.isFunction(steal.config)) {
                if (steal.System) {
                    return steal.joinURIs(steal.config('baseURL'), url);
                } else {
                    return steal.config().root.mapJoin(url).toString();
                }
            }
            return steal.root.join(url).toString();
        }
        return (can.fixture.rootUrl || '') + url;
    };
    var updateSettings = function (settings, originalOptions) {
            if (!can.fixture.on || settings.fixture === false) {
                return;
            }
            var log = function () {
            };
            settings.type = settings.type || settings.method || 'GET';
            var data = overwrite(settings);
            if (!settings.fixture) {
                if (window.location.protocol === 'file:') {
                    log('ajax request to ' + settings.url + ', no fixture found');
                }
                return;
            }
            if (typeof settings.fixture === 'string' && can.fixture[settings.fixture]) {
                settings.fixture = can.fixture[settings.fixture];
            }
            if (typeof settings.fixture === 'string') {
                var url = settings.fixture;
                if (/^\/\//.test(url)) {
                    url = getUrl(settings.fixture.substr(2));
                }
                if (data) {
                    url = can.sub(url, data);
                }
                delete settings.fixture;
                settings.url = url;
                settings.data = null;
                settings.type = 'GET';
                if (!settings.error) {
                    settings.error = function (xhr, error, message) {
                        throw 'fixtures.js Error ' + error + ' ' + message;
                    };
                }
            } else {
                if (settings.dataTypes) {
                    settings.dataTypes.splice(0, 0, 'fixture');
                }
                if (data && originalOptions) {
                    originalOptions.data = originalOptions.data || {};
                    can.extend(originalOptions.data, data);
                }
            }
        }, extractResponse = function (status, statusText, responses, headers) {
            if (typeof status !== 'number') {
                headers = statusText;
                responses = status;
                statusText = 'success';
                status = 200;
            }
            if (typeof statusText !== 'string') {
                headers = responses;
                responses = statusText;
                statusText = 'success';
            }
            if (status >= 400 && status <= 599) {
                this.dataType = 'text';
            }
            return [
                status,
                statusText,
                extractResponses(this, responses),
                headers
            ];
        }, extractResponses = function (settings, responses) {
            var next = settings.dataTypes ? settings.dataTypes[0] : settings.dataType || 'json';
            if (!responses || !responses[next]) {
                var tmp = {};
                tmp[next] = responses;
                responses = tmp;
            }
            return responses;
        };
    if (can.ajaxPrefilter && can.ajaxTransport) {
        can.ajaxPrefilter(updateSettings);
        can.ajaxTransport('fixture', function (s, original) {
            s.dataTypes.shift();
            var timeout, stopped = false;
            return {
                send: function (headers, callback) {
                    timeout = setTimeout(function () {
                        var success = function () {
                                if (stopped === false) {
                                    callback.apply(null, extractResponse.apply(s, arguments));
                                }
                            }, result = s.fixture(original, success, headers, s);
                        if (result !== undefined) {
                            callback(200, 'success', extractResponses(s, result), {});
                        }
                    }, can.fixture.delay);
                },
                abort: function () {
                    stopped = true;
                    clearTimeout(timeout);
                }
            };
        });
    } else {
        var AJAX = can.ajax;
        can.ajax = function (settings) {
            updateSettings(settings, settings);
            if (settings.fixture) {
                var timeout, deferred = new can.Deferred(), stopped = false;
                deferred.getResponseHeader = function () {
                };
                deferred.then(settings.success, settings.fail);
                deferred.abort = function () {
                    clearTimeout(timeout);
                    stopped = true;
                    deferred.reject(deferred);
                };
                timeout = setTimeout(function () {
                    var success = function () {
                            var response = extractResponse.apply(settings, arguments), status = response[0];
                            if ((status >= 200 && status < 300 || status === 304) && stopped === false) {
                                deferred.resolve(response[2][settings.dataType]);
                            } else {
                                deferred.reject(deferred, 'error', response[1]);
                            }
                        }, result = settings.fixture(settings, success, settings.headers, settings);
                    if (result !== undefined) {
                        deferred.resolve(result);
                    }
                }, can.fixture.delay);
                return deferred;
            } else {
                return AJAX(settings);
            }
        };
    }
    var overwrites = [], find = function (settings, exact) {
            for (var i = 0; i < overwrites.length; i++) {
                if ($fixture._similar(settings, overwrites[i], exact)) {
                    return i;
                }
            }
            return -1;
        }, overwrite = function (settings) {
            var index = find(settings);
            if (index > -1) {
                settings.fixture = overwrites[index].fixture;
                return $fixture._getData(overwrites[index].url, settings.url);
            }
        }, getId = function (settings) {
            var id = settings.data.id;
            if (id === undefined && typeof settings.data === 'number') {
                id = settings.data;
            }
            if (id === undefined) {
                settings.url.replace(/\/(\d+)(\/|$|\.)/g, function (all, num) {
                    id = num;
                });
            }
            if (id === undefined) {
                id = settings.url.replace(/\/(\w+)(\/|$|\.)/g, function (all, num) {
                    if (num !== 'update') {
                        id = num;
                    }
                });
            }
            if (id === undefined) {
                id = Math.round(Math.random() * 1000);
            }
            return id;
        };
    var $fixture = can.fixture = function (settings, fixture) {
            if (fixture !== undefined) {
                if (typeof settings === 'string') {
                    var matches = settings.match(/(GET|POST|PUT|DELETE) (.+)/i);
                    if (!matches) {
                        settings = { url: settings };
                    } else {
                        settings = {
                            url: matches[2],
                            type: matches[1]
                        };
                    }
                }
                var index = find(settings, !!fixture);
                if (index > -1) {
                    overwrites.splice(index, 1);
                }
                if (fixture == null) {
                    return;
                }
                settings.fixture = fixture;
                overwrites.push(settings);
            } else {
                can.each(settings, function (fixture, url) {
                    $fixture(url, fixture);
                });
            }
        };
    var replacer = can.replacer;
    can.extend(can.fixture, {
        _similar: function (settings, overwrite, exact) {
            if (exact) {
                return can.Object.same(settings, overwrite, { fixture: null });
            } else {
                return can.Object.subset(settings, overwrite, can.fixture._compare);
            }
        },
        _compare: {
            url: function (a, b) {
                return !!$fixture._getData(b, a);
            },
            fixture: null,
            type: 'i'
        },
        _getData: function (fixtureUrl, url) {
            var order = [], fixtureUrlAdjusted = fixtureUrl.replace('.', '\\.').replace('?', '\\?'), res = new RegExp(fixtureUrlAdjusted.replace(replacer, function (whole, part) {
                    order.push(part);
                    return '([^/]+)';
                }) + '$').exec(url), data = {};
            if (!res) {
                return null;
            }
            res.shift();
            can.each(order, function (name) {
                data[name] = res.shift();
            });
            return data;
        },
        store: function (count, make, filter) {
            var currentId = 0, findOne = function (id) {
                    for (var i = 0; i < items.length; i++) {
                        if (id == items[i].id) {
                            return items[i];
                        }
                    }
                }, methods = {}, types, items, reset;
            if (can.isArray(count) && typeof count[0] === 'string') {
                types = count;
                count = make;
                make = filter;
                filter = arguments[3];
            } else if (typeof count === 'string') {
                types = [
                    count + 's',
                    count
                ];
                count = make;
                make = filter;
                filter = arguments[3];
            }
            if (typeof count === 'number') {
                items = [];
                reset = function () {
                    items = [];
                    for (var i = 0; i < count; i++) {
                        var item = make(i, items);
                        if (!item.id) {
                            item.id = i;
                        }
                        currentId = Math.max(item.id + 1, currentId + 1) || items.length;
                        items.push(item);
                    }
                    if (can.isArray(types)) {
                        can.fixture['~' + types[0]] = items;
                        can.fixture['-' + types[0]] = methods.findAll;
                        can.fixture['-' + types[1]] = methods.findOne;
                        can.fixture['-' + types[1] + 'Update'] = methods.update;
                        can.fixture['-' + types[1] + 'Destroy'] = methods.destroy;
                        can.fixture['-' + types[1] + 'Create'] = methods.create;
                    }
                };
            } else {
                filter = make;
                var initialItems = count;
                reset = function () {
                    items = initialItems.slice(0);
                };
            }
            can.extend(methods, {
                findAll: function (request) {
                    request = request || {};
                    var retArr = items.slice(0);
                    request.data = request.data || {};
                    can.each((request.data.order || []).slice(0).reverse(), function (name) {
                        var split = name.split(' ');
                        retArr = retArr.sort(function (a, b) {
                            if (split[1].toUpperCase() !== 'ASC') {
                                if (a[split[0]] < b[split[0]]) {
                                    return 1;
                                } else if (a[split[0]] === b[split[0]]) {
                                    return 0;
                                } else {
                                    return -1;
                                }
                            } else {
                                if (a[split[0]] < b[split[0]]) {
                                    return -1;
                                } else if (a[split[0]] === b[split[0]]) {
                                    return 0;
                                } else {
                                    return 1;
                                }
                            }
                        });
                    });
                    can.each((request.data.group || []).slice(0).reverse(), function (name) {
                        var split = name.split(' ');
                        retArr = retArr.sort(function (a, b) {
                            return a[split[0]] > b[split[0]];
                        });
                    });
                    var offset = parseInt(request.data.offset, 10) || 0, limit = parseInt(request.data.limit, 10) || items.length - offset, i = 0;
                    for (var param in request.data) {
                        i = 0;
                        if (request.data[param] !== undefined && (param.indexOf('Id') !== -1 || param.indexOf('_id') !== -1)) {
                            while (i < retArr.length) {
                                if (request.data[param] != retArr[i][param]) {
                                    retArr.splice(i, 1);
                                } else {
                                    i++;
                                }
                            }
                        }
                    }
                    if (typeof filter === 'function') {
                        i = 0;
                        while (i < retArr.length) {
                            if (!filter(retArr[i], request)) {
                                retArr.splice(i, 1);
                            } else {
                                i++;
                            }
                        }
                    } else if (typeof filter === 'object') {
                        i = 0;
                        while (i < retArr.length) {
                            if (!can.Object.subset(retArr[i], request.data, filter)) {
                                retArr.splice(i, 1);
                            } else {
                                i++;
                            }
                        }
                    }
                    return {
                        'count': retArr.length,
                        'limit': request.data.limit,
                        'offset': request.data.offset,
                        'data': retArr.slice(offset, offset + limit)
                    };
                },
                findOne: function (request, response) {
                    var item = findOne(getId(request));
                    if (typeof item === 'undefined') {
                        return response(404, 'Requested resource not found');
                    }
                    response(item);
                },
                update: function (request, response) {
                    var id = getId(request), item = findOne(id);
                    if (typeof item === 'undefined') {
                        return response(404, 'Requested resource not found');
                    }
                    can.extend(item, request.data);
                    response({ id: id }, { location: request.url || '/' + getId(request) });
                },
                destroy: function (request, response) {
                    var id = getId(request), item = findOne(id);
                    if (typeof item === 'undefined') {
                        return response(404, 'Requested resource not found');
                    }
                    for (var i = 0; i < items.length; i++) {
                        if (items[i].id == id) {
                            items.splice(i, 1);
                            break;
                        }
                    }
                    return {};
                },
                create: function (settings, response) {
                    var item = typeof make === 'function' ? make(items.length, items) : {};
                    can.extend(item, settings.data);
                    if (!item.id) {
                        item.id = currentId++;
                    }
                    items.push(item);
                    response({ id: item.id }, { location: settings.url + '/' + item.id });
                }
            });
            reset();
            return can.extend({
                getId: getId,
                find: function (settings) {
                    return findOne(getId(settings));
                },
                reset: reset
            }, methods);
        },
        rand: function randomize(arr, min, max) {
            if (typeof arr === 'number') {
                if (typeof min === 'number') {
                    return arr + Math.floor(Math.random() * (min - arr));
                } else {
                    return Math.floor(Math.random() * arr);
                }
            }
            var rand = randomize;
            if (min === undefined) {
                return rand(arr, rand(arr.length + 1));
            }
            var res = [];
            arr = arr.slice(0);
            if (!max) {
                max = min;
            }
            max = min + Math.round(rand(max - min));
            for (var i = 0; i < max; i++) {
                res.push(arr.splice(rand(arr.length), 1)[0]);
            }
            return res;
        },
        xhr: function (xhr) {
            return can.extend({}, {
                abort: can.noop,
                getAllResponseHeaders: function () {
                    return '';
                },
                getResponseHeader: function () {
                    return '';
                },
                open: can.noop,
                overrideMimeType: can.noop,
                readyState: 4,
                responseText: '',
                responseXML: null,
                send: can.noop,
                setRequestHeader: can.noop,
                status: 200,
                statusText: 'OK'
            }, xhr);
        },
        on: true
    });
    can.fixture.delay = 200;
    can.fixture.rootUrl = getUrl('');
    can.fixture['-handleFunction'] = function (settings) {
        if (typeof settings.fixture === 'string' && can.fixture[settings.fixture]) {
            settings.fixture = can.fixture[settings.fixture];
        }
        if (typeof settings.fixture === 'function') {
            setTimeout(function () {
                if (settings.success) {
                    settings.success.apply(null, settings.fixture(settings, 'success'));
                }
                if (settings.complete) {
                    settings.complete.apply(null, settings.fixture(settings, 'complete'));
                }
            }, can.fixture.delay);
            return true;
        }
        return false;
    };
    can.fixture.overwrites = overwrites;
    can.fixture.make = can.fixture.store;
    return can.fixture;
});
/*models/artwork/fixture*/
define('models/artwork/fixture', [
    'exports',
    'can',
    'can/util/fixture'
], function (exports, _can, _canUtilFixture) {
    'use strict';
    var _interopRequire = function (obj) {
        return obj && obj.__esModule ? obj['default'] : obj;
    };
    var can = _interopRequire(_can);
    var artList = [
            {
                id: 1,
                title: 'Heyo',
                url: 'http://placekitten.com/g/300/200',
                description: 'Lorem ipsum'
            },
            {
                id: 2,
                title: 'Meow',
                url: 'http://placekitten.com/g/200/300',
                description: 'Kitty cat'
            },
            {
                id: 3,
                title: 'Space',
                url: 'https://farm4.staticflickr.com/3729/10007371353_4f5708a325_z.jpg',
                description: 'SPACE'
            }
        ];
    can.fixture('GET /artwork.json', function () {
        return artList;
    });
    can.fixture('GET /artwork/{id}.json', function (req) {
        var filtered = artList.filter(function (item) {
                return item.id === req.data.id;
            });
        return filtered;
    });
});
/*models/city/fixture*/
define('models/city/fixture', [
    'exports',
    'can',
    'can/util/fixture'
], function (exports, _can, _canUtilFixture) {
    'use strict';
    var _interopRequire = function (obj) {
        return obj && obj.__esModule ? obj['default'] : obj;
    };
    var can = _interopRequire(_can);
    var cityList = [
            {
                id: 1,
                cityCode: 'cary.nc',
                cityName: 'Cary',
                logoSrc: 'http://placekitten.com/g/50/50',
                shortDescription: 'Cary is located southeast of Raleigh.'
            },
            {
                id: 2,
                cityCode: 'raleigh.nc',
                cityName: 'Raleigh',
                logoSrc: 'http://placekitten.com/g/50/50',
                shortDescription: 'Raleigh is east of Durham.'
            },
            {
                id: 3,
                cityCode: 'durham.nc',
                cityName: 'Durham',
                logoSrc: 'http://placekitten.com/g/50/50',
                shortDescription: 'Durham is north of Cary.'
            }
        ];
    can.fixture('GET /city.json', function () {
        return cityList;
    });
    can.fixture('GET /city/{id}.json', function (req) {
        var filtered = cityList.filter(function (item) {
                return item.id === req.data.id;
            });
        return filtered;
    });
});
/*models/fixtures*/
define('models/fixtures', [
    'exports',
    'models/artwork/fixture',
    'models/city/fixture'
], function (exports, _modelsArtworkFixture, _modelsCityFixture) {
    'use strict';
});
/*can@2.2.4#map/define//define*/
define('can@2.2.4#map/define//define', [
    'can/util/util',
    'can/observe/observe'
], function (can) {
    var define = can.define = {};
    var getPropDefineBehavior = function (behavior, prop, define) {
        var propBehavior;
        if (define) {
            propBehavior = define[prop] ? define[prop] : define['*'];
            return propBehavior && propBehavior[behavior];
        }
    };
    can.Map.helpers.define = function (Map) {
        var definitions = Map.prototype.define;
        Map.defaultGenerators = {};
        for (var prop in definitions) {
            var type = definitions[prop].type;
            if (typeof type === 'string') {
                if (typeof define.types[type] === 'object') {
                    delete definitions[prop].type;
                    can.extend(definitions[prop], define.types[type]);
                }
            }
            if ('value' in definitions[prop]) {
                if (typeof definitions[prop].value === 'function') {
                    Map.defaultGenerators[prop] = definitions[prop].value;
                } else {
                    Map.defaults[prop] = definitions[prop].value;
                }
            }
            if (typeof definitions[prop].Value === 'function') {
                (function (Constructor) {
                    Map.defaultGenerators[prop] = function () {
                        return new Constructor();
                    };
                }(definitions[prop].Value));
            }
        }
    };
    var oldSetupDefaults = can.Map.prototype._setupDefaults;
    can.Map.prototype._setupDefaults = function (obj) {
        var defaults = oldSetupDefaults.call(this), propsCommittedToAttr = {}, Map = this.constructor, originalGet = this._get;
        this._get = function (originalProp) {
            prop = originalProp.indexOf('.') !== -1 ? originalProp.substr(0, originalProp.indexOf('.')) : prop;
            if (prop in defaults && !(prop in propsCommittedToAttr)) {
                this.attr(prop, defaults[prop]);
                propsCommittedToAttr[prop] = true;
            }
            return originalGet.apply(this, arguments);
        };
        for (var prop in Map.defaultGenerators) {
            if (!obj || !(prop in obj)) {
                defaults[prop] = Map.defaultGenerators[prop].call(this);
            }
        }
        this._get = originalGet;
        return defaults;
    };
    var proto = can.Map.prototype, oldSet = proto.__set;
    proto.__set = function (prop, value, current, success, error) {
        var errorCallback = function (errors) {
                var stub = error && error.call(self, errors);
                if (stub !== false) {
                    can.trigger(self, 'error', [
                        prop,
                        errors
                    ], true);
                }
                return false;
            }, self = this, setter = getPropDefineBehavior('set', prop, this.define), getter = getPropDefineBehavior('get', prop, this.define);
        if (setter) {
            can.batch.start();
            var setterCalled = false, setValue = setter.call(this, value, function (value) {
                    if (getter) {
                        self[prop](value);
                    } else {
                        oldSet.call(self, prop, value, current, success, errorCallback);
                    }
                    setterCalled = true;
                }, errorCallback, getter ? this[prop].computeInstance.lastSetValue.get() : current);
            if (getter) {
                if (setValue !== undefined && !setterCalled && setter.length >= 2) {
                    this[prop](setValue);
                }
                can.batch.stop();
                return;
            } else if (setValue === undefined && !setterCalled && setter.length >= 2) {
                can.batch.stop();
                return;
            } else {
                if (!setterCalled) {
                    oldSet.call(self, prop, setter.length === 0 && setValue === undefined ? value : setValue, current, success, errorCallback);
                }
                can.batch.stop();
                return this;
            }
        } else {
            oldSet.call(self, prop, value, current, success, errorCallback);
        }
        return this;
    };
    define.types = {
        'date': function (str) {
            var type = typeof str;
            if (type === 'string') {
                str = Date.parse(str);
                return isNaN(str) ? null : new Date(str);
            } else if (type === 'number') {
                return new Date(str);
            } else {
                return str;
            }
        },
        'number': function (val) {
            return +val;
        },
        'boolean': function (val) {
            if (val === 'false' || val === '0' || !val) {
                return false;
            }
            return true;
        },
        'htmlbool': function (val) {
            return typeof val === 'string' || !!val;
        },
        '*': function (val) {
            return val;
        },
        'string': function (val) {
            return '' + val;
        },
        'compute': {
            set: function (newValue, setVal, setErr, oldValue) {
                if (newValue.isComputed) {
                    return newValue;
                }
                if (oldValue && oldValue.isComputed) {
                    oldValue(newValue);
                    return oldValue;
                }
                return newValue;
            },
            get: function (value) {
                return value && value.isComputed ? value() : value;
            }
        }
    };
    var oldType = proto.__type;
    proto.__type = function (value, prop) {
        var type = getPropDefineBehavior('type', prop, this.define), Type = getPropDefineBehavior('Type', prop, this.define), newValue = value;
        if (typeof type === 'string') {
            type = define.types[type];
        }
        if (type || Type) {
            if (type) {
                newValue = type.call(this, newValue, prop);
            }
            if (Type && !(newValue instanceof Type)) {
                newValue = new Type(newValue);
            }
            return newValue;
        } else if (can.isPlainObject(newValue) && newValue.define) {
            newValue = can.Map.extend(newValue);
            newValue = new newValue();
        }
        return oldType.call(this, newValue, prop);
    };
    var oldRemove = proto._remove;
    proto._remove = function (prop, current) {
        var remove = getPropDefineBehavior('remove', prop, this.define), res;
        if (remove) {
            can.batch.start();
            res = remove.call(this, current);
            if (res === false) {
                can.batch.stop();
                return;
            } else {
                res = oldRemove.call(this, prop, current);
                can.batch.stop();
                return res;
            }
        }
        return oldRemove.call(this, prop, current);
    };
    var oldSetupComputes = proto._setupComputes;
    proto._setupComputes = function (defaultsValues) {
        oldSetupComputes.apply(this, arguments);
        for (var attr in this.define) {
            var def = this.define[attr], get = def.get;
            if (get) {
                this[attr] = can.compute.async(defaultsValues[attr], get, this);
                this._computedBindings[attr] = { count: 0 };
            }
        }
    };
    var oldSingleSerialize = can.Map.helpers._serialize;
    can.Map.helpers._serialize = function (map, name, val) {
        return serializeProp(map, name, val);
    };
    var serializeProp = function (map, attr, val) {
        var serializer = attr === '*' ? false : getPropDefineBehavior('serialize', attr, map.define);
        if (serializer === undefined) {
            return oldSingleSerialize.apply(this, arguments);
        } else if (serializer !== false) {
            return typeof serializer === 'function' ? serializer.call(map, val, attr) : oldSingleSerialize.apply(this, arguments);
        }
    };
    var oldSerialize = proto.serialize;
    proto.serialize = function (property) {
        var serialized = oldSerialize.apply(this, arguments);
        if (property) {
            return serialized;
        }
        var serializer, val;
        for (var attr in this.define) {
            if (!(attr in serialized)) {
                serializer = this.define && this.define[attr] && this.define[attr].serialize;
                if (serializer) {
                    val = serializeProp(this, attr, this.attr(attr));
                    if (val !== undefined) {
                        serialized[attr] = val;
                    }
                }
            }
        }
        return serialized;
    };
    return can.define;
});
/*models/app-model/app-model*/
define('models/app-model/app-model', [
    'exports',
    'module',
    'can',
    'can/map/define'
], function (exports, module, _can, _canMapDefine) {
    'use strict';
    var _interopRequire = function (obj) {
        return obj && obj.__esModule ? obj['default'] : obj;
    };
    var can = _interopRequire(_can);
    module.exports = can.Map.extend({});
});
/*components/router/router.stache!can@2.2.4#view/stache/system*/
define('components/router/router.stache!can@2.2.4#view/stache/system', ['can/view/stache/stache'], function (stache) {
    return stache([
        {
            'tokenType': 'special',
            'args': ['#if showRoute']
        },
        {
            'tokenType': 'start',
            'args': [
                'content',
                false
            ]
        },
        {
            'tokenType': 'end',
            'args': [
                'content',
                false
            ]
        },
        {
            'tokenType': 'close',
            'args': ['content']
        },
        {
            'tokenType': 'special',
            'args': ['/if']
        },
        {
            'tokenType': 'chars',
            'args': ['\n']
        },
        {
            'tokenType': 'done',
            'args': []
        }
    ]);
});
/*components/router/viewmodel*/
define('components/router/viewmodel', [
    'exports',
    'module',
    'can',
    'can/map/define'
], function (exports, module, _can, _canMapDefine) {
    'use strict';
    var _interopRequire = function (obj) {
        return obj && obj.__esModule ? obj['default'] : obj;
    };
    var can = _interopRequire(_can);
    module.exports = can.Map.extend({
        define: {
            showRoute: {
                get: function () {
                    var routeKey = this.attr('routeKey'), route = typeof can.route.attr(routeKey) === 'undefined' ? '' : can.route.attr(routeKey);
                    if (route == this.attr('routeTarget')) {
                        return true;
                    }
                    return false;
                }
            }
        }
    });
});
/*components/router/router*/
define('components/router/router', [
    'exports',
    'can',
    'can/view/stache/stache',
    './router.stache!',
    './viewmodel'
], function (exports, _can, _canViewStacheStache, _routerStache, _viewmodel) {
    'use strict';
    var _interopRequire = function (obj) {
        return obj && obj.__esModule ? obj['default'] : obj;
    };
    var can = _interopRequire(_can);
    var template = _interopRequire(_routerStache);
    var viewmodel = _interopRequire(_viewmodel);
    can.Component.extend({
        tag: 'ma-router',
        template: template,
        scope: viewmodel,
        events: {
            inserted: function () {
                var scope = this.scope, routeKey = scope.attr('routeKey'), routePath = scope.attr('routePath'), routeTarget = scope.attr('routeTarget'), defs = {};
                if (typeof routePath === 'undefined') {
                    routePath = routeTarget;
                    scope.attr('routePath', routePath);
                }
                defs[routeKey] = routeTarget;
                can.route(routePath, defs);
            }
        }
    });
});
/*components/header/header.stache!can@2.2.4#view/stache/system*/
define('components/header/header.stache!can@2.2.4#view/stache/system', ['can/view/stache/stache'], function (stache) {
    return stache([
        {
            'tokenType': 'start',
            'args': [
                'nav',
                false
            ]
        },
        {
            'tokenType': 'attrStart',
            'args': ['class']
        },
        {
            'tokenType': 'attrValue',
            'args': ['navbar navbar-default navbar-fixed-top']
        },
        {
            'tokenType': 'attrEnd',
            'args': ['class']
        },
        {
            'tokenType': 'end',
            'args': [
                'nav',
                false
            ]
        },
        {
            'tokenType': 'chars',
            'args': ['\n  ']
        },
        {
            'tokenType': 'start',
            'args': [
                'div',
                false
            ]
        },
        {
            'tokenType': 'attrStart',
            'args': ['class']
        },
        {
            'tokenType': 'attrValue',
            'args': ['container-fluid']
        },
        {
            'tokenType': 'attrEnd',
            'args': ['class']
        },
        {
            'tokenType': 'end',
            'args': [
                'div',
                false
            ]
        },
        {
            'tokenType': 'chars',
            'args': ['\n    ']
        },
        {
            'tokenType': 'start',
            'args': [
                'div',
                false
            ]
        },
        {
            'tokenType': 'attrStart',
            'args': ['class']
        },
        {
            'tokenType': 'attrValue',
            'args': ['navbar-header']
        },
        {
            'tokenType': 'attrEnd',
            'args': ['class']
        },
        {
            'tokenType': 'end',
            'args': [
                'div',
                false
            ]
        },
        {
            'tokenType': 'chars',
            'args': ['\n      ']
        },
        {
            'tokenType': 'start',
            'args': [
                'a',
                false
            ]
        },
        {
            'tokenType': 'attrStart',
            'args': ['class']
        },
        {
            'tokenType': 'attrValue',
            'args': ['navbar-brand']
        },
        {
            'tokenType': 'attrEnd',
            'args': ['class']
        },
        {
            'tokenType': 'attrStart',
            'args': ['href']
        },
        {
            'tokenType': 'special',
            'args': ['getPageUrl \'home\'']
        },
        {
            'tokenType': 'attrEnd',
            'args': ['href']
        },
        {
            'tokenType': 'end',
            'args': [
                'a',
                false
            ]
        },
        {
            'tokenType': 'chars',
            'args': ['\n        Minerva\'s Box\n      ']
        },
        {
            'tokenType': 'close',
            'args': ['a']
        },
        {
            'tokenType': 'chars',
            'args': ['\n    ']
        },
        {
            'tokenType': 'close',
            'args': ['div']
        },
        {
            'tokenType': 'chars',
            'args': ['\n    \n    ']
        },
        {
            'tokenType': 'comment',
            'args': [' Collect the nav links, forms, and other content for toggling ']
        },
        {
            'tokenType': 'chars',
            'args': ['\n    ']
        },
        {
            'tokenType': 'start',
            'args': [
                'div',
                false
            ]
        },
        {
            'tokenType': 'attrStart',
            'args': ['class']
        },
        {
            'tokenType': 'attrValue',
            'args': ['collapse navbar-collapse']
        },
        {
            'tokenType': 'attrEnd',
            'args': ['class']
        },
        {
            'tokenType': 'end',
            'args': [
                'div',
                false
            ]
        },
        {
            'tokenType': 'chars',
            'args': ['\n        ']
        },
        {
            'tokenType': 'start',
            'args': [
                'ul',
                false
            ]
        },
        {
            'tokenType': 'attrStart',
            'args': ['class']
        },
        {
            'tokenType': 'attrValue',
            'args': ['nav navbar-nav']
        },
        {
            'tokenType': 'attrEnd',
            'args': ['class']
        },
        {
            'tokenType': 'end',
            'args': [
                'ul',
                false
            ]
        },
        {
            'tokenType': 'chars',
            'args': ['\n            ']
        },
        {
            'tokenType': 'start',
            'args': [
                'li',
                false
            ]
        },
        {
            'tokenType': 'end',
            'args': [
                'li',
                false
            ]
        },
        {
            'tokenType': 'start',
            'args': [
                'a',
                false
            ]
        },
        {
            'tokenType': 'attrStart',
            'args': ['href']
        },
        {
            'tokenType': 'special',
            'args': ['getPageUrl \'cities\'']
        },
        {
            'tokenType': 'attrEnd',
            'args': ['href']
        },
        {
            'tokenType': 'end',
            'args': [
                'a',
                false
            ]
        },
        {
            'tokenType': 'chars',
            'args': ['Cities']
        },
        {
            'tokenType': 'close',
            'args': ['a']
        },
        {
            'tokenType': 'close',
            'args': ['li']
        },
        {
            'tokenType': 'chars',
            'args': ['\n            ']
        },
        {
            'tokenType': 'start',
            'args': [
                'li',
                false
            ]
        },
        {
            'tokenType': 'end',
            'args': [
                'li',
                false
            ]
        },
        {
            'tokenType': 'start',
            'args': [
                'a',
                false
            ]
        },
        {
            'tokenType': 'attrStart',
            'args': ['href']
        },
        {
            'tokenType': 'special',
            'args': ['getPageUrl \'near-me\'']
        },
        {
            'tokenType': 'attrEnd',
            'args': ['href']
        },
        {
            'tokenType': 'end',
            'args': [
                'a',
                false
            ]
        },
        {
            'tokenType': 'chars',
            'args': ['Near Me']
        },
        {
            'tokenType': 'close',
            'args': ['a']
        },
        {
            'tokenType': 'close',
            'args': ['li']
        },
        {
            'tokenType': 'chars',
            'args': ['\n        ']
        },
        {
            'tokenType': 'close',
            'args': ['ul']
        },
        {
            'tokenType': 'chars',
            'args': ['\n    ']
        },
        {
            'tokenType': 'close',
            'args': ['div']
        },
        {
            'tokenType': 'chars',
            'args': ['\n  ']
        },
        {
            'tokenType': 'close',
            'args': ['div']
        },
        {
            'tokenType': 'chars',
            'args': ['\n']
        },
        {
            'tokenType': 'close',
            'args': ['nav']
        },
        {
            'tokenType': 'chars',
            'args': ['\n']
        },
        {
            'tokenType': 'done',
            'args': []
        }
    ]);
});
/*components/header/viewmodel*/
define('components/header/viewmodel', [
    'exports',
    'module',
    'can',
    'can/map/define'
], function (exports, module, _can, _canMapDefine) {
    'use strict';
    var _interopRequire = function (obj) {
        return obj && obj.__esModule ? obj['default'] : obj;
    };
    var can = _interopRequire(_can);
    module.exports = can.Map.extend({
        define: {},
        getPageUrl: function (pageName) {
            return '#!' + pageName;
        }
    });
});
/*components/header/header*/
define('components/header/header', [
    'exports',
    'can',
    'can/view/stache/stache',
    './header.stache!',
    './viewmodel'
], function (exports, _can, _canViewStacheStache, _headerStache, _viewmodel) {
    'use strict';
    var _interopRequire = function (obj) {
        return obj && obj.__esModule ? obj['default'] : obj;
    };
    var can = _interopRequire(_can);
    var template = _interopRequire(_headerStache);
    var viewmodel = _interopRequire(_viewmodel);
    can.Component.extend({
        tag: 'ma-header',
        template: template,
        scope: viewmodel
    });
});
/*pages/home/home.stache!can@2.2.4#view/stache/system*/
define('pages/home/home.stache!can@2.2.4#view/stache/system', ['can/view/stache/stache'], function (stache) {
    return stache([
        {
            'tokenType': 'start',
            'args': [
                'div',
                false
            ]
        },
        {
            'tokenType': 'attrStart',
            'args': ['class']
        },
        {
            'tokenType': 'attrValue',
            'args': ['container']
        },
        {
            'tokenType': 'attrEnd',
            'args': ['class']
        },
        {
            'tokenType': 'end',
            'args': [
                'div',
                false
            ]
        },
        {
            'tokenType': 'chars',
            'args': ['\n    \n    \n    ']
        },
        {
            'tokenType': 'start',
            'args': [
                'ma-map',
                false
            ]
        },
        {
            'tokenType': 'end',
            'args': [
                'ma-map',
                false
            ]
        },
        {
            'tokenType': 'close',
            'args': ['ma-map']
        },
        {
            'tokenType': 'chars',
            'args': ['\n    ']
        },
        {
            'tokenType': 'start',
            'args': [
                'div',
                false
            ]
        },
        {
            'tokenType': 'attrStart',
            'args': ['class']
        },
        {
            'tokenType': 'attrValue',
            'args': ['row']
        },
        {
            'tokenType': 'attrEnd',
            'args': ['class']
        },
        {
            'tokenType': 'end',
            'args': [
                'div',
                false
            ]
        },
        {
            'tokenType': 'chars',
            'args': ['\n        ']
        },
        {
            'tokenType': 'start',
            'args': [
                'ma-artwork',
                false
            ]
        },
        {
            'tokenType': 'end',
            'args': [
                'ma-artwork',
                false
            ]
        },
        {
            'tokenType': 'close',
            'args': ['ma-artwork']
        },
        {
            'tokenType': 'chars',
            'args': ['\n        \n        ']
        },
        {
            'tokenType': 'start',
            'args': [
                'h3',
                false
            ]
        },
        {
            'tokenType': 'end',
            'args': [
                'h3',
                false
            ]
        },
        {
            'tokenType': 'chars',
            'args': ['About']
        },
        {
            'tokenType': 'close',
            'args': ['h3']
        },
        {
            'tokenType': 'chars',
            'args': ['\n        ']
        },
        {
            'tokenType': 'start',
            'args': [
                'p',
                false
            ]
        },
        {
            'tokenType': 'end',
            'args': [
                'p',
                false
            ]
        },
        {
            'tokenType': 'chars',
            'args': ['Minerva, a sponsor for the arts, presents to you... your artwork.']
        },
        {
            'tokenType': 'close',
            'args': ['p']
        },
        {
            'tokenType': 'chars',
            'args': ['\n    ']
        },
        {
            'tokenType': 'close',
            'args': ['div']
        },
        {
            'tokenType': 'chars',
            'args': ['\n    \n    ']
        },
        {
            'tokenType': 'start',
            'args': [
                'div',
                false
            ]
        },
        {
            'tokenType': 'attrStart',
            'args': ['class']
        },
        {
            'tokenType': 'attrValue',
            'args': ['row']
        },
        {
            'tokenType': 'attrEnd',
            'args': ['class']
        },
        {
            'tokenType': 'end',
            'args': [
                'div',
                false
            ]
        },
        {
            'tokenType': 'chars',
            'args': ['\n        ']
        },
        {
            'tokenType': 'start',
            'args': [
                'h3',
                false
            ]
        },
        {
            'tokenType': 'end',
            'args': [
                'h3',
                false
            ]
        },
        {
            'tokenType': 'chars',
            'args': ['Cities']
        },
        {
            'tokenType': 'close',
            'args': ['h3']
        },
        {
            'tokenType': 'chars',
            'args': ['\n        ']
        },
        {
            'tokenType': 'start',
            'args': [
                'ma-cities-list',
                false
            ]
        },
        {
            'tokenType': 'attrStart',
            'args': ['filter']
        },
        {
            'tokenType': 'attrEnd',
            'args': ['filter']
        },
        {
            'tokenType': 'attrStart',
            'args': ['list-style']
        },
        {
            'tokenType': 'attrValue',
            'args': ['simple']
        },
        {
            'tokenType': 'attrEnd',
            'args': ['list-style']
        },
        {
            'tokenType': 'end',
            'args': [
                'ma-cities-list',
                false
            ]
        },
        {
            'tokenType': 'close',
            'args': ['ma-cities-list']
        },
        {
            'tokenType': 'chars',
            'args': ['\n    ']
        },
        {
            'tokenType': 'close',
            'args': ['div']
        },
        {
            'tokenType': 'chars',
            'args': ['\n']
        },
        {
            'tokenType': 'close',
            'args': ['div']
        },
        {
            'tokenType': 'chars',
            'args': ['\n']
        },
        {
            'tokenType': 'done',
            'args': []
        }
    ]);
});
/*pages/home/viewmodel*/
define('pages/home/viewmodel', [
    'exports',
    'module',
    'can',
    'can/map/define'
], function (exports, module, _can, _canMapDefine) {
    'use strict';
    var _interopRequire = function (obj) {
        return obj && obj.__esModule ? obj['default'] : obj;
    };
    var can = _interopRequire(_can);
    module.exports = can.Map.extend({ define: {} });
});
/*pages/home/home*/
define('pages/home/home', [
    'exports',
    'can',
    'can/view/stache/stache',
    './home.stache!',
    './viewmodel'
], function (exports, _can, _canViewStacheStache, _homeStache, _viewmodel) {
    'use strict';
    var _interopRequire = function (obj) {
        return obj && obj.__esModule ? obj['default'] : obj;
    };
    var can = _interopRequire(_can);
    var template = _interopRequire(_homeStache);
    var viewmodel = _interopRequire(_viewmodel);
    can.Component.extend({
        tag: 'mp-home',
        template: template,
        scope: viewmodel
    });
});
/*pages/cities/cities.stache!can@2.2.4#view/stache/system*/
define('pages/cities/cities.stache!can@2.2.4#view/stache/system', ['can/view/stache/stache'], function (stache) {
    return stache([
        {
            'tokenType': 'start',
            'args': [
                'div',
                false
            ]
        },
        {
            'tokenType': 'attrStart',
            'args': ['class']
        },
        {
            'tokenType': 'attrValue',
            'args': ['cities']
        },
        {
            'tokenType': 'attrEnd',
            'args': ['class']
        },
        {
            'tokenType': 'end',
            'args': [
                'div',
                false
            ]
        },
        {
            'tokenType': 'chars',
            'args': ['\n    ']
        },
        {
            'tokenType': 'start',
            'args': [
                'h2',
                false
            ]
        },
        {
            'tokenType': 'end',
            'args': [
                'h2',
                false
            ]
        },
        {
            'tokenType': 'chars',
            'args': ['Cities']
        },
        {
            'tokenType': 'close',
            'args': ['h2']
        },
        {
            'tokenType': 'special',
            'args': ['#cities']
        },
        {
            'tokenType': 'chars',
            'args': ['\n    ']
        },
        {
            'tokenType': 'start',
            'args': [
                'a',
                false
            ]
        },
        {
            'tokenType': 'attrStart',
            'args': ['class']
        },
        {
            'tokenType': 'attrValue',
            'args': ['btn city']
        },
        {
            'tokenType': 'attrEnd',
            'args': ['class']
        },
        {
            'tokenType': 'attrStart',
            'args': ['href']
        },
        {
            'tokenType': 'attrValue',
            'args': ['#!cities/']
        },
        {
            'tokenType': 'special',
            'args': ['cityCode']
        },
        {
            'tokenType': 'attrEnd',
            'args': ['href']
        },
        {
            'tokenType': 'end',
            'args': [
                'a',
                false
            ]
        },
        {
            'tokenType': 'chars',
            'args': ['\n        ']
        },
        {
            'tokenType': 'start',
            'args': [
                'h3',
                false
            ]
        },
        {
            'tokenType': 'attrStart',
            'args': ['class']
        },
        {
            'tokenType': 'attrValue',
            'args': ['city-name']
        },
        {
            'tokenType': 'attrEnd',
            'args': ['class']
        },
        {
            'tokenType': 'end',
            'args': [
                'h3',
                false
            ]
        },
        {
            'tokenType': 'special',
            'args': ['cityName']
        },
        {
            'tokenType': 'close',
            'args': ['h3']
        },
        {
            'tokenType': 'chars',
            'args': ['\n        ']
        },
        {
            'tokenType': 'start',
            'args': [
                'img',
                true
            ]
        },
        {
            'tokenType': 'attrStart',
            'args': ['src']
        },
        {
            'tokenType': 'special',
            'args': ['logoSrc']
        },
        {
            'tokenType': 'attrEnd',
            'args': ['src']
        },
        {
            'tokenType': 'attrStart',
            'args': ['class']
        },
        {
            'tokenType': 'attrValue',
            'args': ['city-logo']
        },
        {
            'tokenType': 'attrEnd',
            'args': ['class']
        },
        {
            'tokenType': 'end',
            'args': [
                'img',
                true
            ]
        },
        {
            'tokenType': 'chars',
            'args': ['\n        ']
        },
        {
            'tokenType': 'start',
            'args': [
                'p',
                false
            ]
        },
        {
            'tokenType': 'attrStart',
            'args': ['class']
        },
        {
            'tokenType': 'attrValue',
            'args': ['city-short-desc']
        },
        {
            'tokenType': 'attrEnd',
            'args': ['class']
        },
        {
            'tokenType': 'end',
            'args': [
                'p',
                false
            ]
        },
        {
            'tokenType': 'special',
            'args': ['shortDescription']
        },
        {
            'tokenType': 'close',
            'args': ['p']
        },
        {
            'tokenType': 'chars',
            'args': ['\n    ']
        },
        {
            'tokenType': 'close',
            'args': ['a']
        },
        {
            'tokenType': 'special',
            'args': ['/cities']
        },
        {
            'tokenType': 'chars',
            'args': ['\n    \n']
        },
        {
            'tokenType': 'close',
            'args': ['div']
        },
        {
            'tokenType': 'special',
            'args': ['#showSidebar']
        },
        {
            'tokenType': 'chars',
            'args': ['\n']
        },
        {
            'tokenType': 'start',
            'args': [
                'ma-sidebar',
                false
            ]
        },
        {
            'tokenType': 'attrStart',
            'args': ['place']
        },
        {
            'tokenType': 'attrValue',
            'args': ['right']
        },
        {
            'tokenType': 'attrEnd',
            'args': ['place']
        },
        {
            'tokenType': 'end',
            'args': [
                'ma-sidebar',
                false
            ]
        },
        {
            'tokenType': 'chars',
            'args': ['\n    ']
        },
        {
            'tokenType': 'start',
            'args': [
                'h3',
                false
            ]
        },
        {
            'tokenType': 'end',
            'args': [
                'h3',
                false
            ]
        },
        {
            'tokenType': 'chars',
            'args': ['All cities...']
        },
        {
            'tokenType': 'close',
            'args': ['h3']
        },
        {
            'tokenType': 'chars',
            'args': ['\n']
        },
        {
            'tokenType': 'close',
            'args': ['ma-sidebar']
        },
        {
            'tokenType': 'special',
            'args': ['/showSidebar']
        },
        {
            'tokenType': 'chars',
            'args': ['\n']
        },
        {
            'tokenType': 'done',
            'args': []
        }
    ]);
});
/*models/city/city*/
define('models/city/city', [
    'exports',
    'module',
    'can',
    'can/map/define'
], function (exports, module, _can, _canMapDefine) {
    'use strict';
    var _interopRequire = function (obj) {
        return obj && obj.__esModule ? obj['default'] : obj;
    };
    var can = _interopRequire(_can);
    module.exports = can.Model.extend({
        findAll: 'GET /city.json',
        findOne: 'GET /city/{id}.json'
    }, {});
});
/*pages/cities/cities.viewmodel*/
define('pages/cities/cities.viewmodel', [
    'exports',
    'module',
    'can',
    'can/map/define',
    'models/city/city'
], function (exports, module, _can, _canMapDefine, _modelsCityCity) {
    'use strict';
    var _interopRequire = function (obj) {
        return obj && obj.__esModule ? obj['default'] : obj;
    };
    var can = _interopRequire(_can);
    var City = _interopRequire(_modelsCityCity);
    module.exports = can.Map.extend({
        define: { cities: { value: [] } },
        City: City
    });
});
/*pages/cities/cities*/
define('pages/cities/cities', [
    'exports',
    'can',
    'can/view/stache/stache',
    './cities.stache!',
    './cities.viewmodel',
    './cities.less!'
], function (exports, _can, _canViewStacheStache, _citiesStache, _citiesViewmodel, _citiesLess) {
    'use strict';
    var _interopRequire = function (obj) {
        return obj && obj.__esModule ? obj['default'] : obj;
    };
    var can = _interopRequire(_can);
    var template = _interopRequire(_citiesStache);
    var viewmodel = _interopRequire(_citiesViewmodel);
    can.Component.extend({
        tag: 'mp-cities',
        template: template,
        scope: viewmodel,
        events: {
            inserted: function () {
                var vm = this.viewModel, def = vm.City.findAll({});
                def.then(function (resp) {
                    vm.attr('cities', resp);
                });
            }
        }
    });
});
/*pages/near-me/near-me.stache!can@2.2.4#view/stache/system*/
define('pages/near-me/near-me.stache!can@2.2.4#view/stache/system', ['can/view/stache/stache'], function (stache) {
    return stache([
        {
            'tokenType': 'start',
            'args': [
                'div',
                false
            ]
        },
        {
            'tokenType': 'attrStart',
            'args': ['class']
        },
        {
            'tokenType': 'attrValue',
            'args': ['container']
        },
        {
            'tokenType': 'attrEnd',
            'args': ['class']
        },
        {
            'tokenType': 'end',
            'args': [
                'div',
                false
            ]
        },
        {
            'tokenType': 'chars',
            'args': ['\n    ']
        },
        {
            'tokenType': 'start',
            'args': [
                'h2',
                false
            ]
        },
        {
            'tokenType': 'end',
            'args': [
                'h2',
                false
            ]
        },
        {
            'tokenType': 'chars',
            'args': ['Near Me']
        },
        {
            'tokenType': 'close',
            'args': ['h2']
        },
        {
            'tokenType': 'chars',
            'args': ['\n    \n    ']
        },
        {
            'tokenType': 'start',
            'args': [
                'p',
                false
            ]
        },
        {
            'tokenType': 'end',
            'args': [
                'p',
                false
            ]
        },
        {
            'tokenType': 'chars',
            'args': ['Finding artwork near you...']
        },
        {
            'tokenType': 'close',
            'args': ['p']
        },
        {
            'tokenType': 'chars',
            'args': ['\n    \n']
        },
        {
            'tokenType': 'close',
            'args': ['div']
        },
        {
            'tokenType': 'chars',
            'args': ['\n\n']
        },
        {
            'tokenType': 'start',
            'args': [
                'ma-sidebar',
                false
            ]
        },
        {
            'tokenType': 'attrStart',
            'args': ['place']
        },
        {
            'tokenType': 'attrValue',
            'args': ['right']
        },
        {
            'tokenType': 'attrEnd',
            'args': ['place']
        },
        {
            'tokenType': 'end',
            'args': [
                'ma-sidebar',
                false
            ]
        },
        {
            'tokenType': 'chars',
            'args': ['\n    ']
        },
        {
            'tokenType': 'start',
            'args': [
                'h3',
                false
            ]
        },
        {
            'tokenType': 'end',
            'args': [
                'h3',
                false
            ]
        },
        {
            'tokenType': 'chars',
            'args': ['Cities near you...']
        },
        {
            'tokenType': 'close',
            'args': ['h3']
        },
        {
            'tokenType': 'chars',
            'args': ['\n']
        },
        {
            'tokenType': 'close',
            'args': ['ma-sidebar']
        },
        {
            'tokenType': 'chars',
            'args': ['\n']
        },
        {
            'tokenType': 'done',
            'args': []
        }
    ]);
});
/*can@2.2.4#util/domless/domless*/
System.set('can@2.2.4#util/domless/domless', System.newModule({}));
/*can@2.2.4#util/array/makeArray*/
System.set('can@2.2.4#util/array/makeArray', System.newModule({}));
/*pages/near-me/near-me.viewmodel*/
define('pages/near-me/near-me.viewmodel', [
    'exports',
    'module',
    'can',
    'can/map/define'
], function (exports, module, _can, _canMapDefine) {
    'use strict';
    var _interopRequire = function (obj) {
        return obj && obj.__esModule ? obj['default'] : obj;
    };
    var can = _interopRequire(_can);
    module.exports = can.Map.extend({ define: {} });
});
/*pages/near-me/near-me*/
define('pages/near-me/near-me', [
    'exports',
    'can',
    'can/view/stache/stache',
    './near-me.stache!',
    './near-me.viewmodel'
], function (exports, _can, _canViewStacheStache, _nearMeStache, _nearMeViewmodel) {
    'use strict';
    var _interopRequire = function (obj) {
        return obj && obj.__esModule ? obj['default'] : obj;
    };
    var can = _interopRequire(_can);
    var template = _interopRequire(_nearMeStache);
    var viewmodel = _interopRequire(_nearMeViewmodel);
    can.Component.extend({
        tag: 'mp-near-me',
        template: template,
        scope: viewmodel
    });
});
/*src/index*/
define('src/index', [
    'exports',
    'jquery',
    'can',
    'can/view/stache/stache',
    './index.stache!',
    './index.less!',
    'models/fixtures',
    'models/app-model/app-model',
    'components/router/router',
    'components/header/header',
    'pages/home/home',
    'pages/cities/cities',
    'pages/near-me/near-me'
], function (exports, _jquery, _can, _canViewStacheStache, _indexStache, _indexLess, _modelsFixtures, _modelsAppModelAppModel, _componentsRouterRouter, _componentsHeaderHeader, _pagesHomeHome, _pagesCitiesCities, _pagesNearMeNearMe) {
    'use strict';
    var _interopRequire = function (obj) {
        return obj && obj.__esModule ? obj['default'] : obj;
    };
    var $ = _interopRequire(_jquery);
    var can = _interopRequire(_can);
    var template = _interopRequire(_indexStache);
    var AppModel = _interopRequire(_modelsAppModelAppModel);
    var appModel = new AppModel({});
    can.route.bind('route', function (ev, newRoute, oldRoute) {
        appModel.attr('currentRoute', newRoute);
    });
    can.Component.extend({
        tag: 'minerva-app',
        template: template
    });
    $('#app').html(can.stache('<minerva-app></minerva-app>')({ state: appModel }));
    can.route.ready();
});
/*[import-main-module]*/
System.import('package.json!npm').then(function() {
System.import('src/index'); 
});
//# sourceMappingURL=index.js.map