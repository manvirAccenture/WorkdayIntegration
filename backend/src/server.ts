import app from './app';
import { env } from './config/env';
import { pollerService } from './services/poller.service';

const PORT = env.PORT;

const server = app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔗 API Base: http://localhost:${PORT}/api`);
  console.log(`=========================================`);

  // Start background poller scheduler
  // pollerService.start();
});

// Handle graceful shutdown
const gracefulShutdown = () => {
  console.log('Received kill signal, shutting down gracefully...');
  pollerService.stop();
  server.close(() => {
    console.log('Closed remaining connections.');
    process.exit(0);
  });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
