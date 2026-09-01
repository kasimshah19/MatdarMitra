# MatdarMitra - Node.js Backend

Acts as the DB middleware and orchestrator between the Next.js React frontend and the Python OCR `extraction-service`.

## Setup and Running

1. **Start the Python Extraction Service**
   Refer to `../extraction-service/README.md`. Ensure it is running on `http://localhost:8000`.

2. **Start MongoDB**
   Make sure your local MongoDB instance is running. (e.g. `sudo systemctl start mongod` or launch your MongoDB GUI/Docker container).

3. **Install Dependencies in Backend**
   ```bash
   cd backend
   npm install
   ```
   
4. **Environment Settings**
   Copy `.env.example` to `.env` and verify your MongoDB connection string (defaults to `mongodb://localhost:27017/matdarmitra`).
   ```bash
   cp .env.example .env
   ```

5. **Run the Node.js Server**
   ```bash
   npm run dev
   ```
   The backend will boot up on `http://localhost:5000`.

## Key Endpoints
* `GET /api/health` — Confirms MongoDB connection and verifies the Python microservice is reachable.
* `POST /api/upload` — Accepts `multipart/form-data` with a `.pdf` file. Forwards directly to Python for processing, then parses and Upserts the results into the MongoDB `Voter` collection (using `epcNo` and `partNo` as a compound unique key). Returns processing stat summary to the frontend.
