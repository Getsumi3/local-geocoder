import express from 'express';
import cors from 'cors';
import geocoder, { PointsEntry } from './index.js';

const app = express();
let isGeocodeInitialized = false;

app.use(cors());

app.get('/healthcheck', function(req, res) {
  res.status(200).send('OK');
});

app.get('/deep-healthcheck', function(req, res) {
  if (isGeocodeInitialized) {
    res.status(200).send('OK');
  } else {
    res.status(503).send('Not ready yet.');
  }
});

app.get('/reverse-geocode', function(req, res) {
  if (!isGeocodeInitialized) {
    res.status(503).send('Not ready yet.');
    return;
  }

  const lat = req.query.latitude || false;
  const lon = req.query.longitude || false;
  const maxResults = Number(req.query.maxResults || 1);

  const points: Array<PointsEntry> = [];
  if (Array.isArray(lat) && Array.isArray(lon)) {
    if (
      lat.length !== lon.length ||
      lat.some((entry) => typeof entry !== 'string') ||
      lon.some((entry) => typeof entry !== 'string')
    ) {
      res.status(400).send('Bad Request');
      return;
    }

    for (let i = 0, lenI = lat.length; i < lenI; i++) {
      points[i] = { latitude: lat[i] as string, longitude: lon[i] as string };
    }
  } else {
    if (typeof lat !== 'string' || typeof lon !== 'string') {
      res.status(400).send('Bad Request');
      return;
    }

    points.push({ latitude: lat, longitude: lon });
  }

  geocoder.reverseLookup(points, maxResults, function(err, addresses) {
    if (err) {
      res.status(500).send(err);
      return;
    }

    res.send(addresses);
  });
});

app.get('/geocode', function(req, res) {
  if (!isGeocodeInitialized) {
    res.status(503).send('Not ready yet.');
    return;
  }

  const location = req.query.location || false;
  const maxResults = Number(req.query.maxResults || 1);

  const terms: Array<string> = [];
  if (Array.isArray(location)) {
    if (terms.length === 0) {
      res.status(400).send('Bad Request');
      return;
    }
    for (let i = 0, lenI = location.length; i < lenI; i++) {
      terms[i] = location[i];
    }
  } else {
    if (location.length === 0) {
      res.status(400).send('Bad Request');
      return;
    }

    terms.push(location);
  }

  geocoder.lookup(terms, maxResults, function(err, addresses) {
    if (err) {
      res.status(500).send(err);
      return;
    }

    res.send(addresses);
  });
});


const port = Number(process.env.PORT || 5636);
app.listen(port, function() {
  console.log('Local reverse geocoder listening on port ' + port);
  console.log('Initializing Geocoder…');
  console.log(
    '(This may take a long time and will download ~2.29GB worth of data by default.)',
  );

  geocoder.init(
    {
      citiesFileOverride: 'cities500',
      load: {
        admin1: true,
        admin2: true,
        admin3And4: true,
        alternateNames: true,
      },
      countries: [],
    },
    function() {
      console.log('Geocoder initialized and ready.');
      console.log('Endpoints:');
      console.log(`- http://localhost:${port}/healthcheck`);
      console.log(`- http://localhost:${port}/deep-healthcheck`);
      console.log(`- http://localhost:${port}/reverse-geocode`);
      console.log(`- http://localhost:${port}/geocode`);
      console.log('Examples:');
      console.log(
        `- http://localhost:${port}/reverse-geocode?latitude=54.6875248&longitude=9.7617254`,
        `- http://localhost:${port}/geocode?location=London`,
      );
      isGeocodeInitialized = true;
    },
  );
});
