# Travel Map Helper

A helper application for planning travel, featuring maps, guide maps, spot lists, route lists, and questions.

## Project Structure

- `main.go`: Backend entry point.
- `server/`: Backend server logic and API.
  - `store/`: File-based data persistence.
- `travel-map-react/`: React frontend.

## Features

- **Map**: View and edit map URL.
- **Guide Map**: Manage a list of guide images.
- **Spots**: Manage travel spots with details (Time, Interior, Story).
- **Routes**: Manage travel routes.
- **Questions**: Track questions and answers.

## Persistence

Data is stored in the `travel-data` directory. This directory is automatically created if it doesn't exist.
Individual JSON files are used for different data sections:
- `spots.json`
- `routes.json`
- `questions.json`
- `config.json`
- `guide_images.json`

## Running the Project

1.  Ensure you have Go and Node.js/Bun installed.
2.  Run the application:
    ```bash
    go run main.go
    ```
    This will start the backend server and proxy requests to the frontend dev server (started automatically).

## Development

- Frontend code is in `travel-map-react`.
- Backend code is in `server`.

