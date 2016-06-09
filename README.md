# Slither.io-Client

This is an open source client implementation for Slither.io

# Youtube

you can support me on youtube:
https://www.youtube.com/channel/UCcFiS_0X7Lz6V5rhy2C4MAQ

# DONATION

In order to keep the project up I would be appriciated for any donations:

Paypal: agarbotsDavid@gmail.com
Bitcoin: coming soon

# API

I only implemented the basics, maybe I will implement more soon.

To create a new Client do:

`var SlitherioClient = require('./slitherio-client.js');`

`var Slitherclient = new SlitherioClient('TestClient');`

`// You can move the client to all x, and y coordinates - just do:`

`Slitherclient.moveTo(x, y);`

You can also boost your Snake:

`// Start Boosting`
`Slitherclient.StartBoostSnake();`

`// Stop Boost`
`Slitherclient.StopBoostSnake();`
