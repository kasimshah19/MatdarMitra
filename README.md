<div align="center">
  
  <h1>🗳️ MatdarMitra (मतदारमित्र)</h1>
  <i>An Enterprise-Grade Document Intelligence & Civic Data Platform</i>
  
  <br/><br/>
  
  <p>
    <img src="https://img.shields.io/badge/Frontend-React%20%7C%20Next.js-blue?style=for-the-badge&logo=react" alt="React" />
    <img src="https://img.shields.io/badge/Backend-Node.js%20%7C%20Express-green?style=for-the-badge&logo=node.js" alt="Node" />
    <img src="https://img.shields.io/badge/Worker_Service-Python%20%7C%20FastAPI-009688?style=for-the-badge&logo=fastapi" alt="FastAPI" />
    <img src="https://img.shields.io/badge/Database-MongoDB-47A248?style=for-the-badge&logo=mongodb" alt="MongoDB" />
    <img src="https://img.shields.io/badge/AI_Engine-OpenCV%20%7C%20Tesseract-ff9800?style=for-the-badge&logo=opencv" alt="OpenCV" />
  </p>

  <p>
    <b>Bridging the gap between unstructured government documents and actionable civic data.</b>
  </p>
</div>

<hr />

## 📖 The Problem: Why MatdarMitra?

In India, **Electoral Rolls (Voter Lists)** are public documents released as massive, image-heavy, 40+ page PDFs. They are often scanned poorly, contain bilingual text (English & Regional languages like Marathi), and use complex grid layouts. 

For civic tech workers, political analysts, and researchers, manually digitizing these PDFs into Excel sheets or databases takes days of grueling manual data entry. Standard OCR (Optical Character Recognition) tools fail completely due to the dense tabular grid and intersecting lines. Furthermore, processing such massive documents on a standard web application inevitably leads to browser timeouts and memory crashes.

## 💡 The Solution

**MatdarMitra** is a fully automated, AI-driven extraction pipeline and dashboard. It takes a raw, unstructured government PDF voter roll and autonomously transforms it into a highly actionable, searchable, and structured cloud database. 

It completely abstracts away the heavy lifting using a **Decoupled Microservices Architecture**, guaranteeing a seamless user experience even when the backend is processing thousands of images.

---

## ✨ Core Features (Business Value)

- 📄 **Intelligent Document Processing:** Upload a 40+ page voter roll PDF, and the AI will slice, align, and read bilingual text accurately.
- 👨‍👩‍👧‍👦 **Family & Relationship Mapping:** Smart algorithms detect and flag potential family members based on house numbers and relative names, allowing users to build custom "Family Lists" instantly.
- 🔍 **Real-Time Advanced Search:** Search through thousands of extracted voter records in milliseconds using debounced queries, age ranges, and gender filters.
- 📥 **One-Click Export Pipeline:** Instantly export filtered records or custom family sets directly to **Microsoft Word, Excel, or formatted PDFs** for on-ground fieldwork.
- ⚡ **Asynchronous Polling:** Users never face a frozen screen. The frontend continuously polls the Node.js API using HTTP 202 to display live extraction progress (Page x/40 completed).

---

## 🌍 Live Deployments & Cloud Ecosystem

MatdarMitra is deployed via a modern three-tier cloud architecture ensuring high availability and fault isolation.

| Environment | Live Link | Description |
| :--- | :--- | :--- |
| 🖥️ **Frontend Application** | [kasim-matdar-mitra.vercel.app](https://kasim-matdar-mitra.vercel.app) | The live, production-ready Next.js user interface. Hosted on Vercel Edge Network for instant global access. |
| ⚙️ **Backend API (Node)** | [matdarmitra.onrender.com](https://matdarmitra.onrender.com) | The live Express API managing document streams, async polling, and database synchronization. Hosted on Render. |
| 🤖 **AI Microservice (Python)** | [matdarmitra-1.onrender.com](https://matdarmitra-1.onrender.com/docs) | The FastAPI worker engine providing heavy Tesseract Computer Vision and OpenCV PDF slicing endpoints (Link points to interactive Swagger UI). |
| 🗄️ **Database (MongoDB Atlas)** | *Private / Secured* | A resilient cloud-hosted NoSQL cluster utilizing dynamic schemas for storing unstructured voter metadata. |
| 📂 **Source Code** | [kasimshah19/MatdarMitra](https://github.com/kasimshah19/MatdarMitra) | The complete, open-source microservices codebase containing all UI and backend Logic. |

---

## 🏗️ Architecture & Engineering Feats

Building this platform required solving deep technical challenges regarding memory starvation and thread deadlocks.

| Problem Solved | Technical Implementation | Impact |
| :--- | :--- | :--- |
| **Monolith Timouts & Freezes** | Strict decoupling of Next.js frontend, Node.js gateway, and a Python/FastAPI worker via Async Polling. | Guarantees the frontend never hangs. The user UI remains fluid while servers crunch gigabytes of data. |
| **Grid Boundary Leakage** | Mathematical morphological layout detection using `OpenCV2` and `PyMuPDF`. | Successfully slices messy bilingual files isolating exact voter coordinates with extreme accuracy. |
| **Fatal OS Memory Crashes** | C++ ThreadPoolExecutor bounded precisely via explicit ENV Variables (`OMP_THREAD_LIMIT`). | Prevented OpenMP internal thread explosions, eliminating fatal OS live-locks (`0x40000015`) during batch processing. |
| **Partial OCR Failures** | Mongoose `$or` conditional pipelines with dynamic `needsReview` fallback flags. | A missed OCR confidence score never drops a valid citizen; messy records are preserved and safely surfaced for manual review. |
| **Client Heap Overflow** | Optimized MongoDB indexed queries (`skip` & `limit`) bounded by explicit total counts. | Instantly loads gigabytes of analytical data into the React UI without freezing the client's browser heap. |

---

## 🛠️ Technology Stack Breakdown

- **Frontend:** React 18, Next.js (App Router), Tailwind CSS, Lucide Icons.
- **Node.js Gateway:** Express.js, Multer (Multipart Streams), CORS, Mongoose.
- **Computer Vision API:** Python 3.9, FastAPI, OpenCV, PyTesseract (Custom Marathi language packs), PyMuPDF (Fitz).
- **Infrastructure:** Docker, Render (PaaS), Vercel, MongoDB Atlas.

---

## ⚙️ Local Setup & Installation

*Because this is a microservices architecture, you will need to spin up the independent servers concurrently.*

### 1. MongoDB & Node.js Gateway
```bash
cd backend
npm install
# Create a .env file with MONGODB_URI and FRONTEND_URL
npm run dev
```

### 2. AI Extraction Worker (Python)
```bash
cd extraction-service
# It is recommended to use a Python virtual environment (venv)
pip install -r requirements.txt
# Requires system-level tesseract-ocr and tesseract-ocr-mar to be pre-installed!
uvicorn main:app --reload --port 8000
```

### 3. Next.js Web Client
```bash
# In the root MatdarMitra directory
npm install
# Create .env.local with NEXT_PUBLIC_API_URL=http://localhost:5000
npm run dev
# Open http://localhost:3000
```

---

<div align="center">
  <b>Architected and Developed by Kasim Shah.</b> <br/>
  <i>Engineered for scale. Built for impact.</i>
</div>
