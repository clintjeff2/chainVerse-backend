const express = require('express');
const certificateRoutes = require('./routes/certificates');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use('/certificates', certificateRoutes);

app.get('/', (req, res) => {
	res.send('ChainVerse Certificate API is running.');
});
app.use('/api/challenges', require('./src/routes/challengeRoutes'));

app.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}`);
});
