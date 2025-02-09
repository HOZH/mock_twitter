
const express = require('express')
const router = express.Router()

const adduserDebugger = require('debug')('app:adduser')
const loginDebugger = require('debug')('app:login')
const verifyDebugger = require('debug')('app:verify')
const followDebugger = require('debug')('app:follow')
const getuserDebugger = require('debug')('app:getuser')
const getuserpostsDebugger = require('debug')('app:getuserposts')
const print = require('debug')('app:print')



const Joi = require('joi')
const db = require('./../db')
const uuid = require('uuid');
const nodemailer = require('nodemailer');

const User = db.User

const smtpTransport = nodemailer.createTransport(({
    port: 25,
    secure: false,
    tls: {
        rejectUnauthorized: false
    }
}));


router.route('/adduser').post((req, res) => {

    addUser(req, res)

})


router.route('/follow').post((req, res) => {

    toggleFollow(req, res)
})


router.route('/verify').post((req, res) => {
    activateUser(req, res)
})

router.route('/login').post((req, res) => {
    loginUser(req, res)
})

router.route('/logout').post((req, res) => {
    req.session = null
    res.send({ status: "OK" })
<<<<<<< HEAD
=======
})


router.route('/user/:username').get((req, res) => {

    getUser(req, res)
})

router.route('/user/:username/posts').get((req, res) => {

    getUserPosts(req, res)
})

router.route('/user/:username/following').get((req, res) => { 


    User.findOne({ username: req.params.username }, (err, doc) => {

        let limit = (req.query.limit || 50) > 200 ? 200 : (req.query.limit || 50)

        if (doc) {

            let temp = [...Object.values(doc.following)].splice(0, limit)


            return res.send({ status: 'OK', users: temp })
        }

        return res.send({ status: 'error' })
    })//no need to the select for filtering

})
router.route('/user/:username/followers').get((req, res) => {


    User.findOne({ username: req.params.username }, (err, doc) => {

        let limit = (req.query.limit || 50) > 200 ? 200 : (req.query.limit || 50)

        if (doc) {

            let temp = [...Object.values(doc.followers)].splice(0, limit)


            return res.send({ status: 'OK', users: temp })
        }

        return res.send({ status: 'error' })
    })//no need to the select for filtering


>>>>>>> hong
})


async function getUserPosts(req, res) {

    const user = await User.findOne({ username: req.params.username })

    if (!user) {

        getuserpostsDebugger('user ' + req.params.username + ' not found')
        return res.send({ status: 'error' })

    }

    let limit = (req.query.limit || 50) > 200 ? 200 : (req.query.limit || 50)

    const answer = [...user.posts].splice(0, limit)

    getuserpostsDebugger("answer" + answer)
    return res.send({
        status: 'OK', items: answer
    })
}

async function getUser(req, res) {

    const user = await User.findOne({ username: req.params.username })

    if (!user) {

        getuserDebugger('user ' + req.params.username + ' not found')
        return res.send({ status: 'error' })

    }


    return res.send({
        status: 'OK', user: {
            email: user.email,
            following: Object.keys(user.following).length,
            followers: Object.keys(user.followers).length
        }
    })
}

async function toggleFollow(req, res) {

    followDebugger(req.body)

    // let name = "following." + req.body.username

    print(req.session.username)
    const user = await User.findOne({ username: req.session.username })


    let temp = user.following

    let follow = (req.body.follow === undefined || req.body.follow === null) ? true : req.body.follow



    const target = await User.findOne({ username: req.body.username })

    if (!target)
        return res.send({ status: "error" })


    const targetFollowers = target.followers

    if (follow) {
        print(req.session.username + " is following " + req.body.username)
        temp[req.body.username] = req.body.username
        targetFollowers[req.session.username] = req.session.username





    }
    else {
        delete temp[req.body.username]
        delete targetFollowers[req.session.username]


    }

    await User.findOneAndUpdate({ username: req.session.username }, {

        $set: {

            following: temp
        }
    }, { new: true },


        (err, u) => {


            updateTargetFollower(req, res, targetFollowers)


        }



    )


    async function updateTargetFollower(req, res, newContent) {



        await User.findOneAndUpdate({ username: req.body.username }, {


            $set: {

                followers: newContent
            }
        }, { new: true }, (err, doc) => {


            print(doc)
            if (doc)
                return res.send({ status: "OK" })

            followDebugger("something went wrong with toggling follow operation")
            return res.send({ status: "error" })



        })


    }









    // followDebugger(user)




}

function isValidateAdduserRequest(req) {

    const schema = {
        username: Joi.string().required(),
        email: Joi.string().email().required(),
        password: Joi.string().required()
    }

    return Joi.validate(req.body, schema)
}

async function isUsernameEmailUnique(username, email) {

<<<<<<< HEAD
    const user = await User.find().or([{ username: username }, { email: email }])
=======
    const user = await User
        .find()
        .or([{ username: username }, { email: email }])
>>>>>>> hong

    adduserDebugger(username, email, "record found:", user)

    return user.length
}

async function createUserAndSentEmail(username, email, password, active, req, res) {

    const token = uuid.v4()

    const user = new User({
        username: username,
        email: email,
        password: password,
        uuid: token,
<<<<<<< HEAD
        active: active
=======
        active: active,
        following: {},
        followers: {}

>>>>>>> hong
    })
    const result = await user.save()

    adduserDebugger(result)

    const text = 'validation key: <' + token + '>'

    let link = "http://" + req.get('host') + "/verify/" + req.body.email + "/" + token;


    let html = "Hello,<br> Please Click on the link to verify your email. <br><a href=" + link + "><" + token + "></a>"
    //  text + "   Hello, Please Click on the link to verify your email. <a href=" + link + ">" + text + "</a>"
    //  "Hello,<br> Please Click on the link to verify your email. <br><a href=" + link + "><" + token + "></a>"

    mailOptions = {
        to: req.body.email,
        subject: "mock_twitter Please confirm your Email account",
        html: html
    }

    smtpTransport.sendMail(mailOptions, function (error, response) {
        if (error) {
            adduserDebugger('error on sending email', error)
            // return -1
            return res.send({ status: "error" })

        } else {
<<<<<<< HEAD
=======
            return res.send({ status: "OK" })
>>>>>>> hong

            return res.render("verify")
            // return res.send({ status: "OK" })
            // return 0
        }
    });
}

function addUser(req, res) {

    adduserDebugger(req.body)
    const requestError = isValidateAdduserRequest(req)

    if (requestError.error) {
        adduserDebugger('error on fetching user request(contents)', requestError.error.message)
        return res.send({ status: "error" })
    }

    isUsernameEmailUnique(req.body.username, req.body.email).then(value => {

        const isUnique = value === 0
        adduserDebugger('username and email are both unique =', isUnique)

        if (!isUnique)
            return res.send({ status: "error" })

        createUserAndSentEmail(req.body.username, req.body.email, req.body.password, false, req, res)

    })
}

async function activateUser(req, res) {

    verifyDebugger(req.body)
    const user = await User.findOneAndUpdate({ uuid: { $in: ['abracadabra', req.body.key] }, email: req.body.email },
        {
            $set: {
                active: true
            }

        }, { new: true })
    verifyDebugger(user)
    if (user)
<<<<<<< HEAD
        return res.render("login", { status: "OK" });

    verifyDebugger("something went wrong when update active property")
    return res.render("verify", { status: "error" });
=======
        return res.send({ status: "OK" })

    verifyDebugger("something went wrong when update active property")
    return res.send({ status: "error" })
>>>>>>> hong

}

async function loginUser(req, res) {

    loginDebugger(req.body)
    const user = await User.findOne({ username: req.body.username, password: req.body.password })

    loginDebugger(user)

    if (user)

        if (user.active) {

            loginDebugger("log in performed")
            req.session.isLogin = true
            req.session.username = req.body.username
<<<<<<< HEAD
            return res.render("search", { status: "OK", item: "" })
=======
            // req.session.user =
            return res.send({ status: "OK" })
>>>>>>> hong

        }

    loginDebugger('fail to log in', user ? "current account has not been enabled" : "username/password does not match record on the server")
    req.session = null
<<<<<<< HEAD
    // return res.send({ status: "error" })
    return res.render("login", { status: "error" });
=======
    return res.send({ status: "error" })
>>>>>>> hong

}

module.exports = router