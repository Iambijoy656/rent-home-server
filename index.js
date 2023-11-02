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
      from: "pppeyal@gmail.com", // verified sender email
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
    const wishlistCollection = client.db("rentHome").collection("wishlist");

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
      const query = {
        available: true,
        verified: true,
        wishlist: false,
        type: "bechalors",
      };
      const option = await allHomeCollection.find(query).toArray();
      res.send(option);
    });

    //get bachelors latest 3 homes
    app.get("/latestBachelosHomes", async (req, res) => {
      const availableQuery = {
        available: true,
        verified: true,
        wishlist: false,
        type: "bechalors",
      };
      const availableHomes = await allHomeCollection
        .find(availableQuery)
        .sort({ date: -1 })
        .toArray();
      const filter = availableHomes
        .filter((availableHome) => availableHome.available == true)
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
    //       // available: true,
    //       verified: true,
    //     },
    //   };
    //   const result = await allHomeCollection.updateMany(
    //     filter,
    //     updatedDoc,
    //     options
    //   );
    //   res.send(result);
    // });

    app.post("/homes/filtering", async (req, res) => {
      const filter = req.body;
      const type = filter.type;
      filter.price = filter.price == "" ? "2000,500000" : filter.price;

      const minPrice = parseInt(filter.price.split(",")[0]);
      const maxPrice = parseInt(filter.price.split(",")[1]);

      const filtersHomes = await allHomeCollection
        .find({
          $and: [
            { rent: { $gte: minPrice, $lte: maxPrice } },
            { type: type },
            { verified: true },
            { available: true },
            { wishlist: false },
          ],
        })
        .toArray();

      console.log(filtersHomes);
      console.log(filtersHomes.length);

      res.send(filtersHomes);
    });

    //get query all homes
    app.get("/homes", async (req, res) => {
      const { location, district, type, price } = req.query;

      const minPrice = parseInt(price.split("-")[0]) || 0;

      const maxPrice = parseInt(price.split("-")[1]) || 500000;

      let query = {};

      if (location && district && type) {
        query = {
          $or: [
            {
              address: location,
              district: district,
              type: type,
              // rent:{$gte: minPrice , $lte: maxPrice},
              available: true,
              verified: true,
              wishlist: false,
            },
          ],
        };
      } else {
        query = {
          type: type,
          available: true,
          verified: true,
          wishlist: false,
        };
      }

      const option = await allHomeCollection.find(query).toArray();
      res.send(option);
      console.log(option);
    });

    //get family latest 3 homes
    app.get("/latestFamilyHomes", async (req, res) => {
      const availableQuery = {
        available: true,
        verified: true,
        wishlist: false,
        type: "family",
      };
      const availableHomes = await allHomeCollection
        .find(availableQuery)
        .sort({ date: -1 })
        .toArray();

      const filter = availableHomes
        .filter((availableHome) => availableHome.available == true)
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
      res.send({ isAdmin: user?.role == "admin" });
    });

    //creak home owner
    app.get("/users/owner/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await usersCollection.findOne(query);
      res.send({ isOwner: user?.role == "owner" });
    });

    //creak home Renter
    app.get("/users/renter/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await usersCollection.findOne(query);
      res.send({ isRenter: user?.role == "renter" });
    });

    // make admin
    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      const user = await usersCollection.findOne({ _id: ObjectId(id) });
      if (user.role != "admin") {
        // return res.status(403).send({ message: "Forbidden access" });
        console.log(user.role);
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

    // make Verify Home
    app.patch("/home/verify/:id", async (req, res) => {
      const id = req.params.id;
      const home = await allHomeCollection.findOne({ _id: ObjectId(id) });
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          verified: true,
        },
      };
      const result = await allHomeCollection.updateOne(
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
      home.available = true;
      home.verified = false;
      home.wishlist = false;
      console.log(home);
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

    // delete home
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

    //get all home
    app.get("/allHomes", async (req, res) => {
      const allHome = await allHomeCollection.find().toArray();
      res.send(allHome);
    });

    //get booked home
    app.get("/bookedHome", async (req, res) => {
      try {
        const email = req.query.email;
        const query = { email: email };

        // Find the user's homes
        const homes = await allHomeCollection.find(query).toArray();
        const homeIds = homes.map((home) => home._id);

        // Find all payment data
        const bookedHomes = await paymentsCollection.find().toArray();
        const bookedHomeIds = bookedHomes.map(
          (bookedHome) => bookedHome.bookHomeId
        );

        // Create empty arrays for matched homes and payments
        const matchedHomes = [];
        const matchedPayments = [];

        // Iterate through homeIds and find matching homes and payments
        for (const homeId of homeIds) {
          const homeIdString = homeId.toString();

          if (bookedHomeIds.includes(homeIdString)) {
            // Find the matching home
            const matchingHome = homes.find(
              (home) => home._id.toString() === homeIdString
            );
            matchedHomes.push(matchingHome);

            // Find the matching payment
            const matchingPayment = bookedHomes.find(
              (bookedHome) => bookedHome.bookHomeId.toString() === homeIdString
            );
            matchedPayments.push(matchingPayment);
          }
        }

        // Create an object with both sets of data
        const response = {
          matchedHomes: matchedHomes,
          matchedPayments: matchedPayments,
        };

        res.json(response);
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    //wishlist
    // app.post("/wishlist", async (req, res) => {
    //   const wishlistData = req.body;
    //   wishlistData.time= new Date();

    //   // Extract the _id from wishlistHome
    //   const wishlistHomeId = wishlistData.wishlistHome._id;

    //   const existswishlistHome = await wishlistCollection.findOne({
    //     "wishlistHome._id": wishlistHomeId,
    //   });
    //   if (existswishlistHome) {
    //     res.status(200).json({ message: "you have already added in wishlist" });
    //   } else {
    //     const result = await wishlistCollection.insertOne(wishlistData);
    //     res.send(result);
    //   }
    // });

    app.post("/wishlist", async (req, res) => {
      const wishlistData = req.body;
      wishlistData.time = new Date();

      // Extract the _id from wishlistHome
      const wishlistHomeId = wishlistData.wishlistHome._id;

      const existswishlistHome = await wishlistCollection.findOne({
        "wishlistHome._id": wishlistHomeId,
      });

      if (existswishlistHome) {
        res
          .status(200)
          .json({ message: "You have already added to the wishlist" });
      } else {
        const result = await wishlistCollection.insertOne(wishlistData);

        // Set a timer to delete the wishlist data and update allHomeCollection
        setTimeout(async () => {
          const deleteResult = await wishlistCollection.deleteOne({
            _id: result.insertedId,
          });

          if (deleteResult.deletedCount === 1) {
            // Update allHomeCollection to set wishlist to false
            const homeId = wishlistData.wishlistHome._id;
            const homeFilter = { _id: ObjectId(homeId) };
            const updatedDoc = {
              $set: {
                wishlist: false,
              },
            };
            await allHomeCollection.updateOne(homeFilter, updatedDoc);
          }
        }, 60000); // 1 hour in milliseconds

        res.send(result);
      }
    });

    // update home collection after added wishlist
    app.patch("/wishlist/:id", async (req, res) => {
      const id = req.params.id;
      const homeId = await allHomeCollection.findOne({ _id: ObjectId(id) });
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          wishlist: true,
        },
      };
      const result = await allHomeCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      res.send(result);
    });

    //
    app.get("/wishlistHome", async (req, res) => {
      const email = req.query.email;
      const query = { renterEmail: email };
      const wishlistHome = await wishlistCollection.find(query).toArray();
      res.send(wishlistHome);
    });

// Update user
app.patch("/update/users/:email", async (req, res) => {
  const email = req.params.email;
  const updates = req.body;
 const filter = { email: email };
  const result = await usersCollection.updateOne(
    filter,
    { $set: updates },
    { upsert: true }
  );
  res.send(result);
});


   //get user 
   app.get("/userData", async (req, res) => {
    const email = req.query.email;
    const query = { email: email };
    const user = await usersCollection.findOne(query);
    res.send(user);
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
