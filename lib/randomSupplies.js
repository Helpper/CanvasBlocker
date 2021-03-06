/* jslint moz: true, bitwise: true */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
(function(){
	"use strict";
	
	const persistentRnd = Object.create(null);
	exports.persistent = {
		getRng: function(length, window){
			var domain = window.document.location.host;
			if (!persistentRnd[domain]){
				// create the (sub-)domains random numbers if not existing
				persistentRnd[domain] = new Uint8Array(128);
				window.crypto.getRandomValues(persistentRnd[domain]);
			}
			var bitSet = persistentRnd[domain];
			
			return function(value, i){
				// use the last 7 bits from the value for the index of the
				// random number
				var index = value & 0x7F;
				
				// use the last 3 bits from the position and the first bit from
				// from the value to get bit to use from the random number
				var bitIndex = ((i & 0x03) << 1) | (value >>> 7);
				
				// extract the bit
				var bit = (bitSet[index] >>> bitIndex) & 0x01;
				
				// XOR the bit the the value to alter the last bit of it... or not
				return value ^ bit;
			};
		}
	};
	
	exports.nonPersistent = {
		getRng: function(length, window){
			// Initialize the random number batch creation
			var randomI = 65536;
			var randomNumbers = new Uint8Array(Math.min(65536, length));
			
			return function(value, i){
				if (randomI >= randomNumbers.length){
					// refill the random number bucket if empty
					randomI = 0;
					if (length - i < 65536){
						randomNumbers = new Uint8Array(length - i);
					}
					window.crypto.getRandomValues(randomNumbers);
				}
				var rnd = randomNumbers[randomI];
				randomI += 1;
				
				// do not alter the most significant bit that is set and
				// the bit after it, to not disturb the image too much.
				if (value >= 0x80){
					value = value ^ (rnd & 0x1F);
				}
				else if (value >= 0x40){
					value = value ^ (rnd & 0x0F);
				}
				else if (value >= 0x20){
					value = value ^ (rnd & 0x07);
				}
				else if (value >= 0x10){
					value = value ^ (rnd & 0x03);
				}
				else if (value >= 0x08){
					value = value ^ (rnd & 0x01);
				}
				// else if (value >= 0x04){
					// value = value ^ (rnd * 0x00);
				// }
				return value;
			};
		}
	};
}());	