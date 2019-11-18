
const mongoose = require('mongoose')
const dbDebugger = require('debug')('app:db')

mongoose
    .connect('mongodb://127.0.0.1/my_db', { server: { socketOptions: { keepAlive: 300000, connectTimeoutMS: 30000 } } }).then(() => {
        dbDebugger('Connected to MongoDB...')
    })
    .catch(err => dbDebugger('could not connect to the mongodb... ', err))
const userSchema = new mongoose.Schema({

    username: String,
    email: String,
    uuid: String,
    password: String,
    active: Boolean,
    following: { type: Object, default: {} },
    followers: { type: Object, default: {} },
    posts: { type: Array, default: [] }
    // following: { type: Array, default: [] },
    // follower: { type: Array, default: [] },
})
const itemSchema = new mongoose.Schema({
    id: String,
    username: String,
    property: { type: Object, default: {} },
    retweeted: Number,
    content: Object,
    timestamp: { type: Number, default: Date.now() / 1000 },
    parent: String,
    media: { type: Array, default: [] },
    likeArray: { type: Array, default: [] },
    childType: String
})

var mediaSchema = new mongoose.Schema({
    id: String,
    username: String,
    media: {
        type: Buffer
    },
    isUse: Boolean
});

const User = mongoose.model('User', userSchema)
const Item = mongoose.model('Item', itemSchema)
const Media = mongoose.model('Media', mediaSchema)

module.exports = {
    User: User,
    Item: Item,
    Media: Media
}