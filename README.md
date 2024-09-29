# Chat-Protocol
## Server
Running the server with nodejs requires the Installation of https://github.com/websockets/ws/tree/master?tab=readme-ov-file a nodejs Websocket library.
The server.js must be edited to change the 'hosted_ip' variable to the external ip:port that is visible to the other connecting servers.
```
nodejs server.js
```
## Client
Running the client consists of connecting to the nodejs server via the https ip:port that it is running on.
the 'server_ip' and 'server_ws' must be changed to the corresponding http server ip:port and websocket server ip:port that is hosted by the nodejs server.
