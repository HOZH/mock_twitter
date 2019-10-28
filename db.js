
const mongoose = require('mongoose')
const dbDebugger = require('debug')('app:db')

mongoose
    .connect('mongodb://127.0.0.1/my_db').then(() => {
    dbDebugger('Connected to MongoDB...')
})
    .catch(err => dbDebugger('could not connect to the mongodb... ', err))
const userSchema = new mongoose.Schema({

    username: String,
    email: String,
    uuid: String,
    password: String,
    active: Boolean
})
const itemSchema = new mongoose.Schema({
    id: String,
    username: String,
    property: Object,
    retweeted: Number,
    content: Object,
    timestamp: {type: Number, default: Date.now() / 1000}
})

const User = mongoose.model('User', userSchema)
const Item = mongoose.model('Item', itemSchema)

module.exports = {
    User: User,
    Item: Item
}