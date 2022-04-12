const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const ObjectId = require('mongodb').ObjectID
const fileUpload = require('express-fileupload')
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();
var cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: 'dy3odhvvh',
    api_key: process.env.CLOUDINARY_API_KEY ,
    api_secret: process.env.CLOUDINARY_SECRET_KEY
  });

const app = express();
app.use(bodyParser.json())
app.use(cors());
app.use(fileUpload({
  useTempFiles: true
}));

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.4ft4b.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;

const port = process.env.PORT || 5000;

app.get('/', (req, res) => {
  res.send("It is working");
})
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

client.connect(err => {
  const imageCollection = client.db(process.env.DB_NAME).collection(process.env.collectionName);
  
  app.post('/addData', (req, res) => {
    const file = req.files.file;
    const {title, description} = JSON.parse(req.body.sectionInfo)
    const sectionData={title, description}
    cloudinary.uploader.upload(file.tempFilePath, function (error, result) {
        if (!error) {
          const imageUrl = result.url ;
          sectionData.img =  imageUrl;
          imageCollection.insertOne(sectionData)
            .then(result => {
              res.json({
                success : result.acknowledged,
                img : imageUrl
              })
            })
        }
      })
  })

  app.get('/getHeader', (req, res) => {
    imageCollection.find({}).sort({_id : -1})
      .toArray((err, documents) => {
        res.send(documents[0])
      })
  })

  app.patch('/editTitleDescription', (req, res)=>{
    const {title, description, id, isDelete} = req.body
    const value = isDelete ? '' : title || description
    const key = title ? 'title' : description? 'description' : null;
    imageCollection.updateOne(
      { _id: ObjectId(id) },
      {
        $set: {[key] : value}
      }
    )
    .then(data => {
      res.json({
        success : data.modifiedCount > 0, 
        [key] : value
      })
    })
  })

  app.patch('/updateImage', (req, res)=>{
    const file = req.files.file;
    const {id} = JSON.parse(req.body.id)

    cloudinary.uploader.upload(file.tempFilePath, function (error, result) {
      if (!error) {
        const imgUrl = result.url;
        imageCollection.updateOne(
          { _id: ObjectId(id) },
          {
            $set: {img : imgUrl}
          }
        )
        .then(data => {
          if(data.modifiedCount > 0){
            res.json({updatedImage : imgUrl })
          }          
        })
      }
    })

    
  })

  if(!err){
    console.log("Database connection established");
  }  
});

app.listen(port, () => {
  console.log(`Example app listening at port ${port}`)
}) 