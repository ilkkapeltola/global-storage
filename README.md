# unLocalStorage

## Installation

clone the repository and run

```
npm install
npm run build
```

You'll find the required javascript files under ./dist/

## Include from CDN

You are able to just include the file from CDN:
https://cdn.ilkkapeltola.com/global-storage/latest/globalStorage.js

Doing so will work just fine, but it relies on a hosted hub HTML document.

## Usage
### Quick start

To use globalStorage, you can simply include the latest javascript from CDN, without any configurations, and it will work.

Here's an example:

You can do this in one page

```
<script src="https://cdn.ilkkapeltola.com/global-storage/latest/globalStorage.js"></script>
<script>
    globalStorage.init().then(() => {
        globalStorage.setItem("foo", "car");
    });
</script>
```

And this in another

```
<script src="https://cdn.ilkkapeltola.com/global-storage/latest/globalStorage.js"></script>
<script>
    globalStorage.init().then( () => {
            return globalStorage.getItem("foo");
        }).then( (r) => {
            console.log(r);
        });
</script>
```

### Configuration

#### The client

The client, globalStorage, accepts a single options object parameter in the init method.
The options object has two keys, both optional:

```javascript
const opts = {
    url: "https://url.to.the/hub.html",
    allow: "yourdomain.com"
}

globalStorage.init(opts).then(() => {
    // stuff to do after init
})
```

The `url` key stores the URL to the hub. If it is not provided, a default url to the hosted hub will be used.
The `allow` key stores the regex for allowed origins, to be saved with each stored keys. The hub will not allow reading keys where the stored `allow` regex does not match the requesting origin. By default the `allow` is set to your top level domain, so as long as the requests come from the same domain or its subdomains, they will be allowed. You can however, specify the allow regex to match multiple domains.

#### The hub

The hub, globalStorageHub, accepts also a single options object parameter in the init method.
The hub options object has two keys, also optional:

```javascript
const opts = {
    allow: "yourdomain.com",
    allow_empty_origin: false
}

globalStorageHub.init(opts);
```

When the client calls `init()`, an IFrame is created, into which the hub is loaded. When the hub calls `init()`, and the `allow` parameter is passed, the hub checks if the `document.referrer` (which is the parent window URL) matches the allow regex. If not, the hub refuses to initialize and will not accept any requests.

If for some reason the postMessage the IFrame receives doesn't carry `origin` information (this happens for example if the client HTML file was run from filesystem and not through a web server), by default these requests are rejected. However, if you wish to accept these requests by the Hub, set allow_empty_origin to true.