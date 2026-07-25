const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://neondb_owner:npg_5oFXVn4vNQtP@ep-gentle-mud-azrppicb.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
});

client.connect()
  .then(() => {
    console.log('Connected to Neon successfully using pg module!');
    client.end();
  })
  .catch(err => {
    console.error('Failed to connect:', err);
  });
