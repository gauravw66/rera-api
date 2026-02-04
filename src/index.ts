import express from 'express';
import cors from 'cors';
import 'express-async-errors';
import { config } from './configs/env.config';
import { reraRouter } from './modules/rera/rera.routes';

import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './configs/swagger.config';

const app = express();
const port = config.port;

app.use(cors());
app.use(express.json());
app.use(express.static('public')); // For captcha.html

// Swagger setup
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Routes
app.use('/api/rera', reraRouter);

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err : undefined,
  });
});

app.listen(port, async () => {
  console.log(`Server is running on port ${port}`);
  console.log(`\x1b[32m%s\x1b[0m`, `Health check: http://localhost:${port}/health`);
  console.log(`\x1b[34m%s\x1b[0m`, `Swagger Docs: http://localhost:${port}/api-docs`);
  
  // Initialize token refresh service
  const { TokenRefreshService } = await import('./utils/token.refresh.service');
  await TokenRefreshService.initialize();
});
