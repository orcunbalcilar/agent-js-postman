# orcunbalcilar/newman-reporter-agent-js-postman

This package is a fork of [@reportportal/agent-js-postman](https://github.com/reportportal/agent-js-postman).

## Original Project Attribution
The original work is by ReportPortal.io and is licensed under the Apache 2.0 license.
* Original repository: https://github.com/reportportal/agent-js-postman

---

Agent to integrate Postman (based on Newman collection runner) with ReportPortal.
* More about [Postman](https://www.postman.com/)
* More about [Newman](https://github.com/postmanlabs/newman)
* More about [ReportPortal](http://reportportal.io/)

### How to use
The installation should be global if newman is installed globally, otherwise - local (replace -g from the command below with -S for a local installation).

For global installation:
```cmd
npm install -g orcunbalcilar/newman-reporter-agent-js-postman
```

For local installation:
```cmd
npm install --save-dev orcunbalcilar/newman-reporter-agent-js-postman
```

### Usage

There are two ways to enable this reporter - with command line or programmatically.

#### With CLI

To enable this reporter you have to specify `agent-js-postman` in Newman's `-r` or `--reporters` option.

```cmd
newman run https://postman-echo.com/status/200 \
  -r orcunbalcilar/agent-js-postman \
  --reporter-@reportportal/agent-js-postman-debug=true \
  --reporter-@reportportal/agent-js-postman-endpoint=https://your-instance.com:8080/api/v1 \
  --reporter-@reportportal/agent-js-postman-api-key=reportportalApiKey \
  --reporter-@reportportal/agent-js-postman-launch=LAUNCH_NAME \
  --reporter-@reportportal/agent-js-postman-project=PROJECT_NAME \
  --reporter-@reportportal/agent-js-postman-description=LAUNCH_DESCRIPTION \
  --reporter-@reportportal/agent-js-postman-attributes=launchKey:launchValue;launchValueTwo \
  -x
```

Pay attention that you **must** add **-x** or **--suppress-exit-code** parameter while running newman using CLI.

#### Programmatically

```javascript
const newman = require("newman");

newman.run(
    {
        collection: "./collections/newman-test_collection.json",
        reporters: "orcunbalcilar/agent-js-postman",
        reporter: {
            "orcunbalcilar/agent-js-postman": {
                apiKey: "<API_KEY>",
                endpoint: "https://your.reportportal.server/api/v1",
                project: "Your reportportal project name",
                launch: "Your launch name",
                description: "Your launch description",
                attributes: [
                    {
                        "key": "launchKey",
                        "value": "launchValue"
                    },
                    {
                        "value": "launchValue"
                    },
                ],
                mode: "DEFAULT",
                debug: false
            }
        }
    },
    function(err) {
        if (err) {
            throw err;
        }
        console.log("collection run complete!");
    }
);

// To run several collections
// Note, this will create multiple launches, so you can merge into one manually via the UI or API
fs.readdir("./collections_folder_path", (err, files) => {
    if (err) {
        throw err;
    }
    files.forEach((file) => {
        // setup newman.run()
    });
});
```

#### Options

The full list of available options presented below.

| Option                | Necessity  | Default   | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
|-----------------------|------------|-----------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| apiKey                | Required   |           | User's reportportal token from which you want to send requests. It can be found on the profile page of this user.                                                                                                                                                                                                                                                                                                                                                                                                                                |
| endpoint              | Required   |           | URL of your server. For example 'https://server:8080/api/v1'.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| launch                | Required   |           | Name of launch at creation.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| project               | Required   |           | The name of the project in which the launches will be created.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| attributes            | Optional   | []        | Launch attributes. Programmatically - [{ "key": "YourKey", "value": "YourValue" }] <br/> with CLI - "YourKey:YourValue;YourValueTwo"                                                                                                                                                                                                                                                                                                                                                                                                             |
| description           | Optional   | ''        | Launch description.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| rerun                 | Optional   | false     | Enable [rerun](https://github.com/reportportal/documentation/blob/master/src/md/src/DevGuides/rerun.md)                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| rerunOf               | Optional   | Not set   | UUID of launch you want to rerun. If not specified, reportportal will update the latest launch with the same name                                                                                                                                                                                                                                                                                                                                                                                                                                |
| mode                  | Optional   | 'DEFAULT' | Results will be submitted to Launches page <br/> *'DEBUG'* - Results will be submitted to Debug page.                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| skippedIssue          | Optional   | true      | reportportal provides feature to mark skipped tests as not 'To Investigate'. <br/> Option could be equal boolean values: <br/> *true* - skipped tests considered as issues and will be marked as 'To Investigate' on reportportal. <br/> *false* - skipped tests will not be marked as 'To Investigate' on application.                                                                                                                                                                                                                          |
| debug                 | Optional   | false     | This flag allows seeing the logs of the client-javascript. Useful for debugging.                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| launchId              | Optional   | Not set   | The _ID_ of an already existing launch. The launch must be in 'IN_PROGRESS' status while the tests are running. Please note that if this _ID_ is provided, the launch will not be finished at the end of the run and must be finished separately.                                                                                                                                                                                                                                                                                                |
| restClientConfig      | Optional   | Not set   | `axios` like http client [config](https://github.com/axios/axios#request-config). May contain `agent` property for configure [http(s)](https://nodejs.org/api/https.html#https_https_request_url_options_callback) client, and other client options e.g. `proxy`, [`timeout`](https://github.com/reportportal/client-javascript#timeout-30000ms-on-axios-requests). For debugging and displaying logs the `debug: true` option can be used. <br/> Visit [client-javascript](https://github.com/reportportal/client-javascript) for more details. |
| headers               | Optional   | {}        | The object with custom headers for internal http client.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| launchUuidPrint       | Optional   | false     | Whether to print the current launch UUID.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| launchUuidPrintOutput | Optional   | 'STDOUT'  | Launch UUID printing output. Possible values: 'STDOUT', 'STDERR', 'FILE', 'ENVIRONMENT'. Works only if `launchUuidPrint` set to `true`. File format: `rp-launch-uuid-${launch_uuid}.tmp`. Env variable: `RP_LAUNCH_UUID`, note that the env variable is only available in the reporter process (it cannot be obtained from tests).                                                                                                                                                                                                               |
| token                 | Deprecated | Not set   | Use `apiKey` instead.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |

### Report static attributes
* To report attributes for suite you should use collection variables.

| VARIABLE      | INITIAL VALUE             | CURRENT VALUE             |
|---------------|---------------------------|---------------------------|
| rp.attributes | keySuiteOne:valueSuiteOne | keySuiteOne:valueSuiteOne |

* To report attributes for tests inside of Pre-request Script you should use the next method

**pm.environment.set**

| Parameter  | Required | Description                                                | Examples                                       |
|------------|----------|------------------------------------------------------------|------------------------------------------------|
| namespace  | true     | "string" - namespace, must be equal to the *rp.attributes* | "rp.attributes"                                |
| attributes | true     | "string" - contains set of pairs *key:value*               | "keyOne:valueOne;valueTwo;keyThree:valueThree" |

```javascript
pm.environment.set("rp.attributes", "keyOne:valueOne;valueTwo;keyThree:valueThree");
```
* Step doesn't support reporting with attributes

### Report static description
Both suites and tests support description. For reporting with description you should click on **Edit** in your collection
 and in the description column enter the text you need

* Step doesn't support reporting with description

### Finish with status
**status** must be equal to one of the following values: **passed, failed, stopped, skipped, interrupted, cancelled, info, warn**.<br/>

* To finish launch/suite with status you should use collection variables

| VARIABLE                                               | INITIAL VALUE | CURRENT VALUE |
|--------------------------------------------------------|---------------|---------------|
| rp.launchStatus (for launch)<br/>rp.status (for suite) | your status   | your status   |

* To finish tests you should use environment variables inside of Pre-request Script
```javascript
pm.environment.set("rp.status", "status");
```
* To finish steps with statuses you should use local variables
```javascript
pm.variables.set("rp.status", "status");
```
**It is important that the code line above has to start from the new line and you shouldn't forget about semicolon after it**

For both tests or steps, this is true

| Parameter | Required | Description                                            | Examples    |
|-----------|----------|--------------------------------------------------------|-------------|
| namespace | true     | "string" - namespace, must be equal to the *rp.status* | "rp.status" |
| status    | true     | "string" - status                                      | "passed"    |

### Logging
You can use the following methods to report logs with different log levels:

* console.log("launch/suite/test", "message");
* console.error("launch/suite/test", "message");
* console.debug("launch/suite/test", "message");
* console.warn("launch/suite/test", "message");
* console.info("launch/suite/test", "message");

| Parameter | Required | Description                                                                                            | Examples       |
|-----------|----------|--------------------------------------------------------------------------------------------------------|----------------|
| namespace | true     | "string" - namespace, must be equal to the *launch, suite or test* depends on where you want to report | "test"         |
| message   | true     | "string" - message                                                                                     | "your message" |

* Step doesn't support logs reporting

### Report test case id
* To report suite with test case id you should use collection variables

| VARIABLE      | INITIAL VALUE       | CURRENT VALUE       |
|---------------|---------------------|---------------------|
| rp.testCaseId | yourSuiteTestCaseId | yourSuiteTestCaseId |

* To report tests with test case id you should use environment variables inside of Pre-request Script
```javascript
pm.environment.set("rp.testCaseId", "yourTestCaseId");
```
* To report steps with test case id you should use local variables
```javascript
pm.variables.set("rp.testCaseId", "stepTestCaseId");
```
**It is important that the code line above has to start from the new line and you shouldn't forget about semicolon after it**

For both tests or steps, this is true

| Parameter  | Required | Description                                                | Examples         |
|------------|----------|------------------------------------------------------------|------------------|
| namespace  | true     | "string" - namespace, must be equal to the *rp.testCaseId* | "rp.testCaseId"  |
| testCaseId | true     | "string" - test case id value                              | "yourTestCaseId" |

### Enhanced Folder Structure Support

This fork adds native support for Postman's folder structure in ReportPortal. When using this reporter:

1. Each Postman folder is represented as a separate suite in ReportPortal
2. Nested folders maintain their hierarchy, appearing as nested suites in ReportPortal
3. Requests within folders are properly associated with their parent folder
4. Folder descriptions and attributes are preserved in the ReportPortal UI

This enhancement provides a more intuitive representation of your Postman collection structure in ReportPortal, making test results easier to navigate and understand.

### Improved Request/Response Logging

This fork includes significant improvements to request and response logging:

1. **Better HTML Escaping**: Special characters in logs are now properly escaped, preventing rendering issues in the ReportPortal UI
2. **More Reliable Log Collection**: Logs are now collected and associated with the proper test item more reliably
3. **Enhanced Log Sequence**: Request and response logs appear in a more logical sequence, making it easier to follow the request flow

These improvements make debugging API responses much more reliable, especially when responses contain HTML, XML, or special characters.

# Version History

## 5.1.1 (2025)
* First release of the forked package
* Enhanced folder suite handling: Added support for properly representing Postman folder structure in ReportPortal
* Improved request/response logging with better HTML escaping for safer log viewing
* Fixed log collection and reporting sequence for more reliable test results
* Updated package identifiers to reflect new ownership
* Fixed licensing and attribution according to Apache 2.0 requirements

# Copyright Notice
Licensed under the [Apache 2.0](https://www.apache.org/licenses/LICENSE-2.0.html)
license (see the LICENSE.md file).

## Fork Information

This fork is maintained by [Orçun Balcılar](https://github.com/orcunbalcilar) and is available on:
* GitHub: https://github.com/orcunbalcilar/agent-js-postman
* npm: https://www.npmjs.com/package/orcunbalcilar/newman-reporter-agent-js-postman

### Why This Fork?

This fork was created to provide:
- Ongoing maintenance for the ReportPortal integration with Postman/Newman
- Improved documentation and examples
- Bug fixes and enhancements
- Compatibility with the latest versions of Newman and ReportPortal

### Contributing

Contributions are welcome! Please feel free to submit a Pull Request or create an issue on the [GitHub repository](https://github.com/orcunbalcilar/agent-js-postman).
