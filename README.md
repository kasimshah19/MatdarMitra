<div align="center">
  <h1>🗳️ MatdarMitra</h1>
  <i>An AI-Assisted Document Intelligence & Civic Data Platform</i>
  <br/><br/>
  
  <p>
    <img src="https://img.shields.io/badge/Frontend-React%20%7C%20Next.js-blue?style=for-the-badge&logo=react" alt="React" />
    <img src="https://img.shields.io/badge/Backend-Node.js%20%7C%20Express-green?style=for-the-badge&logo=node.js" alt="Node" />
    <img src="https://img.shields.io/badge/Worker_Service-Python%20%7C%20FastAPI-009688?style=for-the-badge&logo=fastapi" alt="FastAPI" />
    <img src="https://img.shields.io/badge/Database-MongoDB-47A248?style=for-the-badge&logo=mongodb" alt="MongoDB" />
    <img src="https://img.shields.io/badge/AI_Engine-OpenCV%20%7C%20Tesseract-ff9800?style=for-the-badge&logo=opencv" alt="OpenCV" />
  </p>
</div>

<hr />

## 🌟 Executive Summary

**MatdarMitra** is a specialized, production-ready full-stack application built to solve a critical data-extraction bottleneck: autonomously converting unstructured, monolithic government electoral rolls (Voter PDF scans) into highly actionable, searchable, and structured databases.

Traditionally, extracting regional civic data from heavy PDF scans leads to browser timeouts and memory crashes. MatdarMitra overcomes this by utilizing a **Decoupled Microservices Architecture**, blending a seamless React user interface with a background Node.js gateway, backed by a heavyweight Python/Computer Vision extraction engine.

---

## 🚀 Key Architectural Features

| Feature | Technical Implementation | Impact |
| :--- | :--- | :--- |
| **Decoupled Microservices** | Strict separation of Next.js frontend, Node.js/Express gateway, and Python/FastAPI worker. | Guarantees the frontend never hangs or times out (HTTP 202 Async Polling) during computationally heavy tasks. |
| **Resilient OCR Pipeline** | PyMuPDF rendering ➔ OpenCV morphological layout detection ➔ Tesseract OCR. | Successfully parses messy bilingual files (Marathi & English) isolating individual voter cards with extreme accuracy. |
| **OS ThreadPool Tuning** | C++ ThreadPoolExecutor bounded precisely via `OCR_CONCURRENCY=2`. | Prevents OpenMP internal thread explosions, eliminating memory starvation and fatal OS live-locks during 40+ page processing. |
| **Data Preservation** | Mongoose `$or` conditional pipelines with dynamic `needsReview` flags. | Missing OCR confidence on a single field never drops a valid citizen; messy records are surfaced for manual review safely. |
| **Server-Side Pagination** | Optimized MongoDB indexed queries (`skip` & `limit`) bounded by explicit total counts. | Instantly loads gigabytes of analytical data into the React UI without freezing the client's browser heap. |

---

## 🧠 System Architecture Flow

The system coordinates exactly like a modern enterprise data pipeline:

1. **Client Upload**: User uploads a 40+ page heavy PDF via the **React Context API**.
2. **Gateway Registration**: **Node.js Gateway** instantly registers the file grid, generates a MongoDB `Document` Schema ID, and immediately returns a `HTTP 202 Accepted` to free the browser.
3. **Background Processing**: Node.js forwards the payload to the **Python Microservice**.
4. **Machine Vision Extraction**: Python slices the PDF, utilizes **OpenCV** math to detect absolute voter-card geometry grids, and pipes crops into **Tesseract OCR**.
5. **Real-time Synchronization**: The React frontend securely polls the Node Gateway every 3 seconds to fetch dynamic pipeline statuses. 
6. **Data Formatting**: User seamlessly filters, searches, builds Custom Family Lists across pages safely, and exports them directly natively to **Word / Excel / PDF**.

---

## 🛠️ Technology Stack Breakdown

| Layer | Technologies Selected | Justification |
| :--- | :--- | :--- |
| **Frontend UI** | React 18, Next.js, Tailwind CSS, Lucide Icons | Component-driven architecture ensuring state immutability and blazing fast hydrated client rendering. |
| **Backend Gateway** | Node.js, Express.js, Multer | Lightweight event-loop capabilities perfect for proxying I/O polling requests and handling multi-part file streams. |
| **AI / Extraction** | Python 3, FastAPI, OpenCV, PyTesseract, PyMuPDF | The sheer mathematical ecosystem of Python allows for precision image matrix slicing and NLP extraction. |
| **Database** | Mongodb, Mongoose ORM | Document-level NoSQL scaling allows for highly dynamic schema properties and rapid chunk updates. |

---

## ⚙️ Local Setup & Installation

*Because this is a microservices architecture, you will need to spin up the independent servers concurrently.*

### 1. Start the MongoDB Connection & Node Gateway
```bash
cd backend
npm install
# Ensure you have your MongoDB URI in a .env file
npm run dev
```

### 2. Start the AI Extraction Worker
```bash
cd extraction-service
# (Recommended) Activate your Python virtual environment
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
# Note: Ensure system-level Tesseract-OCR is installed and added to PATH.
```

### 3. Start the Next.js Client
```bash
# In the root MatdarMitra directory
npm install
npm run dev
# Running on http://localhost:3000
```

---

<div align="center">
  <b>Developed thoughtfully by Kasim Shah.</b> <br/>
  <i>Engineered for scale. Built for impact.</i>
</div>
