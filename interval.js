angular.module('interval').provider('$interval', function $intervalProvider() {
	'use strict';

	var jobs = {},
		providerSelf = this;

	/**
	 * automatically call synchronize method once a job is added
	 * @type {Boolean} default = false
	 */
	this.autoSync = false;

	this.$get = ['$exceptionHandler', '$rootScope', function $interval($exceptionHandler, $rootScope) {
		function Job (fn, delay, maxExecutions, invokeApply) {
			var id,
				skipApply = (angular.isDefined(invokeApply) && !invokeApply),
				self = this,
				callbacks = [],
				errCallbacks = [],
				executions = 0;

			/**
			 * start job
			 * @chainable
			 * @return {self}
			 */
			self.start = function() {
				if (jobs[id]) return self;

				id = setInterval(function() {
					var i = 0,
						j = 0;
					try {
						var returnValue = fn();
						for (i; i < callbacks.length; i++) {
							callbacks[i].call(null, returnValue);
						}
					} catch (e) {
						for (j; j < callbacks.length; j++) {
							try {
								errCallbacks[j].call(null, e);
							} catch (e2) {
								$exceptionHandler(e2);
							}
						}
						$exceptionHandler(e);
					}
					executions++;

					if (maxExecutions > 0 && maxExecutions === executions) {
						self.cancel();
					}

					if (!skipApply) $rootScope.$apply();
				}, delay);
				jobs[id] = self;
				return self;
			};
			/**
			 * pause job for X milliseconds
			 * @param  {Number} pauseTime pause for x milliseconds
			 * @chainable
			 * @return {self}    
			 */
			self.pause = function(pauseTime) {
				self.cancel();
				setTimeout(self.start, pauseTime);
				return self;
			};
			/**
			 * cancel/stop job
			 * @chainable
			 * @return {self}
			 */
			self.cancel = function() {
				clearInterval(id);
				delete jobs[id];
				return self;
			};
			/**
			 * add a callback to execute on each tick
			 * @param  {Function} success Execute on successfull function call
			 * @param  {Function} error   Execute on error
			 * @chainable
			 * @return {self}
			 */
			self.then = function(success, error) {
				if (angular.isFunction(success)) {
					callbacks.push(success);
				}
				if (angular.isFunction(error)) {
					errCallbacks.push(error);
				}
			};
			/**
			 * synchronize all jobs
			 *
			 * causes all jobs to stop and immediately start at the same time, regardless
			 * of when they've been added
			 *
			 * @chainable
			 * @return {self}
			 */
			self.synchronize = function() {
				var temp = [];
				angular.forEach(jobs, function(j) {
					temp.push(j);
					j.cancel();
				});
				angular.forEach(temp, function(t) {
					t.start();
				});
				return self;
			};

			self.start();
		}
		
		/**
		 * adds a new job to execute on given interval
		 * @param {Function} fn            Function to execute
		 * @param {Number}   [delay=0]         Re-Execute after X milliseconds 
		 * @param {Number}   [maxExecutions=0] Maximum number of executions, 0 equals unlimited executions
		 * @param {Boolean}   [invokeApply=true]   Trigger scope.$apply
		 * @return {Job} Job
		 */
		function addJob (fn, delay, maxExecutions,invokeApply) {
			var job = new Job(fn || function() {}, delay || 0, 
				maxExecutions !== 0 && angular.isNumber(maxExecutions) && maxExecutions > 0 ? maxExecutions : 0,
				invokeApply);
			return providerSelf.autoSync ? job.synchronize() : job;
		}

		return addJob;
	}];
});