const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./db.sqlite");

// const qrcode = require("qrcode-terminal");
const qrimage = require("qr-image");
const express = require("express");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));
const app = express();
const port = 3000;
const WORKER = 2491190771271;
const ADMIN = 249119077127;

const { Client, LocalAuth, MessageMedia, Buttons } = require("whatsapp-web.js");
const client = new Client({
  authStrategy: new LocalAuth(),
  // restartOnAuthFail: true,
  puppeteer: {
    headless: true,
    ignoreHTTPSErrors: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--single-process", // <- this one doesn't works in Windows
      "--disable-gpu",
    ],
  },
});

// getDurationBetweenTwoPoints("12,15", "12.1,15.3").then(console.log);

let qrr = "";
let refreshes = 0;
client.on("qr", (qr) => {
  qrr = qr;
  console.log("qr");
  refreshes++;
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

client.on("message", (message) => {
  console.log("handling message");
  handle_message(message);
});

client.initialize();

client.on("ready", () => {
  console.log("Client is ready!");
});

app.get("/test_db", (req, res) => {
  console.log(req.query.sql);
  sql = decodeURIComponent(req.query.sql);
  db.serialize(() => {
    db.run(sql);
  });
});

app.get("/location/:id", (req, res) => {
  let worker_id = req.params.id;
  let long = req.query.long;
  let lat = req.query.lat;
  sql = `UPDATE worker SET lat_long=? WHERE id=?`;
  db.serialize(() => {
    db.run(sql, [lat + "," + long, worker_id]);
  });
  res.send("updated");
});

app.get("/test", (req, res) => {
  let msg = {
    _data: {
      id: {
        fromMe: false,
        remote: "249119077127@c.us",
        id: "A5851E6F203EB6B501974CFA41BC8154",
        _serialized: "false_249119077127@c.us_A5851E6F203EB6B501974CFA41BC8154",
      },
      viewed: false,
      body: "اسعار البطاريات",
      type: "text",
      subtype: "fanout",
      t: 1697347410,
      notifyName: "▲",
      from: "249119077127@c.us",
      to: "249116820968@c.us",
      self: "in",
      ack: 1,
      invis: false,
      isNewMsg: true,
      star: false,
      kicNotified: false,
      recvFresh: true,
      isFromTemplate: false,
      pollInvalidated: false,
      isSentCagPollCreation: false,
      latestEditMsgKey: null,
      latestEditSenderTimestampMs: null,
      mentionedJidList: [],
      groupMentions: [],
      isVcardOverMmsDocument: false,
      isForwarded: false,
      labels: [],
      hasReaction: false,
      productHeaderImageRejected: false,
      lastPlaybackProgress: 0,
      isDynamicReplyButtonsMsg: false,
      isMdHistoryMsg: false,
      stickerSentTs: 0,
      isAvatar: false,
      lastUpdateFromServerTs: 0,
      invokedBotWid: null,
      bizBotType: null,
      botResponseTargetId: null,
      botPluginType: null,
      botPluginReferenceIndex: null,
      botPluginSearchProvider: null,
      botPluginSearchUrl: null,
      requiresDirectConnection: false,
      links: [],
    },
    mediaKey: undefined,
    id: {
      fromMe: false,
      remote: "249119077127@c.us",
      id: "A5851E6F203EB6B501974CFA41BC8154",
      _serialized: "false_249119077127@c.us_A5851E6F203EB6B501974CFA41BC8154",
    },
    ack: 1,
    hasMedia: false,
    body: "اسعار البطاريات",
    type: "TEXT",
    timestamp: 1697347410,
    from: "249119077127@c.us",
    to: "249116820968@c.us",
    author: undefined,
    deviceType: "android",
    isForwarded: false,
    forwardingScore: 0,
    isStatus: false,
    isStarred: false,
    broadcast: undefined,
    fromMe: false,
    hasQuotedMsg: false,
    hasReaction: false,
    duration: undefined,
    location: undefined,
    vCards: [],
    inviteV4: undefined,
    mentionedIds: [],
    orderId: undefined,
    token: undefined,
    isGif: false,
    isEphemeral: undefined,
    links: [],
  };
  msg.reply = console.log;
  handle_message(msg);
});

app.get("/restart", (req, res) => {
  client.initialize();
  res.send("restarted");
});

app.get("/get_refreshes", (req, res) => {
  res.send(`${refreshes}`);
});
app.get("/get_qr", (req, res) => {
  res.header("Content-Type: image/png");
  let img = qrimage.imageSync(qrr, { type: "png" });

  res.send(`
    <html>
    <body>
    <img src="data:image/png;base64,${Buffer.from(img).toString("base64")}">
    <script>
    let refreshes = ${refreshes};
    setInterval(()=>{
        fetch("/get_refreshes").then((r)=>{
            r.text().then((txt)=>{
                if (txt.trim() != refreshes){
                    location.href=location.href
                }
            })

        })
    },1000)

    </script>
    </body>
    </html>
`);
});

//   res.send(img);
app.get("/send_message", (req, res) => {
  //   res.send(qr);
  //   console.log();
  if (req.query.number && req.query.image_url) {
    client
      .getState()
      .then((state) => {
        if (state == "CONNECTED") {
          const number = req.query.number;
          const text = req.query.image_url;
          const chatId = number.substring(1) + "@c.us";
          if (req.query.is_text == null) {
            // sending media
            const media = MessageMedia.fromUrl(text).then((media) => {
              client
                .sendMessage(chatId, media)
                .then(() => {
                  res.send("sent");
                })
                .catch(() => {
                  res.send("not sent");
                });
            });
          } else {
            // sending text
            client
              .sendMessage(chatId, text)
              .then(() => {
                res.send("sent");
              })
              .catch(() => {
                res.send("not sent");
              });
          }
        } else {
          res.send("not connected");
        }
      })
      .catch(() => {
        res.send("not sent");
      });
  }
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

function send_buttons(
  to,
  buttons,
  button_title = "",
  button_body = "",
  button_footer = ""
) {
  // let button = new Buttons(button_body, buttons, button_title, button_footer);
  let button = new Buttons(
    button_body,
    [{ body: "bt1" }, { body: "bt2" }, { body: "bt3" }],
    button_title,
    button_footer
  );
  console.log(to, "@c.us", " <- sent to");
  client.sendMessage((to + "@c.us").trim(), button);
}
function send_location(to, lat, long) {
  const location = new Location(lat, long);
  client.sendMessage(to, location);
}
function handle_message(message) {
  let sender = message.from.split("@")[0];
  let type = message.type;
  let location = {};
  let body = "";
  if (type.toLowerCase() == "location") {
    location = message.location;
  } else if (type.toLowerCase() == "text") {
    body = message.body;
  }

  // worker logic
  if (sender == WORKER) {
    let tasks_in_que = get_tasks_in_que(WORKER);
    // .length
    if (tasks_in_que.length > 0) {
      let current_taks = tasks_in_que[0];

      if (body == "تم انجاز العمل") {
        // end current task
        db.serialize(() => {
          db.run("DELETE FROM task WHERE id=$id", {
            $id: current_taks["id"],
          });
          db.run("UPDATE number SET state=0 WHERE number=$number", {
            $number: current_taks["number"],
          });
        });
        message.reply("تم تأكيد انهاء العملية");
        message.body = "";
        handle_message(nessage);
      } else {
        message.reply(
          `العمل الحالي خاص بالعميل: ${current_taks["number"]} وفي الموقع الأتي`
        );
        // TODO: create this function
        let location = current_taks["client_location"].split(",");
        send_location(WORKER, location[0], location[1]);
        message.reply(
          `الرجاء ارسال الرسالة الأتية بالنص لتأكيد انهاء العملية: تم انجاز العمل`
        );
      }
    } else {
      message.reply("حاليا ليس هناك اي عمل");
    }
  } else {
    // client logic
    let number_info;

    db.serialize(() => {
      let sql = "SELECT * FROM number WHERE number=?";
      db.get(sql, [sender], (err, row) => {
        if (err) {
          throw err;
        }
        number_info = row;
        // console.log(number_info);
        logic();
      });
    });
    function state2() {
      db.serialize(() => {
        let sql =
          "SELECT task.*, worker.lat_long AS worker_location, number.location AS client_location FROM task INNER JOIN worker ON worker.id=task.worker INNER JOIN number ON number.number=task.number WHERE task.status=0 ORDER BY task.id ASC";
        db.all(sql, [sender], (err, rows) => {
          task = rows[0];
          if (task["number"] == sender) {
            // TODO: make this function
            $duration_in_secs = getDurationBetweenTwoPoints(
              $tasks[0]["worker_location"],
              $tasks[0]["client_location"]
            );
            message.reply(`مندوبنا في طريقه اليك`);
          } else {
            duration_in_secs = 30 * 60 * rows.length;
            message.reply(
              // `المندوب قد يتأخر والوقت المتوقع لوصوله هو ${time_left($duration_in_secs)}`
              `المندوب قد يتأخر والوقت المتوقع لوصوله هو ${$duration_in_secs}`
            );
          }
        });
      });
    }
    function logic() {
      if (number_info != undefined) {
        let state = number_info["state"];
        if (state == 0) {
          if (body == "اسعار البطاريات") {
            message.reply("اسعارها : ...");
          } else if (body == "تبديل بطاريه") {
            message.reply("الرجاء ارسال موقعك");
            change_state(1, sender);
          } else if (body == "المساعده") {
            message.reply("الرجاء ارسال رسالة للدعم");
            change_state(3, sender);
          } else {
            send_menu(sender);
          }
        } else if (state == 1) {
          if (type.toLowerCase() == "location") {
            // TODO: send long, lat to this function to determine the city name
            // let city_name = getCityNameByLatitudeLongitude(  );
            let city_name = "ود مدني";
            db.serialize(() => {
              let sql = "SELECT * FROM city_coverage WHERE city=?";
              db.get(sql, [city_name], (err, row) => {
                if (err) {
                  throw err;
                }

                if (row.length == 0) {
                  message.reply("عذرا ولكنك خارج نطاق التغطية");
                  change_state(0, sender);
                } else {
                  db.get(
                    "SELECT * FROM task WHERE status=0 AND number=?",
                    [sender],
                    (err, row) => {
                      if (err) {
                        throw err;
                      }
                      if (row.length == 0) {
                        db.run(
                          "INSERT INTO task( number, worker ) VALUES( ?, 1 )",
                          [sender]
                        );
                        // TODO: add user location
                        db.run("UPDATE number SET location=? WHERE number=?", [
                          location.longitude + "," + location.latitude,
                          sender,
                        ]);
                        change_state(2, sender);
                        client.sendMessage(WORKER_NUMBER, "تم اضافة عمل جديد");
                        state2();
                      }
                    }
                  );
                }
              });
            });
          } else {
            message.reply("الرجاء ارسال موقعك");
          }
        } else if (state == 2) {
          state2();
        } else if (state == 3) {
          client.sendMessage(
            ADMIN_NUMBER,
            `العميل: ${sender} قام بأرسال الرسالة الأتية:\n${body}`
          );
          change_state(0, sender);
        }
      } else {
        // this number is not registered
        db.serialize(() => {
          db.run("INSERT INTO number ( number, state ) VALUES( ?, 0 )", [
            sender,
          ]);
        });
        // TODO: make button template
        send_menu(sender);
      }
    }
  }
}

function get_tasks_in_que(worker_number) {
  let tasks = [];
  db.serialize(() => {
    let sql =
      "SELECT task.*, number.number AS client_number,number.location AS client_location FROM task INNER JOIN number ON number.number=task.number WHERE task.status=0 ORDER BY task.id ASC";
    db.all(sql, [], (err, rows) => {
      if (err) {
        throw err;
      }
      tasks = rows;
      // rows.forEach((row) => {
      //   console.log(row.name);
      // });
    });
  });
  return tasks;
}

function change_state(state, number) {
  db.serialize(() => {
    let sql =
      "SELECT task.*, number.number AS client_number,number.location AS client_location FROM task INNER JOIN number ON number.number=task.number WHERE task.status=0 ORDER BY task.id ASC";
    db.run("UPDATE number SET state=? WHERE number=?", [state, number]);
  });
}

async function getDurationBetweenTwoPoints(from_latlong, to_latlong) {
  APIKEY = "AIzaSyAoRVSbRKIHJ2hqiy-Rv0rUQaVjdLOB6Rk"; // Replace this with your google maps api key

  googleMapsUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${from_latlong}&destination=${to_latlong}&language=ar&key=${APIKEY}`;

  response = await fetch(googleMapsUrl);
  response = await response.json();
  routes = response.routes;
  route = routes[0];
  legs = route["legs"];
  leg = legs[0];
  duration = leg["duration"];
  return duration["value"];
}

function send_menu(to) {
  console.log("sent button");
  // TODO: uncomment
  send_buttons(
    to,
    [
      { body: "اسعار البطاريات" },
      { body: "تبديل بطاريه" },
      { body: "المساعده" },
    ],
    "مرحبا بك الرجاء الأختيار من القائمة الأتية"
  );
}
