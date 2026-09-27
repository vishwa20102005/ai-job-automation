import localtunnel from 'localtunnel';

(async () => {
  const port = 8000;
  console.log(`Starting live public tunnel for port ${port}...`);
  try {
    const tunnel = await localtunnel({ port });
    console.log(`\n=========================================`);
    console.log(`🚀 CareerPilot AI LIVE PUBLIC URL:`);
    console.log(`${tunnel.url}`);
    console.log(`=========================================\n`);

    tunnel.on('close', () => {
      console.log('Tunnel closed');
    });

    tunnel.on('error', (err) => {
      console.error('Tunnel error:', err);
    });
  } catch (err) {
    console.error('Failed to create tunnel:', err);
  }
})();
