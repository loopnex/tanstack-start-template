import emailWorker from './emailWorker'

// Worker registry
const workers = [emailWorker]

// Graceful shutdown
const shutdown = async () => {
  await Promise.all(workers.map((worker) => worker.close()))
  process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
