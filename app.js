const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const path = require("path");
const fs = require("fs");
const { clearImage } = require("./util/file");
// const feedRoutes = require("./routes/feed");
// const authRoutes = require("./routes/auth");
const mongoose = require("mongoose");
const multer = require("multer");
const { graphqlHTTP } = require("express-graphql");
const graphqlSchema = require("./graphql/schema");
const graphqlResolver = require("./graphql/resolvers");
const auth = require("./middleware/auth");
// const {Server} = require('socket.io');

const { v4: uuidv4 } = require("uuid");

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "images");
  },
  filename: (req, file, cb) => {
    cb(null, uuidv4() + "-" + file.originalname);
  },
});
const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === "image/png" ||
    file.mimetype === "image/jpg" ||
    file.mimetype === "image/jpeg"
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

app.use(bodyParser.json()); // application/json;
app.use(
  multer({ fileFilter: fileFilter, storage: fileStorage }).single("image")
);
app.use("/images", express.static(path.join(__dirname, "images")));

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "OPTIONS,GET , POST, PUT ,PATCH,DELETE"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type , Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});
app.use(auth);

app.put("/post-image", (req, res, next) => {
  console.log(req.file);
  if (!req.isAuth) {
    throw new Error("Not Authinticated");
  }
  if (!req.file) {
    return res.status(200).json({ message: "No File Provided" });
  }
  if (req.body.oldPath) {
    clearImage(req.body.oldPath);
  }
  return res
    .status(201)
    .json({
      message: "File Stored",
      filePath: req.file.path.replace("\\", "/"),
    });
});

app.use(
  "/graphql",
  graphqlHTTP({
    schema: graphqlSchema,
    rootValue: graphqlResolver,
    graphiql: true,
    // customFormatErrorFn:err=>({
    //   message:err.message || "Error Occurred",
    //   code:err.originalname ||500,
    //   data:err.originalError.data,
    //   path:err.path,
    // }),
    customFormatErrorFn(err) {
      if (!err.originalError) {
        return err;
      }
      const data = err.originalError.data;
      const message = err.message || "Error Ocuured";
      const code = err.originalError.code || 500;
      return { message: message, status: code, data: data };
    },
  })
);
// app.use("/feed", feedRoutes);
// app.use("/auth", authRoutes);

app.use((error, req, res, next) => {
  console.log(error);

  const status = error.statusCode || 500;
  const message = error.message;
  const data = error.data;
  res.status(status).json({ message: message, data: data });
});

mongoose
  .connect(
    `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@cluster0.wdl7qor.mongodb.net/${process.env.MONGO_DATABASE}`
  )
  .then((result) => {
    console.log("connected");
    app.listen(8080);
    // const server = app.listen(8080);
    // const io =require('./socket').init(server);
    // io.on('connection',socket=>{
    //   console.log('Client Connected');
    //})
  })
  .catch((err) => console.log(err));
