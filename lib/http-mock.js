'use strict';

function mockTemplate() {
	var expectations = '<place_content_here>';

	var newModule = angular.module('httpMock', []);

	newModule.config(['$provide', function($provide){
		$provide.decorator('$http', ['$delegate', '$q', function($http, $q) {
			function endsWith(url, path){
				return url.indexOf(path, url.length - path.length) !== -1;
			}

			function paramsMatch(expectationParams, configParams){
				var match = true;
				for(var prop in expectationParams){
					if(expectationParams.hasOwnProperty(prop) && configParams[prop] !== expectationParams[prop]){
						match = false;
						break;
					}
				}

				return match;
			}

			function match(config, expectationRequest){
				return	expectationRequest.method === config.method &&
						endsWith(config.url, expectationRequest.path) &&
						(!expectationRequest.params || paramsMatch(expectationRequest.params, config.params));
			}

			function matchExpectation(config){
				var expectation;

				for(var i = 0; i < expectations.length; i++){
					if(match(config, expectations[i].request)){
						expectation = expectations[i];
					}
				}

				return expectation;
			}
			
			function wrapWithSuccessError(promise) {
				var myPromise = promise;
				myPromise.success = function(callback) {
					return wrapWithSuccessError(
						myPromise.then(function(response) {
							return callback(response.data, response.status, response.headers, response.config);
						})
					);
				};
				myPromise.error = function(callback) {
					return wrapWithSuccessError(
						myPromise.then(null, function(error) {
							return callback(error.data, error.status, error.headers, error.config);
						})
					);
				};

				return myPromise;
			}

			function httpMock(config){

				var prom;
				var expectation = matchExpectation(config);

				if(expectation){
					console.log('Request proxied: ' + config.url, config, expectation);
					var deferred = $q.defer();

					newModule.requests.push(config);

					setTimeout(function(){
						expectation.response = expectation.response || {};
						
						var response = {
							data: expectation.response.data || {},
							config: {},
							headers: function(){}
						};

						if(typeof expectation.response.status !== 'undefined' && expectation.response.status !== 200){
							response.status = expectation.response.status;
							deferred.reject(response);
						}else{
							response.status = 200;
							deferred.resolve(response);
						}

					}, 0);

					prom = wrapWithSuccessError(deferred.promise);
				}else{
					console.log('Request passed through: ' + config.url, config);
					prom = $http(config);
				}

				return prom;
			}

			httpMock.get = function(url, config){
				config = config || {};
				config.url = url;
				config.method = 'GET';

				return httpMock(config);
			};

			httpMock.delete = function(url, config){
				config = config || {};
				config.url = url;
				config.method = 'DELETE';

				return httpMock(config);
			};

			httpMock.head = function(url, config){
				config = config || {};
				config.url = url;
				config.method = 'HEAD';

				return httpMock(config);
			};

			httpMock.jsonp = function(url, config){
				config = config || {};
				config.url = url;
				config.method = 'JSONP';

				return httpMock(config);
			};

			httpMock.post = function(url, data, config){
				config = config || {};
				config.url = url;
				config.data = data;
				config.method = 'POST';

				return httpMock(config);
			};

			httpMock.put = function(url, data, config){
				config = config || {};
				config.url = url;
				config.data = data;
				config.method = 'PUT';

				return httpMock(config);
			};

			httpMock.patch = function(url, data, config){
				config = config || {};
				config.url = url;
				config.data = data;
				config.method = 'PATCH';

				return httpMock(config);
			};

			newModule.requests = [];

			return httpMock;
		}]);
	}]);

	return newModule;
}

function getExpectationsString(expectations){
	var printExpectations = [];

	for(var i=0; i< expectations.length; i++){
		printExpectations.push(JSON.stringify(expectations[i]));
	}

	return printExpectations.toString();
}

module.exports = function(expectations){
	var templateString = mockTemplate.toString();
	var template = templateString.substring(templateString.indexOf('{') + 1, templateString.lastIndexOf('}'));
	var newFunc = template.replace(/'<place_content_here>'/, '[' + getExpectationsString(expectations) + ']');
	/*jslint evil: true */
	return new Function(newFunc);
};
