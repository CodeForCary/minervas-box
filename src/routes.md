# Routes

Routes used in the app.


## High level pages

- `/` home page
- `/about` about page

## State

- `/:state` matches /nc, /ca, /ny, etc.

Shows list of available cities.

## City

- `/:state/:city` matches /nc/cary, /ca/ventura, etc. Shows list of artwork for city.
- `/cities` All cities.
- `/cities/around-me` Cities near geolocated coords.

## Artwork

Proposed routes for artwork:

- `/:state/:city/:art-id` Because a piece of art belongs to a city.
- `/art/:id` Because a piece of art is a thing of its own.
- `/collection/:collection-id/:art-id` Because art item can be in an "art walk" collection.

Let's say you have a piece of art with ID of `42`, that means you can visit that artwork's page via:

- /nc/cary/42
- /art/42
- /collection/1/42

Collections aren't going to be in version 1.0 but something to at least think about. Artwork blogs would be the only reason to need the second route which are also coming after version 1.0.

Question: Do city folk or artists care about the route? I'm curious if they would prefer the artwork *name* instead of the id. Perhaps we can make a route for both? <NAME_ROUTE> -> <ID_ROUTE>?
