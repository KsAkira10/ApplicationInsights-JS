﻿/// <reference path="..\TestFramework\Common.ts" />
/// <reference path="../../JavaScriptSDK/ajax/ajax.ts" />
/// <reference path="../../JavaScriptSDK/Util.ts"/>

class AjaxTests extends TestClass {   

    private appInsightsMock = { trackAjax: (absoluteUrl: string, isAsync: boolean, totalTime: number, success: boolean) => { } }
    private trackAjaxSpy = sinon.spy(this.appInsightsMock, "trackAjax");
    private callbackSpy = sinon.spy();
    private requests;

    public testInitialize() {
        this.trackAjaxSpy.reset();
        var xhr = sinon.useFakeXMLHttpRequest();
    }

    public testCleanup() {
    }

    public registerTests() {

        this.testCase({
            name: "Ajax: xhr.open gets instrumented",
            test: () => {
                var ajax = new Microsoft.ApplicationInsights.AjaxMonitor(<any>this.appInsightsMock);

                // act
                var xhr = new XMLHttpRequest();
                Assert.ok(xhr.onreadystatechange == null, "Asserting that onreadystatechange is not set to validate that our ajax instrumentation sets it itself.");
                xhr.open("GET", "http://microsoft.com");

                // assert
                var ajaxData = (<any>xhr).ajaxData;
                Assert.ok(xhr.onreadystatechange != null, "Onreadystatechange was not set.");
                Assert.equal("http://microsoft.com", ajaxData.requestUrl, "RequestUrl is collected correctly");
                Assert.equal(true, ajaxData.async, "Async flag is collected correctly");
            }
        });

        this.testCase({
            name: "Ajax: ajaxData is removed from xhr after it's completed.",
            test: () => {
                var ajax = new Microsoft.ApplicationInsights.AjaxMonitor(<any>this.appInsightsMock);
                
                // act
                var xhr = new XMLHttpRequest();
                xhr.open("GET", "http://microsoft.com");
                xhr.send();
                (<any>xhr).respond(200, {}, "");

                // assert
                var ajaxData = (<any>xhr).ajaxData;
                Assert.ok(!xhr.hasOwnProperty("ajaxData"), "ajaxData should be removed from xhr to prevent memory leaks");
            }
        });

        this.testCase({
            name: "Ajax: successful request, ajax monitor doesn't change payload",
            test: () => {
                var callback = sinon.spy();
                var ajax = new Microsoft.ApplicationInsights.AjaxMonitor(<any>this.appInsightsMock);                

                // Act
                var xhr = new XMLHttpRequest();
                xhr.onload = callback;
                xhr.open("GET", "/bla");
                xhr.send();

                Assert.ok(!this.trackAjaxSpy.called, "TrackAjax should not be called yet");

                // Emulate response
                (<any>xhr).respond(200, { "Content-Type": "application/json" }, "bla");
                Assert.ok(this.trackAjaxSpy.called, "TrackAjax is called");
                                
                // Assert
                var result = callback.args[0][0].target;
                Assert.ok(callback.called, "Ajax callback is called");
                Assert.equal("bla", result.responseText, "Expected result mismatch");
                Assert.equal(200, result.status, "Expected 200 response code");
                Assert.equal(4, xhr.readyState, "Expected readyState is 4 after request is finished");

            }
        });

        this.testCase({
            name: "Ajax: custom onreadystatechange gets called",
            test: () => {
                var onreadystatechangeSpy = sinon.spy();
                var ajax = new Microsoft.ApplicationInsights.AjaxMonitor(<any>this.appInsightsMock);

                // Act
                var xhr = new XMLHttpRequest();
                xhr.onreadystatechange = onreadystatechangeSpy;
                xhr.open("GET", "/bla");
                xhr.send();

                Assert.ok(!this.trackAjaxSpy.called, "TrackAjax should not be called yet");

                // Emulate response                
                (<any>xhr).respond();

                // Assert
                Assert.ok(this.trackAjaxSpy.called, "TrackAjax is called");
                Assert.ok(onreadystatechangeSpy.called, "custom onreadystatechange should be called");

            }
        });

        this.testCase({
            name: "Ajax: 200 means success",
            test: () => {
                var ajax = new Microsoft.ApplicationInsights.AjaxMonitor(<any>this.appInsightsMock);
                // Act
                var xhr = new XMLHttpRequest();
                xhr.open("GET", "/bla");
                xhr.send();
                
                // Emulate response                
                (<any>xhr).respond(200, {}, "");

                // Assert
                Assert.equal(true, this.trackAjaxSpy.args[0][3], "TrackAjax should receive true as a 'success' argument");

            }
        });

        this.testCase({
            name: "Ajax: non 200 means failure",
            test: () => {
                var ajax = new Microsoft.ApplicationInsights.AjaxMonitor(<any>this.appInsightsMock);                

                // Act
                var xhr = new XMLHttpRequest();
                xhr.open("GET", "/bla");
                xhr.send();
                
                // Emulate response                
                (<any>xhr).respond(404, {}, "");

                // Assert
                Assert.equal(false, this.trackAjaxSpy.args[0][3], "TrackAjax should receive false as a 'success' argument");

            }
        });
        
        [200, 201, 202, 203, 204, 301, 302, 303, 304].forEach((responseCode) => {
            this.testCase({
                name: "Ajax: test success http response code: " + responseCode,
                test: () => {
                    this.testAjaxSuccess(responseCode, true);
                }
            })
        });

        [400, 401, 402, 403, 404, 500, 501].forEach((responseCode) => {
            this.testCase({
                name: "Ajax: test failure http response code: " + responseCode,
                test: () => {
                    this.testAjaxSuccess(responseCode, false);
                }
            })
        });
    }

    private testAjaxSuccess(responseCode: number, success: boolean) {
        var ajax = new Microsoft.ApplicationInsights.AjaxMonitor(<any>this.appInsightsMock);                

        // Act
        var xhr = new XMLHttpRequest();
        xhr.open("GET", "/bla");
        xhr.send();
                
        // Emulate response                
        (<any>xhr).respond(responseCode, {}, "");

        // Assert
        Assert.equal(success, this.trackAjaxSpy.args[0][3], "TrackAjax should receive " + success + " as a 'success' argument");
    }
}
new AjaxTests().registerTests();