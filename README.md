# GradEzy

An online exam management system built with React (frontend) and Node.js/Express (backend), designed for educational institutions to conduct secure online examinations.

## Features

### For Administrators
- **Dashboard**: Overview of exams, students, and system statistics
- **Exam Management**: Create, configure, and manage examinations
- **Question Bank**: Add, edit, and organize questions with various types
- **Student Management**: Add students, allocate exams, and manage user accounts
- **Proctoring**: Monitor exam sessions in real-time
- **Results Analysis**: View and analyze exam results with detailed reports
- **Chatbot Management**: Configure AI-powered student assistance
- **Legacy Migration**: Migrate data from MySQL to MongoDB

### For Students
- **Dashboard**: View assigned exams and personal progress
- **Exam Taking**: Secure online examination interface
- **Results**: View scores and detailed performance analysis
- **Profile Management**: Update personal information and profile pictures
- **Notifications**: Real-time notifications for exam updates
- **Chatbot Support**: AI-powered assistance during exams

### General Features
- **Authentication**: Secure login/registration with JWT tokens
- **Responsive Design**: Works on desktop and mobile devices
- **PDF Generation**: Export results and reports as PDFs
- **File Uploads**: Profile picture uploads with validation
- **Contact & FAQ**: Support pages for user assistance

## Tech Stack

### Frontend
- **React 18** with Vite for fast development
- **React Router** for client-side routing
- **Axios** for API communication
- **Chart.js** for data visualization
- **JWT Decode** for token handling
- **HTML2PDF.js** for PDF generation

### Backend
- **Node.js** with Express.js
- **MongoDB** with Mongoose ODM
- **MySQL** (legacy support)
- **JWT** for authentication
- **bcryptjs** for password hashing
- **Multer** for file uploads
- **XLSX** for Excel file processing

### Development Tools
- **Nodemon** for server auto-restart
- **Concurrently** for running multiple services
- **Morgan** for HTTP request logging
- **CORS** for cross-origin requests

## Project Structure

```
public_html (1)/
├── client/                 # React frontend
│   ├── public/            # Static assets
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components (admin/student)
│   │   ├── layouts/       # Layout components
│   │   ├── auth/          # Authentication hooks
│   │   ├── api/           # API client utilities
│   │   ├── constants/     # Route and brand constants
│   │   ├── styles/        # CSS stylesheets
│   │   └── utils/         # Utility functions
│   ├── package.json
│   └── vite.config.js
├── server/                 # Node.js backend
│   ├── src/
│   │   ├── config/        # Database configuration
│   │   ├── controllers/   # Route handlers
│   │   ├── middleware/    # Express middleware
│   │   ├── models/        # MongoDB schemas
│   │   ├── routes/        # API routes
│   │   └── utils/         # Server utilities
│   ├── scripts/           # Migration and audit scripts
│   ├── uploads/           # File upload directory
│   └── package.json
├── snapshots/              # Proctoring snapshots
└── package.json            # Monorepo root
```

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- MongoDB
- MySQL (for legacy migration only)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd gradz/public_html\ \(1\)
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**

   Create `.env` file in `server/` directory:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/gradezy
   MYSQL_HOST=localhost
   MYSQL_USER=your_mysql_user
   MYSQL_PASSWORD=your_mysql_password
   MYSQL_DATABASE=your_legacy_database
   JWT_SECRET=your_jwt_secret
   CORS_ORIGIN=http://localhost:5173
   ```

4. **Database Setup**
   - Ensure MongoDB is running
   - If migrating from MySQL, ensure MySQL database is accessible

### Running the Application

#### Development Mode (Recommended)
```bash
npm run dev
```
This starts both the backend API (port 5000) and frontend (port 5173) concurrently.

#### Individual Services
```bash
# Start only the backend
npm run dev:server

# Start only the frontend
npm run dev:client
```

#### Production Mode
```bash
# Build the frontend
npm run build

# Start the backend
npm start
```

## Migration from Legacy System

If upgrading from the legacy MySQL-based system:

1. **Run preflight checks**
   ```bash
   cd server
   npm run migrate:doctor
   ```

2. **Execute full migration**
   ```bash
   npm run migrate:all
   ```

3. **Verify migration**
   ```bash
   npm run verify:migration
   ```

4. **Run legacy compatibility audits**
   ```bash
   npm run audit:legacy-all
   ```

See `server/MIGRATION_GUIDE.md` for detailed instructions.

## API Documentation

The backend provides RESTful APIs under `/api/`:

- `POST /api/auth/login` - User authentication
- `GET /api/exams` - List exams
- `POST /api/exams` - Create exam (admin)
- `GET /api/questions` - List questions
- `POST /api/results` - Submit exam results
- `GET /api/profile` - Get user profile
- And more...

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and ensure code quality
5. Submit a pull request

## License

This project is proprietary software developed by Fourise Software Solutions.

## Support

For support, contact Fourise Software Solutions or visit the contact page in the application.