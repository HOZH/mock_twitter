
const express = require('express')
const router = express.Router()
const adduserDebugger = require('debug')('app:adduser')
const wrongkeyDebugger = require('debug')('app:wrongkey')

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
    my_addUser(req,res)

    // addUser(req, res)

})


router.route('/follow').post((req, res) => {

    toggleFollow(req, res)
})


router.route('/verify').post((req, res) => {
    activateUser(req, res)
})
router.route('/verify/:email/:key').get((req, res) => {
    activateUserII(req, res)
})

router.route('/login').post((req, res) => {
    loginUser(req, res)
})

router.route('/logout').post((req, res) => {
    req.session = null
    print(req.session)
    res.send({ status: "OK" })
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
            return res.status(200).send({ status: 'OK', users: temp })
        }
        return res.status(500).send({ status: 'error', error: "error" })
    })//no need to the select for filtering
})
router.route('/user/:username/followers').get((req, res) => {


    User.findOne({ username: req.params.username }, (err, doc) => {

        let limit = (req.query.limit || 50) > 200 ? 200 : (req.query.limit || 50)

        if (doc) {

            let temp = [...Object.values(doc.followers)].splice(0, limit)


            return res.status(200).send({ status: 'OK', users: temp })
        }

        return res.status(500).send({ status: 'error', error: "error" })
    })//no need to the select for filtering


})


async function getUserPosts(req, res) {

    const user = await User.findOne({ username: req.params.username })

    if (!user) {

        getuserpostsDebugger('user ' + req.params.username + ' not found')
        return res.status(500).send({ status: 'error', error: "error" })

    }

    let limit = (req.query.limit || 50) > 200 ? 200 : (req.query.limit || 50)

    const answer = [...user.posts].splice(0, limit)

    getuserpostsDebugger("answer" + answer)
    return res.status(200).send({
        status: 'OK', items: answer
    })
}

async function getUser(req, res) {

    const user = await User.findOne({ username: req.params.username })

    if (!user) {

        getuserDebugger('user ' + req.params.username + ' not found')
        return res.status(500).send({ status: 'error', error: "error" })

    }


    return res.status(200).send({
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
        return res.status(500).send({ status: "error" })
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
                return res.status(200).send({ status: "OK" })
            followDebugger("something went wrong with toggling follow operation")
            return res.status(500).send({ status: "error", error: "error" })
        })
    }
    // followDebugger(user)
}

function isValidateAdduserRequest(req) {

    const schema = {

        username: Joi.string().required(),
        email: Joi.string().required(),
        password: Joi.string().required()

    }

    return Joi.validate(req.body, schema)
}

async function isUsernameEmailUnique(username, email) {

    const user = await User.find({ $or: [{ username: username }, { email: email }] })
    // .find()
    // .or([{ username: username }, { email: email }])

    adduserDebugger(username, email, "record found:", user)

    return user.length
}

async function createUserAndSentEmail(username, email, password, active, req, res) {

    const token = uuid.v4()
    adduserDebugger(123)

    const user = new User({

        username: username,
        email: email,
        password: password,
        uuid: token,
        active: active,
        following: {},
        followers: {}

    })
    // const result = await
     user.save(()=>{
         const text = 'validation key: <' + token + '>'

         let link = "http://" + req.get('host') + "/verify/" + req.body.email + "/" + token;


         let html = "<a href=" + link + ">" + text + "</a>"

         mailOptions = {
             to: req.body.email,
             subject: "mock_twitter Please confirm your Email account",
             html: html
         }


         res.status(200).send({ status: "OK" })
         return smtpTransport.sendMail(mailOptions)
     })

    // adduserDebugger(result)

    // const text = 'validation key: <' + token + '>'

    // let link = "http://" + req.get('host') + "/verify/" + req.body.email + "/" + token;


    // let html = "<a href=" + link + ">" + text + "</a>"

    // mailOptions = {
    //     to: req.body.email,
    //     subject: "mock_twitter Please confirm your Email account",
    //     html: html
    // }


    // res.status(200).send({ status: "OK" })
    // return smtpTransport.sendMail(mailOptions)




    // smtpTransport.sendMail(mailOptions, function (error, response) {
    //     if (error) {
    //         adduserDebugger('error on sending email', error)
    //         // return -1
    //         return res.status(500).send({ status: "error", error: "error" })

    //     } else {
    //         return res.status(200).send({ status: "OK" })

    //         // return 0
    //     }
    // });
}


async function my_addUser(req, res) {



    adduserDebugger(req.body)
    const requestError = isValidateAdduserRequest(req)

    if (requestError.error) {
        adduserDebugger('error on fetching user request(contents)', requestError.error.message)
        return res.status(500).send({ status: "error", error: "error" })
    }

    else {

        let username= req.body.username
        let email = req.body.email

        // const user = await
         User.find({ $or: [{ username: username }, { email: email }] },(err,result)=>{
             if(err)
                 return res.status(500).send({ status: "error", error: "error" })

             const isUnique = result.length === 0
             if (!isUnique)
                 return res.status(500).send({ status: "error", error: "error" })

             createUserAndSentEmail(req.body.username, req.body.email, req.body.password, false, req, res)



        })
        

    }
}

async function addUser(req, res) {

    adduserDebugger(req.body)
    const requestError = await isValidateAdduserRequest(req)

    if (requestError.error) {
        adduserDebugger('error on fetching user request(contents)', requestError.error.message)
        return res.status(500).send({ status: "error", error: "error" })
    }

    else {

        isUsernameEmailUnique(req.body.username, req.body.email).then(value => {

            const isUnique = value === 0
            adduserDebugger('username and email are both unique =', isUnique)

            if (!isUnique)
                return res.status(500).send({ status: "error", error: "error" })


            // return res.status(200).send({ status: "ok", error: "ok" })


            createUserAndSentEmail(req.body.username, req.body.email, req.body.password, false, req, res)

        })
    }
}

async function activateUser(req, res) {

let t=0
    for(let i = 0;i<1000;i++){
        t+=i
    }

    verifyDebugger("req.body:", req.body)                                //abracadabra
    // const user = await User.findOneAndUpdate({ uuid: { $in: ['abracadabra', req.body.key] }, email: req.body.email },
    //     {
    //         $set: {
    //             active: true
    //         }

    //     }, { active: true })
    // verifyDebugger("user: ", user)
    // if (user)
    //     return res.status(200).send({ status: "OK" })

    let key = req.body.key;
    if (key == "wrong_key")
        wrongkeyDebugger("wrong key")
    let email = req.body.email;
    // let user = await
    User.findOne({ email: email }, (err, result) => {

        if (err)
            return res.status(500).send({ status: "error", error: "error" })



        let current_user = result


        if (current_user) {
            if ((key == "abracadabra") || (key == user.uuid)) {
                current_user.active = true;
                // await
                User.findOneAndUpdate({ email: current_user.email },
                    {
                        $set: {
                            active: true
                        }

                    }, () => {
                        verifyDebugger("user verify successed");
                        return res.status(200).send({ status: "OK" });
                    })
                //  current_user.save(() => {
                //     verifyDebugger("user verify successed");
                //     return res.status(200).send({ status: "OK" });
                // });

            }
            else {
                return res.status(500).send({ status: "error", error: "error" })

            }
        }

        else {

            verifyDebugger("something went wrong when update active property")
            return res.status(500).send({ status: "error", error: "error" })
        }
        // verifyDebugger("something went wrong when update active property")
        // return res.status(500).send({ status: "error", error: "error" })
    });


}
async function activateUserII(req, res) {

    verifyDebugger("req.params: ", req.params)
    let key = req.body.key;
    let email = req.body.email;
    let user = await User.findOne({ email: email });

    if (user) {
        if ((key == "abracadabra") || (key == user.uuid)) {
            user.active = true;
            await user.save();
            verifyDebugger("user verify successed");
            return res.status(200).send({ status: "OK" });
        }
    }
    // const user = await User.findOneAndUpdate({ uuid: { $in: ['abracadabra', req.params.key] }, email: req.params.email },
    //     {
    //         $set: {
    //             active: true
    //         }

    //     }, { active: true })
    // verifyDebugger("user: ", user)
    // if (user) {
    //     adduserDebugger("user verify success");
    //     return res.status(200).send({ status: "OK" })
    // }


    verifyDebugger("something went wrong when update active property")
    return res.status(500).send({ status: "error", error: "error" })

}
async function loginUser(req, res) {

    let t = 0
    for (let i = 0; i < 1000; i++) {
        t += i
    }

    loginDebugger(req.body)
    // const user = await
    User.findOne({ username: req.body.username, password: req.body.password }, (err, result) => {
        if (err)
            return res.status(500).send({ status: "error", error: "error" })



        let current_user = result
        if (current_user) {

            if (current_user.active) {

                req.session.isLogin = true
                req.session.username = req.body.username

                loginDebugger("log in performed")

                // req.session.user =
                return res.status(200).send({ status: "OK" })

            }
            else {
                loginDebugger('not activated user')
                req.session = null
                return res.status(500).send({ status: "error", error: "error" })
            }

        }
        else {

            req.session = null
            return res.status(500).send({ status: "error", error: "error" })
        }

    })
    // loginDebugger(user)

    // loginDebugger('fail to log in', user ? "current account has not been enabled" : "username/password does not match record on the server")
    // req.session = null
    // return res.status(500).send({ status: "error", error: "error" })

}

module.exports = router