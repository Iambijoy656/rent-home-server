const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 5001;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

//firebase
const admin = require("firebase-admin");
const serviceAccount = require("./rent-home-82477-firebase-adminsdk-orzl5-f6dc9bf0ef.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

//Nodemailer
const nodemailer = require("nodemailer");
const mg = require("nodemailer-mailgun-transport");

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

//midleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.iyuahvh.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

//send payments in email
function sendPaymentEmail(payment) {
  const auth = {
    auth: {
      api_key: process.env.EMAIL_SEND_KEY,
      domain: process.env.EMAIL_SEND_DOMAIN,
    },
  };

  const transporter = nodemailer.createTransport(mg(auth));

  transporter.sendMail(
    {
      from: "bijoydas00656@gmail.com", // verified sender email
      to: payment.email || "bijoydas00656@gmail.com", // recipient email
      subject: `Your advance payment for Home rent is confirm`, // Subject line
      text: `Hello ${payment.name}`, // plain text body
      html: `
  <h3>Your Payment is Successfull</h3>

  <div>
  <p> Your Payment for Home: ${payment.bookHomeId}</p>
  <p>Thanks from Rent Home Website.</p>
  
  </div>
  
  `, // html body
    },
    function (error, info) {
      if (error) {
        console.log("error is:", error);
      } else {
        console.log("Email sent: " + info.response);
      }
    }
  );
}

async function run() {
  try {
    const allHomeCollection = client.db("rentHome").collection("allHomes");
    const usersCollection = client.db("rentHome").collection("users");
    const paymentsCollection = client.db("rentHome").collection("payments");

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
    //get family all homes by id
    app.get("/familyHomesDetails/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const details = await allHomeCollection.findOne(query);
      res.send(details);
    });

    //get homes by id
    app.get("/home/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const details = await allHomeCollection.findOne(query);
      res.send(details);
    });

    // // temporary to update type field
    // app.get("/addType", async (req, res) => {
    //   const filter = {};
    //   const options = { upsert: true };
    //   const updatedDoc = {
    //     $set: {
    //       available: "true",
    //     },
    //   };
    //   const result = await allHomeCollection.updateMany(
    //     filter,
    //     updatedDoc,
    //     options
    //   );
    //   res.send(result);
    // });

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

    //users  database
    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    // get users
    app.get("/users", async (req, res) => {
      const result = await usersCollection.find({}).toArray();
      res.send(result);
    });

    //creak user admin
    app.get("/users/admin/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await usersCollection.findOne(query);
      res.send({ isAdmin: user?.role === "admin" });
    });

    //creak home owner
    app.get("/users/owner/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await usersCollection.findOne(query);
      res.send({ isOwner: user?.role === "owner" });
    });

    //creak home Renter
    app.get("/users/renter/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await usersCollection.findOne(query);
      res.send({ isRenter: user?.role === "renter" });
    });

    // make admin
    app.put("/users/admin/:id", async (req, res) => {
      const id = req.params.id;

      const user = await usersCollection.findOne({ _id: ObjectId(id) });
      if (user.role !== "admin") {
        return res.status(403).send({ message: "Forbidden access" });
      }

      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await usersCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      res.send(result);
    });

    //for payment
    app.post("/create-payment-intent", async (req, res) => {
      const home = req.body;
      const price = home.rent;
      const amount = price * 100;

      const paymentIntent = await stripe.paymentIntents.create({
        currency: "bdt",
        amount: amount,
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    app.post("/payments", async (req, res) => {
      const payment = req.body;
      console.log(payment);
      const result = await paymentsCollection.insertOne(payment);
      const id = payment.bookHomeId;
      const homeId = payment.bookHomeId;
      const homeFilter = { _id: ObjectId(homeId) };
      const updatedProductDoc = {
        $set: {
          available: false,
        },
      };
      const updateProduct = await allHomeCollection.updateOne(
        homeFilter,
        updatedProductDoc
      );

      //send email about room payment confirmation
      sendPaymentEmail(payment);

      res.send(result);
    });

    //get user booked home
    app.get("/rentHomes", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const rentHome = await paymentsCollection.find(query).toArray();
      res.send(rentHome);
    });

    //add home by home owner
    app.post("/add-home", async (req, res) => {
      const home = req.body;
      const result = await allHomeCollection.insertOne(home);
      res.send(result);
    });

    //get home of individual owner
    app.get("/myHomesForRent", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const myHome = await allHomeCollection.find(query).toArray();
      res.send(myHome);
    });

    //get home of individual owner
    app.delete("/delete-home/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const deleteHome = await allHomeCollection.deleteOne(query);
      res.send(deleteHome);
    });

    // delete user from database and firebase
    app.delete("/user-delete/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      // Check if the user exists in Firebase Authentication
      const userRecord = await admin.auth().getUserByEmail(email);

      // Delete user from Firebase Authentication
      await admin.auth().deleteUser(userRecord.uid);

      const deleteUser = await usersCollection.deleteOne(query);
      if (!deleteUser) {
        return res.status(403).send({ message: "Forbidden access" });
      }
      const deleteHomes = await allHomeCollection.deleteMany(query);
      res.status(200).json({ message: "User deleted successfully." });
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
