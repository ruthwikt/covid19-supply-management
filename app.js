const express = require('express')
const path = require('path')
const ejsMate = require('ejs-mate')
const ExpressError = require('./utils/ExpressError')
const catchAsync = require('./utils/catchAsync')
const methodOverride = require('method-override')
const mongodb = require("mongodb")
const fs = require('fs');
const json2xls = require('json2xls');
const { MongoClient } = mongodb

const uri = "mongodb://localhost:27017/inventory";

const client = new MongoClient(uri, { useUnifiedTopology: true });
async function run() {
    try {
        await client.connect();
        await client.db("inventory").command({ ping: 1 });
        console.log("Connected successfully to database server");
    } catch (err) {
        console.log(err)
    }
}
run().catch(console.dir);

const collection = client.db("inventory").collection("covid-inventory")

const app = express();

app.engine('ejs', ejsMate)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'))

app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')))


app.get('/', catchAsync(async (req, res) => {
    const myInventory = await collection.find().toArray()
    res.render('home', { myInventory })
}));

app.post('/inventory', catchAsync(async (req, res) => {
    await collection.insertOne(req.body.inventory)
    res.redirect('/')
}))

app.put('/inventory/:id', catchAsync(async (req, res) => {
    const { id } = req.params
    const { inventory } = req.body
    await collection.replaceOne(
        { _id: new mongodb.ObjectID(id) },
        inventory,
        { upsert: true }
    )
    res.redirect('/')
}))

app.delete('/inventory/:id', catchAsync(async (req, res) => {
    const { id } = req.params
    await collection.deleteOne({ _id: new mongodb.ObjectID(id) })
    res.redirect('/')
}))

app.post('/downloadxlsx',catchAsync (async (req, res) => {
    const inventory = await collection.find().toArray()
    const xls = json2xls(inventory)
    fs.writeFileSync("inventoryData.xlsx", xls, 'binary', (err) => {
        if (err) {
              console.log("writeFileSync :", err);
         }
       console.log("file is saved!");
    })
}))

app.all('*', (req, res, next) => {
    next(new ExpressError('Page Not Found', 404))
})

app.use((err, req, res, next) => {
    const { statusCode = 500 } = err;
    if (!err.message) err.message = 'Oh No, Something Went Wrong!'
    res.status(statusCode).render('error', { err })
})

app.listen(3000, () => {
    console.log('Serving on port 3000')
})


