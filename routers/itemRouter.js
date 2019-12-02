
const express = require('express')
const router = express.Router()

const getitemDebugger = require('debug')('app:getitem')
const additemDebugger = require('debug')('app:additem')
const searchitemDebugger = require('debug')('app:searchitem')
const print = require('debug')('app:print')


const db = require('./../db')
const uuid = require('uuid');

const Item = db.Item
const User = db.User
const Media = db.Media

router.route('/additem').post((req, res) => {

    addItem(req, res);
})

router.route('/item/:itemID').get((req, res) => {
    getItem(req, res)
})

router.route('/search').post((req, res) => {

    searchitemDebugger(req.body)
    searchItem(req, res)
})


router.route('/item/:id').delete((req, res) => {
    //fixme no sure if I should also delete the item from userside
    deleteItem(req, res)
})

router.route('/item/:id/like').post((req, res) => {
    print("calling like or not");
    like_or_not(req, res)
})

router.route('/addmedia').post((req, res) => {
    addMedia(req, res);
})

router.route('/media/:id').get((req, res) => {
    getMedia(req, res)
})


async function deleteItem(req, res) {

    const item = await Item.findOne({ id: req.params.id })

    if (item)
        if (item.username === req.session.username) {

            return performDeleteItem(req, res)

        }



    return res.status(800).send({ status: 'error' })



}

async function performDeleteItem(req, res) {

    const item = await Item.findOneAndDelete({ id: req.params.id }, (err, doc) => {


        if (doc) {
            // we need to delete associated media file(s) too
            media = doc.media;
            if (media.length > 0) {
                for (let i = 0; i < media.length; i++) {
                    Media.findOneAndDelete({ id: media[i] }, (err, media) => {
                        if (err) {
                            print("error on deleting media")
                        } else {
                            print("media ", media.id, " deleted")
                        }
                    })
                }
            }
            return res.status(200).send({ item: doc.id })
        }
        else {
            return res.status(800).send({ status: 'error' })
        }



    })



}

async function addItem(req, res) {
    additemDebugger("in add item, req.body = ", req.body);
    additemDebugger("~~~content:  ", req.body.content, " and the child type: ", req.body.childType)
    console.log("session: ", req.session.username);
    if (false === (req.session.username || false)) {
        additemDebugger('need to login first')
        return res.status(400).send({ status: "error", error: 'just stop asking' })
    }

    if (!req.body['content']) {
        additemDebugger('empty content')
        return res.status(400).send({ status: "error", error: 'empty content' })
    }

    const childType = req.body.childType

    if (childType !== 'retweet' && childType !== 'reply' && childType !== null && childType !== undefined) {
        additemDebugger('wrong child type')
        return res.status(400).send({ status: "error", error: 'wrong childType' })
    }


    //check and set default of the parent and the media
    let parent = req.body.parent;
    let media = req.body.media;
    print("req.bodu.media: ", req.body.media);
    if (parent == null || parent == undefined) {
        parent = "";
    }
    if (media == null || media == undefined) {
        media = [];
    }

    // if the post is retweet, increase the parent's retweeted by 1, if parent exist.
    if (childType == 'retweet') {
        let parentItem = await Item.findOne({ id: parent });
        if (parentItem) {
            parentItem.retweeted = parentItem.retweeted + 1;
            await parentItem.save();
        }

    }

    //check all the media belong to you, and it is not being use, else return error
    for (let i = 0; i < media.length; i++) {
        let temp = await Media.findOne({ id: media[i] })
        if (temp) {
            if (temp.isUse == true || temp.username != req.session.username) {
                return res.status(400).send({ status: "error", error: 'media is use' })
            } else {
                // console.log("belong to me")
                await Media.findOneAndUpdate({ id: media[i] }, {
                    $set: {
                        isUse: true
                    }
                }, { isUse: true }
                )
                // temp.isUse = true;
                // await temp.save();
            }
        }
    }
    const token = uuid.v4()
    const item = new Item({
        id: token,
        username: req.session.username,
        property: { likes: 0 },
        retweeted: 0,
        content: req.body.content,
        parent: parent,
        media: media,
        likeArray: [],
        childType: childType

    })


    additemDebugger("saving item")
    const result = await item.save()
    let tempKey = "posts.$." + token
    print('tempkey ', tempKey)
    const user = await User.findOne({ username: req.session.username })
    // await user.save()
    user.posts.push(token)
    await user.save()
    print(user)
    // print(token)
    additemDebugger("~~~~~printing result~~~~~~~:", result)
    if (user)
        return res.status(200).send({ status: 'OK', id: token })

}
async function addMedia(req, res) {
    const token = uuid.v4();
    if (false === (req.session.username || false)) {
        additemDebugger('need to login first')
        return res.status(400).send({ status: "error", id: token, error: 'just stop asking' })
    }
    additemDebugger("content: ", req.body.content);

    // if (!req.body['content']) {
    //     additemDebugger('empty content')
    //     return res.status(400).send({ status: "error", id: token, error: 'empty content' })
    // }

    const media = new Media({
        id: token,
        username: req.session.username,
        media: req.body.content,
        isUse: false
    })

    additemDebugger("saving item")
    let result = await media.save();
    additemDebugger("In add media: media =", result);

    return res.status(200).send({ status: "OK", id: token, error: "some error happen" })

}

async function getItem(req, res) {
    id = req.params.itemID;
    getitemDebugger(req.body);
    const item = await Item.findOne({ id: id })
    getitemDebugger(item)
    if (item) {
        return res.status(200).send({
            status: "OK",
            item: item
        })
    }
    return res.status(400).send({ status: "error", error: "item not found" })
}

async function getMedia(req, res) {
    id = req.params.id;
    getitemDebugger("id: ", id);
    const media = await Media.findOne({ id: id })
    getitemDebugger("media: ", media)
    if (media) {
        /*
res.writeHead(200, {'Content-Type': 'image/jpeg' });
    res.end(img.media);
*/
        return res.status(200).send({
            status: "OK",
            media: media
        })
    }
    return res.status(400).send({ status: "error", error: "media not found" })
}

async function searchItem(req, res) {

    searchitemDebugger("in function searching items");
    searchitemDebugger("req.body = ", req.body)

    // let timestamp = (req.body.timestamp || Date.now() / 1000);
    let timestamp = (parseFloat(req.body.timestamp) || Date.now() / 1000);


    searchitemDebugger("time stamp is: ", timestamp);
    // let limit = (req.body.limit || 25);
    let limit = (parseInt(req.body.limit) || 25);

    limit = limit > 100 ? 100 : limit

    searchitemDebugger("limit is: ", limit);

    let name = req.body.username || /.*/

    searchitemDebugger("name is: ", name);


    searchitemDebugger("follow is: ", req.body.following);

    let following = (req.body.following === undefined || req.body.following === null) ? true : req.body.following


    //fixme
    following = req.session.username ? following : false

    searchitemDebugger("following is: ", req.body.following);


    let current_following = await User.findOne({ username: req.body.username || 'nobodys name' })




    let current_user = await User.findOne({ username: req.session.username || 'nobodys name' })






    searchitemDebugger('current following is ', current_following)

    // searchitemDebugger("is name in", current_following.followers,req.body.username in Object.keys(current_following.followers))
    // print(Object.keys(current_following.followers),req.session.username)
    let isFollowed = current_following ? (Object.keys(current_following.followers).includes(req.session.username)) : false //is a user really following the given user


    isFollowed = req.body.username ? isFollowed : true

    searchitemDebugger('isFollowed: ', isFollowed)


    searchitemDebugger('q is ', req.body.q)
    const keyWords = req.body.q ? req.body.q.split(' ').map(e => { return new RegExp(e, 'i') }) : []

    searchitemDebugger('key words are ', keyWords)



    searchitemDebugger('following =', following, 'isfollowed =', isFollowed)


    searchitemDebugger('(following && !isFollowed)', (following && !isFollowed))


    let hasMedia = req.body.hasMedia === true ? true : false;
    let rank = req.body.rank === "time" ? req.body.rank : "interest";
    let parent = req.body.parent
    let replies = req.body.replies === false ? false : true;
    print("has media: ", hasMedia)
    print("rank = ", rank)
    print("parent = ", parent)
    print("replies = ", replies)

    let items =
        (following && !isFollowed) ?
            [] :

            following ?

                (keyWords.length ? await Item.find({
                    timestamp: { $lte: timestamp },
                    content: { $in: keyWords },



                    username: req.body.username ? req.body.username : { $in: [...Object.keys(current_user.following)] }



                }).limit(limit) :
                    await Item.find({
                        timestamp: { $lte: timestamp },
                        // content: { $in: keyWords },

                        username: req.body.username ? req.body.username : { $in: [...Object.keys(current_user.following)] }

                        // username: name,




                    }).limit(limit))

                :


                (keyWords.length ? await Item.find({
                    timestamp: { $lte: timestamp },
                    content: { $in: keyWords },
                    username: name,
                }).limit(limit) :
                    await Item.find({
                        timestamp: { $lte: timestamp },
                        // content: { $in: keyWords },
                        username: name,
                    }).limit(limit))


    searchitemDebugger('item =', items)

    //sort the items array by rank
    if (rank === "time") {
        items.sort((x, y) => {
            return y.timestamp - x.timestamp;
        })
    } else if (rank === "interest") {
        items.sort((x, y) => {
            return (y.retweeted + y.property.likes) - (x.retweeted + x.property.likes);
        })
    }

    //filter items that doesn't contain media when hasMedia == true
    if (hasMedia) {
        //searchitemDebugger("filtering items without media ");
        items = items.filter((x) => {
            print("x.username = ", x.username);
            print("x.media.length = ", x.media.length);
            return x.media.length > 0;
        })
    }
    // searchitemDebugger('items after sort =', items)

    // if the parent ID is given and replies is true
    // filter the items that has the same parent id as given
    if (parent !== undefined && replies) {
        print("~~~~parent is :", parent)
        items = items.filter((x) => {
            return x.parent == parent;
        })
    }

    if (replies === false) {
        items = items.filter((x) => {
            return x.childType != "reply";
        })
    }

    let result = []
    if (items) {
        for (let i = 0; i < items.length; i++) {
            //searchitemDebugger("items : ", i, "tsp: ", items[i].timestamp)

            result.push(items[i])
        }
        //searchitemDebugger("after sort: ", result)
        // searchitemDebugger("returning items with ok")
        searchitemDebugger("result: ", result)
        return res.status(200).send({ status: "OK", items: result })
    }

    searchitemDebugger("items not found, error")
    return res.send({
        status: "error",
        error: "items not found"
    })


}

async function like_or_not(req, res) {

    print(req.session.username)
    let id = req.params.id;
    getitemDebugger("~~~~~~~~~~~~~~~req.params.id: ", id);
    getitemDebugger("~~~~~~~~~~~~~~~req.body.like = " + req.body.like);

    let like = (req.body.like == false) ? false : true
    // getitemDebugger(item)
    const item = await Item.findOne({ id: id })
    if (like == true) {
        getitemDebugger("~~~~~~~~~~~~~~~before update item:", item);
        if (item && item.likeArray.indexOf(req.session.username) < 0) {
            getitemDebugger("item.property.likes: ", item.property.likes);
            let property = item.property;
            getitemDebugger("propertyxxxxxxxxxxxxxxxxxx", property)
            property.likes = property.likes + 1;
            item.likeArray.push(req.session.username)
            await Item.findOneAndUpdate({ id: id }, {
                $set: {
                    property: property
                }
            }, { new: property }
            )

            await item.save();
            getitemDebugger("updated item : ", item);
            return res.status(200).send({
                status: "OK",
                item: item
            })
        }
    } else if (like == false) {
        let index = item.likeArray.indexOf(req.session.username)
        if (item && index > -1) {
            getitemDebugger("item.property.likes: ", item.property.likes);
            let property = item.property;
            getitemDebugger("propertyxxxxxxxxxxxxxxxxxx", property)
            property.likes = property.likes - 1;
            item.likeArray.splice(index, 1)
            await Item.findOneAndUpdate({ id: id }, {
                $set: {
                    property: property
                }
            }, { new: property }
            )

            await item.save();
            getitemDebugger("updated item : ", item);
            return res.status(200).send({
                status: "OK",
                item: item
            })

        }
    }

    // if (item) {
    //     getitemDebugger("item.property.likes: ", item.property.likes);
    //     item.property.likes = item.property.likes + 1;
    //     item.property = item.property;
    //     await item.save();
    //     getitemDebugger("updated item : ", item);
    //     return res.status(200).send({
    //         status: "OK",
    //         item: item
    //     })
    // }

    return res.status(400).send({ status: "error", error: "item not found" });
}

module.exports = router