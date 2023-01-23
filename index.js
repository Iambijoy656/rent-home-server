const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 5001;
const { MongoClient, ServerApiVersion } = require("mongodb");
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

    app.get("/bachelosHomes", async (req, res) => {
      const query = {};
      const option = await bachelosHomeCollection.find(query).toArray();
      res.send(option);
    });

    app.get("/latestBachelosHomes", async (req, res) => {
      const availableQuery = { available: "true" };
      const availableHomes = await bachelosHomeCollection
        .find(availableQuery)
        .sort({ date: 1 })
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
