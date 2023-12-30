/*
 * Author: Ilkka Peltola
 * 
 * Heavily influenced by Zendesk's cross storage: https://github.com/zendesk/cross-storage/
 * 
 * Difference in this library is, that Hub does not control access rights, but instead the client
 * sets access rights on each record. When the record is read, hub ensures that parent window
 * was granted access.
 * 
 * This makes it possible to use a single hub. You can just use the code and re-use a hub that's
 * already hosted, simplifying setup.
 * 
 */


// If hub URL is not provided, use the one from CDN
var _hubUrl: string = "https://cdn.ilkkapeltola.com/global-storage/latest/hub.html";
// a place to store callback functions when making requests to the Hub
var   _requests: {[k:string]: Function} = {};
// set to true when Hub responds with ready
var   _ready: boolean = false;
const _hostname = (document.location.hostname == "") ? 'localhost' : document.location.hostname;
// the IFrame to hold the Hub
var   _frame: HTMLIFrameElement;
// Has init been called? If so, don't create another IFrame
var   _initialized: boolean = false;
// Style the IFrame so it won't be visible
const _frameStyle = 'display: none; position: absolute; top: -999px; left: -999px;';
// Keep count of requests, in case there are multiple simultaneous ones.
var   _count = 0;
// Timeout for when a request fails
const _timeoutMs = 1000;
// When storing values to Hub, the allowed origins to access the saved values
var   _allow_regex: string;

interface globalStorageOptions {
    url?: string,
    allow?: string
}

export function init(opts: globalStorageOptions = {}) {
    _hubUrl = (!opts.url) ? _hubUrl : opts.url;
    _allow_regex = (!opts.allow) ? _getDomain(_hostname) + "$" : opts.allow;
    // We want the current origin to also match the opts.allow.
    if (_getDomain(_hostname).match(_allow_regex) == null) {
        
        console.error("Current page is not matching the allow parameter.\
        This is not allowed as any key set on this page would not be re-writeable again.");
        return;
    }

    // initialize only once
    if(!_initialized) {
        window.addEventListener('message', _listener, false);
        _frame = _createFrame(_hubUrl);
        _initialized = true;
        var timeout: number;

        // Let's return a promise that gets resolved when hub sends it's ready
        return new Promise((res, rej) => {

            // I want to time-out if Hub doesn't get ready in time.
            timeout = window.setTimeout(function() {
                if(!_requests["connect"]) return;
                delete _requests["connect"];
                rej(new Error('Hub timed out. Init failed.'));
            }, _timeoutMs);

            /* We're storing a callback function in _requests["connect"] that will
             * be called by _listener when hub is ready. When called, we set _ready
             * to true and clear the timeout.
             */
            _requests["connect"] = function (result: string) {
                _ready = true;
                clearTimeout(timeout);
                delete _requests["connect"];
                res("ready");
            }

        });
    }
    

}

function _listener(message: any) {
    // Listen for the first message from Hub, which hopefully is ready
    if (message.data == 'global-storage:ready') {
        _requests["connect"]("ready");
    }
    
    // When we receive messages from Hub, they carry a request ID
    // This ID maps to a callback function in _requests. Call it to resolve the pending Promise.
    if (_requests[message.data.id]) {
        _requests[message.data.id](message.data.value, message.data.error);
    }
}

function _request(method: string, params: any) {

    _count++;
    const requestId = "global-storage-request:" + _count;
    var timeout: number;

    return new Promise(
        (res, rej) => {

            if (!_ready) {
                rej(new Error ("Not ready yet. Did you forget to call init() \
                or didn't wait for the Promise to resolve?"));
                return;
            }

            // Again, if promise isn't resolved in time, reject it with a timeout
            timeout = window.setTimeout(function() {
                if(!_requests[requestId]) return;
                rej(new Error('Timeout'));
            }, _timeoutMs);

            /* Store a callback function with the requestId:count in _requests
             * When the hub responds, we will be able to call the callback function
             * And thus resolve the pending Promise.
             */
            _requests[requestId] = function (result: any, error: string) {
                clearTimeout(timeout);
                delete _requests[requestId];
                if (error != null) {
                    rej(error);
                    return;
                }

                try {
                    res(result);
                } catch (e) {
                    console.error(e);
                }
                
            };
            const targetUrl = new URL(_hubUrl);

            _frame.contentWindow.postMessage(
                {
                    id: requestId,
                    allowed_origin: _allow_regex,
                    method: method,
                    key: params.key,
                    value: params.value
                }, targetUrl.origin
            );

        }
    );
    
}

function _createFrame(url: string): HTMLIFrameElement {
    var frame: HTMLIFrameElement;
    frame = window.document.createElement('iframe');
    frame.setAttribute('style', _frameStyle);
    window.document.body.appendChild(frame);
    frame.src = url;
    return frame;
}

export function getItem(key: string) {
    return _request("global-storage:get", {key: key});
}

export function setItem(key: string, value: any) {
    return _request('global-storage:set', {key: key, value: value});
}

export function removeItem(key: string) {
    return _request('global-storage:delete', {key: key});
}

export function clear() {
    return _request('global-storage:clear', {key: "*"})
}

function _getDomain(url: string) {
    if (url == 'localhost') return "localhost";
    url = (url.match('^http') == null ) ? document.location.protocol + "//" + url : url;
    if (!url) return;
  
    var a = document.createElement('a');
    a.href = url;
    
    try {  
      return a.hostname.match(/[^.]*(\.[^.]{2,4}(?:\.[^.]{2,3})?$|\.[^.]{2,8}$)/)[0];
    } catch(e) {}
}