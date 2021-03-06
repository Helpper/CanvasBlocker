/* jslint moz: true */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
(function(){
	"use strict";
	
	const {changedFunctions, setRandomSupply} = require("./modifiedAPI");
	const randomSupplies = require("./randomSupplies");
	setRandomSupply(randomSupplies.nonPersistent);
	var apiNames = Object.keys(changedFunctions);
	var undef;
	var exportFunction;
	
	function setRandomSupplyByType(type){
		switch (type){
			case "persistent":
				setRandomSupply(randomSupplies.persistent);
				break;
			default:
				setRandomSupply(randomSupplies.nonPersistent);
		}
	}
	exports.setRandomSupplyByType = setRandomSupplyByType;
	exports.intercept = function intercept({subject: window}, {check, ask, notify, prefs}){
		apiNames.forEach(function(name){
			var changedFunction = changedFunctions[name];
			var original = window.wrappedJSObject[changedFunction.object].prototype[name];
			
			Object.defineProperty(
				window.wrappedJSObject[changedFunction.object].prototype,
				name,
				{
					enumerable: true,
					configureable: false,
					get: function(){
						if (!window.location.href){
							return undef;
						}
						var error = new Error();
						var status = check({url: window.location.href, errorStack: error.stack});
						var funcStatus = changedFunction.getStatus(this, status);
						
						if (funcStatus.active){
							if (funcStatus.mode === "ask"){
								funcStatus.mode = ask({window: window, type: changedFunction.type, canvas: this, errorStack: error.stack});
							}
							switch (funcStatus.mode){
								case "allow":
									return original;
								case "fake":
									setRandomSupplyByType(prefs("rng"));
									var fake = changedFunction.fakeGenerator(prefs, function(messageId){
										notify({url: window.location.href, errorStack: error.stack, messageId});
									});
									switch (fake){
										case true:
											return original;
										case false:
											return undef;
										default:
											return exportFunction(fake, window.wrappedJSObject);
									}
								//case "block":
								default:
									return undef;
							}
						}
						else {
							return original;
						}
					}
				}
			);
		});
	};
	exports.setExportFunction = function(eFunc){
		exportFunction = eFunc;
	};
}());