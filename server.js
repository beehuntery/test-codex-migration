const path = require('path');

function isMissingCompiledOutput(error, targetPath) {
  if (!error || typeof error !== 'object') {
    return false;
  }
  if (error.code !== 'MODULE_NOT_FOUND') {
    return false;
  }
  if (typeof error.message !== 'string') {
    return false;
  }
  return error.message.includes(targetPath);
}

function loadBuiltServer() {
  const builtPath = path.resolve(__dirname, 'dist', 'server', 'index.js');
  try {
    // eslint-disable-next-line import/no-dynamic-require, global-require
    return require(builtPath);
  } catch (error) {
    if (isMissingCompiledOutput(error, builtPath)) {
      throw new Error('Build output not found. Run "npm run build" before starting the server.');
    }
    throw error;
  }
}

const exported = loadBuiltServer();

module.exports = exported;

if (require.main === module && typeof exported.startServer === 'function') {
  exported
    .startServer()
    .catch((err) => {
      console.error('Failed to start the server:', err);
      process.exit(1);
    });
}
