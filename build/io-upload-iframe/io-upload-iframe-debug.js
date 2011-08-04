/*
Copyright (c) 2010, Yahoo! Inc. All rights reserved.
Code licensed under the BSD License:
http://developer.yahoo.com/yui/license.html
version: 3.4.0
build: nightly
*/
YUI.add('io-upload-iframe', function(Y) {

   /**
    * Extends the IO base class to enable file uploads, with HTML forms,
    * using an iframe as the transport medium.
    * @module io
    * @submodule io-upload-iframe
    */

    var w = Y.config.win,
        d = Y.config.doc,
        _std = (d.documentMode && d.documentMode >= 8),
		_d = decodeURIComponent;

   /**
	* @description Creates the iframe transported used in file upload
	* transactions, and binds the response event handler.
	*
	* @method _create
	* @private
	* @static
	* @param {object} o Transaction object generated by _create().
	* @param {object} c Configuration object passed to YUI.io().
	* @return {void}
	*/
	function _iframe(o, c, io) {
		var i = Y.Node.create('<iframe id="io_iframe' + o.id + '" name="io_iframe' + o.id + '" />');
			i._node.style.position = 'absolute';
			i._node.style.top = '-1000px';
			i._node.style.left = '-1000px';
			Y.one('body').appendChild(i);
		// Bind the onload handler to the iframe to detect the file upload response.
		Y.on("load", function() { io._uploadComplete(o, c); }, '#io_iframe' + o.id);
	}

    Y.mix(Y.IO.prototype, {
	   /**
		* @description Parses the POST data object and creates hidden form elements
		* for each key-value, and appends them to the HTML form object.
		* @method appendData
		* @private
		* @static
		* @param {object} f HTML form object.
		* @param {string} s The key-value POST data.
		* @return {array} e Array of created fields.
		*/
		_addData: function(f, s) {
			var o = [],
				m = s.split('='),
				i, l;

			for (i = 0, l = m.length - 1; i < l; i++) {
				o[i] = d.createElement('input');
				o[i].type = 'hidden';
				o[i].name = _d(m[i].substring(m[i].lastIndexOf('&') + 1));
				o[i].value = (i + 1 === l) ? _d(m[i + 1]) : _d(m[i + 1].substring(0, (m[i + 1].lastIndexOf('&'))));
				f.appendChild(o[i]);
				Y.log('key: ' +  o[i].name + ' and value: ' + o[i].value + ' added as form data.', 'info', 'io');
			}

			return o;
		},

	   /**
		* @description Removes the custom fields created to pass additional POST
		* data, along with the HTML form fields.
		* @method f
		* @private
		* @static
		* @param {object} f HTML form object.
		* @param {object} o HTML form fields created from configuration.data.
		* @return {void}
		*/
		_removeData: function(f, o) {
			var i, l;

			for (i = 0, l = o.length; i < l; i++) {
				f.removeChild(o[i]);
			}
		},

	   /**
		* @description Sets the appropriate attributes and values to the HTML
		* form, in preparation of a file upload transaction.
		* @method _setAttrs
		* @private
		* @static
		* @param {object} f HTML form object.
		* @param {object} id The Transaction ID.
		* @param {object} uri Qualified path to transaction resource.
		* @return {void}
		*/
		_setAttrs: function(f, id, uri) {
			f.setAttribute('action', uri);
			f.setAttribute('method', 'POST');
			f.setAttribute('target', 'io_iframe' + id );
			f.setAttribute(Y.UA.ie && !_std ? 'encoding' : 'enctype', 'multipart/form-data');
		},

	   /**
		* @description Reset the HTML form attributes to their original values.
		* @method _resetAttrs
		* @private
		* @static
		* @param {object} f HTML form object.
		* @param {object} a Object of original attributes.
		* @return {void}
		*/
		_resetAttrs: function(f, a) {
			Y.Object.each(a, function(v, p) {
				if (v) {
					f.setAttribute(p, v);
				}
				else {
					f.removeAttribute(p);
				}
			});
		},

	   /**
		* @description Starts timeout count if the configuration object
		* has a defined timeout property.
		*
		* @method _startTimeout
		* @private
		* @static
		* @param {object} o Transaction object generated by _create().
		* @param {object} c Configuration object passed to YUI.io().
		* @return {void}
		*/
		_startTimeout: function(o, c) {
			var io = this;

			io._timeout[o.id] = w.setTimeout(
				function() {
					o.status = 0;
					o.statusText = 'timeout';
					io.complete(o, c);
					io.end(o, c);
					Y.log('Transaction ' + o.id + ' timeout.', 'info', 'io');
				}, c.timeout);
		},

	   /**
		* @description Clears the timeout interval started by _startTimeout().
		* @method _clearTimeout
		* @private
		* @static
		* @param {number} id - Transaction ID.
		* @return {void}
		*/
		_clearTimeout: function(id) {
			var io = this;

			w.clearTimeout(io._timeout[id]);
			delete io._timeout[id];
		},

	   /**
		* @description
		* @method _destroy
		* @private
		* @static
		* @param {o} o The transaction object
		* @param {object} uri Qualified path to transaction resource.
		* @param {object} c Configuration object for the transaction.
		* @return {void}
		*/
		_destroy: function(id) {
			Y.Event.purgeElement('#io_iframe' + id, false);
			Y.one('body').removeChild(Y.one('#io_iframe' + id));
			Y.log('The iframe transport for transaction ' + id + ' has been destroyed.', 'info', 'io');
		},

	   /**
		* @description Bound to the iframe's Load event and processes
		* the response data.
		* @method _uploadComplete
		* @private
		* @static
		* @param {o} o The transaction object
		* @param {object} c Configuration object for the transaction.
		* @return {void}
		*/
		_uploadComplete: function(o, c) {
			var io = this,
				d = Y.one('#io_iframe' + o.id).get('contentWindow.document'),
				b = d.one('body'),
				p;

			if (c.timeout) {
				io._clearTimeout(o.id);
			}

			if (b) {
				// When a response Content-Type of "text/plain" is used, Firefox and Safari
				// will wrap the response string with <pre></pre>.
				p = b.one('pre:first-child');
				o.c.responseText = p ? p.get('text') : b.get('text');
				Y.log('The responseText value for transaction ' + o.id + ' is: ' + o.c.responseText + '.', 'info', 'io');
			}
			else {
				o.c.responseXML = d._node;
				Y.log('The response for transaction ' + o.id + ' is an XML document.', 'info', 'io');
			}

			io.complete(o, c);
			io.end(o, c);
			// The transaction is complete, so call _destroy to remove
			// the event listener bound to the iframe transport, and then
			// destroy the iframe.
			w.setTimeout( function() { io._destroy(o.id); }, 0);
		},

	   /**
		* @description Uploads HTML form data, inclusive of files/attachments,
		* using the iframe created in _create to facilitate the transaction.
		* @method _upload
		* @private
		* @static
		* @param {o} o The transaction object
		* @param {object} uri Qualified path to transaction resource.
		* @param {object} c Configuration object for the transaction.
		* @return {void}
		*/
		_upload: function(o, uri, c) {
			var io = this,
				f = (typeof c.form.id === 'string') ? d.getElementById(c.form.id) : c.form.id,
				// Track original HTML form attribute values.
				attr = {
					action: f.getAttribute('action'),
					target: f.getAttribute('target')
				},
				fields;

			// Initialize the HTML form properties in case they are
			// not defined in the HTML form.
			io._setAttrs(f, o.id, uri);
			if (c.data) {
				fields = io._addData(f, c.data);
			}

			// Start polling if a callback is present and the timeout
			// property has been defined.
			if (c.timeout) {
				io._startTimeout(o, c);
				Y.log('Transaction timeout started for transaction ' + o.id + '.', 'info', 'io');
			}

			// Start file upload.
			f.submit();
			io.start(o, c);
			if (c.data) {
				io._removeData(f, fields);
			}
			// Restore HTML form attributes to their original values.
			io._resetAttrs(f, attr);

			return {
				id: o.id,
				abort: function() {
					o.status = 0;
					o.statusText = 'abort';
					if (Y.one('#io_iframe' + o.id)) {
						io._destroy(o.id);
						io.complete(o, c);
						io.end(o, c);
						Y.log('Transaction ' + o.id + ' aborted.', 'info', 'io');
					}
					else {
						Y.log('Attempted to abort transaction ' + o.id + ' but transaction has completed.', 'warn', 'io');
						return false;
					}
				},
				isInProgress: function() {
					return Y.one('#io_iframe' + o.id) ? true : false;
				},
				io: io
			};
		},

        upload: function(o, uri, c) {
            _iframe(o, c, this);
            return this._upload(o, uri, c);
        }
    });



}, '3.4.0' ,{requires:['io-base','node-base']});
