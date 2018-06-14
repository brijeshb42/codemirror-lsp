export default class LanguageClient {
  constructor(rootUri='file:///workspace') {
    this.init();
    // this.onOpen = this.onOpen.bind(this);
    // this.onClose = this.onClose.bind(this);
    // this.onMessage = this.onMessage.bind(this);
    this.rootUri = rootUri;
  }

  init() {
    this.websocket = new WebSocket('ws://localhost:2087');
    this.websocket.addEventListener('open', this.onOpen);
    this.websocket.addEventListener('close', this.onClose);
    this.websocket.addEventListener('error', this.onClose);
    this.websocket.addEventListener('message', this.onMessage);

    this.methodId = 0;
    this.connected = false;
    this.initialized = false;
    this.serverCapabilities = null;
    this.enqueuedPromises = {};
    this._diagnosticListeners = [];
  }

  onOpen = () => {
    this.connected = true;

    if (this._connPromise) {
      this._connPromise.resolve();
    }
  };

  onClose = () => {
    this.connected = false;
    this.initialized = false;
    if (this._connPromise) {
      this._connPromise.reject();
    }
  };

  resolveConnection() {
    if (this.connected) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      this._connPromise = { resolve, reject };
    });
  }

  onMessage = (ev) => {
    const { data } = ev;
    const dataArr = data.split('\r\n\r\n');

    if (dataArr.length !== 2) {
      throw new Error('Invalid response from server');
    }

    const headersArr = dataArr[0].split('\r\n');
    const headers = {};

    headersArr.forEach(item => {
      const hi = item.split(':');

      if (hi.length !== 2) {
        return;
      }

      headers[hi[0].trim()] = hi[1].trim();
    });

    if (!headers['Content-Length']) {
      throw new Error('No Content-Length header in response');
    }

    const req = dataArr[1].trim().substr(0, parseInt(headers['Content-Length'], 10));

    try {
      const responseData = JSON.parse(req);

      if (typeof responseData.id !== 'undefined' && this.enqueuedPromises[responseData.id]) {
        const { resolve, reject } = this.enqueuedPromises[responseData.id];

      	if (typeof responseData.result !== 'undefined') {
      	  resolve(responseData.result);
      	} else {
      	  reject(responseData.error || {});
      	}

        delete this.enqueuedPromises[responseData.id];
      } else {
      	if (!responseData.method) {
      	  return;
      	}
      	switch(responseData.method) {
      	case 'textDocument/publishDiagnostics':
      	  this.dispatchDiagnostics(responseData.params);
      	  break;
      	default:
      	  break;
      	}
      }
    } catch(e) {
      console.log(e);
      throw new Error('Invalid response');
    }
  };

  send(method, params, useId = true, force = false) {
    if (!this.connected) {
      throw new Error('Socket not connected');
    }

    if (!force && !this.initialized) {
      throw new Error('Client not initialized');
    }

    const data = {
      method,
      params,
      jsonrpc: '2.0',
    };

    if (useId) {
      data.id = this.methodId++;
    }

    const dataStr = JSON.stringify(data);

    const requestData = `Content-Length: ${dataStr.length}\r\n\r\n${dataStr}`;
    this.websocket.send(requestData);

    return new Promise((resolve, reject) => {
      if (!useId) {
        resolve();
      } else {
      	this.enqueuedPromises[data.id] = {
      	  resolve,
      	  reject,
      	};
      }
    });
  }

  initialize() {
    if (this.initialized) {
      return Promise.reject();
    }
    
    const params = {
      rootUri: this.rootUri,
      trace: 'verbose',
      capabilities: {},
    };
    const promise = this.send('initialize', params, true, true);
    promise.then(res => {
      this.initialized = true;
      this.capabilities = res.capabilities || {};
      this.send('initialized', {}, false);
    });
    promise.catch(err => {});
    return promise;
  }

  dispatchDiagnostics(params) {
    this._diagnosticListeners.forEach(listener => listener(params));
  }

  addDiagnosticListener(listener) {
    if (typeof listener !== 'function') {
      return;
    }

    this._diagnosticListeners.push(listener);
  }

  removeDiagnosticListener(listener) {
    this._diagnosticListeners = this._diagnosticListeners.filter(l => l !== listener);
  }
}
