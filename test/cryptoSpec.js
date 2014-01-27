/* Load in required Node modules */
var fs = require('fs');

/* Load In Testing Libraries */
var assert = require("assert");
var sinon = require("sinon");

/* Load in Polyfills */
require("./helpers/browser.js");
require("./helpers/chrome.js");
$ = jQuery = require('./helpers/jquery.js'); //For some reason jquery.min.js breaks if we load it like the other vendor files

/* Load In Vendor Files */
eval(fs.readFileSync(__dirname+'/../static/js/vendor/aes.js')+''); global.CryptoJS = CryptoJS;

/* Load In Dependent Modules or Mocks */
Storage = require("../static/js/shared/storage.js");
Utils = require('../static/js/shared/utils.js');

/* Load In Module to Test */
var Crypto = require("../static/js/background/crypto.js");

describe("Crypto", function() {
    var crypto, password, key, username,
        encryptedPassword, siteKey, pseudoUniqueID, cyURL, getOptionsSpy;

    var spies = { };

    password = "password";
    username = "username";
    key = Math.random().toString(36).substring(2);
    siteKey = "test"
    pseudoUniqueID = "uniqueID"
    cyURL = "http://test.com"

	beforeEach(function() {
        crypto = new Crypto();
        encryptedPassword = "encryptedPassword";

        spies.getOptions = sinon.stub(crypto.storage, "getOptions", function(cb) {
            var _ret = { cy_url: cyURL };
            if (cb) cb(_ret);
            return $.Deferred().resolve(_ret);        	
        });

        spies.pseudoUniqueID = sinon.stub(Utils, "pseudoUniqueID").returns(pseudoUniqueID);
	});

	afterEach(function() {
		spies.getOptions.restore();
		spies.pseudoUniqueID.restore();
	});

	describe("encryptPassword", function() {
        it("should change the value of the encrypted value", function() {
            assert.notEqual(crypto.encryptPassword(password, key), password);
        });
    });

    describe("decryptPassword", function() {
        it("should decrypt an encrypted password", function() {
            var encryptedPassword = crypto.encryptPassword(password, key);
            assert.equal(crypto.decryptPassword(encryptedPassword, key), password);
        });
    });

    describe("encrypt", function() {

        beforeEach(function() {
            spies.jqueryGet = sinon.stub($, "get").returns($.Deferred().resolve({key: { key: key } }))
            spies.encryptPassword = sinon.stub(crypto, "encryptPassword").returns(encryptedPassword);
            spies.setCredentials = sinon.stub(crypto.storage, "setCredentialsForDomain", function(key, data, cb) {
            	cb();
            });

            spies.getOptions.reset();
        });

        afterEach(function() {
        	spies.jqueryGet.restore();
        	spies.encryptPassword.restore();
        	spies.setCredentials.restore();
        });

        it("should encrypt credentials", function(done) {
            crypto.encrypt({
                key: siteKey,
                username: username,
                password: password
            }, function() {
            	assert(spies.jqueryGet.calledWith(cyURL + crypto.keyPath + pseudoUniqueID), "$.get: called with incorrect Cy URL");
            	assert(spies.getOptions.called, "getOptions: never called");
            	assert(spies.encryptPassword.calledWith(password, key), "encryptPassword: called with incorrect arguments");
            	assert(spies.setCredentials.called, "setCredentials: never called");

            	var setCredsArguments = spies.setCredentials.getCall(0).args;
            	assert.equal(setCredsArguments[0], siteKey, "setCredentials: incorrect site key");
            	assert.equal(setCredsArguments[1].username, username, "setCredentials: incorrect username");
            	assert.equal(setCredsArguments[1].password, encryptedPassword, "setCredentials: incorrect encrypted password");
            	assert.equal(setCredsArguments[1].id, pseudoUniqueID, "setCredentials: incorrect uniqueID");
            	assert(typeof(setCredsArguments[2]) === "function", "setCredentials: no callback");

            	done();
            });


        });
    });

    describe("decrypt", function() {

        beforeEach(function() {
            spies.jqueryGet = sinon.stub($, "get").returns($.Deferred().resolve({key: { key: key } }));
            spies.decryptPassword = sinon.stub(crypto, 'decryptPassword').returns(password);

            spies.getOptions.reset();
        });

        afterEach(function() {
        	spies.jqueryGet.restore();
        	spies.decryptPassword.restore();
        })

        it("should decrypt credentials with credentialID if credentialID exists", function(done) {
            var credentials = {
                username: username,
                password: encryptedPassword,
                id: pseudoUniqueID
            }

            spies.getCredentials = sinon.stub(crypto.storage, "getCredentialsForDomain")
            	.returns($.Deferred().resolve(credentials));

            crypto.decrypt({
                key: siteKey
            }, function() {
            	assert(spies.getCredentials.calledWith(siteKey), "getCredentialsForDomain: incorrect site key");
            	assert(spies.jqueryGet.calledWith(cyURL + crypto.keyPath + credentials.id), "$.get: incorrect Cy URL");
            	assert(spies.getOptions.called, "getOptions: not called");
            	assert(spies.decryptPassword.calledWith(credentials.password, key), "decryptPassword: called with incorrect credentials");

                done();
            });


        });

        it("should decrypt credentials with siteKey if credentialID does not exist", function(done) {
            var credentials = {
                username: username,
                password: encryptedPassword
            }

            spies.getCredentials = sinon.stub(crypto.storage, "getCredentialsForDomain")
            	.returns($.Deferred().resolve(credentials));

            crypto.decrypt({
                key: siteKey
            }, function() {
            	assert(spies.getCredentials.calledWith(siteKey), "getCredentialsForDomain: incorrect site key");
            	assert(spies.jqueryGet.calledWith(cyURL + crypto.keyPath + siteKey), "$.get: incorrect Cy URL");
            	assert(spies.getOptions.called, "getOptions: not called");
            	assert(spies.decryptPassword.calledWith(credentials.password, key), "decryptPassword: called with incorrect credentials");

                done();
            });
        });
    });

});