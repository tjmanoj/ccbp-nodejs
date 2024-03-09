const express = require('express')
const app = express()
const path = require('path')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')

const dbPath = path.join(__dirname, 'todoApplication.db')
app.use(express.json())
let db = null

const initializeDB = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })

    app.listen(3000, () => console.log('server started'))
  } catch (e) {
    console.log(`DB error: ${e}`)
  }
}

app.get('/todos', async (request, response) => {
  const {status, priority, search_q} = request.query
  let query = null

  const isStatus = reqQuery => {
    return reqQuery.status !== undefined
  }

  const ispriority = reqQuery => {
    return reqQuery.priority !== undefined
  }

  const isStatusandPrioriy = reqQuery => {
    return reqQuery.status !== undefined && reqQuery.priority !== undefined
  }

  switch (true) {
    case isStatusandPrioriy(request.query):
      query = `
      SELECT * from todo
      WHERE status = '${status}'
      AND priority = '${priority}';
     `
      break

    case isStatus(request.query):
      query = `
      SELECT * from todo
      WHERE status = '${status}';
     `
      break

    case ispriority(request.query):
      query = `
      SELECT * from todo
      WHERE priority = '${priority}';
     `
      break

    default:
      query = `
      SELECT * from todo
      WHERE todo LIKE '%${search_q}%';
     `
      break
  }

  const exe = await db.all(query)
  response.send(exe)
})

app.get('/todos/:todoId', async (request, response) => {
  const {todoId} = request.params
  const query = `
  SELECT * from todo
  WHERE id = ${todoId};
  `

  const exe = await db.get(query)
  response.send(exe)
})

// POST request
app.post('/todos/', async (request, response) => {
  const {id, todo, priority, status} = request.body
  const query = `
  INSERT INTO todo(id, todo, priority, status)
  VALUES(${id}, '${todo}', '${priority}', '${status}');
  `

  const exe = await db.run(query)
  response.send('Todo Successfully Added')
})

//PUT request
app.put('/todos/:todoId', async (request, response) => {
  const {todoId} = request.params
  const {status, priority, todo} = request.body
  let query = null

  const isStatus = reqQuery => {
    return reqQuery.status !== undefined
  }

  const ispriority = reqQuery => {
    return reqQuery.priority !== undefined
  }

  switch (true) {
    case isStatus(request.body):
      query = `
      UPDATE todo set status = '${status}'
      WHERE id = ${todoId};
      `
      await db.run(query)
      response.send('Status Updated')
      break

    case ispriority(request.body):
      query = `
      UPDATE todo set priority = '${priority}'
      WHERE id = ${todoId};
      `
      await db.run(query)
      response.send('Priority Updated')
      break

    default:
      query = `
      UPDATE todo set todo = '${todo}'
      WHERE id = ${todoId};
      `
      await db.run(query)
      response.send('Todo Updated')
      break
  }
})

app.delete('/todos/:todoId', async (request, response) => {
  const {todoId} = request.params
  const query = `
  DELETE from todo where id = ${todoId};
  `

  await db.run(query)
  response.send('Todo Deleted')
})

initializeDB()
module.exports = app
