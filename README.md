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
## Client
Running the client consists of connecting to the nodejs server via the https ip:port that it is running on.
the 'server_ip' and 'server_ws' must be changed to the corresponding http server ip:port and websocket server ip:port that is hosted by the nodejs server.
