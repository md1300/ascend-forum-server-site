const express = require('express')
require('dotenv').config()
const cors = require('cors')
const { MongoClient, ServerApiVersion, Timestamp, ObjectId } = require('mongodb');
const app = express()
const port = process.env.PORT || 8000


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
    const commentsCollection = db.collection('comments')
    const announcementsCollection = db.collection('announcements')
 


    // ----------------- get a post data details ----------------

    app.get('/post-details/:id', async (req, res) => {
      const id = req.params.id;
      // console.log(id)
      const query = { _id: new ObjectId(id) }
      const result = await postsCollection.findOne(query)
      res.send(result)
    })

    // -------------------get all post from postsCollection db ---------------
    app.get('/posts', async (req, res) => {
      const page = parseInt(req.query.page) || 1;
      const size = parseInt(req.query.size) || 5;

      const search = req.query.search || '';
      const category = req.query.category || '';
      // console.log({ search, category })
      const post_time = new Date('post_time');

      const pipeline = [
        {
          $addFields: {
            post_time_date: {
              $dateFromString: {
                dateString: "$post_time",
                format: "%m/%d/%Y"
              }
            },
          }
        },
       
        {
          $match: {
            $or: [
              { category: { $regex: search, $options: 'i' } },
                                            

            ]
          }
        },
        
        {
          $sort: {
            post_time_date: -1,

          }
        },
        {
          $skip: (page - 1) * size
        },
        {
          $limit: size
        },
        {
          $project: {
            post_time_date: 0
          }
        },

        {
          $match: {
            $or: [
              { category: { $regex: category, $options: 'i' } },
              
            ]
          }
        },

        // -------------for comment count ------------------
    {
      $lookup:{
        from:'comments',
        localField:'post_Title',
        foreignField:'post_title',
        as:'comments',
      },
    },
    {
      $addFields:{
         comment_count:{$size:['$comments']}
      }
    },
    {
      $project:{
        comments:0,
      }
    }
  

     ];

    
    
      const result = await postsCollection.aggregate(pipeline).toArray()

      const totalCount = await postsCollection.countDocuments()
      
      res.send({ result, totalCount })
    })
    // ------------------------patch vote count in postsColllection----------------
     app.patch('/posts/:id',async(req,res)=>{
      const id=req.params.id;
      const {action}=req.body
      const query={_id:new ObjectId(id)}
      

      // const comment_count=await commentsCollection.countDocuments({post_Title:post_Title})

      const updateDoc= action==='upVote'?{$inc:{upVote:1}}:{$inc:{downVote:1}}
      const result=await postsCollection.updateOne(query,updateDoc)
      res.send(result)
     })
    // -------------------------store vote information in voteCountsCollection --------

   app.post('/voteCount',async(req,res)=>{
    const voteInfo=req.body;
    const result=await voteCountsCollection.insertOne(voteInfo)
    res.send(result) 
   })
  //  ---------------get specific comments data from comment---------

   app.get('/comments/:postId',async(req,res)=>{
    const {postId}=req.params ;
    const query={postId:postId}
    const result=await commentsCollection.find(query).toArray()
    res.send(result)
   })

    // ----------------------------store comment data in commentsCollection ------------
    app.post('/comment',async(req,res)=>{        
         const commentData=req.body ;        
         const result=await commentsCollection.insertOne(commentData)
         res.send(result)
    })
    // ---------------get all popular data in sort of popularity ------------
    app.get('/popularity', async (req, res) => {
      const totalVotepipeline = [
        {
          $addFields: {
            voteDifference: { $subtract: ["$upVote", "$downVote"] }
          }
        },
        {
          $sort: { voteDifference: -1 }
        }
      ]
      const totalVoteResult = await postsCollection.aggregate(totalVotepipeline).toArray()
      // console.log({totalVoteResult})
      res.send(totalVoteResult)
      // -------------------------------

    })
    // ---------------get specific user posts from postsCollection ------------------

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
    // -------------------making users role admin  in a usersCollection db ---------
    app.patch('/users/:id',async(req,res)=>{
      const id=req.params.id;
      const information=req.body
      const filter={_id:new ObjectId(id)}
      const updateDoc={
        $set:{...information}
      }
      const result=await usersCollection.updateOne(filter,updateDoc)
      res.send(result)
    })
    // ------------------get all users data from usersCollection db ---------------
    app.get('/users',async(req,res)=>{
      const result=await usersCollection.find().toArray()
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
    // -----------------get all announcements from announcementsCollection ------------------
    app.get('/announcements',async(req,res)=>{
      const result=await announcementsCollection.find().toArray()
      const totalAnnouncement= await announcementsCollection.estimatedDocumentCount()
      res.send({result,totalAnnouncement})
    })
    // ----------------- get specific announcement data from announcentsCollection ----------------------

    app.get('/announcements/:id',async(req,res)=>{
      const id=req.params.id;
      // console.log({id})
      const query={_id:new ObjectId(id)}     
      const result =await announcementsCollection.findOne(query)
      res.send(result)
    })

    // -----------------announcementscollection to save announcement data --------------------
    app.post('/announcements',async(req,res)=>{
      const announcementInfo=req.body;
      const result=await announcementsCollection.insertOne(announcementInfo)
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