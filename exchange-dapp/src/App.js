import './static/css/App.css';
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import BorrowerPage from './components/BorrowerPage/BorrowerPage';
import LenderPage from './components/LenderPage/LenderPage';
import TableGen from './components/TableGen/TableGen';

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
        <Link to="/borrower">Borrowing</Link>
        <Link to="/">Lending</Link>
        <Link to="/table">Table Generator</Link>
      </div>

      <Routes>
        <Route path="/home" element={<Home />} exact />
        <Route path="/borrower" element={<BorrowerPage />} exact />
        <Route path="/" element={<LenderPage />} exact />
        <Route path="/table" element={<TableGen />} exact />
      </Routes>
    </Router>

  )
}