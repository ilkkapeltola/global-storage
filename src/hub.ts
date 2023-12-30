
var _allow: string = "";
var _allow_empty_origin: boolean;

interface hubOptionsInterface {
    allow?: string,
    allow_empty_origin?: boolean
}
/* init() takes opts as an argument
 * At the moment, opts can have two parameters: allow and allow_empty_origin
 * allow is a regex of the origins that are allowed to use the hub.
 * By default, all origins are allowed.
 * allow_empty_origin allows pages that don't send any referring data to be accepted.
 * This is not ideal, but you might need it for testing.
 */

export function init(opts: hubOptionsInterface = {}) {
    _allow = (!opts.allow) ? ".*" : opts.allow;
    _allow_empty_origin = (!opts.allow_empty_origin) ? false : opts.allow_empty_origin;

    if (document.referrer == '' && !_allow_empty_origin) {

        // This error occurs usually when you open the web page from your file system
        // into a web browser (i.e. not through a web server).
        throw new Error("Empty origin was not allowed by Hub. Check the 'allow_empty_origin' parameter of the hub.");

    } else if (document.referrer != '' && document.referrer.match(_allow) == null) {

        // This error occurs when the hub is not configured to accept the origin page.
        throw new Error("Origin not allowed by hub. Check the 'allow' parameter of the hub.");

    }  else {
        window.addEventListener('message', _listener, false);
        window.parent.postMessage('global-storage:ready', "*");
    }
}

// Handle incoming messages
function _listener(message: MessageEvent ) {
    var result, error;
    var origin = (message.origin == 'null' && _allow_empty_origin) ? '*' : message.origin;

    try {

        _checkOrigin(message);

        if(message.data.method === 'global-storage:set')
            result = _setItem(message);
        else if (message.data.method == 'global-storage:get')
            result = _getItem(message);
        else if (message.data.method == 'global-storage:delete')
            result = _removeItem(message);
        else if (message.data.method == 'global-storage:clear')
            result = _clearStorage(message);

    } catch(e) {
        error = e.message;
    }
    window.parent.postMessage({
        id: message.data.id,
        value: result,
        error: error
    }, origin);

}

//const atob = (str:string) => Buffer.from(str, 'base64').toString('binary');
//const btoa = (str:string) => Buffer.from(str, "binary").toString("base64");

function _checkOrigin(message: MessageEvent) {
    const _remote_host = _getDomain(message.origin);
    const _storeItem = window.localStorage.getItem(message.data.key);
    const _storeObject = (_storeItem == null) ? null : JSON.parse(atob( _storeItem ));

    if (_remote_host == null && _allow_empty_origin) {
        return; // bypass all origin checks
    } else if ( _remote_host.match(message.data.allowed_origin) == null) {
        throw new Error("Sender origin not allowed by sender itself. This is not allowed. \
        Change the 'allow' parameter of globalStorage.init() to match to your origin of " + _remote_host);
    } else if (_storeObject != null && _remote_host.match(_storeObject.allowed) == null ) {
        throw new Error("Key exists, but it is not allowed to access by your origin. \
        Use a different key, or manually clear the hub's localStorage.");
    } else if (_remote_host.match(_allow) == null) {
        throw new Error("Origin is not allowed by hub");
    }
}

function _setItem(message: MessageEvent) {
    var storeValue: string, error = null, returnValue = true;

    storeValue = btoa(
        JSON.stringify( {
            allowed: message.data.allowed_origin,
            value: message.data.value
        } )
    );

    window.localStorage.setItem(
        message.data.key,        
        storeValue
        );    

    return storeValue;
}

function _getItem(message: MessageEvent) {
    
    const storeItem = window.localStorage.getItem(message.data.key);

    var storeValue = null;

    if (storeItem == null) {
        return null;
    } else {
        try {
            storeValue = JSON.parse(atob(storeItem)).value;
        } catch (e) {
            console.error(e);
        }
    }

    return storeValue;
}

// Deletes the item from local storage
function _removeItem(message: MessageEvent) {
    if (window.localStorage.getItem(message.data.key) == null) {
        throw new Error('Key not found');
    } else {
        window.localStorage.removeItem(message.data.key);
    }
    return true;
}

function _clearStorage(message: MessageEvent) {
    const locanStorageEntries = Object.entries(localStorage);
    for (const idx in locanStorageEntries) {
        const key = locanStorageEntries[idx][0];
        try {
            const item = JSON.parse(atob(locanStorageEntries[idx][1]));
            if (message.origin.match(item.allowed_origin) != null ) {
                localStorage.removeItem(key);
            }
        } catch (e) { console.log(e); }        
    }

    return true;

}

function _getDomain(url: string) {
    if (url == "null") return null;
    const _url = new URL(url);
    const _hostname = _url.hostname;
    if (_hostname == 'localhost') return "localhost";
    try {
        return _hostname.match(/[^.]*(\.[^.]{2,4}(?:\.[^.]{2,3})?$|\.[^.]{2,8}$)/)[0];
    } catch(e) {
        throw new Error("getDomain");
    }
}