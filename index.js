import { downloadRetailFile } from "./process/retail.js";
import { LowSync } from "lowdb";
import { JSONFileSync } from "lowdb/node";
import { v4 } from "uuid";
import Queue from 'queue'
import express from "express";
import { Process } from "./process/process.js";

const app = express();
const port = process.env.PORT || 8080;


//TODO: Transfer app logic to Typescript in future;
const q = new Queue({ results: [] })
const db = new LowSync(new JSONFileSync('./database/process.json'), { processes: [] });

db.read();

const processes = db.data.processes;

//Create retail process
app.post('/retail', async (req,res) => {
    q.push(downloadRetailFile)
    
   const process = new Process(v4(), (new Date).toUTCString(), 'retail', 0, processes);
   const processFile = await process.createProcess(db);

    res.send("Retail process added to queue");
    q.start(async (err) => {
      if (err) {
        await process.updateProcessFile({ ...processFile, status: 3 }, db);
        throw err;
      } else {
        await process.updateProcessFile({ ...processFile, status: 2 }, db);
      }
      console.log('all done:', q.results)
    })
});

//Get All
app.get('/process', (req,res) => {
  const page = req.query.page;
  const pageSize = req.query.pageSize;
  if(!page || !pageSize) return res.status(400).json({ message: "Page or pageSize is required!"})
  res.json({ data: Process.getAllProcesses(page, pageSize, processes), page, pageSize });
})

//Get by unique
app.get('/process/:id', (req,res) => res.json(Process.getProcessById(req.params.id, processes)));


q.addEventListener('success', e => {
    console.log('job finished processing:', e.detail.toString().replace(/\n/g, ''))
  })



app.listen(port, () => console.log(`Application initialized in port ${port}`))