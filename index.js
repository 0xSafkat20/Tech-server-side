const { MongoClient, ServerApiVersion, Collection, ObjectId } = require('mongodb');
const express = require('express');
require('dotenv').config()
const jwt = require('jsonwebtoken');
const app = express();
const cors = require('cors');
const cookieParser = require('cookie-parser');
const port = process.env.PORT || 5000;

// middleware
app.use(cors({
  origin:[
    // "http://localhost:5173" , 
  "https://rasel-blog-web.web.app", 
  "https://rasel-blog-web.firebaseapp.com",
"https://b8a11-client-side-raselsharif.vercel.app"
],
  credentials: true,
}))
app.use(express.json())
app.use(cookieParser())


const secretKey = process.env.SECRET_KEY;

const uri = process.env.URL;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});
//  custom middleware for token verify
const verify = (req, res, next)=>{
const token =req?.cookies?.token;
jwt.verify(token, secretKey,(err, decoded)=>{
  // console.log(decoded);
  if(err){
    return res.status(401).send({status:"unauthorized access!"})
  }
  req.user=decoded;
  next();
})
}
async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

const database = client.db("blogDB");
const blogCollection =database.collection('blogs')
const categoriesCollection =database.collection('blogCategory')
const wishlistCollection =database.collection('wishlist')
const commentsCollection =database.collection('comments')


// jwt token
app.post('/v1/access-token',async(req,res)=>{
  const userEmail = req.body;
  // console.log(userEmail);
token= jwt.sign(userEmail, secretKey,{expiresIn: "1h"})
res
.cookie("token", token,{
  httpOnly: true,
  secure: true,
  sameSite: "none"
})
.send({status: true})
})
app.post('/v1/remove-access-token', async(req, res)=>{
  res
  .clearCookie("token",{maxAge: 0,sameSite:"none", secure:true})
  .send({status: true, user: "Logged Out"})
})

// blog CRUD
app.post('/v1/post-blog', async(req,res)=>{
  const blog = req.body;
  // console.log(blog);
  const result =await blogCollection.insertOne(blog)
  res.send(result)
})
// post wishlist
app.post('/v1/post-wishlist', async(req,res)=>{
  const wishlist = req.body;
  const result = await wishlistCollection.insertOne(wishlist);
  res.send(result)

})
// post comment
app.post('/v1/post-comment', async(req, res)=>{
  const comment = req.body;
  const result = await commentsCollection.insertOne(comment);
  res.send(result)
})
app.get('/v1/categories',async(req,res)=>{
  const categories=  categoriesCollection.find();
  const result= await categories.toArray();
  res.send(result)
  
})
// get all blogs, filter by category, filter by title
app.get('/v1/all-blogs',async(req,res)=>{
  const queryObj = {}
  const sortObj={}
  const limit =parseInt(req.query.limit);
  const category = req.query.category;
  const sortDate = req.query.sortDate;
  const sortOrder=req.query.sortOrder;
  // const title= req.query.sortTitle;
  if(category){
    queryObj.category = category;
  }
  // if(category || title){
  //   queryObj.category = category;
  // }
  if(sortDate && sortOrder){
sortObj[sortDate]=sortOrder;
  }
  // if(sortTitle){
  //   queryObj.title = title;
  // }
  const blogs = blogCollection.find(queryObj).sort(sortObj).limit(limit); 
  const result = await blogs.toArray()
  res.send(result)
})
// get top ten features
app.get('/v1/top-ten-features',async(req, res)=>{
  const features = blogCollection.find();
  const result = await features.toArray();
  res.send(result)
})
// get blog details by id
app.get('/v1/blog-details/:id',async(req,res)=>{
  const id = req.params.id;
  const filter = {_id : new ObjectId(id)};
  const result = await blogCollection.findOne(filter)
  res.send(result)
})
// get wishlist
app.get('/v1/wishlist-by-user/:email',verify, async(req, res)=>{
  const email = req.params.email;
  // console.log("from wish:", email, req.user.email);
  if(email !== req?.user?.email){
    return res.status(403).send({status: "Forbidden Access!"})
  }
  const filter ={user_email: email}
const wishlist = wishlistCollection.find(filter);
const result = await wishlist.toArray()
res.send(result) 
})

// get comment-by-post
app.get('/v1/comment-by-post/:id',async(req,res)=>{
  const commentId = req.params.id;
  const filter = {id:commentId};
  const comments = commentsCollection.find(filter);
  const result = await comments.toArray()
  res.send(result)
})
// update blog
app.put('/v1/blog-update/:id', async(req,res)=>{
  const blog = req.body;
  const id= req.params.id;
  const filter = {_id : new ObjectId(id)}
  const options ={upsert: true};
  const updateBlog = {
    $set:{
      ...blog
    }
  }
  const result = await blogCollection.updateOne(filter, updateBlog,options)
res.send(result)
})
// delete single wishlist
app.delete('/v1/wishlist-delete/:id', async(req,res)=>{
  const id = req.params.id;
  const filter = {_id: new ObjectId(id)};
  const result = await wishlistCollection.deleteOne(filter);
  res.send(result)
})
// delete blog
app.delete('/v1/blog-delete/:id',async(req,res)=>{
  const id = req.params.id;
  const filter = {_id: new ObjectId(id)};
  const result =await blogCollection.deleteOne(filter);
  res.send(result)
})
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/',(req,res)=>{
    res.send("Blog server running...")
})
app.listen(port,(req,res)=>{
    console.log("server running on: ",port);
})