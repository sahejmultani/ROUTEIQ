# RouteIQ

This project consists of a backend (Python) and a frontend (Next.js/React) for RouteIQ.

## Prerequisites
- Python 3.8+
- Node.js (v16+ recommended) and npm or yarn

---

## Backend Setup

1. **Navigate to the backend directory:**
   ```sh
   cd backend
   ```
2. **(Optional but recommended) Create a virtual environment:**
   ```sh
   python3 -m venv venv
   source venv/bin/activate
   ```
3. **Install dependencies:**
   ```sh
   pip install -r requirements.txt
   ```
4. **Run the backend server:**
   ```sh
   uvicorn main:app --reload
   ```
   The backend will start, typically on `http://127.0.0.1:8000` or as specified in your code.

---

## Frontend Setup

1. **Navigate to the frontend directory:**
   ```sh
   cd frontend
   ```
2. **Install dependencies:**
   ```sh
   npm install
   # or
   yarn install
   ```
3. **Run the development server:**
   ```sh
   npm run dev
   # or
   yarn dev
   ```
   The frontend will start, typically on `http://localhost:3000`.

---

## Usage
- Make sure both backend and frontend servers are running.
- Access the application via your browser at `http://localhost:3000`.

---

## Notes
- Adjust backend and frontend URLs as needed if you change ports or hostnames.
- For production deployment, further configuration will be required.
