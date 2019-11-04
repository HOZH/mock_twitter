
const express = require('express')
const router = express.Router()

const getitemDebugger = require('debug')('app:getitem')
const additemDebugger = require('debug')('app:additem')
const searchitemDebugger = require('debug')('app:searchitem')

const db = require('./../db')
const uuid = require('uuid');

const Item = db.Item
const User = db.User

router.route('/additem').post((req, res) => {

    addItem(req, res)
})

router.route('/item/:itemID').get((req, res) => {
    getItem(req, res)
})

router.route('/search').post((req, res) => {

    searchitemDebugger(req.body)
    searchItem(req, res)
})


async function addItem(req, res) {

    additemDebugger("content", req.body.content, "child type", req.body.childType)

    if (false === (req.session.username || false)) {
        additemDebugger('need to login first')
        return res.send({ status: "error", error: 'just stop asking' })
    }

    if (!req.body['content']) {

        additemDebugger('empty content')
        return res.send({ status: "error", error: 'empty content' })

    }

    const childType = req.body.childType

    if (childType !== 'retweet' && childType !== 'reply' && childType !== null && childType !== undefined) {
        additemDebugger('wrong child type')
        return res.send({ status: "error", error: 'wrong childType' })

    }

    const token = uuid.v4()

    const item = new Item({
        id: token,
        username: req.session.username,
        property: { likes: 0 },
        retweeted: 0,
        content: req.body.content,

    })
    additemDebugger("saving item")

    const result = await item.save()

    additemDebugger("~~~~~printing result~~~~~~~:", result)

    return res.send({ status: 'OK', id: token })

}

async function getItem(req, res) {
    id = req.params.itemID;
    getitemDebugger(req.body);
    const item = await Item.findOne({ id: id })
    getitemDebugger(item)
    if (item) {
        return res.send({
            status: "OK",
            item: item
        })
    }
    return res.send({ status: "error", error: "item not found" })
}

async function searchItem(req, res) {

    searchitemDebugger("in function searching items");
    searchitemDebugger("req.body = ", req.body)

    let timestamp = (req.body.timestamp || Date.now() / 1000);

    searchitemDebugger("time stamp is: ", timestamp);
    let limit = (req.body.limit || 25);

    searchitemDebugger("limit is: ", limit);

    let name = req.body.username || /.*/

    searchitemDebugger("name is: ", name);


    searchitemDebugger("follow is: ", req.body.following);

    const following = (req.body.following === undefined || req.body.following === null) ? true : req.body.following

    searchitemDebugger("following is: ", req.body.following);


    let current_following = await User.findOne({ username: req.body.username })


    searchitemDebugger('current following is ', current_following)


    let isFollowed = current_following ? name in current_following.following : false


    searchitemDebugger('q is ', req.body.q)
    const keyWords = req.body.q ? req.body.q.split(' ').map(e => { return new RegExp(e, 'i') }) : []

    searchitemDebugger('key words are ', keyWords)



    searchitemDebugger('following =', following, 'isfollowed =', isFollowed)


    searchitemDebugger('(following && !isFollowed)', (following && !isFollowed))
    const items =
        (following && !isFollowed) ?
            [] :
            // const items =
            keyWords.length ? await Item.find({
                timestamp: { $lte: timestamp },
                content: { $in: keyWords },
                username: name,
            }).limit(limit) :
                await Item.find({
                    timestamp: { $lte: timestamp },
                    // content: { $in: keyWords },
                    username: name,
                }).limit(limit)


    searchitemDebugger('item =', items)


    let result = []
    if (items) {
        for (let i = 0; i < items.length; i++) {
            searchitemDebugger("items : ", i, "tsp: ", items[i].timestamp)

            result.push(items[i])
        }

        searchitemDebugger("returning items with ok")
        searchitemDebugger("result: ", result)
        return res.send({ status: "OK", items: result })
    }

    searchitemDebugger("items not found, error")
    return res.send({
        status: "error",
        error: "items not found"
    })


}


module.exports = router