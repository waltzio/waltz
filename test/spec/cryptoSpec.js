

describe("Crypto", function() {
    var crypto, password, key, username,
        encryptedPassword, siteKey, pseudoUniqueID, cyURL;

    password = "password";
    username = "username";
    key = Math.random().toString(36).substring(2);
    siteKey = "test"
    pseudoUniqueID = "uniqueID"
    cyURL = "http://tes.com"

    beforeEach(function() {
        crypto = new Crypto();
        encryptedPassword = "encryptedPassword";

        crypto.storage.getOptions = function() {};

        spyOn(crypto.storage, "getOptions").andCallFake(function(cb) {
                var _ret = { cy_url: cyURL };
                if (cb) cb(_ret);
                return $.Deferred().resolve(_ret);
            });

        spyOn(Utils, "pseudoUniqueID").andReturn(pseudoUniqueID);
    });

    describe("encryptPassword", function() {
        it("should change the value of the encrypted value", function() {
            expect(crypto.encryptPassword(password, key)).not.toEqual(password);
        });
    });

    describe("decryptPassword", function() {
        it("should decrypt an encrypted password", function() {
            var encryptedPassword = crypto.encryptPassword(password, key);
            expect(crypto.decryptPassword(encryptedPassword, key)).toEqual(password);
        });
    });

    describe("encrypt", function() {

        beforeEach(function() {
            spyOn($, "get").andReturn($.Deferred().resolve({key: { key: key } }));

            crypto.storage.setCredentialsForDomain = function() {};

            spyOn(crypto, "encryptPassword").andReturn(encryptedPassword);
            spyOn(crypto.storage, "setCredentialsForDomain").andCallFake(function(key, data, cb) { cb(); })
        });

        it("should encrypt credentials", function() {
            crypto.encrypt({
                key: siteKey,
                username: username,
                password: password
            }, function() {
                expect($.get).toHaveBeenCalledWith(cyURL + crypto.keyPath + pseudoUniqueID);
                expect(crypto.storage.getOptions).toHaveBeenCalled();
                expect(crypto.encryptPassword).toHaveBeenCalledWith(password, key);
                expect(crypto.storage.setCredentialsForDomain)
                    .toHaveBeenCalledWith(
                        siteKey,
                        jasmine.objectContaining({
                            username: username,
                            password: encryptedPassword,
                            id: pseudoUniqueID
                        }),
                        jasmine.any(Function)
                    );
            });


        });
    });

    describe("decrypt", function() {

        beforeEach(function() {
            spyOn($, "get").andReturn($.Deferred().resolve({key: { key: key } }));

            crypto.storage.getCredentialsForDomain = function() {};

            spyOn(crypto, "decryptPassword").andReturn(password);
        });

        it("should decrypt credentials with credentialID if credentialID exists", function() {
            var credentials = {
                username: username,
                password: encryptedPassword,
                id: pseudoUniqueID
            }
            spyOn(crypto.storage, "getCredentialsForDomain").andReturn($.Deferred().resolve(credentials))

            crypto.decrypt({
                key: siteKey
            }, function() {
                expect(crypto.storage.getCredentialsForDomain)
                    .toHaveBeenCalledWith(siteKey);
                expect($.get).toHaveBeenCalledWith(cyURL + crypto.keyPath + credentials.id);
                expect(crypto.storage.getOptions).toHaveBeenCalled();
                expect(crypto.decryptPassword).toHaveBeenCalledWith(credentials.password, key);
            });


        });

        it("should decrypt credentials with siteKey if credentialID does not exist", function() {
            var credentials = {
                username: username,
                password: encryptedPassword
            }
            spyOn(crypto.storage, "getCredentialsForDomain").andReturn($.Deferred().resolve(credentials))

            crypto.decrypt({
                key: siteKey
            }, function() {
                expect(crypto.storage.getCredentialsForDomain)
                    .toHaveBeenCalledWith(siteKey);
                expect($.get).toHaveBeenCalledWith(cyURL + crypto.keyPath + siteKey);
                expect(crypto.storage.getOptions).toHaveBeenCalled();
                expect(crypto.decryptPassword).toHaveBeenCalledWith(credentials.password, key);
            });
        });
    });




})


