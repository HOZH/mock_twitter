const mongoose = require('mongoose')
const print = require('debug')('app:print')


mongoose
    .connect('mongodb://127.0.0.1/my_db').then(() => {
    dbDebugger('Connected to MongoDB...')
})
    .catch(err => dbDebugger('could not connect to the mongodb... ', err))


const itemSchema = new mongoose.Schema({
    id: String,
    username: String,
    property: Object,
    retweeted: Number,
    content: Object,
    timestamp: {type: Number, default: Date.now() / 1000}
})

const Item = mongoose.model('Item', itemSchema)


async function getCourse(name, author, tags, isPublished) {

    // const item = await Item.find({}).count()
    const item = await Item.find({timestamp: {$lte: 1572233616.278}}).limit(20).count()


    // print(item)
// print(typeof item)
// print(item.length)
// print(item.count)
    print(item)


}


getCourse()
print('123')
print('2')