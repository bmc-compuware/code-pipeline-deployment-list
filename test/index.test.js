/**
* ALL BMC SOFTWARE PRODUCTS LISTED WITHIN THE MATERIALS ARE TRADEMARKS OF BMC SOFTWARE, INC. ALL OTHER COMPANY PRODUCT NAMES
* ARE TRADEMARKS OF THEIR RESPECTIVE OWNERS.
*
* (c) Copyright 2023 BMC Software, Inc.
* This code is licensed under MIT license (see LICENSE.txt for details)
*/
var index = require('../index.js');
const chai = require('chai');
var assert = chai.assert;
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();

describe('#validateRequiredParms(ces_url, ces_token, srid)', function () 
{
  it(' should return false - null passed in', function ()
   {
    let output = index.validateRequiredParms(null, null, null);
    assert.isFalse(output);
  });

  it(' should return false - undefined passed in', function ()
  {
   let output = index.validateRequiredParms(undefined, undefined, undefined);
   assert.isFalse(output);
  });

  it(' should return false - "" passed in', function ()
  {
   let output = index.validateRequiredParms("", "", "");
   assert.isFalse(output);
  });

  it(' should return false - "" passed in', function ()
  {
   let output = index.validateRequiredParms("http://CES:48080/", "", "");
   assert.isFalse(output);
  });

  it(' should return false - "" passed in', function ()
  {
   let output = index.validateRequiredParms("", "abcd", "");
   assert.isFalse(output);
  });

  it(' should return false - "" passed in', function ()
  {
   let output = index.validateRequiredParms("", "", "cw09");
   assert.isFalse(output);
  });

  it(' should return false - "" passed in', function ()
  {
   let output = index.validateRequiredParms("http://CES:48080/", "abcd", "cw09");
   assert.isTrue(output);
  });
});

describe('#handleResponseBody(responseBody)', function () {
  it('should throw an exception - responseBody undefined', function () {
    assert.throw(function () { index.handleResponseBody(undefined) }, index.DeploymentListFailureException, 'No response was received from the deployment list request.');
  });

  it('should return successfully', function () {
    let responseBody = {
      "deployments": {
        "requestId": 245274,
        "setId": "S000385216",
        "environment": "PLAY",
        "status": "COMPLETED",
        "description": "",
        "createDateTime": "2023-08-14 09:48:11"
      }
    };
    let output = index.handleResponseBody(responseBody);
    assert.strictEqual(output, responseBody);
  });

  it('should handle an empty message array', function () {
    let responseBody = {
      setId: 'S000241246',
      url: 'http://ces:48226/ispw/cw09-47623/sets/S000241246',
      awaitStatus: {
        generateFailedCount: 0,
        generateSuccessCount: 1,
        hasFailures: false,
        statusMsg: 'ISPW: Set S000241246 - The generate request completed successfully for KEEPRG2 in PLAY004799. Job ID and name: J0861367 AMIKEE0G',
        taskCount: 1
      }
    };
    let output = index.handleResponseBody(responseBody);
    assert.strictEqual(output, responseBody);
  });
});

describe('Main execution flow', function () {
  let coreStub, utilsStub, axiosStub, indexModule;

  beforeEach(function () {
    coreStub = {
      info: sinon.stub(),
      setOutput: sinon.stub(),
      setFailed: sinon.stub(),
      debug: sinon.stub()
    };

    utilsStub = {
      retrieveInputs: sinon.stub(),
      convertObjectToJson: sinon.stub().returns('{}'),
      stringHasContent: sinon.stub()
    };

    axiosStub = {
      default: {
        get: sinon.stub()
      }
    };
  });

  afterEach(function () {
    sinon.restore();
  });

  it('should successfully retrieve deployment list', async function () {
    utilsStub.retrieveInputs.returns({
      ces_url: 'http://ces:48080',
      ces_token: 'token123',
      srid: 'cw09',
      todaysDate: '2023-08-14',
      requestId: '245274'
    });
    
    utilsStub.stringHasContent.callsFake((val) => val && val.length > 0);

    const responseData = {
      deployments: [{
        requestId: 245274,
        setId: 'S000385216',
        environment: 'PLAY',
        status: 'COMPLETED'
      }]
    };

    axiosStub.default.get.resolves({ data: responseData });

    indexModule = proxyquire('../index.js', {
      '@actions/core': coreStub,
      '@bmc-compuware/ispw-action-utilities': utilsStub,
      'axios': axiosStub
    });

    // Wait for async operations to complete
    await new Promise(resolve => setTimeout(resolve, 100));

    assert.isTrue(coreStub.info.called);
  });

  it('should handle error response with response data', async function () {
    utilsStub.retrieveInputs.returns({
      ces_url: 'http://ces:48080',
      ces_token: 'token123',
      srid: 'cw09'
    });
    
    utilsStub.stringHasContent.callsFake((val) => val && val.length > 0);

    const errorResponse = {
      response: {
        status: 500,
        data: {
          message: 'Internal server error'
        }
      }
    };

    axiosStub.default.get.rejects(errorResponse);

    indexModule = proxyquire('../index.js', {
      '@actions/core': coreStub,
      '@bmc-compuware/ispw-action-utilities': utilsStub,
      'axios': axiosStub
    });

    // Wait for async operations to complete
    await new Promise(resolve => setTimeout(resolve, 100));

    assert.isTrue(coreStub.setFailed.called);
  });

  it('should handle error without response data', async function () {
    utilsStub.retrieveInputs.returns({
      ces_url: 'http://ces:48080',
      ces_token: 'token123',
      srid: 'cw09'
    });
    
    utilsStub.stringHasContent.callsFake((val) => val && val.length > 0);

    const networkError = new Error('Network error');

    axiosStub.default.get.rejects(networkError);

    indexModule = proxyquire('../index.js', {
      '@actions/core': coreStub,
      '@bmc-compuware/ispw-action-utilities': utilsStub,
      'axios': axiosStub
    });

    // Wait for async operations to complete
    await new Promise(resolve => setTimeout(resolve, 100));

    assert.isTrue(coreStub.setFailed.called);
  });

  it('should handle MissingArgumentException', async function () {
    utilsStub.retrieveInputs.returns({
      ces_url: '',
      ces_token: '',
      srid: ''
    });
    
    utilsStub.stringHasContent.returns(false);

    indexModule = proxyquire('../index.js', {
      '@actions/core': coreStub,
      '@bmc-compuware/ispw-action-utilities': utilsStub,
      'axios': axiosStub
    });

    // Wait for async operations to complete
    await new Promise(resolve => setTimeout(resolve, 100));

    assert.isTrue(coreStub.setFailed.called);
  });
});

describe('#prepareRequestQueryPath(inputs)', function () {
  let utilsStub, coreStub;

  beforeEach(function () {
    utilsStub = {
      stringHasContent: sinon.stub(),
      retrieveInputs: sinon.stub().returns({}),
      convertObjectToJson: sinon.stub().returns('{}')
    };

    coreStub = {
      info: sinon.stub(),
      debug: sinon.stub(),
      setOutput: sinon.stub(),
      setFailed: sinon.stub()
    };
  });

  afterEach(function () {
    sinon.restore();
  });

  it('should return "?" when no inputs have content', function () {
    utilsStub.stringHasContent.returns(false);
    
    const indexModule = proxyquire('../index.js', {
      '@bmc-compuware/ispw-action-utilities': utilsStub,
      '@actions/core': coreStub
    });

    const inputs = {
      todaysDate: '',
      priorWeek: '',
      startDate: '',
      endDate: '',
      requestId: '',
      setId: '',
      environment: '',
      status: ''
    };

    const result = indexModule.prepareRequestQueryPath(inputs);
    assert.strictEqual(result, '');
  });

  it('should build query path with todaysDate', function () {
    utilsStub.stringHasContent.callsFake((val) => val === '2023-08-14');
    
    const indexModule = proxyquire('../index.js', {
      '@bmc-compuware/ispw-action-utilities': utilsStub,
      '@actions/core': coreStub
    });

    const inputs = {
      todaysDate: '2023-08-14',
      priorWeek: '',
      startDate: '',
      endDate: '',
      requestId: '',
      setId: '',
      environment: '',
      status: ''
    };

    const result = indexModule.prepareRequestQueryPath(inputs);
    assert.strictEqual(result, '?todaysDate=2023-08-14');
  });

  it('should build query path with priorWeek', function () {
    utilsStub.stringHasContent.callsFake((val) => val === '7');
    
    const indexModule = proxyquire('../index.js', {
      '@bmc-compuware/ispw-action-utilities': utilsStub,
      '@actions/core': coreStub
    });

    const inputs = {
      todaysDate: '',
      priorWeek: '7',
      startDate: '',
      endDate: '',
      requestId: '',
      setId: '',
      environment: '',
      status: ''
    };

    const result = indexModule.prepareRequestQueryPath(inputs);
    assert.strictEqual(result, '?priorWeek=7');
  });

  it('should build query path with startDate and endDate', function () {
    utilsStub.stringHasContent.callsFake((val) => val === '2023-08-01' || val === '2023-08-14');
    
    const indexModule = proxyquire('../index.js', {
      '@bmc-compuware/ispw-action-utilities': utilsStub,
      '@actions/core': coreStub
    });

    const inputs = {
      todaysDate: '',
      priorWeek: '',
      startDate: '2023-08-01',
      endDate: '2023-08-14',
      requestId: '',
      setId: '',
      environment: '',
      status: ''
    };

    const result = indexModule.prepareRequestQueryPath(inputs);
    assert.strictEqual(result, '?startDate=2023-08-01&endDate=2023-08-14');
  });

  it('should build query path with requestId', function () {
    utilsStub.stringHasContent.callsFake((val) => val === '245274');
    
    const indexModule = proxyquire('../index.js', {
      '@bmc-compuware/ispw-action-utilities': utilsStub,
      '@actions/core': coreStub
    });

    const inputs = {
      todaysDate: '',
      priorWeek: '',
      startDate: '',
      endDate: '',
      requestId: '245274',
      setId: '',
      environment: '',
      status: ''
    };

    const result = indexModule.prepareRequestQueryPath(inputs);
    assert.strictEqual(result, '?requestId=245274');
  });

  it('should build query path with setId', function () {
    utilsStub.stringHasContent.callsFake((val) => val === 'S000385216');
    
    const indexModule = proxyquire('../index.js', {
      '@bmc-compuware/ispw-action-utilities': utilsStub,
      '@actions/core': coreStub
    });

    const inputs = {
      todaysDate: '',
      priorWeek: '',
      startDate: '',
      endDate: '',
      requestId: '',
      setId: 'S000385216',
      environment: '',
      status: ''
    };

    const result = indexModule.prepareRequestQueryPath(inputs);
    assert.strictEqual(result, '?setId=S000385216');
  });

  it('should build query path with environment', function () {
    utilsStub.stringHasContent.callsFake((val) => val === 'PLAY');
    
    const indexModule = proxyquire('../index.js', {
      '@bmc-compuware/ispw-action-utilities': utilsStub,
      '@actions/core': coreStub
    });

    const inputs = {
      todaysDate: '',
      priorWeek: '',
      startDate: '',
      endDate: '',
      requestId: '',
      setId: '',
      environment: 'PLAY',
      status: ''
    };

    const result = indexModule.prepareRequestQueryPath(inputs);
    assert.strictEqual(result, '?environment=PLAY');
  });

  it('should build query path with status', function () {
    utilsStub.stringHasContent.callsFake((val) => val === 'COMPLETED');
    
    const indexModule = proxyquire('../index.js', {
      '@bmc-compuware/ispw-action-utilities': utilsStub,
      '@actions/core': coreStub
    });

    const inputs = {
      todaysDate: '',
      priorWeek: '',
      startDate: '',
      endDate: '',
      requestId: '',
      setId: '',
      environment: '',
      status: 'COMPLETED'
    };

    const result = indexModule.prepareRequestQueryPath(inputs);
    assert.strictEqual(result, '?status=COMPLETED');
  });

  it('should build query path with multiple parameters', function () {
    utilsStub.stringHasContent.callsFake((val) => 
      val === '2023-08-14' || val === 'PLAY' || val === 'COMPLETED'
    );
    
    const indexModule = proxyquire('../index.js', {
      '@bmc-compuware/ispw-action-utilities': utilsStub,
      '@actions/core': coreStub
    });

    const inputs = {
      todaysDate: '2023-08-14',
      priorWeek: '',
      startDate: '',
      endDate: '',
      requestId: '',
      setId: '',
      environment: 'PLAY',
      status: 'COMPLETED'
    };

    const result = indexModule.prepareRequestQueryPath(inputs);
    assert.strictEqual(result, '?todaysDate=2023-08-14&environment=PLAY&status=COMPLETED');
  });

  it('should build query path with all parameters', function () {
    utilsStub.stringHasContent.returns(true);
    
    const indexModule = proxyquire('../index.js', {
      '@bmc-compuware/ispw-action-utilities': utilsStub,
      '@actions/core': coreStub
    });

    const inputs = {
      todaysDate: '2023-08-14',
      priorWeek: '7',
      startDate: '2023-08-01',
      endDate: '2023-08-14',
      requestId: '245274',
      setId: 'S000385216',
      environment: 'PLAY',
      status: 'COMPLETED'
    };

    const result = indexModule.prepareRequestQueryPath(inputs);
    assert.include(result, 'todaysDate=2023-08-14');
    assert.include(result, 'priorWeek=7');
    assert.include(result, 'startDate=2023-08-01');
    assert.include(result, 'endDate=2023-08-14');
    assert.include(result, 'requestId=245274');
    assert.include(result, 'setId=S000385216');
    assert.include(result, 'environment=PLAY');
    assert.include(result, 'status=COMPLETED');
  });
});

describe('#prepareRequestUrl(cesUrl, requestBasePath, requestQueryPath)', function () {
  let coreStub, utilsStub, indexModule;

  beforeEach(function () {
    coreStub = {
      info: sinon.stub(),
      debug: sinon.stub(),
      setOutput: sinon.stub(),
      setFailed: sinon.stub()
    };

    utilsStub = {
      retrieveInputs: sinon.stub().returns({}),
      convertObjectToJson: sinon.stub().returns('{}'),
      stringHasContent: sinon.stub().returns(false)
    };

    indexModule = proxyquire('../index.js', {
      '@actions/core': coreStub,
      '@bmc-compuware/ispw-action-utilities': utilsStub
    });
  });

  afterEach(function () {
    sinon.restore();
  });

  it('should remove trailing /compuware from URL', function () {
    const cesUrl = 'http://ces:48080/compuware';
    const requestBasePath = '/ispw/cw09/deployments';
    const requestQueryPath = '?todaysDate=2023-08-14';

    const result = indexModule.prepareRequestUrl(cesUrl, requestBasePath, requestQueryPath);
    assert.strictEqual(result.href, 'http://ces:48080/ispw/cw09/deployments?todaysDate=2023-08-14');
  });

  it('should remove trailing /bmc from URL', function () {
    const cesUrl = 'http://ces:48080/bmc';
    const requestBasePath = '/ispw/cw09/deployments';
    const requestQueryPath = '?todaysDate=2023-08-14';

    const result = indexModule.prepareRequestUrl(cesUrl, requestBasePath, requestQueryPath);
    assert.strictEqual(result.href, 'http://ces:48080/ispw/cw09/deployments?todaysDate=2023-08-14');
  });

  it('should remove trailing slash from URL', function () {
    const cesUrl = 'http://ces:48080/';
    const requestBasePath = '/ispw/cw09/deployments';
    const requestQueryPath = '?todaysDate=2023-08-14';

    const result = indexModule.prepareRequestUrl(cesUrl, requestBasePath, requestQueryPath);
    assert.strictEqual(result.href, 'http://ces:48080/ispw/cw09/deployments?todaysDate=2023-08-14');
  });

  it('should handle URL without trailing characters', function () {
    const cesUrl = 'http://ces:48080';
    const requestBasePath = '/ispw/cw09/deployments';
    const requestQueryPath = '?todaysDate=2023-08-14';

    const result = indexModule.prepareRequestUrl(cesUrl, requestBasePath, requestQueryPath);
    assert.strictEqual(result.href, 'http://ces:48080/ispw/cw09/deployments?todaysDate=2023-08-14');
  });

  it('should handle uppercase /Compuware in URL', function () {
    const cesUrl = 'http://ces:48080/Compuware';
    const requestBasePath = '/ispw/cw09/deployments';
    const requestQueryPath = '?todaysDate=2023-08-14';

    const result = indexModule.prepareRequestUrl(cesUrl, requestBasePath, requestQueryPath);
    assert.strictEqual(result.href, 'http://ces:48080/ispw/cw09/deployments?todaysDate=2023-08-14');
  });

  it('should handle mixed case /BMC in URL', function () {
    const cesUrl = 'http://ces:48080/BMC';
    const requestBasePath = '/ispw/cw09/deployments';
    const requestQueryPath = '?todaysDate=2023-08-14';

    const result = indexModule.prepareRequestUrl(cesUrl, requestBasePath, requestQueryPath);
    assert.strictEqual(result.href, 'http://ces:48080/ispw/cw09/deployments?todaysDate=2023-08-14');
  });

  it('should return a URL object', function () {
    const cesUrl = 'http://ces:48080';
    const requestBasePath = '/ispw/cw09/deployments';
    const requestQueryPath = '';

    const result = indexModule.prepareRequestUrl(cesUrl, requestBasePath, requestQueryPath);
    assert.instanceOf(result, URL);
  });
});

describe('#setOutputs(core, responseBody)', function () {
  let coreStub, utilsStub, indexModule;

  beforeEach(function () {
    coreStub = {
      setOutput: sinon.stub(),
      info: sinon.stub(),
      debug: sinon.stub(),
      setFailed: sinon.stub()
    };

    utilsStub = {
      convertObjectToJson: sinon.stub().returns('{"test": "data"}'),
      stringHasContent: sinon.stub(),
      retrieveInputs: sinon.stub().returns({})
    };

    indexModule = proxyquire('../index.js', {
      '@actions/core': coreStub,
      '@bmc-compuware/ispw-action-utilities': utilsStub
    });
  });

  afterEach(function () {
    sinon.restore();
  });

  it('should set output_json and is_timed_out=false when message does not contain "timed out"', function () {
    utilsStub.stringHasContent.returns(true);

    const responseBody = {
      message: 'Request completed successfully',
      deployments: []
    };

    indexModule.setOutputs(coreStub, responseBody);
    
    assert.isTrue(coreStub.setOutput.calledWith('output_json', '{"test": "data"}'));
    assert.isTrue(coreStub.setOutput.calledWith('is_timed_out', false));
  });

  it('should set is_timed_out=true when message contains "timed out"', function () {
    utilsStub.stringHasContent.returns(true);

    const responseBody = {
      message: 'Request timed out after 30 seconds',
      deployments: []
    };

    indexModule.setOutputs(coreStub, responseBody);
    
    assert.isTrue(coreStub.setOutput.calledWith('is_timed_out', true));
  });

  it('should handle responseBody without message', function () {
    utilsStub.stringHasContent.returns(false);

    const responseBody = {
      deployments: []
    };

    indexModule.setOutputs(coreStub, responseBody);
    
    assert.isTrue(coreStub.setOutput.calledWith('output_json', '{"test": "data"}'));
    assert.isTrue(coreStub.setOutput.calledWith('is_timed_out', false));
  });

  it('should handle undefined responseBody gracefully', function () {
    indexModule.setOutputs(coreStub, undefined);
    
    assert.isFalse(coreStub.setOutput.called);
  });
});

describe('#getHttpGetPromise(requestUrl, token)', function () {
  let axiosStub, coreStub, utilsStub, indexModule;

  beforeEach(function () {
    axiosStub = {
      default: {
        get: sinon.stub()
      }
    };

    coreStub = {
      info: sinon.stub(),
      debug: sinon.stub(),
      setOutput: sinon.stub(),
      setFailed: sinon.stub()
    };

    utilsStub = {
      retrieveInputs: sinon.stub().returns({}),
      convertObjectToJson: sinon.stub().returns('{}'),
      stringHasContent: sinon.stub().returns(false)
    };

    indexModule = proxyquire('../index.js', {
      'axios': axiosStub,
      '@actions/core': coreStub,
      '@bmc-compuware/ispw-action-utilities': utilsStub
    });
  });

  afterEach(function () {
    sinon.restore();
  });

  it('should call axios.get with correct parameters', function () {
    const requestUrl = new URL('http://ces:48080/ispw/cw09/deployments');
    const token = 'token123';

    axiosStub.default.get.resolves({ data: {} });

    indexModule.getHttpGetPromise(requestUrl, token);

    assert.isTrue(axiosStub.default.get.calledOnce);
    assert.isTrue(axiosStub.default.get.calledWith(requestUrl.href));
    
    const callArgs = axiosStub.default.get.getCall(0).args;
    assert.strictEqual(callArgs[0], requestUrl.href);
    assert.deepEqual(callArgs[1].headers, {
      'Content-Type': 'application/json',
      'authorization': token
    });
  });

  it('should return a promise', function () {
    const requestUrl = new URL('http://ces:48080/ispw/cw09/deployments');
    const token = 'token123';

    axiosStub.default.get.resolves({ data: {} });

    const result = indexModule.getHttpGetPromise(requestUrl, token);

    assert.instanceOf(result, Promise);
  });
});