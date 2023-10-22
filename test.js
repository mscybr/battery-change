const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./db.sqlite");

db.serialize(() => {
  db.run(
    "CREATE TABLE `city_coverage` (`id` INTEGER PRIMARY KEY,`city` varchar(255) NOT NULL) "
  );
  db.run(
    "CREATE TABLE `number` ( `id` INTEGER PRIMARY KEY, `number` varchar(255) NOT NULL, `state` int(2) NOT NULL DEFAULT 0, `location` varchar(255) DEFAULT NULL ) ;"
  );
  db.run(
    "CREATE TABLE `task` (`id`  INTEGER PRIMARY KEY, `number` varchar(255) NOT NULL, `status` tinyint(1) NOT NULL DEFAULT 0, `worker` int(255) NOT NULL DEFAULT 1) ;"
  );
  db.run(
    "CREATE TABLE `worker` (`id` INTEGER PRIMARY KEY,`name` varchar(255) NOT NULL, `lat_long` varchar(255) DEFAULT NULL)"
  );

  // const stmt = db.prepare("INSERT INTO lorem VALUES (?)");
  // for (let i = 0; i < 10; i++) {
  //   stmt.run("Ipsum " + i);
  // }
  // stmt.finalize();

  // db.each("SELECT rowid AS id, info FROM lorem", (err, row) => {
  //   console.log(row.id + ": " + row.info);
  // });
});

db.close();
