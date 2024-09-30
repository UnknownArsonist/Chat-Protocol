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
## Client
Running the client consists of connecting to the nodejs server via the https ip:port that it is running on. then inputting the corresponding websocket server and file server that you will connect to.
Finally, send public messages by simply typing into the textbox and clicking send
to send a "chat" type message, simply click the client buttons that show up, typing "/msg " before your message will then send the message to only those clients that are selected green.
