const { validationResult } = require("express-validator");
const Post = require("../models/post");
const fs = require("fs");
const path = require("path");
const User = require("../models/user");
const io = require("../socket");

//can use await here in the top level and out of async function so we can use await keyword and don't need to write async or function
exports.getPosts = async (req, res, next) => {
  const currentPage = req.query.page || 1;
  const perPage = 2;
  
  try {
   const totalItems = await Post.find().countDocuments();
    const posts = await Post.find()
   
      .skip((currentPage - 1) * perPage)
      .limit(perPage).sort({createdAt:-1})

    res.status(200).json({
      message: "Fetched Succeeded",
      posts: posts,
      totalItems: totalItems,
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }

  // .then((posts) => {
  //   res.status(200).json({
  //     message: "Fetched Succeeded",
  //     posts: posts,
  //     totalItems: totalItems,
  //   });
  // })
  // .catch((err) => {
  //   if (!err.statusCode) {
  //     err.statusCode = 500;
  //   }
  //   next(err);
  // });

  //   res.status(200).json({
  //     posts: [
  //       {
  //         _id: "1",
  //         title: "First Post",
  //         content: "This is the first",
  //         imageUrl: "images/test.jpg",
  //         creator: {
  //           name: "Amr",
  //         },
  //         createdAt: new Date(),
  //       },
  //     ],
  //   });
};
exports.createPost = async (req, res, next) => {
  //create post in db;
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const error = new Error("Validation Failed Enter Data Correct");
    error.statusCode = 422;
    throw error;
  }

  if (!req.file) {
    const error = new Error("No Images Provided");
    error.statusCode = 422;
    throw error;
  }
  
    const imageUrl = req.file.path.replace("\\", "/");
    const title = req.body.title;
    const content = req.body.content;
    // let creator;
    const post = new Post({
      title: title,
      content: content,
      imageUrl: imageUrl,
      creator: req.userId,
    });
    try {
    await post.save();
    const user = await User.findById(req.userId);

    // creator = user;
    user.posts.push(post);
    await user.save();

    io.getIO().emit('posts', {
      action: 'create',
      post: { ...post._doc, creator: { _id: req.userId, name: user.name } }
    });

    res.status(201).json({
      message: "Post Created Successfully",
      post: post,
      creator: { _id: user._id, name: user.name },
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.getPost = async (req, res, next) => {
  const postId = req.params.postId;
  const post = await Post.findById(postId);
  try {
    if (!post) {
      const error = new Error("Could NOt Find Post");
      const statusCode = 404;
      throw error;
    }
    res.status(200).json({ message: "Post fetched", post: post });
  } catch (err) {
    if (!err.statusCode) {
      statusCode = 500;
    }
    next(err);
  }
};
exports.updatePost = async (req, res, next) => {
  const postId = req.params.postId;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error("");
    error.statusCode = 422;
    throw error;
  }

  const title = req.body.title;
  const content = req.body.content;
  let imageUrl = req.body.image;

  if (req.file) {
    imageUrl = req.file.path.replace("\\", "/");
  }
  if (!imageUrl) {
    const error = new Error("No File Picked");
    error.statusCode = 422;
    throw error;
  }

  try {
    const post = await Post.findById(postId).populate('creator');

    if (!post) {
      const error = new Error("Could Not Find a Post");
      error.statusCode = 404;
      throw error;
    }
    if (post.creator._id.toString() !== req.userId) {
      const error = new Error("Not Authorized");
      error.statusCode = 403;
      throw error;
    }
    if (imageUrl !== post.imageUrl) {
      clearImage(post.imageUrl);
    }
    post.title = title;
    post.imageUrl = imageUrl;
    post.content = content;
    const result = await post.save();
    io.getIO().emit('posts',{action:"update" , post:result});

    res.status(200).json({ message: "Post Updated", post: result });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};
exports.deletePost = async (req, res, next) => {
  const postId = req.params.postId;
  try {
    const post = await Post.findById(postId);

    if (!post) {
      const error = new Error("Could Not find post");
      error.statusCode = 404;
      throw error;
    }
    if (post.creator.toString() !== req.userId) {
      const error = new Error("You not Authoraized to delete this post");
      error.statusCode = 403;
      throw error;
    }
    clearImage(post.imageUrl);
    await Post.findByIdAndRemove(postId);

    const user = await User.findById(req.userId);

    user.posts.pull(postId);
    await user.save();
    io.getIO().emit('posts',{action:"delete",post:postId})
    res.status(200).json({ message: "Deleted Post" });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};
const clearImage = (filePath) => {
  filePath = path.join(__dirname, "..", filePath);
  fs.unlink(filePath, (err) => {
    console.log(err);
  });
};
