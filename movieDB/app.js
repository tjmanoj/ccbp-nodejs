const express = require('express')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const path = require('path')
const app = express()

let db = null
const dbPath = path.join(__dirname, 'moviesData.db')
app.use(express.json())

const initializeDB = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })

    app.listen(3000, () => {
      console.log('Started')
    })
  } catch (e) {
    console.log(e)
  }
}

app.get('/movies/', async (request, response) => {
  const query = `
  SELECT movie_name from movie;
  `

  const exe = await db.all(query)
  response.send(exe.map(each => ({movieName: each.movie_name})))
})

app.post('/movies/', async (request, response) => {
  const movieDetails = request.body
  const {directorId, movieName, leadActor} = movieDetails
  const query = `
  INSERT INTO movie(director_id, movie_name, lead_actor)
  VALUES(
    ${directorId},
    '${movieName}',
    '${leadActor}'
  );
  `

  const exe = await db.run(query)
  response.send('Movie Successfully Added')
})

app.get('/movies/:movieId/', async (request, response) => {
  const {movieId} = request.params
  const query = `SELECT * FROM movie INNER JOIN director
  ON movie.director_id = director.director_id
  WHERE movie.movie_id = ${movieId};
  `
  const convertCamelcase = movie => {
    return {
      movieId: movie.movie_id,
      directorId: movie.director_id,
      movieName: movie.movie_name,
      leadActor: movie.lead_actor,
    }
  }
  const exe = await db.get(query)
  console.log(exe)
  response.send(convertCamelcase(exe))
})

app.put('/movies/:movieId/', async (request, response) => {
  const {movieId} = request.params
  const movieDetails = request.body
  const {directorId, movieName, leadActor} = movieDetails

  const query = `
  UPDATE movie 
  SET director_id = ${directorId},
      movie_name = '${movieName}',
      lead_actor = '${leadActor}'
  WHERE movie_id = ${movieId};
  `

  const exe = await db.run(query)
  response.send('Movie Details Updated')
})

app.delete('/movies/:movieId', async (request, response) => {
  const {movieId} = request.params
  const query = `
  DELETE FROM movie 
  WHERE movie_id = ${movieId};
  `

  const exe = await db.run(query)
  response.send('Movie Removed')
})

// directors
app.get('/directors/', async (request, response) => {
  const query = `
  SELECT director_id, director_name from director;
  `
  const convertCamelcase = director => {
    return {
      directorId: director.director_id,
      directorName: director.director_name,
    }
  }

  const exe = await db.all(query)
  response.send(exe.map(each => convertCamelcase(each)))
})

app.get('/directors/:directorId/movies', async (request, response) => {
  const {directorId} = request.params
  const query = `
  SELECT movie.movie_name from movie INNER JOIN director ON
  movie.director_id = director.director_id 
  WHERE director.director_id = ${directorId};
  `
  const convertCamelcase = name => {
    return {
      movieName: name.movie_name,
    }
  }

  const exe = await db.all(query)
  response.send(exe.map(each => convertCamelcase(each)))
})

initializeDB()

module.exports = app
