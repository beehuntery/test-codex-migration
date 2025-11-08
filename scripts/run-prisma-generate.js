const { execSync } = require('child_process');

if (process.env.SKIP_PRISMA_GENERATE === '1') {
  console.log('Skipping prisma:generate because SKIP_PRISMA_GENERATE=1');
  process.exit(0);
}

execSync('npm run prisma:generate', { stdio: 'inherit' });
