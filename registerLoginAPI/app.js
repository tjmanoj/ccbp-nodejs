const express = require('express')
const path = require('path')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
let db = null
const bcrypt = require('bcrypt')
const dbPath = path.join(__dirname, 'userData.db')
const app = express()
app.use(express.json())
const initializeDBandServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })

    app.listen(3000, () => {
      console.log(`Server running at http://localhost:3000`)
    })
  } catch (e) {
    console.log(e)
  }
}

app.post('/register/', async (request, response) => {
  const userData = request.body
  const {username, name, password, gender, location} = userData

  const hashedPass = await bcrypt.hash(password, 5)

  const query = `
  SELECT * from user where username = '${username}';
  `

  const dbUser = await db.get(query)

  if (dbUser === undefined) {
    if (password.length < 5) {
      response.status(400)
      response.send('Password is too short')
    } else {
      const updateQuery = `
      INSERT INTO user(username, name, password, gender, location)
      VALUES('${username}',
              '${name}',
              '${hashedPass}',
              '${gender}',
              '${location}'
      )
      `
      await db.run(updateQuery)
      response.send('User created successfully')
    }
  } else {
    response.status(400)
    response.send('User already exists')
  }
})

app.post('/login/', async (request, response) => {
  const userData = request.body
  const {username, password} = userData

  const query = `
  SELECT * from user where username = '${username}';
  `

  const dbUser = await db.get(query)

  if (dbUser === undefined) {
    response.status(400)
    response.send('Invalid user')
  } else {
    const isvalidPass = await bcrypt.compare(password, dbUser.password)
    if (isvalidPass == false) {
      response.status(400)
      response.send('Invalid password')
    } else {
      response.send('Login success!')
    }
  }
})

app.put('/change-password/', async (request, response) => {
  const userData = request.body
  const {username, oldPassword, newPassword} = userData

  const query = `
  SELECT * from user where username = '${username}';
  `

  const dbUser = await db.get(query)

  const isValidPass = await bcrypt.compare(oldPassword, dbUser.password)

  if (isValidPass === false) {
    response.status(400)
    response.send('Invalid current password')
  } else {
    if (newPassword.length < 5) {
      response.status(400)
      response.send('Password is too short')
    } else {
      const hashedPass = await bcrypt.hash(newPassword, 5)
      const updateQuery = `
      UPDATE user 
      SET password = '${hashedPass}'
      where username = '${username}';
      `

      await db.run(updateQuery)
      response.send('Password updated')
    }
  }
})

initializeDBandServer()

module.exports = app
