
const express = require('express')
const router = express.Router()

const adduserDebugger = require('debug')('app:adduser')
const loginDebugger = require('debug')('app:login')
const verifyDebugger = require('debug')('app:verify')
const followDebugger = require('debug')('app:follow')
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


router.route('followe').post((req, res) => {

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
})


async function toggleFollow(req, res) {

    followDebugger(req.body)
    let name = req.body.username
    const user = await User.findOneAndUpdate({ username:name},
        {
            $set: {
                following: {  name: req.body.follow || true  }
            }

        }, { new: true })
    followDebugger(user)
    if (user)
        return res.send({ status: "OK" })

    followDebugger("something went wrong with toggling follow operation")
    return res.send({ status: "error" })



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

    const user = await User
        .find()
        .or([{ username: username }, { email: email }])

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
        active: active

    })
    const result = await user.save()

    adduserDebugger(result)

    const text = 'validation key: <' + token + '>'

    let link = "http://" + req.get('host') + "/verify/" + req.body.email + "/" + token;


    let html = text + "   Hello, Please Click on the link to verify your email. <a href=" + link + ">" + text + "</a>"

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
            return res.send({ status: "OK" })

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
        return res.send({ status: "OK" })

    verifyDebugger("something went wrong when update active property")
    return res.send({ status: "error" })

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
            // req.session.user =
            return res.send({ status: "OK" })

        }

    loginDebugger('fail to log in', user ? "current account has not been enabled" : "username/password does not match record on the server")
    req.session = null
    return res.send({ status: "error" })

}

module.exports = router