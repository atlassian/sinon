(function (root) {
    "use strict";

    var buster = root.buster || require("buster");
    var sinon = root.sinon || require("../../../lib/sinon");
    var assert = buster.assert;
    var refute = buster.refute;

    buster.testCase("sinon.wrapMethod", {
        setUp: function () {
            this.method = function () {};
            this.getter = function () {};
            this.setter = function () {};
            this.object = {method: this.method};
            Object.defineProperty(this.object, "property", {
                get: this.getter,
                set: this.setter,
                configurable: true
            });
        },

        "is function": function () {
            assert.isFunction(sinon.wrapMethod);
        },

        "throws if first argument is not object": function () {
            assert.exception(function () {
                sinon.wrapMethod();
            }, "TypeError");
        },

        "throws if object defines property but is not function": function () {
            this.object.prop = 42;
            var object = this.object;

            assert.exception(function () {
                sinon.wrapMethod(object, "prop", function () {});
            }, "TypeError");
        },

        "throws if object does not define property": function () {
            var object = this.object;

            assert.exception(function () {
                sinon.wrapMethod(object, "prop", function () {});
            });

            try {
                sinon.wrapMethod(object, "prop", function () {});
                throw new Error("Didn't throw");
            } catch (e) {
                assert.match(e.message,
                    /Attempted to wrap .* property .* as function/);
            }
        },

        "throws if third argument is missing": function () {
            var object = this.object;

            assert.exception(function () {
                sinon.wrapMethod(object, "method");
            }, "TypeError");
        },

        "throws if third argument is not a function or a property descriptor": function () {
            var object = this.object;

            assert.exception(function () {
                sinon.wrapMethod(object, "method", 1);
            }, "TypeError");
        },

        "replaces object method": function () {
            sinon.wrapMethod(this.object, "method", function () {});

            refute.same(this.method, this.object.method);
            assert.isFunction(this.object.method);
        },

        "replaces getter": function () {
            sinon.wrapMethod(this.object, "property", { get: function () {} });

            refute.same(this.getter, Object.getOwnPropertyDescriptor(this.object, "property").get);
            assert.isFunction(Object.getOwnPropertyDescriptor(this.object, "property").get);
        },

        "replaces setter": function () {
            sinon.wrapMethod(this.object, "property", { // eslint-disable-line accessor-pairs
                set: function () {}
            });

            refute.same(this.setter, Object.getOwnPropertyDescriptor(this.object, "property").set);
            assert.isFunction(Object.getOwnPropertyDescriptor(this.object, "property").set);
        },

        "throws if method is already wrapped": function () {
            sinon.wrapMethod(this.object, "method", function () {});

            assert.exception(function () {
                sinon.wrapMethod(this.object, "method", function () {});
            }, "TypeError");
        },

        "throws if property descriptor is already wrapped": function () {
            sinon.wrapMethod(this.object, "property", { get: function () {} });

            assert.exception(function () {
                sinon.wrapMethod(this.object, "property", { get: function () {} });
            }, "TypeError");
        },

        "throws if method is already a spy": function () {
            var object = { method: sinon.spy() };

            assert.exception(function () {
                sinon.wrapMethod(object, "method", function () {});
            }, "TypeError");
        },

        "originating stack traces": {
            requiresSupportFor: {
                "overriding Error and TypeError": (function () {
                    return !(typeof navigator === "object" && /PhantomJS/.test(navigator.userAgent));
                }())
            },

            setUp: function () {
                this.oldError = Error;
                this.oldTypeError = TypeError;

                var i = 0;

                /*eslint-disable no-native-reassign, no-undef*/
                Error = TypeError = function () {
                    this.stack = ":STACK" + ++i + ":";
                };
                /*eslint-enable no-native-reassign, no-undef*/
            },

            tearDown: function () {
                /*eslint-disable no-native-reassign, no-undef*/
                Error = this.oldError;
                TypeError = this.oldTypeError;
                /*eslint-enable no-native-reassign, no-undef*/
            },

            "throws with stack trace showing original wrapMethod call": function () {
                var object = { method: function () {} };
                sinon.wrapMethod(object, "method", function () {
                    return "original";
                });

                try {
                    sinon.wrapMethod(object, "method", function () {});
                } catch (e) {
                    assert.equals(e.stack, ":STACK2:\n--------------\n:STACK1:");
                }
            }
        },

        "in browser": {
            requiresSupportFor: {
                "window object": typeof window !== "undefined"
            },

            "does not throw if object is window object": function () {
                window.sinonTestMethod = function () {};
                try {
                    refute.exception(function () {
                        sinon.wrapMethod(window, "sinonTestMethod", function () {});
                    });
                } finally {
                    // IE 8 does not support delete on global properties.
                    window.sinonTestMethod = undefined;
                }
            }
        },

        "mirrors function properties": function () {
            var object = { method: function () {} };
            object.method.prop = 42;

            sinon.wrapMethod(object, "method", function () {});

            assert.equals(object.method.prop, 42);
        },

        "does not mirror and overwrite existing properties": function () {
            var object = { method: function () {} };
            object.method.called = 42;

            sinon.stub(object, "method");

            assert.isFalse(object.method.called);
        },

        "wrapped method": {
            setUp: function () {
                this.method = function () {};
                this.object = { method: this.method };
            },

            "defines restore method": function () {
                sinon.wrapMethod(this.object, "method", function () {});

                assert.isFunction(this.object.method.restore);
            },

            "returns wrapper": function () {
                var wrapper = sinon.wrapMethod(this.object, "method", function () {});

                assert.same(this.object.method, wrapper);
            },

            "restore brings back original method": function () {
                sinon.wrapMethod(this.object, "method", function () {});
                this.object.method.restore();

                assert.same(this.object.method, this.method);
            }
        },

        "wrapped prototype method": {
            setUp: function () {
                this.type = function () {};
                this.type.prototype.method = function () {};

                this.object = new this.type(); //eslint-disable-line new-cap
            },

            "wrap adds owned property": function () {
                var wrapper = sinon.wrapMethod(this.object, "method", function () {});

                assert.same(this.object.method, wrapper);
                assert(this.object.hasOwnProperty("method"));
            },

            "restore removes owned property": function () {
                sinon.wrapMethod(this.object, "method", function () {});
                this.object.method.restore();

                assert.same(this.object.method, this.type.prototype.method);
                assert.isFalse(this.object.hasOwnProperty("method"));
            }
        }
    });
}(this));
