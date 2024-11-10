const express = require('express')
require('dotenv').config()
const cors = require('cors')
const { MongoClient, ServerApiVersion, Timestamp } = require('mongodb');
const app = express()
const port = process.env.PORT || 5000


const corsOption={
  origin: ['http://localhost:5173', 
    'http://localhost:5174',
    'https://ascend-forum-8917c.web.app'],
  credentials: true,
  optionSuccessStatus: 200,
}

app.use(express.json())
app.use(cors(corsOption))

app.get('/', (req, res) => {
  res.send('Server is running')
})



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.vmhty.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
// ---------------- collection -------------------
    const db = client.db('ascend_forum')
    const postsCollection=db.collection('posts')
    const usersCollection=db.collection('users')


    // -------------------get all post from postsCollection db ---------------
      app.get('/posts',async(req,res)=>{
        const result=await postsCollection.find().toArray()
        res.send(result)
      })
    // -----------------post userPost in postsCollection db ------------------

    app.post('/posts',async(req,res)=>{
      const postInfo=req.body;
      const result= await postsCollection.insertOne(postInfo)
      res.send(result)
     })

    //  ------------ post users information in usersCollection db ------------

    app.put('/users',async(req,res)=>{
      const userInfo=req.body;
      const query={email:userInfo.email}
      const isExist=await usersCollection.findOne(query)
      if(isExist) return 
      const options = { upsert: true }
      const updateDoc={
        $set:{...userInfo,timestamp:new Date()}
      }
      const result=await usersCollection.updateOne(query,updateDoc,options)
      res.send(result)
    })

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);




app.listen(port, () => {
  console.log(`the server is running in port : ${port}`)
})