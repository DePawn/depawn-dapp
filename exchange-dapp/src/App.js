import './static/css/App.css';
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import BorrowerPage from './components/BorrowerPage/BorrowerPage';
import LenderPage from './components/LenderPage/LenderPage';

const Home = () => {
  return (
    <div>
      <h1>Home</h1>
    </div>
  )
}

export default function App() {
  return (
    <Router>
      <div>
        <Link to="/home">Home</Link>
        <Link to="/borrowing">Borrowing</Link>
        <Link to="/">Lending</Link>
      </div>

      <Routes>
        <Route path="/home" element={<Home />} exact />
        <Route path="/borrowing" element={<BorrowerPage />} exact />
        <Route path="/" element={<LenderPage />} exact />
      </Routes>
    </Router>

  )
}