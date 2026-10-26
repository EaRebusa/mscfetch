#!/usr/bin/env node

import { runController } from '../src/controllers/appController.js';

runController().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
