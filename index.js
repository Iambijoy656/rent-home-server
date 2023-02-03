const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 5001;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

//midleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.iyuahvh.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

async function run() {
  try {
    const bachelosHomeCollection = client
      .db("rentHome")
      .collection("bachelorsHomes");

    const familyHomeCollection = client
      .db("rentHome")
      .collection("familyHomes");

    //get common location
    app.get("/commonLocation", async (req, res) => {
      const bachelorsAddress = await bachelosHomeCollection.distinct(
        "address",
        {}
      );
      const FamilyAddress = await familyHomeCollection.distinct("address", {});
      const allAddress = bachelorsAddress.concat(FamilyAddress);
      const hasmap = [];
      for (const elm of allAddress) {
        if (hasmap.indexOf(elm) === -1) {
          hasmap.push(elm);
        }
      }
     res.send(hasmap);
    });

    //get bachelors all homes
    app.get("/bachelosHomes", async (req, res) => {
      const option = await bachelosHomeCollection.find().toArray();
      res.send(option);
    });

    //get bachelors latest 3 homes
    app.get("/latestBachelosHomes", async (req, res) => {
      const availableQuery = { available: "true" };
      const availableHomes = await bachelosHomeCollection
        .find(availableQuery)
        .sort({ date: -1 })
        .toArray();
      const filter = availableHomes
        .filter((availableHome) => availableHome.available === "true")
        .slice(0, 3);
      res.send(filter);
    });

    //get bachelors all homes by id
    app.get("/bachelosHomesDetails/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const details = await bachelosHomeCollection.findOne(query);
      res.send(details);
    });

    // temporary to update type field
    // app.get('/addType', async (req, res) => {
    //     const filter = {};
    //     const options = { upsert: true }
    //     const updatedDoc = {
    //         $set: {
    //             type: "bechalors"
    //         }
    //     }
    //     const result = await bachelosHomeCollection.updateMany(filter, updatedDoc, options)
    //     res.send(result)

    // })

    //get family all homes
    app.get("/familyHomes", async (req, res) => {
      const query = {};
      const option = await familyHomeCollection.find(query).toArray();
      res.send(option);
    });

    //get bachelors all homes by id
    app.get("/familyHomesDetails/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const details = await familyHomeCollection.findOne(query);
      res.send(details);
    });

    //get family latest 3 homes
    app.get("/latestFamilyHomes", async (req, res) => {
      const availableQuery = { available: "true" };
      const availableHomes = await familyHomeCollection
        .find(availableQuery)
        .sort({ date: -1 })
        .toArray();
      const filter = availableHomes
        .filter((availableHome) => availableHome.available === "true")
        .slice(0, 3);
      res.send(filter);
    });
  } finally {
  }
}
run().catch(console.log);

app.get("/", (req, res) => {
  res.send("rent home server is running");
});

app.listen(port, () => {
  console.log(`rent home server is running on ${port}`);
});
