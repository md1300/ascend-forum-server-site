const express = require('express')
require('dotenv').config()
const cors = require('cors')
const { MongoClient, ServerApiVersion, Timestamp, ObjectId } = require('mongodb');
const app = express()
const port = process.env.PORT || 5000


const corsOption = {
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
    const postsCollection = db.collection('posts')
    const usersCollection = db.collection('users')


    // ----------------- get a post data details ----------------

    app.get('/post-details/:id',async(req,res)=>{
         const id=req.params.id;
         const query={_id:new ObjectId(id)}
         const result=await postsCollection.findOne(query)
         res.send(result)
    })


    // -------------------get all post from postsCollection db ---------------
    app.get('/posts', async (req, res) => {
      const page=parseInt(req.query.page);
      const size=parseInt(req.query.size);
      
      const post_time = new Date('post_time');

      const pipeline = [
        {
          $addFields: {
            post_time_date: {
              $dateFromString: {
                dateString: "$post_time",
                format: "%d/%m/%Y"
              }
            },
          }
        },
       
        {
          $sort: {
            post_time_date: -1,  // Sort by post_time_date descending
            
          }
        },
        {
          $skip:(page-1)*size
        },
        {
          $limit:size
        },
        {
          $project: {
            post_time_date: 0  // Exclude post_time_date from the final output
          }
        }
      ];


      const result = await postsCollection.aggregate(pipeline).toArray()
      
      const totalCount=await postsCollection.countDocuments()
      
   
  
      res.send({result,totalCount,})
     
     
    })

    // ---------------get all popular data in sort of popularity ------------
    app.get('/popularity',async(req,res)=>{
      const totalVotepipeline=[
        {
          $addFields: {
          voteDifference: { $subtract: ["$upVote", "$downVote"] }
          }
          },
          {
          $sort: { voteDifference: -1 }
          }
        ]
        const totalVoteResult= await postsCollection.aggregate(totalVotepipeline).toArray()
        // console.log({totalVoteResult})
        res.send(totalVoteResult)
        // -------------------------------
   
    })
    // ---------------get specific user post from postsCollection ------------------

    app.get('/posts/:email', async (req, res) => {
      const email = req.params.email;
      const query = { 'author.email': email }
      const pipeline = [
        {
          $match: {
            'author.email': email
          }
        },
        {
          $project: {
            _id: 1,
            post_Title: 1,
            totalCount: { $add: ["$upVote", "$downVote"] }
          },
        },

      ]
      const result = await postsCollection.aggregate(pipeline).toArray()
      res.send(result)
    })

    // -----------------post userPost in postsCollection db ------------------

    app.post('/posts', async (req, res) => {
      const postData = req.body;
      const postInfo = {
        ...postData,
        post_time: new Date().toLocaleDateString()
      }
      const result = await postsCollection.insertOne(postInfo)
      res.send(result)
    })

    //  ------------ get users information from usersColllection db ----------

    app.get('/users/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await usersCollection.findOne(query)
      res.send(result)
    })

    //  ------------ post users information in usersCollection db ------------

    app.put('/users', async (req, res) => {
      const userInfo = req.body;
      const query = { email: userInfo.email }
      const isExist = await usersCollection.findOne(query)
      if (isExist) return
      const options = { upsert: true }
      const updateDoc = {
        $set: { ...userInfo, timestamp: new Date() }
      }
      const result = await usersCollection.updateOne(query, updateDoc, options)
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