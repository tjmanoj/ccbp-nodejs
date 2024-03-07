const express = require('express')
const path = require('path')
const sqlite3 = require('sqlite3')
const {open} = require('sqlite')
const jwt = require('jsonwebtoken')
let db = null
const bcrypt = require('bcrypt')
const dbPath = path.join(__dirname, 'covid19IndiaPortal.db')

const app = express()
app.use(express.json())

const initializeDBandServer = async () => {
  db = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  })

  app.listen(3000, () => console.log('server started'))
}

const authenticate = (request, response, next) => {
  const token = request.headers['authorization']

  

  if (token === undefined) {
    response.status(401)
    response.send('Invalid JWT Token')
  } else {
    const jwtToken = token.split(' ')[1]
    jwt.verify(jwtToken, 'MY_SECRET_TOKEN', async (error, payload) => {
      if (error) {
        response.status(401)
        response.send('Invalid JWT Token')
      } else {
        next()
      }
    })
  }
}

app.post('/login/', async (request, response) => {
  const userDetails = request.body
  const {username, password} = userDetails
  const query = `
  SELECT * from user where username = '${username}';
  `
  const dbUser = await db.get(query)

  if (dbUser === undefined) {
    response.status(400)
    response.send('Invalid user')
  } else {
    const pass = await bcrypt.compare(password, dbUser.password)
    if (!pass) {
      response.status(400)
      response.send('Invalid password')
    } else {
      const payload = {username: username}
      const jwtToken = await jwt.sign(payload, 'MY_SECRET_TOKEN')
      response.send({jwtToken})
    }
  }
})

app.get('/states', authenticate, async (request, response) => {
  const query = `
  SELECT * from state;
  `
  const stateQuery = await db.all(query)
  response.send(
    stateQuery.map(each => {
      return {
        stateId: each.state_id,
        stateName: each.state_name,
        population: each.population,
      }
    }),
  )
})

app.get('/states/:stateId/', authenticate, async (request, response) => {
  const {stateId} = request.params
  const query = `
  SELECT * from state where state_id = ${stateId};
  `

  const each = await db.get(query)
  response.send({
    stateId: each.state_id,
    stateName: each.state_name,
    population: each.population,
  })
})

app.post('/districts', authenticate, async (request, response) => {
  const {districtName, stateId, cases, cured, active, deaths} = request.body

  const insertQuery = `
  INSERT INTO district(
    district_name,
    state_id,
    cases,
    cured,
    active,
    deaths
  )
  VALUES('${districtName}',
          ${stateId},
          ${cases},
          ${cured},
          ${active},
          ${deaths}
  );
  `
  await db.run(insertQuery)
  response.send('District Successfully Added')
})

app.get('/districts/:districtId', authenticate, async (request, response) => {
  const {districtId} = request.params
  const query = `
  SELECT * from district where district_id = ${districtId};
  `

  const each = await db.get(query)
  response.send({
    districtId: each.district_id,
    districtName: each.district_name,
    stateId: each.state_id,
    cases: each.cases,
    cured: each.cured,
    active: each.active,
    deaths: each.deaths,
  })
})

//DELETE
app.delete(
  '/districts/:districtId',
  authenticate,
  async (request, response) => {
    const {districtId} = request.params
    const query = `
  DELETE from district where district_id = ${districtId};
  `

    await db.run(query)
    response.send('District Removed')
  },
)

//UPDATE
app.put('/districts/:districtId', authenticate, async (request, response) => {
  const {districtName, stateId, cases, cured, active, deaths} = request.body
  const {districtId} = request.params
  const query = `
  UPDATE district 
  SET district_name = '${districtName}',
      state_id = ${stateId},
      cases = ${cases},
      cured = ${cured},
      active = ${active},
      deaths = ${deaths}
  where district_id = ${districtId};
  `

  await db.run(query)
  response.send('District Details Updated')
})

app.get('/states/:stateId/stats/', authenticate, async (request, response) => {
  const {stateId} = request.params
  const query = ` 
  SELECT SUM(cases) as cases,SUM(cured) as cured,SUM(active) as active,
  SUM(deaths) as deaths from district
  WHERE state_id = ${stateId};
  `
  const exe = await db.get(query)
  response.send({
    totalCases: exe.cases,
    totalCured: exe.cured,
    totalActive: exe.active,
    totalDeaths: exe.deaths,
  })
})
initializeDBandServer()

module.exports = app
