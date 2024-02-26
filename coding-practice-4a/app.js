const express = require('express')
const app = express()
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const path = require('path')
let db = null
const dbPath = path.join(__dirname, 'cricketTeam.db')
app.use(express.json())
const initializeDb = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })

    app.listen(3000, () => {
      console.log('Server Started')
    })
  } catch (e) {
    console.log(e)
  }
}

app.get('/players', async (request, response) => {
  const query = `
  SELECT * from cricket_team;
  `
  const exe = await db.all(query)
  response.send(exe)
})

app.post('/players/', async (request, response) => {
  const player = request.body
  console.log(player)
  const {playerName, jerseyNumber, role} = player
  const query = `
  INSERT INTO cricket_team (player_name, jersey_number, role)
  VALUES(
    '${playerName}',
    ${jerseyNumber},
    '${role}'
  );
  `

  const exeQuery = await db.run(query)
  console.log(exeQuery)
  response.send('Player Added to Team')
})

app.get('/players/:playerId/', async (request, response) => {
  const {playerId} = request.params
  const query = `
  SELECT * FROM cricket_team
  WHERE player_id = ${playerId}`

  const executeQuery = await db.get(query)
  response.send(executeQuery)
})

app.put('/players/:playerId/', async (request, response) => {
  const {playerId} = request.params
  const player = request.body
  const {playerName, jerseyNumber, role} = player
  const query = `
  UPDATE cricket_team 
  SET 
    player_name = '${playerName}',
    jersey_number = ${jerseyNumber},
    role = '${role}'
  WHERE player_id = ${playerId};
  `
  const exe = await db.run(query)
  response.send('Player Details Updated')
})

app.delete('/players/:playerId', async (request, response) => {
  const {playerId} = request.params
  const query = `
  DELETE FROM cricket_team
  WHERE player_id = ${playerId}
  `
  await db.run(query)
  response.send('Player Removed')
})

initializeDb()

module.exports = app
