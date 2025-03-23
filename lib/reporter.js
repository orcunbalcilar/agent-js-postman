/*
 *  Copyright 2020 EPAM Systems
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *  http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

const RPClient = require('@reportportal/client-javascript');
const { StringDecoder } = require('string_decoder');
const _ = require('lodash');
const utils = require('./utils');
const {
  testPatterns,
  pmVariablesTestCaseIdPatterns,
  pmVariablesStatusPatterns,
} = require('./constants/patterns');

/**
 * Basic error handler for promises. Just prints errors.
 *
 * @param {Object} err Promise's error
 */
const errorHandler = (err) => {
  if (err) {
    console.error(err);
  }
};

/**
 * Possible test execution statuses.
 *
 * @enum {string}
 */
const TestStatus = Object.freeze({
  PASSED: 'PASSED',
  FAILED: 'FAILED',
  SKIPPED: 'SKIPPED',
  INTERRUPTED: 'INTERRUPTED',
});

class Reporter {
  constructor(emitter, options, collectionRunOptions, rpClient) {
    const Client = rpClient || RPClient;

    this.client = new Client(utils.getClientInitObject(options), utils.getAgentInfo());
    this.launchObj = this.client.startLaunch(utils.getStartLaunchObj(options));
    this.collectionMap = new Map();
    this.suitesInfoStack = [];
    this.decoder = new StringDecoder('utf8');
    this.collectionRunOptions = collectionRunOptions;
    this.options = options;
    this.collectionPath = utils.getCollectionPath(this.collectionRunOptions.workingDir);
    this.launchLogs = [];
    this.suiteLogs = [];
    this.testLogs = [];

    this.suiteIds = new Map();

    emitter.on('console', this.onConsole.bind(this));

    emitter.on('start', this.onStart.bind(this));
    emitter.on('beforeItem', this.beforeItem.bind(this));
    emitter.on('beforeRequest', this.onBeforeRequest.bind(this));
    emitter.on('request', this.onRequest.bind(this));
    emitter.on('beforeTest', this.onBeforeTest.bind(this));
    emitter.on('test', this.finishAllSteps.bind(this));
    emitter.on('item', this.finishTest.bind(this));
    emitter.on('assertion', this.finishStep.bind(this));
    emitter.on('beforeDone', this.onBeforeDone.bind(this));
    emitter.on('done', this.onDone.bind(this));
  }

  onConsole(err, args) {
    if (err) {
      throw err;
    }

    const type = args.messages && args.messages[0];

    switch (type) {
      case 'launch':
        if (this.launchLogs !== null) {
          args.messages.slice(1).forEach((message) =>
            this.launchLogs.push({
              level: args.level,
              message,
              time: this.getTime(),
            }),
          );
        }
        break;
      case 'suite':
        if (this.suiteLogs !== null) {
          args.messages.slice(1).forEach((message) =>
            this.suiteLogs.push({
              level: args.level,
              message,
              time: this.getTime(),
            }),
          );
        }
        break;
      case 'test':
        args.messages.slice(1).forEach((message) =>
          this.testLogs.push({
            level: args.level,
            message,
            time: this.getTime(),
          }),
        );
        break;
      default:
        break;
    }
  }

  getTestName(result) {
    if (result.item.name === undefined) {
      return null;
    }
    const iteration =
      this.collectionRunOptions.iterationCount === undefined
        ? ''
        : ` #${result.cursor.iteration + 1}`;

    return `${result.item.name}${iteration}`;
  }

  startTestStep({ stepName, result, currentStepData, testObj }) {
    const codeRefTitle = `${this.collectionRunOptions.collection.name}/${result.item.name}/${stepName}`;
    const parameters = utils.getParameters(
      this.collectionRunOptions.iterationData,
      result.cursor.iteration,
    );
    const codeRef = utils.getCodeRef(this.collectionPath, codeRefTitle);

    const stepObj = this.client.startTestItem(
      {
        name: stepName,
        type: 'STEP',
        parameters,
        codeRef,
        ...(currentStepData.testCaseId && { testCaseId: currentStepData.testCaseId }),
      },
      this.launchObj.tempId,
      testObj.testId,
    );

    stepObj.promise.catch(errorHandler);

    return stepObj;
  }

  // Add this new method
  startFolderSuite(folder, parentId) {
    const { name } = folder;
    const description = folder.description && folder.description.content;
    const codeRef = utils.getCodeRef(this.collectionPath, name);

    const suiteObj = this.client.startTestItem(
      {
        type: 'SUITE',
        name,
        description,
        codeRef,
        attributes: utils.getAttributes(folder.variables || []),
      },
      this.launchObj.tempId,
      parentId,
    );

    suiteObj.promise.catch(errorHandler);

    return suiteObj;
  }

  // Modify onStart method
  onStart(err, result) {
    if (err) {
      throw err;
    }

    const { collection } = this.collectionRunOptions;
    const { name } = collection;
    const description = collection.description && collection.description.content;
    const codeRef = utils.getCodeRef(this.collectionPath, name);

    const rootSuiteObj = this.client.startTestItem(
      {
        type: 'SUITE',
        name,
        description,
        codeRef,
        testCaseId: utils.getCollectionVariablesByKey('testCaseId', collection.variables),
        attributes: utils.getAttributes(collection.variables),
      },
      this.launchObj.tempId,
    );

    rootSuiteObj.promise.catch(errorHandler);

    this.suitesInfoStack.push({
      name,
      tempId: rootSuiteObj.tempId,
      ref: result.cursor.ref,
    });

    // Process folders recursively
    const processFolder = (folder, parentId) => {
      const folderSuite = this.startFolderSuite(folder, parentId);
      const { tempId } = folderSuite;

      this.suitesInfoStack.push({
        name: folderSuite.name,
        tempId,
        ref: result.cursor.ref,
      });

      folder.items.members
        .filter((i) => i.items)
        .forEach((member) => {
          processFolder(member, tempId);
        });

      folder.items.members
        .filter((i) => i.request)
        .forEach((member) => {
          this.suiteIds.set(member.id, tempId);
        });
    };

    const { items } = collection;

    items.members
      .filter((i) => i.request)
      .forEach((request) => {
        this.suiteIds.set(request.id, rootSuiteObj.tempId);
      });

    items.members
      .filter((i) => i.items)
      .forEach((folder) => {
        processFolder(folder, rootSuiteObj.tempId);
      });
  }

  beforeItem(err) {
    if (err) {
      throw err;
    }

    this.testLogs = [];
  }

  onBeforeRequest(err, result) {
    if (err) {
      throw err;
    }
    const name = this.getTestName(result);

    if (!name) {
      return;
    }

    const parentId = this.suiteIds.get(result.item.id);

    const description = result.request.description && result.request.description.content;
    const codeRefTitle = `${this.collectionRunOptions.collection.name}/${result.item.name}`;
    const codeRef = utils.getCodeRef(this.collectionPath, codeRefTitle);
    const parameters = utils.getParameters(
      this.collectionRunOptions.iterationData,
      result.cursor.iteration,
    );

    const testObj = this.client.startTestItem(
      {
        name,
        type: 'TEST',
        description,
        codeRef,
        parameters,
        testCaseId: utils.getCollectionVariablesByKey(
          'testCaseId',
          this.collectionRunOptions.environment.values,
        ),
        attributes: utils.getAttributes(this.collectionRunOptions.environment.values),
      },
      this.launchObj.tempId,
      parentId,
    );

    testObj.promise.catch(errorHandler);

    this.collectionMap.set(result.cursor.ref, {
      testId: testObj.tempId,
      requestId: result.cursor.httpRequestId || result.item.id,
      steps: [],
      status: utils.getCollectionVariablesByKey(
        'status',
        this.collectionRunOptions.environment.values,
      ),
    });

    this.testLogs &&
      this.testLogs.forEach((log) =>
        this.logMessage(testObj.tempId, log.message, log.level, log.time),
      );
    // this.testLogs = [];

    this.launchLogs &&
      this.launchLogs.forEach((log) => this.sendLaunchLogMessage(log.message, log.level, log.time));
    this.launchLogs = null;

    this.suiteLogs &&
      this.suiteLogs.forEach((log) => this.logMessage(parentId, log.message, log.level, log.time));
    this.suiteLogs = null;
  }

  // Collect steps additional data (rp.status, rp.testCaseId)
  onBeforeTest(err, result) {
    if (err) {
      throw err;
    }
    const testObj = this.collectionMap.get(result.cursor.ref);

    _.filter(result.events, 'script')
      .flatMap((event) => event.script.exec) // Extracts test script's strings
      .flatMap((exec) => {
        const stepName = utils.getStepParameterByPatterns(exec, testPatterns)[0];
        const testCaseId = utils.getStepParameterByPatterns(exec, pmVariablesTestCaseIdPatterns)[0];
        const status = utils.getStepParameterByPatterns(exec, pmVariablesStatusPatterns)[0];

        return {
          ...(stepName && { stepName }),
          ...(testCaseId && { testCaseId }),
          ...(status && { status }),
        };
      })
      .groupBySpecificField('stepName', ['testCaseId', 'status'])
      .forEach((stepInfoObj) => {
        testObj.steps.push(stepInfoObj);
      });

    testObj.steps.reverse();
  }

  finishStep(error, testAssertion) {
    const testObj = this.collectionMap.get(testAssertion.cursor.ref);

    if (!testObj) {
      return;
    }
    const currentStep = testObj.steps.pop();

    if (!currentStep) {
      return;
    }

    const stepName = testAssertion.assertion;
    const stepObj = this.startTestStep({
      stepName,
      result: testAssertion,
      currentStepData: currentStep,
      testObj,
    });
    const actualError = error || testAssertion.error;

    this.testLogs &&
      this.testLogs.forEach((log) =>
        this.logMessage(stepObj.tempId, log.message, log.level, log.time),
      );

    if (actualError) {
      // Logs error message for the failed steps
      this.logMessage(stepObj.tempId, actualError.message, 'ERROR');
    }

    const additionalData = {};

    if (testAssertion.skipped) {
      additionalData.status = TestStatus.SKIPPED;
      if (this.options.skippedIssue === false) {
        additionalData.issue = { issueType: 'NOT_ISSUE' };
      }
    }

    this.client
      .finishTestItem(stepObj.tempId, {
        status: currentStep.status || (actualError ? TestStatus.FAILED : TestStatus.PASSED),
        ...additionalData,
      })
      .promise.catch(errorHandler);
  }

  finishAllSteps(err, testResult) {
    if (err) {
      throw err;
    }

    const testObj = this.collectionMap.get(testResult.cursor.ref);
    const testWithError = testResult.executions.find((item) => {
      return item.error;
    });

    // Need to start all remaining steps to send them to RP and finish them
    // with the same error if there is an error in a test-script or Unknown error
    testObj.steps.forEach((stepInfoObj, index, array) => {
      const { stepName } = stepInfoObj;
      const stepObj = this.startTestStep({
        stepName,
        result: testResult,
        currentStepData: stepInfoObj,
        testObj,
      });

      Object.assign(array[index], { stepId: stepObj.tempId });
    });

    // Fails all steps with the same error if there is an error in a test-script
    this.interruptAllSteps(
      testObj,
      (testWithError && testWithError.error.message) || 'Unknown error occurred',
    );

    console.log('test - finishAllSteps'); // eslint-disable-line no-console
    console.log(this.testLogs); // eslint-disable-line no-console

    this.testLogs &&
      this.testLogs.forEach((log) =>
        this.logMessage(testObj.testId, log.message, log.level, log.time),
      );
  }

  onRequest(error, result) {
    const testObj = this.collectionMap.get(result.cursor.ref);

    if (testObj) {
      this.collectionMap.set(result.cursor.ref, {
        ...testObj,
        response: result && result.response,
        error,
      });
      this.sendRequestLogs(result.request);
      if (result.response) {
        this.sendResponseLogs(result.response);
      }
    }
    console.log('request - onRequest'); // eslint-disable-line no-console
    console.log(this.testLogs); // eslint-disable-line no-console
  }

  finishTest(err, result) {
    if (err) {
      throw err;
    }

    const testObj = this.collectionMap.get(result.cursor.ref);

    if (!testObj) {
      return;
    }
    const { status } = testObj;

    if (testObj.error) {
      this.logMessage(testObj.testId, testObj.error.message, 'ERROR');
    }

    this.client
      .finishTestItem(testObj.testId, {
        status: status || TestStatus.PASSED,
      })
      .promise.catch(errorHandler);
  }

  // Finishes suite
  onBeforeDone(err) {
    if (err) {
      throw err;
    }

    this.suitesInfoStack.forEach((suite) => {
      this.finishSuite(suite.tempId);
    });
  }

  // Finishes launch
  onDone(err, result) {
    if (err) {
      throw err;
    }
    const status =
      this.collectionRunOptions.collection &&
      utils.getCollectionVariablesByKey(
        'launchStatus',
        this.collectionRunOptions.collection.variables,
      );

    this.client
      .finishLaunch(this.launchObj.tempId, {
        status:
          status || ((result.run.failures || []).length ? TestStatus.FAILED : TestStatus.PASSED),
      })
      .promise.catch(errorHandler);
  }

  // eslint-disable-next-line class-methods-use-this
  getTime() {
    return new Date().valueOf();
  }

  /**
   * Sends launch log message to RP using it's client.
   *
   * @param  {string} message value.
   * @param  {string} [level="INFO"] Log level.
   * @param  {number} time when the log was started.
   */
  sendLaunchLogMessage(message, level, time) {
    this.logMessage(this.launchObj.tempId, message, level, time);
  }

  /**
   * Sends log message to RP using it's client.
   *
   * @param  {string} id RP's item id.
   * @param  {string} value Message value.
   * @param  {string} [level="INFO"] Log level.
   * @param  {number} time when the log was started.
   */
  logMessage(id, value, level, time) {
    this.client
      .sendLog(id, {
        level,
        message: this.h9(value),
        time: time || this.getTime(),
      })
      .promise.catch(errorHandler);
  }

  /**
   * Sends request data logs for a specific request: URL, method, headers, body.
   *
   * @param  {Object} request Http request.
   */
  sendRequestLogs(request) {
    this.testLogs.push({
      level: 'INFO',
      message: `Request: URL: ${request.url.toString()}`,
      time: this.getTime(),
    });
    this.testLogs.push({
      level: 'INFO',
      message: `Request: Method: ${request.method}`,
      time: this.getTime(),
    });

    const headers = request.headers.members.map((header) => `${header.key}:${header.value}`);

    if (headers.length) {
      this.testLogs.push({
        level: 'INFO',
        message: `Request: Headers: ${headers}`,
        time: this.getTime(),
      });
    }

    if (request.body && request.body.toString()) {
      this.testLogs.push({
        level: 'INFO',
        message: `Request: Body: ${request.body.toString()}`,
        time: this.getTime(),
      });
    }
  }

  /**
   * Sends response data logs for a specific request: response code, status, headers, body.
   * @param  {Object} response Http response.
   */
  sendResponseLogs(response) {
    const headers =
      response.headers && response.headers.members.map((header) => `${header.key}:${header.value}`);

    this.testLogs.push({
      level: 'INFO',
      message: `Response: Code: ${response.code}`,
      time: this.getTime(),
    });
    this.testLogs.push({
      level: 'INFO',
      message: `Response: Status: ${response.status}`,
      time: this.getTime(),
    });
    if (headers) {
      this.testLogs.push({
        level: 'INFO',
        message: `Response: Headers: ${headers}`,
        time: this.getTime(),
      });
    }
    this.testLogs.push({
      level: 'INFO',
      message: `Response: Body: ${this.decoder.write(response.stream)}`,
      time: this.getTime(),
    });
  }

  /**
   * Fails all steps of the given test object with sending the same error message for each of them.
   *
   * @param  {Object} testObj Test object with steps to fail.
   * @param  {string} message Error message to log.
   */
  interruptAllSteps(testObj, message) {
    _.forEach(testObj.steps, (step) => {
      this.logMessage(step.stepId, message, 'ERROR');

      this.client
        .finishTestItem(step.stepId, {
          status: TestStatus.INTERRUPTED,
        })
        .promise.catch(errorHandler);
    });
  }

  finishSuite(suiteTempId) {
    const status =
      this.collectionRunOptions.collection &&
      utils.getCollectionVariablesByKey('status', this.collectionRunOptions.collection.variables);

    this.client.finishTestItem(suiteTempId, { status }).promise.catch(errorHandler);
  }

  h9(v) {
    return v
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll("'", '&apos;')
      .replaceAll('"', '&quot;');
  }
}

module.exports = Reporter;
