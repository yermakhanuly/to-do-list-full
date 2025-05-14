const express = require('express');
const { MongoClient, ObjectId } = require('mongodb'); // Import ObjectId

const app = express();
const port = process.env.PORT || 5000;

// MongoDB Connection URL and Database Name
const mongoUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = 'todoapp';
const collectionName = 'tasks';

let db;
let tasksCollection;

// Connect to MongoDB
MongoClient.connect(mongoUrl)
  .then(client => {
    console.log('Connected successfully to MongoDB server');
    db = client.db(dbName);
    tasksCollection = db.collection(collectionName);
  })
  .catch(err => {
    console.error('Failed to connect to MongoDB', err);
    process.exit(1); // Exit if DB connection fails
  });

// Middleware to parse JSON bodies
app.use(express.json());

// --- API Endpoints ---

// GET /tasks - Fetch all tasks
app.get('/tasks', async (req, res) => {
  if (!tasksCollection) {
    return res.status(503).send('Database not initialized');
  }
  try {
    const tasks = await tasksCollection.find({}).toArray();
    res.json(tasks);
  } catch (err) {
    console.error('Error fetching tasks:', err);
    res.status(500).send('Error fetching tasks');
  }
});

// POST /tasks - Add a new task
app.post('/tasks', async (req, res) => {
  if (!tasksCollection) {
    return res.status(503).send('Database not initialized');
  }
  try {
    const newTask = {
      text: req.body.text,
      completed: false,
      createdAt: new Date() // Optional: add a creation timestamp
    };
    if (!newTask.text) {
        return res.status(400).json({ message: "Task text cannot be empty" });
    }
    const result = await tasksCollection.insertOne(newTask);
    // The inserted document will have an _id field added by MongoDB.
    // We can return the document as it is stored in the DB.
    const insertedTask = await tasksCollection.findOne({_id: result.insertedId});
    res.status(201).json(insertedTask);
  } catch (err) {
    console.error('Error adding task:', err);
    res.status(500).send('Error adding task');
  }
});

// PUT /tasks/:id - Update a task (e.g., mark as complete/incomplete)
app.put('/tasks/:id', async (req, res) => {
  if (!tasksCollection) {
    return res.status(503).send('Database not initialized');
  }
  try {
    const taskId = req.params.id;
    const { text, completed } = req.body;
    
    if (!ObjectId.isValid(taskId)) {
        return res.status(400).json({ message: "Invalid task ID format" });
    }

    const updateDoc = {};
    if (typeof text !== 'undefined') {
      updateDoc.text = text;
    }
    if (typeof completed === 'boolean') {
      updateDoc.completed = completed;
    }

    if (Object.keys(updateDoc).length === 0) {
        return res.status(400).json({ message: "No update fields provided" });
    }
    updateDoc.updatedAt = new Date(); // Optional: add an update timestamp

    const result = await tasksCollection.updateOne(
      { _id: new ObjectId(taskId) },
      { $set: updateDoc }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }
    const updatedTask = await tasksCollection.findOne({_id: new ObjectId(taskId)});
    res.json(updatedTask);
  } catch (err) {
    console.error('Error updating task:', err);
    res.status(500).send('Error updating task');
  }
});

// DELETE /tasks/:id - Remove a task
app.delete('/tasks/:id', async (req, res) => {
  if (!tasksCollection) {
    return res.status(503).send('Database not initialized');
  }
  try {
    const taskId = req.params.id;
    if (!ObjectId.isValid(taskId)) {
        return res.status(400).json({ message: "Invalid task ID format" });
    }
    const result = await tasksCollection.deleteOne({ _id: new ObjectId(taskId) });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }
    res.status(204).send(); // No content
  } catch (err) {
    console.error('Error deleting task:', err);
    res.status(500).send('Error deleting task');
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 