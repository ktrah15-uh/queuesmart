const app = require('./src/app');
const { PORT } = require('./src/config');

app.listen(PORT, () => {
    console.log(`QueueSmart backend is running on http://localhost:${PORT}`);
});