const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const isValid = require("date-fns/isValid");
const formatDate = require("date-fns/format");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "todoApplication.db");

let db = null;

const initializeDBAndserver = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http:3000");
    });
  } catch (error) {
    console.log(`DB Error ${error.message}`);
    process.exit(1);
  }
};

initializeDBAndserver();

// check validate date

const checkMethod = (request) => {
  let origindate;
  if (request.method === "GET") {
    ({ date } = request.query);
    origindate = date;
    return origindate;
  } else {
    ({ dueDate } = request.body);
    origindate = dueDate;
    return origindate;
  }
};

const isValidDate = (request, response, next) => {
  const dataDetails = checkMethod(request);
  const result = isValid(new Date(dataDetails));

  if (result === true) {
    next();
  } else {
    response.status(400);
    response.send("Invalid Due Date");
  }
};

//

// CHECK DETAILS VALIDATION

const checkRequest = (request) => {
  if (request.method === "GET") {
    return request.query;
  } else {
    return request.body;
  }
};

const checkstatusDetails = (request, response, next) => {
  const details = checkRequest(request);
  const { status, category, priority, dueDate } = details;
  if (category !== undefined) {
    if (category === "WORK" || category === "HOME" || category === "LEARNING") {
      next();
    } else {
      response.status(400);
      response.send("Invalid Todo Category");
    }
  } else if (status !== undefined) {
    if (status === "TO DO" || status === "IN PROGRESS" || status === "DONE") {
      next();
    } else {
      response.status(400);
      response.send("Invalid Todo Status");
    }
  } else if (priority !== undefined) {
    if (priority === "HIGH" || priority === "MEDIUM" || priority === "LOW") {
      next();
    } else {
      response.status(400);
      response.send("Invalid Todo Priority");
    }
  } else if (dueDate !== undefined) {
    const result = isValid(new Date(dueDate));
    if (result === true) {
      next();
    } else {
      response.status(400);
      response.send("Invalid Due Date");
    }
  } else {
    next();
  }
};

// API 1 GET METHOD

app.get("/todos/", checkstatusDetails, async (request, response) => {
  const { search_q = "", priority, status, category, due_date } = request.query;
  let getTodosQuery = "";
  let data = null;
  switch (true) {
    case priority !== undefined &&
      status !== undefined &&
      category === undefined:
      getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%'
        AND status = '${status}'
        AND priority = '${priority}';`;
      break;
    case priority !== undefined &&
      category === undefined &&
      status === undefined:
      getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%'
        AND priority = '${priority}';`;
      break;
    case status !== undefined &&
      category === undefined &&
      priority === undefined:
      getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%'
        AND status = '${status}';`;
      break;
    case category !== undefined &&
      priority !== undefined &&
      status === undefined:
      getTodosQuery = `
          SELECT * 
          FROM todo
          WHERE
          todo LIKE '%${search_q}%' AND category = '${category}' AND priority = '${priority}';
          `;
      break;
    case status !== undefined &&
      category !== undefined &&
      priority === undefined:
      getTodosQuery = `
          SELECT * 
          FROM todo
          WHERE
           todo LIKE '%${search_q}%'
           AND (category = '${category}'
        AND status = '${status}'
        );`;

      break;
    case category !== undefined &&
      status === undefined &&
      priority === undefined:
      getTodosQuery = `
        SELECT
            *
        FROM
            todo 
        WHERE
            todo LIKE '%${search_q}%'
            AND category = '${category}';`;

      break;
    default:
      getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%';`;
  }
  data = await db.all(getTodosQuery);
  response.send(data);
});

// API 2 GET METHOD

app.get("/todos/:todoId/", checkstatusDetails, async (request, response) => {
  const { todoId } = request.params;
  const getTodo = `
  SELECT *
  FROM
  todo
  WHERE id = ${todoId};
  `;
  const todo = await db.get(getTodo);
  response.send(todo);
});

// API 3 GET METHOD

app.get("/agenda/", isValidDate, async (request, response) => {
  const { date } = request.query;

  const format = formatDate(new Date(date), "yyyy-MM-dd");

  const todoDate = `
  SELECT * FROM todo WHERE due_date = '${format}';
  `;

  let todos = await db.all(todoDate);
  if (todos.length === 0) {
    response.send("Todo Does not exist");
  } else {
    response.send(todos);
  }
});

// API 4 POST METHOD

app.post(
  "/todos/",
  checkstatusDetails,
  isValidDate,
  async (request, response) => {
    const { id, todo, priority, status, category, dueDate } = request.body;
    const createTodo = `
  INSERT INTO todo 
  (id, todo, priority, status, category, due_date) 
  VALUES 
  (
      '${id}',
      '${todo}',
      '${priority}',
      '${status}',
      '${category}',
      '${dueDate}'
  );
  `;
    await db.run(createTodo);
    response.send("Todo Successfully Added");
  }
);

// API 5 PUT METHOD

app.put(
  "/todos/:todoId/",
  checkstatusDetails,

  async (request, response) => {
    const { todoId } = request.params;
    let updateColumn = "";
    let updateTodoStatus = "";
    const requestBody = request.body;
    switch (true) {
      case requestBody.status !== undefined:
        updateColumn = "Status";
        updateTodoStatus = `
        UPDATE todo SET status ='${requestBody.status}'
        WHERE id = ${todoId};
        `;
        break;
      case requestBody.priority !== undefined:
        updateColumn = "Priority";
        updateTodoStatus = `
        UPDATE todo SET priority ='${requestBody.priority}'
        WHERE id = ${todoId};
        `;
        break;
      case requestBody.todo !== undefined:
        updateColumn = "Todo";
        updateTodoStatus = `
        UPDATE todo SET todo ='${requestBody.todo}'
        WHERE id = ${todoId};
        `;
        break;
      case requestBody.dueDate !== undefined:
        updateColumn = "Due Date";
        updateTodoStatus = `
        UPDATE todo SET due_date ='${requestBody.dueDate}'
        WHERE id = ${todoId};
        `;
        break;
      case requestBody.category !== undefined:
        updateColumn = "Category";
        updateTodoStatus = `
        UPDATE todo SET category = '${requestBody.category}'
        WHERE id = ${todoId};
        `;
    }

    await db.run(updateTodoStatus);
    response.send(`${updateColumn} Updated`);
  }
);

/// API 6 DELETE METHOD

app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const getTodo = `
  SELECT * FROM todo WHERE id = ${todoId};
  `;
  const todo = await db.get(getTodo);
  if (todo !== undefined) {
    const deleteTodoQuery = `
    DELETE FROM
        todo
    WHERE
        id = ${todoId};`;
    await db.run(deleteTodoQuery);
    response.send("Todo Deleted");
  } else {
    response.send("Todo Already Deleted");
  }
});

module.exports = app;
