# Ramayana War Archive

A complete working prototype website documenting the legendary Ramayana characters and war duels. Built with a modern, clean, elegant, and responsive UI design, simulating a digital mythology archive.

## Features

*   **Characters Archive**: Grid layout of warriors, gods, and historical figures with a robust search capability.
*   **Epic Duels**: Record and view confrontations between armies with multi-warrior representation.
*   **Admin Panel**: Fully functional (no-auth) dashboard to add, manage, and delete characters and duels.
*   **Image Uploads**: Complete integration of Multer for robust drag-and-drop file uploading and previews.
*   **Responsive Design**: Fluid design using custom CSS variables (no tailwind/bootstrap) ensuring perfect look across desktop, tablet, and mobile.
*   **Database Integration**: SQLite backend for seamless local testing and data persistence.

## Tech Stack

*   **Frontend**: HTML5, Vanilla CSS3 (Custom Variables, Flexbox, Grid), Vanilla JavaScript (Modular, Fetch API).
*   **Backend**: Node.js, Express.js.
*   **Database**: SQLite.
*   **File Handling**: Multer (Local storage in `public/uploads`).

## Prerequisites

*   Node.js (v14 or higher)
*   npm (Node Package Manager)

## Installation & Setup

1.  **Clone or setup directory:** Make sure you are in the project's root folder (`ramayana_v2`).
2.  **Install Dependencies:**
    ```bash
    npm install
    ```
    This will install `express`, `sqlite3`, `multer`, `cors`, and `nodemon`.
3.  **Run the Server:**
    ```bash
    npm run dev
    ```
    This launches the backend server using `nodemon` at `http://localhost:3000`.
4.  **Open the App:** Navigate to `http://localhost:3000` in your web browser.

## Project Structure Explanation

*   `/public`: Contains all static frontend assets.
    *   `/css/style.css`: The central styling engine.
    *   `/js`: Modular frontend logic (`app.js`, `characters.js`, `duels.js`, `admin.js`).
    *   `/uploads`: Target directory where user-uploaded images persist.
*   `/server`: Contains backend logic.
    *   `server.js`: The Express server and REST API configuration.
    *   `db.js`: SQLite Database initialization and schema builder.
    *   `ramayana.db`: The auto-generated SQLite database file (created on first run).
