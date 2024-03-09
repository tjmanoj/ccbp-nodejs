const express = require('express')
const path = require('path')
const sqlite3 = require('sqlite3')
const {open} = require('sqlite')
const dbPath = path.join(__dirname, 'todoApplication.db')
const app = express()
app.use(express.json())

const {isValid, format} = require('date-fns')

let db = null

const initializeDBandServer = async (request, response) => {
  db = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  })

  app.listen(3000, () => console.log('server started'))
}

const authenticateBody = async (request, response, next) => {
  const {status = '', priority = '', category = '', dueDate = ''} = request.body
  const isStatus = status => {
    const possibilites = ['TO DO', 'IN PROGRESS', 'DONE']

    if (status === '') return false
    else if (status !== undefined && possibilites.includes(status)) return false
    else return true
  }
  const isPriority = priority => {
    const possibilites = ['HIGH', 'MEDIUM', 'LOW']
    if (priority === '') return false
    else if (priority !== undefined && possibilites.includes(priority))
      return false
    else return true
  }
  const isCategory = category => {
    const possibilites = ['WORK', 'HOME', 'LEARNING']
    if (category === '') return false
    else if (category !== undefined && possibilites.includes(category))
      return false
    else return true
  }
  const isduedate = dueDate => {
    let finalDate = isValid(new Date(dueDate))
    if (dueDate === '') return false
    if (finalDate) return false
    else return true
  }

  if (isStatus(status)) {
    response.status(400)
    response.send('Invalid Todo Status')
  } else if (isPriority(priority)) {
    response.status(400)
    response.send('Invalid Todo Priority')
  } else if (isCategory(category)) {
    response.status(400)
    response.send('Invalid Todo Category')
  } else if (isduedate(dueDate)) {
    response.status(400)
    response.send('Invalid Due Date')
  } else next()
}
const authenticateQuery = async (request, response, next) => {
  const {
    status = '',
    priority = '',
    category = '',
    date = '',
    search_q = '',
  } = request.query
  const isStatus = status => {
    const possibilites = ['TO DO', 'IN PROGRESS', 'DONE']

    if (status === '') return false
    else if (status !== undefined && possibilites.includes(status)) return false
    else return true
  }
  const isPriority = priority => {
    const possibilites = ['HIGH', 'MEDIUM', 'LOW']
    if (priority === '') return false
    else if (priority !== undefined && possibilites.includes(priority))
      return false
    else return true
  }
  const isCategory = category => {
    const possibilites = ['WORK', 'HOME', 'LEARNING']
    if (category === '') return false
    else if (category !== undefined && possibilites.includes(category))
      return false
    else return true
  }
  const isDuedate = dueDate => {
    // const formattedDate = format(new Date(dueDate), 'yyyy-MM-dd')
    let finalDate = isValid(new Date(dueDate))
    if (date === '') return false
    if (finalDate) return false
    else return true
  }

  if (isStatus(status)) {
    response.status(400)
    response.send('Invalid Todo Status')
  } else if (isPriority(priority)) {
    response.status(400)
    response.send('Invalid Todo Priority')
  } else if (isCategory(category)) {
    response.status(400)
    response.send('Invalid Todo Category')
  } else if (isDuedate(date)) {
    response.status(400)
    response.send('Invalid Due Date')
  } else next()
}

// API - 1
app.get('/todos/', authenticateQuery, async (request, response) => {
  let query = ''
  const {status, priority, category, dueDate, search_q = ''} = request.query

  const isCategoryandPriority = queryobj => {
    return queryobj.category !== undefined && queryobj.priority !== undefined
  }
  const isCategoryandStatus = queryobj => {
    return queryobj.category !== undefined && queryobj.status !== undefined
  }
  const isPriorityandStatus = queryobj => {
    return queryobj.priority !== undefined && queryobj.status !== undefined
  }
  const isCategory = queryobj => {
    return queryobj.category !== undefined
  }
  const isPriority = queryobj => {
    return queryobj.priority !== undefined
  }
  const isStatus = queryobj => {
    return queryobj.status !== undefined
  }
  switch (true) {
    case isCategoryandPriority(request.query):
      query = `
      SELECT * from todo
      where category = '${category}' and priority= '${priority}';
      `
      break

    case isCategoryandStatus(request.query):
      query = `
      SELECT * from todo
      where category = '${category}' and status= '${status}';
      `
      break

    case isPriorityandStatus(request.query):
      query = `
      SELECT * from todo
      where priority = '${priority}' and status= '${status}';
      `
      break

    case isStatus(request.query):
      query = `
      SELECT * from todo
      where status= '${status}';
      `
      break

    case isPriority(request.query):
      query = `
      SELECT * from todo
      where priority= '${priority}';
      `
      break

    case isCategory(request.query):
      query = `
      SELECT * from todo
      where category= '${category}';
      `
      break

    default:
      query = `
      SELECT * from todo
      where todo LIKE '%${search_q}%';
      `
      break
  }

  const dbQuery = await db.all(query)
  response.send(
    dbQuery.map(exe => ({
      id: exe.id,
      todo: exe.todo,
      priority: exe.priority,
      status: exe.status,
      category: exe.category,
      dueDate: exe.due_date,
    })),
  )
})

// API -2

app.get('/todos/:todoId', async (request, response) => {
  const {todoId} = request.params
  query = `
      SELECT * from todo
      where id = ${todoId};
      `
  const exe = await db.get(query)
  response.send({
    id: exe.id,
    todo: exe.todo,
    priority: exe.priority,
    status: exe.status,
    category: exe.category,
    dueDate: exe.due_date,
  })
})

app.get('/agenda/', authenticateQuery, async (request, response) => {
  const {date} = request.query
  const dateformat = format(new Date(date), 'yyyy-MM-dd')
  const query = `
  SELECT * from todo
  where due_date = '${dateformat}';
  `
  const dbQuery = await db.all(query)
  response.send(
    dbQuery.map(exe => ({
      id: exe.id,
      todo: exe.todo,
      priority: exe.priority,
      status: exe.status,
      category: exe.category,
      dueDate: exe.due_date,
    })),
  )
})

// API - 4
app.post('/todos', authenticateBody, async (request, response) => {
  const {id, todo, priority, status, category, dueDate} = request.body
  const dateformat = format(new Date(dueDate), 'yyyy-MM-dd')
  const query = `
  INSERT INTO todo(id,todo,priority,status,category,due_date)
  VALUES(${id},
         '${todo}',
         '${priority}',
         '${status}',
         '${category}',
         '${dateformat}'
  );
  `

  await db.run(query)
  response.send('Todo Successfully Added')
})

// API - 5
app.put('/todos/:todoId', authenticateBody, async (request, response) => {
  const {todoId} = request.params
  const {status, priority, todo, category, dueDate} = request.body
  let query = ''

  if (status !== undefined) {
    query = `
    UPDATE todo 
    SET status = '${status}'
    where id = ${todoId};
    `
    await db.run(query)
    response.send('Status Updated')
  } else if (priority !== undefined) {
    query = `
    UPDATE todo 
    SET priority = '${priority}'
    where id = ${todoId};
    `
    await db.run(query)
    response.send('Priority Updated')
  } else if (todo !== undefined) {
    query = `
    UPDATE todo 
    SET todo = '${todo}'
    where id = ${todoId};
    `
    await db.run(query)
    response.send('Todo Updated')
  } else if (category !== undefined) {
    query = `
    UPDATE todo 
    SET category = '${category}'
    where id = ${todoId};
    `
    await db.run(query)
    response.send('Category Updated')
  } else {
    const dateformat = format(new Date(dueDate), 'yyyy-MM-dd')
    query = `
    UPDATE todo 
    SET due_date = '${dateformat}'
    where id = ${todoId};
    `
    await db.run(query)
    response.send('Due Date Updated')
  }
})

app.delete('/todos/:todoId', authenticateQuery, async (request, response) => {
  const {todoId} = request.params
  const query = `
  DELETE from todo
  where id = ${todoId};
  `
  await db.run(query)
  response.send('Todo Deleted')
})

initializeDBandServer()

module.exports = app
