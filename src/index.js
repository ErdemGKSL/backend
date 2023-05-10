const express = require('express');
const app = express();

app.use(express.json());

app.options("*", (req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "x-acord-token, content-type");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.sendStatus(200);
});

app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));

app.use("/", require("./routes/index.js"));
app.use("/static", express.static(`${process.cwd()}/static`));


app.listen(2023, () => console.log("*:2023"));

// init discord bot
require("./discord");

// init pg backup
require("./backup");

// init checks
require("./checks");