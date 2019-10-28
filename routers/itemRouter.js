
const express = require('express')
const router = express.Router()

const getitemDebugger = require('debug')('router:getitem')
const additemDebugger = require('debug')('router:additem')
const searchitemDebugger = require('debug')('router:searchitem')

const db = require('./../db')
const uuid = require('uuid');

const Item = db.Item

router.route('/additem').post((req, res) => {
    addItem(req, res)
})

router.route('/item/:itemID').get((req, res) => {
    getItem(req, res)
})

router.route('/search').post((req, res) => {
    searchItem(req, res)
})



async function addItem(req, res) {

    if (false === (req.session.username || false)) {
        additemDebugger('need to login first')
        return res.send({ status: "error", error: 'just stop asking' })
    }

    if (!req.body['content']) {

        additemDebugger('empty content')
        return res.send({ status: "error", error: 'empty content' })

    }

    const childType = req.body.childType

    if (childType !== 'retweet' && childType !== 'reply' && childType !== null) {
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

    timestamp = (req.body.timestamp || Date.now() / 1000);

    searchitemDebugger("time stamp is: ", timestamp);
    limit = (req.body.limit || 25);

    searchitemDebugger("limit is: ", limit);

    const items = await Item.find({ timestamp: { $lte: timestamp } }).limit(limit)
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