// Helper script to send chat messages with guaranteed UTF-8 encoding
// Usage: node send-chat.js <from> <fromName> <fromRole> <content> [context]

const http = require('http');

const args = process.argv.slice(2);
if (args.length < 4) {
  console.log('Usage: node send-chat.js <from> <fromName> <fromRole> <content> [context]');
  console.log('Example: node send-chat.js user You user "你好世界"');
  process.exit(1);
}

const [from, fromName, fromRole, content, context = 'default'] = args;

const data = JSON.stringify({
  type: 'chat_message',
  data: { from, fromName, fromRole, content, context }
});

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/events',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(data)
  }
};

const req = http.request(options, (res) => {
  let body = '';
  res.setEncoding('utf8');
  res.on('data', (chunk) => { body += chunk; });
  res.on('end', () => {
    console.log('Sent:', content);
    console.log('Response:', body);
  });
});

req.on('error', (e) => {
  console.error('Error:', e.message);
});

req.write(data);
req.end();
