import './static/css/App.css';
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import BorrowerPage from './components/BorrowerPage/BorrowerPage';
import LenderPage from './components/LenderPage/LenderPage';
import TableGen from './components/TableGen/TableGen';

const sep = '\xa0-\xa0';

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
        <Link to="/borrower" className='link'>Borrowing</Link>{sep}
        <Link to="/lending" className='link'>Lending</Link>{sep}
        <Link to="/" className='link'>Debug</Link>
      </div>

      <Routes>
        <Route path="/borrower" element={<BorrowerPage />} exact />
        <Route path="/lending" element={<LenderPage />} exact />
        <Route path="/" element={<TableGen />} exact />
      </Routes>
    </Router>

  )
}