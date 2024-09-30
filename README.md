# Chat-Protocol
## Server
Running the server with nodejs requires the Installation of https://github.com/websockets/ws/tree/master?tab=readme-ov-file a nodejs Websocket library.
For ensured compatibility use nodejs version 12.0.0+
When running you may use optional arguments in the format of
```
nodejs server.js [<hosted_ip>] [<port>]
```
example:
```
nodejs server.js example.com 80
```
The file for the authorised servers is called authdServer.json and is to be populated in the format:
```
[
  {
    "ip":"<Address of the websocketServer hosted by this server>",
    "public_key":"<Server's public key in PEM format>"
  }
]
```
Example:
```
[
  {
    "ip":"ws//localhost:81",
    "public_key":"-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAoEWigTZy0S1+7qyezGUC6uUDHy7xWDDGdgsp+7gr9S7GmnvpnYX3LfPBjx4vZ5lc7+8zU3oSsOigudASc1UEqYyMt5fGkRiNYv7CKl7Jeiz/Ztt5GZKTxOBxFdyWg+upxEXk1OcF15G5LxkskrX4BseXf30N2Eg5qRqHArbhUyb12s9/R1nueCXZA5+9cWyEzC9GsxaWWV0SkXlUXrtQ0p37AQxLgm8Tvs54cZa4K4c2bnpWgD/hC0gGd7KXz5l0ByMEan+KVEyyca7pJryJIqmijx2dmrKVkxr8qSAFHAhhoiPx/pYcYiO01lNJ//x2Mt4hV1U3xby42AkDXcJtEwIDAQAB\n-----END PUBLIC KEY-----"
  }
]
```
## Client
Running the client consists of connecting to the nodejs server via the https ip:port that it is running on. then inputting the corresponding websocket server and file server that you will connect to.
Finally, send public messages by simply typing into the textbox and clicking send
to send a "chat" type message, simply click the client buttons that show up, typing "/msg " before your message will then send the message to only those clients that are selected green.
