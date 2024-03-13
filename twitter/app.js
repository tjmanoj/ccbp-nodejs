const express = require('express')
const app = express()
app.use(express.json())

const sqlite3 = require('sqlite3')
const {open} = require('sqlite')

const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

const path = require('path')
const dbPath = path.join(__dirname, 'twitterClone.db')

let db = null

const initializeDBandServer = async (request, response) => {
  db = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  })

  app.listen(3000, () => console.log('Server started at http://localhost:3000'))
}

// Register API

app.post('/register/', async (request, response) => {
  const {username, password, name, gender} = request.body
  const Dbquery = `
  SELECT * from user where username = '${username}';
  `

  const exe = await db.get(Dbquery)

  if (exe !== undefined) {
    response.status(400)
    response.send('User already exists')
  } else if (password.length < 6) {
    response.status(400)
    response.send('Password is too short')
  } else {
    let hassedPass = await bcrypt.hash(password, 5)
    const updateQuery = `
    INSERT INTO user(name,username,password,gender)
    VALUES('${name}','${username}', '${hassedPass}', '${gender}');
    `

    await db.run(updateQuery)
    response.send('User created successfully')
  }
})

app.post('/login', async (request, response) => {
  const {username, password} = request.body
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`
  const dbUser = await db.get(selectUserQuery)
  if (dbUser === undefined) {
    response.status(400)
    response.send('Invalid user')
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password)
    if (isPasswordMatched === true) {
      const payload = {
        username: username,
      }
      const jwtToken = jwt.sign(payload, 'MY_SECRET_TOKEN')
      response.send({jwtToken})
    } else {
      response.status(400)
      response.send('Invalid password')
    }
  }
})

const authenticate = (request, response, next) => {
  let jwtToken
  const authHeader = request.headers['authorization']
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(' ')[1]
  }
  if (jwtToken === undefined) {
    response.status(401)
    response.send('Invalid JWT Token')
  } else {
    jwt.verify(jwtToken, 'MY_SECRET_TOKEN', async (error, payload) => {
      if (error) {
        response.status(401)
        response.send('Invalid JWT Token')
      } else {
        request.username = payload.username
        next()
      }
    })
  }
}

app.get('/user/tweets/feed', authenticate, async (request, response) => {
  const {username} = request
  const query = `
  select u.username, t.tweet, t.date_time from user u INNER JOIN tweet t on
  u.user_id = t.user_id where u.user_id in (select f.following_user_id from follower f INNER JOIN user u ON u.user_id = f.follower_user_id where u.username = "${username}")
  order by t.date_time desc limit 4 offset 0;
  `

  const exe = await db.all(query)
  response.send(
    exe.map(each => ({
      username: each.username,
      tweet: each.tweet,
      dateTime: each.date_time,
    })),
  )
})

app.get('/user/following', authenticate, async (request, response) => {
  const {username} = request
  const query = `
  select name from user where user_id in (select f.following_user_id from follower f INNER JOIN user u ON u.user_id = f.follower_user_id where u.username = "${username}");
  `

  const exe = await db.all(query)
  response.send(
    exe.map(each => ({
      name: each.name,
    })),
  )
})

app.get('/user/followers', authenticate, async (request, response) => {
  const {username} = request
  const query = `
  select name from user where user_id in (select f.follower_user_id from follower f INNER JOIN user u ON u.user_id = f.following_user_id  where u.username = "${username}");
  `

  const exe = await db.all(query)
  response.send(
    exe.map(each => ({
      name: each.name,
    })),
  )
})

const chechValidTweet = async (request, response, next) => {
  const {tweetId} = request.params
  const {username} = request

  const userQuery = `
  SELECT user.username from user INNER JOIN tweet ON user.user_id = tweet.user_id where tweet.tweet_id = ${tweetId};
  `

  const isuservalid = await db.get(userQuery)
  if (isuservalid === undefined) {
    response.status(401)
    response.send('Invalid Request')
  } else {
    const checkUser = isuservalid.username
    console.log(checkUser)

    const query = `
  select user.username from user where user_id in (select f.following_user_id from follower f INNER JOIN user u ON u.user_id = f.follower_user_id where u.username = "${username}");
  `
    let users = []
    const dbUser = await db.all(query)
    dbUser.map(each => users.push(each.username))
    console.log(users)
    if (!users.includes(checkUser)) {
      response.status(401)
      response.send('Invalid Request')
    } else {
      next()
    }
  }
}

//API 6
app.get(
  '/tweets/:tweetId',
  authenticate,
  chechValidTweet,
  async (request, response) => {
    const {tweetId} = request.params

    const query = `
    select t.tweet, t.date_time, COUNT(DISTINCT reply_id) as replies,COUNT(DISTINCT like_id) as likes from (tweet t INNER JOIN reply r ON t.tweet_id = r.tweet_id) inner join like
     on t.tweet_id = like.tweet_id  where t.tweet_id = ${tweetId} group by t.tweet_id;
    `

    const dbUser = await db.get(query)
    response.send({
      tweet: dbUser.tweet,
      likes: dbUser.likes,
      replies: dbUser.replies,
      dateTime: dbUser.date_time,
    })
  },
)

// API 7
app.get(
  '/tweets/:tweetId/likes',
  authenticate,
  chechValidTweet,
  async (request, response) => {
    const {tweetId} = request.params

    const query = `
  select DISTINCT user.username from (tweet t INNER JOIN reply r ON t.tweet_id = r.tweet_id) inner join like on t.tweet_id = like.tweet_id
    inner join user on user.user_id = like.user_id where t.tweet_id = ${tweetId};
  `

    const dbUser = await db.all(query)
    let users = []
    dbUser.map(each => users.push(each.username))

    response.send({
      likes: users,
    })
  },
)

// API 8
app.get(
  '/tweets/:tweetId/replies',
  authenticate,
  chechValidTweet,
  async (request, response) => {
    const {tweetId} = request.params
    const {username} = request

    //   const query = `
    // select user.name, r.reply from (tweet t INNER JOIN reply r ON t.tweet_id = r.tweet_id)
    //   inner join user on user.user_id = r.user_id where r.tweet_id = ${tweetId}
    //   and r.user_id in (select f.following_user_id from follower f INNER JOIN user u ON u.user_id = f.follower_user_id where u.username = "${username}")
    //  group by r.reply;
    // `

    const query = `
    select u.name, r.reply from user u inner join reply r
     on u.user_id = r.user_id where r.tweet_id = ${tweetId};
    `

    const dbUser = await db.all(query)
    let users = []
    dbUser.map(each => users.push({name: each.name, reply: each.reply}))

    response.send({
      replies: users,
    })
  },
)

// API 9

app.get('/user/tweets', authenticate, async (request, response) => {
  const {username} = request
  const query = `
  select user.username,t.tweet, t.date_time, COUNT(DISTINCT reply_id) as replies,COUNT(DISTINCT like_id) as likes from ((tweet t INNER JOIN reply r ON t.tweet_id = r.tweet_id) inner join like on t.tweet_id = like.tweet_id)
   inner join user on user.user_id = t.user_id where user.username = "${username}" group by t.tweet_id;
  `

  const exe = await db.all(query)
  response.send(
    exe.map(dbUser => ({
      tweet: dbUser.tweet,
      likes: dbUser.likes,
      replies: dbUser.replies,
      dateTime: dbUser.date_time,
    })),
  )
})

// API 10

app.post('/user/tweets/', authenticate, async (request, response) => {
  const {tweet} = request.body
  const query = `
  INSERT INTO tweet(tweet) VALUES('${tweet}')
  `
  await db.run(query)
  response.send('Created a Tweet')
})

//API 11

app.delete('/tweets/:tweetId', authenticate, async (request, response) => {
  const {username} = request

  const {tweetId} = request.params
  const tId = parseInt(tweetId)
  console.log(tweetId)
  console.log(typeof tweetId)
  const query = `
  select t.tweet_id from user u INNER JOIN tweet t ON u.user_id = t.user_id where u.username = '${username}';
  `

  let ids_list = []
  const exe = await db.all(query)
  exe.map(each => ids_list.push(each.tweet_id))
  console.log(ids_list)
  console.log(typeof ids_list[0])
  console.log(ids_list.includes(tId))

  if (ids_list.includes(tId)) {
    const delQuery = `
    DELETE from tweet where tweet_id = ${tweetId};
    `

    await db.run(delQuery)
    response.send('Tweet Removed')
  } else {
    response.status(401)
    response.send('Invalid Request')
  }
})
initializeDBandServer()
module.exports = app
