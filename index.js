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
    const allHomeCollection = client.db("rentHome").collection("allHomes");

    //get common location
    app.get("/commonLocation", async (req, res) => {
      const address = await allHomeCollection.distinct("address", {});
      res.send(address);
    });

    //get common District
    app.get("/commonDistrict", async (req, res) => {
      const district = await allHomeCollection.distinct("district", {});
      res.send(district);
    });

    //get bachelors all homes
    app.get("/bachelosHomes", async (req, res) => {
      const query = { available: "true", type: "bechalors" };
      const option = await allHomeCollection.find(query).toArray();
      res.send(option);
    });

    //get bachelors latest 3 homes
    app.get("/latestBachelosHomes", async (req, res) => {
      const availableQuery = { available: "true", type: "bechalors" };
      const availableHomes = await allHomeCollection
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
      const details = await allHomeCollection.findOne(query);
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

    //get query all homes
    app.get("/homes", async (req, res) => {
      const { location, district, type } = req.query;
      let query = {};

      if (location && district && type) {
        query = {
          $or: [
            {
              address: location,
              district: district,
              type: type,
            },
          ],
        };
      } else {
        query = { type: type };
      }

      const option = await allHomeCollection.find(query).toArray();
      res.send(option);
    });

    //get family all homes by id
    app.get("/familyHomesDetails/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const details = await allHomeCollection.findOne(query);
      res.send(details);
    });

    //get family latest 3 homes
    app.get("/latestFamilyHomes", async (req, res) => {
      const availableQuery = { available: "true", type: "family" };
      const availableHomes = await allHomeCollection
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
