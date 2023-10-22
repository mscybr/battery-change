// const qrcode = require("qrcode-terminal");
const qrimage = require("qr-image");
const express = require("express");
const app = express();
const port = 3030;
const accounts = {};

const { Client, LocalAuth, MessageMedia } = require("whatsapp-web.js");
const e = require("express");

function initialize_client(token, cb_ready) {
  // before firing this function check to see if the account obj prop exsists or not
  // let path = "./webjs_auth/sesssion-" + token;
  let client = new Client({
    restartOnAuthFail: true,
    // authStrategy: new LocalAuth({ clientId: token, dataPath: path }),
    puppeteer: {
      headless: true,
      ignoreHTTPSErrors: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    },
  });
  accounts[token].client = client;
  accounts[token].qrr = "";
  accounts[token].refreshes = 0;
  client.on("qr", (qr) => {
    accounts[token].qrr = qr;
    accounts[token].refreshes++;
    console.log("qr");
    // cb_no_auth();
  });

  client.initialize();

  client.on("disconnected", () => {
    console.log("Client is disconnected");
    accounts[token].destroying = true;
    client
      .destroy()
      .then(() => {
        res.send("successfully stopped");
        delete accounts[token];
      })
      .catch(() => {
        res.send("couldn't stopped");
      });
  });
  client.on("change_state", (state) => {
    console.log("state changed: " + state);
    // qrr = qr;
    // refreshes++;
  });
  client.on("QR_RECEIVED", () => {
    console.log("recieved qr");
  });
  client.on("LOADING_SCREEN", () => {
    console.log("loading screen");
  });

  client.on("ready", () => {
    console.log("Client is ready!");
    cb_ready();
  });

  client.on("authenticated", () => {
    console.log("Client is authed!");
    // cb_auth();
  });
}

app.get("/get_refreshes/:token", (req, res) => {
  res.send(`${accounts[req.params.token].refreshes}`);
});

app.get("/destroy/:token", (req, res) => {
  accounts[req.params.token].destroying = true;
  accounts[req.params.token].client
    .destroy()
    .then(() => {
      res.send("successfully stopped");
      delete accounts[req.params.token];
    })
    .catch(() => {
      res.send("couldn't stopped");
    });
});
app.get("/get_qr/:token", (req, res) => {
  function connected() {
    accounts[req.params.token].intializing = false;
  }
  function not_connected() {
    res.header("Content-Type: image/png");
    let img = qrimage.imageSync(accounts[req.params.token].qrr, {
      type: "png",
    });
    res.send(`
  <html>
  <body>
  <img src="data:image/png;base64,${Buffer.from(img).toString("base64")}">
  <script>
  let refreshes = ${accounts[req.params.token].refreshes};
  setInterval(()=>{
    location.href=location.href
      // fetch("./get_refreshes/${req.params.token}").then((r)=>{
      //     r.text().then((txt)=>{
      //         if (txt.trim() != refreshes){
      //             location.href=location.href
      //         }
      //     })
      // })
  },1000)
  </script>
  </body>
  </html>
      `);
  }
  if (accounts[req.params.token] == null) {
    accounts[req.params.token] = { intializing: true };
    initialize_client(req.params.token, connected);
    res.send("started connection");
  } else {
    if (accounts[req.params.token].destroying == null) {
      if (accounts[req.params.token].intializing) {
        not_connected();
      } else {
        connected();
        res.send("connected");
      }
    } else {
      res.send("Pending client stopping");
    }
  }
});

app.get("/get_status/:token", (req, res) => {
  if (accounts[req.params.token] != null) {
    if (accounts[req.params.token].intializing == false) {
      let client = accounts[req.params.token].client;
      client
        .getState()
        .then((state) => {
          res.send(state);
        })
        .catch(() => {
          res.send("unable to fetch state");
        });
    } else {
      res.send("pending connection");
    }
  } else {
    res.send("not started the client");
  }
});

app.get("/send_message/:token", (req, res) => {
  if (req.query.number && req.query.image_url) {
    if (
      accounts[req.params.token] != null &&
      accounts[req.params.token].destroying == null &&
      accounts[req.params.token].intializing == false
    ) {
      let client = accounts[req.params.token].client;
      client
        .getState()
        .then((state) => {
          if (state == "CONNECTED") {
            const number = req.query.number;
            const text = req.query.image_url;
            const chatId = number.substring(1) + "@c.us";
            if (req.query.is_text == null) {
              // sending media
              const media = MessageMedia.fromUrl(text)
                .then((media) => {
                  client
                    .sendMessage(chatId, media)
                    .then(() => {
                      res.send("sent");
                    })
                    .catch(() => {
                      res.send("connected but couldn't send text");
                    });
                })
                .catch(() => {
                  res.send("couldn't get media");
                });
            } else {
              // sending text
              client
                .sendMessage(chatId, text)
                .then(() => {
                  res.send("sent");
                })
                .catch(() => {
                  res.send("connected but couldn't send image");
                });
            }
          } else {
            res.send("not connected");
          }
        })
        .catch(() => {
          res.send("not sent due to unknown error");
        });
    } else {
      res.send("not started the client or client is being stopped");
    }
  }
});

app
  .listen(port, () => {
    console.log(`Example app listening on port ${port}`);
  })
  .setTimeout(15 * 1000);
